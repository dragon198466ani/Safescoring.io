-- ============================================================
-- Performance Indexes for SafeScoring
-- Optimized for common query patterns
-- ============================================================

-- 1. Products table indexes
-- ==========================

-- Primary search patterns
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_type_id ON products(type_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Composite index for filtered queries
CREATE INDEX IF NOT EXISTS idx_products_type_created ON products(type_id, created_at DESC);

-- 2. Safe Scoring Results indexes
-- ================================

-- Score lookups
CREATE INDEX IF NOT EXISTS idx_ssr_product_id ON safe_scoring_results(product_id);
CREATE INDEX IF NOT EXISTS idx_ssr_note_finale ON safe_scoring_results(note_finale DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ssr_calculated_at ON safe_scoring_results(calculated_at DESC);

-- Composite for ranked queries
CREATE INDEX IF NOT EXISTS idx_ssr_product_score ON safe_scoring_results(product_id, note_finale DESC NULLS LAST);

-- 3. Product Types indexes
-- =========================

CREATE INDEX IF NOT EXISTS idx_product_types_code ON product_types(code);
CREATE INDEX IF NOT EXISTS idx_product_types_category ON product_types(category);
CREATE INDEX IF NOT EXISTS idx_product_types_is_hardware ON product_types(is_hardware) WHERE is_hardware = true;

-- 4. Norms and Evaluations indexes
-- ==================================

CREATE INDEX IF NOT EXISTS idx_norms_code ON norms(code);
CREATE INDEX IF NOT EXISTS idx_norms_pillar ON norms(pillar);
CREATE INDEX IF NOT EXISTS idx_norms_pillar_code ON norms(pillar, code);

CREATE INDEX IF NOT EXISTS idx_evaluations_product_norm ON evaluations(product_id, norm_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_result ON evaluations(result);

-- 5. Security Incidents indexes
-- ==============================

CREATE INDEX IF NOT EXISTS idx_incidents_published ON security_incidents(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON security_incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON security_incidents(status);

-- Composite for filtered incident queries
CREATE INDEX IF NOT EXISTS idx_incidents_pub_severity ON security_incidents(is_published, severity, incident_date DESC);

-- Incident product impact
CREATE INDEX IF NOT EXISTS idx_ipi_product ON incident_product_impact(product_id);
CREATE INDEX IF NOT EXISTS idx_ipi_incident ON incident_product_impact(incident_id);

-- 6. User Corrections indexes
-- ============================

CREATE INDEX IF NOT EXISTS idx_corrections_user ON user_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_corrections_product ON user_corrections(product_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON user_corrections(status);
CREATE INDEX IF NOT EXISTS idx_corrections_created ON user_corrections(created_at DESC);

-- Composite for user dashboard
CREATE INDEX IF NOT EXISTS idx_corrections_user_status ON user_corrections(user_id, status, created_at DESC);

-- 7. User Reputation indexes
-- ===========================

CREATE INDEX IF NOT EXISTS idx_reputation_user ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_level ON user_reputation(reputation_level);
CREATE INDEX IF NOT EXISTS idx_reputation_points ON user_reputation(points_earned DESC NULLS LAST);

-- Leaderboard query optimization
CREATE INDEX IF NOT EXISTS idx_reputation_leaderboard ON user_reputation(points_earned DESC NULLS LAST, reputation_level);

-- 8. Norm Applicability indexes
-- ==============================

CREATE INDEX IF NOT EXISTS idx_applicability_type ON norm_applicability(product_type_id);
CREATE INDEX IF NOT EXISTS idx_applicability_norm ON norm_applicability(norm_id);
CREATE INDEX IF NOT EXISTS idx_applicability_applicable ON norm_applicability(is_applicable) WHERE is_applicable = true;

-- Composite for type-specific norm lookups
CREATE INDEX IF NOT EXISTS idx_applicability_type_applicable ON norm_applicability(product_type_id, is_applicable);

-- 9. Full-text search indexes (if using PostgreSQL FTS)
-- ======================================================

-- Product name search
CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(short_description, '')));

-- Incident title search
CREATE INDEX IF NOT EXISTS idx_incidents_fts ON security_incidents USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- 10. Partial indexes for common filters
-- ========================================

-- Only active products (if is_active column exists)
-- CREATE INDEX IF NOT EXISTS idx_products_active ON products(id) WHERE is_active = true;

-- Only published incidents
CREATE INDEX IF NOT EXISTS idx_incidents_published_only ON security_incidents(incident_date DESC) WHERE is_published = true;

-- Only pending corrections
CREATE INDEX IF NOT EXISTS idx_corrections_pending ON user_corrections(created_at DESC) WHERE status = 'pending';

-- ============================================================
-- Analyze tables after creating indexes
-- ============================================================

ANALYZE products;
ANALYZE safe_scoring_results;
ANALYZE product_types;
ANALYZE norms;
ANALYZE evaluations;
ANALYZE security_incidents;
ANALYZE incident_product_impact;
ANALYZE user_corrections;
ANALYZE user_reputation;
ANALYZE norm_applicability;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON INDEX idx_products_name_trgm IS 'Trigram index for fuzzy product name search';
COMMENT ON INDEX idx_ssr_product_score IS 'Composite index for ranked product queries';
COMMENT ON INDEX idx_reputation_leaderboard IS 'Optimized for leaderboard queries';
