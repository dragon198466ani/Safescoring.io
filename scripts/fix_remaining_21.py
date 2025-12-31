#!/usr/bin/env python3
"""Fix remaining 21 products with missing type codes"""

import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS

# Mapping des 21 produits restants vers les types existants
REMAINING_FIXES = {
    # HW Sign devices -> HW Cold (hardware signing devices)
    "Coinkite TAPSIGNER": ["HW Cold"],
    "Coinkite SATSCARD": ["HW Cold"],
    "Coinkite Opendime": ["HW Cold"],

    # Multi-platform wallets -> SW Desktop + SW Mobile
    "Exodus": ["SW Desktop", "SW Mobile"],
    "Atomic Wallet": ["SW Desktop", "SW Mobile"],
    "Coinomi": ["SW Desktop", "SW Mobile"],
    "Trust Wallet": ["SW Mobile", "SW Browser"],  # Trust a aussi extension browser
    "ZenGo": ["MPC Wallet", "SW Mobile"],  # ZenGo est MPC-based

    # Analytics/Portfolio trackers -> DeFi Tools
    "Zapper": ["DeFi Tools"],
    "Zerion": ["DeFi Tools", "SW Mobile"],  # Zerion a aussi une app mobile
    "DeBank": ["DeFi Tools"],
    "Nansen": ["Research"],  # Nansen est plus orienté recherche/intelligence
    "Arkham Intelligence": ["Research"],  # Arkham est intelligence on-chain
    "Bubblemaps": ["DeFi Tools"],
    "Token Terminal": ["Research"],
    "Coinglass": ["DeFi Tools"],  # Derivatives analytics

    # Data & Research
    "Dune Analytics": ["Research", "Data Indexer"],
    "Messari": ["Research"],
    "Glassnode": ["Research"],
    "CoinGecko": ["Research"],
    "CoinMarketCap": ["Research"],
}

def main():
    print("=== Fixing Remaining 21 Products ===\n")

    # Load types
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
        headers=SUPABASE_HEADERS
    )
    types = r.json()
    type_by_code = {t['code']: t['id'] for t in types}

    # Load products
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name",
        headers=SUPABASE_HEADERS
    )
    products = r.json()
    product_by_name = {p['name']: p['id'] for p in products}

    success = 0
    errors = []

    for product_name, type_codes in REMAINING_FIXES.items():
        if product_name not in product_by_name:
            errors.append(f"Product not found: {product_name}")
            continue

        product_id = product_by_name[product_name]

        # Delete existing mappings
        r = requests.delete(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{product_id}",
            headers=SUPABASE_HEADERS
        )

        # Insert new mappings
        all_ok = True
        for i, code in enumerate(type_codes):
            if code not in type_by_code:
                errors.append(f"Type not found: {code} for {product_name}")
                all_ok = False
                continue

            data = {
                'product_id': product_id,
                'type_id': type_by_code[code],
                'is_primary': i == 0
            }
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/product_type_mapping",
                headers=SUPABASE_HEADERS,
                json=data
            )
            if r.status_code not in [200, 201]:
                errors.append(f"Insert failed for {product_name}: {code}")
                all_ok = False

        if all_ok:
            success += 1
            print(f"✓ {product_name}: {', '.join(type_codes)}")

    print(f"\n=== Results ===")
    print(f"Success: {success}")
    print(f"Errors: {len(errors)}")

    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  - {e}")

if __name__ == "__main__":
    main()
