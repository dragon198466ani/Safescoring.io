#!/usr/bin/env python3
"""
SMART DEFI EVALUATOR
====================
Evaluates DeFi protocols with only truly applicable norms.
Filters out hardware, physical, and irrelevant standards.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import requests
import json
from datetime import datetime
from collections import defaultdict
from core.config import SUPABASE_URL, get_supabase_headers

READ_HEADERS = get_supabase_headers()
WRITE_HEADERS = get_supabase_headers(use_service_key=True)
WRITE_HEADERS['Content-Type'] = 'application/json'

# Norms NOT applicable to DeFi protocols (software-only)
DEFI_EXCLUDED_PREFIXES = [
    # Hardware-specific
    'HW', 'SE0', 'FW0', 'BATT', 'PHYS', 'MAT', 'MECH',
    # Biometric
    'BIO',
    # Physical security
    'TAMPER', 'DESTRUCT', 'WIPE',
    # Desktop/Browser specific
    'DESK', 'BROW',
    # Mobile-specific (unless mobile DeFi app)
    'MOB',
]

DEFI_EXCLUDED_KEYWORDS = [
    'secure element', 'tamper', 'physical', 'biometric',
    'hardware', 'screen', 'battery', 'waterproof', 'fireproof',
    'impact resistance', 'temperature', 'humidity', 'corrosion',
    'metals', 'alloy', 'stainless steel', 'titanium',
    'duress pin', 'self-destruct', 'button',
]

# Core norms always applicable to DeFi
DEFI_CORE_NORMS = [
    # Security - Crypto
    'S01', 'S02', 'S03', 'S04', 'S05',  # Core crypto
    # Security - Smart Contracts
    'SC01', 'SC02', 'SC03', 'SC04', 'SC05',
    # Security - Audits
    'AUDIT',
    # EIP/ERC standards
    'EIP', 'ERC',
    # Governance
    'G0', 'G1',
    # DeFi specific
    'DEFI', 'MEV', 'ORACLE', 'FLASH',
    # Adversity - Protocol risks
    'A0', 'A1', 'A2',
    # Fidelity - Track record
    'F01', 'F02', 'F03', 'F04', 'F05',
    # Efficiency - Multi-chain, UX
    'E0', 'E1', 'E2', 'E3',
]


def is_defi_applicable(norm):
    """Check if a norm is applicable to DeFi protocols."""
    code = norm['code'].upper()
    title = (norm.get('title') or '').lower()

    # Check exclusions
    for prefix in DEFI_EXCLUDED_PREFIXES:
        if code.startswith(prefix):
            return False

    for kw in DEFI_EXCLUDED_KEYWORDS:
        if kw in title:
            return False

    # Include core norms
    for core in DEFI_CORE_NORMS:
        if code.startswith(core):
            return True

    # For other norms, include if they're software/protocol related
    software_keywords = [
        'smart contract', 'protocol', 'api', 'authentication',
        'encryption', 'cryptographic', 'signature', 'hash',
        'governance', 'multisig', 'timelock', 'audit',
        'chain', 'evm', 'ethereum', 'defi', 'liquidity',
        'staking', 'yield', 'token', 'oracle', 'price feed',
        'slippage', 'mev', 'front-running', 'reentrancy',
        'access control', 'upgrade', 'proxy', 'pausable',
        'insurance', 'bug bounty', 'disclosure', 'incident',
        'uptime', 'availability', 'monitoring', 'alert',
    ]

    for kw in software_keywords:
        if kw in title:
            return True

    # Default: include for safety (but less confident)
    return True


def fetch_all(table, columns='*'):
    """Fetch all rows with pagination."""
    all_data = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={columns}&offset={offset}&limit=1000"
        r = requests.get(url, headers=READ_HEADERS, timeout=120)
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        all_data.extend(data)
        offset += 1000
        if len(data) < 1000:
            break
    return all_data


def get_defi_products():
    """Get DeFi products that need evaluation."""
    products = fetch_all('products', 'id,name,slug,type_id,url,description')
    scores = fetch_all('safe_scoring_results', 'product_id')
    scored_ids = {s['product_id'] for s in scores}

    # Types for DeFi
    defi_type_ids = {11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37}

    # Get type mappings
    mappings = fetch_all('product_type_mapping', 'product_id,type_id')
    product_types = defaultdict(list)
    for m in mappings:
        product_types[m['product_id']].append(m['type_id'])
    for p in products:
        if p['id'] not in product_types and p.get('type_id'):
            product_types[p['id']].append(p['type_id'])

    # Filter DeFi products without scores
    return [
        p for p in products
        if p['id'] not in scored_ids
        and any(tid in defi_type_ids for tid in product_types.get(p['id'], []))
    ]


def generate_defi_prompt(product, norms, types_map, type_ids):
    """Generate evaluation prompt for DeFi product."""
    type_names = [types_map.get(tid, {}).get('name', '?') for tid in type_ids]

    # Filter to DeFi-applicable norms only
    applicable = [n for n in norms if is_defi_applicable(n)]

    # Group by pillar
    by_pillar = defaultdict(list)
    for n in applicable:
        by_pillar[n['pillar']].append(n)

    prompt = f"""# SAFE SCORING - DeFi Protocol Evaluation
## Product: {product['name']}
- URL: {product.get('url', 'N/A')}
- Type: {', '.join(type_names)}
- Description: {(product.get('description') or 'N/A')[:500]}

## Evaluation Guidelines
- **YES** = Protocol implements this WITH documented evidence (audits, docs, source code, certifications)
- **YESp** = Inherent to blockchain/EVM (e.g., cryptographic primitives, immutability)
- **NO** = Protocol does NOT implement this
- **N/A** = Not applicable to this protocol type

## Norms ({len(applicable)} applicable)

"""
    for pillar in ['S', 'A', 'F', 'E']:
        pillar_norms = by_pillar.get(pillar, [])
        if pillar_norms:
            names = {'S': 'Security', 'A': 'Adversity', 'F': 'Fidelity', 'E': 'Efficiency'}
            prompt += f"### {pillar} - {names[pillar]} ({len(pillar_norms)} norms)\n"
            for n in sorted(pillar_norms, key=lambda x: x['code'])[:50]:  # Limit to 50 per pillar
                prompt += f"- **{n['code']}**: {n['title']}\n"
            if len(pillar_norms) > 50:
                prompt += f"- ... and {len(pillar_norms) - 50} more\n"
            prompt += "\n"

    prompt += """## Response Format
```
CODE: RESULT | Brief justification
```

Example:
```
S01: YESp | EVM uses keccak256 by design
SC01: YES | Multiple audits from Trail of Bits
A01: NO | No governance timelock
E01: YES | Supports Ethereum, Arbitrum, Optimism
```
"""
    return prompt, applicable


def main():
    print("=" * 70)
    print("SMART DEFI EVALUATOR")
    print("=" * 70)

    # Load data
    print("\nLoading data...")
    products = fetch_all('products', 'id,name,slug,type_id,url,description')
    types = {t['id']: t for t in fetch_all('product_types', 'id,code,name')}
    norms = fetch_all('norms', 'id,code,pillar,title')
    print(f"   {len(products)} products, {len(norms)} norms")

    # Get type mappings
    mappings = fetch_all('product_type_mapping', 'product_id,type_id')
    product_types = defaultdict(list)
    for m in mappings:
        product_types[m['product_id']].append(m['type_id'])
    for p in products:
        if p['id'] not in product_types and p.get('type_id'):
            product_types[p['id']].append(p['type_id'])

    # Get products without scores
    scores = fetch_all('safe_scoring_results', 'product_id')
    scored_ids = {s['product_id'] for s in scores}
    no_scores = [p for p in products if p['id'] not in scored_ids]

    print(f"   {len(no_scores)} products without scores")

    # Generate prompts
    output_dir = 'data/eval_defi_prompts'
    os.makedirs(output_dir, exist_ok=True)

    for p in no_scores:
        type_ids = product_types.get(p['id'], [])
        if not type_ids:
            continue

        prompt, applicable = generate_defi_prompt(p, norms, types, type_ids)

        # Save
        filename = f"{p['id']}_{p.get('slug', p['name'].lower().replace(' ', '_'))}.md"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(prompt)

        print(f"   {p['name']}: {len(applicable)} applicable norms -> {filepath}")

    print(f"\nPrompts saved to: {output_dir}/")


if __name__ == "__main__":
    main()
