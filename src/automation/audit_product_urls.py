#!/usr/bin/env python3
"""
SAFESCORING.IO - Product URL Auditor
Checks all product URLs for:
- HTTP status (200, 301, 403, 404, timeout)
- Redirect chains
- Empty/minimal content (SPA detection)
- Missing URLs

Outputs a report with actionable recommendations.

Usage:
    python -m src.automation.audit_product_urls
    python -m src.automation.audit_product_urls --limit 20
    python -m src.automation.audit_product_urls --export csv
"""

import requests
import time
import sys
import os
import argparse
import json
from datetime import datetime
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add parent to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from src.core.config import SUPABASE_URL, SUPABASE_HEADERS
from src.core.supabase_pagination import fetch_all


HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}


def check_url(url, timeout=15):
    """Check a URL and return status info."""
    result = {
        'url': url,
        'status': None,
        'final_url': None,
        'redirect_count': 0,
        'content_length': 0,
        'is_spa_empty': False,
        'error': None,
        'response_time_ms': 0,
    }

    if not url or url in ('N/A', '#', ''):
        result['error'] = 'NO_URL'
        return result

    try:
        start = time.time()
        r = requests.get(url, timeout=timeout, headers=HEADERS, allow_redirects=True)
        elapsed = (time.time() - start) * 1000

        result['status'] = r.status_code
        result['final_url'] = r.url if r.url != url else None
        result['redirect_count'] = len(r.history)
        result['content_length'] = len(r.text)
        result['response_time_ms'] = round(elapsed)

        # Detect SPA empty shells (minimal HTML with JS bundles)
        text = r.text.strip()
        if r.status_code == 200 and len(text) < 500:
            result['is_spa_empty'] = True
        elif r.status_code == 200:
            # Check for common SPA patterns (empty body with JS)
            body_content = ''
            if '<body' in text.lower():
                body_start = text.lower().find('<body')
                body_end = text.lower().find('</body>')
                if body_end > body_start:
                    body_content = text[body_start:body_end]
                    # Remove script tags
                    import re
                    body_no_scripts = re.sub(r'<script[^>]*>.*?</script>', '', body_content, flags=re.DOTALL | re.IGNORECASE)
                    body_no_tags = re.sub(r'<[^>]+>', '', body_no_scripts).strip()
                    if len(body_no_tags) < 100:
                        result['is_spa_empty'] = True

    except requests.exceptions.Timeout:
        result['error'] = 'TIMEOUT'
    except requests.exceptions.ConnectionError:
        result['error'] = 'CONNECTION_ERROR'
    except requests.exceptions.TooManyRedirects:
        result['error'] = 'TOO_MANY_REDIRECTS'
    except Exception as e:
        result['error'] = f'{type(e).__name__}: {str(e)[:100]}'

    return result


def audit_products(limit=None, export_format=None):
    """Audit all product URLs."""
    print("=" * 70)
    print("   SAFESCORING - Product URL Auditor")
    print("=" * 70)

    # Fetch all products
    print("\n[LOAD] Fetching products from Supabase...")
    products = fetch_all('products', select='id,name,slug,url,type_id,description', order='id')
    print(f"   {len(products)} products loaded")

    if limit:
        products = products[:limit]
        print(f"   Limited to {limit} products")

    # Check URLs in parallel
    print(f"\n[CHECK] Checking {len(products)} URLs...")
    results = []
    stats = {
        'total': len(products),
        'ok': 0,
        'no_url': 0,
        'error_403': 0,
        'error_404': 0,
        'error_5xx': 0,
        'timeout': 0,
        'connection_error': 0,
        'redirect': 0,
        'spa_empty': 0,
        'other_error': 0,
    }

    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_product = {}
        for p in products:
            url = p.get('url', '')
            future = executor.submit(check_url, url)
            future_to_product[future] = p

        for i, future in enumerate(as_completed(future_to_product), 1):
            product = future_to_product[future]
            url_result = future.result()
            url_result['product_id'] = product['id']
            url_result['product_name'] = product['name']
            url_result['product_slug'] = product.get('slug', '')
            results.append(url_result)

            # Update stats
            if url_result['error'] == 'NO_URL':
                stats['no_url'] += 1
                status_icon = '⚠️'
            elif url_result['error'] == 'TIMEOUT':
                stats['timeout'] += 1
                status_icon = '⏱️'
            elif url_result['error'] == 'CONNECTION_ERROR':
                stats['connection_error'] += 1
                status_icon = '🔌'
            elif url_result['error']:
                stats['other_error'] += 1
                status_icon = '❌'
            elif url_result['status'] == 200:
                if url_result['is_spa_empty']:
                    stats['spa_empty'] += 1
                    status_icon = '🕸️'
                else:
                    stats['ok'] += 1
                    status_icon = '✅'
            elif url_result['status'] in (301, 302, 307, 308):
                stats['redirect'] += 1
                status_icon = '🔀'
            elif url_result['status'] == 403:
                stats['error_403'] += 1
                status_icon = '🚫'
            elif url_result['status'] == 404:
                stats['error_404'] += 1
                status_icon = '💀'
            elif url_result['status'] and url_result['status'] >= 500:
                stats['error_5xx'] += 1
                status_icon = '🔥'
            else:
                stats['ok'] += 1
                status_icon = '✅'

            if i % 20 == 0 or i == len(products):
                print(f"   [{i}/{len(products)}] checked...")

    # Sort results by severity
    severity_order = {
        'NO_URL': 0, 'CONNECTION_ERROR': 1, 'TIMEOUT': 2,
    }
    results.sort(key=lambda r: (
        severity_order.get(r.get('error', ''), 10),
        r.get('status', 999),
        r.get('content_length', 0)
    ))

    # Print report
    print(f"\n{'=' * 70}")
    print("   AUDIT REPORT")
    print(f"{'=' * 70}")
    print(f"\n   Total products: {stats['total']}")
    print(f"   ✅ OK (200 + content): {stats['ok']}")
    print(f"   🕸️  SPA empty shell: {stats['spa_empty']}")
    print(f"   ⚠️  No URL: {stats['no_url']}")
    print(f"   🚫 403 Forbidden: {stats['error_403']}")
    print(f"   💀 404 Not Found: {stats['error_404']}")
    print(f"   🔥 5xx Server Error: {stats['error_5xx']}")
    print(f"   ⏱️  Timeout: {stats['timeout']}")
    print(f"   🔌 Connection Error: {stats['connection_error']}")
    print(f"   ❌ Other Error: {stats['other_error']}")

    # Problem products
    problems = [r for r in results if r.get('error') or r.get('status', 200) != 200 or r.get('is_spa_empty')]
    if problems:
        print(f"\n{'=' * 70}")
        print(f"   PROBLEM PRODUCTS ({len(problems)})")
        print(f"{'=' * 70}")

        # No URL
        no_url = [r for r in problems if r.get('error') == 'NO_URL']
        if no_url:
            print(f"\n   --- NO URL ({len(no_url)}) ---")
            for r in no_url[:20]:
                print(f"   [{r['product_id']:>4}] {r['product_name'][:40]}")

        # 403 Forbidden (Cloudflare etc.)
        blocked = [r for r in problems if r.get('status') == 403]
        if blocked:
            print(f"\n   --- 403 BLOCKED ({len(blocked)}) --- (need Playwright)")
            for r in blocked[:20]:
                print(f"   [{r['product_id']:>4}] {r['product_name'][:40]} → {r['url'][:50]}")

        # 404 / Dead
        dead = [r for r in problems if r.get('status') == 404 or r.get('error') == 'CONNECTION_ERROR']
        if dead:
            print(f"\n   --- DEAD URLS ({len(dead)}) --- (need URL update)")
            for r in dead[:20]:
                err = r.get('error', f"HTTP {r.get('status')}")
                print(f"   [{r['product_id']:>4}] {r['product_name'][:40]} → {err}")

        # SPA empty
        spa = [r for r in problems if r.get('is_spa_empty')]
        if spa:
            print(f"\n   --- SPA EMPTY ({len(spa)}) --- (need Playwright)")
            for r in spa[:20]:
                print(f"   [{r['product_id']:>4}] {r['product_name'][:40]} → {r.get('content_length', 0)} chars")

        # Timeout
        timeouts = [r for r in problems if r.get('error') == 'TIMEOUT']
        if timeouts:
            print(f"\n   --- TIMEOUT ({len(timeouts)}) ---")
            for r in timeouts[:20]:
                print(f"   [{r['product_id']:>4}] {r['product_name'][:40]} → {r['url'][:50]}")

    # Impact on scoring
    scraping_fail_count = stats['no_url'] + stats['error_403'] + stats['error_404'] + stats['timeout'] + stats['connection_error'] + stats['spa_empty']
    scraping_fail_pct = round(scraping_fail_count / stats['total'] * 100, 1) if stats['total'] > 0 else 0
    print(f"\n{'=' * 70}")
    print(f"   IMPACT ON SCORING")
    print(f"{'=' * 70}")
    print(f"   Products with scraping issues: {scraping_fail_count}/{stats['total']} ({scraping_fail_pct}%)")
    print(f"   → These products get evaluated with ZERO web context")
    print(f"   → AI has no documentation → defaults to NO → artificially low scores")

    # Export
    if export_format == 'csv':
        filename = f'url_audit_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        filepath = os.path.join(os.path.dirname(__file__), '..', '..', filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('product_id,product_name,slug,url,status,error,content_length,is_spa_empty,response_time_ms\n')
            for r in results:
                f.write(f"{r['product_id']},{r['product_name'][:50]},{r.get('product_slug','')},{r.get('url','')},{r.get('status','')},{r.get('error','')},{r.get('content_length',0)},{r.get('is_spa_empty',False)},{r.get('response_time_ms',0)}\n")
        print(f"\n   Exported to {filepath}")
    elif export_format == 'json':
        filename = f'url_audit_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        filepath = os.path.join(os.path.dirname(__file__), '..', '..', filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({'stats': stats, 'results': results, 'timestamp': datetime.now().isoformat()}, f, indent=2, ensure_ascii=False)
        print(f"\n   Exported to {filepath}")

    return stats, results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Audit product URLs')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of products to check')
    parser.add_argument('--export', choices=['csv', 'json'], default=None, help='Export results')
    args = parser.parse_args()

    audit_products(limit=args.limit, export_format=args.export)
