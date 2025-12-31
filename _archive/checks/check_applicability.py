#!/usr/bin/env python3
"""Vérifie les données d'applicabilité dans Supabase"""

import requests
import os

# Load config
config = {}
config_path = os.path.join(os.path.dirname(__file__), 'config', 'env_template_free.txt')
with open(config_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

print("=" * 70)
print("VÉRIFICATION DE L'APPLICABILITÉ DES NORMES PAR TYPE DE PRODUIT")
print("=" * 70)

# Récupérer tous les types
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name&order=id.asc', headers=headers)
if r.status_code != 200:
    print(f"Erreur: {r.text}")
    exit(1)

types = r.json()
print(f"\n{len(types)} types de produits trouvés\n")

print(f"{'Code':<25} | {'Total':>6} | {'App':>6} | {'Non-App':>6} | {'%App':>6}")
print("-" * 70)

for t in types:
    type_id = t['id']
    code = t['code']
    
    r2 = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}',
        headers=headers
    )
    
    if r2.status_code == 200:
        data = r2.json()
        total = len(data)
        applicable = sum(1 for d in data if d['is_applicable'])
        non_app = total - applicable
        pct = applicable * 100 // total if total > 0 else 0
        print(f"{code:<25} | {total:>6} | {applicable:>6} | {non_app:>6} | {pct:>5}%")
    else:
        print(f"{code:<25} | ERROR")

print("\n" + "=" * 70)
