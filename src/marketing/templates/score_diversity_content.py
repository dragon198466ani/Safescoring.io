#!/usr/bin/env python3
"""
Score Diversity Content Templates
Content that proves SafeScoring rates objectively with varied scores.
"""

# Twitter templates showcasing score range
TWITTER_SCORE_DIVERSITY = [
    # High vs Low comparison
    """Not all crypto products are created equal.

Our latest ratings:
• {high_product}: {high_score}% ✓
• {low_product}: {low_score}% ✗

Same {product_type} category, very different security.

That's what objective ratings look like.

safescoring.io/transparency""",

    # Average score reality
    """Average SafeScore across {count} products: {avg}%

That means:
• {above_avg}% score above average
• {below_avg}% score below average

We don't give everyone an A+.
We give you the truth.

safescoring.io/transparency""",

    # Score distribution
    """Score distribution across {count} {product_type}:

🟢 Excellent (90-100): {excellent}
🔵 Good (70-89): {good}
🟡 Average (50-69): {average}
🔴 Poor (<50): {poor}

Real ratings. Real differences.

safescoring.io""",

    # Bottom performers
    """Some products don't pass our security review.

In {product_type}, {fail_count} products scored below 50%.

We name names. We show the data.

Because your security matters more than their reputation.

safescoring.io/transparency""",

    # Top vs Bottom
    """Security gap in {product_type}:

Best: {best_name} at {best_score}%
Worst: {worst_name} at {worst_score}%

A {gap}% difference.

This is why independent ratings matter.

safescoring.io/compare/{best_slug}/{worst_slug}""",

    # No perfect scores
    """No product on SafeScoring has scored 100%.

Even our top-rated {product_type}, {top_name}, has gaps.

Score: {top_score}%
Missing: {missing_feature}

Perfection doesn't exist. But transparency does.

safescoring.io/products/{top_slug}""",

    # Monthly changes
    """Score changes this month:

📈 Improved: {improved_count} products
📉 Declined: {declined_count} products
➡️ Unchanged: {unchanged_count} products

Scores aren't static. Neither is security.

safescoring.io/transparency""",
]

# Reddit post templates
REDDIT_SCORE_DIVERSITY = [
    {
        "title": "We rated {count} {product_type} - here's the honest breakdown",
        "body": """I run SafeScoring.io where we evaluate crypto products against {norm_count} security norms.

Here's what we found for {product_type}:

**Score Distribution:**
| Range | Count | % |
|-------|-------|---|
| Excellent (90-100) | {excellent} | {excellent_pct}% |
| Good (70-89) | {good} | {good_pct}% |
| Average (50-69) | {average} | {average_pct}% |
| Poor (30-49) | {poor} | {poor_pct}% |
| Critical (<30) | {critical} | {critical_pct}% |

**Top 3:**
1. {top1_name} - {top1_score}%
2. {top2_name} - {top2_score}%
3. {top3_name} - {top3_score}%

**Bottom 3:**
1. {bottom1_name} - {bottom1_score}%
2. {bottom2_name} - {bottom2_score}%
3. {bottom3_name} - {bottom3_score}%

**Why the big gap?**
The main differences come from:
- Independent security audits (or lack thereof)
- Open source code availability
- Bug bounty programs
- Key management practices

Full methodology: safescoring.io/methodology
All scores: safescoring.io/transparency

Happy to answer questions about specific products."""
    },
    {
        "title": "Why we gave {product_name} a {score}% security score",
        "body": """We just published our evaluation of {product_name} on SafeScoring.io.

**Score: {score}%**

Here's the breakdown by pillar:
- **Security (S):** {s_score}% - {s_reason}
- **Adversity (A):** {a_score}% - {a_reason}
- **Fidelity (F):** {f_score}% - {f_reason}
- **Efficiency (E):** {e_score}% - {e_reason}

**What would improve their score:**
{improvement_list}

**How they compare to alternatives:**
- Best in category: {best_name} at {best_score}%
- Category average: {category_avg}%
- {product_name}: {score}%

Full report: safescoring.io/products/{slug}

Note: We have no affiliation with {product_name}. We rate based on public data and security standards."""
    }
]

# LinkedIn content
LINKEDIN_SCORE_DIVERSITY = [
    """📊 The uncomfortable truth about crypto security

We've evaluated {count}+ crypto products. The results might surprise you:

• Only {excellent_pct}% score "Excellent" (90%+)
• {poor_pct}% score "Poor" or worse (<50%)
• Average score: {avg}%

This isn't about FUD. It's about facts.

At SafeScoring, we rate every product against {norm_count} security norms. Same standards for everyone. No pay-to-play.

Some products don't like their scores. But our job isn't to make friends—it's to help users make informed decisions.

📈 View the full distribution: safescoring.io/transparency

What matters more: a good rating or the truth?

#CryptoSecurity #DeFi #BlockchainSecurity""",

    """I gave a well-known crypto product a score of {score}%.

They weren't happy.

But here's the thing: security isn't a popularity contest.

Their score was low because:
❌ No independent security audit
❌ Closed source code
❌ No bug bounty program
❌ Limited recovery options

Meanwhile, their competitor scored {competitor_score}% by doing the opposite.

This is why independent ratings matter.

At SafeScoring.io, we evaluate {count}+ products against {norm_count} security norms. Same methodology for everyone.

Some score high. Some score low. That's the point.

🔍 See all scores: safescoring.io/transparency

#CryptoSecurity #Transparency"""
]

# Email newsletter content
EMAIL_SCORE_DIVERSITY = {
    "subject": "Some products failed our security review this month",
    "preview": "{fail_count} products scored below 50%",
    "body": """Hi {name},

Not every product passes our security evaluation. This month, {fail_count} products scored below 50%.

**Why we publish low scores:**

Most rating sites only highlight winners. We show everything—good and bad.

Because when it comes to your crypto security, you deserve the full picture.

**This month's score distribution:**

Excellent (90-100%): {excellent} products
Good (70-89%): {good} products
Average (50-69%): {average} products
Below Average (<50%): {poor} products

**Notable changes:**

📈 Biggest improvement: {improved_name} (+{improved_delta}%)
📉 Biggest decline: {declined_name} ({declined_delta}%)

[View Full Transparency Report]

**Why scores change:**

Products can improve (new audit, bug bounty, open source) or decline (security incidents, abandoned development).

We re-evaluate regularly so scores reflect current reality.

Stay safe,
The SafeScoring Team

P.S. Know a product we should evaluate? Reply to this email."""
}

# Blog post outlines
BLOG_SCORE_DIVERSITY = [
    {
        "title": "Why {percent}% of {product_type} Failed Our Security Review",
        "outline": [
            "Introduction: The state of {product_type} security",
            "Our methodology: {norm_count} norms, 4 pillars",
            "The results: Score distribution",
            "Common failure points",
            "Case study: High scorer vs low scorer",
            "What users should look for",
            "How products can improve",
            "Conclusion: The path forward"
        ]
    },
    {
        "title": "The {gap}% Security Gap: Best vs Worst {product_type}",
        "outline": [
            "Two products, same category, vastly different security",
            "Product A: What they do right ({score_a}%)",
            "Product B: Where they fall short ({score_b}%)",
            "The key differences explained",
            "Why this matters for users",
            "Recommendations"
        ]
    }
]

def get_score_diversity_tweet(data: dict) -> str:
    """Generate a tweet about score diversity"""
    import random
    template = random.choice(TWITTER_SCORE_DIVERSITY)
    return template.format(**data)

def get_score_diversity_reddit(data: dict) -> dict:
    """Generate Reddit post about score diversity"""
    import random
    template = random.choice(REDDIT_SCORE_DIVERSITY)
    return {
        "title": template["title"].format(**data),
        "body": template["body"].format(**data)
    }
