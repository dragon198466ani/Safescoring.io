-- ============================================================
-- Migration 032: Norms Documentation Columns
-- Add missing columns for norm documentation scraping
-- ============================================================

-- Add official_link column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'norms' AND column_name = 'official_link'
    ) THEN
        ALTER TABLE norms ADD COLUMN official_link VARCHAR(500);
        COMMENT ON COLUMN norms.official_link IS 'Official documentation URL (NIST, EIP, RFC, BIP, etc.)';
    END IF;
END $$;

-- Add official_doc_summary column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'norms' AND column_name = 'official_doc_summary'
    ) THEN
        ALTER TABLE norms ADD COLUMN official_doc_summary TEXT;
        COMMENT ON COLUMN norms.official_doc_summary IS 'AI-generated comprehensive summary of official documentation (~10,000 words in 10 sections)';
    END IF;
END $$;

-- Add access_type column if not exists (G=Gratuit/Free, P=Payant/Paid)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'norms' AND column_name = 'access_type'
    ) THEN
        ALTER TABLE norms ADD COLUMN access_type VARCHAR(1) DEFAULT 'G';
        COMMENT ON COLUMN norms.access_type IS 'Documentation access type: G=Free/Gratuit, P=Paid/Payant';
    END IF;
END $$;

-- Add official_content column for cached raw content
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'norms' AND column_name = 'official_content'
    ) THEN
        ALTER TABLE norms ADD COLUMN official_content TEXT;
        COMMENT ON COLUMN norms.official_content IS 'Cached raw content from official documentation';
    END IF;
END $$;

-- Add official_scraped_at column for tracking freshness
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'norms' AND column_name = 'official_scraped_at'
    ) THEN
        ALTER TABLE norms ADD COLUMN official_scraped_at TIMESTAMPTZ;
        COMMENT ON COLUMN norms.official_scraped_at IS 'Timestamp of last successful documentation scrape';
    END IF;
END $$;

-- Create index for efficient filtering by access_type
CREATE INDEX IF NOT EXISTS idx_norms_access_type ON norms(access_type);

-- Create index for finding norms that need scraping
CREATE INDEX IF NOT EXISTS idx_norms_needs_scraping ON norms(official_link)
WHERE official_link IS NOT NULL AND official_doc_summary IS NULL;

-- ============================================================
-- Seed official links for common standards
-- ============================================================

-- BIP Standards (Bitcoin Improvement Proposals)
UPDATE norms SET
    official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki',
    access_type = 'G'
WHERE code LIKE '%BIP39%' OR code LIKE '%BIP-39%' OR title ILIKE '%bip-39%' OR title ILIKE '%mnemonic%seed%';

UPDATE norms SET
    official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki',
    access_type = 'G'
WHERE code LIKE '%BIP32%' OR code LIKE '%BIP-32%' OR title ILIKE '%bip-32%' OR title ILIKE '%hierarchical%deterministic%';

UPDATE norms SET
    official_link = 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki',
    access_type = 'G'
WHERE code LIKE '%BIP44%' OR code LIKE '%BIP-44%' OR title ILIKE '%bip-44%';

-- EIP Standards (Ethereum Improvement Proposals)
UPDATE norms SET
    official_link = 'https://eips.ethereum.org/EIPS/eip-712',
    access_type = 'G'
WHERE code LIKE '%EIP712%' OR code LIKE '%EIP-712%' OR title ILIKE '%eip-712%' OR title ILIKE '%typed%data%signing%';

UPDATE norms SET
    official_link = 'https://eips.ethereum.org/EIPS/eip-1559',
    access_type = 'G'
WHERE code LIKE '%EIP1559%' OR code LIKE '%EIP-1559%' OR title ILIKE '%eip-1559%';

UPDATE norms SET
    official_link = 'https://eips.ethereum.org/EIPS/eip-4337',
    access_type = 'G'
WHERE code LIKE '%EIP4337%' OR code LIKE '%EIP-4337%' OR title ILIKE '%account%abstraction%';

-- NIST Standards
UPDATE norms SET
    official_link = 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final',
    access_type = 'G'
WHERE title ILIKE '%nist%800-57%' OR title ILIKE '%key%management%nist%';

UPDATE norms SET
    official_link = 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final',
    access_type = 'G'
WHERE title ILIKE '%nist%800-90%' OR title ILIKE '%random%number%generator%nist%';

UPDATE norms SET
    official_link = 'https://csrc.nist.gov/publications/detail/fips/140/3/final',
    access_type = 'G'
WHERE title ILIKE '%fips%140%' OR title ILIKE '%cryptographic%module%fips%';

-- RFC Standards (IETF)
UPDATE norms SET
    official_link = 'https://datatracker.ietf.org/doc/html/rfc5869',
    access_type = 'G'
WHERE title ILIKE '%hkdf%' OR title ILIKE '%rfc%5869%';

UPDATE norms SET
    official_link = 'https://datatracker.ietf.org/doc/html/rfc6979',
    access_type = 'G'
WHERE title ILIKE '%deterministic%ecdsa%' OR title ILIKE '%rfc%6979%';

-- TLS Standards
UPDATE norms SET
    official_link = 'https://datatracker.ietf.org/doc/html/rfc8446',
    access_type = 'G'
WHERE title ILIKE '%tls%1.3%' OR code LIKE '%TLS13%';

-- Common Criteria
UPDATE norms SET
    official_link = 'https://www.commoncriteriaportal.org/cc/',
    access_type = 'G'
WHERE title ILIKE '%common%criteria%' OR title ILIKE '%eal5%' OR title ILIKE '%eal6%';

-- ISO Standards (Paid - reference only)
UPDATE norms SET
    official_link = 'https://www.iso.org/standard/27001',
    access_type = 'P'
WHERE title ILIKE '%iso%27001%';

UPDATE norms SET
    official_link = 'https://www.iso.org/standard/15408',
    access_type = 'P'
WHERE title ILIKE '%iso%15408%';

-- OWASP Standards (Free)
UPDATE norms SET
    official_link = 'https://mas.owasp.org/MASVS/',
    access_type = 'G'
WHERE title ILIKE '%owasp%masvs%' OR title ILIKE '%mobile%security%verification%';

-- ============================================================
-- Summary
-- ============================================================
DO $$
DECLARE
    total_norms INT;
    with_links INT;
    free_norms INT;
BEGIN
    SELECT COUNT(*) INTO total_norms FROM norms;
    SELECT COUNT(*) INTO with_links FROM norms WHERE official_link IS NOT NULL;
    SELECT COUNT(*) INTO free_norms FROM norms WHERE access_type = 'G';

    RAISE NOTICE 'Migration 032 complete:';
    RAISE NOTICE '  Total norms: %', total_norms;
    RAISE NOTICE '  With official links: %', with_links;
    RAISE NOTICE '  Free documentation: %', free_norms;
END $$;
