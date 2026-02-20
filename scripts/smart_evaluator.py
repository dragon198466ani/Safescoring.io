#!/usr/bin/env python3
"""
SMART EVALUATOR - Batch AI-Powered Logical Evaluation
======================================================
Uses AI to analyze products against norms in BATCHES for efficiency.

Key principles:
1. Every evaluation must be JUSTIFIED with logical reasoning
2. TBD should be MINIMAL - AI must find YES or NO based on evidence
3. Use norm requirements + product capabilities to determine compliance
4. Store full reasoning in why_this_result
5. BATCH processing: evaluate 15 norms per AI call for efficiency
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

from core.config import SUPABASE_URL, get_supabase_headers
from core.api_provider import AIProvider
import requests
import time
import json
import re

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers('resolution=merge-duplicates,return=minimal', use_service_key=True)

# Initialize AI provider
ai = AIProvider()

# Batch size for AI evaluation
BATCH_SIZE = 15  # Evaluate 15 norms per AI call


def build_batch_prompt(norms_batch, product, product_type):
    """Build a prompt to evaluate multiple norms at once."""

    product_name = product.get('name', 'Unknown')
    product_desc = product.get('description', '') or ''
    product_url = product.get('url', '') or ''
    type_name = product_type.get('name', 'Unknown') if product_type else 'Unknown'

    # Build norms list - use description (short requirement) not summary (template)
    norms_text = ""
    for i, norm in enumerate(norms_batch, 1):
        code = norm.get('code', 'Unknown')
        title = norm.get('title', 'Unknown')
        # Use description first (actual requirement), fallback to title
        desc = norm.get('description', '') or f'Implements {title}'
        norms_text += f"\n{i}. [{code}] {title}: {desc}\n"

    prompt = f"""CRYPTO PRODUCT COMPLIANCE EVALUATION

PRODUCT:
- Name: {product_name}
- Type: {type_name}
- Description: {product_desc[:300] if product_desc else 'Standard ' + type_name + ' product'}
- Website: {product_url}

NORMS TO EVALUATE:
{norms_text}

For EACH norm, determine if this {type_name} product meets the requirement.

DECISION RULES:
- YES = Product meets requirement (based on product type capabilities or description)
- NO = Product does NOT meet requirement (wrong type or explicitly missing)
- TBD = ONLY if truly impossible to determine

IMPORTANT: Minimize TBD! Use logical inference:
- Hardware wallets have secure elements, encryption, offline signing
- Exchanges have KYC, custody, trading infrastructure
- DeFi protocols have smart contracts, audits, governance
- Metal backups have fire/water resistance, durability
- Software wallets have encryption, key management

RESPOND with one line per norm in this EXACT format:
[NORM_CODE]: [YES/NO/TBD] - [Brief justification 10-20 words]

Example:
S001: YES - Hardware wallets implement AES-256 encryption for key storage
A015: NO - Software wallets cannot have fire resistance, only physical products can"""

    return prompt


def parse_batch_response(response, norms_batch):
    """Parse AI response and extract results for each norm."""
    results = {}

    for norm in norms_batch:
        code = norm.get('code', '')
        norm_id = norm.get('id')
        # Default to TBD if not found
        results[norm_id] = ('TBD', f'Could not parse AI response for {code}')

    if not response:
        return results

    lines = response.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line or ':' not in line:
            continue

        # Try to match pattern: CODE: RESULT - Justification
        match = re.match(r'[\[\s]*([A-Z0-9]+)[\]\s]*:\s*(YES|NO|TBD)\s*[-–—]?\s*(.*)', line, re.IGNORECASE)
        if match:
            code = match.group(1).upper()
            result = match.group(2).upper()
            justification = match.group(3).strip() or f'{result} based on product type analysis'

            # Find matching norm by code
            for norm in norms_batch:
                if norm.get('code', '').upper() == code:
                    results[norm['id']] = (result, justification)
                    break

    return results


def evaluate_batch_with_ai(norms_batch, product, product_type):
    """Use AI to evaluate a batch of norms."""
    prompt = build_batch_prompt(norms_batch, product, product_type)

    try:
        # Use the fast call method
        response = ai.call_fast(prompt, max_tokens=1500, temperature=0.1)
        if not response:
            # Fallback to main call
            response = ai.call(prompt, max_tokens=1500, temperature=0.1)

        return parse_batch_response(response, norms_batch)

    except Exception as e:
        print(f"    AI error: {e}", flush=True)
        # Return TBD for all norms in batch
        return {n['id']: ('TBD', f'AI error: {str(e)[:50]}') for n in norms_batch}


def load_products():
    """Load all products."""
    print("Loading products...", flush=True)
    products = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,url,description&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        products.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    print(f"  {len(products)} products", flush=True)
    return products


def load_types():
    """Load product types."""
    print("Loading types...", flush=True)
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_types?select=*',
        headers=READ_HEADERS, timeout=30
    )
    types = {t['id']: t for t in (r.json() if r.status_code == 200 else [])}
    print(f"  {len(types)} types", flush=True)
    return types


def load_norms():
    """Load all norms."""
    print("Loading norms...", flush=True)
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description,summary&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        norms.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    print(f"  {len(norms)} norms", flush=True)
    return {n['id']: n for n in norms}


def load_applicability(type_id):
    """Load applicable norm IDs for a type."""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?select=norm_id&type_id=eq.{type_id}&is_applicable=eq.true&limit=5000',
        headers=READ_HEADERS, timeout=60
    )
    return [a['norm_id'] for a in (r.json() if r.status_code == 200 else [])]


def save_evaluations(evaluations):
    """Save evaluation batch to Supabase."""
    if not evaluations:
        return 0

    try:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluations',
            headers=WRITE_HEADERS,
            json=evaluations,
            timeout=120
        )
        if r.status_code in [200, 201]:
            return len(evaluations)
        else:
            print(f"    Save error: {r.status_code} - {r.text[:100]}", flush=True)
            return 0
    except Exception as e:
        print(f"    Save exception: {e}", flush=True)
        return 0


def main():
    print("=" * 60, flush=True)
    print("  SMART EVALUATOR - Batch AI Analysis", flush=True)
    print("  Deep reasoning for YES/NO decisions", flush=True)
    print("=" * 60, flush=True)

    products = load_products()
    types = load_types()
    norms = load_norms()

    total_saved = 0

    for i, product in enumerate(products):
        product_id = product['id']
        product_name = product['name']
        type_id = product.get('type_id')

        if not type_id:
            print(f"[{i+1}/{len(products)}] {product_name}: No type_id - skipping", flush=True)
            continue

        product_type = types.get(type_id)
        applicable_norms = load_applicability(type_id)

        if not applicable_norms:
            print(f"[{i+1}/{len(products)}] {product_name}: No applicable norms - skipping", flush=True)
            continue

        # Get full norm objects
        norms_list = [norms[nid] for nid in applicable_norms if nid in norms]

        all_results = {}
        yes_count = 0
        no_count = 0
        tbd_count = 0

        # Process in batches
        for batch_start in range(0, len(norms_list), BATCH_SIZE):
            batch = norms_list[batch_start:batch_start + BATCH_SIZE]
            batch_results = evaluate_batch_with_ai(batch, product, product_type)
            all_results.update(batch_results)

            # Small delay between batches
            time.sleep(1)

        # Build evaluations to save
        batch_to_save = []
        for norm_id, (result, reasoning) in all_results.items():
            if result == 'YES':
                yes_count += 1
            elif result == 'NO':
                no_count += 1
            else:
                tbd_count += 1

            batch_to_save.append({
                'product_id': product_id,
                'norm_id': norm_id,
                'result': result,
                'why_this_result': reasoning,
                'evaluated_by': 'smart_ai_batch',
                'confidence_score': 0.85 if result != 'TBD' else 0.5
            })

        # Calculate score
        total = yes_count + no_count
        score = (yes_count / total * 100) if total > 0 else 0

        print(f"[{i+1}/{len(products)}] {product_name:30} | YES: {yes_count:3} NO: {no_count:3} TBD: {tbd_count:3} | Score: {score:.1f}%", flush=True)

        # Save evaluations
        saved = save_evaluations(batch_to_save)
        total_saved += saved

    print("=" * 60, flush=True)
    print(f"  COMPLETE: {total_saved} evaluations saved", flush=True)
    print("=" * 60, flush=True)


if __name__ == "__main__":
    main()
