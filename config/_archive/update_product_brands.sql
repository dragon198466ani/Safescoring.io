-- ============================================================
-- UPDATE PRODUCT BRANDS - Associate products with their brands
-- ============================================================
-- Run this script to:
-- 1. Create brands table if not exists
-- 2. Create all brands
-- 3. Update products with correct brand_id
-- ============================================================

-- ============================================================
-- 0. CREATE BRANDS TABLE IF NOT EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add brand_id column to products if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- ============================================================
-- 1. INSERT ALL BRANDS (if not exist)
-- ============================================================

INSERT INTO brands (name, website) VALUES
-- Hardware Wallets
('Ledger', 'https://www.ledger.com'),
('Trezor', 'https://trezor.io'),
('Coinkite', 'https://coinkite.com'),
('Shift Crypto', 'https://shiftcrypto.ch'),
('Keystone', 'https://keyst.one'),
('Foundation Devices', 'https://foundationdevices.com'),
('NGRAVE', 'https://www.ngrave.io'),
('SecuX', 'https://secuxtech.com'),
('Tangem', 'https://tangem.com'),
('GridPlus', 'https://gridplus.io'),
('Arculus', 'https://www.getarculus.com'),
('ELLIPAL', 'https://www.ellipal.com'),
('SafePal', 'https://www.safepal.com'),
('KeepKey', 'https://shapeshift.com/keepkey'),
('CoolWallet', 'https://www.coolwallet.io'),
('D''CENT', 'https://dcentwallet.com'),
('Blockstream', 'https://blockstream.com'),

-- Software Wallets
('MetaMask', 'https://metamask.io'),
('Trust Wallet', 'https://trustwallet.com'),
('Phantom', 'https://phantom.app'),
('Exodus', 'https://www.exodus.com'),
('Rabby', 'https://rabby.io'),
('Rainbow', 'https://rainbow.me'),
('Argent', 'https://www.argent.xyz'),
('Zerion', 'https://zerion.io'),
('Coinbase Wallet', 'https://www.coinbase.com/wallet'),
('Safe', 'https://safe.global'),
('Uniswap Wallet', 'https://wallet.uniswap.org'),
('Sparrow', 'https://sparrowwallet.com'),
('BlueWallet', 'https://bluewallet.io'),
('Wasabi', 'https://wasabiwallet.io'),
('Electrum', 'https://electrum.org'),
('Mycelium', 'https://wallet.mycelium.com'),
('OKX Wallet', 'https://www.okx.com/web3'),

-- Exchanges
('Binance', 'https://www.binance.com'),
('Coinbase', 'https://www.coinbase.com'),
('Kraken', 'https://www.kraken.com'),
('OKX', 'https://www.okx.com'),
('Bybit', 'https://www.bybit.com'),
('Crypto.com', 'https://crypto.com'),
('Bitfinex', 'https://www.bitfinex.com'),
('KuCoin', 'https://www.kucoin.com'),
('Gate.io', 'https://www.gate.io'),
('Bitstamp', 'https://www.bitstamp.net'),
('Gemini', 'https://www.gemini.com'),
('Bitget', 'https://www.bitget.com'),
('MEXC', 'https://www.mexc.com'),
('HTX', 'https://www.htx.com'),

-- DEX
('Uniswap Labs', 'https://uniswap.org'),
('1inch', 'https://1inch.io'),
('Curve Finance', 'https://curve.fi'),
('PancakeSwap', 'https://pancakeswap.finance'),
('SushiSwap', 'https://www.sushi.com'),
('dYdX', 'https://dydx.exchange'),
('Jupiter', 'https://jup.ag'),
('Raydium', 'https://raydium.io'),
('Orca', 'https://www.orca.so'),
('Trader Joe', 'https://traderjoexyz.com'),
('Velodrome', 'https://velodrome.finance'),
('Aerodrome', 'https://aerodrome.finance'),
('Balancer', 'https://balancer.fi'),
('Camelot', 'https://camelot.exchange'),

-- DeFi Lending
('Aave', 'https://aave.com'),
('Compound', 'https://compound.finance'),
('MakerDAO', 'https://makerdao.com'),
('Spark Protocol', 'https://spark.fi'),
('Venus', 'https://venus.io'),
('Benqi', 'https://benqi.fi'),
('Morpho', 'https://morpho.org'),
('Euler', 'https://www.euler.finance'),
('Radiant', 'https://radiant.capital'),
('Silo', 'https://www.silo.finance'),

-- Liquid Staking
('Lido', 'https://lido.fi'),
('Rocket Pool', 'https://rocketpool.net'),
('Frax Finance', 'https://frax.finance'),
('Ankr', 'https://www.ankr.com'),
('Stader Labs', 'https://www.staderlabs.com'),
('Marinade', 'https://marinade.finance'),
('Jito', 'https://jito.network'),
('Mantle', 'https://www.mantle.xyz'),
('EtherFi', 'https://www.ether.fi'),
('Swell', 'https://www.swellnetwork.io'),
('Kelp DAO', 'https://kelpdao.xyz'),
('Renzo', 'https://www.renzoprotocol.com'),
('Puffer', 'https://www.puffer.fi'),
('Eigenlayer', 'https://www.eigenlayer.xyz'),

-- Yield Aggregators
('Yearn Finance', 'https://yearn.fi'),
('Beefy Finance', 'https://beefy.finance'),
('Convex Finance', 'https://www.convexfinance.com'),
('Pendle', 'https://www.pendle.finance'),
('Sommelier', 'https://www.sommelier.finance'),

-- Derivatives
('GMX', 'https://gmx.io'),
('Gains Network', 'https://gains.trade'),
('Synthetix', 'https://synthetix.io'),
('Perpetual Protocol', 'https://perp.com'),
('Kwenta', 'https://kwenta.io'),
('Vertex', 'https://vertexprotocol.com'),
('Hyperliquid', 'https://hyperliquid.xyz'),

-- Bridges
('LayerZero', 'https://layerzero.network'),
('Wormhole', 'https://wormhole.com'),
('Stargate', 'https://stargate.finance'),
('Across Protocol', 'https://across.to'),
('Hop Protocol', 'https://hop.exchange'),
('Synapse', 'https://synapseprotocol.com'),
('Celer', 'https://celer.network'),
('Multichain', 'https://multichain.org'),
('Axelar', 'https://axelar.network'),
('Circle CCTP', 'https://www.circle.com'),

-- Physical Backup
('CryptoTag', 'https://cryptotag.io'),
('Cryptosteel', 'https://cryptosteel.com'),
('Billfodl', 'https://privacypros.io'),
('Blockplate', 'https://www.blockplate.com'),
('SteelWallet', 'https://steelwallet.com'),
('Hodlr Swiss', 'https://hodlr.swiss'),
('Cobo', 'https://cobo.com'),

-- Stablecoins
('Circle', 'https://www.circle.com'),
('Tether', 'https://tether.to'),
('Paxos', 'https://paxos.com'),
('PayPal', 'https://www.paypal.com'),
('Liquity', 'https://www.liquity.org'),
('Ethena', 'https://ethena.fi'),
('Ondo Finance', 'https://ondo.finance'),
('Mountain Protocol', 'https://mountainprotocol.com'),

-- Crypto Banks & Cards
('SEBA Bank', 'https://www.seba.swiss'),
('Sygnum', 'https://www.sygnum.com'),
('Anchorage Digital', 'https://www.anchorage.com'),
('Revolut', 'https://www.revolut.com'),
('Wirex', 'https://wirexapp.com'),
('Nexo', 'https://nexo.com'),
('Gnosis', 'https://www.gnosis.io'),
('Holyheld', 'https://holyheld.com'),
('Immersve', 'https://immersve.com'),

-- DeFi Tools
('DeBank', 'https://debank.com'),
('Zapper', 'https://zapper.xyz'),
('Nansen', 'https://www.nansen.ai'),
('DeFiLlama', 'https://defillama.com'),
('Dune', 'https://dune.com'),

-- Others
('Casa', 'https://keys.casa'),
('Unchained', 'https://unchained.com'),
('Fireblocks', 'https://www.fireblocks.com'),
('BitGo', 'https://www.bitgo.com'),
('Copper', 'https://copper.co'),
('Cobo Custody', 'https://cobo.com')

ON CONFLICT (name) DO UPDATE SET
    website = EXCLUDED.website,
    updated_at = NOW();

-- ============================================================
-- 2. UPDATE PRODUCTS WITH BRAND_ID
-- ============================================================

-- Ledger products
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Ledger')
WHERE name ILIKE '%Ledger%' AND brand_id IS NULL;

-- Trezor products
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Trezor')
WHERE name ILIKE '%Trezor%' AND brand_id IS NULL;

-- Coldcard (Coinkite)
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Coinkite')
WHERE (name ILIKE '%Coldcard%' OR name ILIKE '%Cold Card%') AND brand_id IS NULL;

-- BitBox (Shift Crypto)
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Shift Crypto')
WHERE name ILIKE '%BitBox%' AND brand_id IS NULL;

-- Keystone
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Keystone')
WHERE name ILIKE '%Keystone%' AND brand_id IS NULL;

-- Foundation (Passport)
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Foundation Devices')
WHERE (name ILIKE '%Passport%' OR name ILIKE '%Foundation%') AND brand_id IS NULL;

-- NGRAVE
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'NGRAVE')
WHERE name ILIKE '%NGRAVE%' AND brand_id IS NULL;

-- SecuX
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'SecuX')
WHERE name ILIKE '%SecuX%' AND brand_id IS NULL;

-- Tangem
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Tangem')
WHERE name ILIKE '%Tangem%' AND brand_id IS NULL;

-- GridPlus (Lattice)
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'GridPlus')
WHERE (name ILIKE '%GridPlus%' OR name ILIKE '%Lattice%') AND brand_id IS NULL;

-- Arculus
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Arculus')
WHERE name ILIKE '%Arculus%' AND brand_id IS NULL;

-- ELLIPAL
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'ELLIPAL')
WHERE name ILIKE '%ELLIPAL%' AND brand_id IS NULL;

-- SafePal
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'SafePal')
WHERE name ILIKE '%SafePal%' AND brand_id IS NULL;

-- KeepKey
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'KeepKey')
WHERE name ILIKE '%KeepKey%' AND brand_id IS NULL;

-- CoolWallet
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'CoolWallet')
WHERE name ILIKE '%CoolWallet%' AND brand_id IS NULL;

-- D'CENT
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'D''CENT')
WHERE name ILIKE '%D''CENT%' OR name ILIKE '%DCENT%' AND brand_id IS NULL;

-- Blockstream (Jade)
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Blockstream')
WHERE (name ILIKE '%Jade%' OR name ILIKE '%Blockstream%') AND brand_id IS NULL;

-- CryptoTag
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'CryptoTag')
WHERE name ILIKE '%CryptoTag%' AND brand_id IS NULL;

-- Cryptosteel
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Cryptosteel')
WHERE name ILIKE '%Cryptosteel%' AND brand_id IS NULL;

-- Billfodl
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Billfodl')
WHERE name ILIKE '%Billfodl%' AND brand_id IS NULL;

-- Blockplate
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Blockplate')
WHERE name ILIKE '%Blockplate%' AND brand_id IS NULL;

-- SteelWallet
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'SteelWallet')
WHERE name ILIKE '%SteelWallet%' OR name ILIKE '%Steel Wallet%' AND brand_id IS NULL;

-- Hodlr Swiss
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Hodlr Swiss')
WHERE name ILIKE '%Hodlr%' AND brand_id IS NULL;

-- Cobo Tablet
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Cobo')
WHERE name ILIKE '%Cobo%' AND brand_id IS NULL;

-- MetaMask
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'MetaMask')
WHERE name ILIKE '%MetaMask%' AND brand_id IS NULL;

-- Trust Wallet
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Trust Wallet')
WHERE name ILIKE '%Trust Wallet%' AND brand_id IS NULL;

-- Phantom
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Phantom')
WHERE name ILIKE '%Phantom%' AND brand_id IS NULL;

-- Exodus
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Exodus')
WHERE name ILIKE '%Exodus%' AND brand_id IS NULL;

-- Rabby
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Rabby')
WHERE name ILIKE '%Rabby%' AND brand_id IS NULL;

-- Rainbow
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Rainbow')
WHERE name = 'Rainbow' AND brand_id IS NULL;

-- Argent
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Argent')
WHERE name ILIKE '%Argent%' AND brand_id IS NULL;

-- Zerion
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Zerion')
WHERE name ILIKE '%Zerion%' AND brand_id IS NULL;

-- Safe (formerly Gnosis Safe)
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Safe')
WHERE (name ILIKE '%Safe%' AND name ILIKE '%Wallet%') OR name = 'Safe' AND brand_id IS NULL;

-- Sparrow
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Sparrow')
WHERE name ILIKE '%Sparrow%' AND brand_id IS NULL;

-- BlueWallet
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'BlueWallet')
WHERE name ILIKE '%BlueWallet%' OR name ILIKE '%Blue Wallet%' AND brand_id IS NULL;

-- Wasabi
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Wasabi')
WHERE name ILIKE '%Wasabi%' AND brand_id IS NULL;

-- Electrum
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Electrum')
WHERE name ILIKE '%Electrum%' AND brand_id IS NULL;

-- Mycelium
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Mycelium')
WHERE name ILIKE '%Mycelium%' AND brand_id IS NULL;

-- Binance
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Binance')
WHERE name ILIKE '%Binance%' AND brand_id IS NULL;

-- Coinbase
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Coinbase')
WHERE name ILIKE '%Coinbase%' AND brand_id IS NULL;

-- Kraken
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Kraken')
WHERE name ILIKE '%Kraken%' AND brand_id IS NULL;

-- OKX
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'OKX')
WHERE name ILIKE '%OKX%' AND brand_id IS NULL;

-- Bybit
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bybit')
WHERE name ILIKE '%Bybit%' AND brand_id IS NULL;

-- Crypto.com
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Crypto.com')
WHERE name ILIKE '%Crypto.com%' AND brand_id IS NULL;

-- Bitfinex
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bitfinex')
WHERE name ILIKE '%Bitfinex%' AND brand_id IS NULL;

-- KuCoin
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'KuCoin')
WHERE name ILIKE '%KuCoin%' AND brand_id IS NULL;

-- Gate.io
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Gate.io')
WHERE name ILIKE '%Gate.io%' OR name ILIKE '%Gate io%' AND brand_id IS NULL;

-- Bitstamp
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bitstamp')
WHERE name ILIKE '%Bitstamp%' AND brand_id IS NULL;

-- Gemini
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Gemini')
WHERE name ILIKE '%Gemini%' AND brand_id IS NULL;

-- Bitget
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bitget')
WHERE name ILIKE '%Bitget%' AND brand_id IS NULL;

-- MEXC
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'MEXC')
WHERE name ILIKE '%MEXC%' AND brand_id IS NULL;

-- HTX (Huobi)
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'HTX')
WHERE name ILIKE '%HTX%' OR name ILIKE '%Huobi%' AND brand_id IS NULL;

-- Uniswap
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Uniswap Labs')
WHERE name ILIKE '%Uniswap%' AND brand_id IS NULL;

-- 1inch
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = '1inch')
WHERE name ILIKE '%1inch%' AND brand_id IS NULL;

-- Curve
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Curve Finance')
WHERE name ILIKE '%Curve%' AND brand_id IS NULL;

-- PancakeSwap
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'PancakeSwap')
WHERE name ILIKE '%PancakeSwap%' OR name ILIKE '%Pancake Swap%' AND brand_id IS NULL;

-- SushiSwap
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'SushiSwap')
WHERE name ILIKE '%SushiSwap%' OR name ILIKE '%Sushi%' AND brand_id IS NULL;

-- dYdX
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'dYdX')
WHERE name ILIKE '%dYdX%' AND brand_id IS NULL;

-- Jupiter
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Jupiter')
WHERE name ILIKE '%Jupiter%' AND brand_id IS NULL;

-- Raydium
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Raydium')
WHERE name ILIKE '%Raydium%' AND brand_id IS NULL;

-- Orca
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Orca')
WHERE name = 'Orca' AND brand_id IS NULL;

-- Trader Joe
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Trader Joe')
WHERE name ILIKE '%Trader Joe%' AND brand_id IS NULL;

-- Velodrome
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Velodrome')
WHERE name ILIKE '%Velodrome%' AND brand_id IS NULL;

-- Aerodrome
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Aerodrome')
WHERE name ILIKE '%Aerodrome%' AND brand_id IS NULL;

-- Balancer
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Balancer')
WHERE name ILIKE '%Balancer%' AND brand_id IS NULL;

-- Camelot
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Camelot')
WHERE name ILIKE '%Camelot%' AND brand_id IS NULL;

-- Aave
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Aave')
WHERE name ILIKE '%Aave%' AND brand_id IS NULL;

-- Compound
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Compound')
WHERE name ILIKE '%Compound%' AND brand_id IS NULL;

-- MakerDAO / Maker
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'MakerDAO')
WHERE name ILIKE '%Maker%' OR name ILIKE '%DAI%' AND brand_id IS NULL;

-- Spark Protocol
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Spark Protocol')
WHERE name ILIKE '%Spark%' AND brand_id IS NULL;

-- Venus
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Venus')
WHERE name ILIKE '%Venus%' AND brand_id IS NULL;

-- Benqi
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Benqi')
WHERE name ILIKE '%Benqi%' AND brand_id IS NULL;

-- Morpho
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Morpho')
WHERE name ILIKE '%Morpho%' AND brand_id IS NULL;

-- Euler
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Euler')
WHERE name ILIKE '%Euler%' AND brand_id IS NULL;

-- Radiant
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Radiant')
WHERE name ILIKE '%Radiant%' AND brand_id IS NULL;

-- Silo
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Silo')
WHERE name ILIKE '%Silo%' AND brand_id IS NULL;

-- Lido
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Lido')
WHERE name ILIKE '%Lido%' OR name ILIKE '%stETH%' AND brand_id IS NULL;

-- Rocket Pool
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Rocket Pool')
WHERE name ILIKE '%Rocket Pool%' OR name ILIKE '%rETH%' AND brand_id IS NULL;

-- Frax
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Frax Finance')
WHERE name ILIKE '%Frax%' AND brand_id IS NULL;

-- Ankr
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Ankr')
WHERE name ILIKE '%Ankr%' AND brand_id IS NULL;

-- Stader
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Stader Labs')
WHERE name ILIKE '%Stader%' AND brand_id IS NULL;

-- Marinade
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Marinade')
WHERE name ILIKE '%Marinade%' AND brand_id IS NULL;

-- Jito
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Jito')
WHERE name ILIKE '%Jito%' AND brand_id IS NULL;

-- Mantle
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Mantle')
WHERE name ILIKE '%Mantle%' AND name ILIKE '%mETH%' AND brand_id IS NULL;

-- EtherFi
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'EtherFi')
WHERE name ILIKE '%EtherFi%' OR name ILIKE '%Ether.fi%' OR name ILIKE '%eETH%' AND brand_id IS NULL;

-- Swell
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Swell')
WHERE name ILIKE '%Swell%' AND brand_id IS NULL;

-- Kelp DAO
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Kelp DAO')
WHERE name ILIKE '%Kelp%' AND brand_id IS NULL;

-- Renzo
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Renzo')
WHERE name ILIKE '%Renzo%' AND brand_id IS NULL;

-- Puffer
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Puffer')
WHERE name ILIKE '%Puffer%' AND brand_id IS NULL;

-- Eigenlayer
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Eigenlayer')
WHERE name ILIKE '%Eigenlayer%' OR name ILIKE '%Eigen%' AND brand_id IS NULL;

-- Yearn
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Yearn Finance')
WHERE name ILIKE '%Yearn%' OR name ILIKE '%YFI%' AND brand_id IS NULL;

-- Beefy
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Beefy Finance')
WHERE name ILIKE '%Beefy%' AND brand_id IS NULL;

-- Convex
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Convex Finance')
WHERE name ILIKE '%Convex%' AND brand_id IS NULL;

-- Pendle
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Pendle')
WHERE name ILIKE '%Pendle%' AND brand_id IS NULL;

-- Sommelier
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Sommelier')
WHERE name ILIKE '%Sommelier%' AND brand_id IS NULL;

-- GMX
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'GMX')
WHERE name ILIKE '%GMX%' AND brand_id IS NULL;

-- Gains Network
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Gains Network')
WHERE name ILIKE '%Gains%' OR name ILIKE '%gTrade%' AND brand_id IS NULL;

-- Synthetix
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Synthetix')
WHERE name ILIKE '%Synthetix%' OR name ILIKE '%SNX%' AND brand_id IS NULL;

-- Perpetual Protocol
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Perpetual Protocol')
WHERE name ILIKE '%Perpetual Protocol%' OR name ILIKE '%Perp Protocol%' AND brand_id IS NULL;

-- Kwenta
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Kwenta')
WHERE name ILIKE '%Kwenta%' AND brand_id IS NULL;

-- Vertex
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Vertex')
WHERE name ILIKE '%Vertex%' AND brand_id IS NULL;

-- Hyperliquid
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Hyperliquid')
WHERE name ILIKE '%Hyperliquid%' AND brand_id IS NULL;

-- LayerZero
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'LayerZero')
WHERE name ILIKE '%LayerZero%' AND brand_id IS NULL;

-- Wormhole
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Wormhole')
WHERE name ILIKE '%Wormhole%' AND brand_id IS NULL;

-- Stargate
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Stargate')
WHERE name ILIKE '%Stargate%' AND brand_id IS NULL;

-- Across
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Across Protocol')
WHERE name ILIKE '%Across%' AND brand_id IS NULL;

-- Hop Protocol
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Hop Protocol')
WHERE name ILIKE '%Hop%' AND brand_id IS NULL;

-- Synapse
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Synapse')
WHERE name ILIKE '%Synapse%' AND brand_id IS NULL;

-- Celer
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Celer')
WHERE name ILIKE '%Celer%' AND brand_id IS NULL;

-- Axelar
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Axelar')
WHERE name ILIKE '%Axelar%' AND brand_id IS NULL;

-- USDC / Circle
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Circle')
WHERE name ILIKE '%USDC%' AND brand_id IS NULL;

-- USDT / Tether
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Tether')
WHERE name ILIKE '%USDT%' OR name ILIKE '%Tether%' AND brand_id IS NULL;

-- PYUSD / PayPal
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'PayPal')
WHERE name ILIKE '%PYUSD%' AND brand_id IS NULL;

-- LUSD / Liquity
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Liquity')
WHERE name ILIKE '%LUSD%' OR name ILIKE '%Liquity%' AND brand_id IS NULL;

-- USDe / Ethena
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Ethena')
WHERE name ILIKE '%Ethena%' OR name ILIKE '%USDe%' AND brand_id IS NULL;

-- Ondo
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Ondo Finance')
WHERE name ILIKE '%Ondo%' AND brand_id IS NULL;

-- Mountain Protocol
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Mountain Protocol')
WHERE name ILIKE '%Mountain%' OR name ILIKE '%USDM%' AND brand_id IS NULL;

-- SEBA Bank
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'SEBA Bank')
WHERE name ILIKE '%SEBA%' AND brand_id IS NULL;

-- Sygnum
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Sygnum')
WHERE name ILIKE '%Sygnum%' AND brand_id IS NULL;

-- Anchorage
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Anchorage Digital')
WHERE name ILIKE '%Anchorage%' AND brand_id IS NULL;

-- Revolut
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Revolut')
WHERE name ILIKE '%Revolut%' AND brand_id IS NULL;

-- Wirex
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Wirex')
WHERE name ILIKE '%Wirex%' AND brand_id IS NULL;

-- Nexo
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Nexo')
WHERE name ILIKE '%Nexo%' AND brand_id IS NULL;

-- Gnosis Pay
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Gnosis')
WHERE name ILIKE '%Gnosis%' AND brand_id IS NULL;

-- Holyheld
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Holyheld')
WHERE name ILIKE '%Holyheld%' AND brand_id IS NULL;

-- DeBank
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'DeBank')
WHERE name ILIKE '%DeBank%' AND brand_id IS NULL;

-- Zapper
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Zapper')
WHERE name ILIKE '%Zapper%' AND brand_id IS NULL;

-- Nansen
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Nansen')
WHERE name ILIKE '%Nansen%' AND brand_id IS NULL;

-- DeFiLlama
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'DeFiLlama')
WHERE name ILIKE '%DeFiLlama%' OR name ILIKE '%DefiLlama%' AND brand_id IS NULL;

-- Dune
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Dune')
WHERE name ILIKE '%Dune%' AND brand_id IS NULL;

-- Casa
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Casa')
WHERE name ILIKE '%Casa%' AND brand_id IS NULL;

-- Unchained
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Unchained')
WHERE name ILIKE '%Unchained%' AND brand_id IS NULL;

-- Fireblocks
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Fireblocks')
WHERE name ILIKE '%Fireblocks%' AND brand_id IS NULL;

-- BitGo
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'BitGo')
WHERE name ILIKE '%BitGo%' AND brand_id IS NULL;

-- Copper
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Copper')
WHERE name ILIKE '%Copper%' AND brand_id IS NULL;

-- ============================================================
-- 3. VERIFICATION
-- ============================================================

SELECT
    'Products with brand assigned' as metric,
    COUNT(*) as count
FROM products
WHERE brand_id IS NOT NULL

UNION ALL

SELECT
    'Products without brand' as metric,
    COUNT(*) as count
FROM products
WHERE brand_id IS NULL;

-- List products without brand (to add manually if needed)
SELECT p.name, p.slug, pt.name as product_type
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
WHERE p.brand_id IS NULL
ORDER BY p.name;

-- ============================================================
-- END OF SCRIPT
-- ============================================================

SELECT 'Product brands updated successfully!' as status;
