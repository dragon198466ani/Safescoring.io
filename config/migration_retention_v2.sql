-- ============================================================
-- MIGRATION: Retention V2 Features (AI Chat, Challenges, Quests, Community)
-- SafeScoring - 7 Addiction Features Upgrade
-- ============================================================

-- ============================================================
-- 1. DAILY CHALLENGES
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_challenges (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    challenge_type VARCHAR(50) NOT NULL,
    challenge_title VARCHAR(200) NOT NULL,
    challenge_description TEXT,
    points_value INTEGER DEFAULT 10,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);

-- ============================================================
-- 2. USER QUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_quests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_code VARCHAR(50) NOT NULL,
    progress JSONB DEFAULT '{}',
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(user_id, quest_code)
);

CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);

-- ============================================================
-- 3. AI CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_session ON ai_chat_messages(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_created ON ai_chat_messages(created_at);

-- ============================================================
-- 4. AI RATE LIMITS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_rate_limits (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_user_date ON ai_rate_limits(user_id, usage_date);

-- ============================================================
-- 5. ALTER EXISTING TABLES
-- ============================================================
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_streak_reminder BOOLEAN DEFAULT TRUE;

ALTER TABLE user_setups
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_user_setups_public ON user_setups(is_public) WHERE is_public = TRUE;
