#!/usr/bin/env python3
"""
A/B Testing System for Marketing Content
Tests different versions of content to find what works best.

Features:
- Generate content variants
- Track performance metrics
- Auto-select winners
- Learn from results
"""

import asyncio
import os
import json
from datetime import datetime, timedelta
from pathlib import Path
import sys
import random
import hashlib

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.core.api_provider import AIProvider


class ABTesting:
    """A/B testing for marketing content"""

    def __init__(self):
        self.ai = AIProvider()
        self.tests_dir = Path('data/ab_tests')
        self.tests_dir.mkdir(parents=True, exist_ok=True)

        self.active_tests = self._load_tests()

    def _load_tests(self) -> dict:
        """Load active tests"""
        tests_file = self.tests_dir / 'active_tests.json'
        if tests_file.exists():
            with open(tests_file, 'r') as f:
                return json.load(f)
        return {}

    def _save_tests(self):
        """Save tests"""
        with open(self.tests_dir / 'active_tests.json', 'w') as f:
            json.dump(self.active_tests, f, indent=2)

    async def create_variants(self, base_content: str, num_variants: int = 3, test_type: str = 'hook') -> list:
        """Create content variants for testing"""

        if test_type == 'hook':
            prompt = f"""
Create {num_variants} different opening hooks for this content.
Each hook should be attention-grabbing but in a different style:
1. Question-based
2. Statistic-based
3. Story-based

Original content:
{base_content}

Return JSON array of {num_variants} complete posts with different hooks:
[{{"variant": "A", "content": "...", "hook_style": "question"}}, ...]
            """

        elif test_type == 'cta':
            prompt = f"""
Create {num_variants} different call-to-action variations for this content.
Test different CTA approaches:
1. Direct command
2. Benefit-focused
3. Curiosity-driven

Original content:
{base_content}

Return JSON array of {num_variants} complete posts with different CTAs:
[{{"variant": "A", "content": "...", "cta_style": "direct"}}, ...]
            """

        elif test_type == 'tone':
            prompt = f"""
Create {num_variants} different tonal variations of this content:
1. Professional/formal
2. Casual/friendly
3. Urgent/important

Original content:
{base_content}

Return JSON array of {num_variants} complete posts with different tones:
[{{"variant": "A", "content": "...", "tone": "professional"}}, ...]
            """

        else:  # general
            prompt = f"""
Create {num_variants} meaningfully different versions of this content.
Each should convey the same message but with different approaches.

Original content:
{base_content}

Return JSON array of {num_variants} different versions:
[{{"variant": "A", "content": "...", "approach": "description"}}, ...]
            """

        try:
            response = await self.ai.generate(prompt, max_tokens=1500)
            variants = json.loads(response)
            return variants
        except Exception as e:
            print(f"Error creating variants: {e}")
            return [{"variant": "A", "content": base_content, "approach": "original"}]

    def create_test(self, name: str, variants: list, test_duration_hours: int = 48) -> str:
        """Create a new A/B test"""
        test_id = hashlib.md5(f"{name}{datetime.now()}".encode()).hexdigest()[:8]

        test = {
            'id': test_id,
            'name': name,
            'variants': variants,
            'metrics': {v['variant']: {
                'impressions': 0,
                'clicks': 0,
                'engagements': 0,
                'conversions': 0
            } for v in variants},
            'created_at': datetime.now().isoformat(),
            'ends_at': (datetime.now() + timedelta(hours=test_duration_hours)).isoformat(),
            'status': 'active',
            'winner': None
        }

        self.active_tests[test_id] = test
        self._save_tests()

        print(f"✅ Created test: {test_id} with {len(variants)} variants")
        return test_id

    def get_variant(self, test_id: str) -> dict:
        """Get a variant to show (with even distribution)"""
        test = self.active_tests.get(test_id)
        if not test or test['status'] != 'active':
            return None

        # Simple rotation based on impressions
        variants = test['variants']
        impressions = [(v['variant'], test['metrics'][v['variant']]['impressions'])
                       for v in variants]

        # Pick variant with fewest impressions
        min_impressions = min(i[1] for i in impressions)
        candidates = [i[0] for i in impressions if i[1] == min_impressions]
        selected = random.choice(candidates)

        # Find and return the variant
        for v in variants:
            if v['variant'] == selected:
                return v

        return variants[0]

    def record_impression(self, test_id: str, variant: str):
        """Record that a variant was shown"""
        if test_id in self.active_tests:
            self.active_tests[test_id]['metrics'][variant]['impressions'] += 1
            self._save_tests()

    def record_click(self, test_id: str, variant: str):
        """Record a click on a variant"""
        if test_id in self.active_tests:
            self.active_tests[test_id]['metrics'][variant]['clicks'] += 1
            self._save_tests()

    def record_engagement(self, test_id: str, variant: str, engagement_type: str = 'like'):
        """Record engagement (like, comment, share)"""
        if test_id in self.active_tests:
            self.active_tests[test_id]['metrics'][variant]['engagements'] += 1
            self._save_tests()

    def record_conversion(self, test_id: str, variant: str):
        """Record a conversion (signup, subscription)"""
        if test_id in self.active_tests:
            self.active_tests[test_id]['metrics'][variant]['conversions'] += 1
            self._save_tests()

    def calculate_winner(self, test_id: str) -> dict:
        """Calculate the winning variant"""
        test = self.active_tests.get(test_id)
        if not test:
            return None

        results = []

        for variant_name, metrics in test['metrics'].items():
            impressions = max(metrics['impressions'], 1)

            # Calculate rates
            ctr = metrics['clicks'] / impressions * 100
            engagement_rate = metrics['engagements'] / impressions * 100
            conversion_rate = metrics['conversions'] / impressions * 100

            # Weighted score (conversions most important)
            score = (ctr * 0.2) + (engagement_rate * 0.3) + (conversion_rate * 0.5)

            results.append({
                'variant': variant_name,
                'impressions': impressions,
                'ctr': round(ctr, 2),
                'engagement_rate': round(engagement_rate, 2),
                'conversion_rate': round(conversion_rate, 2),
                'score': round(score, 2)
            })

        # Sort by score
        results.sort(key=lambda x: x['score'], reverse=True)

        # Statistical significance check (simplified)
        if results[0]['impressions'] < 100:
            return {
                'status': 'insufficient_data',
                'message': 'Need at least 100 impressions per variant',
                'results': results
            }

        winner = results[0]
        if len(results) > 1:
            improvement = ((winner['score'] - results[1]['score']) / max(results[1]['score'], 0.1)) * 100
        else:
            improvement = 0

        return {
            'status': 'complete',
            'winner': winner['variant'],
            'improvement': round(improvement, 1),
            'results': results
        }

    def end_test(self, test_id: str):
        """End a test and declare winner"""
        if test_id not in self.active_tests:
            return None

        result = self.calculate_winner(test_id)

        if result['status'] == 'complete':
            self.active_tests[test_id]['status'] = 'complete'
            self.active_tests[test_id]['winner'] = result['winner']
            self.active_tests[test_id]['final_results'] = result
            self._save_tests()

            # Log learnings
            self._log_learnings(test_id, result)

        return result

    def _log_learnings(self, test_id: str, result: dict):
        """Log test results for future learning"""
        test = self.active_tests[test_id]

        learning = {
            'test_id': test_id,
            'name': test['name'],
            'winner': result['winner'],
            'improvement': result['improvement'],
            'winner_content': next(
                (v for v in test['variants'] if v['variant'] == result['winner']),
                {}
            ),
            'timestamp': datetime.now().isoformat()
        }

        learnings_file = self.tests_dir / 'learnings.jsonl'
        with open(learnings_file, 'a') as f:
            f.write(json.dumps(learning) + '\n')

    def get_learnings(self, limit: int = 20) -> list:
        """Get past learnings to inform future content"""
        learnings_file = self.tests_dir / 'learnings.jsonl'
        if not learnings_file.exists():
            return []

        learnings = []
        with open(learnings_file, 'r') as f:
            for line in f:
                learnings.append(json.loads(line))

        return learnings[-limit:]

    async def auto_optimize(self, content: str, content_type: str = 'twitter') -> str:
        """Use past learnings to optimize content"""
        learnings = self.get_learnings(10)

        if not learnings:
            return content

        # Extract patterns from winners
        winning_patterns = [l['winner_content'].get('approach', '') for l in learnings]

        prompt = f"""
Based on these winning content patterns from past A/B tests:
{chr(10).join(f'- {p}' for p in winning_patterns if p)}

Optimize this content to follow similar patterns:
{content}

Optimized content:
        """

        try:
            optimized = await self.ai.generate(prompt, max_tokens=500)
            return optimized.strip() if optimized else content
        except Exception:
            return content


async def main():
    ab = ABTesting()

    # Create test variants
    base_content = """
Your crypto wallet might not be as safe as you think.

We analyzed 500+ wallets and found alarming security gaps.

Check your wallet's SafeScore: safescoring.io
    """

    print("Creating A/B test variants...")
    variants = await ab.create_variants(base_content, num_variants=3, test_type='hook')

    print("\nVariants created:")
    for v in variants:
        print(f"\n--- Variant {v.get('variant', '?')} ---")
        print(v.get('content', '')[:200])

    # Create test
    test_id = ab.create_test(
        name="Wallet security hook test",
        variants=variants,
        test_duration_hours=48
    )

    print(f"\nTest created: {test_id}")
    print("Use record_impression(), record_click(), etc. to track metrics")


if __name__ == '__main__':
    asyncio.run(main())
