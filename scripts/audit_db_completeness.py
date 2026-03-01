"""
Full database completeness audit for products and norms.
Checks EVERY critical field and reports exact gaps.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

HEADERS = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
}

def fetch_all(table, select='*', extra='', order='id.asc'):
    """Fetch all records with pagination."""
    all_rows = []
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={limit}&order={order}"
        if extra:
            url += f"&{extra}"
        r = requests.get(url, headers={**HEADERS, 'Prefer': 'return=representation'}, timeout=30)
        if r.status_code != 200:
            print(f"  FETCH ERROR {table}: {r.status_code} {r.text[:200]}")
            break
        rows = r.json()
        if not isinstance(rows, list) or not rows:
            break
        all_rows.extend(rows)
        if len(rows) < limit:
            break
        offset += limit
    return all_rows

def check_field(rows, field, label=None):
    """Check how many rows have empty/null values for a field."""
    label = label or field
    missing = [r for r in rows if not r.get(field) or (isinstance(r.get(field), str) and r.get(field).strip() == '')]
    return missing

print("=" * 70)
print("FULL DATABASE COMPLETENESS AUDIT")
print("=" * 70)

# ============================================================
# PRODUCTS
# ============================================================
print("\n" + "=" * 70)
print("PRODUCTS")
print("=" * 70)

products = fetch_all('products', 
    'id,name,slug,url,description,short_description,logo_url,type_id,coingecko_id,defillama_slug,deleted_at',
    'deleted_at=is.null')

print(f"\nTotal active products: {len(products)}")

# Critical fields
fields_to_check = [
    ('name', 'name'),
    ('slug', 'slug'),
    ('url', 'url'),
    ('description', 'description'),
    ('short_description', 'short_description'),
    ('logo_url', 'logo_url'),
    ('type_id', 'type_id'),
]

for field, label in fields_to_check:
    missing = check_field(products, field, label)
    pct = len(missing) / len(products) * 100 if products else 0
    status = "OK" if len(missing) == 0 else f"MISSING {len(missing)} ({pct:.1f}%)"
    print(f"  {label:25s}: {status}")
    if 0 < len(missing) <= 20:
        for p in missing:
            print(f"    - id={p['id']} {p.get('name', '?')}")

# Check description quality (too short)
short_descs = [p for p in products if p.get('description') and len(p['description'].strip()) < 50]
if short_descs:
    print(f"\n  description < 50 chars   : {len(short_descs)} products")
    if len(short_descs) <= 10:
        for p in short_descs:
            print(f"    - id={p['id']} {p.get('name', '?')}: '{p['description'][:60]}'")

# Check for products without product_type_mapping
print("\n  Checking product_type_mapping coverage...")
mappings = fetch_all('product_type_mapping', 'product_id,type_id,is_primary', 'is_primary=eq.true')
mapped_ids = {m['product_id'] for m in mappings}
unmapped = [p for p in products if p['id'] not in mapped_ids]
print(f"  product_type_mapping     : {'OK' if not unmapped else f'MISSING {len(unmapped)}'}")
if 0 < len(unmapped) <= 10:
    for p in unmapped:
        print(f"    - id={p['id']} {p.get('name', '?')}")

# Check coingecko_id and defillama_slug (informational, not critical for all)
cg_count = len([p for p in products if p.get('coingecko_id')])
dl_count = len([p for p in products if p.get('defillama_slug')])
print(f"\n  coingecko_id populated   : {cg_count}/{len(products)}")
print(f"  defillama_slug populated : {dl_count}/{len(products)}")

# ============================================================
# NORMS
# ============================================================
print("\n" + "=" * 70)
print("NORMS")
print("=" * 70)

norms = fetch_all('norms',
    'id,code,title,pillar,chapter,description,official_link,official_content,full,is_essential,consumer,hallucination_checked,summary,summary_status')

print(f"\nTotal norms: {len(norms)}")

norm_fields = [
    ('code', 'code'),
    ('title', 'title'),
    ('pillar', 'pillar'),
    ('chapter', 'chapter'),
    ('description', 'description'),
    ('official_link', 'official_link'),
    ('official_content', 'official_content'),
    ('summary', 'summary'),
]

for field, label in norm_fields:
    missing = check_field(norms, field, label)
    pct = len(missing) / len(norms) * 100 if norms else 0
    status = "OK" if len(missing) == 0 else f"MISSING {len(missing)} ({pct:.1f}%)"
    print(f"  {label:25s}: {status}")
    if field in ('code', 'title', 'pillar', 'official_link') and 0 < len(missing) <= 10:
        for n in missing:
            print(f"    - id={n['id']} {n.get('code', '?')}: {n.get('title', '?')}")

# Boolean fields
full_none = [n for n in norms if n.get('full') is None]
essential_none = [n for n in norms if n.get('is_essential') is None]
consumer_none = [n for n in norms if n.get('consumer') is None]
print(f"\n  full is NULL             : {len(full_none)}")
print(f"  is_essential is NULL     : {len(essential_none)}")
print(f"  consumer is NULL         : {len(consumer_none)}")

# Hallucination check status
checked = len([n for n in norms if n.get('hallucination_checked')])
print(f"\n  hallucination_checked    : {checked}/{len(norms)} ({checked/len(norms)*100:.1f}%)")

# Pillar distribution
pillars = {}
for n in norms:
    p = n.get('pillar', 'NULL')
    pillars[p] = pillars.get(p, 0) + 1
print(f"\n  Pillar distribution:")
for p in sorted(pillars.keys()):
    print(f"    {p}: {pillars[p]}")

# Chapter distribution
chapters = {}
for n in norms:
    c = n.get('chapter') or 'NULL'
    chapters[c] = chapters.get(c, 0) + 1
print(f"\n  Chapter coverage: {len(norms) - chapters.get('NULL', 0)}/{len(norms)} have chapters")
if chapters.get('NULL', 0) > 0:
    print(f"  Missing chapters: {chapters.get('NULL', 0)}")

# Official content quality
has_content = [n for n in norms if n.get('official_content') and len(n['official_content'].strip()) > 50]
print(f"\n  official_content > 50ch  : {len(has_content)}/{len(norms)}")

# ============================================================
# EVALUATIONS & SCORING
# ============================================================
print("\n" + "=" * 70)
print("EVALUATIONS & SCORING")
print("=" * 70)

def count_query(table, extra=''):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=id"
    if extra: url += f"&{extra}"
    r = requests.head(url, headers={**HEADERS, 'Prefer': 'count=exact'}, timeout=30)
    return int(r.headers.get('content-range', '*/0').split('/')[-1])

# Get distinct product_ids with smart_ai evaluations
smart_eval_products = fetch_all('evaluations', 'product_id', 'evaluated_by=eq.smart_ai')
smart_product_ids = set(e['product_id'] for e in smart_eval_products)

total_evals = count_query('evaluations')
smart_evals_count = count_query('evaluations', 'evaluated_by=eq.smart_ai')

print(f"\n  Total evaluations        : {total_evals}")
print(f"  smart_ai evaluations     : {smart_evals_count}")
print(f"  Products with smart eval : {len(smart_product_ids)}")
print(f"  Products needing eval    : {len(products) - len(smart_product_ids)}")

# Scores
scores = fetch_all('safe_scoring_results', 'product_id,note_finale', '')
scored_ids = set(s['product_id'] for s in scores)
print(f"\n  Products with scores     : {len(scored_ids)}")
print(f"  Products without scores  : {len(products) - len(scored_ids)}")

# Products with description but no smart eval (ready for evaluation)
ready_for_eval = [p for p in products if p.get('description') and p['id'] not in smart_product_ids]
print(f"\n  Ready for eval (desc+no smart eval): {len(ready_for_eval)}")

# ============================================================
# NORM APPLICABILITY
# ============================================================
print("\n" + "=" * 70)
print("NORM APPLICABILITY")
print("=" * 70)

applicability = fetch_all('norm_applicability', 'norm_id,type_id,is_applicable', '', order='norm_id.asc')
print(f"\n  Total applicability rows : {len(applicability)}")

# Check product types
types = fetch_all('product_types', 'id,name,slug', '')
print(f"  Product types            : {len(types)}")

types_with_app = set(a['type_id'] for a in applicability)
types_without = [t for t in types if t['id'] not in types_with_app]
print(f"  Types with applicability : {len(types_with_app)}")
if types_without:
    print(f"  Types WITHOUT applicability: {len(types_without)}")
    for t in types_without[:10]:
        print(f"    - id={t['id']} {t.get('name', '?')}")

# Applicable vs N/A breakdown
applicable = [a for a in applicability if a.get('is_applicable') == True]
not_applicable = [a for a in applicability if a.get('is_applicable') == False]
print(f"\n  Applicable (YES)         : {len(applicable)}")
print(f"  Not applicable (NO)      : {len(not_applicable)}")
print(f"  Other/NULL               : {len(applicability) - len(applicable) - len(not_applicable)}")

# ============================================================
# SCORING DEFINITIONS
# ============================================================
print("\n" + "=" * 70)
print("SCORING DEFINITIONS")  
print("=" * 70)

defs = fetch_all('safe_scoring_definitions', 'id,norm_id,is_full,is_essential,is_consumer', '')
print(f"\n  Total scoring definitions: {len(defs)}")
norms_with_def = set(d['norm_id'] for d in defs)
norms_without_def = [n for n in norms if n['id'] not in norms_with_def]
print(f"  Norms with definition    : {len(norms_with_def)}")
print(f"  Norms WITHOUT definition : {len(norms_without_def)}")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 70)
print("SUMMARY - BLOCKING ISSUES FOR EVALUATION")
print("=" * 70)

blocking = []
missing_desc = check_field(products, 'description')
missing_url = check_field(products, 'url')
missing_chapter = check_field(norms, 'chapter')

if missing_desc:
    blocking.append(f"  - {len(missing_desc)} products missing description")
if missing_url:
    blocking.append(f"  - {len(missing_url)} products missing URL")
if norms_without_def:
    blocking.append(f"  - {len(norms_without_def)} norms without scoring definition")
if types_without:
    blocking.append(f"  - {len(types_without)} product types without norm applicability")

print("\nBLOCKING for evaluation:")
if blocking:
    for b in blocking:
        print(b)
else:
    print("  NONE - Ready to evaluate!")

print("\nNON-BLOCKING (nice to have):")
missing_short = check_field(products, 'short_description')
missing_logo = check_field(products, 'logo_url')
missing_content = check_field(norms, 'official_content')

if missing_short:
    print(f"  - {len(missing_short)} products missing short_description")
if missing_logo:
    print(f"  - {len(missing_logo)} products missing logo_url")
if missing_content:
    print(f"  - {len(missing_content)} norms missing official_content")
if missing_chapter:
    print(f"  - {len(missing_chapter)} norms missing chapter")

print(f"\n  Hallucination check: {checked}/{len(norms)} norms checked")
print(f"  Products ready for eval: {len(ready_for_eval)}")
print("\nDone.")
