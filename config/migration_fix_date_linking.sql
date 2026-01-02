-- Migration: Fix Date Linking for Product-Incident Correlation
-- SafeScoring - Data Integrity Improvements
--
-- This migration addresses the following issues:
-- 1. Adds date_is_estimated flag for incidents with unknown dates
-- 2. Adds validation constraints to prevent future dates
-- 3. Creates a unified timeline view for product-incident correlation
-- 4. Ensures unique product data integrity

-- ============================================================================
-- PART 1: Add date_is_estimated column to security_incidents
-- ============================================================================

-- Add column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'security_incidents'
        AND column_name = 'date_is_estimated'
    ) THEN
        ALTER TABLE security_incidents
        ADD COLUMN date_is_estimated BOOLEAN DEFAULT FALSE;

        COMMENT ON COLUMN security_incidents.date_is_estimated IS
            'True if incident_date is unknown/estimated. Prevents confusion with historical incidents.';
    END IF;
END $$;

-- Update existing incidents with placeholder dates to mark as estimated
UPDATE security_incidents
SET date_is_estimated = TRUE
WHERE incident_date = '1970-01-01T00:00:00Z'::timestamp
   OR incident_date < '2010-01-01'::timestamp;

-- ============================================================================
-- PART 2: Add date validation constraints
-- ============================================================================

-- Prevent future incident dates (with 1 day tolerance for timezone issues)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_incident_date_not_future'
    ) THEN
        ALTER TABLE security_incidents
        ADD CONSTRAINT chk_incident_date_not_future
        CHECK (incident_date <= (NOW() + INTERVAL '1 day'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Ensure calculated_at is always set and not in future
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_calculated_at_not_future'
    ) THEN
        ALTER TABLE safe_scoring_results
        ADD CONSTRAINT chk_calculated_at_not_future
        CHECK (calculated_at <= (NOW() + INTERVAL '1 day'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 3: Create unified product-incident timeline view
-- ============================================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS v_product_incident_timeline;

-- Create comprehensive timeline view
CREATE OR REPLACE VIEW v_product_incident_timeline AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.slug AS product_slug,

    -- Score history data
    sh.id AS score_history_id,
    sh.recorded_at AS score_date,
    sh.safe_score,
    sh.score_s,
    sh.score_a,
    sh.score_f,
    sh.score_e,

    -- Incident data (if linked)
    si.id AS incident_id,
    si.incident_id AS incident_code,
    si.title AS incident_title,
    si.incident_date,
    si.date_is_estimated,
    si.severity AS incident_severity,
    si.funds_lost_usd AS incident_funds_lost,
    si.status AS incident_status,

    -- Impact data
    ipi.impact_level,
    ipi.funds_lost_usd AS product_specific_loss,

    -- Computed: Was score calculated before or after incident?
    CASE
        WHEN si.incident_date IS NOT NULL AND sh.recorded_at IS NOT NULL THEN
            CASE
                WHEN sh.recorded_at > si.incident_date THEN 'score_after_incident'
                WHEN sh.recorded_at < si.incident_date THEN 'score_before_incident'
                ELSE 'same_day'
            END
        ELSE NULL
    END AS score_incident_relation,

    -- Computed: Days between incident and score recording
    CASE
        WHEN si.incident_date IS NOT NULL AND sh.recorded_at IS NOT NULL THEN
            EXTRACT(DAY FROM (sh.recorded_at - si.incident_date))::INTEGER
        ELSE NULL
    END AS days_between

FROM products p

-- Left join to get all products, even those without scores or incidents
LEFT JOIN score_history sh ON p.id = sh.product_id

-- Join incidents via the junction table
LEFT JOIN incident_product_impact ipi ON p.id = ipi.product_id
LEFT JOIN security_incidents si ON ipi.incident_id = si.id AND si.is_published = TRUE

ORDER BY p.id, COALESCE(sh.recorded_at, si.incident_date) DESC NULLS LAST;

-- Add comment to view
COMMENT ON VIEW v_product_incident_timeline IS
    'Unified view correlating product scores with security incidents over time.
     Use this to understand how incidents affected product scores.';

-- ============================================================================
-- PART 4: Create product score at incident time function
-- ============================================================================

-- Function to get product score at a specific date
CREATE OR REPLACE FUNCTION get_product_score_at_date(
    p_product_id INTEGER,
    p_date TIMESTAMP
) RETURNS TABLE (
    safe_score DECIMAL,
    score_s DECIMAL,
    score_a DECIMAL,
    score_f DECIMAL,
    score_e DECIMAL,
    recorded_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.safe_score,
        sh.score_s,
        sh.score_a,
        sh.score_f,
        sh.score_e,
        sh.recorded_at
    FROM score_history sh
    WHERE sh.product_id = p_product_id
      AND sh.recorded_at <= p_date
    ORDER BY sh.recorded_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_product_score_at_date IS
    'Returns the product score that was active at a given date.
     Useful for showing what score a product had when an incident occurred.';

-- ============================================================================
-- PART 5: Create data validation queries (for monitoring)
-- ============================================================================

-- View to identify data quality issues
CREATE OR REPLACE VIEW v_data_quality_issues AS
SELECT
    'future_incident_date' AS issue_type,
    si.id::TEXT AS record_id,
    si.title AS description,
    si.incident_date::TEXT AS problematic_value
FROM security_incidents si
WHERE si.incident_date > NOW()

UNION ALL

SELECT
    'orphaned_incident' AS issue_type,
    si.id::TEXT AS record_id,
    si.title AS description,
    'No products linked' AS problematic_value
FROM security_incidents si
WHERE NOT EXISTS (
    SELECT 1 FROM incident_product_impact ipi
    WHERE ipi.incident_id = si.id
)
AND si.is_published = TRUE

UNION ALL

SELECT
    'estimated_date_incident' AS issue_type,
    si.id::TEXT AS record_id,
    si.title AS description,
    si.incident_date::TEXT AS problematic_value
FROM security_incidents si
WHERE si.date_is_estimated = TRUE

UNION ALL

SELECT
    'missing_score' AS issue_type,
    p.id::TEXT AS record_id,
    p.name AS description,
    'No SAFE score calculated' AS problematic_value
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM safe_scoring_results ssr
    WHERE ssr.product_id = p.id
);

COMMENT ON VIEW v_data_quality_issues IS
    'Identifies data quality issues for monitoring and cleanup.';

-- ============================================================================
-- PART 6: Add indexes for performance
-- ============================================================================

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_score_history_product_date
ON score_history (product_id, recorded_at DESC);

-- Index for incident date queries
CREATE INDEX IF NOT EXISTS idx_incidents_date_published
ON security_incidents (incident_date DESC)
WHERE is_published = TRUE;

-- Index for incident-product lookups
CREATE INDEX IF NOT EXISTS idx_ipi_product_incident
ON incident_product_impact (product_id, incident_id);

-- ============================================================================
-- PART 7: Ensure unique product data (rule enforcement)
-- ============================================================================

-- Add unique constraint on product slug if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_slug_unique'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add unique constraint on product name within same type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_name_type_unique'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_name_type_unique UNIQUE (name, type_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to check results)
-- ============================================================================

-- Uncomment to verify:
-- SELECT COUNT(*) AS incidents_with_estimated_dates FROM security_incidents WHERE date_is_estimated = TRUE;
-- SELECT * FROM v_data_quality_issues LIMIT 20;
-- SELECT * FROM v_product_incident_timeline WHERE incident_id IS NOT NULL LIMIT 10;
