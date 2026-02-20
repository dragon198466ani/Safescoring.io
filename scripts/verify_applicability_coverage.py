#!/usr/bin/env python3
"""Verify applicability coverage"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, get_supabase_headers
import requests

headers = get_supabase_headers()

print("=" * 60)
print("  VERIFICATION COUVERTURE APPLICABILITE")
print("=" * 60)

# Get all types
r1 = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name', headers=headers)
types = r1.json() if r1.status_code == 200 else []
print(f"\n1. Types de produits: {len(types)}")

# Get norms count
headers2 = {**headers, 'Prefer': 'count=exact'}
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id', headers=headers2)
norms_count = int(r2.headers.get('content-range', '0/0').split('/')[-1])
print(f"2. Normes totales: {norms_count}")

# Get norm_applicability stats per type
r3 = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id&limit=200000',
    headers=headers
)
app_rules = r3.json() if r3.status_code == 200 else []
print(f"3. Total regles norm_applicability: {len(app_rules)}")

# Count per type
type_counts = {}
for rule in app_rules:
    tid = rule['type_id']
    type_counts[tid] = type_counts.get(tid, 0) + 1

print(f"4. Types avec regles: {len(type_counts)}/{len(types)}")

# Check coverage
type_map = {t['id']: t for t in types}
expected_per_type = norms_count

print(f"\n5. Couverture par type (attendu: {expected_per_type} normes/type):")
for tid, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:15]:
    t = type_map.get(tid, {'code': '?', 'name': '?'})
    pct = count / expected_per_type * 100 if expected_per_type else 0
    status = 'OK' if count >= expected_per_type else 'PARTIEL'
    print(f"   - {t['code'][:15]:15} : {count:4} / {expected_per_type} ({pct:5.1f}%) [{status}]")

# Types without rules
types_without = [t for t in types if t['id'] not in type_counts]
if types_without:
    print(f"\n6. Types SANS regles ({len(types_without)}):")
    for t in types_without[:10]:
        print(f"   - {t['code']}: {t['name']}")
else:
    print(f"\n6. TOUS les types ont des regles!")

# Sample some rules
print("\n7. Exemples de regles:")
r4 = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id,is_applicable,applicability_reason&limit=5',
    headers=headers
)
for rule in r4.json()[:5]:
    print(f"   type={rule['type_id']}, norm={rule['norm_id']}, applicable={rule['is_applicable']}")
