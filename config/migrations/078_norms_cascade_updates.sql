-- ============================================================================
-- MIGRATION 078: Norms Cascade Updates - Cohérence Temps Réel
-- SafeScoring - 2026-01-19
-- ============================================================================
-- OBJECTIF: La table NORMS est le pivot central du MVP.
-- Toute modification doit se propager de manière cohérente vers:
--   1. safe_scoring_definitions (classification essential/consumer/full)
--   2. evaluations (résultats YES/NO/N/A par produit)
--   3. safe_scoring_results (scores calculés)
--   4. norm_applicability (quels types de produits)
--
-- RÈGLE D'OR: Tout doit être mis à jour en temps réel
-- ============================================================================

-- ============================================================================
-- PARTIE 1: SCHÉMA DES DÉPENDANCES
-- ============================================================================
-- 
-- norms (PIVOT)
--   │
--   ├──► safe_scoring_definitions (1:1) - Classification de la norme
--   │      └── Trigger: Sync auto quand norms.is_essential/consumer/full change
--   │
--   ├──► evaluations (1:N) - Résultats par produit
--   │      └── Trigger: Marquer stale quand norme change
--   │      └── Trigger: Recalculer scores quand évaluation change
--   │
--   ├──► norm_applicability (1:N) - Types de produits concernés
--   │      └── Trigger: Créer évaluations manquantes quand applicabilité change
--   │
--   └──► score_history (indirect via evaluations)
--          └── Trigger: Enregistrer changements significatifs
--
-- ============================================================================

-- ============================================================================
-- PARTIE 2: TRIGGER - Sync norms → safe_scoring_definitions
-- ============================================================================
-- Quand is_essential, consumer ou full change dans norms,
-- mettre à jour automatiquement safe_scoring_definitions

CREATE OR REPLACE FUNCTION sync_norm_to_scoring_definitions()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert dans safe_scoring_definitions
    INSERT INTO safe_scoring_definitions (norm_id, is_essential, is_consumer, is_full)
    VALUES (NEW.id, NEW.is_essential, NEW.consumer, NEW."full")
    ON CONFLICT (norm_id) DO UPDATE SET
        is_essential = EXCLUDED.is_essential,
        is_consumer = EXCLUDED.is_consumer,
        is_full = EXCLUDED.is_full;
    
    -- Si classification change, marquer les évaluations comme nécessitant recalcul
    IF OLD.is_essential IS DISTINCT FROM NEW.is_essential
       OR OLD.consumer IS DISTINCT FROM NEW.consumer
       OR OLD."full" IS DISTINCT FROM NEW."full" THEN
        
        -- Notifier que les scores doivent être recalculés
        PERFORM pg_notify('norm_classification_changed', jsonb_build_object(
            'norm_id', NEW.id,
            'norm_code', NEW.code,
            'old_essential', OLD.is_essential,
            'new_essential', NEW.is_essential,
            'timestamp', NOW()
        )::TEXT);
        
        -- Ajouter tous les produits affectés à la queue de recalcul
        INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
        SELECT DISTINCT e.product_id, NOW(), 'norm_classification'
        FROM evaluations e
        WHERE e.norm_id = NEW.id
        ON CONFLICT (product_id) DO UPDATE SET
            triggered_at = NOW(),
            trigger_type = 'norm_classification';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_norm_definitions ON norms;
CREATE TRIGGER trigger_sync_norm_definitions
    AFTER INSERT OR UPDATE OF is_essential, consumer, "full" ON norms
    FOR EACH ROW
    EXECUTE FUNCTION sync_norm_to_scoring_definitions();

COMMENT ON TRIGGER trigger_sync_norm_definitions ON norms IS 
'Synchronise automatiquement norms vers safe_scoring_definitions et déclenche recalcul si classification change';


-- ============================================================================
-- PARTIE 3: TRIGGER - Norme modifiée → Marquer évaluations stale
-- ============================================================================
-- Quand le contenu d'une norme change (description, title, official_doc_summary),
-- les évaluations existantes peuvent être obsolètes

CREATE OR REPLACE FUNCTION mark_evaluations_stale_on_norm_content_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier si le contenu significatif a changé
    IF OLD.description IS DISTINCT FROM NEW.description
       OR OLD.title IS DISTINCT FROM NEW.title
       OR OLD.official_doc_summary IS DISTINCT FROM NEW.official_doc_summary THEN
        
        -- Marquer les évaluations comme stale
        UPDATE evaluations
        SET is_stale = TRUE,
            staleness_reason = 'norm_content_changed'
        WHERE norm_id = NEW.id
          AND (is_stale = FALSE OR is_stale IS NULL);
        
        -- Incrémenter la version de la norme
        UPDATE norms
        SET data_version = COALESCE(data_version, 1) + 1,
            data_updated_at = NOW()
        WHERE id = NEW.id;
        
        -- Notifier
        PERFORM pg_notify('norm_content_changed', jsonb_build_object(
            'norm_id', NEW.id,
            'norm_code', NEW.code,
            'affected_evaluations', (SELECT COUNT(*) FROM evaluations WHERE norm_id = NEW.id),
            'timestamp', NOW()
        )::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_norm_content_stale ON norms;
CREATE TRIGGER trigger_norm_content_stale
    AFTER UPDATE OF description, title, official_doc_summary ON norms
    FOR EACH ROW
    EXECUTE FUNCTION mark_evaluations_stale_on_norm_content_change();

COMMENT ON TRIGGER trigger_norm_content_stale ON norms IS 
'Marque les évaluations comme obsolètes quand le contenu de la norme change';


-- ============================================================================
-- PARTIE 4: TRIGGER - Nouvelle norme → Créer évaluations initiales
-- ============================================================================
-- Quand une nouvelle norme est ajoutée, créer des évaluations TBD
-- pour tous les produits des types applicables

CREATE OR REPLACE FUNCTION create_initial_evaluations_for_norm()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Créer des évaluations TBD pour tous les produits actifs
    -- (sera filtré par norm_applicability si elle existe)
    INSERT INTO evaluations (product_id, norm_id, result, evaluated_by, evaluation_date)
    SELECT 
        p.id,
        NEW.id,
        'TBD',
        'auto_norm_insert',
        CURRENT_DATE
    FROM products p
    WHERE p.is_active = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM evaluations e 
          WHERE e.product_id = p.id AND e.norm_id = NEW.id
      )
    ON CONFLICT (product_id, norm_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    IF v_count > 0 THEN
        RAISE NOTICE 'Created % TBD evaluations for new norm %', v_count, NEW.code;
        
        -- Notifier
        PERFORM pg_notify('norm_evaluations_created', jsonb_build_object(
            'norm_id', NEW.id,
            'norm_code', NEW.code,
            'evaluations_created', v_count,
            'timestamp', NOW()
        )::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_norm_create_evaluations ON norms;
CREATE TRIGGER trigger_norm_create_evaluations
    AFTER INSERT ON norms
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_evaluations_for_norm();

COMMENT ON TRIGGER trigger_norm_create_evaluations ON norms IS 
'Crée automatiquement des évaluations TBD pour tous les produits quand une nouvelle norme est ajoutée';


-- ============================================================================
-- PARTIE 5: TRIGGER - Norme supprimée → Cascade propre
-- ============================================================================
-- Quand une norme est supprimée, nettoyer proprement les dépendances

CREATE OR REPLACE FUNCTION cleanup_on_norm_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_affected_products INTEGER[];
BEGIN
    -- Récupérer les produits affectés avant suppression
    SELECT ARRAY_AGG(DISTINCT product_id) INTO v_affected_products
    FROM evaluations
    WHERE norm_id = OLD.id;
    
    -- Supprimer de safe_scoring_definitions
    DELETE FROM safe_scoring_definitions WHERE norm_id = OLD.id;
    
    -- Supprimer de norm_applicability
    DELETE FROM norm_applicability WHERE norm_id = OLD.id;
    
    -- Les evaluations seront supprimées par CASCADE si FK configurée
    -- Sinon les supprimer manuellement
    DELETE FROM evaluations WHERE norm_id = OLD.id;
    
    -- Ajouter les produits affectés à la queue de recalcul
    IF v_affected_products IS NOT NULL AND array_length(v_affected_products, 1) > 0 THEN
        INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
        SELECT unnest(v_affected_products), NOW(), 'norm_deleted'
        ON CONFLICT (product_id) DO UPDATE SET
            triggered_at = NOW(),
            trigger_type = 'norm_deleted';
        
        PERFORM pg_notify('norm_deleted', jsonb_build_object(
            'norm_id', OLD.id,
            'norm_code', OLD.code,
            'affected_products', array_length(v_affected_products, 1),
            'timestamp', NOW()
        )::TEXT);
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_norm_cleanup ON norms;
CREATE TRIGGER trigger_norm_cleanup
    BEFORE DELETE ON norms
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_on_norm_delete();

COMMENT ON TRIGGER trigger_norm_cleanup ON norms IS 
'Nettoie proprement toutes les dépendances quand une norme est supprimée';


-- ============================================================================
-- PARTIE 6: TRIGGER - Applicabilité change → Mettre à jour évaluations
-- ============================================================================
-- Quand norm_applicability change, créer/supprimer les évaluations correspondantes

CREATE OR REPLACE FUNCTION sync_evaluations_on_applicability_change()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_applicable = TRUE) THEN
        -- Norme devient applicable → Créer évaluations TBD manquantes
        INSERT INTO evaluations (product_id, norm_id, result, evaluated_by, evaluation_date)
        SELECT 
            p.id,
            NEW.norm_id,
            'TBD',
            'auto_applicability',
            CURRENT_DATE
        FROM products p
        WHERE p.type_id = NEW.product_type_id
          AND p.is_active = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM evaluations e 
              WHERE e.product_id = p.id AND e.norm_id = NEW.norm_id
          )
        ON CONFLICT (product_id, norm_id) DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        
        IF v_count > 0 THEN
            -- Ajouter à la queue de recalcul
            INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
            SELECT p.id, NOW(), 'applicability_added'
            FROM products p
            WHERE p.type_id = NEW.product_type_id AND p.is_active = TRUE
            ON CONFLICT (product_id) DO UPDATE SET
                triggered_at = NOW(),
                trigger_type = 'applicability_added';
        END IF;
        
    ELSIF TG_OP = 'UPDATE' AND NEW.is_applicable = FALSE AND OLD.is_applicable = TRUE THEN
        -- Norme devient non-applicable → Marquer évaluations comme N/A
        UPDATE evaluations
        SET result = 'N/A',
            why_this_result = COALESCE(why_this_result, '') || ' [Auto: Norm no longer applicable to this product type]',
            evaluated_by = 'auto_applicability',
            evaluation_date = CURRENT_DATE
        WHERE norm_id = NEW.norm_id
          AND product_id IN (
              SELECT id FROM products WHERE type_id = NEW.product_type_id
          );
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        
        IF v_count > 0 THEN
            -- Ajouter à la queue de recalcul
            INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
            SELECT p.id, NOW(), 'applicability_removed'
            FROM products p
            WHERE p.type_id = NEW.product_type_id AND p.is_active = TRUE
            ON CONFLICT (product_id) DO UPDATE SET
                triggered_at = NOW(),
                trigger_type = 'applicability_removed';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_applicability_sync ON norm_applicability;
CREATE TRIGGER trigger_applicability_sync
    AFTER INSERT OR UPDATE ON norm_applicability
    FOR EACH ROW
    EXECUTE FUNCTION sync_evaluations_on_applicability_change();

COMMENT ON TRIGGER trigger_applicability_sync ON norm_applicability IS 
'Synchronise les évaluations quand l applicabilité d une norme change pour un type de produit';


-- ============================================================================
-- PARTIE 7: VUE - État de cohérence des données
-- ============================================================================

CREATE OR REPLACE VIEW v_data_coherence_status AS
SELECT
    'norms' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE id NOT IN (SELECT norm_id FROM safe_scoring_definitions)) as missing_definitions,
    0::bigint as missing_version,
    0::bigint as missing_summary
FROM norms

UNION ALL

SELECT
    'evaluations' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_stale = TRUE) as stale_count,
    COUNT(*) FILTER (WHERE result = 'TBD') as tbd_count,
    0 as unused
FROM evaluations

UNION ALL

SELECT
    'safe_scoring_results' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE calculated_at < NOW() - INTERVAL '7 days') as outdated,
    COUNT(*) FILTER (WHERE note_finale IS NULL) as missing_score,
    0 as unused
FROM safe_scoring_results

UNION ALL

SELECT
    'score_recalculation_queue' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM score_recalculation_queue;

COMMENT ON VIEW v_data_coherence_status IS 'Vue de diagnostic pour vérifier la cohérence des données entre tables';


-- ============================================================================
-- PARTIE 8: FONCTION - Réparer les incohérences
-- ============================================================================

CREATE OR REPLACE FUNCTION repair_data_coherence()
RETURNS JSONB AS $$
DECLARE
    v_fixed_definitions INTEGER := 0;
    v_fixed_evaluations INTEGER := 0;
    v_queued_recalc INTEGER := 0;
BEGIN
    -- 1. Sync norms → safe_scoring_definitions (manquants)
    INSERT INTO safe_scoring_definitions (norm_id, is_essential, is_consumer, is_full)
    SELECT id, is_essential, consumer, "full"
    FROM norms
    WHERE id NOT IN (SELECT norm_id FROM safe_scoring_definitions)
    ON CONFLICT (norm_id) DO NOTHING;
    
    GET DIAGNOSTICS v_fixed_definitions = ROW_COUNT;
    
    -- 2. Créer évaluations manquantes (TBD)
    INSERT INTO evaluations (product_id, norm_id, result, evaluated_by, evaluation_date)
    SELECT p.id, n.id, 'TBD', 'repair_coherence', CURRENT_DATE
    FROM products p
    CROSS JOIN norms n
    WHERE p.is_active = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM evaluations e 
          WHERE e.product_id = p.id AND e.norm_id = n.id
      )
    ON CONFLICT (product_id, norm_id) DO NOTHING;
    
    GET DIAGNOSTICS v_fixed_evaluations = ROW_COUNT;
    
    -- 3. Ajouter produits sans scores récents à la queue
    INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
    SELECT p.id, NOW(), 'repair_coherence'
    FROM products p
    LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
    WHERE p.is_active = TRUE
      AND (ssr.product_id IS NULL OR ssr.calculated_at < NOW() - INTERVAL '7 days')
    ON CONFLICT (product_id) DO UPDATE SET
        triggered_at = NOW(),
        trigger_type = 'repair_coherence';
    
    GET DIAGNOSTICS v_queued_recalc = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'fixed_definitions', v_fixed_definitions,
        'fixed_evaluations', v_fixed_evaluations,
        'queued_recalculations', v_queued_recalc,
        'repaired_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION repair_data_coherence IS 'Répare les incohérences entre norms, evaluations et safe_scoring_results';


-- ============================================================================
-- PARTIE 9: FONCTION - Statistiques MVP Norms
-- ============================================================================

CREATE OR REPLACE FUNCTION get_norms_mvp_status()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_norms', COUNT(*),
        'with_summary', COUNT(*) FILTER (WHERE official_doc_summary IS NOT NULL AND LENGTH(official_doc_summary) > 50),
        'with_official_link', COUNT(*) FILTER (WHERE official_link IS NOT NULL AND official_link != ''),
        'essential_count', COUNT(*) FILTER (WHERE is_essential = TRUE),
        'consumer_count', COUNT(*) FILTER (WHERE consumer = TRUE),
        'by_pillar', jsonb_build_object(
            'S', COUNT(*) FILTER (WHERE pillar = 'S'),
            'A', COUNT(*) FILTER (WHERE pillar = 'A'),
            'F', COUNT(*) FILTER (WHERE pillar = 'F'),
            'E', COUNT(*) FILTER (WHERE pillar = 'E')
        ),
        'by_status', jsonb_build_object(
            'active', COUNT(*) FILTER (WHERE norm_status = 'active' OR norm_status IS NULL),
            'deprecated', COUNT(*) FILTER (WHERE norm_status = 'deprecated'),
            'questionable', COUNT(*) FILTER (WHERE norm_status = 'questionable')
        ),
        'completeness_score', ROUND(
            100.0 * COUNT(*) FILTER (
                WHERE official_doc_summary IS NOT NULL 
                AND LENGTH(official_doc_summary) > 50
                AND official_link IS NOT NULL
            ) / NULLIF(COUNT(*), 0), 1
        ),
        'checked_at', NOW()
    ) INTO v_result
    FROM norms;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_norms_mvp_status IS 'Retourne les statistiques de complétude des normes pour le MVP';


-- ============================================================================
-- PARTIE 10: PERMISSIONS
-- ============================================================================

GRANT SELECT ON v_data_coherence_status TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION repair_data_coherence() TO service_role;
GRANT EXECUTE ON FUNCTION get_norms_mvp_status() TO authenticated, service_role;


-- ============================================================================
-- PARTIE 11: VÉRIFICATION INITIALE
-- ============================================================================

DO $$
DECLARE
    v_coherence JSONB;
    v_mvp_status JSONB;
BEGIN
    -- Exécuter la réparation initiale
    v_coherence := repair_data_coherence();
    v_mvp_status := get_norms_mvp_status();
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration 078 - Norms Cascade Updates';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers créés:';
    RAISE NOTICE '  - trigger_sync_norm_definitions (norms → safe_scoring_definitions)';
    RAISE NOTICE '  - trigger_norm_content_stale (norms → evaluations.is_stale)';
    RAISE NOTICE '  - trigger_norm_create_evaluations (norms INSERT → evaluations TBD)';
    RAISE NOTICE '  - trigger_norm_cleanup (norms DELETE → cascade propre)';
    RAISE NOTICE '  - trigger_applicability_sync (norm_applicability → evaluations)';
    RAISE NOTICE '';
    RAISE NOTICE 'Réparation initiale:';
    RAISE NOTICE '  - Definitions sync: %', v_coherence->>'fixed_definitions';
    RAISE NOTICE '  - Evaluations créées: %', v_coherence->>'fixed_evaluations';
    RAISE NOTICE '  - Recalculs en queue: %', v_coherence->>'queued_recalculations';
    RAISE NOTICE '';
    RAISE NOTICE 'Statut MVP Norms:';
    RAISE NOTICE '  - Total normes: %', v_mvp_status->>'total_norms';
    RAISE NOTICE '  - Avec résumé: %', v_mvp_status->>'with_summary';
    RAISE NOTICE '  - Avec lien officiel: %', v_mvp_status->>'with_official_link';
    RAISE NOTICE '  - Score complétude: %%', v_mvp_status->>'completeness_score';
    RAISE NOTICE '============================================';
END $$;
