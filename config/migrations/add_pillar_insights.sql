-- ============================================================
-- SAFESCORING - Add pillar insight columns to safe_scoring_results
-- ============================================================
-- Each product gets an AI-generated strategic summary per pillar,
-- synthesized from the individual norm justifications (why_this_result).
-- These are displayed to the end user on the product page.
--
-- Run in Supabase SQL Editor:
--   1. Copy-paste this entire file
--   2. Click "Run"
-- ============================================================

-- 1. Security pillar insight
ALTER TABLE safe_scoring_results
  ADD COLUMN IF NOT EXISTS insight_s TEXT DEFAULT NULL;

-- 2. Adversity pillar insight
ALTER TABLE safe_scoring_results
  ADD COLUMN IF NOT EXISTS insight_a TEXT DEFAULT NULL;

-- 3. Fidelity pillar insight
ALTER TABLE safe_scoring_results
  ADD COLUMN IF NOT EXISTS insight_f TEXT DEFAULT NULL;

-- 4. Efficiency pillar insight
ALTER TABLE safe_scoring_results
  ADD COLUMN IF NOT EXISTS insight_e TEXT DEFAULT NULL;

-- 5. When insights were generated (for staleness detection)
ALTER TABLE safe_scoring_results
  ADD COLUMN IF NOT EXISTS insights_generated_at TIMESTAMP DEFAULT NULL;

-- ============================================================
-- DONE - Verify with:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'safe_scoring_results' AND column_name LIKE 'insight%'
-- ORDER BY ordinal_position;
-- ============================================================
