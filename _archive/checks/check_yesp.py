#!/usr/bin/env python3
"""Analyse des évaluations YESp"""

import requests
from collections import Counter

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Récupérer les produits
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name', headers=headers)
products = {p['id']: p['name'] for p in r.json()}

# Récupérer les normes (id -> title/code)
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title', headers=headers)
norms_data = r.json()
if isinstance(norms_data, list):
    norms = {n['id']: {'code': n['code'], 'title': n['title']} for n in norms_data}
else:
    print(f"Erreur norms: {norms_data}")
    norms = {}

# Récupérer les évaluations selon le type demandé
import sys
eval_type = sys.argv[1] if len(sys.argv) > 1 else 'YESp'

r = requests.get(f'{SUPABASE_URL}/rest/v1/evaluations?result=eq.{eval_type}&select=product_id,norm_id,result&limit=500', headers=headers)
eval_data = r.json()
if isinstance(eval_data, list):
    evals = eval_data
else:
    print(f"Erreur evaluations: {eval_data}")
    evals = []

print("=" * 80)
print(f"EXEMPLES DE {eval_type} - {len(evals)} trouvés")
print("=" * 80)

for e in evals[:50]:
    product_name = products.get(e['product_id'], 'Unknown')
    norm_info = norms.get(e['norm_id'], {'code': '?', 'title': 'Unknown'})
    print(f"\n{product_name}")
    print(f"  └─ {norm_info['code']}: {norm_info['title']}")

# Stats par produit
print("\n" + "=" * 80)
print(f"STATS {eval_type} PAR PRODUIT")
print("=" * 80)

product_counts = Counter(products.get(e['product_id'], 'Unknown') for e in evals)
for name, count in product_counts.most_common(20):
    print(f"  {name}: {count} {eval_type}")

# Stats par norme
print("\n" + "=" * 80)
print(f"NORMES LES PLUS SOUVENT {eval_type}")
print("=" * 80)

norm_counts = Counter(e['norm_id'] for e in evals)
for norm_id, count in norm_counts.most_common(20):
    norm_info = norms.get(norm_id, {'code': '?', 'title': '?'})
    print(f"  {norm_info['code']} ({norm_info['title'][:40]}): {count} fois")
