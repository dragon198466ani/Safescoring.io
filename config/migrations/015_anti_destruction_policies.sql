-- ============================================================================
-- Migration 015: Anti-Destruction Security Policies
-- ============================================================================
-- Protections contre la suppression malveillante de données.
-- NOTE: Cette migration s'adapte aux tables existantes
-- ============================================================================

-- ============================================================================
-- 1. SOFT DELETE SYSTEM (Ne jamais supprimer, seulement marquer)
-- ============================================================================

-- Ajouter colonne soft delete aux tables qui EXISTENT
DO $$
BEGIN
  -- Products table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    CREATE INDEX IF NOT EXISTS idx_products_not_deleted ON products(id) WHERE deleted_at IS NULL;
  END IF;

  -- Setups table (peut ne pas exister)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'setups') THEN
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    CREATE INDEX IF NOT EXISTS idx_setups_not_deleted ON setups(id) WHERE deleted_at IS NULL;
  END IF;

  -- User_setups table (alternative à setups)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_setups') THEN
    ALTER TABLE user_setups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    CREATE INDEX IF NOT EXISTS idx_user_setups_not_deleted ON user_setups(id) WHERE deleted_at IS NULL;
  END IF;

  -- Users table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ============================================================================
-- 2. PREVENT HARD DELETE (Empêcher les suppressions définitives)
-- ============================================================================

-- Fonction pour convertir DELETE en soft delete
CREATE OR REPLACE FUNCTION soft_delete_instead()
RETURNS TRIGGER AS $$
BEGIN
  -- Au lieu de supprimer, marquer comme supprimé
  UPDATE products SET deleted_at = NOW() WHERE id = OLD.id;

  -- Log l'événement
  INSERT INTO security_events (event_type, severity, user_id, details)
  VALUES (
    'SOFT_DELETE',
    'info',
    auth.uid(),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record_id', OLD.id,
      'original_action', 'DELETE'
    )
  );

  -- Retourner NULL empêche la vraie suppression
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer le trigger aux tables critiques (seulement si elles existent)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    DROP TRIGGER IF EXISTS prevent_hard_delete_products ON products;
    CREATE TRIGGER prevent_hard_delete_products
      BEFORE DELETE ON products
      FOR EACH ROW
      EXECUTE FUNCTION soft_delete_instead();
  END IF;
END $$;

-- ============================================================================
-- 3. RATE LIMIT DES MODIFICATIONS (Anti mass-update)
-- ============================================================================

-- Table pour tracker les modifications
CREATE TABLE IF NOT EXISTS modification_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_rate_user_table
ON modification_rate_limits(user_id, table_name, window_start);

-- Fonction pour vérifier le rate limit des modifications
CREATE OR REPLACE FUNCTION check_modification_rate()
RETURNS TRIGGER AS $$
DECLARE
  modification_count INTEGER;
  rate_limit INTEGER := 100; -- Max 100 modifications par heure
  window_duration INTERVAL := '1 hour';
BEGIN
  -- Compter les modifications récentes
  SELECT COALESCE(SUM(count), 0) INTO modification_count
  FROM modification_rate_limits
  WHERE user_id = auth.uid()
    AND table_name = TG_TABLE_NAME
    AND window_start > NOW() - window_duration;

  -- Bloquer si limite dépassée
  IF modification_count >= rate_limit THEN
    -- Log la tentative
    INSERT INTO security_events (event_type, severity, user_id, details)
    VALUES (
      'RATE_LIMIT_EXCEEDED',
      'high',
      auth.uid(),
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'count', modification_count,
        'limit', rate_limit
      )
    );

    RAISE EXCEPTION 'Rate limit exceeded for modifications. Please wait.';
  END IF;

  -- Enregistrer cette modification
  INSERT INTO modification_rate_limits (user_id, table_name, action)
  VALUES (auth.uid(), TG_TABLE_NAME, TG_OP);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. AUDIT TRAIL IMMUABLE
-- ============================================================================

-- Table d'audit immuable (append-only)
CREATE TABLE IF NOT EXISTS immutable_audit_log (
  id BIGSERIAL PRIMARY KEY,
  event_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Rendre la table append-only (pas de UPDATE/DELETE)
ALTER TABLE immutable_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop et recréer les policies pour éviter les erreurs si elles existent déjà
DROP POLICY IF EXISTS "Audit log is append-only" ON immutable_audit_log;
CREATE POLICY "Audit log is append-only" ON immutable_audit_log
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Audit log is read-only for admins" ON immutable_audit_log;
CREATE POLICY "Audit log is read-only for admins" ON immutable_audit_log
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ',')))
  );

-- Pas de policy pour UPDATE ou DELETE = interdit

-- Fonction pour enregistrer dans l'audit
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO immutable_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attacher aux tables critiques (seulement si elles existent)
DO $$
BEGIN
  -- Products table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    DROP TRIGGER IF EXISTS audit_products ON products;
    CREATE TRIGGER audit_products
      AFTER INSERT OR UPDATE OR DELETE ON products
      FOR EACH ROW EXECUTE FUNCTION audit_changes();
  END IF;

  -- Setups table (peut ne pas exister)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'setups') THEN
    DROP TRIGGER IF EXISTS audit_setups ON setups;
    CREATE TRIGGER audit_setups
      AFTER INSERT OR UPDATE OR DELETE ON setups
      FOR EACH ROW EXECUTE FUNCTION audit_changes();
  END IF;

  -- User_setups table (alternative)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_setups') THEN
    DROP TRIGGER IF EXISTS audit_user_setups ON user_setups;
    CREATE TRIGGER audit_user_setups
      AFTER INSERT OR UPDATE OR DELETE ON user_setups
      FOR EACH ROW EXECUTE FUNCTION audit_changes();
  END IF;

  -- Users table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    DROP TRIGGER IF EXISTS audit_users ON users;
    CREATE TRIGGER audit_users
      AFTER INSERT OR UPDATE OR DELETE ON users
      FOR EACH ROW EXECUTE FUNCTION audit_changes();
  END IF;
END $$;

-- ============================================================================
-- 5. PROTECTION ADMIN (Double vérification)
-- ============================================================================

-- Fonction pour vérifier les actions admin critiques
CREATE OR REPLACE FUNCTION require_admin_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
  recent_confirmation TIMESTAMPTZ;
BEGIN
  -- Vérifier si c'est un admin
  is_admin := auth.jwt() ->> 'email' IN (
    SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
  );

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  -- Pour les actions destructives, vérifier confirmation récente
  -- (À implémenter: système de confirmation 2FA)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. CLEANUP OLD RATE LIMIT RECORDS
-- ============================================================================

-- Nettoyer les vieux enregistrements de rate limit
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM modification_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. VIEWS POUR EXCLURE LES ÉLÉMENTS SUPPRIMÉS
-- ============================================================================

-- Créer les vues seulement si les tables existent
DO $$
BEGIN
  -- Vue active_products
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    EXECUTE 'CREATE OR REPLACE VIEW active_products AS SELECT * FROM products WHERE deleted_at IS NULL';
  END IF;

  -- Vue active_setups (peut ne pas exister)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'setups') THEN
    EXECUTE 'CREATE OR REPLACE VIEW active_setups AS SELECT * FROM setups WHERE deleted_at IS NULL';
  END IF;

  -- Vue active_user_setups (alternative)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_setups') THEN
    EXECUTE 'CREATE OR REPLACE VIEW active_user_setups AS SELECT * FROM user_setups WHERE deleted_at IS NULL';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- ============================================================================
-- DROP TRIGGER IF EXISTS prevent_hard_delete_products ON products;
-- DROP TRIGGER IF EXISTS audit_products ON products;
-- DROP TRIGGER IF EXISTS audit_setups ON setups;
-- DROP TRIGGER IF EXISTS audit_users ON users;
-- DROP FUNCTION IF EXISTS soft_delete_instead();
-- DROP FUNCTION IF EXISTS check_modification_rate();
-- DROP FUNCTION IF EXISTS audit_changes();
-- DROP FUNCTION IF EXISTS require_admin_confirmation();
-- DROP FUNCTION IF EXISTS cleanup_rate_limits();
-- DROP TABLE IF EXISTS modification_rate_limits;
-- DROP TABLE IF EXISTS immutable_audit_log;
-- DROP VIEW IF EXISTS active_products;
-- DROP VIEW IF EXISTS active_setups;
-- ALTER TABLE products DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE setups DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
-- ============================================================================
