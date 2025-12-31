#!/usr/bin/env python3
"""
SAFESCORING.IO - List All Types by Product
Affiche tous les types pour chaque produit
"""

import requests
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))

try:
    from core.config import SUPABASE_URL, SUPABASE_HEADERS
except ImportError:
    import os
    from dotenv import load_dotenv
    load_dotenv()
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
    SUPABASE_HEADERS = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def list_all_types_by_product():
    """Affiche tous les types pour chaque produit"""
    print("\n" + "=" * 80)
    print("TYPES PAR PRODUIT")
    print("=" * 80)

    # Load product types
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,name_fr&order=code",
        headers=SUPABASE_HEADERS
    )
    if r.status_code != 200:
        print(f"Erreur chargement types: {r.status_code}")
        return

    types_by_id = {t['id']: t for t in r.json()}
    print(f"\n{len(types_by_id)} types de produits disponibles")

    # Load products with their primary type
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name,type_id&order=name",
        headers=SUPABASE_HEADERS
    )
    if r.status_code != 200:
        print(f"Erreur chargement produits: {r.status_code}")
        return

    products = r.json()
    print(f"{len(products)} produits actifs\n")

    # Load multi-type mappings
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary&order=is_primary.desc",
        headers=SUPABASE_HEADERS
    )
    mappings = {}
    if r.status_code == 200:
        for m in r.json():
            pid = m['product_id']
            if pid not in mappings:
                mappings[pid] = []
            mappings[pid].append(m)

    print("-" * 80)
    print(f"{'#':<5} {'PRODUIT':<35} {'TYPES'}")
    print("-" * 80)

    for i, product in enumerate(products, 1):
        pid = product['id']
        name = product['name'][:34]

        # Get types for this product
        product_types = []

        if pid in mappings:
            # Multi-type product
            for m in mappings[pid]:
                t = types_by_id.get(m['type_id'], {})
                type_name = t.get('name_fr') or t.get('name') or t.get('code', '?')
                if m['is_primary']:
                    product_types.insert(0, f"{type_name} (P)")  # Primary first
                else:
                    product_types.append(type_name)
        elif product.get('type_id'):
            # Single type from products.type_id
            t = types_by_id.get(product['type_id'], {})
            type_name = t.get('name_fr') or t.get('name') or t.get('code', '?')
            product_types.append(type_name)

        if product_types:
            types_str = " + ".join(product_types)
        else:
            types_str = "Aucun type"

        print(f"[{i:>3}/{len(products)}] {name:<35} | {types_str}")

    print("-" * 80)

    # Summary by type
    print("\n" + "=" * 80)
    print("RESUME PAR TYPE")
    print("=" * 80)

    type_counts = {}
    for product in products:
        pid = product['id']

        if pid in mappings:
            for m in mappings[pid]:
                tid = m['type_id']
                type_counts[tid] = type_counts.get(tid, 0) + 1
        elif product.get('type_id'):
            tid = product['type_id']
            type_counts[tid] = type_counts.get(tid, 0) + 1

    for tid, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
        t = types_by_id.get(tid, {})
        type_name = t.get('name_fr') or t.get('name') or t.get('code', '?')
        print(f"   {type_name:<40}: {count} produits")


if __name__ == "__main__":
    list_all_types_by_product()
