#!/usr/bin/env python3
"""Batch evaluation script for missing products."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import requests
from core.config import SUPABASE_URL, get_supabase_headers
from core.smart_evaluator import SmartEvaluator

def get_all_evaluated_ids():
    """Get ALL evaluated product IDs with pagination."""
    headers = get_supabase_headers()
    evaluated_ids = set()
    offset = 0

    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id&offset={offset}&limit=1000",
            headers=headers
        )
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        for e in data:
            evaluated_ids.add(e['product_id'])
        offset += 1000
        if offset > 100000:  # Safety limit
            break

    return evaluated_ids


def main():
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 20

    # Initialize evaluator
    evaluator = SmartEvaluator()
    evaluator.load_data()

    # Get properly evaluated product IDs
    print("\n[SCAN] Getting evaluated products...")
    evaluated_ids = get_all_evaluated_ids()
    print(f"   {len(evaluated_ids)} products already evaluated")

    # Find products to evaluate
    products_to_eval = [p for p in evaluator.products if p['id'] not in evaluated_ids]
    print(f"   {len(products_to_eval)} products to evaluate")

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
