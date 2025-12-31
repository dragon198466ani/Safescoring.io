#!/usr/bin/env python3
"""
SAFESCORING.IO - Initialize Moat Features
Run this script AFTER executing moat_features.sql in Supabase

This script:
1. Verifies the tables exist
2. Records initial score snapshots for all products
3. Shows the moat summary
"""

import requests
from datetime import datetime
import time

# Import from common module
from .config import SUPABASE_URL, get_supabase_headers

HEADERS = get_supabase_headers('return=representation')


def check_tables_exist():
    """Check if moat tables exist in the database."""
    print("\n[1/3] Checking if moat tables exist...")

    tables_to_check = ['score_history', 'security_incidents', 'incident_product_impact']
    results = {}

    for table in tables_to_check:
        try:
            r = requests.get(
                f'{SUPABASE_URL}/rest/v1/{table}?limit=1',
                headers=HEADERS,
                timeout=10
            )
            exists = r.status_code == 200
            results[table] = exists
            status = "[OK] EXISTS" if exists else "[X] MISSING"
            print(f"   {table}: {status}")
        except Exception as e:
            results[table] = False
            print(f"   {table}: [X] ERROR - {e}")

    all_exist = all(results.values())

    if not all_exist:
        print("\n" + "=" * 60)
        print("[!] TABLES MISSING!")
        print("=" * 60)
        print("\nPlease execute the SQL first:")
        print("\n1. Open Supabase Dashboard: https://supabase.com/dashboard")
        print("2. Go to SQL Editor")
        print("3. Copy-paste content from: config/moat_features.sql")
        print("4. Click 'Run'")
        print("5. Run this script again")
        print("\n" + "=" * 60)
        return False

    print("\n   [OK] All tables exist!")
    return True


def record_initial_snapshots():
    """Record initial score snapshots for all products."""
    print("\n[2/3] Recording initial score snapshots...")

    # Get all products with scores from safe_scoring_results
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_results?select=*,products(id,name)',
        headers=HEADERS,
        timeout=60
    )

    if r.status_code != 200:
        print(f"   [X] Failed to load products: {r.status_code}")
        return 0

    results = r.json()
    print(f"   Found {len(results)} products with scores")

    success_count = 0

    for i, ssr in enumerate(results, 1):
        product = ssr.get('products', {})
        product_id = ssr.get('product_id')
        product_name = product.get('name', f'Product {product_id}') if product else f'Product {product_id}'

        if not ssr.get('note_finale'):
            continue

        # Create history record using safe_scoring_results data
        history_data = {
            'product_id': product_id,
            'recorded_at': datetime.now().isoformat(),
            'safe_score': ssr.get('note_finale'),
            'score_s': ssr.get('score_s'),
            'score_a': ssr.get('score_a'),
            'score_f': ssr.get('score_f'),
            'score_e': ssr.get('score_e'),
            'consumer_score': ssr.get('note_consumer'),
            'essential_score': ssr.get('note_essential'),
            'total_evaluations': ssr.get('total_norms_evaluated', 0),
            'total_yes': ssr.get('total_yes', 0),
            'total_no': ssr.get('total_no', 0),
            'total_na': ssr.get('total_na', 0),
            'total_tbd': ssr.get('total_tbd', 0),
            'previous_safe_score': None,
            'score_change': None,
            'change_reason': 'Initial snapshot - Moat features initialized',
            'triggered_by': 'init_moat'
        }

        r_post = requests.post(
            f'{SUPABASE_URL}/rest/v1/score_history',
            headers={**HEADERS, 'Prefer': 'return=minimal'},
            json=history_data,
            timeout=30
        )

        if r_post.status_code in [200, 201, 204]:
            success_count += 1
            safe_score = ssr.get('note_finale', 'N/A')
            if isinstance(safe_score, (int, float)):
                safe_score = f"{safe_score:.1f}%"
            print(f"   [{i:3}/{len(results)}] {product_name[:35]:<35} | {safe_score}")
        else:
            print(f"   [{i:3}/{len(results)}] {product_name[:35]:<35} | ERROR: {r_post.status_code}")

        # Small delay to avoid rate limiting
        if i % 10 == 0:
            time.sleep(0.2)

    print(f"\n   [OK] {success_count} snapshots recorded")
    return success_count


def show_moat_summary():
    """Display the moat summary."""
    print("\n[3/3] Moat Summary")
    print("=" * 60)

    # Count score history
    r_history = requests.get(
        f'{SUPABASE_URL}/rest/v1/score_history?select=id',
        headers={**HEADERS, 'Prefer': 'count=exact'},
        timeout=30
    )
    history_count = 0
    if r_history.status_code == 200:
        count_header = r_history.headers.get('content-range', '')
        if '/' in count_header:
            history_count = int(count_header.split('/')[1])

    # Count incidents
    r_incidents = requests.get(
        f'{SUPABASE_URL}/rest/v1/security_incidents?select=id',
        headers={**HEADERS, 'Prefer': 'count=exact'},
        timeout=30
    )
    incident_count = 0
    if r_incidents.status_code == 200:
        count_header = r_incidents.headers.get('content-range', '')
        if '/' in count_header:
            incident_count = int(count_header.split('/')[1])

    # Count evaluations
    r_evals = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?select=id',
        headers={**HEADERS, 'Prefer': 'count=exact'},
        timeout=30
    )
    eval_count = 0
    if r_evals.status_code == 200:
        count_header = r_evals.headers.get('content-range', '')
        if '/' in count_header:
            eval_count = int(count_header.split('/')[1])

    total = history_count + incident_count + eval_count

    print(f"""
+============================================================+
|                      MOAT SUMMARY                          |
+============================================================+
|                                                            |
|  Score History Snapshots:  {history_count:>10,}                     |
|  Security Incidents:       {incident_count:>10,}                     |
|  Product Evaluations:      {eval_count:>10,}                     |
|  ----------------------------------------------------------  |
|  TOTAL UNIQUE DATA:        {total:>10,}                     |
|                                                            |
+============================================================+
|                                                            |
|  Ces donnees sont IMPOSSIBLES a reproduire                 |
|  par un concurrent ou une IA.                              |
|                                                            |
+============================================================+
""")


def main():
    print("=" * 60)
    print("SAFESCORING - MOAT FEATURES INITIALIZATION")
    print("=" * 60)

    # Step 1: Check tables
    if not check_tables_exist():
        return

    # Step 2: Record initial snapshots
    record_initial_snapshots()

    # Step 3: Show summary
    show_moat_summary()

    print("\n[OK] Moat features initialized successfully!")
    print("\nNext steps:")
    print("  1. Add to monthly cron: manager.record_all_scores_snapshot()")
    print("  2. Track incidents when they occur")
    print("  3. Use the React components to display this data")


if __name__ == '__main__':
    main()
