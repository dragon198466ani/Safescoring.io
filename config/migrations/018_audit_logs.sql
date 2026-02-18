-- ============================================
-- Migration 018: Security Audit Logs
-- ============================================
-- Creates audit logging infrastructure for security monitoring
-- GDPR/CCPA/LGPD compliant with IP anonymization

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT, -- Anonymized (last octet replaced)
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  resource TEXT,
  action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Composite index for security queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_security
ON audit_logs(event_type, severity, created_at DESC)
WHERE event_type LIKE 'security.%';

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
CREATE POLICY "Service role can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (true);

-- Users can only read their own logs
DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_logs;
CREATE POLICY "Users can read own audit logs" ON audit_logs
FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all logs (check users table for role/is_admin)
DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;
CREATE POLICY "Admins can read all audit logs" ON audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.is_admin = true)
  )
);

-- ============================================
-- Blocked IPs table (for persistent blocking)
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ, -- NULL = permanent
  blocked_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);

ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked IPs
DROP POLICY IF EXISTS "Admins can manage blocked IPs" ON blocked_ips;
CREATE POLICY "Admins can manage blocked IPs" ON blocked_ips
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.is_admin = true)
  )
);

-- ============================================
-- Security alerts table
-- ============================================
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged ON security_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);

ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage alerts
DROP POLICY IF EXISTS "Admins can manage security alerts" ON security_alerts;
CREATE POLICY "Admins can manage security alerts" ON security_alerts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.is_admin = true)
  )
);

-- ============================================
-- Auto-cleanup function for old logs
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Keep critical/error logs for 1 year
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year'
  AND severity IN ('critical', 'error');

  -- Keep warning logs for 6 months
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '6 months'
  AND severity = 'warning';

  -- Keep info/debug logs for 90 days
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND severity IN ('info', 'debug');

  -- Remove expired IP blocks
  DELETE FROM blocked_ips
  WHERE blocked_until IS NOT NULL
  AND blocked_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to check if IP is blocked
-- ============================================
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_ips
    WHERE ip_address = check_ip
    AND (blocked_until IS NULL OR blocked_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to auto-block IP after X failed attempts
-- ============================================
CREATE OR REPLACE FUNCTION auto_block_ip_on_failures()
RETURNS TRIGGER AS $$
DECLARE
  failure_count INT;
  block_threshold INT := 10; -- Block after 10 failed attempts
  block_duration INTERVAL := '1 hour';
BEGIN
  -- Only process failed login attempts
  IF NEW.event_type = 'auth.login.failed' AND NEW.ip_address IS NOT NULL THEN
    -- Count recent failures from this IP
    SELECT COUNT(*) INTO failure_count
    FROM audit_logs
    WHERE ip_address = NEW.ip_address
    AND event_type = 'auth.login.failed'
    AND created_at > NOW() - INTERVAL '1 hour';

    -- Auto-block if threshold exceeded
    IF failure_count >= block_threshold THEN
      INSERT INTO blocked_ips (ip_address, reason, blocked_until, metadata)
      VALUES (
        NEW.ip_address,
        'Auto-blocked: Too many failed login attempts',
        NOW() + block_duration,
        jsonb_build_object('failure_count', failure_count)
      )
      ON CONFLICT (ip_address) DO UPDATE
      SET blocked_until = NOW() + block_duration,
          reason = 'Auto-blocked: Too many failed login attempts';

      -- Create security alert
      INSERT INTO security_alerts (alert_type, severity, title, description, metadata)
      VALUES (
        'auto_block',
        'high',
        'IP Auto-Blocked',
        'IP address automatically blocked due to too many failed login attempts',
        jsonb_build_object('ip_address', NEW.ip_address, 'failure_count', failure_count)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_block_ip ON audit_logs;
CREATE TRIGGER trigger_auto_block_ip
AFTER INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION auto_block_ip_on_failures();

-- ============================================
-- Grant permissions
-- ============================================
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON blocked_ips TO authenticated;
GRANT SELECT ON security_alerts TO authenticated;
GRANT INSERT ON audit_logs TO service_role;
GRANT ALL ON blocked_ips TO service_role;
GRANT ALL ON security_alerts TO service_role;
