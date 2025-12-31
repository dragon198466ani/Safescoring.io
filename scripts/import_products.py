#!/usr/bin/env python3
"""
SAFESCORING.IO - Product Importer
Imports products from Excel + additional known products to Supabase.
Links products with brands for website URLs.

Usage:
    python import_products.py              # Dry run - show what would be imported
    python import_products.py --apply      # Actually import to Supabase
"""

import requests
import pandas as pd
import sys
import io
import re
import os
from pathlib import Path
from datetime import datetime

# Note: Run with: python -X utf8 import_products.py

# Add parent paths
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from core.config import SUPABASE_URL, SUPABASE_HEADERS

# Excel file path
EXCEL_FILE = Path(__file__).parent.parent / 'data' / 'SAFE_SCORING_V7_FINAL.xlsx'

# Additional products not in Excel (mentioned in conversations, new products, etc.)
ADDITIONAL_PRODUCTS = [
    # Hardware Wallets - Additional
    {"name": "Tangem Wallet", "website": "https://tangem.com"},
    {"name": "D'CENT Wallet", "website": "https://dcentwallet.com"},
    {"name": "SecuX V20", "website": "https://secuxtech.com"},
    {"name": "SecuX W20", "website": "https://secuxtech.com"},
    {"name": "Ellipal Titan", "website": "https://www.ellipal.com"},
    {"name": "Ellipal Titan 2.0", "website": "https://www.ellipal.com"},
    {"name": "CoolWallet Pro", "website": "https://www.coolwallet.io"},
    {"name": "CoolWallet S", "website": "https://www.coolwallet.io"},
    {"name": "KeepKey", "website": "https://www.keepkey.com"},
    {"name": "Arculus Card", "website": "https://www.getarculus.com"},
    {"name": "GridPlus Lattice1", "website": "https://gridplus.io"},
    {"name": "Cobo Vault Pro", "website": "https://cobo.com"},
    {"name": "SafePal S1", "website": "https://safepal.com"},
    {"name": "SafePal X1", "website": "https://safepal.com"},
    {"name": "BC Vault", "website": "https://bc-vault.com"},
    {"name": "Opendime", "website": "https://opendime.com"},

    # Software Wallets - Additional
    {"name": "Phantom Wallet", "website": "https://phantom.app"},
    {"name": "Solflare", "website": "https://solflare.com"},
    {"name": "Backpack Wallet", "website": "https://backpack.app"},
    {"name": "Keplr Wallet", "website": "https://www.keplr.app"},
    {"name": "Temple Wallet", "website": "https://templewallet.com"},
    {"name": "Petra Wallet", "website": "https://petra.app"},
    {"name": "Martian Wallet", "website": "https://martianwallet.xyz"},
    {"name": "OKX Wallet", "website": "https://www.okx.com/web3"},
    {"name": "Coin98 Wallet", "website": "https://coin98.com"},
    {"name": "Frame Wallet", "website": "https://frame.sh"},
    {"name": "Argent Wallet", "website": "https://www.argent.xyz"},
    {"name": "Argent X", "website": "https://www.argent.xyz"},
    {"name": "Braavos Wallet", "website": "https://braavos.app"},
    {"name": "imToken", "website": "https://token.im"},
    {"name": "TokenPocket", "website": "https://www.tokenpocket.pro"},
    {"name": "Math Wallet", "website": "https://mathwallet.org"},
    {"name": "Atomic Wallet", "website": "https://atomicwallet.io"},
    {"name": "Coinomi", "website": "https://www.coinomi.com"},
    {"name": "BlueWallet", "website": "https://bluewallet.io"},
    {"name": "Electrum", "website": "https://electrum.org"},
    {"name": "Sparrow Wallet", "website": "https://sparrowwallet.com"},
    {"name": "Bitcoin Core", "website": "https://bitcoin.org"},
    {"name": "Guarda Wallet", "website": "https://guarda.com"},
    {"name": "Edge Wallet", "website": "https://edge.app"},
    {"name": "Enjin Wallet", "website": "https://enjin.io/products/wallet"},
    {"name": "Unstoppable Wallet", "website": "https://unstoppable.money"},
    {"name": "Pillar Wallet", "website": "https://pillarproject.io"},

    # DEX - Additional
    {"name": "Jupiter", "website": "https://jup.ag"},
    {"name": "Raydium", "website": "https://raydium.io"},
    {"name": "Orca", "website": "https://www.orca.so"},
    {"name": "Trader Joe", "website": "https://traderjoexyz.com"},
    {"name": "Camelot DEX", "website": "https://camelot.exchange"},
    {"name": "Velodrome", "website": "https://velodrome.finance"},
    {"name": "Aerodrome", "website": "https://aerodrome.finance"},
    {"name": "SpookySwap", "website": "https://spooky.fi"},
    {"name": "QuickSwap", "website": "https://quickswap.exchange"},
    {"name": "Biswap", "website": "https://biswap.org"},
    {"name": "DODO", "website": "https://dodoex.io"},
    {"name": "KyberSwap", "website": "https://kyberswap.com"},
    {"name": "Osmosis", "website": "https://osmosis.zone"},
    {"name": "Astroport", "website": "https://astroport.fi"},

    # CEX - Additional
    {"name": "Bitstamp", "website": "https://www.bitstamp.net"},
    {"name": "Gemini", "website": "https://www.gemini.com"},
    {"name": "Gate.io", "website": "https://www.gate.io"},
    {"name": "MEXC", "website": "https://www.mexc.com"},
    {"name": "HTX (Huobi)", "website": "https://www.htx.com"},
    {"name": "Bitfinex", "website": "https://www.bitfinex.com"},
    {"name": "Upbit", "website": "https://upbit.com"},
    {"name": "Bithumb", "website": "https://www.bithumb.com"},
    {"name": "Crypto.com App", "website": "https://crypto.com"},
    {"name": "Robinhood Crypto", "website": "https://robinhood.com"},
    {"name": "eToro", "website": "https://www.etoro.com"},
    {"name": "Swissborg", "website": "https://swissborg.com"},
    {"name": "YouHodler", "website": "https://www.youhodler.com"},

    # Lending/Yield - Additional
    {"name": "Aura Finance", "website": "https://aura.finance"},
    {"name": "Curve Finance", "website": "https://curve.fi"},
    {"name": "Convex Finance", "website": "https://www.convexfinance.com"},
    {"name": "Aevo", "website": "https://www.aevo.xyz"},
    {"name": "Notional Finance", "website": "https://notional.finance"},
    {"name": "Alchemix", "website": "https://alchemix.fi"},
    {"name": "Alpaca Finance", "website": "https://www.alpacafinance.org"},
    {"name": "Abracadabra", "website": "https://abracadabra.money"},
    {"name": "Olympus DAO", "website": "https://www.olympusdao.finance"},
    {"name": "Tokemak", "website": "https://www.tokemak.xyz"},

    # Bridges - Additional
    {"name": "LayerZero", "website": "https://layerzero.network"},
    {"name": "Axelar", "website": "https://axelar.network"},
    {"name": "Connext", "website": "https://www.connext.network"},
    {"name": "Socket", "website": "https://socket.tech"},
    {"name": "Li.Fi", "website": "https://li.fi"},
    {"name": "deBridge", "website": "https://debridge.finance"},
    {"name": "Orbiter Finance", "website": "https://www.orbiter.finance"},

    # Staking - Additional
    {"name": "Stader Labs", "website": "https://staderlabs.com"},
    {"name": "Swell Network", "website": "https://swellnetwork.io"},
    {"name": "Ether.fi", "website": "https://ether.fi"},
    {"name": "Renzo Protocol", "website": "https://www.renzoprotocol.com"},
    {"name": "Kelp DAO", "website": "https://kelpdao.xyz"},
    {"name": "EigenLayer", "website": "https://www.eigenlayer.xyz"},
    {"name": "Puffer Finance", "website": "https://www.puffer.fi"},
    {"name": "Bedrock", "website": "https://bedrock.rockx.com"},

    # Custody - Additional
    {"name": "Cobo Custody", "website": "https://custody.cobo.com"},
    {"name": "Hex Trust", "website": "https://hextrust.com"},
    {"name": "Liminal Custody", "website": "https://www.liminalcustody.com"},
    {"name": "Copper", "website": "https://copper.co"},
    {"name": "Propine", "website": "https://www.propine.com"},

    # Smart Wallets / Account Abstraction
    {"name": "Biconomy", "website": "https://www.biconomy.io"},
    {"name": "ZeroDev", "website": "https://zerodev.app"},
    {"name": "Pimlico", "website": "https://www.pimlico.io"},
    {"name": "Candide", "website": "https://www.candide.dev"},
    {"name": "Sequence Wallet", "website": "https://sequence.xyz"},
    {"name": "Obvious Wallet", "website": "https://obvious.technology"},

    # MPC Wallets
    {"name": "Fordefi", "website": "https://www.fordefi.com"},
    {"name": "Liminal", "website": "https://www.liminalcustody.com"},
    {"name": "ZenGo", "website": "https://zengo.com"},
    {"name": "Dfns", "website": "https://www.dfns.co"},

    # Backup Solutions - Additional
    {"name": "CRYPTOTAG Thor", "website": "https://cryptotag.io"},
    {"name": "Hodlr Swiss", "website": "https://hodlr.swiss"},
    {"name": "Coldbit Steel", "website": "https://coldbit.com"},
    {"name": "Simbit", "website": "https://simbit.io"},

    # Analytics/Portfolio - Additional
    {"name": "Nansen", "website": "https://www.nansen.ai"},
    {"name": "Dune Analytics", "website": "https://dune.com"},
    {"name": "Arkham", "website": "https://www.arkhamintelligence.com"},
    {"name": "Token Terminal", "website": "https://tokenterminal.com"},
    {"name": "DeFiLlama", "website": "https://defillama.com"},
    {"name": "CoinGecko", "website": "https://www.coingecko.com"},
    {"name": "CoinMarketCap", "website": "https://coinmarketcap.com"},
    {"name": "Messari", "website": "https://messari.io"},
]


def slugify(name):
    """Convert product name to URL-friendly slug"""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


def extract_products_from_excel():
    """Extract all products from the Excel file"""
    if not EXCEL_FILE.exists():
        print(f"[ERROR] Excel file not found: {EXCEL_FILE}")
        return []

    xlsx = pd.ExcelFile(EXCEL_FILE)
    products = set()

    # Read COMPAT PRODUITS sheet
    df = pd.read_excel(xlsx, sheet_name='COMPAT PRODUITS', header=None)

    # Get products from column A (index 0)
    for val in df.iloc[:, 0]:
        val_str = str(val).strip()
        if val_str and val_str != 'nan':
            if len(val_str) > 1 and len(val_str) < 100:
                if not any(x in val_str.upper() for x in ['PRODUIT', 'MATRICE', 'CHAQUE', 'CELLULE', 'SYMBOLE']):
                    products.add(val_str)

    # Also get from header row
    for val in df.iloc[1]:
        val_str = str(val).strip()
        if val_str and val_str != 'nan':
            if len(val_str) > 1 and len(val_str) < 100:
                if not any(x in val_str.upper() for x in ['PRODUIT', 'UNNAMED', 'MATRICE']):
                    products.add(val_str)

    return sorted(products)


def load_brands_from_supabase():
    """Load existing brands from Supabase to get websites"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/brands?select=id,name,website",
        headers=SUPABASE_HEADERS
    )

    if r.status_code == 200:
        brands = r.json()
        # Create lookup dict (lowercase name -> brand info)
        brand_lookup = {}
        for b in brands:
            name_lower = b['name'].lower().strip()
            brand_lookup[name_lower] = b
            # Also add variations
            name_simple = re.sub(r'[^a-z0-9]', '', name_lower)
            brand_lookup[name_simple] = b
        return brand_lookup
    return {}


def load_existing_products():
    """Load existing products from Supabase"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug",
        headers=SUPABASE_HEADERS
    )

    if r.status_code == 200:
        products = r.json()
        return {p['name'].lower(): p for p in products}
    return {}


def find_brand_website(product_name, brand_lookup):
    """Try to find website from brands table"""
    name_lower = product_name.lower().strip()

    # Direct match
    if name_lower in brand_lookup:
        return brand_lookup[name_lower].get('website')

    # Simplified match
    name_simple = re.sub(r'[^a-z0-9]', '', name_lower)
    if name_simple in brand_lookup:
        return brand_lookup[name_simple].get('website')

    # Partial match (first word)
    first_word = name_lower.split()[0] if name_lower.split() else ''
    if first_word and len(first_word) > 3:
        for brand_name, brand_info in brand_lookup.items():
            if first_word in brand_name or brand_name in first_word:
                return brand_info.get('website')

    return None


def build_product_list():
    """Build complete product list from Excel + additional products"""
    # Get products from Excel
    excel_products = extract_products_from_excel()
    print(f"[INFO] Found {len(excel_products)} products in Excel")

    # Load brands for website lookup
    brand_lookup = load_brands_from_supabase()
    print(f"[INFO] Loaded {len(brand_lookup)} brands for website lookup")

    # Build product records
    products = []
    seen_names = set()

    # Add Excel products
    for name in excel_products:
        if name.lower() not in seen_names:
            website = find_brand_website(name, brand_lookup)
            products.append({
                'name': name,
                'slug': slugify(name),
                'website': website,
                'source': 'excel'
            })
            seen_names.add(name.lower())

    # Add additional products
    for p in ADDITIONAL_PRODUCTS:
        if p['name'].lower() not in seen_names:
            products.append({
                'name': p['name'],
                'slug': slugify(p['name']),
                'website': p.get('website'),
                'source': 'additional'
            })
            seen_names.add(p['name'].lower())

    return products


def import_products_to_supabase(products, dry_run=True):
    """Import products to Supabase"""
    existing = load_existing_products()

    to_insert = []
    skipped = []

    for p in products:
        if p['name'].lower() in existing:
            skipped.append(p['name'])
        else:
            # Always include all keys for consistency
            to_insert.append({
                'name': p['name'],
                'slug': p['slug'],
                'url': p.get('website') or None,  # Use 'url' column
            })

    print(f"\n[INFO] Products to import: {len(to_insert)}")
    print(f"[INFO] Products already exist (skipped): {len(skipped)}")

    if dry_run:
        print("\n[DRY RUN] Would import these products:")
        for p in to_insert[:30]:
            website_info = f" | {p['website']}" if p['website'] else ""
            print(f"  - {p['name']}{website_info}")
        if len(to_insert) > 30:
            print(f"  ... and {len(to_insert) - 30} more")
        return

    # Actually insert
    if not to_insert:
        print("[INFO] No new products to import")
        return

    print(f"\n[IMPORTING] {len(to_insert)} products...")

    # Insert in batches
    batch_size = 50
    inserted = 0

    for i in range(0, len(to_insert), batch_size):
        batch = to_insert[i:i+batch_size]

        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=SUPABASE_HEADERS,
            json=batch
        )

        if r.status_code in [200, 201]:
            inserted += len(batch)
            print(f"  Inserted batch {i//batch_size + 1}: {len(batch)} products")
        else:
            print(f"  [ERROR] Batch {i//batch_size + 1} failed: {r.status_code} - {r.text[:200]}")

    print(f"\n[DONE] Successfully imported {inserted} products")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Import products to Supabase')
    parser.add_argument('--apply', action='store_true', help='Actually import (default is dry run)')
    args = parser.parse_args()

    print("=" * 60)
    print("SAFESCORING - PRODUCT IMPORTER")
    print("=" * 60)
    print(f"Excel file: {EXCEL_FILE}")
    print(f"Mode: {'APPLY' if args.apply else 'DRY RUN'}")
    print()

    # Build product list
    products = build_product_list()
    print(f"\n[INFO] Total unique products: {len(products)}")

    # Show breakdown
    excel_count = sum(1 for p in products if p['source'] == 'excel')
    additional_count = sum(1 for p in products if p['source'] == 'additional')
    with_website = sum(1 for p in products if p['website'])

    print(f"  - From Excel: {excel_count}")
    print(f"  - Additional: {additional_count}")
    print(f"  - With website: {with_website}")

    # Import
    import_products_to_supabase(products, dry_run=not args.apply)


if __name__ == "__main__":
    main()
