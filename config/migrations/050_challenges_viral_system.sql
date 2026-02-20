-- Migration 050: Challenges Viral System
-- System for viral "Challenge a friend" feature

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,  -- nanoid 8 chars (e.g., "xK9f2mZq")
  creator_name TEXT DEFAULT 'Anonymous',
  products JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{product_id, name, slug, role, score}]
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB DEFAULT '{}'::jsonb,  -- {s, a, f, e}
  percentile INTEGER CHECK (percentile >= 0 AND percentile <= 100),
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'fr')),
  responses_count INTEGER DEFAULT 0,
  ip_hash TEXT,  -- SHA256 for rate limiting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Constraints
  CHECK (jsonb_typeof(products) = 'array'),
  CHECK (jsonb_array_length(products) >= 1 AND jsonb_array_length(products) <= 5)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_created ON challenges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_score ON challenges(score DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_challenges_ip ON challenges(ip_hash);
CREATE INDEX IF NOT EXISTS idx_challenges_locale ON challenges(locale);

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create challenges (anonymous allowed)
CREATE POLICY "Anyone can create challenges" ON challenges
  FOR INSERT WITH CHECK (true);

-- Policy: Anyone can view challenges (public for sharing)
CREATE POLICY "Anyone can view challenges" ON challenges
  FOR SELECT USING (true);

-- Policy: Only creator can update (via ip_hash match)
CREATE POLICY "Creator can update own challenges" ON challenges
  FOR UPDATE USING (ip_hash = current_setting('request.headers', true)::json->>'x-challenge-ip-hash');

-- Create challenge_responses table for tracking responses
CREATE TABLE IF NOT EXISTS challenge_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
  responder_name TEXT DEFAULT 'Anonymous',
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  is_winner BOOLEAN,  -- true if beat the challenge
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (jsonb_typeof(products) = 'array')
);

-- Indexes for challenge_responses
CREATE INDEX IF NOT EXISTS idx_challenge_responses_challenge ON challenge_responses(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_responses_created ON challenge_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_responses_winner ON challenge_responses(is_winner) WHERE is_winner = true;

-- Enable RLS for responses
ALTER TABLE challenge_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create responses
CREATE POLICY "Anyone can create responses" ON challenge_responses
  FOR INSERT WITH CHECK (true);

-- Policy: Anyone can view responses
CREATE POLICY "Anyone can view responses" ON challenge_responses
  FOR SELECT USING (true);

-- Function to increment response count
CREATE OR REPLACE FUNCTION increment_challenge_responses()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE challenges
  SET responses_count = responses_count + 1
  WHERE id = NEW.challenge_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-increment
DROP TRIGGER IF EXISTS trigger_increment_challenge_responses ON challenge_responses;
CREATE TRIGGER trigger_increment_challenge_responses
  AFTER INSERT ON challenge_responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_challenge_responses();

-- Function to get challenge leaderboard (top scores this week)
CREATE OR REPLACE FUNCTION get_challenge_leaderboard(
  p_limit INTEGER DEFAULT 20,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  id TEXT,
  creator_name TEXT,
  score INTEGER,
  percentile INTEGER,
  responses_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.creator_name,
    c.score,
    c.percentile,
    c.responses_count,
    c.created_at
  FROM challenges c
  WHERE c.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND c.expires_at > NOW()
  ORDER BY c.score DESC, c.responses_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get challenge stats
CREATE OR REPLACE FUNCTION get_challenge_stats()
RETURNS TABLE (
  total_challenges BIGINT,
  total_responses BIGINT,
  challenges_this_week BIGINT,
  avg_score NUMERIC,
  top_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_challenges,
    COALESCE(SUM(c.responses_count), 0) as total_responses,
    COUNT(*) FILTER (WHERE c.created_at >= NOW() - INTERVAL '7 days') as challenges_this_week,
    ROUND(AVG(c.score), 1) as avg_score,
    MAX(c.score) as top_score
  FROM challenges c
  WHERE c.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_challenge_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_stats TO anon, authenticated;

-- Comments
COMMENT ON TABLE challenges IS 'Viral challenge system - users create score challenges for friends';
COMMENT ON TABLE challenge_responses IS 'Responses to challenges with comparison results';
COMMENT ON COLUMN challenges.id IS 'Short nanoid for shareable URLs (8 chars)';
COMMENT ON COLUMN challenges.products IS 'Array of products with scores [{product_id, name, slug, role, score}]';
COMMENT ON COLUMN challenges.percentile IS 'Approximate percentile ranking (top X%)';
