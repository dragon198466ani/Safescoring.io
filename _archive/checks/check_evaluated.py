#!/usr/bin/env python3
"""Vérifie les produits déjà évalués dans Supabase"""
import requests

config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Produits
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/products?select=id,name,type_id,product_types(code)',
    headers=headers
)
products = {p['id']: p for p in r.json()} if r.status_code == 200 else {}

# Évaluations
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,result&limit=100000',
    headers=headers
)
evals = r.json() if r.status_code == 200 else []
print(f"Total évaluations: {len(evals)}")

# Grouper
scores = {}
for e in evals:
    pid = e['product_id']
    if pid not in scores:
        scores[pid] = {'yes': 0, 'no': 0}
    if e['result'] == 'YES':
        scores[pid]['yes'] += 1
    elif e['result'] == 'NO':
        scores[pid]['no'] += 1

# Afficher
print(f"\nProduits évalués: {len(scores)}")
print('-' * 60)
print(f"{'Produit':<30} | {'Type':<12} | {'Score':>6}")
print('-' * 60)

for pid, s in sorted(scores.items(), key=lambda x: x[1]['yes']/(x[1]['yes']+x[1]['no']) if x[1]['yes']+x[1]['no'] > 0 else 0, reverse=True):
    if pid in products:
        p = products[pid]
        total = s['yes'] + s['no']
        if total > 0:
            pct = s['yes'] * 100 / total
            ptype = ''
            if p.get('product_types'):
                ptype = p['product_types'].get('code', '')
            name = p['name'][:30]
            print(f"{name:<30} | {ptype:<12} | {pct:>5.1f}%")
