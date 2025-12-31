-- ============================================
-- SAFESCORING - Enable Supabase Realtime
-- ============================================
-- Ce script active les publications Realtime sur les tables
-- nécessaires pour la synchronisation frontend/backend
--
-- Exécuter dans Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query
-- ============================================

-- 1. Activer Realtime sur la table safe_scoring_results
ALTER PUBLICATION supabase_realtime ADD TABLE safe_scoring_results;

-- 2. Activer Realtime sur la table products
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- 3. Activer Realtime sur la table evaluations
ALTER PUBLICATION supabase_realtime ADD TABLE evaluations;

-- Vérifier les tables actives dans Realtime
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================
-- IMPORTANT: Après avoir exécuté ce script,
-- vérifier dans Dashboard > Database > Replication
-- que les tables sont bien listées
-- ============================================
