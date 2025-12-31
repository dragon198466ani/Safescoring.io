-- ============================================
-- SAFESCORING.IO - Add consumer column to norms
-- ============================================

-- Add consumer column (boolean)
ALTER TABLE norms ADD COLUMN IF NOT EXISTS consumer BOOLEAN DEFAULT FALSE;

-- Comment
COMMENT ON COLUMN norms.consumer IS 'Indicates if the norm applies to consumer products';

SELECT 'Consumer column added successfully!' as status;
