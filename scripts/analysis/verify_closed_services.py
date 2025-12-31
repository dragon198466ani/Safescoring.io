#!/usr/bin/env python3
"""Verify if services marked as closed are actually closed"""

import time

# Services to verify
SERVICES_TO_CHECK = {
    'BlockFi Card': 'https://blockfi.com',
    'TenX Card': 'https://tenx.tech',
    'Paycent Card': 'https://paycent.com',
    'Hegic': 'https://hegic.co',
    'Ren Bridge': 'https://renproject.io',
    'Carbon Wallet': 'https://carbonwallet.com',
    'HashWallet': 'https://hashwallet.co',
    'Bleap Card': 'https://bleap.io',
}

def check_with_playwright(name, url):
    """Check if site is active using Playwright"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None, "Playwright not installed"
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = context.new_page()
            
            response = page.goto(url, timeout=15000, wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            
            # Get page title and content
            title = page.title()
            content = page.evaluate('() => document.body.innerText.substring(0, 2000)')
            
            browser.close()
            
            # Check for signs of closed/inactive service
            closed_indicators = [
                'shutdown', 'closed', 'discontinued', 'no longer', 
                'ceased operations', 'bankruptcy', 'winding down',
                'service unavailable', 'not found', '404', 'coming soon',
                'under maintenance', 'temporarily unavailable'
            ]
            
            content_lower = (title + ' ' + content).lower()
            
            is_closed = any(indicator in content_lower for indicator in closed_indicators)
            
            return {
                'status': response.status if response else 0,
                'title': title[:50],
                'content_len': len(content),
                'appears_closed': is_closed,
                'sample': content[:200]
            }, None
            
    except Exception as e:
        return None, str(e)[:50]

def main():
    print('🔍 Verifying closed services with Playwright...')
    print('=' * 70)
    
    results = []
    
    for name, url in SERVICES_TO_CHECK.items():
        print(f'\n📦 {name}')
        print(f'   URL: {url}')
        
        result, error = check_with_playwright(name, url)
        
        if error:
            print(f'   ❌ Error: {error}')
            results.append((name, 'ERROR', error))
        elif result:
            status = result['status']
            title = result['title']
            content_len = result['content_len']
            appears_closed = result['appears_closed']
            
            if status >= 400 or content_len < 100:
                print(f'   🚫 CLOSED - Status {status}, {content_len} chars')
                results.append((name, 'CLOSED', f'Status {status}'))
            elif appears_closed:
                print(f'   ⚠️ APPEARS CLOSED - "{title}"')
                print(f'   Sample: {result["sample"][:100]}...')
                results.append((name, 'MAYBE_CLOSED', title))
            else:
                print(f'   ✅ ACTIVE - "{title}" ({content_len} chars)')
                print(f'   Sample: {result["sample"][:100]}...')
                results.append((name, 'ACTIVE', title))
        
        time.sleep(1)
    
    print('\n' + '=' * 70)
    print('📊 SUMMARY')
    print('=' * 70)
    
    active = [r for r in results if r[1] == 'ACTIVE']
    closed = [r for r in results if r[1] in ['CLOSED', 'MAYBE_CLOSED']]
    errors = [r for r in results if r[1] == 'ERROR']
    
    print(f'\n✅ ACTIVE ({len(active)}):')
    for name, status, info in active:
        print(f'   - {name}: {info}')
    
    print(f'\n🚫 CLOSED ({len(closed)}):')
    for name, status, info in closed:
        print(f'   - {name}: {info}')
    
    print(f'\n❌ ERRORS ({len(errors)}):')
    for name, status, info in errors:
        print(f'   - {name}: {info}')

if __name__ == '__main__':
    main()
