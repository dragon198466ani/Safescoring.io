"""
Competitor Monitor - Automated scraping of competitor sites for honeypot detection

This script:
1. Scrapes configured competitor sites for product listings
2. Detects honeypot products that were copied from SafeScoring
3. Detects fingerprinting patterns in copied data
4. Stores findings and generates alerts

Usage:
    python src/automation/competitor_monitor.py [--competitor DOMAIN] [--check-only]

Environment:
    SUPABASE_URL: Supabase project URL
    SUPABASE_SERVICE_KEY: Service role key for database access
    TELEGRAM_BOT_TOKEN: For alert notifications (optional)
    TELEGRAM_CHAT_ID: Chat ID for alerts (optional)
"""

import os
import sys
import json
import hashlib
import argparse
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from supabase import create_client, Client
except ImportError:
    print("Please install supabase: pip install supabase")
    sys.exit(1)

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Please install beautifulsoup4: pip install beautifulsoup4")
    sys.exit(1)


# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

# Honeypot detection patterns (must match honeypot-products.js)
HONEYPOT_NAME_PATTERNS = [
    "SecureVault", "CryptoGuard", "BlockShield", "SafeKey", "TrustNode",
    "Vaultix", "ColdStore", "HexGuard",  # Hardware
    "Cryptex", "Vaulta", "Keystone", "Safenet", "Blockvault", "Chainkey",
    "Tokenex", "Signum", "Cipherex", "Wallex",  # Software
    "Nexbit", "Coinex", "Tradex", "Cryptobit",  # Exchanges
    "Fortis", "Anchor", "Guardian", "Sentinel", "Citadel", "Keyrock",  # Custody
]

HONEYPOT_COMPANY_PATTERNS = [
    "Cipher Technologies", "Nexus Security", "Vault Labs", "Haven Systems",
    "Bastion Hardware", "Aegis Labs", "Fortis Capital", "Sentinel Trust",
]


class CompetitorMonitor:
    """Monitor competitor sites for copied SafeScoring data"""

    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        })

    def get_active_competitors(self) -> List[Dict]:
        """Get list of active competitor sites to monitor"""
        result = self.supabase.table("competitor_scrapers").select("*").eq(
            "scrape_enabled", True
        ).eq("status", "active").execute()

        return result.data if result.data else []

    def add_competitor(self, name: str, domain: str, selectors: Dict = None) -> bool:
        """Add a new competitor to monitor"""
        try:
            self.supabase.table("competitor_scrapers").insert({
                "name": name,
                "domain": domain,
                "scrape_selectors": selectors or {},
                "status": "active",
            }).execute()
            print(f"[+] Added competitor: {name} ({domain})")
            return True
        except Exception as e:
            print(f"[!] Failed to add competitor: {e}")
            return False

    def scrape_competitor(self, competitor: Dict) -> List[Dict]:
        """Scrape products from a competitor site"""
        domain = competitor["domain"]
        selectors = competitor.get("scrape_selectors") or {}

        products = []
        urls_to_try = [
            f"https://{domain}",
            f"https://{domain}/products",
            f"https://{domain}/catalog",
            f"https://{domain}/wallets",
            f"https://{domain}/api/products",
        ]

        for url in urls_to_try:
            try:
                response = self.session.get(url, timeout=30)
                if response.status_code != 200:
                    continue

                # Try JSON API first
                try:
                    data = response.json()
                    if isinstance(data, list):
                        products.extend(data)
                    elif isinstance(data, dict):
                        # Look for products array in response
                        for key in ["products", "items", "data", "results"]:
                            if key in data and isinstance(data[key], list):
                                products.extend(data[key])
                                break
                    continue
                except:
                    pass

                # Parse HTML
                soup = BeautifulSoup(response.text, "html.parser")

                # Try to find product cards/items
                product_selectors = selectors.get("product_cards", [
                    ".product-card",
                    ".product-item",
                    "[data-product]",
                    ".wallet-card",
                    "article.product",
                ])

                for selector in product_selectors:
                    cards = soup.select(selector)
                    for card in cards:
                        product = self._extract_product_from_html(card, selectors)
                        if product:
                            products.append(product)

            except Exception as e:
                print(f"[!] Error scraping {url}: {e}")
                continue

        return products

    def _extract_product_from_html(self, element, selectors: Dict) -> Optional[Dict]:
        """Extract product data from HTML element"""
        try:
            # Name
            name_sel = selectors.get("name", ["h2", "h3", ".product-name", ".title"])
            name = None
            for sel in (name_sel if isinstance(name_sel, list) else [name_sel]):
                name_elem = element.select_one(sel)
                if name_elem:
                    name = name_elem.get_text(strip=True)
                    break

            if not name:
                return None

            # Score
            score = None
            score_sel = selectors.get("score", [".score", ".rating", "[data-score]"])
            for sel in (score_sel if isinstance(score_sel, list) else [score_sel]):
                score_elem = element.select_one(sel)
                if score_elem:
                    score_text = score_elem.get_text(strip=True)
                    try:
                        score = float(score_text.replace("/100", "").replace("%", "").strip())
                    except:
                        if score_elem.get("data-score"):
                            score = float(score_elem["data-score"])
                    break

            # Slug
            slug = None
            link = element.select_one("a[href]")
            if link:
                href = link.get("href", "")
                slug = href.rstrip("/").split("/")[-1]

            # Description
            desc = None
            desc_elem = element.select_one(".description, .summary, p")
            if desc_elem:
                desc = desc_elem.get_text(strip=True)

            return {
                "product_name": name,
                "product_slug": slug,
                "safe_score": score,
                "description": desc,
                "raw_html": str(element)[:5000],  # Limit size
            }

        except Exception as e:
            print(f"[!] Error extracting product: {e}")
            return None

    def check_for_honeypot(self, product: Dict) -> Optional[Dict]:
        """Check if a product is one of our honeypots"""
        name = product.get("product_name", "")
        slug = product.get("product_slug", "")
        description = product.get("description", "")

        # Check name patterns
        for pattern in HONEYPOT_NAME_PATTERNS:
            if pattern.lower() in name.lower():
                return {
                    "is_honeypot": True,
                    "match_type": "name_pattern",
                    "matched_pattern": pattern,
                    "confidence": 0.95,
                }

        # Check company patterns
        for pattern in HONEYPOT_COMPANY_PATTERNS:
            if pattern.lower() in (description or "").lower():
                return {
                    "is_honeypot": True,
                    "match_type": "company_pattern",
                    "matched_pattern": pattern,
                    "confidence": 0.90,
                }

        # Check for suspicious slug patterns
        suspicious_slugs = ["securevault", "cryptoguard", "blockshield", "safekey", "trustnode",
                           "vaultix", "coldstore", "hexguard"]
        if slug and any(s in slug.lower() for s in suspicious_slugs):
            return {
                "is_honeypot": True,
                "match_type": "slug_pattern",
                "matched_pattern": slug,
                "confidence": 0.85,
            }

        return None

    def check_for_fingerprint(self, product: Dict) -> Optional[Dict]:
        """Check if product shows signs of fingerprinting (copied with variations)"""
        name = product.get("product_name", "")

        # Check for Cyrillic characters mixed with Latin (homoglyph fingerprinting)
        cyrillic_chars = set("аеорсухАЕОРСУХ")  # Common lookalikes
        latin_chars = set("aeopscuxAEOPSCUX")

        has_cyrillic = bool(set(name) & cyrillic_chars)
        has_latin = bool(set(name) & latin_chars)

        if has_cyrillic and has_latin:
            return {
                "fingerprint_detected": True,
                "detection_type": "homoglyph",
                "confidence": 0.80,
            }

        # Check for zero-width characters
        zero_width = ["\u200B", "\u200C", "\u200D", "\uFEFF"]
        if any(zw in name for zw in zero_width):
            return {
                "fingerprint_detected": True,
                "detection_type": "zero_width",
                "confidence": 0.90,
            }

        return None

    def save_competitor_product(self, competitor_id: str, product: Dict,
                                honeypot_result: Optional[Dict],
                                fingerprint_result: Optional[Dict]):
        """Save a scraped product to the database"""
        try:
            data = {
                "competitor_id": competitor_id,
                "product_name": product.get("product_name"),
                "product_slug": product.get("product_slug"),
                "safe_score": product.get("safe_score"),
                "description": product.get("description"),
                "raw_html": product.get("raw_html"),
                "last_seen_at": datetime.utcnow().isoformat(),
            }

            if honeypot_result:
                data.update({
                    "is_honeypot": True,
                    "honeypot_confidence": honeypot_result.get("confidence"),
                    "honeypot_evidence": honeypot_result,
                })

            if fingerprint_result:
                data.update({
                    "fingerprint_detected": True,
                    "fingerprint_evidence": fingerprint_result,
                })

            # Upsert to handle updates
            self.supabase.table("competitor_products").upsert(
                data,
                on_conflict="competitor_id,product_slug"
            ).execute()

        except Exception as e:
            print(f"[!] Error saving product: {e}")

    def record_honeypot_detection(self, competitor_id: str, product: Dict,
                                   honeypot_result: Dict):
        """Record a honeypot detection for legal evidence"""
        try:
            self.supabase.table("honeypot_detections").insert({
                "competitor_id": competitor_id,
                "honeypot_name": product.get("product_name"),
                "honeypot_seed": honeypot_result.get("matched_pattern", "unknown"),
                "confidence": honeypot_result.get("confidence", 0.5),
                "match_type": honeypot_result.get("match_type"),
                "evidence_json": {
                    "product": product,
                    "detection": honeypot_result,
                    "timestamp": datetime.utcnow().isoformat(),
                },
                "status": "detected",
            }).execute()

            print(f"[!!!] HONEYPOT DETECTED: {product.get('product_name')}")

            # Send alert
            self.send_alert(
                f"🚨 HONEYPOT DETECTED!\n\n"
                f"Product: {product.get('product_name')}\n"
                f"Pattern: {honeypot_result.get('matched_pattern')}\n"
                f"Confidence: {honeypot_result.get('confidence', 0) * 100:.0f}%\n"
                f"Competitor: {competitor_id}"
            )

        except Exception as e:
            print(f"[!] Error recording detection: {e}")

    def send_alert(self, message: str):
        """Send alert via Telegram"""
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
            return

        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            requests.post(url, json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": message,
                "parse_mode": "HTML",
            }, timeout=10)
        except Exception as e:
            print(f"[!] Failed to send alert: {e}")

    def update_competitor_status(self, competitor_id: str, products_found: int,
                                  honeypots_detected: int, error: str = None):
        """Update competitor scraping status"""
        try:
            update_data = {
                "last_scraped_at": datetime.utcnow().isoformat(),
                "products_found": products_found,
            }

            if honeypots_detected > 0:
                update_data["honeypots_detected"] = honeypots_detected
                update_data["last_honeypot_at"] = datetime.utcnow().isoformat()

            if error:
                update_data["last_error"] = error
                update_data["consecutive_errors"] = 1  # Would need to increment

            self.supabase.table("competitor_scrapers").update(
                update_data
            ).eq("id", competitor_id).execute()

        except Exception as e:
            print(f"[!] Error updating status: {e}")

    def run(self, competitor_domain: str = None, check_only: bool = False):
        """Run the monitoring process"""
        print(f"[*] SafeScoring Competitor Monitor")
        print(f"[*] Started at: {datetime.utcnow().isoformat()}")
        print("-" * 50)

        competitors = self.get_active_competitors()

        if competitor_domain:
            competitors = [c for c in competitors if competitor_domain in c["domain"]]

        if not competitors:
            print("[!] No competitors configured. Add some with --add")
            return

        total_products = 0
        total_honeypots = 0
        total_fingerprints = 0

        for competitor in competitors:
            print(f"\n[*] Scanning: {competitor['name']} ({competitor['domain']})")

            if check_only:
                print("[*] Check-only mode, skipping scrape")
                continue

            try:
                products = self.scrape_competitor(competitor)
                print(f"[+] Found {len(products)} products")

                honeypots_found = 0
                fingerprints_found = 0

                for product in products:
                    # Check for honeypot
                    honeypot_result = self.check_for_honeypot(product)
                    if honeypot_result:
                        honeypots_found += 1
                        self.record_honeypot_detection(competitor["id"], product, honeypot_result)

                    # Check for fingerprint
                    fingerprint_result = self.check_for_fingerprint(product)
                    if fingerprint_result:
                        fingerprints_found += 1

                    # Save product
                    self.save_competitor_product(
                        competitor["id"], product, honeypot_result, fingerprint_result
                    )

                self.update_competitor_status(
                    competitor["id"],
                    len(products),
                    honeypots_found
                )

                total_products += len(products)
                total_honeypots += honeypots_found
                total_fingerprints += fingerprints_found

                print(f"[+] Honeypots: {honeypots_found}, Fingerprints: {fingerprints_found}")

            except Exception as e:
                print(f"[!] Error scanning {competitor['domain']}: {e}")
                self.update_competitor_status(competitor["id"], 0, 0, str(e))

        print("\n" + "-" * 50)
        print(f"[*] SUMMARY")
        print(f"[*] Total products scanned: {total_products}")
        print(f"[*] Honeypots detected: {total_honeypots}")
        print(f"[*] Fingerprints detected: {total_fingerprints}")
        print(f"[*] Completed at: {datetime.utcnow().isoformat()}")

        if total_honeypots > 0:
            self.send_alert(
                f"📊 Competitor Scan Complete\n\n"
                f"Products: {total_products}\n"
                f"🚨 Honeypots: {total_honeypots}\n"
                f"🔍 Fingerprints: {total_fingerprints}"
            )


def main():
    parser = argparse.ArgumentParser(description="SafeScoring Competitor Monitor")
    parser.add_argument("--competitor", help="Only scan specific competitor domain")
    parser.add_argument("--check-only", action="store_true", help="Check configuration without scraping")
    parser.add_argument("--add", nargs=2, metavar=("NAME", "DOMAIN"), help="Add new competitor")

    args = parser.parse_args()

    try:
        monitor = CompetitorMonitor()

        if args.add:
            monitor.add_competitor(args.add[0], args.add[1])
        else:
            monitor.run(args.competitor, args.check_only)

    except Exception as e:
        print(f"[!] Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
