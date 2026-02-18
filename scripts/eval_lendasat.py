#!/usr/bin/env python3
"""
Complete evaluation script for Lendasat.
Evaluates ALL 2159 norms in batches using Claude Code CLI.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

import requests
import json
import time
from datetime import datetime
from core.config import SUPABASE_URL, get_supabase_headers
from core.api_provider import AIProvider

PRODUCT_SLUG = 'lendasat'
BATCH_SIZE = 25  # Norms per AI call

def main():
    headers = get_supabase_headers(use_service_key=True)
    ai = AIProvider()

    print("=" * 70)
    print("LENDASAT - COMPLETE EVALUATION (ALL NORMS)")
    print("=" * 70)

    # 1. Get product
    print("\n[1/5] Fetching product...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?slug=eq.{PRODUCT_SLUG}&select=*",
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        print(f"Error: {r.text}")
        return
    product = r.json()[0]
    print(f"   Product: {product['name']} (ID: {product['id']})")
    print(f"   Type ID: {product['type_id']}")

    # 2. Get product type
    print("\n[2/5] Fetching product type...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?id=eq.{product['type_id']}&select=*",
        headers=headers
    )
    product_type = r.json()[0] if r.status_code == 200 and r.json() else {'code': 'Unknown', 'name': 'Unknown'}
    print(f"   Type: {product_type.get('code')} - {product_type.get('name')}")

    # 3. Get ALL norms
    print("\n[3/5] Fetching all norms...")
    norms = []
    offset = 0
    page_size = 1000
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,is_essential&order=pillar,code&limit={page_size}&offset={offset}",
            headers=headers
        )
        if r.status_code != 200:
            break
        batch = r.json()
        if not batch:
            break
        norms.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    print(f"   {len(norms)} total norms loaded")

    # Group by pillar
    by_pillar = {'S': [], 'A': [], 'F': [], 'E': []}
    for n in norms:
        pillar = n.get('pillar', 'S')
        if pillar in by_pillar:
            by_pillar[pillar].append(n)

    for p, ns in by_pillar.items():
        print(f"   [{p}] {len(ns)} norms")

    # Product context
    product_context = f"""PRODUCT: {product['name']}
TYPE: {product_type.get('name', 'DeFi Lending Protocol')}
DESCRIPTION: {product.get('description', 'Bitcoin-backed lending platform')}
WEBSITE: {product.get('url', 'https://lendasat.com')}

KEY FEATURES:
- Bitcoin-backed loans without counterparty risk
- Lightning Network integration for fast BTC transactions
- Self-custody focused lending (no KYC required)
- Borrow against BTC collateral without selling
- Decentralized peer-to-peer lending model"""

    # 4. Evaluate ALL norms
    print("\n[4/5] Evaluating ALL norms with Claude AI...")
    all_evaluations = []
    total_batches = sum(len(ns) // BATCH_SIZE + (1 if len(ns) % BATCH_SIZE else 0) for ns in by_pillar.values())
    current_batch = 0

    for pillar in ['S', 'A', 'F', 'E']:
        pillar_norms = by_pillar[pillar]
        if not pillar_norms:
            continue

        pillar_name = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Efficiency'}[pillar]
        print(f"\n   [{pillar}] {pillar_name} - {len(pillar_norms)} norms")

        pillar_yes = 0
        pillar_no = 0
        pillar_na = 0

        # Process in batches
        for i in range(0, len(pillar_norms), BATCH_SIZE):
            batch_norms = pillar_norms[i:i+BATCH_SIZE]
            current_batch += 1

            print(f"      Batch {current_batch}/{total_batches} ({len(batch_norms)} norms)...", end=" ", flush=True)

            # Build norms list
            norms_text = "\n".join([
                f"- {n['code']}: {n['title']}" + (" [ESSENTIAL]" if n.get('is_essential') else "")
                for n in batch_norms
            ])

            prompt = f"""You are a crypto security expert evaluating a Bitcoin DeFi lending protocol.

{product_context}

NORMS TO EVALUATE (Pillar {pillar} - {pillar_name}):
{norms_text}

Respond with a JSON object:
{{
  "evaluations": [
    {{"code": "NORM_CODE", "result": "YES/NO/N/A", "reason": "Brief justification (1 sentence)"}},
    ...
  ]
}}

RULES:
- YES = Product meets or likely meets the requirement based on its nature
- NO = Product does not meet the requirement or no evidence
- N/A = Norm not applicable (hardware norms for DeFi, physical security for software, etc.)

FOR DEFI LENDING PROTOCOLS:
- Hardware/physical security norms (Secure Element, tamper-proof, materials) = N/A
- Cryptographic standards (secp256k1, ECDSA, SHA-256) = YES (standard for Bitcoin)
- Smart contract security = Evaluate based on documentation
- Transparency/audit norms = NO if no public audit found
- UI/UX norms = Evaluate based on website

Return ONLY valid JSON."""

            try:
                response = ai.call(prompt, max_tokens=4000, temperature=0.1)
                if response:
                    # Parse response
                    response = response.strip()
                    if '```json' in response:
                        response = response.split('```json')[1]
                    if '```' in response:
                        response = response.split('```')[0]
                    response = response.strip()

                    try:
                        data = json.loads(response)
                    except json.JSONDecodeError:
                        import re
                        match = re.search(r'\{[\s\S]*\}', response)
                        if match:
                            data = json.loads(match.group())
                        else:
                            print("JSON error")
                            continue

                    batch_evals = data.get('evaluations', [])

                    batch_yes = 0
                    batch_no = 0
                    batch_na = 0

                    for ev in batch_evals:
                        norm = next((n for n in batch_norms if n['code'] == ev.get('code')), None)
                        if norm:
                            result = ev.get('result', 'TBD').upper().strip()
                            if result not in ['YES', 'NO', 'N/A', 'TBD']:
                                result = 'TBD'

                            all_evaluations.append({
                                'product_id': product['id'],
                                'norm_id': norm['id'],
                                'result': result,
                                'why_this_result': ev.get('reason', '')[:2000],
                                'evaluated_by': 'claude-opus',
                                'evaluation_date': datetime.now().isoformat()
                            })

                            if result == 'YES':
                                batch_yes += 1
                                pillar_yes += 1
                            elif result == 'NO':
                                batch_no += 1
                                pillar_no += 1
                            elif result == 'N/A':
                                batch_na += 1
                                pillar_na += 1

                    print(f"OK ({batch_yes}Y/{batch_no}N/{batch_na}NA)")

            except Exception as e:
                print(f"Error: {e}")
                continue

            # Small delay between batches
            time.sleep(0.5)

        print(f"      [{pillar}] Total: {pillar_yes} YES, {pillar_no} NO, {pillar_na} N/A")

    # 5. Save evaluations
    print(f"\n[5/5] Saving {len(all_evaluations)} evaluations...")

    saved = 0
    errors = 0
    for ev in all_evaluations:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/evaluations",
            headers={**headers, 'Prefer': 'return=minimal,resolution=merge-duplicates'},
            json=ev
        )
        if r.status_code in [200, 201, 204]:
            saved += 1
        else:
            errors += 1

    print(f"   Saved: {saved}/{len(all_evaluations)} (errors: {errors})")

    # Calculate final score
    yes_total = sum(1 for e in all_evaluations if e['result'] == 'YES')
    no_total = sum(1 for e in all_evaluations if e['result'] == 'NO')
    na_total = sum(1 for e in all_evaluations if e['result'] == 'N/A')
    total = yes_total + no_total
    score = (yes_total * 100 // total) if total > 0 else 0

    print(f"\n{'=' * 70}")
    print(f"EVALUATION COMPLETE - {product['name']}")
    print(f"{'=' * 70}")
    print(f"Total evaluations: {len(all_evaluations)}")
    print(f"Results: {yes_total} YES | {no_total} NO | {na_total} N/A")
    print(f"SAFE Score: {score}% ({yes_total}/{total})")
    print(f"{'=' * 70}")

    # Update product timestamp
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product['id']}",
        headers=headers,
        json={'last_evaluated_at': datetime.now().isoformat()}
    )

if __name__ == '__main__':
    main()
