-- ============================================================
-- Migration 012: Optimize Product Queries
-- ============================================================
-- This migration adds indexes, views, and functions to dramatically
-- improve product page and API performance.
--
-- EXPECTED IMPACT:
-- - 40-60% faster product page loads
-- - 50-70% reduction in database queries
-- - Eliminates N+1 queries for evaluations
-- ============================================================

-- ============================================================
-- PART 1: CRITICAL INDEXES
-- ============================================================

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_type_id ON products(type_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Product type mapping indexes
CREATE INDEX IF NOT EXISTS idx_product_type_mapping_product_id ON product_type_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_product_type_mapping_type_id ON product_type_mapping(type_id);
CREATE INDEX IF NOT EXISTS idx_product_type_mapping_primary ON product_type_mapping(product_id) WHERE is_primary = true;

-- Safe scoring results indexes
CREATE INDEX IF NOT EXISTS idx_safe_scoring_product_id ON safe_scoring_results(product_id);
CREATE INDEX IF NOT EXISTS idx_safe_scoring_calculated_at ON safe_scoring_results(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_safe_scoring_latest ON safe_scoring_results(product_id, calculated_at DESC);

-- Evaluations indexes
CREATE INDEX IF NOT EXISTS idx_evaluations_product_id ON evaluations(product_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_norm_id ON evaluations(norm_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_product_norm ON evaluations(product_id, norm_id);

-- Incident indexes
CREATE INDEX IF NOT EXISTS idx_incident_impact_product_id ON incident_product_impact(product_id);
CREATE INDEX IF NOT EXISTS idx_incident_impact_incident_id ON incident_product_impact(incident_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_date ON security_incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_published ON security_incidents(is_published) WHERE is_published = true;

-- Score history indexes
CREATE INDEX IF NOT EXISTS idx_score_history_product_id ON score_history(product_id);
CREATE INDEX IF NOT EXISTS idx_score_history_recorded_at ON score_history(product_id, recorded_at DESC);

-- Norms indexes
CREATE INDEX IF NOT EXISTS idx_norms_pillar ON norms(pillar);
CREATE INDEX IF NOT EXISTS idx_norms_code ON norms(code);

-- ============================================================
-- PART 2: OPTIMIZED VIEWS
-- ============================================================

-- View: Products with latest scores (eliminates multiple queries)
CREATE OR REPLACE VIEW v_products_with_scores AS
SELECT
    p.id,
    p.name,
    p.slug,
    p.url,
    p.type_id,
    p.brand_id,
    p.media,
    p.price_eur,
    p.price_details,
    p.short_description,
    p.is_active,
    p.created_at,
    p.updated_at,
    -- Latest scores
    ssr.note_finale,
    ssr.score_s,
    ssr.score_a,
    ssr.score_f,
    ssr.score_e,
    ssr.note_consumer,
    ssr.s_consumer,
    ssr.a_consumer,
    ssr.f_consumer,
    ssr.e_consumer,
    ssr.note_essential,
    ssr.s_essential,
    ssr.a_essential,
    ssr.f_essential,
    ssr.e_essential,
    ssr.total_norms_evaluated,
    ssr.total_yes,
    ssr.total_no,
    ssr.total_na,
    ssr.calculated_at AS score_calculated_at,
    -- Type info
    pt.code AS type_code,
    pt.name AS type_name,
    pt.category AS type_category,
    pt.is_hardware,
    pt.is_custodial,
    -- Brand info
    b.name AS brand_name
FROM products p
LEFT JOIN LATERAL (
    SELECT * FROM safe_scoring_results
    WHERE product_id = p.id
    ORDER BY calculated_at DESC
    LIMIT 1
) ssr ON true
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.is_active = true;

-- View: Product evaluations with norms (eliminates N+1 queries)
CREATE OR REPLACE VIEW v_evaluations_with_norms AS
SELECT
    e.id AS evaluation_id,
    e.product_id,
    e.norm_id,
    e.result,
    e.why_this_result,
    e.source,
    e.confidence,
    e.evaluated_at,
    -- Norm details
    n.code AS norm_code,
    n.pillar,
    n.title AS norm_title,
    n.description AS norm_description,
    n.weight
FROM evaluations e
JOIN norms n ON e.norm_id = n.id;

-- View: Product summary for listings (lightweight)
CREATE OR REPLACE VIEW v_products_listing AS
SELECT
    p.id,
    p.name,
    p.slug,
    p.url,
    p.media,
    p.price_eur,
    pt.code AS type_code,
    pt.name AS type_name,
    pt.category,
    pt.is_hardware,
    ssr.note_finale,
    ssr.score_s,
    ssr.score_a,
    ssr.score_f,
    ssr.score_e,
    ssr.calculated_at AS score_date
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN LATERAL (
    SELECT note_finale, score_s, score_a, score_f, score_e, calculated_at
    FROM safe_scoring_results
    WHERE product_id = p.id
    ORDER BY calculated_at DESC
    LIMIT 1
) ssr ON true
WHERE p.is_active = true;

-- ============================================================
-- PART 3: RPC FUNCTIONS (Combine Multiple Queries)
-- ============================================================

-- Function: Get complete product data in single call
CREATE OR REPLACE FUNCTION get_product_complete(p_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    product_id INTEGER;
BEGIN
    -- Get product ID first
    SELECT id INTO product_id FROM products WHERE slug = p_slug AND is_active = true;

    IF product_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Build complete JSON response
    SELECT json_build_object(
        'product', (
            SELECT row_to_json(p.*)
            FROM v_products_with_scores p
            WHERE p.id = product_id
        ),
        'evaluations', (
            SELECT COALESCE(json_agg(e.*), '[]'::json)
            FROM v_evaluations_with_norms e
            WHERE e.product_id = product_id
        ),
        'types', (
            SELECT COALESCE(json_agg(json_build_object(
                'type_id', ptm.type_id,
                'is_primary', ptm.is_primary,
                'code', pt.code,
                'name', pt.name,
                'category', pt.category,
                'is_hardware', pt.is_hardware
            )), '[]'::json)
            FROM product_type_mapping ptm
            JOIN product_types pt ON ptm.type_id = pt.id
            WHERE ptm.product_id = product_id
        ),
        'incidents_count', (
            SELECT COUNT(*)
            FROM incident_product_impact
            WHERE product_id = product_id
        ),
        'score_history', (
            SELECT COALESCE(json_agg(json_build_object(
                'recorded_at', sh.recorded_at,
                'note_finale', sh.note_finale,
                'score_s', sh.score_s,
                'score_a', sh.score_a,
                'score_f', sh.score_f,
                'score_e', sh.score_e
            ) ORDER BY sh.recorded_at DESC), '[]'::json)
            FROM (
                SELECT * FROM score_history
                WHERE product_id = product_id
                ORDER BY recorded_at DESC
                LIMIT 30
            ) sh
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Function: Get products listing with pagination and sorting
CREATE OR REPLACE FUNCTION get_products_listing(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'score',
    p_sort_order TEXT DEFAULT 'desc',
    p_category TEXT DEFAULT NULL,
    p_type_code TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_count INTEGER;
BEGIN
    -- Count total matching products
    SELECT COUNT(*) INTO total_count
    FROM v_products_listing p
    WHERE (p_category IS NULL OR p.category = p_category)
      AND (p_type_code IS NULL OR p.type_code = p_type_code)
      AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%');

    -- Get paginated results
    SELECT json_build_object(
        'products', COALESCE(json_agg(data.*), '[]'::json),
        'total', total_count,
        'limit', p_limit,
        'offset', p_offset
    ) INTO result
    FROM (
        SELECT
            p.id,
            p.name,
            p.slug,
            p.url,
            p.media,
            p.price_eur,
            p.type_code,
            p.type_name,
            p.category,
            p.is_hardware,
            p.note_finale,
            p.score_s,
            p.score_a,
            p.score_f,
            p.score_e,
            p.score_date
        FROM v_products_listing p
        WHERE (p_category IS NULL OR p.category = p_category)
          AND (p_type_code IS NULL OR p.type_code = p_type_code)
          AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%')
        ORDER BY
            CASE WHEN p_sort_by = 'score' AND p_sort_order = 'desc' THEN p.note_finale END DESC NULLS LAST,
            CASE WHEN p_sort_by = 'score' AND p_sort_order = 'asc' THEN p.note_finale END ASC NULLS LAST,
            CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN p.name END ASC,
            CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN p.name END DESC,
            CASE WHEN p_sort_by = 'date' AND p_sort_order = 'desc' THEN p.score_date END DESC NULLS LAST,
            CASE WHEN p_sort_by = 'date' AND p_sort_order = 'asc' THEN p.score_date END ASC NULLS LAST,
            CASE WHEN p_sort_by = 'price' AND p_sort_order = 'asc' THEN p.price_eur END ASC NULLS LAST,
            CASE WHEN p_sort_by = 'price' AND p_sort_order = 'desc' THEN p.price_eur END DESC NULLS LAST,
            p.name ASC
        LIMIT p_limit
        OFFSET p_offset
    ) data;

    RETURN result;
END;
$$;

-- Function: Get product incidents with pagination
CREATE OR REPLACE FUNCTION get_product_incidents(
    p_slug TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    product_id INTEGER;
    total_count INTEGER;
BEGIN
    -- Get product ID
    SELECT id INTO product_id FROM products WHERE slug = p_slug;

    IF product_id IS NULL THEN
        RETURN json_build_object('error', 'Product not found');
    END IF;

    -- Count total incidents
    SELECT COUNT(*) INTO total_count
    FROM incident_product_impact
    WHERE incident_product_impact.product_id = product_id;

    -- Get paginated incidents
    SELECT json_build_object(
        'incidents', COALESCE(json_agg(data.*), '[]'::json),
        'total', total_count,
        'limit', p_limit,
        'offset', p_offset
    ) INTO result
    FROM (
        SELECT
            si.incident_id,
            si.title,
            si.description,
            si.incident_type,
            si.severity,
            si.funds_lost_usd,
            si.incident_date,
            si.status,
            ipi.impact_level,
            ipi.funds_lost_usd AS product_funds_lost
        FROM incident_product_impact ipi
        JOIN security_incidents si ON ipi.incident_id = si.id
        WHERE ipi.product_id = product_id
          AND si.is_published = true
        ORDER BY si.incident_date DESC NULLS LAST
        LIMIT p_limit
        OFFSET p_offset
    ) data;

    RETURN result;
END;
$$;

-- Function: Get evaluation summary by pillar
CREATE OR REPLACE FUNCTION get_evaluation_summary(p_product_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'S', json_build_object(
            'total', COUNT(*) FILTER (WHERE n.pillar = 'S'),
            'yes', COUNT(*) FILTER (WHERE n.pillar = 'S' AND e.result = 'YES'),
            'no', COUNT(*) FILTER (WHERE n.pillar = 'S' AND e.result = 'NO'),
            'na', COUNT(*) FILTER (WHERE n.pillar = 'S' AND e.result = 'N/A')
        ),
        'A', json_build_object(
            'total', COUNT(*) FILTER (WHERE n.pillar = 'A'),
            'yes', COUNT(*) FILTER (WHERE n.pillar = 'A' AND e.result = 'YES'),
            'no', COUNT(*) FILTER (WHERE n.pillar = 'A' AND e.result = 'NO'),
            'na', COUNT(*) FILTER (WHERE n.pillar = 'A' AND e.result = 'N/A')
        ),
        'F', json_build_object(
            'total', COUNT(*) FILTER (WHERE n.pillar = 'F'),
            'yes', COUNT(*) FILTER (WHERE n.pillar = 'F' AND e.result = 'YES'),
            'no', COUNT(*) FILTER (WHERE n.pillar = 'F' AND e.result = 'NO'),
            'na', COUNT(*) FILTER (WHERE n.pillar = 'F' AND e.result = 'N/A')
        ),
        'E', json_build_object(
            'total', COUNT(*) FILTER (WHERE n.pillar = 'E'),
            'yes', COUNT(*) FILTER (WHERE n.pillar = 'E' AND e.result = 'YES'),
            'no', COUNT(*) FILTER (WHERE n.pillar = 'E' AND e.result = 'NO'),
            'na', COUNT(*) FILTER (WHERE n.pillar = 'E' AND e.result = 'N/A')
        )
    ) INTO result
    FROM evaluations e
    JOIN norms n ON e.norm_id = n.id
    WHERE e.product_id = p_product_id;

    RETURN result;
END;
$$;

-- ============================================================
-- PART 4: GRANT PERMISSIONS
-- ============================================================

-- Grant access to views
GRANT SELECT ON v_products_with_scores TO anon, authenticated;
GRANT SELECT ON v_evaluations_with_norms TO anon, authenticated;
GRANT SELECT ON v_products_listing TO anon, authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_product_complete(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_products_listing(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_incidents(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_evaluation_summary(INTEGER) TO anon, authenticated;

-- ============================================================
-- PART 5: ANALYZE TABLES
-- ============================================================

-- Update table statistics for query planner
ANALYZE products;
ANALYZE product_types;
ANALYZE product_type_mapping;
ANALYZE safe_scoring_results;
ANALYZE evaluations;
ANALYZE norms;
ANALYZE security_incidents;
ANALYZE incident_product_impact;
ANALYZE score_history;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- To use in code:
--
-- 1. Product page (single query):
--    const { data } = await supabase.rpc('get_product_complete', { p_slug: 'ledger-nano-x' });
--
-- 2. Products listing (paginated):
--    const { data } = await supabase.rpc('get_products_listing', {
--      p_limit: 20, p_offset: 0, p_sort_by: 'score', p_category: 'hardware'
--    });
--
-- 3. Product incidents:
--    const { data } = await supabase.rpc('get_product_incidents', { p_slug: 'ledger-nano-x' });
-- ============================================================
