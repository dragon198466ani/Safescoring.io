-- ============================================================
-- Migration 044: Fix Failing URLs
-- Date: 2026-01-14
-- ============================================================
-- Fix URLs that return 404 or are blocked by WAF
-- ============================================================

-- NIST SP 800-72 (Guidelines on PDA Forensics) - correct URL
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-72/final'
WHERE official_link LIKE '%NIST.SP.800-72%';

-- NIST SP 800-132 (PBKDF) - use publication page not PDF
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-132/final'
WHERE official_link LIKE '%NIST.SP.800-132%' OR code = 'S09';

-- SLIP-39 (Shamir's Secret Sharing) - use raw GitHub
UPDATE norms SET official_link = 'https://raw.githubusercontent.com/satoshilabs/slips/master/slip-0039.md'
WHERE official_link LIKE '%trezor/slips%slip-39%' OR official_link LIKE '%satoshilabs/slips%slip-39%';

-- All SLIP standards - use raw GitHub URLs
UPDATE norms SET official_link = REPLACE(official_link, 'github.com/satoshilabs/slips/blob/master', 'raw.githubusercontent.com/satoshilabs/slips/master')
WHERE official_link LIKE '%github.com/satoshilabs/slips/blob/master%';

UPDATE norms SET official_link = REPLACE(official_link, 'github.com/trezor/slips/blob/master', 'raw.githubusercontent.com/satoshilabs/slips/master')
WHERE official_link LIKE '%github.com/trezor/slips/blob/master%';

-- Common Criteria - use direct CC portal docs
UPDATE norms SET official_link = 'https://www.commoncriteriaportal.org/files/ccfiles/CCPART1V3.1R5.pdf'
WHERE official_link = 'https://www.commoncriteriaportal.org/' OR official_link = 'https://www.commoncriteriaportal.org/cc/';

-- CCSS (CryptoCurrency Security Standard) - use archived version
UPDATE norms SET official_link = 'https://github.com/CryptoSecStandard/CCSS/blob/master/README.md'
WHERE official_link LIKE '%ccss.info%';

-- CE Marking - European Commission - use specific regulation page
UPDATE norms SET official_link = 'https://single-market-economy.ec.europa.eu/single-market/ce-marking_en'
WHERE official_link LIKE '%ec.europa.eu/growth/tools-databases/nando%';

-- Polkadot - use documentation wiki
UPDATE norms SET official_link = 'https://wiki.polkadot.network/docs/learn-accounts'
WHERE official_link = 'https://polkadot.network/' AND (code LIKE '%E12%' OR title ILIKE '%polkadot%');

-- USB-IF - use spec overview page
UPDATE norms SET official_link = 'https://www.usb.org/document-library/usb-type-cr-cable-and-connector-specification-revision-22'
WHERE official_link = 'https://www.usb.org/' AND (code = 'E27' OR title ILIKE '%USB-C%');

-- Fix any remaining nvlpubs PDF URLs to use csrc publication pages
UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final'
WHERE official_link LIKE '%nvlpubs.nist.gov%800-57%';

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final'
WHERE official_link LIKE '%nvlpubs.nist.gov%800-90%';

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'
WHERE official_link LIKE '%nvlpubs.nist.gov%800-53%';

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final'
WHERE official_link LIKE '%nvlpubs.nist.gov%800-88%';

UPDATE norms SET official_link = 'https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final'
WHERE official_link LIKE '%nvlpubs.nist.gov%800-34%';

-- Summary
DO $$
DECLARE
    nist_count INT;
    github_count INT;
BEGIN
    SELECT COUNT(*) INTO nist_count FROM norms WHERE official_link LIKE '%csrc.nist.gov%';
    SELECT COUNT(*) INTO github_count FROM norms WHERE official_link LIKE '%raw.githubusercontent.com%';

    RAISE NOTICE 'Migration 044 complete:';
    RAISE NOTICE '  NIST publication URLs: %', nist_count;
    RAISE NOTICE '  GitHub raw URLs: %', github_count;
END $$;
