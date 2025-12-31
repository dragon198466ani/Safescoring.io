-- ============================================================
-- SAFESCORING - PROPRIETARY DATA TABLES
-- ============================================================
-- These tables store UNIQUE data that creates competitive moat
-- Run this AFTER _MASTER_MIGRATION.sql
-- ============================================================

-- ============================================================
-- 1. PRODUCT VIEWS (Freemium tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_views (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- "2025-01"
    viewed_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate views in same month
    UNIQUE(user_id, product_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_product_views_user_month ON product_views(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);

COMMENT ON TABLE product_views IS 'Tracks product views for freemium limits - PROPRIETARY usage data';

-- ============================================================
-- 2. ON-CHAIN SNAPSHOTS (Proprietary time-series data)
-- ============================================================
CREATE TABLE IF NOT EXISTS onchain_snapshots (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT NOW(),

    -- TVL data
    tvl_usd DECIMAL(18,2) DEFAULT 0,
    tvl_change_24h DECIMAL(8,4) DEFAULT 0,
    tvl_change_7d DECIMAL(8,4) DEFAULT 0,
    tvl_change_30d DECIMAL(8,4) DEFAULT 0,

    -- Volume data (for DEXs)
    volume_24h DECIMAL(18,2) DEFAULT 0,
    volume_7d DECIMAL(18,2) DEFAULT 0,

    -- User metrics
    unique_users_24h INTEGER DEFAULT 0,
    unique_users_7d INTEGER DEFAULT 0,
    transaction_count_24h INTEGER DEFAULT 0,

    -- Chain distribution
    chains JSONB DEFAULT '[]'::jsonb,
    chain_tvls JSONB DEFAULT '{}'::jsonb,

    -- Health indicators
    health_score INTEGER DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),

    -- Source
    data_source VARCHAR(50) DEFAULT 'defillama',
    raw_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onchain_snapshots_product ON onchain_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_onchain_snapshots_date ON onchain_snapshots(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_onchain_snapshots_product_date ON onchain_snapshots(product_id, recorded_at DESC);

COMMENT ON TABLE onchain_snapshots IS 'Historical on-chain data - IMPOSSIBLE TO REPLICATE retroactively';

-- ============================================================
-- 3. INCIDENT ALERTS (Real-time security intelligence)
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_alerts (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES security_incidents(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('new_incident', 'severity_upgrade', 'funds_update', 'resolution')),

    -- Alert content
    title VARCHAR(300) NOT NULL,
    message TEXT,
    severity VARCHAR(20) DEFAULT 'medium',

    -- Targeting
    affected_product_ids INTEGER[] DEFAULT '{}',

    -- Distribution
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,

    -- Metrics
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_alerts_published ON incident_alerts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_alerts_products ON incident_alerts USING GIN(affected_product_ids);

COMMENT ON TABLE incident_alerts IS 'Security alerts generated from incidents - EXCLUSIVE intelligence';

-- ============================================================
-- 4. MARKET SNAPSHOTS (Daily market overview)
-- ============================================================
CREATE TABLE IF NOT EXISTS market_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,

    -- Global metrics
    total_defi_tvl DECIMAL(18,2) DEFAULT 0,
    total_dex_volume_24h DECIMAL(18,2) DEFAULT 0,
    total_lending_supplied DECIMAL(18,2) DEFAULT 0,
    total_lending_borrowed DECIMAL(18,2) DEFAULT 0,

    -- Chain dominance
    ethereum_tvl_share DECIMAL(5,2) DEFAULT 0,
    chain_distribution JSONB DEFAULT '{}'::jsonb,

    -- Top movers
    top_gainers JSONB DEFAULT '[]'::jsonb,
    top_losers JSONB DEFAULT '[]'::jsonb,

    -- Incident summary
    incidents_24h INTEGER DEFAULT 0,
    funds_lost_24h DECIMAL(18,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_date ON market_snapshots(snapshot_date DESC);

COMMENT ON TABLE market_snapshots IS 'Daily market snapshots - builds unique historical dataset';

-- ============================================================
-- 5. USER COLUMNS (Add missing columns)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 6. PRODUCT DEFILLAMA MAPPING
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS defillama_slug VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS coingecko_id VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS github_repo VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_products_defillama ON products(defillama_slug);

-- ============================================================
-- 7. DATA COLLECTION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS data_collection_logs (
    id SERIAL PRIMARY KEY,
    collection_type VARCHAR(50) NOT NULL, -- 'incidents', 'onchain', 'market'
    run_date TIMESTAMP DEFAULT NOW(),

    -- Results
    items_collected INTEGER DEFAULT 0,
    items_saved INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,

    -- Performance
    duration_seconds INTEGER DEFAULT 0,

    -- Details
    sources_scraped TEXT[],
    error_details JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_logs_type_date ON data_collection_logs(collection_type, run_date DESC);

COMMENT ON TABLE data_collection_logs IS 'Audit trail for data collection - proves data provenance';

-- ============================================================
-- 8. PROPRIETARY METRICS VIEW
-- ============================================================
CREATE OR REPLACE VIEW v_proprietary_metrics AS
SELECT
    (SELECT COUNT(*) FROM onchain_snapshots) as total_onchain_snapshots,
    (SELECT COUNT(DISTINCT product_id) FROM onchain_snapshots) as products_with_onchain_data,
    (SELECT COUNT(*) FROM security_incidents WHERE created_by LIKE 'scraper_%') as scraped_incidents,
    (SELECT COUNT(*) FROM score_history) as score_history_records,
    (SELECT MIN(recorded_at) FROM score_history) as tracking_since,
    (SELECT COUNT(*) FROM market_snapshots) as market_snapshot_days,
    (SELECT SUM(items_collected) FROM data_collection_logs) as total_data_points_collected;

COMMENT ON VIEW v_proprietary_metrics IS 'Overview of proprietary data - demonstrates moat to investors';

-- ============================================================
-- 9. FUNCTIONS FOR PROPRIETARY DATA
-- ============================================================

-- Function to get product with full enrichment
CREATE OR REPLACE FUNCTION get_enriched_product(p_product_id INTEGER)
RETURNS TABLE (
    product_id INTEGER,
    product_name VARCHAR(200),
    safe_score DECIMAL(5,2),
    current_tvl DECIMAL(18,2),
    tvl_change_7d DECIMAL(8,4),
    incident_count BIGINT,
    last_incident_date TIMESTAMP,
    health_score INTEGER,
    score_trend VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as product_id,
        p.name as product_name,
        ssr.note_finale as safe_score,
        os.tvl_usd as current_tvl,
        os.tvl_change_7d,
        (SELECT COUNT(*) FROM incident_product_impact ipi WHERE ipi.product_id = p.id) as incident_count,
        (SELECT MAX(si.incident_date) FROM incident_product_impact ipi
         JOIN security_incidents si ON ipi.incident_id = si.id
         WHERE ipi.product_id = p.id) as last_incident_date,
        os.health_score,
        CASE
            WHEN sh.score_change > 0 THEN 'improving'
            WHEN sh.score_change < 0 THEN 'declining'
            ELSE 'stable'
        END as score_trend
    FROM products p
    LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
    LEFT JOIN LATERAL (
        SELECT * FROM onchain_snapshots
        WHERE product_id = p.id
        ORDER BY recorded_at DESC LIMIT 1
    ) os ON true
    LEFT JOIN LATERAL (
        SELECT * FROM score_history
        WHERE product_id = p.id
        ORDER BY recorded_at DESC LIMIT 1
    ) sh ON true
    WHERE p.id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DONE
-- ============================================================
SELECT 'Proprietary tables created successfully!' as status;
