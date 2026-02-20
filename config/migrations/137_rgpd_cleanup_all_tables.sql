-- ============================================================================
-- MIGRATION 137: RGPD Comprehensive Cleanup Functions
-- SafeScoring - 2026-02-01
-- ============================================================================
-- OBJECTIF: Nettoyer les données personnelles (PII) de toutes les tables
-- conformément au RGPD (suppression après 24h-30 jours selon la table)
--
-- Tables concernées:
--   - evaluation_votes: ip_hash, device_fingerprint (24h)
--   - community_votes: ip_hash (24h)
--   - share_events: ip_hash, user_agent (7 jours)
--   - challenges: ip_hash (7 jours)
--   - challenge_responses: ip_hash (7 jours)
--   - security_events: ip_address, user_agent (30 jours - besoin sécurité)
--   - login_attempts: ip_address, user_agent (30 jours)
--   - audit_logs: ip_address, user_agent (30 jours)
--   - api_usage: client_ip, user_agent (30 jours)
--   - honeypot_triggers: ip_address, user_agent (30 jours)
--   - anti_copy_logs: ip_hash, user_agent (30 jours)
--   - privacy_requests: ip_hash, user_agent (après traitement)
-- ============================================================================

-- ============================================================================
-- 1. TYPE: Résultat du nettoyage
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rgpd_cleanup_result') THEN
        CREATE TYPE rgpd_cleanup_result AS (
            table_name TEXT,
            rows_cleaned INTEGER,
            fields_cleaned TEXT[],
            retention_period TEXT
        );
    END IF;
END $$;


-- ============================================================================
-- 2. FONCTION: Nettoyage evaluation_votes (24h)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_evaluation_votes_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE evaluation_votes
    SET
        ip_hash = NULL,
        device_fingerprint = NULL
    WHERE (ip_hash IS NOT NULL OR device_fingerprint IS NOT NULL)
      AND created_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 3. FONCTION: Nettoyage community_votes (24h)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_community_votes_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Vérifier si la table existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_votes') THEN
        RETURN 0;
    END IF;

    UPDATE community_votes
    SET ip_hash = NULL
    WHERE ip_hash IS NOT NULL
      AND created_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 4. FONCTION: Nettoyage share_events (7 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_share_events_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_events') THEN
        RETURN 0;
    END IF;

    UPDATE share_events
    SET
        ip_hash = NULL,
        user_agent = NULL
    WHERE (ip_hash IS NOT NULL OR user_agent IS NOT NULL)
      AND created_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 5. FONCTION: Nettoyage challenges (7 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_challenges_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_temp INTEGER;
BEGIN
    -- challenges table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenges') THEN
        UPDATE challenges
        SET ip_hash = NULL
        WHERE ip_hash IS NOT NULL
          AND created_at < NOW() - INTERVAL '7 days';
        GET DIAGNOSTICS v_temp = ROW_COUNT;
        v_count := v_count + v_temp;
    END IF;

    -- challenge_responses table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_responses') THEN
        UPDATE challenge_responses
        SET ip_hash = NULL
        WHERE ip_hash IS NOT NULL
          AND created_at < NOW() - INTERVAL '7 days';
        GET DIAGNOSTICS v_temp = ROW_COUNT;
        v_count := v_count + v_temp;
    END IF;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 6. FONCTION: Nettoyage security_events (30 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_security_events_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_events') THEN
        RETURN 0;
    END IF;

    -- Anonymiser les IPs (garder les 2 premiers octets pour analyse)
    UPDATE security_events
    SET
        ip_address = CASE
            WHEN ip_address LIKE '%.%.%.%' THEN
                split_part(ip_address, '.', 1) || '.' || split_part(ip_address, '.', 2) || '.0.0'
            ELSE NULL
        END,
        user_agent = NULL
    WHERE (ip_address IS NOT NULL OR user_agent IS NOT NULL)
      AND created_at < NOW() - INTERVAL '30 days'
      AND ip_address NOT LIKE '%.0.0';  -- Ne pas re-anonymiser

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 7. FONCTION: Nettoyage login_attempts (30 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_login_attempts_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_attempts') THEN
        RETURN 0;
    END IF;

    UPDATE login_attempts
    SET
        ip_address = CASE
            WHEN ip_address LIKE '%.%.%.%' THEN
                split_part(ip_address, '.', 1) || '.' || split_part(ip_address, '.', 2) || '.0.0'
            ELSE NULL
        END,
        user_agent = NULL
    WHERE (ip_address IS NOT NULL OR user_agent IS NOT NULL)
      AND created_at < NOW() - INTERVAL '30 days'
      AND ip_address NOT LIKE '%.0.0';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 8. FONCTION: Nettoyage audit_logs (30 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_audit_logs_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        RETURN 0;
    END IF;

    UPDATE audit_logs
    SET
        ip_address = NULL,
        user_agent = NULL
    WHERE (ip_address IS NOT NULL OR user_agent IS NOT NULL)
      AND created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 9. FONCTION: Nettoyage api_usage (30 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_api_usage_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage') THEN
        RETURN 0;
    END IF;

    -- Vérifier quelles colonnes existent
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_usage' AND column_name = 'client_ip') THEN
        UPDATE api_usage
        SET client_ip = NULL
        WHERE client_ip IS NOT NULL
          AND created_at < NOW() - INTERVAL '30 days';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_usage' AND column_name = 'user_agent') THEN
        UPDATE api_usage
        SET user_agent = NULL
        WHERE user_agent IS NOT NULL
          AND created_at < NOW() - INTERVAL '30 days';
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 10. FONCTION: Nettoyage honeypot_triggers (30 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_honeypot_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'honeypot_triggers') THEN
        RETURN 0;
    END IF;

    UPDATE honeypot_triggers
    SET
        ip_address = NULL,
        user_agent = NULL
    WHERE (ip_address IS NOT NULL OR user_agent IS NOT NULL)
      AND created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 11. FONCTION: Nettoyage anti_copy_logs (30 jours)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_anti_copy_logs_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'anti_copy_logs') THEN
        RETURN 0;
    END IF;

    UPDATE anti_copy_logs
    SET
        ip_hash = NULL,
        user_agent = NULL
    WHERE (ip_hash IS NOT NULL OR user_agent IS NOT NULL)
      AND created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 12. FONCTION: Nettoyage admin_audit_logs (90 jours - plus long pour admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_admin_audit_logs_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_logs') THEN
        RETURN 0;
    END IF;

    UPDATE admin_audit_logs
    SET
        ip_address = NULL,
        user_agent = NULL
    WHERE (ip_address IS NOT NULL OR user_agent IS NOT NULL)
      AND created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 13. FONCTION PRINCIPALE: Nettoyage RGPD complet
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_all_pii()
RETURNS TABLE (
    table_name TEXT,
    rows_cleaned INTEGER,
    retention_period TEXT
) AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- 24h tables
    SELECT cleanup_evaluation_votes_pii() INTO v_count;
    RETURN QUERY SELECT 'evaluation_votes'::TEXT, v_count, '24 hours'::TEXT;

    SELECT cleanup_community_votes_pii() INTO v_count;
    RETURN QUERY SELECT 'community_votes'::TEXT, v_count, '24 hours'::TEXT;

    -- 7 days tables
    SELECT cleanup_share_events_pii() INTO v_count;
    RETURN QUERY SELECT 'share_events'::TEXT, v_count, '7 days'::TEXT;

    SELECT cleanup_challenges_pii() INTO v_count;
    RETURN QUERY SELECT 'challenges'::TEXT, v_count, '7 days'::TEXT;

    -- 30 days tables
    SELECT cleanup_security_events_pii() INTO v_count;
    RETURN QUERY SELECT 'security_events'::TEXT, v_count, '30 days'::TEXT;

    SELECT cleanup_login_attempts_pii() INTO v_count;
    RETURN QUERY SELECT 'login_attempts'::TEXT, v_count, '30 days'::TEXT;

    SELECT cleanup_audit_logs_pii() INTO v_count;
    RETURN QUERY SELECT 'audit_logs'::TEXT, v_count, '30 days'::TEXT;

    SELECT cleanup_api_usage_pii() INTO v_count;
    RETURN QUERY SELECT 'api_usage'::TEXT, v_count, '30 days'::TEXT;

    SELECT cleanup_honeypot_pii() INTO v_count;
    RETURN QUERY SELECT 'honeypot_triggers'::TEXT, v_count, '30 days'::TEXT;

    SELECT cleanup_anti_copy_logs_pii() INTO v_count;
    RETURN QUERY SELECT 'anti_copy_logs'::TEXT, v_count, '30 days'::TEXT;

    -- 90 days tables
    SELECT cleanup_admin_audit_logs_pii() INTO v_count;
    RETURN QUERY SELECT 'admin_audit_logs'::TEXT, v_count, '90 days'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 14. PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION cleanup_evaluation_votes_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_community_votes_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_share_events_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_challenges_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_security_events_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_login_attempts_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_audit_logs_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_api_usage_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_honeypot_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_anti_copy_logs_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_admin_audit_logs_pii TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_all_pii TO service_role;


-- ============================================================================
-- 15. VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 137 - RGPD Cleanup Functions installée';
    RAISE NOTICE '';
    RAISE NOTICE 'Fonctions créées:';
    RAISE NOTICE '  - cleanup_all_pii(): Nettoyage complet (recommandé)';
    RAISE NOTICE '  - cleanup_evaluation_votes_pii(): 24h';
    RAISE NOTICE '  - cleanup_community_votes_pii(): 24h';
    RAISE NOTICE '  - cleanup_share_events_pii(): 7 jours';
    RAISE NOTICE '  - cleanup_challenges_pii(): 7 jours';
    RAISE NOTICE '  - cleanup_security_events_pii(): 30 jours (anonymisation)';
    RAISE NOTICE '  - cleanup_login_attempts_pii(): 30 jours';
    RAISE NOTICE '  - cleanup_audit_logs_pii(): 30 jours';
    RAISE NOTICE '  - cleanup_api_usage_pii(): 30 jours';
    RAISE NOTICE '  - cleanup_honeypot_pii(): 30 jours';
    RAISE NOTICE '  - cleanup_anti_copy_logs_pii(): 30 jours';
    RAISE NOTICE '  - cleanup_admin_audit_logs_pii(): 90 jours';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage: SELECT * FROM cleanup_all_pii();';
END $$;
