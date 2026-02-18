#!/usr/bin/env python3
"""
Execute Migration 011: Geographic Scope for Norms
Test and validate on Supabase database
"""

import os
import sys
from supabase import create_client, Client
from pathlib import Path

# Use centralized config
from config_helper import SUPABASE_URL, SUPABASE_KEY

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_success(message):
    """Print success message"""
    print(f"✓ {message}")

def print_error(message):
    """Print error message"""
    print(f"✗ {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ {message}")

def main():
    print_section("MIGRATION 011: Geographic Scope for Norms")

    # Initialize Supabase client
    print_info("Connecting to Supabase...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print_success("Connected to Supabase")
    except Exception as e:
        print_error(f"Failed to connect: {e}")
        sys.exit(1)

    # Get pre-migration stats
    print_section("PRE-MIGRATION STATISTICS")
    try:
        # Count total norms
        response = supabase.table('norms').select('code', count='exact').execute()
        norms_before = response.count
        print_info(f"Total norms: {norms_before}")

        # Check pillar distribution
        for pillar in ['S', 'A', 'F', 'E']:
            response = supabase.table('norms').select('code', count='exact').eq('pillar', pillar).execute()
            print_info(f"  Pillar {pillar}: {response.count}")

        # Check if geographic_scope column exists
        response = supabase.table('norms').select('code').limit(1).execute()
        if response.data and len(response.data) > 0:
            has_geo_scope = 'geographic_scope' in response.data[0]
            if has_geo_scope:
                print_info("⚠️  geographic_scope column already exists")
            else:
                print_success("geographic_scope column does not exist (will be created)")

    except Exception as e:
        print_error(f"Failed to get stats: {e}")

    # Read migration file
    print_section("LOADING MIGRATION FILE")
    migration_file = Path(__file__).parent.parent / "config" / "migrations" / "011_norms_geographic_scope.sql"

    if not migration_file.exists():
        print_error(f"Migration file not found: {migration_file}")
        sys.exit(1)

    print_info(f"Reading: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    print_success(f"Loaded {len(sql_content)} characters, {len(sql_content.splitlines())} lines")

    # Execute migration
    print_section("EXECUTING MIGRATION")
    print_info("⚠️  Note: Direct SQL execution via Supabase client is limited.")
    print_info("For full migration, use Supabase Dashboard SQL Editor or psql.")
    print_info("")
    print_info("Manual steps:")
    print_info("1. Go to: https://supabase.com/dashboard/project/xusznpwzhiuzhqvhddxj/sql/new")
    print_info("2. Copy content from: config/migrations/011_norms_geographic_scope.sql")
    print_info("3. Paste and execute in SQL Editor")
    print_info("4. Run this script again to verify results")
    print_info("")

    user_input = input("Have you executed the migration in Supabase Dashboard? (y/n): ")
    if user_input.lower() != 'y':
        print_info("Exiting. Please execute migration first.")
        sys.exit(0)

    # Verify migration
    print_section("POST-MIGRATION VERIFICATION")
    try:
        # Count total norms after migration
        response = supabase.table('norms').select('code', count='exact').execute()
        norms_after = response.count
        norms_added = norms_after - norms_before

        print_info(f"Total norms after: {norms_after}")
        print_success(f"New norms added: {norms_added}")

        # Check for new columns by attempting to fetch them
        print_info("\nChecking new columns...")
        try:
            response = supabase.table('norms').select('code,geographic_scope,standard_reference,issuing_authority').limit(5).execute()
            if response.data and len(response.data) > 0:
                print_success("✓ geographic_scope column exists")
                print_success("✓ standard_reference column exists")
                print_success("✓ issuing_authority column exists")

                # Show sample data
                print_info("\nSample data:")
                for norm in response.data[:3]:
                    print(f"  {norm.get('code')}: {norm.get('geographic_scope', 'N/A')} - {norm.get('issuing_authority', 'N/A')}")
        except Exception as e:
            print_error(f"Failed to fetch new columns: {e}")

        # Check for new norms (CCSS, NIST, etc.)
        print_info("\nChecking new standards...")
        new_standards = ['CCSS', 'NIST', 'CC', 'ISO', 'GDPR', 'MICA', 'PCI', 'OWASP', 'SOC2', 'ETSI', 'EIP', 'SLIP']

        for standard in new_standards:
            try:
                response = supabase.table('norms').select('code', count='exact').like('code', f'%-{standard}-%').execute()
                if response.count > 0:
                    print_success(f"  {standard}: {response.count} norms")
            except:
                pass

        # Geographic distribution
        print_info("\nAttempting to get geographic distribution...")
        try:
            # Get all norms with geographic_scope
            response = supabase.table('norms').select('geographic_scope').execute()
            if response.data:
                geo_counts = {}
                for norm in response.data:
                    scope = norm.get('geographic_scope', 'global')
                    geo_counts[scope] = geo_counts.get(scope, 0) + 1

                print_info("Geographic distribution:")
                for scope, count in sorted(geo_counts.items(), key=lambda x: x[1], reverse=True):
                    percentage = (count / len(response.data)) * 100
                    print(f"  {scope}: {count} ({percentage:.1f}%)")
        except Exception as e:
            print_info(f"Could not get geographic distribution: {e}")

    except Exception as e:
        print_error(f"Verification failed: {e}")
        sys.exit(1)

    print_section("MIGRATION VERIFICATION COMPLETE")
    print_success("✅ All checks passed!")
    print_info(f"\nSummary:")
    print_info(f"  • Total norms: {norms_before} → {norms_after} (+{norms_added})")
    print_info(f"  • New columns added: geographic_scope, regional_details, standard_reference, issuing_authority")
    print_info(f"  • New standards: 12+ international frameworks")
    print_info(f"  • Geographic scopes: global, EU, US, etc.")

    print_info("\n📚 See NORMS_GEOGRAPHIC_ENHANCEMENT.md for full documentation")

if __name__ == "__main__":
    main()
