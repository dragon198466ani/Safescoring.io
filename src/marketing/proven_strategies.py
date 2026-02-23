#!/usr/bin/env python3
"""
PROVEN MARKETING STRATEGIES DATABASE
Inspired by the most successful marketing methods from:
- SaaS growth playbooks
- Viral marketing case studies
- Crypto/Web3 community building
- B2C acquisition strategies

All strategies adapted for SafeScoring with SOFT SELLING approach.
"""

# ============================================
# 1. ACQUISITION STRATEGIES
# ============================================

ACQUISITION_STRATEGIES = [
    # --- CONTENT MARKETING ---
    {
        'name': 'Pain Point Content',
        'category': 'acquisition',
        'method_type': 'content',
        'description': 'Create content around problems users face, position product as natural solution',
        'psychology': 'People search for solutions to problems. Be there when they search.',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 85,
        'time_to_results': 'weeks',
        'examples': [
            '"How to know if your wallet is secure" → leads to SafeScoring',
            '"Why audited projects still get hacked" → shows need for comprehensive rating',
        ],
        'safescoring_application': 'Blog posts about security issues, naturally mention scores as solution'
    },
    {
        'name': 'Data-Driven Content',
        'category': 'acquisition',
        'method_type': 'content',
        'description': 'Publish unique data/research that gets shared and cited',
        'psychology': 'Original data is valuable, gets backlinks and shares',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 90,
        'time_to_results': 'weeks',
        'examples': [
            '"State of Wallet Security 2024" report',
            '"We analyzed 100 wallets - here\'s what we found"',
        ],
        'safescoring_application': 'Use real score data to create shareable reports'
    },
    {
        'name': 'Newsjacking',
        'category': 'acquisition',
        'method_type': 'content',
        'description': 'Jump on breaking news with relevant commentary',
        'psychology': 'Trending topics get visibility, establishes authority',
        'difficulty': 'easy',
        'cost': 'free',
        'effectiveness_score': 80,
        'time_to_results': 'immediate',
        'examples': [
            'When hack happens → "Here\'s the SafeScore of the affected protocol"',
            'New wallet launch → Quick security analysis thread',
        ],
        'safescoring_application': 'Monitor DeFiLlama/rekt.news, instant reaction with scores'
    },

    # --- SEO STRATEGIES ---
    {
        'name': 'Comparison Pages',
        'category': 'acquisition',
        'method_type': 'seo',
        'description': 'Create "X vs Y" pages for every product combination',
        'psychology': 'People search "Ledger vs Trezor" - be the answer',
        'difficulty': 'easy',
        'cost': 'free',
        'effectiveness_score': 85,
        'time_to_results': 'months',
        'examples': [
            '/compare/ledger-nano-x/trezor-model-t',
            '/compare/metamask/phantom',
        ],
        'safescoring_application': 'Auto-generate comparison pages for all product pairs'
    },
    {
        'name': 'Long-Tail Keywords',
        'category': 'acquisition',
        'method_type': 'seo',
        'description': 'Target specific, low-competition search queries',
        'psychology': 'Less traffic but higher intent = better conversion',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 75,
        'time_to_results': 'months',
        'examples': [
            '"is ledger nano x safe" → Product page with score',
            '"metamask security issues" → Blog post + score link',
        ],
        'safescoring_application': 'Create content for "[product] security" searches'
    },
    {
        'name': 'Programmatic SEO',
        'category': 'acquisition',
        'method_type': 'seo',
        'description': 'Auto-generate thousands of pages targeting searches',
        'psychology': 'Scale content creation for massive keyword coverage',
        'difficulty': 'hard',
        'cost': 'low',
        'effectiveness_score': 80,
        'time_to_results': 'months',
        'examples': [
            '/products/[slug] pages for every product',
            '/security-score/[product] landing pages',
        ],
        'safescoring_application': 'Already have product pages, add more keyword variants'
    },

    # --- SOCIAL STRATEGIES ---
    {
        'name': 'Thread Marketing',
        'category': 'acquisition',
        'method_type': 'social',
        'description': 'Create educational Twitter threads that provide value',
        'psychology': 'Threads get saved, shared, and establish expertise',
        'difficulty': 'easy',
        'cost': 'free',
        'effectiveness_score': 75,
        'time_to_results': 'days',
        'examples': [
            '"Thread: 5 security features your wallet MUST have"',
            '"Thread: How we analyze 2376 security criteria"',
        ],
        'safescoring_application': 'Weekly educational threads with soft CTA to site'
    },
    {
        'name': 'Community Participation',
        'category': 'acquisition',
        'method_type': 'social',
        'description': 'Genuinely help in crypto communities, mention product naturally',
        'psychology': 'Trust comes from helping, not selling',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 70,
        'time_to_results': 'weeks',
        'examples': [
            'Answer "which wallet is safest?" on Reddit with data',
            'Help in Discord servers, mention SafeScoring when relevant',
        ],
        'safescoring_application': 'Monitor r/cryptocurrency, r/defi for security questions'
    },
    {
        'name': 'Controversy Marketing',
        'category': 'acquisition',
        'method_type': 'social',
        'description': 'Take data-backed contrarian positions',
        'psychology': 'Controversy creates engagement and visibility',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 85,
        'time_to_results': 'immediate',
        'examples': [
            '"Unpopular opinion: [Popular wallet] has security issues"',
            '"Why I wouldn\'t use [well-known product] based on data"',
        ],
        'safescoring_application': 'Use low scores to create discussion (always with data)'
    },

    # --- OUTREACH STRATEGIES ---
    {
        'name': 'Influencer Seeding',
        'category': 'acquisition',
        'method_type': 'outreach',
        'description': 'Get crypto influencers to mention/use SafeScoring',
        'psychology': 'Social proof from trusted voices',
        'difficulty': 'hard',
        'cost': 'medium',
        'effectiveness_score': 80,
        'time_to_results': 'weeks',
        'examples': [
            'Send free detailed report to influencer',
            'Offer to rate their recommended products',
        ],
        'safescoring_application': 'Identify crypto security accounts, offer value first'
    },
    {
        'name': 'Product Hunt Launch',
        'category': 'acquisition',
        'method_type': 'outreach',
        'description': 'Launch on Product Hunt for visibility',
        'psychology': 'Early adopter community, tech-savvy audience',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 70,
        'time_to_results': 'immediate',
        'examples': [
            'Launch as "SafeScoring - Security Ratings for Crypto Products"',
        ],
        'safescoring_application': 'Prepare launch with hunter, timing matters'
    },
    {
        'name': 'Podcast Guesting',
        'category': 'acquisition',
        'method_type': 'outreach',
        'description': 'Appear on crypto podcasts as security expert',
        'psychology': 'Long-form content builds deep trust',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 75,
        'time_to_results': 'weeks',
        'examples': [
            'Pitch to crypto security podcasts',
            'Offer unique data insights as talking points',
        ],
        'safescoring_application': 'Position as crypto security expert, mention SafeScoring naturally'
    },
]

# ============================================
# 2. VIRAL/GROWTH STRATEGIES
# ============================================

VIRAL_STRATEGIES = [
    {
        'name': 'Badge/Widget Viral Loop',
        'category': 'viral',
        'method_type': 'product',
        'description': 'Products display SafeScore badge, drives traffic back',
        'psychology': 'Like "Powered by Stripe" - visibility through usage',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 90,
        'time_to_results': 'months',
        'examples': [
            'Product shows "SafeScore: 87%" badge on their site',
            'Links back to full report on SafeScoring',
        ],
        'safescoring_application': 'Already have badge API, need adoption push'
    },
    {
        'name': 'Shareable Results',
        'category': 'viral',
        'method_type': 'product',
        'description': 'Make it easy to share scores on social media',
        'psychology': 'People share things that make them look good/smart',
        'difficulty': 'easy',
        'cost': 'free',
        'effectiveness_score': 75,
        'time_to_results': 'days',
        'examples': [
            '"My wallet scored 92%! Check yours:" + share button',
            'Auto-generate tweet with score result',
        ],
        'safescoring_application': 'Add share buttons on product pages and setup results'
    },
    {
        'name': 'Referral Program',
        'category': 'viral',
        'method_type': 'referral',
        'description': 'Reward users for bringing new users',
        'psychology': 'Incentivized word-of-mouth',
        'difficulty': 'medium',
        'cost': 'medium',
        'effectiveness_score': 80,
        'time_to_results': 'weeks',
        'examples': [
            'Refer 3 friends, get 1 month Pro free',
            'Affiliate program for influencers',
        ],
        'safescoring_application': 'Already have partners page, formalize program'
    },
    {
        'name': 'User-Generated Content',
        'category': 'viral',
        'method_type': 'social',
        'description': 'Encourage users to create content about SafeScoring',
        'psychology': 'Authentic content from users is trusted more',
        'difficulty': 'medium',
        'cost': 'low',
        'effectiveness_score': 70,
        'time_to_results': 'weeks',
        'examples': [
            'Contest: "Share your SafeScore for a chance to win"',
            'Feature user reviews/testimonials',
        ],
        'safescoring_application': 'Create shareable moment when users check their stack'
    },
    {
        'name': 'Meme Marketing',
        'category': 'viral',
        'method_type': 'social',
        'description': 'Create shareable, funny content about crypto security',
        'psychology': 'Humor spreads, lowers guard for message',
        'difficulty': 'easy',
        'cost': 'free',
        'effectiveness_score': 65,
        'time_to_results': 'immediate',
        'examples': [
            'Meme: "Me checking my wallet score vs reality"',
            'Crypto security fails as memes',
        ],
        'safescoring_application': 'Use score data for relatable memes (careful with tone)'
    },
]

# ============================================
# 3. RETENTION STRATEGIES
# ============================================

RETENTION_STRATEGIES = [
    {
        'name': 'Score Change Alerts',
        'category': 'retention',
        'method_type': 'email',
        'description': 'Notify users when scores change for products they follow',
        'psychology': 'Ongoing value, reason to return',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 85,
        'time_to_results': 'weeks',
        'examples': [
            '"Ledger Nano X score changed from 85% to 82%"',
            'Weekly digest of score changes',
        ],
        'safescoring_application': 'Track product follows, email on changes'
    },
    {
        'name': 'Educational Email Sequence',
        'category': 'retention',
        'method_type': 'email',
        'description': 'Drip emails teaching about crypto security',
        'psychology': 'Value-first builds trust, soft sell at end',
        'difficulty': 'medium',
        'cost': 'free',
        'effectiveness_score': 75,
        'time_to_results': 'weeks',
        'examples': [
            'Day 1: "Why security scores matter"',
            'Day 3: "The 4 pillars of crypto security"',
            'Day 7: "Check your stack\'s score"',
        ],
        'safescoring_application': 'Already have email_sequences.py, enhance content'
    },
    {
        'name': 'Community Building',
        'category': 'retention',
        'method_type': 'social',
        'description': 'Create community around crypto security',
        'psychology': 'Belonging creates loyalty',
        'difficulty': 'hard',
        'cost': 'low',
        'effectiveness_score': 80,
        'time_to_results': 'months',
        'examples': [
            'Discord server for security discussions',
            'Weekly Twitter Spaces on security topics',
        ],
        'safescoring_application': 'Already have Discord bot, need community strategy'
    },
]

# ============================================
# 4. ENGAGEMENT STRATEGIES (HOOKS)
# ============================================

HOOK_TYPES = {
    'question': {
        'psychology': 'Questions trigger curiosity and engagement',
        'examples': [
            "Do you know your wallet's security score?",
            "What if your favorite wallet isn't as safe as you think?",
            "Would you use a wallet that failed 50% of security checks?",
            "How many security criteria does your wallet pass?",
        ],
    },
    'statistic': {
        'psychology': 'Numbers are concrete and shareable',
        'examples': [
            "Only 12% of wallets have all 3: audit, open source, bug bounty.",
            "87% of hacked projects in 2024 had been audited.",
            "The average wallet scores 67% on our 2376-point security check.",
            "A $50M hack happens every 11 days in crypto.",
        ],
    },
    'controversy': {
        'psychology': 'Disagreement creates engagement',
        'examples': [
            "Unpopular opinion: Most hardware wallets are overrated.",
            "The most popular wallet isn't the most secure. Here's the data.",
            "Audits are marketing, not security. Here's why.",
        ],
    },
    'curiosity_gap': {
        'psychology': 'Open loop creates need to know',
        'examples': [
            "A well-known wallet just scored 41%. (Not saying which one.)",
            "We found a critical flaw in [redacted]. The data speaks for itself.",
            "The #1 rated wallet surprised us. Here's why.",
        ],
    },
    'fear': {
        'psychology': 'Fear motivates action (use responsibly)',
        'examples': [
            "Your wallet's security score is public. Have you seen it?",
            "Before the next hack, you might want to check this.",
            "Most people don't check. Then they wonder what went wrong.",
        ],
    },
    'social_proof': {
        'psychology': 'People follow what others do',
        'examples': [
            "10,000+ people checked their wallet this month.",
            "This thread got 500+ saves. Here's what people found useful.",
            "The community's most-checked products this week.",
        ],
    },
    'authority': {
        'psychology': 'Expertise builds trust',
        'examples': [
            "After analyzing 100+ wallets, here's what matters.",
            "2376 security criteria. Here's what most wallets miss.",
            "We've rated every major wallet. The results are public.",
        ],
    },
}

# ============================================
# 5. CTA LIBRARY (Soft to Hard)
# ============================================

CTA_LIBRARY = {
    'ultra_soft': {  # Level 5 - Pure value
        'description': 'No sell, just information',
        'examples': [
            "safescoring.io",
            "The data is public.",
            "See for yourself.",
        ],
    },
    'soft': {  # Level 4 - Curiosity
        'description': 'Creates curiosity without asking anything',
        'examples': [
            "Check the data →",
            "Curious? →",
            "See how it compares →",
            "Full breakdown here →",
        ],
    },
    'medium_soft': {  # Level 3 - Suggestion
        'description': 'Gentle suggestion',
        'examples': [
            "Might be worth checking →",
            "See where your wallet ranks →",
            "Your score might surprise you →",
        ],
    },
    'medium': {  # Level 2 - Clear invitation
        'description': 'Clear but not pushy',
        'examples': [
            "Check your wallet's score →",
            "See the full analysis →",
            "Compare your options →",
        ],
    },
    'direct': {  # Level 1 - AVOID in content marketing
        'description': 'Direct ask - only for ads/landing pages',
        'examples': [
            "Get your score now",
            "Start analyzing",
            "Sign up free",
        ],
    },
}

# ============================================
# 6. PLATFORM-SPECIFIC STRATEGIES
# ============================================

PLATFORM_STRATEGIES = {
    'twitter': {
        'best_times': ['9am', '12pm', '5pm', '8pm'],
        'best_days': ['Tuesday', 'Wednesday', 'Thursday'],
        'content_types': ['threads', 'single_tweets', 'polls', 'quote_tweets'],
        'hashtag_strategy': '1-2 relevant, never more',
        'engagement_tactics': [
            'Reply to crypto influencers with value',
            'Quote tweet with added insight',
            'Create polls about security topics',
            'Live-tweet during crypto events',
        ],
    },
    'reddit': {
        'best_subreddits': ['r/cryptocurrency', 'r/defi', 'r/Bitcoin', 'r/ethereum', 'r/CryptoTechnology'],
        'rules': [
            'Never direct promote - share as helpful user',
            'Answer questions with data, mention source naturally',
            'Create original content posts (not link posts)',
            'Engage in comments before posting',
        ],
        'content_types': ['text_posts', 'helpful_comments', 'ama'],
    },
    'linkedin': {
        'best_times': ['7am', '12pm', '5pm'],
        'best_days': ['Tuesday', 'Wednesday', 'Thursday'],
        'content_types': ['insights', 'data_posts', 'carousel', 'articles'],
        'engagement_tactics': [
            'Comment on crypto security posts',
            'Share industry insights with data',
            'Connect with crypto professionals',
        ],
    },
    'youtube': {
        'content_types': ['tutorials', 'comparisons', 'news_analysis', 'shorts'],
        'ideas': [
            '"How to Check if Your Wallet is Secure"',
            '"Top 5 Safest Hardware Wallets 2024"',
            '"We Rated Every Major Wallet - Results"',
        ],
    },
    'tiktok': {
        'content_types': ['quick_tips', 'reactions', 'educational'],
        'ideas': [
            'Quick security tips under 60 seconds',
            'React to crypto hacks with security angle',
            'Wallet score reveals',
        ],
    },
}

# ============================================
# 7. CONVERSION FUNNELS
# ============================================

CONVERSION_FUNNELS = {
    'awareness_to_visit': {
        'trigger': 'See content on social media',
        'content': 'Educational/curiosity hook',
        'cta': 'Soft link to site',
        'landing': '/transparency or /products',
        'next_step': 'Browse scores',
    },
    'visit_to_signup': {
        'trigger': 'Browse product scores',
        'content': 'Show value of deeper analysis',
        'cta': 'Create account to save stack',
        'landing': '/dashboard/setups',
        'next_step': 'Free account creation',
    },
    'free_to_paid': {
        'trigger': 'Hit free tier limits',
        'content': 'Show value of more setups/comparisons',
        'cta': 'Upgrade for unlimited',
        'landing': '/#pricing',
        'next_step': 'Paid subscription',
    },
    'paid_to_advocate': {
        'trigger': 'Happy customer',
        'content': 'Share achievement, invite others',
        'cta': 'Referral program',
        'landing': '/partners',
        'next_step': 'Become affiliate',
    },
}

# ============================================
# 8. COMPETITOR ANALYSIS TEMPLATES
# ============================================

COMPETITOR_ANALYSIS = {
    'certik': {
        'what_they_do': 'Smart contract audits',
        'their_strength': 'Brand recognition in audits',
        'their_weakness': 'Only code audits, not comprehensive security',
        'our_angle': 'We rate 2376 criteria, not just code',
    },
    'defisafety': {
        'what_they_do': 'DeFi protocol ratings',
        'their_strength': 'Established in DeFi',
        'their_weakness': 'Only DeFi, no wallets',
        'our_angle': 'We rate everything: wallets, DeFi, hardware',
    },
    'cer_live': {
        'what_they_do': 'Exchange ratings',
        'their_strength': 'Exchange focus',
        'their_weakness': 'Only exchanges',
        'our_angle': 'Comprehensive coverage across all product types',
    },
}

# ============================================
# EXPORT FUNCTION TO SEED DATABASE
# ============================================

def get_all_strategies():
    """Get all strategies for database seeding"""
    return {
        'acquisition': ACQUISITION_STRATEGIES,
        'viral': VIRAL_STRATEGIES,
        'retention': RETENTION_STRATEGIES,
        'hooks': HOOK_TYPES,
        'ctas': CTA_LIBRARY,
        'platforms': PLATFORM_STRATEGIES,
        'funnels': CONVERSION_FUNNELS,
        'competitors': COMPETITOR_ANALYSIS,
    }


def seed_marketing_database():
    """Seed the marketing database with all strategies"""
    import os
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

    from supabase import create_client

    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        print("Missing Supabase credentials")
        return

    client = create_client(supabase_url, supabase_key)

    # Seed strategies
    all_strategies = ACQUISITION_STRATEGIES + VIRAL_STRATEGIES + RETENTION_STRATEGIES
    for strategy in all_strategies:
        try:
            client.table('marketing_strategies').insert({
                'name': strategy['name'],
                'category': strategy['category'],
                'method_type': strategy['method_type'],
                'description': strategy['description'],
                'psychology': strategy['psychology'],
                'difficulty': strategy['difficulty'],
                'cost': strategy['cost'],
                'effectiveness_score': strategy['effectiveness_score'],
                'time_to_results': strategy['time_to_results'],
                'examples': strategy['examples'],
            }).execute()
            print(f"Added strategy: {strategy['name']}")
        except Exception as e:
            print(f"Error adding {strategy['name']}: {e}")

    # Seed hooks
    for hook_type, data in HOOK_TYPES.items():
        for example in data['examples']:
            try:
                client.table('marketing_hooks').insert({
                    'hook_type': hook_type,
                    'content': example,
                    'psychology': data['psychology'],
                    'platform': ['twitter', 'linkedin', 'reddit'],
                    'effectiveness_score': 70,
                }).execute()
            except Exception as e:
                print(f"Error adding hook: {e}")

    # Seed CTAs
    for cta_type, data in CTA_LIBRARY.items():
        for example in data['examples']:
            is_allowed = cta_type != 'direct'  # Block hard CTAs
            try:
                client.table('marketing_ctas').insert({
                    'cta_type': cta_type,
                    'content': example,
                    'psychology': data['description'],
                    'platform': ['twitter', 'linkedin', 'reddit', 'email'],
                    'is_allowed': is_allowed,
                }).execute()
            except Exception as e:
                print(f"Error adding CTA: {e}")

    print("Marketing database seeded!")


if __name__ == '__main__':
    # Print summary
    print("=" * 60)
    print("SAFESCORING MARKETING STRATEGIES")
    print("=" * 60)

    print(f"\n📈 Acquisition Strategies: {len(ACQUISITION_STRATEGIES)}")
    print(f"🚀 Viral Strategies: {len(VIRAL_STRATEGIES)}")
    print(f"🔄 Retention Strategies: {len(RETENTION_STRATEGIES)}")
    print(f"🎣 Hook Types: {len(HOOK_TYPES)}")
    print(f"📢 CTA Levels: {len(CTA_LIBRARY)}")
    print(f"📱 Platforms: {len(PLATFORM_STRATEGIES)}")

    print("\n" + "=" * 60)
    print("TOP STRATEGIES BY EFFECTIVENESS")
    print("=" * 60)

    all_strategies = ACQUISITION_STRATEGIES + VIRAL_STRATEGIES + RETENTION_STRATEGIES
    sorted_strategies = sorted(all_strategies, key=lambda x: x['effectiveness_score'], reverse=True)

    for i, s in enumerate(sorted_strategies[:10], 1):
        print(f"{i}. {s['name']} ({s['effectiveness_score']}%) - {s['category']}")
