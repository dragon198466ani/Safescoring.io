#!/usr/bin/env python3
"""
SAFESCORING - Direct Claude Evaluation Script
==============================================
Generates evaluation prompts for Claude Code to process.
Saves results directly to Supabase.

Usage: Run this script, then copy the prompts to Claude for evaluation.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import json
from datetime import datetime
from collections import defaultdict
from core.config import SUPABASE_URL, get_supabase_headers

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)

def fetch_all(table, columns='*', filters=''):
    """Fetch all rows with pagination."""
    all_data = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={columns}&offset={offset}&limit=1000"
        if filters:
            url += f"&{filters}"
        r = requests.get(url, headers=READ_HEADERS, timeout=120)
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        all_data.extend(data)
        offset += 1000
        if len(data) < 1000:
            break
    return all_data


def get_products_without_scores():
    """Get products that don't have SAFE scores."""
    products = fetch_all('products', 'id,name,slug,type_id,url,description')
    scores = fetch_all('safe_scoring_results', 'product_id')
    scored_ids = {s['product_id'] for s in scores}
    return [p for p in products if p['id'] not in scored_ids]


def get_applicable_norms_for_product(product_id, type_mappings, applicability, norms_by_id):
    """Get applicable norms for a product."""
    type_ids = type_mappings.get(product_id, [])
    applicable_ids = set()
    for type_id in type_ids:
        if type_id in applicability:
            for norm_id, is_app in applicability[type_id].items():
                if is_app:
                    applicable_ids.add(norm_id)
    return [norms_by_id[nid] for nid in applicable_ids if nid in norms_by_id]


def generate_evaluation_prompt(product, norms, types_map, type_ids):
    """Generate a prompt for Claude to evaluate."""
    type_names = [types_map.get(tid, {}).get('name', '?') for tid in type_ids]

    # Group norms by pillar
    by_pillar = defaultdict(list)
    for n in norms:
        by_pillar[n['pillar']].append(n)

    prompt = f"""# SAFE SCORING EVALUATION
## Product: {product['name']}
- URL: {product.get('url', 'N/A')}
- Type(s): {', '.join(type_names)}
- Description: {(product.get('description') or 'N/A')[:300]}

## Instructions
Evaluate each norm using:
- **YES** = Product implements this (documented, audited, or working feature)
- **YESp** = Inherent to technology (e.g., EVM security, blockchain immutability)
- **NO** = Product does NOT implement this
- **TBD** = Cannot determine (use rarely)

## Norms to Evaluate ({len(norms)} total)

"""
    for pillar in ['S', 'A', 'F', 'E']:
        pillar_norms = by_pillar.get(pillar, [])
        if pillar_norms:
            pillar_names = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Efficiency'}
            prompt += f"### {pillar} - {pillar_names[pillar]} ({len(pillar_norms)} norms)\n"
            for n in sorted(pillar_norms, key=lambda x: x['code']):
                prompt += f"- **{n['code']}**: {n['title']}\n"
            prompt += "\n"

    prompt += """## Response Format
For each norm, provide:
```
CODE: RESULT | Brief justification (1 line)
```

Example:
```
S01: YES | Uses AES-256 encryption for all data
S02: YESp | EVM uses secp256k1 by design
A01: NO | No duress PIN feature documented
```

Now evaluate all norms for this product:
"""
    return prompt


def save_evaluations_to_db(product_id, evaluations, norms):
    """Save evaluations to Supabase."""
    norm_id_by_code = {n['code']: n['id'] for n in norms}

    records = []
    for code, (result, reason) in evaluations.items():
        norm_id = norm_id_by_code.get(code)
        if norm_id:
            records.append({
                'product_id': product_id,
                'norm_id': norm_id,
                'result': result,
                'why_this_result': reason[:500] if reason else None,
                'evaluated_by': 'claude_opus_4.5_direct',
                'evaluation_date': datetime.now().strftime('%Y-%m-%d'),
                'confidence_score': 0.95
            })

    if not records:
        return 0

    # Upsert
    headers = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)
    headers['Content-Type'] = 'application/json'

    # Batch insert
    batch_size = 100
    total = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/evaluations",
            headers=headers,
            json=batch,
            timeout=60
        )
        if r.status_code in [200, 201]:
            total += len(batch)

    return total


def parse_evaluation_response(text):
    """Parse Claude's evaluation response."""
    import re
    evaluations = {}

    # Pattern: CODE: RESULT | reason
    pattern = r'([A-Z]\d+[a-z]?)\s*:\s*(YES|YESp|NO|TBD|N/A)\s*\|\s*(.+?)(?=\n[A-Z]\d|$)'

    for match in re.finditer(pattern, text, re.IGNORECASE | re.DOTALL):
        code = match.group(1).upper()
        result = match.group(2).upper()
        reason = match.group(3).strip()
        evaluations[code] = (result, reason)

    return evaluations


def main():
    print("=" * 70)
    print("SAFESCORING - DIRECT CLAUDE EVALUATION")
    print("=" * 70)

    # Load data
    print("\nLoading data...")
    products = fetch_all('products', 'id,name,slug,type_id,url,description')
    print(f"   {len(products)} products")

    types = fetch_all('product_types', 'id,code,name')
    types_map = {t['id']: t for t in types}

    norms = fetch_all('norms', 'id,code,pillar,title')
    norms_by_id = {n['id']: n for n in norms}
    print(f"   {len(norms)} norms")

    # Applicability
    apps = fetch_all('norm_applicability', 'type_id,norm_id,is_applicable')
    applicability = defaultdict(dict)
    for a in apps:
        applicability[a['type_id']][a['norm_id']] = a['is_applicable']

    # Type mappings
    mappings = fetch_all('product_type_mapping', 'product_id,type_id')
    type_mappings = defaultdict(list)
    for m in mappings:
        type_mappings[m['product_id']].append(m['type_id'])
    for p in products:
        if p['id'] not in type_mappings and p.get('type_id'):
            type_mappings[p['id']].append(p['type_id'])

    # Get products without scores
    scores = fetch_all('safe_scoring_results', 'product_id')
    scored_ids = {s['product_id'] for s in scores}
    no_scores = [p for p in products if p['id'] not in scored_ids]

    print(f"\n   Products without scores: {len(no_scores)}")

    # Generate prompts for each product
    output_dir = 'data/eval_prompts'
    os.makedirs(output_dir, exist_ok=True)

    for p in no_scores:
        type_ids = type_mappings.get(p['id'], [])
        applicable = get_applicable_norms_for_product(p['id'], type_mappings, applicability, norms_by_id)

        if not applicable:
            print(f"   {p['name']}: No applicable norms (no type assigned)")
            continue

        prompt = generate_evaluation_prompt(p, applicable, types_map, type_ids)

        # Save prompt
        filename = f"{p['id']}_{p.get('slug', p['name'].lower().replace(' ', '_'))}.md"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(prompt)

        print(f"   {p['name']}: {len(applicable)} norms -> {filepath}")

    print(f"\nPrompts saved to: {output_dir}/")
    print("Copy each prompt to Claude for evaluation, then run save_evaluations.py")


if __name__ == "__main__":
    main()
