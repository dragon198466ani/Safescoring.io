#!/usr/bin/env python3
"""
SAFESCORING.IO - Compatibility Analyzer
Automatically generates compatibility matrices:
1. Type × Type (21×21) via AI
2. Product × Product via scraping + AI
"""

import os
import sys
import json
import requests
import time
from datetime import datetime
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

def load_config():
    config = {}
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), 'config', 'env_template_free.txt'),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
            break
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
MISTRAL_API_KEY = CONFIG.get('MISTRAL_API_KEY', '')
GEMINI_API_KEY = CONFIG.get('GOOGLE_GEMINI_API_KEY', '')


# ═══════════════════════════════════════════════════════════════════════════
# COMPATIBILITY ANALYZER
# ═══════════════════════════════════════════════════════════════════════════

class CompatibilityAnalyzer:
    """Analyzes and generates compatibility matrices via AI"""
    
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.product_types = []
        self.products = []
        self.type_compatibility_cache = {}
        self.scrape_cache = {}
    
    # ───────────────────────────────────────────────────────────────────────
    # DATA LOADING
    # ───────────────────────────────────────────────────────────────────────
    
    def load_data(self):
        """Loads types and products from Supabase"""
        print("\n📂 LOADING DATA")
        print("=" * 60)
        
        # Product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description&order=code.asc",
            headers=self.headers
        )
        self.product_types = r.json() if r.status_code == 200 else []
        print(f"   📦 {len(self.product_types)} product types")
        
        # Products with their type
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,url,type_id&order=name.asc",
            headers=self.headers
        )
        self.products = r.json() if r.status_code == 200 else []
        print(f"   🏷️  {len(self.products)} products")
        
        # Load existing type compatibilities (cache)
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/type_compatibility?select=type_a_id,type_b_id,is_compatible,compatibility_level,base_method",
            headers=self.headers
        )
        if r.status_code == 200:
            for row in r.json():
                key = (row['type_a_id'], row['type_b_id'])
                self.type_compatibility_cache[key] = row
        print(f"   🔗 {len(self.type_compatibility_cache)} type compatibilities in cache")
    
    # ───────────────────────────────────────────────────────────────────────
    # SCRAPING (Enhanced - Multi-source)
    # ───────────────────────────────────────────────────────────────────────
    
    def scrape_site(self, url, product=None):
        """
        Scrapes complete product content from multiple sources:
        1. Official site (main pages + security, features, docs)
        2. External documentation (docs.*, gitbook, notion)
        3. GitHub README and documentation
        """
        if not url:
            return None
        
        # Cache
        if url in self.scrape_cache:
            return self.scrape_cache[url]
        
        # Headers pour le scraping
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
        
        # Pages importantes à chercher (mots-clés dans les URLs)
        important_keywords = [
            'security', 'secure', 'safety', 'protection', 'privacy',
            'features', 'feature', 'specs', 'specifications',
            'about', 'technology', 'tech', 'how-it-works',
            'docs', 'documentation', 'faq', 'help', 'support',
            'integration', 'connect', 'wallet', 'compatibility'
        ]
        
        class LinkAndTextExtractor(HTMLParser):
            def __init__(self, base_url):
                super().__init__()
                self.base_url = base_url
                self.base_domain = urlparse(base_url).netloc
                self.text = []
                self.links = set()
                self.external_docs = set()
                self.github_links = set()
                self.skip = False
            
            def handle_starttag(self, tag, attrs):
                if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe']:
                    self.skip = True
                
                if tag == 'a':
                    for attr, value in attrs:
                        if attr == 'href' and value:
                            full_url = urljoin(self.base_url, value)
                            parsed = urlparse(full_url)
                            
                            if 'github.com' in parsed.netloc:
                                self.github_links.add(full_url)
                            elif any(doc in parsed.netloc for doc in ['docs.', 'gitbook.io', 'notion.', 'readme.io']):
                                self.external_docs.add(full_url)
                            elif parsed.netloc == self.base_domain or not parsed.netloc:
                                if not any(x in full_url for x in ['#', '.pdf', '.zip', 'mailto:', 'tel:', 'javascript:']):
                                    self.links.add(full_url)
            
            def handle_endtag(self, tag):
                if tag in ['script', 'style', 'nav', 'footer', 'noscript', 'iframe']:
                    self.skip = False
            
            def handle_data(self, data):
                if not self.skip:
                    text = data.strip()
                    if text and len(text) > 2:
                        self.text.append(text)
        
        all_content = []
        visited_urls = set()
        urls_to_visit = [url]
        github_urls = set()
        docs_urls = set()
        max_pages = 5  # Limité pour la compatibilité (plus rapide)
        
        try:
            # === 1. SCRAPER LE SITE PRINCIPAL ===
            while urls_to_visit and len(visited_urls) < max_pages:
                current_url = urls_to_visit.pop(0)
                
                if current_url in visited_urls:
                    continue
                visited_urls.add(current_url)
                
                try:
                    r = requests.get(current_url, timeout=10, headers=headers)
                    
                    if r.status_code == 200:
                        parser = LinkAndTextExtractor(current_url)
                        parser.feed(r.text)
                        
                        github_urls.update(parser.github_links)
                        docs_urls.update(parser.external_docs)
                        
                        page_content = ' '.join(parser.text)
                        if page_content:
                            page_name = urlparse(current_url).path.split('/')[-1] or 'home'
                            all_content.append(f"[{page_name}] {page_content[:3000]}")
                        
                        for link in parser.links:
                            if link not in visited_urls:
                                link_lower = link.lower()
                                if any(kw in link_lower for kw in important_keywords):
                                    urls_to_visit.append(link)
                
                except Exception:
                    pass
            
            # === 2. SCRAPER DOCUMENTATION EXTERNE (max 2) ===
            for doc_url in list(docs_urls)[:2]:
                if doc_url in visited_urls:
                    continue
                visited_urls.add(doc_url)
                
                try:
                    r = requests.get(doc_url, timeout=10, headers=headers)
                    if r.status_code == 200:
                        parser = LinkAndTextExtractor(doc_url)
                        parser.feed(r.text)
                        page_content = ' '.join(parser.text)
                        if page_content:
                            all_content.append(f"[DOCS] {page_content[:3000]}")
                except Exception:
                    pass
            
            # === 3. SCRAPER GITHUB README (max 1) ===
            for gh_url in list(github_urls)[:1]:
                if gh_url in visited_urls:
                    continue
                visited_urls.add(gh_url)
                
                try:
                    parsed = urlparse(gh_url)
                    path_parts = parsed.path.strip('/').split('/')
                    
                    if len(path_parts) >= 2:
                        owner, repo = path_parts[0], path_parts[1]
                        readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
                        r = requests.get(readme_url, timeout=10, headers={'Accept': 'application/vnd.github.v3.raw'})
                        
                        if r.status_code == 200:
                            all_content.append(f"[GITHUB] {r.text[:3000]}")
                
                except Exception:
                    pass
            
            # Combiner le contenu
            content = '\n\n'.join(all_content)
            content = content[:12000]  # Limiter pour la compatibilité
            
            self.scrape_cache[url] = content
            return content
                
        except Exception:
            pass
        
        return None
    
    # ───────────────────────────────────────────────────────────────────────
    # AI CALLS
    # ───────────────────────────────────────────────────────────────────────
    
    def call_ai(self, prompt, expect_json=False):
        """Calls AI (Mistral or Gemini)"""
        result = None
        
        # Essayer Mistral
        if MISTRAL_API_KEY:
            result = self._call_mistral(prompt)
        
        # Fallback Gemini
        if not result and GEMINI_API_KEY:
            result = self._call_gemini(prompt)
        
        if result and expect_json:
            try:
                # Nettoyer le JSON
                result = result.strip()
                if result.startswith('```json'):
                    result = result[7:]
                if result.startswith('```'):
                    result = result[3:]
                if result.endswith('```'):
                    result = result[:-3]
                return json.loads(result.strip())
            except:
                return None
        
        return result
    
    def _call_mistral(self, prompt):
        """Mistral API call"""
        try:
            r = requests.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {MISTRAL_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'mistral-small-latest',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 0.2,
                    'max_tokens': 500
                },
                timeout=60
            )
            
            if r.status_code == 200:
                return r.json()['choices'][0]['message']['content'].strip()
        except Exception as e:
            print(f"      ⚠️ Mistral error: {e}")
        return None
    
    def _call_gemini(self, prompt):
        """Gemini API call"""
        try:
            r = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}',
                headers={'Content-Type': 'application/json'},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': 0.2, 'maxOutputTokens': 500}
                },
                timeout=60
            )
            
            if r.status_code == 200:
                return r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
        except Exception as e:
            print(f"      ⚠️ Gemini error: {e}")
        return None
    
    # ───────────────────────────────────────────────────────────────────────
    # PHASE 1: TYPE × TYPE COMPATIBILITY
    # ───────────────────────────────────────────────────────────────────────
    
    def generate_type_compatibility(self):
        """
        Generates TYPE × TYPE compatibility matrix via AI
        21 types × 21 types = 441 combinations (231 unique if symmetric)
        """
        print("\n🔄 PHASE 1: GENERATING TYPE × TYPE MATRIX")
        print("=" * 60)
        
        total = len(self.product_types) * len(self.product_types)
        processed = 0
        created = 0
        
        for type_a in self.product_types:
            for type_b in self.product_types:
                processed += 1
                
                # Skip si déjà en cache
                if (type_a['id'], type_b['id']) in self.type_compatibility_cache:
                    continue
                
                print(f"\n[{processed}/{total}] {type_a['code']} × {type_b['code']}")
                
                # Same type = always compatible
                if type_a['id'] == type_b['id']:
                    result = {
                        'compatible': True,
                        'level': 'native',
                        'method': 'Same product type',
                        'description': 'Products of the same type, native compatibility'
                    }
                else:
                    # AI analysis
                    result = self._analyze_type_compatibility(type_a, type_b)
                
                if result:
                    self._save_type_compatibility(type_a['id'], type_b['id'], result)
                    created += 1
                
                # Rate limiting
                time.sleep(0.3)
        
        print(f"\n✅ {created} new type compatibilities created")
    
    def _analyze_type_compatibility(self, type_a, type_b):
        """Analyzes compatibility between two types via AI"""
        
        prompt = f"""You are a crypto ecosystem expert. Analyze the compatibility between these two product TYPES:

TYPE A: {type_a['code']} - {type_a['name']}
Description: {type_a.get('description', 'N/A')}

TYPE B: {type_b['code']} - {type_b['name']}
Description: {type_b.get('description', 'N/A')}

QUESTION: Can these two product types work together in a crypto setup?

Compatibility examples:
- HW Cold (Hardware Wallet) + SW Browser (Extension) = Compatible via USB/Bluetooth
- DEX + Lending = Compatible (DeFi composable)
- CEX + HW Cold = Partially compatible (transfer only)
- Backup Physical + DEX = Incompatible (no direct link)

Respond ONLY in valid JSON:
{{"compatible": true/false, "level": "native|partial|via_bridge|incompatible", "method": "connection method", "description": "short explanation"}}"""

        result = self.call_ai(prompt, expect_json=True)
        
        if result and isinstance(result, dict):
            return result
        
        # Fallback if parsing fails
        return {
            'compatible': True,
            'level': 'partial',
            'method': 'To verify',
            'description': 'AI analysis inconclusive'
        }
    
    def _save_type_compatibility(self, type_a_id, type_b_id, result):
        """Saves a type compatibility to Supabase"""
        data = {
            'type_a_id': type_a_id,
            'type_b_id': type_b_id,
            'is_compatible': result.get('compatible', True),
            'compatibility_level': result.get('level', 'partial'),
            'base_method': result.get('method', ''),
            'description': result.get('description', ''),
            'analyzed_by': 'ai_auto',
            'analyzed_at': datetime.now().isoformat()
        }
        
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/type_compatibility",
            headers=self.headers,
            json=data
        )
        
        if r.status_code in [200, 201]:
            print(f"   ✅ {'Compatible' if result.get('compatible') else '❌ Incompatible'} - {result.get('method', '')[:40]}")
            # Cache it
            self.type_compatibility_cache[(type_a_id, type_b_id)] = data
        else:
            print(f"   ⚠️ Save error: {r.status_code}")
    
    # ───────────────────────────────────────────────────────────────────────
    # PHASE 2: PRODUCT × PRODUCT COMPATIBILITY
    # ───────────────────────────────────────────────────────────────────────
    
    def generate_product_compatibility(self, limit=None, product_ids=None):
        """
        Generates PRODUCT × PRODUCT compatibility via scraping + AI
        
        RULE: If type_A × type_B = incompatible → product incompatible (no analysis)
        """
        print("\n🔄 PHASE 2: PRODUCT × PRODUCT ANALYSIS")
        print("=" * 60)
        
        # Filtrer les produits
        products_to_analyze = self.products
        if product_ids:
            products_to_analyze = [p for p in self.products if p['id'] in product_ids]
        if limit:
            products_to_analyze = products_to_analyze[:limit]
        
        # Créer un map type_id -> type
        types_by_id = {t['id']: t for t in self.product_types}
        
        total_pairs = len(products_to_analyze) * len(self.products)
        processed = 0
        created = 0
        skipped_incompatible = 0
        
        for product_a in products_to_analyze:
            type_a = types_by_id.get(product_a.get('type_id'))
            if not type_a:
                continue
            
            for product_b in self.products:
                if product_a['id'] >= product_b['id']:  # Éviter doublons (A,B) et (B,A)
                    continue
                
                processed += 1
                type_b = types_by_id.get(product_b.get('type_id'))
                if not type_b:
                    continue
                
                # RULE: Check type compatibility first
                type_compat = self.type_compatibility_cache.get(
                    (type_a['id'], type_b['id'])
                ) or self.type_compatibility_cache.get(
                    (type_b['id'], type_a['id'])
                )
                
                if type_compat and not type_compat.get('is_compatible', True):
                    # Type incompatible → Product incompatible (no analysis)
                    self._save_product_compatibility(
                        product_a['id'], product_b['id'],
                        type_compatible=False,
                        ai_result={
                            'compatible': False,
                            'method': f"Incompatible: {type_a['code']} × {type_b['code']}",
                            'limitations': 'Product types incompatible by nature'
                        }
                    )
                    skipped_incompatible += 1
                    continue
                
                # Analyze via AI + scraping
                print(f"\n[{processed}] {product_a['name'][:20]} × {product_b['name'][:20]}")
                
                result = self._analyze_product_compatibility(
                    product_a, product_b, type_a, type_b, type_compat
                )
                
                if result:
                    self._save_product_compatibility(
                        product_a['id'], product_b['id'],
                        type_compatible=True,
                        ai_result=result
                    )
                    created += 1
                
                # Rate limiting
                time.sleep(0.5)
        
        print(f"\n✅ Summary:")
        print(f"   - {created} compatibilities analyzed")
        print(f"   - {skipped_incompatible} incompatible by type (skipped)")
    
    def _analyze_product_compatibility(self, product_a, product_b, type_a, type_b, type_compat):
        """Analyzes compatibility between two products via scraping + AI"""
        
        # Scrape sites
        print(f"   🌐 Scraping sites...")
        content_a = self.scrape_site(product_a.get('url'))
        content_b = self.scrape_site(product_b.get('url'))
        
        # Type context
        type_method = type_compat.get('base_method', 'Not defined') if type_compat else 'Not defined'
        
        prompt = f"""You are a crypto expert. Analyze the compatibility between these two SPECIFIC products:

PRODUCT A: {product_a['name']}
Type: {type_a['code']} ({type_a['name']})
Site: {product_a.get('url', 'N/A')}
{f"Documentation A: {content_a[:3000]}" if content_a else ""}

PRODUCT B: {product_b['name']}
Type: {type_b['code']} ({type_b['name']})
Site: {product_b.get('url', 'N/A')}
{f"Documentation B: {content_b[:3000]}" if content_b else ""}

CONTEXT: Types {type_a['code']} and {type_b['code']} are generally compatible via: {type_method}

QUESTIONS:
1. Are these two SPECIFIC products compatible?
2. What connection method to use?
3. Are there specific limitations?

Respond ONLY in valid JSON:
{{"compatible": true/false, "confidence": 0.0-1.0, "method": "method", "steps": "short steps", "limitations": "limitations or null"}}"""

        result = self.call_ai(prompt, expect_json=True)
        
        if result and isinstance(result, dict):
            status = "✅" if result.get('compatible') else "❌"
            method = result.get('method') or ''
            print(f"   {status} {method[:50]}")
            return result
        
        # Fallback if AI fails
        print("   ⚠️ AI analysis inconclusive")
        return {
            'compatible': True,
            'confidence': 0.3,
            'method': 'To verify manually',
            'steps': '',
            'limitations': 'AI analysis inconclusive'
        }
    
    def _save_product_compatibility(self, product_a_id, product_b_id, type_compatible, ai_result):
        """Saves a product compatibility to Supabase"""
        data = {
            'product_a_id': product_a_id,
            'product_b_id': product_b_id,
            'type_compatible': type_compatible,
            'ai_compatible': ai_result.get('compatible', False),
            'ai_confidence': ai_result.get('confidence', 0.5),
            'ai_method': ai_result.get('method', ''),
            'ai_steps': ai_result.get('steps', ''),
            'ai_limitations': ai_result.get('limitations', ''),
            'analyzed_at': datetime.now().isoformat(),
            'analyzed_by': 'ai_auto'
        }
        
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/product_compatibility",
            headers=self.headers,
            json=data
        )
        
        if r.status_code not in [200, 201]:
            # Maybe already exists, try update
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/product_compatibility?product_a_id=eq.{product_a_id}&product_b_id=eq.{product_b_id}",
                headers=self.headers,
                json=data
            )
    
    # ───────────────────────────────────────────────────────────────────────
    # MAIN EXECUTION
    # ───────────────────────────────────────────────────────────────────────
    
    def run(self, phase='all', limit=None):
        """
        Main execution
        
        Args:
            phase: 'types', 'products', or 'all'
            limit: Product limit to analyze (phase 2)
        """
        print("""
╔══════════════════════════════════════════════════════════════╗
║     🔗 COMPATIBILITY ANALYZER - Automatic Generation         ║
╚══════════════════════════════════════════════════════════════╝
""")
        
        start_time = datetime.now()
        
        # Load data
        self.load_data()
        
        # Phase 1: Type × Type
        if phase in ['types', 'all']:
            self.generate_type_compatibility()
        
        # Phase 2: Produit × Produit
        if phase in ['products', 'all']:
            self.generate_product_compatibility(limit=limit)
        
        # Summary
        duration = datetime.now() - start_time
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    ✅ COMPLETED                               ║
╠══════════════════════════════════════════════════════════════╣
║  Duration: {str(duration).split('.')[0]:<49} ║
║  Types analyzed: {len(self.product_types):<43} ║
║  Type compatibilities: {len(self.type_compatibility_cache):<37} ║
╚══════════════════════════════════════════════════════════════╝
""")


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Compatibility Analyzer - Automatic matrix generation')
    parser.add_argument('--phase', choices=['types', 'products', 'all'], default='all',
                        help='Phase to execute: types (21×21), products (N×N), or all')
    parser.add_argument('--limit', type=int, default=None,
                        help='Product limit to analyze (products phase)')
    
    args = parser.parse_args()
    
    analyzer = CompatibilityAnalyzer()
    analyzer.run(phase=args.phase, limit=args.limit)


if __name__ == "__main__":
    main()
