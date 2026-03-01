#!/usr/bin/env python3
"""Scope analysis for data enrichment tasks."""
import sys, os, requests, json
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
        if r.status_code != 200: break
        data = r.json()
        if not data: break
        all_records.extend(data)
        if len(data) < page_size: break
        offset += page_size
    return all_records

print("Loading data...")
products = fetch_all('products',
    select='id,name,slug,url,description,type_id,coingecko_id,defillama_slug,github_repo,social_links,logo_url,country_origin,headquarters,fees_breakdown,price_details,media,screenshots,verified',
    order='id',
    filters={'deleted_at': 'is.null'})

norms = fetch_all('norms',
    select='id,code,pillar,title,description,official_link,official_doc_summary,hallucination_checked,hallucination_score,summary_status',
    order='id')

evals = fetch_all('evaluations', select='product_id', order='product_id')
eval_pids = set(e['product_id'] for e in evals)

types = fetch_all('product_types', select='id,code,name', order='id')
types_by_id = {t['id']: t for t in types}

print(f"  {len(products)} active products, {len(norms)} norms, {len(eval_pids)} products with evals")

# ============================================================
# 1. PRODUCTS MISSING DESCRIPTION - DETAILED ANALYSIS
# ============================================================
print(f"\n{'='*70}")
print("1. PRODUCTS MISSING DESCRIPTION")
print(f"{'='*70}")

no_desc = [p for p in products if not p.get('description') or len(str(p.get('description',''))) < 10]
has_desc = [p for p in products if p.get('description') and len(str(p.get('description',''))) >= 10]

print(f"  Without description (or <10 chars): {len(no_desc)}")
print(f"  With description: {len(has_desc)}")

# What other data do they have?
def data_completeness(prods, label):
    print(f"\n  --- {label} ({len(prods)} products) ---")
    checks = {
        'url': lambda p: bool(p.get('url')),
        'description': lambda p: bool(p.get('description')) and len(str(p.get('description',''))) >= 10,
        'coingecko_id': lambda p: bool(p.get('coingecko_id')),
        'defillama_slug': lambda p: bool(p.get('defillama_slug')),
        'github_repo': lambda p: bool(p.get('github_repo')),
        'social_links': lambda p: bool(p.get('social_links')),
        'logo_url': lambda p: bool(p.get('logo_url')),
        'country_origin': lambda p: bool(p.get('country_origin')),
        'headquarters': lambda p: bool(p.get('headquarters')),
        'fees_breakdown': lambda p: bool(p.get('fees_breakdown')),
        'price_details': lambda p: bool(p.get('price_details')),
        'media': lambda p: bool(p.get('media')),
        'screenshots': lambda p: bool(p.get('screenshots')),
        'verified': lambda p: p.get('verified') == True,
    }
    for field, check in checks.items():
        count = sum(1 for p in prods if check(p))
        pct = count / len(prods) * 100 if prods else 0
        bar = '#' * int(pct / 5)
        print(f"    {field:<20}: {count:>5}/{len(prods)} ({pct:5.1f}%) {bar}")

data_completeness(no_desc, "Products WITHOUT description")
data_completeness(has_desc, "Products WITH description")

# Type distribution of no-desc products
print(f"\n  No-description products by type:")
type_dist = Counter()
for p in no_desc:
    code = types_by_id.get(p.get('type_id'), {}).get('code', 'NO_TYPE')
    type_dist[code] += 1
for code, count in type_dist.most_common(20):
    print(f"    {code:<25}: {count}")

# Have URL?
no_desc_no_url = [p for p in no_desc if not p.get('url')]
print(f"\n  No-desc products without URL: {len(no_desc_no_url)}")
if no_desc_no_url:
    for p in no_desc_no_url[:10]:
        print(f"    {p['name']} (id={p['id']})")

# ============================================================
# 2. PRODUCTS NOT EVALUATED - WHAT DATA DO THEY HAVE?
# ============================================================
print(f"\n{'='*70}")
print("2. PRODUCTS NOT EVALUATED (no evaluations at all)")
print(f"{'='*70}")

not_evaluated = [p for p in products if p['id'] not in eval_pids]
evaluated = [p for p in products if p['id'] in eval_pids]

print(f"  Not evaluated: {len(not_evaluated)}")
print(f"  Evaluated: {len(evaluated)}")

data_completeness(not_evaluated, "Products NOT evaluated")
data_completeness(evaluated, "Products evaluated")

# Overlap: no-desc AND not-evaluated
no_desc_ids = set(p['id'] for p in no_desc)
not_eval_ids = set(p['id'] for p in not_evaluated)
overlap = no_desc_ids & not_eval_ids
only_no_desc = no_desc_ids - not_eval_ids
only_not_eval = not_eval_ids - no_desc_ids

print(f"\n  Overlap analysis:")
print(f"    No desc AND not evaluated: {len(overlap)}")
print(f"    No desc BUT evaluated:     {len(only_no_desc)}")
print(f"    Has desc BUT not evaluated: {len(only_not_eval)}")

# ============================================================
# 3. NORMS - SUMMARY & OFFICIAL LINK STATUS
# ============================================================
print(f"\n{'='*70}")
print("3. NORMS: SUMMARIES & OFFICIAL DATA STATUS")
print(f"{'='*70}")

print(f"  Total norms: {len(norms)}")

# Official link status
has_link = [n for n in norms if n.get('official_link') and n['official_link'] != 'null']
no_link = [n for n in norms if not n.get('official_link') or n['official_link'] == 'null']
print(f"  With official_link: {len(has_link)}")
print(f"  Without official_link: {len(no_link)}")

# Summary status
has_summary = [n for n in norms if n.get('official_doc_summary') and len(str(n.get('official_doc_summary',''))) > 20]
no_summary = [n for n in norms if not n.get('official_doc_summary') or len(str(n.get('official_doc_summary',''))) <= 20]
print(f"  With official_doc_summary (>20ch): {len(has_summary)}")
print(f"  Without summary: {len(no_summary)}")

# Description status  
has_norm_desc = [n for n in norms if n.get('description') and len(str(n.get('description',''))) > 10]
print(f"  With description (>10ch): {len(has_norm_desc)}")

# Hallucination check
checked = [n for n in norms if n.get('hallucination_checked')]
unchecked = [n for n in norms if not n.get('hallucination_checked')]
print(f"  Hallucination checked: {len(checked)}")
print(f"  Not checked: {len(unchecked)}")

# summary_status distribution
statuses = Counter(n.get('summary_status', 'NULL') for n in norms)
print(f"  Summary status distribution: {dict(sorted(statuses.items()))}")

# Pillar breakdown of norms without links
print(f"\n  Norms WITHOUT official_link by pillar:")
pillar_dist = Counter(n.get('pillar', '?') for n in no_link)
for pillar, count in sorted(pillar_dist.items()):
    print(f"    {pillar}: {count}")

# Sample norms without links
print(f"\n  Sample norms WITHOUT official_link:")
for n in no_link[:15]:
    print(f"    {n['code']:<12} {n['pillar']:<3} {n['title'][:60]}")

# Link patterns for those that have links
print(f"\n  Official link domain distribution (top 15):")
from urllib.parse import urlparse
domains = Counter()
for n in has_link:
    try:
        d = urlparse(n['official_link']).netloc
        if d: domains[d] += 1
    except:
        pass
for domain, count in domains.most_common(15):
    print(f"    {domain:<40}: {count}")

print("\n\nSCOPE ANALYSIS COMPLETE")
