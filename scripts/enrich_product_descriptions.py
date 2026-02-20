#!/usr/bin/env python3
"""
Enrich product descriptions from real data.
Generates descriptions based on product type, category, and features.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import os
import json
import requests

# Use shared Supabase utilities for auto-pagination
from supabase_utils import fetch_all, fetch_by_ids, update_batch, get_headers, SUPABASE_URL

HEADERS = get_headers(return_minimal=True)

# Description templates by product type category
TEMPLATES = {
    'Hardware': {
        'default': "{name} is a hardware wallet designed for secure cryptocurrency storage. It provides offline key management and protection against digital threats.",
        'cold': "{name} is a cold storage hardware wallet that keeps your private keys completely offline, providing maximum security for long-term cryptocurrency holdings.",
    },
    'Exchange': {
        'default': "{name} is a cryptocurrency exchange platform that allows users to buy, sell, and trade digital assets.",
        'cex': "{name} is a centralized cryptocurrency exchange offering trading services for various digital assets with liquidity and order matching.",
        'dex': "{name} is a decentralized exchange (DEX) enabling peer-to-peer cryptocurrency trading without intermediaries.",
    },
    'DeFi': {
        'default': "{name} is a decentralized finance (DeFi) protocol operating on blockchain networks.",
        'lending': "{name} is a DeFi lending protocol that enables users to lend and borrow cryptocurrencies in a decentralized manner.",
        'yield': "{name} is a yield optimization protocol that helps users maximize returns on their cryptocurrency holdings.",
        'bridge': "{name} is a cross-chain bridge protocol enabling asset transfers between different blockchain networks.",
    },
    'Software': {
        'default': "{name} is a software wallet for managing and storing cryptocurrencies.",
        'mobile': "{name} is a mobile wallet application for managing cryptocurrencies on iOS and Android devices.",
        'browser': "{name} is a browser extension wallet for interacting with decentralized applications (dApps).",
        'desktop': "{name} is a desktop wallet application providing secure cryptocurrency management on your computer.",
    },
    'Service': {
        'default': "{name} is a cryptocurrency service provider.",
        'custody': "{name} is a custody service that securely stores digital assets on behalf of institutional and retail clients.",
        'card': "{name} is a crypto card service enabling users to spend cryptocurrencies at traditional merchants.",
    },
    'Infrastructure': {
        'default': "{name} provides blockchain infrastructure and services for the cryptocurrency ecosystem.",
        'oracle': "{name} is a blockchain oracle network providing external data to smart contracts.",
        'node': "{name} offers node infrastructure services for blockchain networks.",
    },
}

def get_description_template(type_name, type_category):
    """Get the appropriate description template based on type."""
    category = type_category or 'default'
    type_lower = (type_name or '').lower()

    # Determine template category
    if 'hardware' in type_lower or 'cold' in type_lower:
        templates = TEMPLATES.get('Hardware', {})
        if 'cold' in type_lower:
            return templates.get('cold', templates.get('default', ''))
        return templates.get('default', '')

    if 'exchange' in type_lower or 'cex' in type_lower or 'dex' in type_lower:
        templates = TEMPLATES.get('Exchange', {})
        if 'decentralized' in type_lower or 'dex' in type_lower:
            return templates.get('dex', templates.get('default', ''))
        if 'centralized' in type_lower or 'cex' in type_lower:
            return templates.get('cex', templates.get('default', ''))
        return templates.get('default', '')

    if 'defi' in type_lower or 'lending' in type_lower or 'protocol' in type_lower:
        templates = TEMPLATES.get('DeFi', {})
        if 'lending' in type_lower:
            return templates.get('lending', templates.get('default', ''))
        if 'yield' in type_lower or 'aggregator' in type_lower:
            return templates.get('yield', templates.get('default', ''))
        if 'bridge' in type_lower or 'cross' in type_lower:
            return templates.get('bridge', templates.get('default', ''))
        return templates.get('default', '')

    if 'wallet' in type_lower or 'mobile' in type_lower or 'browser' in type_lower:
        templates = TEMPLATES.get('Software', {})
        if 'mobile' in type_lower:
            return templates.get('mobile', templates.get('default', ''))
        if 'browser' in type_lower or 'extension' in type_lower:
            return templates.get('browser', templates.get('default', ''))
        if 'desktop' in type_lower:
            return templates.get('desktop', templates.get('default', ''))
        return templates.get('default', '')

    if 'card' in type_lower:
        return TEMPLATES.get('Service', {}).get('card', '')

    if 'custody' in type_lower:
        return TEMPLATES.get('Service', {}).get('custody', '')

    if 'oracle' in type_lower:
        return TEMPLATES.get('Infrastructure', {}).get('oracle', '')

    # Fallback based on category
    cat_templates = TEMPLATES.get(category, TEMPLATES.get('Software', {}))
    return cat_templates.get('default', "{name} is a cryptocurrency product.")


def generate_description(product, product_type):
    """Generate a description for a product based on its type and features."""
    name = product.get('name', 'Unknown')
    type_name = product_type.get('name', '') if product_type else ''
    type_category = product_type.get('category', '') if product_type else ''

    # Get template
    template = get_description_template(type_name, type_category)
    description = template.format(name=name)

    # Add location info if available
    hq = product.get('headquarters')
    if hq and hq not in ['Unknown', 'None', '']:
        description += f" Based in {hq}."

    return description


def generate_short_description(product, product_type):
    """Generate a short description (one sentence)."""
    name = product.get('name', 'Unknown')
    type_name = product_type.get('name', 'Cryptocurrency product') if product_type else 'Cryptocurrency product'
    return f"{name} - {type_name}"


def main():
    print("=" * 60)
    print("  ENRICHISSEMENT DES DESCRIPTIONS PRODUITS")
    print("=" * 60)

    # Get products with placeholder descriptions
    print("\nRecherche des produits avec descriptions manquantes...")

    # Get all products (auto-pagination handles >1000 rows)
    products = fetch_all(
        'products',
        select='id,name,slug,description,short_description,type_id,headquarters',
        verbose=True
    )

    print(f"Total produits: {len(products)}")

    # Get product types
    types_list = fetch_all('product_types', select='id,name,category')
    types = {t['id']: t for t in types_list}

    # Find products needing description updates
    to_update = []
    for p in products:
        desc = p.get('description', '')
        short_desc = p.get('short_description', '')

        # Check if placeholder or empty
        needs_desc = not desc or desc in ['Variable', 'N/A', 'TBD', ''] or len(desc) < 20
        needs_short = not short_desc or short_desc in ['Variable', 'N/A', 'TBD', ''] or len(short_desc) < 10

        if needs_desc or needs_short:
            product_type = types.get(p.get('type_id'))
            to_update.append({
                'product': p,
                'type': product_type,
                'needs_desc': needs_desc,
                'needs_short': needs_short
            })

    print(f"Produits a mettre a jour: {len(to_update)}")

    if not to_update:
        print("\nTous les produits ont deja des descriptions!")
        return

    # Update products
    updated = 0
    failed = 0

    for item in to_update:
        p = item['product']
        pt = item['type']

        update_data = {}

        if item['needs_desc']:
            update_data['description'] = generate_description(p, pt)

        if item['needs_short']:
            update_data['short_description'] = generate_short_description(p, pt)

        if update_data:
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/products?id=eq.{p["id"]}',
                headers=HEADERS,
                json=update_data
            )

            if r.status_code in [200, 204]:
                updated += 1
                print(f"  [OK] {p['name']}: {update_data.get('short_description', '')[:50]}")
            else:
                failed += 1
                print(f"  [FAIL] {p['name']}: {r.status_code}")

    print("\n" + "=" * 60)
    print(f"TERMINE: {updated} mis a jour, {failed} echecs")
    print("=" * 60)


if __name__ == '__main__':
    main()
