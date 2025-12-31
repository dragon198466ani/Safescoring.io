-- ============================================================
-- STEP 1: ADD NEW COLUMNS TO product_types
-- ============================================================
-- Execute this FIRST in Supabase SQL Editor
-- Then execute product_type_definitions.sql
-- ============================================================

ALTER TABLE product_types
ADD COLUMN IF NOT EXISTS name VARCHAR(100),
ADD COLUMN IF NOT EXISTS definition TEXT,
ADD COLUMN IF NOT EXISTS includes TEXT[],
ADD COLUMN IF NOT EXISTS excludes TEXT[],
ADD COLUMN IF NOT EXISTS risk_factors TEXT[],
ADD COLUMN IF NOT EXISTS evaluation_focus JSONB,
ADD COLUMN IF NOT EXISTS pillar_weights JSONB,
ADD COLUMN IF NOT EXISTS keywords TEXT[],
ADD COLUMN IF NOT EXISTS is_hardware BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0';

-- Copy name_fr to name where name is empty
UPDATE product_types
SET name = name_fr
WHERE name IS NULL AND name_fr IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'product_types'
ORDER BY ordinal_position;
