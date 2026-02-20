-- ============================================================================
-- Migration 013: Security Events & Brute Force Protection
-- ============================================================================
-- Comprehensive security event logging and account protection system
-- ============================================================================

-- ============================================================================
-- 1. SECURITY EVENTS TABLE - Centralized security logging
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    country_code TEXT,
    details JSONB DEFAULT '{}',
    fingerprint TEXT,
    request_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_fingerprint ON security_events(fingerprint);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_security_events_ip_type_time
    ON security_events(ip_address, event_type, created_at DESC);

-- ============================================================================
-- 2. LOGIN ATTEMPTS TABLE - Brute force protection
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_ip_time
    ON login_attempts(email, ip_address, created_at DESC);

-- ============================================================================
-- 3. ACCOUNT LOCKOUTS TABLE - Temporary account locks
-- ============================================================================
CREATE TABLE IF NOT EXISTS account_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    reason TEXT NOT NULL,
    locked_until TIMESTAMPTZ NOT NULL,
    attempts_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unlocked_at TIMESTAMPTZ,
    unlocked_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_ip ON account_lockouts(ip_address);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until ON account_lockouts(locked_until);
-- Index partiel pour les lockouts actifs (sans NOW() car non-IMMUTABLE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_lockouts_active
    ON account_lockouts(email) WHERE unlocked_at IS NULL;

-- ============================================================================
-- 4. IP BLOCKLIST TABLE - Persistent IP blocking
-- ============================================================================
CREATE TABLE IF NOT EXISTS ip_blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    ip_range TEXT, -- For CIDR blocking
    reason TEXT NOT NULL,
    blocked_until TIMESTAMPTZ, -- NULL = permanent
    blocked_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unblocked_at TIMESTAMPTZ,
    unblocked_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_blocklist_ip ON ip_blocklist(ip_address)
    WHERE unblocked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_range ON ip_blocklist(ip_range)
    WHERE ip_range IS NOT NULL AND unblocked_at IS NULL;

-- ============================================================================
-- 5. TRUSTED DEVICES TABLE - Known user devices
-- ============================================================================
CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    last_ip TEXT,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_devices_user_fp
    ON trusted_devices(user_id, device_fingerprint) WHERE revoked_at IS NULL;

-- ============================================================================
-- 6. SECURITY ALERTS TABLE - Real-time alerting
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT,
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT,
    description TEXT,
    details JSONB DEFAULT '{}',
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'alert_type') THEN
    ALTER TABLE security_alerts ADD COLUMN alert_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'severity') THEN
    ALTER TABLE security_alerts ADD COLUMN severity TEXT CHECK (severity IN ('info', 'warning', 'critical'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'title') THEN
    ALTER TABLE security_alerts ADD COLUMN title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'description') THEN
    ALTER TABLE security_alerts ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'details') THEN
    ALTER TABLE security_alerts ADD COLUMN details JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'acknowledged_at') THEN
    ALTER TABLE security_alerts ADD COLUMN acknowledged_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'acknowledged_by') THEN
    ALTER TABLE security_alerts ADD COLUMN acknowledged_by TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'resolved_at') THEN
    ALTER TABLE security_alerts ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'resolved_by') THEN
    ALTER TABLE security_alerts ADD COLUMN resolved_by TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_unacknowledged
    ON security_alerts(created_at DESC) WHERE acknowledged_at IS NULL;

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if an account is locked
CREATE OR REPLACE FUNCTION is_account_locked(check_email TEXT, check_ip TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM account_lockouts
        WHERE email = check_email
        AND locked_until > NOW()
        AND unlocked_at IS NULL
        AND (check_ip IS NULL OR ip_address IS NULL OR ip_address = check_ip)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ip_blocklist
        WHERE ip_address = check_ip
        AND unblocked_at IS NULL
        AND (blocked_until IS NULL OR blocked_until > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count recent failed login attempts
CREATE OR REPLACE FUNCTION count_failed_logins(
    check_email TEXT,
    check_ip TEXT,
    window_minutes INTEGER DEFAULT 15
)
RETURNS INTEGER AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attempt_count
    FROM login_attempts
    WHERE (email = check_email OR ip_address = check_ip)
    AND success = FALSE
    AND created_at > NOW() - (window_minutes || ' minutes')::INTERVAL;

    RETURN attempt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock an account
CREATE OR REPLACE FUNCTION lock_account(
    lock_email TEXT,
    lock_ip TEXT,
    lock_reason TEXT,
    lock_duration_minutes INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    lockout_id UUID;
BEGIN
    INSERT INTO account_lockouts (email, ip_address, reason, locked_until, attempts_count)
    VALUES (
        lock_email,
        lock_ip,
        lock_reason,
        NOW() + (lock_duration_minutes || ' minutes')::INTERVAL,
        (SELECT COUNT(*) FROM login_attempts
         WHERE email = lock_email AND success = FALSE
         AND created_at > NOW() - INTERVAL '1 hour')
    )
    RETURNING id INTO lockout_id;

    -- Log security event
    INSERT INTO security_events (event_type, severity, ip_address, details)
    VALUES (
        'ACCOUNT_LOCKED',
        'high',
        lock_ip,
        jsonb_build_object(
            'email', lock_email,
            'reason', lock_reason,
            'duration_minutes', lock_duration_minutes
        )
    );

    RETURN lockout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get login statistics for dashboard
CREATE OR REPLACE FUNCTION get_login_stats(since_time TIMESTAMPTZ)
RETURNS TABLE (
    total_attempts BIGINT,
    successful_logins BIGINT,
    failed_logins BIGINT,
    success_rate NUMERIC,
    unique_ips BIGINT,
    unique_emails BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_attempts,
        COUNT(*) FILTER (WHERE success = TRUE)::BIGINT as successful_logins,
        COUNT(*) FILTER (WHERE success = FALSE)::BIGINT as failed_logins,
        ROUND(
            COALESCE(
                COUNT(*) FILTER (WHERE success = TRUE)::NUMERIC /
                NULLIF(COUNT(*)::NUMERIC, 0) * 100,
                0
            ),
            2
        ) as success_rate,
        COUNT(DISTINCT ip_address)::BIGINT as unique_ips,
        COUNT(DISTINCT email)::BIGINT as unique_emails
    FROM login_attempts
    WHERE created_at >= since_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for API routes)
-- Drop et recréer pour éviter les erreurs "already exists"
DROP POLICY IF EXISTS "Service role full access on security_events" ON security_events;
CREATE POLICY "Service role full access on security_events" ON security_events
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on login_attempts" ON login_attempts;
CREATE POLICY "Service role full access on login_attempts" ON login_attempts
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on account_lockouts" ON account_lockouts;
CREATE POLICY "Service role full access on account_lockouts" ON account_lockouts
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on ip_blocklist" ON ip_blocklist;
CREATE POLICY "Service role full access on ip_blocklist" ON ip_blocklist
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_alerts" ON security_alerts;
CREATE POLICY "Service role full access on security_alerts" ON security_alerts
    FOR ALL USING (true) WITH CHECK (true);

-- Users can only see their own trusted devices
DROP POLICY IF EXISTS "Users can view own trusted devices" ON trusted_devices;
CREATE POLICY "Users can view own trusted devices" ON trusted_devices
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trusted devices" ON trusted_devices;
CREATE POLICY "Users can insert own trusted devices" ON trusted_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can revoke own trusted devices" ON trusted_devices;
CREATE POLICY "Users can revoke own trusted devices" ON trusted_devices
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 9. AUTOMATIC CLEANUP (scheduled via pg_cron or external job)
-- ============================================================================

-- Function to clean up old security data
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS void AS $$
BEGIN
    -- Delete login attempts older than 90 days
    DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '90 days';

    -- Delete security events older than 1 year (keep critical forever)
    DELETE FROM security_events
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND severity != 'critical';

    -- Delete expired lockouts older than 30 days
    DELETE FROM account_lockouts
    WHERE locked_until < NOW() - INTERVAL '30 days';

    -- Delete resolved alerts older than 90 days
    DELETE FROM security_alerts
    WHERE resolved_at IS NOT NULL
    AND resolved_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE security_events IS 'Centralized security event log for audit and analysis';
COMMENT ON TABLE login_attempts IS 'Track all login attempts for brute force protection';
COMMENT ON TABLE account_lockouts IS 'Temporary account locks after failed login attempts';
COMMENT ON TABLE ip_blocklist IS 'Persistent IP blocking for malicious actors';
COMMENT ON TABLE trusted_devices IS 'Known devices for each user to detect suspicious logins';
COMMENT ON TABLE security_alerts IS 'Real-time security alerts for admin notification';

COMMENT ON FUNCTION is_account_locked IS 'Check if an account is currently locked';
COMMENT ON FUNCTION is_ip_blocked IS 'Check if an IP address is blocked';
COMMENT ON FUNCTION count_failed_logins IS 'Count recent failed login attempts';
COMMENT ON FUNCTION lock_account IS 'Lock an account with optional IP restriction';
COMMENT ON FUNCTION cleanup_security_data IS 'Clean up old security data (run periodically)';
