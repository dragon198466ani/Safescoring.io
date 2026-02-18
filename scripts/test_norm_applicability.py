#!/usr/bin/env python3
"""Test norm_applicability table insert"""
import sys
sys.path.insert(0, 'src')
from core.config import SUPABASE_URL, get_supabase_headers
import requests

headers = get_supabase_headers('resolution=merge-duplicates', use_service_key=True)

# Get first type and first norm
print("Getting a type...")
r1 = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code&limit=1', headers=headers)
types = r1.json()
print(f"  Type: {types[0] if types else 'None'}")

print("Getting a norm...")
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code&limit=1', headers=headers)
norms = r2.json()
print(f"  Norm: {norms[0] if norms else 'None'}")

if types and norms:
    type_id = types[0]['id']
    norm_id = norms[0]['id']

    print(f"\nTesting insert: type_id={type_id}, norm_id={norm_id}")

    data = {
        'type_id': type_id,
        'norm_id': norm_id,
        'is_applicable': True,
        'applicability_reason': 'Test insert'
    }

    print(f"  Data: {data}")
    print(f"  URL: {SUPABASE_URL}/rest/v1/norm_applicability")

    r3 = requests.post(
        f'{SUPABASE_URL}/rest/v1/norm_applicability',
        headers=headers,
        json=data,
        timeout=30
    )

    print(f"  Status: {r3.status_code}")
    print(f"  Response: {r3.text[:500]}")

    if r3.status_code in [200, 201]:
        print("\n  SUCCESS - Insert works!")
    else:
        print("\n  FAILED - Check table schema")

        # Try to see table schema
        print("\nChecking table...")
        r4 = requests.get(f'{SUPABASE_URL}/rest/v1/norm_applicability?select=*&limit=1', headers=headers)
        print(f"  Select status: {r4.status_code}")
        print(f"  Response: {r4.text[:500]}")
