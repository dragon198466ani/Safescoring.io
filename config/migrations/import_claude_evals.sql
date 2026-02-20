-- IMPORT CLAUDE OPUS EVALUATIONS
-- =================================
-- Run this in Supabase SQL Editor or via psql
-- First increase the timeout:

-- Option 1: Set timeout for this session
SET statement_timeout = '600s';  -- 10 minutes

-- Option 2: For the entire database (requires admin)
-- ALTER DATABASE postgres SET statement_timeout = '600s';

-- Then run the import script via Python or use COPY command

-- To check current timeout:
-- SHOW statement_timeout;

-- IMPORTANT: The evaluations are in data/claude_opus_evaluations.json
-- Use the import_evals_slow.py script once timeout is increased

-- Alternative: Create new table and swap
-- This avoids lock contention on the main table

/*
-- Create new table
CREATE TABLE evaluations_claude AS
SELECT * FROM evaluations WHERE false;

-- Import to new table (faster, no conflicts)
-- Then merge:
INSERT INTO evaluations
SELECT * FROM evaluations_claude
ON CONFLICT (product_id, norm_id, evaluation_date)
DO UPDATE SET
    result = EXCLUDED.result,
    why_this_result = EXCLUDED.why_this_result,
    evaluated_by = EXCLUDED.evaluated_by,
    confidence_score = EXCLUDED.confidence_score;

-- Drop temporary table
DROP TABLE evaluations_claude;
*/
