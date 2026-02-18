#!/usr/bin/env python3
"""
Execute migration 208: Product Pillar Strategic Analyses
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

# Read migration SQL
with open('config/migrations/208_product_pillar_strategic_analyses.sql', 'r', encoding='utf-8') as f:
    MIGRATION_SQL = f.read()

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

print("="*64)
print("  MIGRATION 208: Product Pillar Strategic Analyses")
print("="*64)

print(f"\nProject: {PROJECT_REF}")
print("Creating table: product_pillar_analyses")

print("\nExecuting migration...")

result = run_sql_via_management_api(MIGRATION_SQL)

print(f"\nStatus: {result['status_code']}")

if result['status_code'] in [200, 201]:
    print("Migration executed successfully!")

    # Verify table exists
    sys.path.insert(0, 'src')
    from core.config import SUPABASE_URL, get_supabase_headers

    headers = get_supabase_headers()
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_pillar_analyses?limit=1",
        headers=headers
    )

    if r.status_code == 200:
        print("\nTable product_pillar_analyses verified!")
    else:
        print(f"\nWarning: Could not verify table (HTTP {r.status_code})")
else:
    print(f"Error: {result['response'][:500]}")
