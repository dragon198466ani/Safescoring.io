#!/usr/bin/env python3
import requests

config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description&order=id.asc', headers=headers)
types = r.json() if r.status_code == 200 else []

print('Types dans Supabase:')
for t in types:
    has_desc = 'OUI' if t.get('description') else 'NON'
    tid = t['id']
    code = t['code']
    print(f'  {tid:>2} | {code:<15} | Desc: {has_desc}')
