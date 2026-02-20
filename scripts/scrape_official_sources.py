#!/usr/bin/env python3
"""
Scrape ONLY official sources (EIPs, BIPs, RFCs, NIST, GitHub docs).
NO Wikipedia. Store content in reference_content for Claude to summarize.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, SUPABASE_HEADERS
import requests
from bs4 import BeautifulSoup
import argparse
import time
import re
import PyPDF2
import tempfile

# Official sources patterns
OFFICIAL_PATTERNS = [
    'github.com',
    'nist.gov',
    'ietf.org',
    'datatracker.ietf.org',
    'eips.ethereum.org',
    'bitcoin/bips',
    'rfc-editor.org',
    'w3.org',
    'owasp.org',
    'docs.arbitrum.io',
    'docs.scroll.io',
    'docs.zksync.io',
    'docs.linea.build',
    'docs.avax.network',
    'docs.bnbchain.org',
    'docs.polkadot.network',
    'wiki.polkadot.network',
    'developers.tron.network',
    'lightning/bolts',
    'docs.uniswap.org',
    'docs.aave.com',
    'docs.compound.finance',
    'docs.walletconnect.com',
    'globalplatform.org',
    'commoncriteriaportal.org',
    'csrc.nist.gov',
    'nvlpubs.nist.gov',
]

def is_official_source(url: str) -> bool:
    """Check if URL is from an official source."""
    if not url:
        return False
    url_lower = url.lower()
    return any(pattern in url_lower for pattern in OFFICIAL_PATTERNS)

def get_norms_needing_content():
    """Get norms without summary that have official source links."""
    url = f"{SUPABASE_URL}/rest/v1/norms"
    params = {
        "select": "id,code,title,description,official_link",
        "or": "(summary.is.null,summary.eq.)",
        "order": "code"
    }
    
    all_norms = []
    offset = 0
    while True:
        resp = requests.get(url, headers=SUPABASE_HEADERS, params={**params, "offset": offset, "limit": 1000})
        if resp.status_code != 200:
            print(f"Error: {resp.status_code}")
            break
        batch = resp.json()
        if not batch:
            break
        all_norms.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    
    # Filter to only official sources
    official_norms = [n for n in all_norms if is_official_source(n.get('official_link', ''))]
    return official_norms

def scrape_html(url: str) -> str:
    """Scrape HTML content from URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=20)
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Remove scripts, styles, nav, footer
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript']):
            tag.decompose()
        
        # Try to find main content
        main = (soup.find('main') or 
                soup.find('article') or 
                soup.find('div', {'class': 'content'}) or
                soup.find('div', {'id': 'content'}) or
                soup.find('div', {'class': 'markdown-body'}) or
                soup.find('div', {'class': 'eip'}))
        
        if main:
            text = main.get_text(separator='\n', strip=True)
        else:
            text = soup.get_text(separator='\n', strip=True)
        
        # Clean up
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        if len(text) > 10000:
            text = text[:10000] + '...'
        
        return text if len(text) > 100 else None
        
    except Exception as e:
        print(f"      HTML error: {e}")
        return None

def scrape_github_raw(url: str) -> str:
    """Scrape raw content from GitHub."""
    try:
        # Convert GitHub URL to raw URL
        if 'github.com' in url and '/blob/' in url:
            raw_url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
        elif 'github.com' in url and '/tree/' not in url and '/blob/' not in url:
            # Try to get README
            if not url.endswith('/'):
                url += '/'
            raw_url = url.replace('github.com', 'raw.githubusercontent.com') + 'main/README.md'
        else:
            raw_url = url
        
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(raw_url, headers=headers, timeout=15)
        
        if resp.status_code == 200:
            text = resp.text
            if len(text) > 10000:
                text = text[:10000] + '...'
            return text if len(text) > 100 else None
        
        # Fallback to HTML scraping
        return scrape_html(url)
        
    except Exception as e:
        print(f"      GitHub error: {e}")
        return None

def scrape_pdf(url: str) -> str:
    """Download and extract text from PDF."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers, timeout=30, stream=True)
        
        if resp.status_code != 200:
            return None
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
            temp_path = f.name
        
        # Extract text
        text_parts = []
        with open(temp_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages[:20]:  # Max 20 pages
                text_parts.append(page.extract_text() or '')
        
        os.unlink(temp_path)
        
        text = '\n'.join(text_parts)
        if len(text) > 10000:
            text = text[:10000] + '...'
        
        return text if len(text) > 100 else None
        
    except Exception as e:
        print(f"      PDF error: {e}")
        return None

def scrape_official_source(url: str) -> str:
    """Scrape content from official source based on URL type."""
    if not url:
        return None
    
    url_lower = url.lower()
    
    # PDF files
    if url_lower.endswith('.pdf'):
        return scrape_pdf(url)
    
    # GitHub
    if 'github.com' in url_lower:
        return scrape_github_raw(url)
    
    # HTML (EIPs, RFCs, NIST, docs, etc.)
    return scrape_html(url)

def update_norm(norm_id: int, content: str, sources: list) -> bool:
    """Update reference_content for a norm."""
    url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"
    data = {
        "reference_content": content,
        "reference_sources": sources
    }
    resp = requests.patch(url, headers=SUPABASE_HEADERS, json=data)
    return resp.status_code in [200, 204]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    
    print("=" * 70)
    print("SCRAPE OFFICIAL SOURCES ONLY")
    print("(EIPs, BIPs, RFCs, NIST, GitHub docs)")
    print("=" * 70)
    
    norms = get_norms_needing_content()
    print(f"\n📋 Found {len(norms)} norms with official sources needing content")
    
    if args.limit:
        norms = norms[:args.limit]
        print(f"   Processing first {len(norms)}")
    
    success = 0
    failed = 0
    
    for i, norm in enumerate(norms, 1):
        code = norm['code']
        title = norm['title']
        official_link = norm.get('official_link', '')
        
        print(f"\n[{i}/{len(norms)}] {code} - {title}")
        print(f"   📎 {official_link[:60]}...")
        
        content = scrape_official_source(official_link)
        
        if content:
            print(f"   ✅ Scraped ({len(content)} chars)")
            if not args.dry_run:
                if update_norm(norm['id'], f"[OFFICIAL: {official_link}]\n\n{content}", [official_link]):
                    success += 1
                    print(f"   💾 Stored")
                else:
                    failed += 1
                    print(f"   ❌ Failed to store")
            else:
                success += 1
        else:
            failed += 1
            print(f"   ❌ Could not scrape")
        
        time.sleep(0.5)
    
    print("\n" + "=" * 70)
    print(f"✅ Success: {success}")
    print(f"❌ Failed: {failed}")

if __name__ == "__main__":
    main()
