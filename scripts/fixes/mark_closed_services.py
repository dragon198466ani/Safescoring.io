#!/usr/bin/env python3
"""Mark closed services in Supabase"""

import requests
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.translate_supabase_data import SUPABASE_URL, SUPABASE_KEY, HEADERS

# Closed/defunct services
CLOSED_SERVICES = {
    'BlockFi Card': 'Service closed in 2023 (bankruptcy)',
    'TenX Card': 'Service closed in 2020',
    'Paycent Card': 'Service discontinued',
    'Hegic': 'Project inactive since 2023',
    'Ren Bridge': 'Service sunset in 2023',
    'Carbon Wallet': 'Service discontinued',
    'Bolero Music': 'Project inactive',
    'HashWallet': 'Product discontinued',
    'Bleap Card': 'Service not launched',
}

def main():
    # Use same headers as working scripts
    get_headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    
    patch_headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    print('🚫 Marking closed services in Supabase')
    print('=' * 70)
    
    # Get ALL products first
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name,description,security_status",
        headers=get_headers
    )
    
    if r.status_code != 200:
        print(f'❌ Error fetching products: {r.status_code} - {r.text[:100]}')
        return
    
    all_products = {p['name']: p for p in r.json()}
    print(f'📦 Found {len(all_products)} products')
    
    marked = 0
    for name, reason in CLOSED_SERVICES.items():
        print(f'  {name:<25} ', end='')
        
        if name in all_products:
            product = all_products[name]
            
            # Mark as closed in description and security_status
            desc = product.get('description') or ''
            if '[CLOSED]' not in desc:
                desc = f'[CLOSED] {reason}. ' + desc
            
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}",
                headers=patch_headers,
                json={'description': desc}
            )
            
            if r.status_code in [200, 204]:
                print(f'✅ {reason}')
                marked += 1
            else:
                print(f'❌ DB error: {r.status_code}')
        else:
            print(f'⚠️ Not found in database')
    
    print(f'\n✅ {marked} services marked as closed')

if __name__ == '__main__':
    main()
