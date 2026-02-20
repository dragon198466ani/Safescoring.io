-- =============================================================================
-- SAFE SCORING - VERIFIED NORMS SEED FILE
-- =============================================================================
-- This file contains ONLY verified standards with official sources.
-- Each norm MUST have: code, pillar, title, official_link, issuing_authority
--
-- Created: 2026-01-17
-- =============================================================================

-- =============================================================================
-- PILLAR S: SECURITY - Cryptographic Standards
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Category: Bitcoin Improvement Proposals (BIP)
-- Source: https://github.com/bitcoin/bips
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('S-BIP-032', 'S', 'BIP-32: Hierarchical Deterministic Wallets',
 'Specification for deriving a tree of key pairs from a single seed, enabling organized key management.',
 TRUE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki',
 'Bitcoin Core', 'BIP-32',
 'global', 'crypto_native', 'Core wallet standard for HD key derivation',
 'verified', TRUE, 'scraped'),

('S-BIP-039', 'S', 'BIP-39: Mnemonic Seed Phrases',
 'Standard for generating deterministic keys from 12/24 word mnemonic phrases.',
 TRUE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki',
 'Bitcoin Core', 'BIP-39',
 'global', 'crypto_native', 'Seed phrase generation and wallet recovery',
 'verified', TRUE, 'scraped'),

('S-BIP-044', 'S', 'BIP-44: Multi-Account Hierarchy',
 'Defines a logical hierarchy for deterministic wallets with multiple accounts.',
 TRUE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki',
 'Bitcoin Core', 'BIP-44',
 'global', 'crypto_native', 'Multi-coin and multi-account wallet support',
 'verified', TRUE, 'scraped'),

('S-BIP-084', 'S', 'BIP-84: Native SegWit Derivation',
 'Derivation scheme for P2WPKH (native SegWit) addresses.',
 FALSE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki',
 'Bitcoin Core', 'BIP-84',
 'global', 'crypto_native', 'Native SegWit address support',
 'verified', TRUE, 'scraped'),

('S-BIP-174', 'S', 'BIP-174: Partially Signed Bitcoin Transactions (PSBT)',
 'Standard for unsigned transactions enabling multi-party signing workflows.',
 TRUE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki',
 'Bitcoin Core', 'BIP-174',
 'global', 'crypto_native', 'Multi-signature and hardware wallet coordination',
 'verified', TRUE, 'scraped'),

('S-BIP-340', 'S', 'BIP-340: Schnorr Signatures',
 'Specification for Schnorr signatures over secp256k1 curve.',
 TRUE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki',
 'Bitcoin Core', 'BIP-340',
 'global', 'crypto_native', 'Taproot signature scheme',
 'verified', TRUE, 'scraped'),

('S-BIP-341', 'S', 'BIP-341: Taproot',
 'Specification for Taproot outputs combining Schnorr and MAST.',
 TRUE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki',
 'Bitcoin Core', 'BIP-341',
 'global', 'crypto_native', 'Privacy and efficiency improvements',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    issuing_authority = EXCLUDED.issuing_authority,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: Ethereum Improvement Proposals (EIP)
-- Source: https://eips.ethereum.org
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('S-EIP-712', 'S', 'EIP-712: Typed Structured Data Signing',
 'Standard for signing typed structured data for better UX and security.',
 TRUE, TRUE, TRUE,
 'https://eips.ethereum.org/EIPS/eip-712',
 'Ethereum Foundation', 'EIP-712',
 'global', 'crypto_native', 'Human-readable transaction signing',
 'verified', TRUE, 'scraped'),

('S-EIP-1559', 'S', 'EIP-1559: Fee Market Change',
 'New transaction pricing mechanism with base fee and priority fee.',
 TRUE, TRUE, TRUE,
 'https://eips.ethereum.org/EIPS/eip-1559',
 'Ethereum Foundation', 'EIP-1559',
 'global', 'crypto_native', 'Gas fee optimization',
 'verified', TRUE, 'scraped'),

('S-EIP-4337', 'S', 'EIP-4337: Account Abstraction',
 'Standard for smart contract wallets without protocol changes.',
 TRUE, TRUE, TRUE,
 'https://eips.ethereum.org/EIPS/eip-4337',
 'Ethereum Foundation', 'EIP-4337',
 'global', 'crypto_native', 'Smart accounts and gasless transactions',
 'verified', TRUE, 'scraped'),

('S-ERC-20', 'S', 'ERC-20: Token Standard',
 'Standard interface for fungible tokens on Ethereum.',
 TRUE, TRUE, TRUE,
 'https://eips.ethereum.org/EIPS/eip-20',
 'Ethereum Foundation', 'ERC-20',
 'global', 'crypto_native', 'Fungible token interoperability',
 'verified', TRUE, 'scraped'),

('S-ERC-721', 'S', 'ERC-721: Non-Fungible Token Standard',
 'Standard interface for non-fungible tokens (NFTs).',
 TRUE, TRUE, TRUE,
 'https://eips.ethereum.org/EIPS/eip-721',
 'Ethereum Foundation', 'ERC-721',
 'global', 'crypto_native', 'NFT ownership and transfer',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: NIST Cryptographic Standards
-- Source: https://csrc.nist.gov
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('S-FIPS-140', 'S', 'FIPS 140-3: Cryptographic Module Validation',
 'Security requirements for cryptographic modules used in government.',
 TRUE, TRUE, TRUE,
 'https://csrc.nist.gov/publications/detail/fips/140/3/final',
 'NIST', 'FIPS 140-3',
 'USA', 'regulatory', 'Hardware wallet secure element certification',
 'verified', TRUE, 'scraped'),

('S-NIST-800-57', 'S', 'NIST SP 800-57: Key Management',
 'Recommendations for key management practices.',
 TRUE, TRUE, TRUE,
 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final',
 'NIST', 'SP 800-57',
 'global', 'international', 'Cryptographic key lifecycle management',
 'verified', TRUE, 'scraped'),

('S-NIST-800-90A', 'S', 'NIST SP 800-90A: Random Number Generation',
 'Recommendations for random bit generators using deterministic methods.',
 TRUE, TRUE, TRUE,
 'https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final',
 'NIST', 'SP 800-90A',
 'global', 'international', 'Secure random number generation for keys',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: IETF RFC Standards
-- Source: https://datatracker.ietf.org
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('S-RFC-5869', 'S', 'RFC 5869: HKDF Key Derivation',
 'HMAC-based Extract-and-Expand Key Derivation Function.',
 TRUE, TRUE, TRUE,
 'https://datatracker.ietf.org/doc/html/rfc5869',
 'IETF', 'RFC 5869',
 'global', 'international', 'Secure key derivation from master keys',
 'verified', TRUE, 'scraped'),

('S-RFC-6979', 'S', 'RFC 6979: Deterministic ECDSA',
 'Deterministic usage of the DSA and ECDSA algorithms.',
 TRUE, TRUE, TRUE,
 'https://datatracker.ietf.org/doc/html/rfc6979',
 'IETF', 'RFC 6979',
 'global', 'international', 'Prevents ECDSA nonce reuse attacks',
 'verified', TRUE, 'scraped'),

('S-RFC-8032', 'S', 'RFC 8032: Ed25519 Signatures',
 'Edwards-Curve Digital Signature Algorithm (EdDSA).',
 TRUE, TRUE, TRUE,
 'https://datatracker.ietf.org/doc/html/rfc8032',
 'IETF', 'RFC 8032',
 'global', 'international', 'Modern elliptic curve signatures',
 'verified', TRUE, 'scraped'),

('S-RFC-8446', 'S', 'RFC 8446: TLS 1.3',
 'Transport Layer Security Protocol Version 1.3.',
 TRUE, TRUE, TRUE,
 'https://datatracker.ietf.org/doc/html/rfc8446',
 'IETF', 'RFC 8446',
 'global', 'international', 'Secure API and web communication',
 'verified', TRUE, 'scraped'),

('S-RFC-9106', 'S', 'RFC 9106: Argon2 Password Hashing',
 'The Argon2 Memory-Hard Function for Password Hashing.',
 TRUE, TRUE, TRUE,
 'https://datatracker.ietf.org/doc/html/rfc9106',
 'IETF', 'RFC 9106',
 'global', 'international', 'Secure password and PIN hashing',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- =============================================================================
-- PILLAR A: ADVERSITY - Anti-Coercion and Physical Security
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Category: Time-Lock Standards (Bitcoin)
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('A-BIP-065', 'A', 'BIP-65: CheckLockTimeVerify (CLTV)',
 'Time-locks that prevent spending until a specific time.',
 TRUE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki',
 'Bitcoin Core', 'BIP-65',
 'global', 'crypto_native', 'Time-delayed transactions for security',
 'verified', TRUE, 'scraped'),

('A-BIP-112', 'A', 'BIP-112: CheckSequenceVerify (CSV)',
 'Relative time-locks based on block confirmations.',
 TRUE, TRUE, TRUE,
 'https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki',
 'Bitcoin Core', 'BIP-112',
 'global', 'crypto_native', 'Relative time-locks for vault security',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: Secret Sharing (SLIP-39)
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('A-SLIP-039', 'A', 'SLIP-39: Shamir Backup',
 'Shamir Secret Sharing for wallet backup with threshold recovery.',
 TRUE, TRUE, TRUE,
 'https://github.com/satoshilabs/slips/blob/master/slip-0039.md',
 'SatoshiLabs', 'SLIP-39',
 'global', 'crypto_native', 'Distributed backup with M-of-N recovery',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: Privacy Standards
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('A-GDPR-17', 'A', 'GDPR Article 17: Right to Erasure',
 'Right to be forgotten - personal data deletion on request.',
 TRUE, TRUE, TRUE,
 'https://gdpr-info.eu/art-17-gdpr/',
 'European Union', 'GDPR Art. 17',
 'EU', 'regulatory', 'User data deletion rights',
 'verified', TRUE, 'scraped'),

('A-GDPR-20', 'A', 'GDPR Article 20: Data Portability',
 'Right to receive personal data in portable format.',
 FALSE, TRUE, TRUE,
 'https://gdpr-info.eu/art-20-gdpr/',
 'European Union', 'GDPR Art. 20',
 'EU', 'regulatory', 'User data export capabilities',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: Vendor Features (Documented)
-- These are real features documented by vendors, not industry standards
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('A-VENDOR-PASSPHRASE', 'A', 'Passphrase Hidden Wallet (Plausible Deniability)',
 'Additional passphrase creates separate hidden wallet. Documented by Trezor and Coldcard.',
 TRUE, TRUE, TRUE,
 'https://wiki.trezor.io/Passphrase',
 'Hardware Wallet Vendors', 'Passphrase Wallet',
 'global', 'vendor_feature', 'Plausible deniability under duress',
 'verified', TRUE, 'scraped'),

('A-VENDOR-BRICKPIN', 'A', 'Brick Me PIN (Device Destruction)',
 'PIN that permanently destroys secure element. Implemented by Coldcard.',
 FALSE, TRUE, TRUE,
 'https://coldcard.com/docs/quick',
 'Coldcard', 'Brick Me PIN',
 'global', 'vendor_feature', 'Ultimate duress protection',
 'verified', TRUE, 'manual_pdf'),

('A-VENDOR-WIPE', 'A', 'Device Wipe After Failed Attempts',
 'Automatic device wipe after N failed PIN attempts. Standard in hardware wallets.',
 TRUE, TRUE, TRUE,
 'https://support.ledger.com/hc/en-us/articles/360000609933',
 'Hardware Wallet Vendors', 'Auto-Wipe',
 'global', 'vendor_feature', 'Brute-force attack prevention',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- =============================================================================
-- PILLAR F: FIDELITY - Reliability and Compliance
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Category: Security Audit Standards
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('F-OWASP-ASVS', 'F', 'OWASP ASVS: Application Security Verification',
 'Standard for testing web application security controls.',
 TRUE, TRUE, TRUE,
 'https://owasp.org/www-project-application-security-verification-standard/',
 'OWASP Foundation', 'ASVS 4.0',
 'global', 'international', 'Web application security audit framework',
 'verified', TRUE, 'scraped'),

('F-OWASP-MASVS', 'F', 'OWASP MASVS: Mobile Application Security',
 'Security standard for mobile applications.',
 TRUE, TRUE, TRUE,
 'https://mas.owasp.org/MASVS/',
 'OWASP Foundation', 'MASVS',
 'global', 'international', 'Mobile wallet security verification',
 'verified', TRUE, 'scraped'),

('F-OWASP-SCSVS', 'F', 'OWASP SCSVS: Smart Contract Security',
 'Security verification standard for smart contracts.',
 TRUE, TRUE, TRUE,
 'https://owasp.org/www-project-smart-contract-security-verification-standard/',
 'OWASP Foundation', 'SCSVS',
 'global', 'crypto_native', 'DeFi smart contract audit framework',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: Common Criteria
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('F-CC-EAL', 'F', 'Common Criteria EAL Certification',
 'International security evaluation standard for IT products.',
 TRUE, TRUE, TRUE,
 'https://www.commoncriteriaportal.org/cc/',
 'Common Criteria', 'ISO/IEC 15408',
 'global', 'international', 'Secure element and hardware certification',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: Regulatory Compliance
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('F-SOC2', 'F', 'SOC 2 Type II Compliance',
 'Service Organization Control 2 audit for security, availability, and confidentiality.',
 FALSE, FALSE, TRUE,
 'https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/aaboroadmap',
 'AICPA', 'SOC 2',
 'USA', 'regulatory', 'Enterprise custody and exchange compliance',
 'verified', TRUE, 'scraped'),

('F-ISO-27001', 'F', 'ISO 27001: Information Security Management',
 'International standard for information security management systems.',
 FALSE, FALSE, TRUE,
 'https://www.iso.org/standard/27001',
 'ISO', 'ISO/IEC 27001',
 'global', 'international', 'Enterprise security management certification',
 'verified', FALSE, 'fallback_ai')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- =============================================================================
-- PILLAR E: ECOSYSTEM - Usability and Interoperability
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Category: Token Standards
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('E-ERC-1155', 'E', 'ERC-1155: Multi Token Standard',
 'Standard for contracts managing multiple token types.',
 FALSE, TRUE, TRUE,
 'https://eips.ethereum.org/EIPS/eip-1155',
 'Ethereum Foundation', 'ERC-1155',
 'global', 'crypto_native', 'Gaming and multi-asset support',
 'verified', TRUE, 'scraped'),

('E-EIP-6963', 'E', 'EIP-6963: Multi-Injected Provider Discovery',
 'Standard for discovering multiple wallet providers in browsers.',
 FALSE, TRUE, TRUE,
 'https://eips.ethereum.org/EIPS/eip-6963',
 'Ethereum Foundation', 'EIP-6963',
 'global', 'crypto_native', 'Multi-wallet browser support',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- -----------------------------------------------------------------------------
-- Category: Accessibility
-- -----------------------------------------------------------------------------

INSERT INTO norms (
    code, pillar, title, description,
    is_essential, consumer, "full",
    official_link, issuing_authority, standard_reference,
    geographic_scope, scope_type, crypto_relevance,
    verification_status, summary_verified, summary_source
) VALUES
('E-WCAG-22', 'E', 'WCAG 2.2: Web Content Accessibility',
 'Guidelines for making web content accessible to people with disabilities.',
 FALSE, TRUE, TRUE,
 'https://www.w3.org/TR/WCAG22/',
 'W3C', 'WCAG 2.2',
 'global', 'international', 'Wallet and DApp accessibility',
 'verified', TRUE, 'scraped')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    official_link = EXCLUDED.official_link,
    verification_status = EXCLUDED.verification_status;

-- =============================================================================
-- VERIFICATION STATISTICS
-- =============================================================================

DO $$
DECLARE
    total_seeded INT;
    by_pillar TEXT;
BEGIN
    SELECT COUNT(*) INTO total_seeded
    FROM norms
    WHERE verification_status = 'verified';

    RAISE NOTICE '=== Seed Verified Norms Complete ===';
    RAISE NOTICE 'Total verified norms seeded: %', total_seeded;
END $$;
