#!/usr/bin/env python3
"""
Complete evaluation for Lendasat - evaluates ONLY remaining norms.
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

PRODUCT_ID = 1657
BATCH_SIZE = 25

def main():
    headers = get_supabase_headers(use_service_key=True)
    ai = AIProvider()

    print("=" * 70)
    print("LENDASAT - COMPLETE REMAINING EVALUATIONS")
    print("=" * 70)

    # 1. Get already evaluated norm IDs
    print("\n[1/4] Checking existing evaluations...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{PRODUCT_ID}&select=norm_id",
        headers=headers
    )
    evaluated_ids = set(e['norm_id'] for e in r.json()) if r.status_code == 200 else set()
    print(f"   Already evaluated: {len(evaluated_ids)} norms")

    # 2. Get ALL norms
    print("\n[2/4] Loading all norms...")
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,is_essential&order=pillar,code&limit=1000&offset={offset}",
            headers=headers
        )
        if r.status_code != 200:
            break
        batch = r.json()
        if not batch:
            break
        norms.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000

    # Filter to only unevaluated norms
    remaining_norms = [n for n in norms if n['id'] not in evaluated_ids]
    print(f"   Total norms: {len(norms)}")
    print(f"   Remaining to evaluate: {len(remaining_norms)}")

    if not remaining_norms:
        print("\n   All norms already evaluated!")
        return

    # Group by pillar
    by_pillar = {'S': [], 'A': [], 'F': [], 'E': []}
    for n in remaining_norms:
        pillar = n.get('pillar', 'S')
        if pillar in by_pillar:
            by_pillar[pillar].append(n)

    for p, ns in by_pillar.items():
        print(f"   [{p}] {len(ns)} remaining")

    # Product context
    product_context = """PRODUCT: Lendasat
TYPE: DeFi Lending Protocol
DESCRIPTION: Bitcoin-backed lending platform offering loans without counterparty risk. Features Lightning Network integration for fast transactions.
WEBSITE: https://lendasat.com

KEY FEATURES:
- Bitcoin-backed loans without counterparty risk
- Lightning Network integration for fast BTC transactions
- Self-custody focused lending
- Borrow against BTC collateral without selling
- Decentralized peer-to-peer lending model"""

    # 3. Evaluate remaining norms
    print("\n[3/4] Evaluating remaining norms...")
    all_evaluations = []
    total_batches = sum((len(ns) + BATCH_SIZE - 1) // BATCH_SIZE for ns in by_pillar.values() if ns)
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

        for i in range(0, len(pillar_norms), BATCH_SIZE):
            batch_norms = pillar_norms[i:i+BATCH_SIZE]
            current_batch += 1

            print(f"      Batch {current_batch}/{total_batches} ({len(batch_norms)} norms)...", end=" ", flush=True)

            norms_text = "\n".join([
                f"- {n['code']}: {n['title']}" + (" [ESSENTIAL]" if n.get('is_essential') else "")
                for n in batch_norms
            ])

            prompt = f"""You are a crypto security expert evaluating a Bitcoin DeFi lending protocol.

{product_context}

NORMS TO EVALUATE (Pillar {pillar} - {pillar_name}):
{norms_text}

Respond with JSON:
{{
  "evaluations": [
    {{"code": "NORM_CODE", "result": "YES/NO/N/A", "reason": "Brief justification"}},
    ...
  ]
}}

RULES:
- YES = Product meets the requirement
- NO = Product does not meet or no evidence
- N/A = Not applicable (hardware norms for DeFi, physical security for software)

FOR DEFI LENDING:
- Hardware/physical norms = N/A
- Bitcoin crypto standards (secp256k1, ECDSA, SHA-256) = YES
- Smart contract security = Based on docs
- Audit/transparency = NO if no public audit

Return ONLY valid JSON."""

            try:
                response = ai.call(prompt, max_tokens=4000, temperature=0.1)
                if response:
                    response = response.strip()
                    if '```json' in response:
                        response = response.split('```json')[1]
                    if '```' in response:
                        response = response.split('```')[0]
                    response = response.strip()

                    try:
                        data = json.loads(response)
                    except:
                        import re
                        match = re.search(r'\{[\s\S]*\}', response)
                        if match:
                            data = json.loads(match.group())
                        else:
                            print("JSON err")
                            continue

                    batch_evals = data.get('evaluations', [])
                    batch_yes = batch_no = batch_na = 0

                    for ev in batch_evals:
                        norm = next((n for n in batch_norms if n['code'] == ev.get('code')), None)
                        if norm:
                            result = ev.get('result', 'TBD').upper().strip()
                            if result not in ['YES', 'NO', 'N/A', 'TBD']:
                                result = 'TBD'

                            all_evaluations.append({
                                'product_id': PRODUCT_ID,
                                'norm_id': norm['id'],
                                'result': result,
                                'why_this_result': ev.get('reason', '')[:2000],
                                'evaluated_by': 'claude-opus',
                                'evaluation_date': datetime.now().isoformat()
                            })

                            if result == 'YES': batch_yes += 1; pillar_yes += 1
                            elif result == 'NO': batch_no += 1; pillar_no += 1
                            elif result == 'N/A': batch_na += 1; pillar_na += 1

                    print(f"OK ({batch_yes}Y/{batch_no}N/{batch_na}NA)")

            except Exception as e:
                print(f"Err: {e}")
                continue

            time.sleep(0.3)

        print(f"      [{pillar}] Total: {pillar_yes} YES, {pillar_no} NO, {pillar_na} N/A")

    # 4. Save evaluations
    print(f"\n[4/4] Saving {len(all_evaluations)} new evaluations...")

    saved = 0
    for ev in all_evaluations:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/evaluations",
            headers={**headers, 'Prefer': 'return=minimal,resolution=merge-duplicates'},
            json=ev
        )
        if r.status_code in [200, 201, 204]:
            saved += 1

    print(f"   Saved: {saved}/{len(all_evaluations)}")

    # Final stats
    print("\n" + "=" * 70)
    print("FETCHING FINAL STATS...")
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{PRODUCT_ID}&select=result",
        headers=headers
    )
    all_evals = r.json()
    by_result = {}
    for e in all_evals:
        res = e.get('result', 'TBD')
        by_result[res] = by_result.get(res, 0) + 1

    yes = by_result.get('YES', 0)
    no = by_result.get('NO', 0)
    na = by_result.get('N/A', 0)
    total = yes + no
    score = (yes * 100 // total) if total > 0 else 0

    print(f"\nLENDASAT - FINAL RESULTS")
    print(f"=" * 70)
    print(f"Total evaluations: {len(all_evals)}")
    print(f"YES: {yes} | NO: {no} | N/A: {na}")
    print(f"SAFE SCORE: {score}% ({yes}/{total})")
    print(f"=" * 70)

    # Update product
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{PRODUCT_ID}",
        headers=headers,
        json={'last_evaluated_at': datetime.now().isoformat()}
    )

if __name__ == '__main__':
    main()
