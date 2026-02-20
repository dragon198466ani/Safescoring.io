-- ============================================================
-- MIGRATION 015: ADD COUNTRY_ORIGIN TO PRODUCTS
-- ============================================================
-- Purpose: Populate country_origin for products to display on map
-- Date: 2025-01-03
-- ============================================================

-- Ensure column exists (it should already exist)
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS country_origin VARCHAR(2);
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS headquarters VARCHAR(100);

-- ============================================================
-- HARDWARE WALLETS
-- ============================================================

-- Ledger (France)
UPDATE products SET country_origin = 'FR', headquarters = 'Paris, France'
WHERE LOWER(name) LIKE '%ledger%' AND country_origin IS NULL;

-- Trezor (Czech Republic)
UPDATE products SET country_origin = 'CZ', headquarters = 'Prague, Czech Republic'
WHERE LOWER(name) LIKE '%trezor%' AND country_origin IS NULL;

-- BitBox (Switzerland)
UPDATE products SET country_origin = 'CH', headquarters = 'Zurich, Switzerland'
WHERE LOWER(name) LIKE '%bitbox%' AND country_origin IS NULL;

-- Coldcard (Canada)
UPDATE products SET country_origin = 'CA', headquarters = 'Toronto, Canada'
WHERE LOWER(name) LIKE '%coldcard%' AND country_origin IS NULL;

-- Foundation (USA)
UPDATE products SET country_origin = 'US', headquarters = 'Boston, USA'
WHERE LOWER(name) LIKE '%foundation%' OR LOWER(name) LIKE '%passport%' AND country_origin IS NULL;

-- Keystone (Hong Kong)
UPDATE products SET country_origin = 'HK', headquarters = 'Hong Kong'
WHERE LOWER(name) LIKE '%keystone%' AND country_origin IS NULL;

-- SafePal (Singapore)
UPDATE products SET country_origin = 'SG', headquarters = 'Singapore'
WHERE LOWER(name) LIKE '%safepal%' AND country_origin IS NULL;

-- Tangem (Switzerland)
UPDATE products SET country_origin = 'CH', headquarters = 'Zug, Switzerland'
WHERE LOWER(name) LIKE '%tangem%' AND country_origin IS NULL;

-- GridPlus (USA)
UPDATE products SET country_origin = 'US', headquarters = 'Austin, USA'
WHERE LOWER(name) LIKE '%gridplus%' OR LOWER(name) LIKE '%lattice%' AND country_origin IS NULL;

-- NGRAVE (Belgium)
UPDATE products SET country_origin = 'BE', headquarters = 'Brussels, Belgium'
WHERE LOWER(name) LIKE '%ngrave%' AND country_origin IS NULL;

-- SecuX (Taiwan)
UPDATE products SET country_origin = 'TW', headquarters = 'Taipei, Taiwan'
WHERE LOWER(name) LIKE '%secux%' AND country_origin IS NULL;

-- Ellipal (Hong Kong)
UPDATE products SET country_origin = 'HK', headquarters = 'Hong Kong'
WHERE LOWER(name) LIKE '%ellipal%' AND country_origin IS NULL;

-- ============================================================
-- EXCHANGES (CEX)
-- ============================================================

-- Binance (UAE/Cayman)
UPDATE products SET country_origin = 'AE', headquarters = 'Dubai, UAE'
WHERE LOWER(name) LIKE '%binance%' AND country_origin IS NULL;

-- Coinbase (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%coinbase%' AND country_origin IS NULL;

-- Kraken (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%kraken%' AND country_origin IS NULL;

-- Gemini (USA)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%gemini%' AND country_origin IS NULL;

-- FTX (Bahamas) - Defunct but for historical
UPDATE products SET country_origin = 'BS', headquarters = 'Nassau, Bahamas'
WHERE LOWER(name) LIKE '%ftx%' AND country_origin IS NULL;

-- Bitstamp (Luxembourg)
UPDATE products SET country_origin = 'LU', headquarters = 'Luxembourg'
WHERE LOWER(name) LIKE '%bitstamp%' AND country_origin IS NULL;

-- OKX (Seychelles)
UPDATE products SET country_origin = 'SC', headquarters = 'Seychelles'
WHERE LOWER(name) LIKE '%okx%' OR LOWER(name) LIKE '%okex%' AND country_origin IS NULL;

-- KuCoin (Seychelles)
UPDATE products SET country_origin = 'SC', headquarters = 'Seychelles'
WHERE LOWER(name) LIKE '%kucoin%' AND country_origin IS NULL;

-- Bybit (UAE)
UPDATE products SET country_origin = 'AE', headquarters = 'Dubai, UAE'
WHERE LOWER(name) LIKE '%bybit%' AND country_origin IS NULL;

-- Bitfinex (British Virgin Islands)
UPDATE products SET country_origin = 'VG', headquarters = 'British Virgin Islands'
WHERE LOWER(name) LIKE '%bitfinex%' AND country_origin IS NULL;

-- Huobi/HTX (Seychelles)
UPDATE products SET country_origin = 'SC', headquarters = 'Seychelles'
WHERE LOWER(name) LIKE '%huobi%' OR LOWER(name) LIKE '%htx%' AND country_origin IS NULL;

-- Gate.io (Cayman Islands)
UPDATE products SET country_origin = 'KY', headquarters = 'Cayman Islands'
WHERE LOWER(name) LIKE '%gate.io%' OR LOWER(name) = 'gate' AND country_origin IS NULL;

-- Crypto.com (Singapore)
UPDATE products SET country_origin = 'SG', headquarters = 'Singapore'
WHERE LOWER(name) LIKE '%crypto.com%' AND country_origin IS NULL;

-- Bitget (Seychelles)
UPDATE products SET country_origin = 'SC', headquarters = 'Seychelles'
WHERE LOWER(name) LIKE '%bitget%' AND country_origin IS NULL;

-- MEXC (Seychelles)
UPDATE products SET country_origin = 'SC', headquarters = 'Seychelles'
WHERE LOWER(name) LIKE '%mexc%' AND country_origin IS NULL;

-- ============================================================
-- SOFTWARE WALLETS
-- ============================================================

-- MetaMask (USA - ConsenSys)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%metamask%' AND country_origin IS NULL;

-- Trust Wallet (USA - Binance)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%trust wallet%' OR LOWER(name) = 'trust' AND country_origin IS NULL;

-- Exodus (USA)
UPDATE products SET country_origin = 'US', headquarters = 'Omaha, USA'
WHERE LOWER(name) LIKE '%exodus%' AND country_origin IS NULL;

-- Phantom (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%phantom%' AND country_origin IS NULL;

-- Rainbow (USA)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%rainbow%' AND country_origin IS NULL;

-- Rabby (Singapore)
UPDATE products SET country_origin = 'SG', headquarters = 'Singapore'
WHERE LOWER(name) LIKE '%rabby%' AND country_origin IS NULL;

-- Argent (UK)
UPDATE products SET country_origin = 'GB', headquarters = 'London, UK'
WHERE LOWER(name) LIKE '%argent%' AND country_origin IS NULL;

-- Zerion (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%zerion%' AND country_origin IS NULL;

-- Brave Wallet (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%brave%' AND country_origin IS NULL;

-- imToken (Singapore)
UPDATE products SET country_origin = 'SG', headquarters = 'Singapore'
WHERE LOWER(name) LIKE '%imtoken%' AND country_origin IS NULL;

-- TokenPocket (Singapore)
UPDATE products SET country_origin = 'SG', headquarters = 'Singapore'
WHERE LOWER(name) LIKE '%tokenpocket%' AND country_origin IS NULL;

-- Atomic Wallet (Estonia)
UPDATE products SET country_origin = 'EE', headquarters = 'Tallinn, Estonia'
WHERE LOWER(name) LIKE '%atomic%' AND country_origin IS NULL;

-- ============================================================
-- DEFI PROTOCOLS
-- ============================================================

-- Uniswap (USA)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%uniswap%' AND country_origin IS NULL;

-- Aave (UK)
UPDATE products SET country_origin = 'GB', headquarters = 'London, UK'
WHERE LOWER(name) LIKE '%aave%' AND country_origin IS NULL;

-- Compound (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%compound%' AND country_origin IS NULL;

-- MakerDAO (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%maker%' OR LOWER(name) LIKE '%dai%' AND country_origin IS NULL;

-- Curve (Switzerland)
UPDATE products SET country_origin = 'CH', headquarters = 'Zug, Switzerland'
WHERE LOWER(name) LIKE '%curve%' AND country_origin IS NULL;

-- SushiSwap (Decentralized)
UPDATE products SET country_origin = 'JP', headquarters = 'Tokyo, Japan'
WHERE LOWER(name) LIKE '%sushi%' AND country_origin IS NULL;

-- PancakeSwap (Cayman Islands)
UPDATE products SET country_origin = 'KY', headquarters = 'Cayman Islands'
WHERE LOWER(name) LIKE '%pancake%' AND country_origin IS NULL;

-- 1inch (UAE)
UPDATE products SET country_origin = 'AE', headquarters = 'Dubai, UAE'
WHERE LOWER(name) LIKE '%1inch%' AND country_origin IS NULL;

-- dYdX (USA)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%dydx%' AND country_origin IS NULL;

-- GMX (Cayman Islands)
UPDATE products SET country_origin = 'KY', headquarters = 'Cayman Islands'
WHERE LOWER(name) LIKE '%gmx%' AND country_origin IS NULL;

-- Lido (Cayman Islands)
UPDATE products SET country_origin = 'KY', headquarters = 'Cayman Islands'
WHERE LOWER(name) LIKE '%lido%' AND country_origin IS NULL;

-- Rocket Pool (Australia)
UPDATE products SET country_origin = 'AU', headquarters = 'Brisbane, Australia'
WHERE LOWER(name) LIKE '%rocket pool%' AND country_origin IS NULL;

-- Yearn (Decentralized - use US)
UPDATE products SET country_origin = 'US', headquarters = 'Decentralized'
WHERE LOWER(name) LIKE '%yearn%' AND country_origin IS NULL;

-- Convex (Decentralized)
UPDATE products SET country_origin = 'US', headquarters = 'Decentralized'
WHERE LOWER(name) LIKE '%convex%' AND country_origin IS NULL;

-- Balancer (Gibraltar)
UPDATE products SET country_origin = 'GI', headquarters = 'Gibraltar'
WHERE LOWER(name) LIKE '%balancer%' AND country_origin IS NULL;

-- ============================================================
-- BRIDGES
-- ============================================================

-- Across Protocol (USA)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%across%' AND country_origin IS NULL;

-- Wormhole (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%wormhole%' AND country_origin IS NULL;

-- LayerZero (Canada)
UPDATE products SET country_origin = 'CA', headquarters = 'Vancouver, Canada'
WHERE LOWER(name) LIKE '%layerzero%' AND country_origin IS NULL;

-- Stargate (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%stargate%' AND country_origin IS NULL;

-- Multichain (China) - Defunct
UPDATE products SET country_origin = 'CN', headquarters = 'Shanghai, China'
WHERE LOWER(name) LIKE '%multichain%' AND country_origin IS NULL;

-- Synapse (USA)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%synapse%' AND country_origin IS NULL;

-- ============================================================
-- LAYER 2s & CHAINS
-- ============================================================

-- Arbitrum (USA - Offchain Labs)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%arbitrum%' AND country_origin IS NULL;

-- Optimism (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%optimism%' AND country_origin IS NULL;

-- Polygon (India)
UPDATE products SET country_origin = 'IN', headquarters = 'Bangalore, India'
WHERE LOWER(name) LIKE '%polygon%' OR LOWER(name) LIKE '%matic%' AND country_origin IS NULL;

-- zkSync (Germany)
UPDATE products SET country_origin = 'DE', headquarters = 'Berlin, Germany'
WHERE LOWER(name) LIKE '%zksync%' AND country_origin IS NULL;

-- StarkNet (Israel)
UPDATE products SET country_origin = 'IL', headquarters = 'Tel Aviv, Israel'
WHERE LOWER(name) LIKE '%starknet%' OR LOWER(name) LIKE '%starkware%' AND country_origin IS NULL;

-- Base (USA - Coinbase)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) = 'base' AND country_origin IS NULL;

-- ============================================================
-- OTHER SERVICES
-- ============================================================

-- Chainlink (Cayman Islands)
UPDATE products SET country_origin = 'KY', headquarters = 'Cayman Islands'
WHERE LOWER(name) LIKE '%chainlink%' AND country_origin IS NULL;

-- The Graph (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%graph%' AND country_origin IS NULL;

-- OpenSea (USA)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%opensea%' AND country_origin IS NULL;

-- Blur (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%blur%' AND country_origin IS NULL;

-- Etherscan (Malaysia)
UPDATE products SET country_origin = 'MY', headquarters = 'Kuala Lumpur, Malaysia'
WHERE LOWER(name) LIKE '%etherscan%' AND country_origin IS NULL;

-- Alchemy (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%alchemy%' AND country_origin IS NULL;

-- Infura (USA - ConsenSys)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%infura%' AND country_origin IS NULL;

-- QuickNode (USA)
UPDATE products SET country_origin = 'US', headquarters = 'Miami, USA'
WHERE LOWER(name) LIKE '%quicknode%' AND country_origin IS NULL;

-- Safe (Germany)
UPDATE products SET country_origin = 'DE', headquarters = 'Berlin, Germany'
WHERE LOWER(name) LIKE '%safe%' OR LOWER(name) LIKE '%gnosis safe%' AND country_origin IS NULL;

-- Fireblocks (USA)
UPDATE products SET country_origin = 'US', headquarters = 'New York, USA'
WHERE LOWER(name) LIKE '%fireblocks%' AND country_origin IS NULL;

-- BitGo (USA)
UPDATE products SET country_origin = 'US', headquarters = 'Palo Alto, USA'
WHERE LOWER(name) LIKE '%bitgo%' AND country_origin IS NULL;

-- Anchorage (USA)
UPDATE products SET country_origin = 'US', headquarters = 'San Francisco, USA'
WHERE LOWER(name) LIKE '%anchorage%' AND country_origin IS NULL;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT
    'Products country_origin migration completed!' as status,
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE country_origin IS NOT NULL) as with_country,
    COUNT(*) FILTER (WHERE country_origin IS NULL) as missing_country
FROM products;

-- Show distribution by country
SELECT
    country_origin,
    COUNT(*) as product_count
FROM products
WHERE country_origin IS NOT NULL
GROUP BY country_origin
ORDER BY product_count DESC
LIMIT 20;

-- ============================================================
-- END OF MIGRATION 015
-- ============================================================
