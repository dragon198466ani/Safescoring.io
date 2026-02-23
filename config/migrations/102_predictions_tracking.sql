-- =====================================================
-- Migration 102: Score Predictions Tracking (Data Moat)
-- Phase 3.6: Public predictions based on SAFE scores
--
-- Stores human-readable predictions about crypto product
-- security risks. When predictions come true, it builds
-- credibility and creates an irreplicable data moat.
-- =====================================================

CREATE TABLE IF NOT EXISTS score_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_slug TEXT NOT NULL,
  prediction TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'incident_risk',
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'missed', 'withdrawn')),
  outcome TEXT,
  outcome_date TIMESTAMPTZ,
  related_pillar TEXT CHECK (related_pillar IN ('S', 'A', 'F', 'E')),
  score_at_prediction NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_predictions_product ON score_predictions(product_slug);
CREATE INDEX idx_predictions_status ON score_predictions(status);
CREATE INDEX idx_predictions_deadline ON score_predictions(deadline);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_score_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_score_predictions_updated_at ON score_predictions;
CREATE TRIGGER trigger_score_predictions_updated_at
    BEFORE UPDATE ON score_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_score_predictions_updated_at();

-- RLS policies
ALTER TABLE score_predictions ENABLE ROW LEVEL SECURITY;

-- Public read access (predictions are public by design)
CREATE POLICY "Anyone can read score predictions"
    ON score_predictions FOR SELECT
    USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role manages score predictions"
    ON score_predictions FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE score_predictions IS 'Public SAFE score predictions for data moat credibility tracking';
