-- Add reason column to norm_applicability table
-- Run in Supabase SQL Editor

-- Add the reason column
ALTER TABLE norm_applicability
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN norm_applicability.reason IS 'AI-generated explanation of why this norm is or is not applicable to this product type';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'norm_applicability'
ORDER BY ordinal_position;
