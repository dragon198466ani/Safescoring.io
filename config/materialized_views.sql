-- ============================================================
-- Materialized Views for SafeScoring
-- Pre-computed data for faster queries
-- ============================================================

-- 1. Products with all scores - MATERIALIZED for fast reads
DROP MATERIALIZED VIEW IF EXISTS mv_products_with_scores CASCADE;

CREATE MATERIALIZED VIEW mv_products_with_scores AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.slug,
    p.url,
    p.type_id,
    p.media,
    p.short_description,
    pt.code AS type_code,
    pt.name AS type_name,
    pt.category,
    pt.is_hardware,
    pt.is_custodial,
    -- Full scores
    COALESCE(ssr.note_finale, 0) AS note_finale,
    COALESCE(ssr.score_s, 0) AS pilier_s,
    COALESCE(ssr.score_a, 0) AS pilier_a,
    COALESCE(ssr.score_f, 0) AS pilier_f,
    COALESCE(ssr.score_e, 0) AS pilier_e,
    -- Consumer scores
    COALESCE(ssr.note_consumer, 0) AS note_consumer,
    COALESCE(ssr.s_consumer, 0) AS s_consumer,
    COALESCE(ssr.a_consumer, 0) AS a_consumer,
    COALESCE(ssr.f_consumer, 0) AS f_consumer,
    COALESCE(ssr.e_consumer, 0) AS e_consumer,
    -- Essential scores
    COALESCE(ssr.note_essential, 0) AS note_essential,
    COALESCE(ssr.s_essential, 0) AS s_essential,
    COALESCE(ssr.a_essential, 0) AS a_essential,
    COALESCE(ssr.f_essential, 0) AS f_essential,
    COALESCE(ssr.e_essential, 0) AS e_essential,
    -- Stats
    COALESCE(ssr.total_norms_evaluated, 0) AS total_norms,
    COALESCE(ssr.total_yes, 0) AS total_yes,
    COALESCE(ssr.total_no, 0) AS total_no,
    COALESCE(ssr.total_na, 0) AS total_na,
    ssr.calculated_at AS last_update,
    -- Has valid score
    (ssr.note_finale IS NOT NULL) AS has_score
FROM products p
LEFT JOIN product_types pt ON pt.id = p.type_id
LEFT JOIN safe_scoring_results ssr ON ssr.product_id = p.id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON mv_products_with_scores (product_id);
CREATE INDEX ON mv_products_with_scores (note_finale DESC NULLS LAST);
CREATE INDEX ON mv_products_with_scores (category);
CREATE INDEX ON mv_products_with_scores (type_code);
CREATE INDEX ON mv_products_with_scores (slug);

-- 2. Product rankings by category - pre-computed
DROP MATERIALIZED VIEW IF EXISTS mv_product_rankings CASCADE;

CREATE MATERIALIZED VIEW mv_product_rankings AS
WITH ranked_products AS (
    SELECT
        p.id AS product_id,
        p.name,
        p.slug,
        pt.category,
        pt.code AS type_code,
        pt.name AS type_name,
        ssr.note_finale,
        ssr.score_s,
        ssr.score_a,
        ssr.score_f,
        ssr.score_e,
        ROW_NUMBER() OVER (
            PARTITION BY pt.category
            ORDER BY ssr.note_finale DESC NULLS LAST
        ) AS category_rank,
        ROW_NUMBER() OVER (
            PARTITION BY pt.id
            ORDER BY ssr.note_finale DESC NULLS LAST
        ) AS type_rank,
        ROW_NUMBER() OVER (
            ORDER BY ssr.note_finale DESC NULLS LAST
        ) AS global_rank
    FROM products p
    JOIN product_types pt ON pt.id = p.type_id
    JOIN safe_scoring_results ssr ON ssr.product_id = p.id
    WHERE ssr.note_finale IS NOT NULL
)
SELECT * FROM ranked_products;

CREATE UNIQUE INDEX ON mv_product_rankings (product_id);
CREATE INDEX ON mv_product_rankings (category, category_rank);
CREATE INDEX ON mv_product_rankings (type_code, type_rank);
CREATE INDEX ON mv_product_rankings (global_rank);

-- 3. Aggregated stats per category
DROP MATERIALIZED VIEW IF EXISTS mv_category_stats CASCADE;

CREATE MATERIALIZED VIEW mv_category_stats AS
SELECT
    pt.category,
    COUNT(DISTINCT p.id) AS product_count,
    COUNT(DISTINCT CASE WHEN ssr.note_finale IS NOT NULL THEN p.id END) AS scored_count,
    ROUND(AVG(ssr.note_finale)::numeric, 1) AS avg_score,
    ROUND(AVG(ssr.score_s)::numeric, 1) AS avg_security,
    ROUND(AVG(ssr.score_a)::numeric, 1) AS avg_accessibility,
    ROUND(AVG(ssr.score_f)::numeric, 1) AS avg_freedom,
    ROUND(AVG(ssr.score_e)::numeric, 1) AS avg_experience,
    MIN(ssr.note_finale) AS min_score,
    MAX(ssr.note_finale) AS max_score,
    COUNT(DISTINCT CASE WHEN ssr.note_finale >= 90 THEN p.id END) AS excellent_count,
    COUNT(DISTINCT CASE WHEN ssr.note_finale >= 70 AND ssr.note_finale < 90 THEN p.id END) AS good_count,
    COUNT(DISTINCT CASE WHEN ssr.note_finale < 50 THEN p.id END) AS poor_count
FROM products p
JOIN product_types pt ON pt.id = p.type_id
LEFT JOIN safe_scoring_results ssr ON ssr.product_id = p.id
GROUP BY pt.category;

CREATE UNIQUE INDEX ON mv_category_stats (category);

-- 4. Incident summary per product - pre-computed
DROP MATERIALIZED VIEW IF EXISTS mv_product_incident_summary CASCADE;

CREATE MATERIALIZED VIEW mv_product_incident_summary AS
SELECT
    ipi.product_id,
    COUNT(DISTINCT si.id) AS total_incidents,
    SUM(COALESCE(ipi.funds_lost_usd, si.funds_lost_usd, 0)) AS total_funds_lost,
    COUNT(DISTINCT CASE WHEN si.severity = 'critical' THEN si.id END) AS critical_count,
    COUNT(DISTINCT CASE WHEN si.severity = 'high' THEN si.id END) AS high_count,
    COUNT(DISTINCT CASE WHEN si.severity = 'medium' THEN si.id END) AS medium_count,
    COUNT(DISTINCT CASE WHEN si.severity = 'low' THEN si.id END) AS low_count,
    COUNT(DISTINCT CASE WHEN si.status != 'resolved' THEN si.id END) AS active_count,
    MAX(si.incident_date) AS last_incident_date,
    CASE
        WHEN COUNT(DISTINCT CASE WHEN si.severity = 'critical' AND si.status != 'resolved' THEN si.id END) > 0 THEN 'critical'
        WHEN COUNT(DISTINCT CASE WHEN si.severity = 'critical' THEN si.id END) > 2 THEN 'critical'
        WHEN COUNT(DISTINCT CASE WHEN si.severity = 'high' AND si.status != 'resolved' THEN si.id END) > 0 THEN 'high'
        WHEN COUNT(DISTINCT CASE WHEN si.severity = 'high' THEN si.id END) > 0 THEN 'high'
        WHEN COUNT(DISTINCT CASE WHEN si.severity = 'medium' THEN si.id END) > 0 THEN 'medium'
        ELSE 'low'
    END AS risk_level
FROM incident_product_impact ipi
JOIN security_incidents si ON si.id = ipi.incident_id
WHERE si.is_published = true
GROUP BY ipi.product_id;

CREATE UNIQUE INDEX ON mv_product_incident_summary (product_id);
CREATE INDEX ON mv_product_incident_summary (risk_level);
CREATE INDEX ON mv_product_incident_summary (total_funds_lost DESC);

-- 5. Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_products_with_scores;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_rankings;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_incident_summary;
END;
$$;

-- 6. Function to refresh single product view (faster for single updates)
CREATE OR REPLACE FUNCTION refresh_product_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only refresh the main products view (others depend on it)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_products_with_scores;
END;
$$;

-- Grant permissions
GRANT SELECT ON mv_products_with_scores TO anon, authenticated;
GRANT SELECT ON mv_product_rankings TO anon, authenticated;
GRANT SELECT ON mv_category_stats TO anon, authenticated;
GRANT SELECT ON mv_product_incident_summary TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_all_materialized_views TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_product_views TO authenticated;

-- Comments
COMMENT ON MATERIALIZED VIEW mv_products_with_scores IS 'Pre-computed product list with all score types for fast API queries';
COMMENT ON MATERIALIZED VIEW mv_product_rankings IS 'Pre-computed product rankings by category, type, and global';
COMMENT ON MATERIALIZED VIEW mv_category_stats IS 'Aggregated statistics per product category';
COMMENT ON MATERIALIZED VIEW mv_product_incident_summary IS 'Pre-computed incident summary per product';

-- Schedule refresh (run via cron or Supabase pg_cron)
-- Example: CALL refresh_all_materialized_views() every 5 minutes
