#!/usr/bin/env python3
"""
Migration 076 Runner: Norms Schema Cleanup

Removes unused columns and consolidates redundant fields in the norms table.

BEFORE: 31 columns
AFTER:  ~22 columns

Removed (unused):
- classification_method
- classification_date
- official_scraped_at
- crypto_relevance
- regional_details

Consolidated:
- summary_source, summary_verified, summary_needs_regen, summary_regen_date -> summary_status
- is_legacy, cleanup_action, cleanup_date, scope_type, verification_status -> norm_status

Usage:
    python scripts/run_migration_076.py [--dry-run]
"""

import os
import sys
import argparse
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def get_current_columns():
    """Get list of current columns in norms table."""
    headers = get_headers()
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=*&limit=1',
        headers=headers
    )
    if r.status_code == 200 and r.json():
        return list(r.json()[0].keys())
    return []

def get_norm_count():
    """Get total norm count."""
    headers = get_headers()
    headers['Prefer'] = 'count=exact'
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=id',
        headers=headers
    )
    return int(r.headers.get('content-range', '0/0').split('/')[-1])

def check_column_exists(column_name):
    """Check if a column exists."""
    columns = get_current_columns()
    return column_name in columns

def pre_migration_stats():
    """Show pre-migration statistics."""
    log("=" * 60)
    log("PRE-MIGRATION STATISTICS")
    log("=" * 60)

    columns = get_current_columns()
    log(f"Current column count: {len(columns)}")
    log(f"Total norms: {get_norm_count()}")

    # List columns to be removed
    to_remove = [
        'classification_method', 'classification_date', 'official_scraped_at',
        'crypto_relevance', 'regional_details', 'summary_source', 'summary_verified',
        'summary_needs_regen', 'summary_regen_date', 'is_legacy', 'cleanup_action',
        'cleanup_date', 'scope_type', 'verification_status'
    ]

    existing_to_remove = [c for c in to_remove if c in columns]
    log(f"\nColumns to remove: {len(existing_to_remove)}")
    for col in existing_to_remove:
        log(f"  - {col}")

    new_columns = ['summary_status', 'norm_status']
    existing_new = [c for c in new_columns if c in columns]
    log(f"\nNew columns (already exist): {len(existing_new)}")

    return columns

def run_migration(dry_run=False):
    """Execute the migration."""
    log("=" * 60)
    log("MIGRATION 076: NORMS SCHEMA CLEANUP")
    log("=" * 60)

    if dry_run:
        log("DRY RUN MODE - No changes will be made")

    # Pre-migration stats
    pre_columns = pre_migration_stats()

    if dry_run:
        log("\n[DRY RUN] Would execute migration SQL...")
        log("[DRY RUN] Migration file: config/migrations/076_norms_schema_cleanup.sql")
        return

    # Read and execute SQL migration
    sql_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'migrations', '076_norms_schema_cleanup.sql')

    if not os.path.exists(sql_path):
        log(f"ERROR: Migration file not found: {sql_path}")
        sys.exit(1)

    log("\nExecuting migration...")
    log("NOTE: Run this SQL directly in Supabase SQL Editor for full DDL support")
    log(f"File: {sql_path}")

    # For column drops and DDL, we need to use Supabase SQL Editor
    # This script will do the data migration parts via REST API

    headers = get_headers()

    # Step 1: Add new columns if they don't exist (via PATCH workaround)
    log("\nStep 1: Checking new columns...")

    if not check_column_exists('summary_status'):
        log("  summary_status column needs to be added via SQL Editor")
    else:
        log("  summary_status already exists")

    if not check_column_exists('norm_status'):
        log("  norm_status column needs to be added via SQL Editor")
    else:
        log("  norm_status already exists")

    # Step 2: Migrate data to new columns
    log("\nStep 2: Migrating data to new columns...")

    # Get all norms
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?select=id,summary_source,summary_verified,summary_needs_regen,is_legacy,scope_type,verification_status,cleanup_action,official_doc_summary',
        headers=headers
    )

    if r.status_code != 200:
        log(f"ERROR: Failed to fetch norms: {r.status_code}")
        return

    norms = r.json()
    log(f"  Processing {len(norms)} norms...")

    updated = 0
    for norm in norms:
        # Calculate new status values
        summary_status = 'pending'
        if norm.get('summary_verified'):
            summary_status = 'verified'
        elif norm.get('summary_source') in ['scraped', 'scraped_html']:
            summary_status = 'scraped'
        elif norm.get('summary_source') == 'fallback_ai':
            summary_status = 'ai_generated'
        elif norm.get('summary_needs_regen'):
            summary_status = 'pending'
        elif norm.get('official_doc_summary'):
            summary_status = 'ai_generated'

        norm_status = 'active'
        if norm.get('is_legacy'):
            norm_status = 'deprecated'
        elif norm.get('scope_type') == 'vendor_feature':
            norm_status = 'vendor_feature'
        elif norm.get('verification_status') == 'questionable':
            norm_status = 'questionable'
        elif norm.get('cleanup_action') == 'flagged_questionable':
            norm_status = 'questionable'

        # Update via PATCH
        update_data = {
            'summary_status': summary_status,
            'norm_status': norm_status
        }

        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/norms?id=eq.{norm["id"]}',
            headers={**headers, 'Prefer': 'return=minimal'},
            json=update_data
        )

        if r.status_code in [200, 204]:
            updated += 1

        if updated % 100 == 0:
            log(f"  Updated {updated}/{len(norms)}...")

    log(f"  Data migration complete: {updated} norms updated")

    # Step 3: Column drops need SQL Editor
    log("\nStep 3: Column drops...")
    log("  NOTE: DROP COLUMN requires SQL Editor access")
    log("  Execute the following in Supabase SQL Editor:")
    log("")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS classification_method;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS classification_date;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS official_scraped_at;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS crypto_relevance;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS regional_details;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS summary_source;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS summary_verified;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS summary_needs_regen;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS summary_regen_date;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS is_legacy;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS cleanup_action;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS cleanup_date;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS scope_type;")
    log("  ALTER TABLE norms DROP COLUMN IF EXISTS verification_status;")

    # Post-migration stats
    log("\n" + "=" * 60)
    log("POST-MIGRATION STATISTICS")
    log("=" * 60)
    post_columns = get_current_columns()
    log(f"Column count: {len(post_columns)} (was {len(pre_columns)})")

    # Check S-SC-TIMELOCK
    log("\nVerifying S-SC-TIMELOCK:")
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/norms?code=eq.S-SC-TIMELOCK&select=code,summary_status,norm_status',
        headers=headers
    )
    if r.status_code == 200 and r.json():
        n = r.json()[0]
        log(f"  code: {n.get('code')}")
        log(f"  summary_status: {n.get('summary_status')}")
        log(f"  norm_status: {n.get('norm_status')}")

def main():
    parser = argparse.ArgumentParser(description='Run Migration 076: Norms Schema Cleanup')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    args = parser.parse_args()

    run_migration(dry_run=args.dry_run)

if __name__ == '__main__':
    main()
