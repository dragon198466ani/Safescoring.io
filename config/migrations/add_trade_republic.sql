-- ============================================================
-- Migration: Add Trade Republic + Broker Type
-- ============================================================
-- Trade Republic is a German broker offering stocks, ETFs, crypto
-- Creates a new "Broker" type - universally understood worldwide
-- Date: 2026-01-13
-- ============================================================

-- Step 1: Create "Broker" product type (universally understood)
INSERT INTO product_types (
    code,
    name,
    name_fr,
    category,
    definition,
    includes,
    excludes,
    risk_factors,
    examples,
    keywords,
    is_hardware,
    is_custodial,
    is_safe_applicable
)
VALUES (
    'Broker',
    'Broker / Trading App',
    'Courtier / App de Trading',
    'Financial',
    'Licensed broker or trading platform that offers cryptocurrency trading alongside traditional assets (stocks, ETFs, bonds). Crypto is held in custody - users cannot withdraw to external wallets. Regulated as securities broker or investment firm, not as crypto exchange.',
    ARRAY[
        'Stock and ETF trading',
        'Cryptocurrency buy/sell (custody only)',
        'Bonds and derivatives',
        'Savings and interest products',
        'Regulated broker license',
        'Commission-free or low-fee trading',
        'Mobile and web platform'
    ],
    ARRAY[
        'Crypto withdrawal to external wallet',
        'Self-custody of crypto assets',
        'Crypto-to-crypto trading',
        'DeFi integration',
        'Staking rewards'
    ],
    ARRAY[
        'No crypto self-custody (not your keys)',
        'Cannot withdraw crypto externally',
        'Counterparty risk',
        'Regulatory restrictions',
        'Limited crypto selection',
        'Platform insolvency risk'
    ],
    ARRAY['Trade Republic', 'Robinhood', 'eToro', 'Scalable Capital', 'DEGIRO', 'Interactive Brokers'],
    ARRAY['broker', 'trading app', 'stocks', 'ETF', 'investment', 'courtier', 'custody crypto'],
    FALSE,
    TRUE,
    TRUE
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_fr = EXCLUDED.name_fr,
    definition = EXCLUDED.definition,
    includes = EXCLUDED.includes,
    excludes = EXCLUDED.excludes,
    risk_factors = EXCLUDED.risk_factors,
    examples = EXCLUDED.examples,
    keywords = EXCLUDED.keywords;

-- Step 2: Add brand
INSERT INTO brands (name, website, logo_url)
VALUES (
    'Trade Republic',
    'https://traderepublic.com',
    'https://traderepublic.com/favicon.ico'
)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Insert Trade Republic product
INSERT INTO products (
    slug,
    name,
    description,
    short_description,
    url,
    type_id,
    brand_id,
    headquarters,
    country_origin,
    security_status
)
VALUES (
    'trade-republic',
    'Trade Republic',
    'Trade Republic is Europe''s largest savings platform with over 4 million customers. Founded in 2015 in Berlin and regulated by BaFin (German Federal Financial Supervisory Authority), it offers commission-free trading of 10,000+ stocks, 2,000+ ETFs, and 50+ cryptocurrencies. Crypto assets are held in custody by BitGo - no withdrawal to external wallets. 1€ flat fee per trade. Available in Germany, Austria, France, Spain, Italy, Netherlands, and more EU countries.',
    'Europe''s largest broker with crypto trading - BaFin regulated',
    'https://traderepublic.com',
    (SELECT id FROM product_types WHERE code = 'Broker'),
    (SELECT id FROM brands WHERE name = 'Trade Republic'),
    'Berlin, Germany',
    'DE',
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    brand_id = EXCLUDED.brand_id,
    headquarters = EXCLUDED.headquarters,
    country_origin = EXCLUDED.country_origin,
    updated_at = NOW();

-- Step 4: Verify
SELECT
    p.id,
    p.slug,
    p.name,
    pt.code AS type_code,
    pt.name AS type_name,
    b.name AS brand,
    p.headquarters,
    p.country_origin,
    p.security_status
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.slug = 'trade-republic';

-- Show new type
SELECT code, name, name_fr, is_custodial FROM product_types WHERE code = 'Broker';
