#!/usr/bin/env python3
"""
Social Media Listener & Auto-Responder
Monitors mentions and auto-replies to relevant conversations.

Features:
- Twitter mention monitoring
- Auto-replies to questions about crypto security
- Keyword alerts for brand mentions
- Sentiment analysis
"""

import asyncio
import os
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    import tweepy
    TWEEPY_AVAILABLE = True
except ImportError:
    TWEEPY_AVAILABLE = False

from src.core.api_provider import AIProvider


class SocialListener:
    """Monitors social media and auto-responds"""

    def __init__(self):
        self.ai = AIProvider()
        self.twitter_client = None
        self.setup_twitter()

        # Keywords to monitor
        self.keywords = [
            'safescoring', 'safe scoring', '@safescoring',
            'is ledger safe', 'is trezor safe', 'is metamask safe',
            'crypto wallet security', 'defi security rating',
            'hardware wallet comparison', 'safest crypto wallet',
            'crypto security score', 'blockchain security rating'
        ]

        # Products we can provide scores for
        self.known_products = [
            'ledger', 'trezor', 'metamask', 'phantom', 'trust wallet',
            'coinbase', 'binance', 'kraken', 'uniswap', 'aave',
            'compound', 'opensea', 'exodus', 'atomic wallet'
        ]

        # Response templates
        self.templates = {
            'security_question': """
Great question! {product} has a SafeScore of {score}/100.

Key findings:
• Security: {s}/100
• Audit: {a}/100
• Functionality: {f}/100
• Experience: {e}/100

Full security report: safescoring.io/products/{slug}

#CryptoSecurity #SafeScoring
            """.strip(),

            'comparison_question': """
Here's how they compare on security:

{product_a}: {score_a}/100 🔒
{product_b}: {score_b}/100 🔒

Detailed comparison: safescoring.io/compare/{slug_a}/{slug_b}

#CryptoSecurity
            """.strip(),

            'general_mention': """
Thanks for the mention! 🙏

We rate 500+ crypto products across 2376 security norms.

Check your favorite wallet or protocol: safescoring.io

#CryptoSecurity
            """.strip()
        }

        self.responded_ids_file = Path('logs/responded_tweets.json')
        self.responded_ids = self._load_responded_ids()

    def setup_twitter(self):
        """Setup Twitter API client"""
        if not TWEEPY_AVAILABLE:
            print("⚠️ tweepy not installed")
            return

        api_key = os.getenv('TWITTER_API_KEY')
        api_secret = os.getenv('TWITTER_API_SECRET')
        access_token = os.getenv('TWITTER_ACCESS_TOKEN')
        access_secret = os.getenv('TWITTER_ACCESS_SECRET')
        bearer_token = os.getenv('TWITTER_BEARER_TOKEN')

        if all([api_key, api_secret, access_token, access_secret]):
            auth = tweepy.OAuth1UserHandler(
                api_key, api_secret,
                access_token, access_secret
            )
            self.twitter_client = tweepy.API(auth)
            self.twitter_v2 = tweepy.Client(
                bearer_token=bearer_token,
                consumer_key=api_key,
                consumer_secret=api_secret,
                access_token=access_token,
                access_token_secret=access_secret
            )
            print("✅ Twitter API connected")

    def _load_responded_ids(self) -> set:
        """Load already responded tweet IDs"""
        if self.responded_ids_file.exists():
            try:
                with open(self.responded_ids_file, 'r') as f:
                    return set(json.load(f))
            except (json.JSONDecodeError, Exception):
                pass
        return set()

    def _save_responded_ids(self):
        """Save responded tweet IDs"""
        self.responded_ids_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.responded_ids_file, 'w') as f:
            json.dump(list(self.responded_ids), f)

    async def search_mentions(self) -> list:
        """Search for relevant mentions and keywords"""
        if not self.twitter_v2:
            return []

        mentions = []

        try:
            # Search for keyword mentions
            for keyword in self.keywords[:5]:  # Limit to avoid rate limits
                results = self.twitter_v2.search_recent_tweets(
                    query=f'"{keyword}" -is:retweet lang:en',
                    max_results=10,
                    tweet_fields=['author_id', 'created_at', 'conversation_id']
                )

                if results.data:
                    for tweet in results.data:
                        if str(tweet.id) not in self.responded_ids:
                            mentions.append({
                                'id': str(tweet.id),
                                'text': tweet.text,
                                'author_id': tweet.author_id,
                                'keyword': keyword,
                                'created_at': tweet.created_at
                            })

            # Also get direct mentions
            me = self.twitter_v2.get_me()
            if me.data:
                direct_mentions = self.twitter_v2.get_users_mentions(
                    me.data.id,
                    max_results=20
                )
                if direct_mentions.data:
                    for tweet in direct_mentions.data:
                        if str(tweet.id) not in self.responded_ids:
                            mentions.append({
                                'id': str(tweet.id),
                                'text': tweet.text,
                                'author_id': tweet.author_id,
                                'keyword': 'direct_mention',
                                'created_at': getattr(tweet, 'created_at', None)
                            })

        except Exception as e:
            print(f"Error searching mentions: {e}")

        return mentions

    def detect_intent(self, text: str) -> dict:
        """Detect what the user is asking about"""
        text_lower = text.lower()

        # Check for security questions about specific products
        for product in self.known_products:
            if product in text_lower:
                # Is it a comparison?
                other_products = [p for p in self.known_products if p != product and p in text_lower]
                if other_products:
                    return {
                        'type': 'comparison',
                        'products': [product, other_products[0]]
                    }

                # Is it a security question?
                if any(q in text_lower for q in ['safe', 'secure', 'trust', 'legit', 'scam', 'hack']):
                    return {
                        'type': 'security_question',
                        'product': product
                    }

        # Direct mention without specific product
        if 'safescoring' in text_lower:
            return {'type': 'general_mention'}

        return {'type': 'unknown'}

    async def generate_response(self, mention: dict, intent: dict) -> str:
        """Generate appropriate response based on intent"""

        if intent['type'] == 'security_question':
            product = intent['product']
            # In production, fetch real score from database
            # For now, use placeholder
            return self.templates['security_question'].format(
                product=product.title(),
                score=82,
                s=85, a=80, f=82, e=81,
                slug=product.replace(' ', '-')
            )

        elif intent['type'] == 'comparison':
            products = intent['products']
            return self.templates['comparison_question'].format(
                product_a=products[0].title(),
                score_a=85,
                product_b=products[1].title(),
                score_b=78,
                slug_a=products[0].replace(' ', '-'),
                slug_b=products[1].replace(' ', '-')
            )

        elif intent['type'] == 'general_mention':
            return self.templates['general_mention']

        else:
            # Use AI to generate a contextual response
            prompt = f"""
Generate a brief, helpful Twitter reply to this tweet about crypto security:

Tweet: {mention['text']}

Guidelines:
- Be helpful and friendly
- If relevant, mention SafeScoring can help
- Include safescoring.io link
- Max 280 characters
- Use 1-2 relevant hashtags
            """
            response = await self.ai.generate(prompt, max_tokens=100)
            return response[:280] if response else None

    async def reply_to_mention(self, mention: dict, response: str):
        """Post reply to a tweet"""
        if not self.twitter_v2 or not response:
            return False

        try:
            # Post reply
            self.twitter_v2.create_tweet(
                text=response,
                in_reply_to_tweet_id=mention['id']
            )

            # Mark as responded
            self.responded_ids.add(mention['id'])
            self._save_responded_ids()

            print(f"✅ Replied to tweet {mention['id']}")
            return True

        except Exception as e:
            print(f"Error replying: {e}")
            return False

    async def run_cycle(self):
        """Run one monitoring cycle"""
        print(f"🔍 Searching for mentions... ({datetime.now().strftime('%H:%M')})")

        mentions = await self.search_mentions()
        print(f"Found {len(mentions)} new mentions")

        for mention in mentions[:5]:  # Limit responses per cycle
            intent = self.detect_intent(mention['text'])

            if intent['type'] == 'unknown':
                continue

            response = await self.generate_response(mention, intent)

            if response:
                # In production mode, auto-reply
                if os.getenv('AUTO_REPLY', 'false').lower() == 'true':
                    await self.reply_to_mention(mention, response)
                else:
                    # Save as draft for manual review
                    print(f"📝 Draft response for {mention['id']}:")
                    print(f"   Original: {mention['text'][:100]}...")
                    print(f"   Response: {response[:100]}...")
                    self._save_draft(mention, response)

            await asyncio.sleep(2)  # Rate limiting

    def _save_draft(self, mention: dict, response: str):
        """Save response draft for manual review"""
        drafts_dir = Path('drafts/replies')
        drafts_dir.mkdir(parents=True, exist_ok=True)

        draft = {
            'mention': mention,
            'response': response,
            'created_at': datetime.now().isoformat()
        }

        filename = f"reply_{mention['id']}.json"
        with open(drafts_dir / filename, 'w') as f:
            json.dump(draft, f, indent=2, default=str)

    async def run_forever(self):
        """Run monitoring loop"""
        print("🤖 Social Listener started")
        print("Monitoring keywords:", self.keywords[:5])

        while True:
            try:
                await self.run_cycle()
            except Exception as e:
                print(f"Cycle error: {e}")

            # Wait 15 minutes between cycles
            await asyncio.sleep(15 * 60)


async def main():
    listener = SocialListener()
    await listener.run_forever()


if __name__ == '__main__':
    asyncio.run(main())
