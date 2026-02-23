#!/usr/bin/env python3
"""
SafeScoring Database Backup

Dumps all critical Supabase tables to compressed JSON files.
Runs via cron (daily) or manually.

Usage:
    python -m backup.database_backup              # Full backup
    python -m backup.database_backup --tables products norms  # Specific tables
    python -m backup.database_backup --output /path/to/dir    # Custom output
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
from core.supabase_pagination import fetch_all


# Tables to backup with their pagination order column
BACKUP_TABLES = {
    'products': {
        'select': 'id,name,slug,url,type_id,logo_url,description,category,created_at',
        'order': 'id',
        'critical': True,
    },
    'product_types': {
        'select': '*',
        'order': 'id',
        'critical': True,
    },
    'product_type_mapping': {
        'select': '*',
        'order': 'product_id',
        'critical': True,
    },
    'norms': {
        'select': 'id,code,pillar,title,description,official_link,is_essential',
        'order': 'id',
        'critical': True,
    },
    'evaluations': {
        'select': 'id,product_id,norm_id,result,confidence,source,evaluated_at',
        'order': 'id',
        'critical': True,
    },
    'safe_scoring_results': {
        'select': '*',
        'order': 'product_id',
        'critical': True,
    },
    'safe_scoring_definitions': {
        'select': '*',
        'order': 'norm_id',
        'critical': True,
    },
    'norm_applicability': {
        'select': '*',
        'order': 'norm_id',
        'critical': True,
    },
    'score_history': {
        'select': '*',
        'order': 'id',
        'critical': False,
    },
    'security_incidents': {
        'select': '*',
        'order': 'id',
        'critical': False,
    },
}

# Default backup directory
DEFAULT_BACKUP_DIR = os.path.join(
    os.path.dirname(__file__), '..', '..', 'backups'
)


def backup_table(table_name: str, config: dict, output_dir: str, compress: bool = True) -> dict:
    """
    Backup a single table to a JSON file.

    Returns:
        dict with 'table', 'rows', 'file', 'size_bytes', 'duration_s'
    """
    start = time.time()
    print(f"  [{table_name}] Fetching...", end=' ', flush=True)

    try:
        records = fetch_all(
            table_name,
            select=config.get('select', '*'),
            order=config.get('order'),
            debug=False,
        )
    except Exception as e:
        print(f"ERROR: {e}")
        return {
            'table': table_name,
            'rows': 0,
            'file': None,
            'size_bytes': 0,
            'duration_s': time.time() - start,
            'error': str(e),
        }

    if not records:
        print(f"0 rows (empty or error)")
        return {
            'table': table_name,
            'rows': 0,
            'file': None,
            'size_bytes': 0,
            'duration_s': time.time() - start,
        }

    # Write to file
    timestamp = datetime.now().strftime('%Y%m%d')
    ext = '.json.gz' if compress else '.json'
    filename = f"{table_name}_{timestamp}{ext}"
    filepath = os.path.join(output_dir, filename)

    json_data = json.dumps(records, ensure_ascii=False, default=str)

    if compress:
        with gzip.open(filepath, 'wt', encoding='utf-8') as f:
            f.write(json_data)
    else:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(json_data)

    size = os.path.getsize(filepath)
    duration = time.time() - start
    print(f"{len(records)} rows, {size / 1024:.1f} KB, {duration:.1f}s")

    return {
        'table': table_name,
        'rows': len(records),
        'file': filepath,
        'size_bytes': size,
        'duration_s': duration,
    }


def run_backup(
    tables: list = None,
    output_dir: str = None,
    compress: bool = True,
    critical_only: bool = False,
) -> dict:
    """
    Run a full or partial database backup.

    Args:
        tables: List of table names to backup (None = all)
        output_dir: Output directory (None = default)
        compress: Gzip compress the output
        critical_only: Only backup tables marked as critical

    Returns:
        dict with 'timestamp', 'results', 'total_rows', 'total_size', 'duration'
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[ERROR] Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
        return {'error': 'Supabase not configured'}

    output_dir = output_dir or DEFAULT_BACKUP_DIR
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = os.path.join(output_dir, timestamp)
    os.makedirs(backup_dir, exist_ok=True)

    # Determine which tables to backup
    if tables:
        target_tables = {k: v for k, v in BACKUP_TABLES.items() if k in tables}
    elif critical_only:
        target_tables = {k: v for k, v in BACKUP_TABLES.items() if v.get('critical')}
    else:
        target_tables = BACKUP_TABLES

    print("=" * 60)
    print(f"SAFESCORING DATABASE BACKUP")
    print(f"Timestamp: {timestamp}")
    print(f"Output: {backup_dir}")
    print(f"Tables: {len(target_tables)}")
    print(f"Compress: {compress}")
    print("=" * 60)

    start = time.time()
    results = []

    for table_name, config in target_tables.items():
        result = backup_table(table_name, config, backup_dir, compress)
        results.append(result)
        time.sleep(0.3)  # Rate limit protection

    total_rows = sum(r['rows'] for r in results)
    total_size = sum(r['size_bytes'] for r in results)
    duration = time.time() - start

    # Write manifest
    manifest = {
        'timestamp': timestamp,
        'created_at': datetime.now().isoformat(),
        'tables': results,
        'total_rows': total_rows,
        'total_size_bytes': total_size,
        'duration_seconds': round(duration, 1),
        'compressed': compress,
    }

    manifest_path = os.path.join(backup_dir, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print("\n" + "-" * 60)
    print(f"[DONE] Backup complete:")
    print(f"  Tables: {len(results)}")
    print(f"  Total rows: {total_rows:,}")
    print(f"  Total size: {total_size / 1024:.1f} KB")
    print(f"  Duration: {duration:.1f}s")
    print(f"  Location: {backup_dir}")

    # Cleanup old backups (keep last 30 days)
    cleanup_old_backups(output_dir, keep_days=30)

    return manifest


def cleanup_old_backups(backup_root: str, keep_days: int = 30):
    """Remove backup directories older than keep_days."""
    if not os.path.exists(backup_root):
        return

    cutoff = time.time() - (keep_days * 86400)
    removed = 0

    for entry in os.listdir(backup_root):
        entry_path = os.path.join(backup_root, entry)
        if os.path.isdir(entry_path):
            if os.path.getmtime(entry_path) < cutoff:
                import shutil
                shutil.rmtree(entry_path, ignore_errors=True)
                removed += 1

    if removed:
        print(f"  [CLEANUP] Removed {removed} backups older than {keep_days} days")


def list_backups(output_dir: str = None) -> list:
    """List all available backups."""
    output_dir = output_dir or DEFAULT_BACKUP_DIR
    backups = []

    if not os.path.exists(output_dir):
        return backups

    for entry in sorted(os.listdir(output_dir), reverse=True):
        manifest_path = os.path.join(output_dir, entry, 'manifest.json')
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            backups.append(manifest)

    return backups


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='SafeScoring Database Backup')
    parser.add_argument('--tables', nargs='+', help='Specific tables to backup')
    parser.add_argument('--output', help='Output directory')
    parser.add_argument('--no-compress', action='store_true', help='Disable gzip compression')
    parser.add_argument('--critical-only', action='store_true', help='Only backup critical tables')
    parser.add_argument('--list', action='store_true', help='List available backups')

    args = parser.parse_args()

    if args.list:
        backups = list_backups(args.output)
        if not backups:
            print("No backups found.")
        else:
            print(f"Found {len(backups)} backups:\n")
            for b in backups:
                print(f"  {b['timestamp']} | {b['total_rows']:,} rows | {b['total_size_bytes']/1024:.1f} KB")
    else:
        run_backup(
            tables=args.tables,
            output_dir=args.output,
            compress=not args.no_compress,
            critical_only=args.critical_only,
        )
