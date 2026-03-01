#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check for genuinely French text remaining in norms (not English false positives)."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

norms = []
offset = 0
while True:
    r = requests.get(f'{BASE}/norms?select=id,code,title,description&order=id&limit=1000&offset={offset}', headers=HR)
    batch = r.json()
    if not batch: break
    norms.extend(batch)
    offset += 1000

# Only catch genuinely French patterns (accented chars, French-only words)
TRULY_FRENCH = [
    r'[àâäéèêëïîôùûüÿçœæ]',  # French accented chars
    r'\b[Éé]cran\b', r'\bR[ée]sistance\b(?!\s+(to|test|against))',
    r'\bStocker?\b', r'\bConnecteur\b', r'\bD[ée]centralis[ée]e?\b',
    r'\bConformit', r'\bCertification\b.*\b[Ss]ecurite\b',
    r'\bManagement\b.*\bsecurite\b', r'\bAudit\b.*\bsecurite\b',
    r'\bR[ée]cup[ée]ration\b', r'\bUtilisateur\b', r'\bFournisseur\b',
    r'\bGestion\b', r'\bExigences?\b', r'\bR[ée]glementaire\b',
    r'\bEntropie\b', r'\bDisponibilit', r'\bListabilit',
    r'\bOrdres?\b\s+[àa]\b', r'\bTitane\b', r'\bPluie\b',
    r'\bHumidit', r'\bMise [aà] jour\b', r'\bVuln[ée]rabilit',
    r'\bRapide\b', r'\bHors-ligne\b', r'\bEffacement\b',
    r'\bCorrosion\b.*\bm[ée]taux\b', r'\bBatteries?\b.*\blithium\b',
    r'\bDroit [aà] la\b', r'\bProtection des donn',
    r'\bCl[ée] de s[ée]curit', r'\b[Ss]ecurite\b', r'\baccepted?e\b',
    r'\bsecuris', r'\beurope[ée]n', r'\bindependant\b',
    r'\bvide/plein\b', r'\breparable\b',
]

french = []
for n in norms:
    for f in ['title', 'description']:
        v = n.get(f) or ''
        for pat in TRULY_FRENCH:
            if re.search(pat, v, re.IGNORECASE):
                french.append((n['id'], n['code'], f, v[:120]))
                break
        else:
            continue
        break

print(f'Genuinely French text remaining: {len(french)}')
for nid, code, field, val in french:
    try:
        print(f'  [{nid}] {code} ({field}): {val}')
    except:
        print(f'  [{nid}] {code} ({field}): [encoding error]')
