#!/usr/bin/env python3
"""
SAFESCORING.IO - Scrape Product Pricing
Scrape pricing information from product websites and update Supabase.
Uses AI to extract and normalize pricing data.

Usage:
    python scrape_pricing.py                    # 10 products without pricing
    python scrape_pricing.py --limit 50         # 50 products
    python scrape_pricing.py --product "Ledger" # Specific product
    python scrape_pricing.py --all              # All products
    python scrape_pricing.py --force            # Re-scrape even with existing pricing
"""

import requests
import sys
import json
import time
import re
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from core.config import SUPABASE_URL, SUPABASE_KEY
from core.scraper import WebScraper
from core.api_provider import AIProvider

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# AI prompt for pricing extraction - Enhanced for accuracy
PRICING_EXTRACTION_PROMPT = """You are a financial data analyst specializing in cryptocurrency product pricing. Your task is to extract ACCURATE pricing information from the website content provided.

PRODUCT: {product_name}
CATEGORY: {product_type}
OFFICIAL WEBSITE: {url}

SCRAPED CONTENT:
{content}

═══════════════════════════════════════════════════════════════════

EXTRACTION TASK: Return ONLY a valid JSON object with these fields:

{{
  "price_eur": <number or null>,
  "price_usd": <number or null>,
  "price_details": "<concise English description - max 80 chars>",
  "pricing_model": "<category>",
  "confidence": <0.0 to 1.0>,
  "source_found": "<where you found the price info>"
}}

═══════════════════════════════════════════════════════════════════

CATEGORY-SPECIFIC EXTRACTION RULES:

▸ HARDWARE WALLETS (Ledger, Trezor, Keystone, etc.):
  - Look for: product price, bundle prices, shipping costs
  - price_eur/usd: Base device price (cheapest model if multiple)
  - price_details: "€XX one-time purchase" or "From €XX - no recurring fees"
  - pricing_model: "one_time"
  - Example: {{"price_eur": 79, "price_usd": 79, "price_details": "From €79 - one-time purchase", "pricing_model": "one_time", "confidence": 0.95, "source_found": "shop page"}}

▸ SOFTWARE WALLETS (MetaMask, Trust Wallet, Rabby, etc.):
  - Usually FREE to download/use
  - Look for: swap fees, bridge fees, premium features
  - price_details: "Free - X% swap fee" or "Free app"
  - pricing_model: "free" or "freemium"
  - Example: {{"price_eur": null, "price_usd": null, "price_details": "Free - 0.875% swap fee", "pricing_model": "freemium", "confidence": 0.9, "source_found": "FAQ"}}

▸ DEX / SWAP PROTOCOLS (Uniswap, 1inch, Jupiter, etc.):
  - Look for: swap fees, liquidity provider fees, protocol fees, bridge fees
  - These are FREE to use but charge fees on transactions
  - price_details should include fee % if found: "Free - 0.3% swap fee" or "Aggregator - no extra fees"
  - pricing_model: "usage_based" or "variable"
  - Example: {{"price_eur": null, "price_usd": null, "price_details": "Free - 0.3% swap fee + gas", "pricing_model": "usage_based", "confidence": 0.85, "source_found": "docs"}}

▸ CENTRALIZED EXCHANGES (Binance, Kraken, Coinbase, etc.):
  - Look for: trading fees (maker/taker), withdrawal fees, deposit fees
  - price_details: "X% maker / Y% taker fees" or "Fees from X%"
  - pricing_model: "variable"
  - Example: {{"price_eur": null, "price_usd": null, "price_details": "0.1% maker / 0.1% taker fees", "pricing_model": "variable", "confidence": 0.9, "source_found": "fee schedule"}}

▸ CRYPTO CARDS (Crypto.com, Binance Card, etc.):
  - Look for: card fees, conversion fees, ATM fees, annual fees
  - price_details: "Free card - X% FX fee" or "€X/year + X% fees"
  - pricing_model: "freemium" or "variable"
  - Example: {{"price_eur": 0, "price_usd": 0, "price_details": "Free card - 0.5% FX fee", "pricing_model": "freemium", "confidence": 0.85, "source_found": "card page"}}

▸ DEFI PROTOCOLS (Aave, Compound, Lido, Abracadabra, etc.):
  - These are FREE to use - users only pay gas + protocol fees
  - Look for: protocol fees (%), borrowing rates, staking commissions
  - DO NOT extract TVL, token prices, or APY as "prices" - these are NOT fees
  - price_details: "Free - X% protocol fee" or "Variable rates - gas only"
  - pricing_model: "usage_based" or "free"
  - Example: {{"price_eur": null, "price_usd": null, "price_details": "Free - 10% fee on staking rewards", "pricing_model": "usage_based", "confidence": 0.8, "source_found": "protocol docs"}}

▸ SECURITY/AUDIT SERVICES (Certik, Hacken, etc.):
  - Look for: audit pricing, subscription plans
  - price_details: "From $X per audit" or "Contact for pricing"
  - pricing_model: "variable" or "subscription"

▸ PORTFOLIO TRACKERS (CoinGecko, DeBank, Zapper, etc.):
  - Usually freemium model
  - price_details: "Free - Pro from $X/month"
  - pricing_model: "freemium" or "free"

▸ BANKS / INSTITUTIONAL CUSTODY (AMINA, Anchorage, Fireblocks, etc.):
  - Usually require contact for custom pricing
  - If no public pricing found: price_details: "Contact for pricing"
  - pricing_model: "variable"
  - Example: {{"price_eur": null, "price_usd": null, "price_details": "Institutional - contact for pricing", "pricing_model": "variable", "confidence": 0.7, "source_found": "website"}}

═══════════════════════════════════════════════════════════════════

CONFIDENCE SCORING (be honest):
- 0.95-1.0: Exact price clearly stated on official page
- 0.85-0.94: Price found but may vary (tiers, regions)
- 0.70-0.84: Price inferred from documentation
- 0.50-0.69: Partial information, some guessing
- Below 0.5: Cannot reliably determine - return "unknown"

STRICT RULES:
1. ONLY extract prices you actually see in the content
2. DO NOT invent or guess prices - use null if not found
3. Convert prices to EUR if only USD shown (use 1 EUR = 1.10 USD)
4. For free products, set price_eur and price_usd to null, not 0
5. price_details MUST be in English, max 80 characters
6. If the product is clearly FREE, say "Free" in price_details
7. Be CONSERVATIVE with confidence - when in doubt, lower it
8. DO NOT extract TVL, market cap, token prices, or APY as product prices
9. For DeFi/DEX: only extract FEES (swap %, protocol %, etc.) not token values
10. If you see numbers like $1M+ or large values, these are NOT product prices
11. DO NOT use marketing slogans or promotional text in price_details
12. price_details should describe COSTS/FEES, not features or benefits

COMMON DEFI FEES TO LOOK FOR:
- Uniswap: 0.3% swap fee (LP fee) + 0.25% interface fee
- Aave: 0.09% flash loan fee + variable borrow APR (2-15%)
- Compound: Variable borrow APR
- Abracadabra: 0.5% borrow opening fee + variable interest
- 1inch: No protocol fee (aggregator), gas only
- Lido: 10% fee on staking rewards
- Curve: 0.04% swap fee

RETURN ONLY THE JSON OBJECT - NO MARKDOWN, NO EXPLANATION."""


class PricingScraper:
    """Scrape and extract pricing information from product websites."""

    def __init__(self):
        self.web_scraper = WebScraper()
        self.ai_provider = AIProvider()
        self.products = []

        self.stats = {
            'processed': 0,
            'updated': 0,
            'unchanged': 0,
            'errors': 0,
            'no_url': 0,
            'ai_failed': 0,
            'low_confidence': 0
        }

    def load_products(self, limit: int = 10, product_name: str = None,
                      force: bool = False, load_all: bool = False):
        """Load products from Supabase."""
        print("\n[LOAD] Loading products from Supabase...")

        # Build query
        query = f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,price_eur,price_details,type_id"

        if product_name:
            query += f"&name=ilike.*{product_name}*"
        elif not force:
            # Only products without pricing
            query += "&or=(price_eur.is.null,price_details.is.null)"

        query += "&order=name"

        if not load_all and not product_name:
            query += f"&limit={limit}"

        r = requests.get(query, headers=SUPABASE_HEADERS)

        if r.status_code == 200:
            self.products = r.json()
            print(f"   {len(self.products)} products loaded")
        else:
            print(f"   [ERROR] Failed to load: {r.status_code}")
            print(f"   {r.text}")
            sys.exit(1)

    def get_product_type(self, product: Dict) -> str:
        """Get product type name from type_id."""
        type_id = product.get('type_id')
        if not type_id:
            return "Unknown"

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?id=eq.{type_id}&select=name",
            headers=SUPABASE_HEADERS
        )

        if r.status_code == 200:
            types = r.json()
            if types:
                return types[0].get('name', 'Unknown')

        return "Unknown"

    def extract_pricing_with_ai(self, product: Dict, content: str) -> Optional[Dict]:
        """Use AI to extract pricing from scraped content."""
        product_type = self.get_product_type(product)

        prompt = PRICING_EXTRACTION_PROMPT.format(
            product_name=product.get('name', 'Unknown'),
            product_type=product_type,
            url=product.get('url', ''),
            content=content[:12000]  # Limit content size
        )

        response = self.ai_provider.call(prompt, max_tokens=500, temperature=0.1)

        if not response:
            return None

        # Parse JSON from response
        try:
            # Clean response (remove markdown if present)
            response = response.strip()
            if response.startswith('```'):
                response = re.sub(r'^```(?:json)?\s*', '', response)
                response = re.sub(r'\s*```$', '', response)

            # Try to find JSON object in response (handle nested braces)
            # First try to find the outermost JSON object
            brace_count = 0
            start_idx = -1
            for i, char in enumerate(response):
                if char == '{':
                    if brace_count == 0:
                        start_idx = i
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0 and start_idx != -1:
                        response = response[start_idx:i+1]
                        break

            return json.loads(response)
        except json.JSONDecodeError as e:
            print(f"      JSON parse error: {e}")
            # Try to extract key values manually using regex
            try:
                price_eur_match = re.search(r'"price_eur":\s*(\d+\.?\d*|null)', response)
                price_usd_match = re.search(r'"price_usd":\s*(\d+\.?\d*|null)', response)
                details_match = re.search(r'"price_details":\s*"([^"]*)"', response)
                model_match = re.search(r'"pricing_model":\s*"([^"]*)"', response)
                conf_match = re.search(r'"confidence":\s*([\d.]+)', response)
                source_match = re.search(r'"source_found":\s*"([^"]*)"', response)

                if details_match or price_eur_match or price_usd_match:
                    result = {
                        'price_eur': None,
                        'price_usd': None,
                        'price_details': details_match.group(1) if details_match else '',
                        'pricing_model': model_match.group(1) if model_match else 'unknown',
                        'confidence': float(conf_match.group(1)) if conf_match else 0.6,
                        'source_found': source_match.group(1) if source_match else 'regex fallback'
                    }
                    if price_eur_match and price_eur_match.group(1) != 'null':
                        result['price_eur'] = float(price_eur_match.group(1))
                    if price_usd_match and price_usd_match.group(1) != 'null':
                        result['price_usd'] = float(price_usd_match.group(1))
                    return result
            except Exception as ex:
                print(f"      Regex fallback failed: {ex}")
            return None

    def scrape_shop_pages_with_playwright(self, urls: list, product_name: str) -> str:
        """Scrape shop/pricing pages with Playwright for SPA sites."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            return ""

        content_parts = []
        product_name_lower = product_name.lower()

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                page = context.new_page()

                for url in urls[:5]:  # Try first 5 shop URLs
                    try:
                        # Skip if URL doesn't look like a shop/pricing page
                        if not any(kw in url.lower() for kw in ['shop', 'store', 'buy', 'product', 'price', 'compare', 'collection', 'hardware']):
                            continue

                        page.goto(url, timeout=20000, wait_until='domcontentloaded')
                        page.wait_for_timeout(3000)  # Wait for JS to render prices

                        # Extract pricing-related content
                        pricing_text = page.evaluate('''() => {
                            // Look for price elements specifically
                            const priceSelectors = [
                                '.price', '.product-price', '[class*="price"]',
                                '.cost', '[class*="cost"]',
                                '.amount', '[class*="amount"]',
                                '.product', '.product-card', '[class*="product"]'
                            ];

                            let text = [];

                            // Get all elements that might contain prices
                            for (const selector of priceSelectors) {
                                const elements = document.querySelectorAll(selector);
                                elements.forEach(el => {
                                    const content = el.innerText.trim();
                                    if (content && (content.includes('€') || content.includes('$') ||
                                        content.includes('EUR') || content.includes('USD') ||
                                        /\\d+\\.\\d{2}/.test(content))) {
                                        text.push(content);
                                    }
                                });
                            }

                            // Also get main content
                            const main = document.querySelector('main, article, .content, #content, .main') || document.body;

                            // Remove nav, footer, etc
                            const remove = main.querySelectorAll('script, style, nav, footer, header, aside, iframe, noscript');
                            remove.forEach(el => el.remove());

                            text.push(main.innerText.substring(0, 8000));
                            return text.join('\\n');
                        }''')

                        if pricing_text and len(pricing_text) > 50:
                            content_parts.append(f"[SHOP:{url}]\n{pricing_text[:4000]}")
                            print(f"      Shop scraped: {len(pricing_text)} chars from {url}")

                    except Exception as e:
                        continue

                browser.close()

        except Exception as e:
            print(f"      Playwright shop error: {e}")

        return '\n\n'.join(content_parts)

    def update_product_pricing(self, product_id: str, pricing: Dict) -> bool:
        """Update product pricing in Supabase."""
        update_data = {}

        # Only update non-null values
        if pricing.get('price_eur') is not None:
            update_data['price_eur'] = pricing['price_eur']
        elif pricing.get('price_usd') is not None:
            # Convert USD to EUR (approximate)
            update_data['price_eur'] = round(pricing['price_usd'] / 1.10, 2)

        if pricing.get('price_details'):
            update_data['price_details'] = pricing['price_details'][:100]  # Limit length

        if not update_data:
            return False

        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
            headers=SUPABASE_HEADERS,
            json=update_data
        )

        return r.status_code in [200, 204]

    def scrape_product(self, product: Dict) -> bool:
        """Scrape pricing for a single product."""
        name = product.get('name', 'Unknown')
        url = product.get('url')
        product_id = product.get('id')
        product_type = self.get_product_type(product)

        print(f"\n[{self.stats['processed'] + 1}] {name}")
        print(f"    URL: {url or 'None'}")
        print(f"    Type: {product_type}")

        if not url:
            print("    [SKIP] No URL")
            self.stats['no_url'] += 1
            return False

        # Build extra pages based on product type
        extra_pages = []
        name_lower = name.lower()
        product_type_lower = product_type.lower()

        # For DeFi/DEX, look for fee documentation
        if any(kw in product_type_lower for kw in ['defi', 'dex', 'exchange', 'swap', 'lending', 'protocol']):
            base = url.rstrip('/')
            extra_pages = [
                f"{base}/docs",
                f"{base}/fees",
                f"{base}/faq",
                f"{base}/documentation"
            ]
            # Known DeFi fee pages
            if 'uniswap' in name_lower:
                extra_pages.extend([
                    "https://docs.uniswap.org/concepts/protocol/fees",
                    "https://support.uniswap.org/hc/en-us/articles/20131678274957-What-are-Uniswap-Labs-fees"
                ])
            elif 'aave' in name_lower:
                extra_pages.extend([
                    "https://docs.aave.com/faq/fees",
                    "https://aave.com/docs"
                ])
            elif 'abracadabra' in name_lower:
                extra_pages.extend([
                    "https://docs.abracadabra.money/",
                    "https://abracadabra.money/docs"
                ])
            elif 'compound' in name_lower:
                extra_pages.append("https://docs.compound.finance/")
            elif 'lido' in name_lower:
                extra_pages.append("https://lido.fi/faq")
            elif '1inch' in name_lower:
                extra_pages.append("https://help.1inch.io/en/articles/5972511-what-are-the-fees-charged-by-1inch")

        # For hardware wallets, try to find shop/pricing pages
        if 'hardware' in product_type_lower or 'wallet' in product_type_lower:
            base = url.rstrip('/')
            extra_pages.extend([
                f"{base}/shop",
                f"{base}/store",
                f"{base}/buy",
                f"{base}/products",
                f"{base}/pricing"
            ])
            # Add product-specific shop links for known brands
            if 'ledger' in name_lower:
                # Specific product pages with prices
                if 'nano s plus' in name_lower:
                    extra_pages.insert(0, "https://shop.ledger.com/products/ledger-nano-s-plus")
                elif 'nano x' in name_lower:
                    extra_pages.insert(0, "https://shop.ledger.com/products/ledger-nano-x")
                elif 'flex' in name_lower:
                    extra_pages.insert(0, "https://shop.ledger.com/products/ledger-flex")
                elif 'stax' in name_lower:
                    extra_pages.insert(0, "https://shop.ledger.com/products/ledger-stax")
                extra_pages.extend([
                    "https://shop.ledger.com",
                    "https://shop.ledger.com/collections/hardware-wallets"
                ])
            elif 'trezor' in name_lower:
                extra_pages.extend([
                    "https://trezor.io/trezor-safe-3",
                    "https://trezor.io/trezor-safe-5",
                    "https://trezor.io/compare"
                ])
            elif 'keystone' in name_lower:
                extra_pages.extend([
                    "https://shop.keyst.one",
                    "https://keyst.one/shop"
                ])

        # Scrape website with extra pages for pricing
        print("    Scraping website...")

        # For hardware wallets with known SPA shops, scrape shop directly with Playwright first
        shop_content = ""
        if extra_pages:
            shop_content = self.scrape_shop_pages_with_playwright(extra_pages, name)

        modified_product = dict(product)
        if extra_pages:
            specs = modified_product.get('specs') or {}
            doc_urls = specs.get('doc_urls') or {}
            for i, page in enumerate(extra_pages[:5]):
                doc_urls[f'pricing_{i}'] = page
            specs['doc_urls'] = doc_urls
            modified_product['specs'] = specs

        content = self.web_scraper.scrape_product(modified_product, max_pages=12, max_chars=18000)

        # Prepend shop content if we got any
        if shop_content:
            content = f"[SHOP PRICING DATA]\n{shop_content}\n\n{content or ''}"

        if not content or len(content) < 100:
            print("    [ERROR] Could not scrape website")
            self.stats['errors'] += 1
            return False

        # Extract pricing with AI
        print("    Extracting pricing with AI...")
        pricing = self.extract_pricing_with_ai(product, content)

        if not pricing:
            print("    [ERROR] AI extraction failed")
            self.stats['ai_failed'] += 1
            return False

        confidence = pricing.get('confidence', 0)
        print(f"    Confidence: {confidence:.0%}")

        if confidence < 0.5:
            print("    [SKIP] Low confidence")
            self.stats['low_confidence'] += 1
            return False

        # Display extracted pricing
        price_eur = pricing.get('price_eur')
        price_usd = pricing.get('price_usd')
        price_details = pricing.get('price_details', '')
        pricing_model = pricing.get('pricing_model', 'unknown')
        source_found = pricing.get('source_found', 'unknown')

        price_str = f"€{price_eur}" if price_eur else (f"${price_usd}" if price_usd else "N/A")
        print(f"    Price: {price_str}")
        print(f"    Details: {price_details}")
        print(f"    Model: {pricing_model} | Source: {source_found}")

        # Update database
        if self.update_product_pricing(product_id, pricing):
            print("    [OK] Updated in Supabase")
            self.stats['updated'] += 1
            return True
        else:
            print("    [ERROR] Failed to update Supabase")
            self.stats['errors'] += 1
            return False

    def run(self):
        """Run the pricing scraper on all loaded products."""
        if not self.products:
            print("\n[ERROR] No products to process")
            return

        print(f"\n{'='*60}")
        print(f"PRICING SCRAPER - {len(self.products)} products")
        print(f"{'='*60}")

        start_time = time.time()

        for product in self.products:
            self.stats['processed'] += 1

            try:
                self.scrape_product(product)
            except Exception as e:
                print(f"    [ERROR] Exception: {e}")
                self.stats['errors'] += 1

            # Rate limiting
            time.sleep(1)

        elapsed = time.time() - start_time

        # Print summary
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print(f"Processed:      {self.stats['processed']}")
        print(f"Updated:        {self.stats['updated']}")
        print(f"No URL:         {self.stats['no_url']}")
        print(f"AI Failed:      {self.stats['ai_failed']}")
        print(f"Low Confidence: {self.stats['low_confidence']}")
        print(f"Errors:         {self.stats['errors']}")
        print(f"Time:           {elapsed:.1f}s")
        print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description='Scrape product pricing information')
    parser.add_argument('--limit', type=int, default=10, help='Number of products to process')
    parser.add_argument('--product', type=str, help='Specific product name to scrape')
    parser.add_argument('--all', action='store_true', help='Process all products')
    parser.add_argument('--force', action='store_true', help='Re-scrape even with existing pricing')

    args = parser.parse_args()

    scraper = PricingScraper()
    scraper.load_products(
        limit=args.limit,
        product_name=args.product,
        force=args.force,
        load_all=args.all
    )
    scraper.run()


if __name__ == '__main__':
    main()
