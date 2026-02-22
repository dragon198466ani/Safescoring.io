-- ============================================================
-- MIGRATION: Addiction Features (Notifications, Streaks, Achievements)
-- SafeScoring - Agent IA + Anti-Churn Features
-- ============================================================

-- ============================================================
-- 1. NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_score_changes BOOLEAN DEFAULT TRUE,
    email_security_incidents BOOLEAN DEFAULT TRUE,
    email_weekly_digest BOOLEAN DEFAULT TRUE,
    email_monthly_report BOOLEAN DEFAULT TRUE,
    alert_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (alert_frequency IN ('immediate', 'daily', 'weekly')),
    min_score_change INTEGER DEFAULT 5 CHECK (min_score_change >= 1 AND min_score_change <= 50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. NOTIFICATIONS (in-app)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'score_change', 'security_incident', 'weekly_digest',
        'monthly_report', 'achievement', 'streak', 'system'
    )),
    title VARCHAR(200) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Auto-cleanup: keep only last 100 notifications per user (via trigger)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM notifications
    WHERE id IN (
        SELECT id FROM notifications
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        OFFSET 100
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_notifications ON notifications;
CREATE TRIGGER trg_cleanup_notifications
AFTER INSERT ON notifications
FOR EACH ROW EXECUTE FUNCTION cleanup_old_notifications();

-- ============================================================
-- 3. USER STREAKS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_streaks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_visit_date DATE,
    total_visits INTEGER DEFAULT 0,
    streak_points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. USER ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_code VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    data JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);

-- ============================================================
-- 5. INDEXES for existing tables (optimize cron queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_score_history_recorded ON score_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_score_history_product_recorded ON score_history(product_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_user_setups_user ON user_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_published ON security_incidents(is_published, created_at);
