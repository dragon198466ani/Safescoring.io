#!/usr/bin/env python3
"""Check for empty or missing URLs"""

import requests
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.translate_supabase_data import SUPABASE_URL, SUPABASE_KEY

h = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

r = requests.get(
    f'{SUPABASE_URL}/rest/v1/products?select=id,name,url',
    headers=h
)

prods = r.json()
empty = [p for p in prods if not p.get('url') or p.get('url') == '']

print(f'Total products: {len(prods)}')
print(f'Empty/Missing URLs: {len(empty)}')

if empty:
    print('\nProducts without URL:')
    for p in empty:
        print(f"  - {p['name']}")
else:
    print('\n✅ All products have URLs!')
