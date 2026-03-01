#!/usr/bin/env python3
"""Full database audit for SafeScoring."""
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

h = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}
hc = {**h, 'Prefer': 'count=exact'}


def get_count(table, filters=''):
    url = f'{SUPABASE_URL}/rest/v1/{table}?select=id&limit=1{filters}'
    if table == 'norm_applicability':
        url = f'{SUPABASE_URL}/rest/v1/{table}?select=type_id&limit=1{filters}'
    r = requests.get(url, headers=hc)
    cr = r.headers.get('content-range', '*/*')
    parts = cr.split('/')
    if len(parts) == 2 and parts[-1] not in ('*', ''):
        return int(parts[-1])
    return 0


print('=' * 65)
print('  AUDIT COMPLET BASE DE DONNEES SAFESCORING')
print('=' * 65)

# ── PRODUCTS ──
print('\n[1] PRODUITS')
total = get_count('products')
active = get_count('products', '&is_active=eq.true')
no_type = get_count('products', '&type_id=is.null&is_active=eq.true')
no_url = get_count('products', '&url=is.null&is_active=eq.true')
no_desc = get_count('products', '&description=is.null&is_active=eq.true')
no_slug = get_count('products', '&slug=is.null&is_active=eq.true')
print(f'  Total: {total}  |  Actifs: {active}')
print(f'  Sans type:  {no_type}')
print(f'  Sans URL:   {no_url}')
print(f'  Sans desc:  {no_desc}')
print(f'  Sans slug:  {no_slug}')

if no_type > 0:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?type_id=is.null&is_active=eq.true&select=id,name', headers=h)
    print('  --> Sans type:')
    for p in r.json():
        print(f'      [{p["id"]}] {p["name"]}')

if no_url > 0:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?url=is.null&is_active=eq.true&select=id,name&limit=20', headers=h)
    print('  --> Sans URL:')
    for p in r.json():
        print(f'      [{p["id"]}] {p["name"]}')

# ── TYPES ──
print('\n[2] TYPES DE PRODUITS')
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name,code&order=id&limit=100', headers=h)
types_list = r.json()
print(f'  Total: {len(types_list)}')

no_def = get_count('product_types', '&definition=is.null')
no_code = get_count('product_types', '&code=is.null')
print(f'  Sans definition: {no_def}')
print(f'  Sans code: {no_code}')

# ── NORMS ──
print('\n[3] NORMES')
total_norms = get_count('norms')
no_title = get_count('norms', '&title=is.null')
no_ndesc = get_count('norms', '&description=is.null')
no_pillar = get_count('norms', '&pillar=is.null')
print(f'  Total: {total_norms}')
print(f'  Sans titre: {no_title}  |  Sans desc: {no_ndesc}  |  Sans pillar: {no_pillar}')

# Norms par pillar
for pillar in ['S', 'A', 'F', 'E']:
    c = get_count('norms', f'&pillar=eq.{pillar}')
    print(f'  Pillar {pillar}: {c} normes')

# ── APPLICABILITY ──
print('\n[4] APPLICABILITE PAR TYPE')
total_app = get_count('norm_applicability')
print(f'  Total regles: {total_app}')
expected = len(types_list) * total_norms
print(f'  Attendu (types x norms): {len(types_list)} x {total_norms} = {expected}')
print(f'  Couverture: {total_app * 100 // expected}%')

incomplete = []
complete = 0
for t in types_list:
    tid = t['id']
    url = f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{tid}&select=type_id&limit=1'
    r2 = requests.get(url, headers=hc)
    cr = r2.headers.get('content-range', '*/*')
    parts = cr.split('/')
    cnt = 0
    if len(parts) == 2 and parts[-1] not in ('*', ''):
        cnt = int(parts[-1])
    if cnt == total_norms:
        complete += 1
    else:
        incomplete.append((tid, t['code'] or '?', t['name'], cnt))
    time.sleep(0.02)

print(f'\n  Complets ({total_norms}/{total_norms}): {complete}/{len(types_list)} types')
if incomplete:
    print(f'  INCOMPLETS: {len(incomplete)} types')
    for tid, code, name, cnt in sorted(incomplete, key=lambda x: x[3]):
        pct = cnt * 100 // total_norms if cnt > 0 else 0
        print(f'    {tid:3d} | {code:15s} | {name[:35]:35s} | {cnt:5d}/{total_norms} ({pct}%)')

# ── MAPPING CONSISTENCY ──
print('\n[5] COHERENCE PRODUCT_TYPE_MAPPING')
total_map = get_count('product_type_mapping')
print(f'  Total mappings: {total_map}')

# Products with type_id but no mapping
r = requests.get(f'{SUPABASE_URL}/rest/v1/products?type_id=not.is.null&is_active=eq.true&select=id,name,type_id&limit=1000', headers=h)
products_with_type = r.json()

# Get all mappings
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary&limit=2000', headers=h)
mappings = r2.json()
mapped_products = set(m['product_id'] for m in mappings)

no_mapping = [p for p in products_with_type if p['id'] not in mapped_products]
print(f'  Produits avec type_id mais sans mapping: {len(no_mapping)}')

# Check inconsistent type_id vs primary mapping
inconsistent = []
primary_map = {m['product_id']: m['type_id'] for m in mappings if m.get('is_primary')}
for p in products_with_type:
    pid = p['id']
    if pid in primary_map and primary_map[pid] != p['type_id']:
        inconsistent.append((pid, p['name'], p['type_id'], primary_map[pid]))

print(f'  type_id vs primary mapping inconsistent: {len(inconsistent)}')
if inconsistent:
    for pid, name, prod_type, map_type in inconsistent[:10]:
        print(f'    [{pid}] {name}: product.type_id={prod_type} vs mapping.primary={map_type}')

# ── EVALUATIONS ──
print('\n[6] EVALUATIONS')
total_evals = get_count('product_norm_evaluations')
print(f'  Total: {total_evals}')

print('\n' + '=' * 65)
print('  FIN AUDIT')
print('=' * 65)
