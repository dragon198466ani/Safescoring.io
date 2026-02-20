#!/usr/bin/env python3
"""
Fix remaining products that failed to insert - uses upsert logic
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

EXCEL_FILE = Path(__file__).parent.parent / 'SAFE_CATALOGUE_v7.xlsx'

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
    'DeFi': 'Yield',
    'MPC Wallet': 'MPC Wallet',
    'CeFi Lending': 'CeFi Lending',
    'MultiSig': 'MultiSig',
    'Derivatives': 'Derivatives',
    'Tracker': 'Research',
    'Payment': 'Payment',
    'Other': None,
}


def slugify(name):
    if not name:
        return None
    slug = str(name).lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


def clean_url(url):
    if not url or pd.isna(url) or str(url).strip() in ['-', 'nan', '']:
        return None
    url = str(url).strip()
    if not url.startswith('http'):
        url = 'https://' + url
    return url


def clean_social_link(link, platform):
    if not link or pd.isna(link) or str(link).strip() in ['-', 'nan', '']:
        return None
    link = str(link).strip()
    if platform == 'twitter' and not link.startswith('http'):
        link = f'https://twitter.com/{link.lstrip("@")}'
    if platform == 'github' and not link.startswith('http'):
        link = f'https://github.com/{link}'
    return link


def main():
    print("=" * 64)
    print("  FIX REMAINING PRODUCTS & UPDATE TYPES")
    print("=" * 64)

    # Load product types
    print("\n📥 Chargement des types...")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code', headers=SUPABASE_HEADERS)
    types_by_code = {t['code']: t['id'] for t in r.json()} if r.status_code == 200 else {}
    print(f"   {len(types_by_code)} types chargés")

    # Load existing products
    print("\n📥 Chargement des produits existants...")
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

    products_by_slug = {p['slug']: p for p in all_products}
    products_by_name = {p['name'].lower(): p for p in all_products}
    print(f"   {len(all_products)} produits en base")

    # Load Excel data
    print("\n📖 Chargement Excel V7...")
    xl = pd.ExcelFile(EXCEL_FILE)
    df = pd.read_excel(xl, sheet_name='✅ À NOTER (986)')
    print(f"   {len(df)} lignes")

    # Process each product
    updates_needed = []
    inserts_needed = []

    for _, row in df.iterrows():
        if pd.isna(row.get('ID')) or pd.isna(row.get('Name')):
            continue

        name = str(row['Name']).strip()
        slug = slugify(name)

        # Skip if not relevant
        safe_useful = str(row.get('SAFE Score Utile?', '')).strip()
        if '❌' in safe_useful or 'PEU PERTINENT' in safe_useful.upper():
            continue

        # Get type
        prod_type = row.get('Type Principal')
        type_code = TYPE_MAPPING.get(str(prod_type).strip(), None) if pd.notna(prod_type) else None
        type_id = types_by_code.get(type_code) if type_code else None

        # Build social links
        social_links = {}
        twitter = clean_social_link(row.get('Twitter'), 'twitter')
        if twitter:
            social_links['twitter'] = twitter
        github = clean_social_link(row.get('GitHub'), 'github')
        if github:
            social_links['github'] = github
        youtube = clean_url(row.get('YouTube'))
        if youtube:
            social_links['youtube'] = youtube
        discord = clean_url(row.get('Discord'))
        if discord:
            social_links['discord'] = discord
        telegram = clean_url(row.get('Telegram'))
        if telegram:
            social_links['telegram'] = telegram
        docs = clean_url(row.get('Documentation'))
        if docs:
            social_links['documentation'] = docs

        existing = products_by_slug.get(slug) or products_by_name.get(name.lower())

        if existing:
            # Check if type_id needs update
            if type_id and existing.get('type_id') != type_id:
                updates_needed.append({
                    'id': existing['id'],
                    'name': name,
                    'type_id': type_id
                })
        else:
            # Need to insert
            inserts_needed.append({
                'name': name,
                'slug': slug,
                'url': clean_url(row.get('Website')),
                'type_id': type_id,
                'social_links': json.dumps(social_links) if social_links else None,
                'updated_at': datetime.now(timezone.utc).isoformat()
            })

    print(f"\n📊 Résultats:")
    print(f"   - Types à mettre à jour: {len(updates_needed)}")
    print(f"   - Produits à insérer: {len(inserts_needed)}")

    # Apply type updates
    if updates_needed:
        print(f"\n🔄 Mise à jour des types ({len(updates_needed)})...")
        success = 0
        for u in updates_needed:
            url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{u['id']}"
            resp = requests.patch(url, headers=SUPABASE_HEADERS, json={'type_id': u['type_id']})
            if resp.status_code in [200, 204]:
                success += 1
        print(f"   ✅ {success}/{len(updates_needed)} types mis à jour")

    # Insert remaining products one by one to handle conflicts
    if inserts_needed:
        print(f"\n➕ Insertion des produits restants ({len(inserts_needed)})...")
        success = 0
        skipped = 0
        for item in inserts_needed:
            url = f"{SUPABASE_URL}/rest/v1/products"
            headers = {**SUPABASE_HEADERS, 'Prefer': 'return=minimal'}
            resp = requests.post(url, headers=headers, json=item)
            if resp.status_code in [200, 201]:
                success += 1
            elif resp.status_code == 409:  # Duplicate
                skipped += 1
            else:
                print(f"   ❌ {item['name']}: {resp.status_code}")
        print(f"   ✅ {success} insérés, {skipped} doublons ignorés")

    # Final count
    print("\n📊 Vérification finale...")
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id', headers={**SUPABASE_HEADERS, 'Prefer': 'count=exact'})
    count = len(r.json())
    print(f"   Total produits en base: {count}")

    print("\n✅ Terminé!")


if __name__ == "__main__":
    main()
