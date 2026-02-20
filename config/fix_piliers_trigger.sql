-- FIX THE PILIER_S TRIGGER ERROR
-- ================================
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)

-- Step 1: Find the problematic trigger
SELECT
    tgname as trigger_name,
    pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'products'
AND NOT tgisinternal;

-- Step 2: Find functions that reference pilier_s
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%pilier_s%';

-- Step 3: Most likely, there's a trigger function that needs to be updated
-- The function probably looks for old.pilier_s which doesn't exist
-- Common patterns:
-- - OLD.pilier_s -> should be OLD.safe_priority_pillar or removed
-- - Audit/logging trigger that tracks column changes

-- Step 4: Once you find the trigger function, either:
-- A) Drop it if it's not needed:
-- DROP TRIGGER IF EXISTS <trigger_name> ON products;
-- DROP FUNCTION IF EXISTS <function_name>();

-- B) Or update it to use correct column names:
-- The column pilier_s does not exist - it should be safe_priority_pillar

-- Step 5: Quick fix - disable all non-essential triggers temporarily
-- (Run this to see what triggers exist first, then decide)

-- Example: If the trigger is named 'update_piliers_trigger':
-- DROP TRIGGER IF EXISTS update_piliers_trigger ON products;

-- After fixing, verify by running:
-- UPDATE products SET safe_priority_pillar = 'S' WHERE id = 1 RETURNING id;
-- Then revert: UPDATE products SET safe_priority_pillar = NULL WHERE id = 1;
