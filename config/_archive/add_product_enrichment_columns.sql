-- ============================================
-- SAFESCORING.IO - Product enrichment columns
-- Price, Description, Country Origin, Excluded Countries, Headquarters
-- ============================================

-- Add columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_eur DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_details VARCHAR(200);
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description VARCHAR(150);
ALTER TABLE products ADD COLUMN IF NOT EXISTS country_origin VARCHAR(2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS excluded_countries TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS headquarters VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS year_founded INTEGER;

-- Index for searches
CREATE INDEX IF NOT EXISTS idx_products_country_origin ON products(country_origin);
CREATE INDEX IF NOT EXISTS idx_products_year_founded ON products(year_founded);

-- Comments
COMMENT ON COLUMN products.price_eur IS 'Price in EUR (null if free/variable)';
COMMENT ON COLUMN products.price_details IS 'Price details (e.g.: 0.1% fees, from 59€)';
COMMENT ON COLUMN products.short_description IS 'Short description';
COMMENT ON COLUMN products.country_origin IS 'Country of origin (ISO 2-letter code)';
COMMENT ON COLUMN products.excluded_countries IS 'List of countries where service is prohibited';
COMMENT ON COLUMN products.headquarters IS 'Headquarters (city, country)';
COMMENT ON COLUMN products.year_founded IS 'Year founded';

SELECT 'Enrichment columns added!' as status;
