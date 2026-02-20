-- ============================================================================
-- MIGRATION 077: Real-time Score Recalculation
-- SafeScoring - 2026-01-19
-- ============================================================================
-- OBJECTIF: "Tout doit être mis à jour en temps réel"
-- 
-- Cette migration ajoute:
-- 1. Fonction calculate_product_scores (manquante, appelée par l'admin)
-- 2. Trigger pour recalculer automatiquement quand une évaluation change
-- 3. Notification temps réel via pg_notify
-- ============================================================================

-- ============================================================================
-- 1. FONCTION: Calculer les scores d'un produit
-- ============================================================================
-- Formule: Score = (YES + YESp) / (YES + YESp + NO) * 100
-- N/A et TBD sont exclus du calcul

CREATE OR REPLACE FUNCTION calculate_product_scores(p_product_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_total_yes INTEGER := 0;
    v_total_no INTEGER := 0;
    v_total_na INTEGER := 0;
    v_total_tbd INTEGER := 0;
    v_score_s DECIMAL(5,2);
    v_score_a DECIMAL(5,2);
    v_score_f DECIMAL(5,2);
    v_score_e DECIMAL(5,2);
    v_note_finale DECIMAL(5,2);
    v_old_score DECIMAL(5,2);
BEGIN
    -- Récupérer l'ancien score pour comparaison
    SELECT note_finale INTO v_old_score
    FROM safe_scoring_results
    WHERE product_id = p_product_id;

    -- Calculer les statistiques globales
    SELECT
        COUNT(*) FILTER (WHERE result IN ('YES', 'YESp')),
        COUNT(*) FILTER (WHERE result = 'NO'),
        COUNT(*) FILTER (WHERE result = 'N/A'),
        COUNT(*) FILTER (WHERE result = 'TBD')
    INTO v_total_yes, v_total_no, v_total_na, v_total_tbd
    FROM evaluations
    WHERE product_id = p_product_id;

    -- Calculer le score par pilier
    SELECT
        CASE WHEN SUM(CASE WHEN n.pillar = 'S' AND e.result NOT IN ('N/A', 'TBD') THEN 1 ELSE 0 END) > 0
             THEN ROUND(100.0 * SUM(CASE WHEN n.pillar = 'S' AND e.result IN ('YES', 'YESp') THEN 1 ELSE 0 END) /
                  SUM(CASE WHEN n.pillar = 'S' AND e.result NOT IN ('N/A', 'TBD') THEN 1 ELSE 0 END), 1)
             ELSE NULL END,
        CASE WHEN SUM(CASE WHEN n.pillar = 'A' AND e.result NOT IN ('N/A', 'TBD') THEN 1 ELSE 0 END) > 0
             THEN ROUND(100.0 * SUM(CASE WHEN n.pillar = 'A' AND e.result IN ('YES', 'YESp') THEN 1 ELSE 0 END) /
                  SUM(CASE WHEN n.pillar = 'A' AND e.result NOT IN ('N/A', 'TBD') THEN 1 ELSE 0 END), 1)
             ELSE NULL END,
        CASE WHEN SUM(CASE WHEN n.pillar = 'F' AND e.result NOT IN ('N/A', 'TBD') THEN 1 ELSE 0 END) > 0
             THEN ROUND(100.0 * SUM(CASE WHEN n.pillar = 'F' AND e.result IN ('YES', 'YESp') THEN 1 ELSE 0 END) /
                  SUM(CASE WHEN n.pillar = 'F' AND e.result NOT IN ('N/A', 'TBD') THEN 1 ELSE 0 END), 1)
             ELSE NULL END,
        CASE WHEN SUM(CASE WHEN n.pillar = 'E' AND e.result NOT IN ('N/A', 'TBD') THEN 1 ELSE 0 END) > 0
             THEN ROUND(100.0 * SUM(CASE WHEN n.pillar = 'E' AND e.result IN ('YES', 'YESp') THEN 1 ELSE 0 END) /
                  SUM(CASE WHEN n.pillar = 'E' AND e.result NOT IN ('N/A', 'TBD') THEN 1 ELSE 0 END), 1)
             ELSE NULL END
    INTO v_score_s, v_score_a, v_score_f, v_score_e
    FROM evaluations e
    JOIN norms n ON e.norm_id = n.id
    WHERE e.product_id = p_product_id;

    -- Calculer le score global (moyenne des piliers non-null)
    SELECT ROUND(AVG(score), 1)
    INTO v_note_finale
    FROM (
        SELECT v_score_s AS score WHERE v_score_s IS NOT NULL
        UNION ALL SELECT v_score_a WHERE v_score_a IS NOT NULL
        UNION ALL SELECT v_score_f WHERE v_score_f IS NOT NULL
        UNION ALL SELECT v_score_e WHERE v_score_e IS NOT NULL
    ) scores;

    -- Upsert dans safe_scoring_results
    INSERT INTO safe_scoring_results (
        product_id,
        note_finale,
        score_s, score_a, score_f, score_e,
        total_norms_evaluated,
        total_yes, total_no, total_na, total_tbd,
        calculated_at,
        last_evaluation_date
    ) VALUES (
        p_product_id,
        v_note_finale,
        v_score_s, v_score_a, v_score_f, v_score_e,
        v_total_yes + v_total_no + v_total_na + v_total_tbd,
        v_total_yes, v_total_no, v_total_na, v_total_tbd,
        NOW(),
        NOW()
    )
    ON CONFLICT (product_id) DO UPDATE SET
        note_finale = EXCLUDED.note_finale,
        score_s = EXCLUDED.score_s,
        score_a = EXCLUDED.score_a,
        score_f = EXCLUDED.score_f,
        score_e = EXCLUDED.score_e,
        total_norms_evaluated = EXCLUDED.total_norms_evaluated,
        total_yes = EXCLUDED.total_yes,
        total_no = EXCLUDED.total_no,
        total_na = EXCLUDED.total_na,
        total_tbd = EXCLUDED.total_tbd,
        calculated_at = NOW(),
        last_evaluation_date = NOW();

    -- Mettre à jour le timestamp du produit
    UPDATE products
    SET last_evaluated_at = NOW()
    WHERE id = p_product_id;

    -- Construire le résultat
    v_result := jsonb_build_object(
        'product_id', p_product_id,
        'note_finale', v_note_finale,
        'score_s', v_score_s,
        'score_a', v_score_a,
        'score_f', v_score_f,
        'score_e', v_score_e,
        'total_yes', v_total_yes,
        'total_no', v_total_no,
        'total_na', v_total_na,
        'total_tbd', v_total_tbd,
        'old_score', v_old_score,
        'score_change', v_note_finale - COALESCE(v_old_score, v_note_finale),
        'calculated_at', NOW()
    );

    -- Notifier les clients en temps réel
    PERFORM pg_notify('score_updates', v_result::TEXT);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_product_scores IS 'Calcule et met à jour les scores SAFE pour un produit. Notifie les clients via pg_notify.';


-- ============================================================================
-- 2. FONCTION: Recalculer tous les scores
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_scores()
RETURNS JSONB AS $$
DECLARE
    v_product RECORD;
    v_count INTEGER := 0;
    v_errors INTEGER := 0;
BEGIN
    FOR v_product IN SELECT id FROM products WHERE is_active = true LOOP
        BEGIN
            PERFORM calculate_product_scores(v_product.id);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE NOTICE 'Error calculating scores for product %: %', v_product.id, SQLERRM;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', v_count,
        'errors', v_errors,
        'total', v_count + v_errors,
        'completed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all_scores IS 'Recalcule les scores pour tous les produits actifs.';


-- ============================================================================
-- 3. TRIGGER: Recalculer automatiquement quand une évaluation change
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_on_evaluation()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id INTEGER;
BEGIN
    -- Déterminer le product_id affecté
    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
    ELSE
        v_product_id := NEW.product_id;
    END IF;

    -- Recalculer les scores de manière asynchrone via pg_notify
    -- Le recalcul immédiat pourrait ralentir les insertions en masse
    -- On utilise un délai via une table de queue
    
    INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
    VALUES (v_product_id, NOW(), TG_OP)
    ON CONFLICT (product_id) DO UPDATE SET
        triggered_at = NOW(),
        trigger_type = TG_OP;

    -- Notifier qu'un recalcul est nécessaire
    PERFORM pg_notify('score_recalc_needed', jsonb_build_object(
        'product_id', v_product_id,
        'operation', TG_OP,
        'triggered_at', NOW()
    )::TEXT);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 4. TABLE: Queue de recalcul (pour éviter les recalculs multiples)
-- ============================================================================

CREATE TABLE IF NOT EXISTS score_recalculation_queue (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_type VARCHAR(10),
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_recalc_queue_pending
ON score_recalculation_queue(triggered_at)
WHERE status = 'pending';

COMMENT ON TABLE score_recalculation_queue IS 'Queue pour les recalculs de scores différés. Évite les recalculs multiples lors d insertions en masse.';


-- ============================================================================
-- 5. FONCTION: Traiter la queue de recalcul
-- ============================================================================

CREATE OR REPLACE FUNCTION process_score_recalculation_queue(
    p_batch_size INTEGER DEFAULT 10,
    p_min_age_seconds INTEGER DEFAULT 2
)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_processed INTEGER := 0;
BEGIN
    -- Traiter les items en attente depuis au moins p_min_age_seconds
    FOR v_item IN
        SELECT product_id
        FROM score_recalculation_queue
        WHERE status = 'pending'
          AND triggered_at < NOW() - (p_min_age_seconds || ' seconds')::INTERVAL
        ORDER BY triggered_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Marquer comme en cours
        UPDATE score_recalculation_queue
        SET status = 'processing'
        WHERE product_id = v_item.product_id;

        -- Recalculer
        PERFORM calculate_product_scores(v_item.product_id);

        -- Marquer comme terminé
        UPDATE score_recalculation_queue
        SET status = 'completed',
            processed_at = NOW()
        WHERE product_id = v_item.product_id;

        v_processed := v_processed + 1;
    END LOOP;

    -- Nettoyer les anciens items terminés (> 1 heure)
    DELETE FROM score_recalculation_queue
    WHERE status = 'completed'
      AND processed_at < NOW() - INTERVAL '1 hour';

    RETURN jsonb_build_object(
        'processed', v_processed,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 6. CRÉER LE TRIGGER SUR EVALUATIONS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_evaluation_score_recalc ON evaluations;
CREATE TRIGGER trigger_evaluation_score_recalc
    AFTER INSERT OR UPDATE OR DELETE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_on_evaluation();

COMMENT ON TRIGGER trigger_evaluation_score_recalc ON evaluations IS 
'Déclenche un recalcul des scores quand une évaluation est modifiée. Utilise une queue pour éviter les recalculs multiples.';


-- ============================================================================
-- 7. FONCTION: Recalcul immédiat (pour les cas urgents)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_product_score_immediate(p_product_id INTEGER)
RETURNS JSONB AS $$
BEGIN
    -- Supprimer de la queue si présent
    DELETE FROM score_recalculation_queue WHERE product_id = p_product_id;
    
    -- Recalculer immédiatement
    RETURN calculate_product_scores(p_product_id);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 8. PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION calculate_product_scores(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION recalculate_all_scores() TO service_role;
GRANT EXECUTE ON FUNCTION process_score_recalculation_queue(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION recalculate_product_score_immediate(INTEGER) TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON score_recalculation_queue TO service_role;


-- ============================================================================
-- 9. VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 077 - Real-time Score Recalculation installée';
    RAISE NOTICE '';
    RAISE NOTICE 'Nouvelles fonctionnalités:';
    RAISE NOTICE '  - calculate_product_scores(product_id) : Calcule les scores d un produit';
    RAISE NOTICE '  - recalculate_all_scores() : Recalcule tous les produits';
    RAISE NOTICE '  - Trigger automatique sur evaluations';
    RAISE NOTICE '  - Queue de recalcul pour éviter les doublons';
    RAISE NOTICE '  - Notifications pg_notify pour le temps réel';
    RAISE NOTICE '';
    RAISE NOTICE 'Pour traiter la queue manuellement:';
    RAISE NOTICE '  SELECT process_score_recalculation_queue(10, 2);';
END $$;
