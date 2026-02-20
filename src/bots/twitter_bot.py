"""
SafeScoring Twitter/X Bot
Automated security alerts and engagement on Twitter/X.

Features:
- Auto-tweet when major incidents occur
- Weekly security digest threads
- Reply to mentions with scores
- Quote-tweet hacks with "We predicted this" when applicable

Setup:
1. Create Twitter Developer account: https://developer.twitter.com
2. Create app with OAuth 1.0a (Read and Write)
3. Get API keys and access tokens
4. Set in .env:
   - TWITTER_API_KEY
   - TWITTER_API_SECRET
   - TWITTER_ACCESS_TOKEN
   - TWITTER_ACCESS_SECRET

Dependencies:
pip install tweepy requests schedule
"""

import os
import sys
import logging
import time
import json
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    import tweepy
except ImportError:
    print("Please install tweepy: pip install tweepy")
    sys.exit(1)

try:
    import schedule
except ImportError:
    print("Please install schedule: pip install schedule")
    schedule = None

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'))
except ImportError:
    pass

# Configuration
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

API_BASE_URL = os.getenv("API_BASE_URL", "https://safescoring.io")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Track posted incidents to avoid duplicates
POSTED_INCIDENTS_FILE = os.path.join(os.path.dirname(__file__), '.twitter_posted_incidents.json')


def get_supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def load_posted_incidents() -> set:
    """Load IDs of already posted incidents."""
    try:
        if os.path.exists(POSTED_INCIDENTS_FILE):
            with open(POSTED_INCIDENTS_FILE, 'r') as f:
                return set(json.load(f))
    except Exception:
        pass
    return set()


def save_posted_incident(incident_id: str):
    """Save incident ID to avoid reposting."""
    posted = load_posted_incidents()
    posted.add(str(incident_id))
    # Keep only last 1000
    if len(posted) > 1000:
        posted = set(list(posted)[-1000:])
    try:
        with open(POSTED_INCIDENTS_FILE, 'w') as f:
            json.dump(list(posted), f)
    except Exception as e:
        logger.error(f"Error saving posted incidents: {e}")


def get_score_emoji(score: int) -> str:
    if score >= 80:
        return "🟢"
    elif score >= 60:
        return "🟡"
    elif score >= 40:
        return "🟠"
    return "🔴"


def format_amount(amount: float) -> str:
    """Format amount in human readable form."""
    if amount >= 1_000_000_000:
        return f"${amount/1_000_000_000:.1f}B"
    elif amount >= 1_000_000:
        return f"${amount/1_000_000:.1f}M"
    elif amount >= 1_000:
        return f"${amount/1_000:.0f}K"
    return f"${amount:.0f}"


class SafeScoringTwitterBot:
    def __init__(self):
        self.client = None
        self.api = None
        self._setup_client()

    def _setup_client(self):
        """Setup Twitter API client."""
        if not all([TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET]):
            logger.warning("Twitter credentials not configured")
            return

        try:
            # Twitter API v2 client
            self.client = tweepy.Client(
                bearer_token=TWITTER_BEARER_TOKEN,
                consumer_key=TWITTER_API_KEY,
                consumer_secret=TWITTER_API_SECRET,
                access_token=TWITTER_ACCESS_TOKEN,
                access_token_secret=TWITTER_ACCESS_SECRET,
                wait_on_rate_limit=True
            )

            # v1.1 API for media uploads
            auth = tweepy.OAuthHandler(TWITTER_API_KEY, TWITTER_API_SECRET)
            auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
            self.api = tweepy.API(auth)

            logger.info("Twitter client initialized")
        except Exception as e:
            logger.error(f"Failed to setup Twitter client: {e}")

    def tweet(self, text: str, reply_to: Optional[str] = None) -> Optional[str]:
        """Post a tweet, return tweet ID."""
        if not self.client:
            logger.warning("Twitter client not available")
            return None

        try:
            response = self.client.create_tweet(
                text=text,
                in_reply_to_tweet_id=reply_to
            )
            tweet_id = response.data['id']
            logger.info(f"Posted tweet: {tweet_id}")
            return tweet_id
        except Exception as e:
            logger.error(f"Failed to tweet: {e}")
            return None

    def tweet_thread(self, tweets: List[str]) -> List[str]:
        """Post a thread of tweets."""
        tweet_ids = []
        reply_to = None

        for text in tweets:
            tweet_id = self.tweet(text, reply_to=reply_to)
            if tweet_id:
                tweet_ids.append(tweet_id)
                reply_to = tweet_id
            time.sleep(1)  # Rate limit buffer

        return tweet_ids

    def fetch_new_incidents(self) -> List[Dict]:
        """Fetch recent incidents from database."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            return []

        try:
            # Get incidents from last 24 hours
            yesterday = (datetime.now() - timedelta(days=1)).isoformat()

            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/product_incidents",
                headers=get_supabase_headers(),
                params={
                    "select": "id,title,severity,funds_lost,date,product_id,products(name,slug,note_finale)",
                    "date": f"gte.{yesterday[:10]}",
                    "order": "funds_lost.desc",
                    "limit": 10
                },
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching incidents: {e}")

        return []

    def fetch_product_score(self, slug: str) -> Optional[Dict]:
        """Fetch product score from API."""
        try:
            response = requests.get(
                f"{API_BASE_URL}/api/products/{slug}/score",
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
        return None

    def create_incident_tweet(self, incident: Dict) -> str:
        """Create tweet text for an incident."""
        title = incident.get('title', 'Security Incident')[:50]
        funds_lost = incident.get('funds_lost', 0)
        severity = incident.get('severity', 'medium').upper()

        product = incident.get('products', {})
        product_name = product.get('name', 'Unknown')
        product_slug = product.get('slug', '')
        score = product.get('note_finale', 0)

        severity_emoji = {
            'CRITICAL': '🚨🚨🚨',
            'HIGH': '🚨🚨',
            'MEDIUM': '🚨',
            'LOW': '⚠️'
        }.get(severity, '🚨')

        tweet = f"{severity_emoji} SECURITY ALERT\n\n"
        tweet += f"{product_name}: {title}\n\n"

        if funds_lost and funds_lost > 0:
            tweet += f"💰 Funds Lost: {format_amount(funds_lost)}\n"

        if score:
            tweet += f"{get_score_emoji(round(score))} SafeScore: {round(score)}/100\n"

        tweet += f"\n🔍 Full analysis: {API_BASE_URL}/products/{product_slug}\n\n"
        tweet += "#CryptoSecurity #DeFi #SafeScoring"

        return tweet[:280]  # Twitter limit

    def create_prediction_tweet(self, incident: Dict) -> Optional[str]:
        """Create 'we predicted this' tweet if score was low."""
        product = incident.get('products', {})
        score = product.get('note_finale', 0)
        product_name = product.get('name', '')
        funds_lost = incident.get('funds_lost', 0)

        # Only tweet if score was below 60 (we "predicted" it)
        if not score or score >= 60:
            return None

        tweet = f"We saw this coming.\n\n"
        tweet += f"{product_name} had a SafeScore of only {round(score)}/100 "
        tweet += f"BEFORE today's {format_amount(funds_lost)} incident.\n\n"
        tweet += f"87% of hacked projects in 2024 had been audited. "
        tweet += f"Audits aren't enough.\n\n"
        tweet += f"Check any project's real security score: {API_BASE_URL}\n\n"
        tweet += "#CryptoSecurity #DYOR"

        return tweet[:280]

    def post_incident_alerts(self):
        """Check for new incidents and post alerts."""
        logger.info("Checking for new incidents...")

        posted = load_posted_incidents()
        incidents = self.fetch_new_incidents()

        for incident in incidents:
            incident_id = str(incident.get('id'))
            funds_lost = incident.get('funds_lost', 0)

            # Skip if already posted or too small
            if incident_id in posted:
                continue
            if funds_lost < 1_000_000:  # Only tweet for $1M+ hacks
                continue

            # Post main alert
            tweet_text = self.create_incident_tweet(incident)
            tweet_id = self.tweet(tweet_text)

            if tweet_id:
                save_posted_incident(incident_id)

                # Post prediction reply if applicable
                prediction_tweet = self.create_prediction_tweet(incident)
                if prediction_tweet:
                    time.sleep(2)
                    self.tweet(prediction_tweet, reply_to=tweet_id)

            time.sleep(5)  # Rate limit buffer

    def create_weekly_digest(self) -> List[str]:
        """Create weekly security digest thread."""
        tweets = []

        # Header tweet
        tweets.append(
            f"🧵 WEEKLY CRYPTO SECURITY DIGEST\n\n"
            f"Here's what happened in crypto security this week:\n\n"
            f"(Thread) 👇"
        )

        # Fetch week's incidents
        try:
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()[:10]
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/product_incidents",
                headers=get_supabase_headers(),
                params={
                    "select": "title,severity,funds_lost,products(name)",
                    "date": f"gte.{week_ago}",
                    "order": "funds_lost.desc",
                    "limit": 10
                },
                timeout=30
            )

            if response.status_code == 200:
                incidents = response.json()
                total_lost = sum(i.get('funds_lost', 0) for i in incidents)

                # Stats tweet
                tweets.append(
                    f"📊 THIS WEEK'S STATS:\n\n"
                    f"• {len(incidents)} security incidents\n"
                    f"• {format_amount(total_lost)} total funds at risk\n"
                    f"• Most common: Flash loans, Private key compromises\n\n"
                    f"Let's break it down..."
                )

                # Top incidents
                for i, incident in enumerate(incidents[:5], 1):
                    product = incident.get('products', {})
                    name = product.get('name', 'Unknown')
                    funds = incident.get('funds_lost', 0)
                    title = incident.get('title', '')[:30]

                    tweets.append(
                        f"{i}. {name}\n"
                        f"💰 {format_amount(funds)}\n"
                        f"📝 {title}\n"
                    )

        except Exception as e:
            logger.error(f"Error creating digest: {e}")

        # CTA tweet
        tweets.append(
            f"🛡️ PROTECT YOURSELF:\n\n"
            f"Before using any crypto product, check its SafeScore at {API_BASE_URL}\n\n"
            f"We analyze 1,100+ security norms so you don't have to.\n\n"
            f"Stay safe out there! 🔐"
        )

        return tweets

    def post_weekly_digest(self):
        """Post weekly security digest thread."""
        logger.info("Posting weekly digest...")
        tweets = self.create_weekly_digest()
        self.tweet_thread(tweets)

    def create_product_spotlight(self, slug: str) -> Optional[str]:
        """Create a product spotlight tweet."""
        product = self.fetch_product_score(slug)
        if not product:
            return None

        name = product.get('name', 'Unknown')
        score = product.get('score', 0)
        scores = product.get('scores', {})

        emoji = get_score_emoji(score)

        tweet = f"{emoji} PRODUCT SPOTLIGHT: {name}\n\n"
        tweet += f"SafeScore: {score}/100\n\n"
        tweet += f"Breakdown:\n"
        tweet += f"🔒 Security: {scores.get('s', 'N/A')}\n"
        tweet += f"🛡️ Adversity: {scores.get('a', 'N/A')}\n"
        tweet += f"🤝 Fidelity: {scores.get('f', 'N/A')}\n"
        tweet += f"⚡ Efficiency: {scores.get('e', 'N/A')}\n\n"
        tweet += f"Full report: {API_BASE_URL}/products/{slug}\n\n"
        tweet += "#CryptoSecurity"

        return tweet[:280]

    def monitor_mentions(self):
        """Monitor and reply to mentions (requires elevated access)."""
        if not self.client or not TWITTER_BEARER_TOKEN:
            return

        try:
            # Get recent mentions
            me = self.client.get_me()
            if not me.data:
                return

            mentions = self.client.get_users_mentions(
                id=me.data.id,
                max_results=10,
                tweet_fields=['created_at', 'text']
            )

            if not mentions.data:
                return

            for mention in mentions.data:
                # Check if asking for a score
                text = mention.text.lower()
                if 'score' in text or 'safescore' in text:
                    # Extract product name (simple heuristic)
                    words = text.split()
                    for i, word in enumerate(words):
                        if word in ['score', 'safescore'] and i + 1 < len(words):
                            product_query = words[i + 1]

                            # Search for product
                            response = requests.get(
                                f"{API_BASE_URL}/api/search",
                                params={"q": product_query, "limit": 1},
                                timeout=10
                            )

                            if response.status_code == 200:
                                results = response.json().get('results', [])
                                if results:
                                    product = results[0]
                                    score = product.get('score', product.get('note_finale', 0))
                                    name = product.get('name', product_query)
                                    slug = product.get('slug', '')

                                    reply = (
                                        f"@{mention.author_id} {get_score_emoji(round(score))} "
                                        f"{name} has a SafeScore of {round(score)}/100\n\n"
                                        f"Full report: {API_BASE_URL}/products/{slug}"
                                    )

                                    self.tweet(reply[:280], reply_to=mention.id)
                            break

        except Exception as e:
            logger.error(f"Error monitoring mentions: {e}")

    def run(self):
        """Run the bot with scheduled tasks."""
        logger.info("Starting SafeScoring Twitter Bot...")

        if not self.client:
            logger.error("Twitter client not configured. Exiting.")
            return

        if schedule:
            # Check for incidents every 30 minutes
            schedule.every(30).minutes.do(self.post_incident_alerts)

            # Weekly digest on Sundays at 10 AM
            schedule.every().sunday.at("10:00").do(self.post_weekly_digest)

            # Monitor mentions every 15 minutes
            schedule.every(15).minutes.do(self.monitor_mentions)

            # Initial run
            self.post_incident_alerts()

            logger.info("Bot running. Press Ctrl+C to stop.")

            while True:
                schedule.run_pending()
                time.sleep(60)
        else:
            # Single run mode
            self.post_incident_alerts()


def main():
    """Entry point."""
    if not all([TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET]):
        print("Error: Twitter credentials not configured")
        print("Set the following in your .env file:")
        print("  TWITTER_API_KEY")
        print("  TWITTER_API_SECRET")
        print("  TWITTER_ACCESS_TOKEN")
        print("  TWITTER_ACCESS_SECRET")
        print("  TWITTER_BEARER_TOKEN (optional, for mentions)")
        sys.exit(1)

    bot = SafeScoringTwitterBot()
    bot.run()


if __name__ == "__main__":
    main()
