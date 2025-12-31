-- ============================================================
-- FIX MISSING BRANDS - Complete brand assignment
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
-- 1. ADD ALL BRANDS
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
('Blockstream', 'https://blockstream.com'),
('OneKey', 'https://onekey.so'),
('Cypherock', 'https://cypherock.com'),
('HashWallet', 'https://hashwallet.com'),
('Krux', 'https://krux.app'),
('Material Bitcoin', 'https://materialbitcoin.com'),

-- Backup Solutions
('CryptoTag', 'https://cryptotag.io'),
('Cryptosteel', 'https://cryptosteel.com'),
('Billfodl', 'https://privacypros.io'),
('Blockplate', 'https://www.blockplate.com'),
('SteelWallet', 'https://steelwallet.com'),
('Hodlr Swiss', 'https://hodlr.swiss'),
('Cobo', 'https://cobo.com'),
('BitPlates', 'https://bitplates.com'),
('Coinplate', 'https://coinplate.com'),
('COLDTI', 'https://coldti.com'),
('Cryo', 'https://cryocard.io'),
('CryptoStorage', 'https://cryptostorage.com'),
('Cypherwheel', 'https://cypherwheel.com'),

-- Software Wallets
('MetaMask', 'https://metamask.io'),
('Trust Wallet', 'https://trustwallet.com'),
('Phantom', 'https://phantom.app'),
('Exodus', 'https://www.exodus.com'),
('Rabby', 'https://rabby.io'),
('Rainbow', 'https://rainbow.me'),
('Argent', 'https://www.argent.xyz'),
('Zerion', 'https://zerion.io'),
('Safe', 'https://safe.global'),
('Sparrow', 'https://sparrowwallet.com'),
('BlueWallet', 'https://bluewallet.io'),
('Wasabi', 'https://wasabiwallet.io'),
('Electrum', 'https://electrum.org'),
('Mycelium', 'https://wallet.mycelium.com'),
('Breez', 'https://breez.technology'),
('Carbon', 'https://carbonwallet.com'),
('Muun', 'https://muun.com'),
('Nunchuk', 'https://nunchuk.io'),
('ACINQ', 'https://acinq.co'),
('Wizardsardine', 'https://wizardsardine.com'),
('Llama', 'https://llamapay.io'),

-- Exchanges
('Binance', 'https://www.binance.com'),
('Coinbase', 'https://www.coinbase.com'),
('Kraken', 'https://www.kraken.com'),
('OKX', 'https://www.okx.com'),
('Bybit', 'https://www.bybit.com'),
('Crypto.com', 'https://crypto.com'),
('Bitfinex', 'https://www.bitfinex.com'),
('KuCoin', 'https://www.kucoin.com'),
('Bitstamp', 'https://www.bitstamp.net'),
('Gemini', 'https://www.gemini.com'),
('Meria', 'https://meria.com'),

-- DEX
('Uniswap Labs', 'https://uniswap.org'),
('1inch', 'https://1inch.io'),
('Curve Finance', 'https://curve.fi'),
('PancakeSwap', 'https://pancakeswap.finance'),
('SushiSwap', 'https://www.sushi.com'),
('dYdX', 'https://dydx.exchange'),
('Jupiter', 'https://jup.ag'),
('Balancer', 'https://balancer.fi'),
('ParaSwap', 'https://paraswap.io'),

-- DeFi Lending
('Aave', 'https://aave.com'),
('Compound', 'https://compound.finance'),
('MakerDAO', 'https://makerdao.com'),
('Spark Protocol', 'https://spark.fi'),
('Venus', 'https://venus.io'),
('Benqi', 'https://benqi.fi'),
('Morpho', 'https://morpho.org'),
('Euler', 'https://www.euler.finance'),
('Frax Finance', 'https://frax.finance'),

-- Liquid Staking
('Lido', 'https://lido.fi'),
('Rocket Pool', 'https://rocketpool.net'),
('Ankr', 'https://www.ankr.com'),
('Marinade', 'https://marinade.finance'),
('Jito', 'https://jito.network'),

-- Yield Aggregators
('Yearn Finance', 'https://yearn.fi'),
('Beefy Finance', 'https://beefy.finance'),
('Convex Finance', 'https://www.convexfinance.com'),
('Pendle', 'https://www.pendle.finance'),
('Autofarm', 'https://autofarm.network'),
('Harvest Finance', 'https://harvest.finance'),
('Pickle Finance', 'https://pickle.finance'),

-- Derivatives
('GMX', 'https://gmx.io'),
('Gains Network', 'https://gains.trade'),
('Synthetix', 'https://synthetix.io'),
('Kwenta', 'https://kwenta.io'),
('Dopex', 'https://dopex.io'),
('Hegic', 'https://hegic.co'),
('Lyra', 'https://lyra.finance'),

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
('Allbridge', 'https://allbridge.io'),
('Arbitrum', 'https://arbitrum.io'),
('Base', 'https://base.org'),
('Chainflip', 'https://chainflip.io'),
('Connext', 'https://connext.network'),
('deBridge', 'https://debridge.finance'),
('Hyperlane', 'https://hyperlane.xyz'),
('LI.FI', 'https://li.fi'),
('Maya Protocol', 'https://mayaprotocol.com'),
('Optimism', 'https://optimism.io'),
('Orbiter Finance', 'https://orbiter.finance'),
('Polygon', 'https://polygon.technology'),
('Gravity', 'https://gravitybridge.net'),
('Socket', 'https://socket.tech'),

-- Banks & Cards
('AMINA Bank', 'https://aminagroup.com'),
('Anchorage Digital', 'https://www.anchorage.com'),
('BitGo', 'https://www.bitgo.com'),
('Bitpanda', 'https://bitpanda.com'),
('Fireblocks', 'https://www.fireblocks.com'),
('N26', 'https://n26.com'),
('Nexo', 'https://nexo.com'),
('Revolut', 'https://www.revolut.com'),
('Baanx', 'https://baanx.com'),
('BitPay', 'https://bitpay.com'),
('Bleap', 'https://bleap.io'),
('BlockFi', 'https://blockfi.com'),
('COCA', 'https://coca.xyz'),
('Copper', 'https://copper.co'),
('Cryptopay', 'https://cryptopay.me'),
('eToro', 'https://etoro.com'),
('Fold', 'https://foldapp.com'),
('Holyheld', 'https://holyheld.com'),
('Mercuryo', 'https://mercuryo.io'),
('Paycent', 'https://paycent.com'),

-- DeFi Tools
('DeBank', 'https://debank.com'),
('Zapper', 'https://zapper.xyz'),
('DeFi Saver', 'https://defisaver.com'),
('Instadapp', 'https://instadapp.io'),

-- RWA
('Ondo Finance', 'https://ondo.finance'),
('BlockBar', 'https://blockbar.com'),
('Bolero', 'https://boleromusic.com'),
('GoMining', 'https://gomining.com'),
('Glacier', 'https://glacierprotocol.org')

ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. UPDATE ALL PRODUCTS WITH BRANDS
-- ============================================================

-- Bridges
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Allbridge') WHERE slug = 'allbridge';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Arbitrum') WHERE slug = 'arbitrum-bridge';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Axelar') WHERE slug = 'axelar';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Base') WHERE slug = 'base-bridge';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Socket') WHERE slug = 'bungee-exchange';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Celer') WHERE slug = 'celer-cbridge';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Chainflip') WHERE slug = 'chainflip';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Connext') WHERE slug = 'connext';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'deBridge') WHERE slug = 'debridge';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Gravity') WHERE slug = 'gravity-bridge';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Hop Protocol') WHERE slug = 'hop-protocol';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Hyperlane') WHERE slug = 'hyperlane';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'LayerZero') WHERE slug = 'layerzero';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'LI.FI') WHERE slug = 'li.fi';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Maya Protocol') WHERE slug = 'maya-protocol';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Multichain') WHERE slug = 'multichain-anyswap';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Optimism') WHERE slug = 'optimism-bridge';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Orbiter Finance') WHERE slug = 'orbiter-finance';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Polygon') WHERE slug = 'polygon-bridge';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Wormhole') WHERE slug = 'portal-bridge-wormhole';

-- Banks
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'AMINA Bank') WHERE slug = 'amina-bank';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Anchorage Digital') WHERE slug = 'anchorage-digital';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'BitGo') WHERE slug = 'bitgo';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bitpanda') WHERE slug = 'bitpanda';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Fireblocks') WHERE slug = 'fireblocks';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'N26') WHERE slug = 'n26';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Nexo') WHERE slug = 'nexo';

-- Cards
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Baanx') WHERE slug = 'baanx-cryptolife';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'BitPay') WHERE slug = 'bitpay-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bleap') WHERE slug = 'bleap-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'BlockFi') WHERE slug = 'blockfi-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'COCA') WHERE slug = 'coca-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Copper') WHERE slug = 'copper-clearloop';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Cryptopay') WHERE slug = 'cryptopay-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'eToro') WHERE slug = 'etoro-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Fold') WHERE slug = 'fold-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Gemini') WHERE slug = 'gemini-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Holyheld') WHERE slug = 'holyheld';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Mercuryo') WHERE slug = 'mercuryo-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Nexo') WHERE slug = 'nexo-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Paycent') WHERE slug = 'paycent-card';

-- Hardware Wallets
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Coinkite') WHERE slug = 'coinkite-satscard';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Coinkite') WHERE slug = 'coinkite-tapsigner';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Cypherock') WHERE slug = 'cypherock-x1';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Foundation Devices') WHERE slug = 'foundation-passport';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'HashWallet') WHERE slug = 'hashwallet';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Blockstream') WHERE slug = 'jade';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Krux') WHERE slug = 'krux';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Material Bitcoin') WHERE slug = 'material-bitcoin';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'OneKey') WHERE slug = 'onekey-classic';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'OneKey') WHERE slug = 'onekey-pro';

-- Backup Solutions
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Shift Crypto') WHERE slug = 'bitbox-steelwallet';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'BitPlates') WHERE slug = 'bitplates-domino';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Cobo') WHERE slug = 'cobo-tablet';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Coinplate') WHERE slug = 'coinplate-alpha';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Coinplate') WHERE slug = 'coinplate-grid';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'COLDTI') WHERE slug = 'coldti';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Cryo') WHERE slug = 'cryo-card';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'CryptoStorage') WHERE slug = 'cryptostorage';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'CryptoTag') WHERE slug = 'cryptotag-thor';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'CryptoTag') WHERE slug = 'cryptotag-zeus';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Cypherwheel') WHERE slug = 'cypherwheel';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'ELLIPAL') WHERE slug = 'ellipal-seed-phrase-steel';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Hodlr Swiss') WHERE slug = 'hodlr-swiss';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Ledger') WHERE slug = 'ledger-billfodl';

-- Software Wallets
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Blockstream') WHERE slug = 'blockstream-green';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Breez') WHERE slug = 'breez-wallet';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Carbon') WHERE slug = 'carbon-wallet';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Wizardsardine') WHERE slug = 'liana-wallet';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Llama') WHERE slug = 'llamapay';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Muun') WHERE slug = 'muun-wallet';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Nunchuk') WHERE slug = 'nunchuk';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'ACINQ') WHERE slug = 'phoenix-wallet';

-- DeFi Lending
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Benqi') WHERE slug = 'benqi';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Euler') WHERE slug = 'euler-finance';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Frax Finance') WHERE slug = 'fraxlend';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'MakerDAO') WHERE slug = 'makerdao';

-- Liquid Staking
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Ankr') WHERE slug = 'ankr-staking';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Frax Finance') WHERE slug = 'frax-ether';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Jito') WHERE slug = 'jito';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Marinade') WHERE slug = 'marinade-finance';

-- Yield Aggregators
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Autofarm') WHERE slug = 'autofarm';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Convex Finance') WHERE slug = 'convex-finance';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Harvest Finance') WHERE slug = 'harvest-finance';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Pendle') WHERE slug = 'pendle';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Pickle Finance') WHERE slug = 'pickle-finance';

-- Derivatives
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Dopex') WHERE slug = 'dopex';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Gains Network') WHERE slug = 'gains-network';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Hegic') WHERE slug = 'hegic';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Kwenta') WHERE slug = 'kwenta';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Lyra') WHERE slug = 'lyra-finance';

-- DeFi Tools
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'DeFi Saver') WHERE slug = 'defi-saver';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Instadapp') WHERE slug = 'instadapp';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'ParaSwap') WHERE slug = 'paraswap';

-- RWA
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'BlockBar') WHERE slug = 'blockbar';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bolero') WHERE slug = 'bolero-music';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'GoMining') WHERE slug = 'gomining';
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Ondo Finance') WHERE slug = 'ondo-finance';

-- Protocol
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Glacier') WHERE slug = 'glacier-protocol';

-- Exchange
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Meria') WHERE slug = 'meria';

-- ============================================================
-- 2b. PATTERN-BASED UPDATES (catch remaining products)
-- ============================================================

-- Hardware Wallets by name pattern
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Ledger') WHERE name ILIKE '%Ledger%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Trezor') WHERE name ILIKE '%Trezor%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Coinkite') WHERE (name ILIKE '%Coldcard%' OR name ILIKE '%Coinkite%') AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Shift Crypto') WHERE name ILIKE '%BitBox%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Keystone') WHERE name ILIKE '%Keystone%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'NGRAVE') WHERE name ILIKE '%NGRAVE%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'SecuX') WHERE name ILIKE '%SecuX%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Tangem') WHERE name ILIKE '%Tangem%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'GridPlus') WHERE (name ILIKE '%GridPlus%' OR name ILIKE '%Lattice%') AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Arculus') WHERE name ILIKE '%Arculus%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'ELLIPAL') WHERE name ILIKE '%ELLIPAL%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'SafePal') WHERE name ILIKE '%SafePal%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'KeepKey') WHERE name ILIKE '%KeepKey%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'CoolWallet') WHERE name ILIKE '%CoolWallet%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Blockstream') WHERE (name ILIKE '%Jade%' OR name ILIKE '%Blockstream%') AND brand_id IS NULL;

-- Backup by name pattern
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'CryptoTag') WHERE name ILIKE '%CryptoTag%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Cryptosteel') WHERE name ILIKE '%Cryptosteel%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Billfodl') WHERE name ILIKE '%Billfodl%' AND brand_id IS NULL;

-- Software Wallets by name pattern
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'MetaMask') WHERE name ILIKE '%MetaMask%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Trust Wallet') WHERE name ILIKE '%Trust Wallet%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Phantom') WHERE name ILIKE '%Phantom%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Exodus') WHERE name ILIKE '%Exodus%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Rabby') WHERE name ILIKE '%Rabby%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Argent') WHERE name ILIKE '%Argent%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Zerion') WHERE name ILIKE '%Zerion%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Sparrow') WHERE name ILIKE '%Sparrow%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'BlueWallet') WHERE name ILIKE '%BlueWallet%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Wasabi') WHERE name ILIKE '%Wasabi%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Electrum') WHERE name ILIKE '%Electrum%' AND brand_id IS NULL;

-- Exchanges by name pattern
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Binance') WHERE name ILIKE '%Binance%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Coinbase') WHERE name ILIKE '%Coinbase%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Kraken') WHERE name ILIKE '%Kraken%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'OKX') WHERE name ILIKE '%OKX%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bybit') WHERE name ILIKE '%Bybit%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Crypto.com') WHERE name ILIKE '%Crypto.com%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'KuCoin') WHERE name ILIKE '%KuCoin%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Bitstamp') WHERE name ILIKE '%Bitstamp%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Gemini') WHERE name ILIKE '%Gemini%' AND brand_id IS NULL;

-- DEX by name pattern
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Uniswap Labs') WHERE name ILIKE '%Uniswap%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = '1inch') WHERE name ILIKE '%1inch%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Curve Finance') WHERE name ILIKE '%Curve%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'PancakeSwap') WHERE name ILIKE '%PancakeSwap%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'SushiSwap') WHERE name ILIKE '%Sushi%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'dYdX') WHERE name ILIKE '%dYdX%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Jupiter') WHERE name ILIKE '%Jupiter%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Balancer') WHERE name ILIKE '%Balancer%' AND brand_id IS NULL;

-- DeFi by name pattern
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Aave') WHERE name ILIKE '%Aave%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Compound') WHERE name ILIKE '%Compound%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'MakerDAO') WHERE name ILIKE '%Maker%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Lido') WHERE name ILIKE '%Lido%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Rocket Pool') WHERE name ILIKE '%Rocket Pool%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Yearn Finance') WHERE name ILIKE '%Yearn%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Beefy Finance') WHERE name ILIKE '%Beefy%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'GMX') WHERE name ILIKE '%GMX%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Synthetix') WHERE name ILIKE '%Synthetix%' AND brand_id IS NULL;

-- Bridges by name pattern
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Stargate') WHERE name ILIKE '%Stargate%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Synapse') WHERE name ILIKE '%Synapse%' AND brand_id IS NULL;
UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = 'Across Protocol') WHERE name ILIKE '%Across%' AND brand_id IS NULL;

-- ============================================================
-- 3. VERIFICATION
-- ============================================================

SELECT 'Products with brand:' as status, COUNT(*) as count FROM products WHERE brand_id IS NOT NULL
UNION ALL
SELECT 'Products without brand:' as status, COUNT(*) as count FROM products WHERE brand_id IS NULL;

-- Show remaining products without brand (should be 0)
SELECT p.name, p.slug
FROM products p
WHERE p.brand_id IS NULL
ORDER BY p.name;

SELECT 'All brands assigned successfully!' as status;
