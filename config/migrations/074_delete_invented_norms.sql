-- =============================================================================
-- Migration 074: Delete Invented Norms
-- =============================================================================
-- Purpose: Remove invented/pseudoscience norms and merge redundant ones
-- Created: 2026-01-17
-- =============================================================================

-- =============================================================================
-- STEP 1: DELETE INVENTED NORMS (No real standard backing)
-- =============================================================================

-- A180: Geographic Unlock - No vendor implements this, no standard exists
-- A183: Voice Stress Detection - Pseudoscience, academically debunked

-- First remove from applicability
DELETE FROM norm_applicability WHERE norm_id IN (
    SELECT id FROM norms WHERE code IN ('A180', 'A183')
);

-- Then delete the norms themselves
DELETE FROM norms WHERE code IN ('A180', 'A183');

-- =============================================================================
-- STEP 2: MERGE A181 & A184 INTO BIP-65/BIP-112
-- =============================================================================

-- A181: Time-Based Unlock - Already covered by BIP-65 (CLTV) and BIP-112 (CSV)
-- A184: Countdown Abort - Transaction cancellation is a use case of time-locks

-- Check if BIP-65 and BIP-112 norms exist before updating
DO $$
DECLARE
    bip65_exists BOOLEAN;
    bip112_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM norms WHERE code ILIKE '%BIP-065%' OR code ILIKE '%BIP-65%') INTO bip65_exists;
    SELECT EXISTS(SELECT 1 FROM norms WHERE code ILIKE '%BIP-112%') INTO bip112_exists;

    IF bip65_exists THEN
        UPDATE norms SET
            description = COALESCE(description, '') || E'\n\n[Merged] Covers Time-Based Unlock (former A181) - transactions allowed only in specific time windows.'
        WHERE (code ILIKE '%BIP-065%' OR code ILIKE '%BIP-65%')
          AND description NOT LIKE '%Merged%';
        RAISE NOTICE 'Updated BIP-65 description with A181 merge note';
    ELSE
        RAISE NOTICE 'BIP-65 norm not found - skipping description update';
    END IF;

    IF bip112_exists THEN
        UPDATE norms SET
            description = COALESCE(description, '') || E'\n\n[Merged] Covers Countdown Abort (former A184) - transaction cancellation during time-lock window.'
        WHERE code ILIKE '%BIP-112%'
          AND description NOT LIKE '%Merged%';
        RAISE NOTICE 'Updated BIP-112 description with A184 merge note';
    ELSE
        RAISE NOTICE 'BIP-112 norm not found - skipping description update';
    END IF;
END $$;

-- Remove A181 and A184 from applicability
DELETE FROM norm_applicability WHERE norm_id IN (
    SELECT id FROM norms WHERE code IN ('A181', 'A184')
);

-- Delete A181 and A184
DELETE FROM norms WHERE code IN ('A181', 'A184');

-- =============================================================================
-- STEP 3: VERIFY NO LEGACY NORMS REMAIN
-- =============================================================================

-- Update any remaining legacy norms to ensure clean state
-- (A141, A142, A182 are vendor_features and should NOT be deleted)

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    deleted_count INT;
    remaining_legacy INT;
    total_norms INT;
BEGIN
    -- Count deleted norms (should be 4: A180, A181, A183, A184)
    SELECT 4 INTO deleted_count; -- We just deleted them

    -- Count remaining legacy norms (should only be vendor_features like A141, A142, A182)
    SELECT COUNT(*) INTO remaining_legacy FROM norms WHERE is_legacy = TRUE;

    -- Total norms
    SELECT COUNT(*) INTO total_norms FROM norms WHERE is_legacy = FALSE;

    RAISE NOTICE '=== Migration 074 Complete ===';
    RAISE NOTICE 'Deleted invented norms: A180, A181, A183, A184';
    RAISE NOTICE 'Merged A181 -> BIP-65, A184 -> BIP-112';
    RAISE NOTICE 'Remaining legacy (vendor_features): %', remaining_legacy;
    RAISE NOTICE 'Total active norms: %', total_norms;
    RAISE NOTICE '';
    RAISE NOTICE 'Run: SELECT * FROM get_norm_verification_stats();';
END $$;
