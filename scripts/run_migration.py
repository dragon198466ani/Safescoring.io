#!/usr/bin/env python3
"""
Run SQL migrations directly on Supabase PostgreSQL

Usage:
    python scripts/run_migration.py config/migrations/SAFE_POINTS_COMBINED.sql
    python scripts/run_migration.py --all  # Run all pending migrations
"""

import os
import sys
import subprocess
import re
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
project_root = Path(__file__).parent.parent
load_dotenv(project_root / '.env')
load_dotenv(project_root / 'config' / '.env')

# Get database URL from Supabase
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_DB_URL = os.getenv('SUPABASE_DB_URL') or os.getenv('DATABASE_URL')

# If no direct DB URL, construct from Supabase URL
if not SUPABASE_DB_URL and SUPABASE_URL:
    # Extract project ref from URL (e.g., https://xxxxx.supabase.co)
    match = re.search(r'https://([^.]+)\.supabase\.co', SUPABASE_URL)
    if match:
        project_ref = match.group(1)
        db_password = os.getenv('SUPABASE_DB_PASSWORD', '')
        if db_password:
            SUPABASE_DB_URL = f"postgresql://postgres.{project_ref}:{db_password}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"


def run_migration(sql_file: Path) -> bool:
    """Execute a SQL migration file."""
    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'psycopg2-binary'], check=True)
        import psycopg2

    if not SUPABASE_DB_URL:
        print("ERROR: No database URL found.")
        print("Set SUPABASE_DB_URL or DATABASE_URL in .env")
        print("Or set SUPABASE_DB_PASSWORD to auto-construct the URL")
        return False

    print(f"Reading: {sql_file.name}")
    sql_content = sql_file.read_text(encoding='utf-8')

    # Split by statements (handle multi-statement migrations)
    # Keep $$ blocks intact for functions
    statements = split_sql_statements(sql_content)

    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(SUPABASE_DB_URL)
        conn.autocommit = True
        cursor = conn.cursor()

        success_count = 0
        error_count = 0

        for i, stmt in enumerate(statements, 1):
            stmt = stmt.strip()
            if not stmt or stmt.startswith('--'):
                continue

            # Show progress
            preview = stmt[:60].replace('\n', ' ')
            print(f"  [{i}/{len(statements)}] {preview}...")

            try:
                cursor.execute(stmt)
                success_count += 1
            except psycopg2.Error as e:
                error_msg = str(e).split('\n')[0]
                # Ignore "already exists" errors
                if 'already exists' in error_msg.lower():
                    print(f"    (skipped - already exists)")
                    success_count += 1
                else:
                    print(f"    ERROR: {error_msg}")
                    error_count += 1

        cursor.close()
        conn.close()

        print(f"\nDone! {success_count} successful, {error_count} errors")
        return error_count == 0

    except psycopg2.Error as e:
        print(f"Connection error: {e}")
        return False


def split_sql_statements(sql: str) -> list:
    """Split SQL into statements, preserving $$ function blocks."""
    statements = []
    current = []
    in_dollar_quote = False
    lines = sql.split('\n')

    for line in lines:
        # Check for $$ blocks (function definitions)
        dollar_count = line.count('$$')
        if dollar_count % 2 == 1:
            in_dollar_quote = not in_dollar_quote

        current.append(line)

        # If we hit a semicolon and not in a $$ block, end statement
        if line.rstrip().endswith(';') and not in_dollar_quote:
            stmt = '\n'.join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []

    # Add any remaining content
    if current:
        stmt = '\n'.join(current).strip()
        if stmt:
            statements.append(stmt)

    return statements


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/run_migration.py <sql_file>")
        print("       python scripts/run_migration.py --all")
        sys.exit(1)

    migrations_dir = project_root / 'config' / 'migrations'

    if sys.argv[1] == '--all':
        # Run all migrations in order
        sql_files = sorted(migrations_dir.glob('*.sql'))
        print(f"Found {len(sql_files)} migration files\n")

        for sql_file in sql_files:
            print(f"\n{'='*60}")
            print(f"Migration: {sql_file.name}")
            print('='*60)
            run_migration(sql_file)
    else:
        # Run specific file
        sql_file = Path(sys.argv[1])
        if not sql_file.exists():
            # Try relative to migrations dir
            sql_file = migrations_dir / sys.argv[1]

        if not sql_file.exists():
            print(f"File not found: {sys.argv[1]}")
            sys.exit(1)

        success = run_migration(sql_file)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
