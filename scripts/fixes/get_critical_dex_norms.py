#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
List CRITICAL norms that should be reviewed for DEX
"""

import requests
import json
import sys
import io

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

# Get all norms
r = requests.get(f'{SUPABASE_URL}/rest/v1/norms?select=id,code,pillar,title,description&order=code.asc', headers=headers)
all_norms = r.json()
norms_by_code = {n['code']: n for n in all_norms}

# Get DEX applicability
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{DEX_TYPE_ID}&select=norm_id,is_applicable',
    headers=headers
)
applicability_data = r.json()
applicability_by_id = {a['norm_id']: a['is_applicable'] for a in applicability_data}

# Critical norms that should be reviewed
critical_reviews = [
    # Crypto standards that DEX MUST support (Ethereum foundation)
    ('S01', False, True, 'AES-256 - used in TLS/HTTPS for DEX interfaces'),
    ('S06', False, True, 'SHA-3/Keccak-256 - CORE Ethereum hashing algorithm'),
    ('S10', False, True, 'Argon2 - modern password hashing for DEX admin/API'),

    # EIP standards
    ('S104', None, True, 'EIP-2612 Permit - gasless approvals'),
    ('S105', None, True, 'EIP-4626 Tokenized Vaults'),

    # Blockchain support
    ('E01', False, True, 'Bitcoin BTC - if DEX supports wrapped BTC'),
    ('E11', False, True, 'Cardano - if DEX bridges to Cardano'),

    # Performance metrics
    ('E153', False, True, 'TPS >100K - performance evaluation metric'),

    # Testing/Quality (should be applicable)
    ('F134', None, True, 'Unit Testing'),
    ('F135', None, True, 'Integration Testing'),
    ('F136', None, True, 'Fuzz Testing'),
]

print("="*100)
print("CRITICAL DEX NORMS TO REVIEW")
print("="*100)
print()
print("Legend:")
print("  Current: Current status in database")
print("  Should:  Recommended status")
print("  ⚠️ = Needs correction")
print("  ✅ = Already correct")
print()
print("="*100)

for code, expected_current, should_be, reason in critical_reviews:
    norm = norms_by_code.get(code)
    if not norm:
        print(f"⚠️ Norm {code} not found in database!")
        continue

    current = applicability_by_id.get(norm['id'])

    if current is None:
        status = "⚠️ NOT SET"
    elif current == should_be:
        if expected_current is None or current == expected_current:
            status = "✅ OK"
        else:
            status = "⚠️ CHANGED"
    else:
        status = "⚠️ WRONG"

    current_str = "YES" if current else "NO " if current is not None else "???"
    should_str = "YES" if should_be else "NO "

    print(f"{status} {code:6s} | Current: {current_str} | Should: {should_str} | {reason}")
    print(f"         └─ {norm['title']}")
    print()

print("="*100)
print("\nEVM/ETHEREUM INHERITED STANDARDS (should all be YES):")
print("="*100)

# Check key EVM standards
evm_standards = [
    'S03',  # ECDSA secp256k1
    'S05',  # SHA-256
    'S06',  # Keccak
    'S08',  # HMAC-SHA256
]

eip_standards = [
    'S104',  # EIP-2612
    'S105',  # EIP-4626
]

print("\nCore Ethereum Crypto:")
for code in evm_standards:
    norm = norms_by_code.get(code)
    if norm:
        current = applicability_by_id.get(norm['id'])
        status = "✅" if current else "⚠️"
        current_str = "YES" if current else "NO"
        print(f"  {status} {code} ({current_str}): {norm['title']}")

print("\nEIP Standards:")
for code in eip_standards:
    norm = norms_by_code.get(code)
    if norm:
        current = applicability_by_id.get(norm['id'])
        status = "✅" if current else "⚠️"
        current_str = "YES" if current else "NO"
        print(f"  {status} {code} ({current_str}): {norm['title']}")

print("\n" + "="*100)
print("TO UPDATE: Run 'python update_dex_applicability.py'")
print("="*100)
