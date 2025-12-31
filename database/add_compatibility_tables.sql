-- ============================================================
-- SAFESCORING.IO - Add Compatibility Tables Migration
-- ============================================================
-- Run this on an existing Supabase instance to add compatibility features
-- Date: 2025-12-31
-- ============================================================

-- ============================================================
-- 1. TYPE COMPATIBILITY TABLE
-- ============================================================
-- 21 types × 21 types = 441 combinations (231 unique pairs if symmetric)

CREATE TABLE IF NOT EXISTS type_compatibility (
    id SERIAL PRIMARY KEY,
    type_a_id INTEGER NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
    type_b_id INTEGER NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,

    -- Compatibility result
    is_compatible BOOLEAN DEFAULT TRUE,
    compatibility_level VARCHAR(20) DEFAULT 'partial' CHECK (
        compatibility_level IN ('native', 'partial', 'via_bridge', 'incompatible')
    ),

    -- Connection details
    base_method TEXT,
    description TEXT,

    -- Analysis metadata
    analyzed_by VARCHAR(50) DEFAULT 'manual',
    analyzed_at TIMESTAMP DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(type_a_id, type_b_id)
);

COMMENT ON TABLE type_compatibility IS 'Type-level compatibility matrix (21x21). Baseline for product compatibility.';
COMMENT ON COLUMN type_compatibility.compatibility_level IS 'native=direct integration, partial=with limitations, via_bridge=needs intermediary, incompatible=cannot work together';

-- ============================================================
-- 2. PRODUCT COMPATIBILITY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS product_compatibility (
    id SERIAL PRIMARY KEY,
    product_a_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_b_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Type-level compatibility (cached)
    type_compatible BOOLEAN DEFAULT TRUE,

    -- AI analysis results
    ai_compatible BOOLEAN DEFAULT NULL,
    ai_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    ai_confidence_factors VARCHAR(300),
    ai_method VARCHAR(500),
    ai_steps TEXT,
    ai_limitations TEXT,
    ai_justification TEXT,

    -- Analysis metadata
    analyzed_at TIMESTAMP,
    analyzed_by VARCHAR(50) DEFAULT 'pending',

    -- Scraping metadata for cache invalidation
    scraped_content_a_hash VARCHAR(64),
    scraped_content_b_hash VARCHAR(64),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(product_a_id, product_b_id)
);

COMMENT ON TABLE product_compatibility IS 'Product-level compatibility matrix. Enriched by AI + web scraping.';

-- ============================================================
-- 3. COMPATIBILITY USE CASES (Optional)
-- ============================================================

CREATE TABLE IF NOT EXISTS compatibility_use_cases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type_pairs JSONB DEFAULT '[]'::jsonb,
    category VARCHAR(50) CHECK (category IN (
        'security_storage', 'connection_access', 'defi_trading',
        'cross_chain', 'custody_management', 'other'
    )),
    example_products JSONB DEFAULT '[]'::jsonb,
    integration_steps TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Type Compatibility
CREATE INDEX IF NOT EXISTS idx_type_compat_type_a ON type_compatibility(type_a_id);
CREATE INDEX IF NOT EXISTS idx_type_compat_type_b ON type_compatibility(type_b_id);
CREATE INDEX IF NOT EXISTS idx_type_compat_level ON type_compatibility(compatibility_level);
CREATE INDEX IF NOT EXISTS idx_type_compat_is_compatible ON type_compatibility(is_compatible);
CREATE INDEX IF NOT EXISTS idx_type_compat_pair ON type_compatibility(type_a_id, type_b_id);

-- Product Compatibility
CREATE INDEX IF NOT EXISTS idx_product_compat_a ON product_compatibility(product_a_id);
CREATE INDEX IF NOT EXISTS idx_product_compat_b ON product_compatibility(product_b_id);
CREATE INDEX IF NOT EXISTS idx_product_compat_pair ON product_compatibility(product_a_id, product_b_id);
CREATE INDEX IF NOT EXISTS idx_product_compat_ai_compatible ON product_compatibility(ai_compatible);
CREATE INDEX IF NOT EXISTS idx_product_compat_type_compatible ON product_compatibility(type_compatible);
CREATE INDEX IF NOT EXISTS idx_product_compat_analyzed_at ON product_compatibility(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_compat_confidence ON product_compatibility(ai_confidence DESC);

-- Use Cases
CREATE INDEX IF NOT EXISTS idx_compat_use_cases_category ON compatibility_use_cases(category);
CREATE INDEX IF NOT EXISTS idx_compat_use_cases_active ON compatibility_use_cases(is_active);

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Get type compatibility (bidirectional lookup)
CREATE OR REPLACE FUNCTION get_type_compatibility(p_type_a_id INTEGER, p_type_b_id INTEGER)
RETURNS TABLE (
    is_compatible BOOLEAN,
    compatibility_level VARCHAR(20),
    base_method TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT tc.is_compatible, tc.compatibility_level, tc.base_method, tc.description
    FROM type_compatibility tc
    WHERE (tc.type_a_id = p_type_a_id AND tc.type_b_id = p_type_b_id)
       OR (tc.type_a_id = p_type_b_id AND tc.type_b_id = p_type_a_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get product compatibility (bidirectional lookup)
CREATE OR REPLACE FUNCTION get_product_compatibility(p_product_a_id INTEGER, p_product_b_id INTEGER)
RETURNS TABLE (
    type_compatible BOOLEAN,
    ai_compatible BOOLEAN,
    ai_confidence DECIMAL(3,2),
    ai_confidence_factors VARCHAR(300),
    ai_method VARCHAR(500),
    ai_steps TEXT,
    ai_limitations TEXT,
    ai_justification TEXT,
    analyzed_at TIMESTAMP,
    analyzed_by VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT pc.type_compatible, pc.ai_compatible, pc.ai_confidence, pc.ai_confidence_factors, pc.ai_method,
           pc.ai_steps, pc.ai_limitations, pc.ai_justification, pc.analyzed_at, pc.analyzed_by
    FROM product_compatibility pc
    WHERE (pc.product_a_id = p_product_a_id AND pc.product_b_id = p_product_b_id)
       OR (pc.product_a_id = p_product_b_id AND pc.product_b_id = p_product_a_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get all compatible products for a given product
CREATE OR REPLACE FUNCTION get_compatible_products(p_product_id INTEGER)
RETURNS TABLE (
    product_id INTEGER,
    product_name VARCHAR(200),
    product_slug VARCHAR(100),
    ai_compatible BOOLEAN,
    ai_confidence DECIMAL(3,2),
    ai_method VARCHAR(500),
    compatibility_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE WHEN pc.product_a_id = p_product_id THEN pc.product_b_id ELSE pc.product_a_id END as product_id,
        p.name as product_name,
        p.slug as product_slug,
        pc.ai_compatible,
        pc.ai_confidence,
        pc.ai_method,
        CASE
            WHEN pc.ai_confidence >= 0.8 THEN 'native'::VARCHAR(20)
            WHEN pc.ai_confidence >= 0.5 THEN 'partial'::VARCHAR(20)
            WHEN pc.ai_confidence >= 0.3 THEN 'via_bridge'::VARCHAR(20)
            ELSE 'incompatible'::VARCHAR(20)
        END as compatibility_level
    FROM product_compatibility pc
    JOIN products p ON p.id = CASE WHEN pc.product_a_id = p_product_id THEN pc.product_b_id ELSE pc.product_a_id END
    WHERE (pc.product_a_id = p_product_id OR pc.product_b_id = p_product_id)
      AND pc.ai_compatible = TRUE
    ORDER BY pc.ai_confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- Get compatibility statistics
CREATE OR REPLACE FUNCTION get_compatibility_stats()
RETURNS TABLE (
    total_type_pairs INTEGER,
    compatible_type_pairs INTEGER,
    total_product_pairs INTEGER,
    analyzed_product_pairs INTEGER,
    compatible_product_pairs INTEGER,
    avg_confidence DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM type_compatibility) as total_type_pairs,
        (SELECT COUNT(*)::INTEGER FROM type_compatibility WHERE is_compatible = TRUE) as compatible_type_pairs,
        (SELECT COUNT(*)::INTEGER FROM product_compatibility) as total_product_pairs,
        (SELECT COUNT(*)::INTEGER FROM product_compatibility WHERE ai_compatible IS NOT NULL) as analyzed_product_pairs,
        (SELECT COUNT(*)::INTEGER FROM product_compatibility WHERE ai_compatible = TRUE) as compatible_product_pairs,
        (SELECT COALESCE(AVG(ai_confidence), 0)::DECIMAL(3,2) FROM product_compatibility WHERE ai_confidence IS NOT NULL) as avg_confidence;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. VIEWS
-- ============================================================

-- Type Compatibility Matrix view
CREATE OR REPLACE VIEW v_type_compatibility_matrix AS
SELECT
    tc.id,
    pta.code as type_a_code,
    pta.name as type_a_name,
    ptb.code as type_b_code,
    ptb.name as type_b_name,
    tc.is_compatible,
    tc.compatibility_level,
    tc.base_method,
    tc.description,
    tc.analyzed_by,
    tc.analyzed_at
FROM type_compatibility tc
JOIN product_types pta ON pta.id = tc.type_a_id
JOIN product_types ptb ON ptb.id = tc.type_b_id
ORDER BY pta.code, ptb.code;

-- Product Compatibility view
CREATE OR REPLACE VIEW v_product_compatibility AS
SELECT
    pc.id,
    pc.product_a_id,
    pa.name as product_a_name,
    pa.slug as product_a_slug,
    pc.product_b_id,
    pb.name as product_b_name,
    pb.slug as product_b_slug,
    pc.type_compatible,
    pc.ai_compatible,
    pc.ai_confidence,
    pc.ai_method,
    pc.ai_steps,
    pc.ai_limitations,
    pc.ai_justification,
    pc.analyzed_at,
    pc.analyzed_by,
    CASE
        WHEN pc.ai_confidence >= 0.85 THEN 'native'
        WHEN pc.ai_confidence >= 0.70 THEN 'compatible'
        WHEN pc.ai_confidence >= 0.50 THEN 'partial'
        WHEN pc.ai_confidence >= 0.30 THEN 'difficult'
        WHEN pc.ai_confidence IS NOT NULL THEN 'not_recommended'
        ELSE 'unknown'
    END as compatibility_level
FROM product_compatibility pc
JOIN products pa ON pa.id = pc.product_a_id
JOIN products pb ON pb.id = pc.product_b_id
ORDER BY pc.ai_confidence DESC NULLS LAST;

-- Product Compatibility Summary view
CREATE OR REPLACE VIEW v_product_compatibility_summary AS
SELECT
    p.id as product_id,
    p.name as product_name,
    p.slug,
    COUNT(DISTINCT pc.id) as total_analyzed,
    COUNT(DISTINCT CASE WHEN pc.ai_compatible = TRUE THEN pc.id END) as compatible_count,
    COUNT(DISTINCT CASE WHEN pc.ai_compatible = FALSE THEN pc.id END) as incompatible_count,
    ROUND(AVG(pc.ai_confidence) * 100, 1) as avg_confidence_pct,
    MAX(pc.analyzed_at) as last_analyzed_at
FROM products p
LEFT JOIN (
    SELECT product_a_id as product_id, id, ai_compatible, ai_confidence, analyzed_at FROM product_compatibility
    UNION ALL
    SELECT product_b_id as product_id, id, ai_compatible, ai_confidence, analyzed_at FROM product_compatibility
) pc ON pc.product_id = p.id
GROUP BY p.id, p.name, p.slug
ORDER BY compatible_count DESC, p.name;

-- ============================================================
-- 7. TRIGGERS
-- ============================================================

-- Update updated_at on type_compatibility
DROP TRIGGER IF EXISTS update_type_compatibility_updated_at ON type_compatibility;
CREATE TRIGGER update_type_compatibility_updated_at
    BEFORE UPDATE ON type_compatibility
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on product_compatibility
DROP TRIGGER IF EXISTS update_product_compatibility_updated_at ON product_compatibility;
CREATE TRIGGER update_product_compatibility_updated_at
    BEFORE UPDATE ON product_compatibility
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DONE
-- ============================================================
SELECT 'Compatibility tables migration completed!' as status;
