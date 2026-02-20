-- Migration 053: API Usage Increment Function
-- Creates an efficient upsert function for tracking API usage per user

-- =============================================================================
-- INCREMENT FUNCTION FOR API USAGE TRACKING
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_api_usage_daily(
    p_user_id UUID,
    p_date DATE,
    p_endpoint TEXT DEFAULT '/api/v1'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_usage_daily (user_id, date, request_count, endpoint, last_request_at)
    VALUES (p_user_id, p_date, 1, p_endpoint, NOW())
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        request_count = api_usage_daily.request_count + 1,
        last_request_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_api_usage_daily(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_api_usage_daily(UUID, DATE, TEXT) TO service_role;

-- =============================================================================
-- ADD MISSING COLUMNS IF NOT EXISTS
-- =============================================================================

DO $$
BEGIN
    -- Add endpoint column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'api_usage_daily' AND column_name = 'endpoint'
    ) THEN
        ALTER TABLE api_usage_daily ADD COLUMN endpoint TEXT DEFAULT '/api/v1';
    END IF;

    -- Add last_request_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'api_usage_daily' AND column_name = 'last_request_at'
    ) THEN
        ALTER TABLE api_usage_daily ADD COLUMN last_request_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- =============================================================================
-- API USAGE VIEW FOR DASHBOARD
-- =============================================================================

CREATE OR REPLACE VIEW user_api_usage_summary AS
SELECT
    user_id,
    SUM(request_count) AS total_requests,
    SUM(CASE WHEN date = CURRENT_DATE THEN request_count ELSE 0 END) AS today_requests,
    SUM(CASE WHEN date >= DATE_TRUNC('month', CURRENT_DATE) THEN request_count ELSE 0 END) AS month_requests,
    MAX(last_request_at) AS last_request_at,
    COUNT(DISTINCT date) AS active_days
FROM api_usage_daily
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON user_api_usage_summary TO authenticated;
GRANT SELECT ON user_api_usage_summary TO service_role;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 053: API usage increment function created successfully';
END $$;
