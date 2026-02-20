-- =============================================================================
-- Migration 070: Full Norms Backup Before Cleanup
-- =============================================================================
-- Purpose: Preserve all existing norms and applicability before refactoring
-- Created: 2026-01-17
-- =============================================================================

-- =============================================================================
-- STEP 1: BACKUP NORMS TABLE
-- =============================================================================

-- Drop if exists (idempotent)
DROP TABLE IF EXISTS norms_backup_2026_01;

-- Create complete backup of norms table
CREATE TABLE norms_backup_2026_01 AS
SELECT
    *,
    NOW() as backup_date,
    'Pre-refactoring backup - cleaning up unverified norms' as backup_reason
FROM norms;

-- Add primary key for efficient lookups
ALTER TABLE norms_backup_2026_01 ADD PRIMARY KEY (id);

-- Create index on code for quick reference
CREATE INDEX idx_norms_backup_code ON norms_backup_2026_01(code);
CREATE INDEX idx_norms_backup_pillar ON norms_backup_2026_01(pillar);

-- =============================================================================
-- STEP 2: BACKUP NORM APPLICABILITY
-- =============================================================================

DROP TABLE IF EXISTS norm_applicability_backup_2026_01;

CREATE TABLE norm_applicability_backup_2026_01 AS
SELECT
    na.*,
    n.code as norm_code,
    n.pillar as norm_pillar,
    NOW() as backup_date
FROM norm_applicability na
JOIN norms n ON na.norm_id = n.id;

-- Add indexes for lookups
CREATE INDEX idx_na_backup_norm_id ON norm_applicability_backup_2026_01(norm_id);
CREATE INDEX idx_na_backup_type_id ON norm_applicability_backup_2026_01(type_id);

-- =============================================================================
-- STEP 3: BACKUP STATISTICS
-- =============================================================================

-- Create view for backup statistics (only uses columns that exist)
CREATE OR REPLACE VIEW v_norms_backup_stats AS
SELECT
    pillar,
    COUNT(*) as total_norms,
    COUNT(*) FILTER (WHERE official_link IS NOT NULL) as with_official_link,
    COUNT(*) FILTER (WHERE issuing_authority IS NOT NULL) as with_authority,
    COUNT(*) FILTER (WHERE official_doc_summary IS NOT NULL) as with_summary
FROM norms_backup_2026_01
GROUP BY pillar
ORDER BY pillar;

-- =============================================================================
-- STEP 4: ADD VERIFICATION COLUMNS TO MAIN TABLE (if not exists)
-- =============================================================================

ALTER TABLE norms ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;
ALTER TABLE norms ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';
ALTER TABLE norms ADD COLUMN IF NOT EXISTS cleanup_date TIMESTAMPTZ;
ALTER TABLE norms ADD COLUMN IF NOT EXISTS cleanup_action VARCHAR(50);

COMMENT ON COLUMN norms.is_legacy IS 'TRUE if norm was marked as legacy during 2026-01 cleanup';
COMMENT ON COLUMN norms.verification_status IS 'verified, unverified, questionable, or removed';
COMMENT ON COLUMN norms.cleanup_action IS 'Action taken: kept, merged, removed, reclassified';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_norms_verification_status ON norms(verification_status);
CREATE INDEX IF NOT EXISTS idx_norms_is_legacy ON norms(is_legacy);

-- =============================================================================
-- STEP 5: RESTORE FUNCTION (if needed)
-- =============================================================================

-- Simple restore: just truncate and re-insert from backup
-- Use this only if you need to rollback the cleanup
CREATE OR REPLACE FUNCTION restore_norms_from_backup()
RETURNS TEXT AS $$
DECLARE
    restored_count INT;
BEGIN
    -- Only restore if backup exists
    IF NOT EXISTS (SELECT 1 FROM norms_backup_2026_01 LIMIT 1) THEN
        RETURN 'ERROR: Backup table is empty';
    END IF;

    -- Count backup
    SELECT COUNT(*) INTO restored_count FROM norms_backup_2026_01;

    RETURN 'Backup contains ' || restored_count || ' norms. To restore, run: INSERT INTO norms SELECT * FROM norms_backup_2026_01 ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Show backup statistics
DO $$
DECLARE
    total_norms INT;
    total_applicability INT;
BEGIN
    SELECT COUNT(*) INTO total_norms FROM norms_backup_2026_01;

    -- Check if norm_applicability_backup exists before counting
    BEGIN
        SELECT COUNT(*) INTO total_applicability FROM norm_applicability_backup_2026_01;
    EXCEPTION WHEN undefined_table THEN
        total_applicability := 0;
    END;

    RAISE NOTICE '=== Migration 070 Complete ===';
    RAISE NOTICE 'Backed up % norms', total_norms;
    RAISE NOTICE 'Backed up % applicability rules', total_applicability;
    RAISE NOTICE 'Run: SELECT * FROM v_norms_backup_stats;';
END $$;
