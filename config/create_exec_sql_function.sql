-- ============================================================
-- CREATE exec_sql FUNCTION FOR MCP SERVER
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor
-- This enables the MCP server to execute arbitrary SQL
-- ============================================================

-- Create the function (SECURITY DEFINER runs with owner privileges)
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    EXECUTE query;
    RETURN jsonb_build_object('success', true, 'message', 'Query executed successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to service_role only (not public!)
REVOKE ALL ON FUNCTION exec_sql FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql TO service_role;

-- ============================================================
-- ALSO: Fix the trigger issue while we're here
-- ============================================================

-- Step 1: Find the problematic trigger
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'products'
        AND NOT tgisinternal
        AND pg_get_triggerdef(t.oid) LIKE '%pilier_s%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON products', trigger_rec.tgname);
        RAISE NOTICE 'Dropped trigger: %', trigger_rec.tgname;
    END LOOP;
END;
$$;

-- Step 2: Also drop any function referencing pilier_s
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    FOR func_rec IN
        SELECT p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND pg_get_functiondef(p.oid) LIKE '%pilier_s%'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I() CASCADE', func_rec.proname);
        RAISE NOTICE 'Dropped function: %', func_rec.proname;
    END LOOP;
END;
$$;

-- Verify: Should return empty if fixed
SELECT tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'products' AND NOT tgisinternal;
