#!/usr/bin/env python3
"""Full audit of ALL compatibility records."""

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
    if r.status_code == 201:
        return r.json()
    return None

def main():
    print("\n" + "=" * 60)
    print("  FULL COMPATIBILITY DATA AUDIT")
    print("=" * 60)

    # Type compatibility stats
    print("\n📊 TYPE COMPATIBILITY (via SQL):")
    result = execute_sql("""
        SELECT
            COUNT(*) as total,
            COUNT(security_level) as has_level,
            COUNT(safe_warning_s) as has_s,
            COUNT(safe_warning_a) as has_a,
            COUNT(safe_warning_f) as has_f,
            COUNT(safe_warning_e) as has_e,
            COUNT(compatibility_steps) as has_steps
        FROM type_compatibility
    """)
    if result:
        row = result[0]
        total = row['total']
        print(f"   Total: {total}")
        print(f"   ✅ security_level: {row['has_level']}/{total}")
        print(f"   ✅ safe_warning_s: {row['has_s']}/{total}")
        print(f"   ✅ safe_warning_a: {row['has_a']}/{total}")
        print(f"   ✅ safe_warning_f: {row['has_f']}/{total}")
        print(f"   ✅ safe_warning_e: {row['has_e']}/{total}")
        print(f"   ✅ compatibility_steps: {row['has_steps']}/{total}")

    # Product compatibility stats
    print("\n📊 PRODUCT COMPATIBILITY (via SQL):")
    result = execute_sql("""
        SELECT
            COUNT(*) as total,
            COUNT(security_level) as has_level,
            COUNT(safe_warning_s) as has_s,
            COUNT(safe_warning_a) as has_a,
            COUNT(safe_warning_f) as has_f,
            COUNT(safe_warning_e) as has_e,
            COUNT(compatibility_steps) as has_steps
        FROM product_compatibility
    """)
    if result:
        row = result[0]
        total = row['total']
        print(f"   Total: {total}")
        print(f"   ✅ security_level: {row['has_level']}/{total}")
        print(f"   ✅ safe_warning_s: {row['has_s']}/{total}")
        print(f"   ✅ safe_warning_a: {row['has_a']}/{total}")
        print(f"   ✅ safe_warning_f: {row['has_f']}/{total}")
        print(f"   ✅ safe_warning_e: {row['has_e']}/{total}")
        print(f"   ✅ compatibility_steps: {row['has_steps']}/{total}")

    # Check for any missing
    print("\n🔍 Checking for NULLs:")
    result = execute_sql("""
        SELECT COUNT(*) as count FROM product_compatibility
        WHERE security_level IS NULL
           OR safe_warning_s IS NULL
           OR safe_warning_a IS NULL
           OR safe_warning_f IS NULL
           OR safe_warning_e IS NULL
           OR compatibility_steps IS NULL
    """)
    if result:
        null_count = result[0]['count']
        if null_count == 0:
            print(f"   ✅ No NULL values found!")
        else:
            print(f"   ❌ {null_count} records have at least one NULL field")

    # Show distribution of security levels
    print("\n📈 SECURITY LEVEL DISTRIBUTION:")
    result = execute_sql("""
        SELECT security_level, COUNT(*) as count
        FROM product_compatibility
        GROUP BY security_level
        ORDER BY count DESC
    """)
    if result:
        for row in result:
            print(f"   {row['security_level']}: {row['count']} records")

    # Show a sample with full data
    print("\n📝 SAMPLE COMPLETE RECORD:")
    result = execute_sql("""
        SELECT
            pc.security_level,
            pc.safe_warning_s,
            pc.safe_warning_a,
            pc.safe_warning_f,
            pc.safe_warning_e,
            pc.compatibility_steps,
            pa.name as product_a,
            pb.name as product_b
        FROM product_compatibility pc
        JOIN products pa ON pc.product_a_id = pa.id
        JOIN products pb ON pc.product_b_id = pb.id
        WHERE pc.security_level = 'HIGH'
        LIMIT 1
    """)
    if result:
        rec = result[0]
        print(f"\n   🔐 {rec['product_a']} + {rec['product_b']}")
        print(f"   Level: {rec['security_level']}")
        print(f"   S: {rec['safe_warning_s'][:80]}...")
        print(f"   A: {rec['safe_warning_a'][:80]}...")
        print(f"   F: {rec['safe_warning_f'][:80]}...")
        print(f"   E: {rec['safe_warning_e'][:80]}...")
        print(f"   Steps: {rec['compatibility_steps']}")

    print("\n" + "=" * 60)
    print("  ✅ AUDIT COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
