"""
Certification Reevaluator - Automated Score Recalculation for Certified Products

This module automatically reevaluates certified products based on their tier:
- Starter: Every 90 days
- Verified: Every 30 days
- Enterprise: Every 7 days

If the score drops below thresholds, alerts are sent and certification may be revoked.

Usage:
    python -m src.automation.certification_reevaluator

Environment:
    SUPABASE_URL, SUPABASE_SERVICE_KEY
    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (optional)
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from supabase import create_client, Client
except ImportError:
    print("Please install supabase: pip install supabase")
    sys.exit(1)

try:
    import requests
except ImportError:
    requests = None

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

# Reevaluation intervals by tier (in days)
TIER_INTERVALS = {
    "starter": 90,
    "verified": 30,
    "enterprise": 7,
}

# Minimum score thresholds by tier
TIER_MIN_SCORES = {
    "starter": 50,
    "verified": 60,
    "enterprise": 70,
}

# Warning threshold (score drop triggers alert)
SCORE_DROP_THRESHOLD = 5


class CertificationReevaluator:
    """
    Automated reevaluation system for certified products.

    Workflow:
    1. Find certifications due for reevaluation
    2. Trigger score recalculation
    3. Compare with previous score
    4. Send alerts if score dropped significantly
    5. Revoke certification if below minimum threshold
    6. Update next evaluation date
    """

    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """Initialize with database connection."""
        url = supabase_url or SUPABASE_URL
        key = supabase_key or SUPABASE_KEY

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.supabase: Client = create_client(url, key)
        self.stats = {
            "evaluated": 0,
            "passed": 0,
            "warned": 0,
            "revoked": 0,
            "errors": 0,
        }

    def get_due_certifications(self) -> List[Dict]:
        """
        Get all certifications due for reevaluation.

        A certification is due if:
        - Status is 'approved'
        - Certificate hasn't expired
        - Last evaluation was more than tier_interval days ago
        """
        print("[*] Finding certifications due for reevaluation...")

        now = datetime.utcnow()
        due_certs = []

        for tier, interval_days in TIER_INTERVALS.items():
            cutoff = (now - timedelta(days=interval_days)).isoformat()

            result = self.supabase.table("certification_applications").select(
                "id, product_id, tier, company_name, contact_email, "
                "final_score, pillar_scores, last_evaluated_at, "
                "products(id, name, slug)"
            ).eq("status", "approved").eq("tier", tier).lt(
                "last_evaluated_at", cutoff
            ).gt("certificate_expires_at", now.isoformat()).execute()

            if result.data:
                due_certs.extend(result.data)
                print(f"    {tier}: {len(result.data)} due")

        # Also check certifications never evaluated
        result = self.supabase.table("certification_applications").select(
            "id, product_id, tier, company_name, contact_email, "
            "final_score, pillar_scores, last_evaluated_at, "
            "products(id, name, slug)"
        ).eq("status", "approved").is_("last_evaluated_at", "null").gt(
            "certificate_expires_at", now.isoformat()
        ).execute()

        if result.data:
            due_certs.extend(result.data)
            print(f"    Never evaluated: {len(result.data)}")

        print(f"[+] Total certifications due: {len(due_certs)}")
        return due_certs

    def calculate_product_score(self, product_id: int) -> Optional[Dict]:
        """
        Trigger score recalculation for a product.

        Returns the latest score data or None if calculation failed.
        """
        # Get latest evaluation results
        result = self.supabase.table("safe_scoring_results").select(
            "note_finale, score_s, score_a, score_f, score_e, tier, calculated_at"
        ).eq("product_id", product_id).order(
            "calculated_at", desc=True
        ).limit(1).execute()

        if result.data:
            return result.data[0]

        return None

    def evaluate_certification(self, cert: Dict) -> Dict:
        """
        Evaluate a single certification.

        Returns evaluation result with action taken.
        """
        cert_id = cert["id"]
        product_id = cert["product_id"]
        tier = cert["tier"]
        previous_score = cert.get("final_score", 0)
        product_name = cert.get("products", {}).get("name", "Unknown")

        print(f"\n[*] Evaluating: {product_name} ({tier})")

        result = {
            "cert_id": cert_id,
            "product_name": product_name,
            "tier": tier,
            "previous_score": previous_score,
            "new_score": None,
            "action": "none",
            "message": "",
        }

        try:
            # Get current score
            score_data = self.calculate_product_score(product_id)

            if not score_data:
                result["action"] = "error"
                result["message"] = "Failed to calculate score"
                self.stats["errors"] += 1
                return result

            new_score = score_data["note_finale"]
            result["new_score"] = new_score

            min_score = TIER_MIN_SCORES.get(tier, 50)
            score_change = new_score - previous_score if previous_score else 0

            # Check if score is below minimum threshold
            if new_score < min_score:
                result["action"] = "revoke"
                result["message"] = f"Score {new_score} below minimum {min_score} for {tier} tier"
                self._revoke_certification(cert_id, new_score)
                self._send_revocation_alert(cert, new_score, min_score)
                self.stats["revoked"] += 1

            # Check for significant score drop
            elif score_change <= -SCORE_DROP_THRESHOLD:
                result["action"] = "warn"
                result["message"] = f"Score dropped by {abs(score_change):.1f} points"
                self._send_score_drop_alert(cert, previous_score, new_score)
                self._update_evaluation(cert_id, score_data)
                self.stats["warned"] += 1

            else:
                result["action"] = "pass"
                result["message"] = f"Score maintained at {new_score:.1f}"
                self._update_evaluation(cert_id, score_data)
                self.stats["passed"] += 1

            self.stats["evaluated"] += 1
            print(f"    Result: {result['action']} - {result['message']}")

        except Exception as e:
            result["action"] = "error"
            result["message"] = str(e)
            self.stats["errors"] += 1
            print(f"    Error: {e}")

        return result

    def _update_evaluation(self, cert_id: int, score_data: Dict):
        """Update certification with new evaluation data."""
        self.supabase.table("certification_applications").update({
            "final_score": score_data["note_finale"],
            "pillar_scores": {
                "S": score_data.get("score_s"),
                "A": score_data.get("score_a"),
                "F": score_data.get("score_f"),
                "E": score_data.get("score_e"),
            },
            "last_evaluated_at": datetime.utcnow().isoformat(),
        }).eq("id", cert_id).execute()

        # Record evaluation history
        self.supabase.table("certification_evaluations").insert({
            "certification_id": cert_id,
            "score": score_data["note_finale"],
            "pillar_scores": {
                "S": score_data.get("score_s"),
                "A": score_data.get("score_a"),
                "F": score_data.get("score_f"),
                "E": score_data.get("score_e"),
            },
            "evaluation_type": "automated",
        }).execute()

    def _revoke_certification(self, cert_id: int, final_score: float):
        """Revoke a certification due to low score."""
        self.supabase.table("certification_applications").update({
            "status": "revoked",
            "final_score": final_score,
            "revoked_at": datetime.utcnow().isoformat(),
            "revocation_reason": "Score below minimum threshold",
        }).eq("id", cert_id).execute()

        # Deactivate badges
        self.supabase.table("certification_badges").update({
            "is_active": False,
            "deactivated_at": datetime.utcnow().isoformat(),
        }).eq("certification_id", cert_id).execute()

    def _send_score_drop_alert(self, cert: Dict, old_score: float, new_score: float):
        """Send alert about significant score drop."""
        product_name = cert.get("products", {}).get("name", "Unknown")
        tier = cert["tier"]
        company = cert.get("company_name", "Unknown")

        message = (
            f"[ALERT] Score Drop Detected\n\n"
            f"Product: {product_name}\n"
            f"Company: {company}\n"
            f"Tier: {tier.upper()}\n"
            f"Previous Score: {old_score:.1f}\n"
            f"New Score: {new_score:.1f}\n"
            f"Change: {new_score - old_score:+.1f}\n\n"
            f"Action Required: Review product compliance"
        )

        self._send_telegram(message)

    def _send_revocation_alert(self, cert: Dict, score: float, min_score: float):
        """Send alert about certification revocation."""
        product_name = cert.get("products", {}).get("name", "Unknown")
        tier = cert["tier"]
        company = cert.get("company_name", "Unknown")
        contact = cert.get("contact_email", "N/A")

        message = (
            f"[CRITICAL] Certification REVOKED\n\n"
            f"Product: {product_name}\n"
            f"Company: {company}\n"
            f"Contact: {contact}\n"
            f"Tier: {tier.upper()}\n"
            f"Score: {score:.1f} (minimum: {min_score})\n\n"
            f"Badge has been deactivated.\n"
            f"Customer notification required."
        )

        self._send_telegram(message)

    def _send_telegram(self, message: str):
        """Send notification via Telegram."""
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID or not requests:
            print(f"    [Telegram disabled] {message[:50]}...")
            return

        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            response = requests.post(url, json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": message,
                "parse_mode": "HTML",
            }, timeout=10)
            response.raise_for_status()
        except Exception as e:
            print(f"    [Telegram error] {e}")

    def run(self) -> Dict:
        """
        Run full reevaluation cycle.

        Returns summary statistics.
        """
        print("=" * 60)
        print("CERTIFICATION REEVALUATION")
        print(f"Started: {datetime.utcnow().isoformat()}")
        print("=" * 60)

        # Get certifications due for evaluation
        due_certs = self.get_due_certifications()

        if not due_certs:
            print("\n[+] No certifications due for reevaluation")
            return self.stats

        # Evaluate each certification
        results = []
        for cert in due_certs:
            result = self.evaluate_certification(cert)
            results.append(result)

        # Summary
        print("\n" + "=" * 60)
        print("REEVALUATION SUMMARY")
        print("=" * 60)
        print(f"Total evaluated: {self.stats['evaluated']}")
        print(f"Passed: {self.stats['passed']}")
        print(f"Warnings sent: {self.stats['warned']}")
        print(f"Revoked: {self.stats['revoked']}")
        print(f"Errors: {self.stats['errors']}")

        # Send summary to Telegram if any issues
        if self.stats["warned"] > 0 or self.stats["revoked"] > 0:
            summary = (
                f"[REEVALUATION COMPLETE]\n\n"
                f"Evaluated: {self.stats['evaluated']}\n"
                f"Passed: {self.stats['passed']}\n"
                f"Warnings: {self.stats['warned']}\n"
                f"Revoked: {self.stats['revoked']}\n"
                f"Errors: {self.stats['errors']}"
            )
            self._send_telegram(summary)

        return self.stats


def run_reevaluation():
    """Entry point for running reevaluation."""
    try:
        reevaluator = CertificationReevaluator()
        stats = reevaluator.run()

        # Exit with error code if any revocations
        if stats["revoked"] > 0:
            sys.exit(1)

        return stats

    except Exception as e:
        print(f"\n[FATAL ERROR] {e}")
        sys.exit(2)


if __name__ == "__main__":
    run_reevaluation()
