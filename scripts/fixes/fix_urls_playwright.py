#!/usr/bin/env python3
"""Fix URLs using Playwright for geo-blocked/anti-bot sites and mark closed services"""

import requests
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.translate_supabase_data import SUPABASE_URL, SUPABASE_KEY, HEADERS

# Sites that need Playwright (geo-blocked or anti-bot)
PLAYWRIGHT_URLS = {
    'Binance': 'https://www.binance.com',
    'Binance Card': 'https://www.binance.com/en/cards',
    'Coinbase Card': 'https://www.coinbase.com/card',
    'Coinbase cbETH': 'https://www.coinbase.com/cbeth',
    'Coinbase Exchange': 'https://www.coinbase.com',
    'Exodus': 'https://www.exodus.com',
    'Fireblocks': 'https://www.fireblocks.com',
    'Revolut': 'https://www.revolut.com/crypto',
    'Shakepay Card': 'https://shakepay.com',
    'Arbitrum Bridge': 'https://bridge.arbitrum.io',
    'Billfodl': 'https://privacypros.io/products/billfodl',
    'Blockstream Green': 'https://blockstream.com/green',
    'Wirex Card': 'https://wirexapp.com',
    'Trezor Keep Metal': 'https://trezor.io/trezor-keep-metal',
    'Sygnum Bank': 'https://www.sygnum.com',
}

# Closed/defunct services - mark in database
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

def scrape_with_playwright(url):
    """Scrape URL with Playwright to bypass anti-bot/geo-block"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("      ⚠️ Playwright not installed")
        return None
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                locale='en-US'
            )
            page = context.new_page()
            
            page.goto(url, timeout=30000, wait_until='domcontentloaded')
            page.wait_for_timeout(3000)
            
            content = page.evaluate('''() => {
                const remove = document.querySelectorAll('script, style, nav, footer, noscript');
                remove.forEach(el => el.remove());
                return document.body.innerText.substring(0, 5000);
            }''')
            
            browser.close()
            return len(content) if content else 0
    except Exception as e:
        print(f"      ❌ Playwright error: {str(e)[:50]}")
        return None

def main():
    h = {**HEADERS}
    
    print('🔧 PHASE 1: Fix URLs with Playwright (geo-blocked/anti-bot)')
    print('=' * 70)
    
    fixed = 0
    for name, url in PLAYWRIGHT_URLS.items():
        print(f'  [{name[:25]:<25}] ', end='')
        
        content_len = scrape_with_playwright(url)
        
        if content_len and content_len > 500:
            # Update URL in Supabase
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?name=eq.{name}",
                headers=HEADERS,
                json={'url': url}
            )
            if r.status_code in [200, 204]:
                print(f'✅ {content_len} chars - {url[:40]}')
                fixed += 1
            else:
                print(f'❌ DB error')
        else:
            print(f'⚠️ Still blocked or no content')
        
        time.sleep(1)
    
    print(f'\n✅ {fixed} URLs fixed with Playwright')
    
    print('\n🔧 PHASE 2: Mark closed services in Supabase')
    print('=' * 70)
    
    marked = 0
    for name, reason in CLOSED_SERVICES.items():
        print(f'  [{name[:25]:<25}] ', end='')
        
        # Update product with closed status in specs
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?name=eq.{name}&select=id,specs",
            headers=h
        )
        
        if r.status_code == 200 and r.json():
            product = r.json()[0]
            specs = product.get('specs') or {}
            specs['service_status'] = 'closed'
            specs['closure_reason'] = reason
            
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}",
                headers=HEADERS,
                json={'specs': specs}
            )
            
            if r.status_code in [200, 204]:
                print(f'✅ Marked as closed: {reason[:40]}')
                marked += 1
            else:
                print(f'❌ DB error')
        else:
            print(f'⚠️ Product not found')
    
    print(f'\n✅ {marked} services marked as closed')
    
    print('\n' + '=' * 70)
    print('📊 FINAL SUMMARY')
    print('=' * 70)
    print(f'🌐 URLs fixed with Playwright: {fixed}')
    print(f'🚫 Services marked as closed: {marked}')

if __name__ == '__main__':
    main()
