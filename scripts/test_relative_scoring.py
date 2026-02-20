#!/usr/bin/env python3
"""
Test du scoring relatif vs absolu - GENERIQUE pour tous produits
Usage:
    python test_relative_scoring.py                    # Top 10 produits
    python test_relative_scoring.py Ledger Trezor     # Produits specifiques
    python test_relative_scoring.py --all             # Tous les produits
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from config_helper import SUPABASE_URL, get_supabase_headers
from src.core.scoring_engine import ScoringEngine


def get_all_products():
    """Get all products with evaluations"""
    headers = get_supabase_headers()
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,product_types(code,name)&limit=500',
        headers=headers
    )
    return resp.json() if resp.status_code == 200 else []


def get_product_by_name(name, products):
    """Find product by name or slug"""
    for p in products:
        if p['name'].lower() == name.lower() or p['slug'].lower() == name.lower():
            return p
    return None


def print_score_line(name, ptype, absolute, relative, boost):
    """Print one line of score comparison"""
    boost_str = f"+{boost}" if boost and boost > 0 else str(boost) if boost else "N/A"
    abs_str = f"{absolute:.1f}" if absolute else "N/A"
    rel_str = f"{relative:.1f}" if relative else "N/A"
    print(f"  {name[:25]:<25} {ptype[:12]:<12} {abs_str:>6}% {rel_str:>6}% {boost_str:>6}%")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Test scoring relatif vs absolu')
    parser.add_argument('products', nargs='*', help='Noms des produits (vide = top 10)')
    parser.add_argument('--all', action='store_true', help='Tester tous les produits')
    args = parser.parse_args()

    print("\n" + "="*70)
    print("  SCORING RELATIF VS ABSOLU - TEST GENERIQUE")
    print("="*70)

    engine = ScoringEngine()
    all_products = get_all_products()
    print(f"\n{len(all_products)} produits en base")

    # Determine which products to test
    if args.products:
        products_to_test = []
        for name in args.products:
            p = get_product_by_name(name, all_products)
            if p:
                products_to_test.append(p)
            else:
                print(f"  [!] Produit '{name}' non trouve")
    elif args.all:
        products_to_test = all_products
    else:
        # Top 10 by default
        products_to_test = all_products[:10]

    print(f"\nTest de {len(products_to_test)} produits...")
    print("\n" + "-"*70)
    print(f"  {'Produit':<25} {'Type':<12} {'Absolu':>7} {'Relatif':>7} {'Boost':>7}")
    print("-"*70)

    results = []
    for product in products_to_test:
        scores = engine.calculate_product_score(product['id'])
        if not scores:
            continue

        ptype = product.get('product_types', {}).get('code', 'UNKNOWN') if product.get('product_types') else 'UNKNOWN'
        absolute = scores.get('global_score')
        relative = scores.get('type_relative', {}).get('global_score')
        boost = scores.get('score_boost')

        print_score_line(product['name'], ptype, absolute, relative, boost)
        results.append({
            'name': product['name'],
            'type': ptype,
            'absolute': absolute,
            'relative': relative,
            'boost': boost
        })

    # Summary
    if results:
        boosts = [r['boost'] for r in results if r['boost'] is not None]
        avg_boost = sum(boosts) / len(boosts) if boosts else 0
        positive = sum(1 for b in boosts if b > 0)
        negative = sum(1 for b in boosts if b < 0)

        print("-"*70)
        print(f"\n  RESUME: {len(results)} produits testes")
        print(f"  Boost moyen: {avg_boost:+.1f}%")
        print(f"  Positif: {positive}, Negatif: {negative}, Neutre: {len(boosts)-positive-negative}")


if __name__ == '__main__':
    main()
