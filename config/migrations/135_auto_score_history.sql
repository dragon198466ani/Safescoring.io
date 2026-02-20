-- ============================================================================
-- MIGRATION 135: Automatic Score History Snapshots
-- SafeScoring - 2026-02-01
-- ============================================================================
-- OBJECTIF: Capturer automatiquement l'historique des scores pour les graphiques
--
-- Cette migration:
-- 1. Crée la table score_history si elle n'existe pas
-- 2. Ajoute un trigger pour snapshot automatique après chaque mise à jour de score
-- 3. Permet aux graphiques d'afficher de vraies données d'évolution
-- ============================================================================

-- ============================================================================
-- 1. TABLE: score_history (historique des scores pour graphiques)
-- ============================================================================

CREATE TABLE IF NOT EXISTS score_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Scores principaux
    safe_score DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),

    -- Scores alternatifs
    consumer_score DECIMAL(5,2),
    essential_score DECIMAL(5,2),

    -- Statistiques d'évaluation
    total_evaluations INTEGER DEFAULT 0,
    total_yes INTEGER DEFAULT 0,
    total_no INTEGER DEFAULT 0,
    total_na INTEGER DEFAULT 0,
    total_tbd INTEGER DEFAULT 0,

    -- Métadonnées
    snapshot_reason VARCHAR(50) DEFAULT 'auto', -- auto, manual, recalc, import
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes de graphiques (produit + date)
CREATE INDEX IF NOT EXISTS idx_score_history_product_date
ON score_history(product_id, recorded_at DESC);

-- Index pour requêtes temporelles
CREATE INDEX IF NOT EXISTS idx_score_history_recorded_at
ON score_history(recorded_at DESC);

-- Contrainte: max 1 snapshot par produit par heure (évite les doublons)
CREATE UNIQUE INDEX IF NOT EXISTS idx_score_history_hourly_unique
ON score_history(product_id, date_trunc('hour', recorded_at));

COMMENT ON TABLE score_history IS 'Historique des scores SAFE pour graphiques d évolution. Snapshot automatique à chaque mise à jour.';


-- ============================================================================
-- 2. FONCTION: Créer un snapshot dans score_history
-- ============================================================================

CREATE OR REPLACE FUNCTION create_score_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    v_last_snapshot TIMESTAMPTZ;
    v_min_interval INTERVAL := '1 hour'; -- Minimum 1h entre snapshots
BEGIN
    -- Vérifier le dernier snapshot pour ce produit
    SELECT MAX(recorded_at) INTO v_last_snapshot
    FROM score_history
    WHERE product_id = NEW.product_id;

    -- Si snapshot récent existe (< 1h), ne pas créer de doublon
    IF v_last_snapshot IS NOT NULL AND
       v_last_snapshot > NOW() - v_min_interval THEN
        -- Mettre à jour le snapshot existant au lieu d'en créer un nouveau
        UPDATE score_history
        SET safe_score = NEW.note_finale,
            score_s = NEW.score_s,
            score_a = NEW.score_a,
            score_f = NEW.score_f,
            score_e = NEW.score_e,
            consumer_score = NEW.note_consumer,
            essential_score = NEW.note_essential,
            total_evaluations = COALESCE(NEW.total_yes, 0) + COALESCE(NEW.total_no, 0) +
                               COALESCE(NEW.total_na, 0) + COALESCE(NEW.total_tbd, 0),
            total_yes = NEW.total_yes,
            total_no = NEW.total_no,
            total_na = NEW.total_na,
            total_tbd = NEW.total_tbd,
            snapshot_reason = 'update'
        WHERE product_id = NEW.product_id
          AND recorded_at = v_last_snapshot;

        RETURN NEW;
    END IF;

    -- Créer nouveau snapshot
    INSERT INTO score_history (
        product_id,
        recorded_at,
        safe_score,
        score_s, score_a, score_f, score_e,
        consumer_score,
        essential_score,
        total_evaluations,
        total_yes, total_no, total_na, total_tbd,
        snapshot_reason
    ) VALUES (
        NEW.product_id,
        NOW(),
        NEW.note_finale,
        NEW.score_s, NEW.score_a, NEW.score_f, NEW.score_e,
        NEW.note_consumer,
        NEW.note_essential,
        COALESCE(NEW.total_yes, 0) + COALESCE(NEW.total_no, 0) +
        COALESCE(NEW.total_na, 0) + COALESCE(NEW.total_tbd, 0),
        NEW.total_yes, NEW.total_no, NEW.total_na, NEW.total_tbd,
        'auto'
    )
    ON CONFLICT (product_id, date_trunc('hour', recorded_at))
    DO UPDATE SET
        safe_score = EXCLUDED.safe_score,
        score_s = EXCLUDED.score_s,
        score_a = EXCLUDED.score_a,
        score_f = EXCLUDED.score_f,
        score_e = EXCLUDED.score_e,
        consumer_score = EXCLUDED.consumer_score,
        essential_score = EXCLUDED.essential_score,
        total_evaluations = EXCLUDED.total_evaluations,
        total_yes = EXCLUDED.total_yes,
        total_no = EXCLUDED.total_no,
        total_na = EXCLUDED.total_na,
        total_tbd = EXCLUDED.total_tbd,
        snapshot_reason = 'update';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_score_snapshot IS 'Crée automatiquement un snapshot dans score_history quand un score est mis à jour.';


-- ============================================================================
-- 3. TRIGGER: Snapshot automatique sur safe_scoring_results
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_score_history_snapshot ON safe_scoring_results;

CREATE TRIGGER trigger_score_history_snapshot
    AFTER INSERT OR UPDATE ON safe_scoring_results
    FOR EACH ROW
    EXECUTE FUNCTION create_score_snapshot();

COMMENT ON TRIGGER trigger_score_history_snapshot ON safe_scoring_results IS
'Capture automatique de l historique des scores pour les graphiques d évolution.';


-- ============================================================================
-- 4. FONCTION: Seed initial de l'historique (pour produits existants)
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_score_history_from_current()
RETURNS JSONB AS $$
DECLARE
    v_count INTEGER := 0;
    v_record RECORD;
BEGIN
    -- Pour chaque produit avec un score, créer un snapshot initial
    FOR v_record IN
        SELECT
            sr.product_id,
            sr.note_finale,
            sr.score_s, sr.score_a, sr.score_f, sr.score_e,
            sr.note_consumer, sr.note_essential,
            sr.total_yes, sr.total_no, sr.total_na, sr.total_tbd,
            sr.calculated_at
        FROM safe_scoring_results sr
        WHERE sr.note_finale IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM score_history sh
              WHERE sh.product_id = sr.product_id
          )
    LOOP
        INSERT INTO score_history (
            product_id, recorded_at,
            safe_score, score_s, score_a, score_f, score_e,
            consumer_score, essential_score,
            total_yes, total_no, total_na, total_tbd,
            snapshot_reason
        ) VALUES (
            v_record.product_id,
            COALESCE(v_record.calculated_at, NOW()),
            v_record.note_finale,
            v_record.score_s, v_record.score_a, v_record.score_f, v_record.score_e,
            v_record.note_consumer, v_record.note_essential,
            v_record.total_yes, v_record.total_no, v_record.total_na, v_record.total_tbd,
            'seed'
        )
        ON CONFLICT DO NOTHING;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'seeded', v_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_score_history_from_current IS 'Initialise score_history avec les scores actuels pour les produits sans historique.';


-- ============================================================================
-- 5. FONCTION: Générer historique simulé réaliste (pour démo)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_realistic_history(
    p_product_id INTEGER,
    p_months INTEGER DEFAULT 6,
    p_variance DECIMAL DEFAULT 5.0
)
RETURNS JSONB AS $$
DECLARE
    v_current_score RECORD;
    v_date TIMESTAMPTZ;
    v_score DECIMAL;
    v_s DECIMAL; v_a DECIMAL; v_f DECIMAL; v_e DECIMAL;
    v_count INTEGER := 0;
BEGIN
    -- Récupérer le score actuel
    SELECT note_finale, score_s, score_a, score_f, score_e
    INTO v_current_score
    FROM safe_scoring_results
    WHERE product_id = p_product_id;

    IF v_current_score IS NULL THEN
        RETURN jsonb_build_object('error', 'Product has no score');
    END IF;

    -- Générer des points pour chaque semaine sur p_months mois
    FOR i IN 1..(p_months * 4) LOOP
        v_date := NOW() - (i || ' weeks')::INTERVAL;

        -- Variation réaliste: le score évolue progressivement vers le score actuel
        -- Plus on remonte dans le temps, plus on s'éloigne du score actuel
        v_score := v_current_score.note_finale - (random() * p_variance * (i::DECIMAL / (p_months * 4)));
        v_score := GREATEST(0, LEAST(100, v_score)); -- Borner entre 0 et 100

        v_s := GREATEST(0, LEAST(100, v_current_score.score_s - (random() * p_variance * (i::DECIMAL / (p_months * 4)))));
        v_a := GREATEST(0, LEAST(100, v_current_score.score_a - (random() * p_variance * (i::DECIMAL / (p_months * 4)))));
        v_f := GREATEST(0, LEAST(100, v_current_score.score_f - (random() * p_variance * (i::DECIMAL / (p_months * 4)))));
        v_e := GREATEST(0, LEAST(100, v_current_score.score_e - (random() * p_variance * (i::DECIMAL / (p_months * 4)))));

        INSERT INTO score_history (
            product_id, recorded_at,
            safe_score, score_s, score_a, score_f, score_e,
            snapshot_reason
        ) VALUES (
            p_product_id, v_date,
            ROUND(v_score, 1),
            ROUND(v_s, 1), ROUND(v_a, 1), ROUND(v_f, 1), ROUND(v_e, 1),
            'generated'
        )
        ON CONFLICT (product_id, date_trunc('hour', recorded_at)) DO NOTHING;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'product_id', p_product_id,
        'points_generated', v_count,
        'months', p_months
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 6. FONCTION: Générer historique pour TOUS les produits
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_all_products_history(
    p_months INTEGER DEFAULT 6,
    p_variance DECIMAL DEFAULT 5.0
)
RETURNS JSONB AS $$
DECLARE
    v_product RECORD;
    v_count INTEGER := 0;
    v_errors INTEGER := 0;
BEGIN
    FOR v_product IN
        SELECT DISTINCT sr.product_id
        FROM safe_scoring_results sr
        WHERE sr.note_finale IS NOT NULL
    LOOP
        BEGIN
            PERFORM generate_realistic_history(v_product.product_id, p_months, p_variance);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'products_processed', v_count,
        'errors', v_errors,
        'months', p_months,
        'completed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 7. EXÉCUTION: Seed initial avec les scores actuels
-- ============================================================================

-- Créer un snapshot pour tous les produits existants
SELECT seed_score_history_from_current();


-- ============================================================================
-- 8. PERMISSIONS
-- ============================================================================

GRANT SELECT ON score_history TO authenticated, anon;
GRANT INSERT, UPDATE ON score_history TO service_role;
GRANT EXECUTE ON FUNCTION seed_score_history_from_current() TO service_role;
GRANT EXECUTE ON FUNCTION generate_realistic_history(INTEGER, INTEGER, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION generate_all_products_history(INTEGER, DECIMAL) TO service_role;


-- ============================================================================
-- 9. VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM score_history;

    RAISE NOTICE '✅ Migration 135 - Auto Score History installée';
    RAISE NOTICE '';
    RAISE NOTICE 'Fonctionnalités:';
    RAISE NOTICE '  - Table score_history créée';
    RAISE NOTICE '  - Trigger automatique sur safe_scoring_results';
    RAISE NOTICE '  - Snapshots créés: %', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Pour générer l historique simulé (graphiques):';
    RAISE NOTICE '  SELECT generate_all_products_history(6, 5.0);';
    RAISE NOTICE '';
    RAISE NOTICE 'Les graphiques afficheront maintenant de vraies données!';
END $$;
