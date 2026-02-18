-- ============================================================
-- Alert Subscriptions Table
-- For webhook and email notifications on score changes/incidents
-- ============================================================

-- Create alert_subscriptions table
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_hash TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('score_change', 'score_drop', 'new_incident', 'product_incident')),
    webhook_url TEXT,
    webhook_secret TEXT,
    email TEXT,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    threshold INTEGER,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,

    -- At least one notification method required
    CONSTRAINT notification_method_required CHECK (webhook_url IS NOT NULL OR email IS NOT NULL)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_alert_subs_api_key ON alert_subscriptions(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_alert_subs_type ON alert_subscriptions(type);
CREATE INDEX IF NOT EXISTS idx_alert_subs_product ON alert_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_alert_subs_active ON alert_subscriptions(is_active) WHERE is_active = true;

-- API Keys table for authenticated access
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    rate_limit INTEGER DEFAULT 100, -- requests per minute
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Index for API key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- API usage tracking for analytics
CREATE TABLE IF NOT EXISTS api_usage (
    id BIGSERIAL PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    client_ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by date for efficient querying (optional, for high volume)
CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- RLS Policies
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
CREATE POLICY "Users can view own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Service role has full access for alert processing
CREATE POLICY "Service role full access alerts" ON alert_subscriptions
    FOR ALL USING (true);

CREATE POLICY "Service role full access api_keys" ON api_keys
    FOR ALL USING (true);

CREATE POLICY "Service role full access api_usage" ON api_usage
    FOR ALL USING (true);

-- ============================================================
-- Helper functions
-- ============================================================

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key(p_user_id UUID, p_name TEXT, p_tier TEXT DEFAULT 'free')
RETURNS TABLE(api_key TEXT, key_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key TEXT;
    v_key_hash TEXT;
    v_key_prefix TEXT;
    v_key_id UUID;
BEGIN
    -- Generate random API key
    v_key := 'sk_' || encode(gen_random_bytes(32), 'hex');
    v_key_hash := encode(sha256(v_key::bytea), 'hex');
    v_key_prefix := substring(v_key, 1, 11);

    -- Insert API key
    INSERT INTO api_keys (user_id, name, key_hash, key_prefix, tier)
    VALUES (p_user_id, p_name, v_key_hash, v_key_prefix, p_tier)
    RETURNING id INTO v_key_id;

    RETURN QUERY SELECT v_key, v_key_id;
END;
$$;

-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_api_key(p_key TEXT)
RETURNS TABLE(
    key_id UUID,
    user_id UUID,
    tier TEXT,
    rate_limit INTEGER,
    is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key_hash TEXT;
BEGIN
    v_key_hash := encode(sha256(p_key::bytea), 'hex');

    RETURN QUERY
    SELECT
        ak.id,
        ak.user_id,
        ak.tier,
        ak.rate_limit,
        (ak.is_active AND (ak.expires_at IS NULL OR ak.expires_at > NOW())) AS is_valid
    FROM api_keys ak
    WHERE ak.key_hash = v_key_hash;

    -- Update last used timestamp
    UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = v_key_hash;
END;
$$;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
    p_key_id UUID,
    p_endpoint TEXT,
    p_method TEXT,
    p_status_code INTEGER,
    p_response_time_ms INTEGER,
    p_client_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO api_usage (api_key_id, endpoint, method, status_code, response_time_ms, client_ip, user_agent)
    VALUES (p_key_id, p_endpoint, p_method, p_status_code, p_response_time_ms, p_client_ip, p_user_agent);
END;
$$;

-- ============================================================
-- Sample data for testing (comment out in production)
-- ============================================================

-- INSERT INTO api_keys (user_id, name, key_hash, key_prefix, tier, rate_limit)
-- VALUES (
--     (SELECT id FROM users LIMIT 1),
--     'Test API Key',
--     encode(sha256('sk_test_example_key_12345678901234567890'::bytea), 'hex'),
--     'sk_test_exa',
--     'pro',
--     1000
-- );
