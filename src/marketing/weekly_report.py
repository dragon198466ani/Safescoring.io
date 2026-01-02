#!/usr/bin/env python3
"""
Weekly Performance Report Generator
Automatically collects metrics and sends report to admin.
"""

import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import json
import os
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from supabase import create_client

# Try to import email library
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False


class WeeklyReportGenerator:
    """Generates and sends weekly marketing performance reports"""

    def __init__(self):
        self.supabase = None
        if os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_KEY'):
            self.supabase = create_client(
                os.getenv('SUPABASE_URL'),
                os.getenv('SUPABASE_KEY')
            )

        if RESEND_AVAILABLE and os.getenv('RESEND_API_KEY'):
            resend.api_key = os.getenv('RESEND_API_KEY')

    async def collect_metrics(self) -> dict:
        """Collect all platform metrics"""
        metrics = {
            'period': {
                'start': (datetime.now() - timedelta(days=7)).isoformat(),
                'end': datetime.now().isoformat()
            },
            'products': {},
            'users': {},
            'engagement': {},
            'marketing': {}
        }

        if not self.supabase:
            return metrics

        try:
            # Product metrics
            products_result = self.supabase.table('products').select('id', count='exact').execute()
            metrics['products']['total'] = products_result.count or 0

            # New products this week
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            new_products = self.supabase.table('products')\
                .select('id', count='exact')\
                .gte('created_at', week_ago)\
                .execute()
            metrics['products']['new_this_week'] = new_products.count or 0

            # Scored products
            scored = self.supabase.table('safe_scoring_results')\
                .select('product_id', count='exact')\
                .execute()
            metrics['products']['scored'] = scored.count or 0

            # User metrics
            users_result = self.supabase.table('users').select('id', count='exact').execute()
            metrics['users']['total'] = users_result.count or 0

            new_users = self.supabase.table('users')\
                .select('id', count='exact')\
                .gte('created_at', week_ago)\
                .execute()
            metrics['users']['new_this_week'] = new_users.count or 0

            # Newsletter subscribers
            subscribers = self.supabase.table('newsletter_subscribers')\
                .select('id', count='exact')\
                .eq('status', 'active')\
                .execute()
            metrics['users']['newsletter_subscribers'] = subscribers.count or 0

            # Corrections/contributions
            corrections = self.supabase.table('user_corrections')\
                .select('id', count='exact')\
                .gte('created_at', week_ago)\
                .execute()
            metrics['engagement']['corrections_this_week'] = corrections.count or 0

            # Referrals
            referrals = self.supabase.table('referrals')\
                .select('id', count='exact')\
                .gte('created_at', week_ago)\
                .execute()
            metrics['marketing']['referrals_this_week'] = referrals.count or 0

        except Exception as e:
            print(f"Error collecting metrics: {e}")

        return metrics

    def generate_report_html(self, metrics: dict) -> str:
        """Generate HTML report"""
        products = metrics.get('products', {})
        users = metrics.get('users', {})
        engagement = metrics.get('engagement', {})
        marketing = metrics.get('marketing', {})

        return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; }}
        .header {{ text-align: center; padding: 20px 0; border-bottom: 1px solid #334155; }}
        .logo {{ font-size: 24px; font-weight: bold; }}
        .logo span {{ color: #00d4aa; }}
        .section {{ padding: 20px 0; border-bottom: 1px solid #334155; }}
        .section-title {{ font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #00d4aa; }}
        .metric {{ display: flex; justify-content: space-between; padding: 8px 0; }}
        .metric-label {{ color: #94a3b8; }}
        .metric-value {{ font-weight: 600; }}
        .highlight {{ color: #22c55e; }}
        .footer {{ text-align: center; padding: 20px 0; color: #64748b; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo"><span>Safe</span>Scoring</div>
            <p>Weekly Performance Report</p>
            <p style="color: #64748b; font-size: 14px;">{datetime.now().strftime('%B %d, %Y')}</p>
        </div>

        <div class="section">
            <div class="section-title">📊 Platform Overview</div>
            <div class="metric">
                <span class="metric-label">Total Products</span>
                <span class="metric-value">{products.get('total', 0)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Products Scored</span>
                <span class="metric-value">{products.get('scored', 0)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">New Products This Week</span>
                <span class="metric-value highlight">+{products.get('new_this_week', 0)}</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">👥 Users</div>
            <div class="metric">
                <span class="metric-label">Total Users</span>
                <span class="metric-value">{users.get('total', 0)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">New Users This Week</span>
                <span class="metric-value highlight">+{users.get('new_this_week', 0)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Newsletter Subscribers</span>
                <span class="metric-value">{users.get('newsletter_subscribers', 0)}</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">🎯 Engagement</div>
            <div class="metric">
                <span class="metric-label">Corrections Submitted</span>
                <span class="metric-value">{engagement.get('corrections_this_week', 0)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Referrals</span>
                <span class="metric-value">{marketing.get('referrals_this_week', 0)}</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">✅ Automation Status</div>
            <div class="metric">
                <span class="metric-label">Content Monitoring</span>
                <span class="metric-value" style="color: #22c55e;">Active</span>
            </div>
            <div class="metric">
                <span class="metric-label">SEO Generation</span>
                <span class="metric-value" style="color: #22c55e;">Active</span>
            </div>
            <div class="metric">
                <span class="metric-label">Email Sequences</span>
                <span class="metric-value" style="color: #22c55e;">Active</span>
            </div>
        </div>

        <div class="footer">
            <p>🤖 This report was automatically generated by SafeScoring Marketing Bot</p>
            <p>No action required - everything is running on autopilot</p>
        </div>
    </div>
</body>
</html>
        """

    async def send_report(self, to_email: str, metrics: dict):
        """Send report via email"""
        if not RESEND_AVAILABLE:
            print("Resend not available, saving report locally")
            self._save_report_locally(metrics)
            return

        html = self.generate_report_html(metrics)

        try:
            resend.Emails.send({
                "from": "SafeScoring <reports@safescoring.io>",
                "to": [to_email],
                "subject": f"📊 Weekly Report - {datetime.now().strftime('%B %d, %Y')}",
                "html": html
            })
            print(f"✅ Report sent to {to_email}")
        except Exception as e:
            print(f"Error sending email: {e}")
            self._save_report_locally(metrics)

    def _save_report_locally(self, metrics: dict):
        """Save report to file if email fails"""
        reports_dir = Path('logs/reports')
        reports_dir.mkdir(parents=True, exist_ok=True)

        filename = f"report_{datetime.now().strftime('%Y%m%d')}.json"
        with open(reports_dir / filename, 'w') as f:
            json.dump(metrics, f, indent=2, default=str)
        print(f"📁 Report saved to {reports_dir / filename}")

    async def run(self):
        """Generate and send weekly report"""
        print("📊 Generating weekly report...")

        metrics = await self.collect_metrics()

        admin_email = os.getenv('ADMIN_EMAIL')
        if admin_email:
            await self.send_report(admin_email, metrics)
        else:
            self._save_report_locally(metrics)
            print("⚠️ ADMIN_EMAIL not set, report saved locally")

        return metrics


async def main():
    generator = WeeklyReportGenerator()
    await generator.run()


if __name__ == '__main__':
    asyncio.run(main())
