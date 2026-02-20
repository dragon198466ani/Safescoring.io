#!/usr/bin/env python3
"""
BATCH CLAUDE CODE EVALUATOR - Complete Evaluation Pipeline
==========================================================
Uses Claude Code CLI (no API costs) to generate:
1. Type × Norm applicability with justifications
2. Product × Norm evaluations with detailed justifications
3. Product pillar analyses for frontend display

All outputs in English.

Usage:
    python scripts/batch_claude_code_evaluator.py --mode all
    python scripts/batch_claude_code_evaluator.py --mode applicability --limit 100
    python scripts/batch_claude_code_evaluator.py --mode evaluations --product ledger-nano-x
    python scripts/batch_claude_code_evaluator.py --mode analyses --product-limit 10
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
from concurrent.futures import ThreadPoolExecutor
import threading

# Load environment
load_dotenv('.env')
load_dotenv('config/.env')

# Supabase config
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

# Model attribution
MODEL_NAME = 'claude_opus_4.5_real'

# Rate limiting
DELAY_BETWEEN_CALLS = 1.0  # seconds
call_lock = threading.Lock()
last_call_time = 0

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

# Stats
stats = {
    'applicability': {'success': 0, 'failed': 0},
    'evaluations': {'success': 0, 'failed': 0},
    'analyses': {'success': 0, 'failed': 0},
}


def rate_limited_call():
    """Ensure we don't call too fast."""
    global last_call_time
    with call_lock:
        elapsed = time.time() - last_call_time
        if elapsed < DELAY_BETWEEN_CALLS:
            time.sleep(DELAY_BETWEEN_CALLS - elapsed)
        last_call_time = time.time()


def call_claude_code(prompt: str, timeout: int = 180) -> str | None:
    """Call Claude Code CLI."""
    rate_limited_call()

    try:
        result = subprocess.run(
            ['claude', '--print', '-p', prompt],
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding='utf-8',
            errors='replace'
        )

        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"    [CLI ERROR] {result.stderr[:100]}", flush=True)
            return None

    except subprocess.TimeoutExpired:
        print(f"    [TIMEOUT]", flush=True)
        return None
    except FileNotFoundError:
        print("    [ERROR] Claude CLI not found", flush=True)
        return None
    except Exception as e:
        print(f"    [ERROR] {e}", flush=True)
        return None


def parse_json_response(response: str) -> dict | None:
    """Parse JSON from Claude response."""
    if not response:
        return None
    try:
        # Find JSON in response
        if '{' in response and '}' in response:
            start = response.find('{')
            end = response.rfind('}') + 1
            return json.loads(response[start:end])
    except:
        pass
    return None


# =============================================================================
# DATA FETCHING
# =============================================================================

def fetch_all(table: str, select: str = '*', filters: dict = None, limit: int = 10000) -> list:
    """Fetch records from Supabase."""
    all_records = []
    offset = 0
    batch_size = 1000

    while len(all_records) < limit:
        url = f'{SUPABASE_URL}/rest/v1/{table}?select={select}&limit={batch_size}&offset={offset}'
        if filters:
            for k, v in filters.items():
                url += f'&{k}={v}'

        resp = requests.get(url, headers=READ_HEADERS)
        if resp.status_code != 200:
            break

        batch = resp.json()
        if not batch:
            break

        all_records.extend(batch)
        if len(batch) < batch_size:
            break
        offset += batch_size

    return all_records[:limit]


def get_product_types() -> dict:
    """Get all product types."""
    types = fetch_all('product_types', 'id,name,category,description')
    return {t['id']: t for t in types}


def get_products(limit: int = 100, slug: str = None) -> list:
    """Get products."""
    if slug:
        filters = {'slug': f'eq.{slug}'}
        return fetch_all('products', 'id,name,slug,type_id,description', filters)
    return fetch_all('products', 'id,name,slug,type_id,description', limit=limit)


def get_norms(pillar: str = None, limit: int = 1000) -> list:
    """Get norms."""
    filters = {'pillar': f'eq.{pillar}'} if pillar else None
    return fetch_all('norms', 'id,code,title,pillar,short_summary', filters, limit)


def get_norm_applicability(type_id: int = None) -> list:
    """Get existing applicability rules."""
    filters = {'type_id': f'eq.{type_id}'} if type_id else None
    return fetch_all('norm_applicability', 'norm_id,type_id,is_applicable,reason', filters)


# =============================================================================
# 1. TYPE × NORM APPLICABILITY
# =============================================================================

APPLICABILITY_PROMPT = """You are a crypto security expert. Determine if this security norm applies to this product type.

PRODUCT TYPE: {type_name}
CATEGORY: {category}
DESCRIPTION: {type_description}

NORM:
- Code: {norm_code}
- Title: {norm_title}
- Pillar: {pillar}
- Summary: {norm_summary}

RULES:
- Physical norms (materials, waterproof, fire-resistant) → NOT applicable to software/DeFi
- Hardware security (secure element, tamper) → Only applicable to hardware wallets/devices
- Chain-specific norms → Only if the type typically supports that chain
- Regulatory norms (KYC/AML) → Only for custodial/exchange types
- Smart contract norms → Only for DeFi/protocol types

Respond in JSON:
{{"is_applicable": true/false, "reason": "Brief explanation in English (1-2 sentences)"}}"""


def evaluate_applicability(type_info: dict, norm: dict) -> dict | None:
    """Evaluate if a norm applies to a product type."""

    prompt = APPLICABILITY_PROMPT.format(
        type_name=type_info.get('name', ''),
        category=type_info.get('category', ''),
        type_description=type_info.get('description', '')[:200] or 'No description',
        norm_code=norm.get('code', ''),
        norm_title=norm.get('title', ''),
        pillar={'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem'}.get(norm.get('pillar', ''), ''),
        norm_summary=norm.get('short_summary', '')[:200] or 'No summary'
    )

    response = call_claude_code(prompt)
    data = parse_json_response(response)

    if data and 'is_applicable' in data:
        return {
            'is_applicable': bool(data['is_applicable']),
            'reason': str(data.get('reason', ''))[:500]
        }
    return None


def save_applicability(type_id: int, norm_id: int, is_applicable: bool, reason: str) -> bool:
    """Save applicability to database."""
    data = {
        'type_id': type_id,
        'norm_id': norm_id,
        'is_applicable': is_applicable,
        'reason': reason,
        'applicability_reason': reason,
        'updated_at': datetime.now().isoformat()
    }

    resp = requests.post(
        f'{SUPABASE_URL}/rest/v1/norm_applicability?on_conflict=norm_id,type_id',
        headers={**WRITE_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'},
        json=data
    )
    return resp.status_code in [200, 201, 204]


def run_applicability_evaluation(types: dict, norms: list, limit: int = 100):
    """Run applicability evaluation for type × norm pairs."""
    print("\n" + "="*60, flush=True)
    print("PHASE 1: TYPE × NORM APPLICABILITY", flush=True)
    print("="*60, flush=True)

    # Get existing applicability
    existing = get_norm_applicability()
    existing_set = {(a['type_id'], a['norm_id']) for a in existing if a.get('reason') and len(a.get('reason', '')) > 20}

    print(f"Types: {len(types)}, Norms: {len(norms)}", flush=True)
    print(f"Existing with good reason: {len(existing_set)}", flush=True)

    # Find pairs needing evaluation
    pairs_to_eval = []
    for type_id, type_info in types.items():
        for norm in norms:
            if (type_id, norm['id']) not in existing_set:
                pairs_to_eval.append((type_id, type_info, norm))

    pairs_to_eval = pairs_to_eval[:limit]
    print(f"Pairs to evaluate: {len(pairs_to_eval)}", flush=True)

    for i, (type_id, type_info, norm) in enumerate(pairs_to_eval):
        print(f"[{i+1}/{len(pairs_to_eval)}] {type_info['name']} × {norm['code']}...", flush=True)

        result = evaluate_applicability(type_info, norm)
        if result:
            if save_applicability(type_id, norm['id'], result['is_applicable'], result['reason']):
                stats['applicability']['success'] += 1
                print(f"    {'✓' if result['is_applicable'] else '✗'} {result['reason'][:60]}...", flush=True)
            else:
                stats['applicability']['failed'] += 1
        else:
            stats['applicability']['failed'] += 1


# =============================================================================
# 2. PRODUCT × NORM EVALUATIONS
# =============================================================================

EVALUATION_PROMPT = """You are a crypto security analyst. Evaluate this product against a security norm.

PRODUCT: {product_name}
TYPE: {product_type}
DESCRIPTION: {product_description}

NORM:
- Code: {norm_code}
- Title: {norm_title}
- Pillar: {pillar}

RATING SCALE:
- YES = Product implements this norm (documented, audited, working features)
- YESp = Inherent to technology (e.g., EVM uses secp256k1 by design)
- NO = Product clearly does NOT implement this
- N/A = Not applicable to this product type

EVALUATION RULES:
1. Established products (2+ years, no major hacks) deserve credit for standard practices
2. Audited products can be assumed to follow documented best practices
3. Standard crypto implementations count (secp256k1, AES-256, etc.)
4. Physical norms are N/A for software products
5. Be specific about WHY in your justification

Respond in JSON:
{{"result": "YES/NO/N/A/YESp", "confidence": 0.0-1.0, "justification": "2-3 sentences with specific technical reasoning in English"}}"""


def evaluate_product_norm(product: dict, norm: dict, type_info: dict) -> dict | None:
    """Evaluate a product against a norm."""

    prompt = EVALUATION_PROMPT.format(
        product_name=product.get('name', ''),
        product_type=type_info.get('name', '') if type_info else 'Unknown',
        product_description=(product.get('description', '') or '')[:300],
        norm_code=norm.get('code', ''),
        norm_title=norm.get('title', ''),
        pillar={'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem'}.get(norm.get('pillar', ''), '')
    )

    response = call_claude_code(prompt)
    data = parse_json_response(response)

    if data and 'result' in data:
        result = str(data['result']).upper().replace('"', '').strip()
        if result in ['YES', 'NO', 'N/A', 'YESP', 'TBD']:
            return {
                'result': 'YESp' if result == 'YESP' else result,
                'confidence': min(1.0, max(0.0, float(data.get('confidence', 0.75)))),
                'justification': str(data.get('justification', ''))[:1000]
            }
    return None


def save_evaluation(product_id: int, norm_id: int, result: str, confidence: float, justification: str) -> bool:
    """Save evaluation to database."""
    data = {
        'product_id': product_id,
        'norm_id': norm_id,
        'result': result,
        'confidence_score': confidence,
        'why_this_result': justification,
        'evaluated_by': MODEL_NAME,
        'evaluation_date': datetime.now().isoformat()
    }

    resp = requests.post(
        f'{SUPABASE_URL}/rest/v1/evaluations?on_conflict=product_id,norm_id',
        headers={**WRITE_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'},
        json=data
    )
    return resp.status_code in [200, 201, 204]


def run_product_evaluations(products: list, types: dict, limit_per_product: int = 50):
    """Run product × norm evaluations."""
    print("\n" + "="*60, flush=True)
    print("PHASE 2: PRODUCT × NORM EVALUATIONS", flush=True)
    print("="*60, flush=True)

    print(f"Products: {len(products)}", flush=True)

    for product in products:
        product_name = product.get('name', 'Unknown')
        product_id = product['id']
        type_id = product.get('type_id')
        type_info = types.get(type_id)

        print(f"\n--- {product_name} ---", flush=True)

        # Get applicable norms for this type
        if not type_id:
            print("  No type, skipping...", flush=True)
            continue

        applicability = get_norm_applicability(type_id)
        applicable_norm_ids = [a['norm_id'] for a in applicability if a.get('is_applicable')]

        if not applicable_norm_ids:
            print("  No applicable norms, skipping...", flush=True)
            continue

        # Get norm details
        norm_ids_str = ','.join(str(id) for id in applicable_norm_ids[:limit_per_product])
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?id=in.({norm_ids_str})&select=id,code,title,pillar',
            headers=READ_HEADERS
        )
        norms = resp.json() if resp.status_code == 200 else []

        print(f"  Evaluating {len(norms)} norms...", flush=True)

        for norm in norms:
            norm_code = norm.get('code', '')
            print(f"    {norm_code}...", end=' ', flush=True)

            result = evaluate_product_norm(product, norm, type_info)
            if result:
                if save_evaluation(product_id, norm['id'], result['result'], result['confidence'], result['justification']):
                    stats['evaluations']['success'] += 1
                    print(f"{result['result']}", flush=True)
                else:
                    stats['evaluations']['failed'] += 1
                    print("SAVE FAILED", flush=True)
            else:
                stats['evaluations']['failed'] += 1
                print("EVAL FAILED", flush=True)


# =============================================================================
# 3. PRODUCT PILLAR ANALYSES (For Frontend Display)
# =============================================================================

ANALYSIS_PROMPT = """You are a crypto security expert writing analysis for a product page.

PRODUCT: {product_name}
TYPE: {product_type}
PILLAR: {pillar_name} ({pillar_code})
SCORE: {score}%

Based on our evaluation:
- Total norms evaluated: {total_norms}
- Norms passed (YES/YESp): {passed_norms}
- Norms failed (NO): {failed_norms}

Write a concise analysis for users. Include:
1. summary: 2-3 sentences explaining the score
2. strengths: 2-3 bullet points of what the product does well
3. weaknesses: 1-2 bullet points of areas for improvement (if any)
4. recommendation: 1 sentence advice for users

Respond in JSON:
{{
    "summary": "...",
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "recommendation": "..."
}}"""


def generate_pillar_analysis(product: dict, pillar: str, evaluations: list, type_info: dict) -> dict | None:
    """Generate pillar analysis for frontend display."""

    pillar_names = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem'}

    # Calculate stats
    pillar_evals = [e for e in evaluations if e.get('pillar') == pillar]
    total = len(pillar_evals)
    passed = len([e for e in pillar_evals if e.get('result') in ['YES', 'YESp']])
    failed = len([e for e in pillar_evals if e.get('result') == 'NO'])
    score = round(passed / total * 100) if total > 0 else 0

    if total == 0:
        return None

    prompt = ANALYSIS_PROMPT.format(
        product_name=product.get('name', ''),
        product_type=type_info.get('name', '') if type_info else 'Unknown',
        pillar_name=pillar_names.get(pillar, ''),
        pillar_code=pillar,
        score=score,
        total_norms=total,
        passed_norms=passed,
        failed_norms=failed
    )

    response = call_claude_code(prompt)
    data = parse_json_response(response)

    if data and 'summary' in data:
        return {
            'summary': str(data.get('summary', ''))[:500],
            'strengths': data.get('strengths', [])[:3],
            'weaknesses': data.get('weaknesses', [])[:2],
            'recommendation': str(data.get('recommendation', ''))[:200],
            'score': score,
            'total_norms': total,
            'passed_norms': passed,
            'failed_norms': failed
        }
    return None


def save_pillar_analysis(product_id: int, pillar: str, analysis: dict) -> bool:
    """Save pillar analysis to database."""
    data = {
        'product_id': product_id,
        'pillar': pillar,
        'ai_model': MODEL_NAME,
        'narrative_summary': analysis['summary'],
        'key_strengths': json.dumps(analysis['strengths']),
        'key_weaknesses': json.dumps(analysis['weaknesses']),
        'security_strategy': analysis['recommendation'],
        'pillar_score': analysis['score'],
        'evaluated_norms_count': analysis['total_norms'],
        'failed_norms_count': analysis['failed_norms'],
        'generated_at': datetime.now().isoformat()
    }

    # Try product_pillar_analyses table
    resp = requests.post(
        f'{SUPABASE_URL}/rest/v1/product_pillar_analyses?on_conflict=product_id,pillar',
        headers={**WRITE_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'},
        json=data
    )
    return resp.status_code in [200, 201, 204]


def run_pillar_analyses(products: list, types: dict):
    """Generate pillar analyses for products."""
    print("\n" + "="*60, flush=True)
    print("PHASE 3: PILLAR ANALYSES (Frontend)", flush=True)
    print("="*60, flush=True)

    for product in products:
        product_name = product.get('name', 'Unknown')
        product_id = product['id']
        type_info = types.get(product.get('type_id'))

        print(f"\n--- {product_name} ---", flush=True)

        # Get evaluations with pillar info
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=id,norm_id,result,norms(pillar)',
            headers=READ_HEADERS
        )

        if resp.status_code != 200:
            print("  Failed to fetch evaluations", flush=True)
            continue

        raw_evals = resp.json()
        evaluations = []
        for e in raw_evals:
            if e.get('norms'):
                evaluations.append({
                    'result': e.get('result'),
                    'pillar': e['norms'].get('pillar') if isinstance(e['norms'], dict) else None
                })

        if not evaluations:
            print("  No evaluations found", flush=True)
            continue

        # Generate analysis for each pillar
        for pillar in ['S', 'A', 'F', 'E']:
            print(f"  Pillar {pillar}...", end=' ', flush=True)

            analysis = generate_pillar_analysis(product, pillar, evaluations, type_info)
            if analysis:
                if save_pillar_analysis(product_id, pillar, analysis):
                    stats['analyses']['success'] += 1
                    print(f"OK ({analysis['score']}%)", flush=True)
                else:
                    stats['analyses']['failed'] += 1
                    print("SAVE FAILED", flush=True)
            else:
                stats['analyses']['failed'] += 1
                print("SKIP (no data)", flush=True)


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='Batch Claude Code Evaluator')
    parser.add_argument('--mode', choices=['all', 'applicability', 'evaluations', 'analyses'],
                        default='all', help='What to run')
    parser.add_argument('--product', type=str, help='Specific product slug')
    parser.add_argument('--product-limit', type=int, default=10, help='Max products')
    parser.add_argument('--norm-limit', type=int, default=50, help='Max norms per product')
    parser.add_argument('--applicability-limit', type=int, default=100, help='Max type×norm pairs')
    parser.add_argument('--pillar', choices=['S', 'A', 'F', 'E'], help='Specific pillar')
    args = parser.parse_args()

    print("="*60, flush=True)
    print("BATCH CLAUDE CODE EVALUATOR", flush=True)
    print(f"Model: {MODEL_NAME}", flush=True)
    print(f"Mode: {args.mode}", flush=True)
    print("="*60, flush=True)

    # Check Claude CLI
    try:
        result = subprocess.run(['claude', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"Claude CLI: {result.stdout.strip()}", flush=True)
        else:
            print("ERROR: Claude CLI not working", flush=True)
            return
    except:
        print("ERROR: Claude CLI not found", flush=True)
        return

    # Load data
    print("\nLoading data...", flush=True)
    types = get_product_types()
    print(f"  Product types: {len(types)}", flush=True)

    # Get products
    if args.product:
        products = get_products(slug=args.product)
    else:
        products = get_products(limit=args.product_limit)
    print(f"  Products: {len(products)}", flush=True)

    # Get norms
    norms = get_norms(pillar=args.pillar, limit=500)
    print(f"  Norms: {len(norms)}", flush=True)

    start_time = time.time()

    # Run phases
    if args.mode in ['all', 'applicability']:
        run_applicability_evaluation(types, norms, args.applicability_limit)

    if args.mode in ['all', 'evaluations']:
        run_product_evaluations(products, types, args.norm_limit)

    if args.mode in ['all', 'analyses']:
        run_pillar_analyses(products, types)

    # Summary
    elapsed = time.time() - start_time
    print("\n" + "="*60, flush=True)
    print("SUMMARY", flush=True)
    print("="*60, flush=True)
    print(f"Time: {elapsed/60:.1f} minutes", flush=True)
    print(f"Applicability: {stats['applicability']['success']} success, {stats['applicability']['failed']} failed", flush=True)
    print(f"Evaluations: {stats['evaluations']['success']} success, {stats['evaluations']['failed']} failed", flush=True)
    print(f"Analyses: {stats['analyses']['success']} success, {stats['analyses']['failed']} failed", flush=True)
    print("="*60, flush=True)


if __name__ == '__main__':
    main()
