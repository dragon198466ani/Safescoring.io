#!/usr/bin/env python3
"""
SafeScoring - Twitter/X Crypto Alerts Scraper v1.0
Scrapes crypto security alerts from X/Twitter WITHOUT the expensive API.

STRATEGY:
1. Uses RSS feeds from Nitter instances (FREE Twitter mirrors)
2. Monitors specific security accounts (@zachxbt, @PeckShieldAlert, etc.)
3. Filters tweets using keyword matching before AI analysis
4. Sends batches to Grok via OpenRouter for incident extraction

SOURCES (Priority Order):
- @zachxbt - On-chain investigator (highest signal)
- @PeckShieldAlert - Real-time DeFi hack alerts
- @CertiKAlert - Smart contract vulnerability alerts
- @SlowMist_Team - Chinese security firm
- @Whale_Alert - Large fund movements (potential stolen funds)
- @samczsun - Security researcher

COST: $0 (uses RSS + OpenRouter free tier)
"""

import os
import sys
import json
import requests
import hashlib
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from difflib import SequenceMatcher

# Add parent to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from src.core.api_provider import ai_provider
    from src.core.config import SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY
except ImportError:
    ai_provider = None
    SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')


@dataclass
class Tweet:
    """Structured tweet data for analysis."""
    id: str
    text: str
    author: str
    url: str
    created_at: str
    source: str = "nitter"
    engagement: int = 0  # likes + retweets


@dataclass
class CryptoIncident:
    """Extracted crypto incident from tweet analysis."""
    incident_id: str
    title: str
    description: str
    incident_type: str
    severity: str
    funds_lost_usd: float
    incident_date: str
    source_urls: List[str]
    tweet_id: str
    confidence: float
    source: str = "twitter_grok"


class TwitterCryptoScraper:
    """
    Scrapes Twitter/X for crypto security alerts using FREE methods.
    No Twitter API required - uses Nitter RSS feeds.
    """

    # Priority accounts to monitor (in order of signal quality)
    ALERT_ACCOUNTS = [
        "zachxbt",         # On-chain investigator - highest quality
        "PeckShieldAlert", # Automated DeFi hack detection
        "CertiKAlert",     # Smart contract audits & alerts
        "SlowMist_Team",   # Chinese security firm
        "samczsun",        # Security researcher
        "Whale_Alert",     # Large fund movements
        "BlockSecTeam",    # Security research team
        "DeFiLlama",       # DeFi analytics (hack tweets)
        "web3isgoinggreat",# Molly White's incident tracker
    ]

    # Nitter instances (Twitter mirrors with RSS) - try multiple for reliability
    NITTER_INSTANCES = [
        "https://nitter.poast.org",
        "https://nitter.privacydev.net",
        "https://nitter.cz",
        "https://nitter.1d4.us",
        "https://nitter.kavin.rocks",
        "https://nitter.unixfox.eu",
    ]

    # Keywords that indicate a real security incident
    INCIDENT_KEYWORDS = [
        "hack", "hacked", "exploit", "exploited", "drained", "stolen",
        "vulnerability", "attack", "compromised", "breach", "rug pull",
        "rugged", "scam", "phishing", "flash loan", "oracle", "bridge",
        "private key", "leaked", "malicious", "security incident",
        "funds lost", "million", "M stolen", "$ drained", "suspicious",
        "front-end attack", "dns hijack", "contract bug", "reentrancy"
    ]

    # Keywords to filter OUT (noise reduction)
    NOISE_KEYWORDS = [
        "giveaway", "airdrop", "follow to win", "retweet to", "dm me",
        "join now", "limited time", "exclusive offer", "discount",
        "nft drop", "whitelist", "presale", "wen moon", "price prediction",
        "technical analysis", "chart", "bullish", "bearish", "buy now"
    ]

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SafeScoring/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml',
        })
        self.working_nitter = None
        self.tweets_cache = {}  # Cache to avoid duplicates

    def _find_working_nitter(self) -> Optional[str]:
        """Find a working Nitter instance."""
        if self.working_nitter:
            return self.working_nitter

        for instance in self.NITTER_INSTANCES:
            try:
                r = self.session.get(f"{instance}/zachxbt/rss", timeout=10)
                if r.status_code == 200 and '<rss' in r.text.lower():
                    print(f"    [Nitter] Using instance: {instance}")
                    self.working_nitter = instance
                    return instance
            except Exception:
                continue

        print("    [Nitter] No working instance found!")
        return None

    def _generate_tweet_id(self, text: str, author: str, date: str) -> str:
        """Generate unique ID for a tweet."""
        raw = f"{author}_{text[:100]}_{date}"
        return f"TW-{hashlib.md5(raw.encode()).hexdigest()[:12].upper()}"

    def _is_potential_incident(self, text: str) -> bool:
        """
        Check if tweet text indicates a potential security incident.
        Uses keyword matching for pre-filtering before AI analysis.
        """
        text_lower = text.lower()

        # Filter out obvious noise
        if any(noise in text_lower for noise in self.NOISE_KEYWORDS):
            return False

        # Must contain at least 2 incident keywords
        incident_count = sum(1 for kw in self.INCIDENT_KEYWORDS if kw in text_lower)

        # Also check for money amounts (strong indicator)
        has_money = bool(re.search(r'\$[\d,.]+[kmb]?|\d+\s*(?:million|billion|M|B)', text, re.IGNORECASE))

        return incident_count >= 2 or (incident_count >= 1 and has_money)

    def _parse_nitter_rss(self, xml_content: str, author: str) -> List[Tweet]:
        """Parse Nitter RSS feed into Tweet objects."""
        tweets = []

        try:
            root = ET.fromstring(xml_content)
            items = root.findall('.//item')

            for item in items[:20]:  # Last 20 tweets per account
                title_elem = item.find('title')
                link_elem = item.find('link')
                pubdate_elem = item.find('pubDate')
                desc_elem = item.find('description')

                text = title_elem.text if title_elem is not None else ""
                link = link_elem.text if link_elem is not None else ""
                pubdate = pubdate_elem.text if pubdate_elem is not None else ""

                # Skip retweets by default (usually lower signal)
                if text.startswith('RT @'):
                    continue

                # Pre-filter: only keep potential incidents
                if not self._is_potential_incident(text):
                    continue

                # Extract tweet ID from URL
                tweet_id_match = re.search(r'/status/(\d+)', link)
                tweet_id = tweet_id_match.group(1) if tweet_id_match else self._generate_tweet_id(text, author, pubdate)

                # Convert Nitter URL to Twitter URL
                twitter_url = link.replace(self.working_nitter or '', 'https://twitter.com')

                tweet = Tweet(
                    id=tweet_id,
                    text=text[:500],  # Limit text length
                    author=author,
                    url=twitter_url,
                    created_at=self._parse_rss_date(pubdate),
                    source="nitter_rss"
                )
                tweets.append(tweet)

        except ET.ParseError as e:
            print(f"    [RSS Parse Error] {author}: {e}")
        except Exception as e:
            print(f"    [RSS Error] {author}: {e}")

        return tweets

    def _parse_rss_date(self, date_str: str) -> str:
        """Parse RSS date to ISO format."""
        if not date_str:
            return datetime.now().isoformat()

        formats = [
            "%a, %d %b %Y %H:%M:%S %z",
            "%a, %d %b %Y %H:%M:%S %Z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                return dt.isoformat()
            except ValueError:
                continue

        return date_str

    def scrape_account(self, username: str) -> List[Tweet]:
        """Scrape tweets from a single account via Nitter RSS."""
        tweets = []
        nitter = self._find_working_nitter()

        if not nitter:
            return tweets

        try:
            url = f"{nitter}/{username}/rss"
            r = self.session.get(url, timeout=15)

            if r.status_code == 200:
                tweets = self._parse_nitter_rss(r.text, username)
                print(f"    [@{username}] Found {len(tweets)} relevant tweets")
            else:
                print(f"    [@{username}] HTTP {r.status_code}")

        except requests.exceptions.Timeout:
            print(f"    [@{username}] Timeout")
        except Exception as e:
            print(f"    [@{username}] Error: {e}")

        return tweets

    def scrape_all_accounts(self, accounts: List[str] = None) -> List[Tweet]:
        """Scrape all priority accounts for crypto alerts."""
        if accounts is None:
            accounts = self.ALERT_ACCOUNTS

        all_tweets = []
        print(f"\n[*] Scraping {len(accounts)} Twitter accounts via Nitter RSS...")

        for account in accounts:
            tweets = self.scrape_account(account)
            all_tweets.extend(tweets)

        # Deduplicate by tweet ID
        seen = set()
        unique_tweets = []
        for tweet in all_tweets:
            if tweet.id not in seen:
                seen.add(tweet.id)
                unique_tweets.append(tweet)

        print(f"\n[*] Total unique tweets found: {len(unique_tweets)}")
        return unique_tweets

    def analyze_tweets_with_grok(self, tweets: List[Tweet], batch_size: int = 10) -> List[Dict]:
        """
        Analyze tweets using Grok via OpenRouter to extract incidents.

        Args:
            tweets: List of Tweet objects to analyze
            batch_size: Number of tweets per API call (max 10 recommended)

        Returns:
            List of extracted incident dictionaries
        """
        if not tweets:
            print("[Grok] No tweets to analyze")
            return []

        if not ai_provider:
            print("[Grok] AI provider not available")
            return []

        all_incidents = []
        batches = [tweets[i:i + batch_size] for i in range(0, len(tweets), batch_size)]

        print(f"\n[*] Analyzing {len(tweets)} tweets in {len(batches)} batches...")

        for i, batch in enumerate(batches):
            print(f"    [Batch {i+1}/{len(batches)}] Analyzing {len(batch)} tweets...")

            # Convert Tweet objects to dicts for AI
            tweet_dicts = [
                {
                    'id': t.id,
                    'text': t.text,
                    'author': t.author,
                    'url': t.url
                }
                for t in batch
            ]

            try:
                result = ai_provider.call_for_incident_analysis(tweet_dicts)

                if result:
                    # Parse JSON response
                    try:
                        # Handle potential markdown code blocks
                        if '```json' in result:
                            result = result.split('```json')[1].split('```')[0]
                        elif '```' in result:
                            result = result.split('```')[1].split('```')[0]

                        data = json.loads(result)
                        incidents = data.get('incidents', [])

                        for inc in incidents:
                            # Convert to standardized format
                            incident = self._convert_grok_incident(inc)
                            if incident:
                                all_incidents.append(incident)

                        meta = data.get('meta', {})
                        print(f"        Found {len(incidents)} incidents, "
                              f"filtered {meta.get('false_positives_filtered', 0)} false positives")

                    except json.JSONDecodeError as e:
                        print(f"        [JSON Error] {e}")
                        # Try to extract any incidents mentioned
                        continue
                else:
                    print(f"        [No response from AI]")

            except Exception as e:
                print(f"        [Error] {e}")
                continue

        print(f"\n[*] Total incidents extracted: {len(all_incidents)}")
        return all_incidents

    def _convert_grok_incident(self, grok_incident: Dict) -> Optional[Dict]:
        """Convert Grok's incident format to database schema."""
        try:
            # Map Grok severity to our schema
            severity_map = {
                'Faible': 'low',
                'Modérée': 'medium',
                'Critique': 'critical',
                'Low': 'low',
                'Medium': 'medium',
                'High': 'high',
                'Critical': 'critical'
            }

            # Map Grok type to our schema
            type_map = {
                'Hack': 'hack',
                'Exploit': 'exploit',
                'Rugpull': 'rug_pull',
                'Phishing': 'phishing',
                'Fuite de données': 'vulnerability',
                'Flash Loan': 'flash_loan_attack',
                'Bridge Attack': 'bridge_attack',
                'Oracle Manipulation': 'oracle_manipulation'
            }

            # Parse funds lost
            funds_str = grok_incident.get('perte_estimee', 'Inconnu')
            funds_lost = self._parse_funds(funds_str)

            # Generate incident ID
            project = grok_incident.get('projet', 'Unknown')
            incident_id = f"INC-{hashlib.md5(f'{project}_{datetime.now().date()}'.encode()).hexdigest()[:12].upper()}"

            return {
                'incident_id': incident_id,
                'title': f"{project} - {grok_incident.get('type', 'Security Incident')}",
                'description': grok_incident.get('resume', ''),
                'incident_type': type_map.get(grok_incident.get('type', ''), 'other'),
                'severity': severity_map.get(grok_incident.get('gravite', ''), 'medium'),
                'funds_lost_usd': funds_lost,
                'incident_date': datetime.now().isoformat(),
                'source_urls': [grok_incident.get('url_source', '')],
                'tweet_id': grok_incident.get('id_tweet', ''),
                'confidence': float(grok_incident.get('confidence', 0.8)),
                'source': 'twitter_grok',
                'protocol_name': project,
                'needs_verification': grok_incident.get('confidence', 0.8) < 0.85
            }

        except Exception as e:
            print(f"    [Convert Error] {e}")
            return None

    def _parse_funds(self, funds_str: str) -> float:
        """Parse funds lost string to float."""
        if not funds_str or funds_str.lower() in ['inconnu', 'unknown', 'n/a']:
            return 0.0

        try:
            # Remove currency symbols and clean
            cleaned = re.sub(r'[^\d.kmb]', '', funds_str.lower())

            # Handle suffixes
            if 'b' in cleaned:
                return float(cleaned.replace('b', '')) * 1_000_000_000
            elif 'm' in cleaned:
                return float(cleaned.replace('m', '')) * 1_000_000
            elif 'k' in cleaned:
                return float(cleaned.replace('k', '')) * 1_000
            else:
                return float(cleaned) if cleaned else 0.0

        except (ValueError, AttributeError):
            return 0.0

    def save_incidents_to_supabase(self, incidents: List[Dict]) -> int:
        """Save extracted incidents to Supabase."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("[Supabase] Not configured - saving to file")
            self._save_to_file(incidents)
            return 0

        saved_count = 0
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        }

        for incident in incidents:
            try:
                db_incident = {
                    'incident_id': incident['incident_id'],
                    'title': incident['title'][:300],
                    'description': incident.get('description', '')[:2000],
                    'incident_type': incident.get('incident_type', 'other'),
                    'severity': incident.get('severity', 'medium'),
                    'funds_lost_usd': incident.get('funds_lost_usd', 0),
                    'incident_date': incident.get('incident_date'),
                    'source_urls': incident.get('source_urls', []),
                    'status': 'investigating' if incident.get('needs_verification') else 'confirmed',
                    'is_published': not incident.get('needs_verification', True),
                    'created_by': 'scraper_twitter_grok',
                }

                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/security_incidents",
                    headers=headers,
                    json=db_incident,
                    timeout=30
                )

                if response.status_code in [200, 201]:
                    saved_count += 1
                    print(f"    [+] Saved: {incident['title'][:50]}...")
                elif response.status_code == 409:
                    pass  # Duplicate
                else:
                    print(f"    [!] Error: {response.text[:100]}")

            except Exception as e:
                print(f"    [!] Save error: {e}")

        print(f"\n[Supabase] Saved {saved_count}/{len(incidents)} new incidents")
        return saved_count

    def _save_to_file(self, incidents: List[Dict]):
        """Fallback: save to local JSON file."""
        cache_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'cache')
        os.makedirs(cache_dir, exist_ok=True)

        filename = f"twitter_incidents_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(cache_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(incidents, f, indent=2, default=str, ensure_ascii=False)

        print(f"[File] Saved {len(incidents)} incidents to {filename}")

    def run_full_pipeline(self, accounts: List[str] = None, batch_size: int = 10) -> Dict:
        """
        Run the complete scraping and analysis pipeline.

        1. Scrape tweets from priority accounts via Nitter
        2. Pre-filter for potential incidents (keyword matching)
        3. Analyze with Grok via OpenRouter (batch processing)
        4. Save verified incidents to database

        Args:
            accounts: List of Twitter handles to monitor (default: ALERT_ACCOUNTS)
            batch_size: Tweets per Grok API call (recommended: 10)

        Returns:
            Dict with statistics
        """
        print("=" * 70)
        print("  SafeScoring Twitter Crypto Alerts Scraper v1.0")
        print("  FREE: Uses Nitter RSS + OpenRouter/Grok")
        print(f"  Started: {datetime.now().isoformat()}")
        print("=" * 70)

        # Step 1: Scrape tweets
        tweets = self.scrape_all_accounts(accounts)

        if not tweets:
            return {
                'status': 'no_tweets',
                'message': 'No relevant tweets found',
                'timestamp': datetime.now().isoformat()
            }

        # Step 2: Analyze with Grok
        incidents = self.analyze_tweets_with_grok(tweets, batch_size)

        # Step 3: Save to database
        saved = self.save_incidents_to_supabase(incidents)

        result = {
            'status': 'success',
            'tweets_scraped': len(tweets),
            'incidents_extracted': len(incidents),
            'incidents_saved': saved,
            'accounts_monitored': len(accounts or self.ALERT_ACCOUNTS),
            'timestamp': datetime.now().isoformat()
        }

        print("\n" + "=" * 70)
        print("  RESULTS")
        print("=" * 70)
        print(json.dumps(result, indent=2))

        return result


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Scrape Twitter for crypto security incidents using FREE methods"
    )
    parser.add_argument(
        '--accounts',
        nargs='+',
        help='Specific accounts to monitor (default: priority list)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10,
        help='Tweets per Grok API call (default: 10)'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Test mode: only scrape, no AI analysis'
    )

    args = parser.parse_args()

    scraper = TwitterCryptoScraper()

    if args.test:
        # Test mode: just scrape and show results
        tweets = scraper.scrape_all_accounts(args.accounts)
        for t in tweets[:10]:
            print(f"\n@{t.author}: {t.text[:200]}...")
            print(f"  URL: {t.url}")
    else:
        # Full pipeline
        result = scraper.run_full_pipeline(args.accounts, args.batch_size)
        return 0 if result.get('status') == 'success' else 1


if __name__ == "__main__":
    sys.exit(main() or 0)
