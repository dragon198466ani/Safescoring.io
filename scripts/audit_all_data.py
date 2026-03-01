#!/usr/bin/env python3
"""
SAFESCORING.IO - Complete Data Audit
Audits ALL data in Supabase for correctness, completeness, and consistency.
"""
import sys, os, re, json, requests, time
from collections import Counter, defaultdict
from urllib.parse import urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_KEY, get_supabase_headers

# Use SERVICE KEY to bypass RLS (anon key blocked on products, norm_applicability, etc.)
ADMIN_HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY or SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY or SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def fetch_all(table, select='*', order=None, filters=None, page_size=1000):
    """Fetch ALL records with service key (bypasses RLS)."""
    all_records = []
    offset = 0
    for _ in range(500):  # safety
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={page_size}"
        if order:
            url += f"&order={order}"
        if filters:
            for k, v in filters.items():
                url += f"&{k}={v}"
        r = requests.get(url, headers=ADMIN_HEADERS, timeout=60)
        if r.status_code != 200:
            print(f"  [FETCH ERROR] {table}: {r.status_code} {r.text[:200]}")
            break
        data = r.json()
        if not data:
            break
        all_records.extend(data)
        if len(data) < page_size:
            break
        offset += page_size
        if offset % 5000 == 0:
            time.sleep(0.2)
    return all_records

print(f"[CONFIG] SUPABASE_URL = {SUPABASE_URL[:40]}...")
print(f"[CONFIG] Service Key present: {bool(SUPABASE_SERVICE_KEY)} (len={len(SUPABASE_SERVICE_KEY) if SUPABASE_SERVICE_KEY else 0})")
print(f"[CONFIG] Anon Key present: {bool(SUPABASE_KEY)} (len={len(SUPABASE_KEY) if SUPABASE_KEY else 0})")

# Quick test: fetch 1 product directly to debug RLS
test_r = requests.get(f"{SUPABASE_URL}/rest/v1/products?select=id,name&limit=3", headers=ADMIN_HEADERS, timeout=30)
print(f"[TEST] products query status={test_r.status_code}, rows={len(test_r.json()) if test_r.status_code == 200 else 'ERROR'}, body={test_r.text[:200]}")

def section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def warn(msg):
    print(f"  [!] WARNING: {msg}")

def error(msg):
    print(f"  [X] ERROR: {msg}")

def ok(msg):
    print(f"  [OK] {msg}")

def info(msg):
    print(f"  -> {msg}")

# ============================================================
# 1. PRODUCT TYPES
# ============================================================
section("1. PRODUCT TYPES")
types = fetch_all('product_types', select='id,code,name,definition,category,is_hardware,is_custodial,is_wallet,is_defi,is_protocol', order='id')
info(f"{len(types)} product types loaded")

types_by_id = {t['id']: t for t in types}
types_by_code = {t['code']: t for t in types}

# Check for missing fields
missing_def = [t for t in types if not t.get('definition') or len(str(t.get('definition',''))) < 10]
missing_name = [t for t in types if not t.get('name') or len(str(t.get('name',''))) < 2]
missing_code = [t for t in types if not t.get('code') or len(str(t.get('code',''))) < 2]

if missing_code:
    error(f"{len(missing_code)} types missing code: {[t['id'] for t in missing_code]}")
if missing_name:
    error(f"{len(missing_name)} types missing name: {[t['id'] for t in missing_name]}")
if missing_def:
    warn(f"{len(missing_def)} types missing/short definition: {[(t['id'], t.get('code','?')) for t in missing_def]}")

# Check for duplicate codes
code_counts = Counter(t['code'] for t in types if t.get('code'))
dupes = {k:v for k,v in code_counts.items() if v > 1}
if dupes:
    error(f"Duplicate type codes: {dupes}")
else:
    ok(f"All {len(types)} type codes unique")

# List all types
for t in sorted(types, key=lambda x: x['id']):
    cat = t.get('category', '?')
    defn = str(t.get('definition', ''))[:60]
    print(f"    [{t['id']:3}] {t.get('code','?'):<25} | {t.get('name','?'):<35} | cat={cat} | def={defn}...")

# ============================================================
# 2. PRODUCTS
# ============================================================
section("2. PRODUCTS")
products = fetch_all('products', select='id,name,slug,url,type_id,description,logo_url,social_links,is_active,deleted_at,safe_score,score_s,score_a,score_f,score_e', order='id')
info(f"{len(products)} products loaded")

products_by_id = {p['id']: p for p in products}

# Check for missing critical fields
missing_name_p = [p for p in products if not p.get('name') or len(str(p.get('name',''))) < 2]
missing_slug_p = [p for p in products if not p.get('slug') or len(str(p.get('slug',''))) < 2]
missing_url_p = [p for p in products if not p.get('url') or len(str(p.get('url',''))) < 5]
missing_type_p = [p for p in products if not p.get('type_id')]
missing_desc_p = [p for p in products if not p.get('description') or len(str(p.get('description',''))) < 10]

if missing_name_p:
    error(f"{len(missing_name_p)} products missing name")
if missing_slug_p:
    error(f"{len(missing_slug_p)} products missing slug")
if missing_url_p:
    warn(f"{len(missing_url_p)} products missing URL")
if missing_type_p:
    warn(f"{len(missing_type_p)} products missing type_id: first 20 = {[p['name'] for p in missing_type_p[:20]]}")
if missing_desc_p:
    warn(f"{len(missing_desc_p)} products missing/short description")

ok(f"Products with name: {len(products) - len(missing_name_p)}")
ok(f"Products with slug: {len(products) - len(missing_slug_p)}")
ok(f"Products with URL: {len(products) - len(missing_url_p)}")
ok(f"Products with type_id: {len(products) - len(missing_type_p)}")
ok(f"Products with description: {len(products) - len(missing_desc_p)}")

# Check for duplicate slugs
slug_counts = Counter(p['slug'] for p in products if p.get('slug'))
dupe_slugs = {k:v for k,v in slug_counts.items() if v > 1}
if dupe_slugs:
    error(f"Duplicate slugs ({len(dupe_slugs)}): {list(dupe_slugs.items())[:10]}")
else:
    ok(f"All slugs unique")

# Check for duplicate names
name_counts = Counter(p['name'] for p in products if p.get('name'))
dupe_names = {k:v for k,v in name_counts.items() if v > 1}
if dupe_names:
    warn(f"Duplicate names ({len(dupe_names)}): {list(dupe_names.items())[:10]}")

# Check URLs are valid
bad_urls = []
for p in products:
    url = p.get('url', '')
    if url:
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                bad_urls.append((p['name'], url))
        except:
            bad_urls.append((p['name'], url))
if bad_urls:
    warn(f"{len(bad_urls)} products with invalid URLs: {bad_urls[:10]}")
else:
    ok("All product URLs are valid format")

# Check type_id references valid types
orphan_types = [p for p in products if p.get('type_id') and p['type_id'] not in types_by_id]
if orphan_types:
    error(f"{len(orphan_types)} products reference non-existent type_id: {[(p['name'], p['type_id']) for p in orphan_types[:10]]}")
else:
    ok("All product type_id references are valid")

# ============================================================
# 3. PRODUCT TYPE MAPPINGS (MULTI-TYPE)
# ============================================================
section("3. PRODUCT TYPE MAPPINGS (MULTI-TYPE)")
mappings = fetch_all('product_type_mapping', select='product_id,type_id,is_primary', order='product_id')
info(f"{len(mappings)} mapping records loaded")

# Build multi-type map
product_types_map = defaultdict(list)
for m in mappings:
    product_types_map[m['product_id']].append({
        'type_id': m['type_id'],
        'is_primary': m.get('is_primary', False)
    })

multi_type = {pid: types for pid, types in product_types_map.items() if len(types) > 1}
single_type = {pid: types for pid, types in product_types_map.items() if len(types) == 1}
no_mapping = [p for p in products if p['id'] not in product_types_map]

info(f"Products with mapping: {len(product_types_map)}")
info(f"  Single-type: {len(single_type)}")
info(f"  Multi-type: {len(multi_type)}")
warn(f"  No mapping at all: {len(no_mapping)}")

# Check multi-type products have primary set
multi_no_primary = []
for pid, type_list in multi_type.items():
    has_primary = any(t.get('is_primary') for t in type_list)
    if not has_primary:
        pname = products_by_id.get(pid, {}).get('name', f'ID:{pid}')
        type_names = [types_by_id.get(t['type_id'], {}).get('code', f"?{t['type_id']}") for t in type_list]
        multi_no_primary.append((pname, type_names))

if multi_no_primary:
    warn(f"{len(multi_no_primary)} multi-type products without is_primary set:")
    for name, tnames in multi_no_primary[:20]:
        print(f"      {name}: {tnames}")

# Check mapping references valid types
orphan_mapping_types = [m for m in mappings if m['type_id'] not in types_by_id]
if orphan_mapping_types:
    error(f"{len(orphan_mapping_types)} mappings reference non-existent type_id")

# Check mapping references valid products
orphan_mapping_products = [m for m in mappings if m['product_id'] not in products_by_id]
if orphan_mapping_products:
    error(f"{len(orphan_mapping_products)} mappings reference non-existent product_id")

# Check consistency: product.type_id vs mapping primary type
type_mismatch = []
for p in products:
    pid = p['id']
    ptype = p.get('type_id')
    if pid in product_types_map and ptype:
        mapping_type_ids = [t['type_id'] for t in product_types_map[pid]]
        if ptype not in mapping_type_ids:
            type_mismatch.append((p['name'], ptype, mapping_type_ids))

if type_mismatch:
    warn(f"{len(type_mismatch)} products where type_id not in mapping types:")
    for name, pt, mt in type_mismatch[:15]:
        pt_code = types_by_id.get(pt, {}).get('code', f'?{pt}')
        mt_codes = [types_by_id.get(t, {}).get('code', f'?{t}') for t in mt]
        print(f"      {name}: type_id={pt_code}, mapping={mt_codes}")

# Show multi-type examples
info(f"\nTop 30 multi-type products:")
for pid, type_list in sorted(multi_type.items(), key=lambda x: -len(x[1]))[:30]:
    pname = products_by_id.get(pid, {}).get('name', f'ID:{pid}')
    type_names = [types_by_id.get(t['type_id'], {}).get('code', f"?{t['type_id']}") for t in type_list]
    primary = [types_by_id.get(t['type_id'], {}).get('code', '?') for t in type_list if t.get('is_primary')]
    print(f"    {pname:<30} types={type_names}  primary={primary or 'NONE'}")

# ============================================================
# 4. NORMS
# ============================================================
section("4. NORMS")
norms = fetch_all('norms', select='id,code,pillar,title,description,official_link', order='id')
info(f"{len(norms)} norms loaded")

norms_by_id = {n['id']: n for n in norms}
norms_by_code = {n['code']: n for n in norms}

# Check for missing fields
missing_code_n = [n for n in norms if not n.get('code') or len(str(n.get('code',''))) < 2]
missing_title_n = [n for n in norms if not n.get('title') or len(str(n.get('title',''))) < 3]
missing_pillar_n = [n for n in norms if not n.get('pillar') or n.get('pillar') not in ('S','A','F','E')]
missing_desc_n = [n for n in norms if not n.get('description') or len(str(n.get('description',''))) < 10]
missing_link_n = [n for n in norms if not n.get('official_link') or len(str(n.get('official_link',''))) < 10]

if missing_code_n:
    error(f"{len(missing_code_n)} norms missing code")
if missing_title_n:
    error(f"{len(missing_title_n)} norms missing title")
if missing_pillar_n:
    error(f"{len(missing_pillar_n)} norms missing/invalid pillar")
if missing_desc_n:
    warn(f"{len(missing_desc_n)} norms missing/short description")
if missing_link_n:
    warn(f"{len(missing_link_n)} norms missing official_link")

ok(f"Norms with code: {len(norms) - len(missing_code_n)}")
ok(f"Norms with title: {len(norms) - len(missing_title_n)}")
ok(f"Norms with valid pillar: {len(norms) - len(missing_pillar_n)}")
ok(f"Norms with description: {len(norms) - len(missing_desc_n)}")
ok(f"Norms with official_link: {len(norms) - len(missing_link_n)}")

# Check pillar distribution
pillar_counts = Counter(n.get('pillar', '?') for n in norms)
info(f"Pillar distribution: {dict(sorted(pillar_counts.items()))}")

# Check for duplicate codes
code_counts_n = Counter(n['code'] for n in norms if n.get('code'))
dupe_codes_n = {k:v for k,v in code_counts_n.items() if v > 1}
if dupe_codes_n:
    error(f"Duplicate norm codes ({len(dupe_codes_n)}): {list(dupe_codes_n.items())[:10]}")
else:
    ok("All norm codes unique")

# Check code format consistency
code_patterns = Counter()
for n in norms:
    code = n.get('code', '')
    if re.match(r'^[SAFE]\d+$', code):
        code_patterns['SIMPLE (S01)'] += 1
    elif re.match(r'^[SAFE]-[A-Z]+-\d+$', code):
        code_patterns['COMPOUND (A-CC-001)'] += 1
    elif re.match(r'^[SAFE]-[A-Za-z0-9_-]+$', code):
        code_patterns['TEXT (S-OWASP-MASVS)'] += 1
    else:
        code_patterns[f'OTHER ({code[:20]})'] += 1
info(f"Code format patterns: {dict(code_patterns)}")

# Check official_link validity
bad_norm_links = []
for n in norms:
    link = n.get('official_link', '')
    if link:
        try:
            parsed = urlparse(link)
            if not parsed.scheme or not parsed.netloc:
                bad_norm_links.append((n['code'], link[:60]))
        except:
            bad_norm_links.append((n['code'], link[:60]))
if bad_norm_links:
    warn(f"{len(bad_norm_links)} norms with invalid official_link format: {bad_norm_links[:5]}")
else:
    ok("All norm official_links are valid URL format")

# ============================================================
# 5. NORM APPLICABILITY
# ============================================================
section("5. NORM APPLICABILITY")
applicability = fetch_all('norm_applicability', select='type_id,norm_id,is_applicable', order='type_id')
info(f"{len(applicability)} applicability rules loaded")

# Check orphan references
orphan_app_types = set(a['type_id'] for a in applicability if a['type_id'] not in types_by_id)
orphan_app_norms = set(a['norm_id'] for a in applicability if a['norm_id'] not in norms_by_id)
if orphan_app_types:
    error(f"Applicability references {len(orphan_app_types)} non-existent type_ids: {orphan_app_types}")
if orphan_app_norms:
    error(f"Applicability references {len(orphan_app_norms)} non-existent norm_ids")

# Coverage: how many types have applicability rules?
types_with_rules = set(a['type_id'] for a in applicability)
types_without_rules = [t for t in types if t['id'] not in types_with_rules]
info(f"Types with applicability rules: {len(types_with_rules)} / {len(types)}")
if types_without_rules:
    warn(f"{len(types_without_rules)} types without ANY applicability rules: {[t['code'] for t in types_without_rules]}")

# Applicable vs not applicable
applicable_true = sum(1 for a in applicability if a.get('is_applicable') == True)
applicable_false = sum(1 for a in applicability if a.get('is_applicable') == False)
info(f"Applicable=TRUE: {applicable_true}, Applicable=FALSE: {applicable_false}")

# ============================================================
# 6. EVALUATIONS
# ============================================================
section("6. EVALUATIONS")
evals = fetch_all('evaluations', select='id,product_id,norm_id,result,evaluated_by', order='id')
info(f"{len(evals)} evaluations loaded")

# Result distribution
result_counts = Counter(e.get('result', 'NULL') for e in evals)
info(f"Result distribution: {dict(sorted(result_counts.items()))}")

# Evaluated_by distribution
by_counts = Counter(e.get('evaluated_by', 'NULL') for e in evals)
info(f"Evaluated_by distribution: {dict(sorted(by_counts.items()))}")

# Products evaluated
evaluated_products = set(e['product_id'] for e in evals)
info(f"Products with evaluations: {len(evaluated_products)} / {len(products)}")

# Check for orphans
orphan_eval_products = evaluated_products - set(products_by_id.keys())
orphan_eval_norms = set(e['norm_id'] for e in evals) - set(norms_by_id.keys())
if orphan_eval_products:
    error(f"{len(orphan_eval_products)} evaluations reference deleted products")
if orphan_eval_norms:
    error(f"{len(orphan_eval_norms)} evaluations reference deleted norms")

# ============================================================
# 7. SCORES (safe_scoring_results)
# ============================================================
section("7. SCORES (safe_scoring_results)")
scores = fetch_all('safe_scoring_results', select='product_id,note_finale,score_s,score_a,score_f,score_e,note_consumer,note_essential', order='product_id')
info(f"{len(scores)} score records loaded")

scores_by_pid = {s['product_id']: s for s in scores}

# Products with scores vs without
products_with_scores = set(s['product_id'] for s in scores)
products_without_scores = [p for p in products if p['id'] not in products_with_scores]
info(f"Products with scores: {len(products_with_scores)}")
info(f"Products without scores: {len(products_without_scores)}")

# Score distribution
safe_scores = [s['note_finale'] for s in scores if s.get('note_finale') is not None]
if safe_scores:
    info(f"SAFE Score range: {min(safe_scores):.1f}% - {max(safe_scores):.1f}%")
    info(f"SAFE Score average: {sum(safe_scores)/len(safe_scores):.1f}%")

# Products with score but no evaluations
scored_no_eval = products_with_scores - evaluated_products
if scored_no_eval:
    warn(f"{len(scored_no_eval)} products have scores but NO evaluations (stale scores)")

# ============================================================
# 8. PRODUCT NARRATIVES
# ============================================================
section("8. PRODUCT NARRATIVES")
narratives = fetch_all('product_pillar_narratives', select='product_id,pillar,narrative_summary,key_strengths,key_weaknesses,risk_level,pillar_score,generated_at', order='product_id')
info(f"{len(narratives)} narrative records loaded")

# Check quality
narrative_by_product = defaultdict(list)
for n in narratives:
    narrative_by_product[n['product_id']].append(n)
short_narratives = [n for n in narratives if not n.get('narrative_summary') or len(str(n.get('narrative_summary', ''))) < 50]
if short_narratives:
    warn(f"{len(short_narratives)} pillar narratives are missing/very short")
ok(f"Pillar narratives with content: {len(narratives) - len(short_narratives)}")
info(f"Products with narratives: {len(narrative_by_product)}")

# Pillar distribution
narrative_pillar_counts = Counter(n.get('pillar', '?') for n in narratives)
info(f"Narrative pillar distribution: {dict(sorted(narrative_pillar_counts.items()))}")

# ============================================================
# 9. SCORING DEFINITIONS
# ============================================================
section("9. SCORING DEFINITIONS (safe_scoring_definitions)")
definitions = fetch_all('safe_scoring_definitions', select='norm_id,is_essential,is_consumer,is_full', order='norm_id')
info(f"{len(definitions)} definition records loaded")

essential_count = sum(1 for d in definitions if d.get('is_essential'))
consumer_count = sum(1 for d in definitions if d.get('is_consumer'))
full_count = sum(1 for d in definitions if d.get('is_full'))
info(f"Essential: {essential_count}, Consumer: {consumer_count}, Full: {full_count}")

# Norms without definitions
defined_norm_ids = set(d['norm_id'] for d in definitions)
undefined_norms = [n for n in norms if n['id'] not in defined_norm_ids]
if undefined_norms:
    warn(f"{len(undefined_norms)} norms without scoring definitions")

# ============================================================
# 10. PRODUCT STRATEGIES / OTHER TABLES
# ============================================================
section("10. OTHER TABLES CHECK")
for tbl in ['product_strategies', 'score_history', 'product_chart_data', 'evaluation_votes']:
    try:
        data = fetch_all(tbl, select='*', page_size=1)
        info(f"{tbl}: accessible (sample={len(data)} rows)")
    except Exception as e:
        warn(f"{tbl}: {e}")

# ============================================================
# FINAL SUMMARY
# ============================================================
section("FINAL SUMMARY")
print(f"""
  TABLES:
    Product Types:     {len(types):>6}
    Products:          {len(products):>6}
    Type Mappings:     {len(mappings):>6}  (multi-type: {len(multi_type)})
    Norms:             {len(norms):>6}  (S:{pillar_counts.get('S',0)} A:{pillar_counts.get('A',0)} F:{pillar_counts.get('F',0)} E:{pillar_counts.get('E',0)})
    Applicability:     {len(applicability):>6}
    Evaluations:       {len(evals):>6}
    Scores:            {len(scores):>6}
    Narratives:        {len(narratives):>6}
    Definitions:       {len(definitions):>6}

  COVERAGE:
    Products with type_id:     {len(products) - len(missing_type_p):>6} / {len(products)}
    Products with URL:         {len(products) - len(missing_url_p):>6} / {len(products)}
    Products with description: {len(products) - len(missing_desc_p):>6} / {len(products)}
    Products with mapping:     {len(product_types_map):>6} / {len(products)}
    Products multi-type:       {len(multi_type):>6}
    Products evaluated:        {len(evaluated_products):>6} / {len(products)}
    Products scored:           {len(products_with_scores):>6} / {len(products)}
    Pillar Narratives:     {len(narratives):>6}  (for {len(narrative_by_product)} products)
    Norms with definitions:    {len(defined_norm_ids):>6} / {len(norms)}
    Types with applicability:  {len(types_with_rules):>6} / {len(types)}
""")

print("AUDIT COMPLETE")
