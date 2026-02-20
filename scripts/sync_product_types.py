#!/usr/bin/env python3
"""
SYNC PRODUCT TYPES FROM EXCEL TO DATABASE
==========================================
1. Read product types from Excel
2. Map Excel types to database types
3. Assign types to products without type_id
4. Support multi-type products
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import pandas as pd
from core.config import SUPABASE_URL, get_supabase_headers
import requests
import re

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'return=minimal'

# Excel type to Database type mapping
EXCEL_TO_DB_TYPE = {
    # Hardware Wallets
    'HW Cold': 'Hardware Wallet Cold',
    'HW Wallet': 'Hardware Wallet Cold',
    # Software Wallets
    'SW Browser': 'Browser Extension Wallet',
    'SW Desktop': 'Desktop Wallet',
    'SW Mobile': 'Mobile Wallet',
    'SW Wallet': 'Mobile Wallet',  # Default to mobile
    # Special Wallets
    'MPC Wallet': 'MPC Wallet',
    'MultiSig': 'MultiSig Wallet',
    # Backups
    'Bkp Physical': 'Physical Backup (Metal)',
    'Bkp Digital': 'Digital Backup',
    # Exchanges
    'CEX': 'Centralized Exchange',
    'DEX': 'Decentralized Exchange',
    'DEX Agg': 'DEX Aggregator',
    # DeFi
    'Lending': 'DeFi Lending Protocol',
    'CeFi Lending': 'CeFi Lending / Earn',
    'Yield': 'Yield Aggregator',
    'Liq Staking': 'Liquid Staking',
    'Perps': 'Perpetual DEX',
    'Options': 'Options DEX',
    'Derivatives': 'DeFi Derivatives',
    'Insurance': 'DeFi Insurance',
    'DeFi': 'DeFi Tools & Analytics',  # Generic DeFi
    # Infrastructure
    'Bridges': 'Cross-Chain Bridge',
    'L2': 'Layer 2 Solution',
    'Oracle': 'Oracle Protocol',
    'Node RPC': 'Node / RPC Provider',
    # Finance
    'Crypto Bank': 'Crypto Bank',
    'Card': 'Crypto Card (Custodial)',
    'Fiat Gateway': 'Fiat On/Off Ramp',
    'Payment': 'Payment Processor',
    'Custody': 'Institutional Custody',
    # Assets
    'Stablecoin': 'Stablecoin',
    'RWA': 'Real World Assets',
    # Other
    'NFT Market': 'NFT Marketplace',
    'GameFi': 'GameFi Platform',
    'Tax': 'Crypto Tax Software',
    'Research': 'Research & Intelligence',
    'Portfolio': 'Research & Intelligence',  # Map to research
    'Tracker': 'Research & Intelligence',
    'Security': 'Security Audit & Bug Bounty',
    'Bot': 'DeFi Tools & Analytics',  # Trading bots
    'Mining': 'Mining Pool',
    'Messaging': 'Decentralized Messaging',
    'VPN': 'Decentralized VPN',
    'Education': 'Protocol / Standard',
    'ETF': 'Real World Assets',
    'Accessory': None,  # Skip accessories
    'Other': None,  # Skip other
}


def load_db_types():
    """Load product types from database."""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,name', headers=READ_HEADERS, timeout=30)
    types = r.json() if r.status_code == 200 else []
    return {t['name']: t['id'] for t in types}


def load_excel_products():
    """Load all products from Excel with their types."""
    file = 'SAFE_CATALOGUE_v7 (4).xlsx'
    xl = pd.ExcelFile(file)

    products = {}  # name -> {types: [], ...}

    for i, sheet in enumerate(xl.sheet_names):
        df = pd.read_excel(file, sheet_name=i)
        if 'Name' not in df.columns:
            continue

        # Determine the sheet category
        sheet_lower = sheet.lower()
        if 'hw wallet' in sheet_lower:
            sheet_type = 'HW Cold'
        elif 'sw wallet' in sheet_lower:
            sheet_type = 'SW Mobile'
        elif 'cex' in sheet_lower:
            sheet_type = 'CEX'
        elif 'defi' in sheet_lower:
            sheet_type = 'DeFi'
        elif 'backup' in sheet_lower:
            sheet_type = 'Bkp Physical'
        elif 'bank' in sheet_lower:
            sheet_type = 'Crypto Bank'
        else:
            sheet_type = None

        for _, row in df.iterrows():
            name = str(row.get('Name', '')).strip()
            if not name or name == 'nan':
                continue

            if name not in products:
                products[name] = {'types': []}

            # Get type from Type Principal column if present
            if 'Type Principal' in df.columns:
                type_val = str(row.get('Type Principal', '')).strip()
                if type_val and type_val != 'nan':
                    if type_val not in products[name]['types']:
                        products[name]['types'].append(type_val)

            # Add sheet-based type if not already present
            if sheet_type and sheet_type not in products[name]['types']:
                products[name]['types'].append(sheet_type)

    return products


def load_db_products():
    """Load all products from database."""
    products = []
    offset = 0
    while True:
        r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id&limit=500&offset={offset}',
                        headers=READ_HEADERS, timeout=60)
        if r.status_code != 200 or not r.json():
            break
        products.extend(r.json())
        offset += len(r.json())
        if len(r.json()) < 500:
            break
    return {p['name']: p for p in products}


def update_product_type(product_id, type_id):
    """Update a product's type_id."""
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}',
        headers=WRITE_HEADERS,
        json={'type_id': type_id},
        timeout=30
    )
    return r.status_code in [200, 204]


def main():
    print("=" * 70, flush=True)
    print("  SYNC PRODUCT TYPES FROM EXCEL TO DATABASE", flush=True)
    print("=" * 70, flush=True)

    print("\nLoading data...", flush=True)
    db_types = load_db_types()
    print(f"  Database types: {len(db_types)}", flush=True)

    excel_products = load_excel_products()
    print(f"  Excel products: {len(excel_products)}", flush=True)

    db_products = load_db_products()
    print(f"  Database products: {len(db_products)}", flush=True)

    # Count products without type
    no_type = [p for p in db_products.values() if p['type_id'] is None]
    print(f"  Products without type: {len(no_type)}", flush=True)

    # Process each product without type
    print("\nAssigning types...", flush=True)
    assigned = 0
    not_found_in_excel = []
    no_mapping = []

    for product in no_type:
        name = product['name']

        # Try to find in Excel (exact match or similar)
        excel_match = None
        if name in excel_products:
            excel_match = excel_products[name]
        else:
            # Try case-insensitive match
            for excel_name in excel_products:
                if excel_name.lower() == name.lower():
                    excel_match = excel_products[excel_name]
                    break

        if not excel_match or not excel_match['types']:
            not_found_in_excel.append(name)
            continue

        # Get the first type and map to database
        excel_type = excel_match['types'][0]
        db_type_name = EXCEL_TO_DB_TYPE.get(excel_type)

        if not db_type_name:
            no_mapping.append((name, excel_type))
            continue

        type_id = db_types.get(db_type_name)
        if not type_id:
            no_mapping.append((name, f"{excel_type} -> {db_type_name}"))
            continue

        # Update the product
        if update_product_type(product['id'], type_id):
            assigned += 1
            name_clean = name.encode('ascii', 'ignore').decode('ascii')[:40]
            print(f"  {name_clean:40} -> {db_type_name}", flush=True)

    print("\n" + "=" * 70, flush=True)
    print(f"  Assigned: {assigned}", flush=True)
    print(f"  Not in Excel: {len(not_found_in_excel)}", flush=True)
    print(f"  No mapping: {len(no_mapping)}", flush=True)

    if not_found_in_excel[:20]:
        print("\n  Products not found in Excel (first 20):", flush=True)
        for name in not_found_in_excel[:20]:
            name_clean = name.encode('ascii', 'ignore').decode('ascii')
            print(f"    - {name_clean}", flush=True)

    if no_mapping[:20]:
        print("\n  Products with no type mapping (first 20):", flush=True)
        for name, excel_type in no_mapping[:20]:
            name_clean = name.encode('ascii', 'ignore').decode('ascii')
            print(f"    - {name_clean}: {excel_type}", flush=True)


if __name__ == "__main__":
    main()
