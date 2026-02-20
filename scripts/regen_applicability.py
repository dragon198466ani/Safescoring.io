#!/usr/bin/env python3
"""
REGENERATE ALL APPLICABILITY RULES
===================================
Generates norm_applicability for ALL 78 product types × 2159 norms.
Uses deterministic rules from applicability_rules.py.
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
WRITE_HEADERS = get_supabase_headers('resolution=merge-duplicates,return=minimal', use_service_key=True)


def load_types():
    """Load all product types."""
    r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?select=*', headers=READ_HEADERS, timeout=30)
    return r.json() if r.status_code == 200 else []


def load_norms():
    """Load all norms."""
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


def get_type_characteristics(product_type):
    """Determine product type characteristics."""
    name = (product_type.get('name', '') or '').lower()

    is_hardware = any(kw in name for kw in [
        'hardware wallet', 'cold', 'physical backup', 'metal', 'steel',
        'titanium', 'stone', 'backup'
    ])

    is_wallet = any(kw in name for kw in [
        'wallet', 'mpc', 'multisig', 'smart contract wallet', 'browser extension'
    ])

    is_defi = any(kw in name for kw in [
        'defi', 'lending', 'yield', 'liquidity', 'amm', 'dex', 'swap',
        'staking', 'restaking', 'aggregator', 'bridge', 'cross-chain',
        'stablecoin', 'synthetic', 'derivatives', 'perpetual', 'options'
    ])

    is_protocol = any(kw in name for kw in [
        'protocol', 'oracle', 'layer 2', 'l2', 'rollup', 'infrastructure',
        'rpc', 'node', 'attestation', 'identity', 'messaging', 'privacy'
    ])

    is_exchange = any(kw in name for kw in [
        'exchange', 'cex', 'centralized', 'broker', 'otc', 'p2p'
    ])

    is_custody = any(kw in name for kw in [
        'custody', 'custodial', 'institutional'
    ])

    # Blockchain context
    blockchain_context = {
        'is_bitcoin': 'bitcoin' in name or 'btc' in name,
        'is_evm': 'evm' in name or 'ethereum' in name,
        'is_solana': 'solana' in name or 'sol' in name,
    }

    return {
        'is_hardware': is_hardware,
        'is_wallet': is_wallet or is_exchange,  # Exchanges also handle keys
        'is_defi': is_defi,
        'is_protocol': is_protocol,
        'is_exchange': is_exchange,
        'is_custody': is_custody,
        'blockchain_context': blockchain_context,
    }


def determine_applicability(norm, type_chars, type_name):
    """Determine if a norm is applicable to a product type."""
    norm_code = norm.get('code', '')
    norm_title = norm.get('title', '')
    pillar = norm.get('pillar', '').upper()

    # Use keyword-based rules
    result = is_norm_applicable_by_keywords(
        norm_code,
        norm_title,
        type_chars['is_hardware'],
        type_chars['is_defi'],
        type_chars['is_wallet'],
        type_chars['is_protocol'],
        type_chars['blockchain_context']
    )

    # If result is None, use pillar-based defaults
    if result is None:
        type_lower = type_name.lower()

        # Security (S) - applies to all security-relevant products
        if pillar == 'S':
            # Hardware-specific security norms
            hw_keywords = ['secure element', 'tamper', 'firmware', 'boot', 'biometric',
                          'anti-tamper', 'tee', 'trusted execution', 'physical']
            if any(kw in norm_title.lower() for kw in hw_keywords):
                return type_chars['is_hardware']
            # Default: most S norms apply to digital products
            return True

        # Adversity (A) - applies based on context
        elif pillar == 'A':
            # Physical adversity
            if any(kw in norm_title.lower() for kw in ['fire', 'water', 'corrosion', 'drop', 'shock']):
                return type_chars['is_hardware']
            # Privacy/coercion - applies to wallets
            if any(kw in norm_title.lower() for kw in ['duress', 'hidden', 'decoy', 'coercion']):
                return type_chars['is_wallet'] or type_chars['is_hardware']
            # Default: legal, insurance, incident response apply to all
            return True

        # Fidelity (F) - reliability/quality
        elif pillar == 'F':
            # Physical durability
            if any(kw in norm_title.lower() for kw in ['fire', 'mechanical', 'material', 'environment',
                                                        'temperature', 'humidity', 'chemical', 'em ']):
                return type_chars['is_hardware']
            # Software quality applies to all digital
            return True

        # Ecosystem (E) - integration
        elif pillar == 'E':
            # Battery/ergonomics = hardware only
            if any(kw in norm_title.lower() for kw in ['battery', 'ergonomic', 'form factor']):
                return type_chars['is_hardware']
            # DeFi integration
            if any(kw in norm_title.lower() for kw in ['defi', 'swap', 'stake', 'yield', 'liquidity']):
                return type_chars['is_defi'] or type_chars['is_wallet']
            # Default: chains, platform, UX apply to all
            return True

        return True  # Default applicable

    return result


def generate_reason(is_applicable, norm, type_chars, type_name):
    """Generate a human-readable reason for applicability."""
    pillar = norm.get('pillar', '').upper()
    title = norm.get('title', '')

    if is_applicable:
        if type_chars['is_hardware']:
            return f"{pillar} - applicable (hardware product)"
        elif type_chars['is_defi']:
            return f"{pillar} - applicable (DeFi protocol)"
        elif type_chars['is_exchange']:
            return f"{pillar} - applicable (exchange)"
        elif type_chars['is_wallet']:
            return f"{pillar} - applicable (wallet)"
        else:
            return f"{pillar} - applicable (general)"
    else:
        if 'hardware' in title.lower() or 'physical' in title.lower():
            return "Norm requires physical/hardware components"
        elif 'defi' in title.lower() or 'smart contract' in title.lower():
            return "Norm specific to DeFi/smart contracts"
        else:
            return f"Norm not applicable to {type_name}"


def save_batch(applicabilities, retries=3):
    """Save batch to Supabase using upsert with retries."""
    if not applicabilities:
        return 0

    for attempt in range(retries):
        try:
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/norm_applicability',
                headers=WRITE_HEADERS,
                json=applicabilities,
                timeout=60
            )
            if r.status_code in [200, 201]:
                return len(applicabilities)
            elif r.status_code == 409:  # Conflict - already exists
                return len(applicabilities)  # Consider as success
            else:
                print(f"    Save error {r.status_code}: {r.text[:100]}", flush=True)
                if attempt < retries - 1:
                    time.sleep(2)
        except Exception as e:
            print(f"    Save error (attempt {attempt+1}): {str(e)[:80]}", flush=True)
            if attempt < retries - 1:
                time.sleep(5)

    return 0


def main():
    print("=" * 70, flush=True)
    print("  REGENERATE ALL APPLICABILITY RULES", flush=True)
    print("  78 types × 2159 norms = ~168,000 rules", flush=True)
    print("=" * 70, flush=True)

    print("\nLoading data...", flush=True)
    types = load_types()
    norms = load_norms()
    print(f"  {len(types)} types, {len(norms)} norms", flush=True)

    total_saved = 0
    BATCH_SIZE = 200  # Smaller batches for reliability

    start_time = time.time()

    for i, ptype in enumerate(types):
        type_id = ptype['id']
        type_name = ptype.get('name', f'Type {type_id}')
        type_chars = get_type_characteristics(ptype)

        applicable_count = 0
        type_rules = []

        for norm in norms:
            is_applicable = determine_applicability(norm, type_chars, type_name)
            reason = generate_reason(is_applicable, norm, type_chars, type_name)

            if is_applicable:
                applicable_count += 1

            type_rules.append({
                'type_id': type_id,
                'norm_id': norm['id'],
                'is_applicable': is_applicable,
                'reason': reason,
                'applicability_reason': reason,
            })

        # Save all rules for this type in batches
        type_saved = 0
        for batch_start in range(0, len(type_rules), BATCH_SIZE):
            batch = type_rules[batch_start:batch_start + BATCH_SIZE]
            saved = save_batch(batch)
            type_saved += saved
            time.sleep(0.3)  # Small delay between batches

        total_saved += type_saved
        print(f"[{i+1}/{len(types)}] {type_name:40} | {applicable_count:4} applicable | saved {type_saved}", flush=True)

    elapsed = time.time() - start_time
    print("=" * 70, flush=True)
    print(f"  COMPLETE: {total_saved} applicability rules saved in {elapsed:.1f}s", flush=True)
    print(f"  Expected: {len(types) * len(norms)} rules", flush=True)
    print("=" * 70, flush=True)


if __name__ == "__main__":
    main()
