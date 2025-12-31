-- ============================================================
-- Add why_this_result column to evaluations table
-- ============================================================
-- This column stores the AI's explanation for each evaluation result

-- Add the column if it doesn't exist
ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS why_this_result TEXT;

-- Add comment
COMMENT ON COLUMN evaluations.why_this_result IS 'AI explanation for why this result was given (YES/NO/TBD)';

-- Update the result constraint to include YESp and TBD
ALTER TABLE evaluations 
DROP CONSTRAINT IF EXISTS evaluations_result_check;

ALTER TABLE evaluations 
ADD CONSTRAINT evaluations_result_check 
CHECK (result IN ('YES', 'YESp', 'NO', 'TBD', 'N/A'));

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'evaluations' 
ORDER BY ordinal_position;
