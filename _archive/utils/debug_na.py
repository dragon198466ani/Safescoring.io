#!/usr/bin/env python3
"""Debug les N/A dans les scores"""
import requests

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# Vérifier Morpho - un produit avec beaucoup de N/A
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?name=eq.Morpho&select=id,name,type_id', headers=headers)
morpho = r.json()[0]
print(f"Morpho: type_id={morpho['type_id']}")

# Vérifier le type
r = requests.get(f"{SUPABASE_URL}/rest/v1/product_types?id=eq.{morpho['type_id']}&select=*", headers=headers)
ptype = r.json()[0]
print(f"Type: {ptype['name']}")

# Vérifier l'applicabilité
r = requests.get(f"{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{morpho['type_id']}&select=norm_id,is_applicable", headers=headers)
applicability = r.json()
applicable = [a for a in applicability if a['is_applicable']]
print(f"Normes applicables: {len(applicable)}/{len(applicability)}")

# Charger les normes pour voir les piliers
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar', headers=headers)
norms = {n['id']: n for n in r.json()}

# Compter les normes applicables par pilier
from collections import Counter
pillar_counts = Counter()
for a in applicable:
    norm = norms.get(a['norm_id'])
    if norm and norm.get('pillar'):
        pillar_counts[norm['pillar']] += 1

print(f"\nNormes applicables par pilier:")
for p in ['S', 'A', 'F', 'E']:
    print(f"  {p}: {pillar_counts.get(p, 0)}")

# Vérifier les évaluations
r = requests.get(f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{morpho['id']}&select=norm_id,result", headers=headers)
evals = r.json()
print(f"\nÉvaluations: {len(evals)}")

# Compter par résultat et pilier
from collections import defaultdict
results_by_pillar = defaultdict(Counter)
for e in evals:
    norm = norms.get(e['norm_id'])
    if norm and norm.get('pillar'):
        results_by_pillar[norm['pillar']][e['result']] += 1

print("\nRésultats par pilier:")
for p in ['S', 'A', 'F', 'E']:
    counts = results_by_pillar.get(p, {})
    print(f"  {p}: YES={counts.get('YES', 0)}, YESp={counts.get('YESp', 0)}, NO={counts.get('NO', 0)}, TBD={counts.get('TBD', 0)}, N/A={counts.get('N/A', 0)}")
