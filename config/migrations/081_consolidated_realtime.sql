-- ============================================================================
-- MIGRATION 081: Consolidated Real-time Updates
-- SafeScoring - 2026-01-19
-- ============================================================================
-- Cette migration consolide 068, 077, 078 en une seule migration
-- avec vérification des prérequis et gestion des colonnes manquantes
-- ============================================================================

-- ============================================================================
-- PARTIE 0: VÉRIFICATION DES PRÉREQUIS
-- ============================================================================

DO $$
BEGIN
    -- Vérifier que les tables de base existent
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE EXCEPTION 'Table products manquante';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'norms') THEN
        RAISE EXCEPTION 'Table norms manquante';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluations') THEN
        RAISE EXCEPTION 'Table evaluations manquante';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'safe_scoring_results') THEN
        RAISE EXCEPTION 'Table safe_scoring_results manquante';
    END IF;
    
    RAISE NOTICE 'Prerequis OK - Tables de base presentes';
END $$;


-- ============================================================================
-- PARTIE 1: COLONNES MANQUANTES SUR PRODUCTS
-- ============================================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS data_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN products.data_version IS 'Incremented when product data changes significantly';
COMMENT ON COLUMN products.data_updated_at IS 'Timestamp of last product data modification';
COMMENT ON COLUMN products.last_evaluated_at IS 'Timestamp of last AI evaluation run';

CREATE INDEX IF NOT EXISTS idx_products_needs_eval
ON products(last_evaluated_at, data_updated_at)
WHERE last_evaluated_at IS NULL OR last_evaluated_at < data_updated_at;


-- ============================================================================
-- PARTIE 2: COLONNES MANQUANTES SUR NORMS
-- ============================================================================

ALTER TABLE norms
ADD COLUMN IF NOT EXISTS data_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS summary_version INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_essential BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consumer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "full" BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS norm_status VARCHAR(20) DEFAULT 'active';

COMMENT ON COLUMN norms.data_version IS 'Incremented when norm requirements change';
COMMENT ON COLUMN norms.data_updated_at IS 'Timestamp of last norm modification';
COMMENT ON COLUMN norms.last_summarized_at IS 'Timestamp of AI summary generation';


-- ============================================================================
-- PARTIE 3: COLONNES MANQUANTES SUR EVALUATIONS
-- ============================================================================

ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS product_version_at_eval INTEGER,
ADD COLUMN IF NOT EXISTS norm_version_at_eval INTEGER,
ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS staleness_reason VARCHAR(50);

COMMENT ON COLUMN evaluations.is_stale IS 'True if product or norm changed since evaluation';
COMMENT ON COLUMN evaluations.staleness_reason IS 'Why evaluation is stale: product_changed, norm_changed';

CREATE INDEX IF NOT EXISTS idx_evaluations_stale
ON evaluations(is_stale, product_id, norm_id)
WHERE is_stale = TRUE;


-- ============================================================================
-- PARTIE 4: TABLE QUEUE DE RECALCUL
-- ============================================================================

CREATE TABLE IF NOT EXISTS score_recalculation_queue (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_type VARCHAR(30),
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_recalc_queue_pending
ON score_recalculation_queue(triggered_at)
WHERE status = 'pending';

COMMENT ON TABLE score_recalculation_queue IS 'Queue pour les recalculs de scores differes';


-- ============================================================================
-- PARTIE 5: FONCTION - Calculer les scores d un produit
-- ============================================================================

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
    -- Recuperer ancien score
    SELECT note_finale INTO v_old_score
    FROM safe_scoring_results
    WHERE product_id = p_product_id;

    -- Calculer statistiques globales
    SELECT
        COUNT(*) FILTER (WHERE result IN ('YES', 'YESp')),
        COUNT(*) FILTER (WHERE result = 'NO'),
        COUNT(*) FILTER (WHERE result = 'N/A'),
        COUNT(*) FILTER (WHERE result = 'TBD')
    INTO v_total_yes, v_total_no, v_total_na, v_total_tbd
    FROM evaluations
    WHERE product_id = p_product_id;

    -- Calculer score par pilier
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

    -- Score global (moyenne des piliers non-null)
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
        product_id, note_finale,
        score_s, score_a, score_f, score_e,
        total_norms_evaluated,
        total_yes, total_no, total_na, total_tbd,
        calculated_at, last_evaluation_date
    ) VALUES (
        p_product_id, v_note_finale,
        v_score_s, v_score_a, v_score_f, v_score_e,
        v_total_yes + v_total_no + v_total_na + v_total_tbd,
        v_total_yes, v_total_no, v_total_na, v_total_tbd,
        NOW(), NOW()
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

    -- Mettre a jour timestamp produit
    UPDATE products
    SET last_evaluated_at = NOW()
    WHERE id = p_product_id;

    -- Construire resultat
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

    -- Notifier clients temps reel
    PERFORM pg_notify('score_updates', v_result::TEXT);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PARTIE 6: FONCTION - Recalculer tous les scores
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


-- ============================================================================
-- PARTIE 7: TRIGGER - Recalcul sur modification evaluation
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_on_evaluation()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
    ELSE
        v_product_id := NEW.product_id;
    END IF;

    INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
    VALUES (v_product_id, NOW(), TG_OP)
    ON CONFLICT (product_id) DO UPDATE SET
        triggered_at = NOW(),
        trigger_type = TG_OP;

    PERFORM pg_notify('score_recalc_needed', jsonb_build_object(
        'product_id', v_product_id,
        'operation', TG_OP,
        'triggered_at', NOW()
    )::TEXT);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_evaluation_score_recalc ON evaluations;
CREATE TRIGGER trigger_evaluation_score_recalc
    AFTER INSERT OR UPDATE OR DELETE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_on_evaluation();


-- ============================================================================
-- PARTIE 8: FONCTION - Traiter la queue de recalcul
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
    FOR v_item IN
        SELECT product_id
        FROM score_recalculation_queue
        WHERE status = 'pending'
          AND triggered_at < NOW() - (p_min_age_seconds || ' seconds')::INTERVAL
        ORDER BY triggered_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE score_recalculation_queue
        SET status = 'processing'
        WHERE product_id = v_item.product_id;

        PERFORM calculate_product_scores(v_item.product_id);

        UPDATE score_recalculation_queue
        SET status = 'completed', processed_at = NOW()
        WHERE product_id = v_item.product_id;

        v_processed := v_processed + 1;
    END LOOP;

    DELETE FROM score_recalculation_queue
    WHERE status = 'completed'
      AND processed_at < NOW() - INTERVAL '1 hour';

    RETURN jsonb_build_object('processed', v_processed, 'timestamp', NOW());
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PARTIE 9: TRIGGER - Marquer evaluations stale quand produit change
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_evaluations_stale_on_product_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.data_version IS DISTINCT FROM NEW.data_version THEN
        UPDATE evaluations
        SET is_stale = TRUE, staleness_reason = 'product_changed'
        WHERE product_id = NEW.id AND is_stale = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_change_stale ON products;
CREATE TRIGGER trigger_product_change_stale
    AFTER UPDATE OF data_version ON products
    FOR EACH ROW
    EXECUTE FUNCTION mark_evaluations_stale_on_product_change();


-- ============================================================================
-- PARTIE 10: TRIGGER - Marquer evaluations stale quand norme change
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_evaluations_stale_on_norm_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.data_version IS DISTINCT FROM NEW.data_version THEN
        UPDATE evaluations
        SET is_stale = TRUE, staleness_reason = 'norm_changed'
        WHERE norm_id = NEW.id AND is_stale = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_norm_change_stale ON norms;
CREATE TRIGGER trigger_norm_change_stale
    AFTER UPDATE OF data_version ON norms
    FOR EACH ROW
    EXECUTE FUNCTION mark_evaluations_stale_on_norm_change();


-- ============================================================================
-- PARTIE 11: TRIGGER - Sync norms vers safe_scoring_definitions
-- ============================================================================

-- Verifier que safe_scoring_definitions existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'safe_scoring_definitions') THEN
        CREATE TABLE safe_scoring_definitions (
            norm_id INTEGER PRIMARY KEY REFERENCES norms(id) ON DELETE CASCADE,
            is_essential BOOLEAN DEFAULT FALSE,
            is_consumer BOOLEAN DEFAULT FALSE,
            is_full BOOLEAN DEFAULT TRUE
        );
    END IF;
END $$;

CREATE OR REPLACE FUNCTION sync_norm_to_scoring_definitions()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO safe_scoring_definitions (norm_id, is_essential, is_consumer, is_full)
    VALUES (NEW.id, COALESCE(NEW.is_essential, FALSE), COALESCE(NEW.consumer, FALSE), COALESCE(NEW."full", TRUE))
    ON CONFLICT (norm_id) DO UPDATE SET
        is_essential = EXCLUDED.is_essential,
        is_consumer = EXCLUDED.is_consumer,
        is_full = EXCLUDED.is_full;

    IF OLD.is_essential IS DISTINCT FROM NEW.is_essential
       OR OLD.consumer IS DISTINCT FROM NEW.consumer THEN
        INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
        SELECT DISTINCT e.product_id, NOW(), 'norm_classification'
        FROM evaluations e WHERE e.norm_id = NEW.id
        ON CONFLICT (product_id) DO UPDATE SET
            triggered_at = NOW(), trigger_type = 'norm_classification';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_norm_definitions ON norms;
CREATE TRIGGER trigger_sync_norm_definitions
    AFTER INSERT OR UPDATE OF is_essential, consumer ON norms
    FOR EACH ROW
    EXECUTE FUNCTION sync_norm_to_scoring_definitions();


-- ============================================================================
-- PARTIE 12: VUE - Etat de coherence
-- ============================================================================

CREATE OR REPLACE VIEW v_data_coherence_status AS
SELECT
    'norms' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE id NOT IN (SELECT norm_id FROM safe_scoring_definitions)) as missing_definitions,
    0::bigint as col3,
    0::bigint as col4
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


-- ============================================================================
-- PARTIE 13: FONCTION - Reparer les incoherences
-- ============================================================================

CREATE OR REPLACE FUNCTION repair_data_coherence()
RETURNS JSONB AS $$
DECLARE
    v_fixed_definitions INTEGER := 0;
    v_fixed_evaluations INTEGER := 0;
    v_queued_recalc INTEGER := 0;
BEGIN
    -- Sync norms vers safe_scoring_definitions
    INSERT INTO safe_scoring_definitions (norm_id, is_essential, is_consumer, is_full)
    SELECT id, COALESCE(is_essential, FALSE), COALESCE(consumer, FALSE), COALESCE("full", TRUE)
    FROM norms
    WHERE id NOT IN (SELECT norm_id FROM safe_scoring_definitions)
    ON CONFLICT (norm_id) DO NOTHING;
    GET DIAGNOSTICS v_fixed_definitions = ROW_COUNT;

    -- Creer evaluations manquantes
    INSERT INTO evaluations (product_id, norm_id, result, evaluated_by, evaluation_date)
    SELECT p.id, n.id, 'TBD', 'repair_coherence', CURRENT_DATE
    FROM products p
    CROSS JOIN norms n
    WHERE COALESCE(p.is_active, TRUE) = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM evaluations e 
          WHERE e.product_id = p.id AND e.norm_id = n.id
      )
    ON CONFLICT (product_id, norm_id) DO NOTHING;
    GET DIAGNOSTICS v_fixed_evaluations = ROW_COUNT;

    -- Ajouter produits sans scores recents a la queue
    INSERT INTO score_recalculation_queue (product_id, triggered_at, trigger_type)
    SELECT p.id, NOW(), 'repair_coherence'
    FROM products p
    LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
    WHERE COALESCE(p.is_active, TRUE) = TRUE
      AND (ssr.product_id IS NULL OR ssr.calculated_at < NOW() - INTERVAL '7 days')
    ON CONFLICT (product_id) DO UPDATE SET
        triggered_at = NOW(), trigger_type = 'repair_coherence';
    GET DIAGNOSTICS v_queued_recalc = ROW_COUNT;

    RETURN jsonb_build_object(
        'fixed_definitions', v_fixed_definitions,
        'fixed_evaluations', v_fixed_evaluations,
        'queued_recalculations', v_queued_recalc,
        'repaired_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- PARTIE 14: PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION calculate_product_scores(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION recalculate_all_scores() TO service_role;
GRANT EXECUTE ON FUNCTION process_score_recalculation_queue(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION repair_data_coherence() TO service_role;
GRANT SELECT ON v_data_coherence_status TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_recalculation_queue TO service_role;


-- ============================================================================
-- PARTIE 15: VERIFICATION FINALE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration 081 - Consolidated Real-time Updates';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Colonnes ajoutees:';
    RAISE NOTICE '  - products: data_version, last_evaluated_at, is_active';
    RAISE NOTICE '  - norms: data_version, is_essential, consumer';
    RAISE NOTICE '  - evaluations: is_stale, staleness_reason';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables creees:';
    RAISE NOTICE '  - score_recalculation_queue';
    RAISE NOTICE '';
    RAISE NOTICE 'Fonctions creees:';
    RAISE NOTICE '  - calculate_product_scores(product_id)';
    RAISE NOTICE '  - recalculate_all_scores()';
    RAISE NOTICE '  - process_score_recalculation_queue(batch, delay)';
    RAISE NOTICE '  - repair_data_coherence()';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers crees:';
    RAISE NOTICE '  - trigger_evaluation_score_recalc';
    RAISE NOTICE '  - trigger_product_change_stale';
    RAISE NOTICE '  - trigger_norm_change_stale';
    RAISE NOTICE '  - trigger_sync_norm_definitions';
    RAISE NOTICE '============================================';
END $$;
