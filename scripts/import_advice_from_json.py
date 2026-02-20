#!/usr/bin/env python3
"""
IMPORT SAFE ADVICE FROM LOCAL JSON TO DATABASE
===============================================
Use this after fixing the database trigger.
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
    print("  IMPORT SAFE ADVICE FROM JSON TO DATABASE")
    print("=" * 70)

    # Load advice from JSON
    input_file = 'data/product_advice.json'
    if not os.path.exists(input_file):
        print(f"ERROR: {input_file} not found!")
        print("Run generate_safe_advice_local.py first.")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        all_advice = json.load(f)

    print(f"Loaded {len(all_advice)} products from {input_file}")

    # Test one update first
    print("\nTesting database update...")
    test_id = list(all_advice.keys())[0]
    test_advice = all_advice[test_id]

    test_data = {
        'safe_priority_pillar': test_advice['safe_priority_pillar'],
        'safe_priority_reason': json.dumps(test_advice['safe_priority_reason'], ensure_ascii=False)
    }

    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{test_id}',
        headers=WRITE_HEADERS,
        json=test_data,
        timeout=30
    )

    if r.status_code not in [200, 204]:
        print(f"ERROR: Database update failed!")
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
        print("\nThe trigger issue is not fixed yet.")
        print("Please run this SQL in Supabase SQL Editor first:")
        print("-" * 50)
        print("""
-- Find and drop the problematic trigger
SELECT tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'products' AND NOT tgisinternal;

-- Then drop it (replace TRIGGER_NAME with actual name):
-- DROP TRIGGER IF EXISTS <TRIGGER_NAME> ON products;
        """)
        return

    print(f"Test passed! Updating all products...")

    # Update all products
    saved = 0
    failed = 0
    start_time = time.time()

    for product_id, advice_data in all_advice.items():
        try:
            update_data = {
                'safe_priority_pillar': advice_data['safe_priority_pillar'],
                'safe_priority_reason': json.dumps(advice_data['safe_priority_reason'], ensure_ascii=False)
            }

            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}',
                headers=WRITE_HEADERS,
                json=update_data,
                timeout=30
            )

            if r.status_code in [200, 204]:
                saved += 1
            else:
                failed += 1

            if (saved + failed) % 50 == 0:
                print(f"  Progress: {saved + failed}/{len(all_advice)} ({saved} saved, {failed} failed)")
                time.sleep(0.5)

        except Exception as e:
            failed += 1
            print(f"  Error on {product_id}: {e}")

    elapsed = time.time() - start_time
    print("=" * 70)
    print(f"  COMPLETE: {saved} products updated, {failed} failed")
    print(f"  Time: {elapsed:.1f}s")
    print("=" * 70)


if __name__ == "__main__":
    main()
