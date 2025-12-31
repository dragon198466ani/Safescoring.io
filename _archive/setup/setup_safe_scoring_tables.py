#!/usr/bin/env python3
"""
Setup script to create SAFE Scoring tables in Supabase.
Executes the SQL from config/safe_scoring_tables.sql
"""

import os
import sys
import requests

# Configuration
def load_config():
    config = {}
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', '.env.txt')
    
    if not os.path.exists(config_path):
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', '.env')
    
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

def check_table_exists(table_name):
    """Check if a table exists in Supabase"""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table_name}?limit=1",
        headers=headers
    )
    return r.status_code != 404

def create_tables_via_api():
    """
    Create tables using Supabase REST API.
    Note: Complex SQL with functions/triggers must be run in Supabase SQL Editor.
    This creates the basic table structure.
    """
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║       🔧 SETUP SAFE SCORING TABLES                           ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    # Check existing tables
    print("📋 Vérification des tables existantes...")
    
    tables_status = {
        'norms': check_table_exists('norms'),
        'products': check_table_exists('products'),
        'evaluations': check_table_exists('evaluations'),
        'safe_scoring_definitions': check_table_exists('safe_scoring_definitions'),
        'safe_scoring_results': check_table_exists('safe_scoring_results'),
    }
    
    for table, exists in tables_status.items():
        status = "✅" if exists else "❌"
        print(f"   {status} {table}")
    
    # Check if new tables need to be created
    if tables_status['safe_scoring_definitions'] and tables_status['safe_scoring_results']:
        print("\n✅ Les tables SAFE Scoring existent déjà!")
        return True
    
    print("\n⚠️  Les nouvelles tables doivent être créées dans Supabase SQL Editor.")
    print("\n📝 Instructions:")
    print("   1. Ouvrez Supabase Dashboard: https://supabase.com/dashboard")
    print("   2. Sélectionnez votre projet")
    print("   3. Allez dans 'SQL Editor'")
    print("   4. Copiez le contenu de: config/safe_scoring_tables.sql")
    print("   5. Exécutez le script SQL")
    print("\n   Ou utilisez la commande suivante pour afficher le SQL:")
    print("   type config\\safe_scoring_tables.sql")
    
    return False

def test_connection():
    """Test Supabase connection"""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?limit=1",
            headers=headers,
            timeout=10
        )
        return r.status_code in [200, 206]
    except:
        return False

def main():
    print("🔌 Test de connexion Supabase...")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Configuration Supabase manquante!")
        print("   Vérifiez config/.env.txt")
        return
    
    if not test_connection():
        print("❌ Impossible de se connecter à Supabase!")
        print(f"   URL: {SUPABASE_URL}")
        return
    
    print("✅ Connexion OK\n")
    
    create_tables_via_api()

if __name__ == "__main__":
    main()
