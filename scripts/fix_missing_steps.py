#!/usr/bin/env python3
"""Fix missing compatibility_steps by checking all records."""

import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import CONFIG

TOKEN = 'sbp_e4b8b78cd32053ff0436cea95ec5adb21a9db936'
PROJECT_REF = 'ajdncttomdqojlozxjxu'

SUPABASE_URL = CONFIG.get('SUPABASE_URL', 'https://ajdncttomdqojlozxjxu.supabase.co')
SERVICE_ROLE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

def execute_sql(query):
    r = requests.post(
        f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query',
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        json={'query': query}
    )
    return r.status_code == 201, r.text

def format_pg_array(arr):
    """Format Python list as PostgreSQL array literal."""
    if not arr:
        return "ARRAY[]::TEXT[]"
    escaped = [s.replace("'", "''") for s in arr]
    return "ARRAY[" + ",".join([f"'{s}'" for s in escaped]) + "]"

# Default steps for any combination
DEFAULT_STEPS = [
    'Verify the compatibility between both products before starting.',
    'Always double-check addresses and transaction details.',
    'Start with a small test transaction to confirm the flow works correctly.'
]

def main():
    print("\n" + "=" * 60)
    print("  FIXING MISSING COMPATIBILITY STEPS")
    print("=" * 60)

    # Find records with NULL compatibility_steps
    print("\n🔍 Finding records with missing steps...")

    # Use SQL to find and count
    ok, result = execute_sql("SELECT COUNT(*) FROM product_compatibility WHERE compatibility_steps IS NULL")
    print(f"   SQL check result: {ok}")

    # Get all records with NULL steps
    offset = 0
    limit = 500
    total_fixed = 0

    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id&compatibility_steps=is.null&offset={offset}&limit={limit}',
            headers=HEADERS
        )

        if r.status_code != 200:
            print(f"   Error: {r.status_code}")
            break

        records = r.json()

        if not records:
            break

        print(f"   Found {len(records)} records with NULL steps at offset {offset}")

        # Update them with default steps
        ids = [str(rec['id']) for rec in records]

        sql = f"""
        UPDATE product_compatibility
        SET compatibility_steps = {format_pg_array(DEFAULT_STEPS)}
        WHERE id IN ({','.join(ids)})
        """

        ok, _ = execute_sql(sql)
        if ok:
            total_fixed += len(records)
            print(f"   ✅ Fixed {len(records)} records")
        else:
            print(f"   ❌ Failed to fix batch")

        offset += limit

        if offset > 20000:  # Safety limit
            break

    print(f"\n   ✅ Total fixed: {total_fixed}")

    # Verify
    print("\n🔍 Verifying...")
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_compatibility?select=count&compatibility_steps=is.null',
        headers={**HEADERS, 'Prefer': 'count=exact'}
    )
    remaining = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
    print(f"   Remaining NULL: {remaining}")

    print("\n" + "=" * 60)
    print("  ✅ DONE")
    print("=" * 60)

if __name__ == "__main__":
    main()
