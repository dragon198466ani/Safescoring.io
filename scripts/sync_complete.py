#!/usr/bin/env python3
"""
SAFESCORING - Complete Excel Sync (After TEXT Migration)
Syncs ALL Excel data to Supabase without length limits.
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
    'south korea': 'KR', 'korea': 'KR', 'india': 'IN', 'brazil': 'BR',
}


def clean(val):
    """Clean value, remove emojis"""
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    # Remove emoji flags
    s = re.sub(r'[\U0001F1E0-\U0001F1FF]', '', s)
    s = re.sub(r'[✅❌⚠️🔒🔐💰🏦🏛️💻🔗⭐]', '', s)
    s = s.strip()
    if s in ['-', '', 'nan', 'N/A', 'n/a', 'None', 'null']:
        return None
    return s


def clean_url(val):
    s = clean(val)
    if not s or len(s) < 5:
        return None
    if not s.startswith('http'):
        s = 'https://' + s
    return s


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
    print("  SAFESCORING - COMPLETE EXCEL SYNC")
    print("  (After TEXT migration - no length limits)")
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
    print("\nSyncing ALL data (no limits)...")
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
        if gh:
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

        # === Build price_details with ALL metadata (no limit now!) ===
        meta = {}

        # Map all columns to metadata
        col_mapping = {
            'KYC': 'kyc',
            'Custody Type': 'custody_type',
            'Funding': 'funding',
            'Licences': 'licenses',
            'Open Source': 'open_source',
            'Audits': 'audits',
            'Audit': 'audit',
            'Volume/TVL': 'volume_tvl',
            'Cryptos': 'cryptos_supported',
            'Frais': 'fees',
            'Sécurité': 'security_features',
            'Plateformes': 'platforms',
            'API': 'api',
            'Paiement': 'payment_methods',
            'Programmes': 'programs',
            'Fondateurs': 'founders',
            'Investisseurs': 'investors',
            'Token': 'token',
            'Support': 'support',
            'Incidents': 'incidents',
            'Employés': 'employees',
            'Brand': 'brand',
            'Type Principal': 'product_type',
        }

        for col, key in col_mapping.items():
            # Handle encoding variants
            val = None
            for c in df.columns:
                if col.lower().replace('é', 'e').replace('ô', 'o') in c.lower().replace('�', 'e'):
                    val = row.get(c)
                    break
            if val is None:
                val = row.get(col)

            v = clean(val)
            if v and v not in ['Variable', 'Voir site', 'Voir site officiel']:
                meta[key] = v

        # Year
        for ycol in df.columns:
            if 'ann' in ycol.lower() or 'year' in ycol.lower():
                y = clean(row.get(ycol))
                if y:
                    meta['founded_year'] = y
                    break

        # === Build description ===
        desc_parts = []
        notes = clean(row.get('Notes'))
        if notes:
            desc_parts.append(notes)

        # Add important info
        if meta.get('funding') and meta['funding'] not in ['Non divulgué']:
            desc_parts.append(f"Funding: {meta['funding']}")
        if meta.get('licenses'):
            desc_parts.append(f"Licenses: {meta['licenses']}")
        if meta.get('audits'):
            desc_parts.append(f"Audits: {meta['audits']}")
        if meta.get('founders'):
            desc_parts.append(f"Founders: {meta['founders']}")

        description = ' | '.join(desc_parts) if desc_parts else None

        # === Build short_description ===
        brand = clean(row.get('Brand'))
        prod_type = clean(row.get('Type Principal'))
        short_desc = f"{brand or ''} - {prod_type or ''}".strip(' -') if brand or prod_type else None

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
                hq = clean(row.get(hcol))
                if hq:
                    data['headquarters'] = hq
                    break

        gh_url = clean_url(row.get('GitHub'))
        if gh_url:
            data['github_repo'] = gh_url

        if social:
            data['social_links'] = social

        if description:
            data['description'] = description

        if short_desc:
            data['short_description'] = short_desc

        if meta:
            data['price_details'] = meta  # Now stored as full JSON, no length limit!

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
                if errors <= 5:
                    print(f"  ERR {name}: {resp.status_code} - {resp.text[:100]}")
        except Exception as e:
            errors += 1
            if errors <= 3:
                print(f"  EXC {name}: {e}")

        if (idx + 1) % 100 == 0:
            print(f"  Progress: {idx+1} ({updated} OK, {errors} errors)")

    print(f"\n{'='*60}")
    print(f"  DONE: {updated} updated, {errors} errors")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
