-- ============================================================================
-- MIGRATION 066: Critical Fixes from Audit
-- SafeScoring - 2026-01-15
-- ============================================================================
-- Fixes:
-- 1. Add missing users.role column (RLS broken without it)
-- 2. Add missing FK indexes for performance
-- 3. Fix soft delete RLS on user_memories
-- 4. Add session cleanup trigger
-- 5. Add admin email index for RLS performance
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING users.role COLUMN
-- ============================================================================
-- RLS policies reference this column but it doesn't exist!

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Set admins (update with your admin emails)
UPDATE users SET role = 'admin'
WHERE email IN (
    'admin@safescoring.io',
    'alex@safescoring.io'
) AND role != 'admin';

-- Index for admin lookups in RLS
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_admin_email ON users(email) WHERE role = 'admin';

COMMENT ON COLUMN users.role IS 'User role: user, admin, moderator. Used in RLS policies.';


-- ============================================================================
-- 2. ADD MISSING FK INDEXES
-- ============================================================================
-- Foreign key columns without indexes cause slow JOINs

-- evaluations.norm_id - heavily used in JOINs
CREATE INDEX IF NOT EXISTS idx_evaluations_norm_id ON evaluations(norm_id);

-- alert_user_matches.user_id - used in WHERE clauses
CREATE INDEX IF NOT EXISTS idx_alert_user_matches_user_id ON alert_user_matches(user_id);

-- claim_requests.product_id - used in lookups
CREATE INDEX IF NOT EXISTS idx_claim_requests_product_id ON claim_requests(product_id);

-- scrape_cache.product_id - used in cleanup queries
CREATE INDEX IF NOT EXISTS idx_scrape_cache_product_id ON scrape_cache(product_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_evaluations_product_result
ON evaluations(product_id, result, evaluation_date DESC);

CREATE INDEX IF NOT EXISTS idx_score_history_product_recent
ON score_history(product_id, recorded_at DESC);


-- ============================================================================
-- 3. FIX SOFT DELETE RLS ON user_memories
-- ============================================================================
-- Current RLS doesn't filter is_deleted = FALSE

-- Drop old policy if exists
DROP POLICY IF EXISTS users_own_memories ON user_memories;

-- Create new policy that enforces soft delete
CREATE POLICY users_own_memories ON user_memories
    FOR ALL
    USING (auth.uid() = user_id AND is_deleted = FALSE)
    WITH CHECK (auth.uid() = user_id);

-- Also fix conversations policy
DROP POLICY IF EXISTS users_own_conversations ON user_conversations;
CREATE POLICY users_own_conversations ON user_conversations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 4. SESSION CLEANUP TRIGGER
-- ============================================================================
-- Automatically delete expired sessions to prevent table bloat

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete sessions expired more than 1 day ago (batch cleanup)
    DELETE FROM sessions
    WHERE expires < NOW() - INTERVAL '1 day'
    AND ctid IN (
        SELECT ctid FROM sessions
        WHERE expires < NOW() - INTERVAL '1 day'
        LIMIT 100  -- Limit to avoid long locks
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new session insert (cleanup old ones periodically)
DROP TRIGGER IF EXISTS trigger_cleanup_sessions ON sessions;
CREATE TRIGGER trigger_cleanup_sessions
    AFTER INSERT ON sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_sessions();


-- ============================================================================
-- 5. CORRECTIONS RATE LIMITING
-- ============================================================================
-- Prevent spam: max 10 corrections per product per user per day

CREATE OR REPLACE FUNCTION check_correction_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    correction_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO correction_count
    FROM corrections
    WHERE user_id = NEW.user_id
      AND product_id = NEW.product_id
      AND created_at > NOW() - INTERVAL '24 hours';

    IF correction_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: max 10 corrections per product per day';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if corrections table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'corrections') THEN
        DROP TRIGGER IF EXISTS trigger_correction_rate_limit ON corrections;
        CREATE TRIGGER trigger_correction_rate_limit
            BEFORE INSERT ON corrections
            FOR EACH ROW
            EXECUTE FUNCTION check_correction_rate_limit();
    END IF;
END $$;


-- ============================================================================
-- 6. HARD PAGINATION LIMITS (stored in comments for app reference)
-- ============================================================================

COMMENT ON TABLE products IS
'Products table. API enforces max 100 items per request.
Pagination: use limit/offset with limit <= 100.';

COMMENT ON TABLE evaluations IS
'Evaluations table. One evaluation per (product_id, norm_id) pair per day.
Index: idx_evaluations_product_result for common queries.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Check users.role exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        RAISE EXCEPTION 'Migration failed: users.role column not created';
    END IF;

    RAISE NOTICE 'Migration 066 completed successfully';
END $$;
