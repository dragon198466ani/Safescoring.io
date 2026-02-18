#!/usr/bin/env python3
"""
Recalculate all product scores with norm equivalences applied.
"""

import os
import sys
import json
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pathlib import Path

# Create session with retries
session = requests.Session()
retries = Retry(total=3, backoff_factor=1, status_forcelist=[502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retries))

project_root = Path(__file__).parent.parent

# Load environment variables
def load_env(filepath):
    env_vars = {}
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

env = {}
env.update(load_env(project_root / '.env'))
env.update(load_env(project_root / 'config' / '.env'))

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials")
    sys.exit(1)

print(f"Supabase URL: {SUPABASE_URL[:50]}...")

# Get all products (with pagination)
def get_products():
    all_products = []
    offset = 0
    limit = 500

    while True:
        url = f"{SUPABASE_URL}/rest/v1/products?select=id,slug,name&limit={limit}&offset={offset}&order=id"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
        }
        response = session.get(url, headers=headers, timeout=60)
        if response.status_code == 200:
            batch = response.json()
            if not batch:
                break
            all_products.extend(batch)
            if len(batch) < limit:
                break
            offset += limit
        else:
            print(f"Error fetching products at offset {offset}: {response.status_code}")
            break

    return all_products

# Get equivalence rules
def get_equivalences():
    url = f"{SUPABASE_URL}/rest/v1/norm_equivalences?select=*&is_active=eq.true"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    response = session.get(url, headers=headers, timeout=60)
    if response.status_code == 200:
        return response.json()
    print(f"Error fetching equivalences: {response.status_code}")
    return []

# Get evaluations for a product (with norm code from join)
def get_evaluations(product_id):
    # Use PostgREST nested resource embedding to get norm code
    url = f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=id,norm_id,result,norms(code,pillar)"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    response = session.get(url, headers=headers, timeout=60)
    if response.status_code == 200:
        evals = response.json()
        # Transform to expected format
        result = []
        for ev in evals:
            norm_info = ev.get('norms') or {}
            result.append({
                'id': ev.get('id'),
                'norm_code': norm_info.get('code', ''),
                'value': ev.get('result', ''),
                'pillar': norm_info.get('pillar', ''),
            })
        return result
    return []

# Get scoring results for a product
def get_scoring_results(product_id):
    url = f"{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}&select=*&limit=1"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    response = session.get(url, headers=headers, timeout=60)
    if response.status_code == 200:
        data = response.json()
        return data[0] if data else None
    return None

# Update scoring results with equivalence scores
def update_scoring_with_equiv(product_id, equiv_data):
    url = f"{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    response = session.patch(url, json=equiv_data, headers=headers, timeout=60)
    return response.status_code in [200, 204]

# Update evaluation with equivalence info
def update_evaluation_equiv(eval_id, equiv_remark, equiv_to, equiv_score):
    url = f"{SUPABASE_URL}/rest/v1/evaluations?id=eq.{eval_id}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    data = {
        'equivalence_remark': equiv_remark,
        'equivalent_to': equiv_to,
        'equivalence_score': equiv_score,
    }
    response = session.patch(url, json=data, headers=headers, timeout=60)
    return response.status_code in [200, 204]


def apply_equivalences_to_product(product, equivalences, verbose=False, debug=False):
    """Apply norm equivalences to a product's evaluations and calculate new scores."""
    product_id = product['id']
    evaluations = get_evaluations(product_id)
    scoring = get_scoring_results(product_id)

    if debug:
        print(f"  Product {product_id}: {len(evaluations)} evals, scoring={scoring is not None}")

    if not scoring:
        return 0, []

    # Build a map of what norms the product has (only if result is not TBD/N/A)
    product_norms = {}
    for ev in evaluations:
        norm_code = ev.get('norm_code', '')
        result = ev.get('value', '')
        pillar = ev.get('pillar', '')
        # Only count positive evaluations (not TBD, N/A, or empty)
        if norm_code and result and result not in ('TBD', 'N/A', 'Non', 'No', 'FALSE'):
            product_norms[norm_code] = {
                'value': result,
                'score': 1.0,  # Binary score - has the norm
                'eval_id': ev.get('id'),
                'pillar': pillar,
            }

    if debug and product_norms:
        print(f"  Positive norms: {list(product_norms.keys())[:10]}...")

    applied = []
    boost_total = 0.0

    # Check each equivalence rule
    for eq in equivalences:
        source = eq['source_norm_code']
        target = eq['target_norm_code']
        factor = float(eq.get('equivalence_factor', 1.0))

        # If product has source norm but not target, apply equivalence
        if source in product_norms and target not in product_norms:
            source_val = product_norms[source]['value']
            source_expected = eq.get('source_norm_value', '')

            # Check if source value matches (or no specific value required)
            if not source_expected or source_val == source_expected or source_expected in str(source_val):
                # Calculate equivalent score
                source_score = product_norms[source]['score']
                equiv_score = source_score * factor

                applied.append({
                    'source': source,
                    'source_value': source_val,
                    'target': target,
                    'target_value': eq.get('target_norm_value', ''),
                    'factor': factor,
                    'equiv_score': equiv_score,
                    'remark': eq.get('remark_template', ''),
                })
                boost_total += equiv_score

                if verbose:
                    print(f"    {source} ({source_val}) -> {target}: +{equiv_score:.2f}")

    if applied:
        # Calculate scores with equivalences
        # Original scores
        s_orig = float(scoring.get('score_s') or 0)
        a_orig = float(scoring.get('score_a') or 0)
        f_orig = float(scoring.get('score_f') or 0)
        e_orig = float(scoring.get('score_e') or 0)
        total_orig = float(scoring.get('note_finale') or 0)

        # Add boost (simplified - in real implementation would be per-pillar)
        boost_per_pillar = boost_total / 4 if boost_total else 0

        equiv_data = {
            'note_finale_with_equiv': min(100, total_orig + boost_total),
            'score_s_with_equiv': min(100, s_orig + boost_per_pillar),
            'score_a_with_equiv': min(100, a_orig + boost_per_pillar),
            'score_f_with_equiv': min(100, f_orig + boost_per_pillar),
            'score_e_with_equiv': min(100, e_orig + boost_per_pillar),
            'equivalences_applied': len(applied),
            'equivalence_boost': round(boost_total, 2),
            'equivalence_details': applied,
        }

        if update_scoring_with_equiv(product_id, equiv_data):
            return len(applied), applied

    return 0, []


def main():
    print("=" * 60)
    print("Recalculating Scores with Norm Equivalences")
    print("=" * 60)

    # Get equivalence rules
    equivalences = get_equivalences()
    print(f"\nLoaded {len(equivalences)} equivalence rules")

    if not equivalences:
        print("No equivalence rules found. Run migration first.")
        return

    # Get all products
    products = get_products()
    print(f"Found {len(products)} products to process\n")

    total_applied = 0
    products_updated = 0

    for i, product in enumerate(products, 1):
        slug = product.get('slug', product['id'])
        name = product.get('name', slug)
        # Sanitize name for Windows console
        name = name.encode('ascii', 'replace').decode('ascii') if name else slug

        applied, details = apply_equivalences_to_product(product, equivalences, verbose=False)

        if applied > 0:
            products_updated += 1
            total_applied += applied
            print(f"[{i}/{len(products)}] {name}: {applied} equivalence(s) applied")
            for d in details[:3]:  # Show first 3
                print(f"    {d['source']} -> {d['target']} (x{d['factor']})")
        else:
            # Print progress every 50 products
            if i % 50 == 0:
                print(f"[{i}/{len(products)}] Processing...")

    print("\n" + "=" * 60)
    print(f"Complete! Updated {products_updated} products with {total_applied} equivalences")
    print("=" * 60)


if __name__ == '__main__':
    main()
