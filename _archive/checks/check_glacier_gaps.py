#!/usr/bin/env python3
"""Analyse les lacunes de Glacier Protocol - normes TBD et potentielles manquantes"""

import requests
from collections import Counter

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Récupérer les normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description', headers=headers)
norms = {n['id']: n for n in r.json()}

# Récupérer les évaluations de Glacier (product_id=315)
r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.315&select=norm_id,result', headers=headers)
evals = {e['norm_id']: e['result'] for e in r.json()}

print("=" * 70)
print("NORMES TBD - Glacier ne documente pas clairement ces aspects")
print("=" * 70)

tbd_norms = [(norms[nid], result) for nid, result in evals.items() if result == 'TBD']
for norm, _ in sorted(tbd_norms, key=lambda x: x[0]['code']):
    print(f"\n  {norm['code']}: {norm['title']}")
    if norm.get('description'):
        print(f"     → {norm['description'][:80]}...")

print(f"\n  Total TBD: {len(tbd_norms)}")

# Analyser les normes N/A qui POURRAIENT être applicables à un Protocol/Guide
print("\n" + "=" * 70)
print("NORMES N/A QUI POURRAIENT ÊTRE PERTINENTES POUR UN GUIDE")
print("=" * 70)

# Mots-clés pertinents pour un guide
relevant_keywords = [
    'documentation', 'guide', 'tutorial', 'instruction',
    'backup', 'recovery', 'seed', 'mnemonic', 'passphrase',
    'multisig', 'multi-sig', 'threshold', 'shamir',
    'privacy', 'anonymity', 'coin selection', 'utxo',
    'air-gap', 'offline', 'cold storage',
    'bip-', 'slip-', 'eip-',
    'open source', 'audit', 'security',
    'warning', 'alert', 'phishing',
]

na_norms = [(norms[nid], result) for nid, result in evals.items() if result == 'N/A']
potentially_relevant = []

for norm, _ in na_norms:
    title_lower = norm['title'].lower()
    desc_lower = (norm.get('description') or '').lower()
    text = f"{title_lower} {desc_lower}"
    
    for kw in relevant_keywords:
        if kw in text:
            potentially_relevant.append((norm, kw))
            break

print(f"\nTrouvé {len(potentially_relevant)} normes N/A potentiellement pertinentes:\n")

for norm, keyword in sorted(potentially_relevant, key=lambda x: x[0]['pillar'] + x[0]['code'])[:30]:
    print(f"  [{norm['pillar']}] {norm['code']}: {norm['title'][:50]}")
    print(f"       (matched: '{keyword}')")

if len(potentially_relevant) > 30:
    print(f"\n  ... et {len(potentially_relevant) - 30} autres")
