-- ============================================================
-- SAFESCORING - APPLY GEOGRAPHY UPDATES
-- ============================================================
-- Ce script applique TOUTES les mises à jour de géographie en une fois:
-- 1. Migration 011 (ajoute legal_countries)
-- 2. Chargement des données géographiques (LOAD_ALL_DATA.sql)
-- 3. Vérification des données
-- ============================================================

\echo '========================================='
\echo 'SAFESCORING - GEOGRAPHY UPDATES'
\echo '========================================='
\echo ''

-- ============================================================
-- STEP 1: Migration - Add legal_countries column
-- ============================================================

\echo '📦 STEP 1/3: Adding legal_countries column...'
\echo ''

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

\echo '✅ Column legal_countries added!'
\echo ''

-- ============================================================
-- STEP 2: Create sync functions and triggers
-- ============================================================

\echo '🔧 STEP 2/3: Creating sync functions and triggers...'
\echo ''

-- Helper function to sync legal_countries from compliance table
CREATE OR REPLACE FUNCTION sync_legal_countries_from_compliance()
RETURNS void AS $$
BEGIN
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

-- Trigger function to auto-update legal_countries
CREATE OR REPLACE FUNCTION update_product_legal_countries_trigger()
RETURNS TRIGGER AS $$
BEGIN
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

\echo '✅ Sync functions and triggers created!'
\echo ''

-- ============================================================
-- STEP 3: Load geography data from LOAD_ALL_DATA.sql
-- ============================================================

\echo '📊 STEP 3/3: Loading geography data...'
\echo ''
\echo '   → Country origins and headquarters'
\echo '   → Legal countries for each product'
\echo ''

-- Include the LOAD_ALL_DATA.sql content here
-- (The actual data loading commands)

\i config/LOAD_ALL_DATA.sql

\echo ''
\echo '✅ Geography data loaded!'
\echo ''

-- ============================================================
-- VERIFICATION
-- ============================================================

\echo '========================================='
\echo 'VERIFICATION'
\echo '========================================='
\echo ''

-- Statistics
SELECT
    'GEOGRAPHY UPDATES COMPLETE!' as status,
    (SELECT COUNT(*) FROM products WHERE country_origin IS NOT NULL) as products_with_origin,
    (SELECT COUNT(*) FROM products WHERE headquarters IS NOT NULL) as products_with_headquarters,
    (SELECT COUNT(*) FROM products WHERE legal_countries IS NOT NULL) as products_with_legal_countries,
    (SELECT ROUND(AVG(ARRAY_LENGTH(legal_countries, 1))) FROM products WHERE legal_countries IS NOT NULL) as avg_legal_countries;

\echo ''
\echo '📋 Sample products with geography:'
\echo ''

-- Sample products
SELECT
    name,
    country_origin as origin,
    headquarters as hq,
    ARRAY_LENGTH(legal_countries, 1) as num_legal,
    legal_countries[1:3] as sample_countries
FROM products
WHERE country_origin IS NOT NULL AND legal_countries IS NOT NULL
ORDER BY ARRAY_LENGTH(legal_countries, 1) DESC
LIMIT 5;

\echo ''
\echo '========================================='
\echo '✅ ALL UPDATES APPLIED SUCCESSFULLY!'
\echo '========================================='
\echo ''
\echo 'Next steps:'
\echo '  1. Run seed_legislation_comprehensive.sql for legislation data'
\echo '  2. Run seed_product_compliance.sql for detailed compliance'
\echo '  3. Use enrich_products_ai.py for AI enrichment'
\echo ''
\echo 'Documentation: See GUIDE_GEOGRAPHIE_PRODUITS.md'
\echo ''
