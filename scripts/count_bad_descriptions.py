#!/usr/bin/env python3
"""Count products with template/wrong descriptions."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

all_prods = []
offset = 0
while True:
    r = requests.get(f'{BASE}/products?is_active=eq.true&select=id,name,description,type_id&order=id&limit=1000&offset={offset}', headers=HR)
    batch = r.json()
    if not batch:
        break
    all_prods.extend(batch)
    offset += 1000

# Template patterns that indicate hallucinated/wrong descriptions
templates = [
    'software wallet for managing',
    'DeFi lending protocol that enables',
    'DeFi protocol operating on blockchain',
    'centralized cryptocurrency exchange offering',
    'provides blockchain infrastructure',
    'cryptocurrency exchange platform that allows',
    "I don't have enough factual",
    'Without access to',
]

counts = {t: 0 for t in templates}
bad_prods = []

for p in all_prods:
    desc = p.get('description') or ''
    for tmpl in templates:
        if tmpl.lower() in desc.lower():
            counts[tmpl] += 1
            bad_prods.append((p['id'], p['name'], p.get('type_id'), tmpl[:50]))
            break

print('Template description counts:')
for t in templates:
    if counts[t] > 0:
        print(f'  {counts[t]:4d} x "{t}"')

print(f'\nTotal products with template/bad descriptions: {len(bad_prods)} / {len(all_prods)}')
print(f'\nList of affected products:')
for pid, name, tid, tmpl in sorted(bad_prods):
    print(f'  [{pid:4d}] (type={tid:2d}) {name:40s} -- {tmpl}')
