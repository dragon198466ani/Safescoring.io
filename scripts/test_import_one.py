#!/usr/bin/env python3
"""Test import for one product"""
import pandas as pd
import json
import sys
import re
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

# Import functions from main script
from import_all_excel_complete import (
    load_product_types, get_type_id, extract_product, PRODUCT_TYPES_CACHE
)

# Load product types
load_product_types()

# Load Excel
xl = pd.ExcelFile(EXCEL_FILE)
df = pd.read_excel(xl, sheet_name=xl.sheet_names[1])

for _, row in df.iterrows():
    name = str(row.get('Name', '')).strip()
    if name == 'Billfodl':
        prod = extract_product(row, 'backup')

        # Build data like upsert_products does
        data = {'updated_at': datetime.now(timezone.utc).isoformat()}
        for key in ['name', 'slug', 'url', 'country_origin', 'headquarters',
                    'github_repo', 'social_links', 'description', 'short_description',
                    'price_details']:
            if key in prod and prod[key] is not None:
                data[key] = prod[key]

        type_code = prod.get('_product_type_code')
        if type_code:
            type_id = get_type_id(type_code)
            if type_id:
                data['type_id'] = type_id

        # Truncation
        limits = {'name': 190, 'slug': 100, 'url': 190, 'description': 190,
                  'short_description': 95, 'headquarters': 190, 'github_repo': 190,
                  'country_origin': 2}
        for key, max_len in limits.items():
            if key in data and data[key]:
                val = str(data[key])
                if len(val) > max_len:
                    data[key] = val[:max_len-3] + '...' if max_len > 10 else val[:max_len]

        if 'social_links' in data and data['social_links']:
            for k, v in list(data['social_links'].items()):
                if v and len(str(v)) > 190:
                    data['social_links'][k] = str(v)[:187] + '...'

        if 'price_details' in data and data['price_details']:
            for k, v in list(data['price_details'].items()):
                if isinstance(v, str) and len(v) > 490:
                    data['price_details'][k] = v[:487] + '...'

        print('=== DATA TO SEND ===')
        for k, v in data.items():
            if isinstance(v, dict):
                print(f'{k}: dict({len(json.dumps(v))} chars)')
                for sk, sv in v.items():
                    print(f'  .{sk}: {len(str(sv))} - {str(sv)[:60]}')
            else:
                print(f'{k}: {len(str(v))} - {str(v)[:60]}')

        print(f'\nTotal JSON: {len(json.dumps(data))} chars\n')

        # Try to send
        resp = requests.patch(
            f'{SUPABASE_URL}/rest/v1/products?name=eq.Billfodl',
            headers=HEADERS,
            json=data,
            timeout=15
        )
        print(f'Status: {resp.status_code}')
        print(f'Response: {resp.text[:500]}')
        break
