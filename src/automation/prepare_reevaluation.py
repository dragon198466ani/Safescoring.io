#!/usr/bin/env python3
"""
SAFESCORING.IO - Prepare Re-evaluation
========================================
Identifies products with only old NULL evaluations (91.9% YES bias)
and generates files for batch re-evaluation with smart_evaluator.

Steps:
1. Generate IDs file for smart_evaluator (--generate-ids)
2. Run: python -m src.core.smart_evaluator --ids-file cache/null_only_product_ids.json --resume
3. After re-evaluation: python -m src.automation.cleanup_old_evaluations --cleanup-all
4. Recalculate: python -m src.automation.cleanup_old_evaluations --recalculate

Usage:
    python -m src.automation.prepare_reevaluation --generate-ids
    python -m src.automation.prepare_reevaluation --status
    python -m src.automation.prepare_reevaluation --delete-null-for-reevaluated
"""

import sys
import os
import json
import argparse
from collections import defaultdict, Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from src.core.supabase_pagination import fetch_all


IDS_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'cache', 'null_only_product_ids.json')


def get_product_provider_map():
    """Get map of product_id -> set of evaluation providers."""
    evals = fetch_all('evaluations', select='product_id,evaluated_by', order='product_id')
    provider_map = defaultdict(set)
    for e in evals:
        provider = e.get('evaluated_by') or 'NULL'
        provider_map[e['product_id']].add(provider)
    return provider_map


def generate_ids():
    """Generate JSON file with product IDs that have only old NULL evaluations."""
    print("\n   Analyzing evaluation providers per product...")
    provider_map = get_product_provider_map()

    null_only_ids = []
    mixed_ids = []
    smart_only_ids = []

    for pid, providers in provider_map.items():
        has_null = 'NULL' in providers
        has_smart = 'smart_ai' in providers or 'norm_applicability' in providers

        if has_null and not has_smart:
            null_only_ids.append(pid)
        elif has_null and has_smart:
            mixed_ids.append(pid)
        elif has_smart:
            smart_only_ids.append(pid)

    null_only_ids.sort()

    print(f"\n   Products with ONLY old NULL evals: {len(null_only_ids)}")
    print(f"   Products with mixed evals:         {len(mixed_ids)}")
    print(f"   Products with only smart_ai evals: {len(smart_only_ids)}")

    # Save IDs file
    os.makedirs(os.path.dirname(IDS_FILE), exist_ok=True)
    with open(IDS_FILE, 'w') as f:
        json.dump(null_only_ids, f)

    print(f"\n   ✅ Saved {len(null_only_ids)} product IDs to: {IDS_FILE}")
    print(f"\n   Next steps:")
    print(f"   1. Re-evaluate with smart_evaluator:")
    print(f"      python -m src.core.smart_evaluator --ids-file cache/null_only_product_ids.json")
    print(f"   2. After completion, delete old NULL evals:")
    print(f"      python -m src.automation.prepare_reevaluation --delete-null-for-reevaluated")
    print(f"   3. Recalculate scores:")
    print(f"      python -m src.automation.cleanup_old_evaluations --recalculate")


def check_status():
    """Check re-evaluation progress."""
    print("\n   Checking re-evaluation progress...")
    provider_map = get_product_provider_map()

    # Load target IDs
    if os.path.exists(IDS_FILE):
        with open(IDS_FILE, 'r') as f:
            target_ids = set(json.load(f))
    else:
        print("   ⚠️  No IDs file found. Run --generate-ids first.")
        return

    done = 0
    pending = 0
    for pid in target_ids:
        providers = provider_map.get(pid, set())
        if 'smart_ai' in providers or 'norm_applicability' in providers:
            done += 1
        else:
            pending += 1

    total = len(target_ids)
    pct = round(done / total * 100, 1) if total > 0 else 0
    print(f"\n   Target products: {total}")
    print(f"   Re-evaluated:    {done} ({pct}%)")
    print(f"   Pending:         {pending}")

    if pending == 0:
        print(f"\n   ✅ All products re-evaluated! Run --delete-null-for-reevaluated next.")
    else:
        print(f"\n   ⏳ {pending} products still need re-evaluation.")
        print(f"      Run: python -m src.core.smart_evaluator --ids-file cache/null_only_product_ids.json --resume")


def delete_null_for_reevaluated():
    """Delete old NULL evaluations for products that now have smart_ai evals."""
    import requests as req
    import time
    from src.core.config import SUPABASE_URL, SUPABASE_HEADERS

    print("\n   Checking which products have been re-evaluated...")
    provider_map = get_product_provider_map()

    # Find products that have BOTH NULL and smart_ai evals
    ready_to_clean = []
    for pid, providers in provider_map.items():
        if 'NULL' in providers and ('smart_ai' in providers or 'norm_applicability' in providers):
            ready_to_clean.append(pid)

    if not ready_to_clean:
        print("   No products ready for cleanup (no products have both NULL and smart_ai evals).")
        return

    print(f"   Found {len(ready_to_clean)} products with both old and new evals")
    print(f"   Deleting old NULL evaluations...")

    total_deleted = 0
    batch_size = 20

    for i in range(0, len(ready_to_clean), batch_size):
        batch = ready_to_clean[i:i + batch_size]
        pids_str = ','.join(str(pid) for pid in batch)

        url = (f"{SUPABASE_URL}/rest/v1/evaluations"
               f"?product_id=in.({pids_str})"
               f"&evaluated_by=is.null")

        headers = {**SUPABASE_HEADERS, 'Prefer': 'return=representation'}
        r = req.delete(url, headers=headers, timeout=30)

        if r.status_code in (200, 204):
            try:
                deleted = len(r.json()) if r.text and r.text != '[]' else 0
            except Exception:
                deleted = 0
            total_deleted += deleted
            batch_num = i // batch_size + 1
            print(f"   Batch {batch_num}: cleaned {deleted} old evals")
        else:
            print(f"   ⚠️  Batch failed: {r.status_code}")

        time.sleep(0.3)

    print(f"\n   ✅ Deleted {total_deleted} old NULL evaluations from {len(ready_to_clean)} products")
    print(f"   Run: python -m src.automation.cleanup_old_evaluations --recalculate")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Prepare re-evaluation')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--generate-ids', action='store_true', help='Generate IDs file for smart_evaluator')
    group.add_argument('--status', action='store_true', help='Check re-evaluation progress')
    group.add_argument('--delete-null-for-reevaluated', action='store_true', help='Delete NULL evals for re-evaluated products')

    args = parser.parse_args()

    if args.generate_ids:
        generate_ids()
    elif args.status:
        check_status()
    elif args.delete_null_for_reevaluated:
        delete_null_for_reevaluated()
