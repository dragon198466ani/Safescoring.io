-- ============================================================
-- MIGRATION 076 - NORMS SCHEMA CLEANUP (FIXED)
-- Execute in Supabase SQL Editor
-- ============================================================

-- STEP 1: Backup
CREATE TABLE IF NOT EXISTS norms_backup_076 AS SELECT * FROM norms;

-- STEP 2: Add new columns
ALTER TABLE norms ADD COLUMN IF NOT EXISTS summary_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE norms ADD COLUMN IF NOT EXISTS norm_status VARCHAR(20) DEFAULT 'active';

-- STEP 3: Migrate data to new columns
UPDATE norms SET summary_status =
    CASE
        WHEN summary_verified = TRUE THEN 'verified'
        WHEN summary_source IN ('scraped', 'scraped_html') THEN 'scraped'
        WHEN summary_source = 'fallback_ai' THEN 'ai_generated'
        WHEN summary_needs_regen = TRUE THEN 'pending'
        WHEN official_doc_summary IS NOT NULL THEN 'ai_generated'
        ELSE 'pending'
    END;

UPDATE norms SET norm_status =
    CASE
        WHEN is_legacy = TRUE THEN 'deprecated'
        WHEN scope_type = 'vendor_feature' THEN 'vendor_feature'
        WHEN verification_status = 'questionable' THEN 'questionable'
        WHEN cleanup_action = 'flagged_questionable' THEN 'questionable'
        ELSE 'active'
    END;

-- STEP 4: Drop dependent views FIRST
DROP VIEW IF EXISTS v_active_norms CASCADE;
DROP VIEW IF EXISTS v_summary_regen_queue CASCADE;
DROP VIEW IF EXISTS v_norms_overview CASCADE;
DROP VIEW IF EXISTS v_norms_stats CASCADE;

-- STEP 5: Drop unused columns
ALTER TABLE norms DROP COLUMN IF EXISTS classification_method CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS classification_date CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS official_scraped_at CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS crypto_relevance CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS regional_details CASCADE;

-- STEP 6: Drop consolidated columns
ALTER TABLE norms DROP COLUMN IF EXISTS summary_source CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS summary_verified CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS summary_needs_regen CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS summary_regen_date CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS is_legacy CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS cleanup_action CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS cleanup_date CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS scope_type CASCADE;
ALTER TABLE norms DROP COLUMN IF EXISTS verification_status CASCADE;

-- STEP 7: Recreate v_active_norms view with new columns
CREATE OR REPLACE VIEW v_active_norms AS
SELECT
    id, code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, official_doc_summary,
    issuing_authority, standard_reference, standard_year,
    geographic_scope, access_type,
    summary_status, norm_status,
    created_at
FROM norms
WHERE norm_status = 'active';

-- STEP 8: Recreate summary queue view
CREATE OR REPLACE VIEW v_summary_regen_queue AS
SELECT
    id, code, pillar, title, official_link,
    summary_status,
    LENGTH(official_doc_summary) as summary_length,
    CASE
        WHEN official_link ILIKE '%github.com%' THEN 'HIGH'
        WHEN official_link ILIKE '%nist.gov%' THEN 'HIGH'
        WHEN official_link ILIKE '%openzeppelin.com%' THEN 'HIGH'
        ELSE 'MEDIUM'
    END as scrape_priority
FROM norms
WHERE summary_status IN ('pending', 'failed')
  AND norm_status = 'active'
ORDER BY pillar, code;

-- STEP 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_norms_summary_status ON norms(summary_status);
CREATE INDEX IF NOT EXISTS idx_norms_norm_status ON norms(norm_status);

-- STEP 10: Verify
SELECT
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'norms' AND table_schema = 'public') as column_count,
    (SELECT COUNT(*) FROM norms) as total_norms,
    (SELECT COUNT(*) FROM norms WHERE norm_status = 'active') as active_norms,
    (SELECT COUNT(*) FROM norms WHERE summary_status = 'ai_generated') as ai_summaries;
