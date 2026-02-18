#!/usr/bin/env python3
"""
Quick script to add Lendasat to the database.
Run: python scripts/add_lendasat.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

import requests
from core.config import SUPABASE_URL, get_supabase_headers

def main():
    headers = get_supabase_headers(use_service_key=True)

    # 1. Add brand
    print("[1/3] Adding brand...")
    brand_data = {
        'name': 'Lendasat',
        'website': 'https://lendasat.com'
    }
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/brands",
        headers={**headers, 'Prefer': 'return=representation'},
        json=brand_data
    )

    if r.status_code == 201:
        brand = r.json()[0]
        brand_id = brand['id']
        print(f"   Brand created: {brand_id}")
    elif r.status_code == 409:
        # Already exists, fetch it
        r2 = requests.get(
            f"{SUPABASE_URL}/rest/v1/brands?name=eq.Lendasat&select=id",
            headers=headers
        )
        brand_id = r2.json()[0]['id'] if r2.status_code == 200 and r2.json() else None
        print(f"   Brand exists: {brand_id}")
    else:
        print(f"   Brand error: {r.status_code} - {r.text}")
        brand_id = None

    # 2. Get Protocol type
    print("[2/3] Getting product type...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?code=eq.Protocol&select=id",
        headers=headers
    )
    type_id = r.json()[0]['id'] if r.status_code == 200 and r.json() else None
    print(f"   Type ID: {type_id}")

    # 3. Add product
    print("[3/3] Adding product...")
    product_data = {
        'slug': 'lendasat',
        'name': 'Lendasat',
        'url': 'https://lendasat.com',
        'description': 'Bitcoin-backed lending platform offering loans without counterparty risk. Features Lightning Network integration for fast transactions. Users can borrow against their Bitcoin collateral without selling their assets. Focused on Bitcoin-native lending with self-custody principles.',
        'short_description': 'Bitcoin-backed loans via Lightning Network',
        'type_id': type_id,
        'brand_id': brand_id,
        'is_active': True,
        'verified': False,
        'security_status': 'pending'
    }

    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/products",
        headers={**headers, 'Prefer': 'return=representation'},
        json=product_data
    )

    if r.status_code == 201:
        product = r.json()[0]
        print(f"\n[SUCCESS] Lendasat added!")
        print(f"   ID: {product['id']}")
        print(f"   Slug: {product['slug']}")
        print(f"   Category: lending")
    elif r.status_code == 409:
        print(f"\n[EXISTS] Lendasat already in database")
    else:
        print(f"\n[ERROR] {r.status_code} - {r.text}")

if __name__ == '__main__':
    main()
