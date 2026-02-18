-- ============================================================================
-- MIGRATION 079: Foreign Keys & Referential Integrity
-- SafeScoring - 2026-01-19
-- ============================================================================
-- OBJECTIF: Garantir l'intégrité référentielle entre toutes les tables
-- liées à norms pour un MVP crédible et cohérent.
--
-- Tables concernées:
--   - evaluations.norm_id → norms.id
--   - safe_scoring_definitions.norm_id → norms.id
--   - norm_applicability.norm_id → norms.id
--   - evaluation_history.norm_id → norms.id
-- ============================================================================

-- ============================================================================
-- PARTIE 1: VÉRIFIER ET AJOUTER FK evaluations → norms
-- ============================================================================

DO $$
BEGIN
    -- Vérifier si la FK existe déjà
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_evaluations_norm_id'
        AND table_name = 'evaluations'
    ) THEN
        -- Nettoyer les évaluations orphelines avant d'ajouter la FK
        DELETE FROM evaluations
        WHERE norm_id NOT IN (SELECT id FROM norms);
        
        -- Ajouter la FK avec ON DELETE CASCADE
        ALTER TABLE evaluations
        ADD CONSTRAINT fk_evaluations_norm_id
        FOREIGN KEY (norm_id) REFERENCES norms(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'FK evaluations.norm_id → norms.id créée avec ON DELETE CASCADE';
    ELSE
        RAISE NOTICE 'FK evaluations.norm_id existe déjà';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur FK evaluations: %', SQLERRM;
END $$;


-- ============================================================================
-- PARTIE 2: VÉRIFIER ET AJOUTER FK safe_scoring_definitions → norms
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_scoring_definitions_norm_id'
        AND table_name = 'safe_scoring_definitions'
    ) THEN
        -- Nettoyer les orphelins
        DELETE FROM safe_scoring_definitions
        WHERE norm_id NOT IN (SELECT id FROM norms);
        
        ALTER TABLE safe_scoring_definitions
        ADD CONSTRAINT fk_scoring_definitions_norm_id
        FOREIGN KEY (norm_id) REFERENCES norms(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'FK safe_scoring_definitions.norm_id → norms.id créée';
    ELSE
        RAISE NOTICE 'FK safe_scoring_definitions.norm_id existe déjà';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur FK safe_scoring_definitions: %', SQLERRM;
END $$;


-- ============================================================================
-- PARTIE 3: VÉRIFIER ET AJOUTER FK norm_applicability → norms
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'norm_applicability') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_norm_applicability_norm_id'
            AND table_name = 'norm_applicability'
        ) THEN
            DELETE FROM norm_applicability
            WHERE norm_id NOT IN (SELECT id FROM norms);
            
            ALTER TABLE norm_applicability
            ADD CONSTRAINT fk_norm_applicability_norm_id
            FOREIGN KEY (norm_id) REFERENCES norms(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'FK norm_applicability.norm_id → norms.id créée';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur FK norm_applicability: %', SQLERRM;
END $$;


-- ============================================================================
-- PARTIE 4: VÉRIFIER ET AJOUTER FK evaluation_history → norms
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'evaluation_history') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_evaluation_history_norm_id'
            AND table_name = 'evaluation_history'
        ) THEN
            DELETE FROM evaluation_history
            WHERE norm_id NOT IN (SELECT id FROM norms);
            
            ALTER TABLE evaluation_history
            ADD CONSTRAINT fk_evaluation_history_norm_id
            FOREIGN KEY (norm_id) REFERENCES norms(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'FK evaluation_history.norm_id → norms.id créée';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur FK evaluation_history: %', SQLERRM;
END $$;


-- ============================================================================
-- PARTIE 5: CONTRAINTE UNIQUE sur evaluations (product_id, norm_id)
-- ============================================================================
-- Empêche les doublons d'évaluations

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'evaluations_product_norm_unique'
    ) THEN
        -- Supprimer les doublons en gardant le plus récent
        DELETE FROM evaluations e1
        USING evaluations e2
        WHERE e1.product_id = e2.product_id
          AND e1.norm_id = e2.norm_id
          AND e1.id < e2.id;
        
        ALTER TABLE evaluations
        ADD CONSTRAINT evaluations_product_norm_unique
        UNIQUE (product_id, norm_id);
        
        RAISE NOTICE 'Contrainte UNIQUE (product_id, norm_id) ajoutée sur evaluations';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur contrainte unique evaluations: %', SQLERRM;
END $$;


-- ============================================================================
-- PARTIE 6: CONTRAINTE UNIQUE sur safe_scoring_definitions (norm_id)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'safe_scoring_definitions_norm_id_key'
    ) THEN
        -- Supprimer les doublons
        DELETE FROM safe_scoring_definitions s1
        USING safe_scoring_definitions s2
        WHERE s1.norm_id = s2.norm_id
          AND s1.id < s2.id;
        
        ALTER TABLE safe_scoring_definitions
        ADD CONSTRAINT safe_scoring_definitions_norm_id_key
        UNIQUE (norm_id);
        
        RAISE NOTICE 'Contrainte UNIQUE (norm_id) ajoutée sur safe_scoring_definitions';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur contrainte unique safe_scoring_definitions: %', SQLERRM;
END $$;


-- ============================================================================
-- PARTIE 7: INDEX pour performances des jointures
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_evaluations_norm_id ON evaluations(norm_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_product_norm ON evaluations(product_id, norm_id);
CREATE INDEX IF NOT EXISTS idx_scoring_definitions_norm ON safe_scoring_definitions(norm_id);
CREATE INDEX IF NOT EXISTS idx_norms_code ON norms(code);
CREATE INDEX IF NOT EXISTS idx_norms_pillar ON norms(pillar);
CREATE INDEX IF NOT EXISTS idx_norms_essential ON norms(is_essential) WHERE is_essential = TRUE;


-- ============================================================================
-- PARTIE 8: VUE - Vérification intégrité référentielle
-- ============================================================================

CREATE OR REPLACE VIEW v_referential_integrity_check AS
SELECT
    'evaluations_orphan_norms' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'FAIL' END as status
FROM evaluations e
LEFT JOIN norms n ON e.norm_id = n.id
WHERE n.id IS NULL

UNION ALL

SELECT
    'evaluations_orphan_products' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'FAIL' END as status
FROM evaluations e
LEFT JOIN products p ON e.product_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT
    'scoring_definitions_orphan' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'FAIL' END as status
FROM safe_scoring_definitions sd
LEFT JOIN norms n ON sd.norm_id = n.id
WHERE n.id IS NULL

UNION ALL

SELECT
    'norms_without_definitions' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARN' END as status
FROM norms n
LEFT JOIN safe_scoring_definitions sd ON n.id = sd.norm_id
WHERE sd.norm_id IS NULL

UNION ALL

SELECT
    'products_without_evaluations' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) < 10 THEN 'OK' ELSE 'WARN' END as status
FROM products p
WHERE p.is_active = TRUE
  AND NOT EXISTS (SELECT 1 FROM evaluations e WHERE e.product_id = p.id);

COMMENT ON VIEW v_referential_integrity_check IS 'Vérifie l intégrité référentielle entre les tables principales';


-- ============================================================================
-- PARTIE 9: FONCTION - Rapport d'intégrité complet
-- ============================================================================

CREATE OR REPLACE FUNCTION get_integrity_report()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'timestamp', NOW(),
        'checks', (
            SELECT jsonb_agg(jsonb_build_object(
                'check', check_type,
                'count', count,
                'status', status
            ))
            FROM v_referential_integrity_check
        ),
        'summary', jsonb_build_object(
            'total_norms', (SELECT COUNT(*) FROM norms),
            'total_products', (SELECT COUNT(*) FROM products WHERE is_active = TRUE),
            'total_evaluations', (SELECT COUNT(*) FROM evaluations),
            'total_scoring_definitions', (SELECT COUNT(*) FROM safe_scoring_definitions),
            'coverage_pct', ROUND(
                100.0 * (SELECT COUNT(DISTINCT product_id) FROM evaluations) /
                NULLIF((SELECT COUNT(*) FROM products WHERE is_active = TRUE), 0), 1
            )
        ),
        'foreign_keys', (
            SELECT jsonb_agg(jsonb_build_object(
                'table', tc.table_name,
                'constraint', tc.constraint_name,
                'references', ccu.table_name
            ))
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND (tc.table_name IN ('evaluations', 'safe_scoring_definitions', 'norm_applicability')
                   OR ccu.table_name = 'norms')
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_integrity_report() TO authenticated, service_role;


-- ============================================================================
-- PARTIE 10: VÉRIFICATION FINALE
-- ============================================================================

DO $$
DECLARE
    v_report JSONB;
    v_check RECORD;
BEGIN
    v_report := get_integrity_report();
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration 079 - Foreign Keys & Integrity';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Résumé:';
    RAISE NOTICE '  - Normes: %', v_report->'summary'->>'total_norms';
    RAISE NOTICE '  - Produits actifs: %', v_report->'summary'->>'total_products';
    RAISE NOTICE '  - Évaluations: %', v_report->'summary'->>'total_evaluations';
    RAISE NOTICE '  - Couverture: %%', v_report->'summary'->>'coverage_pct';
    RAISE NOTICE '';
    RAISE NOTICE 'Vérifications d intégrité:';
    
    FOR v_check IN SELECT * FROM v_referential_integrity_check LOOP
        RAISE NOTICE '  - %: % (%)', v_check.check_type, v_check.status, v_check.count;
    END LOOP;
    
    RAISE NOTICE '============================================';
END $$;
