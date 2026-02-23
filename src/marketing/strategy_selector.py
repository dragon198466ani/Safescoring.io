#!/usr/bin/env python3
"""
INTELLIGENT MARKETING STRATEGY SELECTOR
Selects the best strategies based on goals, resources, and timing.
Uses database of proven methods to recommend actions.
"""

import os
import sys
import random
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.marketing.proven_strategies import (
    ACQUISITION_STRATEGIES,
    VIRAL_STRATEGIES,
    RETENTION_STRATEGIES,
    HOOK_TYPES,
    CTA_LIBRARY,
    PLATFORM_STRATEGIES,
    CONVERSION_FUNNELS,
)
from src.marketing.soft_selling import (
    SOFT_SELL_TWEETS,
    get_soft_hook,
    get_soft_cta,
)


class StrategySelector:
    """
    Intelligent strategy selector that recommends marketing actions
    based on goals, available time, and resources.
    """

    def __init__(self):
        self.all_strategies = (
            ACQUISITION_STRATEGIES +
            VIRAL_STRATEGIES +
            RETENTION_STRATEGIES
        )

    def get_strategies_by_goal(self, goal: str) -> list:
        """Get strategies matching a specific goal"""
        goal_mapping = {
            'traffic': ['seo', 'content', 'social'],
            'signups': ['content', 'social', 'referral'],
            'awareness': ['content', 'social', 'outreach'],
            'retention': ['email', 'product'],
            'viral': ['referral', 'product', 'social'],
        }

        method_types = goal_mapping.get(goal, ['content', 'social'])

        return [
            s for s in self.all_strategies
            if s['method_type'] in method_types
        ]

    def get_strategies_by_cost(self, max_cost: str) -> list:
        """Filter strategies by cost"""
        cost_levels = ['free', 'low', 'medium', 'high']
        max_index = cost_levels.index(max_cost)

        return [
            s for s in self.all_strategies
            if cost_levels.index(s['cost']) <= max_index
        ]

    def get_strategies_by_difficulty(self, max_difficulty: str) -> list:
        """Filter strategies by difficulty"""
        diff_levels = ['easy', 'medium', 'hard']
        max_index = diff_levels.index(max_difficulty)

        return [
            s for s in self.all_strategies
            if diff_levels.index(s['difficulty']) <= max_index
        ]

    def get_quick_wins(self) -> list:
        """Get strategies that can show results quickly"""
        return [
            s for s in self.all_strategies
            if s['time_to_results'] in ['immediate', 'days']
            and s['difficulty'] == 'easy'
        ]

    def get_high_impact(self) -> list:
        """Get highest impact strategies"""
        return sorted(
            self.all_strategies,
            key=lambda x: x['effectiveness_score'],
            reverse=True
        )[:10]

    def recommend_daily_actions(self, available_hours: int = 2) -> dict:
        """
        Recommend specific actions for today based on available time.

        Returns a prioritized list of actions with templates.
        """
        today = datetime.now()
        day_of_week = today.strftime('%A')

        actions = []

        # Always: Check for newsjacking opportunities
        actions.append({
            'priority': 1,
            'action': 'Check DeFiLlama/Rekt.news for incidents',
            'strategy': 'Newsjacking',
            'time_needed': '15 min',
            'output': 'React with thread if incident found',
        })

        # Platform-specific based on best days
        twitter_best = PLATFORM_STRATEGIES['twitter']['best_days']
        reddit_best = ['Monday', 'Wednesday', 'Friday']  # Community days

        if day_of_week in twitter_best:
            actions.append({
                'priority': 2,
                'action': 'Post educational thread on Twitter',
                'strategy': 'Thread Marketing',
                'time_needed': '30 min',
                'template': self._get_random_thread_topic(),
            })

        if day_of_week in reddit_best:
            actions.append({
                'priority': 3,
                'action': 'Engage in r/cryptocurrency or r/defi',
                'strategy': 'Community Participation',
                'time_needed': '20 min',
                'instructions': 'Find security questions, answer with data',
            })

        # Content creation (if time allows)
        if available_hours >= 2:
            actions.append({
                'priority': 4,
                'action': 'Write comparison blog post',
                'strategy': 'Pain Point Content',
                'time_needed': '60 min',
                'topic_ideas': self._get_content_ideas(),
            })

        # Quick engagement actions
        actions.append({
            'priority': 5,
            'action': 'Reply to 3-5 crypto security tweets',
            'strategy': 'Community Participation',
            'time_needed': '15 min',
            'instructions': 'Add value, mention SafeScoring only if relevant',
        })

        return {
            'date': today.isoformat(),
            'day': day_of_week,
            'available_hours': available_hours,
            'actions': sorted(actions, key=lambda x: x['priority']),
        }

    def recommend_weekly_plan(self) -> dict:
        """Generate a full week marketing plan"""
        plan = {}

        weekly_themes = {
            'Monday': {
                'focus': 'Content Planning',
                'actions': [
                    'Review last week metrics',
                    'Plan content for the week',
                    'Check trending topics',
                ],
            },
            'Tuesday': {
                'focus': 'Twitter Day',
                'actions': [
                    'Post educational thread',
                    'Engage with community',
                    'Reply to mentions',
                ],
            },
            'Wednesday': {
                'focus': 'Reddit/Community',
                'actions': [
                    'Post helpful content on Reddit',
                    'Answer questions in communities',
                    'Check Discord engagement',
                ],
            },
            'Thursday': {
                'focus': 'Content Creation',
                'actions': [
                    'Write blog post or comparison',
                    'Create SEO content',
                    'Update product pages',
                ],
            },
            'Friday': {
                'focus': 'Outreach',
                'actions': [
                    'Send partnership emails',
                    'Engage with influencers',
                    'Plan weekend content',
                ],
            },
            'Saturday': {
                'focus': 'Light Touch',
                'actions': [
                    'Schedule weekend posts',
                    'Monitor and respond',
                ],
            },
            'Sunday': {
                'focus': 'Analysis',
                'actions': [
                    'Review week performance',
                    'Identify top performing content',
                    'Plan next week',
                ],
            },
        }

        return weekly_themes

    def get_content_for_today(self) -> dict:
        """Get ready-to-post content suggestions for today"""
        suggestions = []

        # Twitter content
        suggestions.append({
            'platform': 'twitter',
            'type': 'single_tweet',
            'content': random.choice(SOFT_SELL_TWEETS),
            'best_time': random.choice(PLATFORM_STRATEGIES['twitter']['best_times']),
            'hook': get_soft_hook(),
            'cta': get_soft_cta(),
        })

        # Thread idea
        thread_topics = [
            "Why your wallet's security score matters",
            "3 things that make a wallet secure",
            "Hardware vs Software wallets: The data",
            "What audits don't tell you about security",
            "The most common security mistakes",
        ]
        suggestions.append({
            'platform': 'twitter',
            'type': 'thread',
            'topic': random.choice(thread_topics),
            'hook_type': 'question',
            'suggested_hook': random.choice(HOOK_TYPES['question']['examples']),
        })

        return {
            'date': datetime.now().isoformat(),
            'suggestions': suggestions,
        }

    def _get_random_thread_topic(self) -> str:
        topics = [
            "The 5 security features every wallet needs",
            "Why audits aren't enough (with data)",
            "How we analyze 2376 security criteria",
            "The difference between safe and unsafe wallets",
            "What the data says about hardware vs software wallets",
        ]
        return random.choice(topics)

    def _get_content_ideas(self) -> list:
        return [
            "Best hardware wallets for 2024 (by security score)",
            "Ledger vs Trezor: The complete security comparison",
            "Why some audited projects still get hacked",
            "The state of DeFi security",
            "How to evaluate a wallet's security yourself",
        ]


class CampaignGenerator:
    """Generate complete marketing campaigns"""

    def __init__(self):
        self.selector = StrategySelector()

    def generate_launch_campaign(self, duration_days: int = 14) -> dict:
        """Generate a product launch campaign"""
        return {
            'name': 'SafeScoring Launch Campaign',
            'duration': f'{duration_days} days',
            'goal': 'awareness + signups',
            'phases': [
                {
                    'phase': 1,
                    'days': '1-3',
                    'focus': 'Teaser',
                    'actions': [
                        'Cryptic tweets about "something coming"',
                        'DM influencers for launch day support',
                        'Prepare Product Hunt submission',
                    ],
                },
                {
                    'phase': 2,
                    'days': '4-7',
                    'focus': 'Launch',
                    'actions': [
                        'Product Hunt launch',
                        'Twitter thread announcing SafeScoring',
                        'Reddit post in relevant subreddits',
                        'Email to newsletter subscribers',
                    ],
                },
                {
                    'phase': 3,
                    'days': '8-14',
                    'focus': 'Sustain',
                    'actions': [
                        'Daily educational content',
                        'Engage with all mentions',
                        'Guest on crypto podcasts',
                        'Partnership outreach',
                    ],
                },
            ],
        }

    def generate_growth_campaign(self) -> dict:
        """Generate an ongoing growth campaign"""
        return {
            'name': 'Continuous Growth',
            'type': 'evergreen',
            'channels': {
                'twitter': {
                    'frequency': '2-3 posts/day',
                    'content_mix': {
                        'educational': '40%',
                        'engagement': '30%',
                        'promotional': '10%',
                        'newsjacking': '20%',
                    },
                },
                'reddit': {
                    'frequency': '3-5 comments/day, 1 post/week',
                    'approach': 'Help first, mention SafeScoring naturally',
                },
                'blog': {
                    'frequency': '2 posts/week',
                    'types': ['comparisons', 'guides', 'data_reports'],
                },
                'email': {
                    'frequency': 'weekly digest',
                    'content': 'Score changes, security news, tips',
                },
            },
        }


def main():
    selector = StrategySelector()

    print("=" * 60)
    print("SAFESCORING STRATEGY SELECTOR")
    print("=" * 60)

    # Quick wins
    print("\n🚀 QUICK WINS (Easy, Fast Results)")
    print("-" * 40)
    for s in selector.get_quick_wins()[:5]:
        print(f"• {s['name']} - {s['time_to_results']}")

    # High impact
    print("\n💎 HIGHEST IMPACT STRATEGIES")
    print("-" * 40)
    for s in selector.get_high_impact()[:5]:
        print(f"• {s['name']} ({s['effectiveness_score']}%)")

    # Today's plan
    print("\n📅 TODAY'S RECOMMENDED ACTIONS")
    print("-" * 40)
    today = selector.recommend_daily_actions(available_hours=2)
    for action in today['actions'][:5]:
        print(f"[{action['priority']}] {action['action']} ({action['time_needed']})")

    # Content for today
    print("\n📝 READY-TO-POST CONTENT")
    print("-" * 40)
    content = selector.get_content_for_today()
    for s in content['suggestions']:
        print(f"\n{s['platform'].upper()} - {s['type']}")
        if 'content' in s:
            print(s['content'][:200] + "...")

    # Campaign
    print("\n🎯 LAUNCH CAMPAIGN PREVIEW")
    print("-" * 40)
    campaign = CampaignGenerator().generate_launch_campaign()
    for phase in campaign['phases']:
        print(f"\nPhase {phase['phase']} (Days {phase['days']}): {phase['focus']}")
        for action in phase['actions'][:2]:
            print(f"  • {action}")


if __name__ == '__main__':
    main()
