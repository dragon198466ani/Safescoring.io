#!/usr/bin/env python3
"""
Automated Backlink Outreach System
Finds opportunities and sends personalized outreach emails.

Strategy:
1. Find crypto blogs, news sites, comparison sites
2. Analyze their content for linking opportunities
3. Generate personalized outreach emails
4. Track responses and follow-ups
"""

import asyncio
import os
import json
from datetime import datetime, timedelta
from pathlib import Path
import sys
import hashlib

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

from src.core.api_provider import AIProvider


class BacklinkOutreach:
    """Automated backlink outreach system"""

    def __init__(self):
        self.ai = AIProvider()

        if RESEND_AVAILABLE and os.getenv('RESEND_API_KEY'):
            resend.api_key = os.getenv('RESEND_API_KEY')

        # Target sites for outreach
        self.target_sites = [
            # Crypto news sites
            {'domain': 'coindesk.com', 'type': 'news', 'contact_pattern': 'tips@coindesk.com'},
            {'domain': 'cointelegraph.com', 'type': 'news', 'contact_pattern': 'editorial@cointelegraph.com'},
            {'domain': 'decrypt.co', 'type': 'news', 'contact_pattern': 'tips@decrypt.co'},
            {'domain': 'theblock.co', 'type': 'news', 'contact_pattern': 'tips@theblock.co'},

            # Crypto education sites
            {'domain': 'investopedia.com', 'type': 'education', 'contact_pattern': None},
            {'domain': 'gemini.com/cryptopedia', 'type': 'education', 'contact_pattern': None},

            # Wallet review sites
            {'domain': 'buybitcoinworldwide.com', 'type': 'review', 'contact_pattern': None},
            {'domain': 'safepal.io/blog', 'type': 'competitor', 'contact_pattern': None},

            # Tech blogs
            {'domain': 'hackernoon.com', 'type': 'blog', 'contact_pattern': 'stories@hackernoon.com'},
            {'domain': 'medium.com', 'type': 'blog', 'contact_pattern': None},

            # Crypto YouTube channels (for description links)
            {'domain': 'youtube.com', 'type': 'video', 'contact_pattern': None},
        ]

        # Email templates
        self.templates = {
            'news': {
                'subject': 'Story Idea: New Crypto Security Rating Platform',
                'body': """
Hi {name},

I noticed {site} covers crypto security topics - your recent piece on {topic} was excellent.

I wanted to share something that might interest your readers: SafeScoring is a new platform that rates 500+ crypto products (wallets, exchanges, DeFi protocols) across 2376 security norms.

Some angles that might work:
• "How Safe Is Your Crypto Wallet? New Tool Reveals Security Scores"
• "Beyond Audits: A Comprehensive Way to Evaluate Crypto Security"
• Data on which wallet categories are safest/riskiest

We have exclusive data we can share. Would you be interested in a quick chat?

Best,
{sender_name}
SafeScoring

PS: Here's a direct link to explore: https://safescoring.io
                """
            },
            'review': {
                'subject': 'Resource for Your Crypto Wallet Reviews',
                'body': """
Hi {name},

I came across {site}'s wallet comparison guides - really helpful content!

I wanted to suggest a resource that could add value to your reviews: SafeScoring provides objective security scores for 500+ crypto products based on 2376 security norms.

You could:
• Embed our security badges in your reviews
• Link to our detailed security reports
• Use our comparison tool for side-by-side analysis

All free to use - we just ask for a link back. Here's an example badge:
![SafeScore](https://safescoring.io/api/badge/ledger-nano-x)

Would this be useful for your content?

Best,
{sender_name}
                """
            },
            'blog': {
                'subject': 'Guest Post: Crypto Security Best Practices',
                'body': """
Hi {name},

Love what you're doing at {site}! Your posts on crypto topics are always insightful.

I'm {sender_name} from SafeScoring - we analyze crypto security across 2376 norms. I'd love to contribute a guest post on a topic like:

• "5 Security Red Flags to Check Before Using Any DeFi Protocol"
• "Hardware Wallet Security: What the Specs Don't Tell You"
• "How to Evaluate Crypto Exchange Security Like a Pro"

I can provide unique data and insights from our research. Happy to match your editorial style.

Interested?

Best,
{sender_name}
                """
            },
            'partnership': {
                'subject': 'Partnership Opportunity - Crypto Security Data',
                'body': """
Hi {name},

I'm reaching out from SafeScoring, a crypto security rating platform.

We provide objective security scores for 500+ crypto products and thought there might be partnership opportunities with {site}:

• API access for your platform
• Co-branded security badges
• Data sharing for your research
• White-label solutions

We work with wallets, exchanges, and media companies. Would love to explore how we might collaborate.

Open to a quick call this week?

Best,
{sender_name}
SafeScoring
https://safescoring.io/partners
                """
            }
        }

        self.outreach_log_file = Path('logs/outreach_log.json')
        self.outreach_log = self._load_log()

    def _load_log(self) -> dict:
        """Load outreach history"""
        if self.outreach_log_file.exists():
            try:
                with open(self.outreach_log_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, Exception):
                pass
        return {'sent': [], 'responses': [], 'followups_due': []}

    def _save_log(self):
        """Save outreach history"""
        self.outreach_log_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.outreach_log_file, 'w') as f:
            json.dump(self.outreach_log, f, indent=2, default=str)

    def _get_outreach_id(self, domain: str, email: str) -> str:
        """Generate unique ID for outreach"""
        return hashlib.md5(f"{domain}:{email}".encode()).hexdigest()[:12]

    async def find_contact_email(self, domain: str) -> str:
        """Try to find contact email for a domain"""
        # Common patterns to try
        patterns = [
            f"contact@{domain}",
            f"hello@{domain}",
            f"info@{domain}",
            f"press@{domain}",
            f"editorial@{domain}",
        ]

        # In production, could use Hunter.io or similar API
        # For now, return first pattern
        return patterns[0]

    async def generate_personalized_email(self, site: dict, template_type: str) -> dict:
        """Generate personalized outreach email"""
        template = self.templates.get(template_type, self.templates['partnership'])

        # Get contact email
        email = site.get('contact_pattern') or await self.find_contact_email(site['domain'])

        # Personalization placeholders
        personalization = {
            'name': 'Team',  # In production, try to find actual name
            'site': site['domain'],
            'topic': 'crypto security',  # In production, scrape recent articles
            'sender_name': os.getenv('SENDER_NAME', 'Alex'),
        }

        subject = template['subject']
        body = template['body']

        for key, value in personalization.items():
            subject = subject.replace(f'{{{key}}}', value)
            body = body.replace(f'{{{key}}}', value)

        return {
            'to': email,
            'subject': subject,
            'body': body.strip(),
            'domain': site['domain'],
            'type': template_type
        }

    async def send_outreach(self, email_data: dict) -> bool:
        """Send outreach email"""
        outreach_id = self._get_outreach_id(email_data['domain'], email_data['to'])

        # Check if already contacted
        if any(o['id'] == outreach_id for o in self.outreach_log['sent']):
            print(f"⏭️ Already contacted: {email_data['domain']}")
            return False

        if not RESEND_AVAILABLE:
            # Save as draft instead
            self._save_email_draft(email_data)
            return False

        try:
            resend.Emails.send({
                "from": f"SafeScoring <outreach@safescoring.io>",
                "to": [email_data['to']],
                "subject": email_data['subject'],
                "text": email_data['body']
            })

            # Log successful send
            self.outreach_log['sent'].append({
                'id': outreach_id,
                'domain': email_data['domain'],
                'email': email_data['to'],
                'type': email_data['type'],
                'sent_at': datetime.now().isoformat(),
                'followup_due': (datetime.now() + timedelta(days=7)).isoformat()
            })
            self._save_log()

            print(f"✅ Sent outreach to: {email_data['to']}")
            return True

        except Exception as e:
            print(f"Error sending to {email_data['to']}: {e}")
            return False

    def _save_email_draft(self, email_data: dict):
        """Save email as draft for manual sending"""
        drafts_dir = Path('drafts/outreach')
        drafts_dir.mkdir(parents=True, exist_ok=True)

        filename = f"outreach_{email_data['domain'].replace('.', '_')}.txt"
        with open(drafts_dir / filename, 'w') as f:
            f.write(f"To: {email_data['to']}\n")
            f.write(f"Subject: {email_data['subject']}\n")
            f.write(f"---\n\n")
            f.write(email_data['body'])

        print(f"📝 Draft saved: {filename}")

    async def check_followups(self):
        """Check for pending follow-ups"""
        today = datetime.now()
        pending = []

        for outreach in self.outreach_log['sent']:
            followup_date = datetime.fromisoformat(outreach['followup_due'])
            if followup_date <= today and outreach['id'] not in [r['id'] for r in self.outreach_log['responses']]:
                pending.append(outreach)

        return pending

    async def generate_followup(self, original: dict) -> dict:
        """Generate follow-up email"""
        subject = f"Re: {self.templates[original['type']]['subject']}"
        body = f"""
Hi there,

Just following up on my email from last week about SafeScoring.

We've added some new features that might interest you:
• Compare tool: safescoring.io/compare
• Embeddable widgets for articles
• Public API for developers

Happy to chat if you're interested. No worries if not - I appreciate your time!

Best,
{os.getenv('SENDER_NAME', 'Alex')}
SafeScoring
        """.strip()

        return {
            'to': original['email'],
            'subject': subject,
            'body': body,
            'domain': original['domain'],
            'type': 'followup'
        }

    async def run_daily_outreach(self, max_emails: int = 10):
        """Run daily outreach campaign"""
        print(f"📧 Starting daily outreach ({datetime.now().strftime('%Y-%m-%d')})")

        sent_count = 0

        # 1. Send follow-ups first
        pending_followups = await self.check_followups()
        for followup in pending_followups[:3]:
            email = await self.generate_followup(followup)
            if await self.send_outreach(email):
                sent_count += 1
            await asyncio.sleep(5)  # Rate limiting

        # 2. Send new outreach
        for site in self.target_sites:
            if sent_count >= max_emails:
                break

            template_type = site['type']
            if template_type == 'competitor':
                continue  # Skip competitors

            email = await self.generate_personalized_email(site, template_type)

            if await self.send_outreach(email):
                sent_count += 1

            await asyncio.sleep(5)  # Rate limiting

        print(f"✅ Sent {sent_count} emails today")
        return sent_count

    def get_stats(self) -> dict:
        """Get outreach statistics"""
        return {
            'total_sent': len(self.outreach_log['sent']),
            'responses': len(self.outreach_log['responses']),
            'response_rate': len(self.outreach_log['responses']) / max(len(self.outreach_log['sent']), 1) * 100,
            'pending_followups': len([
                o for o in self.outreach_log['sent']
                if datetime.fromisoformat(o['followup_due']) <= datetime.now()
                and o['id'] not in [r['id'] for r in self.outreach_log['responses']]
            ])
        }


async def main():
    outreach = BacklinkOutreach()

    # Run daily outreach
    await outreach.run_daily_outreach(max_emails=5)

    # Print stats
    stats = outreach.get_stats()
    print(f"\n📊 Outreach Stats:")
    print(f"   Total sent: {stats['total_sent']}")
    print(f"   Responses: {stats['responses']}")
    print(f"   Response rate: {stats['response_rate']:.1f}%")
    print(f"   Pending followups: {stats['pending_followups']}")


if __name__ == '__main__':
    asyncio.run(main())
