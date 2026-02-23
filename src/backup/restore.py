#!/usr/bin/env python3
"""
SafeScoring Database Restore

Restores tables from a backup created by database_backup.py.

Usage:
    python -m backup.restore                          # Restore latest backup (dry-run)
    python -m backup.restore --confirm                # Restore latest backup (execute)
    python -m backup.restore --backup 20250223_120000 # Restore specific backup
    python -m backup.restore --tables products norms  # Restore specific tables
"""

import os
import sys
import json
import gzip
import time
import argparse
from datetime import datetime
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.config import SUPABASE_URL, SUPABASE_KEY
from core.database import get_db

DEFAULT_BACKUP_DIR = os.path.join(
    os.path.dirname(__file__), '..', '..', 'backups'
)


def find_latest_backup(backup_root: str) -> str:
    """Find the most recent backup directory."""
    if not os.path.exists(backup_root):
        return None

    entries = sorted(os.listdir(backup_root), reverse=True)
    for entry in entries:
        manifest_path = os.path.join(backup_root, entry, 'manifest.json')
        if os.path.exists(manifest_path):
            return entry

    return None


def load_backup_data(backup_dir: str, table_name: str) -> list:
    """Load data from a backup file (supports .json and .json.gz)."""
    # Try compressed first
    gz_path = None
    json_path = None

    for f in os.listdir(backup_dir):
        if f.startswith(table_name + '_'):
            if f.endswith('.json.gz'):
                gz_path = os.path.join(backup_dir, f)
            elif f.endswith('.json'):
                json_path = os.path.join(backup_dir, f)

    if gz_path:
        with gzip.open(gz_path, 'rt', encoding='utf-8') as f:
            return json.load(f)
    elif json_path:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    return None


def restore_table(db, table_name: str, records: list, batch_size: int = 100, dry_run: bool = True) -> dict:
    """
    Restore a single table from backup data.

    Uses upsert to avoid conflicts with existing data.
    """
    start = time.time()

    if dry_run:
        print(f"  [{table_name}] Would restore {len(records)} rows (dry-run)")
        return {
            'table': table_name,
            'rows': len(records),
            'status': 'dry-run',
            'duration_s': 0,
        }

    print(f"  [{table_name}] Restoring {len(records)} rows...", end=' ', flush=True)

    success = 0
    errors = 0

    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        result = db.insert(table_name, batch, upsert=True)
        if result is not None:
            success += len(batch)
        else:
            errors += len(batch)
        time.sleep(0.2)  # Rate limit protection

    duration = time.time() - start
    status = 'ok' if errors == 0 else f'{errors} errors'
    print(f"{success} ok, {errors} errors, {duration:.1f}s")

    return {
        'table': table_name,
        'rows': success,
        'errors': errors,
        'status': status,
        'duration_s': round(duration, 1),
    }


def run_restore(
    backup_id: str = None,
    tables: list = None,
    backup_root: str = None,
    dry_run: bool = True,
) -> dict:
    """
    Restore database from a backup.

    Args:
        backup_id: Backup timestamp directory name (None = latest)
        tables: Specific tables to restore (None = all from manifest)
        backup_root: Root backup directory
        dry_run: If True, only show what would happen
    """
    backup_root = backup_root or DEFAULT_BACKUP_DIR

    if not backup_id:
        backup_id = find_latest_backup(backup_root)
        if not backup_id:
            print("[ERROR] No backups found.")
            return {'error': 'No backups found'}

    backup_dir = os.path.join(backup_root, backup_id)
    manifest_path = os.path.join(backup_dir, 'manifest.json')

    if not os.path.exists(manifest_path):
        print(f"[ERROR] Backup not found: {backup_id}")
        return {'error': f'Backup not found: {backup_id}'}

    with open(manifest_path, 'r') as f:
        manifest = json.load(f)

    # Determine which tables to restore
    available_tables = [t['table'] for t in manifest['tables'] if t['rows'] > 0]
    if tables:
        target_tables = [t for t in tables if t in available_tables]
    else:
        target_tables = available_tables

    mode = "DRY-RUN" if dry_run else "LIVE RESTORE"
    print("=" * 60)
    print(f"SAFESCORING DATABASE RESTORE ({mode})")
    print(f"Backup: {backup_id}")
    print(f"Created: {manifest.get('created_at', 'unknown')}")
    print(f"Tables: {len(target_tables)}")
    if dry_run:
        print(f"\n  Add --confirm to execute the restore.")
    print("=" * 60)

    db = get_db()
    results = []

    for table_name in target_tables:
        records = load_backup_data(backup_dir, table_name)
        if records is None:
            print(f"  [{table_name}] No backup file found, skipping")
            continue

        result = restore_table(db, table_name, records, dry_run=dry_run)
        results.append(result)

    total_rows = sum(r['rows'] for r in results)
    print("\n" + "-" * 60)
    print(f"[DONE] {'Would restore' if dry_run else 'Restored'}: {total_rows:,} rows across {len(results)} tables")

    return {
        'backup_id': backup_id,
        'mode': mode,
        'results': results,
        'total_rows': total_rows,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='SafeScoring Database Restore')
    parser.add_argument('--backup', help='Backup ID (timestamp directory name)')
    parser.add_argument('--tables', nargs='+', help='Specific tables to restore')
    parser.add_argument('--output', help='Backup root directory')
    parser.add_argument('--confirm', action='store_true', help='Execute restore (default is dry-run)')

    args = parser.parse_args()

    run_restore(
        backup_id=args.backup,
        tables=args.tables,
        backup_root=args.output,
        dry_run=not args.confirm,
    )
