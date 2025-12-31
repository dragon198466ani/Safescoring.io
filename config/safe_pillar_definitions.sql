-- ============================================================
-- SAFE PILLAR DEFINITIONS TABLE
-- ============================================================
-- Stores detailed definitions for each SAFE pillar (S, A, F, E)
-- Based on RECLASSIFICATION_PROPOSAL.md
-- ============================================================

-- ============================================================
-- 1. TABLE: safe_pillar_definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS safe_pillar_definitions (
    id SERIAL PRIMARY KEY,
    pillar_code CHAR(1) NOT NULL UNIQUE,      -- 'S', 'A', 'F', 'E'
    pillar_name VARCHAR(100) NOT NULL,         -- Full name

    -- Core definition
    definition TEXT NOT NULL,                  -- Clear definition

    -- What this pillar includes
    includes TEXT[] NOT NULL,                  -- List of what it covers

    -- What this pillar excludes (to avoid confusion)
    excludes TEXT[],                           -- What does NOT belong here

    -- Typical norms
    typical_norm_ranges TEXT[],                -- E.g., ['S01-S10', 'S100-S169']

    -- Metrics for evaluation
    metrics TEXT[] NOT NULL,                   -- How to measure compliance

    -- Hardware vs Software distinction
    hardware_criteria JSONB,                   -- Criteria specific to hardware
    software_criteria JSONB,                   -- Criteria specific to software

    -- Keywords for AI classification
    keywords TEXT[],                           -- Keywords that suggest this pillar

    -- Examples
    example_norms TEXT[],                      -- Example norm codes

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '2.0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. INSERT REVISED DEFINITIONS
-- ============================================================

INSERT INTO safe_pillar_definitions (
    pillar_code,
    pillar_name,
    definition,
    includes,
    excludes,
    typical_norm_ranges,
    metrics,
    hardware_criteria,
    software_criteria,
    keywords,
    example_norms
) VALUES
-- ============================================================
-- S - SECURITY (Technical Security)
-- ============================================================
(
    'S',
    'SECURITY - Technical Security',
    'Evaluates all technical security measures that protect assets and data through cryptographic, protocol-level, and application-level mechanisms. This pillar focuses on the inherent security properties of the technology itself, not on resilience to human adversaries or physical attacks.',
    ARRAY[
        'Cryptographic algorithms and implementations (AES-256, RSA-2048+, SHA-256/SHA-3, ECDSA, EdDSA)',
        'Key management (generation, storage, derivation - BIP32/BIP39/BIP44)',
        'Blockchain protocol standards (BIP for Bitcoin, EIP for Ethereum)',
        'Smart contract security (reentrancy protection, overflow checks, access controls)',
        'Secure communication protocols (TLS 1.3, end-to-end encryption)',
        'Authentication mechanisms (2FA, biometrics, hardware keys)',
        'Authorization and access control (role-based, multi-sig)',
        'Crypto-economic protections (MEV protection, front-running prevention, sandwich attack mitigation)',
        'Side-channel attack resistance (timing attacks, power analysis)',
        'Secure random number generation (CSPRNG)',
        'Code security (input validation, injection prevention, secure coding practices)',
        'Third-party security audits by recognized firms',
        'Bug bounty programs and responsible disclosure policies',
        'Secure Element or TEE usage for key protection'
    ],
    ARRAY[
        'Physical attack resistance (belongs to A - Adversity)',
        'Coercion and duress protections (belongs to A - Adversity)',
        'Backup and recovery mechanisms (belongs to A - Adversity)',
        'Uptime and availability (belongs to F - Fidelity)',
        'Code quality metrics like test coverage (belongs to F - Fidelity)',
        'User experience and ease of use (belongs to E - Efficiency)',
        'Performance metrics like TPS (belongs to E - Efficiency)'
    ],
    ARRAY['S01-S50 (cryptography)', 'S51-S100 (authentication)', 'S101-S200 (blockchain security)', 'S201-S300 (smart contracts)'],
    ARRAY[
        'Cryptographic algorithms meet NIST/FIPS standards',
        'Key lengths meet current security requirements (256-bit symmetric, 2048+ RSA)',
        'Security audit completed by recognized firm (Trail of Bits, OpenZeppelin, Certik, Halborn)',
        'No critical or high vulnerabilities in last 12 months',
        'Bug bounty program active with significant rewards',
        'Multi-signature or threshold signatures supported',
        'Hardware security module (HSM) or Secure Element used',
        'All communications encrypted with TLS 1.3+',
        'Zero known exploits or hacks'
    ],
    '{
        "secure_element": {
            "required": true,
            "types": ["CC EAL5+", "CC EAL6+", "FIPS 140-2 Level 3+"],
            "description": "Dedicated security chip for key storage"
        },
        "firmware_security": {
            "signed_updates": "Cryptographically signed firmware",
            "secure_boot": "Verified boot chain",
            "anti_rollback": "Protection against firmware downgrade"
        },
        "physical_security": {
            "anti_tampering": "Detection of physical intrusion",
            "secure_display": "Trusted display for transaction verification"
        }
    }',
    '{
        "code_security": {
            "static_analysis": "Automated vulnerability scanning",
            "dependency_audit": "Third-party library security review",
            "penetration_testing": "Regular security testing"
        },
        "smart_contract_security": {
            "formal_verification": "Mathematical proof of correctness",
            "audit_required": "Third-party audit mandatory",
            "upgrade_mechanism": "Secure proxy patterns if upgradeable"
        },
        "api_security": {
            "rate_limiting": "Protection against abuse",
            "input_validation": "Strict parameter validation",
            "authentication": "Strong API key or OAuth security"
        }
    }',
    ARRAY['security', 'cryptography', 'encryption', 'decryption', 'hash', 'signature', 'key', 'private key', 'public key', 'algorithm', 'NIST', 'FIPS', 'BIP', 'EIP', 'audit', 'vulnerability', 'exploit', 'CVE', 'attack', 'protection', 'secure element', 'HSM', 'TEE', 'TLS', 'SSL', '2FA', 'MFA', 'authentication', 'authorization', 'access control', 'multi-sig', 'threshold', 'MEV', 'front-running', 'reentrancy', 'overflow', 'injection', 'XSS', 'CSRF'],
    ARRAY['S01', 'S10', 'S50', 'S100', 'S150', 'S200']
),

-- ============================================================
-- A - ADVERSITY & RESILIENCE
-- ============================================================
(
    'A',
    'ADVERSITY - Adversarial Resilience',
    'Measures the ability to protect users and assets against adverse real-world situations including physical threats, coercion, theft, loss, legal pressure, and disasters. This pillar focuses on human and environmental adversity, not technical security flaws.',
    ARRAY[
        'Anti-coercion mechanisms (duress PIN, panic button, plausible deniability)',
        'Hidden wallets and decoy accounts',
        'Plausible deniability features (hidden volumes, steganography)',
        'Theft protection (device wipe, kill switch, time-locked withdrawals)',
        'Loss protection (backup systems, seed phrase recovery, social recovery)',
        'Multi-location backup strategies (geographic distribution)',
        'Inheritance and dead man switch mechanisms',
        'Physical tamper resistance and tamper-evidence',
        'Self-destruct on unauthorized access attempts',
        'Legal protections and jurisdiction considerations',
        'Privacy features (transaction obfuscation, address rotation)',
        'Disaster recovery planning (fire, flood, EMP)',
        'Insurance coverage for losses',
        'Operational security (OpSec) guidance and documentation',
        'Time-delayed transactions for high-value transfers'
    ],
    ARRAY[
        'Cryptographic algorithm strength (belongs to S - Security)',
        'Smart contract vulnerabilities (belongs to S - Security)',
        'Protocol-level security (belongs to S - Security)',
        'Hardware durability and warranty (belongs to F - Fidelity)',
        'Software uptime and updates (belongs to F - Fidelity)',
        'User interface design (belongs to E - Efficiency)',
        'Transaction speed and costs (belongs to E - Efficiency)'
    ],
    ARRAY['A01-A30 (anti-coercion)', 'A31-A60 (backup/recovery)', 'A61-A100 (physical protection)', 'A101-A150 (legal/privacy)'],
    ARRAY[
        'Duress PIN or panic button available',
        'Hidden wallet feature supported',
        'Plausible deniability mechanism present',
        'BIP39 seed phrase backup supported',
        'Multi-share backup (Shamir, SLIP39) available',
        'Social recovery option provided',
        'Time-locked transactions supported',
        'Inheritance mechanism documented',
        'Tamper-evident packaging and seals',
        'Self-destruct after N failed attempts',
        'Geographic backup distribution guidance',
        'Insurance options available or recommended'
    ],
    '{
        "anti_coercion": {
            "duress_pin": "Alternative PIN that triggers protective actions",
            "hidden_wallet": "Secondary wallet invisible without special access",
            "decoy_mode": "Fake interface showing minimal funds"
        },
        "physical_protection": {
            "tamper_evident": "Visible signs if device opened",
            "tamper_resistant": "Difficult to physically compromise",
            "self_destruct": "Key erasure on intrusion detection",
            "metal_backup": "Steel seed phrase plates for fire/water resistance"
        },
        "recovery": {
            "seed_phrase": "BIP39 24-word mnemonic",
            "shamir_backup": "SLIP39 multi-share backup",
            "microsd_backup": "Encrypted backup to removable media"
        }
    }',
    '{
        "backup_recovery": {
            "cloud_backup": "Encrypted cloud backup option",
            "local_backup": "Encrypted local file export",
            "social_recovery": "Guardian-based recovery system",
            "email_recovery": "Secure email-based recovery"
        },
        "access_protection": {
            "time_locks": "Delayed withdrawals for large amounts",
            "spending_limits": "Daily/weekly transaction limits",
            "whitelist": "Pre-approved destination addresses",
            "multi_device": "Requires multiple device approval"
        },
        "privacy": {
            "tor_support": "Built-in Tor routing",
            "vpn_compatible": "Works with VPN services",
            "address_rotation": "Automatic new address generation",
            "coin_mixing": "Transaction obfuscation features"
        }
    }',
    ARRAY['coercion', 'duress', 'panic', 'hidden', 'decoy', 'plausible deniability', 'backup', 'recovery', 'seed phrase', 'mnemonic', 'Shamir', 'SLIP39', 'social recovery', 'theft', 'loss', 'stolen', 'lost', 'tamper', 'self-destruct', 'wipe', 'erase', 'inheritance', 'dead man', 'time-lock', 'disaster', 'fire', 'flood', 'insurance', 'legal', 'jurisdiction', 'privacy', 'Tor', 'mixing', 'obfuscation'],
    ARRAY['A01', 'A15', 'A40', 'A75', 'A100', 'A120']
),

-- ============================================================
-- F - FIDELITY & RELIABILITY
-- ============================================================
(
    'F',
    'FIDELITY - Reliability and Quality',
    'Evaluates the reliability, build quality, longevity, and trustworthiness of the product over time. For hardware, this means physical durability and manufacturing quality. For software, this means uptime, code quality, maintenance, and long-term support.',
    ARRAY[
        'Physical durability (drop resistance, water/dust protection)',
        'Material quality (aircraft-grade aluminum, stainless steel, quality plastics)',
        'Manufacturing certifications (CE, FCC, RoHS, MIL-STD-810)',
        'Component quality (industrial-grade, automotive-grade)',
        'Manufacturer warranty and support',
        'Service uptime and availability (99.9%+)',
        'Code quality and test coverage',
        'Regular security updates and patches',
        'Long-term support (LTS) commitment',
        'Documentation quality and completeness',
        'Open source code (auditable, community reviewed)',
        'Company track record and reputation',
        'Financial stability of the company',
        'Incident response history',
        'Bug fix response time',
        'Version control and changelog transparency'
    ],
    ARRAY[
        'Cryptographic security (belongs to S - Security)',
        'Authentication mechanisms (belongs to S - Security)',
        'Coercion protection (belongs to A - Adversity)',
        'Backup mechanisms (belongs to A - Adversity)',
        'Transaction speed (belongs to E - Efficiency)',
        'User interface design (belongs to E - Efficiency)',
        'Feature richness (belongs to E - Efficiency)'
    ],
    ARRAY['F01-F50 (hardware quality)', 'F51-F100 (software quality)', 'F101-F150 (company/support)', 'F151-F200 (documentation)'],
    ARRAY[
        'IP rating for water/dust resistance (IP67+)',
        'Operating temperature range (-20C to +60C)',
        'Drop test certification (1.5m on concrete)',
        'Warranty duration (2+ years)',
        'Service uptime SLA (99.9%+)',
        'Mean time to patch critical vulnerabilities (<7 days)',
        'Test coverage percentage (80%+)',
        'Third-party code audit completed',
        'Open source code availability',
        'Company age and track record (2+ years)',
        'No major unresolved incidents',
        'Active development (commits in last 30 days)',
        'Documentation completeness score'
    ],
    '{
        "durability": {
            "ip_rating": {
                "excellent": "IP68 (submersible)",
                "good": "IP67 (splash resistant)",
                "acceptable": "IP54 (dust/splash protected)",
                "poor": "No IP rating"
            },
            "temperature": {
                "excellent": "-40C to +85C (industrial)",
                "good": "-20C to +60C (extended)",
                "acceptable": "0C to +45C (standard)",
                "poor": "Limited range"
            },
            "shock": {
                "excellent": "MIL-STD-810G certified",
                "good": "1.8m drop tested",
                "acceptable": "1.2m drop tested",
                "poor": "No drop testing"
            }
        },
        "materials": {
            "excellent": "Aircraft-grade aluminum, stainless steel, sapphire glass",
            "good": "Aluminum alloy, Gorilla Glass",
            "acceptable": "Quality ABS plastic",
            "poor": "Cheap plastic, no reinforcement"
        },
        "certifications": ["CE", "FCC", "RoHS", "WEEE", "MIL-STD-810", "IEC 62443"],
        "warranty": {
            "excellent": "5+ years",
            "good": "3-5 years",
            "acceptable": "2 years",
            "poor": "<2 years"
        },
        "battery": {
            "excellent": "10+ years standby, replaceable",
            "good": "5+ years standby",
            "acceptable": "2+ years standby",
            "poor": "<2 years or non-replaceable"
        }
    }',
    '{
        "uptime": {
            "excellent": ">=99.99% (52 min downtime/year)",
            "good": ">=99.9% (8.7 hours downtime/year)",
            "acceptable": ">=99.5% (1.8 days downtime/year)",
            "poor": "<99.5%"
        },
        "patches": {
            "excellent": "Critical vulnerabilities patched <24 hours",
            "good": "Critical vulnerabilities patched <7 days",
            "acceptable": "Critical vulnerabilities patched <30 days",
            "poor": ">30 days or inconsistent"
        },
        "code_quality": {
            "test_coverage": {
                "excellent": ">=90%",
                "good": ">=80%",
                "acceptable": ">=60%",
                "poor": "<60% or unknown"
            },
            "audit_status": {
                "excellent": "Multiple audits, all issues resolved",
                "good": "One audit, issues resolved",
                "acceptable": "Audit planned or in progress",
                "poor": "No audit"
            },
            "open_source": {
                "excellent": "Fully open source, active community",
                "good": "Core open source",
                "acceptable": "Partial open source",
                "poor": "Closed source"
            }
        },
        "support": {
            "lts": {
                "excellent": "5+ years guaranteed",
                "good": "3-5 years guaranteed",
                "acceptable": "2 years guaranteed",
                "poor": "No commitment"
            },
            "response_time": {
                "excellent": "<4 hours for critical issues",
                "good": "<24 hours for critical issues",
                "acceptable": "<72 hours for critical issues",
                "poor": ">72 hours or no SLA"
            }
        },
        "track_record": {
            "excellent": "5+ years, no major incidents",
            "good": "2-5 years, incidents handled well",
            "acceptable": "1-2 years, minor issues only",
            "poor": "<1 year or unresolved incidents"
        }
    }',
    ARRAY['reliability', 'durability', 'quality', 'uptime', 'availability', 'warranty', 'guarantee', 'certification', 'CE', 'FCC', 'RoHS', 'IP rating', 'waterproof', 'dustproof', 'shockproof', 'drop test', 'temperature', 'update', 'patch', 'maintenance', 'support', 'LTS', 'track record', 'reputation', 'test coverage', 'code quality', 'open source', 'documentation', 'SLA', 'incident', 'bug fix'],
    ARRAY['F01', 'F25', 'F50', 'F75', 'F100', 'F125', 'F150']
),

-- ============================================================
-- E - EFFICIENCY & USABILITY
-- ============================================================
(
    'E',
    'EFFICIENCY - Performance and Usability',
    'Measures technical performance, user experience, feature completeness, interoperability, and overall value proposition. This pillar evaluates how well the product performs its intended functions and how easy it is for users to accomplish their goals.',
    ARRAY[
        'Transaction speed and confirmation times',
        'Throughput capacity (TPS)',
        'Network latency and response times',
        'Gas/fee optimization',
        'User interface design and intuitiveness',
        'Onboarding experience (setup time, complexity)',
        'Accessibility features (screen readers, high contrast)',
        'Multi-language support',
        'Mobile app availability and quality',
        'Desktop app availability and quality',
        'Browser extension availability',
        'Multi-blockchain support',
        'Token and NFT support breadth',
        'DeFi integration (swaps, staking, lending)',
        'WalletConnect and dApp browser support',
        'Hardware wallet integration',
        'Price competitiveness',
        'Fee transparency',
        'Customer support quality and availability'
    ],
    ARRAY[
        'Cryptographic security (belongs to S - Security)',
        'Smart contract vulnerabilities (belongs to S - Security)',
        'Coercion protection (belongs to A - Adversity)',
        'Backup and recovery (belongs to A - Adversity)',
        'Build quality and durability (belongs to F - Fidelity)',
        'Uptime and reliability (belongs to F - Fidelity)',
        'Company track record (belongs to F - Fidelity)'
    ],
    ARRAY['E01-E50 (blockchain compatibility)', 'E51-E100 (features)', 'E101-E150 (performance)', 'E151-E200 (usability)'],
    ARRAY[
        'Number of blockchains supported',
        'Number of tokens/assets supported',
        'Transaction confirmation time',
        'Average gas/fee costs vs competitors',
        'Setup time for new users (<10 minutes ideal)',
        'App store rating (4.5+ stars)',
        'User satisfaction score (NPS)',
        'WalletConnect v2 support',
        'dApp browser functionality',
        'Staking support (number of chains)',
        'Swap integration (DEX aggregation)',
        'NFT display and management',
        'Price vs comparable products',
        'Support response time',
        'Multi-language coverage'
    ],
    '{
        "connectivity": {
            "usb": {
                "excellent": "USB-C with high-speed data",
                "good": "USB-C",
                "acceptable": "Micro-USB",
                "poor": "Proprietary connector"
            },
            "wireless": {
                "excellent": "Bluetooth 5.0+ and NFC",
                "good": "Bluetooth 5.0+",
                "acceptable": "Bluetooth 4.0",
                "poor": "No wireless"
            }
        },
        "display": {
            "excellent": "Color touchscreen, large",
            "good": "Color screen, good size",
            "acceptable": "Monochrome screen",
            "poor": "No screen or tiny display"
        },
        "battery": {
            "excellent": "Wireless charging, fast charge, 1 week+ use",
            "good": "USB-C charging, days of use",
            "acceptable": "Daily charging needed",
            "poor": "Frequent charging, no battery indicator"
        },
        "form_factor": {
            "excellent": "Compact, premium feel, pocket-friendly",
            "good": "Reasonable size, good build",
            "acceptable": "Functional but bulky",
            "poor": "Awkward size or cheap feel"
        },
        "setup_time": {
            "excellent": "<5 minutes",
            "good": "5-10 minutes",
            "acceptable": "10-20 minutes",
            "poor": ">20 minutes"
        }
    }',
    '{
        "performance": {
            "response_time": {
                "excellent": "<100ms UI response",
                "good": "<300ms UI response",
                "acceptable": "<1s UI response",
                "poor": ">1s or laggy"
            },
            "api_latency": {
                "excellent": "<50ms p99",
                "good": "<200ms p99",
                "acceptable": "<500ms p99",
                "poor": ">500ms or unreliable"
            }
        },
        "blockchain_support": {
            "excellent": "50+ chains including all major L1/L2",
            "good": "20-50 chains",
            "acceptable": "10-20 chains",
            "poor": "<10 chains"
        },
        "token_support": {
            "excellent": "Unlimited custom tokens + NFTs",
            "good": "10,000+ tokens + NFTs",
            "acceptable": "1,000+ tokens",
            "poor": "Limited token list"
        },
        "defi_features": {
            "excellent": "Native swaps, staking, lending, bridging",
            "good": "Native swaps and staking",
            "acceptable": "Swaps via external dApps",
            "poor": "No DeFi integration"
        },
        "ux_quality": {
            "onboarding": {
                "excellent": "Guided setup, <5 min, beginner-friendly",
                "good": "Clear setup, <10 min",
                "acceptable": "Functional setup, <20 min",
                "poor": "Confusing or lengthy setup"
            },
            "daily_use": {
                "excellent": "Intuitive, fast, delightful",
                "good": "Easy to use, efficient",
                "acceptable": "Functional, some learning curve",
                "poor": "Confusing or frustrating"
            }
        },
        "price_value": {
            "excellent": "Best-in-class features at competitive price",
            "good": "Good feature/price ratio",
            "acceptable": "Fair pricing",
            "poor": "Overpriced for features"
        },
        "support": {
            "channels": {
                "excellent": "24/7 live chat, email, phone, Discord",
                "good": "Email + live chat during business hours",
                "acceptable": "Email support only",
                "poor": "No dedicated support"
            },
            "languages": {
                "excellent": "10+ languages",
                "good": "5-10 languages",
                "acceptable": "2-5 languages",
                "poor": "English only"
            }
        }
    }',
    ARRAY['performance', 'speed', 'fast', 'slow', 'latency', 'TPS', 'throughput', 'efficiency', 'usability', 'UX', 'UI', 'user experience', 'interface', 'easy', 'simple', 'intuitive', 'beginner', 'setup', 'onboarding', 'compatibility', 'blockchain', 'chain', 'token', 'NFT', 'DeFi', 'swap', 'staking', 'lending', 'bridge', 'WalletConnect', 'dApp', 'mobile', 'desktop', 'browser', 'extension', 'price', 'cost', 'fee', 'value', 'cheap', 'expensive', 'support', 'help', 'language'],
    ARRAY['E01', 'E25', 'E50', 'E75', 'E100', 'E125', 'E150', 'E175']
)

ON CONFLICT (pillar_code) DO UPDATE SET
    pillar_name = EXCLUDED.pillar_name,
    definition = EXCLUDED.definition,
    includes = EXCLUDED.includes,
    excludes = EXCLUDED.excludes,
    typical_norm_ranges = EXCLUDED.typical_norm_ranges,
    metrics = EXCLUDED.metrics,
    hardware_criteria = EXCLUDED.hardware_criteria,
    software_criteria = EXCLUDED.software_criteria,
    keywords = EXCLUDED.keywords,
    example_norms = EXCLUDED.example_norms,
    version = '2.0',
    updated_at = NOW();

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_spd_pillar_code ON safe_pillar_definitions(pillar_code);
CREATE INDEX IF NOT EXISTS idx_spd_active ON safe_pillar_definitions(is_active);

-- ============================================================
-- 4. VIEW: AI Pillar Classification Context
-- ============================================================

CREATE OR REPLACE VIEW v_ai_pillar_context AS
SELECT
    pillar_code,
    pillar_name,
    definition,
    includes,
    excludes,
    keywords,
    metrics,
    hardware_criteria,
    software_criteria
FROM safe_pillar_definitions
WHERE is_active = TRUE
ORDER BY pillar_code;

-- ============================================================
-- 5. FUNCTION: Get Pillar Definition
-- ============================================================

-- Drop existing function first (in case return type changed)
DROP FUNCTION IF EXISTS get_pillar_definition(character);
DROP FUNCTION IF EXISTS get_pillar_definition(char);

CREATE OR REPLACE FUNCTION get_pillar_definition(p_pillar_code CHAR(1))
RETURNS TABLE (
    pillar_name VARCHAR(100),
    definition TEXT,
    includes TEXT[],
    excludes TEXT[],
    metrics TEXT[],
    keywords TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        spd.pillar_name,
        spd.definition,
        spd.includes,
        spd.excludes,
        spd.metrics,
        spd.keywords
    FROM safe_pillar_definitions spd
    WHERE spd.pillar_code = p_pillar_code
    AND spd.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. FUNCTION: Suggest Pillar for Norm
-- ============================================================
-- AI helper to suggest which pillar a norm belongs to
-- Drop existing function first (in case return type changed)
DROP FUNCTION IF EXISTS suggest_pillar_for_norm(text, text);

CREATE OR REPLACE FUNCTION suggest_pillar_for_norm(
    p_norm_title TEXT,
    p_norm_description TEXT
)
RETURNS TABLE (
    suggested_pillar CHAR(1),
    pillar_name VARCHAR(100),
    confidence_reason TEXT
) AS $$
DECLARE
    v_text TEXT;
    v_pillar RECORD;
    v_match_count INTEGER;
    v_best_pillar CHAR(1) := 'S';
    v_best_count INTEGER := 0;
    v_best_name VARCHAR(100);
BEGIN
    v_text := LOWER(p_norm_title || ' ' || COALESCE(p_norm_description, ''));

    FOR v_pillar IN
        SELECT pillar_code, spd.pillar_name, keywords
        FROM safe_pillar_definitions spd
        WHERE is_active = TRUE
    LOOP
        v_match_count := 0;
        FOR i IN 1..array_length(v_pillar.keywords, 1) LOOP
            IF v_text LIKE '%' || LOWER(v_pillar.keywords[i]) || '%' THEN
                v_match_count := v_match_count + 1;
            END IF;
        END LOOP;

        IF v_match_count > v_best_count THEN
            v_best_count := v_match_count;
            v_best_pillar := v_pillar.pillar_code;
            v_best_name := v_pillar.pillar_name;
        END IF;
    END LOOP;

    RETURN QUERY SELECT
        v_best_pillar,
        v_best_name,
        'Matched ' || v_best_count || ' keywords from pillar definition';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. COMMENTS
-- ============================================================

COMMENT ON TABLE safe_pillar_definitions IS 'Detailed definitions for each SAFE pillar (S, A, F, E) - Version 2.0 with excludes and improved criteria';
COMMENT ON COLUMN safe_pillar_definitions.pillar_code IS 'Single letter code: S, A, F, or E';
COMMENT ON COLUMN safe_pillar_definitions.definition IS 'Clear definition of what this pillar evaluates';
COMMENT ON COLUMN safe_pillar_definitions.includes IS 'Comprehensive list of aspects covered by this pillar';
COMMENT ON COLUMN safe_pillar_definitions.excludes IS 'What does NOT belong in this pillar (to avoid confusion)';
COMMENT ON COLUMN safe_pillar_definitions.metrics IS 'Measurable criteria for compliance';
COMMENT ON COLUMN safe_pillar_definitions.hardware_criteria IS 'Detailed criteria for hardware products (JSONB with thresholds)';
COMMENT ON COLUMN safe_pillar_definitions.software_criteria IS 'Detailed criteria for software products (JSONB with thresholds)';
COMMENT ON COLUMN safe_pillar_definitions.keywords IS 'Keywords for AI-assisted classification';

-- ============================================================
-- 8. VERIFICATION
-- ============================================================

SELECT
    pillar_code,
    pillar_name,
    array_length(includes, 1) as includes_count,
    array_length(excludes, 1) as excludes_count,
    array_length(metrics, 1) as metrics_count,
    array_length(keywords, 1) as keywords_count,
    version
FROM safe_pillar_definitions
ORDER BY pillar_code;

-- ============================================================
-- END OF SCRIPT
-- ============================================================

SELECT 'SAFE Pillar Definitions v2.0 created successfully!' as status;
