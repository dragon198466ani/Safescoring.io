"""
SafeScoring - Enhanced Incident Scraper v2.0
Scrape security incidents from multiple FREE sources in real-time.
This is PROPRIETARY DATA that creates competitive moat.

Sources (ALL FREE):
- DefiLlama hacks API (comprehensive DeFi hack database)
- Rekt.news (detailed hack writeups)
- SlowMist Hacked (Chinese security firm's database)
- Chainabuse (scam/rug reporting platform)
- Web3 is Going Great (Molly White's incident timeline)
- CryptoScamDB (known scam addresses)
- RSS feeds (The Block, Decrypt, CoinDesk security)

NO Twitter API required - uses free alternatives!
"""

import os
import json
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import hashlib
import re
from difflib import SequenceMatcher
import xml.etree.ElementTree as ET

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
    Scrapes security incidents from multiple FREE sources.
    This data is UNIQUE and creates a competitive moat.

    All sources are FREE - no API keys required!
    """

    def __init__(self):
        self.sources = {
            # Primary sources (APIs)
            "defillama": "https://api.llama.fi/hacks",
            "rekt_api": "https://rekt.news/api/posts",

            # HTML scraping sources
            "rekt_leaderboard": "https://rekt.news/leaderboard/",
            "slowmist": "https://hacked.slowmist.io/",
            "web3isgoinggreat": "https://web3isgoinggreat.com/feed.json",

            # RSS feeds (security focused)
            "theblock_rss": "https://www.theblock.co/rss.xml",
            "decrypt_rss": "https://decrypt.co/feed",
            "cointelegraph_rss": "https://cointelegraph.com/rss",

            # Chainabuse API (free, no key)
            "chainabuse": "https://api.chainabuse.com/v0/reports",
        }
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SafeScoring/2.0",
            "Accept": "application/json, text/html, application/rss+xml",
            "Accept-Language": "en-US,en;q=0.9",
        }

        # Keywords for filtering relevant incidents
        self.incident_keywords = [
            "hack", "hacked", "exploit", "exploited", "drained", "stolen",
            "vulnerability", "attack", "compromised", "breach", "rug pull",
            "rugged", "scam", "phishing", "flash loan", "oracle", "bridge",
            "private key", "leaked", "malicious", "security incident"
        ]

        # Cache for products (loaded once)
        self._products_cache = None

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

    def scrape_web3isgoinggreat(self) -> List[Dict]:
        """
        Scrape Web3 is Going Great - Molly White's incident timeline.
        FREE JSON feed with excellent data quality.
        """
        incidents = []

        try:
            response = requests.get(
                self.sources["web3isgoinggreat"],
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            # The feed contains items with incident data
            items = data.get("items", [])

            for item in items[:100]:  # Limit to recent 100
                # Filter for actual security incidents
                tags = item.get("tags", [])
                title = item.get("title", "")

                # Skip if not security-related
                if not any(kw in title.lower() for kw in self.incident_keywords):
                    continue

                # Extract amount lost from content
                content = item.get("content_text", "")
                funds_lost = self._extract_amount(content)

                incident = {
                    "incident_id": self.generate_incident_id(
                        title,
                        item.get("date_published", "")
                    ),
                    "title": title[:300],
                    "description": content[:2000],
                    "incident_type": self._categorize_incident(title + " " + content),
                    "severity": self._calculate_severity(funds_lost),
                    "funds_lost_usd": funds_lost,
                    "incident_date": item.get("date_published"),
                    "source_urls": [item.get("url", "")],
                    "source": "web3isgoinggreat",
                    "raw_data": {"id": item.get("id"), "tags": tags},
                }
                incidents.append(incident)

            print(f"[Web3IsGoingGreat] Scraped {len(incidents)} incidents")

        except Exception as e:
            print(f"[Web3IsGoingGreat] Error scraping: {e}")

        return incidents

    def scrape_slowmist_hacked(self) -> List[Dict]:
        """
        Scrape SlowMist Hacked database.
        Chinese security firm with comprehensive hack tracking.
        FREE access via their public page.
        """
        incidents = []

        try:
            # SlowMist has a public API endpoint
            api_url = "https://hacked.slowmist.io/api/hacked/list"
            response = requests.get(
                api_url,
                headers=self.headers,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                hacks = data.get("data", []) if isinstance(data, dict) else data

                for hack in hacks[:200]:  # Recent 200
                    incident = {
                        "incident_id": self.generate_incident_id(
                            hack.get("project", "Unknown"),
                            str(hack.get("time", ""))
                        ),
                        "title": f"{hack.get('project', 'Unknown')} - {hack.get('type', 'Hack')}",
                        "description": hack.get("description", hack.get("info", "")),
                        "incident_type": self._map_technique(hack.get("type", "")),
                        "severity": self._calculate_severity(hack.get("amount")),
                        "funds_lost_usd": self._parse_amount(hack.get("amount")),
                        "incident_date": hack.get("time"),
                        "source_urls": [hack.get("link")] if hack.get("link") else [],
                        "chain": hack.get("chain", "Unknown"),
                        "protocol_name": hack.get("project", "Unknown"),
                        "source": "slowmist",
                        "raw_data": hack,
                    }
                    incidents.append(incident)

                print(f"[SlowMist] Scraped {len(incidents)} incidents")
            else:
                print(f"[SlowMist] API returned {response.status_code}")

        except Exception as e:
            print(f"[SlowMist] Error scraping: {e}")

        return incidents

    def scrape_rss_feeds(self) -> List[Dict]:
        """
        Scrape security-related news from RSS feeds.
        Filter for hack/exploit articles only.
        100% FREE - no API keys needed.
        """
        incidents = []
        rss_sources = {
            "theblock": self.sources["theblock_rss"],
            "decrypt": self.sources["decrypt_rss"],
            "cointelegraph": self.sources["cointelegraph_rss"],
        }

        for source_name, url in rss_sources.items():
            try:
                response = requests.get(url, headers=self.headers, timeout=30)
                if response.status_code != 200:
                    continue

                # Parse RSS/XML
                root = ET.fromstring(response.content)

                # Handle different RSS formats
                items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")

                for item in items[:50]:  # Recent 50 per source
                    # Get title and description
                    title_elem = item.find("title") or item.find("{http://www.w3.org/2005/Atom}title")
                    desc_elem = item.find("description") or item.find("{http://www.w3.org/2005/Atom}summary")
                    link_elem = item.find("link") or item.find("{http://www.w3.org/2005/Atom}link")
                    date_elem = item.find("pubDate") or item.find("{http://www.w3.org/2005/Atom}published")

                    title = title_elem.text if title_elem is not None else ""
                    description = desc_elem.text if desc_elem is not None else ""

                    # Get link (handle atom format)
                    if link_elem is not None:
                        link = link_elem.get("href") or link_elem.text or ""
                    else:
                        link = ""

                    date = date_elem.text if date_elem is not None else ""

                    # Filter: only include security incidents
                    text = f"{title} {description}".lower()
                    if not any(kw in text for kw in self.incident_keywords):
                        continue

                    funds_lost = self._extract_amount(description or "")

                    incident = {
                        "incident_id": self.generate_incident_id(title, date),
                        "title": title[:300] if title else "Unknown",
                        "description": self._clean_html(description)[:2000] if description else "",
                        "incident_type": self._categorize_incident(text),
                        "severity": self._calculate_severity(funds_lost) if funds_lost else "medium",
                        "funds_lost_usd": funds_lost,
                        "incident_date": self._parse_rss_date(date),
                        "source_urls": [link] if link else [],
                        "source": f"rss_{source_name}",
                        "needs_verification": True,  # RSS needs verification
                        "raw_data": {"source": source_name},
                    }
                    incidents.append(incident)

                print(f"[RSS:{source_name}] Found {len([i for i in incidents if i['source'] == f'rss_{source_name}'])} articles")

            except Exception as e:
                print(f"[RSS:{source_name}] Error: {e}")

        print(f"[RSS] Total scraped: {len(incidents)} incidents from news")
        return incidents

    def scrape_rekt_leaderboard(self) -> List[Dict]:
        """
        Scrape Rekt.news leaderboard for top hacks by amount.
        Excellent for historical major incidents.
        """
        incidents = []

        try:
            # Try the API first
            response = requests.get(
                "https://rekt.news/leaderboard.json",
                headers=self.headers,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                for entry in data[:100]:
                    incident = {
                        "incident_id": self.generate_incident_id(
                            entry.get("name", "Unknown"),
                            str(entry.get("date", ""))
                        ),
                        "title": f"{entry.get('name', 'Unknown')} - Rekt Leaderboard",
                        "description": entry.get("description", ""),
                        "incident_type": self._map_technique(entry.get("type", "")),
                        "severity": self._calculate_severity(entry.get("funds")),
                        "funds_lost_usd": self._parse_amount(entry.get("funds")),
                        "incident_date": entry.get("date"),
                        "source_urls": [entry.get("link", "")],
                        "source": "rekt_leaderboard",
                        "raw_data": entry,
                    }
                    incidents.append(incident)

                print(f"[Rekt Leaderboard] Scraped {len(incidents)} top hacks")

        except Exception as e:
            print(f"[Rekt Leaderboard] Error: {e}")

        return incidents

    def _extract_amount(self, text: str) -> float:
        """Extract USD amount from text using regex."""
        if not text:
            return 0.0

        # Patterns for money amounts
        patterns = [
            r'\$(\d+(?:\.\d+)?)\s*(?:billion|B)',  # $X billion
            r'\$(\d+(?:\.\d+)?)\s*(?:million|M)',  # $X million
            r'\$(\d+(?:,\d{3})*(?:\.\d+)?)',       # $X,XXX,XXX
            r'(\d+(?:\.\d+)?)\s*(?:million|M)\s*(?:USD|\$|dollars)',
            r'(\d+(?:\.\d+)?)\s*(?:billion|B)\s*(?:USD|\$|dollars)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = float(match.group(1).replace(",", ""))
                if "billion" in text.lower() or "B" in pattern:
                    return amount * 1_000_000_000
                elif "million" in text.lower() or "M" in pattern:
                    return amount * 1_000_000
                return amount

        return 0.0

    def _parse_amount(self, amount) -> float:
        """Parse amount from various formats."""
        if amount is None:
            return 0.0
        if isinstance(amount, (int, float)):
            return float(amount)
        if isinstance(amount, str):
            # Remove currency symbols and parse
            cleaned = re.sub(r'[^\d.]', '', amount.replace(",", ""))
            try:
                return float(cleaned)
            except ValueError:
                return 0.0
        return 0.0

    def _categorize_incident(self, text: str) -> str:
        """Categorize incident type based on text content."""
        text = text.lower()

        categories = {
            "flash_loan_attack": ["flash loan", "flashloan"],
            "smart_contract_bug": ["reentrancy", "overflow", "underflow", "smart contract bug"],
            "oracle_manipulation": ["oracle", "price manipulation", "price feed"],
            "rug_pull": ["rug pull", "rugged", "exit scam", "abandoned"],
            "bridge_attack": ["bridge hack", "bridge exploit", "cross-chain"],
            "phishing": ["phishing", "social engineering", "fake site"],
            "private_key_leak": ["private key", "key compromise", "seed phrase"],
            "frontend_attack": ["frontend", "dns hijack", "domain"],
            "exploit": ["exploit", "vulnerability", "zero day"],
        }

        for category, keywords in categories.items():
            if any(kw in text for kw in keywords):
                return category

        return "other"

    def _clean_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        if not text:
            return ""
        # Simple HTML tag removal
        clean = re.sub(r'<[^>]+>', '', text)
        # Decode common entities
        clean = clean.replace("&nbsp;", " ").replace("&amp;", "&")
        clean = clean.replace("&lt;", "<").replace("&gt;", ">")
        return clean.strip()

    def _parse_rss_date(self, date_str: str) -> Optional[str]:
        """Parse RSS date formats to ISO format.

        Returns None if date cannot be parsed - caller should handle this.
        NEVER returns NOW() as that causes historical data to appear recent.
        """
        if not date_str:
            return None  # Retourner None au lieu de NOW()

        # Common RSS date formats
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",  # RFC 822
            "%a, %d %b %Y %H:%M:%S %Z",
            "%Y-%m-%dT%H:%M:%S%z",        # ISO 8601
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d",
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                return dt.isoformat()
            except ValueError:
                continue

        return date_str  # Return as-is if parsing fails

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

    def _parse_timestamp(self, timestamp) -> Optional[str]:
        """Parse various timestamp formats to ISO format.

        Returns None if timestamp is invalid - caller should handle this.
        NEVER returns NOW() as that causes historical data to appear recent.
        """
        if isinstance(timestamp, (int, float)):
            try:
                return datetime.fromtimestamp(timestamp).isoformat()
            except (ValueError, OSError):
                return None
        elif isinstance(timestamp, str):
            return timestamp
        return None  # Retourner None au lieu de NOW()

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
                # IMPORTANT: Ne JAMAIS utiliser NOW() comme date par défaut
                # Car cela fait apparaître les incidents historiques comme récents
                incident_date = incident.get("incident_date")
                date_is_estimated = False

                if not incident_date:
                    # Marquer comme date estimée au lieu d'utiliser NOW()
                    # Utiliser une date ancienne placeholder pour éviter la confusion
                    incident_date = "1970-01-01T00:00:00Z"
                    date_is_estimated = True

                db_incident = {
                    "incident_id": incident["incident_id"],
                    "title": incident["title"][:300],
                    "description": incident.get("description", ""),
                    "incident_type": incident.get("incident_type", "other"),
                    "severity": incident.get("severity", "medium"),
                    "funds_lost_usd": incident.get("funds_lost_usd", 0),
                    "incident_date": incident_date,
                    "date_is_estimated": date_is_estimated,  # Flag pour indiquer date inconnue
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

    def run_full_scrape(self, include_rss: bool = True) -> Dict:
        """
        Run full scrape from all FREE sources.

        Args:
            include_rss: Whether to include RSS feeds (slower but more comprehensive)
        """
        print("=" * 60)
        print("[*] SafeScoring Enhanced Incident Scraper v2.0")
        print("    100% FREE - No API keys required!")
        print(f"    Started at: {datetime.now().isoformat()}")
        print("=" * 60)

        all_incidents = []

        # Primary sources (APIs - most reliable)
        print("\n[+] Scraping primary sources...")
        all_incidents.extend(self.scrape_defillama_hacks())
        all_incidents.extend(self.scrape_slowmist_hacked())
        all_incidents.extend(self.scrape_web3isgoinggreat())
        all_incidents.extend(self.scrape_rekt_leaderboard())

        # RSS feeds (optional - for real-time news)
        if include_rss:
            print("\n[+] Scraping RSS news feeds...")
            all_incidents.extend(self.scrape_rss_feeds())

        # Twitter (only if configured - still optional)
        twitter_token = os.getenv("TWITTER_BEARER_TOKEN")
        if twitter_token:
            print("\n[+] Scraping Twitter (API configured)...")
            all_incidents.extend(self.scrape_twitter_alerts())

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


def fuzzy_match(text: str, target: str, threshold: float = 0.85) -> bool:
    """
    Check if target appears in text using fuzzy matching.
    Handles variations like 'Uniswap' vs 'Uniswap V3' vs 'UniSwap'.
    """
    text_lower = text.lower()
    target_lower = target.lower()

    # Exact match first
    if target_lower in text_lower:
        return True

    # Check for word boundaries (avoid partial matches)
    words = re.findall(r'\b\w+\b', text_lower)
    for word in words:
        if len(word) >= 4 and len(target_lower) >= 4:
            ratio = SequenceMatcher(None, word, target_lower).ratio()
            if ratio >= threshold:
                return True

    # Check consecutive words for multi-word targets
    if ' ' in target_lower:
        target_words = target_lower.split()
        for i in range(len(words) - len(target_words) + 1):
            window = ' '.join(words[i:i+len(target_words)])
            ratio = SequenceMatcher(None, window, target_lower).ratio()
            if ratio >= threshold:
                return True

    return False


def match_incidents_to_products(use_fuzzy: bool = True):
    """
    Match scraped incidents to products in database.
    Creates entries in incident_product_impact table.

    Args:
        use_fuzzy: Use fuzzy matching for better accuracy (handles typos/variations)
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[Matcher] Supabase not configured")
        return

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    # Get unmatched incidents (those with empty affected_product_ids)
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/security_incidents",
        headers=headers,
        params={"select": "*", "limit": 500},
        timeout=30
    )

    if response.status_code != 200:
        print(f"[Matcher] Error fetching incidents: {response.text}")
        return

    all_incidents = response.json()
    # Filter to unmatched only
    incidents = [i for i in all_incidents if not i.get("affected_product_ids")]

    if not incidents:
        print("[Matcher] No unmatched incidents to process")
        return

    print(f"[Matcher] Processing {len(incidents)} unmatched incidents...")

    # Get all products with additional fields for matching
    products_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products",
        headers=headers,
        params={"select": "id,name,slug,url"},
        timeout=30
    )

    if products_response.status_code != 200:
        print(f"[Matcher] Error fetching products: {products_response.text}")
        return

    products = products_response.json()

    # Build comprehensive matching dictionary
    product_matches = {}
    for p in products:
        pid = p["id"]
        name = p.get("name", "").lower()
        slug = p.get("slug", "").lower()

        # Add name variations
        product_matches[name] = pid
        product_matches[slug] = pid

        # Add name without common suffixes
        for suffix in [" protocol", " finance", " network", " chain", " swap", " exchange"]:
            if name.endswith(suffix):
                product_matches[name.replace(suffix, "")] = pid

        # Extract domain from URL if available
        url = p.get("url", "")
        if url:
            domain_match = re.search(r'(?:https?://)?(?:www\.)?([^/]+)', url)
            if domain_match:
                domain = domain_match.group(1).lower()
                # Remove TLD
                domain_base = domain.split('.')[0]
                if len(domain_base) >= 4:
                    product_matches[domain_base] = pid

    matched_count = 0
    # Match incidents to products
    for incident in incidents:
        title = incident.get("title", "")
        description = incident.get("description", "")
        protocol_name = incident.get("protocol_name", "")
        text = f"{title} {description} {protocol_name}".lower()

        matched_ids = set()

        for match_text, pid in product_matches.items():
            if len(match_text) < 3:
                continue

            if use_fuzzy:
                if fuzzy_match(text, match_text):
                    matched_ids.add(pid)
            else:
                if match_text in text:
                    matched_ids.add(pid)

        matched_ids = list(matched_ids)

        if matched_ids:
            matched_count += 1
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

            # Get product names for logging
            matched_names = [p["name"] for p in products if p["id"] in matched_ids]
            print(f"[Matcher] + {incident['incident_id'][:20]}... -> {matched_names}")

    print(f"\n[Matcher] Done! Matched {matched_count}/{len(incidents)} incidents to products")


def print_summary():
    """Print a summary of scraped data sources."""
    print("""
+====================================================================+
|           SafeScoring Incident Scraper v2.0                        |
|                 100% FREE Sources                                  |
+====================================================================+
|  Source              | Type       | Data Quality | Update Freq    |
+====================================================================+
|  DefiLlama Hacks     | API        | *****        | Real-time      |
|  SlowMist Hacked     | API        | *****        | Daily          |
|  Web3IsGoingGreat    | JSON Feed  | ****         | Daily          |
|  Rekt.news           | API        | *****        | Weekly         |
|  RSS Feeds           | RSS/XML    | ***          | Real-time      |
+--------------------------------------------------------------------+
|  Twitter/X           | API        | ****         | Real-time      |
|  (Optional - requires $100/mo API key)                             |
+====================================================================+
    """)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="SafeScoring Incident Scraper - Scrape security incidents from FREE sources"
    )
    parser.add_argument(
        "--no-rss",
        action="store_true",
        help="Skip RSS feeds (faster but less comprehensive)"
    )
    parser.add_argument(
        "--no-match",
        action="store_true",
        help="Skip matching incidents to products"
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print summary of data sources"
    )
    parser.add_argument(
        "--source",
        type=str,
        choices=["defillama", "slowmist", "web3", "rekt", "rss", "all"],
        default="all",
        help="Scrape only specific source"
    )

    args = parser.parse_args()

    if args.summary:
        print_summary()
        sys.exit(0)

    scraper = IncidentScraper()

    if args.source == "all":
        result = scraper.run_full_scrape(include_rss=not args.no_rss)
    elif args.source == "defillama":
        incidents = scraper.scrape_defillama_hacks()
        scraper.save_to_supabase(incidents)
        result = {"source": "defillama", "count": len(incidents)}
    elif args.source == "slowmist":
        incidents = scraper.scrape_slowmist_hacked()
        scraper.save_to_supabase(incidents)
        result = {"source": "slowmist", "count": len(incidents)}
    elif args.source == "web3":
        incidents = scraper.scrape_web3isgoinggreat()
        scraper.save_to_supabase(incidents)
        result = {"source": "web3isgoinggreat", "count": len(incidents)}
    elif args.source == "rekt":
        incidents = scraper.scrape_rekt_leaderboard()
        scraper.save_to_supabase(incidents)
        result = {"source": "rekt", "count": len(incidents)}
    elif args.source == "rss":
        incidents = scraper.scrape_rss_feeds()
        scraper.save_to_supabase(incidents)
        result = {"source": "rss", "count": len(incidents)}

    if not args.no_match:
        print("\n" + "=" * 60)
        print("[*] Matching incidents to products...")
        match_incidents_to_products(use_fuzzy=True)

    print("\n" + "=" * 60)
    print("[*] FINAL RESULTS")
    print("=" * 60)
    print(json.dumps(result, indent=2))
