-- Migration 033: Setup Real-time Enhancements
-- Adds tables for setup history tracking, score snapshots, and notification preferences

-- =====================================================
-- 1. SETUP HISTORY TABLE
-- Tracks all changes to setups (products added/removed, score changes, renames)
-- =====================================================

CREATE TABLE IF NOT EXISTS setup_history (
    id SERIAL PRIMARY KEY,
    setup_id INTEGER REFERENCES user_setups(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(50) NOT NULL, -- 'product_added', 'product_removed', 'score_changed', 'created', 'renamed', 'deleted'
    product_id INTEGER,
    product_name VARCHAR(200),
    old_value JSONB, -- For score changes: {score_s, score_a, score_f, score_e, note_finale}
    new_value JSONB, -- For score changes: {score_s, score_a, score_f, score_e, note_finale}
    metadata JSONB DEFAULT '{}', -- Additional context (e.g., role for product_added)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_setup_history_setup_id ON setup_history(setup_id);
CREATE INDEX IF NOT EXISTS idx_setup_history_user_id ON setup_history(user_id);
CREATE INDEX IF NOT EXISTS idx_setup_history_created_at ON setup_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setup_history_action ON setup_history(action);

-- =====================================================
-- 2. SETUP SCORE SNAPSHOTS TABLE
-- Stores daily score snapshots for evolution charts
-- =====================================================

CREATE TABLE IF NOT EXISTS setup_score_snapshots (
    id SERIAL PRIMARY KEY,
    setup_id INTEGER REFERENCES user_setups(id) ON DELETE CASCADE,
    score_s INTEGER,
    score_a INTEGER,
    score_f INTEGER,
    score_e INTEGER,
    note_finale INTEGER,
    products_count INTEGER,
    weakest_pillar VARCHAR(1), -- 'S', 'A', 'F', or 'E'
    snapshot_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(setup_id, snapshot_date)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_setup_score_snapshots_setup_id ON setup_score_snapshots(setup_id);
CREATE INDEX IF NOT EXISTS idx_setup_score_snapshots_date ON setup_score_snapshots(snapshot_date DESC);

-- =====================================================
-- 3. USER NOTIFICATION PREFERENCES TABLE
-- Stores user preferences for email and Telegram notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    -- Email settings
    email_enabled BOOLEAN DEFAULT TRUE,
    email_digest VARCHAR(20) DEFAULT 'instant', -- 'instant', 'daily', 'weekly', 'never'
    -- Telegram settings
    telegram_enabled BOOLEAN DEFAULT FALSE,
    telegram_chat_id VARCHAR(100),
    telegram_username VARCHAR(100),
    telegram_linked_at TIMESTAMP WITH TIME ZONE,
    -- Notification types
    notify_incidents BOOLEAN DEFAULT TRUE,
    notify_score_changes BOOLEAN DEFAULT TRUE,
    notify_product_updates BOOLEAN DEFAULT TRUE,
    -- Thresholds
    severity_threshold VARCHAR(20) DEFAULT 'high', -- 'critical', 'high', 'medium', 'low'
    score_change_threshold INTEGER DEFAULT 5, -- Minimum score change to trigger notification
    -- Quiet hours (optional)
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_telegram ON user_notification_preferences(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- =====================================================
-- 4. NOTIFICATION LOG TABLE
-- Tracks sent notifications to prevent duplicates and for analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    setup_id INTEGER REFERENCES user_setups(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'incident', 'score_change', 'product_update'
    channel VARCHAR(20) NOT NULL, -- 'email', 'telegram', 'in_app'
    subject VARCHAR(500),
    content_hash VARCHAR(64), -- SHA256 hash of content to detect duplicates
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_content_hash ON notification_log(content_hash);

-- =====================================================
-- 5. ADD COLUMNS TO user_setups TABLE
-- =====================================================

ALTER TABLE user_setups ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_setups ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0;
ALTER TABLE user_setups ADD COLUMN IF NOT EXISTS last_score_snapshot JSONB;

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE setup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Policies for setup_history
CREATE POLICY "Users can view their own setup history"
    ON setup_history FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own setup history"
    ON setup_history FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policies for setup_score_snapshots
CREATE POLICY "Users can view their own score snapshots"
    ON setup_score_snapshots FOR SELECT
    USING (setup_id IN (SELECT id FROM user_setups WHERE user_id = auth.uid()));

-- Policies for user_notification_preferences
CREATE POLICY "Users can view their own notification preferences"
    ON user_notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
    ON user_notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences"
    ON user_notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policies for notification_log
CREATE POLICY "Users can view their own notification log"
    ON notification_log FOR SELECT
    USING (user_id = auth.uid());

-- =====================================================
-- 7. FUNCTIONS FOR AUTOMATIC HISTORY TRACKING
-- =====================================================

-- Function to log setup changes
CREATE OR REPLACE FUNCTION log_setup_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if products array changed
    IF TG_OP = 'UPDATE' AND OLD.products IS DISTINCT FROM NEW.products THEN
        INSERT INTO setup_history (setup_id, user_id, action, old_value, new_value, metadata)
        VALUES (
            NEW.id,
            NEW.user_id,
            'products_changed',
            jsonb_build_object('products', OLD.products),
            jsonb_build_object('products', NEW.products),
            jsonb_build_object('timestamp', NOW())
        );
    END IF;

    -- Log name changes
    IF TG_OP = 'UPDATE' AND OLD.name IS DISTINCT FROM NEW.name THEN
        INSERT INTO setup_history (setup_id, user_id, action, old_value, new_value)
        VALUES (
            NEW.id,
            NEW.user_id,
            'renamed',
            jsonb_build_object('name', OLD.name),
            jsonb_build_object('name', NEW.name)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for setup changes
DROP TRIGGER IF EXISTS trigger_log_setup_change ON user_setups;
CREATE TRIGGER trigger_log_setup_change
    AFTER UPDATE ON user_setups
    FOR EACH ROW
    EXECUTE FUNCTION log_setup_change();

-- Function to create initial history entry on setup creation
CREATE OR REPLACE FUNCTION log_setup_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO setup_history (setup_id, user_id, action, new_value, metadata)
    VALUES (
        NEW.id,
        NEW.user_id,
        'created',
        jsonb_build_object('name', NEW.name, 'products', NEW.products),
        jsonb_build_object('timestamp', NOW())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for setup creation
DROP TRIGGER IF EXISTS trigger_log_setup_creation ON user_setups;
CREATE TRIGGER trigger_log_setup_creation
    AFTER INSERT ON user_setups
    FOR EACH ROW
    EXECUTE FUNCTION log_setup_creation();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to get setup history with pagination
CREATE OR REPLACE FUNCTION get_setup_history(
    p_setup_id INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    action VARCHAR(50),
    product_id INTEGER,
    product_name VARCHAR(200),
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.id,
        sh.action,
        sh.product_id,
        sh.product_name,
        sh.old_value,
        sh.new_value,
        sh.metadata,
        sh.created_at
    FROM setup_history sh
    WHERE sh.setup_id = p_setup_id
    ORDER BY sh.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get score evolution for a setup
CREATE OR REPLACE FUNCTION get_setup_score_evolution(
    p_setup_id INTEGER,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    snapshot_date DATE,
    score_s INTEGER,
    score_a INTEGER,
    score_f INTEGER,
    score_e INTEGER,
    note_finale INTEGER,
    products_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sss.snapshot_date,
        sss.score_s,
        sss.score_a,
        sss.score_f,
        sss.score_e,
        sss.note_finale,
        sss.products_count
    FROM setup_score_snapshots sss
    WHERE sss.setup_id = p_setup_id
      AND sss.snapshot_date >= CURRENT_DATE - p_days
    ORDER BY sss.snapshot_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT ON setup_history TO authenticated;
GRANT SELECT ON setup_score_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_notification_preferences TO authenticated;
GRANT SELECT ON notification_log TO authenticated;

-- Service role needs full access for cron jobs
GRANT ALL ON setup_history TO service_role;
GRANT ALL ON setup_score_snapshots TO service_role;
GRANT ALL ON user_notification_preferences TO service_role;
GRANT ALL ON notification_log TO service_role;

-- Grant sequence usage
GRANT USAGE, SELECT ON SEQUENCE setup_history_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE setup_score_snapshots_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE user_notification_preferences_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE notification_log_id_seq TO authenticated, service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
