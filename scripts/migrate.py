#!/usr/bin/env python3
"""
SafeScoring Migration Runner

Usage:
  python scripts/migrate.py                    # Apply all pending migrations
  python scripts/migrate.py --status           # Show migration status
  python scripts/migrate.py --file 050_xxx.sql # Apply specific migration
  python scripts/migrate.py --dry-run          # Show what would be applied

Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment
"""

import os
import sys
import hashlib
import time
import argparse
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from supabase import create_client
except ImportError:
    print("Install: pip install supabase")
    sys.exit(1)

MIGRATIONS_DIR = Path(__file__).parent.parent / "config" / "migrations"

def get_supabase():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    return create_client(url, key)

def get_checksum(filepath):
    """MD5 checksum of migration file."""
    return hashlib.md5(filepath.read_bytes()).hexdigest()

def get_migration_files():
    """Get sorted list of .sql files from migrations dir."""
    if not MIGRATIONS_DIR.exists():
        print(f"ERROR: Migrations directory not found: {MIGRATIONS_DIR}")
        sys.exit(1)
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    return [f for f in files if f.name != "RUN_ALL_NARRATIVE_TABLES.sql"]

def get_applied_migrations(supabase):
    """Get set of already-applied migration filenames."""
    try:
        result = supabase.table("_migration_log").select("migration_file").execute()
        return {row["migration_file"] for row in (result.data or [])}
    except Exception:
        # Table doesn't exist yet - that's ok
        return set()

def apply_migration(supabase, filepath, dry_run=False):
    """Apply a single migration file."""
    sql = filepath.read_text(encoding="utf-8")
    checksum = get_checksum(filepath)

    if dry_run:
        print(f"  [DRY RUN] Would apply: {filepath.name} ({len(sql)} bytes, md5:{checksum[:8]})")
        return True

    print(f"  Applying: {filepath.name} ({len(sql)} bytes)...", end=" ", flush=True)
    start = time.time()

    try:
        supabase.rpc("exec_sql", {"sql_text": sql}).execute()
        elapsed_ms = int((time.time() - start) * 1000)

        # Record in migration log
        try:
            supabase.rpc("record_migration", {
                "p_file": filepath.name,
                "p_checksum": checksum,
                "p_execution_time_ms": elapsed_ms,
            }).execute()
        except Exception:
            # If record_migration doesn't exist yet (first run), insert directly
            supabase.table("_migration_log").insert({
                "migration_file": filepath.name,
                "checksum": checksum,
                "execution_time_ms": elapsed_ms,
            }).execute()

        print(f"OK ({elapsed_ms}ms)")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False

def show_status(supabase):
    """Show status of all migrations."""
    applied = get_applied_migrations(supabase)
    files = get_migration_files()

    print(f"\n{'Migration File':<60} {'Status':<10} {'Applied At'}")
    print("-" * 100)

    pending = 0
    for f in files:
        if f.name in applied:
            # Get details
            try:
                result = supabase.table("_migration_log")\
                    .select("applied_at")\
                    .eq("migration_file", f.name)\
                    .single()\
                    .execute()
                at = result.data.get("applied_at", "")[:19] if result.data else ""
            except Exception:
                at = ""
            print(f"  {f.name:<58} {'Applied':<10} {at}")
        else:
            print(f"  {f.name:<58} {'Pending':<10}")
            pending += 1

    print(f"\nTotal: {len(files)} migrations, {len(files)-pending} applied, {pending} pending")

def main():
    parser = argparse.ArgumentParser(description="SafeScoring Migration Runner")
    parser.add_argument("--status", action="store_true", help="Show migration status")
    parser.add_argument("--file", type=str, help="Apply specific migration file")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be applied")
    parser.add_argument("--force", action="store_true", help="Re-apply even if already applied")
    args = parser.parse_args()

    supabase = get_supabase()

    if args.status:
        show_status(supabase)
        return

    if args.file:
        filepath = MIGRATIONS_DIR / args.file
        if not filepath.exists():
            print(f"ERROR: File not found: {filepath}")
            sys.exit(1)
        apply_migration(supabase, filepath, args.dry_run)
        return

    # Apply all pending migrations
    applied = get_applied_migrations(supabase)
    files = get_migration_files()
    pending = [f for f in files if f.name not in applied or args.force]

    if not pending:
        print("All migrations already applied!")
        return

    print(f"\n{len(pending)} pending migrations to apply:\n")

    success = 0
    failed = 0
    for f in pending:
        if apply_migration(supabase, f, args.dry_run):
            success += 1
        else:
            failed += 1
            if not args.force:
                print("\nStopping due to failure. Use --force to continue past errors.")
                break

    print(f"\n{'Dry run' if args.dry_run else 'Done'}: {success} applied, {failed} failed, {len(files)-success-failed} remaining")

if __name__ == "__main__":
    main()
