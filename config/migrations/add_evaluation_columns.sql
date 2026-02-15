-- ============================================================
-- SAFESCORING - Add missing columns to evaluations table
-- ============================================================
-- The evaluations table currently only has: id, product_id, norm_id, result
-- This migration adds transparency/traceability columns needed by the frontend.
--
-- Run in Supabase SQL Editor:
--   1. Copy-paste this entire file
--   2. Click "Run"
-- ============================================================

-- 1. Add why_this_result (AI justification text)
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS why_this_result TEXT DEFAULT NULL;

-- 2. Add confidence_score (0.0 to 1.0)
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3) DEFAULT NULL;

-- 3. Add evaluated_by (which AI model produced the evaluation)
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS evaluated_by TEXT DEFAULT NULL;

-- 4. Add evaluation_date
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS evaluation_date DATE DEFAULT CURRENT_DATE;

-- 5. Index on evaluated_by for filtering/stats
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated_by
  ON evaluations (evaluated_by);

-- 6. Index on evaluation_date for recency queries
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluation_date
  ON evaluations (evaluation_date DESC);

-- 7. Update RLS policy to allow anon read of new columns
-- (The existing SELECT policy already covers all columns,
--  but if it's column-specific, we need to ensure new columns are included)

-- Verify: check current policies
-- SELECT * FROM pg_policies WHERE tablename = 'evaluations';

-- ============================================================
-- POST-MIGRATION: Backfill evaluated_by for existing rows
-- ============================================================
-- All existing 2.9M rows were evaluated by the smart AI pipeline
UPDATE evaluations
  SET evaluated_by = 'smart_ai'
  WHERE evaluated_by IS NULL;

-- ============================================================
-- DONE - Verify with:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'evaluations' ORDER BY ordinal_position;
-- ============================================================
