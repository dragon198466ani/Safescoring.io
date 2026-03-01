#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Deep audit of products table."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests
from collections import Counter

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

# Load products
prods = []
offset = 0
while True:
    r = requests.get(f'{BASE}/products?is_active=eq.true&select=id,name,slug,url,type_id,headquarters,description&order=id&limit=1000&offset={offset}', headers=HR)
    batch = r.json()
    if not batch: break
    prods.extend(batch)
    offset += 1000

# Load types
r = requests.get(f'{BASE}/product_types?select=id,name,code&order=id&limit=200', headers=HR)
types = {t['id']: t for t in r.json()}

print(f'Active products: {len(prods)}')

# Missing HQ
no_hq = [p for p in prods if not p.get('headquarters') or p['headquarters'] in ('None', 'null')]
print(f'\nMissing HQ: {len(no_hq)}')
for p in no_hq:
    tname = types.get(p.get('type_id'), {}).get('name', '?')
    try:
        print(f'  [{p["id"]}] {p["name"]} (type={tname})')
    except: pass

# Duplicate names
nc = Counter(p['name'] for p in prods)
name_dupes = [(n, c) for n, c in nc.items() if c > 1]
print(f'\nDuplicate names: {len(name_dupes)}')
for name, cnt in name_dupes:
    dups = [p for p in prods if p['name'] == name]
    ids = ', '.join(f'{d["id"]}(t={d.get("type_id")})' for d in dups)
    try:
        print(f'  "{name}" x{cnt}: {ids}')
    except: pass

# Duplicate URLs
uc = Counter(p.get('url') for p in prods if p.get('url'))
url_dupes = [(u, c) for u, c in uc.items() if c > 1]
print(f'\nDuplicate URLs: {len(url_dupes)}')
for url, cnt in sorted(url_dupes, key=lambda x: -x[1])[:25]:
    dups = [p for p in prods if p.get('url') == url]
    ids = ', '.join(f'{d["id"]}/{d["name"]}' for d in dups)
    try:
        print(f'  {url} x{cnt}: {ids}')
    except: pass

# Check for remaining template descriptions
templates = [
    ('software wallet for managing', {2,3,4,5,6,7}),
    ('DeFi lending protocol that enables', {16}),
    ('centralized cryptocurrency exchange offering', {10}),
    ('cryptocurrency exchange platform that allows', {10,11,12,13}),
    ('provides blockchain infrastructure', set()),
    ('DeFi protocol operating on blockchain', set()),
    ("I don't have enough factual", set()),
    ('Without access to', set()),
]

bad_desc = []
for p in prods:
    desc = (p.get('description') or '').lower()
    tid = p.get('type_id')
    for tmpl, ok_types in templates:
        if tmpl.lower() in desc and tid not in ok_types:
            bad_desc.append((p['id'], p['name'], tid, tmpl[:40]))
            break

print(f'\nRemaining wrong template descriptions: {len(bad_desc)}')
for pid, name, tid, tmpl in bad_desc[:15]:
    tname = types.get(tid, {}).get('name', '?')
    try:
        print(f'  [{pid}] {name} (type={tname}): "{tmpl}..."')
    except: pass

# Products per type distribution
type_dist = Counter(p.get('type_id') for p in prods)
print(f'\nProducts per type:')
for tid, cnt in type_dist.most_common():
    tname = types.get(tid, {}).get('name', f'type_{tid}')
    try:
        print(f'  [{tid:2d}] {tname:35s}: {cnt:4d} products')
    except: pass
