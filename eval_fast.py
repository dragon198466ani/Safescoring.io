#!/usr/bin/env python3
"""Fast batch evaluation script - minimal scraping."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import requests
import time
from datetime import datetime
from core.config import SUPABASE_URL, get_supabase_headers
from core.api_provider import AIProvider, parse_evaluation_response
from core.supabase_pagination import SupabaseClient

SYSTEM_PROMPT = """You are an expert in crypto security and blockchain product evaluation.
You use the SAFE SCORING methodology to evaluate products ACCURATELY based on FACTS.

SAFE SCORING METHODOLOGY:
- S (Security 25%): Cryptographic protection, encryption, Secure Element, multisig
- A (Adversity 25%): Attack resistance, PIN duress, auto wipe, hidden wallets
- F (Fidelity 25%): Durability, physical resistance, software quality, audits
- E (Efficiency 25%): Usability, multi-chain, interface, accessibility

RATING SYSTEM - BE STRICT AND FACTUAL:
- YES = CONCRETE PROOF the product implements this norm
- YESp = Inherent to the technology (e.g., EVM uses secp256k1)
- NO = Product does NOT implement this norm
- N/A = Norm is technically IMPOSSIBLE for this product type
- TBD = Cannot determine (use RARELY, max 5%)

ANTI-HALLUCINATION RULES:
1. HARDWARE vs SOFTWARE: Hardware norms (Secure Element, tamper) = N/A for software
2. CUSTODIAL vs SELF-CUSTODY: Self-custody features = N/A for custodial services
3. BE SPECIFIC: Don't assume features exist without evidence
4. TYPE MATTERS: Read the product type carefully

Read the norm DEFINITION before evaluating.

FORMAT (one line per norm):
CODE: RESULT | Brief factual reason
"""


def get_all_evaluated_ids():
    """Get ALL evaluated product IDs using centralized pagination."""
    client = SupabaseClient()
    return client.fetch_evaluated_product_ids()


def load_data():
    """
    Load ALL data using centralized pagination.
    This NEVER limits to 1000 - always fetches complete data.
    """
    client = SupabaseClient()

    # Products - ALWAYS gets all
    products = client.fetch_products()
    print(f"   {len(products)} products")

    # Product types
    types = client.fetch_product_types()
    print(f"   {len(types)} types")

    # Norms - ALWAYS gets all with summaries
    norms = client.fetch_norms(with_summaries=True)
    norms_by_id = {n['id']: n for n in norms}
    print(f"   {len(norms)} norms")

    # Applicability rules
    applicability = client.fetch_applicability()
    print(f"   {sum(len(v) for v in applicability.values())} applicability rules")

    # Product type mappings
    product_types = client.fetch_product_type_mappings()

    # Fallback
    for p in products:
        if p['id'] not in product_types and p.get('type_id'):
            product_types[p['id']] = [p['type_id']]

    return products, types, norms, norms_by_id, applicability, product_types


def get_applicable_norms(type_ids, applicability, norms_by_id):
    """Get applicable norms for given type IDs (union)."""
    applicable_ids = set()
    for type_id in type_ids:
        if type_id in applicability:
            for norm_id, is_app in applicability[type_id].items():
                if is_app:
                    applicable_ids.add(norm_id)
    return [norms_by_id[nid] for nid in applicable_ids if nid in norms_by_id]


def evaluate_product(product, types, norms, norms_by_id, applicability, product_types, ai_provider):
    """Evaluate a single product."""
    product_id = product['id']
    type_ids = product_types.get(product_id, [])

    if not type_ids:
        print(f"   No type assigned")
        return None, None

    type_names = [types[tid]['name'] for tid in type_ids if tid in types]
    print(f"   Types: {', '.join(type_names)}")
    sys.stdout.flush()

    # Get applicable norms
    applicable_norms = get_applicable_norms(type_ids, applicability, norms_by_id)
    if not applicable_norms:
        print(f"   No applicable norms")
        return None, None

    print(f"   {len(applicable_norms)} applicable norms")
    sys.stdout.flush()

    all_evaluations = {}

    # Sub-batch size to avoid timeouts (100 norms max per call)
    BATCH_SIZE = 100

    # Evaluate by pillar
    for pillar in ['S', 'A', 'F', 'E']:
        pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]
        if not pillar_norms:
            continue

        # Split into sub-batches
        num_batches = (len(pillar_norms) + BATCH_SIZE - 1) // BATCH_SIZE
        pillar_yes = 0
        pillar_no = 0

        for batch_idx in range(num_batches):
            start = batch_idx * BATCH_SIZE
            end = min(start + BATCH_SIZE, len(pillar_norms))
            batch_norms = pillar_norms[start:end]

            # Build norms text with official summaries
            norms_lines = []
            for n in batch_norms:
                summary = n.get('official_doc_summary') or n.get('description', '')
                if summary and len(summary) > 200:
                    summary = summary[:200] + "..."
                if summary:
                    norms_lines.append(f"- {n['code']}: {n['title']}\n  Definition: {summary}")
                else:
                    norms_lines.append(f"- {n['code']}: {n['title']}")
            norms_text = "\n".join(norms_lines)

            prompt = f"""{SYSTEM_PROMPT}

PRODUCT: {product['name']}
TYPE(S): {', '.join(type_names)}
WEBSITE: {product.get('url', 'N/A')}

PILLAR: {pillar}

NORMS TO EVALUATE (batch {batch_idx + 1}/{num_batches}):
{norms_text}

Evaluate each norm:"""

            batch_label = f"Pillar {pillar}" if num_batches == 1 else f"Pillar {pillar} batch {batch_idx + 1}/{num_batches}"
            print(f"   {batch_label} ({len(batch_norms)} norms)...")
            sys.stdout.flush()

            result = ai_provider.call(prompt, max_tokens=4000)
            if result:
                parsed = parse_evaluation_response(result)
                all_evaluations.update(parsed)

                # Count
                yes_count = sum(1 for v in parsed.values() if v[0] in ['YES', 'YESp'])
                no_count = sum(1 for v in parsed.values() if v[0] == 'NO')
                pillar_yes += yes_count
                pillar_no += no_count
                print(f"      -> {yes_count} YES, {no_count} NO")
            else:
                print(f"      -> API failed")

            time.sleep(0.5)

        if num_batches > 1:
            print(f"   Pillar {pillar} total: {pillar_yes} YES, {pillar_no} NO")

    return all_evaluations, applicable_norms


def save_evaluations(product_id, evaluations, applicable_norms, norms):
    """Save evaluations to database."""
    headers = get_supabase_headers()
    norm_id_by_code = {n['code']: n['id'] for n in norms}
    applicable_norm_ids = {n['id'] for n in applicable_norms}

    eval_records = []
    unmatched_codes = []

    # AI evaluations
    for code, eval_data in evaluations.items():
        norm_id = norm_id_by_code.get(code)
        if norm_id:
            result, reason = eval_data if isinstance(eval_data, tuple) else (eval_data, '')
            eval_records.append({
                'product_id': product_id,
                'norm_id': norm_id,
                'result': result,
                'why_this_result': (reason[:500] if reason else None),
                'evaluated_by': 'smart_ai_fast',
                'evaluation_date': datetime.now().strftime('%Y-%m-%d')
            })
        else:
            unmatched_codes.append(code)

    if unmatched_codes and len(unmatched_codes) <= 10:
        print(f"      Unmatched codes: {unmatched_codes[:10]}")

    # N/A for non-applicable
    for norm in norms:
        if norm['id'] not in applicable_norm_ids:
            eval_records.append({
                'product_id': product_id,
                'norm_id': norm['id'],
                'result': 'N/A',
                'why_this_result': 'Norm not applicable to this product type',
                'evaluated_by': 'norm_applicability',
                'evaluation_date': datetime.now().strftime('%Y-%m-%d')
            })

    if not eval_records:
        return 0

    # Delete old
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}",
        headers=headers
    )

    # Deduplicate
    unique = {}
    for r in eval_records:
        unique[(r['product_id'], r['norm_id'])] = r
    eval_records = list(unique.values())

    # Insert
    upsert_headers = get_supabase_headers('resolution=merge-duplicates')
    inserted = 0
    batch_size = 500
    for i in range(0, len(eval_records), batch_size):
        batch = eval_records[i:i+batch_size]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/evaluations", headers=upsert_headers, json=batch)
        if r.status_code in [200, 201, 204]:
            inserted += len(batch)
        else:
            print(f"      DB Error {r.status_code}: {r.text[:200]}")

    return inserted


def main():
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    continuous = '--continuous' in sys.argv or '-c' in sys.argv

    print("\n[LOAD] Loading data...")
    sys.stdout.flush()
    products, types, norms, norms_by_id, applicability, product_types = load_data()

    # Initialize AI (shared instance for quota tracking)
    ai_provider = AIProvider()

    while True:
        print("\n[SCAN] Getting evaluated products...")
        sys.stdout.flush()
        evaluated_ids = get_all_evaluated_ids()
        print(f"   {len(evaluated_ids)} already evaluated")

        products_to_eval = [p for p in products if p['id'] not in evaluated_ids]
        print(f"   {len(products_to_eval)} to evaluate")

        if not products_to_eval:
            print("\n" + "="*50)
            print("   TOUTES LES ANALYSES TERMINEES!")
            print(f"   {len(evaluated_ids)} produits evalues")
            print("="*50)
            return

        batch = products_to_eval[:batch_size]
        print(f"\n=== BATCH: {len(batch)} PRODUCTS ({len(products_to_eval)} remaining) ===\n")

        for i, product in enumerate(batch, 1):
            print(f"[{i}/{len(batch)}] {product['name']}")
            sys.stdout.flush()

            try:
                evaluations, applicable_norms = evaluate_product(
                    product, types, norms, norms_by_id, applicability, product_types, ai_provider
                )
                if evaluations and applicable_norms:
                    saved = save_evaluations(product['id'], evaluations, applicable_norms, norms)
                    yes_count = sum(1 for v in evaluations.values() if v[0] in ['YES', 'YESp'])
                    print(f"   SAVED: {saved} evals ({yes_count} YES)")
                else:
                    print(f"   SKIPPED")
            except Exception as e:
                print(f"   ERROR: {e}")

            sys.stdout.flush()

        print(f"\n=== BATCH COMPLETE ===")
        remaining = len(products_to_eval) - len(batch)
        print(f"Progress: {len(evaluated_ids) + len(batch)}/{len(products)} ({100*(len(evaluated_ids) + len(batch))/len(products):.1f}%)")
        print(f"Remaining: {remaining}")

        if not continuous:
            print("\nRun with --continuous or -c to process all products automatically")
            break


if __name__ == "__main__":
    main()
