-- ============================================================
-- Migration 061: Unify Score Data Sources
-- Objective: "La bonne information au bon endroit"
--
-- This migration ensures safe_scoring_results is the SINGLE
-- source of truth for all scores. Removes redundant score
-- storage in products.specs and adds helper views/functions.
-- ============================================================

-- ============================================================
-- 1. CREATE VIEW: Unified product scores (replaces products.specs scores)
-- ============================================================
CREATE OR REPLACE VIEW v_product_scores AS
SELECT
    p.id AS product_id,
    p.name,
    p.slug,
    pt.code AS type_code,
    pt.name AS type_name,
    pt.category,

    -- Full scores (main scores)
    ssr.note_finale AS safe_score,
    ssr.score_s AS security_score,
    ssr.score_a AS adversity_score,
    ssr.score_f AS fidelity_score,
    ssr.score_e AS efficiency_score,

    -- Consumer scores
    ssr.note_consumer,
    ssr.s_consumer,
    ssr.a_consumer,
    ssr.f_consumer,
    ssr.e_consumer,

    -- Essential scores
    ssr.note_essential,
    ssr.s_essential,
    ssr.a_essential,
    ssr.f_essential,
    ssr.e_essential,

    -- Statistics
    ssr.total_norms_evaluated,
    ssr.total_yes,
    ssr.total_no,
    ssr.total_na,
    ssr.total_tbd,

    -- Timestamps
    ssr.calculated_at AS score_calculated_at,
    ssr.last_evaluation_date,

    -- Derived metrics
    CASE
        WHEN ssr.total_tbd > 0 THEN 'low'
        WHEN ssr.total_norms_evaluated < 50 THEN 'medium'
        ELSE 'high'
    END AS score_reliability,

    CASE
        WHEN ssr.note_finale >= 80 THEN 'excellent'
        WHEN ssr.note_finale >= 60 THEN 'good'
        WHEN ssr.note_finale >= 40 THEN 'average'
        WHEN ssr.note_finale >= 20 THEN 'poor'
        ELSE 'critical'
    END AS score_tier

FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id;

COMMENT ON VIEW v_product_scores IS 'Unified view of product scores - SINGLE SOURCE OF TRUTH. Use this instead of products.specs for score data.';

-- ============================================================
-- 2. CREATE FUNCTION: Get scores for API (optimized)
-- ============================================================
CREATE OR REPLACE FUNCTION get_product_scores_api(p_slug TEXT)
RETURNS TABLE (
    product_id INTEGER,
    name TEXT,
    slug TEXT,
    type_code TEXT,
    type_name TEXT,
    category TEXT,
    safe_score DECIMAL(5,2),
    scores JSONB,
    consumer_scores JSONB,
    essential_scores JSONB,
    stats JSONB,
    score_reliability TEXT,
    calculated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name::TEXT,
        p.slug::TEXT,
        pt.code::TEXT,
        pt.name::TEXT,
        pt.category::TEXT,
        ssr.note_finale,
        jsonb_build_object(
            'total', ssr.note_finale,
            's', ssr.score_s,
            'a', ssr.score_a,
            'f', ssr.score_f,
            'e', ssr.score_e
        ),
        jsonb_build_object(
            'total', ssr.note_consumer,
            's', ssr.s_consumer,
            'a', ssr.a_consumer,
            'f', ssr.f_consumer,
            'e', ssr.e_consumer
        ),
        jsonb_build_object(
            'total', ssr.note_essential,
            's', ssr.s_essential,
            'a', ssr.a_essential,
            'f', ssr.f_essential,
            'e', ssr.e_essential
        ),
        jsonb_build_object(
            'totalNorms', ssr.total_norms_evaluated,
            'yes', ssr.total_yes,
            'no', ssr.total_no,
            'na', ssr.total_na,
            'tbd', ssr.total_tbd
        ),
        CASE
            WHEN ssr.total_tbd > 0 THEN 'low'
            WHEN ssr.total_norms_evaluated < 50 THEN 'medium'
            ELSE 'high'
        END,
        ssr.calculated_at
    FROM products p
    LEFT JOIN product_types pt ON p.type_id = pt.id
    LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
    WHERE p.slug = p_slug;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_product_scores_api IS 'Optimized function to get scores for API. Returns JSONB formatted for direct API response.';

-- ============================================================
-- 3. ADD TBD TRACKING: Count TBD evaluations for monitoring
-- ============================================================
CREATE OR REPLACE VIEW v_products_with_tbd AS
SELECT
    p.id AS product_id,
    p.name,
    p.slug,
    COUNT(*) FILTER (WHERE e.result = 'TBD') AS tbd_count,
    COUNT(*) AS total_evaluations,
    ROUND(100.0 * COUNT(*) FILTER (WHERE e.result = 'TBD') / NULLIF(COUNT(*), 0), 1) AS tbd_percentage,
    MAX(e.evaluation_date) AS last_evaluation,
    ARRAY_AGG(DISTINCT n.code ORDER BY n.code) FILTER (WHERE e.result = 'TBD') AS tbd_norms
FROM products p
LEFT JOIN evaluations e ON p.id = e.product_id
LEFT JOIN norms n ON e.norm_id = n.id
GROUP BY p.id, p.name, p.slug
HAVING COUNT(*) FILTER (WHERE e.result = 'TBD') > 0
ORDER BY tbd_count DESC;

COMMENT ON VIEW v_products_with_tbd IS 'Products with unresolved TBD evaluations - use for monitoring and cleanup';

-- ============================================================
-- 4. CREATE FUNCTION: Resolve stale TBD evaluations
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_stale_tbd_evaluations(
    p_days_threshold INTEGER DEFAULT 7,
    p_max_resolve INTEGER DEFAULT 100
)
RETURNS TABLE (
    resolved_count INTEGER,
    products_affected INTEGER,
    details JSONB
) AS $$
DECLARE
    v_resolved INT := 0;
    v_products INT := 0;
    v_details JSONB := '[]'::JSONB;
BEGIN
    -- Archive old evaluations before updating
    INSERT INTO evaluation_history (product_id, norm_id, result, why_this_result, evaluated_by, evaluation_date, archived_at)
    SELECT product_id, norm_id, result, why_this_result, evaluated_by, evaluation_date, NOW()
    FROM evaluations
    WHERE result = 'TBD'
      AND evaluation_date < NOW() - (p_days_threshold || ' days')::INTERVAL
    LIMIT p_max_resolve;

    -- Update TBD to NO with explanation
    WITH updated AS (
        UPDATE evaluations
        SET result = 'NO',
            why_this_result = COALESCE(why_this_result, '') ||
                ' [AUTO-RESOLVED: TBD after ' || p_days_threshold || ' days without resolution - defaulted to NO per conservative policy]',
            evaluated_by = 'auto_tbd_resolver',
            evaluation_date = CURRENT_DATE
        WHERE result = 'TBD'
          AND evaluation_date < NOW() - (p_days_threshold || ' days')::INTERVAL
        RETURNING product_id, norm_id
    )
    SELECT
        COUNT(*)::INTEGER,
        COUNT(DISTINCT product_id)::INTEGER
    INTO v_resolved, v_products
    FROM updated;

    -- Build details
    v_details := jsonb_build_object(
        'threshold_days', p_days_threshold,
        'resolved_at', NOW(),
        'policy', 'Conservative: TBD defaults to NO after threshold'
    );

    RETURN QUERY SELECT v_resolved, v_products, v_details;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resolve_stale_tbd_evaluations IS 'Automatically resolve TBD evaluations older than threshold to NO (conservative policy). Archives old values first.';

-- ============================================================
-- 5. CREATE INDEX: Optimize TBD queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_evaluations_tbd
ON evaluations(product_id, evaluation_date)
WHERE result = 'TBD';

COMMENT ON INDEX idx_evaluations_tbd IS 'Index for finding TBD evaluations that need resolution';

-- ============================================================
-- 6. ADD score_history trigger for REAL changes only
-- ============================================================
CREATE OR REPLACE FUNCTION record_real_score_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if score actually changed by more than 0.5 points
    IF OLD.note_finale IS DISTINCT FROM NEW.note_finale
       AND ABS(COALESCE(NEW.note_finale, 0) - COALESCE(OLD.note_finale, 0)) > 0.5 THEN
        INSERT INTO score_history (
            product_id,
            safe_score,
            score_s,
            score_a,
            score_f,
            score_e,
            recorded_at,
            triggered_by,
            score_change
        ) VALUES (
            NEW.product_id,
            NEW.note_finale,
            NEW.score_s,
            NEW.score_a,
            NEW.score_f,
            NEW.score_e,
            NOW(),
            'score_change_trigger',
            NEW.note_finale - COALESCE(OLD.note_finale, 0)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_score_history_on_change ON safe_scoring_results;
CREATE TRIGGER trigger_score_history_on_change
    AFTER UPDATE ON safe_scoring_results
    FOR EACH ROW
    EXECUTE FUNCTION record_real_score_change();

COMMENT ON TRIGGER trigger_score_history_on_change ON safe_scoring_results IS 'Records real score changes (>0.5 points) to score_history for tracking';

-- ============================================================
-- 7. ADD COLUMN: Mark synthetic vs real history
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'score_history' AND column_name = 'is_synthetic'
    ) THEN
        ALTER TABLE score_history ADD COLUMN is_synthetic BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN score_history.is_synthetic IS 'TRUE for demo/generated data, FALSE for real score changes';

        -- Mark existing demo data
        UPDATE score_history SET is_synthetic = TRUE WHERE triggered_by = 'demo_generator';
    END IF;
END $$;

-- ============================================================
-- 8. SUMMARY
-- ============================================================
DO $$
DECLARE
    v_products_with_scores INT;
    v_products_with_tbd INT;
    v_total_tbd INT;
BEGIN
    SELECT COUNT(*) INTO v_products_with_scores
    FROM safe_scoring_results WHERE note_finale IS NOT NULL;

    SELECT COUNT(DISTINCT product_id) INTO v_products_with_tbd
    FROM evaluations WHERE result = 'TBD';

    SELECT COUNT(*) INTO v_total_tbd
    FROM evaluations WHERE result = 'TBD';

    RAISE NOTICE 'Migration 061 complete:';
    RAISE NOTICE '  Products with scores: %', v_products_with_scores;
    RAISE NOTICE '  Products with TBD: %', v_products_with_tbd;
    RAISE NOTICE '  Total TBD evaluations: %', v_total_tbd;
    RAISE NOTICE '';
    RAISE NOTICE 'SINGLE SOURCE OF TRUTH:';
    RAISE NOTICE '  - Use safe_scoring_results for all score queries';
    RAISE NOTICE '  - Use v_product_scores view for API-ready data';
    RAISE NOTICE '  - Use get_product_scores_api() for optimized API calls';
    RAISE NOTICE '  - Call resolve_stale_tbd_evaluations() to clean up TBD';
END $$;
