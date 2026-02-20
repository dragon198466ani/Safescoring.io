#!/usr/bin/env python3
"""
Populate product_type_mapping table with primary and secondary types.
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS, CONFIG
import requests

# Use service role key to bypass RLS
SERVICE_ROLE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
if SERVICE_ROLE_KEY:
    SUPABASE_HEADERS_ADMIN = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
else:
    SUPABASE_HEADERS_ADMIN = SUPABASE_HEADERS

# Products with multiple types (name_lower -> list of type codes)
# First type in list is primary
MULTI_TYPE_PRODUCTS = {
    # Wallets that are both browser and mobile
    'metamask': ['SW Browser', 'SW Mobile'],
    'phantom wallet': ['SW Browser', 'SW Mobile'],
    'rabby': ['SW Browser', 'SW Mobile'],
    'rainbow': ['SW Mobile', 'SW Browser'],
    'coinbase wallet': ['SW Mobile', 'SW Browser'],
    'trust wallet': ['SW Mobile', 'SW Browser'],
    'okx wallet': ['SW Browser', 'SW Mobile'],
    'coin98 wallet': ['SW Browser', 'SW Mobile'],
    'frame wallet': ['SW Browser', 'SW Desktop'],
    'exodus': ['SW Desktop', 'SW Mobile'],
    'atomic wallet': ['SW Desktop', 'SW Mobile'],
    'guarda wallet': ['SW Desktop', 'SW Mobile', 'SW Browser'],
    'edge wallet': ['SW Mobile', 'SW Desktop'],

    # NOTE: CEX Cards are SEPARATE products (Binance Card, Crypto.com Card, etc.)
    # Do NOT add CEX + Card as multi-type - they are different products!

    # Hardware wallets with mobile apps
    'ledger nano x': ['HW Cold', 'SW Mobile'],
    'ledger stax': ['HW Cold', 'SW Mobile'],
    'trezor safe 5': ['HW Cold', 'SW Mobile'],
    'keystone pro': ['HW Cold', 'SW Mobile'],
    'ngrave zero': ['HW Cold', 'SW Mobile'],
    'safepal s1': ['HW Cold', 'SW Mobile'],
    'tangem wallet': ['HW Cold', 'SW Mobile'],

    # DEX with aggregator features
    '1inch': ['DEX Agg', 'DEX'],
    'paraswap': ['DEX Agg', 'DEX'],
    'cowswap': ['DEX Agg', 'DEX'],
    'matcha': ['DEX Agg', 'DEX'],
    'jupiter': ['DEX Agg', 'DEX'],

    # DeFi protocols with multiple functions
    'aave': ['Lending', 'Yield'],
    'compound': ['Lending', 'Yield'],
    'morpho': ['Lending', 'Yield'],
    'spark': ['Lending', 'Stablecoin'],
    'maker': ['Lending', 'Stablecoin'],
    'frax': ['Stablecoin', 'Lending', 'Liq Staking'],
    'curve': ['DEX', 'Yield'],
    'convex': ['Yield', 'Liq Staking'],
    'yearn': ['Yield', 'Lending'],
    'pendle': ['Yield', 'Derivatives'],

    # Liquid staking with DeFi features
    'lido': ['Liq Staking', 'Yield'],
    'rocket pool': ['Liq Staking', 'Yield'],
    'eigenlayer': ['Restaking', 'Liq Staking'],
    'ether.fi': ['Liq Staking', 'Restaking'],

    # Bridges that are also DEX
    'synapse': ['Bridges', 'DEX'],
    'stargate': ['Bridges', 'DEX'],
    'hop protocol': ['Bridges', 'DEX'],

    # Crypto banks with lending
    'nexo': ['Crypto Bank', 'CeFi Lending', 'Card'],
    'youhodler': ['Crypto Bank', 'CeFi Lending'],
    'swissborg': ['Crypto Bank', 'Yield'],
}


def main():
    print("=" * 64)
    print("  POPULATE PRODUCT_TYPE_MAPPING")
    print("=" * 64)

    # Load product types
    print("\n📥 Chargement des types...")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=SUPABASE_HEADERS)
    types_by_code = {t['code']: t['id'] for t in r.json()} if r.status_code == 200 else {}
    print(f"   {len(types_by_code)} types")

    # Load all products
    print("\n📥 Chargement des produits...")
    all_products = []
    offset = 0
    while True:
        r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id&offset={offset}&limit=1000', headers=SUPABASE_HEADERS)
        batch = r.json() if r.status_code == 200 else []
        if not batch:
            break
        all_products.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    print(f"   {len(all_products)} produits")

    # Check existing mappings
    print("\n📥 Verification mappings existants...")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id', headers=SUPABASE_HEADERS)
    existing_mappings = set()
    if r.status_code == 200:
        for m in r.json():
            existing_mappings.add((m['product_id'], m['type_id']))
    print(f"   {len(existing_mappings)} mappings existants")

    # Build mappings to insert
    mappings_to_add = []

    for prod in all_products:
        product_id = prod['id']
        name_lower = prod['name'].lower().strip()
        primary_type_id = prod.get('type_id')

        # Check if this product has multi-types defined
        multi_types = None
        for key, types in MULTI_TYPE_PRODUCTS.items():
            if key in name_lower or name_lower in key:
                multi_types = types
                break

        if multi_types:
            # Add all defined types
            for i, type_code in enumerate(multi_types):
                type_id = types_by_code.get(type_code)
                if type_id and (product_id, type_id) not in existing_mappings:
                    mappings_to_add.append({
                        'product_id': product_id,
                        'type_id': type_id,
                        'is_primary': (i == 0)
                    })
                    existing_mappings.add((product_id, type_id))
        elif primary_type_id:
            # Add just the primary type
            if (product_id, primary_type_id) not in existing_mappings:
                mappings_to_add.append({
                    'product_id': product_id,
                    'type_id': primary_type_id,
                    'is_primary': True
                })
                existing_mappings.add((product_id, primary_type_id))

    print(f"\n📊 Mappings à ajouter: {len(mappings_to_add)}")

    # Insert mappings
    if mappings_to_add:
        print(f"\n➕ Insertion des mappings...")
        batch_size = 100
        success = 0

        for i in range(0, len(mappings_to_add), batch_size):
            batch = mappings_to_add[i:i+batch_size]
            url = f"{SUPABASE_URL}/rest/v1/product_type_mapping"
            # Use admin headers to bypass RLS
            resp = requests.post(url, headers=SUPABASE_HEADERS_ADMIN, json=batch)

            if resp.status_code in [200, 201]:
                success += len(batch)
            else:
                print(f"   ❌ Batch {i//batch_size}: {resp.status_code} - {resp.text[:100]}")

        print(f"   ✅ {success}/{len(mappings_to_add)} mappings insérés")

    # Final count
    print("\n📊 Vérification finale...")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=id', headers=SUPABASE_HEADERS)
    total = len(r.json()) if r.status_code == 200 else 0
    print(f"   Total mappings: {total}")

    # Show multi-type products
    print("\n🔗 Produits multi-types:")
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,is_primary,products(name),product_types(code)&order=product_id',
        headers=SUPABASE_HEADERS
    )
    if r.status_code == 200:
        mappings = r.json()
        # Group by product
        by_product = {}
        for m in mappings:
            pid = m['product_id']
            if pid not in by_product:
                by_product[pid] = {'name': m.get('products', {}).get('name', 'N/A'), 'types': []}
            type_info = m.get('product_types', {}).get('code', 'N/A')
            if m.get('is_primary'):
                type_info = f"*{type_info}"  # Mark primary
            by_product[pid]['types'].append(type_info)

        # Show products with multiple types
        multi_shown = 0
        for pid, info in by_product.items():
            if len(info['types']) > 1:
                print(f"   {info['name']}: {', '.join(info['types'])}")
                multi_shown += 1
                if multi_shown >= 15:
                    print(f"   ... et plus")
                    break

    print("\n✅ Terminé!")


if __name__ == "__main__":
    main()
