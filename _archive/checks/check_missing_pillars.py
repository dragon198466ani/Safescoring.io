#!/usr/bin/env python3
"""Vérifie les produits avec des piliers manquants (N/A)"""
import requests
from collections import defaultdict

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Charger les normes
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,pillar', headers=headers)
norms = {n['id']: n['pillar'] for n in r.json()}

# Charger les produits
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,scores', headers=headers)
products = r.json()

# Charger les évaluations (avec pagination)
all_evals = []
offset = 0
while True:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id,result&offset={offset}&limit=1000', headers=headers)
    data = r.json()
    if not data:
        break
    all_evals.extend(data)
    offset += 1000

print(f"Total évaluations: {len(all_evals)}")

# Analyser par produit
print("\n" + "="*80)
print("PRODUITS AVEC PILIERS N/A DANS LES SCORES:")
print("="*80)

products_with_na = []
for p in products:
    if p.get('scores') and p['scores'].get('full'):
        s = p['scores']['full']
        missing = []
        for pillar in ['S', 'A', 'F', 'E']:
            if s.get(pillar) is None:
                missing.append(pillar)
        if missing:
            products_with_na.append((p['name'], p['id'], missing))
            print(f"{p['name'][:40]:<40} | Manquants: {', '.join(missing)}")

print(f"\nTotal: {len(products_with_na)} produits avec piliers manquants")

# Analyser pourquoi - vérifier les évaluations
print("\n" + "="*80)
print("ANALYSE DES ÉVALUATIONS POUR CES PRODUITS:")
print("="*80)

for name, pid, missing in products_with_na[:5]:  # Analyser les 5 premiers
    print(f"\n{name}:")
    product_evals = [e for e in all_evals if e['product_id'] == pid]
    
    # Compter par pilier
    pillar_counts = defaultdict(lambda: {'YES': 0, 'YESp': 0, 'NO': 0, 'TBD': 0, 'N/A': 0})
    for e in product_evals:
        norm_id = e['norm_id']
        result = e['result']
        if norm_id in norms:
            pillar = norms[norm_id]
            if pillar:
                pillar_counts[pillar][result] = pillar_counts[pillar].get(result, 0) + 1
    
    for pillar in ['S', 'A', 'F', 'E']:
        counts = pillar_counts.get(pillar, {})
        total = sum(counts.values())
        yes_no = counts.get('YES', 0) + counts.get('YESp', 0) + counts.get('NO', 0)
        print(f"  {pillar}: {total} évals (YES+YESp+NO={yes_no}, TBD={counts.get('TBD', 0)}, N/A={counts.get('N/A', 0)})")
