-- ============================================================
-- SAFESCORING - TRANSLATE ALL DATA TO ENGLISH
-- ============================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PRODUCT_TYPES - Translate names and descriptions
-- ============================================================

-- Hardware Wallet
UPDATE product_types SET
    name = 'Hardware Wallet',
    description = 'Physical device dedicated to securing private keys offline. Offers maximum protection against online attacks through air-gapped security and secure element chips.'
WHERE code IN ('HW', 'hw_wallet', 'HARDWARE_WALLET');

-- Software Wallet  
UPDATE product_types SET
    name = 'Software Wallet',
    description = 'Desktop or mobile application for managing cryptocurrencies. Easy to use but requires careful security practices as keys are stored on internet-connected devices.'
WHERE code IN ('SW', 'sw_wallet', 'SOFTWARE_WALLET');

-- Mobile Wallet
UPDATE product_types SET
    name = 'Mobile Wallet',
    description = 'Smartphone application for managing cryptocurrencies on the go. Convenient for daily transactions with biometric security options.'
WHERE code IN ('MW', 'mobile_wallet', 'MOBILE_WALLET');

-- Web Wallet
UPDATE product_types SET
    name = 'Web Wallet',
    description = 'Browser-based wallet accessible from any device. Convenient but security depends on the provider and browser environment.'
WHERE code IN ('WW', 'web_wallet', 'WEB_WALLET');

-- Centralized Exchange (CEX)
UPDATE product_types SET
    name = 'Centralized Exchange',
    description = 'Centralized trading platform where the exchange holds custody of user funds. Offers high liquidity and fiat on-ramps but introduces custodial risk.'
WHERE code IN ('CEX', 'exchange', 'EXCHANGE');

-- Decentralized Exchange (DEX)
UPDATE product_types SET
    name = 'Decentralized Exchange',
    description = 'Non-custodial trading platform using smart contracts. Users maintain full control of their funds with no KYC requirements.'
WHERE code IN ('DEX', 'defi', 'DEFI');

-- Custody Service
UPDATE product_types SET
    name = 'Custody Service',
    description = 'Professional institutional-grade service for securing large cryptocurrency holdings. Features include multi-signature, insurance, and regulatory compliance.'
WHERE code IN ('CS', 'custody', 'CUSTODY');

-- Staking Platform
UPDATE product_types SET
    name = 'Staking Platform',
    description = 'Platform for staking proof-of-stake cryptocurrencies to earn rewards while contributing to network security and consensus.'
WHERE code IN ('SP', 'staking', 'STAKING');

-- Lending Platform
UPDATE product_types SET
    name = 'Lending Platform',
    description = 'DeFi or CeFi platform for lending and borrowing cryptocurrencies. Earn interest on deposits or obtain loans using crypto as collateral.'
WHERE code IN ('LP', 'lending', 'LENDING');

-- NFT Platform
UPDATE product_types SET
    name = 'NFT Platform',
    description = 'Marketplace for creating, buying, selling, and trading non-fungible tokens. Supports digital art, collectibles, and tokenized assets.'
WHERE code IN ('NFT', 'nft', 'NFT_PLATFORM');

-- Payment Processor
UPDATE product_types SET
    name = 'Payment Processor',
    description = 'Service enabling merchants to accept cryptocurrency payments with automatic conversion to fiat currency options.'
WHERE code IN ('PP', 'payment', 'PAYMENT');

-- Bridge Protocol
UPDATE product_types SET
    name = 'Bridge Protocol',
    description = 'Cross-chain protocol enabling asset transfers between different blockchains. Facilitates interoperability across the crypto ecosystem.'
WHERE code IN ('BR', 'bridge', 'BRIDGE');

-- Browser Extension Wallet
UPDATE product_types SET
    name = 'Browser Extension Wallet',
    description = 'Cryptocurrency wallet that operates as a browser extension. Enables seamless interaction with Web3 dApps and DeFi protocols.'
WHERE code IN ('BEW', 'browser_extension', 'BROWSER_WALLET');

-- Multi-signature Wallet
UPDATE product_types SET
    name = 'Multi-signature Wallet',
    description = 'Wallet requiring multiple private key signatures to authorize transactions. Ideal for teams, DAOs, and enhanced security setups.'
WHERE code IN ('MSW', 'multisig', 'MULTISIG_WALLET');

-- Smart Contract Wallet
UPDATE product_types SET
    name = 'Smart Contract Wallet',
    description = 'Account abstraction wallet using smart contracts for advanced features like social recovery, spending limits, and gasless transactions.'
WHERE code IN ('SCW', 'smart_wallet', 'SMART_CONTRACT_WALLET');

-- ============================================================
-- 2. CONSUMER_TYPE_DEFINITIONS - Ensure English content
-- ============================================================

-- Essential type
UPDATE consumer_type_definitions SET
    definition = 'Critical and fundamental norms for basic security. These norms represent the absolute minimum that any crypto product must meet to be considered safe. Failure on these norms indicates a major risk for users.',
    target_audience = 'All users - These criteria are non-negotiable for any crypto product regardless of expertise level',
    inclusion_criteria = ARRAY[
        'User fund security (custody, private keys, seed phrase)',
        'Protection against known hacks and exploits',
        'Third-party security audit by recognized firm',
        'Transparency on major risks',
        'Recovery mechanisms in case of problems',
        'Basic regulatory compliance',
        'Protection against total loss of funds',
        'Secure authentication (2FA, biometrics)',
        'Encryption of sensitive data'
    ],
    exclusion_criteria = ARRAY[
        'Optional advanced features',
        'Performance optimizations',
        'Cosmetic or UX features',
        'Non-critical third-party integrations',
        'Developer-only metrics'
    ],
    keywords = ARRAY[
        'security', 'audit', 'custody', 'keys', 'private key', 'seed phrase',
        'hack', 'exploit', 'funds', 'critical', 'fundamental', 'mandatory',
        'major risk', 'authentication', '2FA', 'MFA', 'encryption',
        'backup', 'recovery', 'vulnerability', 'breach', 'protection'
    ]
WHERE type_code = 'essential';

-- Consumer type
UPDATE consumer_type_definitions SET
    definition = 'Important norms for general public users. These norms cover aspects that any non-technical user should verify before using a product. They include ease of use, fee transparency, and consumer protection.',
    target_audience = 'General public users - People without deep technical expertise who use crypto products for everyday needs',
    inclusion_criteria = ARRAY[
        'Ease of use and clear UX',
        'Fee and cost transparency',
        'Accessible customer support',
        'Documentation understandable for non-experts',
        'Personal data protection',
        'Clear complaint process',
        'Risk information in simple language',
        'Project history and reputation',
        'Mobile-friendly interface',
        'Clear notifications and alerts'
    ],
    exclusion_criteria = ARRAY[
        'Advanced technical details (source code, architecture)',
        'Developer metrics',
        'Complex configurations',
        'Professional trader optimizations',
        'Technical APIs and integrations'
    ],
    keywords = ARRAY[
        'user', 'consumer', 'fees', 'costs', 'support', 'documentation',
        'simple', 'accessible', 'transparent', 'UX', 'interface', 'mobile',
        'app', 'notification', 'alert', 'easy', 'beginner', 'guide',
        'tutorial', 'help', 'customer', 'service'
    ]
WHERE type_code = 'consumer';

-- Full type
UPDATE consumer_type_definitions SET
    definition = 'All norms in the SAFE framework. This level includes advanced technical criteria, optimizations, and complete best practices. Intended for expert users, analysts, and in-depth audits.',
    target_audience = 'Experts, analysts, developers, and advanced users - Complete and detailed evaluation for exhaustive analysis',
    inclusion_criteria = ARRAY[
        'All norms are included by default',
        'Advanced technical criteria',
        'Performance optimizations',
        'Industry best practices',
        'Detailed metrics',
        'Code and architecture analysis',
        'Governance and tokenomics',
        'Interoperability and standards'
    ],
    exclusion_criteria = NULL,
    keywords = ARRAY[
        'complete', 'technical', 'advanced', 'expert', 'detailed',
        'architecture', 'code', 'performance', 'optimization',
        'governance', 'tokenomics', 'comprehensive', 'full'
    ]
WHERE type_code = 'full';

-- ============================================================
-- 3. BRANDS - Ensure descriptions are in English
-- ============================================================

UPDATE brands SET 
    description = 'Leading hardware wallet manufacturer from France. Known for Ledger Nano series with secure element technology.'
WHERE name = 'Ledger' AND (description IS NULL OR description LIKE '%français%' OR description LIKE '%France%fabricant%');

UPDATE brands SET 
    description = 'Czech hardware wallet company pioneer. Open-source approach with Trezor Model T and Trezor One devices.'
WHERE name = 'Trezor' AND (description IS NULL OR description LIKE '%tchèque%');

UPDATE brands SET 
    description = 'Most popular browser extension wallet for Ethereum and EVM chains. Gateway to Web3 and DeFi applications.'
WHERE name = 'MetaMask' AND (description IS NULL OR description LIKE '%populaire%');

UPDATE brands SET 
    description = 'Largest cryptocurrency exchange by trading volume. Offers spot, futures, staking, and various crypto services.'
WHERE name = 'Binance' AND (description IS NULL OR description LIKE '%plus grand%');

UPDATE brands SET 
    description = 'US-based publicly traded cryptocurrency exchange. Known for regulatory compliance and user-friendly interface.'
WHERE name = 'Coinbase' AND (description IS NULL OR description LIKE '%américain%');

-- ============================================================
-- 4. SAFE_METHODOLOGY - Ensure English content
-- ============================================================

UPDATE safe_methodology SET
    description = 'SAFE SCORING™ is a comprehensive methodology for evaluating the security and reliability of cryptocurrency products. It assesses products across four pillars: Security, Adversity, Fidelity, and Efficiency.',
    pillars = '{
        "S": {
            "name": "Security",
            "weight": 0.25,
            "description": "Cryptographic protection, encryption, Secure Element, multisig, key management",
            "keywords": ["encryption", "secure element", "multisig", "private key", "seed phrase", "cryptography"]
        },
        "A": {
            "name": "Adversity",
            "weight": 0.25,
            "description": "Attack resistance, PIN duress, auto wipe, hidden wallets, phishing protection",
            "keywords": ["attack", "resistance", "duress", "wipe", "hidden", "phishing", "protection"]
        },
        "F": {
            "name": "Fidelity",
            "weight": 0.25,
            "description": "Durability, physical resistance, software quality, audits, track record",
            "keywords": ["durability", "quality", "audit", "track record", "reliability", "uptime"]
        },
        "E": {
            "name": "Efficiency",
            "weight": 0.25,
            "description": "Usability, multi-chain support, interface quality, accessibility, performance",
            "keywords": ["usability", "UX", "interface", "multi-chain", "performance", "accessibility"]
        }
    }'::jsonb,
    score_categories = '{
        "essential": {
            "name": "Essential",
            "target_percentage": 17,
            "description": "Critical security norms - minimum requirements"
        },
        "consumer": {
            "name": "Consumer", 
            "target_percentage": 38,
            "description": "Norms relevant for general public users"
        },
        "full": {
            "name": "Full",
            "target_percentage": 100,
            "description": "Complete evaluation with all norms"
        }
    }'::jsonb
WHERE id = 1 OR name = 'SAFE SCORING™';

-- ============================================================
-- 5. SUBSCRIPTION_PLANS - Translate plan descriptions
-- ============================================================

UPDATE subscription_plans SET
    name = 'Free',
    features = '["10 products", "1 setup", "Monthly updates", "Community support"]'::jsonb
WHERE code = 'free';

UPDATE subscription_plans SET
    name = 'Basic',
    features = '["50 products", "5 setups", "Weekly updates", "Email support", "Export reports"]'::jsonb
WHERE code = 'basic';

UPDATE subscription_plans SET
    name = 'Professional',
    features = '["200 products", "20 setups", "Daily updates", "Priority support", "API access", "Custom alerts"]'::jsonb
WHERE code = 'pro';

-- ============================================================
-- 6. Verify translations
-- ============================================================

COMMIT;

-- Show results
SELECT 'Product Types:' as table_name, count(*) as count FROM product_types
UNION ALL
SELECT 'Consumer Type Definitions:', count(*) FROM consumer_type_definitions
UNION ALL
SELECT 'Brands:', count(*) FROM brands
UNION ALL
SELECT 'Subscription Plans:', count(*) FROM subscription_plans;

SELECT '✅ All Supabase data has been translated to English!' as status;
