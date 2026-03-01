#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit norms table."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests
from collections import Counter

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

FRENCH = [
    r'\bD[eE]centralis[eE]e?\b', r'\b(des|du|de la)\s+(fonds|donn|actifs|utilisat|protocole|syst)',
    r'\bSuisse\b', r'\bAllemagne\b', r'\bPays-Bas\b', r'\bBelgique\b',
    r'\bS[eE]curit[eE]\b', r'\bConformit[eE]\b', r'\bV[eE]rification\b',
    r'\bGestion\b', r'\bStockage\b', r'\bUtilisateur\b', r'\bFournisseur\b',
    r'\bDisponibilit[eE]\b', r'\bMise [aA] jour\b', r'\bExigences?\b',
    r'\bR[eE]glementaire\b', r'\bsans\s+(les|des|la|le|un)\b',
    r'\bpour\s+(les|des|la|le)\b', r'\bou\s+(les|des|la|le)\b',
    r'\best\b.*\b(conforme|n[eE]cessaire|requise?)\b',
]

def has_french(text):
    if not text: return False
    for pat in FRENCH:
        if re.search(pat, text, re.IGNORECASE): return True
    return False

# Load norms
norms = []
offset = 0
while True:
    r = requests.get(f'{BASE}/norms?select=id,code,title,description,pillar&order=id&limit=1000&offset={offset}', headers=HR)
    batch = r.json()
    if not batch: break
    norms.extend(batch)
    offset += 1000

print(f'Total norms: {len(norms)}')

# Pillar distribution
pc = Counter(n.get('pillar') for n in norms)
for p in ['S','A','F','E']:
    print(f'  Pillar {p}: {pc.get(p,0)}')

bad_pillar = [n for n in norms if n.get('pillar') not in ('S','A','F','E')]
print(f'  Bad pillar: {len(bad_pillar)}')

# Missing fields
print(f'  No title: {len([n for n in norms if not n.get("title")])}')
print(f'  No description: {len([n for n in norms if not n.get("description")])}')
print(f'  No code: {len([n for n in norms if not n.get("code")])}')

# Duplicate codes
cc = Counter(n.get('code') for n in norms)
dupes = [(c, cnt) for c, cnt in cc.items() if cnt > 1]
print(f'  Duplicate codes: {len(dupes)}')
for c, cnt in dupes[:10]:
    print(f'    "{c}" x{cnt}')

# French text
french = []
for n in norms:
    for f in ['title','description']:
        v = n.get(f) or ''
        if has_french(v):
            french.append((n['id'], n['code'], f, v[:100]))
            break
print(f'  French text: {len(french)}')
for nid, code, field, val in french[:20]:
    try:
        print(f'    [{nid}] {code} ({field}): {val}')
    except: pass

# Short descriptions
short = [n for n in norms if n.get('description') and len(n['description']) < 20]
print(f'  Short descs (<20): {len(short)}')
for n in short[:5]:
    print(f'    [{n["id"]}] {n["code"]}: "{n["description"]}"')

# Code prefix analysis
prefixes = Counter()
for n in norms:
    code = n.get('code') or ''
    m = re.match(r'^([A-Z]+)-', code)
    prefixes[m.group(1) if m else 'OTHER'] += 1
print(f'  Code prefixes:')
for pf, cnt in prefixes.most_common(10):
    print(f'    {pf}: {cnt}')

# Sample norms per pillar (first 3)
for pillar in ['S','A','F','E']:
    samples = [n for n in norms if n.get('pillar') == pillar][:3]
    print(f'\n  Sample {pillar} norms:')
    for n in samples:
        title = (n.get('title') or '')[:80]
        try:
            print(f'    [{n["id"]}] {n["code"]}: {title}')
        except: pass
