-- =============================================================================
-- Migration 075: Reset Unverified Summaries for Safe Regeneration
-- =============================================================================
-- Purpose: Mark all AI-generated summaries as needing regeneration
-- Created: 2026-01-17
-- =============================================================================

-- =============================================================================
-- STEP 1: ADD REGENERATION TRACKING COLUMN
-- =============================================================================

ALTER TABLE norms ADD COLUMN IF NOT EXISTS summary_needs_regen BOOLEAN DEFAULT FALSE;
ALTER TABLE norms ADD COLUMN IF NOT EXISTS summary_regen_date TIMESTAMPTZ;

COMMENT ON COLUMN norms.summary_needs_regen IS 'TRUE if summary needs regeneration from actual docs';
COMMENT ON COLUMN norms.summary_regen_date IS 'When summary was last regenerated';

-- =============================================================================
-- STEP 2: ADD SUMMARY_SOURCE COLUMN IF NOT EXISTS
-- =============================================================================

ALTER TABLE norms ADD COLUMN IF NOT EXISTS summary_source VARCHAR(50);
ALTER TABLE norms ADD COLUMN IF NOT EXISTS summary_verified BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN norms.summary_source IS 'Source of summary: scraped, fallback_ai, manual, needs_review';
COMMENT ON COLUMN norms.summary_verified IS 'TRUE if summary was verified from actual document';

-- =============================================================================
-- STEP 3: MARK ALL SUMMARIES FOR REVIEW (fresh start)
-- =============================================================================

-- Mark all summaries for regeneration to ensure clean slate
UPDATE norms SET
    summary_needs_regen = TRUE,
    summary_verified = FALSE,
    summary_source = 'pending_review'
WHERE official_doc_summary IS NOT NULL
  AND is_legacy = FALSE;

-- =============================================================================
-- STEP 4: CREATE VIEW FOR REGENERATION QUEUE
-- =============================================================================

CREATE OR REPLACE VIEW v_summary_regen_queue AS
SELECT
    id,
    code,
    pillar,
    title,
    official_link,
    summary_source,
    summary_verified,
    LENGTH(official_doc_summary) as summary_length,
    CASE
        WHEN official_link ILIKE '%github.com%' THEN 'HIGH'
        WHEN official_link ILIKE '%nist.gov%' THEN 'HIGH'
        WHEN official_link ILIKE '%ietf.org%' THEN 'HIGH'
        WHEN official_link ILIKE '%owasp.org%' THEN 'HIGH'
        WHEN official_link ILIKE '%w3.org%' THEN 'HIGH'
        WHEN official_link ILIKE '%iso.org%' THEN 'LOW (paywall)'
        WHEN official_link ILIKE '%ieee.org%' THEN 'LOW (paywall)'
        ELSE 'MEDIUM'
    END as scrape_priority
FROM norms
WHERE summary_needs_regen = TRUE
  AND is_legacy = FALSE
ORDER BY
    CASE
        WHEN official_link ILIKE '%github.com%' THEN 1
        WHEN official_link ILIKE '%nist.gov%' THEN 2
        WHEN official_link ILIKE '%ietf.org%' THEN 3
        ELSE 4
    END,
    pillar,
    code;

-- =============================================================================
-- STEP 5: STATS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_summary_regen_stats()
RETURNS TABLE (
    category TEXT,
    count BIGINT,
    percentage DECIMAL(5,2)
) AS $$
DECLARE
    total_active BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_active FROM norms WHERE is_legacy = FALSE;

    RETURN QUERY
    SELECT
        'Total Active Norms'::TEXT,
        total_active,
        100.00::DECIMAL(5,2)
    UNION ALL
    SELECT
        'Needs Regeneration',
        COUNT(*),
        ROUND(100.0 * COUNT(*) / NULLIF(total_active, 0), 2)
    FROM norms WHERE summary_needs_regen = TRUE AND is_legacy = FALSE
    UNION ALL
    SELECT
        'Verified Summaries',
        COUNT(*),
        ROUND(100.0 * COUNT(*) / NULLIF(total_active, 0), 2)
    FROM norms WHERE summary_verified = TRUE AND is_legacy = FALSE
    UNION ALL
    SELECT
        'Has Summary',
        COUNT(*),
        ROUND(100.0 * COUNT(*) / NULLIF(total_active, 0), 2)
    FROM norms WHERE official_doc_summary IS NOT NULL AND is_legacy = FALSE
    UNION ALL
    SELECT
        'No Summary',
        COUNT(*),
        ROUND(100.0 * COUNT(*) / NULLIF(total_active, 0), 2)
    FROM norms WHERE official_doc_summary IS NULL AND is_legacy = FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    needs_regen INT;
    has_summary INT;
    total_active INT;
BEGIN
    SELECT COUNT(*) INTO total_active FROM norms WHERE is_legacy = FALSE;
    SELECT COUNT(*) INTO needs_regen FROM norms WHERE summary_needs_regen = TRUE AND is_legacy = FALSE;
    SELECT COUNT(*) INTO has_summary FROM norms WHERE official_doc_summary IS NOT NULL AND is_legacy = FALSE;

    RAISE NOTICE '=== Migration 075 Complete ===';
    RAISE NOTICE 'Total active norms: %', total_active;
    RAISE NOTICE 'Summaries needing regeneration: %', needs_regen;
    RAISE NOTICE 'Norms with summaries: %', has_summary;
    RAISE NOTICE '';
    RAISE NOTICE 'Run: SELECT * FROM get_summary_regen_stats();';
    RAISE NOTICE 'Queue: SELECT * FROM v_summary_regen_queue LIMIT 20;';
END $$;
