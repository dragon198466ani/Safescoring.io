-- ============================================================
-- Migration 065: Add standard_year column to norms
-- ============================================================
-- Adds year of creation/publication for each standard
-- Will be populated by AI enrichment script
-- ============================================================

-- Add standard_year column
ALTER TABLE norms ADD COLUMN IF NOT EXISTS standard_year INTEGER;

-- Add comment
COMMENT ON COLUMN norms.standard_year IS 'Year the standard was created/published (e.g., 2020 for NIST SP 800-57 Rev.5)';

-- Create index for filtering by year
CREATE INDEX IF NOT EXISTS idx_norms_standard_year ON norms(standard_year) WHERE standard_year IS NOT NULL;

-- Verify
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norms' AND column_name = 'standard_year') THEN
        RAISE NOTICE 'SUCCESS: standard_year column added to norms table';
    ELSE
        RAISE EXCEPTION 'FAILED: standard_year column not found';
    END IF;
END $$;
