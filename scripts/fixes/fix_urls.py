#!/usr/bin/env python3
"""Fix product URLs - replace app.* with marketing URLs"""

import requests
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.translate_supabase_data import SUPABASE_URL, SUPABASE_KEY, HEADERS

fixes = [
    ('Aave', 'https://aave.com'),
    ('Balancer', 'https://balancer.fi'),
    ('Beefy Finance', 'https://beefy.com'),
    ('Optimism Bridge', 'https://optimism.io'),
    ('1inch Card', 'https://1inch.io'),
]

print('🔧 Fixing URLs in Supabase...')
print('=' * 50)

for name, new_url in fixes:
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/products?name=eq.{name}",
        headers=HEADERS,
        json={'url': new_url}
    )
    status = '✅' if r.status_code in [200, 204] else f'❌ {r.status_code}'
    print(f'  {status} {name} -> {new_url}')

print('\n✅ Done!')
