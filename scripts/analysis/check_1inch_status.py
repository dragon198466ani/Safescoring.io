#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check 1inch status in database"""

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

print("="*80)
print("CHECKING 1INCH IN DATABASE")
print("="*80)

# Search for 1inch product
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/products?name=ilike.*1inch*&select=id,name,type_id,url,description',
    headers=headers
)

if r.status_code != 200:
    print(f"Error: {r.status_code}")
    print(r.text)
    sys.exit(1)

products = r.json()

if not products:
    print("\n⚠️ 1inch NOT FOUND in database")
    print("\nSearching for similar names...")

    # Try broader search
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,type_id&limit=100',
        headers=headers
    )
    all_products = r.json()

    matches = [p for p in all_products if '1inch' in p['name'].lower() or 'inch' in p['name'].lower()]

    if matches:
        print(f"\nFound {len(matches)} similar products:")
        for p in matches:
            print(f"  - {p['name']} (ID: {p['id']}, Type: {p.get('type_id')})")
    else:
        print("\nNo similar products found")
        print("\nShowing first 20 products in database:")
        for p in all_products[:20]:
            print(f"  - {p['name']} (ID: {p['id']})")

    sys.exit(0)

# Product found
print(f"\n✅ Found {len(products)} product(s):\n")

for product in products:
    print(f"Product: {product['name']}")
    print(f"  ID: {product['id']}")
    print(f"  Type ID: {product.get('type_id')}")
    print(f"  URL: {product.get('url')}")
    print(f"  Description: {product.get('description', 'N/A')[:100]}")

    # Check evaluations
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product['id']}&select=id,norm_id,result",
        headers=headers
    )

    evals = r.json() if r.status_code == 200 else []

    if evals:
        yes_count = sum(1 for e in evals if e['result'] == 'YES')
        yesp_count = sum(1 for e in evals if e['result'] == 'YESp')
        no_count = sum(1 for e in evals if e['result'] == 'NO')
        na_count = sum(1 for e in evals if e['result'] == 'N/A')
        tbd_count = sum(1 for e in evals if e['result'] == 'TBD')

        total_eval = yes_count + yesp_count + no_count + tbd_count
        score_base = yes_count + yesp_count + no_count
        score = (yes_count + yesp_count) * 100 // score_base if score_base > 0 else 0

        print(f"\n  Evaluations: {len(evals)} total")
        print(f"    YES: {yes_count}")
        print(f"    YESp: {yesp_count}")
        print(f"    NO: {no_count}")
        print(f"    N/A: {na_count}")
        print(f"    TBD: {tbd_count}")
        print(f"    Score: {score}% ({yes_count + yesp_count}/{score_base})")
    else:
        print(f"\n  ⚠️ NO EVALUATIONS FOUND")
        print(f"  → Run: python src/core/smart_evaluator.py --product '{product['name']}'")

    print()

print("="*80)
