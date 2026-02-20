#!/usr/bin/env python3
"""
MIGRATION MULTI-STORAGE
Migre les données de Supabase #1 vers l'architecture multi-tier gratuite

Usage:
    python scripts/migrate_to_multi_storage.py --phase 1  # Créer Supabase #2
    python scripts/migrate_to_multi_storage.py --phase 2  # Migrer reference data
    python scripts/migrate_to_multi_storage.py --phase 3  # Setup Turso
    python scripts/migrate_to_multi_storage.py --phase 4  # Migrer historical
"""

import os
import json
import argparse
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

# Tables à migrer vers Supabase #2 (reference data)
REFERENCE_TABLES = [
    'products',
    'norms',
    'evaluations',
    'safe_scoring_results',
    'product_types',
    'product_type_mapping',
    'physical_incidents',
    'crypto_legislation',
    'norm_applicability',
]

# Tables à migrer vers Turso (historical)
HISTORICAL_TABLES = [
    'evaluation_history',
    'product_score_history',
    'setup_history',
    'audit_logs',
    'predictions',
]

# Tables à garder dans Supabase #1 (hot data)
HOT_TABLES = [
    'users',
    'user_setups',
    'user_watchlist',
    'user_preferences',
    'user_notifications',
    'subscriptions',
    'donations',
    'fiat_payments',
    'verified_badges',
    'api_keys',
]

# =============================================================================
# PHASE 1: Générer le schéma pour Supabase #2
# =============================================================================

def phase1_generate_schema():
    """Génère le SQL pour créer les tables dans Supabase #2"""

    print("=" * 60)
    print("PHASE 1: Génération du schéma Supabase #2")
    print("=" * 60)

    schema_sql = """
-- =============================================================================
-- SAFESCORING - SUPABASE #2 SCHEMA (Reference Data)
-- =============================================================================
-- Exécuter dans le nouveau projet Supabase > SQL Editor
-- =============================================================================

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(500),
    safe_score DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Norms table
CREATE TABLE IF NOT EXISTS norms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    pillar CHAR(1) CHECK (pillar IN ('S', 'A', 'F', 'E')),
    is_essential BOOLEAN DEFAULT false,
    consumer BOOLEAN DEFAULT false,
    official_doc_summary TEXT,
    official_link VARCHAR(500),
    year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    norm_id INTEGER REFERENCES norms(id) ON DELETE CASCADE,
    result VARCHAR(10) CHECK (result IN ('YES', 'NO', 'N/A', 'TBD')),
    confidence DECIMAL(3,2),
    notes TEXT,
    evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, norm_id)
);

-- Safe scoring results
CREATE TABLE IF NOT EXISTS safe_scoring_results (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    note_finale DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product types
CREATE TABLE IF NOT EXISTS product_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    definition TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Physical incidents
CREATE TABLE IF NOT EXISTS physical_incidents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    incident_type VARCHAR(50),
    description TEXT,
    date DATE,
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    amount_stolen_usd BIGINT,
    severity_score INTEGER,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crypto legislation
CREATE TABLE IF NOT EXISTS crypto_legislation (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(100),
    legal_status VARCHAR(50),
    tax_rate DECIMAL(5,2),
    regulations TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_score ON products(safe_score DESC);
CREATE INDEX idx_evaluations_product ON evaluations(product_id);
CREATE INDEX idx_evaluations_norm ON evaluations(norm_id);
CREATE INDEX idx_norms_pillar ON norms(pillar);
CREATE INDEX idx_norms_code ON norms(code);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE norms ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read norms" ON norms FOR SELECT USING (true);
CREATE POLICY "Public read evaluations" ON evaluations FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service write products" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write norms" ON norms FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write evaluations" ON evaluations FOR ALL USING (auth.role() = 'service_role');

SELECT 'Schema created successfully!' AS status;
"""

    output_path = 'config/migrations/supabase2_schema.sql'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(schema_sql)

    print(f"✅ Schéma généré: {output_path}")
    print()
    print("📋 Prochaines étapes:")
    print("1. Créer un nouveau projet sur supabase.com/dashboard")
    print("2. Copier l'URL et les clés dans .env:")
    print("   SUPABASE_REF_URL=https://xxxxx.supabase.co")
    print("   SUPABASE_REF_SERVICE_KEY=xxxxx")
    print("3. Exécuter le SQL dans le nouveau projet")
    print("4. Lancer: python migrate_to_multi_storage.py --phase 2")


# =============================================================================
# PHASE 2: Migrer les données vers Supabase #2
# =============================================================================

def phase2_migrate_reference_data():
    """Migre les données de référence vers Supabase #2"""

    print("=" * 60)
    print("PHASE 2: Migration des données vers Supabase #2")
    print("=" * 60)

    # Vérifier configuration
    ref_url = os.getenv('SUPABASE_REF_URL')
    if not ref_url:
        print("❌ SUPABASE_REF_URL non configuré dans .env")
        print("   Créez d'abord un nouveau projet Supabase")
        return

    try:
        from supabase import create_client

        # Clients
        main = create_client(
            os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )
        ref = create_client(
            os.getenv('SUPABASE_REF_URL'),
            os.getenv('SUPABASE_REF_SERVICE_KEY')
        )

        for table in REFERENCE_TABLES:
            print(f"\n📦 Migration: {table}")

            try:
                # Fetch from main
                result = main.table(table).select('*').execute()
                data = result.data

                if not data:
                    print(f"   ⚠️  Table vide, skip")
                    continue

                print(f"   📊 {len(data)} lignes à migrer")

                # Insert in batches
                batch_size = 500
                for i in range(0, len(data), batch_size):
                    batch = data[i:i + batch_size]
                    ref.table(table).upsert(batch).execute()
                    print(f"   ✅ Batch {i // batch_size + 1}/{(len(data) - 1) // batch_size + 1}")

                print(f"   ✅ {table} migré!")

            except Exception as e:
                print(f"   ❌ Erreur: {e}")

        print()
        print("✅ Migration terminée!")
        print()
        print("📋 Prochaines étapes:")
        print("1. Vérifier les données dans Supabase #2")
        print("2. Mettre à jour le code pour utiliser multi-storage.js")
        print("3. Optionnel: Supprimer les tables de Supabase #1")

    except ImportError:
        print("❌ Package supabase non installé: pip install supabase")


# =============================================================================
# PHASE 3: Setup Turso pour historical data
# =============================================================================

def phase3_setup_turso():
    """Génère le schéma et instructions pour Turso"""

    print("=" * 60)
    print("PHASE 3: Setup Turso (Historical Data)")
    print("=" * 60)

    turso_schema = """
-- =============================================================================
-- SAFESCORING - TURSO SCHEMA (Historical/Archive Data)
-- =============================================================================
-- Exécuter via turso CLI: turso db shell safescoring < turso_schema.sql
-- =============================================================================

-- Evaluation history (immutable audit trail)
CREATE TABLE IF NOT EXISTS evaluation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    norm_id INTEGER NOT NULL,
    old_result TEXT,
    new_result TEXT,
    changed_by TEXT,
    changed_at TEXT DEFAULT (datetime('now')),
    reason TEXT
);

-- Score history (time series)
CREATE TABLE IF NOT EXISTS score_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    score REAL,
    score_s REAL,
    score_a REAL,
    score_f REAL,
    score_e REAL,
    recorded_at TEXT DEFAULT (datetime('now'))
);

-- Setup history
CREATE TABLE IF NOT EXISTS setup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setup_id INTEGER NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Audit logs archive
CREATE TABLE IF NOT EXISTS audit_logs_archive (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER,
    action TEXT,
    severity TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT
);

-- Predictions
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    prediction_date TEXT,
    safe_score_at_prediction REAL,
    risk_level TEXT,
    incident_probability REAL,
    status TEXT DEFAULT 'active',
    validated_at TEXT,
    incident_occurred INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_score_history_product ON score_history(product_id);
CREATE INDEX idx_score_history_date ON score_history(recorded_at);
CREATE INDEX idx_eval_history_product ON evaluation_history(product_id);
CREATE INDEX idx_audit_archive_date ON audit_logs_archive(created_at);
"""

    output_path = 'config/turso_schema.sql'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(turso_schema)

    print(f"✅ Schéma Turso généré: {output_path}")
    print()
    print("📋 Instructions Turso:")
    print()
    print("1. Installer Turso CLI:")
    print("   curl -sSfL https://get.tur.so/install.sh | bash")
    print()
    print("2. Login:")
    print("   turso auth login")
    print()
    print("3. Créer la base:")
    print("   turso db create safescoring")
    print()
    print("4. Appliquer le schéma:")
    print("   turso db shell safescoring < config/turso_schema.sql")
    print()
    print("5. Récupérer les credentials:")
    print("   turso db show safescoring --url")
    print("   turso db tokens create safescoring")
    print()
    print("6. Ajouter au .env:")
    print("   TURSO_DATABASE_URL=libsql://xxxxx.turso.io")
    print("   TURSO_AUTH_TOKEN=xxxxx")


# =============================================================================
# PHASE 4: Migrer historical data vers Turso
# =============================================================================

def phase4_migrate_historical():
    """Migre les données historiques vers Turso"""

    print("=" * 60)
    print("PHASE 4: Migration Historical Data → Turso")
    print("=" * 60)

    turso_url = os.getenv('TURSO_DATABASE_URL')
    if not turso_url:
        print("❌ TURSO_DATABASE_URL non configuré")
        print("   Exécutez d'abord --phase 3")
        return

    try:
        import libsql_experimental as libsql
        from supabase import create_client

        # Clients
        main = create_client(
            os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )

        conn = libsql.connect(
            turso_url,
            auth_token=os.getenv('TURSO_AUTH_TOKEN')
        )

        for table in HISTORICAL_TABLES:
            print(f"\n📦 Archive: {table}")

            try:
                # Fetch old data (> 6 months)
                cutoff = (datetime.now() - timedelta(days=180)).isoformat()
                result = main.table(table).select('*').lt('created_at', cutoff).execute()
                data = result.data

                if not data:
                    print(f"   ⚠️  Pas de données anciennes")
                    continue

                print(f"   📊 {len(data)} lignes à archiver")

                # Insert into Turso
                for row in data:
                    cols = list(row.keys())
                    vals = [row[c] for c in cols]
                    placeholders = ','.join(['?' for _ in cols])
                    conn.execute(
                        f"INSERT INTO {table}_archive ({','.join(cols)}) VALUES ({placeholders})",
                        vals
                    )

                conn.commit()
                print(f"   ✅ Archivé dans Turso!")

                # Delete from Supabase
                main.table(table).delete().lt('created_at', cutoff).execute()
                print(f"   🗑️  Supprimé de Supabase!")

            except Exception as e:
                print(f"   ❌ Erreur: {e}")

        print()
        print("✅ Archivage terminé!")

    except ImportError:
        print("❌ Packages manquants: pip install libsql-experimental supabase")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Migration multi-storage SafeScoring')
    parser.add_argument('--phase', type=int, required=True, choices=[1, 2, 3, 4],
                        help='Phase de migration (1-4)')

    args = parser.parse_args()

    if args.phase == 1:
        phase1_generate_schema()
    elif args.phase == 2:
        phase2_migrate_reference_data()
    elif args.phase == 3:
        phase3_setup_turso()
    elif args.phase == 4:
        phase4_migrate_historical()
