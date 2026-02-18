-- Migration: API Tiers, Usage Tracking, and Re-engagement System
-- This migration adds support for:
-- 1. API usage tracking with tier-based limits
-- 2. Verified badges payment integration
-- 3. User re-engagement tracking

-- =============================================================================
-- API USAGE TRACKING
-- =============================================================================

-- Add new columns to api_keys table
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS usage_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_usage_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Create API usage log table for detailed tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Request details
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    status_code INTEGER,
    response_time_ms INTEGER,

    -- Usage tracking
    tokens_used INTEGER DEFAULT 1,

    -- Metadata
    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_api_usage_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_date ON api_usage(api_key_id, created_at);

-- Daily usage summary (for billing)
CREATE TABLE IF NOT EXISTS api_usage_daily (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,

    -- For overage billing
    included_requests INTEGER DEFAULT 0,
    overage_requests INTEGER DEFAULT 0,
    overage_cost DECIMAL(10,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(api_key_id, date)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_daily_key_date ON api_usage_daily(api_key_id, date);
CREATE INDEX IF NOT EXISTS idx_api_usage_daily_user ON api_usage_daily(user_id, date);

-- =============================================================================
-- VERIFIED BADGES UPDATES
-- =============================================================================

-- Add payment tracking columns to verified_badges
ALTER TABLE verified_badges
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS lemon_squeezy_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS lemon_squeezy_customer_id TEXT;

-- Create index for payment status
CREATE INDEX IF NOT EXISTS idx_verified_badges_payment_status ON verified_badges(payment_status);

-- =============================================================================
-- USER RE-ENGAGEMENT TRACKING
-- =============================================================================

-- Add re-engagement columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reengagement_email_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reengagement_email_type TEXT CHECK (reengagement_email_type IN ('reminder', 'alert', 'winback'));

-- Create index for finding inactive users
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_users_reengagement ON users(last_reengagement_email_at);

-- =============================================================================
-- WEBHOOK EVENTS TABLE (for idempotency)
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id SERIAL PRIMARY KEY,
    idempotency_key TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
    payload_hash TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_key ON webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider, event_type);

-- Auto-cleanup old webhook events (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
    DELETE FROM webhook_events
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USER NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON user_notifications(created_at);

-- =============================================================================
-- FIAT PAYMENTS TABLE (for accounting)
-- =============================================================================

CREATE TABLE IF NOT EXISTS fiat_payments (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    payment_provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
    external_id TEXT NOT NULL,

    amount_eur DECIMAL(10,2) NOT NULL,
    tier TEXT,
    payment_type TEXT DEFAULT 'subscription' CHECK (payment_type IN ('subscription', 'one_time', 'overage')),

    description TEXT,
    customer_email TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'refunded', 'failed')),

    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(payment_provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_fiat_payments_user ON fiat_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_fiat_payments_provider ON fiat_payments(payment_provider, status);
CREATE INDEX IF NOT EXISTS idx_fiat_payments_created ON fiat_payments(created_at);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- API Usage - users can only see their own usage
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API usage"
    ON api_usage FOR SELECT
    USING (user_id = auth.uid());

-- API Usage Daily - users can only see their own summary
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily usage"
    ON api_usage_daily FOR SELECT
    USING (user_id = auth.uid());

-- User Notifications - users can only see their own
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON user_notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON user_notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Fiat Payments - users can only see their own payments
ALTER TABLE fiat_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
    ON fiat_payments FOR SELECT
    USING (user_id = auth.uid());

-- Service role can manage everything
CREATE POLICY "Service role manages api_usage"
    ON api_usage FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages api_usage_daily"
    ON api_usage_daily FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages user_notifications"
    ON user_notifications FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages fiat_payments"
    ON fiat_payments FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check API rate limit
CREATE OR REPLACE FUNCTION check_api_rate_limit(
    p_api_key_id INTEGER,
    p_daily_limit INTEGER,
    p_monthly_limit INTEGER
)
RETURNS TABLE(
    allowed BOOLEAN,
    daily_usage INTEGER,
    monthly_usage INTEGER,
    daily_remaining INTEGER,
    monthly_remaining INTEGER
) AS $$
DECLARE
    v_daily_usage INTEGER;
    v_monthly_usage INTEGER;
BEGIN
    -- Get today's usage
    SELECT COUNT(*)::INTEGER INTO v_daily_usage
    FROM api_usage
    WHERE api_key_id = p_api_key_id
    AND created_at >= CURRENT_DATE;

    -- Get this month's usage
    SELECT COUNT(*)::INTEGER INTO v_monthly_usage
    FROM api_usage
    WHERE api_key_id = p_api_key_id
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

    -- Return results
    RETURN QUERY SELECT
        (p_daily_limit = -1 OR v_daily_usage < p_daily_limit) AND
        (p_monthly_limit = -1 OR v_monthly_usage < p_monthly_limit),
        v_daily_usage,
        v_monthly_usage,
        CASE WHEN p_daily_limit = -1 THEN -1 ELSE p_daily_limit - v_daily_usage END,
        CASE WHEN p_monthly_limit = -1 THEN -1 ELSE p_monthly_limit - v_monthly_usage END;
END;
$$ LANGUAGE plpgsql;

-- Function to record API usage
CREATE OR REPLACE FUNCTION record_api_usage(
    p_api_key_id INTEGER,
    p_user_id UUID,
    p_endpoint TEXT,
    p_method TEXT DEFAULT 'GET',
    p_status_code INTEGER DEFAULT 200,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Insert usage record
    INSERT INTO api_usage (api_key_id, user_id, endpoint, method, status_code, response_time_ms)
    VALUES (p_api_key_id, p_user_id, p_endpoint, p_method, p_status_code, p_response_time_ms);

    -- Update daily summary (upsert) - simplified without user_id in conflict
    INSERT INTO api_usage_daily (api_key_id, user_id, date, total_requests, successful_requests, failed_requests)
    VALUES (
        p_api_key_id,
        p_user_id,
        CURRENT_DATE,
        1,
        CASE WHEN p_status_code < 400 THEN 1 ELSE 0 END,
        CASE WHEN p_status_code >= 400 THEN 1 ELSE 0 END
    )
    ON CONFLICT (api_key_id, date) DO UPDATE SET
        total_requests = EXCLUDED.total_requests + api_usage_daily.total_requests,
        successful_requests = EXCLUDED.successful_requests + api_usage_daily.successful_requests,
        failed_requests = EXCLUDED.failed_requests + api_usage_daily.failed_requests,
        updated_at = NOW();

    -- Update last_used_at on api_keys
    UPDATE api_keys SET last_used_at = NOW() WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE api_usage IS 'Detailed API usage log for rate limiting and billing';
COMMENT ON TABLE api_usage_daily IS 'Daily aggregated API usage for billing reports';
COMMENT ON TABLE user_notifications IS 'In-app notifications for users';
COMMENT ON TABLE fiat_payments IS 'FIAT payment records for accounting';
COMMENT ON TABLE webhook_events IS 'Webhook idempotency tracking';
