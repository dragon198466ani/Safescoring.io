#!/usr/bin/env python3
"""
SAFESCORING.IO - Batch Product Type Classifier
Classifies all products with AI using enhanced type definitions.
Uses all metadata: definition, includes, excludes, keywords, examples.

Usage:
    python classify_all_products.py --all                    # Classify all products
    python classify_all_products.py --batch 20 --start 0     # Classify by batch
    python classify_all_products.py --product "Ledger"       # Single product
    python classify_all_products.py --all --apply            # Apply changes
    python classify_all_products.py --all --apply --auto     # Apply without confirm
    python classify_all_products.py --resume                 # Resume from last run
"""

import requests
import json
import time
import re
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Add parent paths
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from core.config import SUPABASE_URL, SUPABASE_HEADERS
from core.api_provider import AIProvider
from core.scraper import WebScraper


class EnhancedTypeClassifier:
    """
    Enhanced product classifier using full type definitions from Supabase.
    Includes: definition, includes, excludes, keywords, examples, is_safe_applicable
    """

    def __init__(self):
        self.ai_provider = AIProvider()
        self.scraper = WebScraper()

        # Data from Supabase
        self.products = []
        self.product_types = {}  # {id: full type data}
        self.type_by_code = {}   # {code: id}
        self.current_mappings = {}  # {product_id: [{type_id, type_code, is_primary}]}
        self.categories = {}  # {category: [types]}

        # Results tracking
        self.results = []
        self.corrections = []
        self.verified = []
        self.errors = []

        # Progress file
        self.progress_file = Path(__file__).parent / 'classification_progress.json'

    def load_data(self):
        """Load all data from Supabase including enhanced type definitions"""
        print("\n[LOAD] Loading Supabase data...")

        # Load ENHANCED product types (with all new columns)
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,name_fr,category,definition,includes,excludes,risk_factors,examples,keywords,is_hardware,is_custodial,is_safe_applicable&order=category,code",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for t in r.json():
                self.product_types[t['id']] = t
                self.type_by_code[t['code']] = t['id']

                # Group by category
                cat = t.get('category', 'Other')
                if cat not in self.categories:
                    self.categories[cat] = []
                self.categories[cat].append(t)
            print(f"   {len(self.product_types)} types across {len(self.categories)} categories")

        # Load products
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id&order=name",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            self.products = r.json()
            print(f"   {len(self.products)} products")

        # Load current type mappings
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary&order=is_primary.desc",
            headers=SUPABASE_HEADERS
        )
        if r.status_code == 200:
            for m in r.json():
                pid = m['product_id']
                if pid not in self.current_mappings:
                    self.current_mappings[pid] = []
                type_info = self.product_types.get(m['type_id'], {})
                self.current_mappings[pid].append({
                    'type_id': m['type_id'],
                    'type_code': type_info.get('code', '?'),
                    'type_name': type_info.get('name', '?'),
                    'is_primary': m['is_primary']
                })
            print(f"   {len(self.current_mappings)} products with type mappings")

    def build_type_catalog(self) -> str:
        """Build comprehensive type catalog from enhanced definitions"""
        catalog = "# PRODUCT TYPE CATALOG\n\n"

        for category, types in sorted(self.categories.items()):
            catalog += f"\n## {category.upper()}\n\n"

            for t in sorted(types, key=lambda x: x['code']):
                catalog += f"### {t['code']} - {t.get('name', '')}\n"

                if t.get('definition'):
                    catalog += f"**Definition:** {t['definition']}\n"

                # Include criteria
                if t.get('includes'):
                    includes = t['includes']
                    if isinstance(includes, list):
                        catalog += f"**Includes:** {', '.join(includes)}\n"
                    elif isinstance(includes, str):
                        catalog += f"**Includes:** {includes}\n"

                # Exclude criteria
                if t.get('excludes'):
                    excludes = t['excludes']
                    if isinstance(excludes, list):
                        catalog += f"**Excludes:** {', '.join(excludes)}\n"
                    elif isinstance(excludes, str):
                        catalog += f"**Excludes:** {excludes}\n"

                # Examples
                if t.get('examples'):
                    examples = t['examples']
                    if isinstance(examples, list):
                        catalog += f"**Examples:** {', '.join(examples[:5])}\n"
                    elif isinstance(examples, str):
                        catalog += f"**Examples:** {examples}\n"

                # Keywords
                if t.get('keywords'):
                    keywords = t['keywords']
                    if isinstance(keywords, list):
                        catalog += f"**Keywords:** {', '.join(keywords[:8])}\n"
                    elif isinstance(keywords, str):
                        catalog += f"**Keywords:** {keywords}\n"

                # Flags
                flags = []
                if t.get('is_hardware'):
                    flags.append("HARDWARE")
                if t.get('is_custodial'):
                    flags.append("CUSTODIAL")
                if not t.get('is_safe_applicable', True):
                    flags.append("NO-SAFE-SCORE")
                if flags:
                    catalog += f"**Flags:** {', '.join(flags)}\n"

                catalog += "\n"

        return catalog

    def get_system_prompt(self) -> str:
        """Build comprehensive system prompt with all type definitions"""
        type_catalog = self.build_type_catalog()

        return f"""You are an expert crypto/blockchain product classifier.
Your task is to determine the correct type(s) for each product based on the official definitions.

{type_catalog}

## CLASSIFICATION RULES

### Rule 1: Multiple Types (max 3)
A product can have 1-3 types. Use multiple types when:
- The product clearly spans multiple categories (e.g., CEX + Card)
- Features match multiple type definitions

### Rule 2: Primary Type
The FIRST type should be the most specific/primary type.
Secondary types are additional functionalities.

### Rule 3: Use INCLUDES/EXCLUDES
- If a product matches INCLUDES criteria -> type applies
- If a product matches EXCLUDES criteria -> type does NOT apply

### Rule 4: Hardware Priority
For physical devices, always include the appropriate HW type as primary.

### Rule 5: Category Coherence
Prefer types from the same category when possible.
Cross-category types should have strong justification.

### Rule 6: is_safe_applicable consideration
- Types with is_safe_applicable=FALSE are services/read-only (no key management)
- Types with is_safe_applicable=TRUE manage keys/funds

## RESPONSE FORMAT

Respond ONLY with valid JSON (no text before or after):
```json
{{
    "product_name": "Product Name",
    "current_types": ["Type1", "Type2"],
    "recommended_types": ["Type1", "Type2"],
    "primary_type": "Type1",
    "analysis": "Brief analysis of the product",
    "changes": {{
        "add": ["types to add"],
        "remove": ["types to remove"],
        "reason": "Reason for changes"
    }},
    "confidence": "high/medium/low",
    "category": "Main category"
}}
```
"""

    def get_product_types(self, product_id: int) -> List[str]:
        """Get current types for a product"""
        mappings = self.current_mappings.get(product_id, [])
        return [m['type_code'] for m in mappings]

    def scrape_product(self, product: Dict) -> Optional[str]:
        """Scrape product website for context"""
        website = product.get('url', '')
        if not website:
            return None

        try:
            content = self.scraper.scrape_product(product, max_pages=3, max_chars=10000)
            return content
        except Exception as e:
            print(f"      [WARN] Scraping failed: {e}")
            return None

    def classify_product(self, product: Dict, web_content: Optional[str] = None) -> Optional[Dict]:
        """Classify a single product with AI"""
        product_name = product['name']
        current_types = self.get_product_types(product['id'])

        user_prompt = f"""## PRODUCT TO CLASSIFY

**Name:** {product_name}
**Website:** {product.get('url', 'Not available')}
**Current Types:** {', '.join(current_types) if current_types else 'None assigned'}

"""

        if web_content:
            user_prompt += f"""## WEBSITE CONTENT (excerpt)

{web_content[:8000]}

"""

        user_prompt += """## TASK

Analyze this product and determine its correct type(s) based on the official definitions.
Consider the INCLUDES and EXCLUDES criteria carefully.
"""

        system_prompt = self.get_system_prompt()

        try:
            # Combine prompts for API call
            full_prompt = f"{system_prompt}\n\n---\n\n{user_prompt}"
            response = self.ai_provider.call(full_prompt, max_tokens=1500)

            if response:
                # Extract JSON
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    result = json.loads(json_match.group())
                    result['product_id'] = product['id']
                    result['product_name'] = product_name
                    result['current_types'] = current_types
                    return result
        except json.JSONDecodeError as e:
            print(f"      [ERROR] JSON parse failed: {e}")
            self.errors.append({'product': product_name, 'error': str(e)})
        except Exception as e:
            print(f"      [ERROR] AI call failed: {e}")
            self.errors.append({'product': product_name, 'error': str(e)})

        return None

    def analyze_result(self, result: Dict) -> Tuple[bool, Dict]:
        """Analyze AI result and determine if changes needed"""
        if not result:
            return False, {}

        current = set(result.get('current_types', []))
        recommended = set(result.get('recommended_types', []))

        to_add = recommended - current
        to_remove = current - recommended

        needs_change = bool(to_add or to_remove)

        summary = {
            'product_id': result.get('product_id'),
            'product_name': result.get('product_name'),
            'current': list(current),
            'recommended': list(recommended),
            'primary_type': result.get('primary_type'),
            'to_add': list(to_add),
            'to_remove': list(to_remove),
            'analysis': result.get('analysis', ''),
            'confidence': result.get('confidence', 'medium'),
            'change_reason': result.get('changes', {}).get('reason', ''),
            'category': result.get('category', '')
        }

        return needs_change, summary

    def save_progress(self, processed_ids: List[int]):
        """Save progress for resume capability"""
        progress = {
            'timestamp': datetime.now().isoformat(),
            'processed_ids': processed_ids,
            'corrections_count': len(self.corrections),
            'verified_count': len(self.verified),
            'errors_count': len(self.errors)
        }
        with open(self.progress_file, 'w', encoding='utf-8') as f:
            json.dump(progress, f, indent=2)

    def load_progress(self) -> List[int]:
        """Load progress from previous run"""
        if self.progress_file.exists():
            try:
                with open(self.progress_file, 'r', encoding='utf-8') as f:
                    progress = json.load(f)
                    return progress.get('processed_ids', [])
            except:
                pass
        return []

    def classify_batch(self, products: List[Dict], scrape: bool = True, delay: float = 2.0) -> List[Dict]:
        """Classify a batch of products"""
        corrections = []
        processed_ids = []

        for i, product in enumerate(products):
            print(f"\n[{i+1}/{len(products)}] {product['name']}")
            current_types = self.get_product_types(product['id'])
            print(f"      Current: {', '.join(current_types) if current_types else 'None'}")

            # Scrape if enabled
            web_content = None
            if scrape and product.get('url'):
                print(f"      Scraping...")
                web_content = self.scrape_product(product)
                if web_content:
                    print(f"      Scraped {len(web_content)} chars")

            # AI classification
            print(f"      AI Analysis...")
            result = self.classify_product(product, web_content)

            if result:
                needs_change, summary = self.analyze_result(result)

                if needs_change:
                    corrections.append(summary)
                    print(f"      CHANGE NEEDED:")
                    print(f"         Current:     {', '.join(summary['current'])}")
                    print(f"         Recommended: {', '.join(summary['recommended'])}")
                    if summary['to_add']:
                        print(f"         + Add:       {', '.join(summary['to_add'])}")
                    if summary['to_remove']:
                        print(f"         - Remove:    {', '.join(summary['to_remove'])}")
                    print(f"         Confidence:  {summary['confidence']}")
                else:
                    self.verified.append(summary)
                    print(f"      OK - Types correct")
            else:
                print(f"      [SKIP] No AI result")

            processed_ids.append(product['id'])

            # Save progress every 10 products
            if len(processed_ids) % 10 == 0:
                self.save_progress(processed_ids)

            # Rate limiting
            time.sleep(delay)

        return corrections

    def apply_corrections(self, corrections: List[Dict], auto_confirm: bool = False):
        """Apply corrections to Supabase product_type_mapping"""
        if not corrections:
            print("\n[INFO] No corrections to apply")
            return

        print(f"\n[APPLY] {len(corrections)} corrections to apply")

        if not auto_confirm:
            print("\nCorrections detail:")
            for c in corrections:
                print(f"  {c['product_name']}: {' + '.join(c['current'])} -> {' + '.join(c['recommended'])}")

            confirm = input("\nApply these corrections? (y/N): ")
            if confirm.lower() != 'y':
                print("[SKIP] Corrections cancelled")
                return

        applied = 0
        for c in corrections:
            pid = c['product_id']

            # Remove types
            for type_code in c['to_remove']:
                type_id = self.type_by_code.get(type_code)
                if type_id:
                    r = requests.delete(
                        f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}&type_id=eq.{type_id}",
                        headers=SUPABASE_HEADERS
                    )
                    if r.status_code in [200, 204]:
                        print(f"   [{c['product_name']}] - {type_code}")

            # Add types
            is_first = True
            for type_code in c['recommended']:
                type_id = self.type_by_code.get(type_code)
                if type_id:
                    # Check if exists
                    r = requests.get(
                        f"{SUPABASE_URL}/rest/v1/product_type_mapping?product_id=eq.{pid}&type_id=eq.{type_id}",
                        headers=SUPABASE_HEADERS
                    )
                    if not r.json():
                        # Determine if primary (first recommended type)
                        is_primary = is_first and type_code == c.get('primary_type', c['recommended'][0])
                        data = {'product_id': pid, 'type_id': type_id, 'is_primary': is_primary}
                        r = requests.post(
                            f"{SUPABASE_URL}/rest/v1/product_type_mapping",
                            headers=SUPABASE_HEADERS,
                            json=data
                        )
                        if r.status_code in [200, 201]:
                            print(f"   [{c['product_name']}] + {type_code} {'(PRIMARY)' if is_primary else ''}")
                            applied += 1
                is_first = False

        print(f"\n[DONE] {applied} modifications applied")

    def export_results(self, filename: str = None):
        """Export results to JSON"""
        if not filename:
            filename = f"classification_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        filepath = Path(__file__).parent / filename

        results = {
            'timestamp': datetime.now().isoformat(),
            'corrections': self.corrections,
            'verified': self.verified,
            'errors': self.errors,
            'summary': {
                'total_evaluated': len(self.corrections) + len(self.verified),
                'corrections_needed': len(self.corrections),
                'verified_ok': len(self.verified),
                'errors': len(self.errors)
            }
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        print(f"\n[EXPORT] Results exported to {filepath}")

    def run(self,
            product_filter: Optional[str] = None,
            batch_size: int = 20,
            start: int = 0,
            scrape: bool = True,
            apply: bool = False,
            auto_confirm: bool = False,
            resume: bool = False):
        """Main classification run"""

        print("\n" + "=" * 70)
        print("SAFESCORING - ENHANCED PRODUCT TYPE CLASSIFIER")
        print("Using full type definitions with AI classification")
        print("=" * 70)
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Scraping: {'Enabled' if scrape else 'Disabled'}")
        print(f"Apply mode: {'Auto' if auto_confirm else 'Manual' if apply else 'Dry run'}")

        # Load data
        self.load_data()

        # Load progress if resuming
        processed_ids = []
        if resume:
            processed_ids = self.load_progress()
            if processed_ids:
                print(f"\n[RESUME] Skipping {len(processed_ids)} already processed products")

        # Filter products
        if product_filter:
            products = [p for p in self.products if product_filter.lower() in p['name'].lower()]
            print(f"\n[FILTER] {len(products)} products matching '{product_filter}'")
        else:
            products = self.products[start:start + batch_size]
            print(f"\n[BATCH] Products {start} to {start + len(products)}")

        # Skip already processed
        if processed_ids:
            products = [p for p in products if p['id'] not in processed_ids]

        if not products:
            print("[INFO] No products to classify")
            return []

        print(f"[INFO] {len(products)} products to classify")
        print("-" * 70)

        # Classify
        corrections = self.classify_batch(products, scrape=scrape)
        self.corrections = corrections

        # Summary
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Products evaluated: {len(products)}")
        print(f"Types correct: {len(self.verified)}")
        print(f"Corrections suggested: {len(corrections)}")
        print(f"Errors: {len(self.errors)}")

        if corrections:
            print("\nCorrections needed:")
            for c in corrections[:20]:  # Show first 20
                print(f"\n  {c['product_name']}")
                print(f"     Current:     {' + '.join(c['current']) if c['current'] else 'None'}")
                print(f"     Recommended: {' + '.join(c['recommended'])}")
                if c.get('change_reason'):
                    print(f"     Reason: {c['change_reason'][:80]}")

            if len(corrections) > 20:
                print(f"\n  ... and {len(corrections) - 20} more")

        # Apply if requested
        if apply and corrections:
            self.apply_corrections(corrections, auto_confirm=auto_confirm)

        # Export results
        self.export_results()

        return corrections


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description='Enhanced Product Type Classifier - AI classification with full type definitions',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python classify_all_products.py --product "Ledger"      # Single product
  python classify_all_products.py --batch 20 --start 0    # Batch mode
  python classify_all_products.py --all                   # All products (dry run)
  python classify_all_products.py --all --apply           # All + apply with confirm
  python classify_all_products.py --all --apply --auto    # All + auto apply
  python classify_all_products.py --resume                # Resume from last run
        """
    )
    parser.add_argument('--product', type=str, help='Filter by product name')
    parser.add_argument('--batch', type=int, default=20, help='Batch size (default: 20)')
    parser.add_argument('--start', type=int, default=0, help='Start index')
    parser.add_argument('--all', action='store_true', help='Classify all products')
    parser.add_argument('--no-scrape', action='store_true', help='Disable web scraping')
    parser.add_argument('--apply', action='store_true', help='Apply corrections to Supabase')
    parser.add_argument('--auto', action='store_true', help='Auto-confirm without prompt')
    parser.add_argument('--resume', action='store_true', help='Resume from last run')

    args = parser.parse_args()

    classifier = EnhancedTypeClassifier()

    if args.all:
        classifier.run(
            batch_size=999,
            scrape=not args.no_scrape,
            apply=args.apply,
            auto_confirm=args.auto,
            resume=args.resume
        )
    elif args.product:
        classifier.run(
            product_filter=args.product,
            scrape=not args.no_scrape,
            apply=args.apply,
            auto_confirm=args.auto
        )
    elif args.resume:
        classifier.run(
            batch_size=999,
            scrape=not args.no_scrape,
            apply=args.apply,
            auto_confirm=args.auto,
            resume=True
        )
    else:
        classifier.run(
            batch_size=args.batch,
            start=args.start,
            scrape=not args.no_scrape,
            apply=args.apply,
            auto_confirm=args.auto
        )


if __name__ == "__main__":
    main()
