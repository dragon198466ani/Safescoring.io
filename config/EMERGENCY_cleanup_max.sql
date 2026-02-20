-- =============================================================================
-- 🚨 EMERGENCY CLEANUP - LIBÉRER MAXIMUM D'ESPACE
-- =============================================================================
-- À exécuter via Supabase Dashboard > SQL Editor
-- Objectif: Passer sous 500MB (limite free tier)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 0: DIAGNOSTIC RAPIDE
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'ESPACE TOTAL' AS info, pg_size_pretty(pg_database_size(current_database())) AS taille;

SELECT tablename, pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC LIMIT 15;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 1: TRUNCATE TABLES DE LOGS (suppression TOTALE - pas juste les vieux)
-- ═══════════════════════════════════════════════════════════════════════════

-- Logs d'audit (peuvent être recréés)
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE security_audit_logs;
TRUNCATE TABLE admin_audit_logs;

-- Tentatives de connexion
TRUNCATE TABLE login_attempts;

-- Protection anti-copie (peuvent être recréés)
TRUNCATE TABLE anti_copy_logs;
TRUNCATE TABLE anti_copy_alerts;
TRUNCATE TABLE honeypot_triggers;
TRUNCATE TABLE canary_triggers;
TRUNCATE TABLE client_fingerprints;

-- Événements sécurité non critiques
DELETE FROM security_events WHERE severity != 'critical';
DELETE FROM security_alerts WHERE acknowledged = true;

-- CSP violations
TRUNCATE TABLE csp_violations;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 2: TRUNCATE QUEUES ET DONNÉES TEMPORAIRES
-- ═══════════════════════════════════════════════════════════════════════════

TRUNCATE TABLE score_recalculation_queue;
TRUNCATE TABLE compat_refresh_queue;
TRUNCATE TABLE rate_limit_buckets;
TRUNCATE TABLE modification_rate_limits;
TRUNCATE TABLE session_bindings;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 3: TRUNCATE WEBHOOKS ET NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════

TRUNCATE TABLE webhook_events;
TRUNCATE TABLE user_notifications;
TRUNCATE TABLE notification_log;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 4: TRUNCATE TRACKING/ANALYTICS (pas critique)
-- ═══════════════════════════════════════════════════════════════════════════

TRUNCATE TABLE share_events;
TRUNCATE TABLE badge_impressions;
TRUNCATE TABLE api_usage;
TRUNCATE TABLE api_usage_daily;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 5: DROP TOUTES LES TABLES BACKUP
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS norms_backup CASCADE;
DROP TABLE IF EXISTS norms_backup_076 CASCADE;
DROP TABLE IF EXISTS products_backup CASCADE;
DROP TABLE IF EXISTS evaluations_backup CASCADE;
DROP TABLE IF EXISTS users_backup CASCADE;
DROP TABLE IF EXISTS safe_scoring_results_backup CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 6: NETTOYER CONVERSATIONS AI (si volumineuses)
-- ═══════════════════════════════════════════════════════════════════════════

-- Garder seulement les 30 derniers jours
DELETE FROM conversation_messages WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM user_conversations WHERE last_message_at < NOW() - INTERVAL '30 days';
DELETE FROM user_memories WHERE created_at < NOW() - INTERVAL '90 days';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 7: NETTOYER HISTORIQUE (garder 6 mois seulement)
-- ═══════════════════════════════════════════════════════════════════════════

DELETE FROM setup_history WHERE created_at < NOW() - INTERVAL '6 months';
DELETE FROM setup_score_snapshots WHERE created_at < NOW() - INTERVAL '6 months';
DELETE FROM product_score_history WHERE recorded_at < NOW() - INTERVAL '6 months';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 8: NETTOYER AFFILIATE (si pas utilisé activement)
-- ═══════════════════════════════════════════════════════════════════════════

-- Décommenter si affiliate n'est pas utilisé
-- TRUNCATE TABLE affiliate_clicks CASCADE;
-- TRUNCATE TABLE affiliate_conversions CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 9: VACUUM POUR RÉCUPÉRER L'ESPACE
-- ═══════════════════════════════════════════════════════════════════════════

VACUUM FULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 10: VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'APRÈS NETTOYAGE' AS info, pg_size_pretty(pg_database_size(current_database())) AS taille;

SELECT tablename, pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC LIMIT 15;
