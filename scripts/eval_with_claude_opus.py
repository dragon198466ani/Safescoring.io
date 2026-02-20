#!/usr/bin/env python3
"""
EVALUATE ALL PRODUCTS WITH CLAUDE OPUS
======================================
Uses OpenRouter to access Claude Opus for intelligent product evaluations.
Stores detailed justifications in why_this_result column.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

from core.config import SUPABASE_URL, get_supabase_headers, GROQ_API_KEYS
import requests
import time
import json
import random

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'return=minimal'

# Groq API with 15 keys - Llama 3.3 70B (very intelligent, free)
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Llama 3.3 70B - excellent quality

# Session with retries
session = requests.Session()
adapter = requests.adapters.HTTPAdapter(max_retries=3)
session.mount('https://', adapter)

# Track used keys for rotation
current_key_idx = 0


def get_openrouter_key():
    """Rotate through OpenRouter keys."""
    global current_key_idx
    keys = OPENROUTER_API_KEYS or []
    if not keys:
        return None
    key = keys[current_key_idx % len(keys)]
    current_key_idx += 1
    return key


def call_claude(prompt, max_tokens=2000, temperature=0.3):
    """Call Claude via OpenRouter."""
    key = get_openrouter_key()
    if not key:
        print("    No OpenRouter keys available!")
        return None

    try:
        r = session.post(
            OPENROUTER_URL,
            headers={
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://safescoring.io',
                'X-Title': 'SafeScoring Evaluator'
            },
            json={
                'model': CLAUDE_MODEL,
                'max_tokens': max_tokens,
                'temperature': temperature,
                'messages': [{'role': 'user', 'content': prompt}]
            },
            timeout=120
        )

        if r.status_code == 200:
            return r.json()['choices'][0]['message']['content']
        elif r.status_code == 429:
            print(f"    Rate limited, waiting 10s...")
            time.sleep(10)
            return call_claude(prompt, max_tokens, temperature)
        else:
            print(f"    OpenRouter HTTP {r.status_code}: {r.text[:200]}")
            return None
    except Exception as e:
        print(f"    Error: {str(e)[:100]}")
        return None


def load_all_data():
    """Load all required data."""
    print("Loading data...", flush=True)

    # Products with type
    products = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,type_id,url,description&type_id=not.is.null&limit=500&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        products.extend(data)
        offset += len(data)
        if len(data) < 500:
            break
    print(f"  {len(products)} products", flush=True)

    # Types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*', headers=READ_HEADERS, timeout=30)
    types = {t['id']: t for t in (r.json() if r.status_code == 200 else [])}
    print(f"  {len(types)} types", flush=True)

    # Norms
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,description&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        norms.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    norms_dict = {n['id']: n for n in norms}
    print(f"  {len(norms_dict)} norms", flush=True)

    # Applicabilities
    applicabilities = {}
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id&is_applicable=eq.true&limit=5000&offset={offset}',
            headers=READ_HEADERS, timeout=120
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        for a in data:
            tid = a['type_id']
            if tid not in applicabilities:
                applicabilities[tid] = []
            applicabilities[tid].append(a['norm_id'])
        offset += len(data)
        if len(data) < 5000:
            break
    print(f"  {sum(len(v) for v in applicabilities.values())} applicable norms", flush=True)

    # Already evaluated
    evaluated = set()
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?select=product_id&limit=5000&offset={offset}',
            headers=READ_HEADERS, timeout=120
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        evaluated.update(e['product_id'] for e in data)
        offset += len(data)
        if len(data) < 5000:
            break
    print(f"  {len(evaluated)} already evaluated products", flush=True)

    return products, types, norms_dict, applicabilities, evaluated


def build_evaluation_prompt(product, ptype, norms_to_eval):
    """Build the evaluation prompt for Claude."""
    product_name = product.get('name', 'Unknown')
    product_url = product.get('url', '')
    product_desc = (product.get('description', '') or '')[:500]
    type_name = ptype.get('name', 'Unknown')

    norms_text = ""
    for i, norm in enumerate(norms_to_eval[:30], 1):  # Limit to 30 norms per call
        code = norm.get('code', '')
        title = norm.get('title', '')
        pillar = norm.get('pillar', '')
        norms_text += f"{i}. [{pillar}] {code}: {title}\n"

    prompt = f"""You are an expert crypto security analyst. Evaluate this product against the given norms.

PRODUCT: {product_name}
TYPE: {type_name}
URL: {product_url}
DESCRIPTION: {product_desc}

NORMS TO EVALUATE:
{norms_text}

EVALUATION RULES:
- YES = Product implements this norm WITH documented evidence (official docs, audit report, source code)
- YESp = Mathematically inherent to the protocol (secp256k1 for ETH, SHA-256 for BTC, TLS for HTTPS)
- NO = No evidence found, or product does NOT implement this
- TBD = Partial evidence exists but insufficient (max 10%)

IMPORTANT:
1. No documentation or evidence = NO (silence is not proof of implementation)
2. Named audit firm WITH published report = YES for norms in audit scope only
3. Physical norms (materials, fire-resistance) = NO for software products
4. Chain-specific norms (Bitcoin, Solana) = NO unless explicitly supported

Respond in this exact JSON format:
{{"evaluations": [
  {{"norm_code": "S001", "result": "YES", "confidence": 0.85, "reason": "Brief specific reason"}},
  ...
]}}

Be concise but specific in reasons. Focus on WHY, not just restating the norm."""

    return prompt


def parse_evaluation_response(response, norms_to_eval):
    """Parse Claude's JSON response into evaluations."""
    try:
        # Extract JSON from response
        json_match = response
        if '```json' in response:
            json_match = response.split('```json')[1].split('```')[0]
        elif '```' in response:
            json_match = response.split('```')[1].split('```')[0]

        data = json.loads(json_match.strip())
        evaluations = data.get('evaluations', [])

        # Map back to norm IDs
        code_to_norm = {n.get('code', ''): n for n in norms_to_eval}
        results = []

        for eval_item in evaluations:
            code = eval_item.get('norm_code', '')
            norm = code_to_norm.get(code)
            if norm:
                results.append({
                    'norm_id': norm['id'],
                    'result': eval_item.get('result', 'NO'),
                    'confidence_score': eval_item.get('confidence', 0.7),
                    'why_this_result': eval_item.get('reason', '')
                })

        return results
    except Exception as e:
        print(f"    Parse error: {str(e)[:50]}")
        return []


def save_evaluations(product_id, evaluations):
    """Save evaluations to database."""
    if not evaluations:
        return 0

    # Prepare batch
    batch = []
    for e in evaluations:
        batch.append({
            'product_id': product_id,
            'norm_id': e['norm_id'],
            'result': e['result'],
            'confidence_score': e['confidence_score'],
            'why_this_result': e['why_this_result'],
            'evaluated_by': 'claude_sonnet_4'
        })

    # Save in chunks
    saved = 0
    for i in range(0, len(batch), 100):
        chunk = batch[i:i+100]
        try:
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/evaluations',
                headers=WRITE_HEADERS,
                json=chunk,
                timeout=60
            )
            if r.status_code == 201:
                saved += len(chunk)
            else:
                print(f"    Save error: {r.status_code}")
        except Exception as e:
            print(f"    Save error: {str(e)[:50]}")

    return saved


def main():
    print("=" * 70, flush=True)
    print("  EVALUATE ALL PRODUCTS WITH CLAUDE OPUS", flush=True)
    print("=" * 70, flush=True)

    if not OPENROUTER_API_KEYS:
        print("ERROR: No OpenRouter API keys configured!")
        return

    products, types, norms_dict, applicabilities, evaluated = load_all_data()

    # Filter to unevaluated products
    to_evaluate = [p for p in products if p['id'] not in evaluated]
    print(f"\nTo evaluate: {len(to_evaluate)} products", flush=True)

    if not to_evaluate:
        print("All products already evaluated!")
        return

    total_evals = 0
    start_time = time.time()

    for i, product in enumerate(to_evaluate):
        type_id = product.get('type_id')
        if not type_id:
            continue

        ptype = types.get(type_id, {})
        applicable_norm_ids = applicabilities.get(type_id, [])

        if not applicable_norm_ids:
            print(f"[{i+1}/{len(to_evaluate)}] {product['name'][:40]:40} - No applicable norms", flush=True)
            continue

        # Get norm details
        norms_to_eval = [norms_dict.get(nid) for nid in applicable_norm_ids if nid in norms_dict]
        norms_to_eval = [n for n in norms_to_eval if n]

        product_name = product['name'].encode('ascii', 'ignore').decode('ascii')
        print(f"[{i+1}/{len(to_evaluate)}] {product_name[:40]:40} ({len(norms_to_eval)} norms)", flush=True)

        # Evaluate in batches of 30 norms
        all_results = []
        for batch_start in range(0, len(norms_to_eval), 30):
            batch_norms = norms_to_eval[batch_start:batch_start+30]

            prompt = build_evaluation_prompt(product, ptype, batch_norms)
            response = call_claude(prompt)

            if response:
                results = parse_evaluation_response(response, batch_norms)
                all_results.extend(results)
            else:
                print(f"    Failed to get response for batch {batch_start//30 + 1}")

            time.sleep(0.5)  # Rate limiting

        # Save results
        if all_results:
            saved = save_evaluations(product['id'], all_results)
            total_evals += saved
            print(f"    -> Saved {saved} evaluations", flush=True)

        # Progress update every 10 products
        if (i + 1) % 10 == 0:
            elapsed = time.time() - start_time
            rate = total_evals / elapsed if elapsed > 0 else 0
            print(f"\n  Progress: {i+1}/{len(to_evaluate)} products, {total_evals} evals, {rate:.1f} evals/sec\n", flush=True)

    elapsed = time.time() - start_time
    print("=" * 70, flush=True)
    print(f"  COMPLETE: {total_evals} evaluations in {elapsed:.1f}s", flush=True)
    print("=" * 70, flush=True)


if __name__ == "__main__":
    main()
