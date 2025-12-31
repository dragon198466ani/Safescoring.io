#!/usr/bin/env python3
"""Run applicability generator for types that have products, prioritized by product count"""
import sys
import os
import requests

sys.path.insert(0, os.path.dirname(__file__))

from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.applicability_generator import ApplicabilityGenerator

def get_types_with_products():
    """Get list of type_ids sorted by product count (descending)"""
    headers = get_supabase_headers()

    # Get all products with their type_ids
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=type_id&limit=1000',
        headers=headers
    )
    products = r.json() if r.status_code == 200 else []

    # Count products per type
    from collections import Counter
    type_counts = Counter(p['type_id'] for p in products if p.get('type_id'))

    # Get types that already have applicability data
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id',
        headers=headers
    )
    existing = r.json() if r.status_code == 200 else []
    types_with_data = {x['type_id'] for x in existing}

    # Filter to only types without complete data
    # A type needs 916 norms, if less than 800 it's incomplete
    type_counts_filtered = {tid: count for tid, count in type_counts.items() if tid not in types_with_data}

    # Sort by count
    sorted_types = sorted(type_counts_filtered.items(), key=lambda x: -x[1])

    return sorted_types

if __name__ == "__main__":
    print("Analyzing product types by usage...")
    types_by_usage = get_types_with_products()

    print(f"\n{len(types_by_usage)} types need applicability data:")
    for tid, count in types_by_usage[:15]:
        print(f"  Type {tid}: {count} products")

    print("\nProcessing types by priority (most products first)...")

    generator = ApplicabilityGenerator()

    for i, (type_id, product_count) in enumerate(types_by_usage):
        print(f"\n{'='*60}")
        print(f"[{i+1}/{len(types_by_usage)}] Type ID {type_id} ({product_count} products)")
        print('='*60)

        try:
            generator.run(type_id=type_id, batch_size=30)
        except Exception as e:
            print(f"Error processing type {type_id}: {e}")
            continue

    print("\n" + "="*60)
    print("ALL TYPES PROCESSED")
    print("="*60)
