#!/usr/bin/env python3
"""
SAFESCORING.IO - Monthly Evaluation Drift Detector
====================================================
Automated monthly audit to catch evaluation quality issues early:

1. YES/NO ratio per provider — alerts if any provider has >80% YES (hallucination)
2. safe_scoring_definitions integrity — alerts if table is empty or incomplete
3. Score distribution sanity — alerts if avg score is suspiciously high/low
4. New NULL evaluations — alerts if unattributed evaluations appear
5. Orphaned products — products with zero evaluations

Designed to run as a monthly cron job.
Results are logged to stdout and optionally to Supabase audit_logs table.

Usage:
    python -m src.automation.monthly_eval_audit
    python -m src.automation.monthly_eval_audit --log-to-db
"""

import sys
import os
import argparse
import json
import time
import requests
from datetime import datetime
from collections import Counter, defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS, get_supabase_headers
from src.core.supabase_pagination import fetch_all


def run_audit():
    """Run the full monthly drift detection audit."""
    timestamp = datetime.now().isoformat()
    print("=" * 70)
    print("   MONTHLY EVALUATION DRIFT AUDIT")
    print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    alerts = []   # Critical issues
    warnings = [] # Non-critical but notable

    # ---------------------------------------------------------------
    # CHECK 1: Provider YES/NO ratios
    # ---------------------------------------------------------------
    print("\n   [1/5] Provider evaluation quality...")
    evals = fetch_all('evaluations', select='evaluated_by,result', order='evaluated_by')
    total_evals = len(evals)

    by_provider = defaultdict(lambda: Counter())
    for e in evals:
        provider = e.get('evaluated_by') or 'NULL'
        by_provider[provider][e.get('result', 'UNKNOWN')] += 1

    for provider, results in sorted(by_provider.items()):
        total = sum(results.values())
        if total == 0:
            continue
        yes_count = results.get('YES', 0) + results.get('YESp', 0)
        yes_rate = yes_count / total * 100

        if provider == 'NULL':
            if total > 0:
                alerts.append({
                    'check': 'null_provider',
                    'message': f'{total:,} evaluations with evaluated_by=NULL (biased, {yes_rate:.0f}% YES)',
                    'count': total,
                    'yes_rate': round(yes_rate, 1),
                })
                print(f"         [!!] NULL: {total:,} evals ({yes_rate:.0f}% YES) -- SHOULD BE ZERO")
        elif provider == 'norm_applicability':
            print(f"         [OK] {provider}: {total:,} evals (all N/A -- correct)")
        elif yes_rate > 80:
            alerts.append({
                'check': 'high_yes_rate',
                'message': f'Provider "{provider}" has {yes_rate:.0f}% YES rate — likely hallucinating',
                'provider': provider,
                'count': total,
                'yes_rate': round(yes_rate, 1),
            })
            print(f"         [!!] {provider}: {yes_rate:.0f}% YES rate ({total:,} evals) -- HALLUCINATION RISK")
        elif yes_rate > 60:
            warnings.append({
                'check': 'elevated_yes_rate',
                'message': f'Provider "{provider}" has {yes_rate:.0f}% YES rate — monitor',
                'provider': provider,
                'yes_rate': round(yes_rate, 1),
            })
            print(f"         [~~] {provider}: {yes_rate:.0f}% YES rate ({total:,} evals) -- elevated")
        else:
            print(f"         [OK] {provider}: {yes_rate:.0f}% YES rate ({total:,} evals)")

    # ---------------------------------------------------------------
    # CHECK 2: safe_scoring_definitions integrity
    # ---------------------------------------------------------------
    print("\n   [2/5] safe_scoring_definitions integrity...")
    definitions = fetch_all('safe_scoring_definitions', select='norm_id,is_essential,is_consumer,is_full', order='norm_id')
    norms = fetch_all('norms', select='id', order='id')

    if len(definitions) == 0:
        alerts.append({
            'check': 'definitions_empty',
            'message': 'safe_scoring_definitions table is EMPTY — all norms default to is_full=True',
        })
        print(f"         [!!] TABLE IS EMPTY")
    elif len(definitions) < len(norms):
        missing = len(norms) - len(definitions)
        warnings.append({
            'check': 'definitions_incomplete',
            'message': f'{missing} norms missing from safe_scoring_definitions',
            'missing': missing,
        })
        print(f"         [~~] {len(definitions)}/{len(norms)} -- {missing} norms missing")
    else:
        ess = sum(1 for d in definitions if d.get('is_essential'))
        con = sum(1 for d in definitions if d.get('is_consumer'))
        print(f"         [OK] {len(definitions)} definitions | Essential: {ess} | Consumer: {con}")

    # ---------------------------------------------------------------
    # CHECK 3: Score distribution sanity
    # ---------------------------------------------------------------
    print("\n   [3/5] Score distribution sanity...")
    scores = fetch_all('safe_scoring_results', select='product_id,note_finale', order='note_finale')
    score_values = [s['note_finale'] for s in scores if s.get('note_finale') is not None]

    if score_values:
        avg = sum(score_values) / len(score_values)
        median = sorted(score_values)[len(score_values) // 2]
        perfect = sum(1 for s in score_values if s >= 99)
        very_low = sum(1 for s in score_values if s < 10)

        if avg > 75:
            alerts.append({
                'check': 'score_bias_high',
                'message': f'Average score {avg:.1f}% is suspiciously high — possible YES bias',
                'avg_score': round(avg, 1),
            })
            print(f"         [!!] Average: {avg:.1f}% -- too high (bias suspected)")
        elif avg > 60:
            warnings.append({
                'check': 'score_elevated',
                'message': f'Average score {avg:.1f}% is elevated — monitor',
                'avg_score': round(avg, 1),
            })
            print(f"         [~~] Average: {avg:.1f}% -- slightly high")
        else:
            print(f"         [OK] Average: {avg:.1f}% | Median: {median:.1f}%")

        if perfect > len(score_values) * 0.1:
            warnings.append({
                'check': 'too_many_perfect',
                'message': f'{perfect} products have perfect scores (>=99%) -- {perfect*100//len(score_values)}%',
            })
        print(f"         Products: {len(score_values)} | Perfect: {perfect} | Very low: {very_low}")
    else:
        alerts.append({'check': 'no_scores', 'message': 'No scores found at all'})
        print(f"         [!!] No scores found")

    # ---------------------------------------------------------------
    # CHECK 4: Orphaned products (zero evaluations)
    # ---------------------------------------------------------------
    print("\n   [4/5] Orphaned products...")
    products = fetch_all('products', select='id', order='id')
    eval_product_ids = set()
    for e in evals:
        eval_product_ids.add(e.get('product_id'))

    orphaned_count = sum(1 for p in products if p['id'] not in eval_product_ids)
    if orphaned_count > 0:
        warnings.append({
            'check': 'orphaned_products',
            'message': f'{orphaned_count} products have zero evaluations',
            'count': orphaned_count,
        })
        print(f"         [~~] {orphaned_count} products with zero evaluations")
    else:
        print(f"         [OK] All {len(products)} products have evaluations")

    # ---------------------------------------------------------------
    # CHECK 5: Evaluation freshness
    # ---------------------------------------------------------------
    print("\n   [5/5] Evaluation freshness...")
    recent_scores = fetch_all(
        'safe_scoring_results',
        select='product_id,calculated_at',
        order='calculated_at.desc',
        page_size=1
    )
    if recent_scores:
        last_calc = recent_scores[0].get('calculated_at', 'unknown')
        print(f"         Last score calculation: {last_calc}")
    else:
        print(f"         [~~] No score calculation timestamp found")

    # ---------------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------------
    print(f"\n{'=' * 70}")
    print(f"   AUDIT SUMMARY")
    print(f"{'=' * 70}")
    print(f"   Total evaluations: {total_evals:,}")
    print(f"   Total products: {len(products)}")
    print(f"   Alerts (critical): {len(alerts)}")
    print(f"   Warnings: {len(warnings)}")

    if alerts:
        print(f"\n   [!!] ALERTS:")
        for a in alerts:
            print(f"      - {a['message']}")

    if warnings:
        print(f"\n   [~~] WARNINGS:")
        for w in warnings:
            print(f"      - {w['message']}")

    if not alerts and not warnings:
        print(f"\n   [OK] ALL CHECKS PASSED -- Evaluation system is healthy")

    print(f"{'=' * 70}\n")

    return {
        'timestamp': timestamp,
        'total_evals': total_evals,
        'total_products': len(products),
        'alerts': alerts,
        'warnings': warnings,
        'healthy': len(alerts) == 0,
    }


def log_to_database(report):
    """Log audit results to Supabase."""
    print("   Logging to database...")
    headers = get_supabase_headers(prefer='return=minimal')

    data = {
        'audit_type': 'monthly_eval_drift',
        'created_at': report['timestamp'],
        'status': 'healthy' if report['healthy'] else 'alert',
        'alerts_count': len(report['alerts']),
        'warnings_count': len(report['warnings']),
        'details': json.dumps({
            'total_evals': report['total_evals'],
            'total_products': report['total_products'],
            'alerts': report['alerts'],
            'warnings': report['warnings'],
        }),
    }

    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/audit_logs',
        headers=headers,
        json=data,
        timeout=30
    )

    if r.status_code in (200, 201, 204):
        print("   ✅ Logged to audit_logs")
    else:
        # Table might not exist — that's OK
        print(f"   ⚠️  Could not log to audit_logs: {r.status_code} (table may not exist)")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Monthly evaluation drift audit')
    parser.add_argument('--log-to-db', action='store_true', help='Log results to Supabase audit_logs table')
    args = parser.parse_args()

    report = run_audit()

    if args.log_to_db:
        log_to_database(report)

    # Exit with non-zero code if alerts found (useful for CI/CD)
    sys.exit(1 if report['alerts'] else 0)
