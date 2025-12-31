-- ============================================
-- SAFESCORING.IO - Multi-Type Support Migration
-- Allows products to have multiple types
-- ============================================

-- 1. Create the product_type_mapping table (many-to-many)
CREATE TABLE IF NOT EXISTS product_type_mapping (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type_id INTEGER NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,  -- Primary type for display
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, type_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ptm_product_id ON product_type_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_ptm_type_id ON product_type_mapping(type_id);
CREATE INDEX IF NOT EXISTS idx_ptm_is_primary ON product_type_mapping(is_primary);

-- Comments
COMMENT ON TABLE product_type_mapping IS 'Many-to-many relationship between products and types. A product can have multiple types.';
COMMENT ON COLUMN product_type_mapping.is_primary IS 'TRUE for the main/primary type used for display purposes';

-- 2. Migrate existing type_id data to the new table
INSERT INTO product_type_mapping (product_id, type_id, is_primary)
SELECT id, type_id, TRUE
FROM products
WHERE type_id IS NOT NULL
ON CONFLICT (product_id, type_id) DO NOTHING;

-- 3. Create a view for easy querying of product types
CREATE OR REPLACE VIEW v_product_types AS
SELECT
    p.id as product_id,
    p.name as product_name,
    p.slug,
    ARRAY_AGG(pt.id ORDER BY ptm.is_primary DESC, pt.code) as type_ids,
    ARRAY_AGG(pt.code ORDER BY ptm.is_primary DESC, pt.code) as type_codes,
    ARRAY_AGG(pt.name ORDER BY ptm.is_primary DESC, pt.code) as type_names,
    (SELECT pt2.code FROM product_type_mapping ptm2
     JOIN product_types pt2 ON ptm2.type_id = pt2.id
     WHERE ptm2.product_id = p.id AND ptm2.is_primary = TRUE
     LIMIT 1) as primary_type_code
FROM products p
LEFT JOIN product_type_mapping ptm ON p.id = ptm.product_id
LEFT JOIN product_types pt ON ptm.type_id = pt.id
GROUP BY p.id, p.name, p.slug;

-- 4. Create a function to get all applicable norms for a product (union of all types)
CREATE OR REPLACE FUNCTION get_product_applicable_norms(p_product_id INTEGER)
RETURNS TABLE(norm_id INTEGER, is_applicable BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        na.norm_id,
        TRUE as is_applicable
    FROM product_type_mapping ptm
    JOIN norm_applicability na ON ptm.type_id = na.type_id
    WHERE ptm.product_id = p_product_id
    AND na.is_applicable = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to get product type IDs
CREATE OR REPLACE FUNCTION get_product_type_ids(p_product_id INTEGER)
RETURNS INTEGER[] AS $$
DECLARE
    result INTEGER[];
BEGIN
    SELECT ARRAY_AGG(type_id ORDER BY is_primary DESC)
    INTO result
    FROM product_type_mapping
    WHERE product_id = p_product_id;

    -- Fallback to old type_id if no mapping exists
    IF result IS NULL OR array_length(result, 1) IS NULL THEN
        SELECT ARRAY[type_id]
        INTO result
        FROM products
        WHERE id = p_product_id AND type_id IS NOT NULL;
    END IF;

    RETURN COALESCE(result, '{}');
END;
$$ LANGUAGE plpgsql;

-- 6. Verify migration
SELECT
    'Migration completed!' as status,
    (SELECT COUNT(*) FROM product_type_mapping) as mappings_created,
    (SELECT COUNT(DISTINCT product_id) FROM product_type_mapping) as products_with_types;

-- ============================================
-- USAGE EXAMPLES:
-- ============================================
--
-- Add a second type to a product:
-- INSERT INTO product_type_mapping (product_id, type_id, is_primary)
-- VALUES (123, 5, FALSE);
--
-- Get all types for a product:
-- SELECT * FROM v_product_types WHERE product_id = 123;
--
-- Get applicable norms for a product (union of all types):
-- SELECT * FROM get_product_applicable_norms(123);
--
-- Get type IDs array for a product:
-- SELECT get_product_type_ids(123);
-- ============================================
