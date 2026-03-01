#!/usr/bin/env python3
"""Full data gap audit for products AND norms."""
import os, sys, requests, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_KEY

KEY = SUPABASE_SERVICE_KEY or SUPABASE_KEY
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}

def fetch_all(table, select, extra_params=''):
    rows, offset = [], 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit=1000&offset={offset}"
        if extra_params:
            url += f"&{extra_params}"
        r = requests.get(url, headers=H, timeout=60)
        if r.status_code != 200:
            print(f"  FETCH ERROR {table}: {r.status_code} {r.text[:200]}")
            break
        d = r.json()
        if not d: break
        rows.extend(d)
        if len(d) < 1000: break
        offset += 1000
    return rows

print("="*70)
print("FULL DATA GAP AUDIT - PRODUCTS & NORMS")
print("="*70)

# ── PRODUCTS ──
print("\n--- PRODUCTS ---")
products = fetch_all('products', 
    'id,name,slug,url,description,short_description,type_id,coingecko_id,defillama_slug,logo_url,github_repo,social_links,safe_score,score_s,score_a,score_f,score_e',
    'deleted_at=is.null')
print(f"Total active products: {len(products)}")

no_url = [p for p in products if not p.get('url') or len(str(p.get('url','')).strip()) < 5]
no_desc = [p for p in products if not p.get('description') or len(str(p.get('description',''))) < 15]
no_short = [p for p in products if not p.get('short_description') or len(str(p.get('short_description',''))) < 10]
no_type = [p for p in products if not p.get('type_id')]
no_slug = [p for p in products if not p.get('slug')]
no_logo = [p for p in products if not p.get('logo_url')]
no_github = [p for p in products if not p.get('github_repo')]
no_social = [p for p in products if not p.get('social_links')]
no_score = [p for p in products if p.get('safe_score') is None]

print(f"  Missing url:              {len(no_url):>5}")
print(f"  Missing description:      {len(no_desc):>5}")
print(f"  Missing short_description:{len(no_short):>5}")
print(f"  Missing type_id:          {len(no_type):>5}")
print(f"  Missing slug:             {len(no_slug):>5}")
print(f"  Missing logo_url:         {len(no_logo):>5}")
print(f"  Missing github_repo:      {len(no_github):>5}")
print(f"  Missing social_links:     {len(no_social):>5}")
print(f"  Missing safe_score:       {len(no_score):>5}")

if no_url:
    print(f"\n  Products without URL:")
    for p in no_url[:30]:
        print(f"    - {p['name']} (id={p['id']}, slug={p.get('slug','?')})")

if no_type:
    print(f"\n  Products without type_id:")
    for p in no_type[:30]:
        print(f"    - {p['name']} (id={p['id']})")

# ── PRODUCT TYPE MAPPINGS ──
print("\n--- PRODUCT TYPE MAPPINGS ---")
mappings = fetch_all('product_type_mapping', 'product_id,type_id,is_primary')
mapped_pids = set(m['product_id'] for m in mappings)
unmapped = [p for p in products if p['id'] not in mapped_pids]
print(f"  Total mappings: {len(mappings)}")
print(f"  Products without mapping: {len(unmapped)}")

# ── NORMS ──
print("\n--- NORMS ---")
norms = fetch_all('norms', 
    'id,code,pillar,title,description,full,official_link,official_doc_summary,official_content,is_essential,consumer,hallucination_checked,hallucination_score,chapter,target_type,summary,summary_status,norm_status')
print(f"Total norms: {len(norms)}")

no_title = [n for n in norms if not n.get('title') or len(str(n.get('title',''))) < 3]
no_ndesc = [n for n in norms if not n.get('description') or len(str(n.get('description',''))) < 10]
no_full = [n for n in norms if not n.get('full') or len(str(n.get('full',''))) < 10]
no_pillar = [n for n in norms if not n.get('pillar')]
no_code = [n for n in norms if not n.get('code')]
no_link = [n for n in norms if not n.get('official_link') or len(str(n.get('official_link','')).strip()) < 5]
no_summary = [n for n in norms if not n.get('official_doc_summary') or len(str(n.get('official_doc_summary',''))) < 10]
has_link_no_summary = [n for n in norms if n.get('official_link') and len(str(n.get('official_link','')).strip()) >= 5 
                       and (not n.get('official_doc_summary') or len(str(n.get('official_doc_summary',''))) < 10)]
no_essential = [n for n in norms if n.get('is_essential') is None]
no_chapter = [n for n in norms if not n.get('chapter')]
no_target = [n for n in norms if not n.get('target_type')]
no_consumer = [n for n in norms if n.get('consumer') is None]
not_hallucination_checked = [n for n in norms if not n.get('hallucination_checked')]
no_official_content = [n for n in norms if not n.get('official_content') or len(str(n.get('official_content',''))) < 10]
no_norm_status = [n for n in norms if not n.get('norm_status')]

print(f"  Missing code:                {len(no_code):>5}")
print(f"  Missing pillar:              {len(no_pillar):>5}")
print(f"  Missing title:               {len(no_title):>5}")
print(f"  Missing description:         {len(no_ndesc):>5}")
print(f"  Missing full text:           {len(no_full):>5}")
print(f"  Missing official_link:       {len(no_link):>5}")
print(f"  Missing official_doc_summary:{len(no_summary):>5}")
print(f"  Has link but no summary:     {len(has_link_no_summary):>5}")
print(f"  is_essential not set:         {len(no_essential):>5}")
print(f"  Missing chapter:             {len(no_chapter):>5}")
print(f"  Missing target_type:         {len(no_target):>5}")
print(f"  consumer not set:            {len(no_consumer):>5}")
print(f"  Missing official_content:    {len(no_official_content):>5}")
print(f"  Missing norm_status:         {len(no_norm_status):>5}")
print(f"  Not hallucination_checked:   {len(not_hallucination_checked):>5}")

# Pillar distribution
from collections import Counter
pillar_counts = Counter(n.get('pillar','?') for n in norms)
print(f"\n  Norms by pillar: {dict(pillar_counts)}")

essential_counts = Counter()
for n in norms:
    if n.get('is_essential'):
        essential_counts[n.get('pillar','?')] += 1
print(f"  Essential norms by pillar: {dict(essential_counts)}")

if no_ndesc:
    print(f"\n  Sample norms without description:")
    for n in no_ndesc[:10]:
        print(f"    - {n.get('code','?')}: {n.get('title','?')[:60]} (pillar={n.get('pillar','?')})")

if has_link_no_summary:
    print(f"\n  Sample norms with link but no summary:")
    for n in has_link_no_summary[:10]:
        print(f"    - {n.get('code','?')}: {n.get('title','?')[:50]} | link={str(n.get('official_link',''))[:50]}")

# ── NORM APPLICABILITY ──
print("\n--- NORM APPLICABILITY ---")
types = fetch_all('product_types', 'id,name,code')
applicability = fetch_all('norm_applicability', 'type_id,norm_id,is_applicable', '')
print(f"  Total rules: {len(applicability)}")
print(f"  Product types: {len(types)}")
expected = len(types) * len(norms)
print(f"  Expected (types x norms): {expected}")
print(f"  Coverage: {len(applicability)}/{expected} ({len(applicability)*100//expected if expected else 0}%)")

# Check types without any applicability
type_ids_with_rules = set(a['type_id'] for a in applicability)
types_without = [t for t in types if t['id'] not in type_ids_with_rules]
if types_without:
    print(f"  Types WITHOUT applicability rules: {len(types_without)}")
    for t in types_without[:10]:
        print(f"    - {t.get('code','?')}: {t.get('name','?')}")

# ── EVALUATIONS ──
print("\n--- EVALUATIONS ---")
eval_pids = set()
offset = 0
total_evals = 0
while True:
    r = requests.get(f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id&limit=1000&offset={offset}", headers=H, timeout=60)
    if r.status_code != 200: break
    d = r.json()
    if not d: break
    for e in d: eval_pids.add(e['product_id'])
    total_evals += len(d)
    if len(d) < 1000: break
    offset += 1000

active_pids = set(p['id'] for p in products)
evaluated = active_pids & eval_pids
not_evaluated = active_pids - eval_pids
with_desc_not_eval = [p for p in products if p['id'] in not_evaluated and p.get('description') and len(str(p.get('description',''))) >= 15]

print(f"  Total evaluations: {total_evals}")
print(f"  Products evaluated: {len(evaluated)}/{len(products)}")
print(f"  Products NOT evaluated: {len(not_evaluated)}")
print(f"  With description but not evaluated: {len(with_desc_not_eval)}")

# ── SCORING RESULTS ──
print("\n--- SCORING ---")
scores = fetch_all('safe_scoring_results', 'product_id,total_score')
scored_pids = set(s['product_id'] for s in scores if s.get('total_score') is not None)
print(f"  Products scored: {len(scored_pids)}/{len(products)}")

print(f"\n{'='*70}")
print("AUDIT COMPLETE")
print(f"{'='*70}")
