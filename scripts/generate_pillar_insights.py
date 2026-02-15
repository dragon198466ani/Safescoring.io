#!/usr/bin/env python3
"""
GENERATE PILLAR INSIGHTS WITH CLAUDE CODE CLI
===============================================
Generates AI-powered strategic summaries per pillar per product.
Uses the actual why_this_result justifications from evaluations as input,
so each summary is unique and data-driven.

Usage:
    python scripts/generate_pillar_insights.py --product ledger-nano-x
    python scripts/generate_pillar_insights.py --batch 20
    python scripts/generate_pillar_insights.py --batch 20 --force
    python scripts/generate_pillar_insights.py --dry-run --product bitmex

Requirements:
    - Claude Code CLI installed and authenticated (claude command)
    - Your Claude Code subscription
    - Evaluations with why_this_result populated (run eval_with_claude_code_cli.py first)
"""
import sys
import io
# Force UTF-8 stdout on Windows to avoid cp1252 encode errors with emojis in product names
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import argparse
import json
import subprocess
import time
import requests
import tempfile
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment (check multiple locations)
load_dotenv('.env')
load_dotenv('config/.env')
load_dotenv('web/.env.local')
load_dotenv('web/.env')

# Supabase config
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
def _get_key():
    """Get best available Supabase key, skipping placeholders."""
    for var in ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']:
        val = os.getenv(var, '')
        if val and val != 'placeholder' and len(val) > 20:
            return val
    return None

SUPABASE_KEY = _get_key()

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

PILLARS = {
    'S': 'Security',
    'A': 'Adversity',
    'F': 'Fidelity',
    'E': 'Efficiency',
}

PILLAR_DESCRIPTIONS = {
    'S': 'Cryptographic foundations, key management, encryption, secure element usage',
    'A': 'Threat resistance, duress protection, anti-coercion features, physical security',
    'F': 'Reliability & trust, audit history, uptime, update frequency, incident response',
    'E': 'Usability & performance, UX quality, multi-chain support, accessibility',
}


def call_claude_code(prompt: str, timeout: int = 120) -> str | None:
    """Call Claude Code CLI with a prompt. Returns raw text output."""
    try:
        prompt_file = os.path.join(tempfile.gettempdir(), 'claude_insight_prompt.txt')
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
                errors='replace',
                shell=True,
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
            stderr = result.stderr.strip()[:200] if result.stderr else 'no stderr'
            print(f"  [ERROR] Claude CLI rc={result.returncode}: {stderr}")
            return None

    except subprocess.TimeoutExpired:
        print(f"  [TIMEOUT] Claude CLI took >{timeout}s")
        return None
    except Exception as e:
        print(f"  [ERROR] Claude CLI error: {e}")
        return None


def get_product_by_slug(slug: str) -> dict | None:
    """Get product by slug."""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?slug=eq.{slug}&select=id,name,slug,type_id,description',
        headers=READ_HEADERS, timeout=15
    )
    if r.status_code == 200 and r.json():
        return r.json()[0]
    return None


def get_products_needing_insights(batch_size: int, force: bool = False) -> list:
    """Get products that have scores but no insights yet."""
    if force:
        # All products with scores
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_results?note_finale=gt.0&select=product_id&limit={batch_size}',
            headers=READ_HEADERS, timeout=30
        )
    else:
        # Only products without insights
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/safe_scoring_results?note_finale=gt.0&insight_s=is.null&select=product_id&limit={batch_size}',
            headers=READ_HEADERS, timeout=30
        )

    if r.status_code != 200:
        print(f"  [ERROR] Failed to get products: {r.status_code} {r.text[:200]}")
        return []

    product_ids = [row['product_id'] for row in r.json()]
    if not product_ids:
        return []

    # Fetch product details
    ids_str = ','.join(str(pid) for pid in product_ids)
    r2 = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?id=in.({ids_str})&select=id,name,slug,type_id,description',
        headers=READ_HEADERS, timeout=30
    )
    return r2.json() if r2.status_code == 200 else []


def get_product_scores(product_id: int) -> dict | None:
    """Get SAFE scores for a product."""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}&select=score_s,score_a,score_f,score_e,note_finale&order=calculated_at.desc&limit=1',
        headers=READ_HEADERS, timeout=15
    )
    if r.status_code == 200 and r.json():
        return r.json()[0]
    return None


def get_product_evaluations_by_pillar(product_id: int) -> dict:
    """
    Get evaluations for a product grouped by pillar.
    Returns: { 'S': [{'code': 'S01', 'title': '...', 'result': 'YES', 'reason': '...'}], ... }
    """
    # First get evaluations with their norm IDs
    # Try with why_this_result first, fallback without it if column doesn't exist
    evals = []
    offset = 0
    select_cols = 'norm_id,result,why_this_result'
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select={select_cols}&offset={offset}&limit=1000',
            headers=READ_HEADERS, timeout=30
        )
        if r.status_code != 200:
            # Column might not exist yet — retry without why_this_result
            if 'why_this_result' in select_cols and '42703' in r.text:
                print("    (why_this_result column not found — using results only)")
                select_cols = 'norm_id,result'
                r = requests.get(
                    f'{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select={select_cols}&offset={offset}&limit=1000',
                    headers=READ_HEADERS, timeout=30
                )
                if r.status_code != 200:
                    break
            else:
                break
        data = r.json()
        if not data:
            break
        evals.extend(data)
        offset += 1000
        if offset > 10000:
            break

    if not evals:
        return {}

    # Get norm details
    norm_ids = list(set(e['norm_id'] for e in evals))
    norms = {}
    for i in range(0, len(norm_ids), 100):
        batch_ids = norm_ids[i:i+100]
        ids_str = ','.join(str(nid) for nid in batch_ids)
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?id=in.({ids_str})&select=id,code,title,pillar',
            headers=READ_HEADERS, timeout=15
        )
        if r.status_code == 200:
            for n in r.json():
                norms[n['id']] = n

    # Group by pillar
    by_pillar = {'S': [], 'A': [], 'F': [], 'E': []}
    for ev in evals:
        norm = norms.get(ev['norm_id'])
        if not norm:
            continue
        pillar = norm.get('pillar', '')
        if pillar not in by_pillar:
            continue
        by_pillar[pillar].append({
            'code': norm.get('code', ''),
            'title': norm.get('title', ''),
            'result': ev.get('result', 'TBD'),
            'reason': ev.get('why_this_result') or '',
        })

    return by_pillar


def build_insight_prompt(product: dict, pillar_code: str, score: float, evals: list) -> str:
    """Build the prompt for generating a pillar insight."""
    pillar_name = PILLARS[pillar_code]
    pillar_desc = PILLAR_DESCRIPTIONS[pillar_code]

    # Separate YES/NO/N/A with their justifications
    yes_items = [e for e in evals if e['result'] in ('YES', 'YESp')]
    no_items = [e for e in evals if e['result'] == 'NO']
    na_count = len([e for e in evals if e['result'] in ('N/A', 'NA')])

    # Format evaluations with justifications (truncate to keep prompt manageable)
    def format_evals(items, max_items=25):
        lines = []
        for e in items[:max_items]:
            reason = e['reason'][:200] if e['reason'] else 'No justification'
            lines.append(f'- {e["code"]} "{e["title"]}": {reason}')
        if len(items) > max_items:
            lines.append(f'- ... and {len(items) - max_items} more')
        return '\n'.join(lines) if lines else '(none)'

    yes_text = format_evals(yes_items)
    no_text = format_evals(no_items)

    product_name = product.get('name', 'Unknown')
    product_desc = (product.get('description', '') or '')[:200]

    prompt = f"""You are a crypto security analyst for SafeScoring.

Product: {product_name}
Description: {product_desc}

Pillar: {pillar_name} — {pillar_desc}
Score: {score:.0f}/100

Here are the detailed evaluation results for this product on this pillar:

COMPLIANT (YES):
{yes_text}

NON-COMPLIANT (NO):
{no_text}

N/A: {na_count} norms not applicable

Based on these specific evaluation justifications, write a strategic summary of 2-3 sentences for the end user.
- Synthesize the specific strengths and weaknesses from the evaluations above
- Mention concrete points of attention (e.g., "no multisig", "no public audit", "strong key management")
- No generic text — each summary must be unique to this product
- Accessible language for crypto users (avoid excessive technical jargon)
- Language: English

Respond ONLY with the summary text, no JSON, no markdown, no quotes."""

    return prompt


def save_insights(product_id: int, insights: dict) -> bool:
    """Save pillar insights to safe_scoring_results."""
    update_data = {
        'insight_s': insights.get('S'),
        'insight_a': insights.get('A'),
        'insight_f': insights.get('F'),
        'insight_e': insights.get('E'),
        'insights_generated_at': datetime.now(tz=timezone.utc).isoformat(),
    }

    for attempt in range(3):
        try:
            r = requests.patch(
                f'{SUPABASE_URL}/rest/v1/safe_scoring_results?product_id=eq.{product_id}',
                headers=WRITE_HEADERS,
                json=update_data,
                timeout=30
            )
            if r.status_code in [200, 204]:
                return True
            if 'timeout' in (r.text or '').lower():
                time.sleep(2 ** attempt + 1)
                continue
            print(f"    [SAVE ERR] {r.status_code}: {r.text[:150]}")
            return False
        except requests.exceptions.Timeout:
            time.sleep(2 ** attempt + 1)
        except Exception as e:
            print(f"    [SAVE ERR] {e}")
            return False

    return False


def check_claude_cli() -> bool:
    """Check if Claude CLI is available."""
    try:
        # shell=True needed on Windows for .cmd files
        result = subprocess.run(['claude', '--version'], capture_output=True, text=True, timeout=10, shell=True)
        if result.returncode == 0:
            print(f"  Claude CLI: {result.stdout.strip()}")
            return True
    except:
        pass
    return False


def main():
    parser = argparse.ArgumentParser(description='Generate pillar insights with Claude Code CLI')
    parser.add_argument('--product', type=str, help='Product slug')
    parser.add_argument('--batch', type=int, default=20, help='Number of products (default 20)')
    parser.add_argument('--dry-run', action='store_true', help='Show prompts without saving')
    parser.add_argument('--force', action='store_true', help='Regenerate even if insights exist')
    parser.add_argument('--pillar', type=str, choices=['S', 'A', 'F', 'E'], help='Only generate for one pillar')
    args = parser.parse_args()

    print("=" * 60)
    print("PILLAR INSIGHT GENERATOR (Claude Code CLI)")
    print("=" * 60)

    # Check Claude CLI
    if not args.dry_run:
        print("\nChecking Claude CLI...")
        if not check_claude_cli():
            print("\n[ERROR] Claude CLI not found. Use --dry-run to preview prompts.")
            return

    # Get products
    if args.product:
        product = get_product_by_slug(args.product)
        if not product:
            print(f"\n[ERROR] Product not found: {args.product}")
            return
        products = [product]
    else:
        print(f"\nFinding products needing insights (batch={args.batch}, force={args.force})...")
        products = get_products_needing_insights(args.batch, args.force)

    if not products:
        print("\n=== No products to process ===")
        return

    print(f"\n=== GENERATING INSIGHTS FOR {len(products)} PRODUCTS ===")

    total_generated = 0
    total_errors = 0

    for pi, product in enumerate(products):
        product_name = product.get('name', 'Unknown')
        product_id = product['id']

        print(f"\n{'='*50}")
        print(f"[{pi+1}/{len(products)}] {product_name} (id={product_id})")

        # Get scores
        scores = get_product_scores(product_id)
        if not scores:
            print("  No scores found, skipping...")
            continue

        print(f"  SAFE Score: {scores.get('note_finale', 0):.0f}")

        # Get evaluations by pillar
        print("  Fetching evaluations...")
        by_pillar = get_product_evaluations_by_pillar(product_id)

        if not any(by_pillar.values()):
            print("  No evaluations found, skipping...")
            continue

        # Generate insight for each pillar
        insights = {}
        pillar_list = [args.pillar] if args.pillar else ['S', 'A', 'F', 'E']

        for pillar_code in pillar_list:
            pillar_name = PILLARS[pillar_code]
            evals = by_pillar.get(pillar_code, [])

            if not evals:
                print(f"  [{pillar_code}] {pillar_name}: no evaluations, skipping")
                continue

            score_key = f'score_{pillar_code.lower()}'
            pillar_score = scores.get(score_key, 0) or 0

            yes_count = len([e for e in evals if e['result'] in ('YES', 'YESp')])
            no_count = len([e for e in evals if e['result'] == 'NO'])
            with_reason = len([e for e in evals if e['reason']])

            print(f"  [{pillar_code}] {pillar_name}: score={pillar_score:.0f}, {yes_count}Y {no_count}N, {with_reason} with justification")

            prompt = build_insight_prompt(product, pillar_code, pillar_score, evals)

            if args.dry_run:
                print(f"\n  --- PROMPT ({pillar_code}) ---")
                # Show first/last lines of prompt
                lines = prompt.strip().split('\n')
                for line in lines[:5]:
                    print(f"  | {line}")
                print(f"  | ... ({len(lines)} total lines)")
                for line in lines[-3:]:
                    print(f"  | {line}")
                print(f"  --- END PROMPT ---\n")
                insights[pillar_code] = f"[DRY RUN] Would generate insight for {pillar_name}"
                total_generated += 1
                continue

            # Call Claude
            print(f"    Generating insight...", end=' ', flush=True)
            insight_text = call_claude_code(prompt)

            if insight_text:
                # Clean up: remove any quotes, markdown
                insight_text = insight_text.strip().strip('"').strip("'")
                if insight_text.startswith('```'):
                    insight_text = insight_text.split('\n', 1)[1] if '\n' in insight_text else insight_text
                if insight_text.endswith('```'):
                    insight_text = insight_text.rsplit('```', 1)[0]
                insight_text = insight_text.strip()

                insights[pillar_code] = insight_text
                print(f"OK ({len(insight_text)} chars)")
                print(f"    > {insight_text[:120]}...")
                total_generated += 1
            else:
                print("FAILED")
                total_errors += 1

            time.sleep(2)  # Rate limit between pillar calls

        # Save insights
        if insights and not args.dry_run:
            if save_insights(product_id, insights):
                print(f"  [OK] Saved {len(insights)} pillar insights")
            else:
                print(f"  [ERR] Failed to save insights")
                total_errors += 1

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"  Products processed: {len(products)}")
    print(f"  Insights generated: {total_generated}")
    print(f"  Errors: {total_errors}")
    if args.dry_run:
        print("  (DRY RUN -- nothing saved)")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
