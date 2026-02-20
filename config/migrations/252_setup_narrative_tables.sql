-- ============================================================================
-- Migration 252: Setup Narrative Tables
-- ============================================================================
-- Adds narrative analysis tables for user setups (product combinations).
-- Mirrors the product-level narrative tables (202, 208) but for setups.
--
-- Author: Claude Opus 4.6
-- Date: 2026-02-17
-- ============================================================================

-- ============================================================================
-- 1. SETUP PILLAR NARRATIVES TABLE
-- ============================================================================
-- Per-pillar narrative analysis for a setup (combination of products)

CREATE TABLE IF NOT EXISTS setup_pillar_narratives (
    id BIGSERIAL PRIMARY KEY,
    setup_id INTEGER NOT NULL REFERENCES user_setups(id) ON DELETE CASCADE,
    pillar CHAR(1) NOT NULL CHECK (pillar IN ('S', 'A', 'F', 'E')),

    -- AI-generated narrative content
    narrative_summary TEXT NOT NULL,
    key_strengths TEXT,
    key_weaknesses TEXT,
    security_strategy TEXT NOT NULL,

    -- Worst-case scenario
    worst_case_scenario TEXT NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    mitigation_advice TEXT,

    -- Score context
    pillar_score DECIMAL(5,2),
    products_count INTEGER DEFAULT 0,
    weakest_product_name VARCHAR(200),
    weakest_product_score DECIMAL(5,2),

    -- Metadata
    ai_model VARCHAR(50) DEFAULT 'claude-opus',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(setup_id, pillar)
);

CREATE INDEX IF NOT EXISTS idx_setup_pillar_narratives_setup ON setup_pillar_narratives(setup_id);

-- ============================================================================
-- 2. SETUP RISK ANALYSIS TABLE
-- ============================================================================
-- Global cross-product risk analysis for a setup

CREATE TABLE IF NOT EXISTS setup_risk_analysis (
    id BIGSERIAL PRIMARY KEY,
    setup_id INTEGER NOT NULL REFERENCES user_setups(id) ON DELETE CASCADE,

    -- Overall risk assessment
    overall_risk_level VARCHAR(20) DEFAULT 'medium' CHECK (overall_risk_level IN ('low', 'medium', 'high', 'critical')),
    overall_risk_narrative TEXT NOT NULL,

    -- Combined worst-case
    combined_worst_case TEXT NOT NULL,
    attack_vectors JSONB DEFAULT '[]',
    priority_mitigations JSONB DEFAULT '[]',

    -- Setup-specific: product interaction risks
    interaction_risks JSONB DEFAULT '[]',
    gap_analysis JSONB DEFAULT '[]',
    harmony_score DECIMAL(5,2),

    -- Context
    products_count INTEGER DEFAULT 0,
    total_score DECIMAL(5,2),
    weakest_pillar CHAR(1),
    strongest_pillar CHAR(1),

    -- Executive summary
    executive_summary TEXT,

    -- Metadata
    ai_model VARCHAR(50) DEFAULT 'claude-opus',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(setup_id)
);

CREATE INDEX IF NOT EXISTS idx_setup_risk_analysis_setup ON setup_risk_analysis(setup_id);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

ALTER TABLE setup_pillar_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_risk_analysis ENABLE ROW LEVEL SECURITY;

-- Users can read narratives for their own setups
CREATE POLICY "Users can read their setup narratives"
    ON setup_pillar_narratives FOR SELECT
    USING (
        setup_id IN (
            SELECT id FROM user_setups WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can read their setup risk analysis"
    ON setup_risk_analysis FOR SELECT
    USING (
        setup_id IN (
            SELECT id FROM user_setups WHERE user_id = auth.uid()
        )
    );

-- Shared setups: allow reading if setup has a share_token
CREATE POLICY "Public can read shared setup narratives"
    ON setup_pillar_narratives FOR SELECT
    USING (
        setup_id IN (
            SELECT id FROM user_setups WHERE share_token IS NOT NULL
        )
    );

CREATE POLICY "Public can read shared setup risk analysis"
    ON setup_risk_analysis FOR SELECT
    USING (
        setup_id IN (
            SELECT id FROM user_setups WHERE share_token IS NOT NULL
        )
    );

-- Service role can write (for Python pipeline)
CREATE POLICY "Service role can manage setup narratives"
    ON setup_pillar_narratives FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage setup risk analysis"
    ON setup_risk_analysis FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON TABLE setup_pillar_narratives IS
    'AI-generated narrative analysis per pillar for user setups (product combinations)';

COMMENT ON TABLE setup_risk_analysis IS
    'Global cross-product risk analysis for user setups, including interaction risks and gap analysis';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
