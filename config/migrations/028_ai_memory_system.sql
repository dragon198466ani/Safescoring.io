-- Migration 028: AI Memory System
-- Purpose: Store user memories and conversations for personalized AI interactions (like Claude's memory feature)

-- ============================================
-- TABLE: user_memory_settings
-- User preferences for memory feature
-- ============================================
CREATE TABLE IF NOT EXISTS user_memory_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Feature toggles
    memory_enabled BOOLEAN DEFAULT TRUE,
    auto_extract_facts BOOLEAN DEFAULT TRUE,
    store_conversations BOOLEAN DEFAULT TRUE,

    -- Privacy controls
    max_retention_days INTEGER DEFAULT 365,
    anonymize_in_training BOOLEAN DEFAULT TRUE,

    -- Granular controls
    remember_preferences BOOLEAN DEFAULT TRUE,
    remember_goals BOOLEAN DEFAULT TRUE,
    remember_risk_profile BOOLEAN DEFAULT TRUE,
    remember_product_interests BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: user_conversations
-- Stores conversation sessions with summaries
-- ============================================
CREATE TABLE IF NOT EXISTS user_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Conversation metadata
    title TEXT,
    assistant_type VARCHAR(50) NOT NULL DEFAULT 'chat',

    -- Summary for context retrieval
    summary TEXT,
    key_topics TEXT[] DEFAULT '{}',

    -- Message count
    message_count INTEGER DEFAULT 0,

    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'active',

    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,

    CHECK (status IN ('active', 'ended', 'archived'))
);

-- ============================================
-- TABLE: conversation_messages
-- Individual messages within conversations
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES user_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Message content
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,

    -- AI response metadata
    model_used VARCHAR(100),
    tokens_used INTEGER,
    response_time_ms INTEGER,

    -- Extracted information
    extracted_facts JSONB DEFAULT '[]'::jsonb,
    sentiment VARCHAR(20),

    -- Recommendations made
    product_recommendations JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    -- Message ordering
    sequence_number INTEGER NOT NULL,

    CHECK (role IN ('user', 'assistant', 'system')),
    CHECK (sentiment IS NULL OR sentiment IN ('positive', 'negative', 'neutral'))
);

-- ============================================
-- TABLE: user_memories
-- Stores extracted facts about users
-- ============================================
CREATE TABLE IF NOT EXISTS user_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Memory content
    memory_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    content TEXT NOT NULL,

    -- Source tracking
    source_type VARCHAR(50) NOT NULL DEFAULT 'conversation',
    source_conversation_id UUID REFERENCES user_conversations(id) ON DELETE SET NULL,

    -- Confidence and relevance
    confidence DECIMAL(3,2) DEFAULT 0.80,
    importance INTEGER DEFAULT 5,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP,
    expires_at TIMESTAMP,

    -- Soft delete for GDPR compliance
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,

    CHECK (memory_type IN ('fact', 'preference', 'goal', 'context')),
    CHECK (category IN ('personal', 'crypto_goals', 'risk_profile', 'product_preferences', 'holdings')),
    CHECK (source_type IN ('conversation', 'quiz', 'onboarding', 'manual')),
    CHECK (confidence >= 0 AND confidence <= 1),
    CHECK (importance >= 1 AND importance <= 10)
);

-- ============================================
-- INDEXES
-- ============================================

-- user_memory_settings
CREATE INDEX IF NOT EXISTS idx_memory_settings_user ON user_memory_settings(user_id);

-- user_conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user ON user_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON user_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON user_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON user_conversations(user_id) WHERE is_deleted = FALSE AND status = 'active';

-- conversation_messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON conversation_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sequence ON conversation_messages(conversation_id, sequence_number);

-- user_memories
CREATE INDEX IF NOT EXISTS idx_memories_user ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_category ON user_memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON user_memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memories_active ON user_memories(user_id) WHERE is_deleted = FALSE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps for user_memory_settings
CREATE OR REPLACE FUNCTION update_memory_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_memory_settings_updated
    BEFORE UPDATE ON user_memory_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_memory_settings_timestamp();

-- Update timestamps for user_memories
CREATE OR REPLACE FUNCTION update_memories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_memories_updated
    BEFORE UPDATE ON user_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_memories_timestamp();

-- Auto-update conversation message count and last_message_at
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_conversations
    SET message_count = message_count + 1,
        last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_message_count
    AFTER INSERT ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_memory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "users_own_memory_settings" ON user_memory_settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_conversations" ON user_conversations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_messages" ON conversation_messages
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_memories" ON user_memories
    FOR ALL USING (auth.uid() = user_id);

-- Service role bypass for server-side operations
CREATE POLICY "service_role_memory_settings" ON user_memory_settings
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

CREATE POLICY "service_role_conversations" ON user_conversations
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

CREATE POLICY "service_role_messages" ON conversation_messages
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

CREATE POLICY "service_role_memories" ON user_memories
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_memory_settings IS 'User preferences for AI memory feature (toggle, retention, granular controls)';
COMMENT ON TABLE user_conversations IS 'AI conversation sessions with summaries for context retrieval';
COMMENT ON TABLE conversation_messages IS 'Individual messages within AI conversations';
COMMENT ON TABLE user_memories IS 'Extracted facts and preferences about users for personalized AI';

COMMENT ON COLUMN user_memories.memory_type IS 'Type: fact, preference, goal, context';
COMMENT ON COLUMN user_memories.category IS 'Category: personal, crypto_goals, risk_profile, product_preferences, holdings';
COMMENT ON COLUMN user_memories.confidence IS 'AI confidence in extracted fact (0.00-1.00)';
COMMENT ON COLUMN user_memories.importance IS 'Importance for retrieval ranking (1-10)';
COMMENT ON COLUMN user_memories.source_type IS 'Source: conversation, quiz, onboarding, manual';
