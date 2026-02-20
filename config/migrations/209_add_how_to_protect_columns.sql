-- Migration 209: Add HOW TO PROTECT columns for strategic analyses v8
-- Adds pillar-specific protection advice and global product summaries

-- 1. Add how_to_protect column to product_pillar_analyses
ALTER TABLE product_pillar_analyses
ADD COLUMN IF NOT EXISTS how_to_protect JSONB;

-- 2. Add safe_global_summary column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS safe_global_summary JSONB;

-- 3. Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_safe_global_summary
ON products USING GIN (safe_global_summary);

CREATE INDEX IF NOT EXISTS idx_analyses_how_to_protect
ON product_pillar_analyses USING GIN (how_to_protect);

-- 4. Add comment for documentation
COMMENT ON COLUMN product_pillar_analyses.how_to_protect IS
'Pillar-specific HOW TO PROTECT advice: title, intro, steps, emergency, personalized_warnings, risk_level';

COMMENT ON COLUMN products.safe_global_summary IS
'Global SAFE summary across all pillars: overall_score, rating, pillar_scores, strongest/weakest, executive_summary';
