#!/usr/bin/env python3
"""
SAFESCORING.IO - AXE 1: Data Reliability Pipeline
===================================================
Master orchestrator for the full data cleanup pipeline:

1. ANALYZE  — Audit current state (evaluations, definitions, scores)
2. EXECUTE  — Purge biased NULL evals → populate definitions → recalculate
3. VERIFY   — Post-cleanup verification and summary report

ROOT CAUSE (identified 2026-02-24):
- 443K old evaluations (evaluated_by=NULL) have 91.9% YES bias
- 24K new evaluations (evaluated_by='smart_ai') have 86.7% NO rate
- safe_scoring_definitions table is EMPTY
- Only 6 products have mixed old+new evals

Usage:
    python -m src.automation.axe1_full_pipeline --analyze
    python -m src.automation.axe1_full_pipeline --execute
    python -m src.automation.axe1_full_pipeline --verify
    python -m src.automation.axe1_full_pipeline --full     (all 3 steps)
"""

import sys
import os
import argparse
import time
from datetime import datetime
from collections import Counter, defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS
from src.core.supabase_pagination import fetch_all


def step_analyze():
    """Step 1: Comprehensive audit of evaluation system state."""
    print("\n" + "=" * 70)
    print("   AXE 1 — STEP 1: ANALYZE")
    print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # 1. Evaluations by provider
    print("\n   [1/4] Loading evaluations...")
    evals = fetch_all('evaluations', select='id,product_id,evaluated_by,result', order='product_id')
    total_evals = len(evals)
    print(f"         Total evaluations: {total_evals}")

    by_provider = Counter(e.get('evaluated_by') or 'NULL' for e in evals)
    print(f"\n         By provider:")
    for provider, count in by_provider.most_common():
        results = Counter(e['result'] for e in evals if (e.get('evaluated_by') or 'NULL') == provider)
        yes_count = results.get('YES', 0) + results.get('YESp', 0)
        no_count = results.get('NO', 0)
        na_count = results.get('N/A', 0)
        yes_rate = round(yes_count / count * 100, 1) if count > 0 else 0
        no_rate = round(no_count / count * 100, 1) if count > 0 else 0
        status = "[!!] BIASED" if yes_rate > 80 else "[OK]"
        print(f"         {status} {provider:<25} {count:>8} evals | YES:{yes_rate:>5}% NO:{no_rate:>5}%")

    # 2. Product coverage
    print(f"\n   [2/4] Product coverage...")
    products_by_provider = defaultdict(set)
    for e in evals:
        provider = e.get('evaluated_by') or 'NULL'
        products_by_provider[provider].add(e['product_id'])

    null_products = products_by_provider.get('NULL', set())
    smart_products = products_by_provider.get('smart_ai', set())
    na_products = products_by_provider.get('norm_applicability', set())
    mixed = null_products & (smart_products | na_products)
    null_only = null_products - smart_products - na_products
    smart_only = (smart_products | na_products) - null_products

    print(f"         NULL-only products:     {len(null_only)} (will lose ALL evals after purge)")
    print(f"         smart_ai-only products: {len(smart_only)} (unaffected)")
    print(f"         Mixed products:         {len(mixed)} (NULL evals will be removed)")

    # 3. safe_scoring_definitions state
    print(f"\n   [3/4] safe_scoring_definitions table...")
    definitions = fetch_all('safe_scoring_definitions', select='norm_id,is_essential,is_consumer,is_full', order='norm_id')
    print(f"         Rows: {len(definitions)}")
    if len(definitions) == 0:
        print(f"         [!!] TABLE IS EMPTY -- all norms default to is_full=True")
        print(f"         -> ACTION: Run --execute to populate")
    else:
        ess = sum(1 for d in definitions if d.get('is_essential'))
        con = sum(1 for d in definitions if d.get('is_consumer'))
        print(f"         Essential: {ess} | Consumer: {con} | Full: {len(definitions)}")

    # 4. Score distribution
    print(f"\n   [4/4] Current score distribution...")
    scores = fetch_all('safe_scoring_results', select='product_id,note_finale', order='note_finale')
    score_values = [s['note_finale'] for s in scores if s.get('note_finale') is not None]

    if score_values:
        avg = sum(score_values) / len(score_values)
        perfect = sum(1 for s in score_values if s >= 99)
        very_low = sum(1 for s in score_values if s < 10)
        print(f"         Products with scores: {len(score_values)}")
        print(f"         Average: {avg:.1f}%")
        print(f"         Perfect (>=99%): {perfect} {'[!!] SUSPICIOUS' if perfect > 50 else ''}")
        print(f"         Very low (<10%): {very_low}")
    else:
        print(f"         No scores found")

    # Summary
    null_eval_count = by_provider.get('NULL', 0)
    print(f"\n   {'=' * 60}")
    print(f"   DIAGNOSIS:")
    if null_eval_count > 0:
        print(f"   [!!] {null_eval_count:,} biased NULL evaluations need to be purged")
    if len(definitions) == 0:
        print(f"   [!!] safe_scoring_definitions is EMPTY -- needs population")
    if null_eval_count == 0 and len(definitions) > 0:
        print(f"   [OK] Data looks clean -- run --verify for detailed check")
    print(f"   {'=' * 60}")

    return {
        'null_evals': null_eval_count,
        'smart_evals': by_provider.get('smart_ai', 0),
        'definitions_count': len(definitions),
        'null_only_products': len(null_only),
        'mixed_products': len(mixed),
    }


def step_execute():
    """Step 2: Execute the full cleanup pipeline."""
    print("\n" + "=" * 70)
    print("   AXE 1 — STEP 2: EXECUTE")
    print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Pre-check
    print("\n   [PRE-CHECK] Verifying current state...")
    state = step_analyze()

    if state['null_evals'] == 0 and state['definitions_count'] > 0:
        print("\n   [OK] Nothing to do -- data is already clean")
        return

    # Phase 1: Populate safe_scoring_definitions (if empty)
    if state['definitions_count'] == 0:
        print("\n   " + "-" * 60)
        print("   PHASE 1: Populating safe_scoring_definitions...")
        print("   " + "-" * 60)
        from src.automation.populate_scoring_definitions import populate
        populate(dry_run=False)
    else:
        print(f"\n   PHASE 1: SKIP -- definitions already populated ({state['definitions_count']} rows)")

    # Phase 2: Purge biased NULL evaluations
    if state['null_evals'] > 0:
        print("\n   " + "-" * 60)
        print(f"   PHASE 2: Purging {state['null_evals']:,} biased NULL evaluations...")
        print("   " + "-" * 60)

        confirm = input(f"\n   [WARNING] This will DELETE {state['null_evals']:,} evaluations. Type YES to confirm: ")
        if confirm.strip() != 'YES':
            print("   Aborted.")
            return

        from src.automation.cleanup_old_evaluations import cleanup_all
        cleanup_all(no_confirm=True)
    else:
        print(f"\n   PHASE 2: SKIP — no NULL evaluations to purge")

    # Phase 3: Recalculate all scores
    print("\n   " + "-" * 60)
    print("   PHASE 3: Recalculating all product scores...")
    print("   " + "-" * 60)
    from src.core.score_calculator import ScoreCalculator
    calc = ScoreCalculator(record_history=True)
    calc.run()

    print("\n   [OK] AXE 1 EXECUTE COMPLETE")
    print("   Run --verify to check results")


def step_verify():
    """Step 3: Post-cleanup verification."""
    print("\n" + "=" * 70)
    print("   AXE 1 — STEP 3: VERIFY")
    print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    issues = []

    # 1. Check no NULL evaluations remain
    print("\n   [1/5] Checking for remaining NULL evaluations...")
    evals = fetch_all('evaluations', select='id,evaluated_by', order='id')
    null_count = sum(1 for e in evals if e.get('evaluated_by') is None)
    total = len(evals)
    if null_count > 0:
        issues.append(f"{null_count} NULL evaluations still exist")
        print(f"         [!!] {null_count:,} NULL evaluations remain out of {total:,}")
    else:
        print(f"         [OK] No NULL evaluations -- {total:,} total evaluations (all attributed)")

    # 2. Check safe_scoring_definitions populated
    print("\n   [2/5] Checking safe_scoring_definitions...")
    definitions = fetch_all('safe_scoring_definitions', select='norm_id,is_essential,is_consumer,is_full', order='norm_id')
    norms = fetch_all('norms', select='id', order='id')
    if len(definitions) == 0:
        issues.append("safe_scoring_definitions is still EMPTY")
        print(f"         [!!] Table is EMPTY")
    elif len(definitions) < len(norms):
        missing = len(norms) - len(definitions)
        issues.append(f"{missing} norms missing from safe_scoring_definitions")
        print(f"         [~~] {len(definitions)} definitions for {len(norms)} norms -- {missing} missing")
    else:
        ess = sum(1 for d in definitions if d.get('is_essential'))
        con = sum(1 for d in definitions if d.get('is_consumer'))
        print(f"         [OK] {len(definitions)} definitions | Essential: {ess} | Consumer: {con}")

    # 3. Check score distribution is reasonable
    print("\n   [3/5] Checking score distribution...")
    scores = fetch_all('safe_scoring_results', select='product_id,note_finale,total_yes,total_no', order='note_finale')
    score_values = [s['note_finale'] for s in scores if s.get('note_finale') is not None]

    if score_values:
        avg = sum(score_values) / len(score_values)
        perfect = sum(1 for s in score_values if s >= 99)
        very_low = sum(1 for s in score_values if s < 10)

        # A healthy distribution should have avg between 20-70%
        if avg > 80:
            issues.append(f"Average score is suspiciously high: {avg:.1f}%")
            print(f"         [!!] Average: {avg:.1f}% -- still biased high")
        elif avg < 10:
            issues.append(f"Average score is suspiciously low: {avg:.1f}%")
            print(f"         [!!] Average: {avg:.1f}% -- too low")
        else:
            print(f"         [OK] Average: {avg:.1f}% -- looks reasonable")

        print(f"         Products scored: {len(score_values)}")
        print(f"         Perfect (>=99%): {perfect}")
        print(f"         Very low (<10%): {very_low}")
    else:
        issues.append("No scores found at all")
        print(f"         [!!] No scores found")

    # 4. Check YES/NO ratio per provider
    print("\n   [4/5] Checking evaluation quality...")
    evals_detail = fetch_all('evaluations', select='evaluated_by,result', order='evaluated_by')
    by_provider = defaultdict(lambda: {'YES': 0, 'YESp': 0, 'NO': 0, 'N/A': 0, 'TBD': 0, 'total': 0})
    for e in evals_detail:
        provider = e.get('evaluated_by') or 'NULL'
        result = e.get('result', 'UNKNOWN')
        by_provider[provider]['total'] += 1
        if result in by_provider[provider]:
            by_provider[provider][result] += 1

    for provider, counts in sorted(by_provider.items()):
        total = counts['total']
        if total == 0:
            continue
        yes_rate = (counts['YES'] + counts['YESp']) / total * 100
        if yes_rate > 80 and provider != 'norm_applicability':
            issues.append(f"Provider '{provider}' has {yes_rate:.0f}% YES rate -- likely biased")
            print(f"         [!!] {provider}: {yes_rate:.0f}% YES rate ({total:,} evals)")
        else:
            print(f"         [OK] {provider}: {yes_rate:.0f}% YES rate ({total:,} evals)")

    # 5. Products without evaluations
    print("\n   [5/5] Checking orphaned products...")
    products = fetch_all('products', select='id,name', order='name')
    product_ids_with_evals = set(e['product_id'] for e in evals) if evals else set()
    orphaned = [p for p in products if p['id'] not in product_ids_with_evals]
    if orphaned:
        print(f"         [~~] {len(orphaned)} products have ZERO evaluations (need re-evaluation)")
        for p in orphaned[:10]:
            print(f"            [{p['id']:>4}] {p['name'][:40]}")
        if len(orphaned) > 10:
            print(f"            ... and {len(orphaned) - 10} more")
    else:
        print(f"         [OK] All {len(products)} products have evaluations")

    # Final verdict
    print(f"\n   {'=' * 60}")
    if issues:
        print(f"   [!!] VERIFICATION: {len(issues)} ISSUE(S) FOUND")
        for i, issue in enumerate(issues, 1):
            print(f"      {i}. {issue}")
    else:
        print(f"   [OK] VERIFICATION PASSED -- Data is clean and reliable")
    print(f"   {'=' * 60}")

    return {'issues': issues}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='AXE 1: Data Reliability Pipeline')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--analyze', action='store_true', help='Step 1: Audit current state')
    group.add_argument('--execute', action='store_true', help='Step 2: Execute full cleanup pipeline')
    group.add_argument('--verify', action='store_true', help='Step 3: Post-cleanup verification')
    group.add_argument('--full', action='store_true', help='Run all 3 steps sequentially')

    args = parser.parse_args()

    start = time.time()

    if args.analyze:
        step_analyze()
    elif args.execute:
        step_execute()
    elif args.verify:
        step_verify()
    elif args.full:
        step_analyze()
        step_execute()
        step_verify()

    elapsed = time.time() - start
    print(f"\n   Total time: {elapsed:.1f}s")
