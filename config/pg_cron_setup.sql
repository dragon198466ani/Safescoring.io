-- ============================================================
-- pg_cron Configuration for SafeScoring
-- Automatic refresh of materialized views
-- ============================================================

-- STEP 1: Enable pg_cron extension (run this first!)
-- Go to Supabase Dashboard > Database > Extensions > Enable pg_cron
-- OR run:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- STEP 2: Grant usage to postgres role (required for Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================
-- OPTION A: Using pg_cron (if extension is enabled)
-- ============================================================

-- 1. Refresh all materialized views every 5 minutes
SELECT cron.schedule(
    'refresh-all-mv',
    '*/5 * * * *',
    $$SELECT refresh_all_materialized_views()$$
);

-- 2. Alternative: Staggered refresh for better performance
-- Uncomment these and comment out the one above if you prefer staggered refresh

-- Products with scores - every 5 minutes (most accessed)
-- SELECT cron.schedule(
--     'refresh-mv-products',
--     '*/5 * * * *',
--     $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_products_with_scores$$
-- );

-- Rankings - every 10 minutes
-- SELECT cron.schedule(
--     'refresh-mv-rankings',
--     '*/10 * * * *',
--     $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_rankings$$
-- );

-- Category stats - every 30 minutes (less frequent changes)
-- SELECT cron.schedule(
--     'refresh-mv-category-stats',
--     '*/30 * * * *',
--     $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_stats$$
-- );

-- Incident summary - every hour
-- SELECT cron.schedule(
--     'refresh-mv-incidents',
--     '0 * * * *',
--     $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_incident_summary$$
-- );

-- ============================================================
-- Useful commands
-- ============================================================

-- View all scheduled jobs:
-- SELECT * FROM cron.job;

-- View job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Remove a job:
-- SELECT cron.unschedule('refresh-all-mv');

-- Manual refresh (if needed):
-- SELECT refresh_all_materialized_views();

-- ============================================================
-- OPTION B: Without pg_cron (use external scheduler)
-- ============================================================

-- If pg_cron is not available, you can call this function via:
-- 1. Supabase Edge Function (scheduled)
-- 2. GitHub Actions cron
-- 3. External cron service (cron-job.org, etc.)

-- Example API call (using Supabase client):
-- const { data, error } = await supabase.rpc('refresh_all_materialized_views');

-- Example curl command:
-- curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/rpc/refresh_all_materialized_views' \
--   -H "apikey: YOUR_ANON_KEY" \
--   -H "Authorization: Bearer YOUR_SERVICE_KEY"

-- ============================================================
-- OPTION C: Trigger-based refresh (on data change)
-- ============================================================

-- Auto-refresh when scores are updated
CREATE OR REPLACE FUNCTION trigger_refresh_mv_on_score_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh only the products view (fast)
    PERFORM refresh_product_views();
    RETURN NEW;
END;
$$;

-- Create trigger (optional - can cause performance issues if scores update frequently)
-- DROP TRIGGER IF EXISTS trg_refresh_mv_scores ON safe_scoring_results;
-- CREATE TRIGGER trg_refresh_mv_scores
--     AFTER INSERT OR UPDATE ON safe_scoring_results
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION trigger_refresh_mv_on_score_change();
