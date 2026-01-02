#!/usr/bin/env python3
"""
SAFESCORING.IO - Marketing Automation Orchestrator
Main script that combines monitoring, content generation, and publishing.

Usage:
    python -m src.marketing.auto_marketing              # Run once
    python -m src.marketing.auto_marketing --daemon     # Run continuously
    python -m src.marketing.auto_marketing --dry-run    # Generate without posting
"""

import os
import sys
import json
import time
import argparse
import schedule
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.marketing.crypto_monitor import CryptoMonitor
from src.marketing.content_generator import ContentGenerator
from src.marketing.twitter_publisher import TwitterPublisher


class MarketingAutomation:
    """
    Main orchestrator for automated marketing.

    Workflow:
    1. Monitor crypto news and security events
    2. Score events by marketing relevance
    3. Generate content for high-value events
    4. Post or schedule content
    5. Track performance
    """

    # Minimum relevance score to generate content
    MIN_RELEVANCE_SCORE = 40

    # Maximum posts per day to avoid spam
    MAX_DAILY_POSTS = 5

    # Hours between similar topic posts
    TOPIC_COOLDOWN_HOURS = 12

    def __init__(self, dry_run: bool = False):
        """
        Initialize marketing automation.

        Args:
            dry_run: If True, generate content but don't post
        """
        self.monitor = CryptoMonitor()
        self.generator = ContentGenerator()
        self.publisher = TwitterPublisher()
        self.dry_run = dry_run

        self.stats_file = 'data/marketing_content/stats.json'
        self.stats = self._load_stats()

    def _load_stats(self) -> Dict:
        """Load marketing stats."""
        try:
            if os.path.exists(self.stats_file):
                with open(self.stats_file, 'r') as f:
                    return json.load(f)
        except Exception:
            pass

        return {
            'total_posts': 0,
            'posts_today': 0,
            'last_post_date': None,
            'last_topics': [],
            'events_processed': 0
        }

    def _save_stats(self):
        """Save marketing stats."""
        try:
            os.makedirs(os.path.dirname(self.stats_file), exist_ok=True)
            with open(self.stats_file, 'w') as f:
                json.dump(self.stats, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save stats: {e}")

    def _reset_daily_stats(self):
        """Reset daily counters if new day."""
        today = datetime.now().strftime('%Y-%m-%d')
        if self.stats.get('last_post_date') != today:
            self.stats['posts_today'] = 0
            self.stats['last_post_date'] = today

    def _can_post(self) -> bool:
        """Check if we can post (rate limiting)."""
        self._reset_daily_stats()
        return self.stats['posts_today'] < self.MAX_DAILY_POSTS

    def _should_skip_topic(self, category: str) -> bool:
        """Check if we should skip this topic (cooldown)."""
        recent_topics = self.stats.get('last_topics', [])

        for topic_info in recent_topics:
            if topic_info['category'] == category:
                posted_at = datetime.fromisoformat(topic_info['posted_at'])
                if datetime.now() - posted_at < timedelta(hours=self.TOPIC_COOLDOWN_HOURS):
                    return True

        return False

    def _record_post(self, category: str):
        """Record that we posted about a topic."""
        self.stats['total_posts'] += 1
        self.stats['posts_today'] += 1

        # Keep last 10 topics
        self.stats['last_topics'].append({
            'category': category,
            'posted_at': datetime.now().isoformat()
        })
        self.stats['last_topics'] = self.stats['last_topics'][-10:]

        self._save_stats()

    def run_once(self) -> Dict:
        """
        Run one cycle of the marketing automation.

        Returns:
            Summary of actions taken
        """
        print("\n" + "="*60)
        print("SAFESCORING MARKETING AUTOMATION")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print("="*60)

        summary = {
            'events_found': 0,
            'content_generated': 0,
            'posts_published': 0,
            'drafts_saved': 0
        }

        # Step 1: Fetch events
        print("\n[1/4] Fetching crypto events...")
        events = self.monitor.get_top_events(
            limit=10,
            min_score=self.MIN_RELEVANCE_SCORE
        )
        summary['events_found'] = len(events)
        print(f"Found {len(events)} relevant events")

        if not events:
            print("No new relevant events found")
            return summary

        # Step 2: Check rate limits
        if not self._can_post():
            print(f"\nDaily post limit reached ({self.MAX_DAILY_POSTS})")
            print("Saving content as drafts for later...")

        # Step 3: Process top events
        print("\n[2/4] Processing events...")

        for event in events[:3]:  # Process top 3
            print(f"\n--- Processing: {event['title'][:60]}...")
            print(f"    Category: {event['category']}, Score: {event['relevance_score']}")

            # Check topic cooldown
            if self._should_skip_topic(event['category']):
                print(f"    Skipping: Recently posted about {event['category']}")
                continue

            # Generate content based on event type
            if event['category'] == 'HACK':
                print("    Generating hack thread...")
                content = self.generator.generate_hack_thread(event)
                content_type = 'thread'
            else:
                print("    Generating single tweet...")
                content = self.generator.generate_single_tweet(event)
                content_type = 'tweet'

            if not content:
                print("    Failed to generate content")
                continue

            summary['content_generated'] += 1

            # Preview content
            if content_type == 'thread':
                print(f"    Generated {len(content)}-tweet thread")
                for i, tweet in enumerate(content[:2], 1):
                    print(f"      [{i}] {tweet[:60]}...")
            else:
                print(f"    Generated: {content[:60]}...")

            # Step 4: Post or save
            if self.dry_run:
                print("    [DRY RUN] Saving as draft...")
                self.publisher._save_draft({
                    'type': content_type,
                    'tweets' if content_type == 'thread' else 'text': content,
                    'event': event['title'],
                    'generated_at': datetime.now().isoformat()
                })
                summary['drafts_saved'] += 1

            elif self._can_post():
                print("    Publishing...")
                if content_type == 'thread':
                    result = self.publisher.post_thread(content)
                else:
                    result = self.publisher.post_tweet(content)

                if result:
                    summary['posts_published'] += 1
                    self._record_post(event['category'])
                    print(f"    Published successfully!")
                else:
                    summary['drafts_saved'] += 1
                    print("    Saved as draft (publish failed)")

            else:
                self.publisher._save_draft({
                    'type': content_type,
                    'tweets' if content_type == 'thread' else 'text': content,
                    'event': event['title']
                })
                summary['drafts_saved'] += 1

            self.stats['events_processed'] += 1

        # Final summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Events found: {summary['events_found']}")
        print(f"Content generated: {summary['content_generated']}")
        print(f"Posts published: {summary['posts_published']}")
        print(f"Drafts saved: {summary['drafts_saved']}")

        self._save_stats()
        return summary

    def run_educational_content(self):
        """Generate educational content (not event-driven)."""
        print("\n[EDUCATIONAL] Generating educational thread...")

        topics = [
            "Les 5 erreurs les plus courantes en securite crypto",
            "Comment verifier qu'un smart contract est sur",
            "Hardware wallet vs Software wallet: le guide complet",
            "Pourquoi les audits ne suffisent pas",
            "Comment proteger ses seed phrases",
            "Les signaux d'alerte d'un projet crypto dangereux",
            "Multisig: pourquoi et comment l'utiliser"
        ]

        # Pick a topic we haven't covered recently
        import random
        topic = random.choice(topics)

        thread = self.generator.generate_educational_thread(topic)

        if thread:
            print(f"Generated {len(thread)}-tweet educational thread on: {topic}")

            if self.dry_run:
                self.publisher._save_draft({
                    'type': 'thread',
                    'tweets': thread,
                    'topic': topic,
                    'content_type': 'educational'
                })
            else:
                self.publisher.post_thread(thread)

    def run_weekly_recap(self):
        """Generate weekly security recap."""
        print("\n[WEEKLY] Generating weekly recap...")

        # Get events from last 7 days
        events = self.monitor.fetch_all_events()

        if events:
            thread = self.generator.generate_weekly_recap(events)

            if thread:
                print(f"Generated {len(thread)}-tweet weekly recap")

                if self.dry_run:
                    self.publisher._save_draft({
                        'type': 'thread',
                        'tweets': thread,
                        'content_type': 'weekly_recap'
                    })
                else:
                    self.publisher.post_thread(thread)

    def run_hybrid_methodology_thread(self, angle: str = None):
        """
        Generate a thread explaining the hybrid AI+human methodology.
        Great for building trust and differentiating from competitors.

        Args:
            angle: 'trust', 'methodology', 'differentiation', or 'transparency'
                   If None, rotates through angles weekly.
        """
        print("\n[HYBRID] Generating hybrid methodology thread...")

        # Rotate through angles if not specified
        if angle is None:
            import random
            angles = ['trust', 'methodology', 'differentiation', 'transparency']
            angle = random.choice(angles)

        print(f"    Angle: {angle}")

        thread = self.generator.generate_hybrid_methodology_thread(angle=angle)

        if thread:
            print(f"Generated {len(thread)}-tweet hybrid methodology thread")

            if self.dry_run:
                self.publisher._save_draft({
                    'type': 'thread',
                    'tweets': thread,
                    'content_type': 'hybrid_methodology',
                    'angle': angle,
                    'generated_at': datetime.now().isoformat()
                })
                print("    [DRY RUN] Saved as draft")
            else:
                result = self.publisher.post_thread(thread)
                if result:
                    print("    Published successfully!")
                    self._record_post('HYBRID_METHODOLOGY')
                else:
                    self.publisher._save_draft({
                        'type': 'thread',
                        'tweets': thread,
                        'content_type': 'hybrid_methodology',
                        'angle': angle
                    })
                    print("    Saved as draft (publish failed)")
        else:
            print("    Failed to generate thread")

    def run_daemon(self, check_interval_minutes: int = 30):
        """
        Run continuously as a daemon.

        Checks for new events every N minutes and generates content.
        """
        print(f"\nStarting daemon mode (checking every {check_interval_minutes} min)")
        print("Press Ctrl+C to stop\n")

        # Schedule tasks
        schedule.every(check_interval_minutes).minutes.do(self.run_once)
        schedule.every().day.at("09:00").do(self.run_educational_content)
        schedule.every().sunday.at("18:00").do(self.run_weekly_recap)
        schedule.every().wednesday.at("14:00").do(self.run_hybrid_methodology_thread)  # Hybrid AI+Human thread

        # Run immediately on start
        self.run_once()

        # Keep running
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except KeyboardInterrupt:
                print("\nStopping daemon...")
                break

    def get_status(self) -> Dict:
        """Get current automation status."""
        drafts = self.publisher.get_draft_summary()

        return {
            'stats': self.stats,
            'drafts': drafts,
            'twitter_configured': self.publisher.is_configured,
            'can_post': self._can_post(),
            'remaining_posts_today': self.MAX_DAILY_POSTS - self.stats.get('posts_today', 0)
        }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description='SafeScoring Marketing Automation'
    )
    parser.add_argument(
        '--daemon', '-d',
        action='store_true',
        help='Run continuously as daemon'
    )
    parser.add_argument(
        '--dry-run', '-n',
        action='store_true',
        help='Generate content without posting'
    )
    parser.add_argument(
        '--interval', '-i',
        type=int,
        default=30,
        help='Check interval in minutes (daemon mode)'
    )
    parser.add_argument(
        '--educational', '-e',
        action='store_true',
        help='Generate educational content'
    )
    parser.add_argument(
        '--weekly', '-w',
        action='store_true',
        help='Generate weekly recap'
    )
    parser.add_argument(
        '--hybrid',
        action='store_true',
        help='Generate hybrid AI+human methodology thread'
    )
    parser.add_argument(
        '--hybrid-angle',
        type=str,
        choices=['trust', 'methodology', 'differentiation', 'transparency'],
        help='Angle for hybrid thread (trust, methodology, differentiation, transparency)'
    )
    parser.add_argument(
        '--status', '-s',
        action='store_true',
        help='Show current status'
    )

    args = parser.parse_args()

    automation = MarketingAutomation(dry_run=args.dry_run)

    if args.status:
        status = automation.get_status()
        print(json.dumps(status, indent=2))
        return

    if args.educational:
        automation.run_educational_content()
        return

    if args.weekly:
        automation.run_weekly_recap()
        return

    if args.hybrid:
        automation.run_hybrid_methodology_thread(angle=args.hybrid_angle)
        return

    if args.daemon:
        automation.run_daemon(check_interval_minutes=args.interval)
    else:
        automation.run_once()


if __name__ == '__main__':
    main()
