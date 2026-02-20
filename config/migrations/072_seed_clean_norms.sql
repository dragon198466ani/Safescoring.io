-- =============================================================================
-- Migration 072: Seed Clean Verified Norms
-- =============================================================================
-- Purpose: Apply the verified norms from seed_verified_norms.sql
-- Prerequisite: Migrations 070 (backup) and 071 (cleanup) must be run first
-- Created: 2026-01-17
-- =============================================================================

-- Include the verified norms seed file
\i '../seed_verified_norms.sql'

-- =============================================================================
-- STEP 1: UPDATE APPLICABILITY FOR NEW NORMS
-- =============================================================================

-- Get all product types for applicability
DO $$
DECLARE
    norm_record RECORD;
    product_type_id INT;
BEGIN
    -- For each verified norm, ensure applicability exists
    FOR norm_record IN
        SELECT id, code, pillar
        FROM norms
        WHERE verification_status = 'verified'
          AND is_legacy = FALSE
    LOOP
        -- S pillar norms apply to all product types
        IF norm_record.pillar = 'S' THEN
            INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
            SELECT norm_record.id, pt.id, TRUE
            FROM product_types pt
            ON CONFLICT (norm_id, type_id) DO NOTHING;
        END IF;

        -- A pillar norms apply to wallets and custody
        IF norm_record.pillar = 'A' THEN
            INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
            SELECT norm_record.id, pt.id, TRUE
            FROM product_types pt
            WHERE pt.code IN ('HW_WALLET', 'SW_WALLET', 'CUSTODY', 'MULTISIG', 'CEX', 'DEX')
            ON CONFLICT (norm_id, type_id) DO NOTHING;
        END IF;

        -- F pillar norms apply to all product types
        IF norm_record.pillar = 'F' THEN
            INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
            SELECT norm_record.id, pt.id, TRUE
            FROM product_types pt
            ON CONFLICT (norm_id, type_id) DO NOTHING;
        END IF;

        -- E pillar norms apply to user-facing products
        IF norm_record.pillar = 'E' THEN
            INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
            SELECT norm_record.id, pt.id, TRUE
            FROM product_types pt
            WHERE pt.code NOT IN ('INFRASTRUCTURE', 'ORACLE', 'BRIDGE')
            ON CONFLICT (norm_id, type_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 2: REMOVE APPLICABILITY FOR LEGACY NORMS
-- =============================================================================

-- Soft-delete applicability for legacy norms (don't actually delete)
-- Just mark them so they're excluded from scoring
UPDATE norm_applicability SET
    is_applicable = FALSE
WHERE norm_id IN (
    SELECT id FROM norms WHERE is_legacy = TRUE
);

-- =============================================================================
-- STEP 3: VERIFICATION
-- =============================================================================

-- Show pillar balance after seeding
CREATE OR REPLACE VIEW v_pillar_balance_after_seed AS
SELECT
    pillar,
    COUNT(*) FILTER (WHERE is_legacy = FALSE) as active_norms,
    COUNT(*) FILTER (WHERE is_legacy = TRUE) as legacy_norms,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
    COUNT(*) FILTER (WHERE verification_status = 'vendor_feature') as vendor_features,
    ROUND(100.0 * COUNT(*) FILTER (WHERE verification_status = 'verified') /
          NULLIF(COUNT(*) FILTER (WHERE is_legacy = FALSE), 0), 1) as verified_pct
FROM norms
GROUP BY pillar
ORDER BY pillar;

-- =============================================================================
-- VERIFICATION REPORT
-- =============================================================================

DO $$
DECLARE
    active_count INT;
    verified_count INT;
    by_pillar RECORD;
BEGIN
    SELECT COUNT(*) INTO active_count FROM norms WHERE is_legacy = FALSE;
    SELECT COUNT(*) INTO verified_count FROM norms WHERE verification_status = 'verified';

    RAISE NOTICE '=== Migration 072 Seed Complete ===';
    RAISE NOTICE 'Active norms: %', active_count;
    RAISE NOTICE 'Verified norms: %', verified_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Pillar balance:';

    FOR by_pillar IN SELECT * FROM v_pillar_balance_after_seed LOOP
        RAISE NOTICE '  %: % active (% verified)',
            by_pillar.pillar, by_pillar.active_norms, by_pillar.verified;
    END LOOP;
END $$;
