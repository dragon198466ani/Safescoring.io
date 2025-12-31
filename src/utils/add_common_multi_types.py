#!/usr/bin/env python3
"""
SAFESCORING.IO - Add Common Multi-Types
Automatically adds secondary types to well-known products.
"""

import requests
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from core.config import SUPABASE_URL, SUPABASE_HEADERS


# Common multi-type mappings for well-known products
KNOWN_MULTI_TYPES = {
    # Hardware wallets with anti-coercion features
    "Coldcard": ["AC Phys"],  # Duress PIN, brick me PIN
    "Trezor Safe 3": ["AC Phys"],  # Passphrase support
    "Trezor Model T": ["AC Phys"],
    "Trezor Safe 5": ["AC Phys"],
    "Ledger Nano X": ["AC Phys"],  # Hidden wallets via passphrase
    "Ledger Nano S Plus": ["AC Phys"],
    "Ledger Stax": ["AC Phys"],
    "BitBox02": ["AC Phys"],
    "Keystone Pro": ["AC Phys"],
    "Keystone 3 Pro": ["AC Phys"],
    "NGRAVE ZERO": ["AC Phys"],
    "Foundation Passport": ["AC Phys"],

    # Software wallets available on both browser and mobile
    "MetaMask": ["SW Mobile"],
    "Trust Wallet": ["SW Browser"],
    "Phantom": ["SW Mobile"],
    "Rabby": ["SW Mobile"],
    "Rainbow": ["SW Browser"],
    "Exodus": ["SW Mobile"],
    "Coinbase Wallet": ["SW Mobile"],

    # DEXs with additional features
    "Uniswap": ["Yield"],
    "Curve Finance": ["Lending", "Yield"],
    "Balancer": ["Yield"],
    "SushiSwap": ["Yield"],
    "PancakeSwap": ["Yield"],
    "Trader Joe": ["Lending", "Yield"],
    "Osmosis": ["Liq Staking"],

    # CEXs with card products
    "Binance": ["Card"],
    "Coinbase": ["Card"],
    "Crypto.com": ["Card"],
    "Kraken": ["Card"],
    "Bybit": ["Card"],

    # Crypto banks with card products
    "Revolut": ["Card"],
    "Wirex": ["Card"],
    "Nexo": ["Card", "Lending"],

    # Lending protocols with staking
    "Aave": ["Yield"],
    "Compound": ["Yield"],
    "MakerDAO": ["Stablecoin"],  # DAI issuer

    # Liquid staking with yield
    "Lido Finance": ["Yield"],
    "Rocket Pool": ["Yield"],
    "Frax Finance": ["Stablecoin", "Yield"],

    # Privacy wallets with anti-coercion
    "Wasabi Wallet": ["AC Digit"],
    "Sparrow Wallet": ["AC Digit"],
    "Samourai Wallet": ["AC Digit"],

    # Multi-function DeFi
    "dYdX": ["Lending"],
    "GMX": ["Yield"],
}


def add_common_multi_types(dry_run=False):
    """Add common multi-types to products"""
    print("\n" + "=" * 60)
    print("ADDING COMMON MULTI-TYPES")
    print("=" * 60)

    if dry_run:
        print("[DRY RUN] No changes will be made")

    # Load product types
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
        headers=SUPABASE_HEADERS
    )
    type_by_code = {}
    if r.status_code == 200:
        for t in r.json():
            type_by_code[t['code']] = t['id']
    print(f"[INFO] Loaded {len(type_by_code)} product types")

    # Load products
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name",
        headers=SUPABASE_HEADERS
    )
    products = r.json() if r.status_code == 200 else []
    print(f"[INFO] Loaded {len(products)} products")

    # Load existing mappings
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id",
        headers=SUPABASE_HEADERS
    )
    existing = set()
    if r.status_code == 200:
        for m in r.json():
            existing.add((m['product_id'], m['type_id']))
    print(f"[INFO] {len(existing)} existing mappings")

    # Process
    added = 0
    skipped = 0
    not_found = []

    for product_pattern, type_codes in KNOWN_MULTI_TYPES.items():
        # Find matching products
        matches = [p for p in products if product_pattern.lower() in p['name'].lower()]

        if not matches:
            not_found.append(product_pattern)
            continue

        for product in matches:
            for type_code in type_codes:
                type_id = type_by_code.get(type_code)
                if not type_id:
                    print(f"[WARN] Unknown type code: {type_code}")
                    continue

                # Check if already exists
                if (product['id'], type_id) in existing:
                    skipped += 1
                    continue

                # Add mapping
                if not dry_run:
                    data = {
                        'product_id': product['id'],
                        'type_id': type_id,
                        'is_primary': False
                    }
                    r = requests.post(
                        f"{SUPABASE_URL}/rest/v1/product_type_mapping",
                        headers=SUPABASE_HEADERS,
                        json=data
                    )
                    if r.status_code in [200, 201]:
                        print(f"[OK] {product['name'][:30]:<30} <- {type_code}")
                        added += 1
                    else:
                        print(f"[ERROR] Failed to add {type_code} to {product['name']}: {r.status_code}")
                else:
                    print(f"[DRY] Would add {type_code} to {product['name']}")
                    added += 1

    print("\n" + "-" * 60)
    print(f"[SUMMARY]")
    print(f"   Added: {added}")
    print(f"   Skipped (already exist): {skipped}")
    if not_found:
        print(f"   Products not found: {len(not_found)}")
        for pf in not_found[:10]:
            print(f"      - {pf}")
        if len(not_found) > 10:
            print(f"      ... and {len(not_found) - 10} more")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Add common multi-types')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be added without making changes')
    args = parser.parse_args()

    add_common_multi_types(dry_run=args.dry_run)
