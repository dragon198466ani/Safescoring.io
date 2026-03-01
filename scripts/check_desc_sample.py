#!/usr/bin/env python3
"""Quick check if template descriptions were fixed."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'core'))
from config import SUPABASE_URL, SUPABASE_KEY
import requests

HR = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
BASE = SUPABASE_URL + '/rest/v1'

# Products that had bad descriptions
ids = [50, 116, 305, 672, 845, 1186, 1447, 1348, 609, 183]
for pid in ids:
    r = requests.get(f'{BASE}/products?id=eq.{pid}&select=id,name,description,type_id', headers=HR)
    if not r.json():
        continue
    p = r.json()[0]
    desc = (p.get('description') or '')[:180]
    print(f'[{pid}] {p["name"]} (type={p["type_id"]})')
    print(f'  {desc}')
    print()
