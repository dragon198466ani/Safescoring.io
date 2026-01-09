#!/usr/bin/env python3
"""
SAFESCORING.IO - Twitter Mention Bot
Monitors Twitter mentions and replies with product scores.

Features:
- Monitors mentions of @SafeScoring
- Detects wallet/product names in tweets
- Auto-replies with security scores
- Rate limiting to avoid bans
- Drafts mode for testing

Usage:
    python twitter_mention_bot.py --monitor     # Start monitoring
    python twitter_mention_bot.py --test        # Test with sample tweets
    python twitter_mention_bot.py --dry-run     # Monitor without posting
"""

import os
import sys
import json
import time
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import logging

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.marketing.twitter_publisher import TwitterPublisher

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TwitterMentionBot:
    """
    Twitter bot that monitors mentions and replies with SafeScoring data.
    """

    # Known products and their variations
    PRODUCT_PATTERNS = {
        # Hardware Wallets
        'ledger': ['ledger', 'ledger nano', 'nano x', 'nano s', 'ledger stax'],
        'trezor': ['trezor', 'trezor model t', 'trezor safe', 'trezor one'],
        'coldcard': ['coldcard', 'cold card', 'coinkite'],
        'bitbox': ['bitbox', 'bitbox02', 'shiftcrypto'],
        'keepkey': ['keepkey', 'keep key'],
        'tangem': ['tangem', 'tangem wallet'],
        'keystone': ['keystone', 'keystone pro'],
        'ngrave': ['ngrave', 'ngrave zero'],
        'gridplus': ['gridplus', 'lattice1', 'lattice 1'],
        'ellipal': ['ellipal', 'ellipal titan'],
        'safepal': ['safepal', 'safe pal'],
        'secux': ['secux', 'secux v20'],

        # Software Wallets
        'metamask': ['metamask', 'meta mask', 'mm wallet'],
        'phantom': ['phantom', 'phantom wallet'],
        'trust-wallet': ['trust wallet', 'trustwallet', 'trust'],
        'exodus': ['exodus', 'exodus wallet'],
        'coinbase-wallet': ['coinbase wallet', 'cb wallet'],
        'rabby': ['rabby', 'rabby wallet'],
        'frame': ['frame wallet', 'frame.sh'],
        'rainbow': ['rainbow wallet', 'rainbow'],
        'zerion': ['zerion', 'zerion wallet'],
        'argent': ['argent', 'argent wallet'],
        'uniswap-wallet': ['uniswap wallet'],

        # Exchanges
        'binance': ['binance', 'binance exchange'],
        'coinbase': ['coinbase', 'coinbase exchange', 'cb exchange'],
        'kraken': ['kraken', 'kraken exchange'],
        'okx': ['okx', 'okex'],
        'bybit': ['bybit'],
        'kucoin': ['kucoin', 'ku coin'],
        'gemini': ['gemini', 'gemini exchange'],
        'bitstamp': ['bitstamp'],
        'bitfinex': ['bitfinex'],
        'crypto-com': ['crypto.com', 'cryptocom', 'cdc'],

        # DeFi
        'uniswap': ['uniswap', 'uni swap'],
        'aave': ['aave'],
        'compound': ['compound', 'compound finance'],
        'curve': ['curve', 'curve finance'],
        'lido': ['lido', 'lido finance', 'steth'],
        'makerdao': ['makerdao', 'maker', 'dai'],
        'yearn': ['yearn', 'yearn finance', 'yfi'],
        '1inch': ['1inch', 'one inch'],
        'sushiswap': ['sushiswap', 'sushi'],
        'pancakeswap': ['pancakeswap', 'pancake'],
    }

    # Response templates
    RESPONSE_TEMPLATES = {
        'single': """SafeScore for {product}: {score}/100

{pillar_breakdown}

Full analysis: safescoring.com/products/{slug}""",

        'comparison': """SafeScore Comparison:
{product_a}: {score_a}/100
{product_b}: {score_b}/100

Winner: {winner}

Compare: safescoring.com/compare/{slug_a}/{slug_b}""",

        'not_found': """We don't have a score for "{product}" yet.

Request it: safescoring.com/request?product={product}

Browse 500+ rated products: safescoring.com/products""",

        'general': """Check crypto security scores at SafeScoring.

500+ products rated on 1110 security criteria.

safescoring.com""",
    }

    def __init__(self,
                 credentials_file: str = 'config/.twitter_credentials.json',
                 scores_file: str = 'data/product_scores.json',
                 dry_run: bool = False):
        """
        Initialize the mention bot.

        Args:
            credentials_file: Path to Twitter API credentials
            scores_file: Path to cached product scores
            dry_run: If True, don't actually post replies
        """
        self.publisher = TwitterPublisher(credentials_file)
        self.scores_file = scores_file
        self.dry_run = dry_run
        self.scores_cache = self._load_scores()
        self.processed_file = 'data/twitter_bot/processed_mentions.json'
        self.processed_ids = self._load_processed()

        # Rate limiting
        self.replies_this_hour = 0
        self.max_replies_per_hour = 15  # Twitter rate limits
        self.last_hour_reset = datetime.now()

    def _load_scores(self) -> Dict:
        """Load product scores from cache or API."""
        try:
            if os.path.exists(self.scores_file):
                with open(self.scores_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load scores: {e}")

        # Return sample scores for testing
        return self._get_sample_scores()

    def _get_sample_scores(self) -> Dict:
        """Sample scores for testing when API unavailable."""
        return {
            'ledger': {'name': 'Ledger Nano X', 'slug': 'ledger-nano-x', 'score': 87, 's': 89, 'a': 85, 'f': 88, 'e': 84},
            'trezor': {'name': 'Trezor Model T', 'slug': 'trezor-model-t', 'score': 85, 's': 88, 'a': 82, 'f': 86, 'e': 83},
            'metamask': {'name': 'MetaMask', 'slug': 'metamask', 'score': 72, 's': 70, 'a': 68, 'f': 78, 'e': 75},
            'phantom': {'name': 'Phantom', 'slug': 'phantom', 'score': 74, 's': 72, 'a': 70, 'f': 80, 'e': 76},
            'coinbase': {'name': 'Coinbase', 'slug': 'coinbase', 'score': 78, 's': 80, 'a': 75, 'f': 82, 'e': 74},
            'binance': {'name': 'Binance', 'slug': 'binance', 'score': 71, 's': 72, 'a': 68, 'f': 70, 'e': 75},
            'uniswap': {'name': 'Uniswap', 'slug': 'uniswap', 'score': 76, 's': 74, 'a': 72, 'f': 82, 'e': 78},
            'aave': {'name': 'Aave', 'slug': 'aave', 'score': 81, 's': 82, 'a': 78, 'f': 85, 'e': 80},
            'coldcard': {'name': 'Coldcard', 'slug': 'coldcard', 'score': 91, 's': 95, 'a': 90, 'f': 88, 'e': 85},
            'trust-wallet': {'name': 'Trust Wallet', 'slug': 'trust-wallet', 'score': 68, 's': 65, 'a': 62, 'f': 75, 'e': 72},
        }

    def _load_processed(self) -> set:
        """Load IDs of already processed mentions."""
        try:
            if os.path.exists(self.processed_file):
                with open(self.processed_file, 'r') as f:
                    data = json.load(f)
                    return set(data.get('ids', []))
        except Exception:
            pass
        return set()

    def _save_processed(self, mention_id: str):
        """Save processed mention ID."""
        self.processed_ids.add(mention_id)

        # Keep only last 10000 IDs
        if len(self.processed_ids) > 10000:
            self.processed_ids = set(list(self.processed_ids)[-10000:])

        os.makedirs(os.path.dirname(self.processed_file), exist_ok=True)
        with open(self.processed_file, 'w') as f:
            json.dump({'ids': list(self.processed_ids)}, f)

    def detect_products(self, text: str) -> List[str]:
        """
        Detect product names in tweet text.

        Args:
            text: Tweet text to analyze

        Returns:
            List of detected product slugs
        """
        text_lower = text.lower()
        detected = []

        for slug, patterns in self.PRODUCT_PATTERNS.items():
            for pattern in patterns:
                # Use word boundaries to avoid false positives
                if re.search(rf'\b{re.escape(pattern)}\b', text_lower):
                    if slug not in detected:
                        detected.append(slug)
                    break

        return detected

    def detect_comparison(self, text: str) -> Optional[Tuple[str, str]]:
        """
        Detect if tweet is asking for a comparison.

        Args:
            text: Tweet text

        Returns:
            Tuple of (product_a, product_b) if comparison detected
        """
        comparison_patterns = [
            r'(\w+)\s+(?:vs\.?|versus|or|compared to|better than)\s+(\w+)',
            r'(?:compare|comparing)\s+(\w+)\s+(?:and|&|to|with)\s+(\w+)',
            r'(\w+)\s+(?:and|&)\s+(\w+)\s+(?:comparison|compare)',
        ]

        text_lower = text.lower()

        for pattern in comparison_patterns:
            match = re.search(pattern, text_lower)
            if match:
                product_a = match.group(1)
                product_b = match.group(2)

                # Map to known slugs
                slug_a = self._match_to_slug(product_a)
                slug_b = self._match_to_slug(product_b)

                if slug_a and slug_b and slug_a != slug_b:
                    return (slug_a, slug_b)

        return None

    def _match_to_slug(self, text: str) -> Optional[str]:
        """Match a text string to a known product slug."""
        text_lower = text.lower().strip()

        for slug, patterns in self.PRODUCT_PATTERNS.items():
            if text_lower in [p.lower() for p in patterns]:
                return slug
            # Also check if it's the slug itself
            if text_lower == slug:
                return slug

        return None

    def get_score(self, slug: str) -> Optional[Dict]:
        """Get score for a product."""
        return self.scores_cache.get(slug)

    def format_pillar_breakdown(self, score_data: Dict) -> str:
        """Format SAFE pillar breakdown for tweet."""
        return f"S:{score_data.get('s', '?')} A:{score_data.get('a', '?')} F:{score_data.get('f', '?')} E:{score_data.get('e', '?')}"

    def generate_reply(self, tweet_text: str, tweet_author: str) -> Optional[str]:
        """
        Generate reply based on tweet content.

        Args:
            tweet_text: The tweet text
            tweet_author: Author username

        Returns:
            Reply text or None if no reply needed
        """
        # Check for comparison first
        comparison = self.detect_comparison(tweet_text)
        if comparison:
            slug_a, slug_b = comparison
            score_a = self.get_score(slug_a)
            score_b = self.get_score(slug_b)

            if score_a and score_b:
                winner = score_a['name'] if score_a['score'] > score_b['score'] else score_b['name']
                if score_a['score'] == score_b['score']:
                    winner = "Tie!"

                return self.RESPONSE_TEMPLATES['comparison'].format(
                    product_a=score_a['name'],
                    score_a=score_a['score'],
                    product_b=score_b['name'],
                    score_b=score_b['score'],
                    winner=winner,
                    slug_a=score_a['slug'],
                    slug_b=score_b['slug']
                )

        # Check for single product mentions
        products = self.detect_products(tweet_text)

        if len(products) >= 2:
            # Multiple products - suggest comparison
            score_a = self.get_score(products[0])
            score_b = self.get_score(products[1])

            if score_a and score_b:
                winner = score_a['name'] if score_a['score'] > score_b['score'] else score_b['name']
                return self.RESPONSE_TEMPLATES['comparison'].format(
                    product_a=score_a['name'],
                    score_a=score_a['score'],
                    product_b=score_b['name'],
                    score_b=score_b['score'],
                    winner=winner,
                    slug_a=score_a['slug'],
                    slug_b=score_b['slug']
                )

        elif len(products) == 1:
            score_data = self.get_score(products[0])

            if score_data:
                return self.RESPONSE_TEMPLATES['single'].format(
                    product=score_data['name'],
                    score=score_data['score'],
                    pillar_breakdown=self.format_pillar_breakdown(score_data),
                    slug=score_data['slug']
                )
            else:
                return self.RESPONSE_TEMPLATES['not_found'].format(
                    product=products[0]
                )

        # No specific product - general response
        # Only reply if directly mentioned or asking about security
        security_keywords = ['security', 'safe', 'secure', 'hack', 'scam', 'trust']
        if any(kw in tweet_text.lower() for kw in security_keywords):
            return self.RESPONSE_TEMPLATES['general']

        return None

    def should_reply(self, tweet: Dict) -> bool:
        """Check if we should reply to this tweet."""
        tweet_id = tweet.get('id', '')

        # Already processed
        if tweet_id in self.processed_ids:
            return False

        # Rate limiting
        if datetime.now() - self.last_hour_reset > timedelta(hours=1):
            self.replies_this_hour = 0
            self.last_hour_reset = datetime.now()

        if self.replies_this_hour >= self.max_replies_per_hour:
            logger.warning("Rate limit reached, skipping reply")
            return False

        # Don't reply to ourselves
        author = tweet.get('author', {}).get('username', '')
        if author.lower() == 'safescoring':
            return False

        # Don't reply to retweets
        if tweet.get('text', '').startswith('RT @'):
            return False

        return True

    def reply_to_tweet(self, tweet_id: str, reply_text: str) -> bool:
        """
        Reply to a tweet.

        Args:
            tweet_id: ID of tweet to reply to
            reply_text: Reply text

        Returns:
            True if successful
        """
        if self.dry_run:
            logger.info(f"[DRY RUN] Would reply to {tweet_id}:")
            logger.info(f"  {reply_text[:100]}...")
            return True

        result = self.publisher.post_tweet(reply_text, reply_to=tweet_id)

        if result:
            self.replies_this_hour += 1
            self._save_processed(tweet_id)
            logger.info(f"Replied to {tweet_id}")
            return True

        return False

    def process_mention(self, mention: Dict) -> bool:
        """
        Process a single mention.

        Args:
            mention: Tweet data dict

        Returns:
            True if replied successfully
        """
        if not self.should_reply(mention):
            return False

        tweet_text = mention.get('text', '')
        tweet_author = mention.get('author', {}).get('username', 'unknown')
        tweet_id = mention.get('id', '')

        logger.info(f"Processing mention from @{tweet_author}: {tweet_text[:50]}...")

        reply = self.generate_reply(tweet_text, tweet_author)

        if reply:
            # Add @mention
            reply = f"@{tweet_author} {reply}"

            # Truncate if needed (280 char limit)
            if len(reply) > 280:
                reply = reply[:277] + "..."

            return self.reply_to_tweet(tweet_id, reply)

        # Mark as processed even if no reply
        self._save_processed(tweet_id)
        return False

    def fetch_mentions(self, since_id: Optional[str] = None) -> List[Dict]:
        """
        Fetch recent mentions from Twitter API.

        Note: Requires Twitter API v2 access with elevated permissions.
        """
        if not self.publisher.is_configured:
            logger.warning("Twitter not configured - using sample mentions")
            return self._get_sample_mentions()

        try:
            import tweepy

            client = tweepy.Client(
                consumer_key=self.publisher.credentials['api_key'],
                consumer_secret=self.publisher.credentials['api_secret'],
                access_token=self.publisher.credentials['access_token'],
                access_token_secret=self.publisher.credentials['access_token_secret']
            )

            # Get authenticated user ID
            me = client.get_me()
            if not me.data:
                logger.error("Could not get authenticated user")
                return []

            user_id = me.data.id

            # Fetch mentions
            kwargs = {
                'max_results': 100,
                'tweet_fields': ['created_at', 'author_id', 'conversation_id'],
                'expansions': ['author_id'],
                'user_fields': ['username']
            }

            if since_id:
                kwargs['since_id'] = since_id

            mentions = client.get_users_mentions(user_id, **kwargs)

            if not mentions.data:
                return []

            # Build user lookup
            users = {u.id: u for u in (mentions.includes.get('users', []) if mentions.includes else [])}

            results = []
            for tweet in mentions.data:
                author = users.get(tweet.author_id, {})
                results.append({
                    'id': str(tweet.id),
                    'text': tweet.text,
                    'author': {
                        'id': str(tweet.author_id),
                        'username': getattr(author, 'username', 'unknown')
                    },
                    'created_at': tweet.created_at.isoformat() if tweet.created_at else None
                })

            return results

        except ImportError:
            logger.warning("tweepy not installed")
            return self._get_sample_mentions()
        except Exception as e:
            logger.error(f"Error fetching mentions: {e}")
            return []

    def _get_sample_mentions(self) -> List[Dict]:
        """Sample mentions for testing."""
        return [
            {
                'id': 'test_1',
                'text': '@SafeScoring Is Ledger safe to use?',
                'author': {'id': '123', 'username': 'crypto_user'},
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'test_2',
                'text': '@SafeScoring Ledger vs Trezor which is better?',
                'author': {'id': '456', 'username': 'defi_trader'},
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'test_3',
                'text': '@SafeScoring What do you think about MetaMask and Phantom?',
                'author': {'id': '789', 'username': 'nft_collector'},
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'test_4',
                'text': '@SafeScoring Is Binance secure after the recent news?',
                'author': {'id': '101', 'username': 'bitcoin_maxi'},
                'created_at': datetime.now().isoformat()
            },
        ]

    def monitor(self, interval_seconds: int = 60):
        """
        Start monitoring mentions loop.

        Args:
            interval_seconds: Time between checks
        """
        logger.info("Starting Twitter mention monitor...")
        logger.info(f"Dry run mode: {self.dry_run}")
        logger.info(f"Check interval: {interval_seconds}s")

        last_id = None

        while True:
            try:
                mentions = self.fetch_mentions(since_id=last_id)

                if mentions:
                    logger.info(f"Found {len(mentions)} new mentions")

                    for mention in mentions:
                        self.process_mention(mention)
                        last_id = mention['id']
                        time.sleep(2)  # Small delay between replies
                else:
                    logger.debug("No new mentions")

                time.sleep(interval_seconds)

            except KeyboardInterrupt:
                logger.info("Stopping monitor...")
                break
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
                time.sleep(interval_seconds)

    def test(self):
        """Run tests with sample mentions."""
        logger.info("Running bot tests with sample mentions...")

        test_tweets = [
            "Is Ledger safe?",
            "Ledger vs Trezor which should I buy?",
            "What's the security score for MetaMask?",
            "Compare Coinbase and Binance please",
            "Is SomeRandomWallet safe to use?",
            "I love crypto!",  # Should not reply
            "Thinking about getting a Coldcard or Trezor for cold storage",
        ]

        print("\n" + "="*60)
        print("TWITTER MENTION BOT TEST")
        print("="*60)

        for tweet in test_tweets:
            print(f"\nTweet: \"{tweet}\"")
            print("-" * 40)

            products = self.detect_products(tweet)
            print(f"Detected products: {products}")

            comparison = self.detect_comparison(tweet)
            print(f"Comparison detected: {comparison}")

            reply = self.generate_reply(tweet, "test_user")
            if reply:
                print(f"Reply:\n{reply}")
            else:
                print("No reply generated")

            print()


def main():
    import argparse

    parser = argparse.ArgumentParser(description='SafeScoring Twitter Mention Bot')
    parser.add_argument('--monitor', action='store_true', help='Start monitoring mentions')
    parser.add_argument('--test', action='store_true', help='Run tests with sample data')
    parser.add_argument('--dry-run', action='store_true', help='Monitor without posting')
    parser.add_argument('--interval', type=int, default=60, help='Check interval in seconds')

    args = parser.parse_args()

    bot = TwitterMentionBot(dry_run=args.dry_run)

    if args.test:
        bot.test()
    elif args.monitor:
        bot.monitor(interval_seconds=args.interval)
    else:
        print("Usage:")
        print("  python twitter_mention_bot.py --test       # Test with sample tweets")
        print("  python twitter_mention_bot.py --monitor    # Start monitoring")
        print("  python twitter_mention_bot.py --dry-run --monitor  # Monitor without posting")


if __name__ == '__main__':
    main()
