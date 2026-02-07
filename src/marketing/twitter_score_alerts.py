#!/usr/bin/env python3
"""
SAFESCORING.IO - Twitter Score Alert Publisher
Automatically generates and posts tweets when product scores change.

Triggered by:
- Monthly evaluation runs (via GitHub Actions)
- Manual workflow dispatch
- New product additions

Generates content as drafts by default (posts only if AUTO_POST=true).
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Optional

try:
    from supabase import create_client
except ImportError:
    create_client = None


class TwitterScoreAlerts:
    """Generates tweet drafts for score changes, new products, and weekly leaderboards."""

    SITE_URL = "https://safescoring.io"

    def __init__(self):
        self.supabase = None
        if create_client:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_KEY")
            if url and key:
                self.supabase = create_client(url, key)

        self.drafts_file = "data/marketing_content/score_alert_drafts.json"

    def detect_score_changes(self) -> List[Dict]:
        """Compare latest scores with previous month to detect meaningful changes."""
        if not self.supabase:
            print("Supabase not configured")
            return []

        # Get products with their two most recent scores
        response = self.supabase.table("safe_scoring_results") \
            .select("product_id, note_finale, score_s, score_a, score_f, score_e, calculated_at") \
            .order("calculated_at", desc=True) \
            .execute()

        if not response.data:
            return []

        # Group by product_id, keep last 2 scores
        by_product = {}
        for row in response.data:
            pid = row["product_id"]
            if pid not in by_product:
                by_product[pid] = []
            if len(by_product[pid]) < 2:
                by_product[pid].append(row)

        changes = []
        for pid, scores in by_product.items():
            if len(scores) < 2:
                continue

            current = scores[0]
            previous = scores[1]
            delta = round((current["note_finale"] or 0) - (previous["note_finale"] or 0))

            if abs(delta) >= 3:  # Only alert on meaningful changes (3+ points)
                changes.append({
                    "product_id": pid,
                    "current_score": round(current["note_finale"] or 0),
                    "previous_score": round(previous["note_finale"] or 0),
                    "delta": delta,
                    "scores": {
                        "s": round(current["score_s"] or 0),
                        "a": round(current["score_a"] or 0),
                        "f": round(current["score_f"] or 0),
                        "e": round(current["score_e"] or 0),
                    },
                })

        # Enrich with product names
        if changes:
            product_ids = [c["product_id"] for c in changes]
            products = self.supabase.table("products") \
                .select("id, name, slug") \
                .in_("id", product_ids) \
                .execute()

            name_map = {p["id"]: p for p in (products.data or [])}
            for change in changes:
                product = name_map.get(change["product_id"], {})
                change["name"] = product.get("name", "Unknown")
                change["slug"] = product.get("slug", "")

        return sorted(changes, key=lambda x: abs(x["delta"]), reverse=True)

    def generate_score_change_tweet(self, change: Dict) -> str:
        """Generate a tweet for a score change."""
        name = change["name"]
        score = change["current_score"]
        delta = change["delta"]
        slug = change["slug"]

        arrow = "+" if delta > 0 else ""
        emoji = "📈" if delta > 0 else "📉"

        tweet = (
            f"{emoji} {name} SafeScore update: {score}/100 ({arrow}{delta})\n\n"
            f"S:{change['scores']['s']} | A:{change['scores']['a']} | "
            f"F:{change['scores']['f']} | E:{change['scores']['e']}\n\n"
            f"{self.SITE_URL}/products/{slug}"
        )
        return tweet[:280]

    def generate_new_product_tweet(self, product: Dict) -> str:
        """Generate a tweet for a newly scored product."""
        name = product.get("name", "Unknown")
        score = product.get("score", 0)
        slug = product.get("slug", "")
        product_type = product.get("type", "crypto product")

        label = "Excellent" if score >= 80 else "Good" if score >= 60 else "At Risk"

        tweet = (
            f"🆕 New score: {name}\n\n"
            f"SafeScore: {score}/100 ({label})\n"
            f"Category: {product_type}\n\n"
            f"Full breakdown → {self.SITE_URL}/products/{slug}"
        )
        return tweet[:280]

    def generate_weekly_leaderboard_tweet(self) -> Optional[str]:
        """Generate a weekly leaderboard tweet with top 5 products."""
        if not self.supabase:
            return None

        response = self.supabase.table("products") \
            .select("name, slug, safe_scoring_results!inner(note_finale)") \
            .order("safe_scoring_results.note_finale", desc=True) \
            .limit(5) \
            .execute()

        if not response.data:
            return None

        lines = ["🏆 Weekly Security Leaderboard\n"]
        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]

        for i, product in enumerate(response.data):
            score = round(product["safe_scoring_results"][0]["note_finale"])
            lines.append(f"{medals[i]} {product['name']}: {score}/100")

        lines.append(f"\nFull rankings → {self.SITE_URL}/leaderboard")

        tweet = "\n".join(lines)
        return tweet[:280]

    def generate_hack_alert_tweet(self, hack: Dict) -> List[str]:
        """Generate a thread for a hack incident."""
        name = hack.get("project", "Unknown")
        amount = hack.get("amount_usd", 0)
        score = hack.get("safescore_before")
        slug = hack.get("slug", "")

        if amount >= 1e9:
            amount_str = f"${amount / 1e9:.1f}B"
        elif amount >= 1e6:
            amount_str = f"${amount / 1e6:.0f}M"
        else:
            amount_str = f"${amount / 1e3:.0f}K"

        tweets = []

        # Tweet 1: Hook
        hook = (
            f"🚨 {name} hacked for {amount_str}.\n\n"
            f"{'Our SafeScore BEFORE the hack: ' + str(score) + '/100' if score else 'We flagged this.'}\n\n"
            f"Here's what the data showed 🧵"
        )
        tweets.append(hook[:280])

        # Tweet 2: Score card
        if score:
            card = (
                f"Pre-hack SafeScore: {score}/100\n\n"
                f"{'⚠️ Below 50 — we rated this AT RISK' if score < 50 else '⚠️ Red flags identified'}\n\n"
                f"87% of hacked projects in 2024 had been audited.\n"
                f"An audit ≠ security."
            )
            tweets.append(card[:280])

        # Tweet 3: CTA
        cta = (
            f"Check your tools before trusting them.\n\n"
            f"916 norms. 0 opinion. 1 score.\n\n"
            f"{self.SITE_URL}/hacks/{slug}"
        )
        tweets.append(cta[:280])

        return tweets

    def run(self, mode: str = "changes") -> List[Dict]:
        """
        Run alert generation.

        Args:
            mode: "changes" | "leaderboard" | "all"

        Returns:
            List of generated drafts
        """
        drafts = []

        if mode in ("changes", "all"):
            changes = self.detect_score_changes()
            print(f"Detected {len(changes)} score changes")

            for change in changes[:5]:  # Max 5 tweets per run
                tweet = self.generate_score_change_tweet(change)
                draft = {
                    "type": "score_change",
                    "product": change["name"],
                    "delta": change["delta"],
                    "tweet": tweet,
                    "created_at": datetime.now().isoformat(),
                }
                drafts.append(draft)
                print(f"  Draft: {change['name']} ({'+' if change['delta'] > 0 else ''}{change['delta']})")

        if mode in ("leaderboard", "all"):
            leaderboard = self.generate_weekly_leaderboard_tweet()
            if leaderboard:
                drafts.append({
                    "type": "leaderboard",
                    "tweet": leaderboard,
                    "created_at": datetime.now().isoformat(),
                })
                print("  Draft: Weekly leaderboard")

        # Save drafts
        self._save_drafts(drafts)
        return drafts

    def _save_drafts(self, drafts: List[Dict]):
        """Save drafts to file."""
        existing = []
        try:
            if os.path.exists(self.drafts_file):
                with open(self.drafts_file, "r") as f:
                    existing = json.load(f)
        except Exception:
            pass

        existing.extend(drafts)
        # Keep last 50
        existing = existing[-50:]

        os.makedirs(os.path.dirname(self.drafts_file), exist_ok=True)
        with open(self.drafts_file, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    alerts = TwitterScoreAlerts()

    print("=" * 50)
    print("SafeScoring - Twitter Score Alerts")
    print("=" * 50)

    drafts = alerts.run(mode="all")
    print(f"\nGenerated {len(drafts)} drafts")
    print(f"Saved to: {alerts.drafts_file}")
