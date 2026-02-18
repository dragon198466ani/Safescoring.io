-- Migration 019: Webhook Events Idempotency Table
-- Prevents replay attacks on webhook endpoints by tracking processed events

-- Create webhook_events table for idempotency checks
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'lemonsqueezy', 'nowpayments', etc.
    payload_hash TEXT, -- First 100 chars of base64 encoded payload for debugging
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency_key
ON webhook_events(idempotency_key);

-- Index by provider for analytics
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider
ON webhook_events(provider, processed_at DESC);

-- Auto-cleanup old events (keep 90 days)
-- This prevents the table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
    DELETE FROM webhook_events
    WHERE processed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the table purpose
COMMENT ON TABLE webhook_events IS 'Stores processed webhook event IDs to prevent replay attacks (idempotency)';
COMMENT ON COLUMN webhook_events.idempotency_key IS 'Unique key combining provider, event type, and event ID';
COMMENT ON COLUMN webhook_events.provider IS 'Payment provider: lemonsqueezy, nowpayments, stripe, etc.';

-- Enable RLS (though this table is only accessed server-side)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
