-- ============================================================================
-- DIAGNOSTIC: Verification de l'etat du schema
-- ============================================================================
-- Executez cette migration pour voir ce qui existe dans votre base
-- Elle ne modifie RIEN, elle affiche seulement l'etat actuel
-- ============================================================================

DO $$
DECLARE
    v_col RECORD;
    v_table RECORD;
    v_count INTEGER;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DIAGNOSTIC SCHEMA SAFESCORING';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- ========================================
    -- 1. TABLES DE BASE
    -- ========================================
    RAISE NOTICE '--- TABLES DE BASE ---';
    
    FOR v_table IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('products', 'norms', 'evaluations', 'safe_scoring_results', 'safe_scoring_definitions', 'norm_applicability', 'score_recalculation_queue', 'user_setups', 'user_watchlist', 'user_presence', 'physical_incidents')
        ORDER BY table_name
    LOOP
        SELECT COUNT(*) INTO v_count FROM information_schema.columns WHERE table_name = v_table.table_name;
        RAISE NOTICE 'OK: % (% colonnes)', v_table.table_name, v_count;
    END LOOP;
    
    -- Tables manquantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE 'MANQUANT: products';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'norms') THEN
        RAISE NOTICE 'MANQUANT: norms';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluations') THEN
        RAISE NOTICE 'MANQUANT: evaluations';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'safe_scoring_results') THEN
        RAISE NOTICE 'MANQUANT: safe_scoring_results';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'safe_scoring_definitions') THEN
        RAISE NOTICE 'MANQUANT: safe_scoring_definitions';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'score_recalculation_queue') THEN
        RAISE NOTICE 'MANQUANT: score_recalculation_queue';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================
    -- 2. COLONNES PRODUCTS
    -- ========================================
    RAISE NOTICE '--- COLONNES PRODUCTS ---';
    
    FOR v_col IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'products'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: %', v_col.column_name, v_col.data_type;
    END LOOP;
    
    -- Colonnes critiques
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'data_version') THEN
        RAISE NOTICE '  MANQUANT: data_version';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'last_evaluated_at') THEN
        RAISE NOTICE '  MANQUANT: last_evaluated_at';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') THEN
        RAISE NOTICE '  MANQUANT: is_active';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================
    -- 3. COLONNES NORMS
    -- ========================================
    RAISE NOTICE '--- COLONNES NORMS ---';
    
    FOR v_col IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'norms'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: %', v_col.column_name, v_col.data_type;
    END LOOP;
    
    -- Colonnes critiques
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norms' AND column_name = 'is_essential') THEN
        RAISE NOTICE '  MANQUANT: is_essential';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norms' AND column_name = 'consumer') THEN
        RAISE NOTICE '  MANQUANT: consumer';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norms' AND column_name = 'official_doc_summary') THEN
        RAISE NOTICE '  MANQUANT: official_doc_summary';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norms' AND column_name = 'data_version') THEN
        RAISE NOTICE '  MANQUANT: data_version';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================
    -- 4. COLONNES EVALUATIONS
    -- ========================================
    RAISE NOTICE '--- COLONNES EVALUATIONS ---';
    
    FOR v_col IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'evaluations'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: %', v_col.column_name, v_col.data_type;
    END LOOP;
    
    -- Colonnes critiques
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'is_stale') THEN
        RAISE NOTICE '  MANQUANT: is_stale';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'staleness_reason') THEN
        RAISE NOTICE '  MANQUANT: staleness_reason';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================
    -- 5. FONCTIONS
    -- ========================================
    RAISE NOTICE '--- FONCTIONS RPC ---';
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_product_scores') THEN
        RAISE NOTICE '  OK: calculate_product_scores';
    ELSE
        RAISE NOTICE '  MANQUANT: calculate_product_scores';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'recalculate_all_scores') THEN
        RAISE NOTICE '  OK: recalculate_all_scores';
    ELSE
        RAISE NOTICE '  MANQUANT: recalculate_all_scores';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_product_complete') THEN
        RAISE NOTICE '  OK: get_product_complete';
    ELSE
        RAISE NOTICE '  MANQUANT: get_product_complete';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'repair_data_coherence') THEN
        RAISE NOTICE '  OK: repair_data_coherence';
    ELSE
        RAISE NOTICE '  MANQUANT: repair_data_coherence';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_score_recalculation_queue') THEN
        RAISE NOTICE '  OK: process_score_recalculation_queue';
    ELSE
        RAISE NOTICE '  MANQUANT: process_score_recalculation_queue';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================
    -- 6. TRIGGERS
    -- ========================================
    RAISE NOTICE '--- TRIGGERS ---';
    
    FOR v_table IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        AND trigger_name LIKE '%score%' OR trigger_name LIKE '%stale%' OR trigger_name LIKE '%sync%'
        ORDER BY trigger_name
    LOOP
        RAISE NOTICE '  OK: % sur %', v_table.trigger_name, v_table.event_object_table;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- ========================================
    -- 7. COMPTAGES
    -- ========================================
    RAISE NOTICE '--- DONNEES ---';
    
    SELECT COUNT(*) INTO v_count FROM products;
    RAISE NOTICE '  products: % lignes', v_count;
    
    SELECT COUNT(*) INTO v_count FROM norms;
    RAISE NOTICE '  norms: % lignes', v_count;
    
    SELECT COUNT(*) INTO v_count FROM evaluations;
    RAISE NOTICE '  evaluations: % lignes', v_count;
    
    SELECT COUNT(*) INTO v_count FROM safe_scoring_results;
    RAISE NOTICE '  safe_scoring_results: % lignes', v_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FIN DU DIAGNOSTIC';
    RAISE NOTICE '============================================';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERREUR: %', SQLERRM;
END $$;
