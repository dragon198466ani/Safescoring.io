#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Complete audit of ALL database columns and relationships"""

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
print("COMPLETE DATABASE AUDIT - ALL COLUMNS")
print("="*100)

# Check product_types with ALL columns
print("\n" + "="*100)
print("1. PRODUCT_TYPES TABLE - COMPLETE STRUCTURE")
print("="*100)

r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*&limit=1', headers=headers)
if r.status_code == 200 and r.json():
    pt = r.json()[0]
    print(f"\nAll columns in product_types:")
    for col, value in sorted(pt.items()):
        value_preview = str(value)[:50] if value else 'NULL'
        print(f"   {col:25s} : {value_preview}")

# Check DEX type specifically
print("\n" + "="*100)
print("2. DEX TYPE - COMPLETE DATA")
print("="*100)

r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?code=eq.DEX&select=*', headers=headers)
if r.status_code == 200 and r.json():
    dex = r.json()[0]
    print(f"\nDEX Type (ID: {dex['id']}):")
    for col, value in sorted(dex.items()):
        if isinstance(value, (dict, list)):
            print(f"   {col:25s} : {json.dumps(value, indent=2)[:100]}")
        else:
            print(f"   {col:25s} : {value}")

# Check norms table with ALL columns
print("\n" + "="*100)
print("3. NORMS TABLE - COMPLETE STRUCTURE")
print("="*100)

r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=*&limit=1', headers=headers)
if r.status_code == 200 and r.json():
    norm = r.json()[0]
    print(f"\nAll columns in norms:")
    for col, value in sorted(norm.items()):
        value_preview = str(value)[:50] if value else 'NULL'
        print(f"   {col:25s} : {value_preview}")

# Check if norms have consumer/essential flags
print("\n" + "="*100)
print("4. NORMS - CONSUMER/ESSENTIAL CLASSIFICATION")
print("="*100)

r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,is_essential,consumer,full&limit=10', headers=headers)
if r.status_code == 200:
    norms = r.json()
    print(f"\nSample of norms with classification:")
    print(f"{'Code':8s} | {'Essential':10s} | {'Consumer':10s} | {'Full':10s}")
    print("-" * 50)
    for n in norms:
        ess = str(n.get('is_essential', 'N/A'))
        cons = str(n.get('consumer', 'N/A'))
        full = str(n.get('full', 'N/A'))
        print(f"{n['code']:8s} | {ess:10s} | {cons:10s} | {full:10s}")

# Count norms by classification
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=is_essential,consumer,full', headers=headers)
if r.status_code == 200:
    all_norms = r.json()
    essential_count = sum(1 for n in all_norms if n.get('is_essential'))
    consumer_count = sum(1 for n in all_norms if n.get('consumer'))
    full_count = sum(1 for n in all_norms if n.get('full'))
    total = len(all_norms)

    print(f"\nClassification counts:")
    print(f"   Essential: {essential_count}/{total} ({100*essential_count//total}%)")
    print(f"   Consumer:  {consumer_count}/{total} ({100*consumer_count//total}%)")
    print(f"   Full:      {full_count}/{total} ({100*full_count//total}%)")

# Check products table with ALL columns
print("\n" + "="*100)
print("5. PRODUCTS TABLE - COMPLETE STRUCTURE")
print("="*100)

r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=*&limit=1', headers=headers)
if r.status_code == 200 and r.json():
    product = r.json()[0]
    print(f"\nAll columns in products:")
    for col, value in sorted(product.items()):
        if isinstance(value, (dict, list)):
            print(f"   {col:25s} : {json.dumps(value, indent=2)[:100]}")
        else:
            value_preview = str(value)[:50] if value else 'NULL'
            print(f"   {col:25s} : {value_preview}")

# Check 1inch specifically
print("\n" + "="*100)
print("6. 1INCH PRODUCT - COMPLETE DATA")
print("="*100)

r = requests.get(f'{SUPABASE_URL}/rest/v1/products?id=eq.249&select=*', headers=headers)
if r.status_code == 200 and r.json():
    inch = r.json()[0]
    print(f"\n1inch Product (ID: 249):")
    for col, value in sorted(inch.items()):
        if isinstance(value, (dict, list)):
            print(f"   {col:25s} : {json.dumps(value, indent=2)[:200]}")
        else:
            print(f"   {col:25s} : {value}")

# Check evaluations with why_this_result
print("\n" + "="*100)
print("7. EVALUATIONS - WITH REASONS")
print("="*100)

r = requests.get(
    f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.249&select=norm_id,result,why_this_result&limit=5',
    headers=headers
)
if r.status_code == 200:
    evals = r.json()
    print(f"\nSample evaluations for 1inch (with reasons):")
    for e in evals:
        result = e.get('result', 'N/A')
        reason = e.get('why_this_result', 'No reason')[:60]
        print(f"   Norm {e['norm_id']:4d}: {result:5s} - {reason}")

# Check if there are scores in products
print("\n" + "="*100)
print("8. PRODUCT SCORES (JSONB)")
print("="*100)

r = requests.get(f'{SUPABASE_URL}/rest/v1/products?id=eq.249&select=scores', headers=headers)
if r.status_code == 200 and r.json():
    scores = r.json()[0].get('scores')
    if scores:
        print(f"\n1inch scores (JSONB):")
        print(json.dumps(scores, indent=2))
    else:
        print(f"\n⚠️ No scores found in products.scores column")

# Check if there are scores in product_types
print("\n" + "="*100)
print("9. PRODUCT_TYPE SCORES (JSONB)")
print("="*100)

r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?code=eq.DEX&select=scores_full,scores_consumer,scores_essential', headers=headers)
if r.status_code == 200 and r.json():
    type_scores = r.json()[0]
    print(f"\nDEX Type Scores:")
    for score_type in ['scores_full', 'scores_consumer', 'scores_essential']:
        score = type_scores.get(score_type)
        if score:
            print(f"\n   {score_type}:")
            print(f"   {json.dumps(score, indent=4)}")
        else:
            print(f"\n   {score_type}: NULL")

print("\n" + "="*100)
print("AUDIT COMPLETE")
print("="*100)
