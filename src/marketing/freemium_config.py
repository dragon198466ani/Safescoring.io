#!/usr/bin/env python3
"""
Freemium Marketing Configuration
Defines what content is FREE vs PAID for marketing purposes.

RULE: All automated marketing communication must ONLY promote FREE features.
Paid features should NOT be mentioned in automated posts.
"""

# ============================================
# FREE FEATURES (OK to promote in marketing)
# ============================================

FREE_FEATURES = {
    'product_scores': {
        'name': 'Product Security Scores',
        'description': 'View security scores for all crypto products',
        'marketing_phrases': [
            'Check any product\'s security score',
            'See how your wallet stacks up',
            'Compare security ratings for free',
            'Free security scores for 100+ products',
        ],
        'urls': ['/products', '/transparency', '/compare'],
    },
    'methodology': {
        'name': 'SAFE Methodology',
        'description': '2376 security norms, transparent evaluation',
        'marketing_phrases': [
            '2376 security norms',
            'Transparent methodology',
            'See exactly how we rate products',
            'Open evaluation criteria',
        ],
        'urls': ['/methodology'],
    },
    'transparency': {
        'name': 'Score Transparency',
        'description': 'Full distribution of all scores',
        'marketing_phrases': [
            'See the full score distribution',
            'Real ratings, no bias',
            'Some products fail - we show it',
            'Objective security ratings',
        ],
        'urls': ['/transparency'],
    },
    'basic_comparison': {
        'name': 'Basic Comparison',
        'description': 'Compare 2 products side by side',
        'marketing_phrases': [
            'Compare two products',
            'Side-by-side security comparison',
            'Which is more secure?',
        ],
        'urls': ['/compare'],
    },
    'one_setup': {
        'name': 'One Stack Analysis',
        'description': 'Analyze your crypto setup (1 free)',
        'marketing_phrases': [
            'Analyze your crypto stack',
            'Find your weakest link',
            'One free setup analysis',
        ],
        'urls': ['/dashboard/setups'],
    },
    'educational': {
        'name': 'Educational Content',
        'description': 'Blog, guides, security tips',
        'marketing_phrases': [
            'Learn about crypto security',
            'Security tips and guides',
            'Stay informed about threats',
        ],
        'urls': ['/blog'],
    },
}

# ============================================
# PAID FEATURES (DO NOT promote in marketing)
# ============================================

PAID_FEATURES = {
    'unlimited_comparisons': 'Unlimited product comparisons',
    'multiple_setups': 'Multiple setup analyses',
    'api_access': 'API access for integrations',
    'white_label': 'White-label reports',
    'team_sharing': 'Team sharing features',
    'custom_scoring': 'Custom scoring models',
    'priority_support': 'Priority support',
    'score_tracking': 'Historical score tracking',
    'detailed_breakdown': 'Detailed risk breakdown',
    'certification_badge': 'Certification badges',
}

# ============================================
# MARKETING RULES
# ============================================

MARKETING_RULES = {
    # What to emphasize (creates curiosity, not sales pitch)
    'emphasize': [
        'Data is public',
        'Scores are visible to everyone',
        'Transparent methodology',
        'Some products fail (proves objectivity)',
        '2376 security norms analyzed',
        'Independent evaluation',
    ],

    # What NOT to mention (sales language)
    'never_mention': [
        'Pricing',
        'Paid plans',
        'Subscription',
        'API access',
        'Enterprise',
        'Premium',
        'Upgrade',
        'Pro plan',
        'Explorer plan',
        'Free trial',
        'Sign up',
        'Register',
        'Buy',
        'Purchase',
        'Discount',
        'Offer',
    ],

    # Soft CTAs (curiosity-driven, not sales-driven)
    'allowed_ctas': [
        'See the data →',
        'Check it yourself →',
        'The scores are public →',
        'Voir les donnees →',
        'Full analysis →',
        'How does your wallet compare? →',
        'Curious? →',
    ],

    # Forbidden CTAs (sales language)
    'forbidden_ctas': [
        'Start your free trial',
        'Upgrade now',
        'Get API access',
        'Subscribe',
        'Buy now',
        'Unlock premium',
        'Sign up now',
        'Register today',
        'Get started',
        'Try for free',
        'Claim your',
        'Don\'t miss',
        'Limited time',
        'Act now',
    ],

    # Soft selling principles
    'soft_selling': {
        'goal': 'Create curiosity that leads naturally to the website',
        'method': 'Value first, never mention paid features',
        'psychology': 'They discover paid options on site, not in content',
        'tone': 'Expert sharing insights, not salesperson',
    },
}

# ============================================
# URL WHITELIST FOR MARKETING
# ============================================

MARKETING_ALLOWED_URLS = [
    'safescoring.io',
    'safescoring.io/products',
    'safescoring.io/products/{slug}',
    'safescoring.io/transparency',
    'safescoring.io/methodology',
    'safescoring.io/compare',
    'safescoring.io/compare/{slug1}/{slug2}',
    'safescoring.io/blog',
    'safescoring.io/blog/{slug}',
]

MARKETING_FORBIDDEN_URLS = [
    'safescoring.io/pricing',
    'safescoring.io/api-docs',
    'safescoring.io/dashboard',  # Requires login
    'safescoring.io/certification',
    'safescoring.io/partners',  # B2B/affiliate
]

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_random_free_phrase(feature_key: str = None) -> str:
    """Get a random marketing phrase for a free feature"""
    import random

    if feature_key and feature_key in FREE_FEATURES:
        return random.choice(FREE_FEATURES[feature_key]['marketing_phrases'])

    # Random from any free feature
    all_phrases = []
    for feature in FREE_FEATURES.values():
        all_phrases.extend(feature['marketing_phrases'])
    return random.choice(all_phrases)


def get_allowed_cta() -> str:
    """Get a random allowed CTA"""
    import random
    return random.choice(MARKETING_RULES['allowed_ctas'])


def is_url_allowed(url: str) -> bool:
    """Check if a URL is allowed in marketing"""
    for forbidden in MARKETING_FORBIDDEN_URLS:
        if forbidden.replace('safescoring.io', '') in url:
            return False
    return True


def check_content_for_paid_mentions(content: str) -> list:
    """Check if content mentions paid features"""
    issues = []
    content_lower = content.lower()

    for term in MARKETING_RULES['never_mention']:
        if term.lower() in content_lower:
            issues.append(f"Mentions paid feature: '{term}'")

    for cta in MARKETING_RULES['forbidden_ctas']:
        if cta.lower() in content_lower:
            issues.append(f"Uses forbidden CTA: '{cta}'")

    return issues


def sanitize_marketing_content(content: str) -> str:
    """Remove or replace paid feature mentions"""
    replacements = {
        'start your free trial': 'check your score for free',
        'upgrade': 'explore',
        'premium': 'full',
        'subscribe': 'sign up',
        'api access': 'security scores',
        'pro plan': 'free access',
    }

    result = content
    for old, new in replacements.items():
        result = result.replace(old, new)
        result = result.replace(old.title(), new.title())
        result = result.replace(old.upper(), new.upper())

    return result


# ============================================
# CONTENT TEMPLATES (FREE ONLY)
# ============================================

FREEMIUM_TWITTER_TEMPLATES = [
    # Curiosity hook - score reveal
    """Your wallet's security score is already public.

Have you seen it?

safescoring.io""",

    # Social proof + data
    """We've analyzed {count}+ crypto products.

Some score 90%+.
Others... don't.

The data is public → safescoring.io/transparency""",

    # Question that creates need
    """Quick question:

Do you know your wallet's security score?

(Most people don't. Then they wonder what went wrong.)

safescoring.io""",

    # Specific product curiosity
    """{product_name}: {score}%

Curious how that compares to alternatives?

safescoring.io/products/{slug}""",

    # Authority + transparency
    """2376 security criteria.
{count}+ products analyzed.
All results public.

No opinions. Just data.

safescoring.io""",

    # Fear converted to curiosity
    """A popular wallet scored 41% on our security analysis.

Not saying which one.

But you can check them all → safescoring.io""",

    # Insight that creates value
    """Interesting finding:

Only 12% of wallets have all 3:
• Independent audit
• Open source code
• Bug bounty program

See which ones → safescoring.io""",
]

FREEMIUM_REDDIT_TEMPLATES = [
    {
        'title': 'Found a site that publicly rates wallet security (interesting data)',
        'body': """Been researching wallet security and stumbled on safescoring.io

They analyze wallets against 2376 security criteria. All scores are public.

What caught my attention:
- Some well-known wallets scored surprisingly low
- The methodology is transparent (you can see exactly what they check)
- No sponsored rankings

Useful for anyone comparing options. Thought I'd share.

What wallet are you using? Curious to see how it scores."""
    },
    {
        'title': 'PSA: Your wallet\'s security score might be lower than you think',
        'body': """Just discovered that security ratings for most wallets are publicly available.

Checked mine on safescoring.io - was not expecting that score.

They check 2376 things apparently. Some wallets fail basic checks.

Might be worth looking up yours before something happens."""
    },
    {
        'title': 'Interesting security data on crypto wallets',
        'body': """Found some interesting stats:

- Average wallet security score: {avg}%
- Only {excellent_pct}% score above 90%
- {poor_pct}% score below 50%

Source: safescoring.io/transparency

Made me reconsider my setup. Anyone else check their wallet's score?"""
    },
]


# Export for use by other modules
__all__ = [
    'FREE_FEATURES',
    'PAID_FEATURES',
    'MARKETING_RULES',
    'MARKETING_ALLOWED_URLS',
    'get_random_free_phrase',
    'get_allowed_cta',
    'is_url_allowed',
    'check_content_for_paid_mentions',
    'sanitize_marketing_content',
    'FREEMIUM_TWITTER_TEMPLATES',
    'FREEMIUM_REDDIT_TEMPLATES',
]
