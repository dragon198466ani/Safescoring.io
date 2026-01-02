#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Norm Document Scraper
Scrapes official documentation for norms (NIST, EIP, RFC, GitHub, W3C, etc.)
and stores summaries in Supabase for enriched AI evaluation.

USAGE:
    python -m src.automation.norm_doc_scraper [--limit N] [--type TYPE]

Types: github, eip, rfc, w3c, nist, all
"""

import requests
import time
import re
import sys
import os
from urllib.parse import urlparse
from html.parser import HTMLParser

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.core.config import SUPABASE_URL, get_supabase_headers
from src.core.api_provider import AIProvider


class TextExtractor(HTMLParser):
    """Simple HTML to text extractor."""

    def __init__(self):
        super().__init__()
        self.text = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe', 'header']:
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe', 'header']:
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            text = data.strip()
            if text:
                self.text.append(text)

    def get_text(self):
        return ' '.join(self.text)


class NormDocScraper:
    """
    Scrapes official documentation for norms and generates AI summaries.
    Only processes norms with access_type='G' (Gratuit/Free).
    """

    def __init__(self):
        self.headers = get_supabase_headers()
        self.ai_provider = AIProvider()
        self.request_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }

        # Scrapers by domain type
        self.scrapers = {
            'github.com': self._scrape_github,
            'eips.ethereum.org': self._scrape_eip,
            'tools.ietf.org': self._scrape_rfc,
            'datatracker.ietf.org': self._scrape_rfc,
            'www.w3.org': self._scrape_w3c,
            'nvlpubs.nist.gov': self._scrape_nist,
            'csrc.nist.gov': self._scrape_nist,
            'en.bitcoin.it': self._scrape_html,
            'ethereum.org': self._scrape_html,
        }

    def load_norms(self, access_type='G', limit=None):
        """Load norms from Supabase that need documentation scraping."""
        url = f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,description,official_link,access_type,official_doc_summary"
        url += f"&access_type=eq.{access_type}"
        url += "&official_link=not.is.null"

        if limit:
            url += f"&limit={limit}"

        r = requests.get(url, headers=self.headers)
        if r.status_code == 200:
            return r.json()
        return []

    def _scrape_github(self, url):
        """Scrape GitHub repository README or file."""
        try:
            parsed = urlparse(url)
            path_parts = parsed.path.strip('/').split('/')

            if len(path_parts) >= 2:
                owner, repo = path_parts[0], path_parts[1]

                # Check if it's a specific file (like BIP markdown)
                if 'blob' in path_parts and '.md' in url:
                    # Direct file URL - convert to raw
                    raw_url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
                    r = requests.get(raw_url, timeout=15, headers=self.request_headers)
                    if r.status_code == 200:
                        return r.text[:15000]

                # Try README
                readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
                r = requests.get(readme_url, timeout=15, headers={'Accept': 'application/vnd.github.v3.raw'})
                if r.status_code == 200:
                    return r.text[:15000]

                # Fallback to repo page
                r = requests.get(url, timeout=15, headers=self.request_headers)
                if r.status_code == 200:
                    parser = TextExtractor()
                    parser.feed(r.text)
                    return parser.get_text()[:10000]

        except Exception as e:
            print(f"      GitHub error: {e}")
        return None

    def _scrape_eip(self, url):
        """Scrape Ethereum Improvement Proposal."""
        try:
            r = requests.get(url, timeout=15, headers=self.request_headers)
            if r.status_code == 200:
                parser = TextExtractor()
                parser.feed(r.text)
                return parser.get_text()[:12000]
        except Exception as e:
            print(f"      EIP error: {e}")
        return None

    def _scrape_rfc(self, url):
        """Scrape IETF RFC document."""
        try:
            # Try to get text version
            if 'tools.ietf.org' in url:
                text_url = url.replace('/html/', '/txt/')
                r = requests.get(text_url, timeout=15, headers=self.request_headers)
                if r.status_code == 200 and 'text/plain' in r.headers.get('content-type', ''):
                    return r.text[:15000]

            # Fallback to HTML
            r = requests.get(url, timeout=15, headers=self.request_headers)
            if r.status_code == 200:
                parser = TextExtractor()
                parser.feed(r.text)
                return parser.get_text()[:12000]
        except Exception as e:
            print(f"      RFC error: {e}")
        return None

    def _scrape_w3c(self, url):
        """Scrape W3C specification."""
        try:
            r = requests.get(url, timeout=15, headers=self.request_headers)
            if r.status_code == 200:
                parser = TextExtractor()
                parser.feed(r.text)
                return parser.get_text()[:10000]
        except Exception as e:
            print(f"      W3C error: {e}")
        return None

    def _scrape_nist(self, url):
        """Scrape NIST document (PDF info page, not PDF itself)."""
        try:
            # NIST PDFs are hard to parse - get the landing page info
            r = requests.get(url, timeout=15, headers=self.request_headers)
            if r.status_code == 200:
                parser = TextExtractor()
                parser.feed(r.text)
                text = parser.get_text()

                # Extract abstract/summary if present
                if 'Abstract' in text:
                    start = text.find('Abstract')
                    return text[start:start+5000]

                return text[:5000]
        except Exception as e:
            print(f"      NIST error: {e}")
        return None

    def _scrape_html(self, url):
        """Generic HTML scraper for other sites."""
        try:
            r = requests.get(url, timeout=15, headers=self.request_headers)
            if r.status_code == 200:
                parser = TextExtractor()
                parser.feed(r.text)
                return parser.get_text()[:10000]
        except Exception as e:
            print(f"      HTML error: {e}")
        return None

    def scrape_norm_doc(self, norm):
        """Scrape documentation for a single norm."""
        url = norm.get('official_link')
        if not url:
            return None

        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        # Find appropriate scraper
        scraper = None
        for domain_pattern, scraper_func in self.scrapers.items():
            if domain_pattern in domain:
                scraper = scraper_func
                break

        if not scraper:
            scraper = self._scrape_html

        return scraper(url)

    def generate_summary(self, norm, doc_content):
        """Generate AI summary of document for norm context."""
        if not doc_content or len(doc_content) < 100:
            return None

        prompt = f"""Summarize this technical documentation for the security/crypto norm "{norm['code']}: {norm['title']}".

DOCUMENTATION:
{doc_content[:8000]}

Provide a concise summary (200-400 words) focusing on:
1. What this standard/protocol does
2. Key security properties
3. Implementation requirements
4. When to use it (use cases)

Summary:"""

        result = self.ai_provider.call(prompt, max_tokens=600, temperature=0.3)
        return result

    def update_norm_summary(self, norm_id, summary):
        """Update norm with official_doc_summary in Supabase."""
        url = f"{SUPABASE_URL}/rest/v1/norms?id=eq.{norm_id}"

        r = requests.patch(
            url,
            headers=get_supabase_headers('return=minimal'),
            json={'official_doc_summary': summary}
        )

        return r.status_code in [200, 204]

    def run(self, limit=None, doc_type=None, skip_existing=True):
        """
        Run the norm documentation scraper.

        Args:
            limit: Max norms to process
            doc_type: Filter by domain type (github, eip, rfc, w3c, nist)
            skip_existing: Skip norms that already have summaries
        """
        print("""
================================================================
     SAFESCORING - NORM DOCUMENT SCRAPER
     Enriching norms with official documentation
================================================================
""")

        norms = self.load_norms(access_type='G', limit=limit)
        print(f"Loaded {len(norms)} norms with access_type=G")

        # Filter by doc type if specified
        if doc_type:
            type_domains = {
                'github': ['github.com'],
                'eip': ['eips.ethereum.org'],
                'rfc': ['tools.ietf.org', 'datatracker.ietf.org'],
                'w3c': ['www.w3.org'],
                'nist': ['nvlpubs.nist.gov', 'csrc.nist.gov'],
            }
            domains = type_domains.get(doc_type, [])
            norms = [n for n in norms if any(d in (n.get('official_link') or '') for d in domains)]
            print(f"Filtered to {len(norms)} norms for type '{doc_type}'")

        # Skip existing
        if skip_existing:
            norms = [n for n in norms if not n.get('official_doc_summary')]
            print(f"After skipping existing: {len(norms)} norms to process")

        if not norms:
            print("No norms to process!")
            return

        processed = 0
        success = 0
        errors = 0

        for i, norm in enumerate(norms):
            print(f"\n[{i+1}/{len(norms)}] {norm['code']}: {norm['title'][:40]}...")

            url = norm.get('official_link', '')
            domain = urlparse(url).netloc if url else 'unknown'
            print(f"   Source: {domain}")

            # Scrape document
            doc_content = self.scrape_norm_doc(norm)

            if not doc_content or len(doc_content) < 100:
                print(f"   Scraping failed or too short")
                errors += 1
                continue

            print(f"   Scraped: {len(doc_content)} chars")

            # Generate summary
            summary = self.generate_summary(norm, doc_content)

            if not summary:
                print(f"   Summary generation failed")
                errors += 1
                continue

            print(f"   Summary: {len(summary)} chars")

            # Update Supabase
            if self.update_norm_summary(norm['id'], summary):
                print(f"   Saved to Supabase")
                success += 1
            else:
                print(f"   Failed to save")
                errors += 1

            processed += 1
            time.sleep(1)  # Rate limiting

        print(f"""
================================================================
SUMMARY
================================================================
Processed: {processed}
Success: {success}
Errors: {errors}
""")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Norm Document Scraper')
    parser.add_argument('--limit', type=int, default=None, help='Max norms to process')
    parser.add_argument('--type', type=str, default=None,
                        choices=['github', 'eip', 'rfc', 'w3c', 'nist', 'all'],
                        help='Document type to scrape')
    parser.add_argument('--force', action='store_true', help='Re-process existing summaries')

    args = parser.parse_args()

    scraper = NormDocScraper()
    scraper.run(
        limit=args.limit,
        doc_type=args.type if args.type != 'all' else None,
        skip_existing=not args.force
    )


if __name__ == "__main__":
    main()
