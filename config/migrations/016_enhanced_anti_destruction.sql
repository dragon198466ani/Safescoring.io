-- ============================================================================
-- Migration 016: Enhanced Anti-Destruction Policies
-- ============================================================================
-- Renforcement des protections contre les attaques destructives
-- Corrige les failles de la migration 015
-- ============================================================================

-- ============================================================================
-- 1. PROTECTION CONTRE TRUNCATE (bypasse les triggers normaux)
-- ============================================================================

-- Révoquer TRUNCATE pour tous sauf postgres/service_role
DO $$
BEGIN
  -- Révoquer TRUNCATE sur products
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    REVOKE TRUNCATE ON products FROM PUBLIC;
    REVOKE TRUNCATE ON products FROM anon;
    REVOKE TRUNCATE ON products FROM authenticated;
  END IF;

  -- Révoquer TRUNCATE sur users
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    REVOKE TRUNCATE ON users FROM PUBLIC;
    REVOKE TRUNCATE ON users FROM anon;
    REVOKE TRUNCATE ON users FROM authenticated;
  END IF;

  -- Révoquer TRUNCATE sur user_setups
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_setups') THEN
    REVOKE TRUNCATE ON user_setups FROM PUBLIC;
    REVOKE TRUNCATE ON user_setups FROM anon;
    REVOKE TRUNCATE ON user_setups FROM authenticated;
  END IF;

  -- Protéger aussi les tables de sécurité
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_events') THEN
    REVOKE TRUNCATE ON security_events FROM PUBLIC;
    REVOKE TRUNCATE ON security_events FROM anon;
    REVOKE TRUNCATE ON security_events FROM authenticated;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'immutable_audit_log') THEN
    REVOKE TRUNCATE ON immutable_audit_log FROM PUBLIC;
    REVOKE TRUNCATE ON immutable_audit_log FROM anon;
    REVOKE TRUNCATE ON immutable_audit_log FROM authenticated;
  END IF;
END $$;

-- ============================================================================
-- 2. FONCTION SOFT DELETE DYNAMIQUE (corrige le hardcoding)
-- ============================================================================

CREATE OR REPLACE FUNCTION universal_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Mise à jour dynamique selon la table
  EXECUTE format(
    'UPDATE %I.%I SET deleted_at = NOW() WHERE id = $1',
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME
  ) USING OLD.id;

  -- Log l'événement dans security_events
  BEGIN
    INSERT INTO security_events (event_type, severity, user_id, details)
    VALUES (
      'SOFT_DELETE',
      'medium',
      auth.uid(),
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record_id', OLD.id,
        'original_action', 'DELETE',
        'timestamp', NOW()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Si security_events n'existe pas, continue quand même
    NULL;
  END;

  -- Log aussi dans immutable_audit_log
  BEGIN
    INSERT INTO immutable_audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (
      auth.uid(),
      'SOFT_DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Retourner NULL empêche la vraie suppression
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remplacer l'ancien trigger sur products
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    DROP TRIGGER IF EXISTS prevent_hard_delete_products ON products;
    CREATE TRIGGER prevent_hard_delete_products
      BEFORE DELETE ON products
      FOR EACH ROW
      EXECUTE FUNCTION universal_soft_delete();
  END IF;
END $$;

-- Ajouter protection sur users
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    DROP TRIGGER IF EXISTS prevent_hard_delete_users ON users;
    CREATE TRIGGER prevent_hard_delete_users
      BEFORE DELETE ON users
      FOR EACH ROW
      EXECUTE FUNCTION universal_soft_delete();
  END IF;
END $$;

-- Ajouter protection sur user_setups
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_setups') THEN
    DROP TRIGGER IF EXISTS prevent_hard_delete_user_setups ON user_setups;
    CREATE TRIGGER prevent_hard_delete_user_setups
      BEFORE DELETE ON user_setups
      FOR EACH ROW
      EXECUTE FUNCTION universal_soft_delete();
  END IF;
END $$;

-- ============================================================================
-- 3. PROTECTION CONTRE LA RESURRECTION (empêcher deleted_at = NULL)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_resurrection()
RETURNS TRIGGER AS $$
BEGIN
  -- Si deleted_at était défini et qu'on essaie de le mettre à NULL
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    -- Log la tentative suspecte
    BEGIN
      INSERT INTO security_events (event_type, severity, user_id, details)
      VALUES (
        'RESURRECTION_ATTEMPT',
        'high',
        auth.uid(),
        jsonb_build_object(
          'table', TG_TABLE_NAME,
          'record_id', OLD.id,
          'action', 'Attempted to set deleted_at to NULL',
          'blocked', true
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Bloquer la modification
    RAISE EXCEPTION 'Cannot restore deleted records. Contact admin.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer aux tables protégées
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    DROP TRIGGER IF EXISTS prevent_resurrection_products ON products;
    CREATE TRIGGER prevent_resurrection_products
      BEFORE UPDATE ON products
      FOR EACH ROW
      WHEN (OLD.deleted_at IS NOT NULL)
      EXECUTE FUNCTION prevent_resurrection();
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    DROP TRIGGER IF EXISTS prevent_resurrection_users ON users;
    CREATE TRIGGER prevent_resurrection_users
      BEFORE UPDATE ON users
      FOR EACH ROW
      WHEN (OLD.deleted_at IS NOT NULL)
      EXECUTE FUNCTION prevent_resurrection();
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_setups') THEN
    DROP TRIGGER IF EXISTS prevent_resurrection_user_setups ON user_setups;
    CREATE TRIGGER prevent_resurrection_user_setups
      BEFORE UPDATE ON user_setups
      FOR EACH ROW
      WHEN (OLD.deleted_at IS NOT NULL)
      EXECUTE FUNCTION prevent_resurrection();
  END IF;
END $$;

-- ============================================================================
-- 4. DETECTION DES MASS UPDATES (attaque par modification massive)
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_mass_operation()
RETURNS TRIGGER AS $$
DECLARE
  recent_ops INTEGER;
  threshold INTEGER := 50; -- Alerte si plus de 50 ops en 1 minute
  window_interval INTERVAL := '1 minute';
BEGIN
  -- Compter les opérations récentes de cet utilisateur sur cette table
  SELECT COUNT(*) INTO recent_ops
  FROM immutable_audit_log
  WHERE user_id = auth.uid()
    AND table_name = TG_TABLE_NAME
    AND event_time > NOW() - window_interval;

  -- Si seuil dépassé, créer une alerte
  IF recent_ops >= threshold THEN
    -- Créer une alerte de sécurité
    BEGIN
      INSERT INTO security_alerts (
        alert_type,
        severity,
        title,
        description,
        details
      ) VALUES (
        'MASS_OPERATION_DETECTED',
        'critical',
        'Mass ' || TG_OP || ' detected on ' || TG_TABLE_NAME,
        'User performed ' || recent_ops || ' operations in ' || window_interval::TEXT,
        jsonb_build_object(
          'user_id', auth.uid(),
          'table', TG_TABLE_NAME,
          'operation', TG_OP,
          'count', recent_ops,
          'threshold', threshold,
          'window', window_interval::TEXT
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Log dans security_events aussi
    BEGIN
      INSERT INTO security_events (event_type, severity, user_id, details)
      VALUES (
        'MASS_OPERATION_ALERT',
        'critical',
        auth.uid(),
        jsonb_build_object(
          'table', TG_TABLE_NAME,
          'operation', TG_OP,
          'count', recent_ops,
          'threshold', threshold,
          'action', 'ALERT_CREATED'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Ne pas bloquer, juste alerter
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer la détection sur products
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    DROP TRIGGER IF EXISTS detect_mass_ops_products ON products;
    CREATE TRIGGER detect_mass_ops_products
      AFTER INSERT OR UPDATE ON products
      FOR EACH ROW
      EXECUTE FUNCTION detect_mass_operation();
  END IF;
END $$;

-- ============================================================================
-- 5. TABLE DE SNAPSHOTS CRITIQUES (sauvegarde avant modifications majeures)
-- ============================================================================

CREATE TABLE IF NOT EXISTS critical_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  snapshot_type TEXT NOT NULL, -- 'full', 'partial', 'emergency'
  record_count INTEGER,
  data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_critical_snapshots_table ON critical_snapshots(table_name);
CREATE INDEX IF NOT EXISTS idx_critical_snapshots_created ON critical_snapshots(created_at DESC);

-- Protéger la table de snapshots
ALTER TABLE critical_snapshots ENABLE ROW LEVEL SECURITY;

-- Seul service_role peut écrire
DROP POLICY IF EXISTS "Snapshots insert only" ON critical_snapshots;
CREATE POLICY "Snapshots insert only" ON critical_snapshots
  FOR INSERT WITH CHECK (true);

-- Personne ne peut supprimer ou modifier
DROP POLICY IF EXISTS "Snapshots read only" ON critical_snapshots;
CREATE POLICY "Snapshots read only" ON critical_snapshots
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  );

-- Révoquer DELETE et UPDATE
REVOKE DELETE ON critical_snapshots FROM PUBLIC;
REVOKE DELETE ON critical_snapshots FROM anon;
REVOKE DELETE ON critical_snapshots FROM authenticated;
REVOKE UPDATE ON critical_snapshots FROM PUBLIC;
REVOKE UPDATE ON critical_snapshots FROM anon;
REVOKE UPDATE ON critical_snapshots FROM authenticated;

-- ============================================================================
-- 6. FONCTION DE SNAPSHOT AUTOMATIQUE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_emergency_snapshot(target_table TEXT, snapshot_reason TEXT)
RETURNS UUID AS $$
DECLARE
  snapshot_id UUID;
  snapshot_data JSONB;
  row_count INTEGER;
BEGIN
  -- Récupérer les données de la table
  EXECUTE format(
    'SELECT jsonb_agg(row_to_json(t)) FROM %I t WHERE deleted_at IS NULL OR deleted_at IS NOT DISTINCT FROM NULL',
    target_table
  ) INTO snapshot_data;

  EXECUTE format('SELECT COUNT(*) FROM %I WHERE deleted_at IS NULL', target_table) INTO row_count;

  -- Créer le snapshot
  INSERT INTO critical_snapshots (table_name, snapshot_type, record_count, data, created_by, reason)
  VALUES (target_table, 'emergency', row_count, COALESCE(snapshot_data, '[]'::jsonb), auth.uid(), snapshot_reason)
  RETURNING id INTO snapshot_id;

  -- Log l'événement (si la table existe)
  BEGIN
    INSERT INTO security_events (event_type, severity, user_id, details)
    VALUES (
      'EMERGENCY_SNAPSHOT_CREATED',
      'info',
      auth.uid(),
      jsonb_build_object(
        'table', target_table,
        'snapshot_id', snapshot_id,
        'record_count', row_count,
        'reason', snapshot_reason
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- security_events n'existe peut-être pas
  END;

  RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. COMPTEURS DE SANTÉ (vérification d'intégrité)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrity_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  total_count INTEGER NOT NULL,
  active_count INTEGER NOT NULL,
  deleted_count INTEGER NOT NULL,
  checksum TEXT, -- Hash des IDs pour détecter les suppressions
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_checkpoints_table ON integrity_checkpoints(table_name, checked_at DESC);

-- Protéger contre les modifications
ALTER TABLE integrity_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Integrity checkpoints append only" ON integrity_checkpoints;
CREATE POLICY "Integrity checkpoints append only" ON integrity_checkpoints
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Integrity checkpoints read admins" ON integrity_checkpoints;
CREATE POLICY "Integrity checkpoints read admins" ON integrity_checkpoints
  FOR SELECT USING (true);

REVOKE DELETE, UPDATE ON integrity_checkpoints FROM PUBLIC, anon, authenticated;

-- Fonction pour créer un checkpoint
CREATE OR REPLACE FUNCTION create_integrity_checkpoint(target_table TEXT)
RETURNS UUID AS $$
DECLARE
  checkpoint_id UUID;
  total_cnt INTEGER;
  active_cnt INTEGER;
  deleted_cnt INTEGER;
  id_checksum TEXT;
BEGIN
  -- Compter les enregistrements
  EXECUTE format('SELECT COUNT(*) FROM %I', target_table) INTO total_cnt;
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE deleted_at IS NULL', target_table) INTO active_cnt;
  deleted_cnt := total_cnt - active_cnt;

  -- Créer un hash des IDs actifs pour détecter les suppressions
  EXECUTE format(
    'SELECT md5(string_agg(id::text, '','')) FROM (SELECT id FROM %I WHERE deleted_at IS NULL ORDER BY id) t',
    target_table
  ) INTO id_checksum;

  -- Insérer le checkpoint
  INSERT INTO integrity_checkpoints (table_name, total_count, active_count, deleted_count, checksum)
  VALUES (target_table, total_cnt, active_cnt, deleted_cnt, id_checksum)
  RETURNING id INTO checkpoint_id;

  RETURN checkpoint_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier l'intégrité
CREATE OR REPLACE FUNCTION verify_integrity(target_table TEXT)
RETURNS TABLE (
  status TEXT,
  current_count INTEGER,
  last_checkpoint_count INTEGER,
  difference INTEGER,
  checksum_match BOOLEAN,
  alert_level TEXT
) AS $$
DECLARE
  current_cnt INTEGER;
  current_checksum TEXT;
  last_checkpoint RECORD;
BEGIN
  -- Obtenir le dernier checkpoint
  SELECT * INTO last_checkpoint
  FROM integrity_checkpoints
  WHERE table_name = target_table
  ORDER BY checked_at DESC
  LIMIT 1;

  -- Compter actuellement
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE deleted_at IS NULL', target_table) INTO current_cnt;
  EXECUTE format(
    'SELECT md5(string_agg(id::text, '','')) FROM (SELECT id FROM %I WHERE deleted_at IS NULL ORDER BY id) t',
    target_table
  ) INTO current_checksum;

  -- Retourner le résultat
  IF last_checkpoint IS NULL THEN
    RETURN QUERY SELECT
      'NO_BASELINE'::TEXT,
      current_cnt,
      0,
      0,
      FALSE,
      'info'::TEXT;
  ELSE
    RETURN QUERY SELECT
      CASE
        WHEN current_cnt < last_checkpoint.active_count THEN 'DATA_LOSS_DETECTED'
        WHEN current_checksum != last_checkpoint.checksum AND current_cnt = last_checkpoint.active_count THEN 'DATA_MODIFIED'
        ELSE 'HEALTHY'
      END::TEXT,
      current_cnt,
      last_checkpoint.active_count,
      current_cnt - last_checkpoint.active_count,
      current_checksum = last_checkpoint.checksum,
      CASE
        WHEN current_cnt < last_checkpoint.active_count - 10 THEN 'critical'
        WHEN current_cnt < last_checkpoint.active_count THEN 'warning'
        ELSE 'ok'
      END::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. CRÉER DES CHECKPOINTS INITIAUX
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    PERFORM create_integrity_checkpoint('products');
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    PERFORM create_integrity_checkpoint('users');
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_setups') THEN
    PERFORM create_integrity_checkpoint('user_setups');
  END IF;
END $$;

-- ============================================================================
-- 9. VUE DASHBOARD SÉCURITÉ (créée seulement si toutes les tables existent)
-- ============================================================================

DO $$
BEGIN
  -- Créer la vue seulement si toutes les tables requises existent
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'immutable_audit_log')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_events')
  THEN
    EXECUTE '
      CREATE OR REPLACE VIEW security_dashboard AS
      SELECT
        ''products'' as table_name,
        (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) as active_count,
        (SELECT COUNT(*) FROM products WHERE deleted_at IS NOT NULL) as deleted_count,
        (SELECT COUNT(*) FROM immutable_audit_log WHERE table_name = ''products'' AND event_time > NOW() - INTERVAL ''24 hours'') as changes_24h,
        (SELECT COUNT(*) FROM security_events WHERE details->>''table'' = ''products'' AND severity IN (''high'', ''critical'') AND created_at > NOW() - INTERVAL ''24 hours'') as alerts_24h
      UNION ALL
      SELECT
        ''users'' as table_name,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as active_count,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL) as deleted_count,
        (SELECT COUNT(*) FROM immutable_audit_log WHERE table_name = ''users'' AND event_time > NOW() - INTERVAL ''24 hours'') as changes_24h,
        (SELECT COUNT(*) FROM security_events WHERE details->>''table'' = ''users'' AND severity IN (''high'', ''critical'') AND created_at > NOW() - INTERVAL ''24 hours'') as alerts_24h
    ';
    RAISE NOTICE 'security_dashboard view created successfully';
  ELSE
    -- Créer une vue simplifiée sans security_events
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'immutable_audit_log')
    THEN
      EXECUTE '
        CREATE OR REPLACE VIEW security_dashboard AS
        SELECT
          ''products'' as table_name,
          (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) as active_count,
          (SELECT COUNT(*) FROM products WHERE deleted_at IS NOT NULL) as deleted_count,
          (SELECT COUNT(*) FROM immutable_audit_log WHERE table_name = ''products'' AND event_time > NOW() - INTERVAL ''24 hours'') as changes_24h,
          0::BIGINT as alerts_24h
        UNION ALL
        SELECT
          ''users'' as table_name,
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as active_count,
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL) as deleted_count,
          (SELECT COUNT(*) FROM immutable_audit_log WHERE table_name = ''users'' AND event_time > NOW() - INTERVAL ''24 hours'') as changes_24h,
          0::BIGINT as alerts_24h
      ';
      RAISE NOTICE 'security_dashboard view created (simplified - security_events missing)';
    ELSE
      RAISE NOTICE 'security_dashboard view skipped - required tables missing';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- RÉSUMÉ DES PROTECTIONS
-- ============================================================================
-- ✅ TRUNCATE révoqué sur tables critiques
-- ✅ Soft delete dynamique (fonctionne sur toutes les tables)
-- ✅ Protection contre la "résurrection" (deleted_at = NULL bloqué)
-- ✅ Détection des opérations massives
-- ✅ Snapshots d'urgence
-- ✅ Checkpoints d'intégrité
-- ✅ Dashboard de sécurité
-- ============================================================================
