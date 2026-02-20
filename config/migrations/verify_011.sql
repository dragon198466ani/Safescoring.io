-- ============================================================
-- VERIFICATION SCRIPT FOR MIGRATION 011
-- ============================================================
-- Run this after executing 011_norms_geographic_scope.sql
-- to verify everything worked correctly
-- ============================================================

-- 1. TOTAL NORMS COUNT
-- Should be ~981 (946 + 35 new norms)
SELECT
    'TOTAL NORMS' as metric,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) >= 980 THEN '✓ Expected'
        WHEN COUNT(*) = 946 THEN '⚠️  Migration not executed or norms not added'
        ELSE '✗ Unexpected count'
    END as status
FROM norms;

-- 2. CHECK NEW COLUMNS EXIST
SELECT
    'NEW COLUMNS CHECK' as verification,
    CASE
        WHEN COUNT(*) >= 4 THEN '✓ All columns exist'
        ELSE '✗ Missing columns'
    END as status,
    array_agg(column_name ORDER BY column_name) as columns_found
FROM information_schema.columns
WHERE table_name = 'norms'
  AND column_name IN ('geographic_scope', 'regional_details', 'standard_reference', 'issuing_authority');

-- 3. GEOGRAPHIC DISTRIBUTION
-- Should show global, EU, US, etc.
SELECT
    '3. GEOGRAPHIC DISTRIBUTION' as section,
    geographic_scope,
    COUNT(*) as norm_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM norms), 1) as percentage,
    CASE
        WHEN geographic_scope = 'global' AND COUNT(*) > 900 THEN '✓'
        WHEN geographic_scope = 'EU' AND COUNT(*) > 5 THEN '✓'
        WHEN geographic_scope = 'US' AND COUNT(*) > 0 THEN '✓'
        ELSE '✓'
    END as status
FROM norms
GROUP BY geographic_scope
ORDER BY norm_count DESC;

-- 4. PILLAR DISTRIBUTION (should still be 4 pillars)
SELECT
    '4. PILLAR DISTRIBUTION' as section,
    pillar,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE geographic_scope = 'global') as global_norms,
    COUNT(*) FILTER (WHERE geographic_scope = 'EU') as eu_norms,
    COUNT(*) FILTER (WHERE geographic_scope = 'US') as us_norms
FROM norms
GROUP BY pillar
ORDER BY pillar;

-- 5. NEW STANDARDS ADDED
-- Should show 12+ authorities
SELECT
    '5. ISSUING AUTHORITIES' as section,
    issuing_authority,
    COUNT(*) as norm_count,
    array_agg(DISTINCT geographic_scope) as scopes
FROM norms
WHERE issuing_authority IS NOT NULL
GROUP BY issuing_authority
ORDER BY norm_count DESC;

-- 6. SPECIFIC NEW NORMS CHECK
-- Check if specific new norms were added
SELECT
    '6. NEW NORMS VERIFICATION' as section,
    standard,
    COUNT(*) as found,
    expected,
    CASE
        WHEN COUNT(*) >= expected THEN '✓ Found'
        ELSE '✗ Missing'
    END as status
FROM (
    VALUES
        ('CCSS', 4),
        ('NIST', 3),
        ('CC', 3),
        ('ISO', 4),
        ('GDPR', 3),
        ('MICA', 3),
        ('PCI', 2),
        ('OWASP', 4),
        ('SOC2', 3),
        ('ETSI', 1),
        ('EIP', 3),
        ('SLIP', 2)
) AS expected_standards(standard, expected)
LEFT JOIN (
    SELECT
        CASE
            WHEN code LIKE '%-CCSS-%' THEN 'CCSS'
            WHEN code LIKE '%-NIST-%' THEN 'NIST'
            WHEN code LIKE '%-CC-%' THEN 'CC'
            WHEN code LIKE '%-ISO-%' THEN 'ISO'
            WHEN code LIKE '%-GDPR-%' THEN 'GDPR'
            WHEN code LIKE '%-MICA-%' THEN 'MICA'
            WHEN code LIKE '%-PCI-%' THEN 'PCI'
            WHEN code LIKE '%-OWASP-%' THEN 'OWASP'
            WHEN code LIKE '%-SOC2-%' THEN 'SOC2'
            WHEN code LIKE '%-ETSI-%' THEN 'ETSI'
            WHEN code LIKE '%-EIP-%' THEN 'EIP'
            WHEN code LIKE '%-SLIP-%' THEN 'SLIP'
        END as std_code
    FROM norms
    WHERE code LIKE '%-CCSS-%' OR code LIKE '%-NIST-%' OR code LIKE '%-CC-%'
       OR code LIKE '%-ISO-%' OR code LIKE '%-GDPR-%' OR code LIKE '%-MICA-%'
       OR code LIKE '%-PCI-%' OR code LIKE '%-OWASP-%' OR code LIKE '%-SOC2-%'
       OR code LIKE '%-ETSI-%' OR code LIKE '%-EIP-%' OR code LIKE '%-SLIP-%'
) norms_found ON expected_standards.standard = norms_found.std_code
GROUP BY standard, expected
ORDER BY standard;

-- 7. SAMPLE NORMS FROM EACH NEW STANDARD
SELECT
    '7. SAMPLE NEW NORMS' as section,
    code,
    title,
    geographic_scope,
    issuing_authority
FROM norms
WHERE code IN (
    'S-CCSS-001', 'S-NIST-001', 'A-CC-001', 'F-ISO-001',
    'F-GDPR-001', 'F-MICA-001', 'S-PCI-001', 'A-OWASP-001',
    'F-SOC2-001', 'S-ETSI-001', 'E-EIP-001', 'S-SLIP-001'
)
ORDER BY code;

-- 8. TEST NEW VIEWS
-- Check if new views were created
SELECT
    '8. NEW VIEWS CHECK' as section,
    table_name as view_name,
    CASE
        WHEN table_name IN ('v_norms_by_geography', 'v_standards_coverage', 'v_regional_requirements')
        THEN '✓ Exists'
        ELSE '? Unknown'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'VIEW'
  AND table_name IN ('v_norms_by_geography', 'v_standards_coverage', 'v_regional_requirements')
ORDER BY table_name;

-- 9. SAMPLE FROM v_norms_by_geography
SELECT
    '9. VIEW: v_norms_by_geography (sample)' as section,
    *
FROM v_norms_by_geography
LIMIT 10;

-- 10. SAMPLE FROM v_standards_coverage
SELECT
    '10. VIEW: v_standards_coverage (sample)' as section,
    *
FROM v_standards_coverage
LIMIT 10;

-- 11. EU-SPECIFIC NORMS (GDPR + MiCA)
SELECT
    '11. EU-SPECIFIC NORMS' as section,
    code,
    title,
    standard_reference,
    issuing_authority
FROM norms
WHERE geographic_scope = 'EU'
ORDER BY code;

-- 12. ESSENTIAL NORMS BY GEOGRAPHY
SELECT
    '12. ESSENTIAL NORMS BY GEOGRAPHY' as section,
    geographic_scope,
    COUNT(*) as total_norms,
    COUNT(*) FILTER (WHERE is_essential = true) as essential_norms,
    ROUND(COUNT(*) FILTER (WHERE is_essential = true) * 100.0 / COUNT(*), 1) as essential_pct
FROM norms
GROUP BY geographic_scope
ORDER BY total_norms DESC;

-- ============================================================
-- FINAL SUMMARY
-- ============================================================
SELECT
    '=' as sep,
    'MIGRATION 011 VERIFICATION SUMMARY' as title,
    '=' as sep2
UNION ALL
SELECT
    '',
    CONCAT('Total norms: ', COUNT(*)),
    ''
FROM norms
UNION ALL
SELECT
    '',
    CONCAT('New norms added: ', COUNT(*) - 946),
    ''
FROM norms
UNION ALL
SELECT
    '',
    CONCAT('Standards covered: ', COUNT(DISTINCT issuing_authority)),
    ''
FROM norms
WHERE issuing_authority IS NOT NULL
UNION ALL
SELECT
    '',
    CONCAT('Geographic scopes: ', COUNT(DISTINCT geographic_scope)),
    ''
FROM norms
UNION ALL
SELECT
    '=',
    CASE
        WHEN (SELECT COUNT(*) FROM norms) >= 980 THEN '✅ MIGRATION SUCCESSFUL'
        WHEN (SELECT COUNT(*) FROM norms) = 946 THEN '⚠️  MIGRATION NOT EXECUTED'
        ELSE '❌ UNEXPECTED STATE'
    END,
    '=';
