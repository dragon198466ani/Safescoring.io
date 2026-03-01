#!/usr/bin/env python3
"""
SafeScoring Data Corrections
Fixes identified by audit_all_data.py and audit_deep.py:
  1. Auto-populate product_type_mapping for 512 unmapped products
  2. Sync products.type_id to match primary mapping type (245 mismatches)  
  3. Delete 15 duplicate products (keep original, remove Protocol clones)
  4. Nullify stale products.safe_score for 1497 non-recalculated products
"""
import sys, os, requests, time, json
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_KEY

key = SUPABASE_SERVICE_KEY or SUPABASE_KEY
H = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def fetch_all(table, select='*', order=None, filters=None, page_size=1000):
    all_records = []
    offset = 0
    for _ in range(500):
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={page_size}"
        if order: url += f"&order={order}"
        if filters:
            for k, v in filters.items(): url += f"&{k}={v}"
        r = requests.get(url, headers=H, timeout=60)
        if r.status_code != 200:
            print(f"  [FETCH ERROR] {table}: {r.status_code} {r.text[:200]}")
            break
        data = r.json()
        if not data: break
        all_records.extend(data)
        if len(data) < page_size: break
        offset += page_size
    return all_records

def patch(table, filters, data):
    """PATCH (update) records matching filters."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = []
    for k, v in filters.items():
        params.append(f"{k}={v}")
    url += "?" + "&".join(params)
    r = requests.patch(url, headers=H, json=data, timeout=30)
    return r.status_code, r.text[:200]

def insert(table, data):
    """INSERT records."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    h = dict(H)
    h['Prefer'] = 'return=minimal,resolution=merge-duplicates'
    r = requests.post(url, headers=h, json=data, timeout=30)
    return r.status_code, r.text[:200]

def delete(table, filters):
    """DELETE records matching filters."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = []
    for k, v in filters.items():
        params.append(f"{k}={v}")
    url += "?" + "&".join(params)
    r = requests.delete(url, headers=H, timeout=30)
    return r.status_code, r.text[:200]

# ============================================================
# LOAD DATA
# ============================================================
print("Loading data...")
products = fetch_all('products', select='id,name,slug,url,type_id,safe_score,score_s,score_a,score_f,score_e', order='id')
types = fetch_all('product_types', select='id,code,name', order='id')
mappings = fetch_all('product_type_mapping', select='id,product_id,type_id,is_primary', order='product_id')
scores = fetch_all('safe_scoring_results', select='product_id,note_finale,score_s,score_a,score_f,score_e', order='product_id')
evals = fetch_all('evaluations', select='product_id', order='product_id')

products_by_id = {p['id']: p for p in products}
types_by_id = {t['id']: t for t in types}
scores_by_pid = {s['product_id']: s for s in scores}
eval_pids = set(e['product_id'] for e in evals)

mapping_by_pid = defaultdict(list)
for m in mappings:
    mapping_by_pid[m['product_id']].append(m)

mapped_pids = set(m['product_id'] for m in mappings)

print(f"Loaded: {len(products)} products, {len(types)} types, {len(mappings)} mappings, {len(scores)} scores")

# ============================================================
# FIX 1: Auto-populate product_type_mapping for unmapped products
# ============================================================
print(f"\n{'='*60}")
print("FIX 1: Auto-populate missing product_type_mapping entries")
print(f"{'='*60}")

unmapped = [p for p in products if p['id'] not in mapped_pids and p.get('type_id')]
print(f"  {len(unmapped)} products need mapping entries")

# Insert in batches of 50
batch = []
for p in unmapped:
    batch.append({
        'product_id': p['id'],
        'type_id': p['type_id'],
        'is_primary': True
    })
    if len(batch) >= 50:
        code, text = insert('product_type_mapping', batch)
        if code not in (200, 201):
            print(f"  [ERROR] batch insert: {code} {text}")
        batch = []

if batch:
    code, text = insert('product_type_mapping', batch)
    if code not in (200, 201):
        print(f"  [ERROR] final batch: {code} {text}")

print(f"  [DONE] Inserted {len(unmapped)} mapping entries")

# ============================================================
# FIX 2: Sync products.type_id to match primary mapping type
# ============================================================
print(f"\n{'='*60}")
print("FIX 2: Sync products.type_id to match primary mapping type")
print(f"{'='*60}")

# Reload mappings after fix 1
mappings = fetch_all('product_type_mapping', select='id,product_id,type_id,is_primary', order='product_id')
mapping_by_pid = defaultdict(list)
for m in mappings:
    mapping_by_pid[m['product_id']].append(m)

fix2_count = 0
for pid, maps in mapping_by_pid.items():
    if pid not in products_by_id:
        continue
    p = products_by_id[pid]
    primaries = [m for m in maps if m.get('is_primary')]
    if primaries:
        primary_type_id = primaries[0]['type_id']
        if p.get('type_id') != primary_type_id:
            code, text = patch('products', {'id': f'eq.{pid}'}, {'type_id': primary_type_id})
            if code in (200, 204):
                fix2_count += 1
            else:
                print(f"  [ERROR] updating product {pid}: {code} {text}")

print(f"  [DONE] Updated {fix2_count} products.type_id to match primary mapping")

# ============================================================
# FIX 3: Delete duplicate products
# ============================================================
print(f"\n{'='*60}")
print("FIX 3: Delete duplicate products")
print(f"{'='*60}")

# Known duplicates: keep original (lower id), delete clone (higher id)
# Pattern: original is the specific type (Bridges, Liq Staking), clone is Protocol type
name_groups = defaultdict(list)
for p in products:
    name_groups[p['name']].append(p)

dupes = {k: v for k, v in name_groups.items() if len(v) > 1}
deleted_ids = []

for name, prods in dupes.items():
    # Sort by id - keep lowest
    prods.sort(key=lambda x: x['id'])
    original = prods[0]
    
    for clone in prods[1:]:
        clone_id = clone['id']
        clone_type = types_by_id.get(clone.get('type_id'), {}).get('code', '?')
        orig_type = types_by_id.get(original.get('type_id'), {}).get('code', '?')
        
        # Safety: only delete if clone has no scores and no evaluations
        has_score = clone_id in scores_by_pid
        has_eval = clone_id in eval_pids
        
        if has_score or has_eval:
            print(f"  [SKIP] {name} (id={clone_id}) - has {'scores' if has_score else ''} {'evals' if has_eval else ''}")
            continue
        
        print(f"  Deleting: {name} (id={clone_id}, type={clone_type}) - keeping id={original['id']} ({orig_type})")
        
        # Delete related records first
        # 1. Delete type mappings
        code, text = delete('product_type_mapping', {'product_id': f'eq.{clone_id}'})
        
        # 2. Delete narratives
        code, text = delete('product_pillar_narratives', {'product_id': f'eq.{clone_id}'})
        
        # 3. Delete product
        code, text = delete('products', {'id': f'eq.{clone_id}'})
        if code in (200, 204):
            deleted_ids.append(clone_id)
        else:
            print(f"  [ERROR] deleting product {clone_id}: {code} {text}")

print(f"  [DONE] Deleted {len(deleted_ids)} duplicate products: {deleted_ids}")

# ============================================================
# FIX 4: Nullify stale products.safe_score
# ============================================================
print(f"\n{'='*60}")
print("FIX 4: Nullify stale products.safe_score for non-recalculated products")
print(f"{'='*60}")

# Products that have safe_score set but are NOT in safe_scoring_results
# Or products where safe_score doesn't match safe_scoring_results
scored_pids = set(scores_by_pid.keys())

# First: null out ALL products.safe_score, score_s, score_a, score_f, score_e
# that are NOT in safe_scoring_results
stale_products = [p for p in products if p.get('safe_score') is not None and p['id'] not in scored_pids]
print(f"  {len(stale_products)} products with stale safe_score (not in safe_scoring_results)")

# Batch update in groups of 100 by using filter on IDs
batch_size = 50
for i in range(0, len(stale_products), batch_size):
    batch = stale_products[i:i+batch_size]
    ids = [p['id'] for p in batch]
    ids_str = ','.join(str(x) for x in ids)
    
    code, text = patch(
        'products',
        {'id': f'in.({ids_str})'},
        {'safe_score': None, 'score_s': None, 'score_a': None, 'score_f': None, 'score_e': None}
    )
    if code not in (200, 204):
        print(f"  [ERROR] batch null scores: {code} {text}")

print(f"  [DONE] Nullified safe_score for {len(stale_products)} stale products")

# Second: sync products.safe_score from safe_scoring_results for the 49 scored ones
print(f"\n  Syncing {len(scores)} products.safe_score from safe_scoring_results...")
sync_count = 0
for s in scores:
    pid = s['product_id']
    if pid not in products_by_id:
        continue
    code, text = patch(
        'products',
        {'id': f'eq.{pid}'},
        {
            'safe_score': s['note_finale'],
            'score_s': s['score_s'],
            'score_a': s['score_a'],
            'score_f': s['score_f'],
            'score_e': s['score_e']
        }
    )
    if code in (200, 204):
        sync_count += 1
    else:
        print(f"  [ERROR] syncing product {pid}: {code} {text}")

print(f"  [DONE] Synced scores for {sync_count} products from safe_scoring_results")

# ============================================================
# VERIFICATION
# ============================================================
print(f"\n{'='*60}")
print("VERIFICATION")
print(f"{'='*60}")

# Re-check
products_after = fetch_all('products', select='id,safe_score', order='id')
mappings_after = fetch_all('product_type_mapping', select='product_id', order='product_id')

mapped_after = set(m['product_id'] for m in mappings_after)
unmapped_after = [p for p in products_after if p['id'] not in mapped_after]
with_score = [p for p in products_after if p.get('safe_score') is not None]
null_score = [p for p in products_after if p.get('safe_score') is None]

print(f"  Products total: {len(products_after)}")
print(f"  Products with mapping: {len(mapped_after)}")
print(f"  Products without mapping: {len(unmapped_after)}")
print(f"  Products with safe_score: {len(with_score)}")
print(f"  Products with NULL safe_score: {len(null_score)}")
print(f"  Expected scored: {len(scores)}")

if len(with_score) == len(scores):
    print("  [OK] Score count matches safe_scoring_results!")
else:
    print(f"  [!] Score count mismatch: {len(with_score)} vs {len(scores)} expected")

print("\nALL FIXES COMPLETE")
