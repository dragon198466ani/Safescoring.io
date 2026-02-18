-- Migration 012: Share Events Tracking
-- Track social shares for analytics and viral growth

-- Create share_events table
CREATE TABLE IF NOT EXISTS share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('product', 'comparison', 'setup', 'leaderboard', 'badge')),
  target_id TEXT NOT NULL,  -- slug produit, setup_id, comparison slugs, etc.
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'telegram', 'whatsapp', 'copy', 'embed', 'native', 'email')),
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'fr', 'de', 'es', 'pt', 'ja')),
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT, -- SHA256 hash for privacy
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_share_events_type ON share_events(share_type);
CREATE INDEX IF NOT EXISTS idx_share_events_platform ON share_events(platform);
CREATE INDEX IF NOT EXISTS idx_share_events_locale ON share_events(locale);
CREATE INDEX IF NOT EXISTS idx_share_events_created ON share_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_events_target ON share_events(target_id);
CREATE INDEX IF NOT EXISTS idx_share_events_user ON share_events(user_id) WHERE user_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_share_events_type_platform ON share_events(share_type, platform);
CREATE INDEX IF NOT EXISTS idx_share_events_date_type ON share_events(created_at, share_type);

-- Enable RLS
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert share events (anonymous tracking allowed)
CREATE POLICY "Anyone can insert share events" ON share_events
  FOR INSERT WITH CHECK (true);

-- Policy: Users can see their own share events
CREATE POLICY "Users can view own share events" ON share_events
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all share events
CREATE POLICY "Admins can view all share events" ON share_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to get share analytics
CREATE OR REPLACE FUNCTION get_share_analytics(
  p_days INTEGER DEFAULT 30,
  p_share_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  share_type TEXT,
  platform TEXT,
  locale TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(se.created_at) as date,
    se.share_type,
    se.platform,
    se.locale,
    COUNT(*) as count
  FROM share_events se
  WHERE se.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND (p_share_type IS NULL OR se.share_type = p_share_type)
  GROUP BY DATE(se.created_at), se.share_type, se.platform, se.locale
  ORDER BY date DESC, count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top shared products
CREATE OR REPLACE FUNCTION get_top_shared_products(
  p_limit INTEGER DEFAULT 10,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  target_id TEXT,
  total_shares BIGINT,
  twitter_shares BIGINT,
  linkedin_shares BIGINT,
  telegram_shares BIGINT,
  copy_shares BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.target_id,
    COUNT(*) as total_shares,
    COUNT(*) FILTER (WHERE se.platform = 'twitter') as twitter_shares,
    COUNT(*) FILTER (WHERE se.platform = 'linkedin') as linkedin_shares,
    COUNT(*) FILTER (WHERE se.platform = 'telegram') as telegram_shares,
    COUNT(*) FILTER (WHERE se.platform = 'copy') as copy_shares
  FROM share_events se
  WHERE se.share_type = 'product'
    AND se.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY se.target_id
  ORDER BY total_shares DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_share_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_shared_products TO authenticated;

COMMENT ON TABLE share_events IS 'Tracks social media shares for viral analytics';
COMMENT ON COLUMN share_events.share_type IS 'Type of content shared: product, comparison, setup, leaderboard, badge';
COMMENT ON COLUMN share_events.platform IS 'Social platform: twitter, linkedin, telegram, whatsapp, copy, embed, native, email';
COMMENT ON COLUMN share_events.target_id IS 'Identifier of shared content (slug, id, or combined slugs for comparisons)';
COMMENT ON COLUMN share_events.ip_hash IS 'SHA256 hash of IP for privacy-preserving deduplication';
