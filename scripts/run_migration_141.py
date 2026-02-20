#!/usr/bin/env python3
"""
Execute migration 141 (Community Consensus System) via Supabase Management API.
"""

import sys
import io
import requests
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Supabase Management API
SUPABASE_ACCESS_TOKEN = "sbp_e4b8b78cd32053ff0436cea95ec5adb21a9db936"
PROJECT_REF = "ajdncttomdqojlozxjxu"

# Read migration file
migration_file = Path(__file__).parent.parent / "config" / "migrations" / "141_community_consensus_system.sql"
MIGRATION_SQL = migration_file.read_text(encoding='utf-8')


def run_sql_via_management_api(sql: str) -> dict:
    """Execute SQL via Supabase Management API."""
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

    headers = {
        "Authorization": f"Bearer {SUPABASE_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {"query": sql}

    response = requests.post(url, headers=headers, json=payload, timeout=120)

    return {
        "status_code": response.status_code,
        "response": response.text
    }


def main():
    print("=" * 64)
    print("  MIGRATION 141: Community Consensus System (Fouloscopie)")
    print("=" * 64)

    print(f"\nProject: {PROJECT_REF}")
    print(f"Token: {SUPABASE_ACCESS_TOKEN[:10]}...")

    print("\n📋 Migration summary:")
    print("  - Add community_status, community_decision, community_decided_at to evaluations")
    print("  - Create token_transactions table")
    print("  - Create increment_tokens() function")

    print("\n🚀 Executing migration...")

    result = run_sql_via_management_api(MIGRATION_SQL)

    print(f"\n📊 Result:")
    print(f"   Status: {result['status_code']}")

    if result['status_code'] in [200, 201]:
        print("   ✅ Migration executed successfully!")
    else:
        print(f"   ❌ Error: {result['response'][:500]}")

    # Verify columns exist
    print("\n🔍 Verifying schema...")

    sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
    from core.config import SUPABASE_URL, SUPABASE_HEADERS

    # Check evaluations columns
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?select=community_status,community_decision,community_decided_at&limit=1",
        headers=SUPABASE_HEADERS
    )

    if r.status_code == 200:
        print("   ✅ evaluations: Columns exist!")
    else:
        print(f"   ❌ evaluations: {r.status_code} - {r.text[:100]}")

    # Check token_transactions table
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/token_transactions?select=id,user_hash,action_type,tokens_amount&limit=1",
        headers=SUPABASE_HEADERS
    )

    if r.status_code == 200:
        print("   ✅ token_transactions: Table exists!")
    else:
        print(f"   ⚠️  token_transactions: {r.status_code}")

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
