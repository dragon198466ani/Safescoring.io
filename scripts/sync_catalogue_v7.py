#!/usr/bin/env python3
"""
SAFESCORING.IO - Synchronisation Complète du Catalogue V7
Met à jour TOUS les produits depuis SAFE_CATALOGUE_v7.xlsx vers Supabase.

Usage:
    python sync_catalogue_v7.py --dry-run    # Aperçu des changements
    python sync_catalogue_v7.py --apply      # Appliquer les mises à jour
"""

import pandas as pd
import sys
import os
import re
import json
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, SUPABASE_HEADERS
import requests

# Fichier Excel source
EXCEL_FILE = Path(__file__).parent.parent / 'SAFE_CATALOGUE_v7.xlsx'

# Mapping des types Excel vers les codes database
TYPE_MAPPING = {
    'CEX': 'CEX',
    'SW Mobile': 'SW Mobile',
    'HW Cold': 'HW Cold',
    'HW Wallet': 'HW Cold',
    'Bkp Physical': 'Bkp Physical',
    'Liq Staking': 'Liq Staking',
    'DEX': 'DEX',
    'Crypto Bank': 'Crypto Bank',
    'Lending': 'Lending',
    'SW Browser': 'SW Browser',
    'Stablecoin': 'Stablecoin',
    'Card': 'Card',
    'Yield': 'Yield',
    'RWA': 'RWA',
    'Bridges': 'Bridges',
    'Fiat Gateway': 'Fiat Gateway',
    'Perps': 'Perps',
    'Bkp Digital': 'Bkp Digital',
    'Options': 'Options',
    'Insurance': 'Insurance',
    'Custody': 'Custody',
    'SW Wallet': 'SW Mobile',
    'L2': 'L2',
    'SW Desktop': 'SW Desktop',
    'DEX Agg': 'DEX Agg',
    'DeFi': 'Yield',  # Generic DeFi -> Yield
    'MPC Wallet': 'MPC Wallet',
    'CeFi Lending': 'CeFi Lending',
    'MultiSig': 'MultiSig',
    'Derivatives': 'Derivatives',
    'Tracker': 'Research',
    'Payment': 'Payment',
    'Other': None,  # Will skip type assignment
}

# Mapping des catégories
CATEGORY_MAPPING = {
    'HW Cold': 'Hardware',
    'HW Wallet': 'Hardware',
    'SW Mobile': 'Software',
    'SW Browser': 'Software',
    'SW Desktop': 'Software',
    'SW Wallet': 'Software',
    'MPC Wallet': 'Software',
    'MultiSig': 'Software',
    'Bkp Physical': 'Backup',
    'Bkp Digital': 'Backup',
    'CEX': 'Exchange',
    'DEX': 'Exchange',
    'DEX Agg': 'Exchange',
    'Crypto Bank': 'Financial',
    'Card': 'Financial',
    'Custody': 'Financial',
    'CeFi Lending': 'Financial',
    'Fiat Gateway': 'Financial',
    'Lending': 'DeFi',
    'Yield': 'DeFi',
    'Liq Staking': 'DeFi',
    'Perps': 'DeFi',
    'Options': 'DeFi',
    'Insurance': 'DeFi',
    'Derivatives': 'DeFi',
    'DeFi': 'DeFi',
    'Bridges': 'Infrastructure',
    'L2': 'Infrastructure',
    'Stablecoin': 'Asset',
    'RWA': 'Asset',
}


def slugify(name):
    """Convert product name to URL-friendly slug"""
    if not name:
        return None
    slug = str(name).lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


def clean_url(url):
    """Clean and normalize URL"""
    if not url or pd.isna(url) or str(url).strip() in ['-', 'nan', '']:
        return None
    url = str(url).strip()
    if not url.startswith('http'):
        url = 'https://' + url
    return url


def clean_social_link(link, platform):
    """Clean social media links"""
    if not link or pd.isna(link) or str(link).strip() in ['-', 'nan', '']:
        return None
    link = str(link).strip()

    # Twitter cleanup
    if platform == 'twitter':
        if not link.startswith('http'):
            link = f'https://twitter.com/{link.lstrip("@")}'

    # GitHub cleanup
    if platform == 'github':
        if not link.startswith('http'):
            link = f'https://github.com/{link}'

    return link


def extract_country_code(country_str):
    """Extract ISO country code from emoji country string"""
    if not country_str or pd.isna(country_str):
        return None

    country_str = str(country_str).strip()

    # Common mappings
    country_map = {
        'USA': 'US',
        'Switzerland': 'CH',
        'France': 'FR',
        'Germany': 'DE',
        'UK': 'GB',
        'United Kingdom': 'GB',
        'Singapore': 'SG',
        'Japan': 'JP',
        'South Korea': 'KR',
        'Hong Kong': 'HK',
        'Canada': 'CA',
        'Australia': 'AU',
        'Netherlands': 'NL',
        'Estonia': 'EE',
        'Malta': 'MT',
        'Cayman Islands': 'KY',
        'Seychelles': 'SC',
        'British Virgin Islands': 'VG',
        'Decentralised': None,
        'Décentralisé': None,
        'Global': None,
    }

    for name, code in country_map.items():
        if name.lower() in country_str.lower():
            return code

    return None


def load_excel_catalogue():
    """Load all products from Excel catalogue V7"""
    print("📖 Chargement du catalogue Excel V7...")

    xl = pd.ExcelFile(EXCEL_FILE)
    all_products = []

    # Sheets to process (only "À NOTER" products)
    sheets_config = [
        ('✅ À NOTER (986)', None),  # Main sheet with all relevant products
        ('🏦 Crypto Banks (50)', 'Crypto Bank'),
        ('🔐 HW Wallets (81)', 'HW Cold'),
        ('🏛️ CEX (119)', 'CEX'),
        ('💻 SW Wallets (153)', 'SW Mobile'),
        ('💰 DeFi (286)', None),
        ('🔒 Backups (74)', None),
    ]

    seen_ids = set()

    for sheet_name, default_type in sheets_config:
        try:
            df = pd.read_excel(xl, sheet_name=sheet_name)
            print(f"   📋 {sheet_name}: {len(df)} lignes")

            for _, row in df.iterrows():
                prod_id = row.get('ID')
                if pd.isna(prod_id) or prod_id in seen_ids:
                    continue

                seen_ids.add(prod_id)

                # Get product type
                prod_type = row.get('Type Principal', default_type)
                if pd.isna(prod_type):
                    prod_type = default_type

                # Skip if not relevant for SAFE Score
                safe_useful = str(row.get('SAFE Score Utile?', '')).strip()
                if '❌' in safe_useful or 'PEU PERTINENT' in safe_useful.upper():
                    continue

                # Build product record
                product = {
                    'excel_id': int(prod_id),
                    'name': str(row.get('Name', '')).strip(),
                    'brand': str(row.get('Brand', '')).strip() if pd.notna(row.get('Brand')) else None,
                    'type_code': TYPE_MAPPING.get(str(prod_type).strip(), None) if prod_type else None,
                    'type_raw': str(prod_type).strip() if prod_type else None,
                    'custody_type': str(row.get('Custody Type', '')).strip() if pd.notna(row.get('Custody Type')) else None,
                    'kyc': str(row.get('KYC', '')).strip() if pd.notna(row.get('KYC')) else None,
                    'country': str(row.get('Country', '')).strip() if pd.notna(row.get('Country')) else None,
                    'website': clean_url(row.get('Website')),
                    'twitter': clean_social_link(row.get('Twitter'), 'twitter'),
                    'github': clean_social_link(row.get('GitHub'), 'github'),
                    'youtube': clean_url(row.get('YouTube')),
                    'discord': clean_url(row.get('Discord')),
                    'telegram': clean_url(row.get('Telegram')),
                    'documentation': clean_url(row.get('Documentation')),
                    'price_eur': float(row.get('Price')) if pd.notna(row.get('Price')) else None,
                    'trading_fees': str(row.get('Trading Fees', '')).strip() if pd.notna(row.get('Trading Fees')) else None,
                    'licenses': str(row.get('Licenses', '')).strip() if pd.notna(row.get('Licenses')) else None,
                }

                if product['name']:
                    all_products.append(product)

        except Exception as e:
            print(f"   ⚠️ Erreur sheet {sheet_name}: {e}")

    print(f"\n✅ Total produits chargés: {len(all_products)}")
    return all_products


def load_supabase_products():
    """Load existing products from Supabase"""
    print("\n📥 Chargement des produits Supabase...")

    all_products = []
    offset = 0
    limit = 1000

    while True:
        url = f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,social_links,price_eur&offset={offset}&limit={limit}"
        resp = requests.get(url, headers=SUPABASE_HEADERS)

        if resp.status_code != 200:
            print(f"   ❌ Erreur: {resp.status_code}")
            break

        batch = resp.json()
        if not batch:
            break

        all_products.extend(batch)
        offset += limit

        if len(batch) < limit:
            break

    # Create lookup by name (lowercase)
    products_by_name = {}
    for p in all_products:
        name_lower = p['name'].lower().strip()
        products_by_name[name_lower] = p
        # Also add slug-based lookup
        if p.get('slug'):
            products_by_name[p['slug']] = p

    print(f"   {len(all_products)} produits en base")
    return products_by_name


def load_product_types():
    """Load product types from Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,category"
    resp = requests.get(url, headers=SUPABASE_HEADERS)

    if resp.status_code == 200:
        types = resp.json()
        return {t['code']: t for t in types}
    return {}


def prepare_updates(excel_products, supabase_products, product_types):
    """Compare and prepare updates"""
    print("\n🔄 Préparation des mises à jour...")

    updates = []
    inserts = []
    skipped = []

    for prod in excel_products:
        name_lower = prod['name'].lower().strip()
        slug = slugify(prod['name'])

        # Find existing product
        existing = supabase_products.get(name_lower) or supabase_products.get(slug)

        # Build social links JSON
        social_links = {}
        if prod.get('twitter'):
            social_links['twitter'] = prod['twitter']
        if prod.get('github'):
            social_links['github'] = prod['github']
        if prod.get('youtube'):
            social_links['youtube'] = prod['youtube']
        if prod.get('discord'):
            social_links['discord'] = prod['discord']
        if prod.get('telegram'):
            social_links['telegram'] = prod['telegram']
        if prod.get('documentation'):
            social_links['documentation'] = prod['documentation']

        # Determine custody
        is_custodial = None
        if prod.get('custody_type'):
            custody = prod['custody_type'].lower()
            if 'custodial' in custody and 'non' not in custody:
                is_custodial = True
            elif 'non-custodial' in custody or 'non custodial' in custody:
                is_custodial = False

        # Build update/insert data
        data = {
            'name': prod['name'],
            'slug': slug,
            'url': prod.get('website'),
            'social_links': social_links if social_links else None,
            'price_eur': prod.get('price_eur'),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }

        # Get type_id if we have a valid type code
        if prod.get('type_code') and prod['type_code'] in product_types:
            data['type_id'] = product_types[prod['type_code']]['id']

        if existing:
            # Update existing product
            data['id'] = existing['id']

            # Only update if something changed
            needs_update = False
            if prod.get('website') and existing.get('url') != prod.get('website'):
                needs_update = True
            if social_links and existing.get('social_links') != social_links:
                needs_update = True
            if prod.get('price_eur') and existing.get('price_eur') != prod.get('price_eur'):
                needs_update = True
            if 'type_id' in data:
                needs_update = True

            if needs_update:
                updates.append(data)
            else:
                skipped.append(prod['name'])
        else:
            # New product to insert
            inserts.append(data)

    print(f"   📝 Mises à jour: {len(updates)}")
    print(f"   ➕ Insertions: {len(inserts)}")
    print(f"   ⏭️ Ignorés (pas de changement): {len(skipped)}")

    return updates, inserts


def apply_updates(updates, inserts, dry_run=True):
    """Apply updates and inserts to Supabase"""

    if dry_run:
        print("\n🔍 MODE DRY-RUN - Aperçu des changements:\n")

        print("=== MISES À JOUR ===")
        for u in updates[:20]:
            print(f"   📝 {u['name']}")
            if u.get('url'):
                print(f"      URL: {u['url']}")
            if u.get('social_links'):
                print(f"      Social: {list(u['social_links'].keys())}")
        if len(updates) > 20:
            print(f"   ... et {len(updates) - 20} autres")

        print("\n=== INSERTIONS ===")
        for i in inserts[:20]:
            print(f"   ➕ {i['name']} ({i.get('url', 'pas de site')})")
        if len(inserts) > 20:
            print(f"   ... et {len(inserts) - 20} autres")

        return

    # Apply updates
    print(f"\n🔄 Application de {len(updates)} mises à jour...")
    success_updates = 0

    for update in updates:
        prod_id = update.pop('id')
        url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{prod_id}"

        # Convert social_links to JSON string for update
        if update.get('social_links'):
            update['social_links'] = json.dumps(update['social_links'])

        resp = requests.patch(url, headers=SUPABASE_HEADERS, json=update)
        if resp.status_code in [200, 204]:
            success_updates += 1
        else:
            print(f"   ❌ Erreur update {update.get('name')}: {resp.status_code} - {resp.text[:100]}")

    print(f"   ✅ {success_updates}/{len(updates)} mises à jour réussies")

    # Apply inserts
    if inserts:
        print(f"\n➕ Insertion de {len(inserts)} nouveaux produits...")
        batch_size = 50
        success_inserts = 0

        for i in range(0, len(inserts), batch_size):
            batch = inserts[i:i+batch_size]

            # Convert social_links to JSON string for insert
            for item in batch:
                if item.get('social_links'):
                    item['social_links'] = json.dumps(item['social_links'])

            url = f"{SUPABASE_URL}/rest/v1/products"
            headers = {**SUPABASE_HEADERS, 'Prefer': 'return=minimal'}
            resp = requests.post(url, headers=headers, json=batch)

            if resp.status_code in [200, 201]:
                success_inserts += len(batch)
            else:
                print(f"   ❌ Erreur batch {i//batch_size}: {resp.status_code} - {resp.text[:200]}")

        print(f"   ✅ {success_inserts}/{len(inserts)} insertions réussies")


def link_product_types(excel_products, supabase_products, product_types, dry_run=True):
    """Link products to their types in product_type_mapping table"""
    print("\n🔗 Mise à jour des types de produits...")

    # Get existing mappings
    url = f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary"
    resp = requests.get(url, headers=SUPABASE_HEADERS)
    existing_mappings = {}
    if resp.status_code == 200:
        for m in resp.json():
            existing_mappings[m['product_id']] = m

    mappings_to_add = []

    for prod in excel_products:
        name_lower = prod['name'].lower().strip()
        slug = slugify(prod['name'])

        existing = supabase_products.get(name_lower) or supabase_products.get(slug)
        if not existing:
            continue

        product_id = existing['id']
        type_code = prod.get('type_code')

        if type_code and type_code in product_types:
            type_id = product_types[type_code]['id']

            # Check if mapping already exists
            if product_id not in existing_mappings:
                mappings_to_add.append({
                    'product_id': product_id,
                    'type_id': type_id,
                    'is_primary': True
                })

    print(f"   📝 Mappings à ajouter: {len(mappings_to_add)}")

    if dry_run:
        for m in mappings_to_add[:10]:
            print(f"      {m['product_id']} -> type {m['type_id']}")
        if len(mappings_to_add) > 10:
            print(f"      ... et {len(mappings_to_add) - 10} autres")
        return

    # Apply mappings
    if mappings_to_add:
        batch_size = 50
        success = 0

        for i in range(0, len(mappings_to_add), batch_size):
            batch = mappings_to_add[i:i+batch_size]
            url = f"{SUPABASE_URL}/rest/v1/product_type_mapping"
            headers = {**SUPABASE_HEADERS, 'Prefer': 'return=minimal'}
            resp = requests.post(url, headers=headers, json=batch)

            if resp.status_code in [200, 201]:
                success += len(batch)
            else:
                print(f"   ❌ Erreur batch: {resp.status_code}")

        print(f"   ✅ {success}/{len(mappings_to_add)} mappings ajoutés")


def generate_report(excel_products, updates, inserts):
    """Generate a sync report"""
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║          RAPPORT DE SYNCHRONISATION CATALOGUE V7             ║
╠══════════════════════════════════════════════════════════════╣
║  Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                              ║
╠══════════════════════════════════════════════════════════════╣
║  PRODUITS EXCEL                                              ║
║  ├─ Total chargés: {len(excel_products):>4}                                    ║
║  ├─ Types distincts: {len(set(p.get('type_raw') for p in excel_products if p.get('type_raw'))):>4}                                   ║
║  └─ Avec website: {sum(1 for p in excel_products if p.get('website')):>4}                                     ║
╠══════════════════════════════════════════════════════════════╣
║  ACTIONS                                                     ║
║  ├─ Mises à jour: {len(updates):>4}                                      ║
║  └─ Insertions: {len(inserts):>4}                                        ║
╚══════════════════════════════════════════════════════════════╝
"""
    return report


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Sync SAFE Catalogue V7 to Supabase')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    parser.add_argument('--apply', action='store_true', help='Apply changes to database')
    args = parser.parse_args()

    if not args.apply and not args.dry_run:
        args.dry_run = True

    print("=" * 64)
    print("  SAFESCORING - SYNCHRONISATION CATALOGUE V7")
    print("=" * 64)
    print(f"  Fichier: {EXCEL_FILE}")
    print(f"  Mode: {'APPLY' if args.apply else 'DRY RUN'}")
    print("=" * 64)

    # Load data
    excel_products = load_excel_catalogue()
    supabase_products = load_supabase_products()
    product_types = load_product_types()

    print(f"\n📊 Types disponibles: {len(product_types)}")

    # Prepare updates
    updates, inserts = prepare_updates(excel_products, supabase_products, product_types)

    # Show report
    print(generate_report(excel_products, updates, inserts))

    # Apply or preview
    apply_updates(updates, inserts, dry_run=not args.apply)

    # Link product types
    # Reload supabase products to get new IDs
    if args.apply:
        supabase_products = load_supabase_products()
    link_product_types(excel_products, supabase_products, product_types, dry_run=not args.apply)

    print("\n✅ Synchronisation terminée!")


if __name__ == "__main__":
    main()
