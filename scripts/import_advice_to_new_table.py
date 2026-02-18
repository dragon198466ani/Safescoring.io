#!/usr/bin/env python3
"""
IMPORT SAFE ADVICE TO product_advice TABLE
==========================================
Alternative import that uses product_advice table instead of products table.
Run AFTER creating the table with config/create_product_advice_table.sql
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

from core.config import SUPABASE_URL, get_supabase_headers
import requests
import json
import time

WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'return=minimal'


def main():
    print("=" * 70)
    print("  IMPORT SAFE ADVICE TO product_advice TABLE")
    print("=" * 70)

    # Load advice from JSON
    input_file = 'data/product_advice.json'
    if not os.path.exists(input_file):
        print(f"ERROR: {input_file} not found!")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        all_advice = json.load(f)

    print(f"Loaded {len(all_advice)} products from {input_file}")

    # Check if table exists
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_advice?select=id&limit=1',
        headers=get_supabase_headers(),
        timeout=30
    )

    if r.status_code == 404:
        print("\nERROR: product_advice table does not exist!")
        print("Run this SQL first: config/create_product_advice_table.sql")
        return

    print("Table exists, importing data...")

    saved = 0
    failed = 0
    start_time = time.time()

    for product_id, advice_data in all_advice.items():
        try:
            insert_data = {
                'product_id': int(product_id),
                'priority_pillar': advice_data['safe_priority_pillar'],
                'advice_json': advice_data['safe_priority_reason']
            }

            # Try upsert via RPC function
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/rpc/upsert_product_advice',
                headers=WRITE_HEADERS,
                json={
                    'p_product_id': int(product_id),
                    'p_priority_pillar': advice_data['safe_priority_pillar'],
                    'p_advice_json': advice_data['safe_priority_reason']
                },
                timeout=30
            )

            if r.status_code in [200, 204]:
                saved += 1
            else:
                # Fallback to direct insert/upsert
                r2 = requests.post(
                    f'{SUPABASE_URL}/rest/v1/product_advice',
                    headers={**WRITE_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'},
                    json=insert_data,
                    timeout=30
                )
                if r2.status_code in [200, 201, 204]:
                    saved += 1
                else:
                    failed += 1

            if (saved + failed) % 50 == 0:
                print(f"  Progress: {saved + failed}/{len(all_advice)} ({saved} saved)")
                time.sleep(0.5)

        except Exception as e:
            failed += 1

    elapsed = time.time() - start_time
    print("=" * 70)
    print(f"  COMPLETE: {saved} products saved, {failed} failed")
    print(f"  Time: {elapsed:.1f}s")
    print("=" * 70)


if __name__ == "__main__":
    main()
