# SEO Product Review Template

Use this template to generate blog articles for each product scored.
Each article = 1 SEO-optimized page targeting long-tail keywords.

---

## Target Keywords (per product)

- "[product name] security review"
- "is [product name] safe"
- "[product name] security score"
- "[product name] vs [competitor]"
- "best [product type] security 2026"
- "[product name] hack risk"

---

## Article Structure

### Title
`[Product Name] Security Score: [SCORE]/100 — Full SAFE Analysis (2026)`

### Meta Description (155 chars max)
`Is [Product Name] safe? We scored it [SCORE]/100 across 916 security norms. See the full SAFE breakdown: Security, Adversity, Fidelity & Efficiency.`

### URL
`/blog/[product-slug]-security-review`

---

## Content Outline

### 1. Hook (100 words)
```
In [month] 2026, we evaluated [Product Name] using our SAFE framework —
916 security norms covering everything from cryptographic standards to
disaster recovery.

**The result: [SCORE]/100.**

Here's what that means for your crypto security.
```

### 2. Score Overview (150 words)
```
## [Product Name] SafeScore: [SCORE]/100

| Pillar | Score | Grade |
|--------|-------|-------|
| **S** — Security | [S_SCORE]/100 | [GRADE] |
| **A** — Adversity | [A_SCORE]/100 | [GRADE] |
| **F** — Fidelity | [F_SCORE]/100 | [GRADE] |
| **E** — Efficiency | [E_SCORE]/100 | [GRADE] |

[Link to full score page: safescoring.io/products/[slug]]
```

### 3. Pillar-by-Pillar Breakdown (400 words)
```
### Security ([S_SCORE]/100)
[Top 3 strengths in this pillar]
[Top 3 weaknesses in this pillar]

### Adversity ([A_SCORE]/100)
[Does it have duress PIN? Hidden wallets? Backup recovery?]
[What happens if someone physically coerces you?]

### Fidelity ([F_SCORE]/100)
[Has it been audited? Bug bounty? Update frequency?]
[Governance and regulatory compliance]

### Efficiency ([E_SCORE]/100)
[Multi-chain support? Mobile? UI/UX quality?]
[Transaction speed and accessibility]
```

### 4. Compared to Alternatives (200 words)
```
## How [Product Name] Compares

| Product | SafeScore | Type |
|---------|-----------|------|
| [Product] | [SCORE] | [TYPE] |
| [Competitor 1] | [SCORE] | [TYPE] |
| [Competitor 2] | [SCORE] | [TYPE] |

[Link to comparison pages]
```

### 5. Should You Use [Product Name]? (150 words)
```
## Our Verdict

[Product Name] scores [GRADE] overall.

**Best for:** [Use case]
**Not ideal for:** [Use case]

[If score < 50: "Consider alternatives with higher security scores."]
[If score >= 80: "One of the most secure options in its category."]
```

### 6. CTA
```
## Check Your Full Stack

Your wallet is only as secure as your weakest tool.

→ [Check your setup score](https://safescoring.io/dashboard/setups)
→ [Browse all scores](https://safescoring.io/products)

---

*Last updated: [DATE]. Scores are recalculated monthly using the latest
available data. Methodology: [916 norms](/methodology).*
```

---

## Internal Linking Strategy

Every article should link to:
1. The product's score page (`/products/[slug]`)
2. The methodology page (`/methodology`)
3. 2-3 comparison pages (`/compare/[slug]/[competitor]`)
4. The setup builder (`/dashboard/setups`)
5. 1-2 related hack analysis pages (`/hacks/[relevant-hack]`)
6. The leaderboard (`/leaderboard`)

---

## Schema.org Markup (auto-generated)

```json
{
  "@type": "Review",
  "itemReviewed": {
    "@type": "SoftwareApplication",
    "name": "[Product Name]"
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "[SCORE/20]",
    "bestRating": "5"
  },
  "author": {
    "@type": "Organization",
    "name": "SafeScoring"
  }
}
```

---

## Publishing Checklist

- [ ] Title includes product name + score
- [ ] Meta description under 155 chars
- [ ] At least 3 internal links
- [ ] Score data is current (check last evaluation date)
- [ ] Comparison table includes top 3 competitors
- [ ] CTA links to setup builder
- [ ] Image: OG card from /api/og/products/[slug]
