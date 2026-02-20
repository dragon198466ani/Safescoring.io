-- ============================================================
-- Migration 042: Fix NIST URLs + Summary Index Issue
-- Date: 2026-01-14
-- ============================================================

-- ============================================================
-- PART 1: Drop index on official_doc_summary to allow large text
-- PostgreSQL btree index has 8191 byte limit per row
-- ============================================================

-- Drop any indexes on official_doc_summary
DROP INDEX IF EXISTS idx_norms_official_doc_summary;
DROP INDEX IF EXISTS norms_official_doc_summary_idx;

-- Ensure column is TEXT type (not VARCHAR with limit)
DO $$
BEGIN
    ALTER TABLE norms ALTER COLUMN official_doc_summary TYPE TEXT;
    RAISE NOTICE 'official_doc_summary column updated to TEXT (unlimited)';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Column already TEXT or error: %', SQLERRM;
END $$;

-- ============================================================
-- PART 2: Fix NIST URLs - Use HTML publication pages instead of PDFs
-- ============================================================

-- NIST SP 800-63 (Digital Identity)
UPDATE norms SET official_link = 'https://pages.nist.gov/800-63-3/'
WHERE official_link LIKE '%NIST.SP.800-63%';

-- NIST SP 800-88 (Media Sanitization)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final'
WHERE official_link LIKE '%NIST.SP.800-88%';

-- NIST SP 800-34 (Contingency Planning)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final'
WHERE official_link LIKE '%NIST.SP.800-34%';

-- NIST SP 800-53 (Security Controls)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'
WHERE official_link LIKE '%NIST.SP.800-53%';

-- NIST SP 800-57 (Key Management)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final'
WHERE official_link LIKE '%NIST.SP.800-57%';

-- NIST SP 800-90A (Random Number Generation)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final'
WHERE official_link LIKE '%NIST.SP.800-90%';

-- NIST SP 800-132 (Password-Based Key Derivation)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-132/final'
WHERE official_link LIKE '%NIST.SP.800-132%';

-- NIST SP 800-185 (SHA-3 Derived Functions)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-185/final'
WHERE official_link LIKE '%NIST.SP.800-185%';

-- FIPS 140-3 (Cryptographic Modules)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/140/3/final'
WHERE official_link LIKE '%FIPS%140%' OR title ILIKE '%FIPS 140%';

-- FIPS 180-4 (Secure Hash Standard)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/180/4/final'
WHERE official_link LIKE '%FIPS%180%';

-- FIPS 186-5 (Digital Signature Standard)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/186/5/final'
WHERE official_link LIKE '%FIPS%186%';

-- FIPS 197 (AES)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/197/final'
WHERE official_link LIKE '%FIPS%197%';

-- FIPS 198-1 (HMAC)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/198/1/final'
WHERE official_link LIKE '%FIPS%198%';

-- FIPS 202 (SHA-3)
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/fips/202/final'
WHERE official_link LIKE '%FIPS%202%';

-- ============================================================
-- PART 3: Summary
-- ============================================================
DO $$
DECLARE
    nist_count INT;
BEGIN
    SELECT COUNT(*) INTO nist_count FROM norms WHERE official_link LIKE '%nist.gov%';
    RAISE NOTICE 'Migration 042 complete:';
    RAISE NOTICE '  NIST URLs fixed: %', nist_count;
END $$;
