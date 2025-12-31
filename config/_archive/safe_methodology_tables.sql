-- ============================================================
-- SAFE SCORING™ - Methodology Tables
-- ============================================================

-- Table to store SAFE methodology
CREATE TABLE IF NOT EXISTS safe_methodology (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name VARCHAR(100) NOT NULL DEFAULT 'SAFE SCORING™',
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    description TEXT,
    formula TEXT,
    pillars JSONB,
    score_categories JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add objectives and pillar_relevance columns to product_types
ALTER TABLE product_types 
ADD COLUMN IF NOT EXISTS objectives JSONB,
ADD COLUMN IF NOT EXISTS pillar_relevance JSONB,
ADD COLUMN IF NOT EXISTS applicable_keywords TEXT[];

-- Comments
COMMENT ON TABLE safe_methodology IS 'SAFE SCORING™ Methodology - Pillar and category definitions';
COMMENT ON COLUMN safe_methodology.pillars IS 'Definitions of 4 SAFE pillars (S, A, F, E) with keywords and criteria';
COMMENT ON COLUMN safe_methodology.score_categories IS 'Score categories (Essential, Consumer, Full) with quotas';

COMMENT ON COLUMN product_types.objectives IS 'Product type objectives (primary, secondary, tertiary)';
COMMENT ON COLUMN product_types.pillar_relevance IS 'Relevance of each pillar for this type (0.0 to 1.0)';
COMMENT ON COLUMN product_types.applicable_keywords IS 'Keywords to determine norm applicability';

-- Index to optimize queries
CREATE INDEX IF NOT EXISTS idx_norms_pillar ON norms(pillar);
CREATE INDEX IF NOT EXISTS idx_norm_applicability_type ON norm_applicability(type_id);
CREATE INDEX IF NOT EXISTS idx_norm_applicability_norm ON norm_applicability(norm_id);

-- View for methodology statistics
CREATE OR REPLACE VIEW methodology_stats AS
SELECT 
    (SELECT COUNT(*) FROM norms) as total_norms,
    (SELECT COUNT(*) FROM norms WHERE full = TRUE) as full_norms,
    (SELECT COUNT(*) FROM norms WHERE consumer = TRUE) as consumer_norms,
    (SELECT COUNT(*) FROM norms WHERE is_essential = TRUE) as essential_norms,
    (SELECT COUNT(*) FROM product_types) as total_product_types,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM norm_applicability WHERE is_applicable = TRUE) as applicable_rules;
