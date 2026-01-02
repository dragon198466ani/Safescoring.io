#!/usr/bin/env python3
"""
Automated Testimonial Collector
Requests and collects user testimonials automatically.

Features:
- Send review request emails after user actions
- Collect Twitter mentions as testimonials
- Format testimonials for website display
- A/B test request timing
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
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

from supabase import create_client


class TestimonialCollector:
    """Automated testimonial collection"""

    def __init__(self):
        self.supabase = None
        if os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_KEY'):
            self.supabase = create_client(
                os.getenv('SUPABASE_URL'),
                os.getenv('SUPABASE_KEY')
            )

        if RESEND_AVAILABLE and os.getenv('RESEND_API_KEY'):
            resend.api_key = os.getenv('RESEND_API_KEY')

        self.output_dir = Path('content/testimonials')
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Email templates for review requests
        self.email_templates = {
            'first_use': {
                'subject': 'How was your SafeScoring experience?',
                'delay_hours': 24,
                'body': """
Hi {name}!

You recently checked security scores on SafeScoring. We'd love to hear about your experience!

Quick question: **Did SafeScoring help you make a safer crypto decision?**

→ [Yes, it helped!]({feedback_url}?rating=positive)
→ [It could be better]({feedback_url}?rating=needs_improvement)

Your feedback helps us improve for everyone.

Thanks for helping make crypto safer!

The SafeScoring Team
                """
            },
            'power_user': {
                'subject': 'You\'re a SafeScoring power user! 🌟',
                'delay_hours': 168,  # 1 week
                'body': """
Hi {name}!

We noticed you've been using SafeScoring regularly - thank you!

Would you mind sharing your experience? A quick testimonial helps others discover SafeScoring.

**Share your story:**
→ [Leave a testimonial]({testimonial_url})

As a thank you, we'll feature your name on our testimonials page and give you early access to new features!

Best,
The SafeScoring Team
                """
            },
            'after_correction': {
                'subject': 'Thanks for your contribution! 🙏',
                'delay_hours': 48,
                'body': """
Hi {name}!

Your security correction was approved and is now helping make crypto safer for everyone. Amazing contribution!

Would you share why you contribute to SafeScoring?

→ [Share your story]({testimonial_url})

Contributors like you are the heart of our community.

Thanks for making a difference!

The SafeScoring Team
                """
            }
        }

    async def get_users_for_outreach(self, trigger: str) -> list:
        """Get users eligible for testimonial request"""
        if not self.supabase:
            return []

        users = []
        now = datetime.now()

        try:
            if trigger == 'first_use':
                # Users who signed up 24h ago and haven't been contacted
                cutoff = (now - timedelta(hours=24)).isoformat()
                cutoff_max = (now - timedelta(hours=48)).isoformat()

                result = self.supabase.table('users')\
                    .select('id, email, name')\
                    .gte('created_at', cutoff_max)\
                    .lte('created_at', cutoff)\
                    .execute()

                users = result.data or []

            elif trigger == 'power_user':
                # Users with 5+ visits in last week
                # Simplified - in production, track page views
                result = self.supabase.table('users')\
                    .select('id, email, name')\
                    .limit(10)\
                    .execute()

                users = result.data or []

            elif trigger == 'after_correction':
                # Users whose correction was approved recently
                cutoff = (now - timedelta(hours=48)).isoformat()

                result = self.supabase.table('user_corrections')\
                    .select('user_id')\
                    .eq('status', 'approved')\
                    .gte('updated_at', cutoff)\
                    .execute()

                if result.data:
                    user_ids = [c['user_id'] for c in result.data]
                    user_result = self.supabase.table('users')\
                        .select('id, email, name')\
                        .in_('id', user_ids)\
                        .execute()
                    users = user_result.data or []

        except Exception as e:
            print(f"Error fetching users: {e}")

        return users

    async def send_testimonial_request(self, user: dict, trigger: str) -> bool:
        """Send testimonial request email"""
        if not RESEND_AVAILABLE:
            print(f"📝 Would email {user.get('email', 'unknown')}")
            return False

        template = self.email_templates.get(trigger)
        if not template:
            return False

        feedback_url = 'https://safescoring.io/feedback'
        testimonial_url = 'https://safescoring.io/testimonial'

        body = template['body'].format(
            name=user.get('name', 'there'),
            feedback_url=feedback_url,
            testimonial_url=testimonial_url
        )

        try:
            resend.Emails.send({
                'from': 'SafeScoring <hello@safescoring.io>',
                'to': [user['email']],
                'subject': template['subject'],
                'text': body.strip()
            })
            print(f"✅ Sent testimonial request to {user['email']}")
            return True
        except Exception as e:
            print(f"Error sending email: {e}")
            return False

    async def collect_twitter_testimonials(self) -> list:
        """Collect positive mentions from Twitter"""
        # In production, use Twitter API to find positive mentions
        # For now, return sample format

        testimonials = []

        # Sample Twitter testimonial structure
        sample = {
            'source': 'twitter',
            'author': '@crypto_user',
            'author_name': 'Crypto Enthusiast',
            'text': 'Just used @SafeScoring to check my wallet security. Super helpful! Now I know exactly what to look for. 🔒',
            'url': 'https://twitter.com/crypto_user/status/123456789',
            'date': datetime.now().isoformat(),
            'verified': False  # Needs manual verification
        }

        return testimonials

    async def format_testimonial(self, raw: dict) -> dict:
        """Format testimonial for display"""
        return {
            'id': raw.get('id', ''),
            'author': {
                'name': raw.get('author_name', 'Anonymous'),
                'handle': raw.get('author', ''),
                'avatar': raw.get('avatar', ''),
                'verified': raw.get('verified', False)
            },
            'quote': raw.get('text', ''),
            'source': raw.get('source', 'website'),
            'rating': raw.get('rating', 5),
            'date': raw.get('date', datetime.now().isoformat()),
            'featured': False
        }

    async def save_testimonial(self, testimonial: dict):
        """Save testimonial to database and file"""
        formatted = await self.format_testimonial(testimonial)

        # Save to file (backup)
        filename = f"testimonial_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(self.output_dir / filename, 'w') as f:
            json.dump(formatted, f, indent=2)

        # Save to Supabase
        if self.supabase:
            try:
                self.supabase.table('testimonials').insert({
                    'author_name': formatted['author']['name'],
                    'author_handle': formatted['author']['handle'],
                    'quote': formatted['quote'],
                    'source': formatted['source'],
                    'rating': formatted['rating'],
                    'verified': formatted['author']['verified'],
                    'featured': False
                }).execute()
            except Exception as e:
                print(f"Error saving to DB: {e}")

        print(f"💬 Saved testimonial from {formatted['author']['name']}")

    async def get_featured_testimonials(self, limit: int = 6) -> list:
        """Get featured testimonials for display"""
        if not self.supabase:
            return []

        try:
            result = self.supabase.table('testimonials')\
                .select('*')\
                .eq('verified', True)\
                .eq('featured', True)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()

            return result.data or []
        except Exception as e:
            print(f"Error fetching testimonials: {e}")
            return []

    async def run_daily_collection(self):
        """Run daily testimonial collection cycle"""
        print("💬 Starting testimonial collection...")

        sent_count = 0

        # 1. Send first-use requests
        first_users = await self.get_users_for_outreach('first_use')
        for user in first_users[:10]:  # Max 10 per day per trigger
            if await self.send_testimonial_request(user, 'first_use'):
                sent_count += 1
            await asyncio.sleep(2)

        # 2. Send power user requests
        power_users = await self.get_users_for_outreach('power_user')
        for user in power_users[:5]:
            if await self.send_testimonial_request(user, 'power_user'):
                sent_count += 1
            await asyncio.sleep(2)

        # 3. Collect Twitter testimonials
        twitter_testimonials = await self.collect_twitter_testimonials()
        for t in twitter_testimonials:
            await self.save_testimonial(t)

        print(f"✅ Sent {sent_count} requests, collected {len(twitter_testimonials)} from Twitter")

        return {
            'requests_sent': sent_count,
            'twitter_collected': len(twitter_testimonials)
        }


async def main():
    collector = TestimonialCollector()
    await collector.run_daily_collection()


if __name__ == '__main__':
    asyncio.run(main())
