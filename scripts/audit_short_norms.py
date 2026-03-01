#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check short norm descriptions and remaining French text."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

norms = []
offset = 0
while True:
    r = requests.get(f'{BASE}/norms?select=id,code,title,description,pillar&order=id&limit=1000&offset={offset}', headers=HR)
    batch = r.json()
    if not batch: break
    norms.extend(batch)
    offset += 1000

# Short descriptions
short = [n for n in norms if n.get('description') and len(n['description']) < 30]
print(f'Short descriptions (<30 chars): {len(short)}')
for n in sorted(short, key=lambda x: len(x.get('description',''))):
    desc = n.get('description','')
    title = n.get('title','')
    try:
        print(f'  [{n["id"]}] {n["code"]:8s} ({n["pillar"]}) desc="{desc}" | title="{title}"')
    except: pass

# Still French?
FRENCH = [
    r'\bD[eE]centralis[eE]e?\b', r'\b(des|du|de la)\s+(fonds|donn|actifs|utilisat|protocole|syst)',
    r'\bSuisse\b', r'\bAllemagne\b', r'\bS[eE]curit[eE]\b', r'\bConformit[eE]\b',
    r'\bGestion\b', r'\bStockage\b', r'\bUtilisateur\b', r'\bExigences?\b',
    r'\bR[eE]glementaire\b', r'\bpour\s+(les|des|la|le)\b',
    r'\bou\s+(les|des|la|le)\b', r'\best\b.*\b(conforme|requise?)\b',
    r'\bsans\s+(les|des|la|le|un)\b', r'\bFournisseur\b',
]

french = []
for n in norms:
    for f in ['title','description']:
        v = n.get(f) or ''
        for pat in FRENCH:
            if re.search(pat, v, re.IGNORECASE):
                french.append((n['id'], n['code'], f, v[:100]))
                break
        else:
            continue
        break

print(f'\nRemaining French text: {len(french)}')
for nid, code, field, val in french[:30]:
    try:
        print(f'  [{nid}] {code} ({field}): {val}')
    except: pass
