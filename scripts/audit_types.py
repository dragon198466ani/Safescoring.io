#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit product_types table."""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests
from collections import Counter

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

FRENCH = [
    r'\bD[eE]centralis[eE]e?\b', r'\b(des|du|de la)\s+(fonds|donn|actifs|utilisat|protocole|syst)',
    r'\bSuisse\b', r'\bAllemagne\b', r'\bS[eE]curit[eE]\b', r'\bConformit[eE]\b',
    r'\bGestion\b', r'\bStockage\b', r'\bUtilisateur\b', r'\bExigences?\b',
    r'\bR[eE]glementaire\b', r'\bpour\s+(les|des|la|le)\b',
]

def has_french(text):
    if not text: return False
    for pat in FRENCH:
        if re.search(pat, text, re.IGNORECASE): return True
    return False

# Load types
r = requests.get(f'{BASE}/product_types?select=*&order=id&limit=200', headers=HR)
types = r.json()
print(f'Total types: {len(types)}')

# Required fields
fields_check = {
    'name': [], 'code': [], 'definition': [], 'description': [],
    'evaluation_focus': [], 'pillar_weights': [], 'risk_factors': [],
    'examples': [], 'includes': [], 'excludes': [], 'keywords': [],
}

for t in types:
    for f in fields_check:
        v = t.get(f)
        if not v or v in ('null', 'None', '{}', '[]'):
            fields_check[f].append(t)

print('\nMissing fields:')
for f, missing in fields_check.items():
    cnt = len(missing)
    if cnt > 0:
        ids = [str(t['id']) for t in missing[:10]]
        print(f'  {f}: {cnt} missing (ids: {", ".join(ids)}{"..." if cnt > 10 else ""})')
    else:
        print(f'  {f}: 0 missing (OK)')

# Flags check
print('\nFlag analysis:')
hw_types = [t for t in types if t.get('is_hardware')]
wallet_types = [t for t in types if t.get('is_wallet')]
defi_types = [t for t in types if t.get('is_defi')]
protocol_types = [t for t in types if t.get('is_protocol')]
print(f'  is_hardware=true: {len(hw_types)} types: {[t["id"] for t in hw_types]}')
print(f'  is_wallet=true: {len(wallet_types)} types: {[t["id"] for t in wallet_types]}')
print(f'  is_defi=true: {len(defi_types)} types: {[t["id"] for t in defi_types]}')
print(f'  is_protocol=true: {len(protocol_types)} types: {[t["id"] for t in protocol_types]}')

# Expected flags
EXPECTED_HW = {1, 9, 81}  # HW Cold, Physical Backup, Bearer Token
EXPECTED_WALLET = {1, 2, 3, 4, 5, 6, 7, 80}  # All wallet types + companion
EXPECTED_DEFI = {11, 15, 16, 17, 18, 19, 22, 24, 25, 26, 29, 30, 33}

actual_hw = {t['id'] for t in hw_types}
actual_wallet = {t['id'] for t in wallet_types}
actual_defi = {t['id'] for t in defi_types}

missing_hw = EXPECTED_HW - actual_hw
extra_hw = actual_hw - EXPECTED_HW
missing_wallet = EXPECTED_WALLET - actual_wallet
extra_wallet = actual_wallet - EXPECTED_WALLET
missing_defi = EXPECTED_DEFI - actual_defi
extra_defi = actual_defi - EXPECTED_DEFI

if missing_hw: print(f'  Missing is_hardware: {missing_hw}')
if extra_hw: print(f'  Unexpected is_hardware: {extra_hw}')
if missing_wallet: print(f'  Missing is_wallet: {missing_wallet}')
if extra_wallet: print(f'  Unexpected is_wallet: {extra_wallet}')
if missing_defi: print(f'  Missing is_defi: {missing_defi}')
if extra_defi: print(f'  Unexpected is_defi: {extra_defi}')

# French text
french = []
for t in types:
    for f in ['name','definition','description','evaluation_focus']:
        v = t.get(f) or ''
        if has_french(v):
            french.append((t['id'], t.get('name'), f, v[:80]))
            break
print(f'\nFrench text: {len(french)}')
for tid, name, field, val in french[:10]:
    try:
        print(f'  [{tid}] {name} ({field}): {val}')
    except: pass

# Duplicate names
nc = Counter(t.get('name') for t in types)
dupes = [(n, c) for n, c in nc.items() if c > 1]
print(f'\nDuplicate type names: {len(dupes)}')
for n, c in dupes:
    print(f'  "{n}" x{c}')

# Show all types summary
print(f'\nAll types ({len(types)}):')
for t in types:
    flags = []
    if t.get('is_hardware'): flags.append('HW')
    if t.get('is_wallet'): flags.append('WAL')
    if t.get('is_defi'): flags.append('DEFI')
    if t.get('is_protocol'): flags.append('PROTO')
    flag_str = ','.join(flags) if flags else '-'
    w = 'Y' if t.get('pillar_weights') else 'N'
    r2 = 'Y' if t.get('risk_factors') else 'N'
    d = 'Y' if t.get('description') else 'N'
    ef = 'Y' if t.get('evaluation_focus') else 'N'
    try:
        print(f'  [{t["id"]:2d}] {t.get("code","?"):15s} {t.get("name","?"):35s} flags={flag_str:15s} w={w} r={r2} d={d} ef={ef}')
    except: pass
