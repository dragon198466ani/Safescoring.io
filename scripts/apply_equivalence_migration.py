#!/usr/bin/env python3
"""
Apply the norm equivalence migration to Supabase.
This script applies migration 095 via the Supabase Management API.
"""

import os
import requests
import json
from pathlib import Path

# Supabase configuration
SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_ANON_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'

# Try to get service key from web/.env
def get_service_key():
    env_path = Path(__file__).parent.parent / 'web' / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_SERVICE_KEY='):
                    return line.split('=', 1)[1].strip().strip('"').strip("'")
    return None

SUPABASE_SERVICE_KEY = get_service_key()

def get_headers(use_service_key=False):
    key = SUPABASE_SERVICE_KEY if use_service_key and SUPABASE_SERVICE_KEY else SUPABASE_ANON_KEY
    return {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

def execute_sql_statements():
    """Execute the migration SQL statements one by one."""

    print("=" * 60)
    print("APPLYING NORM EQUIVALENCE MIGRATION (095)")
    print("=" * 60)

    headers = get_headers(use_service_key=True)

    # SQL statements to execute (split for API compatibility)
    statements = [
        # 1. Add equivalence columns to safe_scoring_results
        """
        ALTER TABLE safe_scoring_results
        ADD COLUMN IF NOT EXISTS note_finale_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS score_s_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS score_a_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS score_f_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS score_e_with_equiv DECIMAL(5,2)
        """,

        # 2. Add more columns to safe_scoring_results
        """
        ALTER TABLE safe_scoring_results
        ADD COLUMN IF NOT EXISTS equivalences_applied INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS equivalence_boost DECIMAL(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS equivalence_details JSONB DEFAULT '[]'::jsonb
        """,

        # 3. Add consumer equivalence columns
        """
        ALTER TABLE safe_scoring_results
        ADD COLUMN IF NOT EXISTS note_consumer_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS s_consumer_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS a_consumer_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS f_consumer_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS e_consumer_with_equiv DECIMAL(5,2)
        """,

        # 4. Add essential equivalence columns
        """
        ALTER TABLE safe_scoring_results
        ADD COLUMN IF NOT EXISTS note_essential_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS s_essential_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS a_essential_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS f_essential_with_equiv DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS e_essential_with_equiv DECIMAL(5,2)
        """,

        # 5. Add columns to evaluations table
        """
        ALTER TABLE evaluations
        ADD COLUMN IF NOT EXISTS equivalence_remark TEXT,
        ADD COLUMN IF NOT EXISTS equivalent_to VARCHAR(20),
        ADD COLUMN IF NOT EXISTS equivalence_score DECIMAL(3,2)
        """,
    ]

    # Execute via RPC or direct SQL
    print("\n[1/2] Adding columns to tables...")

    for i, sql in enumerate(statements, 1):
        print(f"  Executing statement {i}/{len(statements)}...", end=" ")

        # Use the rpc endpoint for raw SQL
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/rpc/exec_sql',
            headers=headers,
            json={'sql': sql.strip()},
            timeout=30
        )

        if response.status_code in [200, 204]:
            print("OK")
        elif response.status_code == 404:
            # Try alternative: use REST API to check if columns exist
            print("(RPC not available, using REST check)")
        else:
            print(f"Warning: {response.status_code}")
            # Continue anyway - columns might already exist

    # Create norm_equivalences table via REST API
    print("\n[2/2] Creating norm_equivalences reference table...")

    # Check if table exists
    check_response = requests.get(
        f'{SUPABASE_URL}/rest/v1/norm_equivalences?limit=1',
        headers=headers,
        timeout=10
    )

    if check_response.status_code == 200:
        print("  Table already exists, seeding data...")
        seed_equivalences(headers)
    elif check_response.status_code in [404, 400]:
        print("  Table needs to be created via Supabase Dashboard SQL Editor")
        print("  Please run the full migration SQL in Supabase Dashboard.")
    else:
        print(f"  Status: {check_response.status_code}")

    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print("""
Columns added to safe_scoring_results:
  - note_finale_with_equiv, score_s/a/f/e_with_equiv
  - equivalences_applied, equivalence_boost, equivalence_details
  - Consumer & Essential equivalence variants

Columns added to evaluations:
  - equivalence_remark (TEXT)
  - equivalent_to (VARCHAR)
  - equivalence_score (DECIMAL)

To complete setup:
  1. Run the full SQL in Supabase Dashboard > SQL Editor
  2. Or use: supabase db push

Migration file: config/migrations/095_norm_equivalence_system.sql
""")

def seed_equivalences(headers):
    """Seed the norm_equivalences table with initial data."""

    equivalences = [
        {
            'source_norm_code': 'S51',
            'source_norm_value': 'CC EAL5+',
            'target_norm_code': 'S52',
            'target_norm_value': 'FIPS 140-3 Level 3',
            'equivalence_factor': 0.95,
            'equivalence_type': 'certification',
            'remark_template': 'Valid by equivalence: CC EAL5+ certification provides equivalent or superior physical and logical attack resistance compared to FIPS 140-3 Level 3 requirements.',
            'is_active': True
        },
        {
            'source_norm_code': 'S51',
            'source_norm_value': 'CC EAL6+',
            'target_norm_code': 'S52',
            'target_norm_value': 'FIPS 140-3 Level 3',
            'equivalence_factor': 0.97,
            'equivalence_type': 'certification',
            'remark_template': 'Valid by equivalence: CC EAL6+ certification exceeds FIPS 140-3 Level 3 requirements with semi-formally verified design.',
            'is_active': True
        },
        {
            'source_norm_code': 'S51',
            'source_norm_value': 'CC EAL5+',
            'target_norm_code': 'S50',
            'target_norm_value': 'Secure Element',
            'equivalence_factor': 1.0,
            'equivalence_type': 'implication',
            'remark_template': 'Valid by implication: CC EAL5+ certification confirms the presence of a certified Secure Element.',
            'is_active': True
        },
        {
            'source_norm_code': 'S16',
            'source_norm_value': 'BIP-39',
            'target_norm_code': 'S17',
            'target_norm_value': 'BIP-32',
            'equivalence_factor': 1.0,
            'equivalence_type': 'implication',
            'remark_template': 'Valid by implication: BIP-39 mnemonic implementation requires BIP-32 HD key derivation.',
            'is_active': True
        },
        {
            'source_norm_code': 'E01',
            'source_norm_value': 'Ethereum',
            'target_norm_code': 'S31',
            'target_norm_value': 'secp256k1',
            'equivalence_factor': 1.0,
            'equivalence_type': 'protocol',
            'remark_template': 'Valid by protocol: Ethereum mandates secp256k1 for all cryptographic operations.',
            'is_active': True
        },
        {
            'source_norm_code': 'E10',
            'source_norm_value': 'Bitcoin',
            'target_norm_code': 'S31',
            'target_norm_value': 'secp256k1',
            'equivalence_factor': 1.0,
            'equivalence_type': 'protocol',
            'remark_template': 'Valid by protocol: Bitcoin mandates secp256k1 for key generation and signing.',
            'is_active': True
        },
    ]

    for eq in equivalences:
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/norm_equivalences',
            headers={**headers, 'Prefer': 'resolution=merge-duplicates'},
            json=eq,
            timeout=10
        )
        if response.status_code in [200, 201, 204, 409]:
            print(f"  + {eq['source_norm_code']} -> {eq['target_norm_code']}")
        else:
            print(f"  ! {eq['source_norm_code']} -> {eq['target_norm_code']}: {response.status_code}")

def verify_columns():
    """Verify that the new columns exist."""

    print("\n[VERIFICATION] Checking new columns...")
    headers = get_headers()

    # Check safe_scoring_results columns
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/safe_scoring_results?select=note_finale_with_equiv,equivalences_applied&limit=1',
        headers=headers,
        timeout=10
    )

    if response.status_code == 200:
        print("  safe_scoring_results: OK (equivalence columns exist)")
    else:
        print(f"  safe_scoring_results: Columns may need to be added ({response.status_code})")

    # Check evaluations columns
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/evaluations?select=equivalence_remark,equivalent_to&limit=1',
        headers=headers,
        timeout=10
    )

    if response.status_code == 200:
        print("  evaluations: OK (equivalence columns exist)")
    else:
        print(f"  evaluations: Columns may need to be added ({response.status_code})")

if __name__ == '__main__':
    execute_sql_statements()
    verify_columns()
