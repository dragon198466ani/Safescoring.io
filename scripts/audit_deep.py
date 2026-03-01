#!/usr/bin/env python3
"""
Deep audit - Part 2: multi-type consistency, duplicates, score vs products columns
"""
import sys, os, requests, time, json
from collections import Counter, defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_KEY

key = SUPABASE_SERVICE_KEY or SUPABASE_KEY
H = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}

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

def section(t):
    print(f"\n{'='*70}\n  {t}\n{'='*70}")

# Load data
print("Loading data...")
products = fetch_all('products', select='id,name,slug,url,type_id,description,is_active,deleted_at,safe_score,score_s,score_a,score_f,score_e', order='id')
types = fetch_all('product_types', select='id,code,name,category', order='id')
mappings = fetch_all('product_type_mapping', select='id,product_id,type_id,is_primary', order='product_id')
scores = fetch_all('safe_scoring_results', select='product_id,note_finale,score_s,score_a,score_f,score_e', order='product_id')
evals = fetch_all('evaluations', select='product_id,norm_id,result,evaluated_by', order='product_id', page_size=1000)
norms = fetch_all('norms', select='id,code,pillar,title,description,official_link,hallucination_checked,hallucination_score,summary_status', order='id')
narratives = fetch_all('product_pillar_narratives', select='product_id,pillar,narrative_summary,risk_level,pillar_score', order='product_id')

products_by_id = {p['id']: p for p in products}
types_by_id = {t['id']: t for t in types}
norms_by_id = {n['id']: n for n in norms}
scores_by_pid = {s['product_id']: s for s in scores}

# Separate active vs soft-deleted products
active_products = [p for p in products if not p.get('deleted_at')]
deleted_products = [p for p in products if p.get('deleted_at')]
active_by_id = {p['id']: p for p in active_products}

print(f"Loaded: {len(products)} products ({len(active_products)} active, {len(deleted_products)} deleted), {len(types)} types, {len(mappings)} mappings, {len(scores)} scores, {len(evals)} evals, {len(norms)} norms, {len(narratives)} narratives")

# ============================================================
# A. DUPLICATE PRODUCTS DEEP DIVE
# ============================================================
section("A. DUPLICATE PRODUCTS (active only)")
name_groups = defaultdict(list)
for p in active_products:
    name_groups[p['name']].append(p)

dupes = {k: v for k, v in name_groups.items() if len(v) > 1}
print(f"  {len(dupes)} duplicate name groups:")
for name, prods in sorted(dupes.items()):
    for p in prods:
        tid = types_by_id.get(p.get('type_id'), {}).get('code', '?')
        has_score = 'SCORED' if p['id'] in scores_by_pid else 'no score'
        has_eval = 'EVALS' if p['id'] in {e['product_id'] for e in evals} else 'no eval'
        desc_len = len(p.get('description') or '')
        print(f"    id={p['id']:<5} slug={p['slug']:<40} type={tid:<15} {has_score:<10} {has_eval:<10} desc={desc_len}ch url={p.get('url','')[:50]}")
    print()

# ============================================================
# B. PRODUCTS WITHOUT TYPE MAPPING (512)
# ============================================================
section("B. PRODUCTS WITHOUT TYPE MAPPING (active only)")
mapped_pids = set(m['product_id'] for m in mappings)
unmapped = [p for p in active_products if p['id'] not in mapped_pids]
print(f"  {len(unmapped)} products without ANY type mapping")

# Group by type_id
unmapped_by_type = defaultdict(list)
for p in unmapped:
    tid = types_by_id.get(p.get('type_id'), {}).get('code', 'NO_TYPE')
    unmapped_by_type[tid].append(p)

print(f"  Distribution by type_id:")
for tid, prods in sorted(unmapped_by_type.items(), key=lambda x: -len(x[1])):
    print(f"    {tid:<25} : {len(prods)} products")

# ============================================================
# C. TYPE_ID vs MAPPING MISMATCH ANALYSIS
# ============================================================
section("C. TYPE_ID vs MAPPING MISMATCH ANALYSIS")
mapping_by_pid = defaultdict(list)
for m in mappings:
    mapping_by_pid[m['product_id']].append(m)

mismatch_count = 0
mismatch_categories = Counter()
for p in active_products:
    pid = p['id']
    ptype = p.get('type_id')
    if pid in mapping_by_pid and ptype:
        mapping_type_ids = [m['type_id'] for m in mapping_by_pid[pid]]
        if ptype not in mapping_type_ids:
            mismatch_count += 1
            ptype_code = types_by_id.get(ptype, {}).get('code', '?')
            map_codes = [types_by_id.get(t, {}).get('code', '?') for t in mapping_type_ids]
            mismatch_categories[f"{ptype_code} -> {','.join(map_codes)}"] += 1

print(f"  {mismatch_count} total mismatches between products.type_id and mapping table")
print(f"  Mismatch patterns:")
for pattern, count in sorted(mismatch_categories.items(), key=lambda x: -x[1]):
    print(f"    {pattern:<50} : {count}")

# ============================================================
# D. SCORE COLUMNS ON PRODUCTS vs safe_scoring_results
# ============================================================
section("D. SCORE CONSISTENCY: products.safe_score vs safe_scoring_results.note_finale")
score_mismatch = []
for p in active_products:
    pid = p['id']
    p_score = p.get('safe_score')
    if pid in scores_by_pid:
        sr = scores_by_pid[pid]
        sr_score = sr.get('note_finale')
        if p_score is not None and sr_score is not None:
            if abs(float(p_score) - float(sr_score)) > 0.01:
                score_mismatch.append((p['name'], p_score, sr_score))
        elif p_score is None and sr_score is not None:
            score_mismatch.append((p['name'], 'NULL', sr_score))
        elif p_score is not None and sr_score is None:
            score_mismatch.append((p['name'], p_score, 'NULL in results'))

# Products with safe_score but no safe_scoring_results entry
products_with_score_col = [p for p in active_products if p.get('safe_score') is not None]
products_without_score_col = [p for p in active_products if p.get('safe_score') is None and p['id'] in scores_by_pid]

print(f"  Products with safe_score column set: {len(products_with_score_col)}")
print(f"  Products with safe_scoring_results entry: {len(scores)}")
print(f"  Mismatches: {len(score_mismatch)}")
if score_mismatch:
    for name, ps, sr in score_mismatch[:20]:
        print(f"    {name:<35} products.safe_score={ps}, results.note_finale={sr}")
if products_without_score_col:
    print(f"  {len(products_without_score_col)} products have results but NULL safe_score column:")
    for p in products_without_score_col[:10]:
        print(f"    {p['name']} (id={p['id']})")

# ============================================================
# E. EVALUATION ORPHAN CHECK
# ============================================================
section("E. EVALUATION ORPHANS")
eval_product_ids = set(e['product_id'] for e in evals)
eval_norm_ids = set(e['norm_id'] for e in evals)

orphan_products = eval_product_ids - set(products_by_id.keys())
orphan_norms = eval_norm_ids - set(norms_by_id.keys())

print(f"  Evaluations reference {len(eval_product_ids)} unique products")
print(f"  Orphan product references: {len(orphan_products)}")
print(f"  Orphan norm references: {len(orphan_norms)}")
if orphan_products:
    print(f"  Orphan product IDs: {orphan_products}")

# ============================================================
# F. NARRATIVE QUALITY CHECK
# ============================================================
section("F. NARRATIVE QUALITY CHECK")
narr_by_product = defaultdict(dict)
for n in narratives:
    narr_by_product[n['product_id']][n['pillar']] = n

# Products with all 4 pillars
complete = [pid for pid, pillars in narr_by_product.items() if len(pillars) == 4]
incomplete = [pid for pid, pillars in narr_by_product.items() if len(pillars) < 4]
print(f"  Products with all 4 pillar narratives: {len(complete)}")
print(f"  Products with incomplete narratives: {len(incomplete)}")
if incomplete:
    for pid in incomplete[:10]:
        pname = products_by_id.get(pid, {}).get('name', f'ID:{pid}')
        pillars = list(narr_by_product[pid].keys())
        print(f"    {pname}: has {pillars}")

# Narrative score vs actual score
print(f"\n  Checking narrative pillar_score vs safe_scoring_results...")
score_narr_mismatch = 0
for pid, pillars in narr_by_product.items():
    if pid in scores_by_pid:
        sr = scores_by_pid[pid]
        for pillar, narr in pillars.items():
            narr_score = narr.get('pillar_score')
            actual_key = f"score_{pillar.lower()}"
            actual_score = sr.get(actual_key)
            if narr_score is not None and actual_score is not None:
                if abs(float(narr_score) - float(actual_score)) > 0.5:
                    score_narr_mismatch += 1
                    if score_narr_mismatch <= 10:
                        pname = products_by_id.get(pid, {}).get('name', '?')
                        print(f"    {pname} pillar={pillar}: narrative={narr_score}, actual={actual_score}")
print(f"  Total narrative/score mismatches: {score_narr_mismatch}")

# ============================================================
# G. NORMS HALLUCINATION CHECK STATUS
# ============================================================
section("G. NORMS HALLUCINATION CHECK STATUS")
checked = [n for n in norms if n.get('hallucination_checked')]
unchecked = [n for n in norms if not n.get('hallucination_checked')]
print(f"  Hallucination checked: {len(checked)} / {len(norms)}")
print(f"  Not checked: {len(unchecked)}")

if checked:
    h_scores = [n['hallucination_score'] for n in checked if n.get('hallucination_score') is not None]
    if h_scores:
        print(f"  Hallucination score range: {min(h_scores)} - {max(h_scores)}")
        print(f"  Hallucination score avg: {sum(h_scores)/len(h_scores):.2f}")
        high_risk = [n for n in checked if n.get('hallucination_score') and n['hallucination_score'] > 5]
        if high_risk:
            print(f"  HIGH hallucination risk (>5): {len(high_risk)}")
            for n in high_risk[:10]:
                print(f"    {n['code']}: score={n['hallucination_score']} - {n['title'][:60]}")

# Summary status
summary_statuses = Counter(n.get('summary_status', 'NULL') for n in norms)
print(f"  Summary status distribution: {dict(sorted(summary_statuses.items()))}")

# ============================================================
# H. DELETED/INACTIVE PRODUCTS CHECK
# ============================================================
section("H. DELETED/INACTIVE PRODUCTS")
deleted = deleted_products
inactive = [p for p in products if p.get('is_active') == False]
print(f"  Deleted (soft): {len(deleted)}")
print(f"  Inactive: {len(inactive)}")
if deleted:
    print(f"  Deleted products:")
    for p in deleted[:20]:
        print(f"    {p['name']} (id={p['id']}, slug={p['slug']})")

# ============================================================
# I. MULTI-TYPE: is_primary CONSISTENCY
# ============================================================
section("I. MULTI-TYPE is_primary CONSISTENCY")
multi_pid = [pid for pid, maps in mapping_by_pid.items() if len(maps) > 1]
no_primary = []
multi_primary = []
for pid in multi_pid:
    maps = mapping_by_pid[pid]
    primaries = [m for m in maps if m.get('is_primary')]
    if len(primaries) == 0:
        no_primary.append(pid)
    elif len(primaries) > 1:
        multi_primary.append((pid, len(primaries)))

print(f"  Multi-type products: {len(multi_pid)}")
print(f"  Without any primary: {len(no_primary)}")
print(f"  With multiple primaries: {len(multi_primary)}")
if no_primary:
    print(f"  Products without primary:")
    for pid in no_primary[:15]:
        pname = products_by_id.get(pid, {}).get('name', f'ID:{pid}')
        type_codes = [types_by_id.get(m['type_id'], {}).get('code', '?') for m in mapping_by_pid[pid]]
        print(f"    {pname}: types={type_codes}")
if multi_primary:
    print(f"  Products with multiple primaries:")
    for pid, count in multi_primary[:15]:
        pname = products_by_id.get(pid, {}).get('name', f'ID:{pid}')
        primaries = [types_by_id.get(m['type_id'], {}).get('code', '?') for m in mapping_by_pid[pid] if m.get('is_primary')]
        print(f"    {pname}: primary={primaries}")

# ============================================================
# J. PRODUCTS.TYPE_ID SHOULD MATCH PRIMARY MAPPING
# ============================================================
section("J. PRODUCTS.TYPE_ID vs PRIMARY MAPPING TYPE")
type_primary_mismatch = []
for pid in mapping_by_pid:
    maps = mapping_by_pid[pid]
    primaries = [m for m in maps if m.get('is_primary')]
    if primaries and pid in active_by_id:
        p = active_by_id[pid]
        p_type = p.get('type_id')
        primary_type_ids = [m['type_id'] for m in primaries]
        if p_type and p_type not in primary_type_ids:
            pname = p['name']
            p_code = types_by_id.get(p_type, {}).get('code', '?')
            prim_codes = [types_by_id.get(t, {}).get('code', '?') for t in primary_type_ids]
            type_primary_mismatch.append((pname, p_code, prim_codes))

print(f"  Products where type_id != primary mapping type: {len(type_primary_mismatch)}")
for name, pcode, pcodes in type_primary_mismatch[:20]:
    print(f"    {name:<35} type_id={pcode}, primary={pcodes}")

print("\n\nDEEP AUDIT COMPLETE")
