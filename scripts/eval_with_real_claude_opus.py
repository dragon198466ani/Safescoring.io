#!/usr/bin/env python3
"""
EVALUATE PRODUCTS WITH REAL CLAUDE OPUS API
============================================
Uses the official Anthropic API to evaluate products against norms.
Stores detailed justifications with proper model attribution.

Usage:
    python scripts/eval_with_real_claude_opus.py --product ledger-nano-x --limit 50
    python scripts/eval_with_real_claude_opus.py --all --batch-size 10

Required:
    ANTHROPIC_API_KEY in .env file
    pip install anthropic
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import argparse
import json
import time
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment
load_dotenv('.env')
load_dotenv('config/.env')

# Supabase config
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

# Anthropic API
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

# Model to use
CLAUDE_MODEL = "claude-sonnet-4-20250514"  # Or "claude-opus-4-20250514" for Opus

# Headers
READ_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

WRITE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}


def call_claude_opus(prompt: str, max_tokens: int = 2000) -> str | None:
    """Call Claude Opus via Anthropic API."""
    if not ANTHROPIC_API_KEY:
        print("[ERROR] ANTHROPIC_API_KEY not set in .env")
        return None

    try:
        response = requests.post(
            ANTHROPIC_URL,
            headers={
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            json={
                'model': CLAUDE_MODEL,
                'max_tokens': max_tokens,
                'messages': [{'role': 'user', 'content': prompt}]
            },
            timeout=120
        )

        if response.status_code == 200:
            data = response.json()
            return data['content'][0]['text']
        elif response.status_code == 429:
            print("  [RATE LIMITED] Waiting 60s...")
            time.sleep(60)
            return call_claude_opus(prompt, max_tokens)
        else:
            print(f"  [ERROR] Anthropic API {response.status_code}: {response.text[:200]}")
            return None

    except Exception as e:
        print(f"  [ERROR] API call failed: {e}")
        return None


EVALUATION_PROMPT = """You are an expert crypto security analyst evaluating products against security standards.

PRODUCT: {product_name}
TYPE: {product_type}
DESCRIPTION: {product_description}

NORM TO EVALUATE:
Code: {norm_code}
Title: {norm_title}
Pillar: {pillar_name}

EVALUATION CRITERIA:
- YES = Product implements this norm (documented, audited, working features, or standard practice)
- YESp = Inherent to technology (e.g., EVM uses secp256k1 by design)
- NO = Product clearly does NOT implement this norm
- N/A = Norm is not applicable to this product type

IMPORTANT RULES:
1. Be fair - established products with good track records deserve credit
2. Standard crypto practices count as implementation
3. Audited products can be assumed to follow best practices
4. Physical norms (materials, waterproof) are N/A for software products
5. Chain-specific norms require explicit support

Respond in this EXACT JSON format:
{{
    "result": "YES" or "NO" or "N/A" or "YESp",
    "confidence": 0.0 to 1.0,
    "justification": "2-3 sentences explaining your reasoning with specific technical details"
}}
"""


def evaluate_product_norm(product: dict, norm: dict, type_info: dict) -> dict | None:
    """Evaluate a single product against a single norm using Claude Opus."""

    pillar_names = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem'}

    prompt = EVALUATION_PROMPT.format(
        product_name=product.get('name', 'Unknown'),
        product_type=type_info.get('name', 'Unknown') if type_info else 'Unknown',
        product_description=product.get('description', '')[:500] or 'No description',
        norm_code=norm.get('code', ''),
        norm_title=norm.get('title', ''),
        pillar_name=pillar_names.get(norm.get('pillar', ''), 'Unknown')
    )

    response = call_claude_opus(prompt)
    if not response:
        return None

    # Parse JSON response
    try:
        # Extract JSON from response (handle markdown code blocks)
        if '```json' in response:
            response = response.split('```json')[1].split('```')[0]
        elif '```' in response:
            response = response.split('```')[1].split('```')[0]

        data = json.loads(response.strip())
        return {
            'result': data.get('result', 'TBD'),
            'confidence': float(data.get('confidence', 0.7)),
            'justification': data.get('justification', '')
        }
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        print(f"  [WARN] Failed to parse response: {e}")
        # Try to extract result from text
        response_upper = response.upper()
        if '"YES"' in response_upper or ': YES' in response_upper:
            return {'result': 'YES', 'confidence': 0.6, 'justification': response[:500]}
        elif '"NO"' in response_upper or ': NO' in response_upper:
            return {'result': 'NO', 'confidence': 0.6, 'justification': response[:500]}
        elif '"N/A"' in response_upper or ': N/A' in response_upper:
            return {'result': 'N/A', 'confidence': 0.6, 'justification': response[:500]}
        return None


def save_evaluation(product_id: int, norm_id: int, result: str, confidence: float, justification: str):
    """Save evaluation to database with proper Claude Opus attribution."""

    data = {
        'product_id': product_id,
        'norm_id': norm_id,
        'result': result,
        'confidence_score': confidence,
        'why_this_result': justification,
        'evaluated_by': f'claude_{CLAUDE_MODEL}',  # REAL model attribution
        'evaluation_date': datetime.now().isoformat(),
    }

    # Upsert (update if exists, insert if not)
    response = requests.post(
        f'{SUPABASE_URL}/rest/v1/evaluations?on_conflict=product_id,norm_id',
        headers={**WRITE_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'},
        json=data
    )

    return response.status_code in [200, 201, 204]


def get_applicable_norms(product_type_id: int) -> list:
    """Get norms applicable to a product type."""
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{product_type_id}&is_applicable=eq.true&select=norm_id',
        headers=READ_HEADERS
    )
    if response.status_code == 200:
        return [a['norm_id'] for a in response.json()]
    return []


def get_product_by_slug(slug: str) -> dict | None:
    """Get product by slug."""
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?slug=eq.{slug}&select=*',
        headers=READ_HEADERS
    )
    if response.status_code == 200:
        data = response.json()
        return data[0] if data else None
    return None


def get_all_products(limit: int = 100) -> list:
    """Get all products."""
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,description&limit={limit}',
        headers=READ_HEADERS
    )
    return response.json() if response.status_code == 200 else []


def get_product_types() -> dict:
    """Get all product types."""
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_types?select=id,name,category',
        headers=READ_HEADERS
    )
    if response.status_code == 200:
        return {t['id']: t for t in response.json()}
    return {}


def get_norms_by_ids(norm_ids: list) -> dict:
    """Get norms by IDs."""
    if not norm_ids:
        return {}

    # Batch in groups of 100
    norms = {}
    for i in range(0, len(norm_ids), 100):
        batch = norm_ids[i:i+100]
        ids_str = ','.join(str(id) for id in batch)
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?id=in.({ids_str})&select=id,code,title,pillar',
            headers=READ_HEADERS
        )
        if response.status_code == 200:
            for n in response.json():
                norms[n['id']] = n
    return norms


def main():
    parser = argparse.ArgumentParser(description='Evaluate products with real Claude Opus API')
    parser.add_argument('--product', type=str, help='Product slug to evaluate')
    parser.add_argument('--all', action='store_true', help='Evaluate all products')
    parser.add_argument('--limit', type=int, default=50, help='Max norms per product')
    parser.add_argument('--batch-size', type=int, default=10, help='Products per batch')
    parser.add_argument('--dry-run', action='store_true', help='Print without saving')
    args = parser.parse_args()

    if not ANTHROPIC_API_KEY:
        print("="*60)
        print("ERROR: ANTHROPIC_API_KEY not found in .env")
        print("="*60)
        print("\nTo use this script, add your Anthropic API key to .env:")
        print("  ANTHROPIC_API_KEY=sk-ant-api03-...")
        print("\nGet your key at: https://console.anthropic.com/")
        return

    print("="*60)
    print(f"CLAUDE OPUS EVALUATOR - Using {CLAUDE_MODEL}")
    print("="*60)

    # Load data
    print("\nLoading data...")
    types = get_product_types()
    print(f"  Loaded {len(types)} product types")

    # Get products to evaluate
    if args.product:
        product = get_product_by_slug(args.product)
        if not product:
            print(f"Product not found: {args.product}")
            return
        products = [product]
    elif args.all:
        products = get_all_products(args.batch_size)
    else:
        print("Specify --product <slug> or --all")
        return

    print(f"  Products to evaluate: {len(products)}")

    # Evaluate each product
    total_evals = 0
    for product in products:
        product_name = product.get('name', 'Unknown')
        product_id = product['id']
        type_id = product.get('type_id')
        type_info = types.get(type_id) if type_id else None

        print(f"\n{'='*60}")
        print(f"Product: {product_name}")
        print(f"Type: {type_info.get('name') if type_info else 'Unknown'}")
        print(f"{'='*60}")

        # Get applicable norms
        applicable_norm_ids = get_applicable_norms(type_id) if type_id else []
        if not applicable_norm_ids:
            print("  No applicable norms found, skipping...")
            continue

        # Limit norms
        norm_ids = applicable_norm_ids[:args.limit]
        norms = get_norms_by_ids(norm_ids)

        print(f"  Evaluating {len(norms)} norms...")

        for i, (norm_id, norm) in enumerate(norms.items()):
            print(f"  [{i+1}/{len(norms)}] {norm['code']}: {norm['title'][:50]}...")

            # Evaluate
            result = evaluate_product_norm(product, norm, type_info)
            if not result:
                print(f"    [SKIP] Failed to evaluate")
                continue

            print(f"    Result: {result['result']} (confidence: {result['confidence']:.2f})")
            print(f"    Justification: {result['justification'][:100]}...")

            # Save
            if not args.dry_run:
                if save_evaluation(product_id, norm_id, result['result'], result['confidence'], result['justification']):
                    total_evals += 1
                else:
                    print(f"    [ERROR] Failed to save")
            else:
                total_evals += 1

            # Rate limit protection
            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"COMPLETE: {total_evals} evaluations {'would be ' if args.dry_run else ''}saved")
    print(f"Model used: {CLAUDE_MODEL}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
