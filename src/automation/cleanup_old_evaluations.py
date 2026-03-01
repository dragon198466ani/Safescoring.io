#!/usr/bin/env python3
"""
SAFESCORING.IO - Old Evaluation Cleanup Script
===============================================
ROOT CAUSE: 484K old evaluations (evaluated_by=NULL) have 90.6% YES bias.
The AI was hallucinating YES for nearly everything.

New smart_ai evaluations are much more rigorous (85.5% NO rate).

This script:
1. Analyzes the impact of old vs new evaluations
2. Deletes old NULL evaluations for products that have smart_ai evals
3. Optionally purges ALL old NULL evaluations
4. Recalculates scores after cleanup

Usage:
    python -m src.automation.cleanup_old_evaluations --analyze
    python -m src.automation.cleanup_old_evaluations --cleanup-mixed
    python -m src.automation.cleanup_old_evaluations --cleanup-all
    python -m src.automation.cleanup_old_evaluations --recalculate
"""

import sys
import os
import argparse
import time
import requests
from collections import defaultdict, Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS, get_supabase_headers
from src.core.supabase_pagination import fetch_all


def analyze():
    """Analyze evaluation providers and their impact on scores."""
    print("\n" + "=" * 70)
    print("   ANALYSIS: Old vs New Evaluations")
    print("=" * 70)

    # Fetch all evaluations with provider info
    print("\n   Loading evaluations...")
    evals = fetch_all('evaluations', select='id,product_id,evaluated_by,result', order='product_id')
    print(f"   Total evaluations: {len(evals)}")

    # Group by provider
    by_provider = Counter(e.get('evaluated_by') or 'NULL' for e in evals)
    print(f"\n   Evaluations by provider:")
    for provider, count in by_provider.most_common():
        results = Counter(e['result'] for e in evals if (e.get('evaluated_by') or 'NULL') == provider)
        yes_rate = round((results.get('YES', 0) + results.get('YESp', 0)) / count * 100, 1)
        no_rate = round(results.get('NO', 0) / count * 100, 1)
        print(f"      {provider:<25} {count:>8} evals | YES:{yes_rate:>5}% NO:{no_rate:>5}%")

    # Group by product
    products_by_provider = defaultdict(set)
    for e in evals:
        provider = e.get('evaluated_by') or 'NULL'
        products_by_provider[provider].add(e['product_id'])

    null_products = products_by_provider.get('NULL', set())
    smart_products = products_by_provider.get('smart_ai', set())
    na_products = products_by_provider.get('norm_applicability', set())

    mixed_products = null_products & (smart_products | na_products)
    null_only = null_products - smart_products - na_products
    smart_only = (smart_products | na_products) - null_products

    print(f"\n   Product coverage:")
    print(f"      Products with NULL evals only:    {len(null_only)}")
    print(f"      Products with smart_ai evals only: {len(smart_only)}")
    print(f"      Products with MIXED evals:        {len(mixed_products)}")

    # Show impact on scores for mixed products
    if mixed_products:
        scores = fetch_all('safe_scoring_results', select='product_id,note_finale', order='note_finale')
        score_by_pid = {s['product_id']: s['note_finale'] for s in scores}

        print(f"\n   Mixed products score distribution:")
        mixed_scores = [score_by_pid.get(pid) for pid in mixed_products if pid in score_by_pid]
        mixed_scores = [s for s in mixed_scores if s is not None]
        if mixed_scores:
            avg = sum(mixed_scores) / len(mixed_scores)
            print(f"      Average: {avg:.1f}%")
            print(f"      Min: {min(mixed_scores):.1f}%")
            print(f"      Max: {max(mixed_scores):.1f}%")

        null_only_scores = [score_by_pid.get(pid) for pid in null_only if pid in score_by_pid]
        null_only_scores = [s for s in null_only_scores if s is not None]
        if null_only_scores:
            avg = sum(null_only_scores) / len(null_only_scores)
            print(f"\n   NULL-only products score distribution:")
            print(f"      Average: {avg:.1f}%")
            print(f"      Min: {min(null_only_scores):.1f}%")
            print(f"      Max: {max(null_only_scores):.1f}%")

    # Count how many NULL evals would be deleted
    null_evals_in_mixed = sum(1 for e in evals
                              if (e.get('evaluated_by') is None)
                              and e['product_id'] in mixed_products)
    null_evals_total = sum(1 for e in evals if e.get('evaluated_by') is None)

    print(f"\n   Cleanup options:")
    print(f"      --cleanup-mixed: Delete {null_evals_in_mixed} NULL evals from {len(mixed_products)} mixed products")
    print(f"      --cleanup-all:   Delete {null_evals_total} NULL evals from {len(null_products)} products")

    return {
        'null_only': null_only,
        'mixed': mixed_products,
        'null_evals_total': null_evals_total,
    }


def delete_evaluations_batch(product_ids, provider_filter='is.null'):
    """Delete evaluations for given products where evaluated_by matches filter.
    Uses batched DELETE requests to Supabase with SERVICE ROLE KEY to bypass RLS."""
    total_deleted = 0
    batch_size = 20  # Process N products at a time

    # Use service role key to bypass RLS
    service_headers = get_supabase_headers(prefer='return=representation,count=exact', use_service_key=True)

    for i in range(0, len(product_ids), batch_size):
        batch = list(product_ids)[i:i + batch_size]
        pids_str = ','.join(str(pid) for pid in batch)

        url = (f"{SUPABASE_URL}/rest/v1/evaluations"
               f"?product_id=in.({pids_str})"
               f"&evaluated_by={provider_filter}")

        r = requests.delete(url, headers=service_headers, timeout=60)

        if r.status_code in (200, 204):
            # Try to get count from response
            try:
                deleted = len(r.json()) if r.text else 0
            except Exception:
                deleted = 0
            total_deleted += deleted
            print(f"   Batch {i // batch_size + 1}: deleted evals for products {batch[0]}-{batch[-1]}")
        else:
            print(f"   ⚠️  Batch {i // batch_size + 1} failed: {r.status_code} {r.text[:200]}")

        time.sleep(0.3)  # Rate limiting

    return total_deleted


def cleanup_mixed():
    """Delete old NULL evaluations ONLY for products that also have smart_ai evals."""
    print("\n" + "=" * 70)
    print("   CLEANUP: Removing old NULL evals from mixed products")
    print("=" * 70)

    evals = fetch_all('evaluations', select='product_id,evaluated_by', order='product_id')

    products_by_provider = defaultdict(set)
    for e in evals:
        provider = e.get('evaluated_by') or 'NULL'
        products_by_provider[provider].add(e['product_id'])

    null_products = products_by_provider.get('NULL', set())
    smart_products = products_by_provider.get('smart_ai', set())
    na_products = products_by_provider.get('norm_applicability', set())
    mixed = null_products & (smart_products | na_products)

    if not mixed:
        print("   No mixed products found. Nothing to clean.")
        return

    print(f"   Found {len(mixed)} mixed products")
    print(f"   Deleting NULL evaluations for these products...")

    deleted = delete_evaluations_batch(mixed, provider_filter='is.null')
    print(f"\n   ✅ Deleted ~{deleted} old NULL evaluations from {len(mixed)} products")
    print(f"   Run --recalculate to update scores")


def cleanup_all(no_confirm=False):
    """Delete ALL old NULL evaluations."""
    print("\n" + "=" * 70)
    print("   CLEANUP: Removing ALL old NULL evaluations")
    print("=" * 70)
    print("   ⚠️  This will delete ~484K evaluations!")
    print("   Products without smart_ai evals will have NO evaluations after this.")

    if not no_confirm:
        confirm = input("   Type YES to confirm: ")
        if confirm.strip() != 'YES':
            print("   Aborted.")
            return

    evals = fetch_all('evaluations', select='product_id,evaluated_by', order='product_id')
    null_product_ids = set(e['product_id'] for e in evals if e.get('evaluated_by') is None)

    print(f"   Deleting NULL evaluations for {len(null_product_ids)} products...")
    deleted = delete_evaluations_batch(null_product_ids, provider_filter='is.null')
    print(f"\n   ✅ Deleted ~{deleted} old NULL evaluations")
    print(f"   Run the smart_evaluator to re-evaluate, then --recalculate")


def recalculate_scores():
    """Recalculate scores for all products based on current evaluations."""
    print("\n" + "=" * 70)
    print("   RECALCULATE: Updating all product scores")
    print("=" * 70)

    # Import score calculator
    from src.core.score_calculator import ScoreCalculator

    calc = ScoreCalculator()
    calc.load_data()
    calc.run()

    print("\n   ✅ Scores recalculated")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Cleanup old evaluations')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--analyze', action='store_true', help='Analyze evaluation providers')
    group.add_argument('--cleanup-mixed', action='store_true', help='Delete NULL evals from mixed products only')
    group.add_argument('--cleanup-all', action='store_true', help='Delete ALL NULL evaluations (dangerous)')
    group.add_argument('--recalculate', action='store_true', help='Recalculate all scores')
    parser.add_argument('--no-confirm', action='store_true', help='Skip confirmation prompt (for automated pipelines)')

    args = parser.parse_args()

    if args.analyze:
        analyze()
    elif args.cleanup_mixed:
        cleanup_mixed()
    elif args.cleanup_all:
        cleanup_all(no_confirm=args.no_confirm)
    elif args.recalculate:
        recalculate_scores()
