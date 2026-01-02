#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Type Compatibility Generator
Generates the TYPE x TYPE compatibility matrix via AI analysis.
This matrix serves as the baseline for product-level compatibility.

21 product types = 441 combinations (231 unique pairs + 21 self-pairs)
"""

import requests
import time
import json
from datetime import datetime

# Import from common modules
from .config import SUPABASE_URL, get_supabase_headers
from .api_provider import AIProvider
from .ai_strategy import get_compatibility_strategy, AIModel


# Compatibility context examples for AI
COMPATIBILITY_CONTEXTS = {
    'security_storage': {
        'description': 'Security and storage interactions',
        'examples': [
            ('HW_COLD', 'SW_BROWSER', 'Compatible: Hardware wallet signs transactions from browser extension via USB/Bluetooth'),
            ('HW_COLD', 'BACKUP_PHYSICAL', 'Compatible: Seed phrase backup for hardware wallet recovery'),
            ('CUSTODY_INST', 'MPC', 'Native: MPC technology often used in institutional custody'),
        ]
    },
    'defi_composability': {
        'description': 'DeFi protocol interactions',
        'examples': [
            ('DEX', 'LENDING', 'Native: Swap tokens then deposit as collateral'),
            ('DEX', 'YIELD', 'Native: DEX LP tokens used in yield farming'),
            ('LENDING', 'STABLECOIN', 'Native: Mint stablecoins using collateral'),
        ]
    },
    'wallet_connections': {
        'description': 'Wallet and interface connections',
        'examples': [
            ('SW_BROWSER', 'DAPP', 'Native: Browser extension connects to dApps'),
            ('SW_MOBILE', 'DEX', 'Native: Mobile wallet connects to DEX via WalletConnect'),
            ('HW_COLD', 'CEX', 'Partial: Transfer only, no direct trading'),
        ]
    },
    'cross_chain': {
        'description': 'Cross-chain and bridge interactions',
        'examples': [
            ('BRIDGE', 'DEX', 'Partial: Bridge assets then swap on destination chain'),
            ('BRIDGE', 'SW_BROWSER', 'Native: Use wallet to interact with bridge'),
        ]
    }
}


class TypeCompatibilityGenerator:
    """
    Generates TYPE x TYPE compatibility matrix using AI.
    """

    def __init__(self):
        self.headers = get_supabase_headers()
        self.product_types = []
        self.existing_pairs = set()
        self.ai_provider = AIProvider()
        self.stats = {
            'total': 0,
            'created': 0,
            'skipped': 0,
            'errors': 0
        }

    def load_data(self):
        """Load product types and existing type compatibilities"""
        print("\n[DATA] Loading from Supabase...")

        # Load product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,description,category&order=code.asc",
            headers=self.headers
        )
        self.product_types = r.json() if r.status_code == 200 else []
        print(f"   {len(self.product_types)} product types")

        # Load existing type compatibilities
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/type_compatibility?select=type_a_id,type_b_id",
            headers=self.headers
        )
        if r.status_code == 200:
            for row in r.json():
                self.existing_pairs.add((row['type_a_id'], row['type_b_id']))
        print(f"   {len(self.existing_pairs)} existing type compatibilities")

    def build_context_examples(self):
        """Build a string of context examples for AI prompt"""
        examples = []
        for category, data in COMPATIBILITY_CONTEXTS.items():
            examples.append(f"\n{data['description']}:")
            for type_a, type_b, desc in data['examples']:
                examples.append(f"  - {type_a} + {type_b}: {desc}")
        return '\n'.join(examples)

    def analyze_type_compatibility(self, type_a, type_b):
        """
        Analyze compatibility between two product types using AI.
        Uses STRATEGIC MODEL SELECTION based on type pair complexity.
        Returns dict with compatibility info or None on error.
        """
        # Same type = always native compatible
        if type_a['id'] == type_b['id']:
            return {
                'is_compatible': True,
                'compatibility_level': 'native',
                'base_method': 'Same product type',
                'description': 'Products of the same type are natively compatible with each other.'
            }

        # Get type codes for strategy selection
        code_a = type_a.get('code', 'DEFAULT')
        code_b = type_b.get('code', 'DEFAULT')

        # Get strategic model for this type pair
        strategy = get_compatibility_strategy(code_a, code_b)
        criteria = strategy.get('criteria', [])

        context_examples = self.build_context_examples()

        prompt = f"""You are a crypto ecosystem expert. Analyze the compatibility between these two product TYPES:

TYPE A: {type_a['code']} - {type_a['name']}
Category: {type_a.get('category', 'N/A')}
Description: {type_a.get('description', 'No description')}

TYPE B: {type_b['code']} - {type_b['name']}
Category: {type_b.get('category', 'N/A')}
Description: {type_b.get('description', 'No description')}

COMPATIBILITY LEVELS:
- native: Direct integration, same ecosystem, built to work together
- partial: Works with some limitations or specific configurations
- via_bridge: Requires intermediary tool/service to connect
- incompatible: Cannot work together (fundamentally different purposes)

KEY CRITERIA TO EVALUATE: {', '.join(criteria) if criteria else 'general compatibility'}

REFERENCE EXAMPLES:
{context_examples}

ANALYSIS QUESTION:
Can products of type "{type_a['code']}" work with products of type "{type_b['code']}" in a crypto setup?
Consider: technical protocols, user workflows, data/asset flows, common integrations.

Respond ONLY in valid JSON:
{{"compatible": true/false, "level": "native|partial|via_bridge|incompatible", "method": "typical connection method (max 100 chars)", "description": "explanation of compatibility (max 200 chars)"}}"""

        # Use strategic model selection for this type pair
        result = self.ai_provider.call_for_compatibility(code_a, code_b, prompt, max_tokens=500, temperature=0.2)

        if result:
            try:
                # Clean JSON from markdown
                result = result.strip()
                if result.startswith('```json'):
                    result = result[7:]
                if result.startswith('```'):
                    result = result[3:]
                if result.endswith('```'):
                    result = result[:-3]

                parsed = json.loads(result.strip())

                if isinstance(parsed, dict):
                    return {
                        'is_compatible': parsed.get('compatible', True),
                        'compatibility_level': parsed.get('level', 'partial'),
                        'base_method': (parsed.get('method', '') or '')[:200],
                        'description': (parsed.get('description', '') or '')[:500]
                    }
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"      Parse error: {e}")

        # Fallback for parsing errors
        return {
            'is_compatible': True,
            'compatibility_level': 'partial',
            'base_method': 'Manual verification required',
            'description': 'AI analysis was inconclusive'
        }

    def save_type_compatibility(self, type_a_id, type_b_id, result):
        """Save type compatibility to Supabase"""
        data = {
            'type_a_id': type_a_id,
            'type_b_id': type_b_id,
            'is_compatible': result.get('is_compatible', True),
            'compatibility_level': result.get('compatibility_level', 'partial'),
            'base_method': result.get('base_method', ''),
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
            return True
        elif r.status_code == 409:  # Conflict - already exists
            # Try update
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/type_compatibility?type_a_id=eq.{type_a_id}&type_b_id=eq.{type_b_id}",
                headers=self.headers,
                json=data
            )
            return r.status_code in [200, 204]
        else:
            print(f"      Save error HTTP {r.status_code}: {r.text[:100]}")
            return False

    def run(self, skip_existing=True, limit=None, type_codes=None):
        """
        Generate type compatibility matrix.

        Args:
            skip_existing: Skip already analyzed pairs (default True)
            limit: Max pairs to analyze
            type_codes: List of specific type codes to analyze (e.g., ['HW_COLD', 'DEX'])
        """
        print("""
======================================================================
     TYPE COMPATIBILITY GENERATOR
     Generating TYPE x TYPE compatibility matrix
======================================================================
""")

        start_time = datetime.now()
        self.load_data()

        if not self.product_types:
            print("[ERROR] No product types found!")
            return

        # Filter types if specific codes provided
        types_to_analyze = self.product_types
        if type_codes:
            types_to_analyze = [t for t in self.product_types if t['code'] in type_codes]
            print(f"[INFO] Analyzing {len(types_to_analyze)} specific types")

        # Generate pairs
        pairs = []
        for i, type_a in enumerate(types_to_analyze):
            for type_b in self.product_types:
                # Only analyze each pair once (A,B but not B,A)
                if type_a['id'] > type_b['id']:
                    continue

                # Skip if already exists
                if skip_existing:
                    if (type_a['id'], type_b['id']) in self.existing_pairs:
                        continue
                    if (type_b['id'], type_a['id']) in self.existing_pairs:
                        continue

                pairs.append((type_a, type_b))

        if limit:
            pairs = pairs[:limit]

        total_pairs = len(pairs)
        total_possible = len(self.product_types) * (len(self.product_types) + 1) // 2

        print(f"\n[ANALYSIS] {total_pairs} pairs to analyze")
        print(f"[INFO] Total possible pairs: {total_possible}")
        print(f"[INFO] Already analyzed: {len(self.existing_pairs)}")

        if total_pairs == 0:
            print("[INFO] No pairs to analyze. Matrix may be complete or use --force to re-analyze.")
            return

        for idx, (type_a, type_b) in enumerate(pairs):
            print(f"\n[{idx+1}/{total_pairs}] {type_a['code']} x {type_b['code']}")

            try:
                result = self.analyze_type_compatibility(type_a, type_b)

                if result:
                    level = result.get('compatibility_level', 'partial')
                    is_compat = result.get('is_compatible', True)
                    method = result.get('base_method', '')[:50]

                    status = "COMPATIBLE" if is_compat else "INCOMPATIBLE"
                    print(f"   {status} ({level}) - {method}")

                    if self.save_type_compatibility(type_a['id'], type_b['id'], result):
                        self.stats['created'] += 1
                        self.existing_pairs.add((type_a['id'], type_b['id']))
                    else:
                        self.stats['errors'] += 1
                else:
                    self.stats['errors'] += 1

            except Exception as e:
                print(f"   ERROR: {e}")
                self.stats['errors'] += 1

            self.stats['total'] += 1

            # Rate limiting
            time.sleep(0.3)

        duration = datetime.now() - start_time
        print(f"""
======================================================================
                         COMPLETED
======================================================================
   Duration: {str(duration).split('.')[0]}
   Pairs analyzed: {self.stats['total']}
   Created/Updated: {self.stats['created']}
   Errors: {self.stats['errors']}
   Total in database: {len(self.existing_pairs)}
======================================================================
""")

        return self.stats

    def show_matrix(self):
        """Display current type compatibility matrix"""
        self.load_data()

        # Build matrix data
        type_by_id = {t['id']: t for t in self.product_types}

        # Get all compatibilities
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/type_compatibility?select=type_a_id,type_b_id,is_compatible,compatibility_level",
            headers=self.headers
        )
        compatibilities = r.json() if r.status_code == 200 else []

        # Build lookup
        compat_lookup = {}
        for c in compatibilities:
            key1 = (c['type_a_id'], c['type_b_id'])
            key2 = (c['type_b_id'], c['type_a_id'])
            compat_lookup[key1] = c
            compat_lookup[key2] = c

        # Print matrix header
        codes = [t['code'][:8] for t in self.product_types]
        print("\nType Compatibility Matrix:")
        print("=" * 80)
        print(f"{'':>10}", end='')
        for code in codes:
            print(f"{code:>9}", end='')
        print()

        # Print matrix rows
        level_symbols = {
            'native': 'N',
            'partial': 'P',
            'via_bridge': 'B',
            'incompatible': 'X',
            None: '?'
        }

        for type_a in self.product_types:
            print(f"{type_a['code'][:10]:>10}", end='')
            for type_b in self.product_types:
                compat = compat_lookup.get((type_a['id'], type_b['id']))
                if compat:
                    level = compat.get('compatibility_level')
                    symbol = level_symbols.get(level, '?')
                    is_compat = compat.get('is_compatible', True)
                    if not is_compat:
                        symbol = 'X'
                else:
                    symbol = '-'
                print(f"{symbol:>9}", end='')
            print()

        print("\nLegend: N=native, P=partial, B=via_bridge, X=incompatible, -=not analyzed, ?=unknown")

        # Stats
        native_count = sum(1 for c in compatibilities if c.get('compatibility_level') == 'native')
        partial_count = sum(1 for c in compatibilities if c.get('compatibility_level') == 'partial')
        bridge_count = sum(1 for c in compatibilities if c.get('compatibility_level') == 'via_bridge')
        incomp_count = sum(1 for c in compatibilities if c.get('compatibility_level') == 'incompatible')

        print(f"\nStatistics:")
        print(f"  Native: {native_count}")
        print(f"  Partial: {partial_count}")
        print(f"  Via bridge: {bridge_count}")
        print(f"  Incompatible: {incomp_count}")
        print(f"  Total analyzed: {len(compatibilities)}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Type Compatibility Generator')
    parser.add_argument('--force', action='store_true', help='Re-analyze existing pairs')
    parser.add_argument('--limit', type=int, default=None, help='Max pairs to analyze')
    parser.add_argument('--types', type=str, default=None, help='Comma-separated type codes to analyze')
    parser.add_argument('--matrix', action='store_true', help='Show current compatibility matrix')

    args = parser.parse_args()

    generator = TypeCompatibilityGenerator()

    if args.matrix:
        generator.show_matrix()
        return

    type_codes = None
    if args.types:
        type_codes = [t.strip().upper() for t in args.types.split(',')]

    generator.run(
        skip_existing=not args.force,
        limit=args.limit,
        type_codes=type_codes
    )


if __name__ == "__main__":
    main()
