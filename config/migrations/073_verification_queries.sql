-- =============================================================================
-- Migration 073: Verification Queries and Functions
-- =============================================================================
-- Purpose: Provide tools to verify norm data quality and completeness
-- Created: 2026-01-17
-- =============================================================================

-- =============================================================================
-- 1. VERIFICATION STATISTICS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_norm_verification_stats()
RETURNS TABLE (
    pillar CHAR(1),
    total_norms BIGINT,
    verified_count BIGINT,
    vendor_features BIGINT,
    unverified_count BIGINT,
    legacy_count BIGINT,
    with_official_link BIGINT,
    with_authority BIGINT,
    coverage_percent DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.pillar,
        COUNT(*) as total_norms,
        COUNT(*) FILTER (WHERE n.verification_status = 'verified') as verified_count,
        COUNT(*) FILTER (WHERE n.verification_status = 'vendor_feature') as vendor_features,
        COUNT(*) FILTER (WHERE n.verification_status IN ('unverified', 'ai_generated')) as unverified_count,
        COUNT(*) FILTER (WHERE n.is_legacy = TRUE) as legacy_count,
        COUNT(*) FILTER (WHERE n.official_link IS NOT NULL) as with_official_link,
        COUNT(*) FILTER (WHERE n.issuing_authority IS NOT NULL) as with_authority,
        ROUND(100.0 * COUNT(*) FILTER (WHERE n.verification_status = 'verified') /
              NULLIF(COUNT(*) FILTER (WHERE n.is_legacy = FALSE), 0), 2) as coverage_percent
    FROM norms n
    GROUP BY n.pillar
    ORDER BY n.pillar;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. UNVERIFIED NORMS NEEDING ATTENTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_unverified_norms(limit_count INT DEFAULT 50)
RETURNS TABLE (
    code VARCHAR,
    pillar CHAR,
    title VARCHAR,
    verification_status VARCHAR,
    has_official_link BOOLEAN,
    has_authority BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.code,
        n.pillar,
        n.title,
        n.verification_status,
        (n.official_link IS NOT NULL) as has_official_link,
        (n.issuing_authority IS NOT NULL) as has_authority
    FROM norms n
    WHERE n.verification_status NOT IN ('verified', 'vendor_feature')
      AND n.is_legacy = FALSE
    ORDER BY n.pillar, n.code
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. PILLAR BALANCE CHECK
-- =============================================================================

CREATE OR REPLACE VIEW v_pillar_balance AS
SELECT
    pillar,
    COUNT(*) as total_norms,
    COUNT(*) FILTER (WHERE is_essential) as essential_count,
    COUNT(*) FILTER (WHERE consumer) as consumer_count,
    COUNT(*) FILTER (WHERE is_legacy = FALSE) as active_count,
    STRING_AGG(DISTINCT scope_type, ', ') as scope_types,
    STRING_AGG(DISTINCT issuing_authority, ', ') as authorities
FROM norms
WHERE is_legacy = FALSE
GROUP BY pillar
ORDER BY pillar;

-- =============================================================================
-- 4. SOURCE DISTRIBUTION
-- =============================================================================

CREATE OR REPLACE VIEW v_norm_sources AS
SELECT
    COALESCE(issuing_authority, 'UNKNOWN') as authority,
    COUNT(*) as norm_count,
    STRING_AGG(DISTINCT pillar::TEXT, ', ') as pillars,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
    COUNT(*) FILTER (WHERE official_link IS NOT NULL) as with_links
FROM norms
WHERE is_legacy = FALSE
GROUP BY issuing_authority
ORDER BY norm_count DESC;

-- =============================================================================
-- 5. OFFICIAL LINK VALIDATION
-- =============================================================================

CREATE OR REPLACE VIEW v_link_domains AS
SELECT
    CASE
        WHEN official_link ILIKE '%github.com%' THEN 'GitHub'
        WHEN official_link ILIKE '%eips.ethereum.org%' THEN 'Ethereum EIPs'
        WHEN official_link ILIKE '%nist.gov%' THEN 'NIST'
        WHEN official_link ILIKE '%ietf.org%' THEN 'IETF'
        WHEN official_link ILIKE '%owasp.org%' THEN 'OWASP'
        WHEN official_link ILIKE '%iso.org%' THEN 'ISO (Paywall)'
        WHEN official_link ILIKE '%w3.org%' THEN 'W3C'
        WHEN official_link ILIKE '%gdpr-info.eu%' THEN 'GDPR'
        WHEN official_link ILIKE '%trezor.io%' THEN 'Trezor'
        WHEN official_link ILIKE '%ledger.com%' THEN 'Ledger'
        WHEN official_link ILIKE '%coldcard.com%' THEN 'Coldcard'
        ELSE 'Other'
    END as domain_category,
    COUNT(*) as norm_count,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_count
FROM norms
WHERE official_link IS NOT NULL
  AND is_legacy = FALSE
GROUP BY 1
ORDER BY norm_count DESC;

-- =============================================================================
-- 6. QUALITY SCORE PER NORM
-- =============================================================================

CREATE OR REPLACE VIEW v_norm_quality_score AS
SELECT
    code,
    pillar,
    title,
    (
        CASE WHEN official_link IS NOT NULL THEN 25 ELSE 0 END +
        CASE WHEN issuing_authority IS NOT NULL THEN 25 ELSE 0 END +
        CASE WHEN standard_reference IS NOT NULL THEN 15 ELSE 0 END +
        CASE WHEN verification_status = 'verified' THEN 20 ELSE 0 END +
        CASE WHEN description IS NOT NULL AND LENGTH(description) > 50 THEN 15 ELSE 0 END
    ) as quality_score,
    verification_status,
    is_legacy
FROM norms
ORDER BY quality_score DESC, pillar, code;

-- =============================================================================
-- 7. DAILY VERIFICATION REPORT FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_verification_report()
RETURNS TABLE (
    category TEXT,
    metric TEXT,
    value TEXT
) AS $$
DECLARE
    total_norms INT;
    active_norms INT;
    verified_norms INT;
    avg_quality DECIMAL;
BEGIN
    SELECT COUNT(*) INTO total_norms FROM norms;
    SELECT COUNT(*) INTO active_norms FROM norms WHERE is_legacy = FALSE;
    SELECT COUNT(*) INTO verified_norms FROM norms WHERE verification_status = 'verified';
    SELECT AVG(quality_score) INTO avg_quality FROM v_norm_quality_score WHERE is_legacy = FALSE;

    RETURN QUERY
    SELECT 'Summary'::TEXT, 'Total Norms'::TEXT, total_norms::TEXT
    UNION ALL
    SELECT 'Summary', 'Active Norms', active_norms::TEXT
    UNION ALL
    SELECT 'Summary', 'Verified Norms', verified_norms::TEXT
    UNION ALL
    SELECT 'Summary', 'Verification Rate', ROUND(100.0 * verified_norms / NULLIF(active_norms, 0), 1)::TEXT || '%'
    UNION ALL
    SELECT 'Summary', 'Average Quality Score', ROUND(avg_quality, 1)::TEXT || '/100'
    UNION ALL
    SELECT 'By Pillar', pillar::TEXT || ' - Active', active_count::TEXT
    FROM v_pillar_balance
    UNION ALL
    SELECT 'By Source', authority, norm_count::TEXT
    FROM v_norm_sources
    WHERE norm_count > 5;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. HEALTHCHECK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION norm_healthcheck()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    unverified_count INT;
    missing_links INT;
    missing_authority INT;
BEGIN
    SELECT COUNT(*) INTO unverified_count FROM norms
    WHERE verification_status NOT IN ('verified', 'vendor_feature') AND is_legacy = FALSE;

    SELECT COUNT(*) INTO missing_links FROM norms
    WHERE official_link IS NULL AND is_legacy = FALSE;

    SELECT COUNT(*) INTO missing_authority FROM norms
    WHERE issuing_authority IS NULL AND is_legacy = FALSE;

    RETURN QUERY
    SELECT
        'Unverified Norms'::TEXT,
        CASE WHEN unverified_count = 0 THEN 'PASS' ELSE 'WARN' END,
        unverified_count::TEXT || ' norms need verification'
    UNION ALL
    SELECT
        'Missing Official Links',
        CASE WHEN missing_links = 0 THEN 'PASS' ELSE 'WARN' END,
        missing_links::TEXT || ' norms missing official_link'
    UNION ALL
    SELECT
        'Missing Issuing Authority',
        CASE WHEN missing_authority = 0 THEN 'PASS' ELSE 'WARN' END,
        missing_authority::TEXT || ' norms missing issuing_authority';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

COMMENT ON FUNCTION get_norm_verification_stats() IS
'Returns verification statistics per pillar. Usage: SELECT * FROM get_norm_verification_stats();';

COMMENT ON FUNCTION get_unverified_norms(INT) IS
'Lists unverified norms needing attention. Usage: SELECT * FROM get_unverified_norms(20);';

COMMENT ON FUNCTION generate_verification_report() IS
'Generates a complete verification report. Usage: SELECT * FROM generate_verification_report();';

COMMENT ON FUNCTION norm_healthcheck() IS
'Quick healthcheck for norm data quality. Usage: SELECT * FROM norm_healthcheck();';

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Migration 073 Complete ===';
    RAISE NOTICE 'Verification tools installed:';
    RAISE NOTICE '  - get_norm_verification_stats()';
    RAISE NOTICE '  - get_unverified_norms(limit)';
    RAISE NOTICE '  - generate_verification_report()';
    RAISE NOTICE '  - norm_healthcheck()';
    RAISE NOTICE '';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '  - v_pillar_balance';
    RAISE NOTICE '  - v_norm_sources';
    RAISE NOTICE '  - v_link_domains';
    RAISE NOTICE '  - v_norm_quality_score';
    RAISE NOTICE '';
    RAISE NOTICE 'Run: SELECT * FROM norm_healthcheck();';
END $$;
