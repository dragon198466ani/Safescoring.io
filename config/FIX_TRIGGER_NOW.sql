-- ============================================================
-- FIX THE PILIER_S TRIGGER ERROR
-- ============================================================
-- Run EACH STEP in Supabase Dashboard > SQL Editor
-- This will allow the products table to be updated again
-- ============================================================

-- STEP 1: Find all triggers on products table
SELECT
    tgname AS trigger_name,
    CASE tgtype
        WHEN 1 THEN 'ROW'
        WHEN 2 THEN 'BEFORE'
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        WHEN 32 THEN 'TRUNCATE'
        ELSE tgtype::text
    END AS trigger_type,
    pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'products'
AND NOT tgisinternal;

-- STEP 2: List all functions that reference pilier_s (the non-existent column)
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%pilier_s%';

-- STEP 3: Once you identify the trigger name from Step 1,
-- run this to drop it (replace TRIGGER_NAME_HERE with actual name):
--
-- DROP TRIGGER IF EXISTS TRIGGER_NAME_HERE ON products;
--
-- Common trigger names to try:
-- DROP TRIGGER IF EXISTS update_piliers ON products;
-- DROP TRIGGER IF EXISTS recalculate_scores ON products;
-- DROP TRIGGER IF EXISTS products_updated ON products;
-- DROP TRIGGER IF EXISTS track_pilier_changes ON products;

-- STEP 4: Alternative - Disable ALL triggers temporarily to allow updates
-- WARNING: This disables ALL triggers on the table
--
-- ALTER TABLE products DISABLE TRIGGER ALL;
--
-- Then after your updates, re-enable:
-- ALTER TABLE products ENABLE TRIGGER ALL;

-- STEP 5: If the trigger function exists and you want to fix it instead of dropping:
-- The function references OLD.pilier_s which doesn't exist
-- Change it to OLD.safe_priority_pillar or remove the reference entirely

-- VERIFICATION: After fixing, run this to test:
-- UPDATE products SET safe_priority_pillar = 'S' WHERE id = 1 RETURNING id;
-- Then revert: UPDATE products SET safe_priority_pillar = NULL WHERE id = 1;
