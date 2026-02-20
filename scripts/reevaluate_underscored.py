#!/usr/bin/env python3
"""
RE-EVALUATE UNDER-SCORED PRODUCTS
==================================
Targets the 33 products with < 100 norms evaluated.
Uses SmartEvaluator with strict evidence-based prompts.
Then recalculates their SAFE scores.

Usage:
  python scripts/reevaluate_underscored.py
  python scripts/reevaluate_underscored.py --limit 5
  python scripts/reevaluate_underscored.py --dry-run
"""
import sys
import os
import json
import argparse
import time

# Setup paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

from core.smart_evaluator import SmartEvaluator
from core.score_calculator import ScoreCalculator


def load_product_ids():
    """Load the list of under-evaluated product IDs."""
    path = os.path.join('data', 'products_need_reevaluation.json')
    if not os.path.exists(path):
        print(f"ERROR: {path} not found")
        print("Run the analysis first to identify under-evaluated products.")
        sys.exit(1)

    with open(path, 'r') as f:
        product_ids = json.load(f)

    print(f"Loaded {len(product_ids)} product IDs from {path}")
    return product_ids


def main():
    parser = argparse.ArgumentParser(description='Re-evaluate under-scored products')
    parser.add_argument('--limit', type=int, default=None, help='Max products to evaluate')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without evaluating')
    parser.add_argument('--skip-score', action='store_true', help='Skip score recalculation after evaluation')
    args = parser.parse_args()

    print("=" * 70)
    print("  RE-EVALUATE UNDER-SCORED PRODUCTS")
    print("  Using strict evidence-based prompts")
    print("=" * 70)

    # Load target product IDs
    product_ids = load_product_ids()
    if args.limit:
        product_ids = product_ids[:args.limit]
        print(f"Limited to {args.limit} products")

    # Initialize evaluator and load data
    print("\nInitializing SmartEvaluator...")
    evaluator = SmartEvaluator()
    evaluator.load_data()

    # Find products matching our target IDs
    products_to_eval = [p for p in evaluator.products if p['id'] in product_ids]
    missing_ids = set(product_ids) - {p['id'] for p in products_to_eval}

    print(f"\nFound {len(products_to_eval)}/{len(product_ids)} products in database")
    if missing_ids:
        print(f"  Missing IDs (not in first 500 products): {sorted(missing_ids)}")

    if args.dry_run:
        print("\n[DRY RUN] Would evaluate:")
        for p in products_to_eval:
            type_ids = evaluator.get_product_type_ids(p)
            applicable = evaluator.get_applicable_norms(type_ids)
            print(f"  - {p['name'][:40]:<40} (ID={p['id']}, {len(applicable)} applicable norms)")
        print(f"\nTotal: {len(products_to_eval)} products")
        return

    # Evaluate each product
    total_saved = 0
    results = []
    start_time = time.time()

    for i, product in enumerate(products_to_eval):
        print(f"\n{'='*60}")
        print(f"[{i+1}/{len(products_to_eval)}] Evaluating {product['name']}")
        print(f"{'='*60}")

        try:
            result = evaluator.evaluate_product(product)

            if result and isinstance(result, tuple):
                evaluations, applicable_norms = result

                if evaluations:
                    saved = evaluator.save_evaluations(product['id'], evaluations, applicable_norms)
                    total_saved += saved

                    def get_result(v):
                        return v[0] if isinstance(v, tuple) else v

                    yes = sum(1 for v in evaluations.values() if get_result(v) == 'YES')
                    yesp = sum(1 for v in evaluations.values() if get_result(v) == 'YESp')
                    no = sum(1 for v in evaluations.values() if get_result(v) == 'NO')
                    tbd = sum(1 for v in evaluations.values() if get_result(v) == 'TBD')
                    score_base = yes + yesp + no
                    score = (yes + yesp) * 100 // score_base if score_base > 0 else 0

                    print(f"  Saved {saved} evaluations")
                    print(f"  Score: {yes + yesp}/{score_base} = {score}%")
                    print(f"  YES={yes} YESp={yesp} NO={no} TBD={tbd}")

                    results.append({
                        'id': product['id'],
                        'name': product['name'],
                        'score': score,
                        'yes': yes,
                        'yesp': yesp,
                        'no': no,
                        'tbd': tbd,
                        'saved': saved
                    })
            else:
                print(f"  No evaluations returned")

        except Exception as e:
            print(f"  ERROR: {str(e)[:200]}")

        time.sleep(1)  # Rate limiting between products

    elapsed = time.time() - start_time

    # Summary
    print(f"\n{'='*70}")
    print("EVALUATION SUMMARY")
    print(f"{'='*70}")
    print(f"Products evaluated: {len(results)}/{len(products_to_eval)}")
    print(f"Total evaluations saved: {total_saved}")
    print(f"Time: {elapsed:.0f}s ({elapsed/60:.1f}min)")

    if results:
        results.sort(key=lambda x: x['score'])
        print(f"\n{'Product':<35} {'Score':>6} {'YES':>5} {'YESp':>5} {'NO':>5} {'TBD':>5}")
        print("-" * 70)
        for r in results:
            print(f"  {r['name'][:33]:<33} {r['score']:>5}% {r['yes']:>5} {r['yesp']:>5} {r['no']:>5} {r['tbd']:>5}")

        avg_score = sum(r['score'] for r in results) / len(results)
        print(f"\n  Average score: {avg_score:.1f}%")

    # Recalculate scores
    if not args.skip_score and results:
        print(f"\n{'='*70}")
        print("RECALCULATING SAFE SCORES")
        print(f"{'='*70}")
        try:
            calculator = ScoreCalculator(record_history=True)
            calculator.run()
            print("Score recalculation complete.")
        except Exception as e:
            print(f"Score recalculation error: {str(e)[:200]}")
            print("Run manually: python run.py score")


if __name__ == '__main__':
    main()
