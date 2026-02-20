#!/usr/bin/env python3
"""Check if applicability analysis is complete for all product types"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, CONFIG
import requests

SERVICE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'}

print("=" * 60)
print("  VERIFICATION APPLICABILITE TYPES -> NORMES")
print("=" * 60)

# 1. Get all product types
resp = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name', headers=HEADERS)
types = resp.json() if resp.status_code == 200 else []
print(f"\n1. Types de produits: {len(types)}")

# 2. Get all norms
resp2 = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id&limit=10000', headers=HEADERS)
norms = resp2.json() if resp2.status_code == 200 else []
print(f"2. Normes totales: {len(norms)}")

# 3. Check type_compatibility table (type_id -> norm applicability)
resp3 = requests.get(
    f'{SUPABASE_URL}/rest/v1/type_compatibility?select=type_id,norm_id,is_applicable,applicability_reason&limit=10000',
    headers=HEADERS
)
compat = resp3.json() if resp3.status_code == 200 else []
print(f"3. Regles type_compatibility: {len(compat)}")

# 4. Check which types have applicability rules
types_with_rules = set()
for c in compat:
    if c.get('type_id'):
        types_with_rules.add(c['type_id'])

print(f"\n4. Types avec regles d'applicabilite: {len(types_with_rules)}/{len(types)}")

# 5. Find types WITHOUT rules
types_without = []
for t in types:
    if t['id'] not in types_with_rules:
        types_without.append(t)

if types_without:
    print(f"\n5. Types SANS regles ({len(types_without)}):")
    for t in types_without[:20]:
        print(f"   - {t['code']}: {t['name']}")
    if len(types_without) > 20:
        print(f"   ... et {len(types_without)-20} autres")
else:
    print("\n5. TOUS les types ont des regles d'applicabilite!")

# 6. Stats per type
print("\n6. Regles par type (top 10):")
type_counts = {}
for c in compat:
    tid = c.get('type_id')
    if tid:
        type_counts[tid] = type_counts.get(tid, 0) + 1

type_names = {t['id']: t['code'] for t in types}
sorted_counts = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
for tid, count in sorted_counts[:10]:
    print(f"   - {type_names.get(tid, tid)}: {count} normes")

# 7. Check applicability_rules table (alternative)
resp4 = requests.get(
    f'{SUPABASE_URL}/rest/v1/applicability_rules?select=id,product_type_id&limit=10000',
    headers=HEADERS
)
app_rules = resp4.json() if resp4.status_code == 200 else []
print(f"\n7. Table applicability_rules: {len(app_rules)} regles")

# 8. Check norm_applicability table (main table used by generator)
resp5 = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id,is_applicable&limit=10000',
    headers=HEADERS
)
norm_app = resp5.json() if resp5.status_code == 200 else []
print(f"8. Table norm_applicability: {len(norm_app)} regles")

if norm_app:
    types_in_norm_app = set(r['type_id'] for r in norm_app)
    print(f"   Types couverts: {len(types_in_norm_app)}/{len(types)}")

# 8. Summary
print("\n" + "=" * 60)
print("  RESUME")
print("=" * 60)
print(f"  Types: {len(types)}")
print(f"  Normes: {len(norms)}")
print(f"  Regles type_compatibility: {len(compat)}")
print(f"  Types avec regles: {len(types_with_rules)}")
print(f"  Types sans regles: {len(types_without)}")

if len(types_without) == 0:
    print("\n  STATUS: OK - Applicabilite complete!")
else:
    print(f"\n  STATUS: INCOMPLET - {len(types_without)} types manquants")
