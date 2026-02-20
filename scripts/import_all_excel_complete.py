#!/usr/bin/env python3
"""
SAFESCORING - Import COMPLET de TOUTES les donnees Excel vers Supabase
Sans doublons - UPSERT intelligent
"""

import pandas as pd
import sys
import os
import re
import json
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, CONFIG
import requests

SERVICE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

EXCEL_FILE = Path(__file__).parent.parent / 'SAFE_CATALOGUE_v7 (4).xlsx'

# Mapping des types par feuille -> code product_types
SHEET_TYPE_MAP = {
    'Crypto Banks': 'crypto-bank',
    'HW Wallets': 'hardware-wallet',
    'CEX': 'cex',
    'SW Wallets': 'software-wallet',
    'DeFi': 'defi',
    'Backups': 'backup',
}

# Cache pour les product_types (code -> id)
PRODUCT_TYPES_CACHE = {}


def load_product_types():
    """Load product_types table from Supabase"""
    global PRODUCT_TYPES_CACHE
    print("Chargement des types de produits...")

    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name",
        headers=HEADERS, timeout=30
    )

    if resp.status_code == 200:
        for pt in resp.json():
            code = pt.get('code', '').lower()
            name = pt.get('name', '').lower()
            PRODUCT_TYPES_CACHE[code] = pt['id']
            PRODUCT_TYPES_CACHE[name] = pt['id']
            # Also add without dashes
            PRODUCT_TYPES_CACHE[code.replace('-', '')] = pt['id']
            PRODUCT_TYPES_CACHE[code.replace('-', '_')] = pt['id']
        print(f"  {len(resp.json())} types charges")
    else:
        print(f"  Erreur: {resp.status_code}")

    return PRODUCT_TYPES_CACHE


def get_type_id(product_type_code):
    """Get type_id from product type code"""
    if not product_type_code:
        return None

    code = str(product_type_code).lower().strip()

    # Direct match
    if code in PRODUCT_TYPES_CACHE:
        return PRODUCT_TYPES_CACHE[code]

    # Try variants
    for variant in [code.replace('-', ''), code.replace('_', '-'), code.replace('_', '')]:
        if variant in PRODUCT_TYPES_CACHE:
            return PRODUCT_TYPES_CACHE[variant]

    # Partial match
    for key, type_id in PRODUCT_TYPES_CACHE.items():
        if code in key or key in code:
            return type_id

    return None

COUNTRY_MAP = {
    'usa': 'US', 'united states': 'US', 'us': 'US', 'u.s.': 'US',
    'switzerland': 'CH', 'suisse': 'CH', 'swiss': 'CH',
    'france': 'FR', 'french': 'FR',
    'germany': 'DE', 'german': 'DE', 'deutschland': 'DE',
    'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB', 'british': 'GB',
    'singapore': 'SG', 'japan': 'JP', 'hong kong': 'HK', 'canada': 'CA',
    'australia': 'AU', 'netherlands': 'NL', 'holland': 'NL',
    'estonia': 'EE', 'malta': 'MT', 'seychelles': 'SC',
    'dubai': 'AE', 'uae': 'AE', 'emirates': 'AE',
    'israel': 'IL', 'china': 'CN', 'taiwan': 'TW',
    'ireland': 'IE', 'luxembourg': 'LU', 'panama': 'PA',
    'gibraltar': 'GI', 'bermuda': 'BM', 'bahamas': 'BS',
    'cayman': 'KY', 'bvi': 'VG', 'liechtenstein': 'LI',
    'austria': 'AT', 'belgium': 'BE', 'spain': 'ES',
    'italy': 'IT', 'portugal': 'PT', 'poland': 'PL',
    'czech': 'CZ', 'hungary': 'HU', 'romania': 'RO',
    'bulgaria': 'BG', 'croatia': 'HR', 'slovenia': 'SI',
    'slovakia': 'SK', 'lithuania': 'LT', 'latvia': 'LV',
    'cyprus': 'CY', 'greece': 'GR', 'finland': 'FI',
    'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
    'iceland': 'IS', 'new zealand': 'NZ', 'south korea': 'KR',
    'korea': 'KR', 'india': 'IN', 'brazil': 'BR',
    'mexico': 'MX', 'argentina': 'AR', 'chile': 'CL',
    'colombia': 'CO', 'peru': 'PE', 'venezuela': 'VE',
    'south africa': 'ZA', 'nigeria': 'NG', 'kenya': 'KE',
    'egypt': 'EG', 'morocco': 'MA', 'turkey': 'TR',
    'russia': 'RU', 'ukraine': 'UA', 'vietnam': 'VN',
    'thailand': 'TH', 'indonesia': 'ID', 'malaysia': 'MY',
    'philippines': 'PH',
}


def safe_str(val, max_len=None):
    """Convert to string safely"""
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if s in ['-', '', 'nan', 'N/A', 'n/a', 'None', 'none', 'null', 'NULL']:
        return None
    if max_len and len(s) > max_len:
        s = s[:max_len-3] + '...'
    return s


def safe_url(val):
    """Clean URL"""
    s = safe_str(val)
    if not s:
        return None
    s = s.split()[0]  # Take first URL if multiple
    if not s.startswith('http'):
        s = 'https://' + s
    return s[:500]


def safe_int(val):
    """Convert to int safely"""
    if val is None or pd.isna(val):
        return None
    try:
        return int(float(val))
    except:
        return None


def safe_float(val):
    """Convert to float safely"""
    if val is None or pd.isna(val):
        return None
    try:
        return float(val)
    except:
        return None


def get_country_code(val):
    """Extract country code"""
    s = safe_str(val)
    if not s:
        return None
    s_lower = s.lower().strip()

    # Direct match
    for name, code in COUNTRY_MAP.items():
        if name == s_lower or name in s_lower:
            return code

    # Already a code?
    if len(s) == 2 and s.isalpha():
        return s.upper()

    return None


def make_slug(name):
    """Create URL-friendly slug"""
    if not name:
        return None
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower())
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug[:100] if slug else None


def get_col(row, *names):
    """Get column value by trying multiple names"""
    for name in names:
        if name in row.index:
            val = row.get(name)
            if val is not None and not pd.isna(val):
                return val
    return None


def extract_product(row, sheet_type=None):
    """Extract product data from Excel row"""
    name = safe_str(get_col(row, 'Name', 'Nom', 'Product'))
    if not name:
        return None

    # Determine type
    type_principal = safe_str(get_col(row, 'Type Principal', 'Type'))
    product_type = sheet_type
    if type_principal:
        type_lower = type_principal.lower()
        if 'cex' in type_lower or 'exchange' in type_lower:
            product_type = 'cex'
        elif 'dex' in type_lower:
            product_type = 'dex'
        elif 'hardware' in type_lower or 'hw' in type_lower:
            product_type = 'hardware-wallet'
        elif 'software' in type_lower or 'sw' in type_lower or 'hot' in type_lower:
            product_type = 'software-wallet'
        elif 'defi' in type_lower or 'lending' in type_lower or 'yield' in type_lower:
            product_type = 'defi'
        elif 'bank' in type_lower or 'neobank' in type_lower:
            product_type = 'crypto-bank'
        elif 'backup' in type_lower or 'seed' in type_lower or 'steel' in type_lower:
            product_type = 'backup'
        elif 'bridge' in type_lower:
            product_type = 'bridge'
        elif 'staking' in type_lower:
            product_type = 'staking'

    # Social links
    social = {}
    tw = safe_str(get_col(row, 'Twitter', 'X'))
    if tw:
        if tw.startswith('@'):
            tw = tw[1:]
        if not tw.startswith('http'):
            social['twitter'] = f'https://twitter.com/{tw}'
        else:
            social['twitter'] = tw

    gh = safe_url(get_col(row, 'GitHub'))
    if gh:
        social['github'] = gh

    doc = safe_url(get_col(row, 'Documentation', 'Docs'))
    if doc:
        social['documentation'] = doc

    yt = safe_url(get_col(row, 'YouTube'))
    if yt:
        social['youtube'] = yt

    dc = safe_url(get_col(row, 'Discord'))
    if dc:
        social['discord'] = dc

    tg = safe_url(get_col(row, 'Telegram'))
    if tg:
        social['telegram'] = tg

    # Extra metadata - LIMIT to under 200 chars total (VARCHAR(200) constraint!)
    # Only store the most essential fields
    meta = {}

    year = safe_int(get_col(row, 'Année', 'Year', 'Founded'))
    if year and 1990 < year < 2030:
        meta['year'] = year

    # Only essential fields that fit in 200 chars
    brand = safe_str(get_col(row, 'Brand', 'Marque'), max_len=30)
    if brand:
        meta['brand'] = brand

    if product_type:
        meta['type'] = product_type[:20]

    kyc = safe_str(get_col(row, 'KYC'), max_len=15)
    if kyc and kyc.lower() not in ['variable', 'voir site']:
        meta['kyc'] = kyc

    custody = safe_str(get_col(row, 'Custody Type', 'Custody'), max_len=20)
    if custody and custody.lower() not in ['variable', 'voir site']:
        meta['custody'] = custody

    price = safe_str(get_col(row, 'Price'), max_len=20)
    if price and price.lower() not in ['variable', 'voir site']:
        meta['price'] = price

    opensource = safe_str(get_col(row, 'Open Source'), max_len=10)
    if opensource and opensource.lower() in ['yes', 'oui', 'true', 'no', 'non', 'partial']:
        meta['oss'] = opensource[:5]

    # Build product with ONLY valid database columns
    product = {
        'name': name,
        'slug': make_slug(name),
        'url': safe_url(get_col(row, 'Website', 'URL', 'Site')),
        'country_origin': get_country_code(get_col(row, 'Country', 'Pays')),
        'headquarters': safe_str(get_col(row, 'Siège Social', 'Headquarters', 'HQ'), max_len=197),
        'github_repo': safe_url(get_col(row, 'GitHub')),
        'social_links': social if social else None,
        'description': safe_str(get_col(row, 'Notes', 'Description'), max_len=197),
        'short_description': safe_str(get_col(row, 'Notes', 'Description'), max_len=97),
        'price_details': meta if meta else None,
        '_product_type_code': product_type,  # For type_id lookup later
    }

    # Clean None values
    return {k: v for k, v in product.items() if v is not None}


def load_all_excel():
    """Load ALL products from ALL sheets"""
    print("=" * 60)
    print("  CHARGEMENT DE TOUTES LES FEUILLES EXCEL")
    print("=" * 60)

    xl = pd.ExcelFile(EXCEL_FILE)
    all_products = {}  # name_lower -> product

    for sheet_name in xl.sheet_names:
        # Skip summary
        if 'RÉSUMÉ' in sheet_name or 'RESUME' in sheet_name:
            continue

        # Determine sheet type
        sheet_type = None
        for key, ptype in SHEET_TYPE_MAP.items():
            if key in sheet_name:
                sheet_type = ptype
                break

        print(f"\n>>> Feuille: {sheet_name}")

        try:
            df = pd.read_excel(xl, sheet_name=sheet_name)
            count = 0

            for _, row in df.iterrows():
                product = extract_product(row, sheet_type)
                if product and product.get('name'):
                    key = product['name'].lower()

                    # Merge with existing if present
                    if key in all_products:
                        existing = all_products[key]
                        for k, v in product.items():
                            if v is not None and (k not in existing or existing[k] is None):
                                existing[k] = v
                        # Merge social_links
                        if product.get('social_links') and existing.get('social_links'):
                            existing['social_links'].update(product['social_links'])
                        # Merge price_details
                        if product.get('price_details') and existing.get('price_details'):
                            existing['price_details'].update(product['price_details'])
                    else:
                        all_products[key] = product
                        count += 1

            print(f"    {count} nouveaux produits ({len(df)} lignes)")

        except Exception as e:
            print(f"    ERREUR: {e}")

    print(f"\n{'=' * 60}")
    print(f"  TOTAL: {len(all_products)} produits uniques")
    print(f"{'=' * 60}\n")

    return list(all_products.values())


def load_existing_products():
    """Load all existing products from Supabase"""
    print("Chargement des produits existants...")
    products = {}
    offset = 0

    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug&offset={offset}&limit=1000",
            headers=HEADERS, timeout=30
        )
        if resp.status_code != 200:
            print(f"  Erreur API: {resp.status_code}")
            break

        batch = resp.json()
        if not batch:
            break

        for p in batch:
            name_lower = p['name'].lower() if p.get('name') else None
            if name_lower:
                products[name_lower] = p
            if p.get('slug'):
                products[p['slug']] = p

        offset += 1000
        if len(batch) < 1000:
            break

    unique_ids = set(p['id'] for p in products.values())
    print(f"  {len(unique_ids)} produits existants dans Supabase")
    return products


def upsert_products(excel_products, existing):
    """Upsert all products - UPDATE if exists, INSERT if new"""
    print("\n" + "=" * 60)
    print("  SYNCHRONISATION VERS SUPABASE")
    print("=" * 60)

    updated = 0
    created = 0
    errors = 0

    for i, prod in enumerate(excel_products):
        name_lower = prod['name'].lower()
        slug = prod.get('slug')

        # Check if exists
        existing_prod = existing.get(name_lower) or existing.get(slug)

        # Prepare data
        data = {
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }

        # Add all non-null fields (ONLY valid database columns)
        for key in ['name', 'slug', 'url', 'country_origin', 'headquarters',
                    'github_repo', 'social_links', 'description', 'short_description',
                    'price_details']:
            if key in prod and prod[key] is not None:
                data[key] = prod[key]

        # Add type_id from product type code
        type_code = prod.get('_product_type_code')
        if type_code:
            type_id = get_type_id(type_code)
            if type_id:
                data['type_id'] = type_id

        # Truncate ALL string fields aggressively
        limits = {
            'name': 190,
            'slug': 100,
            'url': 190,
            'description': 190,
            'short_description': 95,
            'headquarters': 190,
            'github_repo': 190,
            'country_origin': 2,  # Country code only
        }
        for key, max_len in limits.items():
            if key in data and data[key]:
                val = str(data[key])
                if len(val) > max_len:
                    data[key] = val[:max_len-3] + '...' if max_len > 10 else val[:max_len]

        # Also truncate values inside social_links
        if 'social_links' in data and data['social_links']:
            for k, v in list(data['social_links'].items()):
                if v and len(str(v)) > 190:
                    data['social_links'][k] = str(v)[:187] + '...'

        # Truncate values inside price_details
        if 'price_details' in data and data['price_details']:
            for k, v in list(data['price_details'].items()):
                if isinstance(v, str) and len(v) > 490:
                    data['price_details'][k] = v[:487] + '...'

        try:
            if existing_prod:
                # UPDATE
                resp = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/products?id=eq.{existing_prod['id']}",
                    headers=HEADERS, json=data, timeout=15
                )
                if resp.status_code in [200, 204]:
                    updated += 1
                else:
                    errors += 1
                    if errors <= 5:
                        # Show field lengths for debugging
                        lens = {k: len(str(v)) for k, v in data.items() if v is not None}
                        print(f"  UPDATE error {prod['name'][:30]}: {resp.status_code}")
                        print(f"    Field lengths: {lens}")
            else:
                # INSERT (no created_at - Supabase handles it automatically)
                resp = requests.post(
                    f"{SUPABASE_URL}/rest/v1/products",
                    headers=HEADERS, json=data, timeout=15
                )
                if resp.status_code in [200, 201]:
                    created += 1
                    # Add to existing to avoid re-insert
                    result = resp.json()
                    if result and len(result) > 0:
                        existing[name_lower] = result[0]
                else:
                    errors += 1
                    if errors <= 5:
                        print(f"  INSERT error {prod['name']}: {resp.status_code} - {resp.text[:100]}")

        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  Exception {prod['name']}: {e}")

        # Progress
        if (i + 1) % 50 == 0:
            print(f"  Progress: {i+1}/{len(excel_products)} | +{created} crees | ~{updated} maj | !{errors} err")

        # Small delay to avoid rate limiting
        if (i + 1) % 100 == 0:
            time.sleep(0.5)

    print(f"\n{'=' * 60}")
    print(f"  RESULTAT FINAL:")
    print(f"    - {created} nouveaux produits crees")
    print(f"    - {updated} produits mis a jour")
    print(f"    - {errors} erreurs")
    print(f"{'=' * 60}")

    return created, updated, errors


def main():
    print("\n" + "=" * 60)
    print("  SAFESCORING - IMPORT EXCEL COMPLET")
    print("  Fichier: SAFE_CATALOGUE_v7 (4).xlsx")
    print("=" * 60 + "\n")

    if not EXCEL_FILE.exists():
        print(f"ERREUR: Fichier non trouve: {EXCEL_FILE}")
        return

    # Load product types for type_id lookup
    load_product_types()

    # Load all Excel data
    excel_products = load_all_excel()

    if not excel_products:
        print("Aucun produit trouve dans l'Excel!")
        return

    # Load existing products
    existing = load_existing_products()

    # Upsert all
    upsert_products(excel_products, existing)

    print("\nTermine!")


if __name__ == "__main__":
    main()
