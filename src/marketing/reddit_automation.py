#!/usr/bin/env python3
"""
Reddit Marketing Automation
Auto-posts and engages on crypto subreddits.

Features:
- Post security alerts to relevant subreddits
- Comment on security-related discussions
- Track karma and engagement
- Avoid spam by respecting rate limits
"""

import asyncio
import os
import json
from datetime import datetime, timedelta
from pathlib import Path
import sys
import random

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    import praw
    PRAW_AVAILABLE = True
except ImportError:
    PRAW_AVAILABLE = False

from src.core.api_provider import AIProvider


class RedditMarketing:
    """Automated Reddit marketing"""

    def __init__(self):
        self.ai = AIProvider()
        self.reddit = None
        self.setup_reddit()

        # Target subreddits by category
        self.subreddits = {
            'security': [
                'CryptoSecurity',
                'ledgerwallet',
                'TREZOR',
                'CryptoCurrency',
            ],
            'defi': [
                'defi',
                'ethereum',
                'UniSwap',
                'aave',
            ],
            'wallets': [
                'Bitcoin',
                'CryptoCurrency',
                'ethfinance',
                'metamask',
            ],
            'general': [
                'CryptoCurrency',
                'CryptoMarkets',
                'altcoin',
            ]
        }

        # Post templates
        self.templates = {
            'incident_alert': """
🚨 **Security Alert: {title}**

{summary}

**Key Points:**
{points}

**SafeScore Impact:** Products affected may see score changes.

Full details and security analysis: [SafeScoring Report]({url})

---
*SafeScoring rates 500+ crypto products across 916 security norms*
            """.strip(),

            'comparison_post': """
**{product_a} vs {product_b} - Security Comparison**

I compared these two {category} using objective security metrics:

| Metric | {product_a} | {product_b} |
|--------|-------------|-------------|
| Overall Score | {score_a}/100 | {score_b}/100 |
| Security | {s_a}/100 | {s_b}/100 |
| Audit | {a_a}/100 | {a_b}/100 |

**Winner: {winner}** with a {diff} point advantage.

Full comparison with methodology: safescoring.io/compare/{slug_a}/{slug_b}

What's your experience with these?
            """.strip(),

            'helpful_comment': """
Great question! Based on security analysis:

{product} has a SafeScore of **{score}/100**:
- Security: {s}/100
- Audit status: {a}/100

You can see the full breakdown at safescoring.io/products/{slug}

{additional_insight}
            """.strip(),

            'weekly_roundup': """
**Weekly Crypto Security Roundup** 📊

Here are the top security-rated products this week:

**Hardware Wallets:**
1. {hw1_name} - {hw1_score}/100
2. {hw2_name} - {hw2_score}/100

**Exchanges:**
1. {ex1_name} - {ex1_score}/100
2. {ex2_name} - {ex2_score}/100

**DeFi Protocols:**
1. {defi1_name} - {defi1_score}/100
2. {defi2_name} - {defi2_score}/100

Full leaderboard: safescoring.io/leaderboard

Any products you'd like us to evaluate?
            """.strip()
        }

        self.activity_log_file = Path('logs/reddit_activity.json')
        self.activity_log = self._load_log()

    def setup_reddit(self):
        """Setup Reddit API client"""
        if not PRAW_AVAILABLE:
            print("⚠️ praw not installed: pip install praw")
            return

        client_id = os.getenv('REDDIT_CLIENT_ID')
        client_secret = os.getenv('REDDIT_CLIENT_SECRET')
        username = os.getenv('REDDIT_USERNAME')
        password = os.getenv('REDDIT_PASSWORD')

        if all([client_id, client_secret, username, password]):
            self.reddit = praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                username=username,
                password=password,
                user_agent='SafeScoring Bot v1.0'
            )
            print(f"✅ Reddit connected as u/{username}")

    def _load_log(self) -> dict:
        """Load activity history"""
        if self.activity_log_file.exists():
            try:
                with open(self.activity_log_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, Exception):
                pass
        return {'posts': [], 'comments': [], 'last_post': None}

    def _save_log(self):
        """Save activity history"""
        self.activity_log_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.activity_log_file, 'w') as f:
            json.dump(self.activity_log, f, indent=2, default=str)

    def _can_post(self) -> bool:
        """Check if we can post (rate limiting)"""
        last_post = self.activity_log.get('last_post')
        if not last_post:
            return True

        last_time = datetime.fromisoformat(last_post)
        # Wait at least 6 hours between posts
        return datetime.now() - last_time > timedelta(hours=6)

    async def find_relevant_posts(self, subreddit_name: str, keywords: list) -> list:
        """Find posts where we can add value"""
        if not self.reddit:
            return []

        relevant = []
        try:
            subreddit = self.reddit.subreddit(subreddit_name)

            # Search recent posts
            for post in subreddit.new(limit=50):
                # Skip if already commented
                if str(post.id) in [c['post_id'] for c in self.activity_log.get('comments', [])]:
                    continue

                title_lower = post.title.lower()
                text_lower = (post.selftext or '').lower()

                # Check for relevant keywords
                for keyword in keywords:
                    if keyword.lower() in title_lower or keyword.lower() in text_lower:
                        relevant.append({
                            'id': str(post.id),
                            'title': post.title,
                            'subreddit': subreddit_name,
                            'url': post.url,
                            'keyword': keyword,
                            'score': post.score,
                            'num_comments': post.num_comments
                        })
                        break

        except Exception as e:
            print(f"Error searching r/{subreddit_name}: {e}")

        return relevant

    async def generate_helpful_comment(self, post: dict) -> str:
        """Generate a helpful, non-spammy comment"""
        prompt = f"""
Generate a helpful Reddit comment for this post about crypto security.
Be genuinely helpful, not promotional. Only mention SafeScoring if truly relevant.

Post title: {post['title']}
Keyword matched: {post['keyword']}

Guidelines:
- Be helpful and informative first
- Share genuine insights about crypto security
- If relevant, mention SafeScoring as a resource (not mandatory)
- Match Reddit's casual but informed tone
- 2-4 sentences max
- Don't be salesy or spammy
        """

        response = await self.ai.generate(prompt, max_tokens=200)
        return response

    async def post_incident_alert(self, incident: dict, subreddit: str) -> bool:
        """Post security incident alert"""
        if not self.reddit or not self._can_post():
            return False

        try:
            content = self.templates['incident_alert'].format(
                title=incident.get('title', 'Security Incident'),
                summary=incident.get('summary', ''),
                points='\n'.join(f"- {p}" for p in incident.get('points', [])),
                url=f"https://safescoring.io/incidents/{incident.get('id', '')}"
            )

            sub = self.reddit.subreddit(subreddit)
            post = sub.submit(
                title=f"🚨 {incident.get('title', 'Security Alert')}",
                selftext=content
            )

            self.activity_log['posts'].append({
                'id': str(post.id),
                'subreddit': subreddit,
                'title': incident.get('title'),
                'posted_at': datetime.now().isoformat()
            })
            self.activity_log['last_post'] = datetime.now().isoformat()
            self._save_log()

            print(f"✅ Posted to r/{subreddit}: {post.shortlink}")
            return True

        except Exception as e:
            print(f"Error posting to r/{subreddit}: {e}")
            return False

    async def post_weekly_roundup(self) -> bool:
        """Post weekly security roundup"""
        if not self.reddit or not self._can_post():
            return False

        # In production, fetch real data from Supabase
        content = self.templates['weekly_roundup'].format(
            hw1_name='Ledger Nano X', hw1_score=85,
            hw2_name='Trezor Model T', hw2_score=82,
            ex1_name='Kraken', ex1_score=88,
            ex2_name='Coinbase', ex2_score=84,
            defi1_name='Aave', defi1_score=79,
            defi2_name='Uniswap', defi2_score=76,
        )

        try:
            sub = self.reddit.subreddit('CryptoCurrency')
            post = sub.submit(
                title="Weekly Crypto Security Roundup - Top Rated Products",
                selftext=content
            )

            self.activity_log['posts'].append({
                'id': str(post.id),
                'subreddit': 'CryptoCurrency',
                'type': 'weekly_roundup',
                'posted_at': datetime.now().isoformat()
            })
            self.activity_log['last_post'] = datetime.now().isoformat()
            self._save_log()

            print(f"✅ Weekly roundup posted: {post.shortlink}")
            return True

        except Exception as e:
            print(f"Error posting weekly roundup: {e}")
            return False

    async def engage_with_community(self):
        """Find and reply to relevant posts"""
        if not self.reddit:
            return

        keywords = [
            'wallet security', 'is ledger safe', 'best hardware wallet',
            'secure exchange', 'defi security', 'audit', 'hack',
            'which wallet', 'safest crypto', 'security score'
        ]

        for category, subs in self.subreddits.items():
            for subreddit in subs[:2]:  # Limit to avoid rate limits
                posts = await self.find_relevant_posts(subreddit, keywords)

                for post in posts[:2]:  # Max 2 comments per subreddit
                    comment = await self.generate_helpful_comment(post)

                    if comment and not os.getenv('DRY_RUN', 'true').lower() == 'true':
                        try:
                            submission = self.reddit.submission(id=post['id'])
                            reply = submission.reply(comment)

                            self.activity_log['comments'].append({
                                'post_id': post['id'],
                                'comment_id': str(reply.id),
                                'subreddit': subreddit,
                                'commented_at': datetime.now().isoformat()
                            })
                            self._save_log()

                            print(f"✅ Commented on: {post['title'][:50]}...")
                        except Exception as e:
                            print(f"Error commenting: {e}")
                    else:
                        # Save as draft
                        self._save_comment_draft(post, comment)

                    await asyncio.sleep(random.randint(30, 60))  # Rate limiting

    def _save_comment_draft(self, post: dict, comment: str):
        """Save comment as draft for manual review"""
        drafts_dir = Path('drafts/reddit')
        drafts_dir.mkdir(parents=True, exist_ok=True)

        draft = {
            'post': post,
            'comment': comment,
            'created_at': datetime.now().isoformat()
        }

        filename = f"reddit_{post['id']}.json"
        with open(drafts_dir / filename, 'w') as f:
            json.dump(draft, f, indent=2)
        print(f"📝 Draft saved: {filename}")

    async def run_daily_cycle(self):
        """Run daily Reddit marketing cycle"""
        print(f"🔄 Starting Reddit cycle ({datetime.now().strftime('%H:%M')})")

        # 1. Engage with community (comments)
        await self.engage_with_community()

        # 2. Post content if allowed
        if self._can_post():
            # Check if it's Sunday for weekly roundup
            if datetime.now().weekday() == 6:
                await self.post_weekly_roundup()

        stats = {
            'total_posts': len(self.activity_log.get('posts', [])),
            'total_comments': len(self.activity_log.get('comments', [])),
            'last_post': self.activity_log.get('last_post')
        }
        print(f"📊 Reddit stats: {stats}")

        return stats


async def main():
    reddit = RedditMarketing()
    await reddit.run_daily_cycle()


if __name__ == '__main__':
    asyncio.run(main())
