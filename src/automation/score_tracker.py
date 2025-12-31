"""
SafeScoring - Score History Tracker
====================================
THIS IS THE REAL MOAT - Impossible to replicate retroactively.

Each day we snapshot:
- All product scores
- Score changes
- Component breakdowns

After 1 year: 365 snapshots per product = UNIQUE historical dataset
After hack: "We rated them 45/100 three months before the incident"
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Load environment
try:
    from dotenv import load_dotenv
    env_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
        'config/.env',
        '.env'
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            break
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


class ScoreTracker:
    """
    Tracks score history over time.
    This data becomes MORE valuable every day.
    """

    def __init__(self):
        self.headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }

    def get_all_scores(self) -> List[Dict]:
        """Get current scores for all products."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("[ScoreTracker] Supabase not configured")
            return []

        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/safe_scoring_results",
                headers=self.headers,
                params={
                    "select": "product_id,note_finale,score_s,score_a,score_f,score_e",
                },
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            else:
                print(f"[ScoreTracker] Error fetching scores: {response.status_code}")
                return []

        except Exception as e:
            print(f"[ScoreTracker] Error: {e}")
            return []

    def get_previous_score(self, product_id: int) -> Optional[Dict]:
        """Get the most recent historical score for a product."""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/score_history",
                headers=self.headers,
                params={
                    "select": "safe_score,score_s,score_a,score_f,score_e",
                    "product_id": f"eq.{product_id}",
                    "order": "recorded_at.desc",
                    "limit": 1
                },
                timeout=30
            )

            if response.status_code == 200 and response.json():
                data = response.json()[0]
                # Normalize to expected format
                return {"score": data.get("safe_score", 0)}
            return None

        except Exception:
            return None

    def snapshot_all_scores(self) -> Dict:
        """
        Take a snapshot of ALL product scores.
        Run this DAILY to build historical dataset.
        """
        print("=" * 60)
        print("SCORE HISTORY SNAPSHOT")
        print(f"Date: {datetime.now().isoformat()}")
        print("=" * 60)

        current_scores = self.get_all_scores()
        print(f"[Snapshot] Found {len(current_scores)} products with scores")

        saved = 0
        improved = 0
        declined = 0
        stable = 0

        for score_data in current_scores:
            product_id = score_data.get("product_id")
            current_score = score_data.get("note_finale") or 0

            # Get previous score to calculate change
            previous = self.get_previous_score(product_id)
            previous_score = previous.get("score", current_score) if previous else current_score
            score_change = round(current_score - previous_score, 2)

            # Determine trend
            if score_change > 0.5:
                trend = "improving"
                improved += 1
            elif score_change < -0.5:
                trend = "declining"
                declined += 1
            else:
                trend = "stable"
                stable += 1

            # Save snapshot (using correct column names from schema)
            snapshot = {
                "product_id": product_id,
                "safe_score": current_score,
                "score_s": score_data.get("score_s") or 0,
                "score_a": score_data.get("score_a") or 0,
                "score_f": score_data.get("score_f") or 0,
                "score_e": score_data.get("score_e") or 0,
                "score_change": score_change,
                "previous_safe_score": previous_score,
                "triggered_by": "daily_snapshot",
            }

            try:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/score_history",
                    headers=self.headers,
                    json=snapshot,
                    timeout=30
                )

                if response.status_code in [200, 201]:
                    saved += 1

            except Exception as e:
                print(f"[Snapshot] Error saving product {product_id}: {e}")

        results = {
            "total_products": len(current_scores),
            "saved": saved,
            "improved": improved,
            "declined": declined,
            "stable": stable,
            "timestamp": datetime.now().isoformat(),
        }

        print(f"\n[Results]")
        print(f"  - Saved: {saved}/{len(current_scores)}")
        print(f"  - Improving: {improved}")
        print(f"  - Declining: {declined}")
        print(f"  - Stable: {stable}")

        return results

    def get_score_history(self, product_id: int, days: int = 90) -> List[Dict]:
        """Get score history for a specific product."""
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()

            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/score_history",
                headers=self.headers,
                params={
                    "select": "score,score_s,score_a,score_f,score_e,score_change,trend,recorded_at",
                    "product_id": f"eq.{product_id}",
                    "recorded_at": f"gte.{since}",
                    "order": "recorded_at.asc"
                },
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            return []

        except Exception:
            return []

    def find_predictive_incidents(self) -> List[Dict]:
        """
        Find incidents where we had LOW scores BEFORE the hack.
        THIS IS THE KILLER FEATURE - proves predictive value.
        """
        if not SUPABASE_URL or not SUPABASE_KEY:
            return []

        try:
            # Get incidents with affected products
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/security_incidents",
                headers=self.headers,
                params={
                    "select": "id,title,incident_date,severity,funds_lost_usd,affected_product_ids",
                    "severity": "in.(critical,high)",
                    "order": "incident_date.desc",
                    "limit": 50
                },
                timeout=30
            )

            if response.status_code != 200:
                return []

            incidents = response.json()
            predictive_cases = []

            for incident in incidents:
                product_ids = incident.get("affected_product_ids", [])
                incident_date = incident.get("incident_date")

                if not product_ids or not incident_date:
                    continue

                for product_id in product_ids:
                    # Get score BEFORE the incident
                    score_before = self._get_score_before_date(product_id, incident_date)

                    if score_before and score_before.get("score", 100) < 60:
                        predictive_cases.append({
                            "incident_title": incident.get("title"),
                            "incident_date": incident_date,
                            "severity": incident.get("severity"),
                            "funds_lost": incident.get("funds_lost_usd", 0),
                            "product_id": product_id,
                            "score_before_incident": score_before.get("score"),
                            "score_recorded_at": score_before.get("recorded_at"),
                            "days_before": self._days_between(
                                score_before.get("recorded_at"),
                                incident_date
                            ),
                            "prediction_success": True,
                        })

            print(f"[Predictive] Found {len(predictive_cases)} cases where low score preceded hack")
            return predictive_cases

        except Exception as e:
            print(f"[Predictive] Error: {e}")
            return []

    def _get_score_before_date(self, product_id: int, date: str) -> Optional[Dict]:
        """Get the score recorded before a specific date."""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/score_history",
                headers=self.headers,
                params={
                    "select": "score,recorded_at",
                    "product_id": f"eq.{product_id}",
                    "recorded_at": f"lt.{date}",
                    "order": "recorded_at.desc",
                    "limit": 1
                },
                timeout=30
            )

            if response.status_code == 200 and response.json():
                return response.json()[0]
            return None

        except Exception:
            return None

    def _days_between(self, date1: str, date2: str) -> int:
        """Calculate days between two dates."""
        try:
            d1 = datetime.fromisoformat(date1.replace("Z", "+00:00"))
            d2 = datetime.fromisoformat(date2.replace("Z", "+00:00"))
            return abs((d2 - d1).days)
        except Exception:
            return 0

    def generate_moat_report(self) -> Dict:
        """
        Generate a report showing the value of historical data.
        Use this to demonstrate moat to investors.
        """
        print("=" * 60)
        print("SAFESCORING MOAT REPORT")
        print("=" * 60)

        # Count total snapshots
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/score_history",
            headers=self.headers,
            params={"select": "count"},
            timeout=30
        )
        total_snapshots = response.json()[0]["count"] if response.status_code == 200 else 0

        # Get date range
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/score_history",
            headers=self.headers,
            params={"select": "recorded_at", "order": "recorded_at.asc", "limit": 1},
            timeout=30
        )
        first_snapshot = response.json()[0]["recorded_at"] if response.status_code == 200 and response.json() else None

        # Count products tracked
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/score_history",
            headers=self.headers,
            params={"select": "product_id"},
            timeout=30
        )
        products_tracked = len(set(r["product_id"] for r in response.json())) if response.status_code == 200 else 0

        # Predictive cases
        predictive = self.find_predictive_incidents()

        report = {
            "generated_at": datetime.now().isoformat(),
            "total_score_snapshots": total_snapshots,
            "tracking_since": first_snapshot,
            "products_tracked": products_tracked,
            "predictive_cases": len(predictive),
            "total_funds_predicted": sum(p.get("funds_lost", 0) for p in predictive),
            "moat_strength": self._calculate_moat_strength(total_snapshots, products_tracked, len(predictive)),
            "competitor_replication_time": f"{total_snapshots} days minimum",
        }

        print(f"\nTotal Snapshots: {total_snapshots}")
        print(f"Tracking Since: {first_snapshot}")
        print(f"Products Tracked: {products_tracked}")
        print(f"Predictive Cases: {len(predictive)}")
        print(f"Moat Strength: {report['moat_strength']}")

        return report

    def _calculate_moat_strength(self, snapshots: int, products: int, predictions: int) -> str:
        """Calculate moat strength rating."""
        score = 0
        score += min(snapshots / 1000, 30)  # Up to 30 points for snapshots
        score += min(products / 100, 30)     # Up to 30 points for products
        score += min(predictions * 10, 40)   # Up to 40 points for predictions

        if score >= 80:
            return "FORTRESS"
        elif score >= 60:
            return "STRONG"
        elif score >= 40:
            return "BUILDING"
        elif score >= 20:
            return "EMERGING"
        else:
            return "STARTING"


def run_daily_snapshot():
    """Run daily score snapshot - add to cron."""
    tracker = ScoreTracker()
    return tracker.snapshot_all_scores()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="SafeScoring Score Tracker")
    parser.add_argument("--snapshot", action="store_true", help="Take score snapshot")
    parser.add_argument("--report", action="store_true", help="Generate moat report")
    parser.add_argument("--predictive", action="store_true", help="Find predictive cases")
    parser.add_argument("--history", type=int, help="Get history for product ID")

    args = parser.parse_args()

    tracker = ScoreTracker()

    if args.snapshot:
        tracker.snapshot_all_scores()
    elif args.report:
        report = tracker.generate_moat_report()
        print(json.dumps(report, indent=2, default=str))
    elif args.predictive:
        cases = tracker.find_predictive_incidents()
        print(json.dumps(cases, indent=2, default=str))
    elif args.history:
        history = tracker.get_score_history(args.history)
        print(json.dumps(history, indent=2, default=str))
    else:
        # Default: take snapshot
        tracker.snapshot_all_scores()
