-- Migration 069: Summary Verification Tracking
-- Marks AI-generated summaries as verified/unverified based on source quality
-- Created: 2026-01-15

-- ============================================================================
-- 1. ADD VERIFICATION COLUMNS TO NORMS TABLE
-- ============================================================================

ALTER TABLE norms
ADD COLUMN IF NOT EXISTS summary_verified BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS summary_source VARCHAR(50) DEFAULT 'scraped',
ADD COLUMN IF NOT EXISTS summary_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS summary_verification_notes TEXT;

-- summary_source values:
--   'scraped' = Successfully scraped from official link
--   'fallback_description' = Used norm description as source
--   'fallback_ai' = AI generated from title only (UNRELIABLE!)
--   'manual_pdf' = Manually provided PDF document
--   'verified_pdf' = Verified against official PDF

COMMENT ON COLUMN norms.summary_verified IS 'Whether the summary was verified against official documentation';
COMMENT ON COLUMN norms.summary_source IS 'Source of the summary: scraped, fallback_description, fallback_ai, manual_pdf, verified_pdf';

-- ============================================================================
-- 2. MARK PAYWALL SOURCES AS UNVERIFIED
-- ============================================================================

-- ISO standards (paywall)
UPDATE norms
SET summary_verified = FALSE,
    summary_source = 'fallback_ai',
    summary_verification_notes = 'ISO paywall - summary generated from AI knowledge, not official document'
WHERE official_link ILIKE '%iso.org%'
  AND official_doc_summary IS NOT NULL;

-- ASTM standards (paywall)
UPDATE norms
SET summary_verified = FALSE,
    summary_source = 'fallback_ai',
    summary_verification_notes = 'ASTM paywall - summary generated from AI knowledge, not official document'
WHERE official_link ILIKE '%astm.org%'
  AND official_doc_summary IS NOT NULL;

-- IEEE standards (paywall)
UPDATE norms
SET summary_verified = FALSE,
    summary_source = 'fallback_ai',
    summary_verification_notes = 'IEEE paywall - summary generated from AI knowledge, not official document'
WHERE (official_link ILIKE '%ieee.org%' OR official_link ILIKE '%ieeexplore%')
  AND official_doc_summary IS NOT NULL;

-- SAE standards (paywall)
UPDATE norms
SET summary_verified = FALSE,
    summary_source = 'fallback_ai',
    summary_verification_notes = 'SAE paywall - summary generated from AI knowledge, not official document'
WHERE official_link ILIKE '%sae.org%'
  AND official_doc_summary IS NOT NULL;

-- MIL-STD (often timeout)
UPDATE norms
SET summary_verified = FALSE,
    summary_source = 'fallback_ai',
    summary_verification_notes = 'MIL-STD source often timeouts - summary may be from AI knowledge'
WHERE official_link ILIKE '%dla.mil%'
  AND official_doc_summary IS NOT NULL;

-- ============================================================================
-- 3. MARK VERIFIED SOURCES
-- ============================================================================

-- GitHub (usually works well)
UPDATE norms
SET summary_verified = TRUE,
    summary_source = 'scraped'
WHERE official_link ILIKE '%github.com%'
  AND official_doc_summary IS NOT NULL
  AND summary_verified IS NULL;

-- NIST (public documents)
UPDATE norms
SET summary_verified = TRUE,
    summary_source = 'scraped'
WHERE official_link ILIKE '%nist.gov%'
  AND official_doc_summary IS NOT NULL
  AND summary_verified IS NULL;

-- IETF RFCs (public)
UPDATE norms
SET summary_verified = TRUE,
    summary_source = 'scraped'
WHERE official_link ILIKE '%ietf.org%'
  AND official_doc_summary IS NOT NULL
  AND summary_verified IS NULL;

-- Ethereum EIPs (public)
UPDATE norms
SET summary_verified = TRUE,
    summary_source = 'scraped'
WHERE official_link ILIKE '%eips.ethereum.org%'
  AND official_doc_summary IS NOT NULL
  AND summary_verified IS NULL;

-- OWASP (public)
UPDATE norms
SET summary_verified = TRUE,
    summary_source = 'scraped'
WHERE official_link ILIKE '%owasp.org%'
  AND official_doc_summary IS NOT NULL
  AND summary_verified IS NULL;

-- W3C (public)
UPDATE norms
SET summary_verified = TRUE,
    summary_source = 'scraped'
WHERE official_link ILIKE '%w3.org%'
  AND official_doc_summary IS NOT NULL
  AND summary_verified IS NULL;

-- ============================================================================
-- 4. CREATE VIEW FOR UNVERIFIED SUMMARIES
-- ============================================================================

CREATE OR REPLACE VIEW v_unverified_summaries AS
SELECT
    id,
    code,
    title,
    official_link,
    summary_source,
    summary_verification_notes,
    LENGTH(official_doc_summary) as summary_length
FROM norms
WHERE summary_verified = FALSE
  AND official_doc_summary IS NOT NULL
ORDER BY code;

-- ============================================================================
-- 5. FUNCTION TO GET VERIFICATION STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_summary_verification_stats()
RETURNS TABLE (
    source_type VARCHAR(50),
    verified_count BIGINT,
    unverified_count BIGINT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(summary_source, 'unknown') as source_type,
        COUNT(*) FILTER (WHERE summary_verified = TRUE) as verified_count,
        COUNT(*) FILTER (WHERE summary_verified = FALSE) as unverified_count,
        COUNT(*) as total_count
    FROM norms
    WHERE official_doc_summary IS NOT NULL
    GROUP BY summary_source
    ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. INDEX FOR QUICK FILTERING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_norms_summary_verified
ON norms(summary_verified)
WHERE official_doc_summary IS NOT NULL;
