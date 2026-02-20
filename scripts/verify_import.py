#!/usr/bin/env python3
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, CONFIG
import requests

SERVICE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')
HEADERS = {'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}', 'Prefer': 'count=exact'}

# Count total products
resp = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id', headers=HEADERS)
total = resp.headers.get('content-range', '0/0').split('/')[-1]

# Count products with type_id
resp2 = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id&type_id=not.is.null', headers=HEADERS)
with_type = resp2.headers.get('content-range', '0/0').split('/')[-1]

# Sample products
HEADERS2 = {'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'}
resp3 = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=name,type_id&limit=10&type_id=not.is.null', headers=HEADERS2)

with open('verify_result.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total produits en base: {total}\n")
    f.write(f"Produits avec type_id: {with_type}\n\n")
    f.write("Exemples:\n")
    for p in resp3.json():
        f.write(f"  - {p['name']}: type_id={p['type_id']}\n")

print("Resultat ecrit dans verify_result.txt")
