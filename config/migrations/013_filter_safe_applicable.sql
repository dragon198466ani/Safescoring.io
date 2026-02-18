-- ============================================================
-- MIGRATION 013: Filter products by is_safe_applicable
-- ============================================================
-- Only show products whose type has is_safe_applicable = TRUE
-- This ensures the website only displays products that can be scored
-- ============================================================

-- ============================================================
-- PART 1: UPDATE VIEW v_products_listing
-- ============================================================

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
    pt.is_safe_applicable,
    ssr.note_finale,
    ssr.score_s,
    ssr.score_a,
    ssr.score_f,
    ssr.score_e,
    ssr.calculated_at AS score_date
FROM products p
INNER JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN LATERAL (
    SELECT note_finale, score_s, score_a, score_f, score_e, calculated_at
    FROM safe_scoring_results
    WHERE product_id = p.id
    ORDER BY calculated_at DESC
    LIMIT 1
) ssr ON true
WHERE pt.is_safe_applicable = true;  -- Only types with SAFE score applicable

-- ============================================================
-- PART 2: GRANT PERMISSIONS
-- ============================================================

GRANT SELECT ON v_products_listing TO anon, authenticated;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Changes:
-- 1. Changed LEFT JOIN to INNER JOIN for product_types (must have a type)
-- 2. Added filter: pt.is_safe_applicable = true
-- 3. Added is_safe_applicable column to view output
-- 4. Removed p.is_active filter (column doesn't exist)
-- ============================================================
