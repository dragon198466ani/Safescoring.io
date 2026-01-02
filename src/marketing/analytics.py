#!/usr/bin/env python3
"""
Marketing Analytics & Performance Tracking
Tracks all marketing activities and measures ROI.

Metrics tracked:
- Content performance (impressions, engagement, CTR)
- Channel effectiveness
- Conversion tracking
- Growth trends
"""

import asyncio
import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from supabase import create_client


class MarketingAnalytics:
    """Track and analyze marketing performance"""

    def __init__(self):
        self.supabase = None
        if os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_KEY'):
            self.supabase = create_client(
                os.getenv('SUPABASE_URL'),
                os.getenv('SUPABASE_KEY')
            )

        self.metrics_dir = Path('data/analytics')
        self.metrics_dir.mkdir(parents=True, exist_ok=True)

    async def track_content(self, content_id: str, channel: str, metrics: dict):
        """Track content performance metrics"""
        event = {
            'content_id': content_id,
            'channel': channel,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        }

        # Save to local file
        log_file = self.metrics_dir / f"content_{datetime.now().strftime('%Y%m')}.jsonl"
        with open(log_file, 'a') as f:
            f.write(json.dumps(event) + '\n')

        # Save to Supabase if available
        if self.supabase:
            try:
                self.supabase.table('marketing_metrics').insert({
                    'content_id': content_id,
                    'channel': channel,
                    'impressions': metrics.get('impressions', 0),
                    'clicks': metrics.get('clicks', 0),
                    'engagements': metrics.get('engagements', 0),
                    'conversions': metrics.get('conversions', 0)
                }).execute()
            except Exception as e:
                print(f"Error saving to Supabase: {e}")

    async def track_channel(self, channel: str, action: str, details: dict = None):
        """Track channel-level activity"""
        event = {
            'channel': channel,
            'action': action,
            'details': details or {},
            'timestamp': datetime.now().isoformat()
        }

        log_file = self.metrics_dir / f"channels_{datetime.now().strftime('%Y%m')}.jsonl"
        with open(log_file, 'a') as f:
            f.write(json.dumps(event) + '\n')

    async def track_conversion(self, source: str, conversion_type: str, value: float = 0):
        """Track conversions (signups, subscriptions, etc.)"""
        event = {
            'source': source,
            'type': conversion_type,
            'value': value,
            'timestamp': datetime.now().isoformat()
        }

        log_file = self.metrics_dir / f"conversions_{datetime.now().strftime('%Y%m')}.jsonl"
        with open(log_file, 'a') as f:
            f.write(json.dumps(event) + '\n')

        if self.supabase:
            try:
                self.supabase.table('marketing_conversions').insert({
                    'source': source,
                    'conversion_type': conversion_type,
                    'value': value
                }).execute()
            except Exception as e:
                print(f"Error saving conversion: {e}")

    def get_channel_stats(self, days: int = 30) -> dict:
        """Get stats by marketing channel"""
        stats = defaultdict(lambda: {
            'posts': 0,
            'impressions': 0,
            'clicks': 0,
            'engagements': 0,
            'conversions': 0
        })

        # Read content metrics
        for log_file in self.metrics_dir.glob('content_*.jsonl'):
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line)
                        event_date = datetime.fromisoformat(event['timestamp'])

                        if datetime.now() - event_date <= timedelta(days=days):
                            channel = event['channel']
                            metrics = event.get('metrics', {})

                            stats[channel]['posts'] += 1
                            stats[channel]['impressions'] += metrics.get('impressions', 0)
                            stats[channel]['clicks'] += metrics.get('clicks', 0)
                            stats[channel]['engagements'] += metrics.get('engagements', 0)
                            stats[channel]['conversions'] += metrics.get('conversions', 0)
                    except Exception:
                        continue

        # Calculate rates
        for channel, data in stats.items():
            impressions = max(data['impressions'], 1)
            data['ctr'] = round(data['clicks'] / impressions * 100, 2)
            data['engagement_rate'] = round(data['engagements'] / impressions * 100, 2)
            data['conversion_rate'] = round(data['conversions'] / impressions * 100, 2)

        return dict(stats)

    def get_top_content(self, limit: int = 10, metric: str = 'engagements') -> list:
        """Get top performing content"""
        content_performance = {}

        for log_file in self.metrics_dir.glob('content_*.jsonl'):
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line)
                        content_id = event['content_id']
                        metrics = event.get('metrics', {})

                        if content_id not in content_performance:
                            content_performance[content_id] = {
                                'content_id': content_id,
                                'channel': event['channel'],
                                'impressions': 0,
                                'clicks': 0,
                                'engagements': 0,
                                'conversions': 0
                            }

                        content_performance[content_id]['impressions'] += metrics.get('impressions', 0)
                        content_performance[content_id]['clicks'] += metrics.get('clicks', 0)
                        content_performance[content_id]['engagements'] += metrics.get('engagements', 0)
                        content_performance[content_id]['conversions'] += metrics.get('conversions', 0)
                    except Exception:
                        continue

        # Sort by metric
        sorted_content = sorted(
            content_performance.values(),
            key=lambda x: x.get(metric, 0),
            reverse=True
        )

        return sorted_content[:limit]

    def get_conversion_summary(self, days: int = 30) -> dict:
        """Get conversion summary"""
        conversions = defaultdict(lambda: {'count': 0, 'value': 0})

        for log_file in self.metrics_dir.glob('conversions_*.jsonl'):
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line)
                        event_date = datetime.fromisoformat(event['timestamp'])

                        if datetime.now() - event_date <= timedelta(days=days):
                            source = event['source']
                            conversions[source]['count'] += 1
                            conversions[source]['value'] += event.get('value', 0)
                    except (json.JSONDecodeError, Exception):
                        continue

        return dict(conversions)

    def get_growth_trend(self, metric: str = 'conversions', days: int = 30) -> list:
        """Get daily trend for a metric"""
        daily_data = defaultdict(int)

        log_pattern = 'conversions_*.jsonl' if metric == 'conversions' else 'content_*.jsonl'

        for log_file in self.metrics_dir.glob(log_pattern):
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line)
                        event_date = datetime.fromisoformat(event['timestamp']).date()

                        if datetime.now().date() - event_date <= timedelta(days=days):
                            date_str = event_date.isoformat()

                            if metric == 'conversions':
                                daily_data[date_str] += 1
                            else:
                                daily_data[date_str] += event.get('metrics', {}).get(metric, 0)
                    except (json.JSONDecodeError, Exception):
                        continue

        # Sort by date
        trend = [
            {'date': date, 'value': value}
            for date, value in sorted(daily_data.items())
        ]

        return trend

    async def generate_report(self, days: int = 7) -> dict:
        """Generate comprehensive marketing report"""
        channel_stats = self.get_channel_stats(days)
        top_content = self.get_top_content(5)
        conversions = self.get_conversion_summary(days)
        growth = self.get_growth_trend('conversions', days)

        # Calculate totals
        total_impressions = sum(c['impressions'] for c in channel_stats.values())
        total_clicks = sum(c['clicks'] for c in channel_stats.values())
        total_engagements = sum(c['engagements'] for c in channel_stats.values())
        total_conversions = sum(c['conversions'] for c in channel_stats.values())

        # Best performing channel
        best_channel = max(
            channel_stats.items(),
            key=lambda x: x[1]['conversion_rate'],
            default=('none', {})
        )

        report = {
            'period': f'Last {days} days',
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_impressions': total_impressions,
                'total_clicks': total_clicks,
                'total_engagements': total_engagements,
                'total_conversions': total_conversions,
                'overall_ctr': round(total_clicks / max(total_impressions, 1) * 100, 2),
                'overall_conversion_rate': round(total_conversions / max(total_impressions, 1) * 100, 2)
            },
            'best_channel': {
                'name': best_channel[0],
                'conversion_rate': best_channel[1].get('conversion_rate', 0)
            },
            'channel_breakdown': channel_stats,
            'top_content': top_content,
            'conversion_sources': conversions,
            'daily_trend': growth
        }

        # Save report
        report_file = self.metrics_dir / f"report_{datetime.now().strftime('%Y%m%d')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)

        return report

    def print_dashboard(self, days: int = 7):
        """Print analytics dashboard to console"""
        print("\n" + "=" * 60)
        print("📊 MARKETING ANALYTICS DASHBOARD")
        print("=" * 60)

        # Channel stats
        stats = self.get_channel_stats(days)

        print(f"\n📈 Channel Performance (Last {days} days)")
        print("-" * 50)
        print(f"{'Channel':<15} {'Posts':<8} {'Impr.':<10} {'CTR':<8} {'Conv.':<8}")
        print("-" * 50)

        for channel, data in stats.items():
            print(f"{channel:<15} {data['posts']:<8} {data['impressions']:<10} {data['ctr']:<8}% {data['conversions']:<8}")

        # Top content
        top = self.get_top_content(3)
        print("\n🏆 Top Performing Content")
        print("-" * 50)
        for i, content in enumerate(top, 1):
            print(f"{i}. {content['content_id'][:30]} - {content['engagements']} engagements")

        # Conversions
        conversions = self.get_conversion_summary(days)
        total_conv = sum(c['count'] for c in conversions.values())
        print(f"\n💰 Conversions: {total_conv}")

        print("\n" + "=" * 60)


async def main():
    analytics = MarketingAnalytics()

    # Simulate some tracking
    print("Simulating marketing events...")

    # Track some content
    await analytics.track_content(
        content_id='tweet_001',
        channel='twitter',
        metrics={'impressions': 1500, 'clicks': 45, 'engagements': 89, 'conversions': 3}
    )

    await analytics.track_content(
        content_id='reddit_001',
        channel='reddit',
        metrics={'impressions': 800, 'clicks': 120, 'engagements': 45, 'conversions': 8}
    )

    await analytics.track_conversion(
        source='twitter',
        conversion_type='signup',
        value=0
    )

    # Print dashboard
    analytics.print_dashboard(days=30)

    # Generate report
    print("\n📋 Generating full report...")
    report = await analytics.generate_report(days=30)
    print(f"Report saved with {report['summary']['total_conversions']} conversions tracked")


if __name__ == '__main__':
    asyncio.run(main())
