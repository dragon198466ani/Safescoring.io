-- ============================================================
-- MIGRATION 031: COMPREHENSIVE STANDARDS UPDATE
-- ============================================================
-- Purpose: Add comprehensive crypto security standards with
--          proper scope classification and crypto relevance
-- Date: 2026-01-07
-- Author: SafeScoring Standards Enhancement
-- ============================================================

-- ============================================================
-- 1. ADD CRYPTO_RELEVANCE COLUMN
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'norms' AND column_name = 'crypto_relevance') THEN
        ALTER TABLE norms ADD COLUMN crypto_relevance TEXT;
    END IF;

    -- Add scope_type for more granular classification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'norms' AND column_name = 'scope_type') THEN
        ALTER TABLE norms ADD COLUMN scope_type VARCHAR(30) DEFAULT 'global';
    END IF;
END $$;

COMMENT ON COLUMN norms.crypto_relevance IS 'Specific use case in crypto security context';
COMMENT ON COLUMN norms.scope_type IS 'Type: international, usa, eu, crypto_native, industry, open_source, regional';

-- Create index for scope_type queries
CREATE INDEX IF NOT EXISTS idx_norms_scope_type ON norms(scope_type);

-- ============================================================
-- 2. SECURITY PILLAR (S) - CRYPTOGRAPHIC STANDARDS
-- ============================================================

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full", geographic_scope, scope_type, standard_reference, issuing_authority, crypto_relevance) VALUES

-- USA Federal Standards
('S-NIST-057', 'S', 'NIST SP 800-57 Key Management',
 'Key Management Recommendations - Guidelines for cryptographic key generation, storage, and lifecycle management.',
 true, true, true, 'global', 'usa', 'NIST SP 800-57', 'NIST',
 'Wallet key generation, HSM integration, seed phrase security'),

('S-NIST-090', 'S', 'NIST SP 800-90A/B/C RNG',
 'Random Number Generation - Standards for DRBG, entropy sources, and random bit generator constructions.',
 true, true, true, 'global', 'usa', 'NIST SP 800-90A/B/C', 'NIST',
 'Secure key generation, transaction signing entropy'),

('S-NIST-186', 'S', 'NIST SP 800-186 ECC',
 'Elliptic Curve Cryptography - Recommendations for discrete logarithm-based cryptography parameters.',
 true, false, true, 'global', 'usa', 'NIST SP 800-186', 'NIST',
 'secp256k1, Ed25519, BLS12-381 curve parameters'),

('S-FIPS-1403', 'S', 'FIPS 140-3 Cryptographic Modules',
 'Security Requirements for Cryptographic Modules - Federal standard for cryptographic implementations.',
 true, false, true, 'US', 'usa', 'FIPS 140-3', 'NIST',
 'Hardware wallet secure elements, HSM certification'),

('S-FIPS-1865', 'S', 'FIPS 186-5 Digital Signatures',
 'Digital Signature Standard (DSS) - Specifications for ECDSA, EdDSA, and RSA signatures.',
 true, true, true, 'global', 'usa', 'FIPS 186-5', 'NIST',
 'Transaction signing, multi-sig verification'),

-- NIST Post-Quantum
('S-PQC-KYBER', 'S', 'NIST PQC Kyber',
 'Post-quantum Key Encapsulation Mechanism - Lattice-based key exchange.',
 false, false, true, 'global', 'usa', 'NIST FIPS 203', 'NIST',
 'Quantum-resistant wallet protection, future-proofing'),

('S-PQC-DILITH', 'S', 'NIST PQC Dilithium',
 'Post-quantum Digital Signature - Lattice-based signature scheme.',
 false, false, true, 'global', 'usa', 'NIST FIPS 204', 'NIST',
 'Quantum-resistant transaction signing'),

('S-PQC-SPHINCS', 'S', 'SPHINCS+ Hash Signatures',
 'Hash-based signature scheme for post-quantum security.',
 false, false, true, 'global', 'international', 'NIST FIPS 205', 'NIST',
 'Quantum-resistant stateless signatures'),

-- International Standards
('S-ISO-18033', 'S', 'ISO/IEC 18033 Encryption',
 'Encryption algorithms - International standards for symmetric and asymmetric ciphers.',
 true, false, true, 'global', 'international', 'ISO/IEC 18033', 'ISO/IEC',
 'AES-256, ChaCha20 encryption for wallet data'),

('S-IEEE-1363', 'S', 'IEEE P1363 Public-Key',
 'Standard Specifications for Public-Key Cryptography - RSA, DSA, ECDSA implementations.',
 false, false, true, 'global', 'international', 'IEEE P1363', 'IEEE',
 'Cross-platform signature compatibility'),

-- IETF/RFC Standards
('S-RFC-5869', 'S', 'RFC 5869 HKDF',
 'HMAC-based Key Derivation Function for deriving cryptographic keys from source material.',
 true, true, true, 'global', 'international', 'RFC 5869', 'IETF',
 'HD wallet key derivation, BIP-32 implementation'),

('S-RFC-6979', 'S', 'RFC 6979 Deterministic ECDSA',
 'Deterministic ECDSA signatures to prevent nonce reuse attacks.',
 true, true, true, 'global', 'international', 'RFC 6979', 'IETF',
 'Deterministic signing prevents key leakage via nonce reuse'),

('S-RFC-8032', 'S', 'RFC 8032 EdDSA',
 'Edwards-Curve Digital Signature Algorithm specification.',
 true, true, true, 'global', 'international', 'RFC 8032', 'IETF',
 'Ed25519 signatures for Solana, Cardano, etc.'),

('S-RFC-8446', 'S', 'RFC 8446 TLS 1.3',
 'Transport Layer Security - Modern secure channel establishment.',
 true, false, true, 'global', 'international', 'RFC 8446', 'IETF',
 'API security, node communication, RPC endpoints'),

('S-RFC-9106', 'S', 'RFC 9106 Argon2',
 'Password Hashing Competition winner - Memory-hard function for password protection.',
 true, true, true, 'global', 'international', 'RFC 9106', 'IETF',
 'Wallet password encryption, key stretching'),

-- Bitcoin/Crypto Native Standards
('S-BIP-032', 'S', 'BIP-32 HD Wallets',
 'Hierarchical Deterministic Wallets - Single seed derivation.',
 true, true, true, 'global', 'crypto_native', 'BIP-32', 'Bitcoin Core',
 'Core wallet standard - account derivation from single seed'),

('S-BIP-039', 'S', 'BIP-39 Mnemonic',
 'Mnemonic code for generating deterministic keys - 12/24 word phrases.',
 true, true, true, 'global', 'crypto_native', 'BIP-39', 'Bitcoin Core',
 'Seed phrase generation and recovery'),

('S-BIP-044', 'S', 'BIP-44 Multi-Account',
 'Multi-Account Hierarchy for Deterministic Wallets.',
 true, true, true, 'global', 'crypto_native', 'BIP-44', 'Bitcoin Core',
 'Standard derivation paths m/44''/.../...'),

('S-BIP-084', 'S', 'BIP-84 Native SegWit',
 'Native SegWit derivation path for P2WPKH addresses.',
 true, true, true, 'global', 'crypto_native', 'BIP-84', 'Bitcoin Core',
 'bc1q... addresses, lower fees'),

('S-BIP-340', 'S', 'BIP-340 Schnorr Signatures',
 'Schnorr signatures for Bitcoin - Key aggregation and batch verification.',
 true, false, true, 'global', 'crypto_native', 'BIP-340', 'Bitcoin Core',
 'Taproot, multi-sig efficiency, privacy improvement'),

('S-BIP-341', 'S', 'BIP-341 Taproot',
 'Bitcoin Taproot upgrade - MAST and Schnorr for enhanced privacy.',
 false, false, true, 'global', 'crypto_native', 'BIP-341', 'Bitcoin Core',
 'Complex spending conditions hidden until execution'),

('S-SLIP-0039', 'S', 'SLIP-0039 Shamir Backup',
 'Shamir Secret Sharing for seed phrase backup - K-of-N recovery.',
 true, true, true, 'global', 'crypto_native', 'SLIP-0039', 'SatoshiLabs',
 'Multi-location seed backup, social recovery'),

('S-SLIP-0044', 'S', 'SLIP-0044 Coin Types',
 'Registered coin types for deterministic wallets.',
 true, true, true, 'global', 'crypto_native', 'SLIP-0044', 'SatoshiLabs',
 'Multi-chain derivation paths (400+ coins)'),

-- Zero-Knowledge Proof Standards
('S-ZK-GROTH16', 'S', 'Groth16 zkSNARK',
 'Zero-knowledge succinct argument of knowledge with trusted setup.',
 false, false, true, 'global', 'crypto_native', 'Groth16', 'Crypto Community',
 'zkRollups, private transactions (Zcash)'),

('S-ZK-PLONK', 'S', 'PLONK Universal Setup',
 'Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge.',
 false, false, true, 'global', 'crypto_native', 'PLONK', 'Crypto Community',
 'zkSync, Scroll circuits'),

('S-ZK-STARK', 'S', 'STARKs Transparent Proofs',
 'Scalable Transparent Arguments of Knowledge - No trusted setup required.',
 false, false, true, 'global', 'crypto_native', 'STARKs', 'StarkWare',
 'StarkNet, validity rollups'),

('S-ZK-HALO2', 'S', 'Halo2 Recursive SNARKs',
 'Zcash Halo2 framework for recursive proof composition.',
 false, false, true, 'global', 'crypto_native', 'Halo2', 'Electric Coin Co',
 'Zcash Orchard, recursive ZK proofs'),

('S-ZK-CAIRO', 'S', 'Cairo/StarkNet VM',
 'STARK-based VM and proving system for StarkNet L2.',
 false, false, true, 'global', 'crypto_native', 'Cairo', 'StarkWare',
 'Validity rollups, computation integrity'),

-- Privacy Protocols
('S-PVY-SAPLING', 'S', 'Zcash Sapling/Orchard',
 'Shielded transaction protocols using Groth16/Halo2.',
 false, false, true, 'global', 'crypto_native', 'ZIP-32', 'Electric Coin Co',
 'Private transactions, shielded pools'),

('S-PVY-AZTEC', 'S', 'Aztec Noir',
 'Domain-specific language for private smart contracts.',
 false, false, true, 'global', 'crypto_native', 'Noir', 'Aztec Labs',
 'Private DeFi, confidential state transitions'),

('S-PVY-RAILGUN', 'S', 'Railgun Privacy',
 'Private DeFi using Groth16 and UTXO shielded pools.',
 false, false, true, 'global', 'crypto_native', 'Railgun', 'Railgun DAO',
 'Shielded swaps, private staking'),

-- Open Source Crypto Libraries
('S-LIB-SODIUM', 'S', 'libsodium/NaCl',
 'High-level cryptographic library APIs - XSalsa20, Poly1305, X25519.',
 false, true, true, 'global', 'open_source', 'libsodium', 'Open Source',
 'Wallet encryption, secure memory handling'),

('S-LIB-SIGNAL', 'S', 'Signal Protocol',
 'Double Ratchet Algorithm for end-to-end encrypted messaging.',
 false, false, true, 'global', 'open_source', 'Signal Protocol', 'Signal Foundation',
 'Secure messaging in wallet apps, P2P communication'),

('S-LIB-NOISE', 'S', 'Noise Protocol Framework',
 'Modern cryptographic protocol framework for secure channels.',
 false, false, true, 'global', 'open_source', 'Noise Framework', 'Noise Community',
 'WireGuard, Lightning Network BOLT-8'),

-- Advanced Cryptography
('S-ADV-PEDERSEN', 'S', 'Pedersen Commitments',
 'Cryptographic commitment scheme for confidential transactions.',
 false, false, true, 'global', 'crypto_native', 'Pedersen', 'Crypto Research',
 'Confidential transactions, ZK proofs'),

('S-ADV-KZG', 'S', 'KZG Polynomial Commitments',
 'Kate-Zaverucha-Goldberg commitments for EIP-4844 blobs.',
 false, false, true, 'global', 'crypto_native', 'KZG', 'Ethereum Foundation',
 'EIP-4844 blobs, Verkle trees'),

('S-ADV-FHE', 'S', 'Fully Homomorphic Encryption',
 'TFHE/OpenFHE for computation on encrypted data.',
 false, false, true, 'global', 'open_source', 'FHE', 'Research Community',
 'Encrypted smart contracts, private MEV protection'),

('S-ADV-MPC-TLS', 'S', 'MPC-TLS TLSNotary',
 'Proving web data authenticity using multi-party TLS sessions.',
 false, false, true, 'global', 'open_source', 'TLSNotary', 'Open Source',
 'Oracle data verification, off-chain proofs')

ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    crypto_relevance = EXCLUDED.crypto_relevance,
    scope_type = EXCLUDED.scope_type,
    standard_reference = EXCLUDED.standard_reference,
    issuing_authority = EXCLUDED.issuing_authority;

-- ============================================================
-- 3. ADVERSITY PILLAR (A) - HARDWARE & PHYSICAL SECURITY
-- ============================================================

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full", geographic_scope, scope_type, standard_reference, issuing_authority, crypto_relevance) VALUES

-- International Standards
('A-CC-15408', 'A', 'Common Criteria ISO 15408',
 'International standard for evaluating security features including EAL levels.',
 true, true, true, 'global', 'international', 'ISO 15408', 'ISO/IEC',
 'Hardware wallet certification (EAL5+/6+)'),

('A-ISO-24759', 'A', 'ISO/IEC 24759 Crypto Module Testing',
 'Test requirements for cryptographic modules - Physical security testing.',
 false, false, true, 'global', 'international', 'ISO/IEC 24759', 'ISO/IEC',
 'Secure element validation, tamper resistance testing'),

('A-ISO-17712', 'A', 'ISO 17712 Tamper-Evident Seals',
 'Mechanical seals - Tamper-evident seal standards.',
 false, true, true, 'global', 'international', 'ISO 17712', 'ISO',
 'Hardware wallet packaging, supply chain integrity'),

-- USA Standards
('A-NIST-053', 'A', 'NIST SP 800-53 Security Controls',
 'Security Controls for information systems and organizations.',
 false, false, true, 'US', 'usa', 'NIST SP 800-53', 'NIST',
 'Institutional custody requirements, access controls'),

('A-TEMPEST', 'A', 'TEMPEST/EMSEC',
 'Electromagnetic emanations security against surveillance.',
 false, false, true, 'US', 'usa', 'TEMPEST', 'NSA',
 'Air-gapped wallet protection, side-channel prevention'),

-- EU Standards
('A-ETSI-103097', 'A', 'ETSI TS 103 097',
 'Security protocols for protected communication channels.',
 false, false, true, 'EU', 'eu', 'ETSI TS 103 097', 'ETSI',
 'V2X security applicable to IoT wallets'),

-- Industry Standards
('A-OWASP-MASVS', 'A', 'OWASP MASVS/MASTG',
 'Mobile Application Security Verification Standard.',
 true, true, true, 'global', 'industry', 'OWASP MASVS v2', 'OWASP',
 'Mobile wallet hardening, root detection, anti-debugging'),

('A-EMVCO', 'A', 'EMVCo Security Guidelines',
 'Payment industry standards for secure chip technology.',
 false, false, true, 'global', 'industry', 'EMVCo Guidelines', 'EMVCo',
 'Chip-based hardware wallet security evaluation'),

('A-PCI-PIN', 'A', 'PCI PIN/PTS',
 'PIN Security and PIN Transaction Security for secure devices.',
 false, false, true, 'global', 'industry', 'PCI PTS', 'PCI SSC',
 'PIN entry security, HSM key ceremonies'),

('A-GP-TEE', 'A', 'GlobalPlatform TEE',
 'Trusted Execution Environment specifications.',
 true, false, true, 'global', 'industry', 'GlobalPlatform TEE', 'GlobalPlatform',
 'Mobile wallet secure enclave integration'),

('A-FIDO2', 'A', 'FIDO2/WebAuthn/CTAP2',
 'Passwordless authentication standards using hardware keys.',
 true, true, true, 'global', 'industry', 'FIDO2', 'FIDO Alliance',
 'Hardware key authentication, passkey wallets'),

-- Hardware Vendor Standards
('A-ARM-TZ', 'A', 'ARM TrustZone',
 'Hardware-based security isolation for mobile devices.',
 true, false, true, 'global', 'industry', 'ARM TrustZone', 'ARM',
 'Mobile wallet TEE, isolated key storage'),

('A-INTEL-SGX', 'A', 'Intel SGX/TDX',
 'Software Guard Extensions and Trust Domain Extensions.',
 false, false, true, 'global', 'industry', 'Intel SGX/TDX', 'Intel',
 'Server-side key management, MPC nodes'),

('A-AMD-SEV', 'A', 'AMD SEV-SNP',
 'Secure Encrypted Virtualization with Secure Nested Paging.',
 false, false, true, 'global', 'industry', 'AMD SEV-SNP', 'AMD',
 'Cloud custody infrastructure, validator nodes'),

('A-APPLE-SE', 'A', 'Apple Secure Enclave',
 'Hardware-based key manager for iOS/macOS.',
 true, true, true, 'global', 'industry', 'Secure Enclave', 'Apple',
 'iOS wallet key protection, biometric signing'),

('A-GOOGLE-TM2', 'A', 'Google Titan M2',
 'Security chip for Android hardware-backed keystore.',
 true, true, true, 'global', 'industry', 'Titan M2', 'Google',
 'Android wallet security, attestation'),

('A-INF-SE', 'A', 'Infineon SLE78/Optiga',
 'Secure element chips (CC EAL6+) for hardware wallets.',
 true, false, true, 'global', 'industry', 'Infineon SE', 'Infineon',
 'Hardware wallet secure elements (Ledger, Trezor)'),

('A-STM-ST33', 'A', 'STMicro ST33',
 'Secure MCU (CC EAL5+) for smartcard/wallet implementations.',
 true, false, true, 'global', 'industry', 'ST33', 'STMicroelectronics',
 'Hardware wallet key storage, signing'),

-- Cloud Confidential Computing
('A-AWS-NITRO', 'A', 'AWS Nitro Enclaves',
 'Isolated compute environments for sensitive data.',
 false, false, true, 'global', 'industry', 'Nitro Enclaves', 'AWS',
 'Cloud custody HSM, MPC key shares'),

('A-AZURE-CVM', 'A', 'Azure Confidential Computing',
 'AMD SEV-SNP based confidential virtual machines.',
 false, false, true, 'global', 'industry', 'Azure CVM', 'Microsoft',
 'Enterprise custody infrastructure'),

('A-GCP-CVM', 'A', 'GCP Confidential VM',
 'AMD SEV-based VMs for data-in-use encryption.',
 false, false, true, 'global', 'industry', 'GCP Confidential', 'Google Cloud',
 'Validator infrastructure, staking nodes'),

-- Crypto-Native Anti-Coercion
('A-CRYPTO-DURESS', 'A', 'Duress PIN/Panic Wallet',
 'Hidden wallet revealed under coercion with minimal funds.',
 true, true, true, 'global', 'crypto_native', 'Duress PIN', 'Wallet Vendors',
 'Physical attack mitigation, plausible deniability'),

('A-CRYPTO-SSS', 'A', 'Shamir Secret Sharing',
 'Threshold scheme splitting secrets across parties.',
 true, true, true, 'global', 'crypto_native', 'SLIP-39', 'SatoshiLabs',
 'SLIP-39, multi-location seed backup'),

('A-CRYPTO-TIMELOCK', 'A', 'Time-Locked Contracts',
 'Bitcoin CLTV/CSV and Ethereum timelocks.',
 false, true, true, 'global', 'crypto_native', 'BIP-65/112', 'Bitcoin Core',
 'Coercion resistance via mandatory delays')

ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    crypto_relevance = EXCLUDED.crypto_relevance,
    scope_type = EXCLUDED.scope_type;

-- ============================================================
-- 4. FIDELITY PILLAR (F) - TRUST & COMPLIANCE
-- ============================================================

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full", geographic_scope, scope_type, standard_reference, issuing_authority, crypto_relevance) VALUES

-- USA Standards
('F-SOC2-T2', 'F', 'SOC 2 Type II',
 'Service Organization Control report for security/availability.',
 true, false, true, 'global', 'usa', 'SOC 2 Type II', 'AICPA',
 'Custody provider compliance, exchange audits'),

('F-NIST-CSF2', 'F', 'NIST CSF 2.0',
 'Cybersecurity Framework - Govern, Identify, Protect, Detect, Respond, Recover.',
 false, false, true, 'global', 'usa', 'NIST CSF 2.0', 'NIST',
 'Enterprise security program for crypto companies'),

('F-SEC-CFTC', 'F', 'SEC/CFTC Oversight',
 'Securities and Exchange Commission / CFTC compliance.',
 false, false, true, 'US', 'usa', 'SEC/CFTC', 'US Government',
 'US securities law compliance, commodity trading'),

-- International Standards (ISO)
('F-ISO-27001', 'F', 'ISO 27001 ISMS',
 'Information Security Management System requirements.',
 true, false, true, 'global', 'international', 'ISO 27001:2022', 'ISO/IEC',
 'Global security certification for exchanges, custodians'),

('F-ISO-27017', 'F', 'ISO 27017 Cloud Security',
 'Cloud security controls for cloud service providers.',
 false, false, true, 'global', 'international', 'ISO 27017', 'ISO/IEC',
 'Cloud-based wallet and custody security'),

('F-ISO-27701', 'F', 'ISO 27701 Privacy',
 'Privacy Information Management System - GDPR alignment.',
 false, false, true, 'global', 'international', 'ISO 27701', 'ISO/IEC',
 'GDPR compliance for EU crypto services'),

('F-ISO-22301', 'F', 'ISO 22301 Business Continuity',
 'Business Continuity Management standards.',
 false, false, true, 'global', 'international', 'ISO 22301', 'ISO',
 'Exchange uptime guarantees, DR planning'),

('F-ISO-27035', 'F', 'ISO 27035 Incident Management',
 'Information Security Incident Management guidelines.',
 false, false, true, 'global', 'international', 'ISO 27035', 'ISO/IEC',
 'Hack response procedures, post-mortem standards'),

('F-ISO-29147', 'F', 'ISO 29147 Vuln Disclosure',
 'Vulnerability disclosure standards and best practices.',
 false, false, true, 'global', 'international', 'ISO 29147', 'ISO/IEC',
 'Bug bounty program structure'),

('F-FATF-TR', 'F', 'FATF Travel Rule',
 'VASP compliance for originator/beneficiary information.',
 true, false, true, 'global', 'international', 'FATF Recommendation 16', 'FATF',
 'Cross-border crypto transfer compliance'),

-- Industry Standards
('F-PCI-DSS4', 'F', 'PCI DSS v4.0',
 'Payment Card Industry Data Security Standard.',
 false, false, true, 'global', 'industry', 'PCI DSS v4.0', 'PCI SSC',
 'Fiat on/off ramp security, card payment integration'),

('F-CIS-V8', 'F', 'CIS Controls v8',
 'Center for Internet Security 18 critical controls.',
 false, false, true, 'global', 'industry', 'CIS Controls v8', 'CIS',
 'Infrastructure hardening baseline'),

-- Crypto-Native Standards
('F-CCSS-III', 'F', 'CCSS Level III',
 'CryptoCurrency Security Standard highest tier.',
 true, false, true, 'global', 'crypto_native', 'CCSS v9.0', 'C4',
 'Crypto-specific security certification'),

('F-IMMUNEFI', 'F', 'Immunefi Bug Bounty',
 'Web3-focused bug bounty platform ($150M+ paid).',
 true, true, true, 'global', 'crypto_native', 'Immunefi', 'Immunefi',
 'Smart contract vulnerability disclosure'),

('F-CODE4RENA', 'F', 'Code4rena/Sherlock Audits',
 'Competitive audit platforms with coverage guarantees.',
 true, false, true, 'global', 'crypto_native', 'Code4rena', 'Code4rena',
 'Crowdsourced smart contract audits'),

('F-SPEARBIT', 'F', 'Trail of Bits/Spearbit',
 'Elite security researcher collectives.',
 true, false, true, 'global', 'crypto_native', 'Spearbit/ToB', 'Audit Firms',
 'Tier-1 smart contract auditing firms'),

('F-CHAINLINK-POR', 'F', 'Chainlink Proof of Reserve',
 'Real-time collateral verification for reserves.',
 false, false, true, 'global', 'crypto_native', 'Chainlink PoR', 'Chainlink',
 'Stablecoin reserves, wrapped token backing'),

('F-NEXUS', 'F', 'Nexus Mutual/InsurAce',
 'DeFi protocol cover and smart contract insurance.',
 false, false, true, 'global', 'crypto_native', 'Nexus Mutual', 'Nexus Mutual',
 'Protocol insurance, hack coverage'),

('F-FORTA', 'F', 'Forta Network',
 'Decentralized real-time threat detection network.',
 false, false, true, 'global', 'crypto_native', 'Forta', 'Forta',
 'On-chain attack detection, anomaly alerts'),

('F-OZ-DEFENDER', 'F', 'OpenZeppelin Defender',
 'Smart contract operations platform with monitoring.',
 false, false, true, 'global', 'crypto_native', 'OZ Defender', 'OpenZeppelin',
 'Contract admin security, upgrade monitoring'),

('F-CERTORA', 'F', 'Certora Prover',
 'Formal verification for smart contracts.',
 false, false, true, 'global', 'crypto_native', 'Certora', 'Certora',
 'DeFi protocol correctness guarantees'),

-- Open Source Standards
('F-SLSA', 'F', 'SLSA Supply Chain',
 'Supply-chain Levels for Software Artifacts.',
 false, false, true, 'global', 'open_source', 'SLSA', 'OpenSSF',
 'Wallet binary verification, reproducible builds'),

('F-SIGSTORE', 'F', 'Sigstore/Cosign',
 'Keyless signing for container images.',
 false, false, true, 'global', 'open_source', 'Sigstore', 'OpenSSF',
 'Docker image signing for node operators'),

('F-SBOM', 'F', 'SBOM SPDX/CycloneDX',
 'Software Bill of Materials for dependency tracking.',
 false, false, true, 'global', 'open_source', 'SPDX/CycloneDX', 'Linux Foundation',
 'Dependency vulnerability tracking'),

('F-OSSF-SC', 'F', 'OpenSSF Scorecard',
 'Security health metrics for open source projects.',
 false, false, true, 'global', 'open_source', 'OpenSSF Scorecard', 'OpenSSF',
 'Open-source wallet security assessment'),

('F-REPRO', 'F', 'Reproducible Builds',
 'Deterministic compilation for binary verification.',
 false, true, true, 'global', 'open_source', 'Reproducible Builds', 'Linux',
 'Verify wallet binaries match source code'),

-- EU Regulations
('F-MICA', 'F', 'MiCA (EU)',
 'Markets in Crypto-Assets Regulation.',
 true, false, true, 'EU', 'eu', 'MiCA 2023/1114', 'European Commission',
 'EU exchange licensing, stablecoin requirements'),

('F-DORA', 'F', 'DORA (EU)',
 'Digital Operational Resilience Act for financial entities.',
 false, false, true, 'EU', 'eu', 'DORA 2022/2554', 'European Commission',
 'ICT risk management for crypto firms in EU'),

-- Regional Regulations
('F-VARA', 'F', 'VARA (Dubai)',
 'Virtual Assets Regulatory Authority - Dubai crypto framework.',
 false, false, true, 'MIDDLE_EAST', 'regional', 'VARA', 'VARA Dubai',
 'Dubai exchange and VASP licensing'),

('F-MAS', 'F', 'MAS (Singapore)',
 'Monetary Authority of Singapore digital payment token regulations.',
 false, false, true, 'ASIA', 'regional', 'PSA', 'MAS',
 'Singapore crypto licensing'),

('F-JFSA', 'F', 'JFSA (Japan)',
 'Japan Financial Services Agency crypto-asset regulations.',
 false, false, true, 'ASIA', 'regional', 'JFSA Guidelines', 'JFSA',
 'Japan exchange registration, cold storage rules'),

('F-FCA', 'F', 'FCA (UK)',
 'Financial Conduct Authority crypto registration and AML.',
 false, false, true, 'UK', 'regional', 'FCA FSMA', 'FCA',
 'UK crypto marketing, AML registration')

ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    crypto_relevance = EXCLUDED.crypto_relevance,
    scope_type = EXCLUDED.scope_type;

-- ============================================================
-- 5. EFFICIENCY PILLAR (E) - USABILITY & STANDARDS
-- ============================================================

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full", geographic_scope, scope_type, standard_reference, issuing_authority, crypto_relevance) VALUES

-- International Standards
('E-WCAG-22', 'E', 'WCAG 2.2 Level AA',
 'Web Content Accessibility Guidelines for disability-inclusive design.',
 true, true, true, 'global', 'international', 'WCAG 2.2', 'W3C',
 'Wallet accessibility for users with disabilities'),

('E-ISO-9241', 'E', 'ISO 9241 Human-System Interaction',
 'Ergonomics of human-system interaction design principles.',
 false, false, true, 'global', 'international', 'ISO 9241-110/210', 'ISO',
 'Wallet UX design, error prevention'),

('E-ISO-25010', 'E', 'ISO 25010 Software Quality',
 'Software Quality Model and measurement standards.',
 false, false, true, 'global', 'international', 'ISO 25010/25023', 'ISO/IEC',
 'Software reliability metrics for wallets'),

-- Ethereum Standards (EIP/ERC)
('E-ERC-20', 'E', 'ERC-20 Fungible Tokens',
 'Standard interface for fungible tokens on Ethereum.',
 true, true, true, 'global', 'crypto_native', 'ERC-20', 'Ethereum Foundation',
 'Core token support in any Ethereum wallet'),

('E-ERC-721', 'E', 'ERC-721 NFTs',
 'Non-fungible token standard for unique assets.',
 true, true, true, 'global', 'crypto_native', 'ERC-721', 'Ethereum Foundation',
 'NFT support in wallets'),

('E-ERC-1155', 'E', 'ERC-1155 Multi-Token',
 'Multi-token standard for mixed fungible/non-fungible.',
 true, true, true, 'global', 'crypto_native', 'ERC-1155', 'Ethereum Foundation',
 'Gaming tokens, batch transfers'),

('E-ERC-4626', 'E', 'ERC-4626 Tokenized Vaults',
 'Tokenized vault interface for yield-bearing tokens.',
 false, true, true, 'global', 'crypto_native', 'ERC-4626', 'Ethereum Foundation',
 'DeFi yield vaults, LST integration'),

('E-EIP-712', 'E', 'EIP-712 Typed Signing',
 'Typed structured data hashing for human-readable signatures.',
 true, true, true, 'global', 'crypto_native', 'EIP-712', 'Ethereum Foundation',
 'Clear transaction signing, phishing prevention'),

('E-EIP-1559', 'E', 'EIP-1559 Fee Market',
 'Fee market reform with base fee + priority fee.',
 true, true, true, 'global', 'crypto_native', 'EIP-1559', 'Ethereum Foundation',
 'Predictable gas fees, better UX'),

('E-EIP-4337', 'E', 'EIP-4337 Account Abstraction',
 'Account abstraction via UserOperations and bundlers.',
 true, true, true, 'global', 'crypto_native', 'EIP-4337', 'Ethereum Foundation',
 'Gasless transactions, social recovery, batching'),

('E-EIP-2612', 'E', 'EIP-2612 Permit',
 'Signature-based token approvals for gasless interactions.',
 true, true, true, 'global', 'crypto_native', 'EIP-2612', 'Ethereum Foundation',
 'One-click DeFi, no separate approve tx'),

('E-EIP-4361', 'E', 'EIP-4361 SIWE',
 'Sign-In with Ethereum for web3 authentication.',
 true, true, true, 'global', 'crypto_native', 'EIP-4361', 'Ethereum Foundation',
 'Passwordless dApp login'),

('E-EIP-6963', 'E', 'EIP-6963 Provider Discovery',
 'Multi Injected Provider Discovery for wallets.',
 true, true, true, 'global', 'crypto_native', 'EIP-6963', 'Ethereum Foundation',
 'Multiple wallet support without conflicts'),

('E-ERC-6900', 'E', 'ERC-6900 Modular Accounts',
 'Modular Smart Contract Accounts standard.',
 false, false, true, 'global', 'crypto_native', 'ERC-6900', 'Ethereum Foundation',
 'Pluggable wallet functionality'),

('E-EIP-7702', 'E', 'EIP-7702 SetCode',
 'EOA code setting for smart account functionality.',
 false, false, true, 'global', 'crypto_native', 'EIP-7702', 'Ethereum Foundation',
 'Upgrade EOAs to smart accounts'),

-- Bitcoin Standards
('E-BIP-173', 'E', 'BIP-173 Bech32',
 'Bech32 address encoding for native SegWit.',
 true, true, true, 'global', 'crypto_native', 'BIP-173', 'Bitcoin Core',
 'Modern Bitcoin addresses (bc1q...), lower fees'),

('E-BIP-370', 'E', 'BIP-370 PSBT v2',
 'Partially Signed Bitcoin Transaction format version 2.',
 false, true, true, 'global', 'crypto_native', 'BIP-370', 'Bitcoin Core',
 'Multi-party signing, hardware wallet support'),

('E-ORDINALS', 'E', 'Ordinals/Runes/BRC-20',
 'Bitcoin-native token and inscription standards.',
 false, true, true, 'global', 'crypto_native', 'Ordinals', 'Bitcoin Community',
 'Bitcoin NFTs, fungible tokens on Bitcoin'),

-- Multi-Chain Standards
('E-CAIP', 'E', 'CAIP Chain Agnostic',
 'Chain Agnostic Improvement Proposals for IDs.',
 true, true, true, 'global', 'crypto_native', 'CAIP-2/10/25', 'CAIP',
 'Universal multi-chain wallet addressing'),

('E-WC-V2', 'E', 'WalletConnect v2',
 'Protocol for secure multi-chain wallet-to-dApp connections.',
 true, true, true, 'global', 'crypto_native', 'WalletConnect v2', 'WalletConnect',
 'Mobile wallet dApp connection'),

-- Layer 2 Standards
('E-OP-STACK', 'E', 'OP Stack/Arbitrum Orbit',
 'Optimistic rollup frameworks for L2 deployment.',
 false, true, true, 'global', 'crypto_native', 'OP Stack', 'Optimism',
 'L2 ecosystem wallet support'),

('E-ZKEVM', 'E', 'zkEVM Standards',
 'Zero-knowledge EVM implementations for scaling.',
 false, false, true, 'global', 'crypto_native', 'zkEVM', 'Various',
 'ZK rollup wallet integration'),

('E-EIP-4844', 'E', 'EIP-4844 Blobs',
 'Proto-danksharding for L2 data availability.',
 false, false, true, 'global', 'crypto_native', 'EIP-4844', 'Ethereum Foundation',
 'Cheaper L2 transaction costs'),

-- Cross-Chain
('E-CCIP', 'E', 'Chainlink CCIP',
 'Cross-Chain Interoperability Protocol.',
 false, true, true, 'global', 'crypto_native', 'Chainlink CCIP', 'Chainlink',
 'Secure cross-chain token bridging'),

('E-LAYERZERO', 'E', 'LayerZero/Axelar',
 'Cross-chain messaging and interoperability protocols.',
 false, false, true, 'global', 'crypto_native', 'LayerZero', 'LayerZero Labs',
 'Multi-chain DeFi composability'),

-- DeFi Standards
('E-SAFE', 'E', 'Safe (Gnosis) Multi-sig',
 'Multi-sig wallet standards with modules and guards.',
 true, true, true, 'global', 'crypto_native', 'Safe', 'Safe',
 'Team treasury, DAO governance'),

('E-UNISWAP-V4', 'E', 'Uniswap v4 Hooks',
 'Custom pool logic and MEV-aware AMM design.',
 false, false, true, 'global', 'crypto_native', 'Uniswap v4', 'Uniswap Labs',
 'Advanced DEX functionality'),

('E-COW-1INCH', 'E', 'CoW Protocol/1inch Fusion',
 'Intent-based DEX aggregators with MEV protection.',
 false, true, true, 'global', 'crypto_native', 'CoW/1inch', 'CoW/1inch',
 'Best execution, MEV protection'),

('E-FLASHBOTS', 'E', 'Flashbots Protect',
 'MEV protection RPC for private transaction submission.',
 false, true, true, 'global', 'crypto_native', 'Flashbots', 'Flashbots',
 'Front-running protection'),

-- Oracles
('E-ORACLES', 'E', 'Chainlink/Pyth/Chronicle',
 'Price oracle networks for DeFi price feeds.',
 false, true, true, 'global', 'crypto_native', 'Chainlink/Pyth', 'Oracle Networks',
 'Reliable price data for swaps, liquidations'),

-- Identity Standards
('E-WORLDCOIN', 'E', 'Worldcoin/Polygon ID',
 'Proof of personhood and privacy-preserving identity.',
 false, false, true, 'global', 'crypto_native', 'World ID', 'Worldcoin/Polygon',
 'Sybil resistance, KYC alternatives'),

('E-GITCOIN', 'E', 'Gitcoin Passport/EAS',
 'Sybil resistance and on-chain attestations.',
 false, true, true, 'global', 'crypto_native', 'Gitcoin Passport', 'Gitcoin',
 'Reputation, airdrop eligibility'),

('E-ENS', 'E', 'ENS/Unstoppable Domains',
 'Human-readable wallet addresses and decentralized domains.',
 true, true, true, 'global', 'crypto_native', 'ENS', 'ENS DAO',
 'User-friendly addresses (vitalik.eth)'),

-- Account Abstraction Infrastructure
('E-AA-BUNDLERS', 'E', 'Biconomy/Pimlico/Stackup',
 'Account abstraction bundler and paymaster infrastructure.',
 false, false, true, 'global', 'crypto_native', 'EIP-4337 Bundlers', 'Various',
 'Gasless tx, sponsored transactions'),

('E-LIT', 'E', 'Lit Protocol',
 'Decentralized access control and programmable MPC wallets.',
 false, false, true, 'global', 'crypto_native', 'Lit Protocol', 'Lit Protocol',
 'Programmable signing, access control')

ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    crypto_relevance = EXCLUDED.crypto_relevance,
    scope_type = EXCLUDED.scope_type;

-- ============================================================
-- 6. CREATE VIEW FOR SCOPE ANALYSIS
-- ============================================================

CREATE OR REPLACE VIEW v_norms_by_scope_type AS
SELECT
    scope_type,
    pillar,
    COUNT(*) as norm_count,
    COUNT(*) FILTER (WHERE is_essential = true) as essential_count,
    COUNT(*) FILTER (WHERE consumer = true) as consumer_count,
    array_agg(DISTINCT issuing_authority) FILTER (WHERE issuing_authority IS NOT NULL) as authorities
FROM norms
WHERE scope_type IS NOT NULL
GROUP BY scope_type, pillar
ORDER BY scope_type, pillar;

-- ============================================================
-- 7. VERIFICATION
-- ============================================================

DO $$
DECLARE
    v_total INTEGER;
    v_with_scope INTEGER;
    v_with_relevance INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM norms;
    SELECT COUNT(*) INTO v_with_scope FROM norms WHERE scope_type IS NOT NULL;
    SELECT COUNT(*) INTO v_with_relevance FROM norms WHERE crypto_relevance IS NOT NULL;

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'COMPREHENSIVE STANDARDS UPDATE COMPLETED';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total norms: %', v_total;
    RAISE NOTICE 'With scope_type: %', v_with_scope;
    RAISE NOTICE 'With crypto_relevance: %', v_with_relevance;
    RAISE NOTICE '============================================================';
END $$;

-- Summary by scope type
SELECT
    scope_type,
    COUNT(*) as norms,
    COUNT(*) FILTER (WHERE pillar = 'S') as security,
    COUNT(*) FILTER (WHERE pillar = 'A') as adversity,
    COUNT(*) FILTER (WHERE pillar = 'F') as fidelity,
    COUNT(*) FILTER (WHERE pillar = 'E') as efficiency
FROM norms
WHERE scope_type IS NOT NULL
GROUP BY scope_type
ORDER BY norms DESC;

COMMENT ON TABLE norms IS 'Security norms for crypto products with comprehensive scope classification and crypto relevance';
