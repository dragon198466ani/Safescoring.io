#!/usr/bin/env python3
"""
SAFESCORING.IO - Crypto News & Hack Monitor
Monitors crypto security incidents, hacks, and news for content opportunities.

Sources:
- RSS feeds (Rekt News, CoinDesk, Decrypt, etc.)
- Twitter/X API (crypto security accounts)
- DeFiLlama hacks API
- Web3IsGoingGreat
"""

import requests
import feedparser
import json
import os
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import hashlib


class CryptoMonitor:
    """
    Monitors crypto ecosystem for marketing-relevant events.
    Focuses on: hacks, security incidents, major news, product launches.
    """

    # RSS Feeds for crypto news
    RSS_FEEDS = {
        'rekt_news': 'https://rekt.news/rss.xml',
        'coindesk': 'https://www.coindesk.com/arc/outboundfeeds/rss/',
        'decrypt': 'https://decrypt.co/feed',
        'cointelegraph': 'https://cointelegraph.com/rss',
        'theblock': 'https://www.theblock.co/rss.xml',
    }

    # Keywords that indicate security-relevant content
    SECURITY_KEYWORDS = [
        'hack', 'hacked', 'exploit', 'exploited', 'vulnerability', 'breach',
        'stolen', 'drained', 'attack', 'compromised', 'security', 'bug',
        'rug pull', 'rugpull', 'scam', 'phishing', 'malware', 'ransomware',
        'flash loan', 'oracle', 'bridge', 'wallet', 'private key', 'seed phrase',
        'cold storage', 'hardware wallet', 'ledger', 'trezor', 'multisig',
        'audit', 'vulnerability', 'CVE', 'zero day', '0day'
    ]

    # High-value keywords for viral potential
    VIRAL_KEYWORDS = [
        'million', 'billion', '$', 'largest', 'biggest', 'breaking',
        'urgent', 'warning', 'alert', 'confirmed', 'just in'
    ]

    def __init__(self, cache_dir: str = 'data/marketing_cache'):
        """Initialize the crypto monitor with cache directory."""
        self.cache_dir = cache_dir
        self.seen_items_file = os.path.join(cache_dir, 'seen_items.json')
        self.events_file = os.path.join(cache_dir, 'events.json')

        os.makedirs(cache_dir, exist_ok=True)
        self.seen_items = self._load_seen_items()

    def _load_seen_items(self) -> set:
        """Load previously seen item IDs to avoid duplicates."""
        try:
            if os.path.exists(self.seen_items_file):
                with open(self.seen_items_file, 'r') as f:
                    return set(json.load(f))
        except Exception:
            pass
        return set()

    def _save_seen_items(self):
        """Save seen items to disk."""
        try:
            # Keep only last 1000 items to prevent file bloat
            items_list = list(self.seen_items)[-1000:]
            with open(self.seen_items_file, 'w') as f:
                json.dump(items_list, f)
        except Exception as e:
            print(f"Warning: Could not save seen items: {e}")

    def _get_item_id(self, item: Dict) -> str:
        """Generate unique ID for an item."""
        content = f"{item.get('title', '')}{item.get('link', '')}"
        return hashlib.md5(content.encode()).hexdigest()

    def _calculate_relevance_score(self, title: str, summary: str = '') -> int:
        """
        Calculate relevance score for an item.
        Higher score = more relevant for SafeScoring marketing.

        Returns: 0-100 score
        """
        text = f"{title} {summary}".lower()
        score = 0

        # Security keywords (high value)
        security_matches = sum(1 for kw in self.SECURITY_KEYWORDS if kw in text)
        score += min(security_matches * 15, 60)  # Max 60 points

        # Viral keywords (medium value)
        viral_matches = sum(1 for kw in self.VIRAL_KEYWORDS if kw in text)
        score += min(viral_matches * 10, 30)  # Max 30 points

        # Money amounts boost (indicates significant event)
        money_pattern = r'\$[\d,]+\s*(million|billion|m|b|k)?'
        if re.search(money_pattern, text, re.IGNORECASE):
            score += 10

        return min(score, 100)

    def _categorize_event(self, title: str, summary: str = '') -> str:
        """Categorize the event type for content strategy."""
        text = f"{title} {summary}".lower()

        if any(kw in text for kw in ['hack', 'exploit', 'drained', 'stolen', 'attack']):
            return 'HACK'
        elif any(kw in text for kw in ['rug pull', 'rugpull', 'scam', 'fraud']):
            return 'SCAM'
        elif any(kw in text for kw in ['vulnerability', 'bug', 'cve', 'patch']):
            return 'VULNERABILITY'
        elif any(kw in text for kw in ['audit', 'security review']):
            return 'AUDIT'
        elif any(kw in text for kw in ['wallet', 'ledger', 'trezor', 'hardware']):
            return 'WALLET'
        elif any(kw in text for kw in ['regulation', 'sec', 'law', 'ban']):
            return 'REGULATION'
        else:
            return 'GENERAL'

    def fetch_rss_feeds(self) -> List[Dict]:
        """Fetch and parse all RSS feeds."""
        all_items = []

        for source, url in self.RSS_FEEDS.items():
            try:
                feed = feedparser.parse(url)

                for entry in feed.entries[:20]:  # Last 20 per feed
                    item_id = self._get_item_id({
                        'title': entry.get('title', ''),
                        'link': entry.get('link', '')
                    })

                    # Skip if already seen
                    if item_id in self.seen_items:
                        continue

                    title = entry.get('title', '')
                    summary = entry.get('summary', '')[:500]

                    relevance = self._calculate_relevance_score(title, summary)

                    # Only include relevant items (score > 20)
                    if relevance >= 20:
                        item = {
                            'id': item_id,
                            'source': source,
                            'title': title,
                            'summary': self._clean_html(summary),
                            'link': entry.get('link', ''),
                            'published': entry.get('published', ''),
                            'relevance_score': relevance,
                            'category': self._categorize_event(title, summary),
                            'fetched_at': datetime.now().isoformat()
                        }
                        all_items.append(item)
                        self.seen_items.add(item_id)

            except Exception as e:
                print(f"Error fetching {source}: {e}")
                continue

        # Save seen items
        self._save_seen_items()

        # Sort by relevance
        all_items.sort(key=lambda x: x['relevance_score'], reverse=True)

        return all_items

    def fetch_defi_hacks(self) -> List[Dict]:
        """Fetch recent hacks from DeFiLlama API."""
        try:
            r = requests.get(
                'https://api.llama.fi/hacks',
                timeout=30
            )

            if r.status_code != 200:
                return []

            hacks = r.json()
            recent_hacks = []

            # Get hacks from last 7 days
            cutoff = datetime.now() - timedelta(days=7)

            for hack in hacks:
                try:
                    # DeFiLlama uses Unix timestamp
                    hack_date = datetime.fromtimestamp(hack.get('date', 0))

                    if hack_date < cutoff:
                        continue

                    item_id = f"defillama_{hack.get('id', hack.get('name', ''))}"

                    if item_id in self.seen_items:
                        continue

                    amount = hack.get('amount', 0)
                    name = hack.get('name', 'Unknown')
                    technique = hack.get('technique', 'Unknown')

                    item = {
                        'id': item_id,
                        'source': 'defillama',
                        'title': f"{name} hacked for ${amount:,.0f}",
                        'summary': f"Technique: {technique}. Chain: {hack.get('chain', 'Unknown')}",
                        'link': hack.get('link', ''),
                        'published': hack_date.isoformat(),
                        'relevance_score': min(50 + (amount / 1_000_000) * 5, 100),  # Higher amount = more relevant
                        'category': 'HACK',
                        'amount_usd': amount,
                        'technique': technique,
                        'chain': hack.get('chain', ''),
                        'fetched_at': datetime.now().isoformat()
                    }
                    recent_hacks.append(item)
                    self.seen_items.add(item_id)

                except Exception as e:
                    continue

            self._save_seen_items()
            return recent_hacks

        except Exception as e:
            print(f"Error fetching DeFiLlama hacks: {e}")
            return []

    def fetch_all_events(self) -> List[Dict]:
        """
        Fetch all events from all sources.
        Returns sorted list by relevance score.
        """
        print("Fetching crypto events...")

        all_events = []

        # RSS feeds
        print("  - RSS feeds...")
        rss_items = self.fetch_rss_feeds()
        all_events.extend(rss_items)
        print(f"    Found {len(rss_items)} relevant items")

        # DeFiLlama hacks
        print("  - DeFiLlama hacks...")
        hacks = self.fetch_defi_hacks()
        all_events.extend(hacks)
        print(f"    Found {len(hacks)} recent hacks")

        # Sort by relevance
        all_events.sort(key=lambda x: x['relevance_score'], reverse=True)

        # Save to file for reference
        self._save_events(all_events)

        print(f"Total: {len(all_events)} marketing-relevant events")
        return all_events

    def get_top_events(self, limit: int = 5, min_score: int = 50) -> List[Dict]:
        """Get top events by relevance score."""
        events = self.fetch_all_events()
        return [e for e in events if e['relevance_score'] >= min_score][:limit]

    def get_hack_events(self, limit: int = 10) -> List[Dict]:
        """Get only hack-related events."""
        events = self.fetch_all_events()
        return [e for e in events if e['category'] == 'HACK'][:limit]

    def _save_events(self, events: List[Dict]):
        """Save events to JSON file for debugging/review."""
        try:
            with open(self.events_file, 'w', encoding='utf-8') as f:
                json.dump(events, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Could not save events: {e}")

    def _clean_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        clean = re.sub(r'<[^>]+>', '', text)
        clean = re.sub(r'\s+', ' ', clean)
        return clean.strip()


# Quick test
if __name__ == '__main__':
    monitor = CryptoMonitor()
    events = monitor.get_top_events(limit=10, min_score=30)

    print("\n" + "="*60)
    print("TOP MARKETING-RELEVANT EVENTS")
    print("="*60)

    for event in events:
        print(f"\n[{event['category']}] Score: {event['relevance_score']}")
        print(f"Title: {event['title']}")
        print(f"Source: {event['source']}")
        print(f"Link: {event['link']}")
