-- ============================================================
-- FIX TRIGGER - VERSION SIMPLE (copier-coller tout le bloc)
-- ============================================================

-- Étape 1: Lister les triggers
SELECT tgname FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'products' AND NOT tgisinternal;

-- Étape 2: Supprimer les triggers communs (exécuter un par un)
DROP TRIGGER IF EXISTS update_piliers ON products;
DROP TRIGGER IF EXISTS track_pilier_changes ON products;
DROP TRIGGER IF EXISTS products_updated ON products;
DROP TRIGGER IF EXISTS recalculate_scores ON products;
DROP TRIGGER IF EXISTS pilier_trigger ON products;
DROP TRIGGER IF EXISTS update_pilier_scores ON products;

-- Étape 3: Lister les fonctions avec pilier_s
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%pilier_s%';

-- Étape 4: Supprimer les fonctions problématiques (adapter selon résultat étape 3)
-- DROP FUNCTION IF EXISTS nom_fonction() CASCADE;

-- Étape 5: Test (doit retourner une ligne sans erreur)
UPDATE products SET safe_priority_pillar = safe_priority_pillar WHERE id = 1 RETURNING id;
