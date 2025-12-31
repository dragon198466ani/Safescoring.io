#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analyze and display current norm applicability for DEX products
Shows which norms are applicable vs N/A and their rationale
"""

import requests
import json
import sys
import io

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load config
config = {}
with open('config/env_template_free.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()

SUPABASE_URL = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

DEX_TYPE_ID = 39

print("="*100)
print("NORM APPLICABILITY ANALYSIS FOR DEX (Decentralized Exchanges)")
print("="*100)

# Get DEX type info
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?id=eq.{DEX_TYPE_ID}', headers=headers)
dex_type = r.json()[0] if r.json() else {}
print(f"\nType: {dex_type.get('code')} - {dex_type.get('category')}")
print(f"Description: {dex_type.get('description')}")

# Get all norms
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&order=code.asc', headers=headers)
all_norms = r.json()
norms_by_id = {n['id']: n for n in all_norms}

print(f"\nTotal norms in database: {len(all_norms)}")

# Get applicability for DEX
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{DEX_TYPE_ID}&select=norm_id,is_applicable',
    headers=headers
)
applicability_data = r.json()
applicability = {a['norm_id']: a['is_applicable'] for a in applicability_data}

applicable_norms = [norms_by_id[nid] for nid, is_app in applicability.items() if is_app]
not_applicable_norms = [norms_by_id[nid] for nid, is_app in applicability.items() if not is_app]

print(f"Applicable norms: {len(applicable_norms)}")
print(f"N/A norms: {len(not_applicable_norms)}")

# Breakdown by pillar
for pillar, pillar_name in [('S', 'Security'), ('A', 'Adversity'), ('F', 'Fidelity'), ('E', 'Efficiency')]:
    applicable_count = sum(1 for n in applicable_norms if n['pillar'] == pillar)
    not_applicable_count = sum(1 for n in not_applicable_norms if n['pillar'] == pillar)
    total = applicable_count + not_applicable_count
    print(f"\nPillar {pillar} ({pillar_name}):")
    print(f"  Applicable: {applicable_count}/{total} ({100*applicable_count//total if total > 0 else 0}%)")
    print(f"  N/A: {not_applicable_count}/{total} ({100*not_applicable_count//total if total > 0 else 0}%)")

# List some N/A norms to review
print("\n" + "="*100)
print("SAMPLE OF N/A NORMS (potential candidates for review):")
print("="*100)

# Focus on norms that MIGHT be applicable to DEX but are currently N/A
potential_applicable_keywords = [
    'smart contract', 'audit', 'protocol', 'blockchain', 'transaction',
    'security', 'encryption', 'signature', 'multisig', 'governance',
    'liquidity', 'slippage', 'mev', 'front', 'oracle', 'bridge',
    'api', 'web', 'interface', 'wallet', 'connect', 'network',
    'test', 'documentation', 'open source', 'transparency'
]

print("\nN/A norms that might be relevant for DEX:")
print("-"*100)

for pillar in ['S', 'A', 'F', 'E']:
    pillar_na = [n for n in not_applicable_norms if n['pillar'] == pillar]
    if pillar_na:
        print(f"\n[{pillar}] Pillar:")
        count = 0
        for norm in sorted(pillar_na, key=lambda x: x['code'])[:15]:  # Show first 15
            title_desc = f"{norm['title']} - {norm.get('description', '')[:60]}"
            # Check if might be relevant
            is_potential = any(kw in title_desc.lower() for kw in potential_applicable_keywords)
            marker = " ⚠️ REVIEW" if is_potential else ""
            print(f"  {norm['code']:6s} | {norm['title'][:70]:70s}{marker}")
            count += 1

print("\n" + "="*100)
print("SAMPLE OF APPLICABLE NORMS:")
print("="*100)

for pillar in ['S', 'A', 'F', 'E']:
    pillar_app = [n for n in applicable_norms if n['pillar'] == pillar]
    if pillar_app:
        print(f"\n[{pillar}] Pillar ({len(pillar_app)} applicable):")
        for norm in sorted(pillar_app, key=lambda x: x['code'])[:10]:  # Show first 10
            print(f"  {norm['code']:6s} | {norm['title'][:70]:70s}")

print("\n" + "="*100)
print("RECOMMENDATIONS FOR DEX:")
print("="*100)
print("""
DEX products should typically have:

APPLICABLE norms:
✅ Smart contract security (audits, formal verification, testing)
✅ Protocol security (reentrancy protection, access control, pausability)
✅ Web/API security (TLS, HTTPS, rate limiting, OWASP)
✅ Cryptographic standards (secp256k1, ECDSA, Keccak-256)
✅ EVM/EIP standards (EIP-712, EIP-1559, EIP-2612, etc.)
✅ DeFi protections (slippage, MEV, oracle security)
✅ Wallet integrations (MetaMask, WalletConnect, hardware wallets)
✅ Documentation and transparency
✅ Open source code review
✅ Governance mechanisms
✅ Interface usability and multi-language support

NOT APPLICABLE norms:
❌ Physical security (no hardware component)
❌ Secure Element, TPM (no physical device)
❌ Fire/water resistance (not physical)
❌ KYC/AML compliance (decentralized by nature)
❌ Custodial features (non-custodial by design)
❌ PIN codes, biometric authentication (unless wallet integration)
❌ Display screens, physical buttons (unless specific hardware wallet integration)
❌ Seed phrase backup cards (DEX doesn't generate seeds)

CONTEXT-DEPENDENT (review needed):
🔍 Backup/Recovery: Depends if DEX offers account abstraction or smart wallets
🔍 Multi-signature: Applicable if DEX supports multisig wallets
🔍 Hardware wallet support: Applicable via wallet integrations
🔍 Mobile app security: If DEX has a mobile app
🔍 Customer support: Even decentralized apps can have support channels
""")
