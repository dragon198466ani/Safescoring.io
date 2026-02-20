-- ============================================================
-- MIGRATION 011: GEOGRAPHIC SCOPE FOR NORMS
-- ============================================================
-- Purpose: Add geographic/regional scope to norms and enrich with
--          missing international standards
-- Date: 2026-01-03
-- Author: SafeScoring Standards Enhancement
-- ============================================================

-- ============================================================
-- 1. ADD GEOGRAPHIC SCOPE COLUMNS
-- ============================================================

-- Add geographic_scope column to track regional applicability
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'norms' AND column_name = 'geographic_scope') THEN
        ALTER TABLE norms ADD COLUMN geographic_scope VARCHAR(20) DEFAULT 'global';
    END IF;

    -- Add region-specific details (JSONB for flexibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'norms' AND column_name = 'regional_details') THEN
        ALTER TABLE norms ADD COLUMN regional_details JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add standard/authority reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'norms' AND column_name = 'standard_reference') THEN
        ALTER TABLE norms ADD COLUMN standard_reference VARCHAR(100);
    END IF;

    -- Add issuing authority (NIST, ISO, Common Criteria, etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'norms' AND column_name = 'issuing_authority') THEN
        ALTER TABLE norms ADD COLUMN issuing_authority VARCHAR(100);
    END IF;
END $$;

-- Create type for geographic scopes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geographic_scope_type') THEN
        CREATE TYPE geographic_scope_type AS ENUM (
            'global',      -- Applicable worldwide
            'EU',          -- European Union specific (GDPR, MiCA, etc.)
            'US',          -- United States specific (NIST, FIPS, etc.)
            'UK',          -- United Kingdom specific (FCA, etc.)
            'ASIA',        -- Asia-Pacific region
            'APAC',        -- Asia-Pacific
            'AMERICAS',    -- Americas region
            'AFRICA',      -- African continent
            'MIDDLE_EAST', -- Middle East region
            'multi_region' -- Applies to multiple specific regions
        );
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Update column to use ENUM (keeping existing VARCHAR for backward compat)
COMMENT ON COLUMN norms.geographic_scope IS 'Geographic applicability: global, EU, US, UK, ASIA, etc. or multi_region';
COMMENT ON COLUMN norms.regional_details IS 'JSONB with region-specific details: {countries: [], notes: ""}';
COMMENT ON COLUMN norms.standard_reference IS 'Reference to standard: NIST SP 800-57, ISO 27001, FIPS 140-3, etc.';
COMMENT ON COLUMN norms.issuing_authority IS 'Authority: NIST, ISO, BSI, Common Criteria, CCSS, etc.';

-- Create index for geographic queries
CREATE INDEX IF NOT EXISTS idx_norms_geographic_scope ON norms(geographic_scope);
CREATE INDEX IF NOT EXISTS idx_norms_standard_reference ON norms(standard_reference);
CREATE INDEX IF NOT EXISTS idx_norms_issuing_authority ON norms(issuing_authority);

-- ============================================================
-- 2. UPDATE EXISTING NORMS WITH GEOGRAPHIC INFO
-- ============================================================

-- Update cryptographic norms with NIST/FIPS references (US-based but globally adopted)
UPDATE norms SET
    geographic_scope = 'global',
    standard_reference = 'NIST SP 800-57',
    issuing_authority = 'NIST',
    regional_details = '{"origin": "US", "adoption": "worldwide"}'::jsonb
WHERE code LIKE 'S-%'
  AND (description ILIKE '%AES-256%' OR description ILIKE '%NIST%' OR description ILIKE '%FIPS%')
  AND standard_reference IS NULL;

-- Update BIP standards (Bitcoin Improvement Proposals - global)
UPDATE norms SET
    geographic_scope = 'global',
    standard_reference = CASE
        WHEN description ILIKE '%BIP-32%' THEN 'BIP-32'
        WHEN description ILIKE '%BIP-39%' THEN 'BIP-39'
        WHEN description ILIKE '%BIP-44%' THEN 'BIP-44'
        ELSE standard_reference
    END,
    issuing_authority = 'Bitcoin Core',
    regional_details = '{"type": "cryptocurrency_standard"}'::jsonb
WHERE code LIKE 'S-%'
  AND (description ILIKE '%BIP-%' OR description ILIKE '%mnemonic%' OR description ILIKE '%seed phrase%')
  AND standard_reference IS NULL;

-- Update ISO/Common Criteria norms (international)
UPDATE norms SET
    geographic_scope = 'global',
    standard_reference = 'ISO 15408',
    issuing_authority = 'ISO/IEC',
    regional_details = '{"aka": "Common Criteria"}'::jsonb
WHERE code LIKE 'A-%'
  AND (description ILIKE '%Common Criteria%' OR description ILIKE '%ISO 15408%' OR description ILIKE '%EAL%')
  AND standard_reference IS NULL;

-- Update WCAG/accessibility norms (global standard)
UPDATE norms SET
    geographic_scope = 'global',
    standard_reference = 'WCAG 2.1',
    issuing_authority = 'W3C',
    regional_details = '{"legal_in": ["US", "EU", "UK", "CA", "AU"]}'::jsonb
WHERE code LIKE 'E-%'
  AND description ILIKE '%accessibility%'
  AND standard_reference IS NULL;

-- Update SOC2/ISO 27001 norms (global but US/ISO origins)
UPDATE norms SET
    geographic_scope = 'global',
    standard_reference = CASE
        WHEN description ILIKE '%SOC 2%' THEN 'SOC 2 Type II'
        WHEN description ILIKE '%ISO 27001%' THEN 'ISO 27001'
        ELSE standard_reference
    END,
    issuing_authority = CASE
        WHEN description ILIKE '%SOC 2%' THEN 'AICPA'
        WHEN description ILIKE '%ISO 27001%' THEN 'ISO/IEC'
        ELSE issuing_authority
    END,
    regional_details = '{"type": "audit_standard", "adoption": "worldwide"}'::jsonb
WHERE code LIKE 'F-%'
  AND (description ILIKE '%SOC 2%' OR description ILIKE '%ISO 27001%')
  AND standard_reference IS NULL;

-- Set default to 'global' for any remaining nulls
UPDATE norms SET geographic_scope = 'global' WHERE geographic_scope IS NULL;

-- ============================================================
-- 3. ADD MISSING INTERNATIONAL STANDARDS-BASED NORMS
-- ============================================================

-- CCSS (CryptoCurrency Security Standard) Norms
-- Reference: https://cryptoconsortium.org/standards-2/
INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full", geographic_scope, standard_reference, issuing_authority) VALUES

-- CCSS Key Management Requirements
('S-CCSS-001', 'S', 'CCSS Level 1 Key Generation',
 'Cryptographic keys must be generated using a CSPRNG (Cryptographically Secure Pseudo-Random Number Generator) as per CCSS requirements. Minimum security baseline for cryptocurrency storage.',
 true, true, true, 'global', 'CCSS v9.0 - Section 2.1', 'C4 - CryptoCurrency Certification Consortium'),

('S-CCSS-002', 'S', 'CCSS Level 2 Key Storage Isolation',
 'Private keys must be stored in isolated environments (hardware security modules, secure enclaves, or air-gapped systems). Keys never exposed to internet-connected systems.',
 true, false, true, 'global', 'CCSS v9.0 - Section 3.2', 'C4 - CryptoCurrency Certification Consortium'),

('S-CCSS-003', 'S', 'CCSS Level 3 Geographic Distribution',
 'Key material must be geographically distributed across multiple secure locations to prevent single-point-of-failure. Required for Level 3 certification.',
 false, false, true, 'global', 'CCSS v9.0 - Section 4.1', 'C4 - CryptoCurrency Certification Consortium'),

('S-CCSS-004', 'S', 'CCSS Multi-Signature Requirements',
 'Cryptocurrency wallets must support multi-signature (M-of-N) configurations where at least 2 signatures are required before funds can be spent. No single person can authorize transfers.',
 true, false, true, 'global', 'CCSS v9.0 - Section 2.3', 'C4 - CryptoCurrency Certification Consortium'),

-- NIST Additional Cryptographic Standards
('S-NIST-001', 'S', 'NIST SP 800-38A Block Cipher Modes',
 'Product uses NIST-approved block cipher modes of operation (CBC, CTR, GCM) for data encryption. Avoids deprecated modes like ECB.',
 true, false, true, 'global', 'NIST SP 800-38A', 'NIST'),

('S-NIST-002', 'S', 'NIST SP 800-90A Random Number Generation',
 'Random number generation follows NIST SP 800-90A standards using approved DRBGs (Deterministic Random Bit Generators) with proper entropy sources.',
 true, true, true, 'global', 'NIST SP 800-90A', 'NIST'),

('S-NIST-003', 'S', 'FIPS 140-3 Cryptographic Module',
 'Cryptographic operations use FIPS 140-3 validated modules (Level 2+). Hardware security modules (HSMs) meet federal standards.',
 false, false, true, 'US', 'FIPS 140-3', 'NIST'),

-- Common Criteria EAL Standards for Hardware
('A-CC-001', 'A', 'Common Criteria EAL5+ Certification',
 'Hardware wallet secure element has achieved Common Criteria EAL5+ certification, providing semiformally verified design and tested protection against physical attacks.',
 true, true, true, 'global', 'CC EAL5+ (ISO 15408)', 'Common Criteria'),

('A-CC-002', 'A', 'Common Criteria EAL6+ Military Grade',
 'Secure element certified to EAL6+ standard, typically reserved for military applications and high-value asset protection. Provides semiformally verified design and protection against sophisticated attacks.',
 false, false, true, 'global', 'CC EAL6+ (ISO 15408)', 'Common Criteria'),

('A-CC-003', 'A', 'Common Criteria Physical Tamper Detection',
 'Device includes tamper-evident or tamper-resistant mechanisms that comply with Common Criteria Protection Profile requirements for physical security.',
 true, true, true, 'global', 'CC PP (ISO 15408)', 'Common Criteria'),

-- ISO 27001 ISMS Requirements
('F-ISO-001', 'F', 'ISO 27001 Information Security Policy',
 'Organization has documented information security policy aligned with ISO 27001 requirements, covering cryptocurrency operations, key management, and incident response.',
 true, false, true, 'global', 'ISO 27001:2022 - Clause 5.2', 'ISO/IEC'),

('F-ISO-002', 'F', 'ISO 27001 Asset Management',
 'Cryptocurrency keys and wallets are inventoried and classified as critical assets per ISO 27001 Annex A.8 requirements.',
 true, false, true, 'global', 'ISO 27001:2022 - Annex A.8', 'ISO/IEC'),

('F-ISO-003', 'F', 'ISO 27001 Change Management',
 'Changes to cryptocurrency storage systems follow documented change management process with security review as per ISO 27001 Annex A.12.1.2.',
 false, false, true, 'global', 'ISO 27001:2022 - Annex A.12.1.2', 'ISO/IEC'),

('F-ISO-004', 'F', 'ISO 27001 Incident Response Plan',
 'Organization has tested incident response plan specific to cryptocurrency theft, loss, or compromise scenarios as required by ISO 27001.',
 true, false, true, 'global', 'ISO 27001:2022 - Annex A.16', 'ISO/IEC'),

-- GDPR/Privacy Compliance (EU-specific)
('F-GDPR-001', 'F', 'GDPR Article 25 Privacy by Design',
 'Product implements privacy by design and by default for EU users as required by GDPR Article 25. Personal data minimization in wallet design.',
 true, true, true, 'EU', 'GDPR Article 25', 'European Commission'),

('F-GDPR-002', 'F', 'GDPR Article 32 Security Measures',
 'Technical and organizational measures to ensure appropriate security level for EU user data, including pseudonymization and encryption.',
 true, true, true, 'EU', 'GDPR Article 32', 'European Commission'),

('F-GDPR-003', 'F', 'GDPR Right to Erasure (Right to be Forgotten)',
 'Product allows EU users to request deletion of personal data while preserving blockchain immutability through off-chain data management.',
 false, true, true, 'EU', 'GDPR Article 17', 'European Commission'),

-- MiCA Compliance (EU Markets in Crypto-Assets Regulation)
('F-MICA-001', 'F', 'MiCA Customer Funds Segregation',
 'Crypto-asset service providers segregate customer funds from company funds as required by MiCA regulations for EU operations.',
 true, false, true, 'EU', 'MiCA Regulation (EU) 2023/1114 - Article 70', 'European Commission'),

('F-MICA-002', 'F', 'MiCA Operational Resilience',
 'Crypto service provider has documented operational resilience plan covering IT systems, business continuity, and disaster recovery as per MiCA.',
 true, false, true, 'EU', 'MiCA Regulation (EU) 2023/1114 - Article 72', 'European Commission'),

('F-MICA-003', 'F', 'MiCA White Paper Disclosure',
 'Crypto-asset issuer publishes white paper with clear risk disclosures as mandated by MiCA for EU market participants.',
 false, false, true, 'EU', 'MiCA Regulation (EU) 2023/1114 - Article 4-8', 'European Commission'),

-- PCI DSS for Crypto Payment Processors
('S-PCI-001', 'S', 'PCI DSS Network Segmentation',
 'Cryptocurrency payment processing systems use network segmentation to isolate cardholder data environment from crypto operations per PCI DSS v4.0.',
 false, false, true, 'global', 'PCI DSS v4.0 - Requirement 1', 'PCI Security Standards Council'),

('S-PCI-002', 'S', 'PCI DSS Encryption in Transit',
 'Payment card data transmitted alongside crypto transactions uses TLS 1.2+ with strong cryptography per PCI DSS requirements.',
 true, false, true, 'global', 'PCI DSS v4.0 - Requirement 4', 'PCI Security Standards Council'),

-- OWASP Mobile Security Standards
('A-OWASP-001', 'A', 'OWASP MASVS Code Obfuscation',
 'Mobile wallet app implements code obfuscation and anti-tampering controls aligned with OWASP Mobile Application Security Verification Standard (MASVS) Level 2.',
 false, true, true, 'global', 'OWASP MASVS v2.0 - MASVS-RESILIENCE-2', 'OWASP Foundation'),

('A-OWASP-002', 'A', 'OWASP MASVS Root/Jailbreak Detection',
 'Mobile app detects rooted/jailbroken devices and either warns user or restricts functionality to prevent key extraction attacks.',
 true, true, true, 'global', 'OWASP MASVS v2.0 - MASVS-RESILIENCE-1', 'OWASP Foundation'),

('A-OWASP-003', 'A', 'OWASP MASVS Secure Storage',
 'Sensitive data (keys, seeds) stored using platform secure storage (iOS Keychain, Android Keystore) per OWASP MASVS cryptographic requirements.',
 true, true, true, 'global', 'OWASP MASVS v2.0 - MASVS-STORAGE-1', 'OWASP Foundation'),

('A-OWASP-004', 'A', 'OWASP MASVS Runtime Application Self-Protection',
 'App implements runtime integrity checks and self-protection (RASP) to detect debugging, hooking, or memory manipulation attempts.',
 false, false, true, 'global', 'OWASP MASVS v2.0 - MASVS-RESILIENCE-4', 'OWASP Foundation'),

-- SOC 2 Service Organization Controls
('F-SOC2-001', 'F', 'SOC 2 Logical Access Controls',
 'Service organization implements logical access controls with MFA, role-based access, and audit logging as verified in SOC 2 Type II report.',
 true, false, true, 'global', 'SOC 2 Type II - CC6.1', 'AICPA'),

('F-SOC2-002', 'F', 'SOC 2 System Monitoring',
 'Continuous monitoring of systems with automated alerts for security events, verified through SOC 2 audit.',
 true, false, true, 'global', 'SOC 2 Type II - CC7.2', 'AICPA'),

('F-SOC2-003', 'F', 'SOC 2 Change Management',
 'All changes to production systems follow documented, audited change management process per SOC 2 requirements.',
 false, false, true, 'global', 'SOC 2 Type II - CC8.1', 'AICPA'),

-- ETSI Standards (European Telecommunications Standards Institute)
('S-ETSI-001', 'S', 'ETSI TS 103 097 Secure Communication',
 'Wallet-to-wallet or client-server communication uses ETSI-standardized secure protocols with certificate-based authentication.',
 false, false, true, 'EU', 'ETSI TS 103 097', 'ETSI'),

-- EIP Standards (Ethereum Improvement Proposals)
('E-EIP-001', 'E', 'EIP-1559 Transaction Fee Transparency',
 'Wallet clearly displays EIP-1559 transaction fee structure (base fee + priority fee) to users before confirmation.',
 true, true, true, 'global', 'EIP-1559', 'Ethereum Foundation'),

('E-EIP-002', 'E', 'EIP-712 Typed Data Signing',
 'Wallet implements EIP-712 for human-readable signature requests, showing structured data instead of raw hex.',
 true, true, true, 'global', 'EIP-712', 'Ethereum Foundation'),

('E-EIP-003', 'E', 'EIP-1193 Provider API',
 'Browser extension wallet implements EIP-1193 Ethereum Provider API for standardized dApp interactions.',
 false, true, true, 'global', 'EIP-1193', 'Ethereum Foundation'),

-- SLIP Standards (Satoshi Labs Improvement Proposals)
('S-SLIP-001', 'S', 'SLIP-0039 Shamir Secret Sharing',
 'Wallet supports SLIP-0039 for splitting seed into multiple shares (M-of-N recovery) using Shamir Secret Sharing Scheme.',
 false, true, true, 'global', 'SLIP-0039', 'SatoshiLabs'),

('S-SLIP-002', 'S', 'SLIP-0010 Universal Private Key Derivation',
 'Wallet implements SLIP-0010 for deriving private keys for non-Bitcoin curves (ed25519, curve25519) in HD wallet structure.',
 false, false, true, 'global', 'SLIP-0010', 'SatoshiLabs')

ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. CREATE VIEWS FOR GEOGRAPHIC ANALYSIS
-- ============================================================

-- View: Norms by Geographic Scope
CREATE OR REPLACE VIEW v_norms_by_geography AS
SELECT
    geographic_scope,
    pillar,
    COUNT(*) as norm_count,
    COUNT(*) FILTER (WHERE is_essential = true) as essential_count,
    COUNT(*) FILTER (WHERE consumer = true) as consumer_count,
    array_agg(DISTINCT issuing_authority) FILTER (WHERE issuing_authority IS NOT NULL) as authorities
FROM norms
GROUP BY geographic_scope, pillar
ORDER BY geographic_scope, pillar;

-- View: Standards Coverage
CREATE OR REPLACE VIEW v_standards_coverage AS
SELECT
    issuing_authority,
    standard_reference,
    geographic_scope,
    COUNT(*) as norm_count,
    array_agg(code ORDER BY code) as norm_codes
FROM norms
WHERE standard_reference IS NOT NULL
GROUP BY issuing_authority, standard_reference, geographic_scope
ORDER BY issuing_authority, standard_reference;

-- View: Regional Compliance Requirements
CREATE OR REPLACE VIEW v_regional_requirements AS
SELECT
    geographic_scope as region,
    pillar,
    COUNT(*) as total_norms,
    COUNT(*) FILTER (WHERE is_essential = true) as essential_norms,
    string_agg(DISTINCT issuing_authority, ', ' ORDER BY issuing_authority) as authorities,
    string_agg(DISTINCT standard_reference, ', ' ORDER BY standard_reference) as standards
FROM norms
WHERE geographic_scope != 'global'
GROUP BY geographic_scope, pillar
ORDER BY geographic_scope, pillar;

-- ============================================================
-- 5. VERIFICATION & STATS
-- ============================================================

-- Display statistics
DO $$
DECLARE
    v_total INTEGER;
    v_global INTEGER;
    v_regional INTEGER;
    v_eu INTEGER;
    v_us INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM norms;
    SELECT COUNT(*) INTO v_global FROM norms WHERE geographic_scope = 'global';
    SELECT COUNT(*) INTO v_regional FROM norms WHERE geographic_scope != 'global';
    SELECT COUNT(*) INTO v_eu FROM norms WHERE geographic_scope = 'EU';
    SELECT COUNT(*) INTO v_us FROM norms WHERE geographic_scope = 'US';

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'NORMS GEOGRAPHIC DISTRIBUTION';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total norms: %', v_total;
    RAISE NOTICE 'Global norms: % (%.1f%%)', v_global, (v_global::float / v_total * 100);
    RAISE NOTICE 'Regional norms: % (%.1f%%)', v_regional, (v_regional::float / v_total * 100);
    RAISE NOTICE '  - EU-specific: %', v_eu;
    RAISE NOTICE '  - US-specific: %', v_us;
    RAISE NOTICE '============================================================';
END $$;

-- List new standards added
SELECT
    '=== NEW STANDARDS ADDED ===' as info,
    issuing_authority,
    COUNT(*) as norms_added
FROM norms
WHERE standard_reference IS NOT NULL
  AND code IN (
    SELECT code FROM norms
    WHERE code LIKE '%-CCSS-%' OR code LIKE '%-NIST-%' OR code LIKE '%-CC-%'
       OR code LIKE '%-ISO-%' OR code LIKE '%-GDPR-%' OR code LIKE '%-MICA-%'
       OR code LIKE '%-PCI-%' OR code LIKE '%-OWASP-%' OR code LIKE '%-SOC2-%'
       OR code LIKE '%-ETSI-%' OR code LIKE '%-EIP-%' OR code LIKE '%-SLIP-%'
  )
GROUP BY issuing_authority
ORDER BY norms_added DESC;

COMMENT ON TABLE norms IS 'Security norms for crypto products - now with geographic scope and international standards mapping';
