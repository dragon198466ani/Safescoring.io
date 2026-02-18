#!/usr/bin/env python3
"""
Analyse COMPLETE d'un produit via le pipeline SafeScoring
Etapes:
1. Verification du produit dans la base
2. Scraping des donnees du site web
3. Verification de l'applicabilite des normes
4. Evaluation IA de chaque norme
5. Calcul du score SAFE final
6. Mise a jour dans Supabase
"""
import sys
import os
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from config_helper import SUPABASE_URL, get_supabase_headers

# Import SafeScoring modules
from src.core.scraper import WebScraper
from src.core.smart_evaluator import SmartEvaluator
from src.core.scoring_engine import ScoringEngine

def get_product_by_name(name):
    """Recherche un produit par nom"""
    headers = get_supabase_headers()
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=*&limit=500',
        headers=headers
    )
    if resp.status_code == 200:
        products = resp.json()
        for p in products:
            if p['name'].lower() == name.lower() or p['slug'].lower() == name.lower():
                return p
    return None

def get_product_type(type_id):
    """Obtient le type de produit"""
    headers = get_supabase_headers()
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_types?id=eq.{type_id}',
        headers=headers
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]
    return None

def get_applicable_norms_count(type_id):
    """Compte les normes applicables pour un type"""
    headers = get_supabase_headers()
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}&is_applicable=eq.true&select=id',
        headers=headers
    )
    if resp.status_code == 200:
        return len(resp.json())
    return 0

def get_evaluations_summary(product_id):
    """Resume des evaluations pour un produit"""
    headers = get_supabase_headers()
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=result',
        headers=headers
    )
    if resp.status_code == 200:
        evals = resp.json()
        summary = {'total': len(evals), 'YES': 0, 'YESp': 0, 'NO': 0, 'TBD': 0, 'N/A': 0}
        for e in evals:
            r = e.get('result', 'unknown')
            if r in summary:
                summary[r] += 1
        return summary
    return None

def get_safe_score(product_id):
    """Obtient le score SAFE"""
    headers = get_supabase_headers()
    resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}',
        headers=headers
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]
    return None

def analyze_product(product_name):
    """Analyse complete d'un produit"""
    print("\n" + "="*80)
    print(f"ANALYSE COMPLETE: {product_name}")
    print("="*80)

    # 1. Recherche du produit
    print(f"\n[1/6] Recherche du produit...")
    product = get_product_by_name(product_name)
    if not product:
        print(f"   ERREUR: Produit '{product_name}' non trouve!")
        return None

    print(f"   Trouve: {product['name']} (ID={product['id']})")
    print(f"   URL: {product.get('url', 'N/A')}")
    print(f"   Type ID: {product.get('type_id', 'N/A')}")

    # 2. Verification du type
    print(f"\n[2/6] Verification du type...")
    ptype = get_product_type(product.get('type_id'))
    if ptype:
        print(f"   Type: {ptype['name']} (code={ptype.get('code', 'N/A')})")
    else:
        print(f"   ATTENTION: Type non trouve!")

    # 3. Scraping
    print(f"\n[3/6] Scraping du site web...")
    scraper = WebScraper(use_cache=True)
    content = scraper.scrape_product(product)
    if content:
        print(f"   Contenu scrape: {len(content)} caracteres")
    else:
        print(f"   ATTENTION: Aucun contenu scrape")

    # 4. Normes applicables
    print(f"\n[4/6] Verification des normes applicables...")
    norm_count = get_applicable_norms_count(product.get('type_id'))
    print(f"   {norm_count} normes applicables pour ce type")

    # 5. Evaluation IA
    print(f"\n[5/6] Lancement de l'evaluation IA...")
    print("   (Cela peut prendre plusieurs minutes)")
    start_time = time.time()

    evaluator = SmartEvaluator()
    evaluator.load_data()  # Charger les donnees depuis Supabase
    result = evaluator.evaluate_product(product, enable_expert_review=True)

    elapsed = time.time() - start_time
    print(f"   Evaluation terminee en {elapsed:.1f}s")

    if result:
        evaluations, applicable_norms = result

        # Compter les resultats
        yes_count = sum(1 for v in evaluations.values() if v[0] == 'YES')
        yesp_count = sum(1 for v in evaluations.values() if v[0] == 'YESp')
        no_count = sum(1 for v in evaluations.values() if v[0] == 'NO')
        tbd_count = sum(1 for v in evaluations.values() if v[0] == 'TBD')

        print(f"   Resultats: {yes_count} YES, {yesp_count} YESp, {no_count} NO, {tbd_count} TBD")

        # Sauvegarder les evaluations
        print(f"   Sauvegarde des evaluations...")
        saved = evaluator.save_evaluations(product['id'], evaluations, applicable_norms)
        print(f"   {saved} evaluations sauvegardees")

    # 6. Calcul du score
    print(f"\n[6/6] Calcul du score SAFE...")
    try:
        scoring_engine = ScoringEngine()
        score_result = scoring_engine.calculate_product_score(product['id'])
        if score_result:
            print(f"   Score Global: {score_result.get('score_global', 'N/A')}%")
            print(f"   S={score_result.get('score_s', 'N/A')}%, A={score_result.get('score_a', 'N/A')}%, F={score_result.get('score_f', 'N/A')}%, E={score_result.get('score_e', 'N/A')}%")
    except Exception as e:
        print(f"   Erreur calcul score: {e}")

    # Resume final
    print("\n" + "="*80)
    print(f"RESUME FINAL: {product['name']}")
    print("="*80)

    # Recuperer les donnees finales
    eval_summary = get_evaluations_summary(product['id'])
    final_score = get_safe_score(product['id'])

    if eval_summary:
        print(f"\nEvaluations:")
        print(f"   Total: {eval_summary['total']}")
        print(f"   YES: {eval_summary['YES']}, YESp: {eval_summary['YESp']}")
        print(f"   NO: {eval_summary['NO']}, TBD: {eval_summary['TBD']}")

    if final_score:
        print(f"\nScore SAFE:")
        print(f"   Global: {final_score.get('score_global', 'N/A')}%")
        print(f"   Security (S): {final_score.get('score_s', 'N/A')}%")
        print(f"   Anti-coercion (A): {final_score.get('score_a', 'N/A')}%")
        print(f"   Fiability (F): {final_score.get('score_f', 'N/A')}%")
        print(f"   Ecosystem (E): {final_score.get('score_e', 'N/A')}%")
        print(f"   Updated: {final_score.get('calculated_at', 'N/A')}")

    return {
        'product': product,
        'evaluations': eval_summary,
        'score': final_score
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Analyse complete d\'un produit SafeScoring')
    parser.add_argument('products', nargs='+', help='Noms des produits a analyser')
    args = parser.parse_args()

    results = []
    for product_name in args.products:
        result = analyze_product(product_name)
        if result:
            results.append(result)

    # Resume global
    if len(results) > 1:
        print("\n" + "="*80)
        print("COMPARATIF FINAL")
        print("="*80)
        for r in results:
            p = r['product']
            s = r.get('score', {})
            print(f"   {p['name']}: {s.get('score_global', 'N/A')}% (S={s.get('score_s', 'N/A')}, A={s.get('score_a', 'N/A')}, F={s.get('score_f', 'N/A')}, E={s.get('score_e', 'N/A')})")


if __name__ == '__main__':
    main()
