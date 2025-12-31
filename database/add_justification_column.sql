-- ============================================================
-- SAFESCORING.IO - Add Justification Column Migration
-- ============================================================
-- Quick migration to add ai_justification column
-- Run this on existing Supabase instance
-- Date: 2025-12-31
-- ============================================================

-- Add the ai_justification column to product_compatibility table
ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS ai_justification TEXT;

-- Add the ai_confidence_factors column to product_compatibility table
ALTER TABLE product_compatibility
ADD COLUMN IF NOT EXISTS ai_confidence_factors VARCHAR(300);

-- Add comments
COMMENT ON COLUMN product_compatibility.ai_justification IS 'AI-generated justification explaining WHY products are compatible or incompatible';
COMMENT ON COLUMN product_compatibility.ai_confidence_factors IS 'List of factors used to calculate confidence score (e.g. +official_docs +same_network -closed_ecosystem)';

-- Drop and recreate the view (required when adding columns)
DROP VIEW IF EXISTS v_product_compatibility;
CREATE VIEW v_product_compatibility AS
SELECT
    pc.id,
    pc.product_a_id,
    pa.name as product_a_name,
    pa.slug as product_a_slug,
    pc.product_b_id,
    pb.name as product_b_name,
    pb.slug as product_b_slug,
    pc.type_compatible,
    pc.ai_compatible,
    pc.ai_confidence,
    pc.ai_confidence_factors,
    pc.ai_method,
    pc.ai_steps,
    pc.ai_limitations,
    pc.ai_justification,
    pc.analyzed_at,
    pc.analyzed_by,
    CASE
        WHEN pc.ai_confidence >= 0.85 THEN 'native'
        WHEN pc.ai_confidence >= 0.70 THEN 'compatible'
        WHEN pc.ai_confidence >= 0.50 THEN 'partial'
        WHEN pc.ai_confidence >= 0.30 THEN 'difficult'
        WHEN pc.ai_confidence IS NOT NULL THEN 'not_recommended'
        ELSE 'unknown'
    END as compatibility_level
FROM product_compatibility pc
JOIN products pa ON pa.id = pc.product_a_id
JOIN products pb ON pb.id = pc.product_b_id
ORDER BY pc.ai_confidence DESC NULLS LAST;

-- Update the function to return justification and confidence_factors
DROP FUNCTION IF EXISTS get_product_compatibility(INTEGER, INTEGER);
CREATE FUNCTION get_product_compatibility(p_product_a_id INTEGER, p_product_b_id INTEGER)
RETURNS TABLE (
    type_compatible BOOLEAN,
    ai_compatible BOOLEAN,
    ai_confidence DECIMAL(3,2),
    ai_confidence_factors VARCHAR(300),
    ai_method VARCHAR(500),
    ai_steps TEXT,
    ai_limitations TEXT,
    ai_justification TEXT,
    analyzed_at TIMESTAMP,
    analyzed_by VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT pc.type_compatible, pc.ai_compatible, pc.ai_confidence, pc.ai_confidence_factors,
           pc.ai_method, pc.ai_steps, pc.ai_limitations, pc.ai_justification, pc.analyzed_at, pc.analyzed_by
    FROM product_compatibility pc
    WHERE (pc.product_a_id = p_product_a_id AND pc.product_b_id = p_product_b_id)
       OR (pc.product_a_id = p_product_b_id AND pc.product_b_id = p_product_a_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DONE
-- ============================================================
SELECT 'ai_justification + ai_confidence_factors columns added successfully!' as status;
