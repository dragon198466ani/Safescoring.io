-- SafeScoring - Advanced Supabase Optimizations
-- Based on _MASTER_MIGRATION.sql schema
-- Table products: id, slug, name, description, short_description, url, type_id, brand_id, specs, scores, risk_score, security_status, price_eur, price_details, country_origin, excluded_countries, headquarters, year_founded, created_at, updated_at, last_security_scan, last_monthly_update
-- Table safe_scoring_results: note_finale, score_s, score_a, score_f, score_e (NOT pilier_*)

-- 1. INDEX pour products (no verified column exists)
CREATE INDEX IF NOT EXISTS idx_products_slug
ON products(slug);

CREATE INDEX IF NOT EXISTS idx_products_type
ON products(type_id);

CREATE INDEX IF NOT EXISTS idx_products_brand
ON products(brand_id);

-- 2. INDEX pour evaluations (result is YES/YESp/NO/TBD/N/A, not pass/fail)
CREATE INDEX IF NOT EXISTS idx_evaluations_product
ON evaluations(product_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_yes
ON evaluations(product_id) WHERE result = 'YES';

CREATE INDEX IF NOT EXISTS idx_evaluations_no
ON evaluations(product_id) WHERE result = 'NO';

-- 3. INDEX pour safe_scoring_results
CREATE INDEX IF NOT EXISTS idx_scores_product_date
ON safe_scoring_results(product_id, calculated_at DESC);

-- 4. INDEX pour product_type_mapping
CREATE INDEX IF NOT EXISTS idx_type_mapping_product
ON product_type_mapping(product_id);

CREATE INDEX IF NOT EXISTS idx_type_mapping_type
ON product_type_mapping(type_id);

-- 5. INDEX pour norm_applicability
CREATE INDEX IF NOT EXISTS idx_applicability_type
ON norm_applicability(type_id);

-- 6. VIEW pour produits avec scores
-- Aliase score_s -> pilier_s pour compatibilité frontend
DROP VIEW IF EXISTS v_products_with_scores;
CREATE VIEW v_products_with_scores AS
SELECT DISTINCT ON (p.id)
  p.id AS product_id,
  p.name AS product_name,
  p.slug,
  p.type_id,
  p.url,
  p.short_description,
  p.updated_at,
  COALESCE(ssr.note_finale, 0) AS note_finale,
  COALESCE(ssr.score_s, 0) AS pilier_s,
  COALESCE(ssr.score_a, 0) AS pilier_a,
  COALESCE(ssr.score_f, 0) AS pilier_f,
  COALESCE(ssr.score_e, 0) AS pilier_e,
  COALESCE(ssr.calculated_at, p.updated_at) AS last_update
FROM products p
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
ORDER BY p.id, ssr.calculated_at DESC NULLS LAST;

-- 7. VIEW pour comptage types
DROP VIEW IF EXISTS v_product_type_counts;
CREATE VIEW v_product_type_counts AS
SELECT
  pt.id AS type_id,
  pt.code,
  pt.name AS type_name,
  pt.category,
  pt.definition,
  COUNT(DISTINCT ptm.product_id)::INTEGER AS product_count
FROM product_types pt
LEFT JOIN product_type_mapping ptm ON pt.id = ptm.type_id
GROUP BY pt.id, pt.code, pt.name, pt.category, pt.definition;

-- 8. INDEX pour incident_product_impact (table de jonction security_incidents)
CREATE INDEX IF NOT EXISTS idx_incident_impact_product
ON incident_product_impact(product_id);

CREATE INDEX IF NOT EXISTS idx_incident_impact_incident
ON incident_product_impact(incident_id);

-- 9. INDEX pour security_incidents
CREATE INDEX IF NOT EXISTS idx_incidents_date
ON security_incidents(incident_date DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_severity
ON security_incidents(severity);

CREATE INDEX IF NOT EXISTS idx_incidents_published
ON security_incidents(id) WHERE is_published = true;

-- 10. INDEX pour score_history (historique des scores)
CREATE INDEX IF NOT EXISTS idx_score_history_product
ON score_history(product_id);

CREATE INDEX IF NOT EXISTS idx_score_history_product_date
ON score_history(product_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_score_history_date
ON score_history(recorded_at DESC);

-- 11. INDEX pour user_corrections (corrections utilisateurs)
CREATE INDEX IF NOT EXISTS idx_corrections_product
ON user_corrections(product_id);

CREATE INDEX IF NOT EXISTS idx_corrections_user
ON user_corrections(user_id);

CREATE INDEX IF NOT EXISTS idx_corrections_status
ON user_corrections(status);

CREATE INDEX IF NOT EXISTS idx_corrections_user_status
ON user_corrections(user_id, status);

CREATE INDEX IF NOT EXISTS idx_corrections_pending
ON user_corrections(id) WHERE status = 'pending';

-- 12. INDEX pour user_setups (configurations utilisateurs)
CREATE INDEX IF NOT EXISTS idx_setups_user
ON user_setups(user_id);

CREATE INDEX IF NOT EXISTS idx_setups_updated
ON user_setups(updated_at DESC);

-- 13. INDEX pour user_reputation (si existe)
CREATE INDEX IF NOT EXISTS idx_reputation_user
ON user_reputation(user_id);

-- 14. VIEW pour incidents par produit
DROP VIEW IF EXISTS v_product_incidents;
CREATE VIEW v_product_incidents AS
SELECT
  ipi.product_id,
  si.id AS incident_id,
  si.incident_id AS incident_code,
  si.title,
  si.description,
  si.incident_type,
  si.severity,
  si.incident_date,
  si.funds_lost_usd,
  si.status,
  si.response_quality,
  si.source_urls,
  si.is_published
FROM incident_product_impact ipi
JOIN security_incidents si ON ipi.incident_id = si.id
WHERE si.is_published = true
ORDER BY si.incident_date DESC;

-- 15. VIEW pour historique scores simplifié
DROP VIEW IF EXISTS v_score_history_summary;
CREATE VIEW v_score_history_summary AS
SELECT
  sh.product_id,
  sh.recorded_at,
  sh.safe_score,
  sh.score_s,
  sh.score_a,
  sh.score_f,
  sh.score_e,
  sh.consumer_score,
  sh.essential_score,
  sh.score_change,
  sh.change_reason
FROM score_history sh
ORDER BY sh.product_id, sh.recorded_at DESC;

-- 16. VIEW pour corrections en attente
DROP VIEW IF EXISTS v_pending_corrections;
CREATE VIEW v_pending_corrections AS
SELECT
  uc.id,
  uc.product_id,
  uc.norm_id,
  uc.user_id,
  uc.field_corrected,
  uc.original_value,
  uc.suggested_value,
  uc.correction_reason,
  uc.created_at,
  p.name AS product_name,
  n.code AS norm_code
FROM user_corrections uc
LEFT JOIN products p ON uc.product_id = p.id
LEFT JOIN norms n ON uc.norm_id = n.id
WHERE uc.status = 'pending'
ORDER BY uc.created_at DESC;

-- 17. Mise a jour statistiques
ANALYZE products;
ANALYZE evaluations;
ANALYZE safe_scoring_results;
ANALYZE product_types;
ANALYZE product_type_mapping;
ANALYZE norm_applicability;
ANALYZE incident_product_impact;
ANALYZE security_incidents;
ANALYZE score_history;
ANALYZE user_corrections;
ANALYZE user_setups;
