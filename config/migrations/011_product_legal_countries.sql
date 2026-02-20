-- ============================================================
-- MIGRATION 011: PRODUCT LEGAL COUNTRIES
-- ============================================================
-- Purpose: Add legal_countries field to track where products
--          can be legally used (complementing country_origin)
-- Date: 2026-01-03
-- Author: SafeScoring Geography Enhancement
-- ============================================================

-- ============================================================
-- 1. ADD LEGAL_COUNTRIES COLUMN
-- ============================================================

-- Add array field to store ISO 2-letter country codes where product is legal
ALTER TABLE products
ADD COLUMN IF NOT EXISTS legal_countries VARCHAR(2)[];

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_products_legal_countries
ON products USING GIN(legal_countries);

-- Add comment for documentation
COMMENT ON COLUMN products.legal_countries IS
'Array of ISO 2-letter country codes where the product can be legally used.
Complements country_origin (where product was created) and product_country_compliance table (detailed compliance status).
Example: {''US'', ''GB'', ''FR'', ''DE'', ''CA''} means product is legal in these 5 countries.';

-- ============================================================
-- 2. HELPER FUNCTION - Auto-populate legal_countries from compliance
-- ============================================================

CREATE OR REPLACE FUNCTION sync_legal_countries_from_compliance()
RETURNS void AS $$
BEGIN
    -- For each product, update legal_countries based on product_country_compliance
    UPDATE products p
    SET legal_countries = (
        SELECT ARRAY_AGG(DISTINCT pcc.country_code ORDER BY pcc.country_code)
        FROM product_country_compliance pcc
        WHERE pcc.product_id = p.id
          AND pcc.status IN ('available', 'available_restricted')
    )
    WHERE EXISTS (
        SELECT 1 FROM product_country_compliance pcc
        WHERE pcc.product_id = p.id
          AND pcc.status IN ('available', 'available_restricted')
    );

    RAISE NOTICE 'legal_countries synced from product_country_compliance table';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_legal_countries_from_compliance IS
'Synchronizes legal_countries column with product_country_compliance table.
Run this after updating compliance data to keep legal_countries in sync.';

-- ============================================================
-- 3. TRIGGER - Auto-update legal_countries on compliance changes
-- ============================================================

CREATE OR REPLACE FUNCTION update_product_legal_countries_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- When compliance entry is inserted/updated/deleted, refresh legal_countries
    IF (TG_OP = 'DELETE') THEN
        UPDATE products
        SET legal_countries = (
            SELECT ARRAY_AGG(DISTINCT pcc.country_code ORDER BY pcc.country_code)
            FROM product_country_compliance pcc
            WHERE pcc.product_id = OLD.product_id
              AND pcc.status IN ('available', 'available_restricted')
        )
        WHERE id = OLD.product_id;
        RETURN OLD;
    ELSE
        UPDATE products
        SET legal_countries = (
            SELECT ARRAY_AGG(DISTINCT pcc.country_code ORDER BY pcc.country_code)
            FROM product_country_compliance pcc
            WHERE pcc.product_id = NEW.product_id
              AND pcc.status IN ('available', 'available_restricted')
        )
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (idempotence)
DROP TRIGGER IF EXISTS trigger_update_legal_countries ON product_country_compliance;

-- Create trigger
CREATE TRIGGER trigger_update_legal_countries
    AFTER INSERT OR UPDATE OR DELETE ON product_country_compliance
    FOR EACH ROW
    EXECUTE FUNCTION update_product_legal_countries_trigger();

COMMENT ON TRIGGER trigger_update_legal_countries ON product_country_compliance IS
'Automatically updates products.legal_countries when compliance data changes';

-- ============================================================
-- 4. INITIAL SYNC - Populate existing data
-- ============================================================

-- Run the sync function to populate existing products
SELECT sync_legal_countries_from_compliance();

-- ============================================================
-- 5. VERIFICATION
-- ============================================================

SELECT
    'Legal Countries Column Added!' as status,
    (SELECT COUNT(*) FROM products WHERE legal_countries IS NOT NULL) as products_with_legal_countries,
    (SELECT COUNT(*) FROM products WHERE country_origin IS NOT NULL) as products_with_country_origin,
    (SELECT COUNT(DISTINCT product_id) FROM product_country_compliance) as products_in_compliance_table;

-- Example: Show products with their origin and legal countries
SELECT
    p.name,
    p.country_origin as origin,
    p.headquarters,
    p.legal_countries,
    ARRAY_LENGTH(p.legal_countries, 1) as num_legal_countries
FROM products p
WHERE p.legal_countries IS NOT NULL
ORDER BY ARRAY_LENGTH(p.legal_countries, 1) DESC NULLS LAST
LIMIT 10;

-- ============================================================
-- END OF MIGRATION 011
-- ============================================================
