-- ============================================================
-- User Watchlist Table
-- For tracking favorite products and receiving score alerts
-- ============================================================

-- Create user_watchlist table
CREATE TABLE IF NOT EXISTS user_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Alert settings
    alert_on_score_change BOOLEAN DEFAULT true,
    alert_threshold INTEGER DEFAULT 5, -- Alert if score changes by more than this %
    alert_email BOOLEAN DEFAULT false,

    -- Tracking
    score_at_add INTEGER, -- Score when product was added to watchlist
    notes TEXT, -- User's personal notes about this product

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_alert_at TIMESTAMPTZ,

    -- Ensure unique user-product pairs
    CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_product ON user_watchlist(product_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_alert_enabled ON user_watchlist(alert_on_score_change)
    WHERE alert_on_score_change = true;
CREATE INDEX IF NOT EXISTS idx_watchlist_created ON user_watchlist(created_at DESC);

-- RLS Policies
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;

-- Users can only see their own watchlist
CREATE POLICY "Users can view own watchlist" ON user_watchlist
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist" ON user_watchlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist" ON user_watchlist
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own watchlist" ON user_watchlist
    FOR DELETE USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access watchlist" ON user_watchlist
    FOR ALL USING (true);

-- ============================================================
-- Score change tracking for alerts
-- ============================================================

-- Table to store score history for change detection
CREATE TABLE IF NOT EXISTS product_score_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    score_s INTEGER,
    score_a INTEGER,
    score_f INTEGER,
    score_e INTEGER,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_history_product ON product_score_history(product_id, recorded_at DESC);

-- RLS for score history (read-only for users)
ALTER TABLE product_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read score history" ON product_score_history
    FOR SELECT USING (true);

CREATE POLICY "Service role can write score history" ON product_score_history
    FOR ALL USING (true);

-- ============================================================
-- Helper function to check for score changes and send alerts
-- ============================================================

CREATE OR REPLACE FUNCTION check_watchlist_alerts()
RETURNS TABLE(
    user_id UUID,
    product_id BIGINT,
    product_name TEXT,
    old_score INTEGER,
    new_score INTEGER,
    change_percent NUMERIC,
    alert_email BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_scores AS (
        SELECT DISTINCT ON (ssr.product_id)
            ssr.product_id,
            ROUND(ssr.note_finale)::INTEGER AS current_score
        FROM safe_scoring_results ssr
        ORDER BY ssr.product_id, ssr.calculated_at DESC
    )
    SELECT
        w.user_id,
        w.product_id,
        p.name AS product_name,
        w.score_at_add AS old_score,
        ls.current_score AS new_score,
        CASE
            WHEN w.score_at_add > 0 THEN
                ABS(((ls.current_score - w.score_at_add)::NUMERIC / w.score_at_add) * 100)
            ELSE 0
        END AS change_percent,
        w.alert_email
    FROM user_watchlist w
    JOIN products p ON p.id = w.product_id
    JOIN latest_scores ls ON ls.product_id = w.product_id
    WHERE w.alert_on_score_change = true
    AND ls.current_score IS NOT NULL
    AND w.score_at_add IS NOT NULL
    AND ABS(ls.current_score - w.score_at_add) >= w.alert_threshold
    AND (w.last_alert_at IS NULL OR w.last_alert_at < NOW() - INTERVAL '24 hours');
END;
$$;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE user_watchlist IS 'User favorite products watchlist with alert settings';
COMMENT ON COLUMN user_watchlist.alert_threshold IS 'Minimum score change (points) to trigger alert';
COMMENT ON COLUMN user_watchlist.score_at_add IS 'Product score when added to watchlist, for change tracking';
