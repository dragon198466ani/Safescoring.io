#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify all Supabase tables and their structure"""

import requests
import json
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

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

print("="*100)
print("VERIFICATION: ALL SUPABASE TABLES")
print("="*100)

# List of expected tables based on schema
tables_to_check = [
    'product_types',
    'brands',
    'products',
    'norms',
    'norm_applicability',
    'evaluations',
    'subscription_plans',
    'subscriptions',
    'user_setups',
]

print("\nChecking tables:\n")

for table in tables_to_check:
    print(f"📋 {table}")

    # Try to get count and sample
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/{table}?select=*&limit=1',
        headers=headers
    )

    if r.status_code == 200:
        data = r.json()

        # Get total count
        r_count = requests.get(
            f'{SUPABASE_URL}/rest/v1/{table}?select=count',
            headers={**headers, 'Prefer': 'count=exact'}
        )

        if r_count.headers.get('Content-Range'):
            total = r_count.headers['Content-Range'].split('/')[1]
            print(f"   ✅ Exists - {total} rows")
        else:
            print(f"   ✅ Exists")

        # Show columns
        if data:
            columns = list(data[0].keys())
            print(f"   Columns ({len(columns)}): {', '.join(columns[:10])}")
            if len(columns) > 10:
                print(f"              ... and {len(columns)-10} more")

    elif r.status_code == 404:
        print(f"   ❌ NOT FOUND")
    else:
        print(f"   ⚠️ Error {r.status_code}: {r.text[:100]}")

    print()

print("="*100)
print("\nCHECKING CRITICAL RELATIONSHIPS:\n")
print("="*100)

# Check products with type_id
print("\n1. Products → Product Types")
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/products?select=id,name,type_id&limit=5',
    headers=headers
)
if r.status_code == 200:
    products = r.json()
    print(f"   ✅ {len(products)} products have type_id")
    for p in products[:3]:
        print(f"      - {p['name']} → type_id: {p.get('type_id')}")

# Check norm_applicability
print("\n2. Norm Applicability (type_id + norm_id)")
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id,is_applicable&limit=5',
    headers=headers
)
if r.status_code == 200:
    applicability = r.json()
    print(f"   ✅ {len(applicability)} applicability rules (sample)")

    # Count total
    r_count = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?select=count',
        headers={**headers, 'Prefer': 'count=exact'}
    )
    if r_count.headers.get('Content-Range'):
        total = r_count.headers['Content-Range'].split('/')[1]
        print(f"   Total applicability rules: {total}")

# Check evaluations
print("\n3. Evaluations (product_id + norm_id + result)")
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result,evaluated_by&limit=5',
    headers=headers
)
if r.status_code == 200:
    evals = r.json()
    print(f"   ✅ {len(evals)} evaluations (sample)")

    # Count by evaluated_by
    r_all = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?select=evaluated_by',
        headers=headers
    )
    if r_all.status_code == 200:
        all_evals = r_all.json()
        by_source = {}
        for e in all_evals:
            src = e.get('evaluated_by', 'unknown')
            by_source[src] = by_source.get(src, 0) + 1

        print(f"\n   Evaluations by source:")
        for src, count in sorted(by_source.items(), key=lambda x: -x[1]):
            print(f"      - {src}: {count}")

print("\n" + "="*100)
print("DEX-SPECIFIC VERIFICATION:")
print("="*100)

# Get DEX type
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/product_types?code=eq.DEX&select=*',
    headers=headers
)
if r.status_code == 200 and r.json():
    dex_type = r.json()[0]
    print(f"\n✅ DEX Type Found:")
    print(f"   ID: {dex_type['id']}")
    print(f"   Code: {dex_type['code']}")
    print(f"   Category: {dex_type.get('category')}")

    # Check applicability for DEX
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{dex_type['id']}&select=is_applicable",
        headers=headers
    )
    if r.status_code == 200:
        applicability = r.json()
        applicable = sum(1 for a in applicability if a['is_applicable'])
        not_applicable = len(applicability) - applicable
        print(f"\n   Norm Applicability for DEX:")
        print(f"      Applicable: {applicable}")
        print(f"      N/A: {not_applicable}")
        print(f"      Total: {len(applicability)}")

    # Check DEX products
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?type_id=eq.{dex_type['id']}&select=id,name",
        headers=headers
    )
    if r.status_code == 200:
        dex_products = r.json()
        print(f"\n   DEX Products ({len(dex_products)}):")
        for p in dex_products[:10]:
            print(f"      - {p['name']} (ID: {p['id']})")
        if len(dex_products) > 10:
            print(f"      ... and {len(dex_products)-10} more")

print("\n" + "="*100)
print("VERIFICATION COMPLETE")
print("="*100)
