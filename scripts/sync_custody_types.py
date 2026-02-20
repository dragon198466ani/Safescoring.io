#!/usr/bin/env python3
"""
SYNC CUSTODY TYPES FROM EXCEL TO DATABASE
==========================================
Adds custody_type (custodial, non-custodial, hybrid) to products.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import pandas as pd
from core.config import SUPABASE_URL, get_supabase_headers
import requests

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'return=minimal'

# Normalize custody type values
CUSTODY_NORMALIZE = {
    'custodial': 'custodial',
    'non-custodial': 'non-custodial',
    'non custodial': 'non-custodial',
    'noncustodial': 'non-custodial',
    'self-custody': 'non-custodial',
    'selfcustody': 'non-custodial',
    'hybrid': 'hybrid',
}


def load_excel_custody():
    """Load custody types from Excel."""
    file = 'SAFE_CATALOGUE_v7 (4).xlsx'
    xl = pd.ExcelFile(file)

    products = {}  # name -> custody_type

    for i, sheet in enumerate(xl.sheet_names):
        df = pd.read_excel(file, sheet_name=i)
        if 'Name' not in df.columns or 'Custody Type' not in df.columns:
            continue

        for _, row in df.iterrows():
            name = str(row.get('Name', '')).strip()
            if not name or name == 'nan':
                continue

            custody = str(row.get('Custody Type', '')).strip().lower()
            if custody and custody != 'nan':
                normalized = CUSTODY_NORMALIZE.get(custody, custody)
                products[name] = normalized

    return products


def load_db_products():
    """Load all products from database."""
    products = []
    offset = 0
    while True:
        r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug&limit=500&offset={offset}',
                        headers=READ_HEADERS, timeout=60)
        if r.status_code != 200 or not r.json():
            break
        products.extend(r.json())
        offset += len(r.json())
        if len(r.json()) < 500:
            break
    return {p['name']: p for p in products}


def main():
    print("=" * 70, flush=True)
    print("  SYNC CUSTODY TYPES FROM EXCEL", flush=True)
    print("=" * 70, flush=True)

    excel_custody = load_excel_custody()
    print(f"Excel products with custody type: {len(excel_custody)}", flush=True)

    # Count by type
    custody_counts = {}
    for custody in excel_custody.values():
        custody_counts[custody] = custody_counts.get(custody, 0) + 1
    for custody, count in sorted(custody_counts.items(), key=lambda x: -x[1]):
        print(f"  {custody}: {count}", flush=True)

    db_products = load_db_products()
    print(f"Database products: {len(db_products)}", flush=True)

    # Update products
    updated = 0
    not_found = []

    for name, custody in excel_custody.items():
        # Try exact match
        db_product = db_products.get(name)
        if not db_product:
            # Try case-insensitive
            for db_name, p in db_products.items():
                if db_name.lower() == name.lower():
                    db_product = p
                    break

        if not db_product:
            not_found.append(name)
            continue

        # Update custody_type (stored in a JSONB field or separate column)
        # For now, we'll store in the media JSONB field under custody_type
        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/products?id=eq.{db_product["id"]}',
            headers=WRITE_HEADERS,
            json={'media': {'custody_type': custody}},
            timeout=30
        )

        if r.status_code in [200, 204]:
            updated += 1
        else:
            print(f"  Error updating {name}: {r.status_code}", flush=True)

    print(f"\nUpdated: {updated}", flush=True)
    print(f"Not found in DB: {len(not_found)}", flush=True)

    if not_found[:10]:
        print("\nFirst 10 not found:", flush=True)
        for name in not_found[:10]:
            name_clean = name.encode('ascii', 'ignore').decode('ascii')
            print(f"  - {name_clean}", flush=True)


if __name__ == "__main__":
    main()
