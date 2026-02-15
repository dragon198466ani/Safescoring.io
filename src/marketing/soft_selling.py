#!/usr/bin/env python3
"""
Soft Selling Strategy for SafeScoring
The art of selling without selling.

STRATEGY:
1. Give massive FREE value (scores, insights, education)
2. Create curiosity/need naturally
3. Lead to website where paid features are discovered organically
4. Never mention "paid", "premium", "subscribe" in content

PSYCHOLOGY:
- People buy what they NEED, not what you SELL
- Create the problem awareness → they discover the solution
- "Show don't tell" - let them see value, then want more
"""

import random

# ============================================
# SOFT SELLING HOOKS
# ============================================

# These hooks create curiosity and lead to the site
CURIOSITY_HOOKS = {
    # Score-based hooks (creates need to check their own products)
    'score_reveal': [
        "Your wallet's security score is public. Have you checked it?",
        "We just rated {product_name}. The result surprised us.",
        "{product_name} dropped 12 points this month. Here's why.",
        "Only 3 wallets scored above 90% this month.",
        "The average crypto wallet scores {avg}%. Where does yours stand?",
    ],

    # Fear of missing out (FOMO on security info)
    'security_fomo': [
        "A vulnerability was just found in a popular wallet. Is yours affected?",
        "We analyzed {count} wallets. {fail_count} failed basic security checks.",
        "This security flaw affects 40% of DeFi users. Quick check →",
        "Before you use {product_name}, you should see this.",
    ],

    # Authority/expertise (positions SafeScoring as the source)
    'authority': [
        "We evaluate 2159 security norms. Most products fail half.",
        "87% of hacked projects were audited. We measure what audits miss.",
        "After analyzing {count}+ products, here's what we learned.",
        "The security data nobody else is showing you.",
    ],

    # Comparison hooks (leads to compare feature)
    'comparison': [
        "{product_a} vs {product_b}: One scores 30% higher. Guess which.",
        "We compared the top 5 wallets. The ranking might surprise you.",
        "Hardware vs Software wallets: The data is clear.",
        "Which is safer? We have the numbers.",
    ],

    # Educational hooks (value-first, site as resource)
    'educational': [
        "3 security checks you should do before using any wallet.",
        "The one feature that separates secure wallets from the rest.",
        "Why your seed phrase backup might not be enough.",
        "What 'audited' actually means (and why it's not enough).",
    ],
}

# ============================================
# SOFT CTAs (Never say "buy", "subscribe", "paid")
# ============================================

SOFT_CTAS = {
    # Curiosity-driven (they want to know more)
    'curiosity': [
        "See the full breakdown →",
        "Check it yourself →",
        "The data is public →",
        "See where your wallet ranks →",
        "Full analysis here →",
    ],

    # Value-driven (they get something)
    'value': [
        "Get your free security score →",
        "Run a quick check →",
        "See the methodology →",
        "Explore the ratings →",
    ],

    # Social proof (others are using it)
    'social': [
        "Join 10,000+ checking their security →",
        "See what others discovered →",
        "The community's top-rated products →",
    ],

    # Urgency without pressure
    'soft_urgency': [
        "Scores update monthly. Current ratings →",
        "New products added this week →",
        "Latest security data →",
    ],
}

# ============================================
# COMPLETE SOFT-SELL TEMPLATES
# ============================================

SOFT_SELL_TWEETS = [
    # Template 1: Score reveal + curiosity
    """{product_name} just got rated.

Security score: {score}%

{one_liner_insight}

See the full breakdown → safescoring.io/products/{slug}""",

    # Template 2: Problem awareness + solution discovery
    """Most people don't check their wallet's security score.

Then they wonder why they got hacked.

Your wallet's score is public. Maybe check it?

safescoring.io""",

    # Template 3: Comparison hook
    """{product_a}: {score_a}%
{product_b}: {score_b}%

Same category. Different security.

See what makes the difference → safescoring.io/compare/{slug_a}/{slug_b}""",

    # Template 4: Fear converted to action
    """A wallet you probably use scored below 50% on security.

Not saying which one.

But you can check all of them here → safescoring.io/products""",

    # Template 5: Authority + value
    """We analyze 2159 security criteria for every crypto product.

Some pass. Many don't.

All results are public → safescoring.io/transparency""",

    # Template 6: Educational + soft lead
    """3 things that make a wallet "secure":
• Independent audit ✓
• Open source code ✓
• Bug bounty program ✓

Most wallets have 1 or 2. Few have all 3.

See which ones → safescoring.io""",

    # Template 7: Social proof
    """10,000+ people checked their wallet's security score this month.

Some were relieved.
Others switched wallets.

What about you? → safescoring.io""",

    # Template 8: Specific insight
    """Interesting finding:

Hardware wallets avg score: {hw_avg}%
Software wallets avg score: {sw_avg}%

But the best software wallet beats most hardware ones.

Data → safescoring.io/transparency""",

    # Template 9: Question hook
    """Quick question:

Do you know your wallet's security score?

(If the answer is no, maybe that's the problem)

safescoring.io""",

    # Template 10: Incident-triggered
    """Another {amount} lost to a wallet exploit.

Before you check if you're affected:
Maybe check your wallet's security score first.

safescoring.io/products""",
]

# Reddit soft-sell (more subtle, community-focused)
SOFT_SELL_REDDIT = [
    {
        'title': "I found a free tool that rates crypto wallet security",
        'body': """Been researching wallet security and found safescoring.io

They rate wallets against 2159 security criteria. All scores are public.

What I liked:
- Can compare any two products
- Shows exactly why each score is what it is
- Some popular wallets scored surprisingly low

Not affiliated, just sharing because it's actually useful.

Anyone else use this?"""
    },
    {
        'title': "PSA: Your wallet's security score is probably public",
        'body': """Just discovered that sites like safescoring.io publicly rate wallet security.

Checked my main wallet - it scored lower than I expected.

Might be worth checking yours before something happens.

The methodology is transparent (2159 norms they check for)."""
    },
    {
        'title': "Interesting data on wallet security ratings",
        'body': """Found this breakdown of wallet security scores:

- Average score: {avg}%
- Only {excellent_pct}% score "Excellent" (90%+)
- {poor_pct}% score below 50%

Source: safescoring.io/transparency

Made me rethink which wallet I'm using for cold storage."""
    },
]

# ============================================
# LINKEDIN SOFT-SELL (Professional angle)
# ============================================

SOFT_SELL_LINKEDIN = [
    """In 2024, $2.2B was lost to crypto hacks.

87% of those projects had been audited.

Audits check code. But security is more than code.

At SafeScoring, we evaluate 2159 criteria across 4 dimensions:
• Security (cryptography, key management)
• Adversity (duress protection, coercion resistance)
• Fidelity (track record, transparency)
• Efficiency (usability, accessibility)

All ratings are public: safescoring.io

The goal isn't to scare anyone. It's to give everyone the same security intel that institutions have.

#CryptoSecurity #RiskManagement""",

    """Interesting pattern I've noticed:

Products with open source code score 23% higher on average.
Products with bug bounty programs score 31% higher.
Products with independent audits score 18% higher.

But very few have all three.

We track this across {count}+ products at safescoring.io

The data might surprise you.

#Crypto #Security #Transparency""",
]

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_soft_hook(hook_type: str = None, **kwargs) -> str:
    """Get a soft-selling hook with variables filled in"""
    if hook_type and hook_type in CURIOSITY_HOOKS:
        hooks = CURIOSITY_HOOKS[hook_type]
    else:
        # Random from all hooks
        all_hooks = []
        for hooks_list in CURIOSITY_HOOKS.values():
            all_hooks.extend(hooks_list)
        hooks = all_hooks

    hook = random.choice(hooks)

    # Fill in variables
    for key, value in kwargs.items():
        hook = hook.replace(f'{{{key}}}', str(value))

    return hook


def get_soft_cta(cta_type: str = None) -> str:
    """Get a soft CTA"""
    if cta_type and cta_type in SOFT_CTAS:
        ctas = SOFT_CTAS[cta_type]
    else:
        all_ctas = []
        for ctas_list in SOFT_CTAS.values():
            all_ctas.extend(ctas_list)
        ctas = all_ctas

    return random.choice(ctas)


def get_soft_tweet(**kwargs) -> str:
    """Get a complete soft-sell tweet"""
    template = random.choice(SOFT_SELL_TWEETS)

    # Fill in variables
    for key, value in kwargs.items():
        template = template.replace(f'{{{key}}}', str(value))

    return template


def create_soft_sell_content(data: dict, platform: str = 'twitter') -> str:
    """
    Create soft-selling content for a platform.

    The content:
    1. Provides genuine value or insight
    2. Creates natural curiosity
    3. Leads to website where paid options exist
    4. Never mentions pricing or paid features
    """
    if platform == 'twitter':
        return get_soft_tweet(**data)
    elif platform == 'reddit':
        template = random.choice(SOFT_SELL_REDDIT)
        title = template['title'].format(**data) if '{' in template['title'] else template['title']
        body = template['body'].format(**data) if '{' in template['body'] else template['body']
        return {'title': title, 'body': body}
    elif platform == 'linkedin':
        template = random.choice(SOFT_SELL_LINKEDIN)
        return template.format(**data) if '{' in template else template
    else:
        return get_soft_tweet(**data)


# ============================================
# LANDING PAGE STRATEGIES
# ============================================

# Where each hook should lead (for maximum conversion)
HOOK_TO_LANDING = {
    'score_reveal': '/products/{slug}',      # See the specific product
    'security_fomo': '/products',             # Browse all to check theirs
    'authority': '/methodology',              # Build trust, then explore
    'comparison': '/compare/{slug_a}/{slug_b}',  # Direct comparison
    'educational': '/blog/{article}',         # Value first, CTA in article
}

# Once on site, the natural flow leads to:
# 1. Free score check → "want more details" → signup
# 2. Compare 2 products → "want to compare more" → paid plan
# 3. Check methodology → "want to verify my products" → signup
# 4. Read blog → internal links → product pages → signup


# Export
__all__ = [
    'CURIOSITY_HOOKS',
    'SOFT_CTAS',
    'SOFT_SELL_TWEETS',
    'SOFT_SELL_REDDIT',
    'SOFT_SELL_LINKEDIN',
    'get_soft_hook',
    'get_soft_cta',
    'get_soft_tweet',
    'create_soft_sell_content',
    'HOOK_TO_LANDING',
]
