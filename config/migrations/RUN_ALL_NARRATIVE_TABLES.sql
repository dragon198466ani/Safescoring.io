-- ============================================================================
-- COMBINED MIGRATION: All narrative tables (202 + 252)
-- ============================================================================
-- Run this ONCE in Supabase SQL Editor to create all narrative tables.
-- Safe to re-run (uses IF NOT EXISTS everywhere).
-- ============================================================================

-- ============================================================================
-- PART A: PRODUCT NARRATIVE TABLES (from migration 202)
-- ============================================================================

-- 1. Product pillar narratives
CREATE TABLE IF NOT EXISTS product_pillar_narratives (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pillar CHAR(1) NOT NULL CHECK (pillar IN ('S', 'A', 'F', 'E')),
    narrative_summary TEXT NOT NULL,
    key_strengths TEXT,
    key_weaknesses TEXT,
    security_strategy TEXT NOT NULL,
    worst_case_scenario TEXT NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    mitigation_advice TEXT,
    pillar_score DECIMAL(5,2),
    evaluated_norms_count INTEGER DEFAULT 0,
    failed_norms_count INTEGER DEFAULT 0,
    ai_model VARCHAR(50) DEFAULT 'claude-opus',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, pillar)
);

CREATE INDEX IF NOT EXISTS idx_pillar_narratives_product ON product_pillar_narratives(product_id);
CREATE INDEX IF NOT EXISTS idx_pillar_narratives_pillar ON product_pillar_narratives(pillar);

-- 2. Product risk analysis
CREATE TABLE IF NOT EXISTS product_risk_analysis (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    overall_risk_level VARCHAR(20) DEFAULT 'medium' CHECK (overall_risk_level IN ('low', 'medium', 'high', 'critical')),
    overall_risk_narrative TEXT NOT NULL,
    combined_worst_case TEXT NOT NULL,
    attack_vectors JSONB DEFAULT '[]',
    priority_mitigations JSONB DEFAULT '[]',
    estimated_improvement JSONB DEFAULT '{}',
    total_critical_norms_failed INTEGER DEFAULT 0,
    total_high_risk_norms INTEGER DEFAULT 0,
    ai_model VARCHAR(50) DEFAULT 'claude-opus',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_analysis_product ON product_risk_analysis(product_id);

-- 3. Enhanced evaluation columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'evaluations' AND column_name = 'why_this_result') THEN
        ALTER TABLE evaluations ALTER COLUMN why_this_result TYPE TEXT;
    ELSE
        ALTER TABLE evaluations ADD COLUMN why_this_result TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'evaluations' AND column_name = 'detailed_justification') THEN
        ALTER TABLE evaluations ADD COLUMN detailed_justification TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'evaluations' AND column_name = 'evidence_sources') THEN
        ALTER TABLE evaluations ADD COLUMN evidence_sources JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'evaluations' AND column_name = 'risk_impact') THEN
        ALTER TABLE evaluations ADD COLUMN risk_impact VARCHAR(20) DEFAULT 'low'
            CHECK (risk_impact IN ('negligible', 'low', 'medium', 'high', 'critical'));
    END IF;
END $$;

-- 4. Applicability justifications
CREATE TABLE IF NOT EXISTS norm_applicability_justifications (
    id SERIAL PRIMARY KEY,
    product_type VARCHAR(50) NOT NULL,
    norm_id INTEGER NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
    is_applicable BOOLEAN NOT NULL,
    justification TEXT NOT NULL,
    applicability_score DECIMAL(3,2),
    product_characteristics JSONB DEFAULT '{}',
    ai_model VARCHAR(50) DEFAULT 'claude-opus',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_type, norm_id)
);

-- 5. RLS for product tables
ALTER TABLE product_pillar_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_risk_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE norm_applicability_justifications ENABLE ROW LEVEL SECURITY;

-- Drop policies first (safe to fail if they don't exist)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can read pillar narratives" ON product_pillar_narratives;
    DROP POLICY IF EXISTS "Public can read risk analysis" ON product_risk_analysis;
    DROP POLICY IF EXISTS "Public can read applicability justifications" ON norm_applicability_justifications;
    DROP POLICY IF EXISTS "Service role can write pillar narratives" ON product_pillar_narratives;
    DROP POLICY IF EXISTS "Service role can write risk analysis" ON product_risk_analysis;
    DROP POLICY IF EXISTS "Service role can write applicability justifications" ON norm_applicability_justifications;
END $$;

CREATE POLICY "Public can read pillar narratives"
    ON product_pillar_narratives FOR SELECT USING (true);
CREATE POLICY "Public can read risk analysis"
    ON product_risk_analysis FOR SELECT USING (true);
CREATE POLICY "Public can read applicability justifications"
    ON norm_applicability_justifications FOR SELECT USING (true);
CREATE POLICY "Service role can write pillar narratives"
    ON product_pillar_narratives FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can write risk analysis"
    ON product_risk_analysis FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can write applicability justifications"
    ON norm_applicability_justifications FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- PART B: SETUP (COMBINATION) NARRATIVE TABLES (from migration 252)
-- ============================================================================

-- 1. Setup pillar narratives
CREATE TABLE IF NOT EXISTS setup_pillar_narratives (
    id BIGSERIAL PRIMARY KEY,
    setup_id INTEGER NOT NULL REFERENCES user_setups(id) ON DELETE CASCADE,
    pillar CHAR(1) NOT NULL CHECK (pillar IN ('S', 'A', 'F', 'E')),
    narrative_summary TEXT NOT NULL,
    key_strengths TEXT,
    key_weaknesses TEXT,
    security_strategy TEXT NOT NULL,
    worst_case_scenario TEXT NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    mitigation_advice TEXT,
    pillar_score DECIMAL(5,2),
    products_count INTEGER DEFAULT 0,
    weakest_product_name VARCHAR(200),
    weakest_product_score DECIMAL(5,2),
    ai_model VARCHAR(50) DEFAULT 'claude-opus',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(setup_id, pillar)
);

CREATE INDEX IF NOT EXISTS idx_setup_pillar_narratives_setup ON setup_pillar_narratives(setup_id);

-- 2. Setup risk analysis
CREATE TABLE IF NOT EXISTS setup_risk_analysis (
    id BIGSERIAL PRIMARY KEY,
    setup_id INTEGER NOT NULL REFERENCES user_setups(id) ON DELETE CASCADE,
    overall_risk_level VARCHAR(20) DEFAULT 'medium' CHECK (overall_risk_level IN ('low', 'medium', 'high', 'critical')),
    overall_risk_narrative TEXT NOT NULL,
    combined_worst_case TEXT NOT NULL,
    attack_vectors JSONB DEFAULT '[]',
    priority_mitigations JSONB DEFAULT '[]',
    interaction_risks JSONB DEFAULT '[]',
    gap_analysis JSONB DEFAULT '[]',
    harmony_score DECIMAL(5,2),
    products_count INTEGER DEFAULT 0,
    total_score DECIMAL(5,2),
    weakest_pillar CHAR(1),
    strongest_pillar CHAR(1),
    executive_summary TEXT,
    ai_model VARCHAR(50) DEFAULT 'claude-opus',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(setup_id)
);

CREATE INDEX IF NOT EXISTS idx_setup_risk_analysis_setup ON setup_risk_analysis(setup_id);

-- 3. RLS for setup tables
ALTER TABLE setup_pillar_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_risk_analysis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can read their setup narratives" ON setup_pillar_narratives;
    DROP POLICY IF EXISTS "Users can read their setup risk analysis" ON setup_risk_analysis;
    DROP POLICY IF EXISTS "Public can read shared setup narratives" ON setup_pillar_narratives;
    DROP POLICY IF EXISTS "Public can read shared setup risk analysis" ON setup_risk_analysis;
    DROP POLICY IF EXISTS "Service role can manage setup narratives" ON setup_pillar_narratives;
    DROP POLICY IF EXISTS "Service role can manage setup risk analysis" ON setup_risk_analysis;
END $$;

CREATE POLICY "Users can read their setup narratives"
    ON setup_pillar_narratives FOR SELECT
    USING (setup_id IN (SELECT id FROM user_setups WHERE user_id = auth.uid()));

CREATE POLICY "Users can read their setup risk analysis"
    ON setup_risk_analysis FOR SELECT
    USING (setup_id IN (SELECT id FROM user_setups WHERE user_id = auth.uid()));

CREATE POLICY "Public can read shared setup narratives"
    ON setup_pillar_narratives FOR SELECT
    USING (setup_id IN (SELECT id FROM user_setups WHERE share_token IS NOT NULL));

CREATE POLICY "Public can read shared setup risk analysis"
    ON setup_risk_analysis FOR SELECT
    USING (setup_id IN (SELECT id FROM user_setups WHERE share_token IS NOT NULL));

CREATE POLICY "Service role can manage setup narratives"
    ON setup_pillar_narratives FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage setup risk analysis"
    ON setup_risk_analysis FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- PART C: COMMENTS
-- ============================================================================

COMMENT ON TABLE product_pillar_narratives IS 'AI-generated narrative summaries per pillar for each product';
COMMENT ON TABLE product_risk_analysis IS 'Combined risk analysis across all pillars for each product';
COMMENT ON TABLE norm_applicability_justifications IS 'Justifications for norm applicability per product type';
COMMENT ON TABLE setup_pillar_narratives IS 'AI-generated narrative analysis per pillar for user setups (product combinations)';
COMMENT ON TABLE setup_risk_analysis IS 'Global cross-product risk analysis for user setups';

-- ============================================================================
-- DONE! All 6 tables created:
--   1. product_pillar_narratives
--   2. product_risk_analysis
--   3. norm_applicability_justifications
--   4. setup_pillar_narratives
--   5. setup_risk_analysis
--   + Enhanced columns on evaluations table
-- ============================================================================
