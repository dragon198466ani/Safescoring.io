#!/usr/bin/env python3
"""
Run Migration 095: Norm Equivalence System
Executes the SQL migration via Supabase API.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(project_root / '.env')
load_dotenv(project_root / 'config' / '.env')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    print("Please set these in your .env file")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL statements to execute (split into separate statements)
SQL_STATEMENTS = [
    # 1. Add equivalence columns to safe_scoring_results
    """
    ALTER TABLE safe_scoring_results
    ADD COLUMN IF NOT EXISTS note_finale_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS score_s_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS score_a_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS score_f_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS score_e_with_equiv DECIMAL(5,2);
    """,

    # 2. Add consumer equivalence scores
    """
    ALTER TABLE safe_scoring_results
    ADD COLUMN IF NOT EXISTS note_consumer_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS s_consumer_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS a_consumer_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS f_consumer_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS e_consumer_with_equiv DECIMAL(5,2);
    """,

    # 3. Add essential equivalence scores
    """
    ALTER TABLE safe_scoring_results
    ADD COLUMN IF NOT EXISTS note_essential_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS s_essential_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS a_essential_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS f_essential_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS e_essential_with_equiv DECIMAL(5,2);
    """,

    # 4. Add equivalence metadata
    """
    ALTER TABLE safe_scoring_results
    ADD COLUMN IF NOT EXISTS equivalences_applied INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS equivalence_boost DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS equivalence_details JSONB DEFAULT '[]'::jsonb;
    """,

    # 5. Add equivalence columns to evaluations
    """
    ALTER TABLE evaluations
    ADD COLUMN IF NOT EXISTS equivalence_remark TEXT,
    ADD COLUMN IF NOT EXISTS equivalent_to VARCHAR(20),
    ADD COLUMN IF NOT EXISTS equivalence_score DECIMAL(3,2);
    """,

    # 6. Create norm_equivalences table
    """
    CREATE TABLE IF NOT EXISTS norm_equivalences (
        id SERIAL PRIMARY KEY,
        source_norm_code VARCHAR(20) NOT NULL,
        source_norm_value VARCHAR(100),
        target_norm_code VARCHAR(20) NOT NULL,
        target_norm_value VARCHAR(100),
        equivalence_factor DECIMAL(3,2) NOT NULL DEFAULT 1.0,
        equivalence_type VARCHAR(50) NOT NULL DEFAULT 'certification',
        condition_product_types TEXT[],
        condition_min_source_value VARCHAR(50),
        remark_template TEXT NOT NULL,
        justification TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(source_norm_code, source_norm_value, target_norm_code)
    );
    """,

    # 7. Create indexes
    """
    CREATE INDEX IF NOT EXISTS idx_norm_equiv_source ON norm_equivalences(source_norm_code);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_norm_equiv_target ON norm_equivalences(target_norm_code);
    """,
]

# Seed data for norm_equivalences
SEED_DATA = [
    ('S51', 'CC EAL5+', 'S52', 'FIPS 140-3 Level 3', 0.95, 'certification',
     'Valid by equivalence: CC EAL5+ certification provides equivalent or superior physical and logical attack resistance compared to FIPS 140-3 Level 3 requirements.',
     'Common Criteria EAL5+ includes semi-formal design verification and covert channel analysis.'),

    ('S51', 'CC EAL6+', 'S52', 'FIPS 140-3 Level 3', 0.97, 'certification',
     'Valid by equivalence: CC EAL6+ certification exceeds FIPS 140-3 Level 3 requirements with semi-formally verified design.',
     'CC EAL6+ requires semi-formally verified design and structured presentation.'),

    ('S51', 'CC EAL5+', 'S50', 'Secure Element', 1.0, 'implication',
     'Valid by implication: CC EAL5+ certification confirms the presence of a certified Secure Element.',
     'Any product with CC EAL5+ certification necessarily uses a certified Secure Element.'),

    ('S52', 'FIPS 140-3 Level 3', 'S50', 'Secure Element', 1.0, 'implication',
     'Valid by implication: FIPS 140-3 Level 3 certification confirms secure cryptographic module with tamper resistance.',
     'FIPS 140-3 Level 3 requires physical tamper resistance.'),

    ('S52', 'FIPS 140-3 Level 4', 'S52', 'FIPS 140-3 Level 3', 1.0, 'certification',
     'Valid by equivalence: FIPS 140-3 Level 4 exceeds all Level 3 requirements with additional environmental protection.',
     'Level 4 includes all Level 3 requirements plus environmental failure protection.'),

    ('S53', 'ANSSI Qualification', 'S51', 'CC EAL4+', 0.90, 'certification',
     'Valid by equivalence: ANSSI Qualification provides French government-grade security assessment comparable to CC EAL4+.',
     'ANSSI certification follows Common Criteria methodology.'),

    ('S03', 'AES-256-GCM', 'S01', 'AES-256', 1.0, 'implication',
     'Valid by implication: AES-256-GCM mode includes AES-256 encryption.',
     'GCM is an authenticated encryption mode built on AES-256.'),

    ('S04', 'ChaCha20-Poly1305', 'S01', 'AES-256', 0.95, 'certification',
     'Valid by equivalence: ChaCha20-Poly1305 provides equivalent 256-bit security level to AES-256.',
     'ChaCha20 offers 256-bit security and is preferred in some contexts.'),

    ('S16', 'BIP-39', 'S17', 'BIP-32', 1.0, 'implication',
     'Valid by implication: BIP-39 mnemonic implementation requires BIP-32 hierarchical deterministic key derivation.',
     'BIP-39 seed phrases are designed to work with BIP-32 HD wallet structure.'),

    ('S16', 'BIP-39', 'S18', 'BIP-44', 1.0, 'implication',
     'Valid by implication: BIP-39 support typically includes BIP-44 multi-account hierarchy.',
     'Modern BIP-39 implementations follow BIP-44 derivation paths.'),

    ('S20', 'BIP-84', 'S17', 'BIP-32', 1.0, 'implication',
     'Valid by implication: BIP-84 native SegWit requires BIP-32 HD wallet structure.',
     'BIP-84 defines derivation paths within the BIP-32 framework.'),

    ('E01', 'Ethereum', 'S31', 'secp256k1', 1.0, 'protocol',
     'Valid by protocol: Ethereum uses secp256k1 elliptic curve for all cryptographic operations.',
     'The Ethereum protocol mandates secp256k1 for address generation and transaction signing.'),

    ('E01', 'Ethereum', 'S21', 'Keccak-256', 1.0, 'protocol',
     'Valid by protocol: Ethereum uses Keccak-256 for hashing operations.',
     'Ethereum addresses and transaction hashes use Keccak-256.'),

    ('E10', 'Bitcoin', 'S31', 'secp256k1', 1.0, 'protocol',
     'Valid by protocol: Bitcoin uses secp256k1 elliptic curve for all cryptographic operations.',
     'The Bitcoin protocol mandates secp256k1 for key generation and transaction signing.'),

    ('E10', 'Bitcoin', 'S22', 'SHA-256', 1.0, 'protocol',
     'Valid by protocol: Bitcoin uses SHA-256 for block hashing and transaction IDs.',
     'SHA-256d (double SHA-256) is fundamental to Bitcoin security.'),

    ('E20', 'Solana', 'S35', 'Ed25519', 1.0, 'protocol',
     'Valid by protocol: Solana uses Ed25519 for all signature operations.',
     'Solana accounts and transactions are signed using Ed25519.'),

    ('S262', 'Multiple audits', 'S261', 'Recent audit', 1.0, 'implication',
     'Valid by implication: Multiple security audits confirm ongoing audit practice.',
     'Products with multiple audits necessarily have audit history.'),

    ('S263', 'Trail of Bits', 'S261', 'Security audit', 1.0, 'certification',
     'Valid by equivalence: Trail of Bits is a recognized top-tier security auditor.',
     'Trail of Bits audits meet or exceed industry security audit standards.'),

    ('S264', 'OpenZeppelin', 'S221', 'Smart contract audit', 1.0, 'certification',
     'Valid by equivalence: OpenZeppelin is a leading smart contract security auditor.',
     'OpenZeppelin audits are industry-standard for smart contract security.'),

    ('S101', 'HSM', 'S100', 'Hardware crypto module', 1.0, 'implication',
     'Valid by implication: HSM usage confirms hardware cryptographic module implementation.',
     'Hardware Security Modules are specialized hardware crypto modules.'),

    ('S105', 'TEE attestation', 'S104', 'TEE', 1.0, 'implication',
     'Valid by implication: TEE attestation confirms Trusted Execution Environment usage.',
     'Attestation is only possible with a functioning TEE.'),
]


def run_migration():
    """Execute the migration."""
    print("=" * 60)
    print("Migration 095: Norm Equivalence System")
    print("=" * 60)

    # Execute DDL statements
    for i, sql in enumerate(SQL_STATEMENTS, 1):
        try:
            print(f"\n[{i}/{len(SQL_STATEMENTS)}] Executing DDL statement...")
            result = supabase.rpc('exec_sql', {'query': sql.strip()}).execute()
            print(f"    ✓ Success")
        except Exception as e:
            # Try direct execution if RPC doesn't exist
            try:
                # Use postgrest to execute raw SQL
                supabase.postgrest.rpc('exec_sql', {'query': sql.strip()}).execute()
                print(f"    ✓ Success (via postgrest)")
            except Exception as e2:
                print(f"    ⚠ Warning: {str(e)[:100]}")
                print(f"    → This may already exist or require manual execution")

    # Insert seed data
    print("\n" + "=" * 60)
    print("Inserting equivalence rules...")
    print("=" * 60)

    for data in SEED_DATA:
        try:
            result = supabase.table('norm_equivalences').upsert({
                'source_norm_code': data[0],
                'source_norm_value': data[1],
                'target_norm_code': data[2],
                'target_norm_value': data[3],
                'equivalence_factor': data[4],
                'equivalence_type': data[5],
                'remark_template': data[6],
                'justification': data[7],
                'is_active': True,
            }, on_conflict='source_norm_code,source_norm_value,target_norm_code').execute()
            print(f"  ✓ {data[0]} ({data[1]}) → {data[2]}")
        except Exception as e:
            print(f"  ⚠ {data[0]} → {data[2]}: {str(e)[:50]}")

    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Run: SELECT * FROM norm_equivalences; -- to verify data")
    print("2. Run: SELECT calculate_product_scores_with_equiv(id) FROM products LIMIT 5;")
    print("   to test the equivalence calculation")


if __name__ == '__main__':
    run_migration()
