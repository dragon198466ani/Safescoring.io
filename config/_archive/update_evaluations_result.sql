-- ============================================
-- Update evaluations table
-- Add TBD and YESp as possible values
-- ============================================

-- Remove old CHECK constraint
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_result_check;

-- Add new constraint with TBD and YESp
ALTER TABLE evaluations 
ADD CONSTRAINT evaluations_result_check 
CHECK (result IN ('YES', 'YESp', 'NO', 'TBD', 'N/A'));

-- Verify update
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%evaluations%';
