#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Product Compatibility Updater
Updates product x product compatibility matrix using:
- Multi-source web scraping
- AI analysis (DeepSeek, Claude, Gemini, Ollama, Mistral)
- Type compatibility as baseline
- Full MULTI-TYPE product support
"""

import requests
import time
import json
import hashlib
from datetime import datetime

# Import from common modules
from .config import SUPABASE_URL, get_supabase_headers
from .api_provider import AIProvider
from .scraper import WebScraper


class ProductCompatibilityUpdater:
    """
    Updates product x product compatibility using web scraping and AI analysis.
    Supports MULTI-TYPE products via product_type_mapping table.
    """

    def __init__(self):
        self.headers = get_supabase_headers()
        self.products = []
        self.product_types = {}
        self.type_compatibility_cache = {}
        self.product_type_mapping = {}  # {product_id: [type_ids]}
        self.ai_provider = AIProvider()
        self.scraper = WebScraper()
        self.stats = {
            'analyzed': 0,
            'native': 0,        # 85%+ - officially supported
            'compatible': 0,    # 70-84% - works well
            'partial': 0,       # 50-69% - possible with effort
            'difficult': 0,     # 30-49% - requires workarounds
            'not_recommended': 0,  # <30% - too risky
            'skipped_by_type': 0,
            'errors': 0
        }

    def load_data(self):
        """Loads products, types, type mapping and type compatibility from Supabase"""
        print("\n[DATA] Loading from Supabase...")

        # Load products (without heavy specs field for initial load)
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id,description&order=name.asc",
            headers=self.headers
        )
        if r.status_code == 200:
            self.products = r.json()
        else:
            print(f"   [ERROR] Failed to load products: HTTP {r.status_code}")
            self.products = []
        print(f"   {len(self.products)} products")

        # Load product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description,category",
            headers=self.headers
        )
        types = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types}
        print(f"   {len(self.product_types)} product types")

        # Load product type mapping (multi-type support)
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary&order=is_primary.desc",
            headers=self.headers
        )
        self.product_type_mapping = {}
        if r.status_code == 200:
            for m in r.json():
                pid = m['product_id']
                if pid not in self.product_type_mapping:
                    self.product_type_mapping[pid] = []
                self.product_type_mapping[pid].append(m['type_id'])

        # Fallback: use products.type_id for products without mapping
        for product in self.products:
            pid = product['id']
            if pid not in self.product_type_mapping and product.get('type_id'):
                self.product_type_mapping[pid] = [product['type_id']]

        multi_count = sum(1 for types in self.product_type_mapping.values() if len(types) > 1)
        print(f"   {len(self.product_type_mapping)} products with types ({multi_count} multi-type)")

        # Load type compatibility
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/type_compatibility?select=type_a_id,type_b_id,is_compatible,compatibility_level,base_method,description",
            headers=self.headers
        )
        if r.status_code == 200:
            for row in r.json():
                # Store both directions for easy lookup
                key1 = (row['type_a_id'], row['type_b_id'])
                key2 = (row['type_b_id'], row['type_a_id'])
                self.type_compatibility_cache[key1] = row
                self.type_compatibility_cache[key2] = row
        print(f"   {len(self.type_compatibility_cache)//2} type compatibilities (bidirectional)")

    def get_product_type_ids(self, product):
        """Returns all type IDs for a product (supports multi-type)"""
        pid = product['id']
        if pid in self.product_type_mapping:
            return self.product_type_mapping[pid]
        if product.get('type_id'):
            return [product['type_id']]
        return []

    def get_product_types_info(self, product):
        """Returns type info for all types of a product"""
        type_ids = self.get_product_type_ids(product)
        return [self.product_types.get(tid, {}) for tid in type_ids if self.product_types.get(tid)]

    def get_existing_compatibilities(self):
        """Gets existing product compatibilities"""
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_compatibility?select=product_a_id,product_b_id,analyzed_at",
            headers=self.headers
        )
        if r.status_code == 200:
            return {(c['product_a_id'], c['product_b_id']): c.get('analyzed_at') for c in r.json()}
        return {}

    def content_hash(self, content):
        """Generate a hash of content for cache invalidation"""
        if not content:
            return None
        return hashlib.sha256(content.encode('utf-8')).hexdigest()[:32]

    def get_best_type_compatibility(self, types_a, types_b):
        """
        Find the best type compatibility between two multi-type products.
        Returns the most compatible pair or None.
        Priority: native > partial > via_bridge > incompatible
        """
        best_compat = None
        best_level = 99  # Lower is better

        level_priority = {
            'native': 1,
            'partial': 2,
            'via_bridge': 3,
            'incompatible': 4
        }

        for ta in types_a:
            for tb in types_b:
                ta_id = ta.get('id')
                tb_id = tb.get('id')

                # Same type = always compatible
                if ta_id == tb_id:
                    return {
                        'is_compatible': True,
                        'compatibility_level': 'native',
                        'base_method': 'Same product type',
                        'description': 'Products share the same type',
                        'type_a': ta,
                        'type_b': tb
                    }

                compat = self.type_compatibility_cache.get((ta_id, tb_id))

                if compat:
                    level = level_priority.get(compat.get('compatibility_level', 'partial'), 3)

                    if best_compat is None or level < best_level:
                        best_compat = compat.copy()
                        best_compat['type_a'] = ta
                        best_compat['type_b'] = tb
                        best_level = level

                        # If we found native compatibility, stop searching
                        if level == 1:
                            return best_compat

        return best_compat

    def analyze_product_compatibility(self, product_a, product_b, types_a, types_b, best_type_compat):
        """
        Analyzes compatibility between two products using scraping + AI.
        Supports MULTI-TYPE products.
        """
        # Get type codes for both products
        codes_a = set(t.get('code', '') for t in types_a)
        codes_b = set(t.get('code', '') for t in types_b)

        # SPECIAL CASE: Physical Backups have universal compatibility rules
        # They work with ANY wallet that generates BIP39 seed phrases
        is_backup_a = 'Bkp Physical' in codes_a or 'Bkp Digital' in codes_a
        is_backup_b = 'Bkp Physical' in codes_b or 'Bkp Digital' in codes_b

        if is_backup_a or is_backup_b:
            backup_product = product_a if is_backup_a else product_b
            other_product = product_b if is_backup_a else product_a
            other_codes = codes_b if is_backup_a else codes_a

            # Wallet types that generate seed phrases
            # NOTE: HW Hot, SW Web, Paper Wallet removed - not standard/orphan types
            wallet_types = {'HW Cold', 'SW Desktop', 'SW Mobile', 'SW Browser',
                          'Smart Wallet', 'MPC Wallet', 'MultiSig'}

            # DeFi/Protocol types (indirect compatibility - need wallet first)
            defi_types = {'DEX', 'DEX Agg', 'AMM', 'Lending', 'Yield', 'Derivatives',
                         'Liq Staking', 'DeFi Tools', 'Bridges'}

            # Check what type the other product is
            is_wallet = bool(other_codes & wallet_types)
            is_defi = bool(other_codes & defi_types)

            if is_wallet:
                # NATIVE: Physical backup works with any wallet's seed phrase
                print(f"      [AUTO] Physical backup x Wallet = NATIVE")
                return {
                    'compatible': True,
                    'confidence': 0.90,
                    'confidence_factors': '+bip39_standard +universal_seed_backup +wallet_type',
                    'method': 'BIP39 seed phrase backup',
                    'steps': f"1. Set up your {other_product['name']} wallet 2. Write your 12/24 word seed phrase on {backup_product['name']} 3. Store securely offline",
                    'limitations': 'Verify the backup supports the number of words your wallet generates (12 or 24)',
                    'justification': f"You can back up your {other_product['name']} seed phrase on {backup_product['name']}. Simply write down your 12 or 24 recovery words when setting up the wallet, and store them securely on this durable backup device."
                }
            elif is_defi:
                # PARTIAL: Works indirectly - backup protects your wallet which accesses DeFi
                print(f"      [AUTO] Physical backup x DeFi = PARTIAL")
                return {
                    'compatible': True,
                    'confidence': 0.55,
                    'confidence_factors': '+indirect_protection +wallet_required -not_direct_integration',
                    'method': 'Indirect protection via wallet backup',
                    'steps': f"1. Use a wallet to access {other_product['name']} 2. Back up your wallet's seed phrase on {backup_product['name']} 3. Your DeFi access is protected if you lose your wallet",
                    'limitations': 'Does not directly connect to the protocol - protects your wallet access',
                    'justification': f"While {backup_product['name']} doesn't connect directly to {other_product['name']}, it protects your access by backing up your wallet's seed phrase. If you lose your wallet, you can restore it and regain access to your DeFi positions."
                }

        # Scrape websites using shared scraper
        print(f"      Scraping {product_a['name'][:25]}...")
        content_a = self.scraper.scrape_product(product_a)

        print(f"      Scraping {product_b['name'][:25]}...")
        content_b = self.scraper.scrape_product(product_b)

        # Type compatibility context
        if best_type_compat:
            type_method = best_type_compat.get('base_method', 'Not defined')
            type_level = best_type_compat.get('compatibility_level', 'unknown')
            type_desc = best_type_compat.get('description', '')
            best_ta = best_type_compat.get('type_a', {})
            best_tb = best_type_compat.get('type_b', {})
        else:
            type_method = 'Not defined'
            type_level = 'unknown'
            type_desc = ''
            best_ta = types_a[0] if types_a else {}
            best_tb = types_b[0] if types_b else {}

        # Format types for prompt (multi-type support)
        types_a_str = ' + '.join([t.get('code', '?') for t in types_a]) if types_a else 'Unknown'
        types_b_str = ' + '.join([t.get('code', '?') for t in types_b]) if types_b else 'Unknown'
        names_a_str = ' / '.join([t.get('name', '?') for t in types_a]) if types_a else 'Unknown'
        names_b_str = ' / '.join([t.get('name', '?') for t in types_b]) if types_b else 'Unknown'

        # Build context about type compatibility
        type_context = f"""TYPE COMPATIBILITY CONTEXT:
- Product A types: {types_a_str} ({names_a_str})
- Product B types: {types_b_str} ({names_b_str})
- Best type pair: {best_ta.get('code', '?')} x {best_tb.get('code', '?')}
- Compatibility level: {type_level}
- Base connection method: {type_method}
{f'- Explanation: {type_desc}' if type_desc else ''}"""

        prompt = f"""You are a crypto ecosystem integration expert. Analyze the compatibility between these two SPECIFIC products.

PRODUCT A: {product_a['name']}
Type(s): {types_a_str} ({names_a_str})
Website: {product_a.get('url', 'N/A')}
{f"Documentation A: {content_a[:4000]}" if content_a else "No documentation available"}

PRODUCT B: {product_b['name']}
Type(s): {types_b_str} ({names_b_str})
Website: {product_b.get('url', 'N/A')}
{f"Documentation B: {content_b[:4000]}" if content_b else "No documentation available"}

{type_context}

ANALYSIS REQUIRED:
1. Are these two SPECIFIC products compatible and can work together?
2. What is the concrete connection/integration method?
3. Are there specific limitations, requirements, or prerequisites?
4. What are the step-by-step instructions to use them together?

Consider:
- Direct integrations (native support)
- Third-party bridges or connectors
- Manual processes that work but aren't automated
- Technical requirements (chains, protocols, standards)

SPECIAL CASE - PHYSICAL BACKUPS (Bkp Physical type):
Physical seed phrase backups (metal plates, capsules, etc.) have DIFFERENT compatibility rules:
- They are NATIVE (85%+) with ANY wallet (hardware or software) that generates BIP39 seed phrases
- They are PARTIAL (50-69%) with DeFi protocols/DEX - because you need a wallet first, then the backup protects that wallet's seed
- The "connection method" is simply: write down your 12/24 word seed phrase on the backup device
- Limitations depend on: number of words supported (12 vs 24), character set, durability
- Physical backups do NOT "connect" to products - they STORE the recovery phrase that your wallet generates

CONFIDENCE SCORING - Calculate based on these criteria (start at 0.5, add/subtract):

POSITIVE FACTORS (add to score):
+0.25: Official documentation mentions the other product by name
+0.15: Both support same blockchain networks (Ethereum, Bitcoin, etc.)
+0.10: Both support WalletConnect or standard connection protocols
+0.10: Same parent company or official partnership announced
+0.05: Community tutorials or guides exist for this integration
+0.05: Both products are actively maintained (updated in last 6 months)

NEGATIVE FACTORS (subtract from score):
-0.20: Products operate on incompatible networks with no bridge
-0.15: One product is a closed/proprietary ecosystem
-0.10: No documentation found for either product
-0.10: One product is deprecated, discontinued, or has security issues
-0.05: Integration requires complex manual steps or coding

FINAL SCORE INTERPRETATION:
0.85+: Native integration, officially supported
0.70-0.84: Works well, standard protocols or documented process
0.50-0.69: Possible with effort, partial compatibility
0.30-0.49: Difficult, requires workarounds or third-party tools
Below 0.30: Incompatible or not recommended

IMPORTANT WRITING STYLE:
- Write in 2nd person ("you can...", "connect your...", "simply...")
- NEVER use "users" or "the user" - speak directly to the reader
- Be engaging and actionable

Respond ONLY in valid JSON format:
{{"compatible": true/false, "confidence": 0.0-1.0, "confidence_factors": "+official_docs +same_network -closed_ecosystem (list factors found)", "method": "connection method (max 100 chars)", "steps": "1. Step one 2. Step two (max 300 chars)", "limitations": "any limitations or null", "justification": "MANDATORY: explain WHY in 2nd person - e.g. 'You can connect your Ledger to MetaMask...' (max 300 chars)"}}"""

        # Use strategic product compatibility analysis (quality + web context understanding)
        result = self.ai_provider.call_for_product_compatibility(prompt)

        if result:
            try:
                result = result.strip()
                # Clean JSON from markdown code blocks
                if result.startswith('```json'):
                    result = result[7:]
                if result.startswith('```'):
                    result = result[3:]
                if result.endswith('```'):
                    result = result[:-3]
                parsed = json.loads(result.strip())

                if isinstance(parsed, dict):
                    confidence = parsed.get('confidence', 0.5)
                    # Nuanced status labels based on confidence
                    if confidence >= 0.85:
                        status = "NATIVE"       # Officially supported integration
                    elif confidence >= 0.70:
                        status = "COMPATIBLE"   # Works well
                    elif confidence >= 0.50:
                        status = "PARTIAL"      # Possible with effort
                    elif confidence >= 0.30:
                        status = "DIFFICULT"    # Requires workarounds
                    else:
                        status = "NOT RECOMMENDED"  # Too risky or complex
                    method = parsed.get('method', '')[:100]
                    print(f"      Result: {status} ({confidence:.0%}) - {method}")

                    # Add content hashes for cache invalidation
                    parsed['_hash_a'] = self.content_hash(content_a)
                    parsed['_hash_b'] = self.content_hash(content_b)

                    return parsed
            except json.JSONDecodeError as e:
                print(f"      JSON parse error: {e}")
            except Exception as e:
                print(f"      Error: {e}")

        # Fallback - use type compatibility as baseline
        print("      AI analysis inconclusive - using type baseline")
        is_compat = True if best_type_compat and best_type_compat.get('is_compatible') else False
        return {
            'compatible': is_compat,
            'confidence': 0.3,
            'method': type_method if is_compat else 'Manual verification required',
            'steps': '',
            'limitations': 'AI analysis was inconclusive - based on type compatibility only',
            'justification': f"Based on type compatibility ({types_a_str} x {types_b_str} = {type_level}). {type_desc}" if best_type_compat else "Compatibility could not be determined automatically. Check both product websites for integration options.",
            '_hash_a': self.content_hash(content_a),
            '_hash_b': self.content_hash(content_b)
        }

    def save_product_compatibility(self, product_a_id, product_b_id, type_compatible, ai_result):
        """Saves a product compatibility record to Supabase"""
        data = {
            'product_a_id': product_a_id,
            'product_b_id': product_b_id,
            'type_compatible': type_compatible,
            'ai_compatible': ai_result.get('compatible', False),
            'ai_confidence': min(1.0, max(0.0, ai_result.get('confidence', 0.5))),
            'ai_confidence_factors': (ai_result.get('confidence_factors', '') or '')[:300],
            'ai_method': (ai_result.get('method', '') or '')[:500],
            'ai_steps': (ai_result.get('steps', '') or '')[:1000],
            'ai_limitations': (ai_result.get('limitations', '') or '')[:500] if ai_result.get('limitations') else None,
            'ai_justification': (ai_result.get('justification', '') or '')[:500],
            'analyzed_at': datetime.now().isoformat(),
            'analyzed_by': 'ai_scraper'
        }

        # Try insert first
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/product_compatibility",
            headers=self.headers,
            json=data
        )

        # If insert fails (duplicate), try update
        if r.status_code not in [200, 201]:
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/product_compatibility?product_a_id=eq.{product_a_id}&product_b_id=eq.{product_b_id}",
                headers=self.headers,
                json=data
            )

            # Also try the reverse pair
            if r.status_code not in [200, 201, 204]:
                r = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/product_compatibility?product_a_id=eq.{product_b_id}&product_b_id=eq.{product_a_id}",
                    headers=self.headers,
                    json=data
                )

        if r.status_code not in [200, 201, 204]:
            print(f"      [SAVE ERROR] HTTP {r.status_code}: {r.text[:200]}")
            return False

        print(f"      [SAVED] OK")
        return True

    def run(self, limit=None, product_ids=None, skip_existing=True, force_reanalyze=False):
        """
        Main execution - generates product x product compatibility matrix (MULTI-TYPE)

        Args:
            limit: Max number of pairs to analyze
            product_ids: List of specific product IDs to analyze (analyzes pairs with all other products)
            skip_existing: Skip already analyzed pairs (default True)
            force_reanalyze: Re-analyze even if content hasn't changed (default False)
        """
        print("""
======================================================================
     PRODUCT COMPATIBILITY UPDATER
     Using multi-source scraping + AI analysis
     MULTI-TYPE SUPPORT ENABLED
======================================================================
""")

        start_time = datetime.now()
        self.load_data()

        if not self.products:
            print("[ERROR] No products found!")
            return

        # Get existing compatibilities
        existing = {}
        if skip_existing:
            existing = self.get_existing_compatibilities()
            print(f"\n[INFO] {len(existing)} existing compatibilities")

        # Filter products if specific IDs provided
        products_to_analyze = self.products
        if product_ids:
            products_to_analyze = [p for p in self.products if p['id'] in product_ids]
            print(f"[INFO] Analyzing {len(products_to_analyze)} specific products")

        # Generate pairs
        pairs = []
        for product_a in products_to_analyze:
            for product_b in self.products:
                if product_a['id'] >= product_b['id']:
                    continue

                pair_key = (product_a['id'], product_b['id'])
                reverse_key = (product_b['id'], product_a['id'])

                if skip_existing:
                    if pair_key in existing or reverse_key in existing:
                        continue

                pairs.append((product_a, product_b))

        if limit:
            pairs = pairs[:limit]

        total_pairs = len(pairs)
        print(f"\n[ANALYSIS] {total_pairs} product pairs to analyze")

        if total_pairs == 0:
            print("[INFO] No pairs to analyze. Use --force to re-analyze existing pairs.")
            return

        for idx, (product_a, product_b) in enumerate(pairs):
            # Get all types for both products (multi-type support)
            types_a = self.get_product_types_info(product_a)
            types_b = self.get_product_types_info(product_b)

            if not types_a or not types_b:
                print(f"\n[{idx+1}/{total_pairs}] SKIPPED - Missing types")
                continue

            # Format type codes for display
            codes_a = ' + '.join([t.get('code', '?') for t in types_a])
            codes_b = ' + '.join([t.get('code', '?') for t in types_b])

            print(f"\n[{idx+1}/{total_pairs}] {product_a['name'][:25]} x {product_b['name'][:25]}")
            print(f"   Types: {codes_a} x {codes_b}")

            # Find best type compatibility between all type pairs
            best_type_compat = self.get_best_type_compatibility(types_a, types_b)

            # If type compatibility says incompatible, skip AI analysis
            if best_type_compat and best_type_compat.get('compatibility_level') == 'incompatible':
                print(f"   SKIPPED by type: {best_type_compat.get('base_method', 'Incompatible types')}")
                self.save_product_compatibility(
                    product_a['id'], product_b['id'],
                    type_compatible=False,
                    ai_result={
                        'compatible': False,
                        'confidence': 1.0,
                        'method': f"Incompatible by type ({codes_a} x {codes_b})",
                        'steps': '',
                        'limitations': 'These product types cannot work together directly',
                        'justification': f"You cannot directly connect {codes_a} with {codes_b}. {best_type_compat.get('description', 'There is no integration path between these product categories.')}"
                    }
                )
                self.stats['skipped_by_type'] += 1
                continue

            try:
                result = self.analyze_product_compatibility(
                    product_a, product_b, types_a, types_b, best_type_compat
                )

                if result:
                    type_compat = best_type_compat.get('is_compatible', True) if best_type_compat else True
                    if self.save_product_compatibility(product_a['id'], product_b['id'], type_compat, result):
                        self.stats['analyzed'] += 1
                        # Track by nuanced confidence level
                        conf = result.get('confidence', 0.5)
                        if conf >= 0.85:
                            self.stats['native'] += 1
                        elif conf >= 0.70:
                            self.stats['compatible'] += 1
                        elif conf >= 0.50:
                            self.stats['partial'] += 1
                        elif conf >= 0.30:
                            self.stats['difficult'] += 1
                        else:
                            self.stats['not_recommended'] += 1
                    else:
                        self.stats['errors'] += 1

            except Exception as e:
                print(f"   ERROR: {e}")
                self.stats['errors'] += 1

            # Rate limiting
            time.sleep(0.5)

        duration = datetime.now() - start_time
        print(f"""
======================================================================
                         COMPLETED
======================================================================
   Duration: {str(duration).split('.')[0]}
   Pairs analyzed: {self.stats['analyzed']}

   NATIVE (85%+):        {self.stats['native']}    - Official integration
   COMPATIBLE (70-84%):  {self.stats['compatible']}    - Works well
   PARTIAL (50-69%):     {self.stats['partial']}    - Possible with effort
   DIFFICULT (30-49%):   {self.stats['difficult']}    - Requires workarounds
   NOT RECOMMENDED (<30%): {self.stats['not_recommended']}    - Too risky

   Skipped (incompatible types): {self.stats['skipped_by_type']}
   Errors: {self.stats['errors']}
======================================================================
""")

        return self.stats


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Product Compatibility Updater')
    parser.add_argument('--limit', type=int, default=None, help='Max pairs to analyze')
    parser.add_argument('--product', type=str, default=None, help='Product name filter')
    parser.add_argument('--force', action='store_true', help='Re-analyze existing pairs')
    parser.add_argument('--stats', action='store_true', help='Show current stats only')

    args = parser.parse_args()

    updater = ProductCompatibilityUpdater()

    if args.stats:
        updater.load_data()
        existing = updater.get_existing_compatibilities()
        total_products = len(updater.products)
        total_possible = (total_products * (total_products - 1)) // 2
        print(f"""
Product Compatibility Statistics:
- Products: {total_products}
- Possible pairs: {total_possible}
- Analyzed pairs: {len(existing)}
- Remaining: {total_possible - len(existing)}
- Coverage: {len(existing) / total_possible * 100:.1f}%
""")
        return

    product_ids = None
    if args.product:
        updater.load_data()
        product_ids = [
            p['id'] for p in updater.products
            if args.product.lower() in p['name'].lower()
        ]
        if not product_ids:
            print(f"[ERROR] No product found matching '{args.product}'")
            return
        print(f"[INFO] Found {len(product_ids)} products matching '{args.product}'")

    updater.run(
        limit=args.limit,
        product_ids=product_ids,
        skip_existing=not args.force
    )


if __name__ == "__main__":
    main()
