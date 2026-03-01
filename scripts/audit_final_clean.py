#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Final comprehensive audit - check all tables are clean."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests
from collections import Counter

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
HC = {**HR, 'Prefer': 'count=exact'}
BASE = SUPABASE_URL + '/rest/v1'

def load_all(table, select, filters=''):
    items = []
    offset = 0
    while True:
        r = requests.get(f'{BASE}/{table}?select={select}&order=id&limit=1000&offset={offset}{filters}', headers=HR)
        if r.status_code != 200: break
        batch = r.json()
        if not batch: break
        items.extend(batch)
        offset += 1000
    return items

def has_french(text):
    if not text: return False
    return bool(re.search(r'[àâäéèêëïîôùûüÿçœæÉÈÊÀÂÎÏÔÙÛÇŒÆ]', text))

issues = []

print('=' * 70)
print('  FINAL COMPREHENSIVE AUDIT')
print('=' * 70)

# ==========================================
# PRODUCTS
# ==========================================
prods = load_all('products', 'id,name,slug,url,type_id,headquarters,description,is_active', '&is_active=eq.true')
all_prods = load_all('products', 'id,is_active')
print(f'\n[PRODUCTS]')
print(f'  Total: {len(all_prods)} | Active: {len(prods)} | Inactive: {len(all_prods)-len(prods)}')

no_type = [p for p in prods if not p.get('type_id')]
no_url = [p for p in prods if not p.get('url')]
no_desc = [p for p in prods if not p.get('description')]
no_slug = [p for p in prods if not p.get('slug')]
no_hq = [p for p in prods if not p.get('headquarters') or p['headquarters'] in ('None', 'null')]

print(f'  Missing type:  {len(no_type)}')
print(f'  Missing URL:   {len(no_url)}')
print(f'  Missing desc:  {len(no_desc)}')
print(f'  Missing slug:  {len(no_slug)}')
print(f'  Missing HQ:    {len(no_hq)}')
if no_hq:
    for p in no_hq[:5]:
        print(f'    [{p["id"]}] {p["name"]}')

# French in products
french_p = [p for p in prods if has_french(p.get('description', '') or '') or has_french(p.get('headquarters', '') or '')]
print(f'  French text:   {len(french_p)}')

# Duplicates
nc = Counter(p['name'] for p in prods)
name_dupes = [(n,c) for n,c in nc.items() if c > 1]
print(f'  Dup names:     {len(name_dupes)}')
for n,c in name_dupes:
    d = [p for p in prods if p['name'] == n]
    ids = ', '.join(f'{x["id"]}(t={x.get("type_id")})' for x in d)
    print(f'    "{n}" x{c}: {ids}')

# Template descriptions remaining
templates = ['software wallet for managing', 'provides blockchain infrastructure',
             "I don't have enough factual", 'Without access to',
             'DeFi protocol operating on blockchain']
bad_desc = [p for p in prods if any(t in (p.get('description','') or '').lower() for t in templates)
            and p.get('type_id') not in (2,3,4,5,6,7)]
print(f'  Wrong template desc: {len(bad_desc)}')

# ==========================================
# TYPES
# ==========================================
r = requests.get(f'{BASE}/product_types?select=*&order=id&limit=200', headers=HR)
types = r.json()
print(f'\n[PRODUCT TYPES]')
print(f'  Total: {len(types)}')
print(f'  Missing name:       {len([t for t in types if not t.get("name")])}')
print(f'  Missing code:       {len([t for t in types if not t.get("code")])}')
print(f'  Missing definition: {len([t for t in types if not t.get("definition")])}')
print(f'  Missing description:{len([t for t in types if not t.get("description")])}')
print(f'  Missing eval_focus: {len([t for t in types if not t.get("evaluation_focus")])}')
print(f'  Missing weights:    {len([t for t in types if not t.get("pillar_weights")])}')
print(f'  Missing risks:      {len([t for t in types if not t.get("risk_factors")])}')

# ==========================================
# NORMS
# ==========================================
norms = load_all('norms', 'id,code,title,description,pillar')
print(f'\n[NORMS]')
print(f'  Total: {len(norms)}')

pc = Counter(n.get('pillar') for n in norms)
for p in ['S','A','F','E']:
    print(f'  Pillar {p}: {pc.get(p,0)}')
print(f'  Bad pillar:    {len([n for n in norms if n.get("pillar") not in ("S","A","F","E")])}')
print(f'  No title:      {len([n for n in norms if not n.get("title")])}')
print(f'  No description:{len([n for n in norms if not n.get("description")])}')
print(f'  No code:       {len([n for n in norms if not n.get("code")])}')

# French in norms (only check for accented characters - the reliable indicator)
french_n = [n for n in norms if has_french(n.get('description','') or '') or has_french(n.get('title','') or '')]
print(f'  French text:   {len(french_n)}')
if french_n:
    for n in french_n[:5]:
        try:
            print(f'    [{n["id"]}] {n["code"]}: {(n.get("description","") or "")[:60]}')
        except: pass

# Dup codes
cc = Counter(n.get('code') for n in norms)
dup_codes = [(c,cnt) for c,cnt in cc.items() if cnt > 1]
print(f'  Dup codes:     {len(dup_codes)}')

# ==========================================
# APPLICABILITY
# ==========================================
r = requests.get(f'{BASE}/norm_applicability?select=type_id&limit=1', headers=HC)
total_app = int(r.headers.get('content-range', '0/0').split('/')[1])
expected = len(types) * len(norms)
print(f'\n[APPLICABILITY]')
print(f'  Total rules:   {total_app}')
print(f'  Expected:      {expected} ({len(types)} types x {len(norms)} norms)')
print(f'  Coverage:      {"100%" if total_app >= expected else f"{total_app/expected*100:.1f}%"}')

# ==========================================
# MAPPING
# ==========================================
r = requests.get(f'{BASE}/product_type_mapping?select=product_id,type_id,is_primary&limit=1', headers=HC)
total_map = int(r.headers.get('content-range', '0/0').split('/')[1])
print(f'\n[MAPPING]')
print(f'  Total mappings: {total_map}')

# Check consistency
maps = load_all('product_type_mapping', 'product_id,type_id,is_primary')
prod_map = {p['id']: p.get('type_id') for p in prods}
inconsistent = []
for p in prods:
    pid = p['id']
    ptid = p.get('type_id')
    primaries = [m for m in maps if m['product_id'] == pid and m.get('is_primary')]
    if primaries:
        mtid = primaries[0]['type_id']
        if mtid != ptid:
            inconsistent.append((pid, p['name'], ptid, mtid))
    # Check if product has any mapping at all
    has_map = any(m['product_id'] == pid for m in maps)
    if not has_map:
        inconsistent.append((pid, p['name'], ptid, 'NO_MAPPING'))

print(f'  Inconsistencies: {len(inconsistent)}')
for pid, name, ptid, mtid in inconsistent[:5]:
    print(f'    [{pid}] {name}: product.type={ptid} vs mapping={mtid}')

# ==========================================
# SUMMARY
# ==========================================
total_issues = (len(no_type) + len(no_url) + len(no_desc) + len(no_hq) +
                len(name_dupes) + len(bad_desc) + len(french_n) +
                len(dup_codes) + len(inconsistent) + len(french_p))

print(f'\n{"=" * 70}')
print(f'  TOTAL ISSUES: {total_issues}')
if total_issues == 0:
    print(f'  DATABASE IS CLEAN')
else:
    print(f'  Issues remain - see details above')
print(f'{"=" * 70}')
