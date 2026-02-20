-- Migration: API Tiers, Usage Tracking, and Re-engagement System (v2)
-- Simplified version compatible with existing database structure

-- =============================================================================
-- API USAGE TRACKING
-- =============================================================================

-- Add new columns to api_keys table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        ALTER TABLE api_keys
        ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 100,
        ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 1000,
        ADD COLUMN IF NOT EXISTS usage_today INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS usage_this_month INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_usage_reset_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create API usage log table for detailed tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER,
    user_id TEXT, -- Using TEXT for flexibility with different user ID types

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
    api_key_id INTEGER,
    user_id TEXT,

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

-- Add payment tracking columns to verified_badges (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verified_badges') THEN
        ALTER TABLE verified_badges
        ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS lemon_squeezy_subscription_id TEXT,
        ADD COLUMN IF NOT EXISTS lemon_squeezy_customer_id TEXT;

        CREATE INDEX IF NOT EXISTS idx_verified_badges_payment_status ON verified_badges(payment_status);
    END IF;
END $$;

-- =============================================================================
-- USER RE-ENGAGEMENT TRACKING
-- =============================================================================

-- Add re-engagement columns to users table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_reengagement_email_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS reengagement_email_type TEXT;

        CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
        CREATE INDEX IF NOT EXISTS idx_users_reengagement ON users(last_reengagement_email_at);
    END IF;
END $$;

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

-- =============================================================================
-- USER NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,

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
    user_id TEXT,

    payment_provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
    external_id TEXT NOT NULL,

    amount_eur DECIMAL(10,2) NOT NULL,
    tier TEXT,
    payment_type TEXT DEFAULT 'subscription',

    description TEXT,
    customer_email TEXT,
    status TEXT DEFAULT 'pending',

    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(payment_provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_fiat_payments_user ON fiat_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_fiat_payments_provider ON fiat_payments(payment_provider, status);
CREATE INDEX IF NOT EXISTS idx_fiat_payments_created ON fiat_payments(created_at);

-- =============================================================================
-- RLS POLICIES (Only if RLS is enabled on these tables)
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiat_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own API usage" ON api_usage;
DROP POLICY IF EXISTS "Users can view their own daily usage" ON api_usage_daily;
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can view their own payments" ON fiat_payments;
DROP POLICY IF EXISTS "Service role manages api_usage" ON api_usage;
DROP POLICY IF EXISTS "Service role manages api_usage_daily" ON api_usage_daily;
DROP POLICY IF EXISTS "Service role manages user_notifications" ON user_notifications;
DROP POLICY IF EXISTS "Service role manages fiat_payments" ON fiat_payments;

-- Create permissive policies for service role
CREATE POLICY "Allow all for service role on api_usage"
    ON api_usage FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all for service role on api_usage_daily"
    ON api_usage_daily FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all for service role on user_notifications"
    ON user_notifications FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all for service role on fiat_payments"
    ON fiat_payments FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- DONE
-- =============================================================================

-- Add comments
COMMENT ON TABLE api_usage IS 'Detailed API usage log for rate limiting and billing';
COMMENT ON TABLE api_usage_daily IS 'Daily aggregated API usage for billing reports';
COMMENT ON TABLE user_notifications IS 'In-app notifications for users';
COMMENT ON TABLE fiat_payments IS 'FIAT payment records for accounting';
COMMENT ON TABLE webhook_events IS 'Webhook idempotency tracking';

-- Success message
DO $$ BEGIN RAISE NOTICE 'Migration 015 completed successfully!'; END $$;
