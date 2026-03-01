#!/usr/bin/env python3
"""
Product Data Auto-Enrichment Pipeline
======================================
Enriches products with missing data by:
1. Scraping product URLs -> AI-generated descriptions
2. CoinGecko API -> coingecko_id, logo_url, description fallback
3. DefiLlama API -> defillama_slug (DeFi products only)

Usage:
    python scripts/enrich_missing_data.py --descriptions       # Only products missing description
    python scripts/enrich_missing_data.py --coingecko          # Enrich coingecko_id + logo for all
    python scripts/enrich_missing_data.py --defillama          # Enrich defillama_slug for DeFi
    python scripts/enrich_missing_data.py --all                # Run all enrichment tasks
    python scripts/enrich_missing_data.py --all --limit 10     # Test with 10 products
    python scripts/enrich_missing_data.py --all --dry-run      # Preview without writing
"""

import os
import sys
import re
import json
import time
import argparse
import requests
from datetime import datetime
from collections import Counter
from urllib.parse import urlparse, quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_KEY

SERVICE_KEY = SUPABASE_SERVICE_KEY or SUPABASE_KEY
HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}
READ_HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}

# Rate limiting
CG_DELAY = 1.5        # CoinGecko free API: ~30 req/min
DL_DELAY = 0.5        # DefiLlama: generous limits
SCRAPE_DELAY = 2.0    # Polite scraping delay


def fetch_all(table, select='*', order=None, filters=None, page_size=1000):
    all_records = []
    offset = 0
    for _ in range(500):
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={page_size}"
        if order:
            url += f"&order={order}"
        if filters:
            for k, v in filters.items():
                url += f"&{k}={v}"
        r = requests.get(url, headers=READ_HEADERS, timeout=60)
        if r.status_code != 200:
            print(f"  ERROR fetching {table}: {r.status_code} {r.text[:200]}")
            break
        data = r.json()
        if not data:
            break
        all_records.extend(data)
        if len(data) < page_size:
            break
        offset += page_size
    return all_records


def update_product(product_id, data, dry_run=False):
    """Update a product in Supabase."""
    if dry_run:
        print(f"    [DRY-RUN] Would update product {product_id}: {list(data.keys())}")
        return True
    data['data_updated_at'] = datetime.utcnow().isoformat()
    url = f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}"
    r = requests.patch(url, json=data, headers=HEADERS, timeout=30)
    if r.status_code not in [200, 204]:
        print(f"    ERROR updating product {product_id}: {r.status_code} {r.text[:200]}")
        return False
    return True


# ============================================================
# 1. DESCRIPTIONS: Scrape URLs + AI summarize
# ============================================================
class DescriptionEnricher:
    """Generates product descriptions by scraping their website."""

    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.request_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
        self.ai_provider = None
        self.stats = Counter()

    def _get_ai(self):
        if not self.ai_provider:
            from src.core.api_provider import AIProvider
            self.ai_provider = AIProvider()
        return self.ai_provider

    def _parse_html(self, html, max_chars=8000):
        """Extract text from HTML, stripping scripts/styles/nav."""
        from html.parser import HTMLParser

        class TextParser(HTMLParser):
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
                    if text and len(text) > 2:
                        self.text.append(text)

        parser = TextParser()
        parser.feed(html)
        content = ' '.join(parser.text)
        return content[:max_chars] if content else None

    def scrape_url(self, url, max_chars=8000):
        """Scrape a URL with multiple fallback strategies."""
        # Strategy 1: Simple HTTP GET
        content = self._scrape_http(url, max_chars)
        if content and len(content) >= 100:
            self.stats['via_http'] += 1
            return content

        http_len = len(content) if content else 0

        # Strategy 2: Playwright for JS-rendered SPAs
        print(f"  -> HTTP only {http_len} chars, trying Playwright...")
        content = self._scrape_playwright(url, max_chars)
        if content and len(content) >= 100:
            print(f"  -> Playwright got {len(content)} chars")
            self.stats['via_playwright'] += 1
            return content

        # Strategy 3: Try docs/about subpages
        content = self._scrape_subpages(url, max_chars)
        if content and len(content) >= 100:
            print(f"  -> Subpage got {len(content)} chars")
            self.stats['via_subpage'] += 1
            return content

        return content  # May be short/None

    def _scrape_http(self, url, max_chars=8000):
        """Basic HTTP GET scrape."""
        try:
            r = requests.get(url, timeout=15, headers=self.request_headers, allow_redirects=True)
            if r.status_code != 200:
                return None
            return self._parse_html(r.text, max_chars)
        except Exception:
            return None

    def _scrape_playwright(self, url, max_chars=8000):
        """Fallback: use Playwright to render JS-heavy pages."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            return None

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                )
                page.goto(url, wait_until='networkidle', timeout=20000)
                # Wait a bit for lazy-loaded content
                page.wait_for_timeout(2000)
                html = page.content()
                browser.close()
                return self._parse_html(html, max_chars)
        except Exception as e:
            return None

    def _scrape_subpages(self, url, max_chars=8000):
        """Try common subpages like /about, /docs, etc."""
        base = url.rstrip('/')
        subpages = ['/about', '/docs', '/about-us', '/faq']
        best = None
        best_len = 0
        for sub in subpages:
            try:
                r = requests.get(f"{base}{sub}", timeout=10, headers=self.request_headers, allow_redirects=True)
                if r.status_code == 200:
                    content = self._parse_html(r.text, max_chars)
                    if content and len(content) > best_len:
                        best = content
                        best_len = len(content)
                        if best_len >= 500:
                            break
            except Exception:
                continue
        return best

    def generate_description(self, name, url, scraped_content, product_type_name=None):
        """Use AI to generate a concise product description from scraped content."""
        type_hint = f" (product type: {product_type_name})" if product_type_name else ""

        prompt = f"""Write a concise product description for the crypto/fintech product "{name}"{type_hint}.

Use ONLY factual information from this scraped website content:
{scraped_content[:6000]}

STRICT RULES:
- Write exactly 2-4 sentences (50-150 words)
- Focus on: what the product does, key features, target audience
- Be factual - only include information found in the content
- Do NOT include pricing, marketing slogans, or subjective claims
- Write in English
- Do NOT start with the product name
- Do NOT add commentary, meta-text, or notes about mismatches
- Output ONLY the description text, nothing else"""

        ai = self._get_ai()
        response = ai.call(prompt, max_tokens=300, temperature=0.2)
        if response:
            # Clean up: remove leading quotes, "Description:", etc.
            desc = response.strip().strip('"').strip("'")
            desc = re.sub(r'^(Description|DESCRIPTION|desc):\s*', '', desc, flags=re.IGNORECASE)
            # Reject AI refusal/meta-commentary patterns
            bad_starts = ['i notice', 'i can\'t', 'i cannot', 'based on the scraped', 'based on the provid',
                          'note:', 'there\'s a mismatch', 'i apologize', 'unfortunately', 'i\'m unable',
                          'the scraped content', 'the provided content', 'i don\'t', 'i\'m not',
                          'i was unable', 'the content provided', 'from the scraped',
                          'description for', 'i couldn\'t']
            bad_contains = ['cannot write', 'not enough information', 'insufficient content',
                           'does not contain', 'doesn\'t contain', 'no relevant', 'mismatch']
            desc_lower = desc.lower()
            if any(desc_lower.startswith(b) for b in bad_starts):
                return None
            if any(b in desc_lower for b in bad_contains):
                return None
            if len(desc) > 30:
                return desc
        return None

    def generate_from_knowledge(self, name, url, product_type_name=None):
        """Fallback: generate description from AI knowledge when scraping fails."""
        type_hint = f" (product type: {product_type_name})" if product_type_name else ""
        domain = urlparse(url).netloc if url else "unknown"

        prompt = f"""Write a concise, factual product description for the crypto/fintech product "{name}"{type_hint}.
Website: {url}
Domain: {domain}

STRICT RULES:
- Write exactly 2-4 sentences (50-150 words)
- ONLY include well-known, verifiable facts about this product
- If you don't know this product well, respond with exactly "UNKNOWN"
- Focus on: what the product does, key features, target audience
- Do NOT start with the product name
- Do NOT add commentary, meta-text, or caveats
- Do NOT fabricate features - only state what you are confident about
- Output ONLY the description text, nothing else"""

        ai = self._get_ai()
        response = ai.call(prompt, max_tokens=300, temperature=0.2)
        if response:
            desc = response.strip().strip('"').strip("'")
            desc = re.sub(r'^(Description|DESCRIPTION|desc):\s*', '', desc, flags=re.IGNORECASE)
            # Reject unknowns and bad patterns
            if desc.upper().strip() == 'UNKNOWN' or len(desc) < 20:
                return None
            bad_starts = ['i notice', 'i can\'t', 'i don\'t', 'i\'m not', 'based on',
                          'note:', 'there\'s a mismatch', 'i apologize', 'unfortunately',
                          'i\'m unable', 'the scraped', 'i cannot', 'unknown']
            if any(desc.lower().startswith(b) for b in bad_starts):
                return None
            return desc
        return None

    def run(self, products, types_by_id, limit=None):
        """Enrich products missing descriptions."""
        no_desc = [p for p in products if not p.get('description') or len(str(p.get('description', ''))) < 10]

        if limit:
            no_desc = no_desc[:limit]

        print(f"\n{'='*60}")
        print(f"DESCRIPTION ENRICHMENT: {len(no_desc)} products to process")
        print(f"{'='*60}")

        for i, p in enumerate(no_desc, 1):
            name = p['name']
            url = p.get('url')
            pid = p['id']
            type_name = types_by_id.get(p.get('type_id'), {}).get('name', '')

            print(f"\n[{i}/{len(no_desc)}] {name} (id={pid})")

            if not url:
                print(f"  -> No URL, skipping")
                self.stats['no_url'] += 1
                continue

            # Scrape with fallback chain
            content = self.scrape_url(url)
            desc = None
            if content and len(content) >= 100:
                print(f"  -> Scraped {len(content)} chars")
                desc = self.generate_description(name, url, content, type_name)
                if not desc:
                    print(f"  -> Scrape-based description rejected, trying AI knowledge fallback")
                    desc = self.generate_from_knowledge(name, url, type_name)
                    if desc:
                        self.stats['from_knowledge'] += 1
            else:
                scrape_len = len(content) if content else 0
                print(f"  -> Scrape too short ({scrape_len} chars), using AI knowledge fallback")
                desc = self.generate_from_knowledge(name, url, type_name)
                if desc:
                    self.stats['from_knowledge'] += 1

            if not desc:
                print(f"  -> All generation methods failed")
                self.stats['all_failed'] += 1
                continue

            print(f"  -> Description: {desc[:80]}...")

            # Save
            if update_product(pid, {'description': desc}, dry_run=self.dry_run):
                self.stats['enriched'] += 1
            else:
                self.stats['save_failed'] += 1

            time.sleep(SCRAPE_DELAY)

        print(f"\n--- Description enrichment stats ---")
        for k, v in sorted(self.stats.items()):
            print(f"  {k}: {v}")
        return self.stats


# ============================================================
# 2. COINGECKO: Fetch coingecko_id, logo_url
# ============================================================
class CoinGeckoEnricher:
    """Fetches CoinGecko IDs and logo URLs for crypto products."""

    CG_API = "https://api.coingecko.com/api/v3"

    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.cg_headers = {
            'Accept': 'application/json',
            'User-Agent': 'SafeScoring/1.0'
        }
        self.stats = Counter()
        self._coin_list = None

    def _load_coin_list(self):
        """Load the full CoinGecko coin list for matching."""
        if self._coin_list is not None:
            return self._coin_list

        print("  Loading CoinGecko coin list...")
        r = requests.get(f"{self.CG_API}/coins/list?include_platform=true",
                         headers=self.cg_headers, timeout=30)
        if r.status_code == 200:
            self._coin_list = r.json()
            print(f"  -> {len(self._coin_list)} coins loaded")
        else:
            print(f"  -> Failed to load coin list: {r.status_code}")
            self._coin_list = []
        return self._coin_list

    def _find_coin(self, product_name, product_slug=None):
        """Search CoinGecko for a matching coin using local list + search API."""
        name_lower = product_name.lower().strip()
        # Clean common suffixes
        name_clean = re.sub(r'\s+(protocol|finance|network|exchange|swap|bridge|labs?|staking|card|wallet)$', '', name_lower, flags=re.IGNORECASE)

        # 1. Try local coin list first (more reliable)
        coin_list = self._load_coin_list()
        if coin_list:
            # Exact name match
            for coin in coin_list:
                if coin.get('name', '').lower() == name_lower or coin.get('name', '').lower() == name_clean:
                    return coin['id']
            # Exact ID/symbol match
            for coin in coin_list:
                if coin.get('id', '') == name_clean.replace(' ', '-') or coin.get('symbol', '').lower() == name_clean:
                    return coin['id']

        # 2. Search API fallback
        try:
            r = requests.get(f"{self.CG_API}/search?query={quote(product_name)}",
                             headers=self.cg_headers, timeout=10)
            if r.status_code == 200:
                coins = r.json().get('coins', [])
                if coins:
                    for coin in coins[:5]:
                        if coin['name'].lower() == name_lower or coin['name'].lower() == name_clean:
                            return coin['id']
        except Exception:
            pass

        return None

    def _get_coin_details(self, coin_id):
        """Get detailed coin info including logo."""
        r = requests.get(
            f"{self.CG_API}/coins/{coin_id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false",
            headers=self.cg_headers, timeout=15)
        if r.status_code == 200:
            return r.json()
        return None

    def run(self, products, types_by_id, limit=None):
        """Enrich products with CoinGecko data."""
        # Only enrich products that don't already have a coingecko_id
        to_enrich = [p for p in products if not p.get('coingecko_id')]

        if limit:
            to_enrich = to_enrich[:limit]

        print(f"\n{'='*60}")
        print(f"COINGECKO ENRICHMENT: {len(to_enrich)} products to process")
        print(f"{'='*60}")

        for i, p in enumerate(to_enrich, 1):
            name = p['name']
            pid = p['id']
            slug = p.get('slug', '')

            print(f"[{i}/{len(to_enrich)}] {name}...", end=' ')

            try:
                coin_id = self._find_coin(name, slug)
                if not coin_id:
                    print("-> No match")
                    self.stats['no_match'] += 1
                    time.sleep(CG_DELAY)
                    continue

                time.sleep(CG_DELAY)  # Rate limit between search and details

                details = self._get_coin_details(coin_id)
                if not details:
                    print(f"-> Details failed for {coin_id}")
                    self.stats['details_failed'] += 1
                    continue

                update_data = {'coingecko_id': coin_id}

                # Logo
                logo = details.get('image', {}).get('large') or details.get('image', {}).get('small')
                if logo:
                    update_data['logo_url'] = logo

                # Description fallback (only if product has no description)
                if not p.get('description') or len(str(p.get('description', ''))) < 10:
                    cg_desc = details.get('description', {}).get('en', '')
                    if cg_desc:
                        clean_desc = re.sub(r'<[^>]+>', '', cg_desc)[:500]
                        if len(clean_desc) > 20:
                            update_data['description'] = clean_desc

                if update_product(pid, update_data, dry_run=self.dry_run):
                    self.stats['enriched'] += 1
                    fields = list(update_data.keys())
                    print(f"-> {coin_id} ({', '.join(fields)})")
                else:
                    self.stats['save_failed'] += 1
                    print("-> Save failed")

            except Exception as e:
                print(f"-> Error: {e}")
                self.stats['error'] += 1

            time.sleep(CG_DELAY)

        print(f"\n--- CoinGecko enrichment stats ---")
        for k, v in sorted(self.stats.items()):
            print(f"  {k}: {v}")
        return self.stats


# ============================================================
# 3. DEFILLAMA: Fetch defillama_slug for DeFi products
# ============================================================
class DefiLlamaEnricher:
    """Fetches DefiLlama slugs for DeFi products."""

    DL_API = "https://api.llama.fi"
    DEFI_TYPES = {'DEX', 'Lending', 'Yield', 'Liq Staking', 'Bridges', 'DeFi Tools',
                  'Options', 'RWA', 'Stablecoin'}
    EXCLUDE_TYPES = {'Card', 'SW Mobile', 'SW Browser', 'SW Desktop', 'HW Cold',
                     'Bkp Physical', 'Bkp Digital', 'Research'}

    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.stats = Counter()
        self._protocols = None

    def _load_protocols(self):
        """Load all DefiLlama protocols for matching."""
        if self._protocols is not None:
            return self._protocols

        print("  Loading DefiLlama protocols...")
        r = requests.get(f"{self.DL_API}/protocols", timeout=30)
        if r.status_code == 200:
            self._protocols = r.json()
            print(f"  -> {len(self._protocols)} protocols loaded")
        else:
            print(f"  -> Failed: {r.status_code}")
            self._protocols = []
        return self._protocols

    def _find_protocol(self, product_name):
        """Match a product name to a DefiLlama protocol."""
        protocols = self._load_protocols()
        name_lower = product_name.lower().strip()
        # Remove common suffixes for matching
        name_clean = re.sub(r'\s+(protocol|finance|network|exchange|swap|bridge|labs?)$', '', name_lower, flags=re.IGNORECASE)

        # Exact match first
        for p in protocols:
            p_name = p.get('name', '').lower()
            if p_name == name_lower or p_name == name_clean:
                return p.get('slug')

        # Close partial match: product name must be >=80% of protocol name or vice versa
        for p in protocols:
            p_name = p.get('name', '').lower()
            if not p_name:
                continue
            # Only match if one is a substring AND length ratio > 0.7
            if name_clean in p_name or p_name in name_clean:
                ratio = min(len(name_clean), len(p_name)) / max(len(name_clean), len(p_name))
                if ratio > 0.7:
                    return p.get('slug')

        return None

    def run(self, products, types_by_id, limit=None):
        """Enrich DeFi products with DefiLlama slugs."""
        # Only DeFi-type products without defillama_slug
        defi_products = []
        for p in products:
            if p.get('defillama_slug'):
                continue
            type_code = types_by_id.get(p.get('type_id'), {}).get('code', '')
            if type_code in self.EXCLUDE_TYPES:
                continue
            if type_code in self.DEFI_TYPES or any(kw in type_code.lower() for kw in ['defi', 'dex', 'lend', 'yield', 'stak', 'bridge']):
                defi_products.append(p)

        if limit:
            defi_products = defi_products[:limit]

        print(f"\n{'='*60}")
        print(f"DEFILLAMA ENRICHMENT: {len(defi_products)} DeFi products to process")
        print(f"{'='*60}")

        for i, p in enumerate(defi_products, 1):
            name = p['name']
            pid = p['id']

            print(f"[{i}/{len(defi_products)}] {name}...", end=' ')

            slug = self._find_protocol(name)
            if not slug:
                print("-> No match")
                self.stats['no_match'] += 1
                continue

            if update_product(pid, {'defillama_slug': slug}, dry_run=self.dry_run):
                self.stats['enriched'] += 1
                print(f"-> {slug}")
            else:
                self.stats['save_failed'] += 1
                print("-> Save failed")

            time.sleep(DL_DELAY)

        print(f"\n--- DefiLlama enrichment stats ---")
        for k, v in sorted(self.stats.items()):
            print(f"  {k}: {v}")
        return self.stats


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='Auto-enrich product data')
    parser.add_argument('--descriptions', action='store_true', help='Generate descriptions for products without one')
    parser.add_argument('--coingecko', action='store_true', help='Enrich coingecko_id + logo_url')
    parser.add_argument('--defillama', action='store_true', help='Enrich defillama_slug for DeFi products')
    parser.add_argument('--all', action='store_true', help='Run all enrichment tasks')
    parser.add_argument('--limit', type=int, help='Max products per task')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing to DB')
    args = parser.parse_args()

    if not any([args.descriptions, args.coingecko, args.defillama, args.all]):
        parser.print_help()
        return

    print("Loading products...")
    products = fetch_all('products',
        select='id,name,slug,url,description,type_id,coingecko_id,defillama_slug,logo_url',
        order='id',
        filters={'deleted_at': 'is.null'})
    print(f"  {len(products)} active products loaded")

    types = fetch_all('product_types', select='id,code,name', order='id')
    types_by_id = {t['id']: t for t in types}
    print(f"  {len(types)} product types loaded")

    if args.all or args.coingecko:
        cg = CoinGeckoEnricher(dry_run=args.dry_run)
        cg.run(products, types_by_id, limit=args.limit)
        # Reload products to get updated coingecko_ids and descriptions
        if not args.dry_run:
            print("\nReloading products after CoinGecko enrichment...")
            products = fetch_all('products',
                select='id,name,slug,url,description,type_id,coingecko_id,defillama_slug,logo_url',
                order='id',
                filters={'deleted_at': 'is.null'})

    if args.all or args.defillama:
        dl = DefiLlamaEnricher(dry_run=args.dry_run)
        dl.run(products, types_by_id, limit=args.limit)

    if args.all or args.descriptions:
        de = DescriptionEnricher(dry_run=args.dry_run)
        de.run(products, types_by_id, limit=args.limit)

    print("\n" + "="*60)
    print("ENRICHMENT COMPLETE")
    print("="*60)


if __name__ == '__main__':
    main()
