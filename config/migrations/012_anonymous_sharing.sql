-- Migration 012: Anonymous Sharing for Setups
-- Enables users to share their setups anonymously with the community

-- Add anonymous sharing columns to setups table
ALTER TABLE setups ADD COLUMN IF NOT EXISTS share_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE setups ADD COLUMN IF NOT EXISTS archetype TEXT DEFAULT 'balanced';
ALTER TABLE setups ADD COLUMN IF NOT EXISTS percentile INTEGER;
ALTER TABLE setups ADD COLUMN IF NOT EXISTS pillar_scores JSONB DEFAULT '{}';
ALTER TABLE setups ADD COLUMN IF NOT EXISTS category_count INTEGER DEFAULT 0;
ALTER TABLE setups ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Create index for anonymous catalog queries
CREATE INDEX IF NOT EXISTS idx_setups_anonymous ON setups(share_anonymous) WHERE share_anonymous = TRUE;
CREATE INDEX IF NOT EXISTS idx_setups_archetype ON setups(archetype);
CREATE INDEX IF NOT EXISTS idx_setups_percentile ON setups(percentile);

-- Function to calculate setup archetype based on products
CREATE OR REPLACE FUNCTION calculate_setup_archetype(setup_id UUID)
RETURNS TEXT AS $$
DECLARE
  hw_count INTEGER;
  sw_count INTEGER;
  defi_count INTEGER;
  privacy_count INTEGER;
  total_count INTEGER;
  avg_score NUMERIC;
BEGIN
  -- Count products by category
  SELECT
    COUNT(*) FILTER (WHERE p.category = 'hardware-wallet'),
    COUNT(*) FILTER (WHERE p.category IN ('software-wallet', 'mobile-wallet', 'browser-extension')),
    COUNT(*) FILTER (WHERE p.category IN ('defi-protocol', 'dex', 'bridge', 'lending')),
    COUNT(*) FILTER (WHERE p.privacy_focused = TRUE),
    COUNT(*),
    AVG(COALESCE(p.scores->>'total', '0')::NUMERIC)
  INTO hw_count, sw_count, defi_count, privacy_count, total_count, avg_score
  FROM setup_products sp
  JOIN products p ON sp.product_id = p.id
  WHERE sp.setup_id = calculate_setup_archetype.setup_id;

  -- Determine archetype
  IF total_count <= 2 THEN
    RETURN 'beginner';
  ELSIF total_count >= 6 AND avg_score >= 80 THEN
    RETURN 'advanced';
  ELSIF privacy_count >= total_count * 0.5 THEN
    RETURN 'privacyFirst';
  ELSIF hw_count >= total_count * 0.6 THEN
    RETURN 'hardwareMaximalist';
  ELSIF defi_count >= total_count * 0.5 THEN
    RETURN 'defiNative';
  ELSE
    RETURN 'balanced';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate percentile
CREATE OR REPLACE FUNCTION calculate_setup_percentile(target_score INTEGER)
RETURNS INTEGER AS $$
DECLARE
  total_setups INTEGER;
  lower_setups INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_setups FROM setups WHERE score IS NOT NULL;
  SELECT COUNT(*) INTO lower_setups FROM setups WHERE score < target_score;

  IF total_setups = 0 THEN
    RETURN 50;
  END IF;

  RETURN ROUND((lower_setups::NUMERIC / total_setups::NUMERIC) * 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update archetype and percentile when setup changes
CREATE OR REPLACE FUNCTION update_setup_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.archetype := calculate_setup_archetype(NEW.id);
  NEW.percentile := calculate_setup_percentile(NEW.score);
  NEW.category_count := (
    SELECT COUNT(DISTINCT p.category)
    FROM setup_products sp
    JOIN products p ON sp.product_id = p.id
    WHERE sp.setup_id = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS setup_metadata_update ON setups;
CREATE TRIGGER setup_metadata_update
  BEFORE INSERT OR UPDATE OF score, product_count ON setups
  FOR EACH ROW
  EXECUTE FUNCTION update_setup_metadata();

-- Create view for anonymous catalog (strips user info)
CREATE OR REPLACE VIEW anonymous_setups AS
SELECT
  s.id,
  s.score,
  s.product_count,
  s.category_count,
  s.archetype,
  s.percentile,
  s.pillar_scores,
  s.views,
  DATE_TRUNC('month', s.created_at) AS created_month
FROM setups s
WHERE s.share_anonymous = TRUE
  AND s.score IS NOT NULL;

-- RLS for anonymous catalog
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;

-- Anyone can view anonymous setups (read-only, metadata only)
CREATE POLICY "Anyone can view anonymous setups"
  ON setups
  FOR SELECT
  USING (share_anonymous = TRUE);

-- Users can manage their own setups
CREATE POLICY "Users can manage own setups"
  ON setups
  FOR ALL
  USING (auth.uid() = user_id);

-- Track anonymous setup views
CREATE TABLE IF NOT EXISTS anonymous_setup_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_id UUID REFERENCES setups(id) ON DELETE CASCADE,
  viewer_hash TEXT, -- Hashed IP for deduplication without PII
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anonymous_views_setup ON anonymous_setup_views(setup_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_views_hash ON anonymous_setup_views(viewer_hash, setup_id);

-- Function to increment view count (with rate limiting)
CREATE OR REPLACE FUNCTION increment_anonymous_view(
  p_setup_id UUID,
  p_viewer_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_view BOOLEAN;
BEGIN
  -- Check if viewer already viewed in last hour
  SELECT EXISTS(
    SELECT 1 FROM anonymous_setup_views
    WHERE setup_id = p_setup_id
      AND viewer_hash = p_viewer_hash
      AND viewed_at > NOW() - INTERVAL '1 hour'
  ) INTO recent_view;

  IF NOT recent_view THEN
    -- Record view
    INSERT INTO anonymous_setup_views (setup_id, viewer_hash)
    VALUES (p_setup_id, p_viewer_hash);

    -- Increment counter
    UPDATE setups SET views = COALESCE(views, 0) + 1
    WHERE id = p_setup_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Update existing setups with calculated values
UPDATE setups
SET
  archetype = calculate_setup_archetype(id),
  percentile = calculate_setup_percentile(score)
WHERE score IS NOT NULL;

COMMENT ON COLUMN setups.share_anonymous IS 'Whether the setup is shared anonymously in the community catalog';
COMMENT ON COLUMN setups.archetype IS 'Auto-detected archetype: hardwareMaximalist, defiNative, balanced, privacyFirst, beginner, advanced';
COMMENT ON COLUMN setups.percentile IS 'Score percentile compared to all setups (0-100)';
