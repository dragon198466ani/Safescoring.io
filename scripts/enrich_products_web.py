#!/usr/bin/env python3
"""
SAFESCORING - Web Enrichment Script
Finds missing product data and enriches via web search + AI.
"""

import requests
import json
import sys
import io
import time
import re
from datetime import datetime, timezone

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load env directly (avoid config module stdout issues)
def load_env():
    env = {}
    for path in ['.env', 'config/.env']:
        try:
            with open(path) as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        k, v = line.strip().split('=', 1)
                        env[k] = v
        except:
            pass
    return env

CONFIG = load_env()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SERVICE_KEY = CONFIG.get('SUPABASE_SERVICE_ROLE_KEY', '')

# Get API keys
GROQ_API_KEYS = [CONFIG.get('GROQ_API_KEY', '')] + [CONFIG.get(f'GROQ_API_KEY_{i}', '') for i in range(2, 10)]
GROQ_API_KEYS = [k for k in GROQ_API_KEYS if k and k.startswith('gsk_')]

SAMBANOVA_API_KEYS = [CONFIG.get('SAMBANOVA_API_KEY', '')] + [CONFIG.get(f'SAMBANOVA_API_KEY_{i}', '') for i in range(2, 30)]
SAMBANOVA_API_KEYS = [k for k in SAMBANOVA_API_KEYS if k and len(k) > 30]
HEADERS = {'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}', 'Content-Type': 'application/json'}

# Serper API for web search (free tier: 2500 queries/month)
SERPER_API_KEY = CONFIG.get('SERPER_API_KEY', '')

# Fields we want to enrich
FIELDS_TO_ENRICH = [
    'founded_year',
    'funding',
    'employees',
    'founders',
    'investors',
    'headquarters',
    'licenses',
]


def search_web(query, num_results=5):
    """Search the web using Serper API"""
    if not SERPER_API_KEY:
        return []

    url = "https://google.serper.dev/search"
    headers = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}
    data = {"q": query, "num": num_results}

    try:
        resp = requests.post(url, headers=headers, json=data, timeout=10)
        if resp.status_code == 200:
            results = resp.json().get('organic', [])
            return [{'title': r.get('title', ''), 'snippet': r.get('snippet', ''), 'link': r.get('link', '')} for r in results]
    except:
        pass
    return []


def search_duckduckgo(query, num_results=5):
    """Fallback: Search using DuckDuckGo HTML scraping"""
    try:
        # Use DuckDuckGo HTML search
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code == 200:
            results = []
            # Parse results from HTML
            import re
            # Find result snippets
            snippets = re.findall(r'class="result__snippet"[^>]*>([^<]+)<', resp.text)
            titles = re.findall(r'class="result__a"[^>]*>([^<]+)<', resp.text)
            links = re.findall(r'class="result__url"[^>]*>([^<]+)<', resp.text)

            for i in range(min(num_results, len(snippets))):
                results.append({
                    'title': titles[i] if i < len(titles) else '',
                    'snippet': snippets[i] if i < len(snippets) else '',
                    'link': links[i] if i < len(links) else ''
                })
            return results
    except Exception as e:
        pass
    return []


def scrape_website_info(url, product_name):
    """Scrape basic info from product website"""
    if not url:
        return []

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            text = resp.text[:50000]  # Limit to first 50KB

            # Extract relevant text
            import re
            # Remove scripts and styles
            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text)

            return [{'title': product_name, 'snippet': text[:5000], 'link': url}]
    except:
        pass
    return []


def extract_info_with_ai(product_name, product_type, search_results, fields_needed):
    """Use AI to extract specific information from search results"""

    # Build context from search results
    context = "\n\n".join([
        f"Source: {r['title']}\n{r['snippet']}\nURL: {r['link']}"
        for r in search_results if r.get('snippet')
    ])

    if not context:
        return {}

    prompt = f"""Extract information about {product_name} ({product_type}) from these search results.

Search Results:
{context}

Extract ONLY the following fields if found (return null if not found):
- founded_year: Year the company was founded (just the year, e.g., "2017")
- funding: Total funding raised (e.g., "$150M", "€50M Series B")
- employees: Number of employees (e.g., "500+", "100-200")
- founders: Names of founders (e.g., "Vitalik Buterin, Gavin Wood")
- investors: Major investors (e.g., "a16z, Sequoia")
- headquarters: Company headquarters location (e.g., "San Francisco, USA")
- licenses: Regulatory licenses (e.g., "MiCA, FCA regulated")

Return ONLY valid JSON with these fields. Use null for unknown values.
Example: {{"founded_year": "2018", "funding": "$100M", "employees": null}}"""

    # Try different AI providers
    result = None

    # Try Groq first (fastest)
    for api_key in GROQ_API_KEYS[:2]:
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                    "max_tokens": 500
                },
                timeout=30
            )
            if resp.status_code == 200:
                content = resp.json()['choices'][0]['message']['content']
                # Extract JSON from response
                json_match = re.search(r'\{[^{}]*\}', content)
                if json_match:
                    result = json.loads(json_match.group())
                    break
        except:
            continue

    # Try SambaNova if Groq failed
    if not result:
        for api_key in SAMBANOVA_API_KEYS[:2]:
            try:
                resp = requests.post(
                    "https://api.sambanova.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "Meta-Llama-3.1-70B-Instruct",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0,
                        "max_tokens": 500
                    },
                    timeout=30
                )
                if resp.status_code == 200:
                    content = resp.json()['choices'][0]['message']['content']
                    json_match = re.search(r'\{[^{}]*\}', content)
                    if json_match:
                        result = json.loads(json_match.group())
                        break
            except:
                continue

    # Clean result - remove null values
    if result:
        return {k: v for k, v in result.items() if v and v != 'null'}
    return {}


def get_products_needing_enrichment():
    """Get products with missing critical data"""
    print("Finding products needing enrichment...")

    products = []
    offset = 0

    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,url,price_details&offset={offset}&limit=500",
            headers=HEADERS, timeout=30
        )
        if resp.status_code != 200:
            break
        batch = resp.json()
        if not batch:
            break
        products.extend(batch)
        offset += 500
        if len(batch) < 500:
            break

    # Filter products needing enrichment
    needs_enrichment = []
    for p in products:
        details = p.get('price_details') or {}
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except:
                details = {}
        if details is None:
            details = {}

        missing_fields = []
        for field in FIELDS_TO_ENRICH:
            val = details.get(field) if details else None
            if not val or val in ['Variable', 'Voir site', 'Non divulgué', 'Voir site officiel']:
                missing_fields.append(field)

        if missing_fields:
            needs_enrichment.append({
                'id': p['id'],
                'name': p['name'],
                'url': p.get('url'),
                'current_details': details,
                'missing_fields': missing_fields
            })

    print(f"  {len(needs_enrichment)} products need enrichment")
    return needs_enrichment


def enrich_product(product):
    """Enrich a single product with web data"""
    name = product['name']
    missing = product['missing_fields']
    url = product.get('url')

    # Try multiple sources
    results = []

    # 1. Try Serper if available
    if SERPER_API_KEY:
        query = f"{name} crypto company founded funding investors headquarters"
        results = search_web(query)

    # 2. Try DuckDuckGo HTML search
    if not results:
        query = f"{name} crypto founded funding investors"
        results = search_duckduckgo(query)

    # 3. Scrape product website for more info
    if url:
        website_info = scrape_website_info(url, name)
        results.extend(website_info)

    if not results:
        return None

    # Get product type from current details
    prod_type = product['current_details'].get('product_type', 'crypto product')

    # Extract info with AI
    extracted = extract_info_with_ai(name, prod_type, results, missing)

    if not extracted:
        return None

    # Merge with existing data
    updated_details = {**product['current_details']}
    for field, value in extracted.items():
        if field in missing or not updated_details.get(field):
            updated_details[field] = value

    return updated_details


def update_product(product_id, price_details):
    """Update product in Supabase"""
    data = {
        'price_details': price_details,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }

    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
        headers=HEADERS, json=data, timeout=15
    )
    return resp.status_code in [200, 204]


def main():
    print("=" * 60)
    print("  SAFESCORING - WEB ENRICHMENT")
    print("=" * 60)

    # Check API keys
    has_search = bool(SERPER_API_KEY)
    has_ai = bool(GROQ_API_KEYS or SAMBANOVA_API_KEYS)

    print(f"\nSearch API: {'Serper' if has_search else 'DuckDuckGo (limited)'}")
    print(f"AI APIs: Groq ({len(GROQ_API_KEYS)}), SambaNova ({len(SAMBANOVA_API_KEYS)})")

    if not has_ai:
        print("\nERROR: No AI API keys configured!")
        return

    # Get products needing enrichment
    products = get_products_needing_enrichment()

    if not products:
        print("\nAll products are fully enriched!")
        return

    # Limit to 50 products per run to avoid API limits
    products = products[:50]
    print(f"\nProcessing {len(products)} products...")

    enriched = 0
    for i, product in enumerate(products):
        print(f"\n[{i+1}/{len(products)}] {product['name']}...")
        print(f"  Missing: {', '.join(product['missing_fields'][:3])}")

        new_details = enrich_product(product)

        if new_details:
            # Check what was found
            found = [f for f in product['missing_fields'] if new_details.get(f)]
            if found:
                print(f"  Found: {', '.join(found)}")
                if update_product(product['id'], new_details):
                    enriched += 1
                    print(f"  Updated!")
                else:
                    print(f"  Update failed")
            else:
                print(f"  No new data found")
        else:
            print(f"  No results")

        # Rate limiting
        time.sleep(1)

    print(f"\n{'='*60}")
    print(f"  DONE: {enriched}/{len(products)} products enriched")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
