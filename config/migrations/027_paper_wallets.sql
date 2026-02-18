-- ============================================================
-- Migration 027: Paper Wallet Type and Products
-- ============================================================
-- Adds Paper Wallet as a product type and all major paper wallet generators
-- Paper wallets = physical printouts of public/private keys for cold storage
-- ============================================================

-- ============================================================
-- STEP 1: Add Paper Wallet Product Type
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Paper Wallet',
    'Paper Wallet Generator',
    'Générateur de Paper Wallet',
    'Cold Storage',
    'Offline tool that generates cryptographic key pairs and allows users to print them on paper for cold storage. Keys are generated client-side in the browser without server transmission. Considered one of the most secure cold storage methods when generated offline.',
    ARRAY[
        'Client-side key generation',
        'Offline/air-gapped operation',
        'BIP38 password encryption option',
        'QR codes for easy scanning',
        'Printable format for physical storage',
        'Open source code (auditable)',
        'No server-side processing',
        'Multiple address generation'
    ],
    ARRAY[
        'Internet-connected key storage',
        'Custodial services',
        'Transaction signing',
        'Spending capabilities',
        'Private key recovery services'
    ],
    ARRAY[
        'Printer malware/memory',
        'Screen capture during generation',
        'Physical degradation (water, fire, fading)',
        'Physical theft of printed wallet',
        'Compromised browser or device',
        'Fake/phishing generator websites',
        'Incomplete randomness (PRNG weakness)',
        'User error in storage or backup'
    ],
    ARRAY['BitAddress', 'WalletGenerator.net', 'Bitcoin Paper Wallet', 'Paper-wallet.org', 'CashAddress', 'MoneroAddress'],
    ARRAY['paper wallet', 'cold storage', 'offline wallet', 'printed wallet', 'air-gapped', 'bitaddress', 'BIP38', 'key generator'],
    FALSE,
    FALSE,
    TRUE
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_fr = EXCLUDED.name_fr,
    category = EXCLUDED.category,
    definition = EXCLUDED.definition,
    includes = EXCLUDED.includes,
    excludes = EXCLUDED.excludes,
    risk_factors = EXCLUDED.risk_factors,
    examples = EXCLUDED.examples,
    keywords = EXCLUDED.keywords;

-- ============================================================
-- STEP 2: Ensure Brand exists for paper wallet providers
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('BitAddress', 'https://www.bitaddress.org'),
    ('WalletGenerator', 'https://walletgenerator.net'),
    ('Bitcoin.com', 'https://bitcoin.com'),
    ('Paper-Wallet.org', 'https://paper-wallet.org'),
    ('Canton Becker', 'https://bitcoinpaperwallet.com'),
    ('CashAddress', 'https://cashaddress.org'),
    ('MoneroAddress', 'https://moneroaddress.org'),
    ('LiteAddress', 'https://liteaddress.org'),
    ('MyEtherWallet', 'https://www.myetherwallet.com')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STEP 3: Add Paper Wallet Products
-- ============================================================

-- 3.1 BitAddress.org (Bitcoin) - The original, most trusted
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'bitaddress',
    'BitAddress.org',
    'The original open-source JavaScript client-side Bitcoin wallet generator. Created in 2011, BitAddress is widely considered the gold standard for paper wallet generation. It can be downloaded and run completely offline for maximum security. Supports single address, paper wallet, bulk wallet, brain wallet, vanity wallet, and split wallet generation.',
    'Original open-source Bitcoin paper wallet generator since 2011',
    'https://www.bitaddress.org',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'BitAddress'),
    'Open Source Project',
    NULL,
    2011,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.2 WalletGenerator.net (Multi-currency)
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'walletgenerator',
    'WalletGenerator.net',
    'Universal open-source client-side paper wallet generator supporting over 200 cryptocurrencies. Based on BitAddress code but extended for altcoin support. Can be downloaded and run offline. Supports BIP38 encryption, bulk generation, and various paper wallet designs.',
    'Multi-currency paper wallet generator supporting 200+ cryptocurrencies',
    'https://walletgenerator.net',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'WalletGenerator'),
    'Open Source Project',
    NULL,
    2014,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.3 Bitcoin.com Paper Wallet
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'bitcoin-com-paper-wallet',
    'Bitcoin.com Paper Wallet',
    'Paper wallet generator by Bitcoin.com, primarily focused on Bitcoin Cash (BCH). Provides a simple interface for generating BCH paper wallets with QR codes. Part of the Bitcoin.com ecosystem. Can be used offline for enhanced security.',
    'Bitcoin Cash paper wallet generator by Bitcoin.com',
    'https://paperwallet.bitcoin.com',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'Bitcoin.com'),
    'St. Kitts and Nevis',
    'KN',
    2017,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.4 Paper-Wallet.org
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'paper-wallet-org',
    'Paper-Wallet.org',
    'Open-source paper wallet generator supporting multiple cryptocurrencies including Bitcoin, Ethereum, Litecoin, and others. Features a clean interface with multiple language support including French. Can be downloaded for offline use. Provides BIP38 encryption option.',
    'Multi-language paper wallet generator with clean interface',
    'https://paper-wallet.org',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'Paper-Wallet.org'),
    'Open Source Project',
    NULL,
    2018,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.5 Bitcoin Paper Wallet (Canton Becker) - Premium design
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'bitcoinpaperwallet',
    'Bitcoin Paper Wallet',
    'Premium Bitcoin paper wallet generator by Canton Becker, known for high-quality tamper-evident designs. Offers beautifully designed paper wallets with security features like holographic seals. Also provides pre-printed paper wallet kits for purchase. Open source with offline download option.',
    'Premium Bitcoin paper wallet with tamper-evident security designs',
    'https://bitcoinpaperwallet.com',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'Canton Becker'),
    'Austin, Texas, USA',
    'US',
    2013,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.6 CashAddress (Bitcoin Cash)
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'cashaddress',
    'CashAddress Paper Wallet',
    'Dedicated Bitcoin Cash (BCH) paper wallet generator using the CashAddr format. Open-source client-side generator that supports the new BCH address format introduced in 2018. Can be downloaded and run offline for secure key generation.',
    'Bitcoin Cash paper wallet generator with CashAddr format support',
    'https://cashaddress.org',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'CashAddress'),
    'Open Source Project',
    NULL,
    2018,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.7 MoneroAddress (Monero)
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'moneroaddress',
    'MoneroAddress Paper Wallet',
    'Open-source Monero (XMR) paper wallet generator. Generates Monero addresses with spend and view keys for cold storage. Built specifically for Monero''s unique cryptographic requirements including stealth addresses. Can be downloaded for offline generation.',
    'Monero paper wallet generator with spend and view keys',
    'https://moneroaddress.org',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'MoneroAddress'),
    'Open Source Project',
    NULL,
    2016,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.8 LiteAddress (Litecoin)
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'liteaddress',
    'LiteAddress Paper Wallet',
    'Open-source Litecoin (LTC) paper wallet generator based on BitAddress. Provides client-side generation of Litecoin addresses and private keys. Supports single wallet, paper wallet, bulk wallet, and brain wallet generation. Can be downloaded for offline use.',
    'Litecoin paper wallet generator based on BitAddress',
    'https://liteaddress.org',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'LiteAddress'),
    'Open Source Project',
    NULL,
    2013,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.9 MyEtherWallet Paper Wallet (Ethereum)
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'myetherwallet-paper',
    'MyEtherWallet Paper Wallet',
    'Paper wallet generation feature within MyEtherWallet (MEW). Allows users to generate Ethereum and ERC-20 compatible paper wallets. MEW is one of the most established Ethereum interfaces. The paper wallet feature can be used offline by downloading the MEW offline version.',
    'Ethereum paper wallet generator from MyEtherWallet',
    'https://www.myetherwallet.com',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    (SELECT id FROM brands WHERE name = 'MyEtherWallet'),
    'Los Angeles, California, USA',
    'US',
    2015,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.10 Dogechain Paper Wallet (Dogecoin)
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'dogechain-paper',
    'Dogechain Paper Wallet',
    'Official Dogecoin paper wallet generator from dogechain.info. Provides simple client-side generation of Dogecoin addresses and private keys with QR codes. Popular among the Dogecoin community for cold storage of DOGE.',
    'Official Dogecoin paper wallet generator',
    'https://dogechain.info/wallet/paper',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    NULL,
    'Open Source Project',
    NULL,
    2014,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.11 Dash Paper Wallet
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'dash-paper-wallet',
    'Dash Paper Wallet',
    'Official Dash cryptocurrency paper wallet generator. Based on BitAddress with modifications for Dash. Allows generation of Dash addresses with BIP38 encryption support. Can be downloaded and run offline for secure generation.',
    'Official Dash paper wallet generator with BIP38 support',
    'https://paper.dash.org',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    NULL,
    'Dash Core Group',
    NULL,
    2015,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- 3.12 Zcash Paper Wallet
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, year_founded, security_status)
VALUES (
    'zcash-paper-wallet',
    'Zcash Paper Wallet',
    'Community-developed Zcash paper wallet generator for transparent (t-addr) addresses. Provides client-side generation of Zcash addresses. Note: Paper wallets only support transparent addresses, not shielded (z-addr) addresses due to cryptographic complexity.',
    'Zcash transparent address paper wallet generator',
    'https://zcashpaperwallet.com',
    (SELECT id FROM product_types WHERE code = 'Paper Wallet'),
    NULL,
    'Open Source Project',
    NULL,
    2016,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    type_id = EXCLUDED.type_id,
    updated_at = NOW();

-- ============================================================
-- STEP 4: Add product type mappings for multi-type products
-- ============================================================

-- MyEtherWallet is also a SW Browser wallet
INSERT INTO product_type_mapping (product_id, type_id, is_primary)
SELECT
    (SELECT id FROM products WHERE slug = 'myetherwallet-paper'),
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    FALSE
WHERE EXISTS (SELECT 1 FROM products WHERE slug = 'myetherwallet-paper')
  AND EXISTS (SELECT 1 FROM product_types WHERE code = 'SW Browser')
ON CONFLICT (product_id, type_id) DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify paper wallet type was added
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM product_types WHERE code = 'Paper Wallet') THEN
        RAISE EXCEPTION 'Paper Wallet type was not created!';
    END IF;
END $$;

-- Count paper wallet products
DO $$
DECLARE
    paper_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO paper_count
    FROM products
    WHERE type_id = (SELECT id FROM product_types WHERE code = 'Paper Wallet');

    RAISE NOTICE 'Paper wallet products added: %', paper_count;
END $$;

-- ============================================================
-- DONE!
-- ============================================================
