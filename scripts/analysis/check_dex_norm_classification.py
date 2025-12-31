#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify Essential/Consumer classification for critical DEX norms"""

import requests
import json
import sys
import io

if sys.platform == 'win32':
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
print("DEX NORMS - ESSENTIAL/CONSUMER CLASSIFICATION CHECK")
print("="*100)

# Get all norms
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,is_essential,consumer,full', headers=headers)
all_norms = r.json()
norms_by_code = {n['code']: n for n in all_norms}

# Get DEX applicability
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{DEX_TYPE_ID}&select=norm_id,is_applicable',
    headers=headers
)
applicability_data = r.json()
applicability_by_id = {a['norm_id']: a['is_applicable'] for a in applicability_data}

# Filter applicable norms for DEX
dex_norms = [n for n in all_norms if applicability_by_id.get(n['id']) == True]

print(f"\nTotal DEX applicable norms: {len(dex_norms)}")

# Classification stats
essential_count = sum(1 for n in dex_norms if n.get('is_essential'))
consumer_count = sum(1 for n in dex_norms if n.get('consumer'))
full_count = sum(1 for n in dex_norms if n.get('full'))

print(f"\nClassification for {len(dex_norms)} DEX norms:")
print(f"   Essential: {essential_count} ({100*essential_count//len(dex_norms)}%)")
print(f"   Consumer:  {consumer_count} ({100*consumer_count//len(dex_norms)}%)")
print(f"   Full:      {full_count} ({100*full_count//len(dex_norms)}%)")

# Critical DEX norms that SHOULD be Essential/Consumer
critical_norms = [
    # Core Ethereum crypto (MUST be essential)
    ('S03', True, True, 'ECDSA secp256k1 - Core Ethereum signature'),
    ('S05', True, True, 'SHA-256 - Core hash function'),
    ('S06', True, True, 'Keccak-256 - CORE Ethereum hashing'),
    ('S08', True, True, 'HMAC-SHA256 - Message authentication'),

    # Web security (should be consumer at least)
    ('S01', False, True, 'AES-256 - TLS/HTTPS encryption'),
    ('S10', False, True, 'Argon2 - Password hashing'),

    # EIP standards (essential for DEX)
    ('S104', True, True, 'EIP-2612 Permit - Gasless approvals'),
    ('S105', False, True, 'EIP-4626 Vaults'),

    # DeFi protections (essential)
    # Find codes for reentrancy, slippage, MEV protection
]

print("\n" + "="*100)
print("CRITICAL DEX NORMS - CLASSIFICATION REVIEW")
print("="*100)

print("\nLegend:")
print("  ✅ = Correctly classified")
print("  ⚠️ = Should be reviewed")
print("  ❌ = Wrong classification")
print()

for code, should_essential, should_consumer, reason in critical_norms:
    norm = norms_by_code.get(code)
    if not norm:
        print(f"❌ {code} - NOT FOUND IN DATABASE")
        continue

    is_essential = norm.get('is_essential', False)
    is_consumer = norm.get('consumer', False)
    is_full = norm.get('full', False)

    # Check if applicable to DEX
    is_applicable = applicability_by_id.get(norm['id'], False)

    if not is_applicable:
        print(f"⚠️ {code} - NOT APPLICABLE TO DEX (should be!)")
        continue

    # Check classification
    essential_ok = (is_essential == should_essential) if should_essential is not None else True
    consumer_ok = (is_consumer == should_consumer) if should_consumer is not None else True

    if essential_ok and consumer_ok:
        status = "✅"
    else:
        status = "❌"

    ess_str = "ESS" if is_essential else "   "
    cons_str = "CON" if is_consumer else "   "
    full_str = "FUL" if is_full else "   "

    print(f"{status} {code:6s} | {ess_str} {cons_str} {full_str} | {norm['title'][:50]:50s}")

    if not essential_ok or not consumer_ok:
        expected = []
        if should_essential:
            expected.append("ESSENTIAL")
        if should_consumer:
            expected.append("CONSUMER")
        print(f"         └─ Should be: {' + '.join(expected)} - {reason}")

print("\n" + "="*100)
print("SMART CONTRACT SECURITY NORMS (should be Essential)")
print("="*100)

# Search for smart contract security norms
security_keywords = [
    'audit', 'reentrancy', 'access control', 'pausable',
    'formal verification', 'testing', 'coverage'
]

print("\nSearching for smart contract security norms...")

for n in dex_norms:
    title_desc = f"{n['title']} {n.get('description', '')}".lower()

    # Check if related to smart contract security
    is_security = any(kw in title_desc for kw in security_keywords)

    if is_security and n['pillar'] in ['S', 'F']:
        is_essential = n.get('is_essential', False)
        is_consumer = n.get('consumer', False)

        status = "✅" if (is_essential or is_consumer) else "⚠️"
        ess = "ESS" if is_essential else "   "
        cons = "CON" if is_consumer else "   "

        print(f"{status} {n['code']:6s} | {ess} {cons} | {n['title'][:60]:60s}")

print("\n" + "="*100)
print("DEFI-SPECIFIC NORMS (should be Essential/Consumer)")
print("="*100)

# Search for DeFi-specific norms
defi_keywords = [
    'slippage', 'mev', 'frontrun', 'sandwich', 'oracle',
    'liquidity', 'swap', 'amm', 'pool', 'token'
]

print("\nSearching for DeFi-specific norms...")

for n in dex_norms:
    title_desc = f"{n['title']} {n.get('description', '')}".lower()

    is_defi = any(kw in title_desc for kw in defi_keywords)

    if is_defi:
        is_essential = n.get('is_essential', False)
        is_consumer = n.get('consumer', False)

        status = "✅" if (is_essential or is_consumer) else "⚠️"
        ess = "ESS" if is_essential else "   "
        cons = "CON" if is_consumer else "   "

        print(f"{status} {n['code']:6s} | {ess} {cons} | {n['title'][:60]:60s}")

print("\n" + "="*100)
print("SUMMARY & RECOMMENDATIONS")
print("="*100)

# Count by pillar and classification
pillars = ['S', 'A', 'F', 'E']

print("\nDEX Norms by Pillar and Classification:\n")
print(f"{'Pillar':8s} | {'Total':6s} | {'Essential':10s} | {'Consumer':10s} | {'Full':6s}")
print("-" * 70)

for pillar in pillars:
    pillar_norms = [n for n in dex_norms if n['pillar'] == pillar]
    total = len(pillar_norms)
    ess = sum(1 for n in pillar_norms if n.get('is_essential'))
    cons = sum(1 for n in pillar_norms if n.get('consumer'))
    full = sum(1 for n in pillar_norms if n.get('full'))

    ess_pct = f"{ess} ({100*ess//total if total > 0 else 0}%)"
    cons_pct = f"{cons} ({100*cons//total if total > 0 else 0}%)"

    print(f"{pillar:8s} | {total:6d} | {ess_pct:10s} | {cons_pct:10s} | {full:6d}")

print("\n" + "="*100)
print("\n📋 RECOMMENDATIONS:")
print("\n1. Core Ethereum crypto (S03, S05, S06, S08) should be ESSENTIAL")
print("2. Smart contract audit norms should be ESSENTIAL")
print("3. DeFi protections (slippage, MEV, oracle) should be CONSUMER")
print("4. Web security (AES, Argon2) should be CONSUMER")
print("="*100)
