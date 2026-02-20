#!/usr/bin/env python3
"""
SAFESCORING - EVALUATION VIA CLAUDE CODE CLI
=============================================
Evaluates products using Claude Code CLI (claude --print).
Optimized: 1 call per pillar (not 50-norm batches) = 4 calls per product.

Follows the SAFE methodology:
1. Load product + applicable norms from Supabase
2. Scrape official website for evidence
3. Evaluate per pillar (S, A, F, E) via Claude Code
4. Save results to Supabase
5. Recalculate scores

Usage:
  python scripts/eval_claude_direct.py                    # All 33 under-evaluated
  python scripts/eval_claude_direct.py --limit 5          # First 5 products
  python scripts/eval_claude_direct.py --product-id 171   # Single product
  python scripts/eval_claude_direct.py --dry-run           # Preview only
"""
import sys
import os
import json
import argparse
import time
import subprocess
import re
import requests

# Setup paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

from core.config import SUPABASE_URL, get_supabase_headers
from core.api_provider import parse_evaluation_response

# =============================================================================
# CLAUDE CLI
# =============================================================================

CLAUDE_CLI = None

def find_claude_cli():
    """Find claude CLI executable."""
    import shutil
    for path in ['claude', 'claude.exe', shutil.which('claude')]:
        if path:
            try:
                r = subprocess.run([path, '--version'], capture_output=True, text=True, timeout=10)
                if r.returncode == 0:
                    return path
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue
    return None


GIT_BASH = 'C:/Program Files/Git/bin/bash.exe'

def call_claude(prompt, timeout=480):
    """
    Call Claude Code CLI with a prompt via temp file + Git Bash pipe.
    Windows subprocess.Popen stdin pipe hangs with .CMD files,
    so we write to a temp file and use Git Bash redirection.
    """
    import tempfile

    # Write prompt to temp file
    data_dir = os.path.join(os.getcwd(), 'data')
    os.makedirs(data_dir, exist_ok=True)
    tmp = tempfile.NamedTemporaryFile(
        mode='w', suffix='.txt', delete=False,
        encoding='utf-8', dir=data_dir
    )
    tmp.write(prompt)
    tmp.close()
    # Convert Windows backslashes to forward slashes for bash
    tmp_path = tmp.name.replace(chr(92), '/')

    try:
        bash_cmd = f'claude --print < "{tmp_path}"'
        result = subprocess.run(
            [GIT_BASH, '-c', bash_cmd],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=timeout
        )

        if result.returncode == 0 and result.stdout:
            return result.stdout.strip()
        else:
            if result.stderr:
                err = result.stderr[:200].encode('ascii', 'replace').decode()
                print(f"  Claude CLI error: {err}")
    except subprocess.TimeoutExpired:
        print(f"  Claude CLI timeout ({timeout}s)")
    except Exception as e:
        print(f"  Claude CLI error: {e}")
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    return None

# =============================================================================
# SUPABASE DATA LOADING
# =============================================================================

def load_supabase_data():
    """Load all data from Supabase."""
    headers = get_supabase_headers()

    print("Loading data from Supabase...")

    # Products (paginated)
    products = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/products?select=id,name,slug,url,type_id,description&limit=1000&offset={offset}',
            headers=headers, timeout=60
        )
        if r.status_code != 200: break
        page = r.json()
        if not page: break
        products.extend(page)
        offset += 1000
        if len(page) < 1000: break
    print(f"  {len(products)} products")

    # Product types
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=id,code,name,category', headers=headers, timeout=30)
    types = {t['id']: t for t in (r.json() if r.status_code == 200 else [])}
    print(f"  {len(types)} types")

    # Norms (paginated)
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&order=pillar.asc,code.asc&limit=1000&offset={offset}',
            headers=headers, timeout=60
        )
        if r.status_code != 200: break
        page = r.json()
        if not page: break
        norms.extend(page)
        offset += 1000
        if len(page) < 1000: break
    print(f"  {len(norms)} norms")

    # Applicability (paginated - Supabase caps at 1000 rows/request)
    applicability = {}
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norm_applicability?select=type_id,norm_id,is_applicable&limit=1000&offset={offset}',
            headers=headers, timeout=120
        )
        if r.status_code != 200: break
        page = r.json()
        if not page: break
        for a in page:
            if a.get('is_applicable'):
                tid = a['type_id']
                if tid not in applicability:
                    applicability[tid] = set()
                applicability[tid].add(a['norm_id'])
        offset += 1000
        if len(page) < 1000: break
    total_app = sum(len(v) for v in applicability.values())
    print(f"  {total_app} applicability rules")

    # Product type mapping
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/product_type_mapping?select=product_id,type_id',
        headers=headers, timeout=30
    )
    type_mapping = {}
    if r.status_code == 200:
        for m in r.json():
            pid = m['product_id']
            if pid not in type_mapping:
                type_mapping[pid] = []
            type_mapping[pid].append(m['type_id'])
    # Fallback to products.type_id
    for p in products:
        if p['id'] not in type_mapping and p.get('type_id'):
            type_mapping[p['id']] = [p['type_id']]

    return products, types, norms, applicability, type_mapping

# =============================================================================
# EVALUATION PROMPTS (per pillar, all norms at once)
# =============================================================================

PILLAR_NAMES = {
    'S': 'Security (Cryptographic Foundations)',
    'A': 'Adversity (Attack & Coercion Resistance)',
    'F': 'Fidelity (Trust & Long-term Reliability)',
    'E': 'Efficiency (Usability & Accessibility)'
}

def build_pillar_prompt(product, product_type, pillar, pillar_norms, website_content=None):
    """Build evaluation prompt for a full pillar."""
    norms_text = "\n".join([
        f"- {n['code']}: {n['title']}"
        for n in pillar_norms
    ])

    website_section = ""
    if website_content:
        website_section = f"""
OFFICIAL WEBSITE CONTENT:
{website_content[:3000]}
"""

    type_name = product_type.get('name', 'Unknown') if product_type else 'Unknown'
    type_code = product_type.get('code', '?') if product_type else '?'
    category = product_type.get('category', 'Unknown') if product_type else 'Unknown'

    prompt = f"""You are a crypto security expert evaluating {product['name']} ({type_name}, {type_code}).
Website: {product.get('url', 'N/A')}
{website_section}
USE ALL YOUR KNOWLEDGE: official docs, published audits, open-source code, technical specs, verified industry knowledge.

RATING:
- YES = Product implements this (documented in official docs, audits, source code, or verified public knowledge)
- YESp = Inherent to technology/protocol (e.g. secp256k1 for Bitcoin wallets, TLS for HTTPS)
- NO = Product does NOT implement this, or feature is irrelevant to this product type
- TBD = Genuinely unclear (max 5%)

GUIDELINES:
- For well-known products, use your training knowledge as evidence
- Marketing claims alone are NOT proof, but official technical documentation IS
- If a norm describes a feature the product clearly has (e.g. BIP-39 for a BIP-39 wallet), answer YES
- If a norm describes a completely unrelated technology (e.g. SM2 Chinese crypto for a US product), answer NO
- No N/A allowed (norms are pre-filtered as applicable)

PILLAR: {pillar} - {PILLAR_NAMES.get(pillar, pillar)}

NORMS:
{norms_text}

FORMAT (one line per norm, evaluate ALL):
CODE: RESULT | brief reason"""

    return prompt


def parse_results(response, pillar_norms):
    """Parse Claude's response into evaluation records."""
    if not response:
        return []

    # Use the existing parser
    parsed = parse_evaluation_response(response)

    # Map to norm IDs
    code_to_norm = {n['code']: n for n in pillar_norms}
    results = []

    for code, eval_data in parsed.items():
        norm = code_to_norm.get(code)
        if norm:
            result_val = eval_data[0] if isinstance(eval_data, tuple) else eval_data
            reason = eval_data[1] if isinstance(eval_data, tuple) and len(eval_data) > 1 else ''
            results.append({
                'norm_id': norm['id'],
                'norm_code': code,
                'result': result_val,
                'reason': reason
            })

    return results


# =============================================================================
# WEBSITE SCRAPING
# =============================================================================

def scrape_website(url):
    """Simple website scraping for product context."""
    if not url:
        return None
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200:
            from html import unescape
            text = re.sub(r'<script[^>]*>.*?</script>', '', r.text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = unescape(text)
            text = re.sub(r'\s+', ' ', text).strip()
            if len(text) > 100:
                return text[:10000]
    except Exception as e:
        print(f"  Scrape error: {str(e)[:80]}")
    return None


# =============================================================================
# SAVE TO SUPABASE
# =============================================================================

def save_evaluations(product_id, all_results, all_norms):
    """Save evaluations to Supabase (delete old + insert new)."""
    write_headers = get_supabase_headers(use_service_key=True)
    write_headers['Content-Type'] = 'application/json'

    # Build evaluation records
    evaluated_norm_ids = {r['norm_id'] for r in all_results}
    all_norm_ids = {n['id'] for n in all_norms}

    records = []
    from datetime import datetime
    today = datetime.now().strftime('%Y-%m-%d')

    for r in all_results:
        records.append({
            'product_id': product_id,
            'norm_id': r['norm_id'],
            'result': r['result'],
            'why_this_result': (r.get('reason') or '')[:500] or None,
            'evaluated_by': 'claude_code',
            'evaluation_date': today
        })

    # N/A for non-applicable norms
    applicable_norm_ids = evaluated_norm_ids
    for n in all_norms:
        if n['id'] not in applicable_norm_ids:
            records.append({
                'product_id': product_id,
                'norm_id': n['id'],
                'result': 'N/A',
                'why_this_result': 'Not applicable to product type',
                'evaluated_by': 'norm_applicability',
                'evaluation_date': today
            })

    # Deduplicate
    unique = {}
    for r in records:
        unique[(r['product_id'], r['norm_id'])] = r
    records = list(unique.values())

    # Delete old evaluations
    del_headers = get_supabase_headers(use_service_key=True)
    del_headers['Prefer'] = 'return=minimal'
    requests.delete(
        f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}',
        headers=del_headers, timeout=30
    )

    # Insert in batches
    write_headers['Prefer'] = 'resolution=merge-duplicates'
    saved = 0
    for i in range(0, len(records), 500):
        batch = records[i:i+500]
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/evaluations',
            headers=write_headers,
            json=batch,
            timeout=60
        )
        if r.status_code in [200, 201]:
            saved += len(batch)
        else:
            print(f"  Save error: HTTP {r.status_code} - {r.text[:100]}")

    return saved


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='Evaluate products via Claude Code CLI')
    parser.add_argument('--limit', type=int, default=None)
    parser.add_argument('--product-id', type=int, default=None, help='Evaluate single product by ID')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--skip-score', action='store_true')
    args = parser.parse_args()

    print("=" * 70)
    print("  SAFESCORING - EVALUATION VIA CLAUDE CODE")
    print("  SAFE Methodology: Evidence-Based, Conservative")
    print("  4 calls per product (1 per pillar)")
    print("=" * 70)

    # Find Claude CLI
    global CLAUDE_CLI
    CLAUDE_CLI = find_claude_cli()
    if CLAUDE_CLI:
        print(f"  Claude CLI: {CLAUDE_CLI}")
    else:
        print("  ERROR: Claude CLI not found!")
        sys.exit(1)

    # Load data
    products, types, norms, applicability, type_mapping = load_supabase_data()

    # Select products to evaluate
    if args.product_id:
        target_ids = [args.product_id]
    else:
        path = os.path.join('data', 'products_need_reevaluation.json')
        if os.path.exists(path):
            with open(path, 'r') as f:
                target_ids = json.load(f)
        else:
            print(f"ERROR: {path} not found")
            sys.exit(1)

    if args.limit:
        target_ids = target_ids[:args.limit]

    products_by_id = {p['id']: p for p in products}
    norms_by_id = {n['id']: n for n in norms}

    products_to_eval = [products_by_id[pid] for pid in target_ids if pid in products_by_id]
    print(f"\n{len(products_to_eval)} products to evaluate")

    if args.dry_run:
        for p in products_to_eval:
            tids = type_mapping.get(p['id'], [])
            app_norms = set()
            for tid in tids:
                app_norms |= applicability.get(tid, set())
            print(f"  {p['name'][:40]:<40} ({len(app_norms)} norms)")
        return

    # Evaluate
    total_saved = 0
    results_summary = []
    start_time = time.time()

    for i, product in enumerate(products_to_eval):
        pid = product['id']
        tids = type_mapping.get(pid, [])
        ptype = types.get(tids[0]) if tids else None

        # Get applicable norms
        applicable_ids = set()
        for tid in tids:
            applicable_ids |= applicability.get(tid, set())
        applicable_norms = [norms_by_id[nid] for nid in applicable_ids if nid in norms_by_id]

        print(f"\n{'='*60}")
        print(f"[{i+1}/{len(products_to_eval)}] {product['name']} ({len(applicable_norms)} norms)")
        print(f"  Type: {ptype.get('name', '?') if ptype else '?'}")
        print(f"  URL: {product.get('url', 'N/A')}")
        print(f"{'='*60}")

        if not applicable_norms:
            print("  No applicable norms - skipping")
            continue

        # Scrape website
        print("  Scraping official website...")
        website_content = scrape_website(product.get('url'))
        if website_content:
            print(f"  Got {len(website_content)} chars of content")
        else:
            print("  No website content (evaluation based on public knowledge)")

        # Evaluate per pillar (split large pillars into batches of 150 norms)
        all_results = []
        BATCH_SIZE = 30  # Max norms per Claude call (Claude CLI works best with shorter prompts)

        for pillar in ['S', 'A', 'F', 'E']:
            pillar_norms = [n for n in applicable_norms if n['pillar'] == pillar]
            if not pillar_norms:
                print(f"  {pillar}: 0 norms - skip")
                continue

            pillar_results = []
            num_batches = (len(pillar_norms) + BATCH_SIZE - 1) // BATCH_SIZE

            for batch_idx in range(0, len(pillar_norms), BATCH_SIZE):
                batch_norms = pillar_norms[batch_idx:batch_idx + BATCH_SIZE]
                batch_num = batch_idx // BATCH_SIZE + 1

                label = f"  {pillar} [{batch_num}/{num_batches}]: {len(batch_norms)} norms"
                print(f"{label}...", end=" ", flush=True)

                prompt = build_pillar_prompt(product, ptype, pillar, batch_norms, website_content)
                response = call_claude(prompt, timeout=480)

                if response:
                    results = parse_results(response, batch_norms)
                    pillar_results.extend(results)

                    yes = sum(1 for r in results if r['result'] in ['YES', 'YESp'])
                    no = sum(1 for r in results if r['result'] == 'NO')
                    tbd = sum(1 for r in results if r['result'] == 'TBD')
                    total = yes + no
                    pct = (yes * 100 // total) if total > 0 else 0
                    print(f"{len(results)}/{len(batch_norms)} parsed | {pct}% (Y:{yes} N:{no} T:{tbd})")
                else:
                    print("FAILED")

                time.sleep(2)  # Rate limiting between batches

            all_results.extend(pillar_results)

            # Pillar summary
            if pillar_results:
                p_yes = sum(1 for r in pillar_results if r['result'] in ['YES', 'YESp'])
                p_no = sum(1 for r in pillar_results if r['result'] == 'NO')
                p_total = p_yes + p_no
                p_pct = (p_yes * 100 // p_total) if p_total > 0 else 0
                print(f"  {pillar} TOTAL: {len(pillar_results)}/{len(pillar_norms)} | {p_pct}%")

        # Save results
        if all_results:
            saved = save_evaluations(pid, all_results, norms)
            total_saved += saved

            total_yes = sum(1 for r in all_results if r['result'] in ['YES', 'YESp'])
            total_no = sum(1 for r in all_results if r['result'] == 'NO')
            score_base = total_yes + total_no
            score = (total_yes * 100 // score_base) if score_base > 0 else 0

            print(f"  -> Saved {saved} evaluations | Score: {score}%")

            results_summary.append({
                'name': product['name'],
                'id': pid,
                'score': score,
                'evals': len(all_results),
                'saved': saved
            })
        else:
            print("  -> No evaluations produced")

    # Summary
    elapsed = time.time() - start_time
    print(f"\n{'='*70}")
    print(f"EVALUATION COMPLETE")
    print(f"{'='*70}")
    print(f"Products: {len(results_summary)}/{len(products_to_eval)}")
    print(f"Evaluations saved: {total_saved}")
    print(f"Time: {elapsed:.0f}s ({elapsed/60:.1f}min)")

    if results_summary:
        results_summary.sort(key=lambda x: x['score'])
        print(f"\n{'Product':<35} {'Score':>6} {'Evals':>6}")
        print("-" * 55)
        for r in results_summary:
            print(f"  {r['name'][:33]:<33} {r['score']:>5}% {r['evals']:>6}")

    # Recalculate scores
    if not args.skip_score and results_summary:
        print(f"\nRecalculating SAFE scores...")
        try:
            from core.score_calculator import ScoreCalculator
            calc = ScoreCalculator(record_history=True)
            calc.run()
        except Exception as e:
            print(f"Score calc error: {e}")
            print("Run manually: python run.py score")


if __name__ == '__main__':
    main()
