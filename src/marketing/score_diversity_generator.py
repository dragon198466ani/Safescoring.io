#!/usr/bin/env python3
"""
Score Diversity Content Generator
Generates marketing content that showcases real score distribution.
Proves SafeScoring rates objectively with varied scores.
"""

import asyncio
import os
import json
import random
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import requests
from src.marketing.templates.score_diversity_content import (
    TWITTER_SCORE_DIVERSITY,
    REDDIT_SCORE_DIVERSITY,
    LINKEDIN_SCORE_DIVERSITY,
    EMAIL_SCORE_DIVERSITY
)

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', os.getenv('NEXT_PUBLIC_SUPABASE_URL', ''))
SUPABASE_KEY = os.getenv('SUPABASE_KEY', os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''))


class ScoreDiversityGenerator:
    """Generate content showcasing score diversity"""

    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
        }
        self.score_data = None
        self.products_by_type = {}

    def fetch_scores(self):
        """Fetch all scores from database"""
        print("📊 Fetching score data...")

        # Get products with types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,product_types(id,name)",
            headers=self.headers
        )
        products = r.json() if r.status_code == 200 else []

        # Get scores
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/safe_scoring_results?select=product_id,note_finale,score_s,score_a,score_f,score_e",
            headers=self.headers
        )
        scores = r.json() if r.status_code == 200 else []

        # Create score map
        score_map = {s['product_id']: s for s in scores}

        # Combine data
        all_scores = []
        self.products_by_type = {}

        for p in products:
            score_data = score_map.get(p['id'])
            if not score_data or score_data['note_finale'] is None:
                continue

            product_type = p.get('product_types', {}).get('name', 'Unknown')

            item = {
                'id': p['id'],
                'name': p['name'],
                'slug': p['slug'],
                'type': product_type,
                'score': round(score_data['note_finale'], 1),
                's': round(score_data['score_s'], 1) if score_data['score_s'] else None,
                'a': round(score_data['score_a'], 1) if score_data['score_a'] else None,
                'f': round(score_data['score_f'], 1) if score_data['score_f'] else None,
                'e': round(score_data['score_e'], 1) if score_data['score_e'] else None,
            }
            all_scores.append(item)

            if product_type not in self.products_by_type:
                self.products_by_type[product_type] = []
            self.products_by_type[product_type].append(item)

        # Sort by score
        all_scores.sort(key=lambda x: x['score'], reverse=True)
        for t in self.products_by_type:
            self.products_by_type[t].sort(key=lambda x: x['score'], reverse=True)

        # Calculate distribution
        distribution = {
            'excellent': [p for p in all_scores if p['score'] >= 90],
            'good': [p for p in all_scores if 70 <= p['score'] < 90],
            'average': [p for p in all_scores if 50 <= p['score'] < 70],
            'poor': [p for p in all_scores if 30 <= p['score'] < 50],
            'critical': [p for p in all_scores if p['score'] < 30],
        }

        avg = sum(p['score'] for p in all_scores) / len(all_scores) if all_scores else 0

        self.score_data = {
            'all': all_scores,
            'distribution': distribution,
            'count': len(all_scores),
            'avg': round(avg, 1),
            'min': min(p['score'] for p in all_scores) if all_scores else 0,
            'max': max(p['score'] for p in all_scores) if all_scores else 0,
            'types': list(self.products_by_type.keys()),
        }

        print(f"   Found {len(all_scores)} scored products")
        print(f"   Average: {self.score_data['avg']}%")
        print(f"   Range: {self.score_data['min']}% - {self.score_data['max']}%")

        return self.score_data

    def generate_twitter_content(self, count: int = 5) -> list:
        """Generate Twitter posts about score diversity"""
        if not self.score_data:
            self.fetch_scores()

        posts = []
        d = self.score_data['distribution']

        # Template 1: High vs Low comparison
        if d['excellent'] and (d['poor'] or d['critical']):
            high = random.choice(d['excellent'])
            low_pool = d['poor'] + d['critical']
            low = random.choice(low_pool) if low_pool else d['average'][0] if d['average'] else None

            if low and high['type'] == low['type']:
                posts.append({
                    'type': 'comparison',
                    'content': f"""Not all {high['type']} are created equal.

Our latest ratings:
• {high['name']}: {high['score']}% ✓
• {low['name']}: {low['score']}% ✗

Same category, very different security.

That's what objective ratings look like.

safescoring.io/transparency"""
                })

        # Template 2: Average score reality
        above_avg = len([p for p in self.score_data['all'] if p['score'] > self.score_data['avg']])
        below_avg = len([p for p in self.score_data['all'] if p['score'] <= self.score_data['avg']])
        posts.append({
            'type': 'stats',
            'content': f"""Average SafeScore across {self.score_data['count']} products: {self.score_data['avg']}%

That means:
• {round(above_avg/self.score_data['count']*100)}% score above average
• {round(below_avg/self.score_data['count']*100)}% score below average

We don't give everyone an A+.
We give you the truth.

safescoring.io/transparency"""
        })

        # Template 3: Distribution for a product type
        for product_type in random.sample(list(self.products_by_type.keys()), min(2, len(self.products_by_type))):
            products = self.products_by_type[product_type]
            if len(products) >= 3:
                excellent = len([p for p in products if p['score'] >= 90])
                good = len([p for p in products if 70 <= p['score'] < 90])
                average = len([p for p in products if 50 <= p['score'] < 70])
                poor = len([p for p in products if p['score'] < 50])

                posts.append({
                    'type': 'distribution',
                    'content': f"""Score distribution across {len(products)} {product_type}:

🟢 Excellent (90-100): {excellent}
🔵 Good (70-89): {good}
🟡 Average (50-69): {average}
🔴 Poor (<50): {poor}

Real ratings. Real differences.

safescoring.io/products?type={product_type.lower().replace(' ', '-')}"""
                })

        # Template 4: Gap comparison
        if self.score_data['all']:
            best = self.score_data['all'][0]
            worst = self.score_data['all'][-1]
            gap = round(best['score'] - worst['score'], 1)

            posts.append({
                'type': 'gap',
                'content': f"""Security gap in crypto products:

Best: {best['name']} at {best['score']}%
Lowest: {worst['name']} at {worst['score']}%

A {gap}% difference.

This is why independent ratings matter.

safescoring.io/transparency"""
            })

        # Template 5: No perfect scores
        if d['excellent']:
            top = d['excellent'][0]
            missing = "some security norms"
            if top['a'] and top['a'] < top['score']:
                missing = "duress protection features"
            elif top['f'] and top['f'] < top['score']:
                missing = "independent audit verification"

            posts.append({
                'type': 'reality',
                'content': f"""No product on SafeScoring has scored 100%.

Even our top-rated {top['type']}, {top['name']}, has gaps.

Score: {top['score']}%
Room for improvement: {missing}

Perfection doesn't exist. But transparency does.

safescoring.io/products/{top['slug']}"""
            })

        return posts[:count]

    def generate_reddit_post(self, product_type: str = None) -> dict:
        """Generate Reddit post for a product type"""
        if not self.score_data:
            self.fetch_scores()

        if not product_type:
            # Pick type with most products
            product_type = max(self.products_by_type.keys(), key=lambda t: len(self.products_by_type[t]))

        products = self.products_by_type.get(product_type, [])
        if len(products) < 5:
            return None

        # Calculate stats
        excellent = [p for p in products if p['score'] >= 90]
        good = [p for p in products if 70 <= p['score'] < 90]
        average = [p for p in products if 50 <= p['score'] < 70]
        poor = [p for p in products if 30 <= p['score'] < 50]
        critical = [p for p in products if p['score'] < 30]

        total = len(products)

        return {
            'title': f"We rated {total} {product_type} - here's the honest breakdown",
            'subreddit': 'CryptoCurrency',
            'body': f"""I run SafeScoring.io where we evaluate crypto products against 916 security norms.

Here's what we found for {product_type}:

**Score Distribution:**
| Range | Count | % |
|-------|-------|---|
| Excellent (90-100) | {len(excellent)} | {round(len(excellent)/total*100)}% |
| Good (70-89) | {len(good)} | {round(len(good)/total*100)}% |
| Average (50-69) | {len(average)} | {round(len(average)/total*100)}% |
| Poor (30-49) | {len(poor)} | {round(len(poor)/total*100)}% |
| Critical (<30) | {len(critical)} | {round(len(critical)/total*100)}% |

**Top 3:**
1. {products[0]['name']} - {products[0]['score']}%
2. {products[1]['name']} - {products[1]['score']}%
3. {products[2]['name']} - {products[2]['score']}%

**Bottom 3:**
1. {products[-3]['name']} - {products[-3]['score']}%
2. {products[-2]['name']} - {products[-2]['score']}%
3. {products[-1]['name']} - {products[-1]['score']}%

**Why the big gap?**
The main differences come from:
- Independent security audits (or lack thereof)
- Open source code availability
- Bug bounty programs
- Key management practices

Full methodology: safescoring.io/methodology
All scores: safescoring.io/transparency

Happy to answer questions about specific products."""
        }

    def generate_linkedin_post(self) -> str:
        """Generate LinkedIn post about score diversity"""
        if not self.score_data:
            self.fetch_scores()

        d = self.score_data['distribution']
        excellent_pct = round(len(d['excellent']) / self.score_data['count'] * 100)
        poor_pct = round((len(d['poor']) + len(d['critical'])) / self.score_data['count'] * 100)

        return f"""📊 The uncomfortable truth about crypto security

We've evaluated {self.score_data['count']}+ crypto products. The results might surprise you:

• Only {excellent_pct}% score "Excellent" (90%+)
• {poor_pct}% score "Poor" or worse (<50%)
• Average score: {self.score_data['avg']}%

This isn't about FUD. It's about facts.

At SafeScoring, we rate every product against 916 security norms. Same standards for everyone. No pay-to-play.

Some products don't like their scores. But our job isn't to make friends—it's to help users make informed decisions.

📈 View the full distribution: safescoring.io/transparency

What matters more: a good rating or the truth?

#CryptoSecurity #DeFi #BlockchainSecurity #Web3"""

    def save_content(self, content_type: str, content: any):
        """Save generated content"""
        output_dir = Path('data/marketing_content/diversity')
        output_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{content_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_dir / filename, 'w') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)

        print(f"✅ Saved {filename}")


async def main():
    generator = ScoreDiversityGenerator()

    # Fetch scores
    generator.fetch_scores()

    print("\n📱 Twitter Posts:")
    print("-" * 50)
    tweets = generator.generate_twitter_content(5)
    for i, tweet in enumerate(tweets, 1):
        print(f"\n[{i}] Type: {tweet['type']}")
        print(tweet['content'])
        print("-" * 30)

    generator.save_content('twitter', tweets)

    print("\n📝 Reddit Post:")
    print("-" * 50)
    reddit = generator.generate_reddit_post()
    if reddit:
        print(f"Title: {reddit['title']}")
        print(f"Subreddit: r/{reddit['subreddit']}")
        print(reddit['body'][:500] + "...")
        generator.save_content('reddit', reddit)

    print("\n💼 LinkedIn Post:")
    print("-" * 50)
    linkedin = generator.generate_linkedin_post()
    print(linkedin)
    generator.save_content('linkedin', {'content': linkedin})

    print("\n✅ Content generation complete!")


if __name__ == '__main__':
    asyncio.run(main())
