#!/usr/bin/env python3
"""
TABLEAU COMPARATIF - Scores Absolus vs Relatifs
Affiche tous les produits evalues avec leurs scores SAFE
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from config_helper import SUPABASE_URL, get_supabase_headers
from src.core.scoring_engine import ScoringEngine


def main():
    headers = get_supabase_headers()

    # Get products with evaluations
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id&limit=5000',
        headers=headers
    )
    product_ids = list(set(e['product_id'] for e in resp.json())) if resp.status_code == 200 else []

    # Get product details
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,product_types(code,name)&limit=500',
        headers=headers
    )
    products = {p['id']: p for p in resp.json()} if resp.status_code == 200 else {}

    # Filter to products with evaluations
    evaluated = [products[pid] for pid in product_ids if pid in products]

    print()
    print('='*105)
    print('  TABLEAU COMPARATIF - SCORING SAFESCORING (Absolu vs Relatif)')
    print('='*105)
    print()
    print(f"  {'Produit':<24} {'Type':<14} {'S':>5} {'A':>5} {'F':>5} {'E':>5} {'ABS':>6} {'REL':>6} {'BOOST':>7}")
    print('-'*105)

    engine = ScoringEngine()
    results = []

    for p in evaluated:
        scores = engine.calculate_product_score(p['id'], validate_consistency=False)
        if not scores or not scores.get('global_score'):
            continue

        ptype = p.get('product_types', {}).get('code', '?')[:14] if p.get('product_types') else '?'
        s = scores.get('security_score') or 0
        a = scores.get('adversity_score') or 0
        f = scores.get('fidelity_score') or 0
        e = scores.get('efficiency_score') or 0
        abs_score = scores.get('global_score') or 0
        rel = scores.get('type_relative', {})
        rel_score = rel.get('global_score') or 0
        boost = scores.get('score_boost') or 0
        applicable = rel.get('applicable_norms', 0)
        excluded = rel.get('excluded_norms', 0)

        boost_str = f'+{boost:.1f}' if boost > 0 else f'{boost:.1f}'
        print(f"  {p['name'][:24]:<24} {ptype:<14} {s:>5.1f} {a:>5.1f} {f:>5.1f} {e:>5.1f} {abs_score:>6.1f} {rel_score:>6.1f} {boost_str:>7}")

        results.append({
            'name': p['name'],
            'type': ptype,
            's': s, 'a': a, 'f': f, 'e': e,
            'abs': abs_score,
            'rel': rel_score,
            'boost': boost,
            'applicable': applicable,
            'excluded': excluded
        })

    print('-'*105)

    if not results:
        print("  Aucun produit avec evaluations trouve.")
        return

    # Global stats
    boosts = [r['boost'] for r in results]
    print()
    print(f'  STATISTIQUES GLOBALES ({len(results)} produits):')
    print(f'    Score ABSOLU moyen:  {sum(r["abs"] for r in results)/len(results):.1f}%')
    print(f'    Score RELATIF moyen: {sum(r["rel"] for r in results)/len(results):.1f}%')
    print(f'    Boost moyen:         {sum(boosts)/len(boosts):+.1f}%')
    print(f'    Boost max:           {max(boosts):+.1f}%')
    print(f'    Boost min:           {min(boosts):+.1f}%')

    # By type
    by_type = {}
    for r in results:
        t = r['type']
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(r)

    print()
    print('  MOYENNES PAR TYPE:')
    print(f"  {'Type':<14} {'N':>3} {'S':>6} {'A':>6} {'F':>6} {'E':>6} {'ABS':>7} {'REL':>7} {'BOOST':>8}")
    print('  ' + '-'*80)

    for t, items in sorted(by_type.items(), key=lambda x: -len(x[1])):
        n = len(items)
        avg_s = sum(i['s'] for i in items)/n
        avg_a = sum(i['a'] for i in items)/n
        avg_f = sum(i['f'] for i in items)/n
        avg_e = sum(i['e'] for i in items)/n
        avg_abs = sum(i['abs'] for i in items)/n
        avg_rel = sum(i['rel'] for i in items)/n
        avg_boost = sum(i['boost'] for i in items)/n
        boost_str = f'+{avg_boost:.1f}' if avg_boost > 0 else f'{avg_boost:.1f}'
        print(f"  {t:<14} {n:>3} {avg_s:>6.1f} {avg_a:>6.1f} {avg_f:>6.1f} {avg_e:>6.1f} {avg_abs:>7.1f} {avg_rel:>7.1f} {boost_str:>8}")

    # Top 5 biggest boost
    print()
    print('  TOP 5 - PLUS GRAND BOOST (score relatif >> absolu):')
    for r in sorted(results, key=lambda x: -x['boost'])[:5]:
        print(f"    {r['name'][:25]:<25} {r['type']:<12} ABS={r['abs']:.1f}% -> REL={r['rel']:.1f}% ({r['boost']:+.1f}%)")

    # Bottom 5 (negative boost)
    print()
    print('  TOP 5 - PLUS PETIT BOOST (score relatif < absolu):')
    for r in sorted(results, key=lambda x: x['boost'])[:5]:
        print(f"    {r['name'][:25]:<25} {r['type']:<12} ABS={r['abs']:.1f}% -> REL={r['rel']:.1f}% ({r['boost']:+.1f}%)")

    print()


if __name__ == '__main__':
    main()
