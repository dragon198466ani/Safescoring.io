-- =============================================================================
-- SAFESCORING - NETTOYAGE ESPACE DISQUE (SÉCURISÉ)
-- =============================================================================
-- Version: 2.0 - Basé sur analyse complète du schéma
-- Exécuter dans Supabase Dashboard > SQL Editor
--
-- ⚠️  CE SCRIPT EST SÛR - Il ne touche PAS aux données critiques :
--     - products, norms, evaluations (scoring)
--     - users, user_setups (données utilisateur)
--     - donations, fiat_payments, invoices (comptabilité)
--     - physical_incidents, security_incidents (historique)
--     - predictions (preuve d'exactitude)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 0: DIAGNOSTIC - Voir l'espace utilisé
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'AVANT NETTOYAGE' AS status, pg_size_pretty(pg_database_size(current_database())) AS taille_totale;

SELECT
  tablename AS table_name,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS taille
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC
LIMIT 15;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 1: NETTOYAGE DES LOGS D'AUDIT (garder les critiques)
-- ═══════════════════════════════════════════════════════════════════════════

-- Audit logs: garder critical/error 1 an, warning 6 mois, info/debug 90 jours
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days'
AND severity IN ('info', 'debug');

DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '6 months'
AND severity = 'warning';

DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year'
AND severity NOT IN ('critical', 'error');

-- Security audit logs: 90 jours
DELETE FROM security_audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 2: NETTOYAGE TENTATIVES DE CONNEXION (brute force logs)
-- ═══════════════════════════════════════════════════════════════════════════

DELETE FROM login_attempts
WHERE created_at < NOW() - INTERVAL '90 days';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 3: NETTOYAGE PROTECTION ANTI-COPIE
-- ═══════════════════════════════════════════════════════════════════════════

-- Logs anti-copie: 90 jours
DELETE FROM anti_copy_logs
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Alertes anti-copie résolues: 90 jours
DELETE FROM anti_copy_alerts
WHERE resolved = true
AND created_at < NOW() - INTERVAL '90 days';

-- Triggers honeypot: 30 jours
DELETE FROM honeypot_triggers
WHERE created_at < NOW() - INTERVAL '30 days';

-- Triggers canary: 90 jours
DELETE FROM canary_triggers
WHERE created_at < NOW() - INTERVAL '90 days';

-- Client fingerprints anciens (non suspects): 90 jours
DELETE FROM client_fingerprints
WHERE last_seen < NOW() - INTERVAL '90 days'
AND suspected_scraper = false
AND suspected_competitor = false;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 4: NETTOYAGE ÉVÉNEMENTS SÉCURITÉ (garder critiques)
-- ═══════════════════════════════════════════════════════════════════════════

-- Security events: garder critical indéfiniment, autres 90 jours
DELETE FROM security_events
WHERE created_at < NOW() - INTERVAL '90 days'
AND severity != 'critical';

-- Security alerts résolues: 90 jours
DELETE FROM security_alerts
WHERE acknowledged = true
AND created_at < NOW() - INTERVAL '90 days';

-- CSP violations: 90 jours
DELETE FROM csp_violations
WHERE created_at < NOW() - INTERVAL '90 days';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 5: NETTOYAGE QUEUES DE TRAITEMENT
-- ═══════════════════════════════════════════════════════════════════════════

-- Score recalculation queue: jobs terminés > 1 heure
DELETE FROM score_recalculation_queue
WHERE status = 'completed'
AND processed_at < NOW() - INTERVAL '1 hour';

-- Jobs échoués > 7 jours
DELETE FROM score_recalculation_queue
WHERE status = 'failed'
AND processed_at < NOW() - INTERVAL '7 days';

-- Compatibility refresh queue: traités > 24 heures
DELETE FROM compat_refresh_queue
WHERE processed_at IS NOT NULL
AND processed_at < NOW() - INTERVAL '24 hours';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 6: NETTOYAGE RATE LIMITING (données temporaires)
-- ═══════════════════════════════════════════════════════════════════════════

-- Buckets expirés
DELETE FROM rate_limit_buckets
WHERE last_refill < NOW() - INTERVAL '24 hours';

-- Modification rate limits expirés
DELETE FROM modification_rate_limits
WHERE window_start < NOW() - INTERVAL '24 hours';

-- Sessions expirées
DELETE FROM session_bindings
WHERE expires_at < NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 7: NETTOYAGE WEBHOOKS ET NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Webhook events (idempotency): 90 jours
DELETE FROM webhook_events
WHERE created_at < NOW() - INTERVAL '90 days';

-- Notifications lues: 30 jours
DELETE FROM user_notifications
WHERE is_read = true
AND created_at < NOW() - INTERVAL '30 days';

-- Notifications non lues très anciennes: 90 jours
DELETE FROM user_notifications
WHERE is_read = false
AND created_at < NOW() - INTERVAL '90 days';

-- Notification log (envoyés avec succès): 6 mois
DELETE FROM notification_log
WHERE status = 'sent'
AND created_at < NOW() - INTERVAL '6 months';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 8: NETTOYAGE TRACKING (analytics)
-- ═══════════════════════════════════════════════════════════════════════════

-- Share events: 1 an
DELETE FROM share_events
WHERE created_at < NOW() - INTERVAL '1 year';

-- Badge impressions: 6 mois
DELETE FROM badge_impressions
WHERE created_at < NOW() - INTERVAL '6 months';

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 9: SUPPRIMER TABLES BACKUP (si existent)
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS norms_backup_076 CASCADE;
DROP TABLE IF EXISTS norms_backup CASCADE;
DROP TABLE IF EXISTS products_backup CASCADE;
DROP TABLE IF EXISTS evaluations_backup CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 10: RÉSULTAT FINAL
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'APRÈS NETTOYAGE' AS status, pg_size_pretty(pg_database_size(current_database())) AS taille_totale;

SELECT
  tablename AS table_name,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS taille
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC
LIMIT 15;
