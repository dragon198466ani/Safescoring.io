#!/usr/bin/env python3
"""
Generate evaluations and save to JSON file for later import.
This bypasses the Supabase timeout issue.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import json
import requests
import time
from datetime import datetime
from core.config import SUPABASE_URL, get_supabase_headers

# Import evaluation logic
import importlib.util
spec = importlib.util.spec_from_file_location("claude_opus_full_eval",
    os.path.join(os.path.dirname(__file__), "claude_opus_full_eval.py"))
eval_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eval_module)
TYPE_CATEGORIES = eval_module.TYPE_CATEGORIES
get_category = eval_module.get_category
evaluate_norm = eval_module.evaluate_norm

READ_HEADERS = get_supabase_headers()


def load_data():
    """Load norms, products, and types."""
    print("Loading data from Supabase...")

    # Load norms
    norms = []
    last_id = 0
    while True:
        for attempt in range(5):
            try:
                url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&id=gt.{last_id}&order=id&limit=50'
                r = requests.get(url, headers=READ_HEADERS, timeout=60)
                if r.status_code == 200:
                    data = r.json()
                    if not data:
                        break
                    norms.extend(data)
                    last_id = data[-1]['id']
                    if len(norms) % 500 == 0:
                        print(f"  {len(norms)} norms...")
                    time.sleep(0.2)
                    break
            except:
                time.sleep(3)
        else:
            last_id += 50
            continue
        if not data:
            break
    print(f"  Total: {len(norms)} norms")

    # Load products
    products = []
    last_id = 0
    while True:
        for attempt in range(5):
            try:
                url = f'{SUPABASE_URL}/rest/v1/products?select=id,name,type_id&type_id=not.is.null&id=gt.{last_id}&order=id&limit=50'
                r = requests.get(url, headers=READ_HEADERS, timeout=60)
                if r.status_code == 200:
                    data = r.json()
                    if not data:
                        break
                    products.extend(data)
                    last_id = data[-1]['id']
                    if len(products) % 500 == 0:
                        print(f"  {len(products)} products...")
                    time.sleep(0.2)
                    break
            except:
                time.sleep(3)
        else:
            last_id += 50
            continue
        if not data:
            break
    print(f"  Total: {len(products)} products")

    # Load types
    types = {}
    for attempt in range(5):
        try:
            r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name',
                           headers=READ_HEADERS, timeout=30)
            if r.status_code == 200:
                types = {t['id']: t['name'] for t in r.json()}
                break
        except:
            time.sleep(3)
    print(f"  Total: {len(types)} types")

    return norms, products, types


def generate_evaluations(norms, products, types):
    """Generate all evaluations using Claude Opus logic."""
    print(f"\nGenerating evaluations for {len(products)} products x {len(norms)} norms...")
    today = datetime.now().strftime('%Y-%m-%d')

    all_evals = []
    for i, product in enumerate(products):
        type_name = types.get(product['type_id'], 'Unknown')
        category = get_category(type_name)

        for norm in norms:
            result, reason = evaluate_norm(
                norm['code'],
                norm.get('title', ''),
                norm.get('pillar', ''),
                category
            )
            all_evals.append({
                'product_id': product['id'],
                'norm_id': norm['id'],
                'result': result,
                'why_this_result': f"{product['name']}: {reason}"[:500],
                'evaluated_by': 'claude_opus_4.5_full',
                'evaluation_date': today,
                'confidence_score': 0.85
            })

        if (i + 1) % 100 == 0:
            print(f"  Generated for {i + 1}/{len(products)} products ({len(all_evals)} total)...")

    return all_evals


def main():
    print("=" * 60)
    print("  CLAUDE OPUS EVALUATION GENERATOR - JSON OUTPUT")
    print("=" * 60)

    norms, products, types = load_data()

    if not norms or not products:
        print("ERROR: Failed to load data")
        return

    evaluations = generate_evaluations(norms, products, types)

    # Save to JSON
    output_file = 'data/claude_opus_evaluations.json'
    print(f"\nSaving {len(evaluations)} evaluations to {output_file}...")

    os.makedirs('data', exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(evaluations, f)

    print(f"\n*** SUCCESS! {len(evaluations)} evaluations saved to {output_file} ***")
    print("\nTo import to Supabase, you can:")
    print("1. Use Supabase dashboard to increase statement_timeout")
    print("2. Import via psql or another PostgreSQL client")
    print("3. Use a migration script when database is less busy")


if __name__ == "__main__":
    main()
