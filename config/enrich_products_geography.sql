-- ============================================================
-- ENRICHMENT: Add Geographic Data to Products
-- ============================================================
-- Purpose: Populate headquarters and country_origin for existing products
-- Date: 2025-01-03
-- ============================================================

-- This script adds geographic information to products so they appear on the world map

-- ============================================================
-- 1. HARDWARE WALLETS
-- ============================================================

-- Ledger (France)
UPDATE products SET
    headquarters = 'Paris, France',
    country_origin = 'FR'
WHERE slug = 'ledger-nano-x' OR slug = 'ledger-nano-s-plus' OR slug LIKE 'ledger%';

-- Trezor (Czech Republic)
UPDATE products SET
    headquarters = 'Prague, Czech Republic',
    country_origin = 'CZ'
WHERE slug LIKE 'trezor%';

-- BitBox (Switzerland)
UPDATE products SET
    headquarters = 'Zurich, Switzerland',
    country_origin = 'CH'
WHERE slug LIKE 'bitbox%';

-- Coldcard (Canada)
UPDATE products SET
    headquarters = 'Toronto, Canada',
    country_origin = 'CA'
WHERE slug LIKE 'coldcard%';

-- KeepKey (USA)
UPDATE products SET
    headquarters = 'Seattle, USA',
    country_origin = 'US'
WHERE slug LIKE 'keepkey%';

-- Keystone (Hong Kong)
UPDATE products SET
    headquarters = 'Hong Kong',
    country_origin = 'HK'
WHERE slug LIKE 'keystone%';

-- SafePal (Singapore)
UPDATE products SET
    headquarters = 'Singapore',
    country_origin = 'SG'
WHERE slug LIKE 'safepal%';

-- Tangem (Switzerland)
UPDATE products SET
    headquarters = 'Zug, Switzerland',
    country_origin = 'CH'
WHERE slug LIKE 'tangem%';

-- Ellipal (Hong Kong)
UPDATE products SET
    headquarters = 'Hong Kong',
    country_origin = 'HK'
WHERE slug LIKE 'ellipal%';

-- Jade (Canada)
UPDATE products SET
    headquarters = 'Vancouver, Canada',
    country_origin = 'CA'
WHERE slug LIKE 'blockstream-jade%' OR slug LIKE 'jade%';

-- ============================================================
-- 2. SOFTWARE WALLETS (HOT)
-- ============================================================

-- MetaMask (USA - ConsenSys)
UPDATE products SET
    headquarters = 'New York, USA',
    country_origin = 'US'
WHERE slug LIKE 'metamask%';

-- Trust Wallet (USA - Binance)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'trust-wallet%';

-- Exodus (USA)
UPDATE products SET
    headquarters = 'Omaha, USA',
    country_origin = 'US'
WHERE slug LIKE 'exodus%';

-- Coinbase Wallet (USA)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'coinbase-wallet%';

-- Rainbow (USA)
UPDATE products SET
    headquarters = 'New York, USA',
    country_origin = 'US'
WHERE slug LIKE 'rainbow%';

-- Phantom (USA)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'phantom%';

-- Uniswap Wallet (USA)
UPDATE products SET
    headquarters = 'New York, USA',
    country_origin = 'US'
WHERE slug LIKE 'uniswap-wallet%';

-- Argent (UK)
UPDATE products SET
    headquarters = 'London, UK',
    country_origin = 'GB'
WHERE slug LIKE 'argent%';

-- Zerion (Switzerland)
UPDATE products SET
    headquarters = 'Zug, Switzerland',
    country_origin = 'CH'
WHERE slug LIKE 'zerion%';

-- ============================================================
-- 3. EXCHANGES
-- ============================================================

-- Binance (Cayman Islands / Global)
UPDATE products SET
    headquarters = 'Dubai, UAE',
    country_origin = 'AE'
WHERE slug LIKE 'binance%' AND slug NOT LIKE '%us%';

-- Binance US (USA)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'binance%us%';

-- Coinbase (USA)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'coinbase%' AND slug NOT LIKE '%wallet%';

-- Kraken (USA)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'kraken%';

-- Bitfinex (Hong Kong)
UPDATE products SET
    headquarters = 'Hong Kong',
    country_origin = 'HK'
WHERE slug LIKE 'bitfinex%';

-- Bitstamp (Luxembourg)
UPDATE products SET
    headquarters = 'Luxembourg City, Luxembourg',
    country_origin = 'LU'
WHERE slug LIKE 'bitstamp%';

-- Gemini (USA)
UPDATE products SET
    headquarters = 'New York, USA',
    country_origin = 'US'
WHERE slug LIKE 'gemini%';

-- OKX (Seychelles)
UPDATE products SET
    headquarters = 'Victoria, Seychelles',
    country_origin = 'SC'
WHERE slug LIKE 'okx%';

-- Bybit (Dubai)
UPDATE products SET
    headquarters = 'Dubai, UAE',
    country_origin = 'AE'
WHERE slug LIKE 'bybit%';

-- KuCoin (Seychelles)
UPDATE products SET
    headquarters = 'Victoria, Seychelles',
    country_origin = 'SC'
WHERE slug LIKE 'kucoin%';

-- Gate.io (Cayman Islands)
UPDATE products SET
    headquarters = 'George Town, Cayman Islands',
    country_origin = 'KY'
WHERE slug LIKE 'gate%';

-- Huobi (Seychelles)
UPDATE products SET
    headquarters = 'Victoria, Seychelles',
    country_origin = 'SC'
WHERE slug LIKE 'huobi%';

-- Crypto.com (Singapore)
UPDATE products SET
    headquarters = 'Singapore',
    country_origin = 'SG'
WHERE slug LIKE 'crypto-com%';

-- ============================================================
-- 4. MULTISIG / INSTITUTIONAL
-- ============================================================

-- Gnosis Safe (Germany)
UPDATE products SET
    headquarters = 'Berlin, Germany',
    country_origin = 'DE'
WHERE slug LIKE 'gnosis%' OR slug LIKE 'safe%multisig%';

-- Casa (USA)
UPDATE products SET
    headquarters = 'Denver, USA',
    country_origin = 'US'
WHERE slug LIKE 'casa%';

-- Fireblocks (USA/Israel)
UPDATE products SET
    headquarters = 'New York, USA',
    country_origin = 'US'
WHERE slug LIKE 'fireblocks%';

-- BitGo (USA)
UPDATE products SET
    headquarters = 'Palo Alto, USA',
    country_origin = 'US'
WHERE slug LIKE 'bitgo%';

-- Copper (UK)
UPDATE products SET
    headquarters = 'London, UK',
    country_origin = 'GB'
WHERE slug LIKE 'copper%';

-- Anchorage (USA)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'anchorage%';

-- ============================================================
-- 5. LAYER 2 / SIDECHAINS
-- ============================================================

-- Polygon (India/Global)
UPDATE products SET
    headquarters = 'Bangalore, India',
    country_origin = 'IN'
WHERE slug LIKE 'polygon%';

-- Arbitrum (USA)
UPDATE products SET
    headquarters = 'New York, USA',
    country_origin = 'US'
WHERE slug LIKE 'arbitrum%';

-- Optimism (USA)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'optimism%';

-- zkSync (Germany)
UPDATE products SET
    headquarters = 'Berlin, Germany',
    country_origin = 'DE'
WHERE slug LIKE 'zksync%';

-- Starknet (Israel)
UPDATE products SET
    headquarters = 'Netanya, Israel',
    country_origin = 'IL'
WHERE slug LIKE 'starknet%';

-- ============================================================
-- 6. DEFI PROTOCOLS
-- ============================================================

-- Uniswap (USA)
UPDATE products SET
    headquarters = 'New York, USA',
    country_origin = 'US'
WHERE slug LIKE 'uniswap%' AND slug NOT LIKE '%wallet%';

-- Aave (UK)
UPDATE products SET
    headquarters = 'London, UK',
    country_origin = 'GB'
WHERE slug LIKE 'aave%';

-- Curve (Switzerland)
UPDATE products SET
    headquarters = 'Zug, Switzerland',
    country_origin = 'CH'
WHERE slug LIKE 'curve%';

-- MakerDAO (USA)
UPDATE products SET
    headquarters = 'Santa Cruz, USA',
    country_origin = 'US'
WHERE slug LIKE 'maker%' OR slug LIKE 'dai%';

-- Compound (USA)
UPDATE products SET
    headquarters = 'San Francisco, USA',
    country_origin = 'US'
WHERE slug LIKE 'compound%';

-- Lido (Estonia)
UPDATE products SET
    headquarters = 'Tallinn, Estonia',
    country_origin = 'EE'
WHERE slug LIKE 'lido%';

-- ============================================================
-- 7. VERIFICATION & STATISTICS
-- ============================================================

-- Count products with geographic data
SELECT
    'Products with geographic data' as metric,
    COUNT(*) as count
FROM products
WHERE country_origin IS NOT NULL;

-- Count products by country
SELECT
    country_origin,
    headquarters,
    COUNT(*) as product_count
FROM products
WHERE country_origin IS NOT NULL
GROUP BY country_origin, headquarters
ORDER BY product_count DESC, country_origin;

-- Products still missing geographic data
SELECT
    slug,
    name,
    type_id
FROM products
WHERE country_origin IS NULL
ORDER BY name
LIMIT 20;

-- ============================================================
-- 8. COMMENTS
-- ============================================================

COMMENT ON COLUMN products.headquarters IS 'Company headquarters (city, country) - used for world map display';
COMMENT ON COLUMN products.country_origin IS 'ISO 2-letter country code - used for geographic filtering and map markers';

-- ============================================================
-- END OF ENRICHMENT SCRIPT
-- ============================================================

SELECT
    'Geographic enrichment completed!' as status,
    'Products will now appear on /incidents/map' as next_step;
