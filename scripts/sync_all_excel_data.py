#!/usr/bin/env python3
"""
SAFESCORING.IO - Synchronisation COMPLETE du Catalogue Excel
Synchronise TOUTES les colonnes Excel vers Supabase.
"""

import pandas as pd
import sys
import os
import re
import json
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.config import SUPABASE_URL, CONFIG
import requests

# Service role key for full access
SERVICE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

EXCEL_FILE = Path(__file__).parent.parent / 'SAFE_CATALOGUE_v7.xlsx'

# Country name to ISO code mapping
COUNTRY_MAP = {
    'usa': 'US', 'united states': 'US', 'états-unis': 'US',
    'switzerland': 'CH', 'suisse': 'CH',
    'france': 'FR',
    'germany': 'DE', 'allemagne': 'DE',
    'uk': 'GB', 'united kingdom': 'GB', 'royaume-uni': 'GB', 'england': 'GB',
    'singapore': 'SG', 'singapour': 'SG',
    'japan': 'JP', 'japon': 'JP',
    'south korea': 'KR', 'korea': 'KR', 'corée': 'KR',
    'hong kong': 'HK',
    'canada': 'CA',
    'australia': 'AU', 'australie': 'AU',
    'netherlands': 'NL', 'pays-bas': 'NL',
    'estonia': 'EE', 'estonie': 'EE',
    'malta': 'MT', 'malte': 'MT',
    'cayman islands': 'KY', 'cayman': 'KY', 'îles caïmans': 'KY',
    'seychelles': 'SC',
    'british virgin islands': 'VG', 'bvi': 'VG',
    'bahamas': 'BS',
    'dubai': 'AE', 'uae': 'AE', 'emirates': 'AE',
    'israel': 'IL',
    'china': 'CN', 'chine': 'CN',
    'taiwan': 'TW',
    'austria': 'AT', 'autriche': 'AT',
    'belgium': 'BE', 'belgique': 'BE',
    'ireland': 'IE', 'irlande': 'IE',
    'luxembourg': 'LU',
    'liechtenstein': 'LI',
    'panama': 'PA',
    'gibraltar': 'GI',
    'bermuda': 'BM', 'bermudes': 'BM',
    'decentralized': None, 'décentralisé': None, 'global': None,
}


def extract_country_code(country_str):
    """Extract ISO country code from string"""
    if not country_str or pd.isna(country_str):
        return None

    country_lower = str(country_str).lower().strip()

    # Direct lookup
    for name, code in COUNTRY_MAP.items():
        if name in country_lower:
            return code

    # If it looks like a 2-letter code already
    if len(country_lower) == 2 and country_lower.isalpha():
        return country_lower.upper()

    return None


def clean_url(url):
    """Clean and normalize URL"""
    if not url or pd.isna(url) or str(url).strip() in ['-', 'nan', '', 'N/A', 'n/a']:
        return None
    url = str(url).strip()
    if not url.startswith('http'):
        url = 'https://' + url
    return url


def clean_text(text, max_length=None):
    """Clean text field"""
    if not text or pd.isna(text) or str(text).strip() in ['-', 'nan', '', 'N/A', 'n/a']:
        return None
    result = str(text).strip()
    if max_length and len(result) > max_length:
        result = result[:max_length-3] + '...'
    return result


def slugify(name):
    """Convert name to URL-friendly slug"""
    if not name:
        return None
    slug = str(name).lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


def parse_countries_list(countries_str):
    """Parse countries list from string"""
    if not countries_str or pd.isna(countries_str):
        return []

    countries = []
    text = str(countries_str)

    # Split by common delimiters
    for part in re.split(r'[,;/\n]', text):
        code = extract_country_code(part)
        if code and code not in countries:
            countries.append(code)

    return countries


def load_excel_data():
    """Load all data from Excel"""
    print("📖 Chargement du catalogue Excel...")

    xl = pd.ExcelFile(EXCEL_FILE)
    df = pd.read_excel(xl, sheet_name='✅ À NOTER (986)')

    products = []

    for _, row in df.iterrows():
        prod_id = row.get('ID')
        if pd.isna(prod_id):
            continue

        name = clean_text(row.get('Name'))
        if not name:
            continue

        # Build social links
        social_links = {}
        if clean_url(row.get('Twitter')):
            twitter = str(row.get('Twitter')).strip()
            if not twitter.startswith('http'):
                twitter = f'https://twitter.com/{twitter.lstrip("@")}'
            social_links['twitter'] = twitter
        if clean_url(row.get('GitHub')):
            github = str(row.get('GitHub')).strip()
            if not github.startswith('http'):
                github = f'https://github.com/{github}'
            social_links['github'] = github
        if clean_url(row.get('YouTube')):
            social_links['youtube'] = clean_url(row.get('YouTube'))
        if clean_url(row.get('Discord')):
            social_links['discord'] = clean_url(row.get('Discord'))
        if clean_url(row.get('Telegram')):
            social_links['telegram'] = clean_url(row.get('Telegram'))
        if clean_url(row.get('Documentation')):
            social_links['documentation'] = clean_url(row.get('Documentation'))

        # Build extra metadata (stored in price_details)
        extra_data = {}

        # Year/Founded
        year = row.get('Année') if 'Année' in row.index else row.get('Ann�e')
        if year and not pd.isna(year):
            try:
                extra_data['founded_year'] = int(year)
            except:
                extra_data['founded_year'] = str(year)

        # Licenses
        licenses = clean_text(row.get('Licences') if 'Licences' in row.index else row.get('Licenses'))
        if licenses:
            extra_data['licenses'] = licenses

        # Employees
        employees = row.get('Employés') if 'Employés' in row.index else row.get('Employ�s')
        if employees and not pd.isna(employees):
            extra_data['employees'] = str(employees)

        # Funding
        funding = clean_text(row.get('Funding'))
        if funding:
            extra_data['funding'] = funding

        # Open Source
        opensource = clean_text(row.get('Open Source'))
        if opensource:
            extra_data['open_source'] = opensource

        # Audits
        audits = clean_text(row.get('Audits')) or clean_text(row.get('Audit'))
        if audits:
            extra_data['audits'] = audits

        # Volume/TVL
        volume = clean_text(row.get('Volume/TVL'))
        if volume:
            extra_data['volume_tvl'] = volume

        # Cryptos supported
        cryptos = clean_text(row.get('Cryptos'))
        if cryptos:
            extra_data['cryptos_supported'] = cryptos

        # Fees
        fees = clean_text(row.get('Frais') if 'Frais' in row.index else row.get('Fees'))
        if fees:
            extra_data['fees'] = fees

        # Security
        security = clean_text(row.get('Sécurité') if 'Sécurité' in row.index else row.get('S�curit�'))
        if security:
            extra_data['security_features'] = security

        # Platforms
        platforms = clean_text(row.get('Plateformes'))
        if platforms:
            extra_data['platforms'] = platforms

        # API
        api = clean_text(row.get('API'))
        if api:
            extra_data['api'] = api

        # Payment methods
        payment = clean_text(row.get('Paiement'))
        if payment:
            extra_data['payment_methods'] = payment

        # Programs (referral, etc)
        programs = clean_text(row.get('Programmes'))
        if programs:
            extra_data['programs'] = programs

        # Founders
        founders = clean_text(row.get('Fondateurs'))
        if founders:
            extra_data['founders'] = founders

        # Investors
        investors = clean_text(row.get('Investisseurs'))
        if investors:
            extra_data['investors'] = investors

        # Token
        token = clean_text(row.get('Token'))
        if token:
            extra_data['token'] = token

        # Support
        support = clean_text(row.get('Support'))
        if support:
            extra_data['support'] = support

        # Incidents
        incidents = clean_text(row.get('Incidents'))
        if incidents:
            extra_data['incidents'] = incidents

        # KYC
        kyc = clean_text(row.get('KYC'))
        if kyc:
            extra_data['kyc'] = kyc

        # Custody type
        custody = clean_text(row.get('Custody Type'))
        if custody:
            extra_data['custody_type'] = custody

        # Build product record
        product = {
            'excel_id': int(prod_id),
            'name': name,
            'slug': slugify(name),
            'url': clean_url(row.get('Website')),
            'brand': clean_text(row.get('Brand')),
            'country_origin': extract_country_code(row.get('Country')),
            'headquarters': clean_text(row.get('Siège Social') if 'Siège Social' in row.index else row.get('Si�ge Social'), max_length=195),
            'countries_operating': parse_countries_list(row.get('Pays Autorisés') if 'Pays Autorisés' in row.index else row.get('Pays Autoris�s')),
            'github_repo': clean_url(row.get('GitHub')),
            'social_links': social_links,
            'description': clean_text(row.get('Notes'), max_length=195),  # varchar(200)
            'short_description': clean_text(row.get('Notes'), max_length=100) if row.get('Notes') else None,
            'price_details': extra_data if extra_data else None,
        }

        products.append(product)

    print(f"✅ {len(products)} produits chargés")
    return products


def load_supabase_products():
    """Load existing products from Supabase"""
    print("\n📥 Chargement produits Supabase...")

    all_products = []
    offset = 0
    limit = 1000

    while True:
        url = f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug&offset={offset}&limit={limit}"
        resp = requests.get(url, headers=HEADERS)

        if resp.status_code != 200:
            print(f"❌ Erreur: {resp.status_code}")
            break

        batch = resp.json()
        if not batch:
            break

        all_products.extend(batch)
        offset += limit

        if len(batch) < limit:
            break

    # Create lookup by name and slug
    products_by_name = {}
    for p in all_products:
        name_lower = p['name'].lower().strip()
        products_by_name[name_lower] = p
        if p.get('slug'):
            products_by_name[p['slug']] = p

    print(f"   {len(all_products)} produits en base")
    return products_by_name


def sync_products(excel_products, supabase_products):
    """Sync all Excel data to Supabase"""
    print("\n🔄 Synchronisation complète...")

    updated = 0
    errors = 0

    for prod in excel_products:
        name_lower = prod['name'].lower().strip()
        slug = prod['slug']

        # Find existing product
        existing = supabase_products.get(name_lower) or supabase_products.get(slug)

        if not existing:
            continue  # Skip products not in DB

        product_id = existing['id']

        # Build update data
        update_data = {
            'url': prod['url'],
            'country_origin': prod['country_origin'],
            'headquarters': prod['headquarters'],
            'countries_operating': prod['countries_operating'] if prod['countries_operating'] else [],
            'github_repo': prod['github_repo'],
            'social_links': prod['social_links'] if prod['social_links'] else {},
            'description': prod['description'],
            'short_description': prod.get('short_description'),
            'price_details': prod['price_details'],
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }

        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}

        # Update product
        url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}"
        resp = requests.patch(url, headers=HEADERS, json=update_data)

        if resp.status_code in [200, 204]:
            updated += 1
        else:
            errors += 1
            if errors <= 5:
                print(f"   ❌ {prod['name']}: {resp.status_code} - {resp.text[:100]}")

    print(f"\n✅ Mis à jour: {updated}")
    if errors:
        print(f"❌ Erreurs: {errors}")

    return updated, errors


def main():
    print("=" * 60)
    print("  SAFESCORING - SYNC COMPLET EXCEL -> SUPABASE")
    print("=" * 60)

    if not SERVICE_KEY:
        print("❌ SUPABASE_SERVICE_ROLE_KEY non configuré!")
        return

    # Load data
    excel_products = load_excel_data()
    supabase_products = load_supabase_products()

    # Sync
    updated, errors = sync_products(excel_products, supabase_products)

    # Summary
    print("\n" + "=" * 60)
    print("  RÉSUMÉ")
    print("=" * 60)
    print(f"  Produits Excel: {len(excel_products)}")
    print(f"  Produits mis à jour: {updated}")
    print(f"  Erreurs: {errors}")
    print("=" * 60)


if __name__ == "__main__":
    main()
