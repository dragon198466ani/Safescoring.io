#!/usr/bin/env python3
"""
Execute SQL migration via Supabase Management API.
"""

import sys
import io
import requests

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Supabase Management API
SUPABASE_ACCESS_TOKEN = "sbp_e4b8b78cd32053ff0436cea95ec5adb21a9db936"
PROJECT_REF = "ajdncttomdqojlozxjxu"

# Migration SQL
MIGRATION_SQL = """
-- Add SAFE pillar warning columns to type_compatibility
ALTER TABLE type_compatibility
ADD COLUMN IF NOT EXISTS security_level VARCHAR(10),
ADD COLUMN IF NOT EXISTS safe_warning_s TEXT,
ADD COLUMN IF NOT EXISTS safe_warning_a TEXT,
ADD COLUMN IF NOT EXISTS safe_warning_f TEXT,
ADD COLUMN IF NOT EXISTS safe_warning_e TEXT;

-- Add SAFE pillar warning columns to product_compatibility
ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS security_level VARCHAR(10),
ADD COLUMN IF NOT EXISTS safe_warning_s TEXT,
ADD COLUMN IF NOT EXISTS safe_warning_a TEXT,
ADD COLUMN IF NOT EXISTS safe_warning_f TEXT,
ADD COLUMN IF NOT EXISTS safe_warning_e TEXT;
"""

def run_sql_via_management_api(sql: str) -> dict:
    """Execute SQL via Supabase Management API."""
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

    headers = {
        "Authorization": f"Bearer {SUPABASE_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {"query": sql}

    response = requests.post(url, headers=headers, json=payload, timeout=60)

    return {
        "status_code": response.status_code,
        "response": response.text
    }


def main():
    print("=" * 64)
    print("  SUPABASE SQL MIGRATION VIA MANAGEMENT API")
    print("=" * 64)

    print(f"\nProject: {PROJECT_REF}")
    print(f"Token: {SUPABASE_ACCESS_TOKEN[:10]}...")

    print("\n📋 SQL Migration:")
    print("-" * 40)
    for line in MIGRATION_SQL.strip().split('\n'):
        if line.strip():
            print(f"  {line}")
    print("-" * 40)

    print("\n🚀 Executing migration...")

    result = run_sql_via_management_api(MIGRATION_SQL)

    print(f"\n📊 Result:")
    print(f"   Status: {result['status_code']}")

    if result['status_code'] == 200:
        print("   ✅ Migration executed successfully!")
    elif result['status_code'] == 201:
        print("   ✅ Migration created successfully!")
    else:
        print(f"   ❌ Error: {result['response'][:500]}")

    # Verify columns exist
    print("\n🔍 Verifying columns...")

    import json
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
    from core.config import SUPABASE_URL, SUPABASE_HEADERS

    # Check type_compatibility columns
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/type_compatibility?select=security_level,safe_warning_s,safe_warning_a,safe_warning_f,safe_warning_e&limit=1",
        headers=SUPABASE_HEADERS
    )

    if r.status_code == 200:
        print("   ✅ type_compatibility: Columns exist!")
    else:
        print(f"   ❌ type_compatibility: {r.status_code} - {r.text[:100]}")

    # Check product_compatibility columns
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_compatibility?select=security_level,safe_warning_s,safe_warning_a,safe_warning_f,safe_warning_e&limit=1",
        headers=SUPABASE_HEADERS
    )

    if r.status_code == 200:
        print("   ✅ product_compatibility: Columns exist!")
    else:
        print(f"   ❌ product_compatibility: {r.status_code} - {r.text[:100]}")

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
