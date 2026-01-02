-- ============================================================
-- pg_cron Configuration for SafeScoring
-- Automatic refresh of materialized views
-- ============================================================

-- IMPORTANT: pg_cron must be enabled in Supabase Dashboard first:
-- Database > Extensions > pg_cron > Enable

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
