#!/usr/bin/env python3
"""Debug generator load_data"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, get_supabase_headers
import requests

headers = get_supabase_headers()

# Replicate exactly what the generator does
print("Replicating generator norm loading...")

norms = []
offset = 0
while True:
    url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description&limit=1000&offset={offset}'
    print(f"  Fetching offset={offset}...")
    r = requests.get(url, headers=headers, timeout=60)
    print(f"    Status: {r.status_code}")

    if r.status_code != 200:
        print(f"    ERROR: {r.text[:200]}")
        break

    data = r.json() if r.status_code == 200 else []
    print(f"    Got {len(data)} norms")

    if not data:
        print("    Empty response - stopping")
        break

    norms.extend(data)
    offset += len(data)
    print(f"    Total so far: {len(norms)}")

    if len(data) < 1000:
        print("    Less than 1000 - stopping")
        break

print(f"\nFinal count: {len(norms)} norms loaded")
