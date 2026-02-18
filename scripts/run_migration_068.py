#!/usr/bin/env python3
"""
Run migration 068 - Data Freshness Tracking
Applies the SQL migration to Supabase via the REST API.

Usage:
    python scripts/run_migration_068.py
"""
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, get_supabase_headers


def run_migration():
    """Execute migration 068 SQL via Supabase RPC."""
    import requests

    print("=" * 60)
    print("MIGRATION 068: Data Freshness Tracking")
    print("=" * 60)

    # Read SQL file
    sql_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'migrations', '068_data_freshness_tracking.sql')

    if not os.path.exists(sql_path):
        print(f"ERROR: SQL file not found at {sql_path}")
        return False

    with open(sql_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    print(f"Read {len(sql)} bytes from SQL file")
    print("-" * 60)

    # Split into individual statements (by GO or double newline after semicolon)
    # For PostgreSQL, we can try to run it all at once via RPC

    # Check if supabase has the exec_sql function (admin only)
    headers = get_supabase_headers()

    # Try running via supabase management API or directly
    # Note: Supabase doesn't allow raw SQL via REST API for security
    # You need to run this via:
    # 1. Supabase Dashboard SQL Editor
    # 2. psql direct connection
    # 3. Supabase CLI

    print("""
IMPORTANT: Supabase REST API doesn't allow raw SQL execution.

To apply this migration, use one of these methods:

1. SUPABASE DASHBOARD (Easiest):
   - Go to https://app.supabase.io
   - Select your project
   - Go to SQL Editor
   - Paste the content of: config/migrations/068_data_freshness_tracking.sql
   - Click "Run"

2. PSQL DIRECT:
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \\
        -f config/migrations/068_data_freshness_tracking.sql

3. SUPABASE CLI:
   supabase db push
   (if migrations are in supabase/migrations folder)

""")

    print("-" * 60)
    print("Testing if migration was already applied...")

    # Test if functions exist
    test_url = f"{SUPABASE_URL}/rest/v1/rpc/get_data_freshness_stats"
    try:
        r = requests.post(test_url, headers=headers, json={}, timeout=10)
        if r.status_code == 200:
            print("SUCCESS: Migration already applied!")
            print(f"Stats: {r.json()}")
            return True
        elif r.status_code == 404:
            print("Migration NOT applied yet (function not found)")
            return False
        else:
            print(f"Unknown status: {r.status_code} - {r.text[:200]}")
            return False
    except Exception as e:
        print(f"Error testing migration: {e}")
        return False


def test_freshness_queries():
    """Test the freshness tracking queries after migration is applied."""
    import requests

    headers = get_supabase_headers()

    print("\n" + "=" * 60)
    print("TESTING FRESHNESS FUNCTIONS")
    print("=" * 60)

    # Test 1: get_data_freshness_stats
    print("\n1. get_data_freshness_stats():")
    url = f"{SUPABASE_URL}/rest/v1/rpc/get_data_freshness_stats"
    r = requests.post(url, headers=headers, json={}, timeout=10)
    if r.status_code == 200:
        import json
        print(json.dumps(r.json(), indent=2))
    else:
        print(f"   Error: {r.status_code}")

    # Test 2: get_norms_needing_summary
    print("\n2. get_norms_needing_summary(limit=5):")
    url = f"{SUPABASE_URL}/rest/v1/rpc/get_norms_needing_summary"
    r = requests.post(url, headers=headers, json={'p_limit': 5}, timeout=10)
    if r.status_code == 200:
        norms = r.json()
        print(f"   Found {len(norms)} norms needing summary")
        for n in norms[:3]:
            print(f"   - {n.get('norm_code')}: {n.get('reason')}")
    else:
        print(f"   Error: {r.status_code}")

    # Test 3: get_pending_evaluations
    print("\n3. get_pending_evaluations(limit=5):")
    url = f"{SUPABASE_URL}/rest/v1/rpc/get_pending_evaluations"
    r = requests.post(url, headers=headers, json={'p_limit': 5}, timeout=10)
    if r.status_code == 200:
        evals = r.json()
        print(f"   Found {len(evals)} pending evaluations")
        for e in evals[:3]:
            print(f"   - {e.get('product_slug')} x {e.get('norm_code')}: {e.get('reason')}")
    else:
        print(f"   Error: {r.status_code}")

    print("\n" + "=" * 60)


if __name__ == '__main__':
    applied = run_migration()

    if applied:
        test_freshness_queries()
    else:
        print("\nAfter applying the migration, run this script again to test.")
