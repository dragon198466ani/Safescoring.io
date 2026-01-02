#!/usr/bin/env python3
"""
SafeScoring Brand Voice & Style Guide
Centralized guidelines for ALL content generation.

This file is imported by all content generators to ensure consistency.
"""

# ============================================
# BRAND IDENTITY
# ============================================

BRAND = {
    'name': 'SafeScoring',
    'tagline': 'Crypto Security Ratings You Can Trust',
    'mission': 'Making crypto safer by providing objective security assessments',
    'url': 'https://safescoring.io',

    # Key differentiators
    'unique_value': [
        '916 security norms - most comprehensive in the industry',
        'Objective methodology - no pay-to-play ratings',
        'SAFE framework - Security, Audit, Functionality, Experience',
        'Real-time updates - scores change as products evolve',
        'Free tier available - security info for everyone'
    ]
}

# ============================================
# VOICE & TONE
# ============================================

VOICE = {
    'primary_traits': {
        'trustworthy': 'We back every claim with data. No hype, just facts.',
        'helpful': 'We educate first, promote second. Value over visibility.',
        'objective': 'We present findings neutrally. Let data speak.',
        'accessible': 'Complex security concepts made understandable.'
    },

    'tone_by_context': {
        'incident_alert': {
            'tone': 'Urgent but calm, informative not alarmist',
            'example': '⚠️ Security incident detected at [Protocol]. Here\'s what we know and what you should do.'
        },
        'educational': {
            'tone': 'Friendly teacher, patient and clear',
            'example': 'Ever wondered how hardware wallets actually protect your crypto? Let\'s break it down.'
        },
        'product_review': {
            'tone': 'Professional analyst, balanced and thorough',
            'example': '[Product] scores 82/100 on security. Strong in audits, room for improvement in UX.'
        },
        'promotional': {
            'tone': 'Confident but not pushy, value-focused',
            'example': 'Check your wallet\'s security score - it takes 10 seconds and might save your crypto.'
        }
    }
}

# ============================================
# WRITING RULES
# ============================================

WRITING_RULES = {
    'do': [
        'Lead with value - what does the reader gain?',
        'Use data and specific numbers when available',
        'Cite sources for external claims',
        'Include clear call-to-action',
        'Keep sentences short (15-20 words avg)',
        'Use active voice',
        'Explain technical terms on first use',
        'End with a question to encourage engagement',
        'Use "you" and "your" - speak to the reader directly'
    ],

    'avoid': [
        'Hype words: revolutionary, game-changing, amazing, incredible',
        'Financial advice: buy, sell, invest, guaranteed returns',
        'Absolute claims: always, never, 100% secure, unhackable',
        'FUD: fear-mongering without actionable advice',
        'Competitor attacks: naming competitors negatively',
        'Excessive punctuation: !!!, ???, ...',
        'ALL CAPS for emphasis (use **bold** instead)',
        'More than 3 emojis per post',
        'More than 3 hashtags per post',
        'Self-promotion without value: "Check us out!"'
    ],

    'formatting': {
        'twitter': {
            'max_length': 280,
            'emojis': '1-2 max, meaningful not decorative',
            'hashtags': '1-2 relevant, at end',
            'links': 'Shortened, at end if possible',
            'structure': 'Hook → Value → CTA'
        },
        'linkedin': {
            'max_length': 3000,
            'emojis': 'Minimal, professional',
            'hashtags': '3-5, researched',
            'structure': 'Hook → Story → Insight → CTA'
        },
        'reddit': {
            'max_length': 10000,
            'emojis': 'None or minimal',
            'formatting': 'Use markdown, headers, bullet points',
            'structure': 'TL;DR at top, details below'
        },
        'email': {
            'subject_length': '6-10 words',
            'preview_text': 'First 50 chars matter',
            'cta': 'One primary CTA per email',
            'structure': 'Personal → Value → CTA → PS'
        }
    }
}

# ============================================
# CONTENT TEMPLATES
# ============================================

TEMPLATES = {
    # Security Alert
    'incident_alert': {
        'twitter': """⚠️ {severity} Security Alert: {title}

{one_sentence_summary}

Who's affected: {affected}
What to do: {action}

Details: {link}

#CryptoSecurity""",

        'email_subject': '⚠️ Security Alert: {title} - Action May Be Required',

        'discord': """🚨 **Security Alert**

**{title}**

{summary}

**Impact:** {impact}
**Recommended Action:** {action}

[Full Details]({link})"""
    },

    # Product Score
    'product_score': {
        'twitter': """🔒 {product_name} Security Analysis

SafeScore: **{score}/100**

{one_key_finding}

Full report: {link}""",

        'detailed': """## {product_name} Security Rating

**Overall SafeScore: {score}/100**

### SAFE Breakdown
- **S**ecurity: {s}/100 - {s_summary}
- **A**udit: {a}/100 - {a_summary}
- **F**unctionality: {f}/100 - {f_summary}
- **E**xperience: {e}/100 - {e_summary}

### Key Findings
{findings}

### Recommendation
{recommendation}

[View Full Report]({link})"""
    },

    # Educational
    'educational': {
        'twitter_thread': """🧵 {topic}

Here's what you need to know 👇

1/ {point_1}

2/ {point_2}

3/ {point_3}

4/ {point_4}

5/ Key takeaway: {takeaway}

Questions? Drop them below!

#CryptoSecurity #Web3""",

        'linkedin': """**{topic}**

{hook}

Here's what I've learned from analyzing {number} crypto products:

📊 {insight_1}

📊 {insight_2}

📊 {insight_3}

The bottom line: {conclusion}

What's your experience with this? I'd love to hear your thoughts.

#CryptoSecurity #Blockchain #DeFi"""
    },

    # Comparison
    'comparison': {
        'twitter': """⚔️ {product_a} vs {product_b}

Security comparison:
• {product_a}: {score_a}/100
• {product_b}: {score_b}/100

Winner: {winner} (+{diff} pts)

Full comparison: {link}""",

        'detailed': """# {product_a} vs {product_b}: Security Comparison

## Quick Verdict
**{winner}** leads with a {diff}-point advantage in overall security.

## Score Breakdown

| Metric | {product_a} | {product_b} |
|--------|-------------|-------------|
| Overall | {score_a} | {score_b} |
| Security | {s_a} | {s_b} |
| Audit | {a_a} | {a_b} |
| Functionality | {f_a} | {f_b} |
| Experience | {e_a} | {e_b} |

## Key Differences

### Where {product_a} excels:
{product_a_strengths}

### Where {product_b} excels:
{product_b_strengths}

## Recommendation
{recommendation}

[Interactive Comparison Tool]({link})"""
    }
}

# ============================================
# HASHTAG STRATEGY
# ============================================

HASHTAGS = {
    'primary': ['#CryptoSecurity', '#SafeScoring'],
    'secondary': ['#DeFi', '#Web3', '#Crypto', '#Blockchain'],

    'by_topic': {
        'hardware_wallets': ['#HardwareWallet', '#ColdStorage', '#Ledger', '#Trezor'],
        'defi': ['#DeFi', '#DeFiSecurity', '#SmartContracts', '#Yield'],
        'exchanges': ['#CryptoExchange', '#Trading', '#CEX'],
        'nft': ['#NFT', '#NFTSecurity', '#Web3'],
        'security_incident': ['#CryptoHack', '#SecurityAlert', '#StaySafe']
    },

    'avoid': ['#crypto', '#bitcoin', '#ethereum']  # Too generic, spam-associated
}

# ============================================
# EMOJI GUIDE
# ============================================

EMOJIS = {
    'approved': {
        '🔒': 'security, protection',
        '✅': 'verified, approved, good',
        '⚠️': 'warning, caution',
        '🚨': 'alert, urgent (use sparingly)',
        '📊': 'data, statistics',
        '🔍': 'analysis, research',
        '💡': 'tip, insight',
        '🧵': 'thread indicator',
        '👇': 'continue reading',
        '🏆': 'winner, top rated'
    },

    'avoid': {
        '🚀': 'associated with pump schemes',
        '💰': 'money-focused, scammy',
        '🔥': 'hype language',
        '💎': 'diamond hands, meme culture',
        '🌙': 'to the moon, speculation'
    },

    'max_per_post': {
        'twitter': 2,
        'linkedin': 1,
        'reddit': 0,
        'email': 1
    }
}

# ============================================
# QUALITY THRESHOLDS
# ============================================

QUALITY_THRESHOLDS = {
    'auto_publish': 85,      # Score needed to auto-publish
    'needs_review': 70,      # Below this needs human review
    'reject': 50,            # Below this is rejected

    'criteria_weights': {
        'grammar': 15,
        'brand_voice': 20,
        'accuracy': 25,
        'engagement': 15,
        'seo': 10,
        'spam_check': 15
    }
}


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_template(template_type: str, format: str = 'twitter') -> str:
    """Get content template"""
    template_group = TEMPLATES.get(template_type, {})
    return template_group.get(format, template_group.get('twitter', ''))


def get_hashtags(topic: str, max_count: int = 2) -> list:
    """Get relevant hashtags for topic"""
    tags = HASHTAGS['primary'][:1]  # Always include primary

    topic_tags = HASHTAGS['by_topic'].get(topic, [])
    tags.extend(topic_tags[:max_count - 1])

    return tags[:max_count]


def check_content_rules(content: str) -> dict:
    """Quick check against writing rules"""
    issues = []

    # Check for avoided words
    avoid_patterns = [
        'revolutionary', 'game-changing', 'amazing', 'incredible',
        'guaranteed', '100% secure', 'unhackable', 'buy now',
        'invest in', 'don\'t miss'
    ]

    for pattern in avoid_patterns:
        if pattern.lower() in content.lower():
            issues.append(f"Avoid using: '{pattern}'")

    # Check emoji count
    import re
    emoji_count = len(re.findall(r'[\U0001F300-\U0001F9FF]', content))
    if emoji_count > 3:
        issues.append(f"Too many emojis: {emoji_count} (max 3)")

    # Check exclamation marks
    if content.count('!') > 2:
        issues.append(f"Too many exclamation marks: {content.count('!')}")

    # Check caps ratio
    if len(content) > 20:
        caps = sum(1 for c in content if c.isupper())
        if caps / len(content) > 0.2:
            issues.append("Too much CAPS text")

    return {
        'passed': len(issues) == 0,
        'issues': issues
    }


# Export for use by other modules
__all__ = [
    'BRAND', 'VOICE', 'WRITING_RULES', 'TEMPLATES',
    'HASHTAGS', 'EMOJIS', 'QUALITY_THRESHOLDS',
    'get_template', 'get_hashtags', 'check_content_rules'
]
