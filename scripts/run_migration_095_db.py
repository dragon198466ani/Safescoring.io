#!/usr/bin/env python3
"""
Run Migration 095: Norm Equivalence System
Uses the project's database module.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.database import SupabaseClient

# Initialize database client
db = SupabaseClient()

if not db.is_configured():
    print("ERROR: Supabase not configured")
    sys.exit(1)

print(f"Connected to: {db.url[:50]}...")

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
        'justification': 'Any product with CC EAL5+ uses a certified Secure Element.',
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
        'remark_template': 'Valid by equivalence: ANSSI Qualification provides French government-grade security.',
        'justification': 'ANSSI follows Common Criteria methodology.',
        'is_active': True
    },
    {
        'source_norm_code': 'S03', 'source_norm_value': 'AES-256-GCM',
        'target_norm_code': 'S01', 'target_norm_value': 'AES-256',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: AES-256-GCM includes AES-256 encryption.',
        'justification': 'GCM is built on AES-256.',
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
        'remark_template': 'Valid by implication: BIP-39 requires BIP-32 HD key derivation.',
        'justification': 'BIP-39 works with BIP-32 HD wallet structure.',
        'is_active': True
    },
    {
        'source_norm_code': 'S16', 'source_norm_value': 'BIP-39',
        'target_norm_code': 'S18', 'target_norm_value': 'BIP-44',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: BIP-39 includes BIP-44 multi-account.',
        'justification': 'Modern BIP-39 follows BIP-44 paths.',
        'is_active': True
    },
    {
        'source_norm_code': 'E01', 'source_norm_value': 'Ethereum',
        'target_norm_code': 'S31', 'target_norm_value': 'secp256k1',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Ethereum uses secp256k1.',
        'justification': 'Ethereum mandates secp256k1.',
        'is_active': True
    },
    {
        'source_norm_code': 'E01', 'source_norm_value': 'Ethereum',
        'target_norm_code': 'S21', 'target_norm_value': 'Keccak-256',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Ethereum uses Keccak-256.',
        'justification': 'Ethereum addresses use Keccak-256.',
        'is_active': True
    },
    {
        'source_norm_code': 'E10', 'source_norm_value': 'Bitcoin',
        'target_norm_code': 'S31', 'target_norm_value': 'secp256k1',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Bitcoin uses secp256k1.',
        'justification': 'Bitcoin mandates secp256k1.',
        'is_active': True
    },
    {
        'source_norm_code': 'E10', 'source_norm_value': 'Bitcoin',
        'target_norm_code': 'S22', 'target_norm_value': 'SHA-256',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Bitcoin uses SHA-256.',
        'justification': 'SHA-256d is fundamental to Bitcoin.',
        'is_active': True
    },
    {
        'source_norm_code': 'E20', 'source_norm_value': 'Solana',
        'target_norm_code': 'S35', 'target_norm_value': 'Ed25519',
        'equivalence_factor': 1.0, 'equivalence_type': 'protocol',
        'remark_template': 'Valid by protocol: Solana uses Ed25519.',
        'justification': 'Solana accounts use Ed25519.',
        'is_active': True
    },
    {
        'source_norm_code': 'S262', 'source_norm_value': 'Multiple audits',
        'target_norm_code': 'S261', 'target_norm_value': 'Recent audit',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: Multiple audits confirm audit practice.',
        'justification': 'Multiple audits means audit history exists.',
        'is_active': True
    },
    {
        'source_norm_code': 'S263', 'source_norm_value': 'Trail of Bits',
        'target_norm_code': 'S261', 'target_norm_value': 'Security audit',
        'equivalence_factor': 1.0, 'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: Trail of Bits is top-tier.',
        'justification': 'Trail of Bits audits meet industry standards.',
        'is_active': True
    },
    {
        'source_norm_code': 'S264', 'source_norm_value': 'OpenZeppelin',
        'target_norm_code': 'S221', 'target_norm_value': 'Smart contract audit',
        'equivalence_factor': 1.0, 'equivalence_type': 'certification',
        'remark_template': 'Valid by equivalence: OpenZeppelin is industry-leading.',
        'justification': 'OpenZeppelin audits are industry-standard.',
        'is_active': True
    },
    {
        'source_norm_code': 'S101', 'source_norm_value': 'HSM',
        'target_norm_code': 'S100', 'target_norm_value': 'Hardware crypto module',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: HSM confirms hardware crypto.',
        'justification': 'HSMs are hardware crypto modules.',
        'is_active': True
    },
    {
        'source_norm_code': 'S105', 'source_norm_value': 'TEE attestation',
        'target_norm_code': 'S104', 'target_norm_value': 'TEE',
        'equivalence_factor': 1.0, 'equivalence_type': 'implication',
        'remark_template': 'Valid by implication: TEE attestation confirms TEE.',
        'justification': 'Attestation requires a functioning TEE.',
        'is_active': True
    },
]


def run_migration():
    """Execute the migration."""
    print("=" * 60)
    print("Migration 095: Norm Equivalence System")
    print("=" * 60)

    # First, check if table exists by trying to select
    print("\nChecking if norm_equivalences table exists...")
    test = db.select('norm_equivalences', limit=1)

    if test is None:
        print("\n[!] Table 'norm_equivalences' does not exist!")
        print("\nPlease execute the DDL first in Supabase SQL Editor:")
        print("  1. Go to https://supabase.com/dashboard")
        print("  2. Open your project -> SQL Editor")
        print("  3. Copy and run the contents of:")
        print("     config/migrations/095_norm_equivalence_system.sql")
        print("\nThen run this script again to insert the data.")
        return False

    print("  [OK] Table exists")

    # Insert seed data
    print("\nInserting equivalence rules...")

    success = 0
    failed = 0

    for data in SEED_DATA:
        result = db.insert('norm_equivalences', data, upsert=True,
                          on_conflict='source_norm_code,source_norm_value,target_norm_code')
        if result:
            print(f"  [OK] {data['source_norm_code']} ({data['source_norm_value']}) -> {data['target_norm_code']}")
            success += 1
        else:
            print(f"  [X] {data['source_norm_code']} -> {data['target_norm_code']}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"Migration complete! Success: {success}, Failed: {failed}")
    print("=" * 60)

    # Verify data
    print("\nVerifying data...")
    data = db.select('norm_equivalences',
                     columns='source_norm_code,target_norm_code,equivalence_factor',
                     limit=5)
    if data:
        print(f"Found {len(data)} equivalence rules:")
        for row in data:
            print(f"  {row['source_norm_code']} -> {row['target_norm_code']} ({row['equivalence_factor']*100:.0f}%)")

    return True


if __name__ == '__main__':
    run_migration()
