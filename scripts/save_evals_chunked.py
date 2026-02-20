#!/usr/bin/env python3
"""
CHUNKED EVALUATION SAVER
Saves evaluations in very small chunks with heavy rate limiting.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import time
from datetime import datetime
from core.config import SUPABASE_URL, get_supabase_headers

# Import the evaluation logic from the main script
import importlib.util
spec = importlib.util.spec_from_file_location("claude_opus_full_eval",
    os.path.join(os.path.dirname(__file__), "claude_opus_full_eval.py"))
eval_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eval_module)
TYPE_CATEGORIES = eval_module.TYPE_CATEGORIES
get_category = eval_module.get_category
evaluate_norm = eval_module.evaluate_norm

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'resolution=merge-duplicates,return=minimal'


def load_norms_simple():
    """Load all norms with retries."""
    print("Loading norms...")
    norms = []
    last_id = 0

    while True:
        for attempt in range(5):
            try:
                url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&id=gt.{last_id}&order=id&limit=30'
                r = requests.get(url, headers=READ_HEADERS, timeout=60)
                if r.status_code == 200:
                    data = r.json()
                    if not data:
                        return norms
                    norms.extend(data)
                    last_id = data[-1]['id']
                    if len(norms) % 500 == 0:
                        print(f"  {len(norms)} norms loaded...")
                    time.sleep(0.2)
                    break
                else:
                    time.sleep(5)
            except Exception as e:
                print(f"  Retry {attempt+1}/5 for norms...")
                time.sleep(5)
        else:
            print(f"  Skipping norms batch at id>{last_id}")
            last_id += 50

    return norms


def load_products_simple():
    """Load all products with retries."""
    print("Loading products...")
    products = []
    last_id = 0

    while True:
        for attempt in range(5):
            try:
                url = f'{SUPABASE_URL}/rest/v1/products?select=id,name,type_id&type_id=not.is.null&id=gt.{last_id}&order=id&limit=30'
                r = requests.get(url, headers=READ_HEADERS, timeout=60)
                if r.status_code == 200:
                    data = r.json()
                    if not data:
                        return products
                    products.extend(data)
                    last_id = data[-1]['id']
                    if len(products) % 300 == 0:
                        print(f"  {len(products)} products loaded...")
                    time.sleep(0.2)
                    break
                else:
                    time.sleep(5)
            except Exception as e:
                print(f"  Retry {attempt+1}/5 for products...")
                time.sleep(5)
        else:
            print(f"  Skipping products batch at id>{last_id}")
            last_id += 50

    return products


def load_types():
    """Load product types."""
    for attempt in range(5):
        try:
            r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name',
                           headers=READ_HEADERS, timeout=30)
            if r.status_code == 200:
                return {t['id']: t['name'] for t in r.json()}
            time.sleep(3)
        except:
            time.sleep(3)
    return {}


def save_one_batch(evaluations):
    """Save a single batch with retries."""
    for attempt in range(5):
        try:
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/evaluations?on_conflict=product_id,norm_id,evaluation_date',
                headers=WRITE_HEADERS,
                json=evaluations,
                timeout=120
            )
            if r.status_code in [200, 201]:
                return True
            elif r.status_code == 500:
                print(f"    500 error, retry {attempt+1}/5...")
                time.sleep(10 * (attempt + 1))
        except Exception as e:
            print(f"    Exception: {str(e)[:50]}, retry {attempt+1}/5...")
            time.sleep(10 * (attempt + 1))
    return False


def main():
    print("=" * 60)
    print("  CHUNKED EVALUATION SAVER")
    print("=" * 60)

    # Load data
    norms = load_norms_simple()
    print(f"  Total: {len(norms)} norms")

    products = load_products_simple()
    types = load_types()
    print(f"  Total: {len(products)} products, {len(types)} types")

    if not norms or not products:
        print("ERROR: Failed to load data")
        return

    today = datetime.now().strftime('%Y-%m-%d')

    # Process products in chunks of 10
    total_saved = 0
    total_failed = 0
    chunk_size = 10
    batch_size = 25  # Save 25 evaluations at a time

    print(f"\nProcessing {len(products)} products in chunks of {chunk_size}...")

    for chunk_idx in range(0, len(products), chunk_size):
        chunk_products = products[chunk_idx:chunk_idx + chunk_size]
        print(f"\n  Chunk {chunk_idx//chunk_size + 1}/{(len(products) + chunk_size - 1)//chunk_size}")

        # Generate evaluations for this chunk
        chunk_evals = []
        for product in chunk_products:
            type_name = types.get(product['type_id'], 'Unknown')
            category = get_category(type_name)

            for norm in norms:
                result, reason = evaluate_norm(
                    norm['code'],
                    norm.get('title', ''),
                    norm.get('pillar', ''),
                    category
                )
                chunk_evals.append({
                    'product_id': product['id'],
                    'norm_id': norm['id'],
                    'result': result,
                    'why_this_result': f"{product['name']}: {reason}"[:500],
                    'evaluated_by': 'claude_opus_4.5_full',
                    'evaluation_date': today,
                    'confidence_score': 0.85
                })

        print(f"    Generated {len(chunk_evals)} evaluations for this chunk")

        # Save in small batches
        chunk_saved = 0
        for i in range(0, len(chunk_evals), batch_size):
            batch = chunk_evals[i:i + batch_size]
            if save_one_batch(batch):
                chunk_saved += len(batch)
            else:
                total_failed += len(batch)
            time.sleep(1)  # Rate limiting

        total_saved += chunk_saved
        print(f"    Saved {chunk_saved}/{len(chunk_evals)} for this chunk")
        print(f"    Running total: {total_saved} saved, {total_failed} failed")

    print("\n" + "=" * 60)
    print(f"  COMPLETE: {total_saved} saved, {total_failed} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
