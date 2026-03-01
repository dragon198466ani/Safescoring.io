#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Find ALL remaining French text across ALL database tables."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

# Aggressive French detection - catch everything
FRENCH_WORDS = [
    # Accented words (definitely French)
    r'[eE]quipement', r'S[eé]curit[eé]', r'Conformit[eé]', r'V[eé]rification',
    r'Disponibilit[eé]', r'Accessibilit[eé]', r'R[eé]glementaire',
    r'D[eé]centralis[eé]', r'portabilit[eé]', r'vuln[eé]rabilit[eé]',
    r'r[eé]sistance', r'd[eé]gradation', r'r[eé]cup[eé]ration',
    r'p[eé]renne', r'd[eé]lai', r'obligatoire',
    r'auditable', r'secondaires', r'g[eé]n[eé]rale',
    # Common French words
    r'\bPluie\b', r'\bHumidit[eé]\b', r'\bGel\b/D', r'\b[EÉé]cran\b',
    r'\bCharge\b.*USB', r'\bRetour\b.*audio', r'\bVerre\b.*saphir',
    r'\bStockage\b', r'\bSlot\b.*micro', r'\bBackup\b.*local\b',
    r'\bOrdres\b', r'\bTitane\b', r'\bExport\b.*seed\b.*vers',
    r'\bJeu\b.*caract', r'\bConnecteur\b', r'\bCarte\b.*sans\b.*contact',
    r'\bSyst[eè]me\b.*plaques', r'\bSignature\b.*hors', r'\bCorrosion\b.*m[eé]taux',
    r'\bBatteries\b.*lithium', r'\bFirmware\b.*auditable',
    r'\bAdresses\b.*email', r'\bConfiguration\b.*initiale',
    r'\bIndicateurs\b.*couleur', r'\bTest\b.*r[eé]cup',
    r'\bGuide\b.*d[eé]marrage', r'\bCommercial\b.*pur\b',
    # French prepositions/articles in context
    r'\bdes\s+(fonds|donn[eé]es|utilisateurs|actifs|UTXOs|approvals|erreurs)\b',
    r'\bdu\s+(protocole|syst[eè]me|r[eé]seau)\b',
    r'\bde la\s+(conception|s[eé]curit[eé])\b',
    r'\bpar\s+(utilisateur|tiers)\b',
    r'\bsans\s+(risque|contact)\b',
    r'\brapide\b(?!\s+API)',  # "rapide" but not "rapid API"
    # Specific French terms often found
    r'\bGestion\b', r'\bExigences?\b', r'\bFournisseur\b',
    r'\bUtilisateur\b', r'\bMise [aà] jour\b',
    r'\bContr[oô]le\b.*acc[eè]s', r'\bentropie\b',
    r'\bhaute\b.*securite', r'\bpremier\b.*niveau',
    r'\bR[eé]parable\b', r'\bR[eé]v[eé]lation\b',
    r'\bValidation\b.*donn[eé]es\b.*entrantes',
    r'\bCertification\b.*[Ss]ecurite', r'\bConformite\b',
    r'\bManagement\b.*securite', r'\bAudit\b.*securite',
    r'\bEntropie\b', r'\bTaille\b.*stockage',
]

def has_french(text):
    if not text: return False
    for pat in FRENCH_WORDS:
        if re.search(pat, text, re.IGNORECASE): return True
    return False

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

# ==== NORMS ====
print('=== NORMS ===')
norms = load_all('norms', 'id,code,title,description')
french_norms = []
for n in norms:
    for f in ['title', 'description']:
        v = n.get(f) or ''
        if has_french(v):
            french_norms.append((n['id'], n['code'], f, v[:120]))
            break
print(f'French norms remaining: {len(french_norms)}')
for nid, code, field, val in french_norms:
    try:
        print(f'  [{nid}] {code} ({field}): {val}')
    except: pass

# ==== PRODUCT TYPES ====
print('\n=== PRODUCT TYPES ===')
r = requests.get(f'{BASE}/product_types?select=id,name,code,definition,description,evaluation_focus&order=id&limit=200', headers=HR)
types = r.json()
french_types = []
for t in types:
    for f in ['name', 'definition', 'description', 'evaluation_focus']:
        v = t.get(f) or ''
        if has_french(v):
            french_types.append((t['id'], t.get('name'), f, v[:120]))
            break
print(f'French types remaining: {len(french_types)}')
for tid, name, field, val in french_types:
    try:
        print(f'  [{tid}] {name} ({field}): {val}')
    except: pass

# ==== PRODUCTS ====
print('\n=== PRODUCTS ===')
prods = load_all('products', 'id,name,headquarters,description,short_description', '&is_active=eq.true')
french_prods = []
for p in prods:
    for f in ['headquarters', 'description', 'short_description']:
        v = p.get(f) or ''
        if has_french(v):
            french_prods.append((p['id'], p['name'], f, v[:120]))
            break
print(f'French products remaining: {len(french_prods)}')
for pid, name, field, val in french_prods:
    try:
        print(f'  [{pid}] {name} ({field}): {val}')
    except: pass

# ==== CHAPTERS ====
print('\n=== CHAPTERS ===')
try:
    chapters = load_all('chapters', 'id,code,title,description')
    french_ch = []
    for c in chapters:
        for f in ['title', 'description']:
            v = c.get(f) or ''
            if has_french(v):
                french_ch.append((c['id'], c.get('code'), f, v[:120]))
                break
    print(f'French chapters remaining: {len(french_ch)}')
    for cid, code, field, val in french_ch[:20]:
        try:
            print(f'  [{cid}] {code} ({field}): {val}')
        except: pass
except Exception as e:
    print(f'  Error: {e}')

print(f'\n=== TOTAL FRENCH REMAINING ===')
total = len(french_norms) + len(french_types) + len(french_prods)
print(f'  Norms: {len(french_norms)}')
print(f'  Types: {len(french_types)}')
print(f'  Products: {len(french_prods)}')
print(f'  TOTAL: {total}')
