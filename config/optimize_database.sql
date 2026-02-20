-- =============================================================================
-- SAFESCORING - OPTIMISATION BASE DE DONNÉES
-- =============================================================================
-- Version: 2.0 - Exécuter APRÈS cleanup_disk_space.sql
--
-- Ce script:
-- 1. Récupère l'espace des lignes supprimées (VACUUM)
-- 2. Met à jour les statistiques pour l'optimiseur (ANALYZE)
-- 3. Reconstruit les index fragmentés (REINDEX)
-- 4. Identifie les index inutilisés
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 1: VACUUM ANALYZE - Récupérer l'espace disque
-- ═══════════════════════════════════════════════════════════════════════════

-- Tables de logs (viennent d'être nettoyées)
VACUUM (VERBOSE, ANALYZE) audit_logs;
VACUUM (VERBOSE, ANALYZE) security_audit_logs;
VACUUM (VERBOSE, ANALYZE) login_attempts;
VACUUM (VERBOSE, ANALYZE) anti_copy_logs;
VACUUM (VERBOSE, ANALYZE) security_events;
VACUUM (VERBOSE, ANALYZE) webhook_events;
VACUUM (VERBOSE, ANALYZE) user_notifications;
VACUUM (VERBOSE, ANALYZE) notification_log;

-- Tables de queues
VACUUM (VERBOSE, ANALYZE) score_recalculation_queue;
VACUUM (VERBOSE, ANALYZE) compat_refresh_queue;

-- Tables de rate limiting
VACUUM (VERBOSE, ANALYZE) rate_limit_buckets;

-- Tables de tracking
VACUUM (VERBOSE, ANALYZE) share_events;
VACUUM (VERBOSE, ANALYZE) badge_impressions;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 2: ANALYZE - Mettre à jour stats pour tables principales
-- ═══════════════════════════════════════════════════════════════════════════

-- Tables critiques (ne pas VACUUM FULL - trop lent)
ANALYZE products;
ANALYZE norms;
ANALYZE evaluations;
ANALYZE safe_scoring_results;
ANALYZE user_setups;

-- Tables utilisateur
ANALYZE users;
ANALYZE user_watchlist;
ANALYZE user_preferences;

-- Tables financières
ANALYZE donations;
ANALYZE fiat_payments;
ANALYZE verified_badges;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 3: REINDEX - Reconstruire index fragmentés
-- ═══════════════════════════════════════════════════════════════════════════

-- Index des tables fréquemment modifiées
REINDEX TABLE CONCURRENTLY audit_logs;
REINDEX TABLE CONCURRENTLY user_notifications;
REINDEX TABLE CONCURRENTLY score_recalculation_queue;
REINDEX TABLE CONCURRENTLY webhook_events;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 4: DIAGNOSTIC - Index inutilisés (> 1MB, jamais scannés)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  '⚠️ INDEX INUTILISÉ' AS warning,
  schemaname || '.' || relname AS table_name,
  indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) AS taille,
  idx_scan AS scans_depuis_restart
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND pg_relation_size(indexrelid) > 1024 * 1024  -- > 1MB
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 5: DIAGNOSTIC - Tables les plus volumineuses
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  tablename AS table_name,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS taille_totale,
  pg_size_pretty(pg_relation_size('public.' || tablename)) AS taille_donnees,
  pg_size_pretty(pg_indexes_size('public.' || tablename)) AS taille_index,
  ROUND(100.0 * pg_indexes_size('public.' || tablename) /
    NULLIF(pg_total_relation_size('public.' || tablename), 0), 1) AS pct_index
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC
LIMIT 15;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 6: DIAGNOSTIC - Bloat (espace perdu dans les tables)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  relname AS table_name,
  n_dead_tup AS lignes_mortes,
  n_live_tup AS lignes_vivantes,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS pct_dead,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 7: RÉSULTAT FINAL
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  'TAILLE TOTALE BDD' AS metric,
  pg_size_pretty(pg_database_size(current_database())) AS value;

-- ═══════════════════════════════════════════════════════════════════════════
-- OPTIONNEL: VACUUM FULL sur tables spécifiques (BLOQUANT - utiliser hors prod)
-- ═══════════════════════════════════════════════════════════════════════════
-- Décommenter si besoin de récupérer plus d'espace (prend du temps)
/*
VACUUM FULL audit_logs;
VACUUM FULL login_attempts;
VACUUM FULL anti_copy_logs;
VACUUM FULL webhook_events;
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- OPTIONNEL: Configurer auto-cleanup mensuel (nécessite pg_cron)
-- ═══════════════════════════════════════════════════════════════════════════
/*
-- Vérifier si pg_cron est disponible
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Si disponible, planifier le nettoyage mensuel
SELECT cron.schedule(
  'monthly-safescoring-cleanup',
  '0 4 1 * *',  -- 4h AM le 1er de chaque mois
  $$
  -- Logs > 90 jours
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days' AND severity IN ('info', 'debug');
  DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM anti_copy_logs WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM user_notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days';

  -- Queues terminées
  DELETE FROM score_recalculation_queue WHERE status = 'completed' AND processed_at < NOW() - INTERVAL '1 hour';
  DELETE FROM compat_refresh_queue WHERE processed_at IS NOT NULL AND processed_at < NOW() - INTERVAL '24 hours';

  -- Rate limiting expiré
  DELETE FROM rate_limit_buckets WHERE last_refill < NOW() - INTERVAL '24 hours';
  DELETE FROM session_bindings WHERE expires_at < NOW();

  -- Vacuum
  VACUUM ANALYZE audit_logs, login_attempts, anti_copy_logs, webhook_events, user_notifications;
  $$
);
*/
