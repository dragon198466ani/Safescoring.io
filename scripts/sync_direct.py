#!/usr/bin/env python3
"""
SAFESCORING - Direct Sync (no config module dependency)
"""

import pandas as pd
import re
import json
import requests
import sys
import io
from datetime import datetime, timezone
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load .env directly
def load_env():
    env = {}
    for path in ['.env', 'config/.env']:
        try:
            with open(path) as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        k, v = line.strip().split('=', 1)
                        env[k] = v
        except:
            pass
    return env

ENV = load_env()
SUPABASE_URL = ENV.get('NEXT_PUBLIC_SUPABASE_URL', '')
SERVICE_KEY = ENV.get('SUPABASE_SERVICE_ROLE_KEY', '')

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}

EXCEL_FILE = 'SAFE_CATALOGUE_v7.xlsx'

COUNTRY_MAP = {
    'usa': 'US', 'united states': 'US', 'switzerland': 'CH', 'france': 'FR',
    'germany': 'DE', 'uk': 'GB', 'singapore': 'SG', 'japan': 'JP',
    'hong kong': 'HK', 'canada': 'CA', 'australia': 'AU', 'netherlands': 'NL',
    'estonia': 'EE', 'malta': 'MT', 'seychelles': 'SC', 'dubai': 'AE',
    'israel': 'IL', 'china': 'CN', 'taiwan': 'TW', 'ireland': 'IE',
    'luxembourg': 'LU', 'panama': 'PA', 'cayman': 'KY', 'bvi': 'VG',
}


def safe_str(val, max_len=None):
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if s in ['-', '', 'nan', 'N/A', 'n/a', 'None']:
        return None
    if max_len and len(s) > max_len:
        s = s[:max_len-3] + '...'
    return s


def safe_url(val):
    s = safe_str(val)
    if not s:
        return None
    if not s.startswith('http'):
        s = 'https://' + s
    return s[:500]


def get_country(val):
    s = safe_str(val)
    if not s:
        return None
    for name, code in COUNTRY_MAP.items():
        if name in s.lower():
            return code
    return None


def main():
    print("=" * 50)
    print("SAFESCORING - DIRECT SYNC")
    print("=" * 50)

    if not SERVICE_KEY:
        print("ERROR: No SERVICE_KEY found!")
        return

    print(f"Supabase URL: {SUPABASE_URL[:50]}...")
    print(f"Service Key: {SERVICE_KEY[:30]}...")

    # Load Excel
    print("\nLoading Excel...")
    df = pd.read_excel(EXCEL_FILE, sheet_name=0)  # First sheet
    print(f"  Sheets available, using first one with {len(df)} rows")

    # Try to find the right sheet
    xl = pd.ExcelFile(EXCEL_FILE)
    for sheet in xl.sheet_names:
        if 'NOTER' in sheet or '986' in sheet:
            df = pd.read_excel(xl, sheet_name=sheet)
            print(f"  Using sheet: {sheet} ({len(df)} rows)")
            break

    # Load Supabase products
    print("\nLoading Supabase products...")
    db_products = {}
    offset = 0
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug&offset={offset}&limit=1000",
            headers=HEADERS, timeout=30
        )
        if resp.status_code != 200:
            print(f"  Error loading: {resp.status_code}")
            break
        batch = resp.json()
        if not batch:
            break
        for p in batch:
            db_products[p['name'].lower()] = p
        offset += 1000
        if len(batch) < 1000:
            break
    print(f"  {len(db_products)} products in DB")

    # Sync
    print("\nSyncing products...")
    updated = 0
    errors = 0

    for idx, row in df.iterrows():
        name = safe_str(row.get('Name'))
        if not name:
            continue

        existing = db_products.get(name.lower())
        if not existing:
            continue

        # Build social links
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

        # Build metadata for price_details (limited to ~180 chars due to VARCHAR(200))
        # Priority: year, kyc, custody, licenses, audits
        meta = {}

        # Priority fields that fit in 180 chars
        priority_cols = [
            ('KYC', 'kyc', 20),
            ('Custody Type', 'custody', 20),
            ('Licences', 'licenses', 30),
            ('Audits', 'audits', 20),
            ('Open Source', 'open_source', 15),
            ('Funding', 'funding', 20),
        ]

        # Year first
        for ycol in ['Année', 'Ann�e', 'Year']:
            if ycol in row.index:
                y = safe_str(row.get(ycol), max_len=15)
                if y:
                    meta['year'] = y
                    break

        # Add priority fields while keeping under 180 chars
        for col, key, max_len in priority_cols:
            v = safe_str(row.get(col), max_len=max_len)
            if v:
                test_meta = {**meta, key: v}
                if len(json.dumps(test_meta)) < 180:
                    meta[key] = v

        # Build update data
        data = {'updated_at': datetime.now(timezone.utc).isoformat()}

        url = safe_url(row.get('Website'))
        if url:
            data['url'] = url

        country = get_country(row.get('Country'))
        if country:
            data['country_origin'] = country

        # Headquarters - try different column names
        for hcol in ['Siège Social', 'Si�ge Social', 'Headquarters']:
            if hcol in row.index:
                hq = safe_str(row.get(hcol), max_len=190)
                if hq:
                    data['headquarters'] = hq
                    break

        gh_url = safe_url(row.get('GitHub'))
        if gh_url:
            data['github_repo'] = gh_url

        if social:
            data['social_links'] = social

        desc = safe_str(row.get('Notes'), max_len=190)
        if desc:
            data['description'] = desc

        if meta:
            data['price_details'] = meta

        # Update
        try:
            resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{existing['id']}",
                headers=HEADERS, json=data, timeout=15
            )
            if resp.status_code in [200, 204]:
                updated += 1
            else:
                errors += 1
                if errors <= 5:
                    print(f"  ERR {name}: {resp.status_code} - {resp.text[:100]}")
        except Exception as e:
            errors += 1
            if errors <= 3:
                print(f"  EXC {name}: {e}")

        if (idx + 1) % 100 == 0:
            print(f"  Progress: {idx+1} processed ({updated} OK, {errors} errors)")

    print(f"\n{'='*50}")
    print(f"DONE: {updated} updated, {errors} errors")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
