-- ============================================================================
-- MIGRATION 080: Real-time Updates for ALL Tables
-- SafeScoring - 2026-01-19
-- ============================================================================
-- OBJECTIF: Tout doit être mis à jour en temps réel
-- 
-- Tables couvertes:
--   1. USER: users, user_setups, user_watchlist, user_preferences
--   2. SETUP: user_setups, setup_history, setup_score_snapshots
--   3. DASHBOARD: stats, api_usage, subscriptions
--   4. 3D MAP: user_presence, physical_incidents, security_incidents
-- ============================================================================

-- ============================================================================
-- PARTIE 1: TRIGGERS USER_SETUPS - Cascade vers scores et historique
-- ============================================================================

-- Trigger: Quand un setup change, recalculer le score combiné
CREATE OR REPLACE FUNCTION trigger_setup_score_recalc()
RETURNS TRIGGER AS $$
DECLARE
    v_product_ids INTEGER[];
    v_combined_score JSONB;
BEGIN
    -- Extraire les product_ids du setup
    IF NEW.products IS NOT NULL THEN
        SELECT ARRAY_AGG((p->>'product_id')::INTEGER)
        INTO v_product_ids
        FROM jsonb_array_elements(NEW.products) p;
    END IF;
    
    -- Calculer le score combiné
    IF v_product_ids IS NOT NULL AND array_length(v_product_ids, 1) > 0 THEN
        SELECT jsonb_build_object(
            'note_finale', ROUND(AVG(ssr.note_finale), 1),
            'score_s', ROUND(AVG(ssr.score_s), 1),
            'score_a', ROUND(AVG(ssr.score_a), 1),
            'score_f', ROUND(AVG(ssr.score_f), 1),
            'score_e', ROUND(AVG(ssr.score_e), 1),
            'products_count', COUNT(*),
            'calculated_at', NOW()
        )
        INTO v_combined_score
        FROM safe_scoring_results ssr
        WHERE ssr.product_id = ANY(v_product_ids);
        
        -- Mettre à jour le snapshot du setup
        UPDATE user_setups
        SET last_score_snapshot = v_combined_score,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    -- Notifier le changement
    PERFORM pg_notify('setup_updated', jsonb_build_object(
        'setup_id', NEW.id,
        'user_id', NEW.user_id,
        'action', TG_OP,
        'combined_score', v_combined_score,
        'timestamp', NOW()
    )::TEXT);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_setup_recalc ON user_setups;
CREATE TRIGGER trigger_setup_recalc
    AFTER INSERT OR UPDATE OF products ON user_setups
    FOR EACH ROW
    EXECUTE FUNCTION trigger_setup_score_recalc();


-- ============================================================================
-- PARTIE 2: TRIGGERS USER_WATCHLIST - Alertes temps réel
-- ============================================================================

-- Trigger: Quand un score change, vérifier les watchlists
CREATE OR REPLACE FUNCTION trigger_watchlist_score_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_watchlist RECORD;
    v_old_score INTEGER;
    v_change INTEGER;
BEGIN
    -- Parcourir les watchlists concernées par ce produit
    FOR v_watchlist IN
        SELECT w.*, u.email
        FROM user_watchlist w
        JOIN users u ON w.user_id = u.id
        WHERE w.product_id = NEW.product_id
          AND w.alert_on_score_change = TRUE
          AND w.score_at_add IS NOT NULL
    LOOP
        v_old_score := v_watchlist.score_at_add;
        v_change := ABS(COALESCE(NEW.note_finale, 0) - v_old_score);
        
        -- Vérifier si le changement dépasse le seuil
        IF v_change >= v_watchlist.alert_threshold THEN
            -- Créer une notification
            INSERT INTO user_notifications (
                user_id,
                type,
                title,
                message,
                data,
                created_at
            ) VALUES (
                v_watchlist.user_id,
                'score_change',
                'Score Change Alert',
                format('Product score changed by %s points', v_change),
                jsonb_build_object(
                    'product_id', NEW.product_id,
                    'old_score', v_old_score,
                    'new_score', NEW.note_finale,
                    'change', v_change
                ),
                NOW()
            );
            
            -- Mettre à jour last_alert_at
            UPDATE user_watchlist
            SET last_alert_at = NOW()
            WHERE id = v_watchlist.id;
            
            -- Notifier en temps réel
            PERFORM pg_notify('watchlist_alert', jsonb_build_object(
                'user_id', v_watchlist.user_id,
                'product_id', NEW.product_id,
                'old_score', v_old_score,
                'new_score', NEW.note_finale,
                'change', v_change,
                'timestamp', NOW()
            )::TEXT);
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_watchlist_alert ON safe_scoring_results;
CREATE TRIGGER trigger_watchlist_alert
    AFTER UPDATE OF note_finale ON safe_scoring_results
    FOR EACH ROW
    WHEN (OLD.note_finale IS DISTINCT FROM NEW.note_finale)
    EXECUTE FUNCTION trigger_watchlist_score_alert();


-- ============================================================================
-- PARTIE 3: TRIGGERS USER_PRESENCE - 3D Map temps réel
-- ============================================================================

-- Trigger: Broadcast présence pour la carte 3D
CREATE OR REPLACE FUNCTION trigger_presence_broadcast()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM pg_notify('presence_update', jsonb_build_object(
            'action', CASE WHEN TG_OP = 'INSERT' THEN 'join' ELSE 'update' END,
            'session_id', NEW.session_id,
            'country', NEW.country,
            'lat', NEW.lat,
            'lng', NEW.lng,
            'current_page', NEW.current_page,
            'device_type', NEW.device_type,
            'pseudonym', NEW.pseudonym,
            'timestamp', NOW()
        )::TEXT);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify('presence_update', jsonb_build_object(
            'action', 'leave',
            'session_id', OLD.session_id,
            'country', OLD.country,
            'timestamp', NOW()
        )::TEXT);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_presence_broadcast ON user_presence;
CREATE TRIGGER trigger_presence_broadcast
    AFTER INSERT OR UPDATE OR DELETE ON user_presence
    FOR EACH ROW
    EXECUTE FUNCTION trigger_presence_broadcast();


-- ============================================================================
-- PARTIE 4: TRIGGERS PHYSICAL_INCIDENTS - 3D Map incidents
-- ============================================================================

-- Trigger: Broadcast nouvel incident pour la carte
CREATE OR REPLACE FUNCTION trigger_incident_broadcast()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_notify('incident_new', jsonb_build_object(
            'id', NEW.id,
            'type', 'physical',
            'incident_type', NEW.incident_type,
            'title', NEW.title,
            'country', NEW.location_country,
            'city', NEW.location_city,
            'severity', NEW.severity_score,
            'amount_stolen_usd', NEW.amount_stolen_usd,
            'timestamp', NOW()
        )::TEXT);
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM pg_notify('incident_status', jsonb_build_object(
            'id', NEW.id,
            'type', 'physical',
            'old_status', OLD.status,
            'new_status', NEW.status,
            'timestamp', NOW()
        )::TEXT);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_physical_incident_broadcast ON physical_incidents;
CREATE TRIGGER trigger_physical_incident_broadcast
    AFTER INSERT OR UPDATE ON physical_incidents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_incident_broadcast();


-- Trigger similaire pour security_incidents
CREATE OR REPLACE FUNCTION trigger_security_incident_broadcast()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_published = TRUE THEN
        PERFORM pg_notify('incident_new', jsonb_build_object(
            'id', NEW.id,
            'type', 'security',
            'incident_type', NEW.incident_type,
            'title', NEW.title,
            'severity', NEW.severity,
            'funds_lost_usd', NEW.funds_lost_usd,
            'timestamp', NOW()
        )::TEXT);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_security_incident_broadcast ON security_incidents;
CREATE TRIGGER trigger_security_incident_broadcast
    AFTER INSERT OR UPDATE ON security_incidents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_security_incident_broadcast();


-- ============================================================================
-- PARTIE 5: TRIGGERS SETUP_HISTORY - Historique automatique
-- ============================================================================

-- Améliorer le trigger existant pour plus de détails
CREATE OR REPLACE FUNCTION log_setup_change_detailed()
RETURNS TRIGGER AS $$
DECLARE
    v_old_products JSONB;
    v_new_products JSONB;
    v_added_products JSONB;
    v_removed_products JSONB;
BEGIN
    v_old_products := COALESCE(OLD.products, '[]'::JSONB);
    v_new_products := COALESCE(NEW.products, '[]'::JSONB);
    
    -- Détecter les produits ajoutés
    SELECT jsonb_agg(np)
    INTO v_added_products
    FROM jsonb_array_elements(v_new_products) np
    WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_old_products) op
        WHERE (op->>'product_id') = (np->>'product_id')
    );
    
    -- Détecter les produits supprimés
    SELECT jsonb_agg(op)
    INTO v_removed_products
    FROM jsonb_array_elements(v_old_products) op
    WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_new_products) np
        WHERE (np->>'product_id') = (op->>'product_id')
    );
    
    -- Logger les ajouts
    IF v_added_products IS NOT NULL AND jsonb_array_length(v_added_products) > 0 THEN
        INSERT INTO setup_history (setup_id, user_id, action, new_value, metadata)
        VALUES (
            NEW.id,
            NEW.user_id,
            'product_added',
            v_added_products,
            jsonb_build_object('count', jsonb_array_length(v_added_products))
        );
    END IF;
    
    -- Logger les suppressions
    IF v_removed_products IS NOT NULL AND jsonb_array_length(v_removed_products) > 0 THEN
        INSERT INTO setup_history (setup_id, user_id, action, old_value, metadata)
        VALUES (
            NEW.id,
            NEW.user_id,
            'product_removed',
            v_removed_products,
            jsonb_build_object('count', jsonb_array_length(v_removed_products))
        );
    END IF;
    
    -- Logger le changement de nom
    IF OLD.name IS DISTINCT FROM NEW.name THEN
        INSERT INTO setup_history (setup_id, user_id, action, old_value, new_value)
        VALUES (
            NEW.id,
            NEW.user_id,
            'renamed',
            jsonb_build_object('name', OLD.name),
            jsonb_build_object('name', NEW.name)
        );
    END IF;
    
    -- Notifier
    PERFORM pg_notify('setup_history', jsonb_build_object(
        'setup_id', NEW.id,
        'user_id', NEW.user_id,
        'added', v_added_products,
        'removed', v_removed_products,
        'timestamp', NOW()
    )::TEXT);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_setup_change ON user_setups;
CREATE TRIGGER trigger_log_setup_change
    AFTER UPDATE ON user_setups
    FOR EACH ROW
    WHEN (OLD.products IS DISTINCT FROM NEW.products OR OLD.name IS DISTINCT FROM NEW.name)
    EXECUTE FUNCTION log_setup_change_detailed();


-- ============================================================================
-- PARTIE 6: TRIGGERS DASHBOARD STATS - Mise à jour temps réel
-- ============================================================================

-- Vue matérialisée pour stats dashboard (refresh rapide)
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_stats;
CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as total_products,
    (SELECT COUNT(*) FROM norms WHERE norm_status = 'active' OR norm_status IS NULL) as total_norms,
    (SELECT COUNT(*) FROM evaluations) as total_evaluations,
    (SELECT COUNT(DISTINCT user_id) FROM user_setups) as users_with_setups,
    (SELECT COUNT(*) FROM user_presence WHERE last_seen > NOW() - INTERVAL '5 minutes') as online_users,
    (SELECT ROUND(AVG(note_finale), 1) FROM safe_scoring_results WHERE note_finale IS NOT NULL) as avg_score,
    (SELECT COUNT(*) FROM physical_incidents WHERE created_at > NOW() - INTERVAL '30 days') as recent_incidents,
    NOW() as refreshed_at;

CREATE UNIQUE INDEX ON mv_dashboard_stats (refreshed_at);

-- Fonction pour refresh les stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
    
    PERFORM pg_notify('dashboard_stats_refreshed', jsonb_build_object(
        'timestamp', NOW()
    )::TEXT);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PARTIE 7: TRIGGERS SUBSCRIPTIONS - Sync avec accès features
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_subscription_to_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Quand une subscription change, mettre à jour user_feature_access
    IF NEW.status = 'active' THEN
        INSERT INTO user_feature_access (user_id, plan_type, features_enabled, updated_at)
        VALUES (
            NEW.user_id,
            NEW.plan,
            CASE NEW.plan
                WHEN 'pro' THEN '["unlimited_setups", "api_access", "export_pdf", "priority_support"]'::JSONB
                WHEN 'enterprise' THEN '["unlimited_setups", "api_access", "export_pdf", "priority_support", "white_label", "custom_reports"]'::JSONB
                ELSE '["basic_setups"]'::JSONB
            END,
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            plan_type = EXCLUDED.plan_type,
            features_enabled = EXCLUDED.features_enabled,
            updated_at = NOW();
    ELSIF NEW.status IN ('canceled', 'expired') THEN
        UPDATE user_feature_access
        SET plan_type = 'free',
            features_enabled = '["basic_setups"]'::JSONB,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    
    -- Notifier
    PERFORM pg_notify('subscription_changed', jsonb_build_object(
        'user_id', NEW.user_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'plan', NEW.plan,
        'timestamp', NOW()
    )::TEXT);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_sync ON subscriptions;
CREATE TRIGGER trigger_subscription_sync
    AFTER INSERT OR UPDATE OF status ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_subscription_to_access();


-- ============================================================================
-- PARTIE 8: ENABLE SUPABASE REALTIME sur toutes les tables critiques
-- ============================================================================

DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'user_setups',
        'user_watchlist', 
        'user_presence',
        'user_notifications',
        'setup_history',
        'safe_scoring_results',
        'physical_incidents',
        'security_incidents',
        'subscriptions'
    ];
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY v_tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', v_table);
            RAISE NOTICE 'Added % to supabase_realtime', v_table;
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Table % already in supabase_realtime', v_table;
        END;
    END LOOP;
END $$;


-- ============================================================================
-- PARTIE 9: TABLE user_notifications (si n'existe pas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON user_notifications(user_id, is_read, created_at DESC)
WHERE is_read = FALSE;

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
CREATE POLICY "Users can view own notifications" ON user_notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE USING (user_id = auth.uid());


-- ============================================================================
-- PARTIE 10: VUE RÉCAPITULATIVE - État temps réel
-- ============================================================================

CREATE OR REPLACE VIEW v_realtime_status AS
SELECT
    'triggers' as category,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trigger_%') as count,
    'Triggers actifs' as description

UNION ALL

SELECT
    'realtime_tables' as category,
    (SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime') as count,
    'Tables avec Realtime activé' as description

UNION ALL

SELECT
    'pending_recalc' as category,
    (SELECT COUNT(*) FROM score_recalculation_queue WHERE status = 'pending') as count,
    'Recalculs en attente' as description

UNION ALL

SELECT
    'online_users' as category,
    (SELECT COUNT(*) FROM user_presence WHERE last_seen > NOW() - INTERVAL '5 minutes') as count,
    'Utilisateurs en ligne' as description;


-- ============================================================================
-- PARTIE 11: FONCTION DE DIAGNOSTIC TEMPS RÉEL
-- ============================================================================

CREATE OR REPLACE FUNCTION get_realtime_health()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'timestamp', NOW(),
        'triggers', (
            SELECT jsonb_agg(jsonb_build_object(
                'name', tgname,
                'table', tgrelid::regclass::TEXT,
                'enabled', tgenabled = 'O'
            ))
            FROM pg_trigger
            WHERE tgname LIKE 'trigger_%'
              AND NOT tgisinternal
        ),
        'realtime_tables', (
            SELECT jsonb_agg(tablename)
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
        ),
        'queue_status', (
            SELECT jsonb_build_object(
                'pending', COUNT(*) FILTER (WHERE status = 'pending'),
                'processing', COUNT(*) FILTER (WHERE status = 'processing'),
                'completed_1h', COUNT(*) FILTER (WHERE status = 'completed' AND processed_at > NOW() - INTERVAL '1 hour')
            )
            FROM score_recalculation_queue
        ),
        'notifications_pending', (
            SELECT COUNT(*) FROM user_notifications WHERE is_read = FALSE
        ),
        'presence_active', (
            SELECT COUNT(*) FROM user_presence WHERE last_seen > NOW() - INTERVAL '5 minutes'
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PARTIE 12: PERMISSIONS
-- ============================================================================

GRANT SELECT ON mv_dashboard_stats TO authenticated, anon;
GRANT SELECT ON v_realtime_status TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_realtime_health() TO service_role;


-- ============================================================================
-- PARTIE 13: VÉRIFICATION FINALE
-- ============================================================================

DO $$
DECLARE
    v_health JSONB;
BEGIN
    v_health := get_realtime_health();
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration 080 - Real-time ALL Tables';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers créés:';
    RAISE NOTICE '  - trigger_setup_recalc (user_setups → scores)';
    RAISE NOTICE '  - trigger_watchlist_alert (scores → notifications)';
    RAISE NOTICE '  - trigger_presence_broadcast (presence → 3D map)';
    RAISE NOTICE '  - trigger_physical_incident_broadcast (incidents → map)';
    RAISE NOTICE '  - trigger_security_incident_broadcast (incidents → map)';
    RAISE NOTICE '  - trigger_log_setup_change (setups → history)';
    RAISE NOTICE '  - trigger_subscription_sync (subscriptions → access)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Realtime: %', v_health->>'realtime_tables';
    RAISE NOTICE 'Présence active: %', v_health->>'presence_active';
    RAISE NOTICE '============================================';
END $$;
