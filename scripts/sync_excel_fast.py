#!/usr/bin/env python3
"""
SAFESCORING - Sync Excel to Supabase (Fast & Robust)
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
}

EXCEL_FILE = Path(__file__).parent.parent / 'SAFE_CATALOGUE_v7.xlsx'

COUNTRY_MAP = {
    'usa': 'US', 'united states': 'US', 'switzerland': 'CH', 'suisse': 'CH',
    'france': 'FR', 'germany': 'DE', 'uk': 'GB', 'united kingdom': 'GB',
    'singapore': 'SG', 'japan': 'JP', 'hong kong': 'HK', 'canada': 'CA',
    'australia': 'AU', 'netherlands': 'NL', 'estonia': 'EE', 'malta': 'MT',
    'seychelles': 'SC', 'dubai': 'AE', 'uae': 'AE', 'israel': 'IL',
    'china': 'CN', 'taiwan': 'TW', 'ireland': 'IE', 'luxembourg': 'LU',
    'panama': 'PA', 'gibraltar': 'GI', 'bermuda': 'BM', 'bahamas': 'BS',
    'cayman': 'KY', 'bvi': 'VG', 'liechtenstein': 'LI', 'austria': 'AT',
}


def safe_str(val, max_len=None):
    """Convert to string safely, with optional truncation"""
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if s in ['-', '', 'nan', 'N/A', 'n/a', 'None']:
        return None
    if max_len and len(s) > max_len:
        s = s[:max_len-3] + '...'
    return s


def safe_url(val):
    """Clean URL"""
    s = safe_str(val)
    if not s:
        return None
    if not s.startswith('http'):
        s = 'https://' + s
    return s[:500]  # Max URL length


def get_country_code(val):
    """Extract country code"""
    s = safe_str(val)
    if not s:
        return None
    s_lower = s.lower()
    for name, code in COUNTRY_MAP.items():
        if name in s_lower:
            return code
    if len(s) == 2 and s.isalpha():
        return s.upper()
    return None


def load_excel():
    """Load Excel data"""
    print("Loading Excel...")
    df = pd.read_excel(EXCEL_FILE, sheet_name='✅ À NOTER (986)')

    products = []
    for _, row in df.iterrows():
        name = safe_str(row.get('Name'))
        if not name:
            continue

        # Social links
        social = {}
        tw = safe_str(row.get('Twitter'))
        if tw:
            social['twitter'] = f'https://twitter.com/{tw.lstrip("@")}' if not tw.startswith('http') else tw
        gh = safe_url(row.get('GitHub'))
        if gh:
            social['github'] = gh
        doc = safe_url(row.get('Documentation'))
        if doc:
            social['documentation'] = doc
        yt = safe_url(row.get('YouTube'))
        if yt:
            social['youtube'] = yt
        dc = safe_url(row.get('Discord'))
        if dc:
            social['discord'] = dc
        tg = safe_url(row.get('Telegram'))
        if tg:
            social['telegram'] = tg

        # Extra metadata (as dict, will be JSON serialized)
        meta = {}
        for col, key in [
            ('Année', 'year'), ('Licences', 'licenses'), ('Funding', 'funding'),
            ('Employés', 'employees'), ('Open Source', 'open_source'),
            ('Audits', 'audits'), ('Audit', 'audit'), ('Volume/TVL', 'volume'),
            ('Cryptos', 'cryptos'), ('Frais', 'fees'), ('Sécurité', 'security'),
            ('Plateformes', 'platforms'), ('API', 'api'), ('Paiement', 'payment'),
            ('Programmes', 'programs'), ('Fondateurs', 'founders'),
            ('Investisseurs', 'investors'), ('Token', 'token'),
            ('Support', 'support'), ('Incidents', 'incidents'),
            ('KYC', 'kyc'), ('Custody Type', 'custody'),
        ]:
            # Handle encoding variants
            val = row.get(col) if col in row.index else None
            if val is None:
                # Try encoded variant
                for c in row.index:
                    if col.lower().replace('é', 'e').replace('ô', 'o') in c.lower().replace('�', 'e'):
                        val = row.get(c)
                        break
            v = safe_str(val, max_len=200)
            if v:
                meta[key] = v

        products.append({
            'name': name,
            'slug': re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'),
            'url': safe_url(row.get('Website')),
            'country_origin': get_country_code(row.get('Country')),
            'headquarters': safe_str(row.get('Siège Social') if 'Siège Social' in row.index else row.get([c for c in row.index if 'Si' in c and 'ge' in c.lower()][0] if any('Si' in c and 'ge' in c.lower() for c in row.index) else None), max_len=190),
            'github_repo': safe_url(row.get('GitHub')),
            'social_links': social if social else None,
            'description': safe_str(row.get('Notes'), max_len=190),
            'price_details': meta if meta else None,
        })

    print(f"  {len(products)} products loaded")
    return products


def load_supabase_products():
    """Load products from Supabase"""
    print("Loading Supabase products...")
    products = {}
    offset = 0

    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug&offset={offset}&limit=1000",
            headers=HEADERS, timeout=30
        )
        if resp.status_code != 200:
            break
        batch = resp.json()
        if not batch:
            break
        for p in batch:
            products[p['name'].lower()] = p
            if p.get('slug'):
                products[p['slug']] = p
        offset += 1000
        if len(batch) < 1000:
            break

    print(f"  {len(set(p['id'] for p in products.values()))} products in DB")
    return products


def sync_all(excel_prods, db_prods):
    """Sync all products"""
    print("\nSyncing...")

    updated = 0
    errors = 0

    for i, prod in enumerate(excel_prods):
        # Find in DB
        existing = db_prods.get(prod['name'].lower()) or db_prods.get(prod['slug'])
        if not existing:
            continue

        # Build update
        data = {
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }

        if prod['url']:
            data['url'] = prod['url']
        if prod['country_origin']:
            data['country_origin'] = prod['country_origin']
        if prod['headquarters']:
            data['headquarters'] = prod['headquarters']
        if prod['github_repo']:
            data['github_repo'] = prod['github_repo']
        if prod['social_links']:
            data['social_links'] = prod['social_links']
        if prod['description']:
            data['description'] = prod['description']
        if prod['price_details']:
            data['price_details'] = prod['price_details']

        # Update
        try:
            resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{existing['id']}",
                headers=HEADERS, json=data, timeout=10
            )
            if resp.status_code in [200, 204]:
                updated += 1
            else:
                errors += 1
                if errors <= 3:
                    print(f"  Error {prod['name']}: {resp.status_code}")
        except Exception as e:
            errors += 1
            if errors <= 3:
                print(f"  Exception {prod['name']}: {e}")

        # Progress
        if (i + 1) % 100 == 0:
            print(f"  Progress: {i+1}/{len(excel_prods)} ({updated} OK, {errors} err)")

    print(f"\nDone: {updated} updated, {errors} errors")
    return updated, errors


def main():
    print("=" * 50)
    print("  SAFESCORING - EXCEL SYNC")
    print("=" * 50)

    excel = load_excel()
    db = load_supabase_products()
    sync_all(excel, db)


if __name__ == "__main__":
    main()
