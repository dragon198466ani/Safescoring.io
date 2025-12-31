-- ============================================
-- SAFESCORING.IO - Migration to English
-- Rename name_fr → name in product_types table
-- ============================================

-- Step 1: Rename column name_fr to name in product_types
ALTER TABLE product_types RENAME COLUMN name_fr TO name;

-- Step 2: Update the view that references name_fr
DROP VIEW IF EXISTS product_scores_view;

CREATE OR REPLACE VIEW product_scores_view AS
SELECT 
    p.id,
    p.name,
    p.slug,
    p.risk_score,
    p.security_status,
    p.last_security_scan,
    pt.name as type_name,
    b.name as brand_name,
    
    -- Calculate SAFE score (based on evaluations)
    COALESCE(
        (SELECT COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM norm_applicability WHERE type_id = p.type_id) * 100
         FROM evaluations e 
         JOIN norms n ON e.norm_id = n.id 
         WHERE e.product_id = p.id AND e.result = 'YES'), 0
    ) as safe_score_percent,
    
    -- Number of evaluations
    (SELECT COUNT(*) FROM evaluations WHERE product_id = p.id) as evaluations_count
    
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN brands b ON p.brand_id = b.id;

-- Step 3: Update comments to English
COMMENT ON TABLE products IS 'Central products table with JSONB specs and auto-calculated scores';
COMMENT ON TABLE evaluations IS 'AI evaluations of SAFE norms per product';
COMMENT ON TABLE automation_logs IS 'Monthly automatic execution logs';
COMMENT ON COLUMN products.specs IS 'Specifications extracted via Gemini/Mistral (JSONB)';
COMMENT ON COLUMN products.scores IS 'Security scores calculated automatically (JSONB)';
COMMENT ON COLUMN user_setups.products IS 'Multi-product configuration with roles (JSONB array)';

SELECT 'Migration to English completed successfully!' as status;
