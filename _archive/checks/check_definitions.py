#!/usr/bin/env python3
"""Vérifie les définitions des types de produits dans Supabase"""
import requests
import json

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

r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*&order=id.asc', headers=headers)
types = r.json() if r.status_code == 200 else []

for t in types:
    code = t.get('code', '')
    name = t.get('name', '')
    desc = t.get('description', '') or ''
    adv = t.get('advantages', '') or ''
    dis = t.get('disadvantages', '') or ''
    
    print(f"=== {code} ===")
    print(f"Name: {name}")
    print(f"Desc: {desc[:150]}..." if len(desc) > 150 else f"Desc: {desc}")
    print(f"Adv: {adv[:100]}..." if len(adv) > 100 else f"Adv: {adv}")
    print(f"Dis: {dis[:100]}..." if len(dis) > 100 else f"Dis: {dis}")
    print()
