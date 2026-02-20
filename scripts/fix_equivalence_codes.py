#!/usr/bin/env python3
"""
Fix equivalence rules with correct norm codes.
"""

import requests
from pathlib import Path

project_root = Path(__file__).parent.parent

def load_env(filepath):
    env_vars = {}
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

env = {}
env.update(load_env(project_root / '.env'))
env.update(load_env(project_root / 'config' / '.env'))

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_KEY')

print(f"Supabase URL: {SUPABASE_URL[:50]}...")

# First, delete all existing equivalences
print("\nClearing existing equivalence rules...")
resp = requests.delete(
    f"{SUPABASE_URL}/rest/v1/norm_equivalences?id=gte.0",
    headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    },
    timeout=30
)
print(f"Delete: {resp.status_code}")

# Correct equivalence rules based on actual norm codes
CORRECT_EQUIVALENCES = [
    # CC EAL5 (CC005) implies/exceeds FIPS 140-3 L3 (HSM01)
    {
        'source_norm_code': 'CC005',
        'source_norm_value': 'Common Criteria EAL5',
        'target_norm_code': 'HSM01',
        'target_norm_value': 'FIPS 140-3 Level 3',
        'equivalence_factor': 0.95,
        'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: CC EAL5 certification provides equivalent or superior security to FIPS 140-3 Level 3.',
        'justification': 'Common Criteria EAL5 includes semi-formal design verification.',
        'is_active': True
    },
    # CC EAL6 (CC007) implies/exceeds FIPS 140-3 L3 (HSM01)
    {
        'source_norm_code': 'CC007',
        'source_norm_value': 'Common Criteria EAL6',
        'target_norm_code': 'HSM01',
        'target_norm_value': 'FIPS 140-3 Level 3',
        'equivalence_factor': 0.97,
        'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: CC EAL6 certification exceeds FIPS 140-3 Level 3 requirements.',
        'justification': 'CC EAL6 requires semi-formally verified design.',
        'is_active': True
    },
    # CC EAL7 (S261) implies FIPS 140-3 L3 (HSM01)
    {
        'source_norm_code': 'S261',
        'source_norm_value': 'Common Criteria EAL7',
        'target_norm_code': 'HSM01',
        'target_norm_value': 'FIPS 140-3 Level 3',
        'equivalence_factor': 1.0,
        'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: CC EAL7 is the highest CC level and exceeds FIPS 140-3 Level 3.',
        'justification': 'CC EAL7 requires formally verified design.',
        'is_active': True
    },
    # CC EAL4+ (S260) implies Secure Element (S50)
    {
        'source_norm_code': 'S260',
        'source_norm_value': 'Common Criteria EAL4+',
        'target_norm_code': 'S50',
        'target_norm_value': 'Secure Element',
        'equivalence_factor': 1.0,
        'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: CC EAL4+ certification confirms secure element usage.',
        'justification': 'CC EAL4+ hardware certifications require secure element.',
        'is_active': True
    },
    # CC EAL5 (CC005) implies Secure Element (S50)
    {
        'source_norm_code': 'CC005',
        'source_norm_value': 'Common Criteria EAL5',
        'target_norm_code': 'S50',
        'target_norm_value': 'Secure Element',
        'equivalence_factor': 1.0,
        'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: CC EAL5 certification confirms secure element usage.',
        'justification': 'CC EAL5 certified devices use certified secure elements.',
        'is_active': True
    },
    # FIPS 140-3 L3 (HSM01) implies Secure Element (S50)
    {
        'source_norm_code': 'HSM01',
        'source_norm_value': 'FIPS 140-3 Level 3',
        'target_norm_code': 'S50',
        'target_norm_value': 'Secure Element',
        'equivalence_factor': 1.0,
        'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: FIPS 140-3 Level 3 confirms secure crypto module.',
        'justification': 'FIPS 140-3 Level 3 requires physical tamper resistance.',
        'is_active': True
    },
    # FIPS 140-3 L4 (S-ADD-043) implies L3 (HSM01)
    {
        'source_norm_code': 'S-ADD-043',
        'source_norm_value': 'FIPS 140-3 Level 4',
        'target_norm_code': 'HSM01',
        'target_norm_value': 'FIPS 140-3 Level 3',
        'equivalence_factor': 1.0,
        'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: FIPS 140-3 Level 4 exceeds Level 3 requirements.',
        'justification': 'Level 4 includes all Level 3 requirements plus environmental protection.',
        'is_active': True
    },
    # BIP-39 (S17) implies BIP-32 (S16)
    {
        'source_norm_code': 'S17',
        'source_norm_value': 'BIP-39 Mnemonic',
        'target_norm_code': 'S16',
        'target_norm_value': 'BIP-32 HD Wallets',
        'equivalence_factor': 1.0,
        'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: BIP-39 mnemonic requires BIP-32 HD key derivation.',
        'justification': 'BIP-39 seed phrases work with BIP-32 HD wallet structure.',
        'is_active': True
    },
    # BIP-39 Passphrase (S81) implies BIP-39 (S17)
    {
        'source_norm_code': 'S81',
        'source_norm_value': 'BIP-39 Passphrase',
        'target_norm_code': 'S17',
        'target_norm_value': 'BIP-39 Mnemonic',
        'equivalence_factor': 1.0,
        'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: BIP-39 passphrase support requires BIP-39 mnemonic.',
        'justification': 'Passphrase is an extension of BIP-39 mnemonic.',
        'is_active': True
    },
    # Ethereum Mainnet (CHAIN003) implies secp256k1 usage
    {
        'source_norm_code': 'CHAIN003',
        'source_norm_value': 'Ethereum Mainnet',
        'target_norm_code': 'S31',
        'target_norm_value': 'secp256k1',
        'equivalence_factor': 1.0,
        'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Ethereum uses secp256k1 for all cryptographic operations.',
        'justification': 'Ethereum protocol mandates secp256k1.',
        'is_active': True
    },
    # Bitcoin Mainnet (CHAIN001) implies secp256k1
    {
        'source_norm_code': 'CHAIN001',
        'source_norm_value': 'Bitcoin Mainnet',
        'target_norm_code': 'S31',
        'target_norm_value': 'secp256k1',
        'equivalence_factor': 1.0,
        'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Bitcoin uses secp256k1 for cryptographic operations.',
        'justification': 'Bitcoin protocol mandates secp256k1.',
        'is_active': True
    },
    # Third-party audit (S78) implies security audit performed
    {
        'source_norm_code': 'S78',
        'source_norm_value': 'Third-party audit',
        'target_norm_code': 'S-SUPPLY-002',
        'target_norm_value': 'Factory audit',
        'equivalence_factor': 0.8,
        'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: Third-party audit covers similar security review scope.',
        'justification': 'External audit provides independent security verification.',
        'is_active': True
    },
    # ERC-7512 Audit Reports (SCA03) implies audit performed
    {
        'source_norm_code': 'SCA03',
        'source_norm_value': 'ERC-7512 Audit Reports',
        'target_norm_code': 'S78',
        'target_norm_value': 'Third-party audit',
        'equivalence_factor': 1.0,
        'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: On-chain audit reports prove third-party audit completion.',
        'justification': 'ERC-7512 standardizes audit report storage on-chain.',
        'is_active': True
    },
    # Sign-In with Ethereum (S256) implies Ethereum support
    {
        'source_norm_code': 'S256',
        'source_norm_value': 'EIP-4361 Sign-In with Ethereum',
        'target_norm_code': 'CHAIN003',
        'target_norm_value': 'Ethereum Mainnet',
        'equivalence_factor': 0.9,
        'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: Sign-In with Ethereum requires Ethereum wallet support.',
        'justification': 'EIP-4361 is built on Ethereum ecosystem.',
        'is_active': True
    },
]

# Insert new equivalences
print("\nInserting correct equivalence rules...")
success = 0
failed = 0

for eq in CORRECT_EQUIVALENCES:
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/norm_equivalences",
        json=eq,
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        timeout=30
    )
    if resp.status_code in [200, 201]:
        print(f"  [OK] {eq['source_norm_code']} -> {eq['target_norm_code']}")
        success += 1
    else:
        print(f"  [X] {eq['source_norm_code']} -> {eq['target_norm_code']}: {resp.status_code}")
        print(f"      {resp.text[:100]}")
        failed += 1

print(f"\nDone! Success: {success}, Failed: {failed}")
