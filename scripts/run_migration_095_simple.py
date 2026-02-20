#!/usr/bin/env python3
"""
Run Migration 095: Norm Equivalence System
Simple version using requests directly.
"""

import os
import sys
import json
import requests
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables manually
def load_env(filepath):
    """Load .env file."""
    env_vars = {}
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

# Load all .env files
env = {}
env.update(load_env(project_root / '.env'))
env.update(load_env(project_root / 'config' / '.env'))

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    print(f"Checked: {project_root / '.env'}, {project_root / 'config' / '.env'}")
    sys.exit(1)

print(f"Supabase URL: {SUPABASE_URL[:50]}...")


def execute_sql(sql):
    """Execute SQL via Supabase REST API."""
    # Use the RPC endpoint for executing SQL
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    response = requests.post(url, json={'query': sql}, headers=headers)
    return response


def insert_equivalence(data):
    """Insert or update equivalence rule."""
    url = f"{SUPABASE_URL}/rest/v1/norm_equivalences"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }
    response = requests.post(url, json=data, headers=headers)
    return response


# Seed data for norm_equivalences
SEED_DATA = [
    {
        'source_norm_code': 'S51', 'source_norm_value': 'CC EAL5+',
        'target_norm_code': 'S52', 'target_norm_value': 'FIPS 140-3 Level 3',
        'equivalence_factor': 0.95, 'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: CC EAL5+ certification provides equivalent or superior physical and logical attack resistance compared to FIPS 140-3 Level 3 requirements.',
        'justification': 'Common Criteria EAL5+ includes semi-formal design verification.',
        'is_active': True
    },
    {
        'source_norm_code': 'S51', 'source_norm_value': 'CC EAL6+',
        'target_norm_code': 'S52', 'target_norm_value': 'FIPS 140-3 Level 3',
        'equivalence_factor': 0.97, 'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: CC EAL6+ certification exceeds FIPS 140-3 Level 3 requirements.',
        'justification': 'CC EAL6+ requires semi-formally verified design.',
        'is_active': True
    },
    {
        'source_norm_code': 'S51', 'source_norm_value': 'CC EAL5+',
        'target_norm_code': 'S50', 'target_norm_value': 'Secure Element',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: CC EAL5+ certification confirms the presence of a certified Secure Element.',
        'justification': 'Any product with CC EAL5+ certification uses a certified Secure Element.',
        'is_active': True
    },
    {
        'source_norm_code': 'S52', 'source_norm_value': 'FIPS 140-3 Level 3',
        'target_norm_code': 'S50', 'target_norm_value': 'Secure Element',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: FIPS 140-3 Level 3 confirms secure cryptographic module.',
        'justification': 'FIPS 140-3 Level 3 requires physical tamper resistance.',
        'is_active': True
    },
    {
        'source_norm_code': 'S53', 'source_norm_value': 'ANSSI Qualification',
        'target_norm_code': 'S51', 'target_norm_value': 'CC EAL4+',
        'equivalence_factor': 0.90, 'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: ANSSI Qualification provides French government-grade security assessment.',
        'justification': 'ANSSI certification follows Common Criteria methodology.',
        'is_active': True
    },
    {
        'source_norm_code': 'S03', 'source_norm_value': 'AES-256-GCM',
        'target_norm_code': 'S01', 'target_norm_value': 'AES-256',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: AES-256-GCM mode includes AES-256 encryption.',
        'justification': 'GCM is an authenticated encryption mode built on AES-256.',
        'is_active': True
    },
    {
        'source_norm_code': 'S04', 'source_norm_value': 'ChaCha20-Poly1305',
        'target_norm_code': 'S01', 'target_norm_value': 'AES-256',
        'equivalence_factor': 0.95, 'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: ChaCha20-Poly1305 provides equivalent 256-bit security.',
        'justification': 'ChaCha20 offers 256-bit security.',
        'is_active': True
    },
    {
        'source_norm_code': 'S16', 'source_norm_value': 'BIP-39',
        'target_norm_code': 'S17', 'target_norm_value': 'BIP-32',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: BIP-39 mnemonic requires BIP-32 HD key derivation.',
        'justification': 'BIP-39 seed phrases work with BIP-32 HD wallet structure.',
        'is_active': True
    },
    {
        'source_norm_code': 'S16', 'source_norm_value': 'BIP-39',
        'target_norm_code': 'S18', 'target_norm_value': 'BIP-44',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: BIP-39 includes BIP-44 multi-account hierarchy.',
        'justification': 'Modern BIP-39 implementations follow BIP-44 paths.',
        'is_active': True
    },
    {
        'source_norm_code': 'E01', 'source_norm_value': 'Ethereum',
        'target_norm_code': 'S31', 'target_norm_value': 'secp256k1',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Ethereum uses secp256k1 for all crypto operations.',
        'justification': 'Ethereum protocol mandates secp256k1.',
        'is_active': True
    },
    {
        'source_norm_code': 'E01', 'source_norm_value': 'Ethereum',
        'target_norm_code': 'S21', 'target_norm_value': 'Keccak-256',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Ethereum uses Keccak-256 for hashing.',
        'justification': 'Ethereum addresses use Keccak-256.',
        'is_active': True
    },
    {
        'source_norm_code': 'E10', 'source_norm_value': 'Bitcoin',
        'target_norm_code': 'S31', 'target_norm_value': 'secp256k1',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Bitcoin uses secp256k1 for all crypto operations.',
        'justification': 'Bitcoin protocol mandates secp256k1.',
        'is_active': True
    },
    {
        'source_norm_code': 'E10', 'source_norm_value': 'Bitcoin',
        'target_norm_code': 'S22', 'target_norm_value': 'SHA-256',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Bitcoin uses SHA-256 for block hashing.',
        'justification': 'SHA-256d is fundamental to Bitcoin security.',
        'is_active': True
    },
    {
        'source_norm_code': 'E20', 'source_norm_value': 'Solana',
        'target_norm_code': 'S35', 'target_norm_value': 'Ed25519',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Solana uses Ed25519 for signatures.',
        'justification': 'Solana accounts use Ed25519.',
        'is_active': True
    },
    {
        'source_norm_code': 'S262', 'source_norm_value': 'Multiple audits',
        'target_norm_code': 'S261', 'target_norm_value': 'Recent audit',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: Multiple audits confirm ongoing audit practice.',
        'justification': 'Multiple audits means audit history exists.',
        'is_active': True
    },
    {
        'source_norm_code': 'S263', 'source_norm_value': 'Trail of Bits',
        'target_norm_code': 'S261', 'target_norm_value': 'Security audit',
        'equivalence_factor': 1.0, 'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: Trail of Bits is a top-tier security auditor.',
        'justification': 'Trail of Bits audits meet industry standards.',
        'is_active': True
    },
    {
        'source_norm_code': 'S264', 'source_norm_value': 'OpenZeppelin',
        'target_norm_code': 'S221', 'target_norm_value': 'Smart contract audit',
        'equivalence_factor': 1.0, 'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: OpenZeppelin is a leading smart contract auditor.',
        'justification': 'OpenZeppelin audits are industry-standard.',
        'is_active': True
    },
    {
        'source_norm_code': 'S101', 'source_norm_value': 'HSM',
        'target_norm_code': 'S100', 'target_norm_value': 'Hardware crypto module',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: HSM confirms hardware crypto module.',
        'justification': 'HSMs are specialized hardware crypto modules.',
        'is_active': True
    },
    {
        'source_norm_code': 'S105', 'source_norm_value': 'TEE attestation',
        'target_norm_code': 'S104', 'target_norm_value': 'TEE',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: TEE attestation confirms TEE usage.',
        'justification': 'Attestation requires a functioning TEE.',
        'is_active': True
    },
]


def run_migration():
    """Execute the migration."""
    print("=" * 60)
    print("Migration 095: Norm Equivalence System")
    print("=" * 60)

    # Insert seed data
    print("\nInserting equivalence rules...")

    success = 0
    failed = 0

    for data in SEED_DATA:
        response = insert_equivalence(data)
        if response.status_code in [200, 201]:
            print(f"  [OK] {data['source_norm_code']} ({data['source_norm_value']}) -> {data['target_norm_code']}")
            success += 1
        elif response.status_code == 409:
            print(f"  [~] {data['source_norm_code']} -> {data['target_norm_code']} (already exists)")
            success += 1
        else:
            print(f"  [X] {data['source_norm_code']} -> {data['target_norm_code']}: {response.status_code}")
            if response.text:
                print(f"    Error: {response.text[:100]}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"Migration complete! Success: {success}, Failed: {failed}")
    print("=" * 60)

    # Verify data
    print("\nVerifying data...")
    url = f"{SUPABASE_URL}/rest/v1/norm_equivalences?select=source_norm_code,target_norm_code,equivalence_factor&limit=5"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data)} equivalence rules in database:")
        for row in data:
            print(f"  {row['source_norm_code']} -> {row['target_norm_code']} ({row['equivalence_factor']*100:.0f}%)")
    else:
        print(f"Could not verify: {response.status_code}")
        print(f"Note: The norm_equivalences table may need to be created first.")
        print(f"Run the DDL from config/migrations/095_norm_equivalence_system.sql in Supabase SQL Editor.")


if __name__ == '__main__':
    run_migration()
