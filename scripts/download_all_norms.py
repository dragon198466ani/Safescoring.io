#!/usr/bin/env python3
"""
Download official documents for all norms.
Fetches from free sources and saves locally.
"""
import requests
import os
import sys
import json
import time
import re
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, get_supabase_headers

OUTPUT_DIR = "norm_docs"
PDF_DIR = "norm_pdfs"

# Free sources that can be scraped
FREE_DOMAINS = [
    'github.com', 'raw.githubusercontent.com',
    'nist.gov',
    'ietf.org', 'datatracker.ietf.org', 'rfc-editor.org',
    'owasp.org',
    'w3.org',
    'bitcoin.it', 'bitcoin.org',
    'ethereum.org', 'eips.ethereum.org',
    'commoncriteriaportal.org',
]

# Paywall domains - need alternative sources
PAYWALL_DOMAINS = ['iso.org', 'astm.org', 'ieee.org', 'sae.org', 'ansi.org']

# Alternative free sources for paywall standards
ALTERNATIVE_SOURCES = {
    'iso.org': {
        '27001': 'https://cdn.standards.iteh.ai/samples/82875/726bcf58250e43d9a666b4d929c8fbdb/ISO-IEC-27001-2022.pdf',
        '27002': 'https://cdn.standards.iteh.ai/samples/75652/f9b90f856c0d4c3dbef74cf67374d1c5/ISO-IEC-27002-2022.pdf',
        '22301': 'https://cdn.standards.iteh.ai/samples/75106/d11801a9bab045a88d59cd321519ecf1/ISO-22301-2019.pdf',
        '9241-210': 'https://cdn.standards.iteh.ai/samples/77520/8cac787a9e1549e1a7ffa0171dfa33e0/ISO-9241-210-2019.pdf',
        '3309': 'https://cdn.standards.iteh.ai/samples/8561/ee3e6fc1cc8641fabff5257e9660cf07/ISO-IEC-3309-1993.pdf',
        '60529': 'https://www.uni-valve.com/files/pdf/teknik/ip.pdf',
        '15408': 'https://www.commoncriteriaportal.org/files/ccfiles/CC2022PART1R1.pdf',
    },
    'astm.org': {
        'b117': 'https://www.galvanizeit.com/uploads/resources/ASTM-B-117-yr11.pdf',
    },
    'dla.mil': {
        '810': 'https://cvgstrategy.com/wp-content/uploads/2019/03/MIL-STD-810H.pdf',
        '217': 'https://www.dsiintl.com/wp-content/uploads/2017/04/MIL_HDBK_217F_N2.pdf',
        '883': 'https://s3vi.ndc.nasa.gov/ssri-kb/static/resources/std883.pdf',
        '8625': 'https://cvgstrategy.com/wp-content/uploads/2023/04/MIL-PRF-8625F.pdf',
    },
    'ieee.org': {
        '1149': 'https://www.asset-intertech.com/wp-content/uploads/2022/08/IEEE-1149.1-JTAG-and-Boundary-Scan-Tutorial-Second-Edition.pdf',
    }
}


def get_all_norms():
    """Fetch all norms from database."""
    headers = get_supabase_headers()
    all_norms = []
    offset = 0

    while True:
        url = f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,official_link&limit=1000&offset={offset}'
        r = requests.get(url, headers=headers)
        if r.status_code != 200:
            break
        batch = r.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break

    return all_norms


def is_free_source(url):
    """Check if URL is from a free source."""
    url_lower = url.lower()
    for domain in FREE_DOMAINS:
        if domain in url_lower:
            return True
    return False


def is_paywall_source(url):
    """Check if URL is behind paywall."""
    url_lower = url.lower()
    for domain in PAYWALL_DOMAINS:
        if domain in url_lower:
            return True
    return False


def find_alternative_source(url, title):
    """Find alternative free source for paywall content."""
    url_lower = url.lower()
    title_lower = title.lower()

    for domain, alternatives in ALTERNATIVE_SOURCES.items():
        if domain in url_lower:
            for key, alt_url in alternatives.items():
                if key in url_lower or key in title_lower:
                    return alt_url
    return None


def download_file(url, output_path, timeout=30):
    """Download file from URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        r = requests.get(url, headers=headers, timeout=timeout, stream=True)
        if r.status_code == 200:
            with open(output_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
    except Exception as e:
        print(f"    Error: {e}")
    return False


def fetch_text_content(url, timeout=30):
    """Fetch text content from URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        r = requests.get(url, headers=headers, timeout=timeout)
        if r.status_code == 200:
            return r.text
    except Exception as e:
        print(f"    Error: {e}")
    return None


def sanitize_filename(name):
    """Create safe filename."""
    return re.sub(r'[<>:"/\\|?*]', '_', name)[:100]


def process_norm(norm, stats):
    """Process a single norm."""
    code = norm['code']
    title = norm['title']
    link = norm.get('official_link', '')

    if not link:
        stats['no_link'] += 1
        return

    safe_code = sanitize_filename(code)

    # Check if it's a PDF link
    if link.lower().endswith('.pdf'):
        output_path = os.path.join(PDF_DIR, f"{safe_code}.pdf")
        if os.path.exists(output_path):
            stats['already_downloaded'] += 1
            return

        print(f"  [{code}] Downloading PDF...")
        if download_file(link, output_path):
            stats['downloaded'] += 1
            print(f"    ✓ Saved")
        else:
            stats['failed'] += 1
        return

    # Free source - fetch content
    if is_free_source(link):
        output_path = os.path.join(OUTPUT_DIR, f"{safe_code}.html")
        if os.path.exists(output_path):
            stats['already_downloaded'] += 1
            return

        print(f"  [{code}] Fetching from {urlparse(link).netloc}...")
        content = fetch_text_content(link)
        if content and len(content) > 500:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
            stats['downloaded'] += 1
            print(f"    ✓ Saved ({len(content)} chars)")
        else:
            stats['failed'] += 1
        return

    # Paywall source - try alternative
    if is_paywall_source(link):
        alt_url = find_alternative_source(link, title)
        if alt_url:
            output_path = os.path.join(PDF_DIR, f"{safe_code}.pdf")
            if os.path.exists(output_path):
                stats['already_downloaded'] += 1
                return

            print(f"  [{code}] Using alternative source...")
            if download_file(alt_url, output_path):
                stats['downloaded'] += 1
                print(f"    ✓ Saved from alternative")
            else:
                stats['failed'] += 1
                stats['paywall'] += 1
        else:
            stats['paywall'] += 1
            print(f"  [{code}] Paywall - no alternative found")
        return

    # Other sources - try to fetch
    output_path = os.path.join(OUTPUT_DIR, f"{safe_code}.html")
    if os.path.exists(output_path):
        stats['already_downloaded'] += 1
        return

    print(f"  [{code}] Fetching from {urlparse(link).netloc}...")
    content = fetch_text_content(link, timeout=15)
    if content and len(content) > 500:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        stats['downloaded'] += 1
        print(f"    ✓ Saved ({len(content)} chars)")
    else:
        stats['failed'] += 1


def main():
    # Create output directories
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(PDF_DIR, exist_ok=True)

    print("=" * 70)
    print("DOWNLOADING ALL NORM DOCUMENTS")
    print("=" * 70)

    print("\nFetching norm list...")
    norms = get_all_norms()
    print(f"Found {len(norms)} norms")

    stats = {
        'downloaded': 0,
        'already_downloaded': 0,
        'failed': 0,
        'paywall': 0,
        'no_link': 0,
    }

    print(f"\nProcessing...")
    for i, norm in enumerate(norms):
        if i % 50 == 0:
            print(f"\n=== Progress: {i}/{len(norms)} ===")

        process_norm(norm, stats)
        time.sleep(0.2)  # Rate limiting

    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    print(f"Downloaded: {stats['downloaded']}")
    print(f"Already had: {stats['already_downloaded']}")
    print(f"Paywall (no alt): {stats['paywall']}")
    print(f"Failed: {stats['failed']}")
    print(f"No link: {stats['no_link']}")


if __name__ == '__main__':
    main()
