-- ============================================================
-- PRODUCT-COUNTRY COMPLIANCE DATABASE
-- ============================================================
-- Maps product availability and restrictions by country
-- Sources: Company websites, regulatory announcements, ToS
-- ============================================================

-- ============================================================
-- PART 1: MAJOR EXCHANGE RESTRICTIONS
-- ============================================================

-- Binance Global (banned in many countries)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required, legislation_ids)
SELECT p.id, 'US', 'banned', 'critical',
    'Binance.com not available to US users. Must use Binance.US instead. SEC enforcement action ongoing.',
    true, ARRAY['US-2023-SEC-EXCHANGE-ENFORCEMENT']
FROM products p WHERE p.slug = 'binance' OR p.slug = 'binance-global'
ON CONFLICT (product_id, country_code) DO UPDATE SET
    status = EXCLUDED.status,
    regulatory_risk = EXCLUDED.regulatory_risk,
    compliance_notes = EXCLUDED.compliance_notes;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'CN', 'banned', 'critical',
    'All crypto exchanges banned in China since September 2021. Criminal penalties apply.'
FROM products p WHERE p.slug LIKE '%binance%' OR p.slug LIKE '%coinbase%' OR p.slug LIKE '%kraken%'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required)
SELECT p.id, 'GB', 'restricted', 'high',
    'Binance banned from FCA-regulated activities. No derivatives for UK users. Deposit restrictions.',
    true
FROM products p WHERE p.slug = 'binance'
ON CONFLICT (product_id, country_code) DO UPDATE SET
    status = EXCLUDED.status,
    compliance_notes = EXCLUDED.compliance_notes;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'CA', 'restricted', 'high',
    'Binance ceased Ontario operations in 2023. Limited services in other provinces.',
    true
FROM products p WHERE p.slug = 'binance'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'SG', 'restricted', 'medium',
    'MAS restricted Binance services. Must comply with PS Act. Limited derivatives.',
    true
FROM products p WHERE p.slug = 'binance'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- Coinbase (selective availability)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required, kyc_threshold_usd)
SELECT p.id, 'US', 'available', 'medium',
    'Fully regulated US exchange. State-by-state licensing. SEC scrutiny ongoing.',
    true, 0
FROM products p WHERE p.slug = 'coinbase' OR p.slug = 'coinbase-exchange'
ON CONFLICT (product_id, country_code) DO UPDATE SET
    compliance_notes = EXCLUDED.compliance_notes;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'CN', 'banned', 'critical',
    'Not available in China due to crypto ban.'
FROM products p WHERE p.slug LIKE 'coinbase%'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required)
SELECT p.id, 'DE', 'available', 'low',
    'Licensed BaFin crypto custody provider. MiCA compliant.',
    true
FROM products p WHERE p.slug = 'coinbase'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- Kraken (global with restrictions)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required)
SELECT p.id, 'US', 'available', 'medium',
    'Licensed MTL in most states. Not available in NY, WA (requires separate BitLicense).',
    true
FROM products p WHERE p.slug = 'kraken'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required)
SELECT p.id, 'JP', 'available', 'low',
    'Licensed by FSA. Full compliance with Japanese PSA.',
    true
FROM products p WHERE p.slug = 'kraken'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- OKX (formerly OKEx)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'US', 'banned', 'critical',
    'Not available to US users due to regulatory restrictions.'
FROM products p WHERE p.slug = 'okx' OR p.slug = 'okex'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'CN', 'banned', 'critical',
    'Chinese exchange that exited mainland China market in 2021.'
FROM products p WHERE p.slug LIKE 'okx%' OR p.slug LIKE 'okex%'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- ============================================================
-- PART 2: HARDWARE WALLET COMPLIANCE
-- ============================================================

-- Ledger (generally unrestricted but with shipping limits)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'CN', 'available_restricted', 'low',
    'Hardware wallet legal to own. Shipping may be restricted. Cannot use with Chinese exchanges.',
    false
FROM products p WHERE p.slug LIKE 'ledger%'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'US', 'available', 'very_low',
    'No restrictions. Hardware wallets not considered money transmission.',
    false
FROM products p WHERE p.slug LIKE 'ledger%' OR p.slug LIKE 'trezor%' OR p.slug LIKE 'coldcard%'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- Trezor
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, country_code, 'available', 'very_low',
    'Hardware wallet available globally. No regulatory restrictions in most countries.',
    false
FROM products p, (VALUES ('US'), ('DE'), ('FR'), ('GB'), ('CA'), ('AU'), ('JP'), ('SG'), ('CH')) AS countries(country_code)
WHERE p.slug LIKE 'trezor%'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- ============================================================
-- PART 3: DEFI PROTOCOL RESTRICTIONS
-- ============================================================

-- Uniswap (geoblocking)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, features_disabled)
SELECT p.id, 'US', 'available_restricted', 'medium',
    'Frontend geoblocks certain tokens for US users. Protocol itself permissionless. SEC scrutiny.',
    ARRAY['certain-tokens']
FROM products p WHERE p.slug = 'uniswap' OR p.slug = 'uniswap-v3'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'CN', 'available_restricted', 'high',
    'Officially banned but protocol is permissionless. Frontend blocked. Users can access via VPN.',
    false
FROM products p WHERE p.slug IN ('uniswap', 'aave', 'curve', 'compound')
ON CONFLICT (product_id, country_code) DO NOTHING;

-- dYdX (regulatory challenges)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'US', 'restricted', 'high',
    'Geoblocks US users due to CFTC regulations. v4 fully decentralized.',
    false
FROM products p WHERE p.slug LIKE 'dydx%'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- ============================================================
-- PART 4: STABLECOIN RESTRICTIONS
-- ============================================================

-- USDT (Tether) - widely restricted
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'US', 'restricted', 'high',
    'USDT not available to US persons per Tether ToS. CFTC/NYAG enforcement history.',
    false
FROM products p WHERE p.slug = 'tether' OR p.slug = 'usdt'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'GB', 'restricted', 'medium',
    'Major exchanges delisted USDT for UK users due to FCA concerns.',
    false
FROM products p WHERE p.slug = 'tether' OR p.slug = 'usdt'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- USDC (Circle) - regulated stablecoin
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required)
SELECT p.id, 'US', 'available', 'low',
    'Fully regulated by NYDFS. Reserves audited monthly. SEC-compliant.',
    true
FROM products p WHERE p.slug = 'usdc' OR p.slug = 'circle-usdc'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, country_code, 'available', 'low',
    'Available in most jurisdictions. MiCA compliant in EU.',
    false
FROM products p, (VALUES ('DE'), ('FR'), ('GB'), ('SG'), ('CH'), ('CA'), ('AU')) AS countries(country_code)
WHERE p.slug = 'usdc'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- ============================================================
-- PART 5: VPN/PRIVACY RESTRICTIONS
-- ============================================================

-- Tornado Cash (sanctioned)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'US', 'banned', 'critical',
    'OFAC sanctioned August 2022. Using Tornado Cash is illegal for US persons. Criminal penalties.',
    false
FROM products p WHERE p.slug LIKE '%tornado%cash%'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, country_code, 'restricted', 'high',
    'OFAC sanctions apply globally. EU also considering sanctions.',
    false
FROM products p, (VALUES ('GB'), ('DE'), ('FR'), ('CA'), ('AU'), ('NL')) AS countries(country_code)
WHERE p.slug LIKE '%tornado%cash%'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- Monero (privacy coin bans)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, country_code, 'banned', 'high',
    'Privacy coins delisted from major exchanges. Not explicitly illegal to own but very restricted.',
    false
FROM products p, (VALUES ('AU'), ('KR'), ('JP')) AS countries(country_code)
WHERE p.slug = 'monero' OR p.slug = 'xmr'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- ============================================================
-- PART 6: REGIONAL EXCHANGES
-- ============================================================

-- Crypto.com
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required)
SELECT p.id, 'SG', 'available', 'low',
    'Licensed by MAS. Full PS Act compliance. Singapore headquarters.',
    true
FROM products p WHERE p.slug LIKE 'crypto-com%'
ON CONFLICT (product_id, country_code) DO NOTHING;

INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes)
SELECT p.id, 'CN', 'banned', 'critical',
    'Not available in mainland China.'
FROM products p WHERE p.slug LIKE 'crypto-com%'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- Gemini
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required)
SELECT p.id, 'US', 'available', 'very_low',
    'NYDFS licensed. One of most regulated US exchanges. Trust company.',
    true
FROM products p WHERE p.slug = 'gemini'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- Bitstamp (EU focus)
INSERT INTO product_country_compliance (product_id, country_code, status, regulatory_risk, compliance_notes, kyc_required)
SELECT p.id, country_code, 'available', 'low',
    'Fully MiCA compliant. Licensed in Luxembourg. Available across EU.',
    true
FROM products p, (VALUES ('DE'), ('FR'), ('IT'), ('ES'), ('NL'), ('BE'), ('AT'), ('LU')) AS countries(country_code)
WHERE p.slug = 'bitstamp'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- ============================================================
-- STATISTICS & VERIFICATION
-- ============================================================

-- Update compliance counts
UPDATE country_crypto_profiles ccp
SET
    restricted_products_count = (
        SELECT COUNT(DISTINCT product_id)
        FROM product_country_compliance pcc
        WHERE pcc.country_code = ccp.country_code
          AND pcc.status IN ('banned', 'restricted')
    ),
    available_products_count = (
        SELECT COUNT(DISTINCT product_id)
        FROM product_country_compliance pcc
        WHERE pcc.country_code = ccp.country_code
          AND pcc.status IN ('available', 'available_restricted')
    );

-- Verification
SELECT
    'Product Compliance Data Loaded!' as status,
    COUNT(*) as total_compliance_entries,
    COUNT(DISTINCT product_id) as products_with_compliance,
    COUNT(DISTINCT country_code) as countries_with_data,
    COUNT(*) FILTER (WHERE status = 'banned') as total_bans,
    COUNT(*) FILTER (WHERE status = 'restricted') as total_restrictions
FROM product_country_compliance;

-- Most restricted countries
SELECT
    ccp.country_name,
    COUNT(*) FILTER (WHERE pcc.status = 'banned') as banned_products,
    COUNT(*) FILTER (WHERE pcc.status = 'restricted') as restricted_products,
    COUNT(*) FILTER (WHERE pcc.status LIKE 'available%') as available_products
FROM country_crypto_profiles ccp
LEFT JOIN product_country_compliance pcc ON pcc.country_code = ccp.country_code
GROUP BY ccp.country_name, ccp.country_code
ORDER BY banned_products DESC, restricted_products DESC
LIMIT 20;

-- Most restricted products
SELECT
    p.name,
    p.slug,
    COUNT(*) FILTER (WHERE pcc.status = 'banned') as banned_in_countries,
    COUNT(*) FILTER (WHERE pcc.status = 'restricted') as restricted_in_countries
FROM products p
LEFT JOIN product_country_compliance pcc ON pcc.product_id = p.id
GROUP BY p.id, p.name, p.slug
HAVING COUNT(*) FILTER (WHERE pcc.status = 'banned') > 0
ORDER BY banned_in_countries DESC, restricted_in_countries DESC
LIMIT 20;

-- ============================================================
-- END OF PRODUCT COMPLIANCE SEED
-- ============================================================
