-- ============================================
-- USER PRESENCE TABLE FOR REAL-TIME MAP
-- Tracks online users for DataFast-style live map
-- ============================================

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User identification (can be authenticated or anonymous)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,  -- For anonymous users or multiple tabs

    -- Location for map display
    country VARCHAR(2),  -- ISO 2-letter code
    city TEXT,
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),

    -- Activity tracking
    current_page TEXT,  -- e.g., '/products', '/map', '/compare'
    current_action TEXT,  -- e.g., 'viewing', 'comparing', 'researching'

    -- Device info
    device_type TEXT DEFAULT 'desktop',  -- 'desktop', 'mobile', 'tablet'

    -- Avatar customization (for anonymous users)
    avatar_seed INTEGER DEFAULT 1,

    -- Display name (account name for authenticated users, generated pseudonym for anonymous)
    pseudonym TEXT DEFAULT 'Anonymous',

    -- Timestamps
    connected_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),

    -- Unique constraint: one entry per session
    UNIQUE(session_id)
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_presence_country ON user_presence(country);
CREATE INDEX IF NOT EXISTS idx_presence_current_page ON user_presence(current_page);

-- Enable real-time for this table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- RLS Policies
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Anyone can read presence (for map display)
DROP POLICY IF EXISTS "Anyone can view presence" ON user_presence;
CREATE POLICY "Anyone can view presence" ON user_presence
    FOR SELECT USING (true);

-- Users can insert/update their own presence
DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;
CREATE POLICY "Users can manage own presence" ON user_presence
    FOR ALL USING (
        session_id = current_setting('request.headers')::json->>'x-session-id'
        OR user_id = auth.uid()
    );

-- Service role can manage all presence
DROP POLICY IF EXISTS "Service role full access" ON user_presence;
CREATE POLICY "Service role full access" ON user_presence
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- Function to clean up stale presence (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM user_presence
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to clean up stale presence every minute (requires pg_cron extension)
-- Note: This requires pg_cron to be enabled in Supabase dashboard
-- SELECT cron.schedule('cleanup-presence', '* * * * *', 'SELECT cleanup_stale_presence()');

-- ============================================
-- ACTIVITY LOG TABLE (for activity feed)
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User reference
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,

    -- Activity details
    action TEXT NOT NULL,  -- 'page_view', 'product_compare', 'stack_build', etc.
    target TEXT,  -- The page/product/feature involved
    metadata JSONB,  -- Additional context

    -- Location
    country VARCHAR(2),

    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for recent activities
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_log(action);

-- Enable real-time
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_activity_log;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Anyone can read activities (for activity feed)
DROP POLICY IF EXISTS "Anyone can view activities" ON user_activity_log;
CREATE POLICY "Anyone can view activities" ON user_activity_log
    FOR SELECT USING (true);

-- Users can insert their own activities
DROP POLICY IF EXISTS "Users can log activities" ON user_activity_log;
CREATE POLICY "Users can log activities" ON user_activity_log
    FOR INSERT WITH CHECK (true);

-- ============================================
-- VIEW: Active users summary for map
-- ============================================

DROP VIEW IF EXISTS active_users_summary;
CREATE OR REPLACE VIEW active_users_summary AS
SELECT
    country,
    COUNT(*) as user_count,
    array_agg(DISTINCT current_page) FILTER (WHERE current_page IS NOT NULL) as pages,
    array_agg(DISTINCT device_type) FILTER (WHERE device_type IS NOT NULL) as devices,
    MAX(last_seen) as most_recent
FROM user_presence
WHERE last_seen > NOW() - INTERVAL '5 minutes'
GROUP BY country
ORDER BY user_count DESC;

-- ============================================
-- VIEW: Recent activities for feed
-- ============================================

DROP VIEW IF EXISTS recent_activities;
CREATE OR REPLACE VIEW recent_activities AS
SELECT
    id,
    action,
    target,
    country,
    created_at
FROM user_activity_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 100;
