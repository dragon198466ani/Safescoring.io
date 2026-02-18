#!/usr/bin/env python3
"""
Execute $SAFE Points + Shop migrations via Supabase Management API.
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
    print("  $SAFE POINTS + SHOP SYSTEM MIGRATION")
    print("=" * 64)

    print(f"\nProject: {PROJECT_REF}")

    # Read the combined SQL file
    with open("config/migrations/SAFE_POINTS_COMBINED.sql", "r", encoding="utf-8") as f:
        full_sql = f.read()

    # Split into sections (by major separators)
    sections = []
    current = []

    for line in full_sql.split('\n'):
        if line.strip().startswith('-- PART') or line.strip().startswith('-- DONE!'):
            if current:
                sections.append('\n'.join(current))
                current = []
        current.append(line)

    if current:
        sections.append('\n'.join(current))

    print(f"\nFound {len(sections)} sections to execute")

    # Execute each section
    for i, section in enumerate(sections):
        if not section.strip() or section.strip().startswith('-- ===='):
            continue

        # Get first meaningful line for preview
        lines = [l for l in section.split('\n') if l.strip() and not l.strip().startswith('--')]
        preview = lines[0][:60] if lines else "SQL section"

        print(f"\n[{i+1}/{len(sections)}] {preview}...")

        result = run_sql_via_management_api(section)

        if result['status_code'] in [200, 201]:
            print("   OK")
        elif 'already exists' in result['response'].lower() or 'duplicate' in result['response'].lower():
            print("   SKIP (already exists)")
        else:
            print(f"   Status: {result['status_code']}")
            # Show first 200 chars of error
            if result['status_code'] >= 400:
                print(f"   Error: {result['response'][:200]}")

    # Verify tables exist
    print("\n" + "=" * 64)
    print("VERIFICATION")
    print("=" * 64)

    tables = ["user_points", "points_transactions", "norm_verifications", "shop_items", "user_purchases", "user_badges"]

    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

    try:
        from core.config import SUPABASE_URL, SUPABASE_HEADERS

        for table in tables:
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/{table}?limit=0",
                headers=SUPABASE_HEADERS
            )
            if r.status_code == 200:
                print(f"   OK: {table}")
            else:
                print(f"   Error: {table} - {r.status_code}")

    except Exception as e:
        print(f"   Verification skipped: {e}")

    print("\nDone!")


if __name__ == "__main__":
    main()
