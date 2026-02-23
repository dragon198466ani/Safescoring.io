#!/usr/bin/env python3
"""
SAFESCORING.IO - SEO Content Auto-Generator
Automatically generates SEO-optimized pages and articles.

Generates:
- Product review pages
- "Is X safe?" pages
- Comparison articles
- Security guides
- Hack analysis articles
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.core.api_provider import AIProvider


class SEOGenerator:
    """
    Generates SEO-optimized content for SafeScoring.
    Target keywords with high search volume.
    """

    # High-value SEO templates
    TEMPLATES = {
        'is_safe': {
            'title': 'Is {product} Safe? Security Analysis {year}',
            'h1': 'Is {product} Safe to Use in {year}?',
            'meta_desc': 'Independent security analysis of {product}. SafeScore: {score}/100. See detailed breakdown of {product} security across 2376 criteria.',
            'keywords': ['is {product} safe', '{product} security', '{product} review {year}', '{product} hack', '{product} safe to use'],
            'search_volume': 'high'
        },
        'review': {
            'title': '{product} Review {year}: Security Score & Analysis',
            'h1': '{product} Security Review {year}',
            'meta_desc': 'Comprehensive {product} security review. Score: {score}/100 based on 2376 security norms. Updated {month} {year}.',
            'keywords': ['{product} review', '{product} review {year}', '{product} security review', '{product} analysis'],
            'search_volume': 'high'
        },
        'vs': {
            'title': '{product_a} vs {product_b}: Security Comparison {year}',
            'h1': '{product_a} vs {product_b}: Which is Safer?',
            'meta_desc': 'Compare {product_a} and {product_b} security scores. Side-by-side analysis based on 2376 criteria. See which is safer.',
            'keywords': ['{product_a} vs {product_b}', '{product_b} vs {product_a}', '{product_a} or {product_b}', 'compare {product_a} {product_b}'],
            'search_volume': 'very_high'
        },
        'best': {
            'title': 'Best {category} {year}: Top {count} by Security Score',
            'h1': 'Best {category} in {year} (Ranked by Security)',
            'meta_desc': 'Top {count} most secure {category} in {year}. Ranked by SafeScore based on 2376 security criteria. Updated monthly.',
            'keywords': ['best {category}', 'safest {category}', 'top {category} {year}', 'most secure {category}'],
            'search_volume': 'very_high'
        },
        'hack_analysis': {
            'title': '{project} Hack Analysis: What Happened & Lessons Learned',
            'h1': '{project} Hack: Complete Security Analysis',
            'meta_desc': 'Detailed analysis of the {project} hack. How it happened, funds lost, and how to protect yourself from similar attacks.',
            'keywords': ['{project} hack', '{project} hacked', '{project} exploit', '{project} security breach'],
            'search_volume': 'medium'
        },
        'guide': {
            'title': '{topic}: Complete Security Guide {year}',
            'h1': '{topic} Security Guide',
            'meta_desc': 'Complete guide to {topic}. Best practices, common mistakes, and how to stay safe. Updated for {year}.',
            'keywords': ['{topic} guide', '{topic} security', 'how to {topic} safely', '{topic} best practices'],
            'search_volume': 'medium'
        }
    }

    # High-value comparison pairs (search volume data)
    TOP_COMPARISONS = [
        ('Ledger Nano X', 'Trezor Model T', 12000),
        ('Ledger Nano S Plus', 'Trezor Safe 3', 8000),
        ('MetaMask', 'Trust Wallet', 15000),
        ('Coinbase', 'Binance', 20000),
        ('Coinbase', 'Kraken', 10000),
        ('Uniswap', 'SushiSwap', 5000),
        ('Phantom', 'Solflare', 4000),
        ('Aave', 'Compound', 3000),
        ('OpenSea', 'Blur', 8000),
        ('Ledger', 'Trezor', 25000),
    ]

    # High-value "best of" categories
    BEST_CATEGORIES = [
        ('Hardware Wallets', 15000),
        ('Software Wallets', 12000),
        ('Crypto Exchanges', 20000),
        ('DeFi Protocols', 8000),
        ('NFT Marketplaces', 6000),
        ('Staking Platforms', 5000),
        ('Cold Wallets', 10000),
        ('Hot Wallets', 8000),
        ('Bitcoin Wallets', 12000),
        ('Ethereum Wallets', 10000),
    ]

    # Security guide topics
    GUIDE_TOPICS = [
        'Hardware Wallet Setup',
        'Seed Phrase Security',
        'Crypto Wallet Security',
        'DeFi Security',
        'NFT Security',
        'Exchange Security',
        'Private Key Management',
        'Multi-Signature Wallets',
        'Cold Storage',
        'Phishing Protection',
    ]

    def __init__(self, output_dir: str = 'data/seo_content'):
        self.ai = AIProvider()
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.year = datetime.now().year
        self.month = datetime.now().strftime('%B')

    def generate_is_safe_article(self, product_name: str, product_slug: str,
                                   score: int, scores: Dict) -> Dict:
        """Generate 'Is X Safe?' article - highest converting format."""

        template = self.TEMPLATES['is_safe']

        # Generate content with AI
        prompt = f"""Ecris un article SEO complet sur la securite de {product_name}.

DONNEES:
- Produit: {product_name}
- SafeScore global: {score}/100
- Score Security (S): {scores.get('s', 0)}/100
- Score Adversity (A): {scores.get('a', 0)}/100
- Score Fidelity (F): {scores.get('f', 0)}/100
- Score Efficiency (E): {scores.get('e', 0)}/100

STRUCTURE DE L'ARTICLE:
1. Introduction (repondre directement a "Est-ce que {product_name} est sur?")
2. Notre verdict en bref (score + resume)
3. Analyse detaillee par pilier SAFE
4. Points forts
5. Points a ameliorer
6. Comparaison avec les alternatives
7. Conseils de securite
8. Conclusion + CTA

REGLES:
- Ton expert mais accessible
- Inclure des donnees chiffrees
- 800-1200 mots
- Optimise pour le SEO (mots-cles naturels)
- Pas de jargon excessif
- Terminer par un CTA vers SafeScoring

FORMAT: Retourne l'article en Markdown."""

        content = self.ai.call(prompt, max_tokens=2000, temperature=0.6)

        if not content:
            content = self._fallback_is_safe_content(product_name, score, scores)

        article = {
            'type': 'is_safe',
            'slug': f'is-{product_slug}-safe',
            'title': template['title'].format(product=product_name, year=self.year),
            'h1': template['h1'].format(product=product_name, year=self.year),
            'meta_description': template['meta_desc'].format(product=product_name, score=score),
            'keywords': [kw.format(product=product_name.lower()) for kw in template['keywords']],
            'content': content,
            'product_slug': product_slug,
            'score': score,
            'generated_at': datetime.now().isoformat(),
        }

        self._save_article(article)
        return article

    def generate_comparison_article(self, product_a: str, slug_a: str, score_a: int,
                                      product_b: str, slug_b: str, score_b: int) -> Dict:
        """Generate comparison article - very high search volume."""

        template = self.TEMPLATES['vs']
        winner = product_a if score_a > score_b else product_b if score_b > score_a else "tie"

        prompt = f"""Ecris un article de comparaison SEO entre {product_a} et {product_b}.

DONNEES:
- {product_a}: SafeScore {score_a}/100
- {product_b}: SafeScore {score_b}/100
- Gagnant: {winner}

STRUCTURE:
1. Introduction (question: lequel choisir?)
2. Tableau comparatif rapide
3. Presentation de {product_a}
4. Presentation de {product_b}
5. Comparaison par critere (securite, facilite, prix, etc.)
6. Notre verdict
7. Pour qui choisir {product_a}?
8. Pour qui choisir {product_b}?
9. Conclusion + CTA

REGLES:
- Reste objectif et factuel
- 1000-1500 mots
- Inclure un tableau markdown
- SEO optimise
- CTA vers SafeScoring pour les details

FORMAT: Markdown"""

        content = self.ai.call(prompt, max_tokens=2500, temperature=0.6)

        if not content:
            content = self._fallback_comparison_content(product_a, score_a, product_b, score_b)

        article = {
            'type': 'comparison',
            'slug': f'{slug_a}-vs-{slug_b}',
            'title': template['title'].format(product_a=product_a, product_b=product_b, year=self.year),
            'h1': template['h1'].format(product_a=product_a, product_b=product_b),
            'meta_description': template['meta_desc'].format(product_a=product_a, product_b=product_b),
            'keywords': [kw.format(product_a=product_a.lower(), product_b=product_b.lower())
                        for kw in template['keywords']],
            'content': content,
            'products': [slug_a, slug_b],
            'scores': {slug_a: score_a, slug_b: score_b},
            'winner': winner,
            'generated_at': datetime.now().isoformat(),
        }

        self._save_article(article)
        return article

    def generate_best_of_article(self, category: str, products: List[Dict]) -> Dict:
        """Generate 'Best X in Year' article."""

        template = self.TEMPLATES['best']
        count = len(products)

        # Sort by score
        products_sorted = sorted(products, key=lambda x: x.get('score', 0), reverse=True)

        products_text = "\n".join([
            f"- {i+1}. {p['name']}: {p.get('score', 0)}/100"
            for i, p in enumerate(products_sorted[:10])
        ])

        prompt = f"""Ecris un article SEO "Best {category} {self.year}" base sur les scores de securite.

CLASSEMENT:
{products_text}

STRUCTURE:
1. Introduction (importance de la securite)
2. Methodologie (2376 criteres SafeScore)
3. Top 10 avec analyse de chaque produit
4. Tableau recapitulatif
5. Comment choisir?
6. Conclusion + CTA

REGLES:
- 1500-2000 mots
- Chaque produit: 2-3 phrases d'analyse
- Tableau markdown du classement
- SEO optimise

FORMAT: Markdown"""

        content = self.ai.call(prompt, max_tokens=3000, temperature=0.6)

        article = {
            'type': 'best_of',
            'slug': f'best-{category.lower().replace(" ", "-")}-{self.year}',
            'title': template['title'].format(category=category, year=self.year, count=count),
            'h1': template['h1'].format(category=category, year=self.year),
            'meta_description': template['meta_desc'].format(category=category, year=self.year, count=count),
            'keywords': [kw.format(category=category.lower()) for kw in template['keywords']],
            'content': content or f"# Best {category} {self.year}\n\nContent generation failed.",
            'products': [p['slug'] for p in products_sorted[:10]],
            'generated_at': datetime.now().isoformat(),
        }

        self._save_article(article)
        return article

    def generate_hack_article(self, hack_event: Dict) -> Dict:
        """Generate hack analysis article - newsjacking SEO."""

        template = self.TEMPLATES['hack_analysis']
        project = hack_event.get('title', 'Unknown').split()[0]
        amount = hack_event.get('amount_usd', 0)

        prompt = f"""Ecris une analyse complete du hack de {project}.

INCIDENT:
- Titre: {hack_event.get('title', '')}
- Montant: ${amount:,.0f}
- Categorie: {hack_event.get('category', 'HACK')}
- Details: {hack_event.get('summary', '')}

STRUCTURE:
1. Resume de l'incident
2. Timeline des evenements
3. Analyse technique (comment ca s'est passe)
4. Impact sur les utilisateurs
5. Reponse de l'equipe
6. Lecons a retenir
7. Comment se proteger
8. Conclusion + CTA SafeScoring

REGLES:
- Factuel et objectif
- 800-1200 mots
- Inclure des conseils pratiques
- CTA vers verification sur SafeScoring

FORMAT: Markdown"""

        content = self.ai.call(prompt, max_tokens=2000, temperature=0.5)

        slug = f"{project.lower()}-hack-{datetime.now().strftime('%Y%m')}"

        article = {
            'type': 'hack_analysis',
            'slug': slug,
            'title': template['title'].format(project=project),
            'h1': template['h1'].format(project=project),
            'meta_description': template['meta_desc'].format(project=project),
            'keywords': [kw.format(project=project.lower()) for kw in template['keywords']],
            'content': content or f"# {project} Hack Analysis\n\nContent generation failed.",
            'event': hack_event,
            'generated_at': datetime.now().isoformat(),
        }

        self._save_article(article)
        return article

    def generate_security_guide(self, topic: str) -> Dict:
        """Generate evergreen security guide."""

        template = self.TEMPLATES['guide']

        prompt = f"""Ecris un guide complet sur: {topic}

STRUCTURE:
1. Introduction (pourquoi c'est important)
2. Les bases
3. Erreurs courantes a eviter
4. Best practices (etape par etape)
5. Outils recommandes
6. Checklist finale
7. FAQ (3-5 questions)
8. Conclusion + CTA

REGLES:
- Guide pratique et actionnable
- 1200-1800 mots
- Inclure des exemples concrets
- Listes et bullet points
- CTA vers SafeScoring

FORMAT: Markdown"""

        content = self.ai.call(prompt, max_tokens=2500, temperature=0.6)

        slug = topic.lower().replace(' ', '-') + '-guide'

        article = {
            'type': 'guide',
            'slug': slug,
            'title': template['title'].format(topic=topic, year=self.year),
            'h1': template['h1'].format(topic=topic),
            'meta_description': template['meta_desc'].format(topic=topic, year=self.year),
            'keywords': [kw.format(topic=topic.lower()) for kw in template['keywords']],
            'content': content or f"# {topic} Guide\n\nContent generation failed.",
            'generated_at': datetime.now().isoformat(),
        }

        self._save_article(article)
        return article

    def _save_article(self, article: Dict):
        """Save article to JSON file."""
        filename = f"{article['type']}_{article['slug']}.json"
        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(article, f, indent=2, ensure_ascii=False)

        print(f"Saved: {filepath}")

    def _fallback_is_safe_content(self, product: str, score: int, scores: Dict) -> str:
        """Fallback content when AI fails."""
        rating = "excellent" if score >= 80 else "good" if score >= 60 else "needs improvement"
        return f"""# Is {product} Safe?

## Quick Verdict

{product} has a SafeScore of **{score}/100**, which is considered **{rating}**.

## Score Breakdown

| Pillar | Score | Rating |
|--------|-------|--------|
| Security (S) | {scores.get('s', 0)} | {'Good' if scores.get('s', 0) >= 60 else 'Needs Work'} |
| Adversity (A) | {scores.get('a', 0)} | {'Good' if scores.get('a', 0) >= 60 else 'Needs Work'} |
| Fidelity (F) | {scores.get('f', 0)} | {'Good' if scores.get('f', 0) >= 60 else 'Needs Work'} |
| Efficiency (E) | {scores.get('e', 0)} | {'Good' if scores.get('e', 0) >= 60 else 'Needs Work'} |

## Conclusion

Based on our analysis of 2376 security criteria, {product} scores {score}/100.

[View full security report on SafeScoring →](https://safescoring.io/products/{product.lower().replace(' ', '-')})
"""

    def _fallback_comparison_content(self, a: str, score_a: int, b: str, score_b: int) -> str:
        """Fallback comparison content."""
        winner = a if score_a > score_b else b
        return f"""# {a} vs {b}: Security Comparison

## Quick Comparison

| Criteria | {a} | {b} |
|----------|-----|-----|
| SafeScore | {score_a}/100 | {score_b}/100 |

## Verdict

**{winner}** has a higher security score with {max(score_a, score_b)}/100.

[Compare on SafeScoring →](https://safescoring.io/compare/{a.lower().replace(' ', '-')}/{b.lower().replace(' ', '-')})
"""

    def generate_all_top_comparisons(self):
        """Generate articles for all top comparison pairs."""
        print(f"Generating {len(self.TOP_COMPARISONS)} comparison articles...")
        for product_a, product_b, volume in self.TOP_COMPARISONS:
            slug_a = product_a.lower().replace(' ', '-')
            slug_b = product_b.lower().replace(' ', '-')
            # Note: In production, fetch actual scores from DB
            self.generate_comparison_article(product_a, slug_a, 75, product_b, slug_b, 70)

    def generate_all_guides(self):
        """Generate all security guides."""
        print(f"Generating {len(self.GUIDE_TOPICS)} security guides...")
        for topic in self.GUIDE_TOPICS:
            self.generate_security_guide(topic)


# CLI
if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='SafeScoring SEO Generator')
    parser.add_argument('--comparisons', action='store_true', help='Generate comparison articles')
    parser.add_argument('--guides', action='store_true', help='Generate security guides')
    parser.add_argument('--is-safe', type=str, help='Generate "Is X Safe?" article')
    parser.add_argument('--all', action='store_true', help='Generate all content')

    args = parser.parse_args()

    generator = SEOGenerator()

    if args.comparisons or args.all:
        generator.generate_all_top_comparisons()

    if args.guides or args.all:
        generator.generate_all_guides()

    if args.is_safe:
        generator.generate_is_safe_article(
            args.is_safe,
            args.is_safe.lower().replace(' ', '-'),
            75,  # Example score
            {'s': 80, 'a': 70, 'f': 75, 'e': 72}
        )

    if not any([args.comparisons, args.guides, args.is_safe, args.all]):
        print("Usage:")
        print("  python seo_generator.py --comparisons  # Generate comparison articles")
        print("  python seo_generator.py --guides       # Generate security guides")
        print("  python seo_generator.py --is-safe 'Ledger Nano X'")
        print("  python seo_generator.py --all          # Generate everything")
