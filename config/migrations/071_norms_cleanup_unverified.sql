-- =============================================================================
-- Migration 071: Clean Up Unverified Norms
-- =============================================================================
-- Purpose: Flag and soft-delete unverified and questionable norms
-- Prerequisite: Migration 070 (backup) must be run first
-- Created: 2026-01-17
-- =============================================================================

-- =============================================================================
-- STEP 1: MARK QUESTIONABLE NORMS
-- =============================================================================

-- Mark known questionable norms (research showed no real backing)
UPDATE norms SET
    verification_status = 'questionable',
    is_legacy = TRUE,
    cleanup_date = NOW(),
    cleanup_action = 'flagged_questionable'
WHERE code IN (
    -- Voice Stress Detection: Pseudoscience, no implementation
    'A183',
    -- Geographic Unlock: No implementation found
    'A180'
);

-- Mark norms to merge with existing standards
UPDATE norms SET
    verification_status = 'merge_pending',
    is_legacy = TRUE,
    cleanup_date = NOW(),
    cleanup_action = 'merge_with_standard'
WHERE code IN (
    -- Time-Based Unlock: Merge with BIP-65/BIP-112
    'A181',
    -- Countdown Abort: Merge with vault/time-delay norms
    'A184'
);

-- Mark vendor features (keep but reclassify)
UPDATE norms SET
    verification_status = 'vendor_feature',
    cleanup_date = NOW(),
    cleanup_action = 'reclassified_vendor',
    scope_type = 'vendor_feature'
WHERE code IN (
    -- Brick PIN: Coldcard has real implementation
    'A141',
    -- Travel Mode: 1Password precedent
    'A142',
    -- Biometric Duress: Concept, may have implementations
    'A182'
);

-- =============================================================================
-- STEP 2: MARK UNVERIFIED NORMS (MISSING OFFICIAL SOURCES)
-- =============================================================================

-- Mark norms without official_link as unverified
UPDATE norms SET
    verification_status = 'unverified',
    cleanup_date = NOW(),
    cleanup_action = 'missing_official_link'
WHERE official_link IS NULL
  AND verification_status IS NULL
  AND is_legacy = FALSE;

-- NOTE: summary_source column check removed - column may not exist in all deployments
-- AI-generated summaries will be identified by missing official_link instead

-- =============================================================================
-- STEP 3: VERIFY GOOD NORMS
-- =============================================================================

-- Mark norms with official sources as verified
UPDATE norms SET
    verification_status = 'verified',
    cleanup_date = NOW(),
    cleanup_action = 'confirmed_verified'
WHERE official_link IS NOT NULL
  AND issuing_authority IS NOT NULL
  AND verification_status IS NULL
  AND is_legacy = FALSE;

-- =============================================================================
-- STEP 4: CREATE CLEANUP TRACKING VIEW
-- =============================================================================

CREATE OR REPLACE VIEW v_norms_cleanup_status AS
SELECT
    verification_status,
    cleanup_action,
    COUNT(*) as norm_count,
    STRING_AGG(code, ', ' ORDER BY code) as codes
FROM norms
WHERE cleanup_date IS NOT NULL
GROUP BY verification_status, cleanup_action
ORDER BY verification_status, cleanup_action;

-- =============================================================================
-- STEP 5: CREATE ACTIVE NORMS VIEW (Excludes legacy)
-- =============================================================================

CREATE OR REPLACE VIEW v_active_norms AS
SELECT *
FROM norms
WHERE is_legacy = FALSE
  AND verification_status IN ('verified', 'vendor_feature');

-- =============================================================================
-- STEP 6: UPDATE SCORING TO USE ONLY ACTIVE NORMS
-- =============================================================================

-- Add comment for developers
COMMENT ON VIEW v_active_norms IS
'Use this view for scoring calculations. Only includes verified norms and documented vendor features.
Legacy and questionable norms are excluded.';

-- =============================================================================
-- VERIFICATION REPORT
-- =============================================================================

DO $$
DECLARE
    total_norms INT;
    verified_count INT;
    legacy_count INT;
    questionable_count INT;
BEGIN
    SELECT COUNT(*) INTO total_norms FROM norms;
    SELECT COUNT(*) INTO verified_count FROM norms WHERE verification_status = 'verified';
    SELECT COUNT(*) INTO legacy_count FROM norms WHERE is_legacy = TRUE;
    SELECT COUNT(*) INTO questionable_count FROM norms WHERE verification_status = 'questionable';

    RAISE NOTICE '=== Migration 071 Cleanup Complete ===';
    RAISE NOTICE 'Total norms: %', total_norms;
    RAISE NOTICE 'Verified: %', verified_count;
    RAISE NOTICE 'Legacy (soft-deleted): %', legacy_count;
    RAISE NOTICE 'Questionable (needs review): %', questionable_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Run: SELECT * FROM v_norms_cleanup_status;';
END $$;
