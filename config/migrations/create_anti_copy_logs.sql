-- Migration: Create anti-copy tracking tables
-- Purpose: Store API access logs for detecting unauthorized copying
-- Run this in Supabase SQL Editor

-- Anti-copy access logs
CREATE TABLE IF NOT EXISTS anti_copy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  client_fingerprint TEXT,
  endpoint TEXT NOT NULL,
  honeypot_served BOOLEAN DEFAULT FALSE,
  honeypot_ids JSONB DEFAULT '[]'::jsonb,
  user_agent TEXT,
  ip_hash TEXT,
  is_authenticated BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_anti_copy_logs_client_id ON anti_copy_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_anti_copy_logs_timestamp ON anti_copy_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anti_copy_logs_honeypot ON anti_copy_logs(honeypot_served) WHERE honeypot_served = TRUE;
CREATE INDEX IF NOT EXISTS idx_anti_copy_logs_user ON anti_copy_logs(user_id) WHERE user_id IS NOT NULL;

-- Anti-copy alerts
CREATE TABLE IF NOT EXISTS anti_copy_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  details JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anti_copy_alerts_type ON anti_copy_alerts(type);
CREATE INDEX IF NOT EXISTS idx_anti_copy_alerts_timestamp ON anti_copy_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anti_copy_alerts_unresolved ON anti_copy_alerts(resolved) WHERE resolved = FALSE;

-- Aggregated view for suspicious clients
CREATE OR REPLACE VIEW suspicious_clients AS
SELECT
  client_id,
  client_fingerprint,
  COUNT(*) as access_count,
  COUNT(*) FILTER (WHERE honeypot_served = TRUE) as honeypot_count,
  MIN(timestamp) as first_seen,
  MAX(timestamp) as last_seen,
  COUNT(DISTINCT endpoint) as endpoints_accessed,
  COUNT(DISTINCT DATE(timestamp)) as active_days
FROM anti_copy_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY client_id, client_fingerprint
ORDER BY access_count DESC;

-- Function to clean up old logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_anti_copy_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM anti_copy_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE anti_copy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_copy_alerts ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables (not anon users)
CREATE POLICY "Service role only" ON anti_copy_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON anti_copy_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT ON anti_copy_logs TO service_role;
GRANT SELECT, INSERT, UPDATE ON anti_copy_alerts TO service_role;
GRANT SELECT ON suspicious_clients TO service_role;

COMMENT ON TABLE anti_copy_logs IS 'Stores API access logs with fingerprint data for anti-copy detection';
COMMENT ON TABLE anti_copy_alerts IS 'Stores alerts when suspicious copying activity is detected';
COMMENT ON VIEW suspicious_clients IS 'Aggregated view of clients with suspicious access patterns';
