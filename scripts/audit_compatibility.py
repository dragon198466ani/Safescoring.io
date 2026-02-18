#!/usr/bin/env python3
"""Audit compatibility data completeness."""

import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import CONFIG

SUPABASE_URL = CONFIG.get('SUPABASE_URL', 'https://ajdncttomdqojlozxjxu.supabase.co')
SERVICE_ROLE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

def main():
    print("\n" + "=" * 60)
    print("  COMPATIBILITY DATA AUDIT")
    print("=" * 60)

    # Check type_compatibility
    print("\n📊 TYPE COMPATIBILITY:")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/type_compatibility?select=id,security_level,safe_warning_s,safe_warning_a,safe_warning_f,safe_warning_e,compatibility_steps', headers=HEADERS)
    tc = r.json() if r.status_code == 200 else []
    print(f"   Total records: {len(tc)}")

    null_level = sum(1 for t in tc if not t.get('security_level'))
    null_s = sum(1 for t in tc if not t.get('safe_warning_s'))
    null_a = sum(1 for t in tc if not t.get('safe_warning_a'))
    null_f = sum(1 for t in tc if not t.get('safe_warning_f'))
    null_e = sum(1 for t in tc if not t.get('safe_warning_e'))
    null_steps = sum(1 for t in tc if not t.get('compatibility_steps'))

    print(f"   ❌ Missing security_level: {null_level}")
    print(f"   ❌ Missing safe_warning_s: {null_s}")
    print(f"   ❌ Missing safe_warning_a: {null_a}")
    print(f"   ❌ Missing safe_warning_f: {null_f}")
    print(f"   ❌ Missing safe_warning_e: {null_e}")
    print(f"   ❌ Missing compatibility_steps: {null_steps}")

    complete_tc = len(tc) - max(null_level, null_s, null_a, null_f, null_e, null_steps)
    print(f"   ✅ Complete records: {complete_tc}/{len(tc)}")

    # Check product_compatibility totals
    print("\n📊 PRODUCT COMPATIBILITY:")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_compatibility?select=count', headers={**HEADERS, 'Prefer': 'count=exact'})
    total_pc = int(r.headers.get('content-range', '0-0/0').split('/')[-1])
    print(f"   Total records: {total_pc}")

    # Sample check (first 2000)
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_compatibility?select=id,security_level,safe_warning_s,safe_warning_a,safe_warning_f,safe_warning_e,compatibility_steps&limit=2000', headers=HEADERS)
    pc = r.json() if r.status_code == 200 else []

    null_level = sum(1 for p in pc if not p.get('security_level'))
    null_s = sum(1 for p in pc if not p.get('safe_warning_s'))
    null_a = sum(1 for p in pc if not p.get('safe_warning_a'))
    null_f = sum(1 for p in pc if not p.get('safe_warning_f'))
    null_e = sum(1 for p in pc if not p.get('safe_warning_e'))
    null_steps = sum(1 for p in pc if not p.get('compatibility_steps'))

    print(f"   Sample (2000 records):")
    print(f"   ❌ Missing security_level: {null_level}")
    print(f"   ❌ Missing safe_warning_s: {null_s}")
    print(f"   ❌ Missing safe_warning_a: {null_a}")
    print(f"   ❌ Missing safe_warning_f: {null_f}")
    print(f"   ❌ Missing safe_warning_e: {null_e}")
    print(f"   ❌ Missing compatibility_steps: {null_steps}")

    # Show example
    print("\n📝 EXAMPLE DATA (type_compatibility):")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/type_compatibility?select=*,type_a:product_types!type_a_id(code),type_b:product_types!type_b_id(code)&limit=2', headers=HEADERS)
    examples = r.json() if r.status_code == 200 else []

    for ex in examples:
        type_a = ex.get('type_a', {}).get('code', '?') if ex.get('type_a') else '?'
        type_b = ex.get('type_b', {}).get('code', '?') if ex.get('type_b') else '?'
        print(f"\n   {type_a} + {type_b}:")
        print(f"   Level: {ex.get('security_level')}")
        s = ex.get('safe_warning_s', '') or ''
        e = ex.get('safe_warning_e', '') or ''
        print(f"   S: {s[:70]}...")
        print(f"   E: {e[:70]}...")
        steps = ex.get('compatibility_steps') or []
        print(f"   Steps: {steps}")

    # Show product example
    print("\n📝 EXAMPLE DATA (product_compatibility):")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_compatibility?select=*,product_a:products!product_a_id(name,slug),product_b:products!product_b_id(name,slug)&limit=2', headers=HEADERS)
    examples = r.json() if r.status_code == 200 else []

    for ex in examples:
        prod_a = ex.get('product_a', {}).get('name', '?') if ex.get('product_a') else '?'
        prod_b = ex.get('product_b', {}).get('name', '?') if ex.get('product_b') else '?'
        print(f"\n   {prod_a} + {prod_b}:")
        print(f"   Level: {ex.get('security_level')}")
        s = ex.get('safe_warning_s', '') or ''
        e = ex.get('safe_warning_e', '') or ''
        print(f"   S: {s[:70]}...")
        print(f"   E: {e[:70]}...")
        steps = ex.get('compatibility_steps') or []
        print(f"   Steps: {steps}")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
