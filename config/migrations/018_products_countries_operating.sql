-- ============================================================
-- MIGRATION 018: ADD COUNTRIES_OPERATING TO PRODUCTS
-- ============================================================
-- Purpose: Support multiple countries where a product operates
-- Data should be managed via Supabase dashboard or API
-- Date: 2025-01-04
-- ============================================================

-- Add countries_operating column as array of country codes
ALTER TABLE products ADD COLUMN IF NOT EXISTS countries_operating TEXT[] DEFAULT '{}';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_countries_operating
ON products USING GIN (countries_operating);

-- Initialize: Copy country_origin to countries_operating if empty
-- This ensures existing products have at least their origin country
UPDATE products
SET countries_operating = ARRAY[country_origin]
WHERE country_origin IS NOT NULL
  AND (countries_operating IS NULL OR array_length(countries_operating, 1) IS NULL);

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT
    'Migration 018 completed!' as status,
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE countries_operating IS NOT NULL AND array_length(countries_operating, 1) > 0) as with_countries
FROM products;

-- ============================================================
-- TO ADD COUNTRIES FOR A PRODUCT, USE:
--
-- UPDATE products
-- SET countries_operating = ARRAY['US', 'GB', 'FR', 'DE']
-- WHERE slug = 'binance';
--
-- Or use the API: PUT /api/products/[slug]/countries
-- ============================================================
