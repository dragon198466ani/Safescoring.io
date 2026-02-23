#!/usr/bin/env python3
"""
SAFESCORING.IO - Email Nurture Sequences
Automated email sequences for user onboarding and engagement.

Sequences:
1. Welcome sequence (new users)
2. Activation sequence (users who haven't used features)
3. Re-engagement sequence (inactive users)
4. Upgrade sequence (free users)
5. Weekly digest (all users)
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))


# =============================================================================
# EMAIL TEMPLATES
# =============================================================================

WELCOME_SEQUENCE = [
    {
        'day': 0,
        'subject': 'Welcome to SafeScoring - Your crypto is now safer',
        'template': 'welcome_day0',
        'content': """
Hi {name},

Welcome to SafeScoring! You've just taken the first step toward securing your crypto.

Here's what you can do now:

1. **Check your wallet's security** - Search for your hardware wallet, exchange, or DeFi protocol
2. **Compare products** - See which options are safest
3. **Set up alerts** - Get notified about security incidents

Your first action: [Check your main wallet's SafeScore →]({dashboard_url})

Questions? Just reply to this email.

Stay safe,
The SafeScoring Team

---
2376 norms. 0 opinions. 1 score.
"""
    },
    {
        'day': 1,
        'subject': 'Did you know? 87% of hacked projects were audited',
        'template': 'welcome_day1',
        'content': """
Hi {name},

Here's a shocking stat: **87% of projects that got hacked had passed their security audits.**

Audits check code. SafeScoring checks everything:
- Team reputation
- Incident history
- Operational security
- Update practices
- And 912 more criteria

That's why we created SafeScoring - to go beyond audits.

**Your action for today:** [Compare your current wallet to alternatives →]({compare_url})

Stay safe,
The SafeScoring Team
"""
    },
    {
        'day': 3,
        'subject': '5 minutes to secure your crypto stack',
        'template': 'welcome_day3',
        'content': """
Hi {name},

Most people use 3-5 crypto products daily. Have you checked all of yours?

**Quick security checklist:**

□ Hardware wallet - [Check score]({products_url}?category=hardware)
□ Software wallet - [Check score]({products_url}?category=software)
□ Main exchange - [Check score]({products_url}?category=exchange)
□ DeFi protocols - [Check score]({products_url}?category=defi)

Create a custom "Setup" to analyze your entire stack: [My Setups →]({setups_url})

Stay safe,
The SafeScoring Team
"""
    },
    {
        'day': 7,
        'subject': 'Your weekly security digest',
        'template': 'welcome_day7',
        'content': """
Hi {name},

Here's what happened in crypto security this week:

{weekly_incidents}

**Products you're watching:**
{watched_products}

**Tip of the week:**
{security_tip}

[View full dashboard →]({dashboard_url})

Stay safe,
The SafeScoring Team
"""
    }
]

UPGRADE_SEQUENCE = [
    {
        'day': 0,
        'trigger': 'hit_free_limit',
        'subject': 'You\'ve reached your limit - here\'s 50% off',
        'template': 'upgrade_limit',
        'content': """
Hi {name},

You've hit your free plan limit of 5 product checks this month.

That tells me you're serious about security. I like that.

Here's a special offer: **50% off your first month of Professional.**

With Professional you get:
- Unlimited product checks
- 20 custom setups
- API access
- Priority support

[Upgrade now (50% off) →]({upgrade_url}?code=SECURE50)

This offer expires in 48 hours.

Stay safe,
The SafeScoring Team
"""
    },
    {
        'day': 3,
        'trigger': 'power_user',
        'subject': 'You\'re a power user - unlock full potential',
        'template': 'upgrade_power',
        'content': """
Hi {name},

I noticed you've checked {products_checked} products and created {setups_count} setups.

You're definitely a power user!

But you're only using a fraction of SafeScoring's potential.

**Professional users get:**
- Unlimited everything
- API access for automation
- Team sharing
- Priority support

Plus, you'll support independent security research.

[See Professional features →]({pricing_url})

Stay safe,
The SafeScoring Team
"""
    }
]

REENGAGEMENT_SEQUENCE = [
    {
        'day': 14,
        'trigger': 'inactive',
        'subject': 'We miss you (and so does your crypto security)',
        'template': 'reengagement_14d',
        'content': """
Hi {name},

It's been 2 weeks since you checked in on SafeScoring.

In that time:
- {hacks_count} security incidents occurred
- {score_changes} products had score changes
- {new_products} new products were added

Is your crypto stack still safe?

[Check now →]({dashboard_url})

Stay safe,
The SafeScoring Team
"""
    },
    {
        'day': 30,
        'trigger': 'inactive',
        'subject': 'Your security scores may have changed',
        'template': 'reengagement_30d',
        'content': """
Hi {name},

A lot can change in a month.

**Recent security incidents:**
{recent_incidents}

**Your watched products:**
{watched_status}

[Check your dashboard →]({dashboard_url})

If you're no longer interested, you can [unsubscribe here]({unsubscribe_url}).

Stay safe,
The SafeScoring Team
"""
    }
]

WEEKLY_DIGEST_TEMPLATE = {
    'subject': 'Weekly Security Digest - {date}',
    'template': 'weekly_digest',
    'content': """
Hi {name},

Here's your weekly crypto security digest:

## This Week's Numbers

- **{incident_count}** security incidents
- **${amount_lost:,.0f}** in funds affected
- **{score_changes}** score changes

## Major Incidents

{incidents_list}

## Your Watched Products

{watched_products}

## Security Tip

{security_tip}

---

[View full dashboard]({dashboard_url}) | [Manage preferences]({preferences_url})

Stay safe,
The SafeScoring Team
"""
}


# =============================================================================
# EMAIL SEQUENCE MANAGER
# =============================================================================

class EmailSequenceManager:
    """
    Manages email sequences and triggers.
    Integrates with email providers (Loops, ConvertKit, Resend, etc.)
    """

    def __init__(self, provider: str = 'logs'):
        """
        Initialize with email provider.
        Supported: 'loops', 'convertkit', 'resend', 'logs' (for testing)
        """
        self.provider = provider
        self.base_url = 'https://safescoring.io'

    def get_user_variables(self, user: Dict) -> Dict:
        """Get template variables for a user."""
        return {
            'name': user.get('name', 'there'),
            'email': user.get('email', ''),
            'dashboard_url': f"{self.base_url}/dashboard",
            'products_url': f"{self.base_url}/products",
            'compare_url': f"{self.base_url}/compare",
            'setups_url': f"{self.base_url}/setups",
            'pricing_url': f"{self.base_url}/#pricing",
            'upgrade_url': f"{self.base_url}/upgrade",
            'preferences_url': f"{self.base_url}/settings",
            'unsubscribe_url': f"{self.base_url}/unsubscribe",
        }

    def send_welcome_sequence(self, user: Dict, day: int = 0):
        """Send welcome sequence email for given day."""
        email = next((e for e in WELCOME_SEQUENCE if e['day'] == day), None)
        if not email:
            return

        variables = self.get_user_variables(user)
        content = email['content'].format(**variables)

        self._send_email(
            to=user['email'],
            subject=email['subject'],
            content=content,
            template=email['template']
        )

    def send_upgrade_email(self, user: Dict, trigger: str):
        """Send upgrade email based on trigger."""
        email = next((e for e in UPGRADE_SEQUENCE if e['trigger'] == trigger), None)
        if not email:
            return

        variables = self.get_user_variables(user)
        variables.update({
            'products_checked': user.get('products_checked', 0),
            'setups_count': user.get('setups_count', 0),
        })

        content = email['content'].format(**variables)

        self._send_email(
            to=user['email'],
            subject=email['subject'],
            content=content,
            template=email['template']
        )

    def send_weekly_digest(self, user: Dict, digest_data: Dict):
        """Send weekly digest email."""
        variables = self.get_user_variables(user)
        variables.update({
            'date': datetime.now().strftime('%B %d, %Y'),
            'incident_count': digest_data.get('incident_count', 0),
            'amount_lost': digest_data.get('amount_lost', 0),
            'score_changes': digest_data.get('score_changes', 0),
            'incidents_list': digest_data.get('incidents_list', 'No major incidents'),
            'watched_products': digest_data.get('watched_products', 'No products watched'),
            'security_tip': digest_data.get('security_tip', 'Always verify before you deposit.'),
        })

        template = WEEKLY_DIGEST_TEMPLATE
        content = template['content'].format(**variables)
        subject = template['subject'].format(**variables)

        self._send_email(
            to=user['email'],
            subject=subject,
            content=content,
            template=template['template']
        )

    def _send_email(self, to: str, subject: str, content: str, template: str):
        """Send email via configured provider."""
        if self.provider == 'logs':
            print(f"\n{'='*60}")
            print(f"EMAIL TO: {to}")
            print(f"SUBJECT: {subject}")
            print(f"TEMPLATE: {template}")
            print(f"{'='*60}")
            print(content)
            return

        elif self.provider == 'resend':
            self._send_via_resend(to, subject, content)

        elif self.provider == 'loops':
            self._send_via_loops(to, subject, content, template)

    def _send_via_resend(self, to: str, subject: str, content: str):
        """Send via Resend API."""
        import requests
        api_key = os.getenv('RESEND_API_KEY', '')
        if not api_key:
            print("RESEND_API_KEY not set")
            return

        requests.post(
            'https://api.resend.com/emails',
            headers={'Authorization': f'Bearer {api_key}'},
            json={
                'from': 'SafeScoring <hello@safescoring.io>',
                'to': to,
                'subject': subject,
                'text': content,
            }
        )

    def _send_via_loops(self, to: str, subject: str, content: str, template: str):
        """Send via Loops API."""
        import requests
        api_key = os.getenv('LOOPS_API_KEY', '')
        if not api_key:
            print("LOOPS_API_KEY not set")
            return

        requests.post(
            'https://app.loops.so/api/v1/transactional',
            headers={'Authorization': f'Bearer {api_key}'},
            json={
                'transactionalId': template,
                'email': to,
                'dataVariables': {'content': content}
            }
        )


# =============================================================================
# SECURITY TIPS (for emails)
# =============================================================================

SECURITY_TIPS = [
    "Never share your seed phrase. No legitimate service will ever ask for it.",
    "Enable 2FA on all exchanges. Use hardware keys (YubiKey) when possible.",
    "Verify URLs carefully. Bookmark official sites to avoid phishing.",
    "Use a hardware wallet for any amount you can't afford to lose.",
    "Revoke unused token approvals regularly using revoke.cash.",
    "Test recovery before you need it. Make sure your backup works.",
    "Don't trust, verify. Check contract addresses on multiple sources.",
    "Consider using a separate wallet for DeFi experiments.",
    "Set transaction limits and withdrawal delays on exchanges.",
    "Stay updated on security news. Follow @SafeScoring on Twitter.",
]

def get_random_tip() -> str:
    """Get a random security tip."""
    import random
    return random.choice(SECURITY_TIPS)


# CLI
if __name__ == '__main__':
    # Test the email sequences
    manager = EmailSequenceManager(provider='logs')

    test_user = {
        'name': 'Alex',
        'email': 'alex@example.com',
        'products_checked': 12,
        'setups_count': 3,
    }

    print("\n=== TESTING WELCOME SEQUENCE ===")
    manager.send_welcome_sequence(test_user, day=0)

    print("\n=== TESTING UPGRADE EMAIL ===")
    manager.send_upgrade_email(test_user, trigger='hit_free_limit')

    print("\n=== TESTING WEEKLY DIGEST ===")
    manager.send_weekly_digest(test_user, {
        'incident_count': 5,
        'amount_lost': 12500000,
        'score_changes': 8,
        'incidents_list': '- WazirX hack ($230M)\n- Radiant Capital ($50M)',
        'watched_products': '- Ledger Nano X: 85/100 ✓\n- MetaMask: 72/100 ✓',
        'security_tip': get_random_tip(),
    })
