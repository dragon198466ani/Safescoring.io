#!/usr/bin/env python3
"""
REGENERATE ALL APPLICABILITY RULES v2
======================================
Deletes existing rules and inserts fresh data for all 78 types × 2159 norms.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

from core.config import SUPABASE_URL, get_supabase_headers
from core.applicability_rules import is_norm_applicable_by_keywords
import requests
import time

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'
WRITE_HEADERS['Prefer'] = 'return=minimal'

DELETE_HEADERS = get_supabase_headers(use_service_key=True)
DELETE_HEADERS['Prefer'] = 'return=minimal'


def load_types():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*', headers=READ_HEADERS, timeout=30)
    return r.json() if r.status_code == 200 else []


def load_norms():
    norms = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar&limit=1000&offset={offset}',
            headers=READ_HEADERS, timeout=60
        )
        data = r.json() if r.status_code == 200 else []
        if not data:
            break
        norms.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    return norms


def get_type_chars(ptype):
    name = (ptype.get('name', '') or '').lower()
    return {
        'is_hardware': any(kw in name for kw in ['hardware wallet', 'cold', 'physical backup', 'metal', 'backup']),
        'is_wallet': any(kw in name for kw in ['wallet', 'mpc', 'multisig']),
        'is_defi': any(kw in name for kw in ['defi', 'lending', 'yield', 'liquidity', 'amm', 'dex', 'swap', 'staking', 'bridge', 'stablecoin', 'derivatives']),
        'is_protocol': any(kw in name for kw in ['protocol', 'oracle', 'layer 2', 'l2', 'infrastructure', 'privacy']),
        'is_exchange': any(kw in name for kw in ['exchange', 'cex', 'centralized', 'broker']),
        'blockchain_context': {'is_bitcoin': 'bitcoin' in name, 'is_evm': 'evm' in name, 'is_solana': 'solana' in name},
    }


def determine_applicability(norm, chars, type_name):
    code = norm.get('code', '')
    title = norm.get('title', '')
    pillar = norm.get('pillar', '').upper()

    result = is_norm_applicable_by_keywords(code, title, chars['is_hardware'], chars['is_defi'],
                                            chars['is_wallet'], chars['is_protocol'], chars['blockchain_context'])

    if result is None:
        title_lower = title.lower()
        if pillar == 'S':
            if any(kw in title_lower for kw in ['secure element', 'tamper', 'firmware', 'biometric', 'physical']):
                return chars['is_hardware']
            return True
        elif pillar == 'A':
            if any(kw in title_lower for kw in ['fire', 'water', 'corrosion', 'drop']):
                return chars['is_hardware']
            return True
        elif pillar == 'F':
            if any(kw in title_lower for kw in ['fire', 'mechanical', 'material', 'temperature']):
                return chars['is_hardware']
            return True
        elif pillar == 'E':
            if any(kw in title_lower for kw in ['battery', 'ergonomic']):
                return chars['is_hardware']
            return True
        return True
    return result


def main():
    print("=" * 70, flush=True)
    print("  REGENERATE APPLICABILITY v2 - DELETE + INSERT", flush=True)
    print("=" * 70, flush=True)

    print("\nLoading data...", flush=True)
    types = load_types()
    norms = load_norms()
    print(f"  {len(types)} types, {len(norms)} norms", flush=True)

    # First, delete ALL existing rules
    print("\nDeleting all existing applicability rules...", flush=True)
    for ptype in types:
        r = requests.delete(f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{ptype["id"]}',
                           headers=DELETE_HEADERS, timeout=60)
        if r.status_code != 204:
            print(f"  Delete error for type {ptype['id']}: {r.status_code}", flush=True)
    print("  Done deleting.", flush=True)

    total_saved = 0
    BATCH_SIZE = 500
    start_time = time.time()

    for i, ptype in enumerate(types):
        type_id = ptype['id']
        type_name = ptype.get('name', f'Type {type_id}')
        chars = get_type_chars(ptype)

        rules = []
        applicable_count = 0

        for norm in norms:
            is_app = determine_applicability(norm, chars, type_name)
            if is_app:
                applicable_count += 1

            rules.append({
                'type_id': type_id,
                'norm_id': norm['id'],
                'is_applicable': is_app,
                'reason': f"{norm.get('pillar','?')} - {'applicable' if is_app else 'not applicable'}",
            })

        # Insert in batches
        type_saved = 0
        for batch_start in range(0, len(rules), BATCH_SIZE):
            batch = rules[batch_start:batch_start + BATCH_SIZE]
            try:
                r = requests.post(f'{SUPABASE_URL}/rest/v1/norm_applicability',
                                 headers=WRITE_HEADERS, json=batch, timeout=120)
                if r.status_code == 201:
                    type_saved += len(batch)
                else:
                    print(f"    Insert error: {r.status_code} - {r.text[:100]}", flush=True)
            except Exception as e:
                print(f"    Error: {str(e)[:80]}", flush=True)
            time.sleep(0.2)

        total_saved += type_saved
        print(f"[{i+1}/{len(types)}] {type_name:40} | {applicable_count:4} applicable | saved {type_saved}", flush=True)

    elapsed = time.time() - start_time
    print("=" * 70, flush=True)
    print(f"  COMPLETE: {total_saved} rules saved in {elapsed:.1f}s", flush=True)
    print(f"  Expected: {len(types) * len(norms)}", flush=True)
    print("=" * 70, flush=True)


if __name__ == "__main__":
    main()
