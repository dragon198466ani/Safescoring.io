-- ============================================================
-- MIGRATION 022: SCHEMA OPTIMIZATION
-- ============================================================
-- Purpose: Clean up redundant data, add missing indexes,
--          optimize query performance
-- Date: 2026-01-05
-- Author: SafeScoring Optimization
-- ============================================================

-- ============================================================
-- 1. REMOVE REDUNDANT legal_countries COLUMN
-- ============================================================
-- This column duplicates data from product_country_compliance table
-- and has a trigger that adds overhead on every compliance update

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_update_legal_countries ON product_country_compliance;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_product_legal_countries_trigger() CASCADE;

-- Drop the sync function
DROP FUNCTION IF EXISTS sync_legal_countries_from_compliance() CASCADE;

-- Drop the index
DROP INDEX IF EXISTS idx_products_legal_countries;

-- Remove the column
ALTER TABLE products DROP COLUMN IF EXISTS legal_countries;

-- ============================================================
-- 2. ADD MISSING COMPOSITE INDEXES
-- ============================================================

-- Product lookups by country + type (frequently used in filters)
CREATE INDEX IF NOT EXISTS idx_products_country_type
ON products(country_origin, type_id);

-- Product slug lookups (direct product access)
CREATE INDEX IF NOT EXISTS idx_products_slug
ON products(slug) WHERE slug IS NOT NULL;

-- Compliance queries: product + country (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_compliance_product_country
ON product_country_compliance(product_id, country_code);

-- Legislation: country + active status (used in compliance checks)
CREATE INDEX IF NOT EXISTS idx_legislation_country_active
ON crypto_legislation(country_code, status)
WHERE status IN ('in_effect', 'passed');

-- Physical incidents by date (for timeline queries)
-- Only create if incident_date column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'physical_incidents' AND column_name = 'incident_date'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_physical_incidents_date
        ON physical_incidents(incident_date DESC);
    END IF;
END $$;

-- User setups lookups
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'setups'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_setups_user
        ON setups(user_id) WHERE user_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================
-- 3. MATERIALIZED VIEW FOR COUNTRY LEGISLATION STATS
-- ============================================================
-- Replaces denormalized columns in country_crypto_profiles

DROP MATERIALIZED VIEW IF EXISTS mv_country_legislation_stats;

CREATE MATERIALIZED VIEW mv_country_legislation_stats AS
SELECT
    country_code,
    COUNT(*) as total_legislation_count,
    COUNT(*) FILTER (WHERE status IN ('in_effect', 'passed')) as active_legislation_count,
    MAX(effective_date) FILTER (WHERE status = 'in_effect') as last_major_legislation_date,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_laws_count,
    COUNT(*) FILTER (WHERE severity IN ('critical', 'high')) as high_impact_laws_count,
    ARRAY_AGG(DISTINCT category) FILTER (WHERE status = 'in_effect') as active_categories
FROM crypto_legislation
GROUP BY country_code;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_country_leg_stats_code
ON mv_country_legislation_stats(country_code);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_country_legislation_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_country_legislation_stats;
    RAISE NOTICE 'Country legislation stats refreshed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON MATERIALIZED VIEW mv_country_legislation_stats IS
'Cached legislation statistics by country. Refresh daily or after bulk legislation updates.';

-- ============================================================
-- 4. REMOVE UNUSED search_vector FROM crypto_legislation
-- ============================================================
-- Not used in any API endpoints - adds overhead without benefit

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_update_legislation_search ON crypto_legislation;

-- Drop the function
DROP FUNCTION IF EXISTS update_legislation_search_vector() CASCADE;

-- Drop the index
DROP INDEX IF EXISTS idx_legislation_search;

-- Drop dependent views first
DROP VIEW IF EXISTS v_active_legislation CASCADE;

-- Remove the column
ALTER TABLE crypto_legislation DROP COLUMN IF EXISTS search_vector;

-- ============================================================
-- 5. CLEAN UP physical_incidents REDUNDANCY
-- ============================================================
-- Remove products_compromised array (use physical_incident_product_impact instead)

-- First, migrate any data from array to junction table (if not already there)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'physical_incidents' AND column_name = 'products_compromised'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'physical_incident_product_impact'
    ) THEN
        -- Check if impact_type column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'physical_incident_product_impact' AND column_name = 'impact_type'
        ) THEN
            INSERT INTO physical_incident_product_impact (incident_id, product_id, impact_type)
            SELECT
                pi.id as incident_id,
                unnest(pi.products_compromised) as product_id,
                'affected' as impact_type
            FROM physical_incidents pi
            WHERE pi.products_compromised IS NOT NULL
              AND array_length(pi.products_compromised, 1) > 0
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO physical_incident_product_impact (incident_id, product_id)
            SELECT
                pi.id as incident_id,
                unnest(pi.products_compromised) as product_id
            FROM physical_incidents pi
            WHERE pi.products_compromised IS NOT NULL
              AND array_length(pi.products_compromised, 1) > 0
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- Now remove the redundant array column
ALTER TABLE physical_incidents DROP COLUMN IF EXISTS products_compromised;

-- Add index for reverse lookups (which incidents affected product X?)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'physical_incident_product_impact'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_incident_product_impact_product
        ON physical_incident_product_impact(product_id);
    END IF;
END $$;

-- ============================================================
-- 6. OPTIMIZE country_crypto_profiles
-- ============================================================
-- Remove denormalized columns that are now in materialized view

ALTER TABLE country_crypto_profiles
DROP COLUMN IF EXISTS total_legislation_count,
DROP COLUMN IF EXISTS active_legislation_count,
DROP COLUMN IF EXISTS last_major_legislation_date;

-- ============================================================
-- 7. CREATE HELPER VIEW FOR PRODUCT AVAILABILITY
-- ============================================================
-- Replaces the need for legal_countries column

CREATE OR REPLACE VIEW v_product_legal_countries AS
SELECT
    p.id as product_id,
    p.slug,
    p.name,
    p.country_origin,
    p.countries_operating,
    ARRAY_AGG(DISTINCT pcc.country_code ORDER BY pcc.country_code)
        FILTER (WHERE pcc.status IN ('available', 'available_restricted')) as legal_countries,
    ARRAY_AGG(DISTINCT pcc.country_code ORDER BY pcc.country_code)
        FILTER (WHERE pcc.status = 'banned') as banned_countries,
    COUNT(DISTINCT pcc.country_code)
        FILTER (WHERE pcc.status IN ('available', 'available_restricted')) as legal_country_count
FROM products p
LEFT JOIN product_country_compliance pcc ON pcc.product_id = p.id
GROUP BY p.id, p.slug, p.name, p.country_origin, p.countries_operating;

COMMENT ON VIEW v_product_legal_countries IS
'Dynamic view of product legal status by country. Use this instead of the removed legal_countries column.';

-- ============================================================
-- 8. VERIFICATION
-- ============================================================

SELECT
    'Schema Optimization Complete!' as status,
    (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%') as total_custom_indexes,
    (SELECT COUNT(*) FROM pg_matviews WHERE matviewname = 'mv_country_legislation_stats') as materialized_views_created;

-- Show new indexes
SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE indexname IN (
    'idx_products_country_type',
    'idx_products_slug',
    'idx_compliance_product_country',
    'idx_legislation_country_active',
    'idx_physical_incidents_date',
    'idx_setups_user',
    'idx_incident_product_impact_product'
);

-- ============================================================
-- END OF MIGRATION 022
-- ============================================================
