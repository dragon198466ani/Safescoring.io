-- Migration 013: User Preferences for Quiz & AI Results
-- Purpose: Store user preferences from quiz results and AI conversations to provide personalized template recommendations

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Preference keywords extracted from quiz/AI
    preferences JSONB DEFAULT '[]'::jsonb,

    -- Quiz results with answers and recommendations
    quiz_results JSONB DEFAULT '{}'::jsonb,

    -- AI conversation insights (keywords, topics discussed)
    ai_insights JSONB DEFAULT '{}'::jsonb,

    -- User's overall SAFE score preferences
    min_preferred_score INTEGER DEFAULT 0,
    max_preferred_score INTEGER DEFAULT 10,

    -- Preferred product types
    preferred_product_types TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure one preference record per user
    UNIQUE(user_id),

    -- Validate JSONB types
    CHECK (jsonb_typeof(preferences) = 'array'),
    CHECK (jsonb_typeof(quiz_results) = 'object'),
    CHECK (jsonb_typeof(ai_insights) = 'object')
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add comments
COMMENT ON TABLE user_preferences IS 'Stores user preferences from quiz and AI interactions for personalized recommendations';
COMMENT ON COLUMN user_preferences.preferences IS 'Array of preference keywords extracted from quiz/AI (e.g., ["security", "bitcoin", "long-term"])';
COMMENT ON COLUMN user_preferences.quiz_results IS 'Full quiz results including questions, answers, and recommendations';
COMMENT ON COLUMN user_preferences.ai_insights IS 'Keywords and topics extracted from AI conversations';
COMMENT ON COLUMN user_preferences.preferred_product_types IS 'Array of preferred product types (e.g., ["hardware_wallet", "cold_storage"])';
