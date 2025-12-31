-- Add updated_at column to norm_applicability table
-- Run in Supabase SQL Editor

ALTER TABLE norm_applicability
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment
COMMENT ON COLUMN norm_applicability.updated_at IS 'Timestamp when this applicability rule was last evaluated by AI';

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'norm_applicability'
ORDER BY ordinal_position;
