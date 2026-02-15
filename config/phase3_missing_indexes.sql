-- ============================================================
-- Phase 3: Missing Performance Indexes
-- Tables identified from API query analysis that lack indexes
-- Run this after performance_indexes.sql
-- ============================================================

-- 1. Score History (heavily queried by product pages)
-- ===================================================

CREATE INDEX IF NOT EXISTS idx_score_history_product
  ON score_history(product_id);
CREATE INDEX IF NOT EXISTS idx_score_history_recorded
  ON score_history(recorded_at DESC);
-- Composite for product detail page (get score evolution for a product)
CREATE INDEX IF NOT EXISTS idx_score_history_product_date
  ON score_history(product_id, recorded_at DESC);

-- 2. Claim Requests (admin dashboard + claim verification)
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_claims_status
  ON claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claims_email
  ON claim_requests(email);
CREATE INDEX IF NOT EXISTS idx_claims_product
  ON claim_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_claims_created
  ON claim_requests(created_at DESC);
-- Composite for admin dashboard (pending claims sorted by date)
CREATE INDEX IF NOT EXISTS idx_claims_status_created
  ON claim_requests(status, created_at DESC);

-- 3. Newsletter Subscribers
-- =========================

CREATE INDEX IF NOT EXISTS idx_newsletter_email
  ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_created
  ON newsletter_subscribers(created_at DESC);

-- 4. Product Type Mapping (many-to-many, used on every product query)
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_ptm_product
  ON product_type_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_ptm_type
  ON product_type_mapping(product_type_id);
-- Composite for primary type lookups
CREATE INDEX IF NOT EXISTS idx_ptm_product_primary
  ON product_type_mapping(product_id, is_primary DESC);

-- 5. Product Compatibility (compatibility matrix queries)
-- =======================================================

CREATE INDEX IF NOT EXISTS idx_compat_product_a
  ON product_compatibility(product_a_id);
CREATE INDEX IF NOT EXISTS idx_compat_product_b
  ON product_compatibility(product_b_id);

-- 6. Task Queue (background job processing)
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_queue_status
  ON task_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created
  ON task_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_status_priority
  ON task_queue(status, priority DESC, created_at ASC);

-- 7. Product Views (analytics)
-- ============================

CREATE INDEX IF NOT EXISTS idx_views_product
  ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_views_date
  ON product_views(viewed_at DESC);
-- Composite for product analytics (views per product over time)
CREATE INDEX IF NOT EXISTS idx_views_product_date
  ON product_views(product_id, viewed_at DESC);

-- 8. User Setups (user portfolios)
-- =================================

CREATE INDEX IF NOT EXISTS idx_setups_user
  ON user_setups(user_id);

-- ============================================================
-- Analyze newly indexed tables
-- ============================================================

ANALYZE score_history;
ANALYZE claim_requests;
ANALYZE newsletter_subscribers;
ANALYZE product_type_mapping;
ANALYZE product_compatibility;
ANALYZE task_queue;
ANALYZE product_views;
ANALYZE user_setups;
