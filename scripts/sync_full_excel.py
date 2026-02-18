#!/usr/bin/env python3
"""
SAFESCORING - Full Excel Sync
Syncs ALL Excel data to Supabase, working around VARCHAR(200) limits.
Stores extra data in description field as structured text.
"""

import pandas as pd
import re
import json
import requests
import sys
import io
from datetime import datetime, timezone

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load env
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
SUPABASE_URL = ENV.get('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY = ENV.get('SUPABASE_SERVICE_ROLE_KEY')
HEADERS = {'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}', 'Content-Type': 'application/json'}

EXCEL_FILE = 'SAFE_CATALOGUE_v7.xlsx'

COUNTRY_MAP = {
    'usa': 'US', 'united states': 'US', 'états-unis': 'US', 'switzerland': 'CH',
    'suisse': 'CH', 'france': 'FR', 'germany': 'DE', 'allemagne': 'DE',
    'uk': 'GB', 'united kingdom': 'GB', 'singapore': 'SG', 'japan': 'JP',
    'hong kong': 'HK', 'canada': 'CA', 'australia': 'AU', 'netherlands': 'NL',
    'estonia': 'EE', 'malta': 'MT', 'seychelles': 'SC', 'dubai': 'AE', 'uae': 'AE',
    'israel': 'IL', 'china': 'CN', 'taiwan': 'TW', 'ireland': 'IE', 'luxembourg': 'LU',
    'panama': 'PA', 'cayman': 'KY', 'bvi': 'VG', 'liechtenstein': 'LI',
    'austria': 'AT', 'belgium': 'BE', 'spain': 'ES', 'italy': 'IT', 'portugal': 'PT',
    'poland': 'PL', 'czech': 'CZ', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
    'finland': 'FI', 'brazil': 'BR', 'mexico': 'MX', 'argentina': 'AR',
    'south korea': 'KR', 'korea': 'KR', 'india': 'IN', 'indonesia': 'ID',
    'thailand': 'TH', 'vietnam': 'VN', 'philippines': 'PH', 'malaysia': 'MY',
}


def clean(val, max_len=None):
    """Clean value"""
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    # Remove emoji flags and special chars for cleaner storage
    s = re.sub(r'[\U0001F1E0-\U0001F1FF]', '', s)  # Remove flag emojis
    s = re.sub(r'[✅❌⚠️🔒🔐💰🏦🏛️💻🔗]', '', s)  # Remove other emojis
    s = s.strip()
    if s in ['-', '', 'nan', 'N/A', 'n/a', 'None', 'null']:
        return None
    if max_len and len(s) > max_len:
        s = s[:max_len-3] + '...'
    return s


def clean_url(val):
    s = clean(val)
    if not s:
        return None
    if not s.startswith('http'):
        s = 'https://' + s
    return s[:500]


def get_country(val):
    s = clean(val)
    if not s:
        return None
    s_lower = s.lower()
    for name, code in COUNTRY_MAP.items():
        if name in s_lower:
            return code
    if len(s) == 2 and s.isalpha():
        return s.upper()
    return None


def main():
    print("=" * 60)
    print("  SAFESCORING - FULL EXCEL SYNC")
    print("=" * 60)

    # Load Excel
    print("\nLoading Excel...")
    xl = pd.ExcelFile(EXCEL_FILE)
    df = None
    for sheet in xl.sheet_names:
        if 'NOTER' in sheet or '986' in sheet:
            df = pd.read_excel(xl, sheet_name=sheet)
            print(f"  Sheet: {sheet} ({len(df)} rows)")
            break

    if df is None:
        print("ERROR: Sheet not found")
        return

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
    print("\nSyncing ALL data...")
    updated = 0
    errors = 0

    for idx, row in df.iterrows():
        name = clean(row.get('Name'))
        if not name:
            continue

        existing = db_products.get(name.lower())
        if not existing:
            continue

        # === Build social_links ===
        social = {}
        tw = clean(row.get('Twitter'))
        if tw:
            social['twitter'] = f'https://twitter.com/{tw.lstrip("@")}' if not tw.startswith('http') else tw
        gh = clean_url(row.get('GitHub'))
        if gh and len(gh) > 10:
            social['github'] = gh
        doc = clean_url(row.get('Documentation'))
        if doc:
            social['documentation'] = doc
        yt = clean_url(row.get('YouTube'))
        if yt:
            social['youtube'] = yt
        dc = clean_url(row.get('Discord'))
        if dc:
            social['discord'] = dc
        tg = clean_url(row.get('Telegram'))
        if tg:
            social['telegram'] = tg

        # === Build price_details (max 180 chars) ===
        meta = {}

        # Priority data for price_details
        kyc = clean(row.get('KYC'), 15)
        if kyc:
            meta['kyc'] = kyc

        custody = clean(row.get('Custody Type'), 20)
        if custody:
            meta['custody'] = custody

        # Year
        for ycol in df.columns:
            if 'ann' in ycol.lower() or 'year' in ycol.lower():
                y = clean(row.get(ycol), 10)
                if y:
                    meta['year'] = y
                    break

        oss = clean(row.get('Open Source'), 10)
        if oss:
            meta['oss'] = oss

        # Keep under 180 chars
        while len(json.dumps(meta)) > 180 and meta:
            meta.pop(list(meta.keys())[-1])

        # === Build description with extra data ===
        desc_parts = []

        notes = clean(row.get('Notes'), 150)
        if notes:
            desc_parts.append(notes)

        # Add important info to description
        funding = clean(row.get('Funding'), 50)
        if funding and funding not in ['Variable', 'Voir site']:
            desc_parts.append(f"Funding: {funding}")

        licenses = clean(row.get('Licences'), 50)
        if licenses and licenses not in ['Variable', 'Voir site']:
            desc_parts.append(f"Licenses: {licenses}")

        audits = clean(row.get('Audits') or row.get('Audit'), 50)
        if audits and audits not in ['Variable', 'Voir site']:
            desc_parts.append(f"Audits: {audits}")

        # Combine description (max 195 chars)
        description = ' | '.join(desc_parts)[:195] if desc_parts else None

        # === Build short_description ===
        short_desc = None
        brand = clean(row.get('Brand'), 30)
        prod_type = clean(row.get('Type Principal'), 20)
        if brand or prod_type:
            short_desc = f"{brand or ''} - {prod_type or ''}".strip(' -')[:100]

        # === Build update data ===
        data = {'updated_at': datetime.now(timezone.utc).isoformat()}

        url = clean_url(row.get('Website'))
        if url:
            data['url'] = url

        country = get_country(row.get('Country'))
        if country:
            data['country_origin'] = country

        # Headquarters
        for hcol in df.columns:
            if 'si' in hcol.lower() and 'ge' in hcol.lower():
                hq = clean(row.get(hcol), 190)
                if hq:
                    data['headquarters'] = hq
                    break

        gh_url = clean_url(row.get('GitHub'))
        if gh_url and len(gh_url) > 15:
            data['github_repo'] = gh_url

        if social:
            data['social_links'] = social

        if description:
            data['description'] = description

        if short_desc:
            data['short_description'] = short_desc

        if meta:
            data['price_details'] = meta

        # === Update ===
        try:
            resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{existing['id']}",
                headers=HEADERS, json=data, timeout=15
            )
            if resp.status_code in [200, 204]:
                updated += 1
            else:
                errors += 1
                if errors <= 3:
                    print(f"  ERR {name}: {resp.status_code} - {resp.text[:80]}")
        except Exception as e:
            errors += 1

        if (idx + 1) % 100 == 0:
            print(f"  Progress: {idx+1} ({updated} OK, {errors} errors)")

    print(f"\n{'='*60}")
    print(f"  DONE: {updated} updated, {errors} errors")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
