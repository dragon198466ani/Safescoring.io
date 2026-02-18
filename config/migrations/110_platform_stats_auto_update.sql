-- ============================================================================
-- Migration 110: Platform Stats Auto-Update System
-- ============================================================================
-- This creates a centralized statistics table that auto-updates when data changes.
-- All front-end components will read from this table instead of hardcoded values.
-- ============================================================================

-- 1. Create the platform_stats table
CREATE TABLE IF NOT EXISTS platform_stats (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton pattern
    
    -- Core counts
    total_norms INTEGER NOT NULL DEFAULT 0,
    total_products INTEGER NOT NULL DEFAULT 0,
    total_product_types INTEGER NOT NULL DEFAULT 0,
    total_evaluations INTEGER NOT NULL DEFAULT 0,
    
    -- Norms by pillar
    norms_security INTEGER NOT NULL DEFAULT 0,      -- S pillar
    norms_adversity INTEGER NOT NULL DEFAULT 0,     -- A pillar
    norms_fidelity INTEGER NOT NULL DEFAULT 0,      -- F pillar
    norms_efficiency INTEGER NOT NULL DEFAULT 0,    -- E pillar
    
    -- Products by evaluation status
    products_evaluated INTEGER NOT NULL DEFAULT 0,
    products_pending INTEGER NOT NULL DEFAULT 0,
    
    -- Score distribution
    products_excellent INTEGER NOT NULL DEFAULT 0,  -- score >= 80
    products_good INTEGER NOT NULL DEFAULT 0,       -- score 60-79
    products_fair INTEGER NOT NULL DEFAULT 0,       -- score 40-59
    products_poor INTEGER NOT NULL DEFAULT 0,       -- score < 40
    
    -- Average scores
    avg_score_global NUMERIC(5,2) DEFAULT 0,
    avg_score_s NUMERIC(5,2) DEFAULT 0,
    avg_score_a NUMERIC(5,2) DEFAULT 0,
    avg_score_f NUMERIC(5,2) DEFAULT 0,
    avg_score_e NUMERIC(5,2) DEFAULT 0,
    
    -- Metadata
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_norm_added_at TIMESTAMPTZ,
    last_product_added_at TIMESTAMPTZ,
    last_evaluation_at TIMESTAMPTZ
);

-- Insert the singleton row if it doesn't exist
INSERT INTO platform_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Create the function to refresh all stats
CREATE OR REPLACE FUNCTION refresh_platform_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_norms INTEGER;
    v_total_products INTEGER;
    v_total_product_types INTEGER;
    v_total_evaluations INTEGER;
    v_norms_s INTEGER;
    v_norms_a INTEGER;
    v_norms_f INTEGER;
    v_norms_e INTEGER;
    v_products_evaluated INTEGER;
    v_products_excellent INTEGER;
    v_products_good INTEGER;
    v_products_fair INTEGER;
    v_products_poor INTEGER;
    v_avg_global NUMERIC(5,2);
    v_avg_s NUMERIC(5,2);
    v_avg_a NUMERIC(5,2);
    v_avg_f NUMERIC(5,2);
    v_avg_e NUMERIC(5,2);
BEGIN
    -- Count norms total
    SELECT COUNT(*) INTO v_total_norms FROM norms;
    
    -- Count norms by pillar (assuming pillar column exists)
    SELECT 
        COALESCE(SUM(CASE WHEN pillar = 'S' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN pillar = 'A' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN pillar = 'F' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN pillar = 'E' THEN 1 ELSE 0 END), 0)
    INTO v_norms_s, v_norms_a, v_norms_f, v_norms_e
    FROM norms;
    
    -- Count products
    SELECT COUNT(*) INTO v_total_products FROM products;
    
    -- Count product types
    SELECT COUNT(*) INTO v_total_product_types FROM product_types;
    
    -- Count evaluations
    SELECT COUNT(*) INTO v_total_evaluations FROM safe_scoring_results;
    
    -- Count evaluated products (distinct products with scores)
    SELECT COUNT(DISTINCT product_id) INTO v_products_evaluated 
    FROM safe_scoring_results 
    WHERE note_finale IS NOT NULL;
    
    -- Score distribution (using latest score per product)
    WITH latest_scores AS (
        SELECT DISTINCT ON (product_id) 
            product_id, 
            note_finale
        FROM safe_scoring_results
        WHERE note_finale IS NOT NULL
        ORDER BY product_id, calculated_at DESC
    )
    SELECT 
        COALESCE(SUM(CASE WHEN note_finale >= 80 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN note_finale >= 60 AND note_finale < 80 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN note_finale >= 40 AND note_finale < 60 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN note_finale < 40 THEN 1 ELSE 0 END), 0)
    INTO v_products_excellent, v_products_good, v_products_fair, v_products_poor
    FROM latest_scores;
    
    -- Average scores
    WITH latest_scores AS (
        SELECT DISTINCT ON (product_id) 
            product_id, 
            note_finale,
            score_s,
            score_a,
            score_f,
            score_e
        FROM safe_scoring_results
        WHERE note_finale IS NOT NULL
        ORDER BY product_id, calculated_at DESC
    )
    SELECT 
        COALESCE(ROUND(AVG(note_finale)::numeric, 2), 0),
        COALESCE(ROUND(AVG(score_s)::numeric, 2), 0),
        COALESCE(ROUND(AVG(score_a)::numeric, 2), 0),
        COALESCE(ROUND(AVG(score_f)::numeric, 2), 0),
        COALESCE(ROUND(AVG(score_e)::numeric, 2), 0)
    INTO v_avg_global, v_avg_s, v_avg_a, v_avg_f, v_avg_e
    FROM latest_scores;
    
    -- Update the stats table
    UPDATE platform_stats SET
        total_norms = v_total_norms,
        total_products = v_total_products,
        total_product_types = v_total_product_types,
        total_evaluations = v_total_evaluations,
        norms_security = v_norms_s,
        norms_adversity = v_norms_a,
        norms_fidelity = v_norms_f,
        norms_efficiency = v_norms_e,
        products_evaluated = v_products_evaluated,
        products_pending = v_total_products - v_products_evaluated,
        products_excellent = v_products_excellent,
        products_good = v_products_good,
        products_fair = v_products_fair,
        products_poor = v_products_poor,
        avg_score_global = v_avg_global,
        avg_score_s = v_avg_s,
        avg_score_a = v_avg_a,
        avg_score_f = v_avg_f,
        avg_score_e = v_avg_e,
        last_updated_at = NOW()
    WHERE id = 1;
    
    RAISE NOTICE 'Platform stats refreshed: % norms, % products, % types', 
        v_total_norms, v_total_products, v_total_product_types;
END;
$$;

-- 3. Create trigger function for auto-refresh
CREATE OR REPLACE FUNCTION trigger_refresh_platform_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Debounce: only refresh if last update was more than 5 seconds ago
    -- This prevents excessive updates during bulk operations
    IF EXISTS (
        SELECT 1 FROM platform_stats 
        WHERE id = 1 
        AND last_updated_at < NOW() - INTERVAL '5 seconds'
    ) THEN
        PERFORM refresh_platform_stats();
    END IF;
    
    RETURN NULL; -- For AFTER triggers
END;
$$;

-- 4. Create triggers on relevant tables
DROP TRIGGER IF EXISTS trg_norms_stats_refresh ON norms;
CREATE TRIGGER trg_norms_stats_refresh
    AFTER INSERT OR UPDATE OR DELETE ON norms
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_platform_stats();

DROP TRIGGER IF EXISTS trg_products_stats_refresh ON products;
CREATE TRIGGER trg_products_stats_refresh
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_platform_stats();

DROP TRIGGER IF EXISTS trg_product_types_stats_refresh ON product_types;
CREATE TRIGGER trg_product_types_stats_refresh
    AFTER INSERT OR UPDATE OR DELETE ON product_types
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_platform_stats();

DROP TRIGGER IF EXISTS trg_scores_stats_refresh ON safe_scoring_results;
CREATE TRIGGER trg_scores_stats_refresh
    AFTER INSERT OR UPDATE OR DELETE ON safe_scoring_results
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_platform_stats();

-- 5. Initial refresh
SELECT refresh_platform_stats();

-- 6. Create a view for easy access
CREATE OR REPLACE VIEW v_platform_stats AS
SELECT 
    total_norms,
    total_products,
    total_product_types,
    total_evaluations,
    norms_security AS norms_s,
    norms_adversity AS norms_a,
    norms_fidelity AS norms_f,
    norms_efficiency AS norms_e,
    products_evaluated,
    products_pending,
    products_excellent,
    products_good,
    products_fair,
    products_poor,
    avg_score_global,
    avg_score_s,
    avg_score_a,
    avg_score_f,
    avg_score_e,
    last_updated_at,
    -- Formatted strings for direct use in UI
    total_norms || ' norms' AS norms_label,
    total_products || '+ products' AS products_label,
    total_product_types || ' types' AS types_label
FROM platform_stats
WHERE id = 1;

-- 7. Grant access
GRANT SELECT ON platform_stats TO anon, authenticated;
GRANT SELECT ON v_platform_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_platform_stats() TO authenticated;

-- 8. Add RLS policy
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform stats are publicly readable"
    ON platform_stats FOR SELECT
    USING (true);

COMMENT ON TABLE platform_stats IS 'Centralized platform statistics - auto-updated via triggers. Single source of truth for all stats displayed on the website.';
COMMENT ON FUNCTION refresh_platform_stats() IS 'Refreshes all platform statistics. Called automatically by triggers or manually when needed.';
