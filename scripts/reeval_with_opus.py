#!/usr/bin/env python3
"""
RE-EVALUATE ALL NON-OPUS EVALUATIONS WITH CLAUDE OPUS
=====================================================

This script uses the SmartEvaluator with CLAUDE_CODE_ONLY mode
to re-evaluate all evaluations that were NOT made by Claude Opus.

Target models to replace:
- smart_batch_v1
- stream_eval_v1
- fast_eval_v1
- fast_deterministic
- norm_applicability
- smart_ai

Usage:
    python scripts/reeval_with_opus.py [limit]

Author: SafeScoring.io
"""
import sys
sys.path.insert(0, 'src')
sys.path.insert(0, '.')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import time
from datetime import datetime
from collections import defaultdict, Counter

from core.config import SUPABASE_URL, get_supabase_headers
from core.smart_evaluator import SmartEvaluator

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'resolution=merge-duplicates,return=minimal'

# Models to replace (non-Opus)
NON_OPUS_MODELS = [
    'smart_batch_v1',
    'stream_eval_v1',
    'fast_eval_v1',
    'fast_deterministic',
    'norm_applicability',
    'smart_ai',
]


def fetch_non_opus_product_ids():
    """Fetch product IDs that have non-Opus evaluations."""
    print("Fetching products with non-Opus evaluations...")

    product_ids = set()
    offset = 0
    batch_size = 1000

    while True:
        url = f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id'
        url += f'&evaluated_by=in.({",".join(NON_OPUS_MODELS)})'
        url += f'&limit={batch_size}&offset={offset}'

        resp = requests.get(url, headers=READ_HEADERS, timeout=120)
        if resp.status_code != 200:
            print(f"Error: {resp.status_code}")
            break

        batch = resp.json()
        if not batch:
            break

        for ev in batch:
            product_ids.add(ev['product_id'])

        print(f"  Scanned {offset + len(batch):,} evaluations, found {len(product_ids)} products...")

        if len(batch) < batch_size:
            break
        offset += batch_size

    return list(product_ids)


def fetch_products(product_ids):
    """Fetch product details."""
    products = []

    for i in range(0, len(product_ids), 100):
        batch_ids = product_ids[i:i+100]
        ids_str = ','.join(str(pid) for pid in batch_ids)

        url = f'{SUPABASE_URL}/rest/v1/products?select=*&id=in.({ids_str})'
        resp = requests.get(url, headers=READ_HEADERS, timeout=60)

        if resp.status_code == 200:
            products.extend(resp.json())

    return products


def count_evaluations_by_model():
    """Count current evaluations by model."""
    print("Counting evaluations by model...")

    counts = Counter()
    offset = 0
    batch_size = 1000

    while True:
        url = f'{SUPABASE_URL}/rest/v1/evaluations?select=evaluated_by&limit={batch_size}&offset={offset}'
        resp = requests.get(url, headers=READ_HEADERS, timeout=120)

        if resp.status_code != 200:
            break

        batch = resp.json()
        if not batch:
            break

        for ev in batch:
            counts[ev.get('evaluated_by') or 'NULL'] += 1

        if len(batch) < batch_size:
            break
        offset += batch_size

    return counts


def main():
    print("="*70)
    print("RE-EVALUATE NON-OPUS EVALUATIONS WITH CLAUDE OPUS")
    print("Using SmartEvaluator with CLAUDE_CODE_ONLY mode")
    print("="*70)
    print(f"Started: {datetime.now().isoformat()}")

    # Get limit from command line
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None

    # Show current status
    print("\n--- Current evaluation status ---")
    counts = count_evaluations_by_model()
    total = sum(counts.values())
    print(f"Total evaluations: {total:,}")
    for model, count in sorted(counts.items(), key=lambda x: -x[1]):
        pct = count / total * 100 if total else 0
        is_opus = 'opus' in model.lower() or 'claude' in model.lower()
        marker = "[OPUS]" if is_opus else "[TO_REDO]" if model in NON_OPUS_MODELS else ""
        print(f"  {model}: {count:,} ({pct:.1f}%) {marker}")

    non_opus_count = sum(counts.get(m, 0) for m in NON_OPUS_MODELS)
    print(f"\nTotal non-Opus evaluations to redo: {non_opus_count:,}")

    if non_opus_count == 0:
        print("\nAll evaluations are already from Claude Opus!")
        return

    # Fetch products with non-Opus evaluations
    product_ids = fetch_non_opus_product_ids()
    print(f"\nProducts to re-evaluate: {len(product_ids):,}")

    if limit:
        product_ids = product_ids[:limit]
        print(f"Limited to: {len(product_ids)} products")

    # Fetch product details
    print("Fetching product details...")
    products = fetch_products(product_ids)
    print(f"Loaded {len(products)} products")

    # Initialize SmartEvaluator (uses CLAUDE_CODE_ONLY mode)
    print("\nInitializing SmartEvaluator...")
    evaluator = SmartEvaluator()
    evaluator.load_data()

    # Process each product
    total_products = len(products)
    success_count = 0
    error_count = 0

    for i, product in enumerate(products, 1):
        product_name = product.get('name', f"Product {product['id']}")
        print(f"\n[{i}/{total_products}] {product_name}...")

        try:
            # Delete existing non-Opus evaluations for this product
            for model in NON_OPUS_MODELS:
                url = f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product["id"]}&evaluated_by=eq.{model}'
                requests.delete(url, headers=WRITE_HEADERS, timeout=30)

            # Re-evaluate with Claude Opus
            result = evaluator.evaluate_product(product, enable_expert_review=False)

            if result and len(result) == 2:
                evaluations, applicable_norms = result

                if evaluations:
                    evaluator.save_evaluations(product['id'], evaluations, applicable_norms)

                    results_count = Counter(v[0] for v in evaluations.values())
                    print(f"   Saved: {len(evaluations)} evals - {dict(results_count)}")
                    success_count += 1
                else:
                    print(f"   No evaluations generated")
            else:
                print(f"   Invalid result format")

            # Rate limit protection
            time.sleep(0.5)

        except Exception as e:
            print(f"   ERROR: {e}")
            error_count += 1
            import traceback
            traceback.print_exc()

        # Progress update
        if i % 10 == 0:
            print(f"\n=== Progress: {i}/{total_products} products ({success_count} success, {error_count} errors) ===\n")

    print("\n" + "="*70)
    print("COMPLETE")
    print("="*70)
    print(f"Products processed: {total_products}")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"Finished: {datetime.now().isoformat()}")


if __name__ == '__main__':
    main()
