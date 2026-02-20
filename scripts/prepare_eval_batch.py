#!/usr/bin/env python3
"""
PREPARE EVALUATION BATCH FOR CLAUDE OPUS ANALYSIS
=================================================
Prepares product-norm pairs for Claude Opus to evaluate directly.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

from core.config import SUPABASE_URL, get_supabase_headers
import requests
import json

READ_HEADERS = get_supabase_headers()


def load_all_data():
    """Load all required data."""
    print("Loading data...", flush=True)

    # Products with type
    products = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,url,description&type_id=not.is.null&order=name&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        products.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    print(f"  {len(products)} products", flush=True)

    # Types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*', headers=READ_HEADERS, timeout=30)
    types = {t['id']: t for t in (r.json() if r.status_code == 200 else [])}
    print(f"  {len(types)} types", flush=True)

    # Norms
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        norms.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    norms_dict = {n['id']: n for n in norms}
    print(f"  {len(norms_dict)} norms", flush=True)

    # Applicabilities (LOAD ALL with proper pagination - Supabase limit is 1000)
    applicabilities = {}
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id&is_applicable=eq.true&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=120
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        for a in data:
            tid = a['type_id']
            if tid not in applicabilities:
                applicabilities[tid] = []
            applicabilities[tid].append(a['norm_id'])
        offset += len(data)
        if offset % 10000 == 0:
            print(f"    Loaded {offset} applicabilities...", flush=True)
        if len(data) < 1000:
            break
    total_app = sum(len(v) for v in applicabilities.values())
    print(f"  {total_app} applicable norms across {len(applicabilities)} types", flush=True)

    # Already evaluated
    evaluated = {}  # product_id -> set of norm_ids
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id,norm_id&limit=10000&offset={offset}',
            headers=READ_HEADERS, timeout=120
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        for e in data:
            pid = e['product_id']
            if pid not in evaluated:
                evaluated[pid] = set()
            evaluated[pid].add(e['norm_id'])
        offset += len(data)
        if len(data) < 10000:
            break
    print(f"  {sum(len(v) for v in evaluated.values())} existing evaluations for {len(evaluated)} products", flush=True)

    return products, types, norms_dict, applicabilities, evaluated


def main():
    print("=" * 70, flush=True)
    print("  PREPARE EVALUATION BATCH", flush=True)
    print("=" * 70, flush=True)

    products, types, norms_dict, applicabilities, evaluated = load_all_data()

    # Find products that need evaluation
    to_evaluate = []
    for product in products:
        type_id = product.get('type_id')
        if not type_id:
            continue

        applicable_norm_ids = applicabilities.get(type_id, [])
        if not applicable_norm_ids:
            continue

        # Check which norms still need evaluation
        already_done = evaluated.get(product['id'], set())
        needed = [nid for nid in applicable_norm_ids if nid not in already_done]

        if needed:
            to_evaluate.append({
                'product': product,
                'type': types.get(type_id, {}),
                'norm_ids': needed[:50]  # Limit to 50 per product for batch
            })

    print(f"\n{len(to_evaluate)} products need evaluation", flush=True)

    # Output first 5 products for immediate analysis
    print("\n" + "=" * 70)
    print("  PRODUCTS TO EVALUATE (first 5)")
    print("=" * 70)

    for i, item in enumerate(to_evaluate[:5]):
        product = item['product']
        ptype = item['type']
        norm_ids = item['norm_ids']

        norms_list = [norms_dict.get(nid) for nid in norm_ids if nid in norms_dict]
        norms_list = [n for n in norms_list if n]

        product_name = product['name'].encode('ascii', 'ignore').decode('ascii')
        print(f"\n### Product {i+1}: {product_name}")
        print(f"Type: {ptype.get('name', 'Unknown')}")
        print(f"URL: {product.get('url', 'N/A')}")
        print(f"Description: {(product.get('description') or '')[:200]}")
        print(f"\nApplicable Norms ({len(norms_list)}):")
        for j, norm in enumerate(norms_list[:20], 1):
            print(f"  {j}. [{norm.get('pillar', '?')}] {norm.get('code', '')}: {norm.get('title', '')[:60]}")
        if len(norms_list) > 20:
            print(f"  ... and {len(norms_list) - 20} more norms")

    print("\n" + "=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    print(f"Total products to evaluate: {len(to_evaluate)}")
    print(f"Total evaluations needed: {sum(len(item['norm_ids']) for item in to_evaluate)}")


if __name__ == "__main__":
    main()
