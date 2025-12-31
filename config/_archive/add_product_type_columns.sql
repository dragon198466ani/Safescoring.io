-- Add definition columns to product types
-- Run in Supabase SQL Editor

-- Definition columns
ALTER TABLE product_types 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS examples TEXT,
ADD COLUMN IF NOT EXISTS advantages TEXT,
ADD COLUMN IF NOT EXISTS disadvantages TEXT,
ADD COLUMN IF NOT EXISTS pillar_scores JSONB DEFAULT '{}';

-- Score columns by configuration (Full, Consumer, Essential)
-- Each column contains {S: %, A: %, F: %, E: %, SAFE: %}
ALTER TABLE product_types 
ADD COLUMN IF NOT EXISTS scores_full JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS scores_consumer JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS scores_essential JSONB DEFAULT '{}';

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_types';
