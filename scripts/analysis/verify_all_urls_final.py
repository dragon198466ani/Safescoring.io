#!/usr/bin/env python3
"""Final verification of all product URLs - skip closed services"""

import requests
import time
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.translate_supabase_data import SUPABASE_URL, SUPABASE_KEY

def check_url_content(url):
    """Check how much content can be scraped from URL"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    try:
        r = requests.get(url, timeout=15, headers=headers)
        if r.status_code == 200:
            return len(r.text)
        return 0
    except:
        return -1

def main():
    h = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    
    # Get all products
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,url,description&order=name.asc',
        headers=h
    )
    products = r.json()
    
    print(f'🔍 Verifying {len(products)} products (skipping closed services)...')
    print('=' * 70)
    
    ok = []
    low = []
    very_low = []
    errors = []
    skipped_closed = []
    skipped_no_url = []
    
    for i, p in enumerate(products):
        name = p['name']
        url = p.get('url')
        desc = p.get('description') or ''
        
        # Skip closed services
        if '[CLOSED]' in desc:
            print(f'[{i+1:3}/{len(products)}] {name[:30]:<30} ⏭️ CLOSED')
            skipped_closed.append(name)
            continue
        
        # Skip no URL
        if not url:
            print(f'[{i+1:3}/{len(products)}] {name[:30]:<30} ⚠️ NO URL')
            skipped_no_url.append(name)
            continue
        
        print(f'[{i+1:3}/{len(products)}] {name[:30]:<30}', end=' ')
        
        content_len = check_url_content(url)
        
        if content_len < 0:
            print(f'❌ ERROR')
            errors.append((name, url))
        elif content_len < 1000:
            print(f'🔴 {content_len:>6} chars VERY LOW')
            very_low.append((name, url, content_len))
        elif content_len < 5000:
            print(f'🟡 {content_len:>6} chars LOW')
            low.append((name, url, content_len))
        else:
            print(f'✅ {content_len:>6} chars')
            ok.append((name, url, content_len))
        
        time.sleep(0.1)
    
    # Summary
    print('\n' + '=' * 70)
    print('📊 FINAL SUMMARY')
    print('=' * 70)
    print(f'✅ OK (>= 5000 chars):     {len(ok):>3} products')
    print(f'🟡 LOW (1000-5000):        {len(low):>3} products')
    print(f'🔴 VERY LOW (< 1000):      {len(very_low):>3} products')
    print(f'❌ ERRORS:                 {len(errors):>3} products')
    print(f'⏭️ SKIPPED (closed):       {len(skipped_closed):>3} products')
    print(f'⚠️ SKIPPED (no URL):       {len(skipped_no_url):>3} products')
    print(f'─' * 40)
    print(f'📦 TOTAL:                  {len(products):>3} products')
    
    # Success rate (excluding closed and no URL)
    active_products = len(products) - len(skipped_closed) - len(skipped_no_url)
    good_products = len(ok) + len(low)
    if active_products > 0:
        rate = good_products * 100 / active_products
        print(f'\n🎯 Success rate: {good_products}/{active_products} = {rate:.1f}%')
    
    if very_low:
        print(f'\n🔴 VERY LOW content products ({len(very_low)}):')
        for name, url, chars in sorted(very_low, key=lambda x: x[2]):
            print(f'   {chars:>5} chars | {name[:25]:<25} | {url[:40]}')
    
    if errors:
        print(f'\n❌ ERROR products ({len(errors)}):')
        for name, url in errors:
            print(f'   {name[:30]:<30} | {url[:40]}')

if __name__ == '__main__':
    main()
