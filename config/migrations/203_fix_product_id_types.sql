-- ============================================================================
-- Migration 203: Fix Product ID Type Consistency
-- ============================================================================
-- Many tables use INTEGER for product_id but products.id is BIGSERIAL (BIGINT)
-- This migration fixes the type mismatch for better schema coherence.
--
-- Author: Claude Opus 4.5
-- Date: 2026-02-01
-- ============================================================================

-- ============================================================================
-- SCHEMA COHERENCE REFERENCE:
-- ============================================================================
-- products.id = BIGSERIAL (BIGINT) - PRIMARY KEY
-- evaluations.product_id = BIGINT - CORRECT
-- safe_scoring_results.product_id = BIGINT - CORRECT
-- norms.id = SERIAL (INTEGER) - PRIMARY KEY
-- evaluations.norm_id = INTEGER - CORRECT
-- ============================================================================

-- ============================================================================
-- 1. FIX EVALUATION_HISTORY TABLE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'evaluation_history' AND column_name = 'product_id'
               AND data_type = 'integer') THEN
        ALTER TABLE evaluation_history ALTER COLUMN product_id TYPE BIGINT;
        RAISE NOTICE 'Fixed: evaluation_history.product_id -> BIGINT';
    END IF;
END $$;

-- ============================================================================
-- 2. FIX PRODUCT_SCORE_CACHE TABLE (from migration 077/081)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_score_cache') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'product_score_cache' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE product_score_cache ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: product_score_cache.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 3. FIX PRODUCT_STRATEGIES TABLE (from migration 085)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_strategies') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'product_strategies' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE product_strategies ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: product_strategies.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 4. FIX PRODUCT_SOURCES TABLE (from migration 085)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_sources') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'product_sources' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE product_sources ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: product_sources.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 5. FIX PRODUCT_SECURITY_WARNINGS TABLE (from migration 085)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_security_warnings') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'product_security_warnings' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE product_security_warnings ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: product_security_warnings.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 6. FIX SCORE_HISTORY TABLE (from migration 135)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'score_history') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'score_history' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE score_history ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: score_history.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 7. FIX EVALUATION_COMMUNITY_VOTES TABLE (from migration 136)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluation_community_votes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'evaluation_community_votes' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE evaluation_community_votes ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: evaluation_community_votes.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 8. FIX CERTIFICATION_APPLICATIONS TABLE (from migration 102)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certification_applications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'certification_applications' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE certification_applications ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: certification_applications.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 9. FIX PROOF_OF_ACCURACY TABLE (from migration 104)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proof_of_accuracy') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'proof_of_accuracy' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE proof_of_accuracy ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: proof_of_accuracy.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 10. FIX PREDICTION TABLES (from migration 014/020)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'predictions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'predictions' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE predictions ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: predictions.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_proof_predictions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ai_proof_predictions' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE ai_proof_predictions ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: ai_proof_predictions.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 11. FIX AUTO_COMPAT_QUEUE TABLE
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auto_compat_queue') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'auto_compat_queue' AND column_name = 'product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE auto_compat_queue ALTER COLUMN product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: auto_compat_queue.product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 12. FIX COMPETITOR_PRODUCTS TABLE (from migration 101)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitor_products') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitor_products' AND column_name = 'matched_product_id'
                   AND data_type = 'integer') THEN
            ALTER TABLE competitor_products ALTER COLUMN matched_product_id TYPE BIGINT;
            RAISE NOTICE 'Fixed: competitor_products.matched_product_id -> BIGINT';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify all product_id columns are now BIGINT:
/*
SELECT
    table_name,
    column_name,
    data_type,
    CASE WHEN data_type = 'bigint' THEN 'OK' ELSE 'NEEDS FIX' END AS status
FROM information_schema.columns
WHERE column_name LIKE '%product_id%'
  AND table_schema = 'public'
ORDER BY status DESC, table_name;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
