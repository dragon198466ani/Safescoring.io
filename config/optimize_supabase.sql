-- SafeScoring - Optimisation Supabase
-- Exécuter dans Supabase SQL Editor

-- 1. INDEX POUR EVALUATIONS
CREATE INDEX IF NOT EXISTS idx_evaluations_product_norm ON evaluations(product_id, norm_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_result ON evaluations(result);
CREATE INDEX IF NOT EXISTS idx_evaluations_product_id ON evaluations(product_id);

-- 2. INDEX POUR SAFE_SCORING_RESULTS
CREATE INDEX IF NOT EXISTS idx_safe_scoring_calculated ON safe_scoring_results(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_safe_scoring_product_date ON safe_scoring_results(product_id, calculated_at DESC);

-- 3. INDEX POUR PRODUCTS
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_type_id ON products(type_id);

-- 4. INDEX POUR NORMS
CREATE INDEX IF NOT EXISTS idx_norms_pillar ON norms(pillar);
CREATE INDEX IF NOT EXISTS idx_norms_code ON norms(code);

-- 5. INDEX POUR PRODUCT_TYPE_MAPPING
CREATE INDEX IF NOT EXISTS idx_product_type_mapping_product ON product_type_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_product_type_mapping_type ON product_type_mapping(type_id);

-- 6. INDEX POUR NORM_APPLICABILITY
CREATE INDEX IF NOT EXISTS idx_norm_applicability_type_norm ON norm_applicability(type_id, norm_id);

-- 7. STATISTIQUES POUR L'OPTIMISEUR
ANALYZE products;
ANALYZE evaluations;
ANALYZE safe_scoring_results;
ANALYZE norms;
ANALYZE product_types;
ANALYZE product_type_mapping;
ANALYZE norm_applicability;

-- 8. VERIFICATION DES INDEX
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('products', 'evaluations', 'safe_scoring_results', 'norms', 'product_types')
ORDER BY tablename, indexname;
