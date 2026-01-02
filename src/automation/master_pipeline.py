#!/usr/bin/env python3
"""
SAFESCORING.IO - MASTER PIPELINE (OPTIMIZED)
=============================================

Pipeline complet qui orchestre les 5 matrices d'evaluation:
1. Type x Norm     -> norm_applicability (TRUE/FALSE)
2. Type x Type     -> type_compatibility (native/partial/via_bridge/incompatible)
3. Product x Norm  -> evaluations (YES/YESp/NO/TBD/N/A)
4. Product x Prod  -> product_compatibility (confidence 0-100%)
5. Scores          -> safe_scoring_results (Full/Consumer/Essential)

Usage:
    python -m src.automation.master_pipeline
    python -m src.automation.master_pipeline --limit 10
    python -m src.automation.master_pipeline --product ledger-nano-x
    python -m src.automation.master_pipeline --force  # Re-evaluer tout

Options:
    --skip-applicability           Skip Type x Norm generation
    --skip-type-compatibility      Skip Type x Type generation
    --skip-product-compatibility   Skip Product x Product generation
    --skip-evaluation              Skip Product x Norm evaluation
    --skip-scores                  Skip score calculation

Auteur: SafeScoring.io
"""

import os
import sys
import argparse
import time
import requests
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from src.core.config import SUPABASE_URL, get_supabase_headers


def print_status(title, value, expected=None):
    """Print status line with optional comparison."""
    if expected:
        status = "OK" if value == expected else f"MANQUE {expected - value}"
        print(f"   {title}: {value}/{expected} ({status})")
    else:
        print(f"   {title}: {value}")


def analyze_state():
    """Analyze current database state and return what needs to be done."""
    print("\n" + "="*60)
    print("   ANALYSE DE L'ETAT ACTUEL")
    print("="*60)

    headers = get_supabase_headers()
    state = {}

    # Products
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id', headers={**headers, 'Prefer': 'count=exact'})
    state['total_products'] = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
    print_status("Produits", state['total_products'])

    # Product Types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id', headers={**headers, 'Prefer': 'count=exact'})
    state['total_types'] = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
    print_status("Types de produits", state['total_types'])

    # Norms
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id', headers={**headers, 'Prefer': 'count=exact'})
    state['total_norms'] = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
    print_status("Normes", state['total_norms'])

    # Product-Type Mappings
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id', headers=headers)
    mappings = r.json() if r.status_code == 200 else []
    state['products_with_types'] = len(set(m['product_id'] for m in mappings))
    print_status("Produits avec type", state['products_with_types'], state['total_products'])

    # Applicability
    r = requests.get(f'{SUPABASE_URL}/rest/v1/norm_applicability?select=id', headers={**headers, 'Prefer': 'count=exact'})
    state['applicability_count'] = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
    expected_app = state['total_types'] * state['total_norms']
    print_status("Regles applicabilite", state['applicability_count'], expected_app)
    state['needs_applicability'] = state['applicability_count'] < expected_app * 0.9  # Allow 10% tolerance

    # Type Compatibility (Type x Type)
    r = requests.get(f'{SUPABASE_URL}/rest/v1/type_compatibility?select=id', headers={**headers, 'Prefer': 'count=exact'})
    state['type_compat_count'] = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
    expected_type_compat = state['total_types'] * (state['total_types'] + 1) // 2  # Unique pairs
    print_status("Compatibilite types", state['type_compat_count'], expected_type_compat)
    state['needs_type_compatibility'] = state['type_compat_count'] < expected_type_compat * 0.9

    # Product Compatibility (Product x Product)
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id', headers={**headers, 'Prefer': 'count=exact'})
    state['product_compat_count'] = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
    expected_product_compat = state['total_products'] * (state['total_products'] - 1) // 2  # Unique pairs
    print_status("Compatibilite produits", state['product_compat_count'], expected_product_compat)
    state['needs_product_compatibility'] = state['product_compat_count'] < expected_product_compat * 0.5  # 50% threshold

    # Evaluations
    r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id', headers=headers)
    evals = r.json() if r.status_code == 200 else []
    state['evaluated_products'] = list(set(e['product_id'] for e in evals))
    print_status("Produits evalues", len(state['evaluated_products']), state['total_products'])
    state['needs_evaluation'] = state['total_products'] - len(state['evaluated_products'])

    # Summary
    print("\n" + "-"*60)
    if state['needs_applicability']:
        print(f"   >> APPLICABILITE A GENERER ({state['total_types']} types)")
    if state['needs_type_compatibility']:
        print(f"   >> COMPATIBILITE TYPES A GENERER ({expected_type_compat - state['type_compat_count']} paires)")
    if state['needs_product_compatibility']:
        print(f"   >> COMPATIBILITE PRODUITS A GENERER ({expected_product_compat - state['product_compat_count']} paires)")
    if state['needs_evaluation'] > 0:
        print(f"   >> EVALUATIONS MANQUANTES: {state['needs_evaluation']} produits")
    all_done = (not state['needs_applicability'] and
                not state['needs_type_compatibility'] and
                not state['needs_product_compatibility'] and
                state['needs_evaluation'] == 0)
    if all_done:
        print("   >> BASE A JOUR - Rien a faire!")
    print("-"*60 + "\n")

    return state


def run_applicability():
    """Generate applicability rules with strategic model selection."""
    print("\n" + "="*60)
    print("   GENERATION APPLICABILITE (Selection strategique par type)")
    print("="*60 + "\n")

    from src.core.applicability_generator import ApplicabilityGenerator
    generator = ApplicabilityGenerator()
    generator.run()


def run_type_compatibility():
    """Generate type compatibility matrix with strategic model selection."""
    print("\n" + "="*60)
    print("   GENERATION COMPATIBILITE TYPES (Selection strategique)")
    print("="*60 + "\n")

    from src.core.type_compatibility_generator import TypeCompatibilityGenerator
    generator = TypeCompatibilityGenerator()
    generator.run()


def run_product_compatibility(limit=None):
    """Generate product compatibility matrix using scraping + AI."""
    print("\n" + "="*60)
    print("   GENERATION COMPATIBILITE PRODUITS (Scraping + AI)")
    print("="*60 + "\n")

    from src.core.update_product_compatibility import ProductCompatibilityUpdater
    updater = ProductCompatibilityUpdater()
    updater.run(limit=limit, skip_existing=True)


def run_evaluations(limit=None, skip_evaluated=True, product_slug=None):
    """Run product evaluations."""
    print("\n" + "="*60)
    print("   EVALUATION PRODUITS (Groq fallback si Gemini epuise)")
    print("="*60 + "\n")

    from src.core.smart_evaluator import SmartEvaluator

    headers = get_supabase_headers()
    evaluator = SmartEvaluator()
    evaluator.load_data()

    # Get products to evaluate
    if product_slug:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/products?slug=eq.{product_slug}&select=*", headers=headers)
        products = r.json() if r.status_code == 200 else []
        if not products:
            print(f"Produit '{product_slug}' non trouve!")
            return
    else:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=*&order=name", headers=headers)
        products = r.json() if r.status_code == 200 else []

    # Filter already evaluated if needed
    if skip_evaluated:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id", headers=headers)
        evals = r.json() if r.status_code == 200 else []
        evaluated_ids = set(e['product_id'] for e in evals)
        products = [p for p in products if p['id'] not in evaluated_ids]
        print(f"Produits a evaluer: {len(products)} (deja evalues exclus)")

    if limit:
        products = products[:limit]
        print(f"Limite: {limit} produits")

    if not products:
        print("Aucun produit a evaluer!")
        return

    # Evaluate
    evaluated_count = 0
    for i, product in enumerate(products):
        print(f"\n[{i+1}/{len(products)}] {product['name']}...")

        try:
            result = evaluator.evaluate_product(product, enable_expert_review=False)  # Skip Pro review for speed

            if result and len(result) == 2:
                evaluations, applicable_norms = result

                if evaluations:
                    evaluator.save_evaluations(product['id'], evaluations, applicable_norms)
                    evaluated_count += 1
                    print(f"   Sauvegarde: {len(evaluations)} evaluations")

            time.sleep(0.5)  # Rate limiting

        except Exception as e:
            print(f"   ERREUR: {e}")
            continue

    print(f"\n{'='*60}")
    print(f"   COMPLETE: {evaluated_count} produits evalues")
    print(f"{'='*60}\n")


def run_scores():
    """Calculate scores for all products."""
    print("\n" + "="*60)
    print("   CALCUL DES SCORES")
    print("="*60 + "\n")

    from src.core.score_calculator import ScoreCalculator
    calculator = ScoreCalculator(record_history=True)
    calculator.run()


def main():
    parser = argparse.ArgumentParser(description='SafeScoring Master Pipeline (Optimized)')
    parser.add_argument('--limit', type=int, help='Limit number of products to evaluate')
    parser.add_argument('--product', type=str, help='Evaluate a single product by slug')
    parser.add_argument('--force', action='store_true', help='Force re-evaluation of all products')
    parser.add_argument('--skip-applicability', action='store_true', help='Skip applicability generation')
    parser.add_argument('--skip-type-compatibility', action='store_true', help='Skip type compatibility generation')
    parser.add_argument('--skip-product-compatibility', action='store_true', help='Skip product compatibility generation')
    parser.add_argument('--skip-evaluation', action='store_true', help='Skip product evaluation')
    parser.add_argument('--skip-scores', action='store_true', help='Skip score calculation')

    args = parser.parse_args()

    print("""
================================================================================
     SAFESCORING.IO - MASTER PIPELINE (STRATEGIC AI)

     Selection strategique des modeles AI:
     - CRITICAL: Gemini Pro + Pass2 Review
     - COMPLEX: Gemini Flash / DeepSeek
     - SIMPLE: Groq (FREE 14,400 req/day)

     Fallback: Gemini -> Groq -> DeepSeek -> Claude -> Mistral
================================================================================
""")

    start_time = time.time()

    # 1. Analyze state
    state = analyze_state()

    # 2. Generate applicability if needed (Type x Norm)
    if not args.skip_applicability and state['needs_applicability']:
        run_applicability()
    elif args.skip_applicability:
        print("   [SKIP] Applicabilite (--skip-applicability)")
    else:
        print("   [OK] Applicabilite deja complete")

    # 3. Generate type compatibility if needed (Type x Type)
    if not args.skip_type_compatibility and state.get('needs_type_compatibility', False):
        run_type_compatibility()
    elif args.skip_type_compatibility:
        print("   [SKIP] Compatibilite types (--skip-type-compatibility)")
    else:
        print("   [OK] Compatibilite types deja complete")

    # 4. Generate product compatibility if needed (Product x Product)
    if not args.skip_product_compatibility and state.get('needs_product_compatibility', False):
        run_product_compatibility(limit=args.limit)
    elif args.skip_product_compatibility:
        print("   [SKIP] Compatibilite produits (--skip-product-compatibility)")
    else:
        print("   [OK] Compatibilite produits deja complete")

    # 5. Run evaluations if needed (Product x Norm)
    if not args.skip_evaluation and (state['needs_evaluation'] > 0 or args.force or args.product):
        run_evaluations(
            limit=args.limit,
            skip_evaluated=not args.force,
            product_slug=args.product
        )
    elif args.skip_evaluation:
        print("   [SKIP] Evaluations (--skip-evaluation)")
    else:
        print("   [OK] Tous les produits deja evalues")

    # 6. Calculate scores
    if not args.skip_scores:
        run_scores()
    else:
        print("   [SKIP] Scores (--skip-scores)")

    # Summary
    duration = time.time() - start_time
    print(f"""
================================================================================
   PIPELINE TERMINE en {duration:.1f} secondes

   WORKFLOW COMPLET:
   1. Type x Norm     -> norm_applicability (TRUE/FALSE)
   2. Type x Type     -> type_compatibility (native/partial/via_bridge/incompatible)
   3. Product x Norm  -> evaluations (YES/YESp/NO/TBD/N/A)
   4. Product x Prod  -> product_compatibility (confidence 0-100%)
   5. Scores          -> safe_scoring_results (Full/Consumer/Essential)
================================================================================
""")


if __name__ == '__main__':
    main()
