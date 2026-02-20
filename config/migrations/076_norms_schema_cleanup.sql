-- =============================================================================
-- Migration 076: Norms Table Schema Cleanup
-- =============================================================================
-- Purpose: Remove unused columns and consolidate redundant fields
-- Created: 2026-01-17
-- =============================================================================
--
-- ANALYSIS SUMMARY:
-- - 7 columns are UNUSED (write-only, never read)
-- - 7 columns are REDUNDANT (can be consolidated)
-- - Target: 31 columns -> ~22 columns
--
-- =============================================================================

-- =============================================================================
-- STEP 0: BACKUP TABLE BEFORE CHANGES
-- =============================================================================

CREATE TABLE IF NOT EXISTS norms_backup_076 AS SELECT * FROM norms;

-- =============================================================================
-- STEP 1: CREATE NEW CONSOLIDATED COLUMN - summary_status
-- =============================================================================
-- Replaces: summary_source, summary_verified, summary_needs_regen
-- Values: 'pending', 'scraped', 'ai_generated', 'verified', 'failed'

ALTER TABLE norms ADD COLUMN IF NOT EXISTS summary_status VARCHAR(20) DEFAULT 'pending';

COMMENT ON COLUMN norms.summary_status IS 'Consolidated summary state: pending, scraped, ai_generated, verified, failed';

-- Migrate data to new column
UPDATE norms SET summary_status =
    CASE
        WHEN summary_verified = TRUE THEN 'verified'
        WHEN summary_source = 'scraped' OR summary_source = 'scraped_html' THEN 'scraped'
        WHEN summary_source = 'fallback_ai' THEN 'ai_generated'
        WHEN summary_needs_regen = TRUE THEN 'pending'
        WHEN official_doc_summary IS NOT NULL THEN 'ai_generated'
        ELSE 'pending'
    END
WHERE summary_status = 'pending' OR summary_status IS NULL;

-- =============================================================================
-- STEP 2: CREATE NEW CONSOLIDATED COLUMN - norm_status
-- =============================================================================
-- Replaces: is_legacy, cleanup_action, verification_status, scope_type
-- Values: 'active', 'deprecated', 'vendor_feature', 'questionable', 'merge_pending'

ALTER TABLE norms ADD COLUMN IF NOT EXISTS norm_status VARCHAR(20) DEFAULT 'active';

COMMENT ON COLUMN norms.norm_status IS 'Consolidated norm state: active, deprecated, vendor_feature, questionable, merge_pending';

-- Migrate data to new column
UPDATE norms SET norm_status =
    CASE
        WHEN is_legacy = TRUE THEN 'deprecated'
        WHEN scope_type = 'vendor_feature' THEN 'vendor_feature'
        WHEN verification_status = 'questionable' THEN 'questionable'
        WHEN verification_status = 'merge_pending' THEN 'merge_pending'
        WHEN cleanup_action = 'flagged_questionable' THEN 'questionable'
        ELSE 'active'
    END
WHERE norm_status = 'active' OR norm_status IS NULL;

-- =============================================================================
-- STEP 3: DROP UNUSED COLUMNS (Write-only, never read)
-- =============================================================================

-- classification_method: Only written in migrations, never queried
ALTER TABLE norms DROP COLUMN IF EXISTS classification_method;

-- classification_date: Timestamp without usage
ALTER TABLE norms DROP COLUMN IF EXISTS classification_date;

-- official_scraped_at: Not maintained by scraper code
ALTER TABLE norms DROP COLUMN IF EXISTS official_scraped_at;

-- crypto_relevance: Redundant with pillar categorization
ALTER TABLE norms DROP COLUMN IF EXISTS crypto_relevance;

-- regional_details: Created but always empty {}
ALTER TABLE norms DROP COLUMN IF EXISTS regional_details;

-- =============================================================================
-- STEP 4: DROP REDUNDANT COLUMNS (Now consolidated)
-- =============================================================================

-- Consolidated into summary_status
ALTER TABLE norms DROP COLUMN IF EXISTS summary_source;
ALTER TABLE norms DROP COLUMN IF EXISTS summary_verified;
ALTER TABLE norms DROP COLUMN IF EXISTS summary_needs_regen;
ALTER TABLE norms DROP COLUMN IF EXISTS summary_regen_date;

-- Consolidated into norm_status
ALTER TABLE norms DROP COLUMN IF EXISTS is_legacy;
ALTER TABLE norms DROP COLUMN IF EXISTS cleanup_action;
ALTER TABLE norms DROP COLUMN IF EXISTS cleanup_date;
ALTER TABLE norms DROP COLUMN IF EXISTS scope_type;
ALTER TABLE norms DROP COLUMN IF EXISTS verification_status;

-- =============================================================================
-- STEP 5: UPDATE VIEW TO USE NEW COLUMNS
-- =============================================================================

DROP VIEW IF EXISTS v_summary_regen_queue;

CREATE OR REPLACE VIEW v_summary_regen_queue AS
SELECT
    id,
    code,
    pillar,
    title,
    official_link,
    summary_status,
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
WHERE summary_status IN ('pending', 'failed')
  AND norm_status = 'active'
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
-- STEP 6: CREATE INDEXES ON NEW COLUMNS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_norms_summary_status ON norms(summary_status);
CREATE INDEX IF NOT EXISTS idx_norms_norm_status ON norms(norm_status);

-- =============================================================================
-- STEP 7: UPDATE STATS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_norms_schema_stats()
RETURNS TABLE (
    category TEXT,
    count BIGINT,
    percentage DECIMAL(5,2)
) AS $$
DECLARE
    total_norms BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_norms FROM norms;

    RETURN QUERY
    SELECT 'Total Norms'::TEXT, total_norms, 100.00::DECIMAL(5,2)

    UNION ALL
    SELECT 'Active', COUNT(*), ROUND(100.0 * COUNT(*) / NULLIF(total_norms, 0), 2)
    FROM norms WHERE norm_status = 'active'

    UNION ALL
    SELECT 'Deprecated', COUNT(*), ROUND(100.0 * COUNT(*) / NULLIF(total_norms, 0), 2)
    FROM norms WHERE norm_status = 'deprecated'

    UNION ALL
    SELECT 'Summary: Verified', COUNT(*), ROUND(100.0 * COUNT(*) / NULLIF(total_norms, 0), 2)
    FROM norms WHERE summary_status = 'verified'

    UNION ALL
    SELECT 'Summary: AI Generated', COUNT(*), ROUND(100.0 * COUNT(*) / NULLIF(total_norms, 0), 2)
    FROM norms WHERE summary_status = 'ai_generated'

    UNION ALL
    SELECT 'Summary: Pending', COUNT(*), ROUND(100.0 * COUNT(*) / NULLIF(total_norms, 0), 2)
    FROM norms WHERE summary_status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    col_count INT;
    backup_count INT;
    active_count INT;
    deprecated_count INT;
BEGIN
    -- Count columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'norms' AND table_schema = 'public';

    -- Count backup
    SELECT COUNT(*) INTO backup_count FROM norms_backup_076;

    -- Count by status
    SELECT COUNT(*) INTO active_count FROM norms WHERE norm_status = 'active';
    SELECT COUNT(*) INTO deprecated_count FROM norms WHERE norm_status = 'deprecated';

    RAISE NOTICE '=== Migration 076 Complete ===';
    RAISE NOTICE 'Columns in norms table: % (target: ~22)', col_count;
    RAISE NOTICE 'Backup rows: %', backup_count;
    RAISE NOTICE 'Active norms: %', active_count;
    RAISE NOTICE 'Deprecated norms: %', deprecated_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Run: SELECT * FROM get_norms_schema_stats();';
END $$;
