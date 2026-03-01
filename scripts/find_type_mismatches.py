#!/usr/bin/env python3
"""Find products whose description template contradicts their assigned type."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

all_prods = []
offset = 0
while True:
    r = requests.get(
        f'{BASE}/products?is_active=eq.true&select=id,name,url,type_id,headquarters,description&order=id&limit=1000&offset={offset}',
        headers=HR
    )
    batch = r.json()
    if not batch:
        break
    all_prods.extend(batch)
    offset += 1000

r = requests.get(f'{BASE}/product_types?select=id,name,code&order=id', headers=HR)
types = {t['id']: t for t in r.json()}

print(f'Loaded {len(all_prods)} active products\n')

# Template descriptions that are WRONG for certain types
# format: (description pattern, types where this desc is WRONG)

# "software wallet for managing" is wrong for everything EXCEPT wallet types (2,3,4,5,6,7)
WALLET_TYPES = {2, 3, 4, 5, 6, 7}
# "DeFi lending protocol" is wrong for non-lending types
LENDING_TYPES = {16}
# "centralized cryptocurrency exchange" is wrong for non-CEX
CEX_TYPES = {10}
# "cryptocurrency exchange platform" is wrong for non-exchange types
EXCHANGE_TYPES = {10, 11, 12, 13}

mismatches = []

for p in all_prods:
    desc = (p.get('description') or '').lower()
    tid = p.get('type_id')
    tname = types.get(tid, {}).get('name', '?')

    mismatch = None

    if 'software wallet for managing' in desc and tid not in WALLET_TYPES:
        mismatch = f'Desc says "software wallet" but type is {tname} ({tid})'
    elif 'defi lending protocol that enables' in desc and tid not in LENDING_TYPES:
        mismatch = f'Desc says "DeFi lending" but type is {tname} ({tid})'
    elif 'centralized cryptocurrency exchange offering' in desc and tid not in CEX_TYPES:
        mismatch = f'Desc says "CEX" but type is {tname} ({tid})'
    elif 'cryptocurrency exchange platform that allows' in desc and tid not in EXCHANGE_TYPES:
        mismatch = f'Desc says "exchange" but type is {tname} ({tid})'
    elif 'provides blockchain infrastructure' in desc:
        # This is too generic for any type - always a bad description
        mismatch = f'Generic "blockchain infrastructure" desc for {tname} ({tid})'
    elif "i don't have enough factual" in desc or 'without access to' in desc:
        mismatch = f'Scraping failure description for {tname} ({tid})'

    if mismatch:
        mismatches.append((p['id'], p['name'], tid, tname, mismatch))

print(f'Products with description-type mismatches: {len(mismatches)}')
print()

# Group by mismatch type
from collections import Counter
categories = Counter()
for _, _, _, _, m in mismatches:
    cat = m.split(' but ')[0] if ' but ' in m else m.split(' desc ')[0] if ' desc ' in m else m[:30]
    categories[cat] += 1

print('Breakdown:')
for cat, count in categories.most_common():
    print(f'  {count:4d} x {cat}')

print(f'\nFull list:')
for pid, name, tid, tname, mismatch in sorted(mismatches):
    print(f'  [{pid:4d}] {name:40s} | {mismatch}')
