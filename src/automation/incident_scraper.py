"""
SafeScoring - Incident Scraper
Scrape security incidents from multiple sources in real-time.
This is PROPRIETARY DATA that creates competitive moat.

Sources:
- Rekt.news (hack database)
- DeFiLlama hacks API
- Twitter/X (security alerts)
- PeckShield alerts
"""

import os
import json
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import hashlib

# Load environment variables
import os
import sys
try:
    from dotenv import load_dotenv
    # Try multiple .env locations
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


class IncidentScraper:
    """
    Scrapes security incidents from multiple sources.
    This data is UNIQUE and creates a competitive moat.
    """

    def __init__(self):
        self.sources = {
            "defillama": "https://api.llama.fi/hacks",
            "rekt": "https://rekt.news/api/posts",
        }
        self.headers = {
            "User-Agent": "SafeScoring/1.0 (Security Research)"
        }

    def generate_incident_id(self, title: str, date: str) -> str:
        """Generate unique incident ID."""
        raw = f"{title}_{date}".lower()
        return f"INC-{hashlib.md5(raw.encode()).hexdigest()[:12].upper()}"

    def scrape_defillama_hacks(self) -> List[Dict]:
        """
        Scrape hacks from DefiLlama API.
        Returns list of incidents with standardized format.
        """
        incidents = []

        try:
            response = requests.get(
                self.sources["defillama"],
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            for hack in data:
                # Map DefiLlama format to our schema
                incident = {
                    "incident_id": self.generate_incident_id(
                        hack.get("name", "Unknown"),
                        str(hack.get("date", ""))
                    ),
                    "title": f"{hack.get('name', 'Unknown')} - {hack.get('technique', 'Exploit')}",
                    "description": hack.get("description", ""),
                    "incident_type": self._map_technique(hack.get("technique", "")),
                    "severity": self._calculate_severity(hack.get("amount")),
                    "funds_lost_usd": float(hack.get("amount") or 0),
                    "incident_date": self._parse_timestamp(hack.get("date")),
                    "source_urls": [hack.get("link")] if hack.get("link") else [],
                    "chain": hack.get("chain", "Unknown"),
                    "protocol_name": hack.get("name", "Unknown"),
                    "source": "defillama",
                    "raw_data": hack,
                }
                incidents.append(incident)

            print(f"[DefiLlama] Scraped {len(incidents)} incidents")

        except Exception as e:
            print(f"[DefiLlama] Error scraping: {e}")

        return incidents

    def scrape_twitter_alerts(self, keywords: List[str] = None) -> List[Dict]:
        """
        Scrape Twitter for security alerts.
        Requires Twitter API credentials.

        Keywords to monitor:
        - "hack", "exploit", "drained", "stolen"
        - "@PeckShieldAlert", "@CertiKAlert", "@SlowMist_Team"
        """
        if keywords is None:
            keywords = [
                "crypto hack",
                "defi exploit",
                "funds drained",
                "smart contract vulnerability",
                "bridge hack",
                "flash loan attack"
            ]

        incidents = []
        twitter_bearer = os.getenv("TWITTER_BEARER_TOKEN")

        if not twitter_bearer:
            print("[Twitter] No bearer token configured, skipping...")
            return incidents

        # Twitter API v2 recent search
        headers = {
            "Authorization": f"Bearer {twitter_bearer}",
            "User-Agent": "SafeScoring/1.0"
        }

        for keyword in keywords[:5]:  # Limit to avoid rate limits
            try:
                params = {
                    "query": f"{keyword} -is:retweet lang:en",
                    "max_results": 10,
                    "tweet.fields": "created_at,author_id,text",
                }

                response = requests.get(
                    "https://api.twitter.com/2/tweets/search/recent",
                    headers=headers,
                    params=params,
                    timeout=30
                )

                if response.status_code == 200:
                    data = response.json()
                    for tweet in data.get("data", []):
                        # Only process tweets that look like real incidents
                        if self._is_potential_incident(tweet.get("text", "")):
                            incident = {
                                "incident_id": self.generate_incident_id(
                                    tweet.get("text", "")[:50],
                                    tweet.get("created_at", "")
                                ),
                                "title": tweet.get("text", "")[:200],
                                "description": tweet.get("text", ""),
                                "incident_type": "other",
                                "severity": "medium",
                                "incident_date": tweet.get("created_at"),
                                "source_urls": [f"https://twitter.com/i/web/status/{tweet.get('id')}"],
                                "source": "twitter",
                                "needs_verification": True,
                                "raw_data": tweet,
                            }
                            incidents.append(incident)

            except Exception as e:
                print(f"[Twitter] Error searching '{keyword}': {e}")

        print(f"[Twitter] Found {len(incidents)} potential incidents")
        return incidents

    def scrape_peckshield_alerts(self) -> List[Dict]:
        """
        Monitor PeckShield alerts (they're usually first to report).
        This requires their API or Twitter monitoring.
        """
        incidents = []

        # PeckShield Twitter account monitoring
        # In production, use Twitter API to monitor @PeckShieldAlert
        print("[PeckShield] Monitoring requires Twitter API integration")

        return incidents

    def _map_technique(self, technique: str) -> str:
        """Map DefiLlama technique to our incident_type enum."""
        mapping = {
            "Flash Loan Attack": "flash_loan_attack",
            "Reentrancy": "smart_contract_bug",
            "Oracle Manipulation": "oracle_manipulation",
            "Access Control": "exploit",
            "Rug Pull": "rug_pull",
            "Phishing": "phishing",
            "Bridge Attack": "bridge_attack",
            "Frontend Attack": "frontend_attack",
        }
        return mapping.get(technique, "other")

    def _calculate_severity(self, amount) -> str:
        """Calculate severity based on funds lost."""
        if amount is None:
            return "medium"
        try:
            amount = float(amount)
            if amount >= 100_000_000:  # $100M+
                return "critical"
            elif amount >= 10_000_000:  # $10M+
                return "high"
            elif amount >= 1_000_000:   # $1M+
                return "medium"
            else:
                return "low"
        except (TypeError, ValueError):
            return "medium"

    def _parse_timestamp(self, timestamp) -> str:
        """Parse various timestamp formats to ISO format."""
        if isinstance(timestamp, (int, float)):
            return datetime.fromtimestamp(timestamp).isoformat()
        elif isinstance(timestamp, str):
            return timestamp
        return datetime.now().isoformat()

    def _is_potential_incident(self, text: str) -> bool:
        """Check if tweet text indicates a real incident."""
        indicators = [
            "million", "drained", "stolen", "hack", "exploit",
            "vulnerability", "attack", "compromised", "$"
        ]
        text_lower = text.lower()
        return sum(1 for ind in indicators if ind in text_lower) >= 2

    def save_to_supabase(self, incidents: List[Dict]) -> int:
        """Save incidents to Supabase database."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("[Supabase] Not configured, saving to local file instead")
            self._save_to_file(incidents)
            return 0

        saved_count = 0
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }

        for incident in incidents:
            try:
                # Prepare data for database
                # Ensure incident_date is never null
                incident_date = incident.get("incident_date")
                if not incident_date:
                    incident_date = datetime.now().isoformat()

                db_incident = {
                    "incident_id": incident["incident_id"],
                    "title": incident["title"][:300],
                    "description": incident.get("description", ""),
                    "incident_type": incident.get("incident_type", "other"),
                    "severity": incident.get("severity", "medium"),
                    "funds_lost_usd": incident.get("funds_lost_usd", 0),
                    "incident_date": incident_date,
                    "source_urls": incident.get("source_urls", []),
                    "status": "investigating" if incident.get("needs_verification") else "confirmed",
                    "is_published": not incident.get("needs_verification", False),
                    "created_by": f"scraper_{incident.get('source', 'unknown')}",
                }

                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/security_incidents",
                    headers=headers,
                    json=db_incident,
                    timeout=30
                )

                if response.status_code in [200, 201]:
                    saved_count += 1
                elif response.status_code == 409:
                    # Duplicate, already exists
                    pass
                else:
                    print(f"[Supabase] Error saving {incident['incident_id']}: {response.text}")

            except Exception as e:
                print(f"[Supabase] Error: {e}")

        print(f"[Supabase] Saved {saved_count} new incidents")
        return saved_count

    def _save_to_file(self, incidents: List[Dict]):
        """Fallback: save to local JSON file."""
        filename = f"incidents_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(os.path.dirname(__file__), "..", "..", "cache", filename)

        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        with open(filepath, "w") as f:
            json.dump(incidents, f, indent=2, default=str)

        print(f"[File] Saved {len(incidents)} incidents to {filename}")

    def run_full_scrape(self) -> Dict:
        """Run full scrape from all sources."""
        print("=" * 50)
        print("SafeScoring Incident Scraper")
        print(f"Started at: {datetime.now().isoformat()}")
        print("=" * 50)

        all_incidents = []

        # Scrape all sources
        all_incidents.extend(self.scrape_defillama_hacks())
        all_incidents.extend(self.scrape_twitter_alerts())
        all_incidents.extend(self.scrape_peckshield_alerts())

        # Deduplicate by incident_id
        seen = set()
        unique_incidents = []
        for inc in all_incidents:
            if inc["incident_id"] not in seen:
                seen.add(inc["incident_id"])
                unique_incidents.append(inc)

        # Save to database
        saved = self.save_to_supabase(unique_incidents)

        result = {
            "total_scraped": len(all_incidents),
            "unique_incidents": len(unique_incidents),
            "saved_to_db": saved,
            "timestamp": datetime.now().isoformat(),
        }

        print("=" * 50)
        print(f"Scrape complete: {result}")
        print("=" * 50)

        return result


def match_incidents_to_products():
    """
    Match scraped incidents to products in database.
    Creates entries in incident_product_impact table.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[Matcher] Supabase not configured")
        return

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    # Get unmatched incidents
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/security_incidents",
        headers=headers,
        params={"affected_product_ids": "eq.{}", "select": "*"},
        timeout=30
    )

    if response.status_code != 200:
        print(f"[Matcher] Error fetching incidents: {response.text}")
        return

    incidents = response.json()

    # Get all products
    products_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products",
        headers=headers,
        params={"select": "id,name,slug"},
        timeout=30
    )

    if products_response.status_code != 200:
        return

    products = products_response.json()
    product_names = {p["name"].lower(): p["id"] for p in products}
    product_slugs = {p["slug"].lower(): p["id"] for p in products}

    # Match incidents to products
    for incident in incidents:
        title = incident.get("title", "").lower()
        description = incident.get("description", "").lower()
        text = f"{title} {description}"

        matched_ids = []
        for name, pid in product_names.items():
            if name in text:
                matched_ids.append(pid)

        for slug, pid in product_slugs.items():
            if slug in text and pid not in matched_ids:
                matched_ids.append(pid)

        if matched_ids:
            # Update incident with matched products
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/security_incidents",
                headers={**headers, "Prefer": "return=minimal"},
                params={"incident_id": f"eq.{incident['incident_id']}"},
                json={"affected_product_ids": matched_ids},
                timeout=30
            )

            # Create impact entries
            for pid in matched_ids:
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/incident_product_impact",
                    headers={**headers, "Prefer": "resolution=ignore-duplicates"},
                    json={
                        "incident_id": incident["id"],
                        "product_id": pid,
                        "impact_level": "direct",
                    },
                    timeout=30
                )

            print(f"[Matcher] Matched {incident['incident_id']} to {len(matched_ids)} products")


if __name__ == "__main__":
    scraper = IncidentScraper()
    result = scraper.run_full_scrape()
    match_incidents_to_products()
    print(json.dumps(result, indent=2))
