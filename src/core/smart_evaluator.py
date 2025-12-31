#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SAFESCORING.IO - Smart Evaluator
Evaluates crypto products with AI using:
- The norm_applicability table to know which norms apply
- The product_types table for type descriptions
- Official website scraping for more context
- MULTI-TYPE SUPPORT: A product can have multiple types

WORKFLOW: Applicability (TRUE/FALSE) -> Smart Evaluator (YES/NO/N/A/TBD) -> Score Calculator
"""

import requests
import time
from datetime import datetime

# Import from common modules
from .config import SUPABASE_URL, get_supabase_headers
from .api_provider import AIProvider, parse_evaluation_response
from .scraper import WebScraper


# System prompt for evaluation
SYSTEM_PROMPT = """You are an expert in crypto security and blockchain product evaluation.
You use the SAFE SCORING methodology to evaluate products.

SAFE SCORING METHODOLOGY:
- S (Security 25%): Cryptographic protection, encryption, Secure Element, multisig
- A (Adversity 25%): Attack resistance, PIN duress, auto wipe, hidden wallets
- F (Fidelity 25%): Durability, physical resistance, software quality, audits
- E (Efficiency 25%): Usability, multi-chain, interface, accessibility

IMPLICIT EVM/BLOCKCHAIN STANDARDS (count as YES if product uses EVM):
Any EVM-compatible product (DEX, DeFi, dApp) IMPLICITLY supports:
- secp256k1, Keccak-256, ECDSA (Core Ethereum crypto)
- EIP-712, EIP-1559, EIP-2612, EIP-4337 (EVM standards)
- TLS 1.3, HTTPS, HSTS (Web security)

RATING SYSTEM:
- YES = Concrete proof that the product implements this norm
- YESp = Imposed by product design (no proof needed)
- NO = The product does NOT implement this applicable norm
- TBD = Truly impossible to determine (use rarely)

SCORE CALCULATION:
Score = (YES + YESp) / (YES + YESp + NO) x 100
- N/A are EXCLUDED from calculation (non-applicable norms)
- TBD are EXCLUDED from calculation (uncertainty)
"""


class SmartEvaluator:
    """
    Intelligent evaluator with AI and scraping.
    Supports MULTIPLE TYPES per product.
    Uses Supabase tables for applicability and descriptions.
    """

    def __init__(self):
        self.headers = get_supabase_headers()
        self.products = []
        self.norms = []
        self.norms_by_id = {}
        self.product_types = {}
        self.norm_applicability = {}  # {type_id: {norm_id: is_applicable}}
        self.product_type_mapping = {}  # {product_id: [type_ids]}
        self.ai_provider = AIProvider()
        self.scraper = WebScraper()

    def load_data(self):
        """Loads data from Supabase (products, types, norms, applicability, type mapping)"""
        print("\n[LOAD] Loading Supabase data...")

        # Products
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=*&limit=500",
            headers=self.headers
        )
        self.products = r.json() if r.status_code == 200 else []
        print(f"   {len(self.products)} products")

        # Product types
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name_fr,name,category,description",
            headers=self.headers
        )
        types = r.json() if r.status_code == 200 else []
        self.product_types = {t['id']: t for t in types}
        print(f"   {len(self.product_types)} product types")

        # Norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description,is_essential,consumer&order=pillar.asc,code.asc",
            headers=self.headers
        )
        self.norms = r.json() if r.status_code == 200 else []
        self.norms_by_id = {n['id']: n for n in self.norms}
        print(f"   {len(self.norms)} norms")

        # Norm applicability by type
        print("   Loading applicability...")
        self.norm_applicability = {}

        for type_id in self.product_types.keys():
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}&select=norm_id,is_applicable",
                headers=self.headers
            )
            if r.status_code == 200:
                applicability = r.json()
                self.norm_applicability[type_id] = {
                    a['norm_id']: a['is_applicable'] for a in applicability
                }

        total_rules = sum(len(v) for v in self.norm_applicability.values())
        print(f"   {total_rules} applicability rules loaded")

        # Product type mapping (multi-type support)
        print("   Loading product type mappings...")
        self.product_type_mapping = {}

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id,is_primary&order=is_primary.desc",
            headers=self.headers
        )

        if r.status_code == 200:
            mappings = r.json()
            for m in mappings:
                pid = m['product_id']
                if pid not in self.product_type_mapping:
                    self.product_type_mapping[pid] = []
                self.product_type_mapping[pid].append(m['type_id'])

        # Fallback: use products.type_id for products without mapping
        for product in self.products:
            pid = product['id']
            if pid not in self.product_type_mapping and product.get('type_id'):
                self.product_type_mapping[pid] = [product['type_id']]

        multi_type_count = sum(1 for types in self.product_type_mapping.values() if len(types) > 1)
        print(f"   {len(self.product_type_mapping)} products with types ({multi_type_count} multi-type)")

    def get_product_type_ids(self, product):
        """Returns all type IDs for a product (supports multi-type)"""
        product_id = product['id']

        # First check mapping table
        if product_id in self.product_type_mapping:
            return self.product_type_mapping[product_id]

        # Fallback to single type_id
        if product.get('type_id'):
            return [product['type_id']]

        return []

    def get_applicable_norms(self, type_ids):
        """
        Returns applicable norms for a product with multiple types.
        Applicability = UNION of all types (norm is applicable if applicable to ANY type)
        """
        applicable_norm_ids = set()

        for type_id in type_ids:
            type_applicability = self.norm_applicability.get(type_id, {})
            for norm_id, is_applicable in type_applicability.items():
                if is_applicable:
                    applicable_norm_ids.add(norm_id)

        return [n for n in self.norms if n['id'] in applicable_norm_ids]

    def get_product_info(self, product):
        """Gets product info for the prompt (supports multi-type)"""
        type_ids = self.get_product_type_ids(product)

        # Get all type infos
        type_infos = [self.product_types.get(tid, {}) for tid in type_ids]
        type_infos = [t for t in type_infos if t]  # Remove empty

        if type_infos:
            # Primary type is first
            primary_type = type_infos[0]
            type_names = [t.get('name_fr') or t.get('name', 'Unknown') for t in type_infos]
            type_codes = [t.get('code', '?') for t in type_infos]
            categories = list(set(t.get('category', 'Unknown') for t in type_infos))

            return {
                'name': product['name'],
                'url': product.get('url', 'N/A'),
                'type_ids': type_ids,
                'type': ' + '.join(type_names),  # "Hardware Wallet + Signing Device"
                'type_code': ' + '.join(type_codes),  # "HW_COLD + HW_SIGN"
                'type_description': primary_type.get('description', ''),
                'category': ' / '.join(categories),
                'is_multi_type': len(type_ids) > 1
            }
        else:
            return {
                'name': product['name'],
                'url': product.get('url', 'N/A'),
                'type_ids': [],
                'type': 'Unknown',
                'type_code': 'Unknown',
                'type_description': '',
                'category': 'Unknown',
                'is_multi_type': False
            }

    def evaluate_batch_with_ai(self, product_info, norms_batch, pillar, website_content=None):
        """Evaluates a batch of APPLICABLE norms for a product."""

        norms_text = "\n".join([
            f"- {n['code']}: {n['title']}" + (f" - {n.get('description', '')[:60]}" if n.get('description') else "")
            for n in norms_batch
        ])

        website_section = ""
        if website_content:
            website_section = f"\nDOCUMENTATION:\n{website_content[:3000]}\n"

        # Multi-type info
        type_info = f"- Type: {product_info['type']} ({product_info['type_code']})"
        if product_info.get('is_multi_type'):
            type_info += "\n- Note: This product has MULTIPLE types, norms from all types are applicable"

        prompt = f"""{SYSTEM_PROMPT}

PRODUCT TO EVALUATE:
- Name: {product_info['name']}
{type_info}
- Website: {product_info['url']}
- Category: {product_info['category']}
{website_section}
PILLAR: {pillar}

NORMS TO EVALUATE (pre-filtered as applicable):
{norms_text}

IMPORTANT:
- These norms are PRE-FILTERED as applicable to this product type(s)
- You MUST answer YES, YESp, NO or TBD for EACH norm
- N/A is FORBIDDEN (non-applicable norms already excluded)
- When in doubt, prefer NO over TBD

FORMAT (one line per norm):
CODE: RESULT | Brief reason

Evaluate:"""

        result = self.ai_provider.call(prompt)

        if not result:
            return {}

        return parse_evaluation_response(result)

    def evaluate_product(self, product):
        """Evaluates a product using norm_applicability and scraping (multi-type support)."""
        product_info = self.get_product_info(product)
        type_ids = product_info['type_ids']

        type_label = product_info['type']
        if product_info.get('is_multi_type'):
            type_label = f"{type_label} [MULTI-TYPE]"

        print(f"\n[EVAL] {product_info['name']} ({type_label})")

        if not type_ids:
            print(f"   No type assigned to this product!")
            return {}

        # Get applicable norms (UNION of all types)
        applicable_norms = self.get_applicable_norms(type_ids)
        print(f"   {len(applicable_norms)} applicable norms (from {len(type_ids)} type(s))")

        if not applicable_norms:
            print(f"   No applicable norm found!")
            return {}

        # Scrape product website
        website_content = None
        if product.get('url'):
            print(f"   Scraping {product['url'][:50]}...")
            website_content = self.scraper.scrape_product(product)

        all_evaluations = {}

        # Evaluate by pillar
        for pillar in ['S', 'A', 'F', 'E']:
            pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]

            if not pillar_norms:
                continue

            batch_size = 25
            pillar_results = {}

            for i in range(0, len(pillar_norms), batch_size):
                batch = pillar_norms[i:i+batch_size]
                print(f"   Pillar {pillar} batch {i//batch_size + 1} ({len(batch)} norms)...")

                batch_results = self.evaluate_batch_with_ai(product_info, batch, pillar, website_content)
                pillar_results.update(batch_results)
                time.sleep(0.5)

            # Count results
            yes_count = sum(1 for v in pillar_results.values() if v[0] == 'YES')
            yesp_count = sum(1 for v in pillar_results.values() if v[0] == 'YESp')
            no_count = sum(1 for v in pillar_results.values() if v[0] == 'NO')
            tbd_count = sum(1 for v in pillar_results.values() if v[0] == 'TBD')
            score_base = yes_count + yesp_count + no_count
            pct = (yes_count + yesp_count) * 100 // score_base if score_base > 0 else 0

            print(f"   {pillar}: {yes_count} YES, {yesp_count} YESp, {no_count} NO, {tbd_count} TBD ({pct}%)")

            all_evaluations.update(pillar_results)

        return all_evaluations, applicable_norms

    def save_evaluations(self, product_id, evaluations, applicable_norms):
        """Saves evaluations to Supabase."""
        norm_id_by_code = {n['code']: n['id'] for n in self.norms}
        applicable_norm_ids = {n['id'] for n in applicable_norms}

        eval_records = []

        # Add AI evaluations for applicable norms
        for code, eval_data in evaluations.items():
            norm_id = norm_id_by_code.get(code)
            if norm_id:
                result, reason = eval_data if isinstance(eval_data, tuple) else (eval_data, '')
                eval_records.append({
                    'product_id': product_id,
                    'norm_id': norm_id,
                    'result': result,
                    'why_this_result': reason[:500] if reason else None,
                    'evaluated_by': 'smart_ai',
                    'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                })

        # Add N/A for non-applicable norms
        for norm in self.norms:
            if norm['id'] not in applicable_norm_ids:
                eval_records.append({
                    'product_id': product_id,
                    'norm_id': norm['id'],
                    'result': 'N/A',
                    'why_this_result': 'Norm not applicable to this product type(s)',
                    'evaluated_by': 'norm_applicability',
                    'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                })

        if not eval_records:
            return 0

        # Delete old evaluations
        del_headers = get_supabase_headers('return=representation')
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}",
            headers=del_headers
        )

        # Deduplicate
        unique_records = {}
        for rec in eval_records:
            key = (rec['product_id'], rec['norm_id'])
            unique_records[key] = rec
        eval_records = list(unique_records.values())

        # Insert with upsert
        upsert_headers = get_supabase_headers('resolution=merge-duplicates')
        batch_size = 500
        inserted = 0

        for i in range(0, len(eval_records), batch_size):
            batch = eval_records[i:i+batch_size]
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/evaluations",
                headers=upsert_headers,
                json=batch
            )
            if r.status_code in [200, 201]:
                inserted += len(batch)

        return inserted

    def get_evaluated_product_ids(self):
        """Gets IDs of already evaluated products"""
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/evaluations?select=product_id",
            headers=self.headers
        )
        if r.status_code == 200:
            evals = r.json()
            return set(e['product_id'] for e in evals)
        return set()

    def run(self, product_name=None, type_id=None, limit=None, skip_evaluated=False, start_index=0, worker_id=0):
        """Runs automated evaluation."""
        worker_prefix = f"[W{worker_id}] " if worker_id > 0 else ""

        print(f"""
================================================================
     SAFE SCORING - SMART EVALUATOR {worker_prefix}
     Applicability -> Evaluation -> Score
     MULTI-TYPE SUPPORT ENABLED
================================================================
""")

        self.load_data()

        # Get already evaluated products
        evaluated_ids = set()
        if skip_evaluated:
            print(f"\n{worker_prefix}Checking evaluated products...")
            evaluated_ids = self.get_evaluated_product_ids()
            print(f"   {len(evaluated_ids)} already evaluated")

        # Filter products
        if product_name:
            products_to_eval = [p for p in self.products if product_name.lower() in p['name'].lower()]
        elif type_id:
            # Filter by type (check both old type_id and new mapping)
            products_to_eval = []
            for p in self.products:
                product_types = self.get_product_type_ids(p)
                if type_id in product_types:
                    products_to_eval.append(p)
        else:
            all_products = self.products[start_index:] if start_index > 0 else self.products
            products_to_eval = all_products[:limit] if limit else all_products

        if skip_evaluated:
            products_to_eval = [p for p in products_to_eval if p['id'] not in evaluated_ids]

        print(f"\n{len(products_to_eval)} product(s) to evaluate")

        results = []

        for i, product in enumerate(products_to_eval):
            print(f"\n[{i+1}/{len(products_to_eval)}]", end="")

            result = self.evaluate_product(product)

            if result and isinstance(result, tuple):
                evaluations, applicable_norms = result

                if evaluations:
                    saved = self.save_evaluations(product['id'], evaluations, applicable_norms)

                    def get_result(v):
                        return v[0] if isinstance(v, tuple) else v

                    yes = sum(1 for v in evaluations.values() if get_result(v) == 'YES')
                    yesp = sum(1 for v in evaluations.values() if get_result(v) == 'YESp')
                    no = sum(1 for v in evaluations.values() if get_result(v) == 'NO')
                    tbd = sum(1 for v in evaluations.values() if get_result(v) == 'TBD')
                    score_base = yes + yesp + no
                    score = (yes + yesp) * 100 // score_base if score_base > 0 else 0
                    na_count = len(self.norms) - len(applicable_norms)

                    print(f"   {saved} evaluations saved ({na_count} auto N/A)")
                    print(f"   Score: {yes + yesp}/{score_base} = {score}%")

                    results.append({
                        'name': product['name'],
                        'yes': yes,
                        'yesp': yesp,
                        'no': no,
                        'tbd': tbd,
                        'na': na_count,
                        'score': score
                    })

        # Summary
        if results:
            print(f"\n{'='*60}")
            print("SUMMARY")
            print(f"{'='*60}")
            for r in results:
                print(f"  {r['name'][:30]:<30} | {r['score']:>3}% ({r['yes']}+{r['yesp']}p YES)")

        return results


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Smart Evaluator - AI crypto product evaluation')
    parser.add_argument('--product', type=str, help='Product name to evaluate')
    parser.add_argument('--type', type=int, help='Product type ID to evaluate')
    parser.add_argument('--limit', type=int, default=None, help='Number of products to evaluate')
    parser.add_argument('--resume', action='store_true', help='Skip already evaluated products')
    parser.add_argument('--start', type=int, default=0, help='Start index')
    parser.add_argument('--worker', type=int, default=0, help='Worker ID')

    args = parser.parse_args()

    evaluator = SmartEvaluator()
    evaluator.run(
        type_id=args.type,
        product_name=args.product,
        limit=args.limit,
        skip_evaluated=args.resume,
        start_index=args.start,
        worker_id=args.worker
    )


if __name__ == "__main__":
    main()
