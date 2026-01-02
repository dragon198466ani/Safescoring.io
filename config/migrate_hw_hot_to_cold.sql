-- ============================================================
-- MIGRATION: Remove "HW Hot" type (not standard terminology)
-- ============================================================
--
-- REASON: Industry standard terminology:
-- - Hot Wallet = Software wallet (always connected to internet)
-- - Cold Wallet = Hardware wallet (offline key storage)
--
-- Hardware wallets are by definition "cold storage".
-- "HW Hot" is confusing and not used in the industry.
-- ============================================================

-- Step 1: Check if HW Hot type exists and count affected products
SELECT
    pt.id as type_id,
    pt.code,
    pt.name,
    COUNT(ptm.product_id) as products_using_this_type
FROM product_types pt
LEFT JOIN product_type_mapping ptm ON pt.id = ptm.type_id
WHERE pt.code = 'HW Hot'
GROUP BY pt.id, pt.code, pt.name;

-- Step 2: Get HW Cold type ID for migration
SELECT id, code, name FROM product_types WHERE code = 'HW Cold';

-- Step 3: Migrate products from HW Hot to HW Cold
-- First, get the type IDs
DO $$
DECLARE
    hw_hot_id UUID;
    hw_cold_id UUID;
    affected_count INTEGER;
BEGIN
    -- Get HW Hot type ID
    SELECT id INTO hw_hot_id FROM product_types WHERE code = 'HW Hot';

    -- Get HW Cold type ID
    SELECT id INTO hw_cold_id FROM product_types WHERE code = 'HW Cold';

    IF hw_hot_id IS NOT NULL AND hw_cold_id IS NOT NULL THEN
        -- Count affected products
        SELECT COUNT(*) INTO affected_count
        FROM product_type_mapping
        WHERE type_id = hw_hot_id;

        RAISE NOTICE 'Migrating % products from HW Hot to HW Cold', affected_count;

        -- Update mappings: change HW Hot to HW Cold
        -- But only if the product doesn't already have HW Cold
        UPDATE product_type_mapping ptm
        SET type_id = hw_cold_id
        WHERE ptm.type_id = hw_hot_id
        AND NOT EXISTS (
            SELECT 1 FROM product_type_mapping ptm2
            WHERE ptm2.product_id = ptm.product_id
            AND ptm2.type_id = hw_cold_id
        );

        -- Delete duplicate mappings (products that had both HW Hot and HW Cold)
        DELETE FROM product_type_mapping
        WHERE type_id = hw_hot_id;

        RAISE NOTICE 'Migration complete';
    ELSE
        RAISE NOTICE 'HW Hot or HW Cold type not found - nothing to migrate';
    END IF;
END $$;

-- Step 4: Delete norm_applicability rules for HW Hot
DELETE FROM norm_applicability
WHERE type_id = (SELECT id FROM product_types WHERE code = 'HW Hot');

-- Step 5: Delete type_compatibility entries for HW Hot
DELETE FROM type_compatibility
WHERE type_a_id = (SELECT id FROM product_types WHERE code = 'HW Hot')
   OR type_b_id = (SELECT id FROM product_types WHERE code = 'HW Hot');

-- Step 6: Delete the HW Hot type itself
DELETE FROM product_types WHERE code = 'HW Hot';

-- Step 7: Verify cleanup
SELECT 'Remaining HW types:' as status;
SELECT code, name FROM product_types WHERE code LIKE 'HW%' ORDER BY code;

SELECT 'Total product types with is_safe_applicable = TRUE:' as status;
SELECT COUNT(*) as count FROM product_types WHERE is_safe_applicable = TRUE;

-- ============================================================
-- EXPECTED RESULT:
-- - HW Hot type deleted
-- - Products migrated to HW Cold
-- - norm_applicability cleaned up
-- - type_compatibility cleaned up
-- - 57 types with is_safe_applicable = TRUE (was 58)
-- ============================================================
