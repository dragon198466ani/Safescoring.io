#!/usr/bin/env python3
"""
SAFESCORING.IO - Twitter/X Auto Publisher
Automatically publishes generated content to Twitter/X.

Supports:
- Single tweets
- Thread posting
- Scheduled posting
- Draft mode (save without posting)
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests


class TwitterPublisher:
    """
    Twitter/X publisher using Twitter API v2.
    Handles authentication, posting, and scheduling.
    """

    API_BASE = 'https://api.twitter.com/2'

    def __init__(self, credentials_file: str = 'config/.twitter_credentials.json'):
        """
        Initialize Twitter publisher.

        Credentials file should contain:
        {
            "api_key": "...",
            "api_secret": "...",
            "access_token": "...",
            "access_token_secret": "...",
            "bearer_token": "..."
        }
        """
        self.credentials_file = credentials_file
        self.credentials = self._load_credentials()
        self.drafts_file = 'data/marketing_content/drafts.json'
        self.posted_file = 'data/marketing_content/posted.json'
        self.is_configured = self._check_credentials()

    def _load_credentials(self) -> Dict:
        """Load Twitter API credentials."""
        try:
            if os.path.exists(self.credentials_file):
                with open(self.credentials_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load Twitter credentials: {e}")
        return {}

    def _check_credentials(self) -> bool:
        """Check if all required credentials are present."""
        required = ['api_key', 'api_secret', 'access_token', 'access_token_secret']
        return all(self.credentials.get(k) for k in required)

    def _get_oauth_header(self) -> Dict:
        """
        Get OAuth 1.0a header for Twitter API.
        Note: For full implementation, use tweepy or requests-oauthlib.
        """
        # For now, we'll use the bearer token for read operations
        # and save drafts for manual posting if OAuth not configured
        bearer = self.credentials.get('bearer_token', '')
        if bearer:
            return {'Authorization': f'Bearer {bearer}'}
        return {}

    def post_tweet(self, text: str, reply_to: str = None) -> Optional[str]:
        """
        Post a single tweet.

        Args:
            text: Tweet text (max 280 chars)
            reply_to: Tweet ID to reply to (for threads)

        Returns:
            Tweet ID if successful, None otherwise
        """
        if not self.is_configured:
            print("Twitter not configured - saving as draft")
            self._save_draft({'type': 'tweet', 'text': text})
            return None

        try:
            # Using tweepy for OAuth 1.0a (if available)
            try:
                import tweepy

                auth = tweepy.OAuthHandler(
                    self.credentials['api_key'],
                    self.credentials['api_secret']
                )
                auth.set_access_token(
                    self.credentials['access_token'],
                    self.credentials['access_token_secret']
                )

                client = tweepy.Client(
                    consumer_key=self.credentials['api_key'],
                    consumer_secret=self.credentials['api_secret'],
                    access_token=self.credentials['access_token'],
                    access_token_secret=self.credentials['access_token_secret']
                )

                kwargs = {'text': text}
                if reply_to:
                    kwargs['in_reply_to_tweet_id'] = reply_to

                response = client.create_tweet(**kwargs)

                if response.data:
                    tweet_id = response.data['id']
                    self._log_posted(tweet_id, text)
                    return tweet_id

            except ImportError:
                print("tweepy not installed - saving as draft")
                print("Install with: pip install tweepy")
                self._save_draft({'type': 'tweet', 'text': text, 'reply_to': reply_to})
                return None

        except Exception as e:
            print(f"Error posting tweet: {e}")
            self._save_draft({'type': 'tweet', 'text': text, 'error': str(e)})

        return None

    def post_thread(self, tweets: List[str], delay_seconds: int = 2) -> List[str]:
        """
        Post a thread of tweets.

        Args:
            tweets: List of tweet texts
            delay_seconds: Delay between tweets to avoid rate limiting

        Returns:
            List of posted tweet IDs
        """
        if not tweets:
            return []

        if not self.is_configured:
            print("Twitter not configured - saving thread as draft")
            self._save_draft({'type': 'thread', 'tweets': tweets})
            return []

        posted_ids = []
        last_id = None

        for i, tweet_text in enumerate(tweets):
            print(f"Posting tweet {i+1}/{len(tweets)}...")

            tweet_id = self.post_tweet(tweet_text, reply_to=last_id)

            if tweet_id:
                posted_ids.append(tweet_id)
                last_id = tweet_id
                print(f"  Posted: {tweet_id}")
            else:
                print(f"  Failed to post tweet {i+1}")
                # Save remaining tweets as drafts
                remaining = tweets[i:]
                self._save_draft({
                    'type': 'thread_continuation',
                    'tweets': remaining,
                    'reply_to': last_id
                })
                break

            # Delay between tweets
            if i < len(tweets) - 1:
                time.sleep(delay_seconds)

        return posted_ids

    def schedule_tweet(self, text: str, post_time: datetime) -> str:
        """
        Schedule a tweet for later posting.
        Saves to drafts with scheduled time.

        Returns:
            Schedule ID
        """
        schedule_id = f"sched_{int(time.time())}"

        self._save_draft({
            'id': schedule_id,
            'type': 'scheduled',
            'text': text,
            'scheduled_for': post_time.isoformat(),
            'created_at': datetime.now().isoformat()
        })

        return schedule_id

    def schedule_thread(self, tweets: List[str], post_time: datetime) -> str:
        """
        Schedule a thread for later posting.

        Returns:
            Schedule ID
        """
        schedule_id = f"sched_thread_{int(time.time())}"

        self._save_draft({
            'id': schedule_id,
            'type': 'scheduled_thread',
            'tweets': tweets,
            'scheduled_for': post_time.isoformat(),
            'created_at': datetime.now().isoformat()
        })

        return schedule_id

    def post_scheduled(self) -> int:
        """
        Post all scheduled content that is due.

        Returns:
            Number of items posted
        """
        drafts = self._load_drafts()
        now = datetime.now()
        posted_count = 0

        for draft in drafts:
            if draft.get('type') not in ['scheduled', 'scheduled_thread']:
                continue

            scheduled_time = datetime.fromisoformat(draft['scheduled_for'])
            if scheduled_time > now:
                continue

            if draft['type'] == 'scheduled':
                result = self.post_tweet(draft['text'])
                if result:
                    posted_count += 1
                    self._remove_draft(draft['id'])

            elif draft['type'] == 'scheduled_thread':
                results = self.post_thread(draft['tweets'])
                if results:
                    posted_count += 1
                    self._remove_draft(draft['id'])

        return posted_count

    def _save_draft(self, draft: Dict):
        """Save content as draft."""
        drafts = self._load_drafts()

        draft['saved_at'] = datetime.now().isoformat()
        if 'id' not in draft:
            draft['id'] = f"draft_{int(time.time())}"

        drafts.append(draft)

        os.makedirs(os.path.dirname(self.drafts_file), exist_ok=True)
        with open(self.drafts_file, 'w', encoding='utf-8') as f:
            json.dump(drafts, f, indent=2, ensure_ascii=False)

        print(f"Saved draft: {draft['id']}")

    def _load_drafts(self) -> List[Dict]:
        """Load all drafts."""
        try:
            if os.path.exists(self.drafts_file):
                with open(self.drafts_file, 'r') as f:
                    return json.load(f)
        except Exception:
            pass
        return []

    def _remove_draft(self, draft_id: str):
        """Remove a draft by ID."""
        drafts = self._load_drafts()
        drafts = [d for d in drafts if d.get('id') != draft_id]

        with open(self.drafts_file, 'w', encoding='utf-8') as f:
            json.dump(drafts, f, indent=2, ensure_ascii=False)

    def _log_posted(self, tweet_id: str, text: str):
        """Log posted tweets."""
        try:
            posted = []
            if os.path.exists(self.posted_file):
                with open(self.posted_file, 'r') as f:
                    posted = json.load(f)

            posted.append({
                'tweet_id': tweet_id,
                'text': text[:100],
                'posted_at': datetime.now().isoformat()
            })

            # Keep last 100 entries
            posted = posted[-100:]

            os.makedirs(os.path.dirname(self.posted_file), exist_ok=True)
            with open(self.posted_file, 'w', encoding='utf-8') as f:
                json.dump(posted, f, indent=2)

        except Exception as e:
            print(f"Warning: Could not log posted tweet: {e}")

    def get_drafts(self) -> List[Dict]:
        """Get all saved drafts."""
        return self._load_drafts()

    def get_draft_summary(self) -> Dict:
        """Get summary of drafts."""
        drafts = self._load_drafts()

        summary = {
            'total': len(drafts),
            'tweets': len([d for d in drafts if d.get('type') == 'tweet']),
            'threads': len([d for d in drafts if d.get('type') == 'thread']),
            'scheduled': len([d for d in drafts if 'scheduled' in d.get('type', '')]),
        }

        return summary

    def export_drafts_for_typefully(self) -> str:
        """
        Export drafts in a format compatible with Typefully.
        Typefully is a Twitter scheduling tool.

        Returns:
            Path to exported file
        """
        drafts = self._load_drafts()
        export = []

        for draft in drafts:
            if draft.get('type') == 'thread':
                # Typefully uses --- as tweet separator
                content = '\n---\n'.join(draft.get('tweets', []))
                export.append({
                    'content': content,
                    'type': 'thread'
                })
            elif draft.get('type') == 'tweet':
                export.append({
                    'content': draft.get('text', ''),
                    'type': 'tweet'
                })

        export_file = 'data/marketing_content/typefully_export.json'
        with open(export_file, 'w', encoding='utf-8') as f:
            json.dump(export, f, indent=2, ensure_ascii=False)

        return export_file


# Test
if __name__ == '__main__':
    publisher = TwitterPublisher()

    print("Twitter Publisher Status")
    print("="*40)
    print(f"Configured: {publisher.is_configured}")
    print(f"Credentials file: {publisher.credentials_file}")

    summary = publisher.get_draft_summary()
    print(f"\nDrafts: {summary}")

    # Test saving a draft
    test_thread = [
        "Test tweet 1: This is a test thread about crypto security.",
        "Test tweet 2: Always verify your tools before using them.",
        "Test tweet 3: Check out safescoring.io for security ratings."
    ]

    print("\nSaving test thread as draft...")
    publisher._save_draft({'type': 'thread', 'tweets': test_thread})

    print("\nDraft saved! Check data/marketing_content/drafts.json")
