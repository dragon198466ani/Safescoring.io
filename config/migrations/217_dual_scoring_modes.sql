-- Add dual scoring columns: weighted (type-specific) and equal (25/25/25/25)
-- note_finale remains the primary score (now weighted by pillar_weights)
-- note_equal provides the equal-weight alternative

ALTER TABLE safe_scoring_results
  ADD COLUMN IF NOT EXISTS note_weighted REAL,
  ADD COLUMN IF NOT EXISTS note_equal REAL;

-- Same for consumer and essential tiers
ALTER TABLE safe_scoring_results
  ADD COLUMN IF NOT EXISTS note_consumer_weighted REAL,
  ADD COLUMN IF NOT EXISTS note_consumer_equal REAL,
  ADD COLUMN IF NOT EXISTS note_essential_weighted REAL,
  ADD COLUMN IF NOT EXISTS note_essential_equal REAL;

COMMENT ON COLUMN safe_scoring_results.note_weighted IS 'SAFE score weighted by type-specific pillar_weights';
COMMENT ON COLUMN safe_scoring_results.note_equal IS 'SAFE score with equal weights (25/25/25/25)';
