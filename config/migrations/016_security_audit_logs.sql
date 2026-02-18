-- ============================================================================
-- Migration: Security Audit Logs Table
-- Description: Persistent storage for security events (SOC2/ISO27001 compliant)
-- ============================================================================

-- Create the security_audit_logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Event classification
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'debug')),
    message TEXT,

    -- Actor information (who did this)
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_ip VARCHAR(45), -- IPv6 compatible
    actor_user_agent TEXT,
    actor_session_id VARCHAR(100),
    actor_fingerprint VARCHAR(100),

    -- Target information (what was affected)
    target_resource VARCHAR(255),
    target_endpoint VARCHAR(500),
    target_method VARCHAR(10),
    target_resource_id VARCHAR(255),

    -- Additional context
    metadata JSONB DEFAULT '{}',
    request_id VARCHAR(100),
    environment VARCHAR(20) DEFAULT 'production',

    -- Indexing for fast queries
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON security_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON security_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_ip ON security_audit_logs(actor_ip);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_endpoint ON security_audit_logs(target_endpoint);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON security_audit_logs(request_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity_timestamp
    ON security_audit_logs(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type_timestamp
    ON security_audit_logs(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_timestamp
    ON security_audit_logs(actor_user_id, timestamp DESC) WHERE actor_user_id IS NOT NULL;

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON security_audit_logs USING GIN (metadata);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
    ON security_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            WHERE u.id = auth.uid()
            AND u.email = ANY(STRING_TO_ARRAY(current_setting('app.admin_emails', true), ','))
        )
    );

-- Service role can insert (for the logging system)
CREATE POLICY "Service role can insert audit logs"
    ON security_audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Nobody can update or delete audit logs (immutable for compliance)
-- No UPDATE or DELETE policies = no modifications allowed

-- ============================================================================
-- PARTITIONING (for large-scale deployments)
-- ============================================================================

-- Note: For production with high volume, consider partitioning by month:
-- CREATE TABLE security_audit_logs (
--     ...
-- ) PARTITION BY RANGE (timestamp);

-- ============================================================================
-- AUTOMATIC CLEANUP FUNCTION (Optional)
-- ============================================================================

-- Function to delete old audit logs (run as cron job)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_audit_logs
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the cleanup action
    INSERT INTO security_audit_logs (
        event_type,
        severity,
        message,
        metadata
    ) VALUES (
        'AUDIT_LOG_CLEANUP',
        'low',
        'Old audit logs cleaned up',
        jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days)
    );

    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- BLOCKED IPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL,
    client_fingerprint VARCHAR(100),
    reason VARCHAR(255) NOT NULL,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMPTZ NOT NULL,
    blocked_by UUID REFERENCES auth.users(id),
    auto_blocked BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',

    UNIQUE(ip_address)
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);

-- RLS for blocked_ips
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blocked IPs"
    ON blocked_ips
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            WHERE u.id = auth.uid()
            AND u.email = ANY(STRING_TO_ARRAY(current_setting('app.admin_emails', true), ','))
        )
    );

CREATE POLICY "Service role full access to blocked IPs"
    ON blocked_ips
    FOR ALL
    TO service_role
    WITH CHECK (true);

-- ============================================================================
-- HONEYPOT TRIGGERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS honeypot_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL,
    path_accessed VARCHAR(500) NOT NULL,
    user_agent TEXT,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_honeypot_ip ON honeypot_triggers(ip_address);
CREATE INDEX IF NOT EXISTS idx_honeypot_timestamp ON honeypot_triggers(triggered_at DESC);

-- ============================================================================
-- CANARY TOKEN TRIGGERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS canary_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id VARCHAR(100) NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_ip VARCHAR(45),
    source_user_agent TEXT,
    context JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'critical'
);

CREATE INDEX IF NOT EXISTS idx_canary_token_id ON canary_triggers(token_id);
CREATE INDEX IF NOT EXISTS idx_canary_timestamp ON canary_triggers(triggered_at DESC);

-- ============================================================================
-- CSP VIOLATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS csp_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_uri TEXT,
    violated_directive VARCHAR(100),
    blocked_uri TEXT,
    source_file TEXT,
    line_number INTEGER,
    column_number INTEGER,
    original_policy TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'low',
    is_attack BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_csp_timestamp ON csp_violations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_csp_severity ON csp_violations(severity);
CREATE INDEX IF NOT EXISTS idx_csp_is_attack ON csp_violations(is_attack) WHERE is_attack = true;

-- ============================================================================
-- VIEWS FOR DASHBOARDS
-- ============================================================================

-- Recent critical events view
CREATE OR REPLACE VIEW v_recent_critical_events AS
SELECT
    id,
    timestamp,
    event_type,
    message,
    actor_ip,
    actor_user_id,
    target_endpoint,
    metadata
FROM security_audit_logs
WHERE severity IN ('critical', 'high')
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 100;

-- Security stats view
CREATE OR REPLACE VIEW v_security_stats AS
SELECT
    date_trunc('hour', timestamp) as hour,
    severity,
    COUNT(*) as event_count
FROM security_audit_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', timestamp), severity
ORDER BY hour DESC;

-- Top attacked IPs
CREATE OR REPLACE VIEW v_top_attack_sources AS
SELECT
    actor_ip,
    COUNT(*) as attack_count,
    array_agg(DISTINCT event_type) as attack_types,
    MAX(timestamp) as last_seen
FROM security_audit_logs
WHERE severity IN ('critical', 'high')
AND actor_ip IS NOT NULL
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY actor_ip
ORDER BY attack_count DESC
LIMIT 50;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE security_audit_logs IS 'Immutable security event log for compliance and forensics';
COMMENT ON TABLE blocked_ips IS 'Currently blocked IP addresses';
COMMENT ON TABLE honeypot_triggers IS 'Log of honeypot endpoint accesses';
COMMENT ON TABLE canary_triggers IS 'Log of canary token activations (breach indicators)';
COMMENT ON TABLE csp_violations IS 'Content Security Policy violation reports';
