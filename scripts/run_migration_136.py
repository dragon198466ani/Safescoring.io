#!/usr/bin/env python3
"""
Execute Migration 136: Community Evaluation Votes
Run this script to create the tables in Supabase.

Usage:
    python scripts/run_migration_136.py
"""

import os
import sys
import subprocess
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def load_env(filepath: Path) -> dict:
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

# Load environment
env = {}
env.update(load_env(project_root / '.env'))
env.update(load_env(project_root / 'config' / '.env'))

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_KEY')
DATABASE_URL = env.get('DATABASE_URL')

def run_via_psycopg2():
    """Execute SQL via psycopg2 (direct PostgreSQL connection)."""
    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'psycopg2-binary'], check=True)
        import psycopg2

    if not DATABASE_URL:
        # Build from Supabase URL
        # Typical format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
        print("DATABASE_URL not found. Please add it to .env")
        print("Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres")
        return False

    print(f"Connecting to database...")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()

        # Read migration file
        migration_path = project_root / 'config' / 'migrations' / '136_evaluation_community_votes.sql'
        with open(migration_path, 'r', encoding='utf-8') as f:
            sql = f.read()

        print(f"Executing migration (136_evaluation_community_votes.sql)...")
        cursor.execute(sql)

        # Verify tables
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('evaluation_votes', 'token_rewards', 'token_transactions', 'reward_config')
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()

        print("\n[OK] Migration 136 executed successfully!")
        print("\nTables created:")
        for table in tables:
            print(f"  - {table[0]}")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def run_via_supabase_api():
    """Try to execute via Supabase Management API (requires project setup)."""
    try:
        import requests
    except ImportError:
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'requests'], check=True)
        import requests

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase credentials not found in .env")
        return False

    # Try using the sql endpoint (requires exec_sql function)
    print("Attempting Supabase API execution...")

    # First, let's check if exec_sql exists
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }

    # Read migration
    migration_path = project_root / 'config' / 'migrations' / '136_evaluation_community_votes.sql'
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    response = requests.post(url, json={'query': sql}, headers=headers, timeout=60)

    if response.status_code == 200:
        print("[OK] Migration executed via Supabase API!")
        return True
    elif response.status_code == 404:
        print("exec_sql function not found. Using alternative method...")
        return False
    else:
        print(f"API Error: {response.status_code} - {response.text[:200]}")
        return False

def create_exec_sql_function():
    """Print instructions to create exec_sql function first."""
    sql = """
-- Run this FIRST in Supabase SQL Editor to enable API-based SQL execution:

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    EXECUTE query;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql TO service_role;
"""
    print("\n" + "="*60)
    print("OPTION 1: Create exec_sql function first")
    print("="*60)
    print(sql)

def print_manual_instructions():
    """Print manual execution instructions."""
    print("\n" + "="*60)
    print("OPTION 2: Manual execution in Supabase Dashboard")
    print("="*60)
    print("""
1. Open https://supabase.com/dashboard
2. Select your SafeScoring project
3. Go to SQL Editor (left menu)
4. Click "New Query"
5. Copy/paste the content of:
   config/migrations/136_evaluation_community_votes.sql
6. Click "Run"
""")

def main():
    print("="*60)
    print("SafeScoring - Migration 136 Executor")
    print("Community Evaluation Votes + Token Gamification")
    print("="*60 + "\n")

    # Try direct database connection first (most reliable)
    if DATABASE_URL or env.get('POSTGRES_PASSWORD'):
        if run_via_psycopg2():
            return

    # Try Supabase API
    if SUPABASE_URL and SUPABASE_KEY:
        if run_via_supabase_api():
            return

    # Fallback: print instructions
    print("\n⚠️  Automatic execution not available.")
    print("Please use one of these methods:\n")

    create_exec_sql_function()
    print_manual_instructions()

    print("\n" + "="*60)
    print("Migration file location:")
    print(f"  {project_root / 'config' / 'migrations' / '136_evaluation_community_votes.sql'}")
    print("="*60)

if __name__ == "__main__":
    main()
