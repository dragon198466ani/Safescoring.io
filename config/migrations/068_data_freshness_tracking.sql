-- ============================================================================
-- MIGRATION 068: Data Freshness Tracking System
-- SafeScoring - 2026-01-15
-- ============================================================================
-- Tracks which data is new vs needs updating, enabling smart refresh logic
-- ============================================================================

-- ============================================================================
-- 1. ADD VERSION TRACKING TO PRODUCTS
-- ============================================================================
-- Track when product data changed (triggers re-evaluation)

ALTER TABLE products
ADD COLUMN IF NOT EXISTS data_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ;

COMMENT ON COLUMN products.data_version IS 'Incremented when product data changes significantly';
COMMENT ON COLUMN products.data_updated_at IS 'Timestamp of last product data modification';
COMMENT ON COLUMN products.last_evaluated_at IS 'Timestamp of last AI evaluation run for this product';

-- Index for finding stale products
CREATE INDEX IF NOT EXISTS idx_products_needs_eval
ON products(last_evaluated_at, data_updated_at)
WHERE last_evaluated_at IS NULL OR last_evaluated_at < data_updated_at;


-- ============================================================================
-- 2. ADD VERSION TRACKING TO NORMS
-- ============================================================================
-- Track when norm data changed (triggers re-evaluation of all affected products)

ALTER TABLE norms
ADD COLUMN IF NOT EXISTS data_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS summary_version INTEGER DEFAULT 0;

COMMENT ON COLUMN norms.data_version IS 'Incremented when norm requirements change';
COMMENT ON COLUMN norms.data_updated_at IS 'Timestamp of last norm modification';
COMMENT ON COLUMN norms.last_summarized_at IS 'Timestamp of AI summary generation';
COMMENT ON COLUMN norms.summary_version IS 'Version of the summary (for cache invalidation)';

-- Index for finding norms needing summary
CREATE INDEX IF NOT EXISTS idx_norms_needs_summary
ON norms(last_summarized_at)
WHERE last_summarized_at IS NULL OR official_doc_summary IS NULL;


-- ============================================================================
-- 3. ADD FRESHNESS TRACKING TO EVALUATIONS
-- ============================================================================
-- Track which evaluations are stale and need refresh

ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS product_version_at_eval INTEGER,
ADD COLUMN IF NOT EXISTS norm_version_at_eval INTEGER,
ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS staleness_reason VARCHAR(50);

COMMENT ON COLUMN evaluations.product_version_at_eval IS 'Product data_version when evaluation was made';
COMMENT ON COLUMN evaluations.norm_version_at_eval IS 'Norm data_version when evaluation was made';
COMMENT ON COLUMN evaluations.is_stale IS 'True if product or norm changed since evaluation';
COMMENT ON COLUMN evaluations.staleness_reason IS 'Why evaluation is stale: product_changed, norm_changed, time_expired';

-- Index for finding stale evaluations
CREATE INDEX IF NOT EXISTS idx_evaluations_stale
ON evaluations(is_stale, product_id, norm_id)
WHERE is_stale = TRUE;


-- ============================================================================
-- 4. FUNCTION: Mark Evaluations Stale When Product Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_evaluations_stale_on_product_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if data actually changed (not just metadata)
    IF OLD.data_version IS DISTINCT FROM NEW.data_version THEN
        UPDATE evaluations
        SET is_stale = TRUE,
            staleness_reason = 'product_changed'
        WHERE product_id = NEW.id
          AND is_stale = FALSE;

        RAISE NOTICE 'Marked evaluations stale for product %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_change_stale ON products;
CREATE TRIGGER trigger_product_change_stale
    AFTER UPDATE OF data_version ON products
    FOR EACH ROW
    EXECUTE FUNCTION mark_evaluations_stale_on_product_change();


-- ============================================================================
-- 5. FUNCTION: Mark Evaluations Stale When Norm Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_evaluations_stale_on_norm_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.data_version IS DISTINCT FROM NEW.data_version THEN
        UPDATE evaluations
        SET is_stale = TRUE,
            staleness_reason = 'norm_changed'
        WHERE norm_id = NEW.id
          AND is_stale = FALSE;

        RAISE NOTICE 'Marked evaluations stale for norm %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_norm_change_stale ON norms;
CREATE TRIGGER trigger_norm_change_stale
    AFTER UPDATE OF data_version ON norms
    FOR EACH ROW
    EXECUTE FUNCTION mark_evaluations_stale_on_norm_change();


-- ============================================================================
-- 6. FUNCTION: Get Items Needing Evaluation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_evaluations(
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    product_id INTEGER,
    product_slug VARCHAR,
    norm_id INTEGER,
    norm_code VARCHAR,
    reason VARCHAR
) AS $$
BEGIN
    RETURN QUERY

    -- 1. New products without any evaluations
    SELECT DISTINCT
        p.id as product_id,
        p.slug as product_slug,
        n.id as norm_id,
        n.code as norm_code,
        'new_product'::VARCHAR as reason
    FROM products p
    CROSS JOIN norms n
    LEFT JOIN evaluations e ON e.product_id = p.id AND e.norm_id = n.id
    WHERE e.id IS NULL
      AND p.last_evaluated_at IS NULL

    UNION ALL

    -- 2. Stale evaluations (product or norm changed)
    SELECT
        e.product_id,
        p.slug as product_slug,
        e.norm_id,
        n.code as norm_code,
        e.staleness_reason::VARCHAR as reason
    FROM evaluations e
    JOIN products p ON p.id = e.product_id
    JOIN norms n ON n.id = e.norm_id
    WHERE e.is_stale = TRUE

    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 7. FUNCTION: Get Norms Needing Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_norms_needing_summary(
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    norm_id INTEGER,
    norm_code VARCHAR,
    norm_title TEXT,
    official_link TEXT,
    reason VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id as norm_id,
        n.code as norm_code,
        n.title as norm_title,
        n.official_link,
        CASE
            WHEN n.official_doc_summary IS NULL THEN 'never_summarized'
            WHEN n.last_summarized_at IS NULL THEN 'no_timestamp'
            WHEN n.last_summarized_at < n.data_updated_at THEN 'norm_updated'
            ELSE 'refresh_needed'
        END::VARCHAR as reason
    FROM norms n
    WHERE n.official_doc_summary IS NULL
       OR n.last_summarized_at IS NULL
       OR n.last_summarized_at < n.data_updated_at
    ORDER BY
        CASE WHEN n.official_doc_summary IS NULL THEN 0 ELSE 1 END,
        n.data_updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 8. HELPER: Increment Product Version
-- ============================================================================
-- Call this when product data changes significantly

CREATE OR REPLACE FUNCTION bump_product_version(p_product_id INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET data_version = data_version + 1,
        data_updated_at = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 9. HELPER: Increment Norm Version
-- ============================================================================
-- Call this when norm requirements change

CREATE OR REPLACE FUNCTION bump_norm_version(p_norm_id INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE norms
    SET data_version = data_version + 1,
        data_updated_at = NOW()
    WHERE id = p_norm_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 10. HELPER: Mark Evaluation Complete
-- ============================================================================
-- Call this after AI evaluation is done

CREATE OR REPLACE FUNCTION mark_evaluation_complete(
    p_product_id INTEGER,
    p_norm_id INTEGER
)
RETURNS void AS $$
DECLARE
    v_product_version INTEGER;
    v_norm_version INTEGER;
BEGIN
    -- Get current versions
    SELECT data_version INTO v_product_version FROM products WHERE id = p_product_id;
    SELECT data_version INTO v_norm_version FROM norms WHERE id = p_norm_id;

    -- Update evaluation with version info
    UPDATE evaluations
    SET is_stale = FALSE,
        staleness_reason = NULL,
        product_version_at_eval = v_product_version,
        norm_version_at_eval = v_norm_version,
        evaluation_date = NOW()
    WHERE product_id = p_product_id AND norm_id = p_norm_id;

    -- Update product's last evaluated timestamp
    UPDATE products
    SET last_evaluated_at = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 11. VIEW: Data Freshness Dashboard
-- ============================================================================

CREATE OR REPLACE VIEW v_data_freshness AS
SELECT
    'products' as entity_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE last_evaluated_at IS NULL) as never_evaluated,
    COUNT(*) FILTER (WHERE last_evaluated_at < data_updated_at) as stale,
    COUNT(*) FILTER (WHERE last_evaluated_at >= data_updated_at) as fresh
FROM products

UNION ALL

SELECT
    'norms' as entity_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE official_doc_summary IS NULL) as never_evaluated,
    COUNT(*) FILTER (WHERE last_summarized_at IS NULL OR last_summarized_at < data_updated_at) as stale,
    COUNT(*) FILTER (WHERE last_summarized_at >= data_updated_at) as fresh
FROM norms

UNION ALL

SELECT
    'evaluations' as entity_type,
    COUNT(*) as total,
    0 as never_evaluated,
    COUNT(*) FILTER (WHERE is_stale = TRUE) as stale,
    COUNT(*) FILTER (WHERE is_stale = FALSE OR is_stale IS NULL) as fresh
FROM evaluations;


-- ============================================================================
-- 12. STATS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_data_freshness_stats()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'products', jsonb_build_object(
            'total', COUNT(*),
            'never_evaluated', COUNT(*) FILTER (WHERE last_evaluated_at IS NULL),
            'stale', COUNT(*) FILTER (WHERE last_evaluated_at < data_updated_at),
            'fresh', COUNT(*) FILTER (WHERE last_evaluated_at >= data_updated_at)
        )
    ) INTO v_result FROM products;

    SELECT v_result || jsonb_build_object(
        'norms', jsonb_build_object(
            'total', COUNT(*),
            'needs_summary', COUNT(*) FILTER (WHERE official_doc_summary IS NULL),
            'stale', COUNT(*) FILTER (WHERE last_summarized_at < data_updated_at),
            'fresh', COUNT(*) FILTER (WHERE last_summarized_at >= data_updated_at)
        )
    ) INTO v_result FROM norms;

    SELECT v_result || jsonb_build_object(
        'evaluations', jsonb_build_object(
            'total', COUNT(*),
            'stale', COUNT(*) FILTER (WHERE is_stale = TRUE),
            'fresh', COUNT(*) FILTER (WHERE is_stale = FALSE)
        )
    ) INTO v_result FROM evaluations;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 068 - Data Freshness Tracking installed';
    RAISE NOTICE 'New columns: products.data_version, norms.data_version, evaluations.is_stale';
    RAISE NOTICE 'New functions: get_pending_evaluations(), get_norms_needing_summary()';
    RAISE NOTICE 'New view: v_data_freshness';
END $$;
