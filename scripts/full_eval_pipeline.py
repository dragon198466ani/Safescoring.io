#!/usr/bin/env python3
"""
FULL EVALUATION PIPELINE - AUTONOMOUS
=======================================
Phase 1: Generate norm_applicability for ALL product types missing it
Phase 2: Evaluate ALL products × ALL applicable norms with Claude Code CLI

Run and forget - tracks progress, can be stopped and resumed.

Usage:
    python scripts/full_eval_pipeline.py
    python scripts/full_eval_pipeline.py --phase 2   # Skip to evaluations
    python scripts/full_eval_pipeline.py --resume     # Resume from progress file
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

load_dotenv('.env')
load_dotenv('config/.env')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
MODEL_NAME = 'claude_code_opus_4.5'
PROGRESS_FILE = 'data/full_pipeline_progress.json'

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


# ─── Progress tracking ───────────────────────────────────────────

def load_progress() -> dict:
    try:
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {
            'phase1_done': [],      # type_ids with applicability generated
            'phase2_done': {},      # {product_id: [norm_ids evaluated]}
            'started': datetime.now().isoformat(),
            'stats': {'phase1_total': 0, 'phase2_total': 0, 'errors': 0}
        }


def save_progress(progress: dict):
    os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f)


# ─── Claude Code CLI ─────────────────────────────────────────────

def call_claude(prompt: str, timeout: int = 180) -> str | None:
    """Call Claude Code CLI. Returns the text response."""
    try:
        import tempfile
        prompt_file = os.path.join(tempfile.gettempdir(), 'claude_pipeline_prompt.txt')
        with open(prompt_file, 'w', encoding='utf-8') as f:
            f.write(prompt)

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

        try:
            os.remove(prompt_file)
        except:
            pass

        if result.returncode == 0 and result.stdout.strip():
            try:
                cli_output = json.loads(result.stdout.strip())
                return cli_output.get('result', result.stdout.strip())
            except json.JSONDecodeError:
                return result.stdout.strip()
        else:
            stderr = (result.stderr or '')[:150]
            print(f"    [CLI ERR] rc={result.returncode}: {stderr}")
            return None

    except subprocess.TimeoutExpired:
        print(f"    [TIMEOUT] >{timeout}s")
        return None
    except Exception as e:
        print(f"    [CLI ERR] {e}")
        return None


# ─── Supabase helpers ─────────────────────────────────────────────

def sb_get(path, timeout=30):
    r = requests.get(f'{SUPABASE_URL}/rest/v1/{path}', headers=READ_HEADERS, timeout=timeout)
    return r.json() if r.status_code == 200 else []


def sb_post(path, data, timeout=60):
    r = requests.post(f'{SUPABASE_URL}/rest/v1/{path}', headers=WRITE_HEADERS, json=data, timeout=timeout)
    return r.status_code in [200, 201, 204]


def sb_patch(path, data, timeout=60):
    r = requests.patch(f'{SUPABASE_URL}/rest/v1/{path}', headers=WRITE_HEADERS, json=data, timeout=timeout)
    return r.status_code in [200, 201, 204]


# ─── PHASE 1: Generate norm_applicability ─────────────────────────

APPLICABILITY_PROMPT = """You are an expert in crypto/cybersecurity standards applicability.

PRODUCT TYPE: {type_name}
CATEGORY: {category}

Below are security norms. For EACH norm, determine if it applies to the product type "{type_name}".

NORMS (format: ID | CODE | TITLE | PILLAR):
{norms_list}

RULES:
- A norm is APPLICABLE if the product type could reasonably implement or be evaluated against it
- Physical security norms (tamper resistance, metal backup, etc.) are NOT applicable to pure software
- Chain-specific norms (EVM, Bitcoin, etc.) are only applicable if the product type uses those chains
- Regulatory norms apply to custodial/financial products
- Privacy norms apply broadly
- Infrastructure norms apply to protocols and platforms

Return a JSON array of objects with ONLY the applicable norm IDs:
{{"applicable": [list of norm IDs that ARE applicable]}}

Be selective - typically 30-60% of norms apply to any given type. Return ONLY JSON."""


def phase1_generate_applicability(progress: dict):
    """Generate norm_applicability for all product types that are missing it."""
    print("\n" + "=" * 60)
    print("PHASE 1: GENERATING NORM APPLICABILITY")
    print("=" * 60)

    # Get all types
    all_types = {t['id']: t for t in sb_get('product_types?select=id,name,category&limit=200')}

    # Get types that already have applicability
    existing = sb_get('norm_applicability?is_applicable=eq.true&select=type_id')
    types_with_app = set(a['type_id'] for a in existing)

    # Already done in this run
    already_done = set(progress['phase1_done'])

    # Types that need applicability
    missing_types = {k: v for k, v in all_types.items()
                     if k not in types_with_app and k not in already_done}

    # Count products per missing type to prioritize
    type_product_counts = {}
    for tid in missing_types:
        products = sb_get(f'products?type_id=eq.{tid}&select=id&limit=1000')
        type_product_counts[tid] = len(products)

    # Sort by product count (most products first)
    sorted_types = sorted(missing_types.items(), key=lambda x: -type_product_counts.get(x[0], 0))
    sorted_types = [(tid, info) for tid, info in sorted_types if type_product_counts.get(tid, 0) > 0]

    print(f"  Types needing applicability: {len(sorted_types)}")
    total_products = sum(type_product_counts[tid] for tid, _ in sorted_types)
    print(f"  Products affected: {total_products}")

    if not sorted_types:
        print("  All types have applicability! Moving to Phase 2.")
        return

    # Get all norms (batched)
    all_norms = []
    for offset in range(0, 3000, 1000):
        batch = sb_get(f'norms?select=id,code,title,pillar&limit=1000&offset={offset}')
        all_norms.extend(batch)
        if len(batch) < 1000:
            break
    print(f"  Total norms: {len(all_norms)}")

    for ti, (type_id, type_info) in enumerate(sorted_types):
        type_name = type_info.get('name', 'Unknown')
        product_count = type_product_counts.get(type_id, 0)
        print(f"\n  [{ti+1}/{len(sorted_types)}] {type_name} ({product_count} products)")

        # Process norms in chunks of 100 to fit in prompt
        all_applicable_ids = []
        chunk_size = 100

        for ci in range(0, len(all_norms), chunk_size):
            chunk = all_norms[ci:ci + chunk_size]
            chunk_num = ci // chunk_size + 1
            total_chunks = (len(all_norms) + chunk_size - 1) // chunk_size
            print(f"    Chunk {chunk_num}/{total_chunks}...", end=' ', flush=True)

            norms_list = '\n'.join(
                f"{n['id']} | {n.get('code', '')} | {n.get('title', '')[:50]} | {n.get('pillar', '')}"
                for n in chunk
            )

            prompt = APPLICABILITY_PROMPT.format(
                type_name=type_name,
                category=type_info.get('category', 'Unknown'),
                norms_list=norms_list
            )

            response = call_claude(prompt, timeout=240)
            if not response:
                print("FAILED")
                progress['stats']['errors'] += 1
                time.sleep(5)
                continue

            # Parse response
            try:
                if '{' in response:
                    json_str = response[response.find('{'):response.rfind('}') + 1]
                    data = json.loads(json_str)
                    applicable_ids = data.get('applicable', [])
                    # Ensure they're valid integers
                    applicable_ids = [int(x) for x in applicable_ids if str(x).isdigit()]
                    all_applicable_ids.extend(applicable_ids)
                    print(f"{len(applicable_ids)} applicable")
                else:
                    print("NO JSON")
            except Exception as e:
                print(f"PARSE ERR: {e}")

            time.sleep(1)

        # Save applicability to database (batch insert for speed)
        if all_applicable_ids:
            valid_norm_ids = {n['id'] for n in all_norms}
            valid_ids = [nid for nid in all_applicable_ids if nid in valid_norm_ids]
            # Deduplicate
            valid_ids = list(set(valid_ids))
            print(f"    Saving {len(valid_ids)} applicability records (batch)...", end=' ', flush=True)
            saved = 0

            # Batch insert in groups of 50
            for bi in range(0, len(valid_ids), 50):
                batch = valid_ids[bi:bi + 50]
                records = [
                    {'type_id': type_id, 'norm_id': nid, 'is_applicable': True,
                     'reason': f'Generated by {MODEL_NAME}'}
                    for nid in batch
                ]
                try:
                    r = requests.post(
                        f'{SUPABASE_URL}/rest/v1/norm_applicability',
                        headers={**WRITE_HEADERS, 'Prefer': 'return=minimal,resolution=merge-duplicates'},
                        json=records,
                        timeout=60
                    )
                    if r.status_code in [200, 201, 204]:
                        saved += len(batch)
                    elif r.status_code == 409:
                        # Duplicates - insert one by one, skip existing
                        for nid in batch:
                            try:
                                r2 = requests.post(
                                    f'{SUPABASE_URL}/rest/v1/norm_applicability',
                                    headers=WRITE_HEADERS,
                                    json={'type_id': type_id, 'norm_id': nid,
                                          'is_applicable': True,
                                          'reason': f'Generated by {MODEL_NAME}'},
                                    timeout=30
                                )
                                if r2.status_code in [200, 201, 204]:
                                    saved += 1
                            except:
                                pass
                    else:
                        print(f"\n      [BATCH ERR] {r.status_code}: {r.text[:100]}")
                except Exception as e:
                    print(f"\n      [BATCH ERR] {e}")

            print(f"{saved} saved")
            progress['stats']['phase1_total'] += saved

        # Track progress
        progress['phase1_done'].append(type_id)
        save_progress(progress)
        print(f"    Type {type_name} done.")

    print("\n  Phase 1 complete!")


# ─── PHASE 2: Evaluate products × norms ──────────────────────────

# BATCH EVALUATION - 8 norms per call for 8x speedup
BATCH_SIZE = 8

EVAL_PROMPT_BATCH = """You are an expert crypto security analyst for SafeScoring. Evaluate this product against MULTIPLE security norms.

PRODUCT: {product_name}
TYPE: {product_type}
DESCRIPTION: {product_description}

NORMS TO EVALUATE:
{norms_list}

RATING OPTIONS:
- YES = Product implements this (documented, audited, standard practice)
- YESp = Inherent to technology (e.g., EVM uses secp256k1)
- NO = Product does NOT implement this
- N/A = Not applicable to this product type

Evaluate EACH norm individually. Respond with a JSON array of evaluations:
{{"evaluations": [
  {{"norm_id": 123, "result": "YES", "confidence": 0.85, "justification": "Brief technical reason."}},
  {{"norm_id": 456, "result": "NO", "confidence": 0.90, "justification": "Brief technical reason."}},
  ...
]}}

Return ONE evaluation per norm. Be precise and technical."""


def save_evaluation(product_id, norm_id, result, confidence, justification):
    """Save to database with retry."""
    data = {
        'result': result,
        'confidence_score': confidence,
        'why_this_result': justification,
        'evaluated_by': MODEL_NAME,
    }

    for attempt in range(3):
        try:
            existing = sb_get(
                f'evaluations?product_id=eq.{product_id}&norm_id=eq.{norm_id}&select=id&order=id.desc&limit=1'
            )
            if existing:
                ok = sb_patch(f'evaluations?id=eq.{existing[0]["id"]}', data)
            else:
                ok = sb_post('evaluations', {**data, 'product_id': product_id, 'norm_id': norm_id})

            if ok:
                return True

            time.sleep(2 ** attempt)
        except Exception:
            time.sleep(2 ** attempt)

    return False


def phase2_evaluate_all(progress: dict, limit_per_product: int = 999):
    """Evaluate ALL products × ALL applicable norms."""
    print("\n" + "=" * 60)
    print("PHASE 2: EVALUATING ALL PRODUCTS × NORMS")
    print("=" * 60)

    # Get all product types
    all_types = {t['id']: t for t in sb_get('product_types?select=id,name,category&limit=200')}

    # Get all products with type_id
    all_products = sb_get('products?type_id=not.is.null&select=id,name,slug,type_id,description&limit=5000')
    print(f"  Total products: {len(all_products)}")

    # Cache norms
    all_norms = {}
    for offset in range(0, 3000, 1000):
        batch = sb_get(f'norms?select=id,code,title,pillar&limit=1000&offset={offset}')
        for n in batch:
            all_norms[n['id']] = n
        if len(batch) < 1000:
            break
    print(f"  Total norms: {len(all_norms)}")

    # Cache applicability per type
    applicability_cache = {}
    for type_id in all_types:
        app = sb_get(f'norm_applicability?type_id=eq.{type_id}&is_applicable=eq.true&select=norm_id')
        applicability_cache[type_id] = [a['norm_id'] for a in app]

    pillar_names = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Ecosystem'}

    # Sort products by name for consistent ordering across instances
    all_products.sort(key=lambda p: p.get('name', ''))

    total_evals = 0
    total_errors = 0

    # Apply offset and batch-size for parallel instances
    import sys
    cli_args = sys.argv
    offset = 0
    batch_size = len(all_products)
    for i, arg in enumerate(cli_args):
        if arg == '--offset' and i + 1 < len(cli_args):
            offset = int(cli_args[i + 1])
        if arg == '--batch-size' and i + 1 < len(cli_args):
            batch_size = int(cli_args[i + 1])
    if offset > 0:
        all_products = all_products[offset:]
    all_products = all_products[:batch_size]
    print(f"  Processing {len(all_products)} products (offset={offset})")

    for pi, product in enumerate(all_products):
        pid = product['id']
        pname = product.get('name', 'Unknown')
        type_id = product.get('type_id')
        type_info = all_types.get(type_id, {})
        prod_key = str(pid)

        # Skip if fully done
        if prod_key in progress['phase2_done']:
            done = len(progress['phase2_done'][prod_key])
            if done >= limit_per_product:
                continue

        # Get applicable norms
        applicable = applicability_cache.get(type_id, [])
        if not applicable:
            continue

        # Filter out already evaluated
        already = set(progress['phase2_done'].get(prod_key, []))
        remaining = [nid for nid in applicable if nid not in already]
        if not remaining:
            continue

        # Limit
        to_eval = remaining[:limit_per_product - len(already)]
        if not to_eval:
            continue

        print(f"\n[{pi+1}/{len(all_products)}] {pname} ({type_info.get('name', '?')}) — {len(to_eval)} norms")

        prod_evals = 0

        # Process norms in batches of BATCH_SIZE for speed
        for batch_start in range(0, len(to_eval), BATCH_SIZE):
            batch_norms = to_eval[batch_start:batch_start + BATCH_SIZE]
            batch_num = batch_start // BATCH_SIZE + 1
            total_batches = (len(to_eval) + BATCH_SIZE - 1) // BATCH_SIZE

            # Build norms list for prompt
            norms_info = []
            for norm_id in batch_norms:
                norm = all_norms.get(norm_id)
                if norm:
                    pillar = pillar_names.get(norm.get('pillar', ''), 'Unknown')
                    norms_info.append({
                        'id': norm_id,
                        'code': norm.get('code', ''),
                        'title': norm.get('title', ''),
                        'pillar': pillar
                    })

            if not norms_info:
                continue

            norms_list = '\n'.join(
                f"- ID {n['id']} | {n['code']} | {n['title'][:60]} | Pillar: {n['pillar']}"
                for n in norms_info
            )

            codes_preview = ', '.join(n['code'] for n in norms_info[:3])
            if len(norms_info) > 3:
                codes_preview += f"... (+{len(norms_info)-3})"
            print(f"  Batch {batch_num}/{total_batches} ({len(norms_info)} norms: {codes_preview})...", end=' ', flush=True)

            prompt = EVAL_PROMPT_BATCH.format(
                product_name=pname,
                product_type=type_info.get('name', 'Unknown'),
                product_description=(product.get('description', '') or '')[:400],
                norms_list=norms_list
            )

            response = call_claude(prompt, timeout=300)  # Longer timeout for batch
            if not response:
                print("FAILED")
                total_errors += len(norms_info)
                time.sleep(5)
                continue

            # Parse batch response
            batch_saved = 0
            try:
                if '{' in response:
                    json_str = response[response.find('{'):response.rfind('}') + 1]
                    data = json.loads(json_str)
                    evaluations = data.get('evaluations', [])

                    # Also try direct array format
                    if not evaluations and isinstance(data, list):
                        evaluations = data

                    for ev in evaluations:
                        try:
                            norm_id = int(ev.get('norm_id', 0))
                            if norm_id not in [n['id'] for n in norms_info]:
                                continue

                            result = str(ev.get('result', 'TBD')).upper().strip().replace('"', '')
                            if result == 'YESP':
                                result = 'YESp'
                            elif result not in ('YES', 'NO', 'N/A', 'YESp'):
                                result = 'TBD'

                            confidence = min(1.0, max(0.0, float(ev.get('confidence', 0.75))))
                            justification = str(ev.get('justification', ''))[:1000]

                            if save_evaluation(pid, norm_id, result, confidence, justification):
                                total_evals += 1
                                prod_evals += 1
                                batch_saved += 1
                                if prod_key not in progress['phase2_done']:
                                    progress['phase2_done'][prod_key] = []
                                progress['phase2_done'][prod_key].append(norm_id)
                                progress['stats']['phase2_total'] = total_evals
                            else:
                                total_errors += 1
                        except Exception as ev_err:
                            total_errors += 1

                    print(f"=> {batch_saved}/{len(norms_info)} saved")
                else:
                    print("NO JSON")
                    total_errors += len(norms_info)
            except Exception as e:
                print(f"PARSE: {e}")
                total_errors += len(norms_info)

            # Save progress after each batch
            save_progress(progress)
            time.sleep(2)  # Brief pause between batches

        save_progress(progress)
        print(f"  => {prod_evals} total saved for {pname}")

    print(f"\n  Phase 2 complete! {total_evals} evaluations, {total_errors} errors")


# ─── Main ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Full evaluation pipeline')
    parser.add_argument('--phase', type=int, default=0, help='Start from phase (1 or 2)')
    parser.add_argument('--resume', action='store_true', help='Resume from progress')
    parser.add_argument('--limit', type=int, default=50, help='Max norms per product')
    parser.add_argument('--offset', type=int, default=0, help='Skip first N products (for parallel instances)')
    parser.add_argument('--batch-size', type=int, default=999, help='Max products to process')
    args = parser.parse_args()

    # Use separate progress file per instance if offset specified
    global PROGRESS_FILE
    if args.offset > 0:
        PROGRESS_FILE = f'data/full_pipeline_progress_{args.offset}.json'

    print("=" * 60)
    print("FULL EVALUATION PIPELINE - AUTONOMOUS")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    if args.offset > 0:
        print(f"Instance: offset={args.offset} batch={args.batch_size}")
    print("=" * 60)

    # Check Claude CLI
    try:
        r = subprocess.run(['claude', '--version'], capture_output=True, text=True, timeout=10)
        if r.returncode != 0:
            print("[ERROR] Claude CLI not found")
            return
        print(f"Claude CLI: {r.stdout.strip()}")
    except:
        print("[ERROR] Claude CLI not available")
        return

    progress = load_progress()

    if args.phase <= 1 and args.offset == 0:
        phase1_generate_applicability(progress)

    if args.phase <= 2:
        phase2_evaluate_all(progress, limit_per_product=args.limit)

    # Final stats
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    p1 = progress['stats'].get('phase1_total', 0)
    p2 = progress['stats'].get('phase2_total', 0)
    errs = progress['stats'].get('errors', 0)
    products_done = len(progress['phase2_done'])
    print(f"  Phase 1 (applicability): {p1} records")
    print(f"  Phase 2 (evaluations): {p2} saved across {products_done} products")
    print(f"  Errors: {errs}")
    print(f"  Progress file: {PROGRESS_FILE}")
    print("=" * 60)


if __name__ == '__main__':
    main()
