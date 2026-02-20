-- ============================================================
-- SEED: CRYPTO LEGISLATION WORLDWIDE
-- ============================================================
-- Purpose: Populate crypto_legislation and country_crypto_profiles
-- Date: 2025-01-03
-- ============================================================

-- ============================================================
-- 1. COUNTRY CRYPTO PROFILES
-- ============================================================

-- VERY FRIENDLY COUNTRIES
INSERT INTO country_crypto_profiles (
    country_code, country_name, crypto_stance,
    regulatory_clarity_score, compliance_difficulty_score, innovation_score, overall_score,
    crypto_legal, crypto_as_property, crypto_as_currency,
    trading_allowed, mining_allowed, ico_allowed, defi_allowed,
    crypto_taxed, capital_gains_tax_rate,
    regulatory_body, cbdc_status
) VALUES
-- El Salvador
('SV', 'El Salvador', 'very_friendly', 85, 25, 95, 92, true, true, true, true, true, true, true, false, 0.0, 'Central Reserve Bank', 'launched'),
-- Singapore
('SG', 'Singapore', 'very_friendly', 90, 40, 90, 88, true, true, false, true, true, true, true, true, 0.0, 'MAS', 'research'),
-- Switzerland
('CH', 'Switzerland', 'very_friendly', 95, 35, 92, 90, true, true, false, true, true, true, true, true, 0.0, 'FINMA', 'research'),
-- UAE (Dubai)
('AE', 'United Arab Emirates', 'very_friendly', 80, 30, 88, 85, true, true, false, true, true, true, true, false, 0.0, 'SCA, VARA', 'research'),
-- Portugal
('PT', 'Portugal', 'very_friendly', 75, 25, 85, 83, true, true, false, true, true, true, true, false, 0.0, 'CMVM', 'research')

ON CONFLICT (country_code) DO UPDATE SET
    crypto_stance = EXCLUDED.crypto_stance,
    regulatory_clarity_score = EXCLUDED.regulatory_clarity_score,
    overall_score = EXCLUDED.overall_score,
    last_updated = NOW();

-- FRIENDLY COUNTRIES
INSERT INTO country_crypto_profiles (
    country_code, country_name, crypto_stance,
    regulatory_clarity_score, compliance_difficulty_score, innovation_score, overall_score,
    crypto_legal, crypto_as_property,
    trading_allowed, mining_allowed, defi_allowed,
    crypto_taxed, capital_gains_tax_rate,
    regulatory_body
) VALUES
-- Germany
('DE', 'Germany', 'friendly', 85, 45, 80, 78, true, true, true, true, true, true, 0.0, 'BaFin'),
-- France
('FR', 'France', 'friendly', 80, 50, 75, 72, true, true, true, true, true, true, 30.0, 'AMF'),
-- UK
('GB', 'United Kingdom', 'friendly', 78, 55, 72, 70, true, true, true, true, true, true, 20.0, 'FCA'),
-- Japan
('JP', 'Japan', 'friendly', 88, 60, 75, 75, true, true, true, false, true, true, 20.0, 'FSA'),
-- Canada
('CA', 'Canada', 'friendly', 75, 50, 78, 73, true, true, true, true, true, true, 50.0, 'CSA, FINTRAC'),
-- Australia
('AU', 'Australia', 'friendly', 80, 48, 75, 74, true, true, true, true, true, true, 50.0, 'ASIC')

ON CONFLICT (country_code) DO UPDATE SET
    crypto_stance = EXCLUDED.crypto_stance,
    overall_score = EXCLUDED.overall_score,
    last_updated = NOW();

-- NEUTRAL / RESTRICTIVE COUNTRIES
INSERT INTO country_crypto_profiles (
    country_code, country_name, crypto_stance,
    regulatory_clarity_score, compliance_difficulty_score, innovation_score, overall_score,
    crypto_legal, crypto_as_property,
    trading_allowed, mining_allowed,
    crypto_taxed, capital_gains_tax_rate,
    regulatory_body
) VALUES
-- USA
('US', 'United States', 'restrictive', 60, 75, 80, 65, true, true, true, true, true, 37.0, 'SEC, CFTC, FinCEN, OCC'),
-- India
('IN', 'India', 'restrictive', 50, 70, 60, 55, true, false, true, true, true, 30.0, 'RBI, SEBI'),
-- South Korea
('KR', 'South Korea', 'neutral', 70, 60, 70, 68, true, true, true, true, true, 22.0, 'FSC'),
-- Brazil
('BR', 'Brazil', 'neutral', 65, 55, 65, 65, true, true, true, true, true, 15.0, 'BCB, CVM'),
-- Russia
('RU', 'Russia', 'restrictive', 55, 70, 40, 48, true, true, true, false, false, 0.0, 'Bank of Russia')

ON CONFLICT (country_code) DO UPDATE SET
    crypto_stance = EXCLUDED.crypto_stance,
    overall_score = EXCLUDED.overall_score,
    last_updated = NOW();

-- HOSTILE COUNTRIES
INSERT INTO country_crypto_profiles (
    country_code, country_name, crypto_stance,
    regulatory_clarity_score, compliance_difficulty_score, innovation_score, overall_score,
    crypto_legal, trading_allowed, mining_allowed, defi_allowed,
    cbdc_status, cbdc_name,
    regulatory_body
) VALUES
-- China
('CN', 'China', 'very_hostile', 95, 100, 5, 15, false, false, false, false, 'launched', 'Digital Yuan (e-CNY)', 'PBOC'),
-- Bangladesh
('BD', 'Bangladesh', 'very_hostile', 90, 100, 5, 10, false, false, false, false, 'no_plans', NULL, 'Bangladesh Bank'),
-- Egypt
('EG', 'Egypt', 'hostile', 70, 95, 10, 20, false, false, true, false, 'research', NULL, 'CBE'),
-- Morocco
('MA', 'Morocco', 'hostile', 75, 90, 15, 25, false, false, false, false, 'no_plans', NULL, 'Bank Al-Maghrib'),
-- Algeria
('DZ', 'Algeria', 'very_hostile', 85, 100, 5, 12, false, false, false, false, 'no_plans', NULL, 'Bank of Algeria')

ON CONFLICT (country_code) DO UPDATE SET
    crypto_stance = EXCLUDED.crypto_stance,
    overall_score = EXCLUDED.overall_score,
    last_updated = NOW();

-- ============================================================
-- 2. MAJOR CRYPTO LEGISLATION
-- ============================================================

-- USA - SAB 121 (Custody Accounting)
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    proposed_date, passed_date, effective_date,
    affects_products, affects_exchanges, affects_individuals,
    affected_product_types,
    kyc_required, aml_required, license_required,
    regulatory_body, official_url
) VALUES (
    'US', 'US-2022-SAB121', 'us-sab121-custody-accounting',
    'Staff Accounting Bulletin No. 121', 'SAB 121',
    'Requires companies holding crypto assets for customers to record those assets as liabilities on their balance sheets, making custody more expensive.',
    'custody', 'in_effect', 'high',
    '2022-03-31', '2022-03-31', '2022-03-31',
    true, true, false,
    ARRAY['EXCHANGE', 'CUSTODY'],
    false, false, false,
    'SEC', 'https://www.sec.gov/oca/staff-accounting-bulletin-121'
);

-- EU - MiCA (Markets in Crypto-Assets)
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    proposed_date, passed_date, effective_date,
    affects_products, affects_exchanges, affects_businesses,
    affected_product_types,
    kyc_required, aml_required, license_required,
    regulatory_body, official_url
) VALUES (
    'DE', 'EU-2023-MICA', 'eu-mica-regulation',
    'Markets in Crypto-Assets Regulation', 'MiCA',
    'Comprehensive EU regulatory framework for crypto assets, stablecoins, and service providers. Harmonizes rules across all EU member states.',
    'regulation', 'in_effect', 'medium',
    '2020-09-24', '2023-05-31', '2024-12-30',
    true, true, true,
    ARRAY['EXCHANGE', 'STABLECOIN', 'CUSTODY', 'WALLET'],
    true, true, true,
    'ESMA', 'https://eur-lex.europa.eu/eli/reg/2023/1114/oj'
);

-- China - Crypto Ban
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    passed_date, effective_date,
    affects_products, affects_exchanges, affects_individuals, affects_businesses, affects_mining,
    affected_product_types,
    regulatory_body
) VALUES (
    'CN', 'CN-2021-CRYPTO-BAN', 'china-crypto-ban-2021',
    'Notice on Further Preventing and Disposing of Virtual Currency Trading Hype Risks',
    'China Crypto Ban',
    'Complete ban on crypto trading, mining, and related services. All crypto transactions deemed illegal.',
    'ban', 'in_effect', 'critical',
    '2021-09-24', '2021-09-24',
    true, true, true, true, true,
    ARRAY['EXCHANGE', 'HW_WALLET', 'SW_WALLET_HOT', 'SW_WALLET_COLD', 'MINING'],
    'PBOC, NDRC'
);

-- El Salvador - Bitcoin Legal Tender
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    passed_date, effective_date,
    affects_individuals, affects_businesses,
    regulatory_body
) VALUES (
    'SV', 'SV-2021-BITCOIN-LAW', 'el-salvador-bitcoin-legal-tender',
    'Bitcoin Law', 'Ley Bitcoin',
    'Makes Bitcoin legal tender alongside the US Dollar. Businesses must accept Bitcoin unless technologically unable.',
    'supportive', 'in_effect', 'positive',
    '2021-06-09', '2021-09-07',
    true, true,
    'Central Reserve Bank of El Salvador'
);

-- Switzerland - DLT Act
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    passed_date, effective_date,
    affects_products, affects_businesses,
    affected_product_types,
    license_required,
    regulatory_body, official_url
) VALUES (
    'CH', 'CH-2021-DLT-ACT', 'switzerland-dlt-act',
    'Federal Act on the Adaptation of Federal Law to Developments in Distributed Ledger Technology',
    'DLT Act',
    'Comprehensive framework for blockchain and DLT. Creates legal certainty for crypto-based securities and tokenization.',
    'regulation', 'in_effect', 'low',
    '2020-09-25', '2021-02-01',
    true, true,
    ARRAY['EXCHANGE', 'CUSTODY', 'DEFI'],
    true,
    'FINMA', 'https://www.admin.ch/gov/en/start/documentation/media-releases.msg-id-80121.html'
);

-- Singapore - PS Act (Payment Services Act)
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    passed_date, effective_date,
    affects_products, affects_exchanges,
    affected_product_types,
    kyc_required, aml_required, license_required,
    regulatory_body
) VALUES (
    'SG', 'SG-2019-PS-ACT', 'singapore-payment-services-act',
    'Payment Services Act', 'PS Act',
    'Regulates payment service providers including crypto exchanges and wallet providers. Requires licensing and AML/CFT compliance.',
    'licensing', 'in_effect', 'medium',
    '2019-01-14', '2020-01-28',
    true, true,
    ARRAY['EXCHANGE', 'SW_WALLET_HOT', 'CUSTODY'],
    true, true, true,
    'MAS'
);

-- USA - Infrastructure Bill (Broker Reporting)
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    passed_date, effective_date,
    affects_exchanges, affects_businesses,
    kyc_required, reporting_required,
    regulatory_body
) VALUES (
    'US', 'US-2021-INFRASTRUCTURE-BILL', 'us-infrastructure-bill-broker-reporting',
    'Infrastructure Investment and Jobs Act - Broker Reporting Provision',
    'Infrastructure Bill Crypto Provision',
    'Expands definition of "broker" for tax reporting. Crypto exchanges and some DeFi protocols must report customer transactions to IRS.',
    'taxation', 'passed', 'high',
    '2021-11-15', '2024-01-01',
    true, true,
    true, true,
    'IRS'
);

-- Japan - PSA (Payment Services Act)
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    passed_date, effective_date,
    affects_exchanges,
    kyc_required, aml_required, license_required,
    regulatory_body
) VALUES (
    'JP', 'JP-2017-PSA-CRYPTO', 'japan-payment-services-act',
    'Payment Services Act (Crypto Amendment)', 'PSA Crypto',
    'Regulates crypto exchanges (VASP) with strict licensing, AML/KYC, and custody requirements.',
    'licensing', 'in_effect', 'medium',
    '2016-05-25', '2017-04-01',
    true,
    true, true, true,
    'FSA'
);

-- UK - Financial Services and Markets Act 2023
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    passed_date, effective_date,
    affects_products, affects_exchanges,
    affected_product_types,
    kyc_required, license_required,
    regulatory_body
) VALUES (
    'GB', 'GB-2023-FSMA-CRYPTO', 'uk-financial-services-markets-act-crypto',
    'Financial Services and Markets Act 2023 - Crypto Provisions', 'FSMA 2023',
    'Brings crypto assets under FCA regulation. Requires authorization for crypto activities and enforces consumer protection.',
    'regulation', 'in_effect', 'medium',
    '2023-06-29', '2024-01-08',
    true, true,
    ARRAY['EXCHANGE', 'CUSTODY', 'STABLECOIN'],
    true, true,
    'FCA'
);

-- India - 30% Crypto Tax
INSERT INTO crypto_legislation (
    country_code, legislation_id, slug, title, short_title, description,
    category, status, severity,
    passed_date, effective_date,
    affects_individuals,
    regulatory_body
) VALUES (
    'IN', 'IN-2022-CRYPTO-TAX', 'india-30-percent-crypto-tax',
    'Finance Bill 2022 - Crypto Taxation', '30% Crypto Tax',
    '30% tax on crypto gains plus 1% TDS on all crypto transactions. No deduction for losses.',
    'taxation', 'in_effect', 'high',
    '2022-02-01', '2022-04-01',
    true,
    'CBDT, Income Tax Department'
);

-- ============================================================
-- 3. PRODUCT-COUNTRY COMPLIANCE EXAMPLES
-- ============================================================

-- Example: Binance bans (for reference, you'll populate from real data)
INSERT INTO product_country_compliance (
    product_id, country_code, status, regulatory_risk,
    compliance_notes
)
SELECT
    p.id,
    'CN',
    'banned',
    'critical',
    'All crypto exchanges banned in China since 2021'
FROM products p
WHERE p.slug LIKE '%binance%'
ON CONFLICT (product_id, country_code) DO NOTHING;

-- ============================================================
-- 4. UPDATE COUNTRY TOTALS
-- ============================================================

UPDATE country_crypto_profiles ccp
SET
    total_legislation_count = (
        SELECT COUNT(*) FROM crypto_legislation cl
        WHERE cl.country_code = ccp.country_code
    ),
    active_legislation_count = (
        SELECT COUNT(*) FROM crypto_legislation cl
        WHERE cl.country_code = ccp.country_code
          AND cl.status IN ('in_effect', 'passed')
    ),
    last_major_legislation_date = (
        SELECT MAX(effective_date) FROM crypto_legislation cl
        WHERE cl.country_code = ccp.country_code
          AND cl.severity IN ('critical', 'high')
    );

-- ============================================================
-- 5. VERIFICATION
-- ============================================================

SELECT
    'Crypto Legislation Seeded!' as status,
    COUNT(DISTINCT country_code) as countries,
    COUNT(*) as legislation_count
FROM crypto_legislation;

SELECT
    country_code,
    country_name,
    crypto_stance,
    overall_score,
    active_legislation_count
FROM country_crypto_profiles
ORDER BY overall_score DESC;

-- ============================================================
-- END OF SEED FILE
-- ============================================================
