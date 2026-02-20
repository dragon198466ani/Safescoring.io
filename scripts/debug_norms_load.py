#!/usr/bin/env python3
"""Debug norms loading"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, get_supabase_headers
import requests

headers = get_supabase_headers()
print("Testing norms query...")
print(f"URL: {SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&limit=5")

r = requests.get(
    f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&limit=5',
    headers=headers
)

print(f"Status: {r.status_code}")
print(f"Response: {r.text[:500]}")

if r.status_code == 200:
    data = r.json()
    print(f"\nGot {len(data)} norms")
    for n in data:
        print(f"  - {n.get('code')}: {n.get('title', '')[:50]}")
else:
    print(f"Error: {r.text}")

# Try count
print("\nCounting norms...")
headers2 = get_supabase_headers()
headers2['Prefer'] = 'count=exact'
r2 = requests.get(
    f'{SUPABASE_URL}/rest/v1/norms?select=id',
    headers=headers2
)
print(f"Count header: {r2.headers.get('content-range')}")
