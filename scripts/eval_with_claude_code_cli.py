#!/usr/bin/env python3
"""
EVALUATE PRODUCTS WITH CLAUDE CODE CLI (NO API COSTS)
======================================================
Uses Claude Code CLI (subscription-based) to evaluate products.
No API key needed - uses your Claude Code subscription.

Usage:
    python scripts/eval_with_claude_code_cli.py --product ledger-nano-x --limit 10
    python scripts/eval_with_claude_code_cli.py --all --batch-size 5
    python scripts/eval_with_claude_code_cli.py --all --skip-existing

Requirements:
    - Claude Code CLI installed and authenticated (claude command)
    - Your Claude Code subscription
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import argparse
import json
import subprocess
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

# Model attribution
MODEL_NAME = 'claude_code_opus_4.5'

# Progress file
PROGRESS_FILE = 'data/eval_progress_cli.json'

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


def load_progress() -> dict:
    """Load progress from file."""
    try:
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {'evaluated': {}, 'errors': [], 'started': datetime.now().isoformat()}


def save_progress(progress: dict):
    """Save progress to file."""
    os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)


def call_claude_code(prompt: str, timeout: int = 180) -> str | None:
    """
    Call Claude Code CLI with a prompt.
    Uses -p flag with --output-format json for reliable output.
    """
    try:
        # Write prompt to temp file to avoid shell escaping issues
        import tempfile
        prompt_file = os.path.join(tempfile.gettempdir(), 'claude_eval_prompt.txt')
        with open(prompt_file, 'w', encoding='utf-8') as f:
            f.write(prompt)

        # Read from stdin via file, output as JSON
        with open(prompt_file, 'r', encoding='utf-8') as f:
            result = subprocess.run(
                ['claude', '--print', '--output-format', 'json'],
                stdin=f,
                capture_output=True,
                text=True,
                timeout=timeout,
                encoding='utf-8',
                errors='replace'
            )

        # Clean up
        try:
            os.remove(prompt_file)
        except:
            pass

        if result.returncode == 0 and result.stdout.strip():
            # Parse the JSON wrapper from Claude CLI
            try:
                cli_output = json.loads(result.stdout.strip())
                return cli_output.get('result', result.stdout.strip())
            except json.JSONDecodeError:
                return result.stdout.strip()
        else:
            stderr = result.stderr.strip()[:200] if result.stderr else 'no stderr'
            print(f"  [ERROR] Claude CLI rc={result.returncode}: {stderr}")
            return None

    except subprocess.TimeoutExpired:
        print(f"  [TIMEOUT] Claude CLI took >{timeout}s")
        return None
    except Exception as e:
        print(f"  [ERROR] Claude CLI error: {e}")
        return None


EVALUATION_PROMPT = """You are an expert crypto security analyst for SafeScoring. Evaluate this product against a security norm.

PRODUCT: {product_name}
TYPE: {product_type}
DESCRIPTION: {product_description}

NORM:
- Code: {norm_code}
- Title: {norm_title}
- Pillar: {pillar_name}

RATING RULES:
- YES = Product explicitly implements this norm (documented, audited, standard practice for this product)
- YESp = Inherent to the product's technology (e.g., all EVM wallets use secp256k1)
- NO = Product does NOT implement this norm
- N/A = This norm is not applicable to this product type at all

IMPORTANT:
- Be strict. Only give YES if there is evidence the product implements this.
- YESp is for norms that are inherently satisfied by the product's technology stack.
- Physical security norms are N/A for pure software products.
- Chain-specific norms need explicit support.

Respond ONLY with valid JSON, nothing else:
{{"result": "YES/NO/N/A/YESp", "confidence": 0.85, "justification": "2-3 sentences explaining why, with technical details."}}"""


def evaluate_product_norm(product: dict, norm: dict, type_info: dict) -> dict | None:
    """Evaluate a product against a norm using Claude Code CLI."""

    pillar_names = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem'}

    prompt = EVALUATION_PROMPT.format(
        product_name=product.get('name', 'Unknown'),
        product_type=type_info.get('name', 'Unknown') if type_info else 'Unknown',
        product_description=(product.get('description', '') or '')[:300],
        norm_code=norm.get('code', ''),
        norm_title=norm.get('title', ''),
        pillar_name=pillar_names.get(norm.get('pillar', ''), 'Unknown')
    )

    response = call_claude_code(prompt)
    if not response:
        return None

    # Parse JSON response
    try:
        if '{' in response and '}' in response:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            json_str = response[json_start:json_end]
            data = json.loads(json_str)

            result = data.get('result', 'TBD').upper().strip().replace('"', '')
            # Normalize result
            if result == 'YESP':
                result = 'YESp'
            elif result not in ('YES', 'NO', 'N/A', 'YESp', 'TBD'):
                result = 'TBD'

            return {
                'result': result,
                'confidence': min(1.0, max(0.0, float(data.get('confidence', 0.75)))),
                'justification': str(data.get('justification', ''))[:1000]
            }
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"  [WARN] Parse error: {e}")

    # Fallback: extract from text
    response_upper = response.upper()
    for result_val in ['YESP', 'YES', 'N/A', 'NO']:
        if f'"{result_val}"' in response_upper or f'RESULT": "{result_val}' in response_upper:
            return {
                'result': 'YESp' if result_val == 'YESP' else result_val,
                'confidence': 0.65,
                'justification': response[:500]
            }

    return None


def save_evaluation(product_id: int, norm_id: int, result: str, confidence: float, justification: str) -> bool:
    """Save evaluation to database (UPDATE existing or INSERT new)."""

    update_data = {
        'result': result,
        'confidence_score': confidence,
        'why_this_result': justification,
        'evaluated_by': MODEL_NAME,
    }

    for attempt in range(3):
        try:
            # Check if evaluation exists
            check_resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&norm_id=eq.{norm_id}&select=id&order=id.desc&limit=1',
                headers=READ_HEADERS,
                timeout=30
            )

            if check_resp.status_code == 200 and check_resp.json():
                # UPDATE existing
                eval_id = check_resp.json()[0]['id']
                response = requests.patch(
                    f'{SUPABASE_URL}/rest/v1/evaluations?id=eq.{eval_id}',
                    headers=WRITE_HEADERS,
                    json=update_data,
                    timeout=60
                )
            else:
                # INSERT new
                insert_data = {**update_data, 'product_id': product_id, 'norm_id': norm_id}
                response = requests.post(
                    f'{SUPABASE_URL}/rest/v1/evaluations',
                    headers=WRITE_HEADERS,
                    json=insert_data,
                    timeout=60
                )

            if response.status_code in [200, 201, 204]:
                return True

            if 'timeout' in (response.text or '').lower():
                wait = (2 ** attempt) + 1
                print(f"    [RETRY {attempt+1}/3] DB timeout, waiting {wait}s...")
                time.sleep(wait)
                continue

            print(f"    [SAVE ERR] {response.status_code}: {response.text[:150]}")
            return False

        except requests.exceptions.Timeout:
            wait = (2 ** attempt) + 1
            print(f"    [RETRY {attempt+1}/3] Request timeout, waiting {wait}s...")
            time.sleep(wait)
        except Exception as e:
            print(f"    [SAVE ERR] {e}")
            return False

    return False


def get_applicable_norms(product_type_id: int) -> list:
    """Get norms applicable to a product type."""
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{product_type_id}&is_applicable=eq.true&select=norm_id',
        headers=READ_HEADERS,
        timeout=30
    )
    if response.status_code == 200:
        return [a['norm_id'] for a in response.json()]
    return []


def get_product_by_slug(slug: str) -> dict | None:
    """Get product by slug."""
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?slug=eq.{slug}&select=*',
        headers=READ_HEADERS,
        timeout=15
    )
    if response.status_code == 200:
        data = response.json()
        return data[0] if data else None
    return None


def get_all_evaluable_products() -> list:
    """Get all products that have types with applicable norms."""
    # Get types with applicability
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?is_applicable=eq.true&select=type_id',
        headers=READ_HEADERS, timeout=30
    )
    if r.status_code != 200:
        return []

    type_ids = list(set(a['type_id'] for a in r.json()))
    if not type_ids:
        return []

    type_ids_str = ','.join(str(t) for t in type_ids)
    r2 = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?type_id=in.({type_ids_str})&select=id,name,slug,type_id,description&limit=2000',
        headers=READ_HEADERS, timeout=30
    )
    return r2.json() if r2.status_code == 200 else []


def get_product_types() -> dict:
    """Get all product types."""
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_types?select=id,name,category',
        headers=READ_HEADERS, timeout=15
    )
    if response.status_code == 200:
        return {t['id']: t for t in response.json()}
    return {}


def get_norms_by_ids(norm_ids: list) -> dict:
    """Get norms by IDs."""
    if not norm_ids:
        return {}
    norms = {}
    for i in range(0, len(norm_ids), 100):
        batch = norm_ids[i:i+100]
        ids_str = ','.join(str(id) for id in batch)
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?id=in.({ids_str})&select=id,code,title,pillar',
            headers=READ_HEADERS, timeout=15
        )
        if response.status_code == 200:
            for n in response.json():
                norms[n['id']] = n
    return norms


def check_claude_cli():
    """Check if Claude CLI is available."""
    try:
        result = subprocess.run(['claude', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"  Claude CLI: {result.stdout.strip()}")
            return True
    except:
        pass
    return False


def main():
    parser = argparse.ArgumentParser(description='Evaluate products with Claude Code CLI (no API costs)')
    parser.add_argument('--product', type=str, help='Product slug to evaluate')
    parser.add_argument('--all', action='store_true', help='Evaluate all evaluable products')
    parser.add_argument('--limit', type=int, default=50, help='Max norms per product')
    parser.add_argument('--batch-size', type=int, default=999, help='Max products to process')
    parser.add_argument('--dry-run', action='store_true', help='Print without saving')
    parser.add_argument('--pillar', type=str, choices=['S', 'A', 'F', 'E'], help='Only evaluate specific pillar')
    parser.add_argument('--skip-existing', action='store_true', help='Skip norms already evaluated by this model')
    parser.add_argument('--offset', type=int, default=0, help='Skip first N products')
    args = parser.parse_args()

    print("=" * 60)
    print("CLAUDE CODE CLI EVALUATOR (NO API COSTS)")
    print("=" * 60)

    # Check Claude CLI
    print("\nChecking Claude CLI...")
    if not check_claude_cli():
        print("\n[ERROR] Claude CLI not found.")
        return

    # Load data
    print("\nLoading data from Supabase...")
    types = get_product_types()
    print(f"  Product types: {len(types)}")

    # Load progress
    progress = load_progress()

    # Get products
    if args.product:
        product = get_product_by_slug(args.product)
        if not product:
            print(f"Product not found: {args.product}")
            return
        products = [product]
    elif args.all:
        products = get_all_evaluable_products()
        print(f"  Evaluable products (with norm applicability): {len(products)}")
        if args.offset > 0:
            products = products[args.offset:]
            print(f"  After offset {args.offset}: {len(products)}")
        products = products[:args.batch_size]
    else:
        print("Specify --product <slug> or --all")
        return

    print(f"  Products to evaluate: {len(products)}")

    # Evaluate
    total_evals = 0
    total_errors = 0
    total_skipped = 0

    for pi, product in enumerate(products):
        product_name = product.get('name', 'Unknown')
        product_id = product['id']
        type_id = product.get('type_id')
        type_info = types.get(type_id) if type_id else None

        # Check progress
        prod_key = str(product_id)
        if prod_key in progress['evaluated'] and not args.product:
            done_count = len(progress['evaluated'][prod_key])
            print(f"\n[{pi+1}/{len(products)}] {product_name} — {done_count} already done, skipping")
            total_skipped += done_count
            continue

        print(f"\n{'='*60}")
        print(f"[{pi+1}/{len(products)}] {product_name}")
        print(f"Type: {type_info.get('name') if type_info else 'N/A'} | ID: {product_id}")
        print(f"{'='*60}")

        # Get applicable norms
        applicable_norm_ids = get_applicable_norms(type_id) if type_id else []
        if not applicable_norm_ids:
            print("  No applicable norms, skipping...")
            continue

        print(f"  Applicable norms: {len(applicable_norm_ids)}")

        # Skip already evaluated
        if args.skip_existing:
            already = progress['evaluated'].get(prod_key, [])
            applicable_norm_ids = [nid for nid in applicable_norm_ids if nid not in already]
            if not applicable_norm_ids:
                print("  All norms already evaluated, skipping...")
                continue

        # Limit
        eval_norm_ids = applicable_norm_ids[:args.limit]

        # Get norm details
        norms = get_norms_by_ids(eval_norm_ids)

        # Filter by pillar
        if args.pillar:
            norms = {k: v for k, v in norms.items() if v.get('pillar') == args.pillar}

        print(f"  Evaluating {len(norms)} norms...")

        prod_evals = 0
        prod_errors = 0

        for i, (norm_id, norm) in enumerate(norms.items()):
            norm_code = norm.get('code', '')
            norm_title = norm.get('title', '')[:40]
            print(f"  [{i+1}/{len(norms)}] {norm_code}: {norm_title}...", end=' ', flush=True)

            # Evaluate with Claude Code
            result = evaluate_product_norm(product, norm, type_info)

            if not result:
                print("FAILED")
                total_errors += 1
                prod_errors += 1
                time.sleep(3)  # Wait longer on failure
                continue

            res = result['result']
            conf = result['confidence']
            just = result['justification'][:60]
            print(f"=> {res} ({conf:.0%})")

            # Save
            if not args.dry_run:
                if save_evaluation(product_id, norm_id, res, conf, result['justification']):
                    total_evals += 1
                    prod_evals += 1
                    # Track progress
                    if prod_key not in progress['evaluated']:
                        progress['evaluated'][prod_key] = []
                    progress['evaluated'][prod_key].append(norm_id)
                    save_progress(progress)
                else:
                    total_errors += 1
                    prod_errors += 1
            else:
                total_evals += 1
                prod_evals += 1

            time.sleep(1)

        print(f"  => {prod_evals} saved, {prod_errors} errors")

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"  Evaluations saved: {total_evals}")
    print(f"  Errors: {total_errors}")
    print(f"  Skipped (already done): {total_skipped}")
    print(f"  Model: {MODEL_NAME}")
    if args.dry_run:
        print("  (DRY RUN - nothing saved)")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
