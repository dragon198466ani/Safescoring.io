#!/usr/bin/env python3
"""
Spot-check verification batch 2: Pull random products for manual web verification.
Groups by category to ensure coverage across all product types.
"""
import sys, os, random
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

# Load all active products with their type info
all_prods = []
offset = 0
while True:
    r = requests.get(
        f'{BASE}/products?is_active=eq.true&select=id,name,slug,url,type_id,headquarters,description,short_description&order=id&limit=1000&offset={offset}',
        headers=HR
    )
    batch = r.json()
    if not batch:
        break
    all_prods.extend(batch)
    offset += 1000

# Load type names
r = requests.get(f'{BASE}/product_types?select=id,name,code&order=id', headers=HR)
types = {t['id']: t for t in r.json()}

print(f'Loaded {len(all_prods)} active products, {len(types)} types')

# Group by type
by_type = {}
for p in all_prods:
    tid = p.get('type_id')
    if tid not in by_type:
        by_type[tid] = []
    by_type[tid].append(p)

# Pick 2 random products from each type that has >= 3 products
# For smaller types, pick 1
random.seed(42)  # Reproducible
sample = []
for tid in sorted(by_type.keys()):
    prods = by_type[tid]
    n = 2 if len(prods) >= 3 else 1
    picks = random.sample(prods, min(n, len(prods)))
    sample.extend(picks)

print(f'Selected {len(sample)} products across {len(by_type)} types for verification')
print('=' * 100)

# Output in a format suitable for verification
for p in sample:
    tid = p.get('type_id')
    tname = types.get(tid, {}).get('name', '?')
    tcode = types.get(tid, {}).get('code', '?')
    hq = p.get('headquarters', 'N/A')
    url = p.get('url', 'N/A')
    desc = (p.get('description') or '')[:120]

    print(f'\n[{p["id"]}] {p["name"]}')
    print(f'  Type: {tname} ({tcode}, id={tid})')
    print(f'  HQ:   {hq}')
    print(f'  URL:  {url}')
    print(f'  Desc: {desc}...')

print(f'\n{"=" * 100}')
print(f'Total: {len(sample)} products to verify')
