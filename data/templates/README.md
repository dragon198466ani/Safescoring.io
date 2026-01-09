# SafeScoring Content Templates

Templates for creating marketing content quickly after security incidents.

## Available Templates

### 1. `article_hack_analysis.md`
Full-length blog article analyzing a hack. Use when:
- A major hack occurs ($1M+)
- We have pre-hack SafeScore data
- Good for SEO

**Publishing location:** `/hacks/[slug]` or blog

### 2. `twitter_thread_hack.md`
Twitter thread for rapid response. Use when:
- Any notable hack (even small)
- Want quick viral reach
- Within 24-48 hours of incident

**Publishing location:** Twitter/X

### 3. `article_comparison.md`
Product comparison article. Use when:
- High search volume comparison (e.g., "Ledger vs Trezor")
- Users asking for recommendations
- SEO content generation

**Publishing location:** `/compare/[product-a]-vs-[product-b]` or blog

## Quick Start

### For Hack Analysis

1. Copy `article_hack_analysis.md`
2. Replace all `[PLACEHOLDERS]`
3. Get SafeScore data from database
4. Post to `/hacks/[slug]`
5. Generate Twitter thread from `twitter_thread_hack.md`

### For Comparisons

1. Copy `article_comparison.md`
2. Get SafeScores for both products
3. Fill in comparison tables
4. Post to compare page or blog

## Automation

The SEO generator can auto-fill some templates:

```bash
# Generate hack analysis
python src/marketing/seo_generator.py --hack "Atomic Wallet"

# Generate comparison
python src/marketing/seo_generator.py --compare "ledger" "trezor"
```

## Checklist Before Publishing

- [ ] All placeholders replaced
- [ ] SafeScores are current (check database)
- [ ] Links work
- [ ] No typos in product names
- [ ] Sources cited
- [ ] CTA links to SafeScoring

## SEO Tips

1. **Title:** Include product name + "hack" or "vs" + year
2. **Meta description:** Include SafeScore number
3. **H1:** Match search intent exactly
4. **Internal links:** Link to product pages
5. **Images:** Add alt text with keywords

## Contact

Questions? Reach out to the content team.
