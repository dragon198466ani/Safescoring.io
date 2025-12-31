#!/usr/bin/env python3
"""Check all product URLs for scraping content quality"""

import requests
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.translate_supabase_data import SUPABASE_URL, SUPABASE_KEY, HEADERS

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
        return -1  # Error

def main():
    h = {**HEADERS}
    h.pop('Prefer', None)
    
    # Get all products with URLs
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?url=not.is.null&select=id,name,url&order=name.asc',
        headers=h
    )
    products = r.json()
    
    print(f'🔍 Checking {len(products)} products for URL content...')
    print('=' * 70)
    
    low_content = []  # < 5000 chars
    errors = []       # Failed to fetch
    ok = []           # >= 5000 chars
    
    for i, p in enumerate(products):
        name = p['name']
        url = p['url']
        
        # Progress
        print(f'[{i+1}/{len(products)}] {name[:30]:<30}', end=' ')
        
        content_len = check_url_content(url)
        
        if content_len < 0:
            print(f'❌ ERROR')
            errors.append((name, url, 'Connection error'))
        elif content_len < 1000:
            print(f'🔴 {content_len} chars - VERY LOW')
            low_content.append((name, url, content_len, 'VERY LOW'))
        elif content_len < 5000:
            print(f'🟡 {content_len} chars - LOW')
            low_content.append((name, url, content_len, 'LOW'))
        else:
            print(f'✅ {content_len} chars')
            ok.append((name, url, content_len))
        
        # Small delay to avoid rate limiting
        time.sleep(0.1)
    
    # Summary
    print('\n' + '=' * 70)
    print('📊 SUMMARY')
    print('=' * 70)
    print(f'✅ OK (>= 5000 chars): {len(ok)} products')
    print(f'⚠️ Low content (< 5000 chars): {len(low_content)} products')
    print(f'❌ Errors: {len(errors)} products')
    
    if low_content:
        print('\n🔴 Products with LOW CONTENT (need URL fix):')
        print('-' * 70)
        for name, url, chars, severity in sorted(low_content, key=lambda x: x[2]):
            print(f'  {severity:8} {chars:>6} chars | {name[:25]:<25} | {url[:40]}')
    
    if errors:
        print('\n❌ Products with ERRORS:')
        print('-' * 70)
        for name, url, error in errors:
            print(f'  {name[:30]:<30} | {url[:40]}')
    
    # Save results to file
    with open('url_check_results.txt', 'w', encoding='utf-8') as f:
        f.write('LOW CONTENT PRODUCTS\n')
        f.write('=' * 70 + '\n')
        for name, url, chars, severity in sorted(low_content, key=lambda x: x[2]):
            f.write(f'{name}\t{url}\t{chars}\n')
    
    print(f'\n📄 Results saved to url_check_results.txt')

if __name__ == '__main__':
    main()
