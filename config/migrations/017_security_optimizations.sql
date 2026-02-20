-- ============================================================================
-- Migration 017: Security Optimizations
-- ============================================================================
-- Performance et détection avancée
-- ============================================================================

-- ============================================================================
-- 1. INDEXES OPTIMISÉS POUR LA SÉCURITÉ
-- ============================================================================

-- Index pour les requêtes de sécurité fréquentes
-- Note: Removed CONCURRENTLY as it cannot run in transaction blocks
CREATE INDEX IF NOT EXISTS idx_security_events_critical
  ON security_events(created_at DESC) WHERE severity IN ('high', 'critical');

-- Index sur les tables principales (si colonnes existent)
DO $$
BEGIN
  -- Index products actifs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'deleted_at') THEN
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(id, name, slug) WHERE deleted_at IS NULL;
  END IF;

  -- Index users actifs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(id, email) WHERE deleted_at IS NULL;
  END IF;

  -- Index audit log récent
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'immutable_audit_log') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_log_table_time ON immutable_audit_log(table_name, event_time DESC);
  END IF;

  -- Index login attempts
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'login_attempts') THEN
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, created_at DESC);
  END IF;
END $$;

-- ============================================================================
-- 2. DÉTECTION D'ANOMALIES AUTOMATIQUE
-- ============================================================================

-- Table pour stocker les patterns normaux
CREATE TABLE IF NOT EXISTS security_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  baseline_value NUMERIC NOT NULL,
  std_deviation NUMERIC DEFAULT 0,
  sample_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction pour détecter les anomalies
CREATE OR REPLACE FUNCTION detect_security_anomaly()
RETURNS TRIGGER AS $$
DECLARE
  baseline RECORD;
  current_rate NUMERIC;
  z_score NUMERIC;
  anomaly_threshold NUMERIC := 3.0; -- 3 sigma
BEGIN
  -- Calculer le taux actuel de l'événement
  SELECT COUNT(*)::NUMERIC INTO current_rate
  FROM security_events
  WHERE event_type = NEW.event_type
    AND created_at > NOW() - INTERVAL '5 minutes';

  -- Obtenir la baseline
  SELECT * INTO baseline
  FROM security_baselines
  WHERE metric_name = 'event_rate_' || NEW.event_type;

  -- Si baseline existe et std_deviation > 0
  IF baseline IS NOT NULL AND baseline.std_deviation > 0 THEN
    z_score := (current_rate - baseline.baseline_value) / baseline.std_deviation;

    -- Si anomalie détectée
    IF z_score > anomaly_threshold THEN
      INSERT INTO security_alerts (alert_type, severity, title, description, details)
      VALUES (
        'ANOMALY_DETECTED',
        'critical',
        'Anomalie détectée: ' || NEW.event_type,
        'Taux anormal d''événements ' || NEW.event_type,
        jsonb_build_object(
          'event_type', NEW.event_type,
          'current_rate', current_rate,
          'baseline', baseline.baseline_value,
          'z_score', z_score,
          'threshold', anomaly_threshold
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS detect_anomaly_on_security_event ON security_events;
CREATE TRIGGER detect_anomaly_on_security_event
  AFTER INSERT ON security_events
  FOR EACH ROW
  WHEN (NEW.severity IN ('high', 'critical'))
  EXECUTE FUNCTION detect_security_anomaly();

-- ============================================================================
-- 3. HONEYPOT DETECTION (Détection de bots/scanners)
-- ============================================================================

CREATE TABLE IF NOT EXISTS honeypot_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  trap_type TEXT NOT NULL, -- 'hidden_field', 'fake_endpoint', 'timing'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_honeypot_ip ON honeypot_triggers(ip_address);
CREATE INDEX IF NOT EXISTS idx_honeypot_recent ON honeypot_triggers(created_at DESC);

-- Fonction pour enregistrer un déclenchement honeypot
CREATE OR REPLACE FUNCTION log_honeypot_trigger(
  p_ip TEXT,
  p_user_agent TEXT,
  p_trap_type TEXT,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  trigger_id UUID;
  trigger_count INTEGER;
BEGIN
  -- Enregistrer le trigger
  INSERT INTO honeypot_triggers (ip_address, user_agent, trap_type, details)
  VALUES (p_ip, p_user_agent, p_trap_type, p_details)
  RETURNING id INTO trigger_id;

  -- Compter les triggers récents de cette IP
  SELECT COUNT(*) INTO trigger_count
  FROM honeypot_triggers
  WHERE ip_address = p_ip
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Si plus de 3 triggers, bloquer l'IP
  IF trigger_count >= 3 THEN
    INSERT INTO ip_blocklist (ip_address, reason, blocked_by)
    VALUES (p_ip, 'Honeypot triggers: ' || trigger_count, 'auto_honeypot')
    ON CONFLICT DO NOTHING;

    -- Créer une alerte
    INSERT INTO security_alerts (alert_type, severity, title, details)
    VALUES (
      'BOT_DETECTED',
      'warning',
      'Bot/Scanner détecté et bloqué',
      jsonb_build_object(
        'ip', p_ip,
        'trigger_count', trigger_count,
        'action', 'IP_BLOCKED'
      )
    );
  END IF;

  -- Log security event
  INSERT INTO security_events (event_type, severity, ip_address, user_agent, details)
  VALUES ('HONEYPOT_TRIGGER', 'medium', p_ip, p_user_agent, p_details);

  RETURN trigger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. RATE LIMITING AMÉLIORÉ
-- ============================================================================

-- Table pour le rate limiting granulaire
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key TEXT NOT NULL, -- 'ip:action' ou 'user:action'
  tokens INTEGER NOT NULL DEFAULT 100,
  last_refill TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_bucket_key ON rate_limit_buckets(bucket_key);

-- Fonction de rate limiting token bucket
CREATE OR REPLACE FUNCTION check_rate_limit_bucket(
  p_key TEXT,
  p_max_tokens INTEGER DEFAULT 100,
  p_refill_rate INTEGER DEFAULT 10, -- tokens par minute
  p_cost INTEGER DEFAULT 1
)
RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, reset_in INTEGER) AS $$
DECLARE
  bucket RECORD;
  elapsed_minutes NUMERIC;
  refilled_tokens INTEGER;
  new_tokens INTEGER;
BEGIN
  -- Obtenir ou créer le bucket
  INSERT INTO rate_limit_buckets (bucket_key, tokens)
  VALUES (p_key, p_max_tokens)
  ON CONFLICT (bucket_key) DO UPDATE SET bucket_key = EXCLUDED.bucket_key
  RETURNING * INTO bucket;

  -- Calculer les tokens à ajouter depuis le dernier refill
  elapsed_minutes := EXTRACT(EPOCH FROM (NOW() - bucket.last_refill)) / 60.0;
  refilled_tokens := FLOOR(elapsed_minutes * p_refill_rate);
  new_tokens := LEAST(bucket.tokens + refilled_tokens, p_max_tokens);

  -- Vérifier si assez de tokens
  IF new_tokens >= p_cost THEN
    -- Consommer les tokens
    UPDATE rate_limit_buckets
    SET tokens = new_tokens - p_cost,
        last_refill = CASE WHEN refilled_tokens > 0 THEN NOW() ELSE last_refill END
    WHERE bucket_key = p_key;

    RETURN QUERY SELECT TRUE, new_tokens - p_cost, 0;
  ELSE
    -- Pas assez de tokens
    UPDATE rate_limit_buckets
    SET tokens = new_tokens,
        last_refill = CASE WHEN refilled_tokens > 0 THEN NOW() ELSE last_refill END
    WHERE bucket_key = p_key;

    RETURN QUERY SELECT FALSE, new_tokens, CEIL((p_cost - new_tokens)::NUMERIC / p_refill_rate * 60)::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FONCTION DE NETTOYAGE OPTIMISÉE
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_security_tables()
RETURNS TABLE (
  table_name TEXT,
  rows_deleted BIGINT
) AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  -- Nettoyer rate_limit_buckets (inactifs depuis 24h)
  DELETE FROM rate_limit_buckets WHERE last_refill < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'rate_limit_buckets'; rows_deleted := deleted_count;
  RETURN NEXT;

  -- Nettoyer modification_rate_limits
  DELETE FROM modification_rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'modification_rate_limits'; rows_deleted := deleted_count;
  RETURN NEXT;

  -- Nettoyer honeypot_triggers (garder 30 jours)
  DELETE FROM honeypot_triggers WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'honeypot_triggers'; rows_deleted := deleted_count;
  RETURN NEXT;

  -- Nettoyer login_attempts (garder 90 jours)
  DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'login_attempts'; rows_deleted := deleted_count;
  RETURN NEXT;

  -- Nettoyer security_events non-critiques (garder 1 an)
  DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '1 year' AND severity != 'critical';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'security_events'; rows_deleted := deleted_count;
  RETURN NEXT;

  -- Nettoyer integrity_checkpoints (garder les 100 derniers par table)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY table_name ORDER BY checked_at DESC) as rn
    FROM integrity_checkpoints
  )
  DELETE FROM integrity_checkpoints WHERE id IN (SELECT id FROM ranked WHERE rn > 100);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'integrity_checkpoints'; rows_deleted := deleted_count;
  RETURN NEXT;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. VUES OPTIMISÉES POUR LE MONITORING
-- ============================================================================

-- Vue des menaces actives
CREATE OR REPLACE VIEW active_threats AS
SELECT
  'blocked_ip' as threat_type,
  ip_address as identifier,
  reason as description,
  created_at,
  blocked_until
FROM ip_blocklist
WHERE unblocked_at IS NULL
  AND (blocked_until IS NULL OR blocked_until > NOW())
UNION ALL
SELECT
  'locked_account' as threat_type,
  email as identifier,
  reason as description,
  created_at,
  locked_until as blocked_until
FROM account_lockouts
WHERE unlocked_at IS NULL
  AND locked_until > NOW();

-- Vue des statistiques de sécurité 24h
CREATE OR REPLACE VIEW security_stats_24h AS
SELECT
  (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours') as total_events,
  (SELECT COUNT(*) FROM security_events WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '24 hours') as critical_events,
  (SELECT COUNT(*) FROM security_events WHERE severity = 'high' AND created_at > NOW() - INTERVAL '24 hours') as high_events,
  (SELECT COUNT(*) FROM login_attempts WHERE created_at > NOW() - INTERVAL '24 hours' AND success = FALSE) as failed_logins,
  (SELECT COUNT(*) FROM honeypot_triggers WHERE created_at > NOW() - INTERVAL '24 hours') as honeypot_triggers,
  (SELECT COUNT(*) FROM ip_blocklist WHERE created_at > NOW() - INTERVAL '24 hours') as new_blocked_ips,
  (SELECT COUNT(*) FROM security_alerts WHERE created_at > NOW() - INTERVAL '24 hours' AND acknowledged_at IS NULL) as unack_alerts;

-- ============================================================================
-- 7. FONCTION DE RAPPORT DE SÉCURITÉ
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_security_report(report_period INTERVAL DEFAULT '24 hours')
RETURNS JSONB AS $$
DECLARE
  report JSONB;
BEGIN
  SELECT jsonb_build_object(
    'generated_at', NOW(),
    'period', report_period::TEXT,
    'summary', jsonb_build_object(
      'total_events', (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - report_period),
      'critical_events', (SELECT COUNT(*) FROM security_events WHERE severity = 'critical' AND created_at > NOW() - report_period),
      'blocked_ips', (SELECT COUNT(*) FROM ip_blocklist WHERE created_at > NOW() - report_period),
      'locked_accounts', (SELECT COUNT(*) FROM account_lockouts WHERE created_at > NOW() - report_period)
    ),
    'top_event_types', (
      SELECT jsonb_agg(jsonb_build_object('type', event_type, 'count', cnt))
      FROM (
        SELECT event_type, COUNT(*) as cnt
        FROM security_events
        WHERE created_at > NOW() - report_period
        GROUP BY event_type
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ),
    'top_ips', (
      SELECT jsonb_agg(jsonb_build_object('ip', ip_address, 'events', cnt))
      FROM (
        SELECT ip_address, COUNT(*) as cnt
        FROM security_events
        WHERE created_at > NOW() - report_period AND ip_address IS NOT NULL
        GROUP BY ip_address
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ),
    'integrity_status', (
      SELECT jsonb_agg(jsonb_build_object('table', table_name, 'status', status, 'count', current_count))
      FROM (
        SELECT * FROM verify_integrity('products')
        UNION ALL
        SELECT * FROM verify_integrity('users')
      ) t
    )
  ) INTO report;

  RETURN report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGER POUR AUTO-BLOCK SUR PATTERNS SUSPECTS
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_block_suspicious_activity()
RETURNS TRIGGER AS $$
DECLARE
  recent_critical_count INTEGER;
  recent_failed_logins INTEGER;
BEGIN
  -- Vérifier les événements critiques récents de cette IP
  IF NEW.ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO recent_critical_count
    FROM security_events
    WHERE ip_address = NEW.ip_address
      AND severity = 'critical'
      AND created_at > NOW() - INTERVAL '10 minutes';

    -- Si plus de 5 événements critiques en 10 min, bloquer
    IF recent_critical_count >= 5 THEN
      INSERT INTO ip_blocklist (ip_address, reason, blocked_by, blocked_until)
      VALUES (
        NEW.ip_address,
        'Auto-blocked: ' || recent_critical_count || ' critical events in 10 minutes',
        'auto_security',
        NOW() + INTERVAL '1 hour'
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO security_alerts (alert_type, severity, title, details)
      VALUES (
        'AUTO_BLOCK',
        'critical',
        'IP auto-bloquée pour activité suspecte',
        jsonb_build_object(
          'ip', NEW.ip_address,
          'critical_events', recent_critical_count,
          'block_duration', '1 hour'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_block_on_critical_event ON security_events;
CREATE TRIGGER auto_block_on_critical_event
  AFTER INSERT ON security_events
  FOR EACH ROW
  WHEN (NEW.severity = 'critical' AND NEW.ip_address IS NOT NULL)
  EXECUTE FUNCTION auto_block_suspicious_activity();

-- ============================================================================
-- 9. INITIALISER LES BASELINES DE SÉCURITÉ
-- ============================================================================

INSERT INTO security_baselines (metric_name, baseline_value, std_deviation, sample_count)
VALUES
  ('event_rate_SOFT_DELETE', 5, 2, 100),
  ('event_rate_RATE_LIMIT_EXCEEDED', 10, 5, 100),
  ('event_rate_RESURRECTION_ATTEMPT', 0, 0.5, 100),
  ('event_rate_MASS_OPERATION_ALERT', 1, 1, 100),
  ('event_rate_HONEYPOT_TRIGGER', 2, 2, 100)
ON CONFLICT (metric_name) DO NOTHING;

-- ============================================================================
-- RÉSUMÉ DES OPTIMISATIONS
-- ============================================================================
-- ✅ Indexes optimisés pour les requêtes fréquentes
-- ✅ Détection d'anomalies automatique (Z-score)
-- ✅ Honeypot detection avec auto-block
-- ✅ Rate limiting token bucket
-- ✅ Nettoyage automatique optimisé
-- ✅ Vues de monitoring (active_threats, security_stats_24h)
-- ✅ Rapport de sécurité automatique
-- ✅ Auto-block sur activité critique
-- ============================================================================
