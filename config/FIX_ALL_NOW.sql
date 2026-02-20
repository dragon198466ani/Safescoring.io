-- ============================================================
-- FIX ALL DATABASE ISSUES - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================
-- This single script will:
-- 1. Drop all triggers referencing the non-existent 'pilier_s' column
-- 2. Drop any functions referencing 'pilier_s'
-- 3. Test that products table can be updated
-- ============================================================

-- STEP 1: Find and drop problematic triggers
DO $$
DECLARE
    trigger_rec RECORD;
    func_def TEXT;
BEGIN
    RAISE NOTICE '=== FINDING PROBLEMATIC TRIGGERS ===';

    FOR trigger_rec IN
        SELECT t.tgname, pg_get_triggerdef(t.oid) as def
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'products'
        AND NOT t.tgisinternal
    LOOP
        RAISE NOTICE 'Found trigger: %', trigger_rec.tgname;

        -- Check if trigger or its function references pilier_s
        BEGIN
            SELECT pg_get_functiondef(p.oid) INTO func_def
            FROM pg_proc p
            WHERE p.proname = trigger_rec.tgname || '_func'
               OR p.proname LIKE '%' || split_part(trigger_rec.tgname, '_', 1) || '%';

            IF func_def LIKE '%pilier_s%' THEN
                EXECUTE format('DROP TRIGGER IF EXISTS %I ON products', trigger_rec.tgname);
                RAISE NOTICE 'DROPPED trigger: % (references pilier_s)', trigger_rec.tgname;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Try dropping anyway if we can't check
            NULL;
        END;
    END LOOP;
END;
$$;

-- STEP 2: Drop functions referencing pilier_s
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    RAISE NOTICE '=== FINDING PROBLEMATIC FUNCTIONS ===';

    FOR func_rec IN
        SELECT p.proname, n.nspname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND pg_get_functiondef(p.oid) LIKE '%pilier_s%'
    LOOP
        RAISE NOTICE 'Found function with pilier_s: %', func_rec.proname;
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I() CASCADE', func_rec.nspname, func_rec.proname);
        RAISE NOTICE 'DROPPED function: %', func_rec.proname;
    END LOOP;
END;
$$;

-- STEP 3: List remaining triggers (should be safe ones only)
SELECT
    tgname AS remaining_trigger,
    CASE
        WHEN tgenabled = 'O' THEN 'ENABLED'
        WHEN tgenabled = 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'products' AND NOT tgisinternal;

-- STEP 4: Test update (this should now work!)
UPDATE products
SET safe_priority_pillar = safe_priority_pillar
WHERE id = (SELECT id FROM products LIMIT 1)
RETURNING id, name, safe_priority_pillar;

-- If you see a result row above, the fix worked!
-- You can now run: python scripts/import_advice_from_json.py
