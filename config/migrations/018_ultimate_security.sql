-- ============================================================================
-- Migration 018: Ultimate Security Tables
-- ============================================================================
-- Protection maximale contre les hackers les plus experts du monde
-- ============================================================================

-- ============================================================================
-- 1. ADMIN 2FA SECRETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_totp_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL, -- Encrypted TOTP secret
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  backup_codes JSONB DEFAULT '[]', -- Encrypted backup codes
  UNIQUE(user_id)
);

-- RLS: Only user can see their own secret
ALTER TABLE admin_totp_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own 2FA" ON admin_totp_secrets;
CREATE POLICY "Users can manage own 2FA" ON admin_totp_secrets
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 2. ADMIN ACTION AUDIT LOG (Immutable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  fingerprint TEXT,
  verification_id TEXT,
  verified_2fa BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make audit log append-only
ALTER TABLE admin_action_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit log insert only" ON admin_action_audit;
CREATE POLICY "Audit log insert only" ON admin_action_audit
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Audit log read for service" ON admin_action_audit;
CREATE POLICY "Audit log read for service" ON admin_action_audit
  FOR SELECT USING (true);

-- Block updates and deletes
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Admin audit log is immutable - modifications not allowed';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_audit_updates ON admin_action_audit;
CREATE TRIGGER block_audit_updates
  BEFORE UPDATE OR DELETE ON admin_action_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_action_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_action_audit(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_time ON admin_action_audit(created_at DESC);

-- ============================================================================
-- 3. SECURITY INCIDENT REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  title TEXT NOT NULL,
  description TEXT,

  -- Attack details
  attacker_ip INET,
  attacker_fingerprint TEXT,
  attack_vector TEXT,
  affected_resources JSONB DEFAULT '[]',

  -- Timeline
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Evidence
  evidence JSONB DEFAULT '{}',
  related_events UUID[] DEFAULT '{}',

  -- Notes
  investigation_notes TEXT,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_time ON security_incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_ip ON security_incidents(attacker_ip);

-- ============================================================================
-- 4. THREAT INTELLIGENCE CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET UNIQUE NOT NULL,
  is_malicious BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  categories TEXT[] DEFAULT '{}',
  sources TEXT[] DEFAULT '{}',
  asn TEXT,
  country TEXT,
  isp TEXT,

  -- Data sources
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  data_sources JSONB DEFAULT '{}',

  -- Auto-expire
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threat_intel_ip ON threat_intelligence(ip_address);
CREATE INDEX IF NOT EXISTS idx_threat_intel_malicious ON threat_intelligence(is_malicious) WHERE is_malicious = TRUE;
CREATE INDEX IF NOT EXISTS idx_threat_intel_expires ON threat_intelligence(expires_at);

-- ============================================================================
-- 5. CANARY TOKEN TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS canary_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  token_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Trigger info
  triggered BOOLEAN DEFAULT FALSE,
  trigger_count INTEGER DEFAULT 0,
  first_triggered_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  trigger_details JSONB DEFAULT '[]',

  -- Owner
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_canary_token ON canary_tokens(token);
CREATE INDEX IF NOT EXISTS idx_canary_triggered ON canary_tokens(triggered) WHERE triggered = TRUE;

-- Function to record canary trigger
CREATE OR REPLACE FUNCTION trigger_canary_token(
  p_token TEXT,
  p_ip INET,
  p_details JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  canary RECORD;
  trigger_info JSONB;
BEGIN
  -- Find the canary
  SELECT * INTO canary FROM canary_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Build trigger info
  trigger_info := jsonb_build_object(
    'ip', p_ip::TEXT,
    'timestamp', NOW(),
    'details', p_details
  );

  -- Update canary
  UPDATE canary_tokens
  SET
    triggered = TRUE,
    trigger_count = trigger_count + 1,
    first_triggered_at = COALESCE(first_triggered_at, NOW()),
    last_triggered_at = NOW(),
    trigger_details = trigger_details || trigger_info
  WHERE token = p_token;

  -- Create security incident
  INSERT INTO security_incidents (
    incident_type, severity, title, description,
    attacker_ip, attack_vector, evidence
  ) VALUES (
    'CANARY_TRIGGERED',
    'critical',
    'Canary Token Triggered - Potential Data Breach',
    format('Canary token of type %s was accessed. This indicates potential unauthorized access to sensitive data.', canary.token_type),
    p_ip,
    'data_exfiltration',
    jsonb_build_object(
      'token_type', canary.token_type,
      'token_id', canary.id,
      'trigger_details', trigger_info
    )
  );

  -- Log security event
  INSERT INTO security_events (event_type, severity, ip_address, details)
  VALUES (
    'CANARY_TOKEN_TRIGGERED',
    'critical',
    p_ip::TEXT,
    jsonb_build_object(
      'token_type', canary.token_type,
      'trigger_count', canary.trigger_count + 1
    )
  );

  RETURN jsonb_build_object(
    'found', true,
    'token_type', canary.token_type,
    'trigger_count', canary.trigger_count + 1,
    'is_breach', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. SESSION BINDINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Binding verification
  binding_key TEXT NOT NULL,

  -- Activity
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ DEFAULT NOW(),
  validation_count INTEGER DEFAULT 0,

  -- Anomalies detected
  anomalies JSONB DEFAULT '[]',
  suspicious BOOLEAN DEFAULT FALSE,

  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_session_binding_session ON session_bindings(session_id);
CREATE INDEX IF NOT EXISTS idx_session_binding_user ON session_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_session_binding_fingerprint ON session_bindings(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_session_binding_expires ON session_bindings(expires_at);

-- Function to validate session binding
CREATE OR REPLACE FUNCTION validate_session_binding(
  p_session_id TEXT,
  p_fingerprint TEXT,
  p_ip INET
)
RETURNS JSONB AS $$
DECLARE
  binding RECORD;
  result JSONB;
  anomalies JSONB := '[]'::JSONB;
BEGIN
  -- Find session
  SELECT * INTO binding FROM session_bindings WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'SESSION_NOT_FOUND');
  END IF;

  IF binding.expires_at < NOW() THEN
    DELETE FROM session_bindings WHERE session_id = p_session_id;
    RETURN jsonb_build_object('valid', false, 'reason', 'SESSION_EXPIRED');
  END IF;

  -- Check fingerprint
  IF binding.device_fingerprint != p_fingerprint THEN
    anomalies := anomalies || jsonb_build_object(
      'type', 'FINGERPRINT_MISMATCH',
      'timestamp', NOW(),
      'original', LEFT(binding.device_fingerprint, 8),
      'current', LEFT(p_fingerprint, 8)
    );
  END IF;

  -- Check IP
  IF binding.ip_address != p_ip THEN
    anomalies := anomalies || jsonb_build_object(
      'type', 'IP_CHANGED',
      'timestamp', NOW(),
      'original', binding.ip_address::TEXT,
      'current', p_ip::TEXT
    );
  END IF;

  -- Update binding
  UPDATE session_bindings
  SET
    last_validated_at = NOW(),
    validation_count = validation_count + 1,
    anomalies = binding.anomalies || anomalies,
    suspicious = jsonb_array_length(binding.anomalies || anomalies) > 0
  WHERE session_id = p_session_id;

  -- Check if suspicious
  IF jsonb_array_length(anomalies) > 0 THEN
    -- Log security event
    INSERT INTO security_events (event_type, severity, user_id, ip_address, details)
    VALUES (
      'SESSION_ANOMALY',
      CASE WHEN jsonb_array_length(anomalies) > 1 THEN 'high' ELSE 'medium' END,
      binding.user_id,
      p_ip::TEXT,
      jsonb_build_object('anomalies', anomalies, 'session_id', LEFT(p_session_id, 16))
    );

    RETURN jsonb_build_object(
      'valid', true,
      'suspicious', true,
      'anomalies', anomalies,
      'requiresReauth', jsonb_array_length(anomalies) > 1
    );
  END IF;

  RETURN jsonb_build_object('valid', true, 'suspicious', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. REAL-TIME THREAT SCORING
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_threat_score(
  p_ip TEXT,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  score INTEGER := 0;
  factors JSONB := '[]'::JSONB;

  blocked_ip RECORD;
  threat_intel RECORD;
  recent_events INTEGER;
  honeypot_hits INTEGER;
  failed_logins INTEGER;
BEGIN
  -- 1. Check IP blocklist
  SELECT * INTO blocked_ip FROM ip_blocklist
  WHERE ip_address = p_ip AND unblocked_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'score', 100,
      'blocked', true,
      'reason', blocked_ip.reason
    );
  END IF;

  -- 2. Check threat intelligence
  SELECT * INTO threat_intel FROM threat_intelligence
  WHERE ip_address = p_ip::INET AND expires_at > NOW()
  LIMIT 1;

  IF FOUND AND threat_intel.is_malicious THEN
    score := score + threat_intel.risk_score;
    factors := factors || jsonb_build_object('type', 'THREAT_INTEL', 'score', threat_intel.risk_score);
  END IF;

  -- 3. Count recent security events
  SELECT COUNT(*) INTO recent_events FROM security_events
  WHERE ip_address = p_ip AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_events > 50 THEN
    score := score + 40;
    factors := factors || jsonb_build_object('type', 'HIGH_EVENT_COUNT', 'count', recent_events);
  ELSIF recent_events > 20 THEN
    score := score + 20;
    factors := factors || jsonb_build_object('type', 'ELEVATED_EVENT_COUNT', 'count', recent_events);
  END IF;

  -- 4. Check honeypot triggers
  SELECT COUNT(*) INTO honeypot_hits FROM honeypot_triggers
  WHERE ip_address = p_ip AND created_at > NOW() - INTERVAL '24 hours';

  IF honeypot_hits > 0 THEN
    score := score + 50;
    factors := factors || jsonb_build_object('type', 'HONEYPOT_HISTORY', 'hits', honeypot_hits);
  END IF;

  -- 5. Check failed logins
  SELECT COUNT(*) INTO failed_logins FROM login_attempts
  WHERE ip_address = p_ip AND success = FALSE AND created_at > NOW() - INTERVAL '1 hour';

  IF failed_logins > 10 THEN
    score := score + 30;
    factors := factors || jsonb_build_object('type', 'BRUTE_FORCE_INDICATOR', 'failures', failed_logins);
  ELSIF failed_logins > 5 THEN
    score := score + 15;
    factors := factors || jsonb_build_object('type', 'MULTIPLE_FAILURES', 'failures', failed_logins);
  END IF;

  -- Cap score at 100
  score := LEAST(score, 100);

  RETURN jsonb_build_object(
    'score', score,
    'blocked', false,
    'risk_level', CASE
      WHEN score >= 70 THEN 'critical'
      WHEN score >= 50 THEN 'high'
      WHEN score >= 25 THEN 'medium'
      ELSE 'low'
    END,
    'factors', factors,
    'recommendation', CASE
      WHEN score >= 70 THEN 'BLOCK'
      WHEN score >= 50 THEN 'CHALLENGE'
      WHEN score >= 25 THEN 'MONITOR'
      ELSE 'ALLOW'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. AUTOMATIC INCIDENT CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_incident()
RETURNS TRIGGER AS $$
BEGIN
  -- Create incident for critical events
  IF NEW.severity = 'critical' THEN
    INSERT INTO security_incidents (
      incident_type, severity, title, description,
      attacker_ip, evidence, related_events
    ) VALUES (
      NEW.event_type,
      'critical',
      format('Critical Security Event: %s', NEW.event_type),
      format('Automatic incident created for critical event from IP %s', NEW.ip_address),
      NEW.ip_address::INET,
      jsonb_build_object('event', row_to_json(NEW)),
      ARRAY[NEW.id]
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_incident_on_critical ON security_events;
CREATE TRIGGER auto_incident_on_critical
  AFTER INSERT ON security_events
  FOR EACH ROW
  WHEN (NEW.severity = 'critical')
  EXECUTE FUNCTION auto_create_incident();

-- ============================================================================
-- 9. CLEANUP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_ultimate_security_tables()
RETURNS TABLE (
  table_name TEXT,
  rows_deleted BIGINT
) AS $$
DECLARE
  deleted BIGINT;
BEGIN
  -- Clean expired threat intelligence
  DELETE FROM threat_intelligence WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'threat_intelligence'; rows_deleted := deleted;
  RETURN NEXT;

  -- Clean expired session bindings
  DELETE FROM session_bindings WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'session_bindings'; rows_deleted := deleted;
  RETURN NEXT;

  -- Clean old admin verifications (keep 30 days)
  -- Note: admin_action_audit is immutable, so we don't delete from it

  -- Clean resolved incidents older than 1 year
  DELETE FROM security_incidents
  WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'security_incidents'; rows_deleted := deleted;
  RETURN NEXT;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. SECURITY DASHBOARD VIEW
-- ============================================================================

CREATE OR REPLACE VIEW ultimate_security_dashboard AS
SELECT
  -- Current threats
  (SELECT COUNT(*) FROM security_incidents WHERE status = 'open') as open_incidents,
  (SELECT COUNT(*) FROM security_incidents WHERE status = 'open' AND severity = 'critical') as critical_incidents,

  -- Last 24 hours
  (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h,
  (SELECT COUNT(*) FROM security_events WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours') as critical_events_24h,
  (SELECT COUNT(*) FROM ip_blocklist WHERE created_at > NOW() - INTERVAL '24 hours') as new_blocks_24h,
  (SELECT COUNT(*) FROM honeypot_triggers WHERE created_at > NOW() - INTERVAL '24 hours') as honeypot_24h,
  (SELECT COUNT(*) FROM canary_tokens WHERE triggered = TRUE AND last_triggered_at > NOW() - INTERVAL '24 hours') as canary_triggers_24h,

  -- Session health
  (SELECT COUNT(*) FROM session_bindings WHERE suspicious = TRUE) as suspicious_sessions,
  (SELECT COUNT(*) FROM session_bindings WHERE expires_at > NOW()) as active_sessions,

  -- Threat intel
  (SELECT COUNT(*) FROM threat_intelligence WHERE is_malicious = TRUE AND expires_at > NOW()) as known_malicious_ips,

  -- 2FA status
  (SELECT COUNT(*) FROM admin_totp_secrets WHERE enabled = TRUE) as users_with_2fa,

  NOW() as generated_at;

-- ============================================================================
-- RÉSUMÉ DES PROTECTIONS ULTIMES
-- ============================================================================
-- 2FA Admin avec TOTP
-- Audit log admin immutable
-- Suivi des incidents de sécurité
-- Cache threat intelligence
-- Canary tokens avec alertes automatiques
-- Session bindings avec détection d'anomalies
-- Calcul de score de menace en temps réel
-- Création automatique d'incidents
-- Dashboard de sécurité complet
-- ============================================================================
