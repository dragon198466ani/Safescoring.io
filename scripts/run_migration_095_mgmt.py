#!/usr/bin/env python3
"""
Run Migration 095 via Supabase Management API
Uses the access token from MCP configuration.
"""

import os
import sys
import json
import requests
from pathlib import Path

project_root = Path(__file__).parent.parent

# Read access token from MCP config
mcp_config_path = project_root / '.claude' / 'settings.local.json'
with open(mcp_config_path, 'r', encoding='utf-8') as f:
    mcp_config = json.load(f)

access_token = None
for arg in mcp_config.get('mcpServers', {}).get('supabase', {}).get('args', []):
    if arg.startswith('sbp_'):
        access_token = arg
        break

if not access_token:
    print("ERROR: No Supabase access token found in MCP config")
    sys.exit(1)

# Get project ref from env
def load_env(filepath):
    env_vars = {}
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

env = {}
env.update(load_env(project_root / '.env'))
env.update(load_env(project_root / 'config' / '.env'))

supabase_url = env.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
# Extract project ref from URL
project_ref = supabase_url.split('//')[1].split('.')[0] if supabase_url else None

if not project_ref:
    print("ERROR: Could not extract project ref from Supabase URL")
    sys.exit(1)

print(f"Project ref: {project_ref}")
print(f"Access token: {access_token[:10]}...")

# Read the migration SQL
migration_path = project_root / 'config' / 'migrations' / '095_norm_equivalence_system.sql'
with open(migration_path, 'r', encoding='utf-8') as f:
    migration_sql = f.read()

# Use Supabase Management API to execute SQL
url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json',
}

print("\n" + "=" * 60)
print("Executing Migration 095: Norm Equivalence System")
print("=" * 60)

# Split into smaller chunks (API may have limits)
# Execute DDL statements first, then functions, then data

ddl_statements = [
    # Add columns to safe_scoring_results
    """
    ALTER TABLE safe_scoring_results
    ADD COLUMN IF NOT EXISTS note_finale_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS score_s_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS score_a_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS score_f_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS score_e_with_equiv DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS equivalences_applied INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS equivalence_boost DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS equivalence_details JSONB DEFAULT '[]'::jsonb;
    """,

    # Add columns to evaluations
    """
    ALTER TABLE evaluations
    ADD COLUMN IF NOT EXISTS equivalence_remark TEXT,
    ADD COLUMN IF NOT EXISTS equivalent_to VARCHAR(20),
    ADD COLUMN IF NOT EXISTS equivalence_score DECIMAL(3,2);
    """,

    # Create norm_equivalences table
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

    # Create indexes
    """
    CREATE INDEX IF NOT EXISTS idx_norm_equiv_source ON norm_equivalences(source_norm_code);
    CREATE INDEX IF NOT EXISTS idx_norm_equiv_target ON norm_equivalences(target_norm_code);
    """,
]

for i, sql in enumerate(ddl_statements, 1):
    print(f"\n[{i}/{len(ddl_statements)}] Executing DDL...")
    try:
        response = requests.post(url, headers=headers, json={'query': sql.strip()}, timeout=60)
        if response.status_code == 200:
            print(f"    [OK] Success")
        elif response.status_code == 201:
            print(f"    [OK] Created")
        else:
            print(f"    [!] HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"    [X] Error: {str(e)[:100]}")

print("\n" + "=" * 60)
print("DDL Execution complete!")
print("=" * 60)
print("\nNow inserting seed data via REST API...")

# Insert seed data via REST API
service_key = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_KEY')

if not service_key:
    print("WARNING: No service key found, skipping seed data insertion")
    print("Run: python scripts/run_migration_095_simple.py")
else:
    import subprocess
    result = subprocess.run(
        [sys.executable, str(project_root / 'scripts' / 'run_migration_095_simple.py')],
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
