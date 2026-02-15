#!/usr/bin/env python3
"""Batch evaluation script for missing products."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import requests
from core.config import SUPABASE_URL, get_supabase_headers
from core.smart_evaluator import SmartEvaluator

def get_evaluation_counts():
    """Get evaluation count per product (YES/NO/YESp only, excludes N/A/TBD).
    Returns dict: { product_id: count_of_actual_evaluations }
    """
    headers = get_supabase_headers()
    eval_counts = {}
    offset = 0

    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id,result&offset={offset}&limit=1000",
            headers=headers
        )
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        for e in data:
            pid = e['product_id']
            result = (e.get('result') or '').upper()
            # Only count actual evaluations (YES/YESp/NO), not N/A or TBD
            if result in ('YES', 'YESP', 'NO'):
                eval_counts[pid] = eval_counts.get(pid, 0) + 1
        offset += 1000
        if offset > 100000:  # Safety limit
            break

    return eval_counts


# Minimum number of actual evaluations (YES/NO) for a product to be considered "fully evaluated"
MIN_EVAL_THRESHOLD = 20


def main():
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 20

    # Initialize evaluator
    evaluator = SmartEvaluator()
    evaluator.load_data()

    # Get evaluation counts per product (actual YES/NO, not N/A)
    print("\n[SCAN] Getting evaluation counts per product...")
    eval_counts = get_evaluation_counts()
    fully_evaluated = {pid for pid, count in eval_counts.items() if count >= MIN_EVAL_THRESHOLD}
    partially_evaluated = {pid for pid, count in eval_counts.items() if 0 < count < MIN_EVAL_THRESHOLD}
    print(f"   {len(fully_evaluated)} products fully evaluated (>={MIN_EVAL_THRESHOLD} YES/NO)")
    print(f"   {len(partially_evaluated)} products PARTIALLY evaluated (<{MIN_EVAL_THRESHOLD} YES/NO)")

    # Find products to evaluate: not fully evaluated (includes partial!)
    products_to_eval = [p for p in evaluator.products if p['id'] not in fully_evaluated]
    print(f"   {len(products_to_eval)} products to evaluate (including partial)")

    if not products_to_eval:
        print("\n=== ALL PRODUCTS EVALUATED! ===")
        return

    # Take batch
    batch = products_to_eval[:batch_size]
    print(f"\n=== EVALUATING BATCH OF {len(batch)} PRODUCTS ===")

    for i, product in enumerate(batch, 1):
        print(f"\n[{i}/{len(batch)}] {product['name']}")
        try:
            result = evaluator.evaluate_product(product)
            if result:
                evaluations, applicable_norms = result
                saved = evaluator.save_evaluations(product['id'], evaluations, applicable_norms)
                print(f"   Saved {saved} evaluations")
            else:
                print("   No evaluations generated")
        except Exception as e:
            print(f"   ERROR: {e}")

    print("\n=== BATCH COMPLETE ===")
    print(f"Remaining: {len(products_to_eval) - len(batch)} products")


if __name__ == "__main__":
    main()
