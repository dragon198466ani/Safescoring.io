-- ============================================================
-- CLEANUP SCRIPT: Reset tables for migration 010 & 011
-- ============================================================
-- Run this BEFORE running 010_crypto_legislation.sql
-- ============================================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS v_product_global_availability CASCADE;
DROP VIEW IF EXISTS v_country_regulatory_summary CASCADE;
DROP VIEW IF EXISTS v_active_legislation CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_products_for_country(VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_country_regulatory_score(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS is_product_available_in_country(INTEGER, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS sync_legal_countries_from_compliance() CASCADE;
DROP FUNCTION IF EXISTS update_product_legal_countries_trigger() CASCADE;
DROP FUNCTION IF EXISTS update_legislation_search_vector() CASCADE;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS product_country_compliance CASCADE;
DROP TABLE IF EXISTS country_crypto_profiles CASCADE;
DROP TABLE IF EXISTS crypto_legislation CASCADE;

-- Drop legal_countries column from products if exists (from migration 011)
ALTER TABLE products DROP COLUMN IF EXISTS legal_countries;

SELECT 'Cleanup complete. Now run 010_crypto_legislation.sql then 011_product_legal_countries.sql' as status;
