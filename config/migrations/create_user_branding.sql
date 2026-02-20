-- Migration: Create user branding table for white-label reports
-- Purpose: Store custom branding settings for enterprise users
-- Run this in Supabase SQL Editor

-- User branding settings
CREATE TABLE IF NOT EXISTS user_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  header_text TEXT,
  footer_text TEXT,
  show_safescoring BOOLEAN DEFAULT TRUE,
  custom_css TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_branding_user ON user_branding(user_id);

-- User achievements (for gamification)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Row Level Security
ALTER TABLE user_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own branding
CREATE POLICY "Users can manage their branding"
  ON user_branding FOR ALL
  USING (user_id = auth.uid());

-- Users can only see/modify their own achievements
CREATE POLICY "Users can manage their achievements"
  ON user_achievements FOR ALL
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER user_branding_updated_at
  BEFORE UPDATE ON user_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE user_branding IS 'Custom branding for white-label reports (Enterprise feature)';
COMMENT ON TABLE user_achievements IS 'Gamification achievements unlocked by users';
