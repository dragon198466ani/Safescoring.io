#!/usr/bin/env python3
"""Check norms table structure"""
import requests

from config_helper import SUPABASE_URL, SUPABASE_KEY, get_supabase_headers

headers = get_supabase_headers()

# Get one norm to see all columns
resp = requests.get(
    f'{SUPABASE_URL}/rest/v1/norms?limit=1',
    headers=headers
)

if resp.status_code == 200:
    data = resp.json()
    if data:
        print('STRUCTURE TABLE NORMS')
        print('=' * 70)
        for key, value in data[0].items():
            val_type = type(value).__name__
            val_preview = str(value)[:60] if value else 'NULL'
            print(f'{key:30} | {val_type:10} | {val_preview}')
else:
    print(f'Error: {resp.status_code}')
    print(resp.text)
