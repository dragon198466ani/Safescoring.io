#!/usr/bin/env python3
"""Check DEX types and their norm applicability"""

import requests
import json

# Load config
config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Get product types
print("Fetching product types...")
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*', headers=headers)

if r.status_code != 200:
    print(f"Error: {r.status_code}")
    print(r.text)
    exit(1)

types_data = r.json()

print('\nPRODUCT TYPES:')
print('=' * 80)

dex_types = []
for t in sorted(types_data, key=lambda x: (x.get('category', ''), x.get('code', ''))):
    tid = t.get('id', 'N/A')
    code = t.get('code', 'N/A')
    name = t.get('name', 'N/A')
    category = t.get('category', 'N/A')
    print(f'{tid:3} | {code:15s} | {name:35s} | {category}')

    if 'dex' in str(code).lower() or 'dex' in str(name).lower() or 'exchange' in str(name).lower():
        dex_types.append(t)
        print(f'    >>> POTENTIAL DEX TYPE <<<')

print('\n' + '=' * 80)
print(f'\nFound {len(dex_types)} potential DEX types:\n')
for t in dex_types:
    print(f"  - ID: {t['id']}, Code: {t.get('code')}, Name: {t.get('name')}")

if dex_types:
    # Get full info for DEX types
    print('\n' + '=' * 80)
    print('DETAILED DEX TYPE INFO:')
    print('=' * 80)

    for t in dex_types:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?id=eq.{t['id']}&select=*",
            headers=headers
        )
        if r.status_code == 200:
            full_info = r.json()[0] if r.json() else {}
            print(f"\n>>> TYPE: {full_info.get('name')} (ID: {full_info.get('id')})")
            print(f"    Code: {full_info.get('code')}")
            print(f"    Category: {full_info.get('category')}")
            print(f"    Description: {full_info.get('description', 'N/A')[:200]}")

            # Check norm applicability
            r2 = requests.get(
                f"{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{t['id']}&select=norm_id,is_applicable",
                headers=headers
            )
            if r2.status_code == 200:
                applicability = r2.json()
                applicable = sum(1 for a in applicability if a.get('is_applicable'))
                not_applicable = len(applicability) - applicable
                print(f"    Norm applicability: {applicable} applicable, {not_applicable} N/A (total: {len(applicability)})")
