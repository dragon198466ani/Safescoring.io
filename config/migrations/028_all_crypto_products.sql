-- ============================================================
-- Migration 028: Comprehensive Crypto Products Addition
-- ============================================================
-- Adds ALL major crypto products missing from the database
-- Organized by category for easy maintenance
-- ============================================================

-- ============================================================
-- SECTION 1: HARDWARE WALLETS (Missing)
-- ============================================================

-- Ensure brands exist
INSERT INTO brands (name, website) VALUES
    ('OneKey', 'https://onekey.so'),
    ('Cypherock', 'https://cypherock.com'),
    ('ProKey', 'https://prokey.io'),
    ('BitLox', 'https://bitlox.com'),
    ('Material Bitcoin', 'https://materialbitcoin.com'),
    ('Blockstream', 'https://blockstream.com'),
    ('SeedSigner', 'https://seedsigner.com'),
    ('Krux', 'https://selfcustody.github.io/krux'),
    ('Satochip', 'https://satochip.io'),
    ('Coinkite', 'https://coinkite.com')
ON CONFLICT (name) DO NOTHING;

-- OneKey Hardware Wallets
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'onekey-classic',
    'OneKey Classic',
    'Open-source hardware wallet from OneKey with Secure Element chip. Features a 2.4-inch touchscreen, Bluetooth connectivity, and supports 1000+ cryptocurrencies. Popular in Asian markets with competitive pricing.',
    'Open-source hardware wallet with touchscreen and Bluetooth',
    'https://onekey.so/hardware/classic',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'OneKey'),
    'Hong Kong',
    'HK',
    'pending'
),
(
    'onekey-classic-1s',
    'OneKey Classic 1S',
    'Compact version of OneKey Classic with smaller form factor. Features OLED display and physical buttons. Entry-level open-source hardware wallet with strong security features.',
    'Compact open-source hardware wallet with OLED display',
    'https://onekey.so/hardware/classic-1s',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'OneKey'),
    'Hong Kong',
    'HK',
    'pending'
),
(
    'onekey-pro',
    'OneKey Pro',
    'Premium hardware wallet from OneKey featuring a 3.5-inch AMOLED display, fingerprint sensor, and air-gapped QR code signing. Supports wireless charging and has premium aluminum casing.',
    'Premium hardware wallet with fingerprint and air-gap support',
    'https://onekey.so/hardware/pro',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'OneKey'),
    'Hong Kong',
    'HK',
    'pending'
),
(
    'onekey-touch',
    'OneKey Touch',
    'Mid-range hardware wallet with large touchscreen display. Combines the portability of Classic with the screen quality of Pro. Supports USB-C and Bluetooth connectivity.',
    'Mid-range touchscreen hardware wallet',
    'https://onekey.so/hardware/touch',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'OneKey'),
    'Hong Kong',
    'HK',
    'pending'
)
ON CONFLICT DO NOTHING;

-- Cypherock X1
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES (
    'cypherock-x1',
    'Cypherock X1',
    'Innovative hardware wallet using Shamir Secret Sharing to split seed across 4 NFC cards. No single point of failure - requires 2 of 4 cards to recover. Features EAL6+ Secure Element and is completely air-gapped.',
    'Hardware wallet with seed split across 4 NFC cards',
    'https://cypherock.com',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Cypherock'),
    'Singapore',
    'SG',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ProKey Optimum
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES (
    'prokey-optimum',
    'ProKey Optimum',
    'Budget-friendly open-source hardware wallet based on Trezor firmware. Features color touchscreen and supports 1000+ coins. Web-based interface with no desktop app required.',
    'Budget open-source hardware wallet with touchscreen',
    'https://prokey.io',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'ProKey'),
    'Estonia',
    'EE',
    'pending'
)
ON CONFLICT DO NOTHING;

-- BitLox
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES (
    'bitlox-advanced',
    'BitLox Advanced',
    'Military-grade titanium hardware wallet with extreme durability. Features tamper-proof design, EMP resistance, and advanced security options. Premium choice for high-value storage.',
    'Military-grade titanium hardware wallet',
    'https://bitlox.com',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'BitLox'),
    'Hong Kong',
    'HK',
    'pending'
)
ON CONFLICT DO NOTHING;

-- SeedSigner (DIY)
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES (
    'seedsigner',
    'SeedSigner',
    'Open-source DIY hardware wallet built on Raspberry Pi Zero. Completely air-gapped with QR code communication. Bitcoin-only with PSBT support. Popular among Bitcoin maximalists for its transparency.',
    'Open-source DIY air-gapped Bitcoin signing device',
    'https://seedsigner.com',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'SeedSigner'),
    'Open Source Project',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- Krux
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES (
    'krux',
    'Krux',
    'Open-source air-gapped signing device similar to SeedSigner. Runs on various low-cost hardware. Bitcoin-only with full PSBT support and QR code signing. Can be built from commodity hardware.',
    'Open-source air-gapped Bitcoin signing device',
    'https://selfcustody.github.io/krux',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Krux'),
    'Open Source Project',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- Satochip
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES (
    'satochip',
    'Satochip',
    'Smart card-based hardware wallet in credit card form factor. Uses JavaCard technology with Secure Element. Affordable option for Bitcoin and Ethereum storage. Works with companion app.',
    'Smart card hardware wallet in credit card form factor',
    'https://satochip.io',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Satochip'),
    'Belgium',
    'BE',
    'pending'
)
ON CONFLICT DO NOTHING;

-- Blockstream Jade Plus
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES (
    'blockstream-jade-plus',
    'Blockstream Jade Plus',
    'Enhanced version of Jade with larger screen and camera for QR code signing. Fully air-gapped operation possible. Open-source firmware with blind oracle for stateless operation.',
    'Open-source hardware wallet with camera and air-gap support',
    'https://blockstream.com/jade',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Blockstream'),
    'Victoria, Canada',
    'CA',
    'pending'
)
ON CONFLICT DO NOTHING;

-- COLDCARD Q
INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES (
    'coldcard-q1',
    'COLDCARD Q1',
    'Premium Bitcoin-only hardware wallet with full QWERTY keyboard and large screen. Features QR code camera, NFC tap-to-sign, and advanced multisig support. Ultimate Bitcoin signing device.',
    'Premium Bitcoin hardware wallet with QWERTY keyboard',
    'https://coldcard.com/q',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Coinkite'),
    'Toronto, Canada',
    'CA',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 2: SOFTWARE WALLETS - CARDANO ECOSYSTEM
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('EMURGO', 'https://emurgo.io'),
    ('IOHK', 'https://iohk.io'),
    ('dcSpark', 'https://dcspark.io'),
    ('Sundae Labs', 'https://sundaeswap.finance'),
    ('Lace', 'https://www.lace.io')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'yoroi-wallet',
    'Yoroi Wallet',
    'Light wallet for Cardano developed by EMURGO. Available as browser extension and mobile app. Supports ADA staking, NFTs, and dApp connector. Does not store full blockchain locally.',
    'Official Cardano light wallet by EMURGO',
    'https://yoroi-wallet.com',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'EMURGO'),
    'Singapore',
    'SG',
    'pending'
),
(
    'daedalus-wallet',
    'Daedalus Wallet',
    'Full-node desktop wallet for Cardano developed by IOHK. Downloads and validates entire Cardano blockchain. Most secure option for Cardano with full validation. Supports staking and hardware wallets.',
    'Full-node Cardano desktop wallet by IOHK',
    'https://daedaluswallet.io',
    (SELECT id FROM product_types WHERE code = 'SW Desktop'),
    (SELECT id FROM brands WHERE name = 'IOHK'),
    'Wyoming, USA',
    'US',
    'pending'
),
(
    'nami-wallet',
    'Nami Wallet',
    'Minimalist Cardano browser extension wallet. Simple interface focused on essential features. Popular for DeFi and NFT interactions on Cardano. Supports hardware wallet integration.',
    'Minimalist Cardano browser extension wallet',
    'https://namiwallet.io',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    NULL,
    'Open Source Project',
    NULL,
    'pending'
),
(
    'eternl-wallet',
    'Eternl Wallet',
    'Advanced Cardano wallet with multi-account support. Features dApp browser, NFT gallery, and advanced staking options. One of the most feature-rich Cardano wallets available.',
    'Advanced multi-account Cardano wallet',
    'https://eternl.io',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    NULL,
    'Open Source Project',
    NULL,
    'pending'
),
(
    'flint-wallet',
    'Flint Wallet',
    'Cardano and Milkomeda wallet with focus on simplicity. Supports both Cardano L1 and Milkomeda sidechain. Popular for cross-chain DeFi interactions.',
    'Cardano and Milkomeda cross-chain wallet',
    'https://flint-wallet.com',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'dcSpark'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'lace-wallet',
    'Lace Wallet',
    'Official Cardano light wallet by IOG (formerly IOHK). Modern interface with built-in DeFi features, NFT gallery, and staking. Designed as the next-generation Cardano wallet experience.',
    'Official next-gen Cardano wallet by IOG',
    'https://www.lace.io',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Lace'),
    'Wyoming, USA',
    'US',
    'pending'
),
(
    'typhon-wallet',
    'Typhon Wallet',
    'Feature-rich Cardano wallet with advanced transaction builder. Supports complex transactions, multi-sig, and script interactions. Popular among Cardano developers.',
    'Advanced Cardano wallet with transaction builder',
    'https://typhonwallet.io',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    NULL,
    'Open Source Project',
    NULL,
    'pending'
),
(
    'vespr-wallet',
    'Vespr Wallet',
    'Mobile-first Cardano wallet with clean interface. Features staking, NFT support, and dApp connector. Focus on user experience and accessibility.',
    'Mobile-first Cardano wallet',
    'https://vespr.xyz',
    (SELECT id FROM product_types WHERE code = 'SW Mobile'),
    NULL,
    'Open Source Project',
    NULL,
    'pending'
),
(
    'gero-wallet',
    'Gero Wallet',
    'Cardano browser extension wallet with integrated DEX. Features in-wallet swaps, staking, and NFT management. User-friendly interface for Cardano ecosystem.',
    'Cardano wallet with integrated DEX',
    'https://gerowallet.io',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    NULL,
    'Open Source Project',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 3: SOFTWARE WALLETS - POLKADOT/KUSAMA ECOSYSTEM
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Parity Technologies', 'https://parity.io'),
    ('Talisman', 'https://talisman.xyz'),
    ('SubWallet', 'https://subwallet.app'),
    ('Fearless Wallet', 'https://fearlesswallet.io'),
    ('Nova Foundation', 'https://novawallet.io')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'polkadot-js',
    'Polkadot.js Extension',
    'Official browser extension for Polkadot ecosystem. Core wallet for managing DOT, KSM, and all parachains. Used as the reference implementation for Polkadot account management.',
    'Official Polkadot browser extension wallet',
    'https://polkadot.js.org/extension',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Parity Technologies'),
    'Berlin, Germany',
    'DE',
    'pending'
),
(
    'talisman-wallet',
    'Talisman Wallet',
    'Multi-chain wallet for Polkadot, Ethereum, and 100+ networks. Beautiful interface with portfolio tracking, NFT gallery, and cross-chain swaps. Supports both EVM and Substrate chains.',
    'Multi-chain wallet for Polkadot and Ethereum ecosystems',
    'https://talisman.xyz',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Talisman'),
    'Sydney, Australia',
    'AU',
    'pending'
),
(
    'subwallet',
    'SubWallet',
    'Comprehensive Polkadot and Substrate wallet. Supports 150+ networks with staking, NFTs, and crowdloans. Available as browser extension and mobile app. Clean and intuitive interface.',
    'Comprehensive Polkadot ecosystem wallet',
    'https://subwallet.app',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'SubWallet'),
    'Vietnam',
    'VN',
    'pending'
),
(
    'fearless-wallet',
    'Fearless Wallet',
    'Mobile-first wallet for Polkadot and Kusama. Focus on staking with detailed validator information. Features crowdloan participation and cross-chain transfers.',
    'Mobile-first Polkadot staking wallet',
    'https://fearlesswallet.io',
    (SELECT id FROM product_types WHERE code = 'SW Mobile'),
    (SELECT id FROM brands WHERE name = 'Fearless Wallet'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'nova-wallet',
    'Nova Wallet',
    'Feature-rich mobile wallet for Polkadot ecosystem. Supports 70+ networks with governance, staking, and NFTs. Built by former Fearless Wallet team with enhanced features.',
    'Feature-rich mobile wallet for Polkadot ecosystem',
    'https://novawallet.io',
    (SELECT id FROM product_types WHERE code = 'SW Mobile'),
    (SELECT id FROM brands WHERE name = 'Nova Foundation'),
    'Open Source Project',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 4: SOFTWARE WALLETS - COSMOS ECOSYSTEM
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Cosmostation', 'https://cosmostation.io'),
    ('Leap Wallet', 'https://leapwallet.io'),
    ('Keplr', 'https://keplr.app')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'cosmostation-wallet',
    'Cosmostation Wallet',
    'Popular Cosmos ecosystem wallet supporting 50+ IBC chains. Features staking, governance voting, and IBC transfers. Available as browser extension, mobile app, and web interface.',
    'Popular Cosmos ecosystem multi-chain wallet',
    'https://cosmostation.io',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Cosmostation'),
    'Seoul, South Korea',
    'KR',
    'pending'
),
(
    'leap-wallet',
    'Leap Wallet',
    'Modern Cosmos ecosystem wallet with sleek interface. Supports 50+ chains with integrated DEX aggregator. Features NFT gallery and governance participation.',
    'Modern Cosmos wallet with DEX aggregator',
    'https://leapwallet.io',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Leap Wallet'),
    'Singapore',
    'SG',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 5: SOFTWARE WALLETS - MOVE CHAINS (APTOS/SUI)
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Martian', 'https://martianwallet.xyz'),
    ('Pontem Network', 'https://pontem.network'),
    ('Mysten Labs', 'https://mystenlabs.com'),
    ('Suiet', 'https://suiet.app'),
    ('Fewcha', 'https://fewcha.app')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'martian-wallet',
    'Martian Wallet',
    'Leading wallet for Aptos blockchain. Clean interface with integrated DEX, NFT marketplace access, and staking. Popular among Aptos users for its reliability and features.',
    'Leading Aptos blockchain wallet',
    'https://martianwallet.xyz',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Martian'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'pontem-wallet',
    'Pontem Wallet',
    'Multi-chain wallet supporting Aptos, Ethereum, and other networks. Features liquid staking and integrated bridge. Developed by Pontem Network team.',
    'Multi-chain wallet with Aptos focus',
    'https://pontem.network/pontem-wallet',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Pontem Network'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'sui-wallet',
    'Sui Wallet',
    'Official wallet for Sui blockchain by Mysten Labs. Chrome extension with staking, NFT support, and dApp connectivity. The reference wallet for Sui ecosystem.',
    'Official Sui blockchain wallet by Mysten Labs',
    'https://chrome.google.com/webstore/detail/sui-wallet',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Mysten Labs'),
    'Palo Alto, USA',
    'US',
    'pending'
),
(
    'suiet-wallet',
    'Suiet Wallet',
    'Open-source Sui wallet with clean interface. Supports all Sui features including staking and NFTs. Community-driven development with focus on user experience.',
    'Open-source Sui wallet with clean interface',
    'https://suiet.app',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Suiet'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'fewcha-wallet',
    'Fewcha Wallet',
    'Multi-chain Move wallet supporting Aptos and Sui. Features integrated swaps, NFT gallery, and gaming integrations. Popular in Asian markets.',
    'Multi-chain Move wallet for Aptos and Sui',
    'https://fewcha.app',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Fewcha'),
    'Vietnam',
    'VN',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 6: SOFTWARE WALLETS - OTHER CHAINS
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('HashPack', 'https://hashpack.app'),
    ('Blade Labs', 'https://bladewallet.io'),
    ('Sender Labs', 'https://sender.org'),
    ('Nightly', 'https://nightly.app'),
    ('Compass', 'https://compass.sei.io'),
    ('Fin', 'https://finwallet.com'),
    ('Kabila', 'https://kabila.app'),
    ('Station', 'https://station.terra.money')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
-- Hedera (HBAR)
(
    'hashpack-wallet',
    'HashPack Wallet',
    'Leading Hedera (HBAR) wallet with NFT gallery, staking, and dApp connector. Supports HTS tokens and Hedera smart contracts. Most popular wallet in Hedera ecosystem.',
    'Leading Hedera HBAR wallet',
    'https://hashpack.app',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'HashPack'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'blade-wallet',
    'Blade Wallet',
    'Mobile-first Hedera wallet by Blade Labs. Features HBAR staking, NFT support, and integration with Hedera DApps. Clean interface for Hedera ecosystem.',
    'Mobile Hedera wallet by Blade Labs',
    'https://bladewallet.io',
    (SELECT id FROM product_types WHERE code = 'SW Mobile'),
    (SELECT id FROM brands WHERE name = 'Blade Labs'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'kabila-wallet',
    'Kabila Wallet',
    'Hedera wallet with focus on NFT gaming. Supports HTS tokens and Hedera NFT standards. Popular for gaming integrations on Hedera.',
    'Hedera wallet for NFT gaming',
    'https://kabila.app',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Kabila'),
    'Open Source Project',
    NULL,
    'pending'
),
-- NEAR Protocol
(
    'sender-wallet',
    'Sender Wallet',
    'NEAR Protocol wallet with integrated staking and DeFi. Supports NEAR and all NEP tokens. Features account abstraction and social recovery.',
    'NEAR Protocol wallet with integrated DeFi',
    'https://sender.org',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Sender Labs'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'here-wallet',
    'HERE Wallet',
    'Mobile NEAR wallet with hot storage and staking. Features NEAR social features and easy onboarding. Popular for NEAR mobile users.',
    'Mobile NEAR wallet with social features',
    'https://herewallet.app',
    (SELECT id FROM product_types WHERE code = 'SW Mobile'),
    NULL,
    'Open Source Project',
    NULL,
    'pending'
),
(
    'meteor-wallet',
    'Meteor Wallet',
    'NEAR Protocol browser extension wallet. Clean interface with staking and NFT support. Good alternative to NEAR official wallet.',
    'NEAR Protocol browser extension wallet',
    'https://meteorwallet.app',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    NULL,
    'Open Source Project',
    NULL,
    'pending'
),
-- Sei Network
(
    'compass-wallet',
    'Compass Wallet',
    'Official Sei Network wallet. Supports SEI tokens, staking, and Sei DApps. Built specifically for Sei chain with optimized performance.',
    'Official Sei Network wallet',
    'https://compass.sei.io',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Compass'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'fin-wallet',
    'Fin Wallet',
    'Multi-chain Cosmos wallet with Sei support. Clean interface with IBC transfers and staking across multiple chains.',
    'Multi-chain Cosmos wallet with Sei support',
    'https://finwallet.com',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Fin'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Terra
(
    'terra-station',
    'Terra Station',
    'Official wallet for Terra blockchain. Supports LUNA, UST (deprecated), and Terra tokens. Features staking, governance, and IBC transfers. Adapted after Terra collapse.',
    'Official Terra blockchain wallet',
    'https://station.terra.money',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Station'),
    'Singapore',
    'SG',
    'pending'
),
-- Multi-chain
(
    'nightly-wallet',
    'Nightly Wallet',
    'Multi-chain wallet supporting Solana, Aptos, Sui, NEAR, and more. Universal interface for multiple Move and non-EVM chains. Growing ecosystem support.',
    'Multi-chain wallet for non-EVM chains',
    'https://nightly.app',
    (SELECT id FROM product_types WHERE code = 'SW Browser'),
    (SELECT id FROM brands WHERE name = 'Nightly'),
    'Open Source Project',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 7: CENTRALIZED EXCHANGES (Missing)
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Kraken', 'https://kraken.com'),
    ('Bibox', 'https://bibox.com'),
    ('AscendEX', 'https://ascendex.com'),
    ('CoinDCX', 'https://coindcx.com'),
    ('WazirX', 'https://wazirx.com'),
    ('ZebPay', 'https://zebpay.com'),
    ('CoinSwitch', 'https://coinswitch.co'),
    ('Bitrue', 'https://bitrue.com'),
    ('BTCC', 'https://btcc.com'),
    ('Deribit', 'https://deribit.com'),
    ('Bullish', 'https://bullish.com'),
    ('Bitkub', 'https://bitkub.com'),
    ('Korbit', 'https://korbit.co.kr'),
    ('Independent Reserve', 'https://independentreserve.com'),
    ('Swyftx', 'https://swyftx.com'),
    ('CoinSpot', 'https://coinspot.com.au'),
    ('Luno', 'https://luno.com'),
    ('Paxful', 'https://paxful.com'),
    ('Rain', 'https://rain.com'),
    ('BitOasis', 'https://bitoasis.net'),
    ('Coincheck', 'https://coincheck.com'),
    ('bitFlyer', 'https://bitflyer.com'),
    ('Zaif', 'https://zaif.jp'),
    ('BTCBOX', 'https://btcbox.co.jp')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'kraken',
    'Kraken',
    'US-based cryptocurrency exchange founded in 2011. Known for security and regulatory compliance. Offers spot, margin, and futures trading. One of the oldest and most trusted exchanges.',
    'US-based secure exchange founded in 2011',
    'https://kraken.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Kraken'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'kraken-pro',
    'Kraken Pro',
    'Advanced trading platform from Kraken with professional charting tools, order types, and API access. Lower fees for high-volume traders.',
    'Professional trading platform from Kraken',
    'https://pro.kraken.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Kraken'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'deribit',
    'Deribit',
    'Leading cryptocurrency derivatives exchange specializing in Bitcoin and Ethereum options and futures. Popular among institutional traders for options trading.',
    'Leading crypto options and derivatives exchange',
    'https://deribit.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Deribit'),
    'Panama',
    'PA',
    'pending'
),
(
    'bullish',
    'Bullish',
    'Institutional-grade cryptocurrency exchange backed by Block.one. Features hybrid order book with AMM liquidity. Focus on compliance and institutional services.',
    'Institutional-grade exchange by Block.one',
    'https://bullish.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Bullish'),
    'Hong Kong',
    'HK',
    'pending'
),
(
    'bibox',
    'Bibox',
    'AI-enhanced cryptocurrency exchange with spot and derivatives trading. Features grid trading bots and copy trading. Popular in Asian markets.',
    'AI-enhanced exchange with trading bots',
    'https://bibox.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Bibox'),
    'Estonia',
    'EE',
    'pending'
),
(
    'ascendex',
    'AscendEX',
    'Global cryptocurrency exchange formerly known as BitMax. Features spot, margin, and futures trading with staking services. Known for listing new tokens early.',
    'Global exchange formerly BitMax',
    'https://ascendex.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'AscendEX'),
    'Singapore',
    'SG',
    'pending'
),
(
    'bitrue',
    'Bitrue',
    'Singapore-based exchange with focus on XRP and altcoins. Features Power Piggy yield farming and BTR token utility. Popular for XRP community.',
    'Singapore exchange focused on XRP ecosystem',
    'https://bitrue.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Bitrue'),
    'Singapore',
    'SG',
    'pending'
),
-- Indian Exchanges
(
    'coindcx',
    'CoinDCX',
    'India largest cryptocurrency exchange. Offers spot trading, staking, and crypto loans. Compliant with Indian regulations and supports INR deposits.',
    'India largest cryptocurrency exchange',
    'https://coindcx.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'CoinDCX'),
    'Mumbai, India',
    'IN',
    'pending'
),
(
    'wazirx',
    'WazirX',
    'Indian cryptocurrency exchange acquired by Binance. Features P2P trading for INR and integration with Binance liquidity. Popular in India despite regulatory challenges.',
    'Indian exchange with Binance integration',
    'https://wazirx.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'WazirX'),
    'Mumbai, India',
    'IN',
    'pending'
),
(
    'zebpay',
    'ZebPay',
    'One of India oldest cryptocurrency exchanges, founded in 2014. Offers spot trading with INR support. Known for regulatory compliance in India.',
    'One of India oldest crypto exchanges',
    'https://zebpay.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'ZebPay'),
    'Singapore',
    'SG',
    'pending'
),
(
    'coinswitch',
    'CoinSwitch',
    'Indian crypto aggregator and exchange. Compares rates across exchanges for best prices. One of the most used crypto apps in India.',
    'Indian crypto aggregator with best rate comparison',
    'https://coinswitch.co',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'CoinSwitch'),
    'Bangalore, India',
    'IN',
    'pending'
),
-- Asian Exchanges
(
    'bitkub',
    'Bitkub',
    'Thailand largest cryptocurrency exchange. Fully regulated by Thai SEC. Features THB trading pairs and local payment methods.',
    'Thailand largest regulated crypto exchange',
    'https://bitkub.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Bitkub'),
    'Bangkok, Thailand',
    'TH',
    'pending'
),
(
    'korbit',
    'Korbit',
    'South Korean cryptocurrency exchange, one of the oldest in Korea. Fully compliant with Korean regulations. Features KRW trading pairs.',
    'Korean regulated cryptocurrency exchange',
    'https://korbit.co.kr',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Korbit'),
    'Seoul, South Korea',
    'KR',
    'pending'
),
(
    'coincheck',
    'Coincheck',
    'Japanese cryptocurrency exchange registered with JFSA. Recovered from 2018 hack and now under Monex Group. Features JPY trading and NFT marketplace.',
    'Japanese regulated exchange under Monex Group',
    'https://coincheck.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Coincheck'),
    'Tokyo, Japan',
    'JP',
    'pending'
),
(
    'bitflyer',
    'bitFlyer',
    'Japan largest cryptocurrency exchange by volume. Registered in Japan, US, and Europe. Known for strong security and regulatory compliance.',
    'Japan largest cryptocurrency exchange',
    'https://bitflyer.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'bitFlyer'),
    'Tokyo, Japan',
    'JP',
    'pending'
),
(
    'zaif',
    'Zaif',
    'Japanese cryptocurrency exchange with unique token offerings. Features Zaif payment system for merchants. Part of Japan regulated exchange ecosystem.',
    'Japanese exchange with merchant payment system',
    'https://zaif.jp',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Zaif'),
    'Tokyo, Japan',
    'JP',
    'pending'
),
-- Australian Exchanges
(
    'independent-reserve',
    'Independent Reserve',
    'Australian cryptocurrency exchange with AUD and NZD support. Institutional-grade security and insurance. Popular among Australian traders.',
    'Australian exchange with institutional security',
    'https://independentreserve.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Independent Reserve'),
    'Sydney, Australia',
    'AU',
    'pending'
),
(
    'swyftx',
    'Swyftx',
    'Australian cryptocurrency exchange with competitive fees. Features recurring buys, staking, and educational content. Growing platform in Australia.',
    'Australian exchange with competitive fees',
    'https://swyftx.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Swyftx'),
    'Brisbane, Australia',
    'AU',
    'pending'
),
(
    'coinspot',
    'CoinSpot',
    'Australia largest cryptocurrency exchange by users. Features 400+ coins, instant buy, and OTC desk. Known for beginner-friendly interface.',
    'Australia largest crypto exchange by users',
    'https://coinspot.com.au',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'CoinSpot'),
    'Melbourne, Australia',
    'AU',
    'pending'
),
-- African/MENA Exchanges
(
    'luno',
    'Luno',
    'Cryptocurrency exchange serving Africa, Europe, and Southeast Asia. Popular in South Africa and Nigeria. Features simple interface for beginners.',
    'Exchange serving Africa and emerging markets',
    'https://luno.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Luno'),
    'London, UK',
    'GB',
    'pending'
),
(
    'paxful',
    'Paxful',
    'Peer-to-peer Bitcoin marketplace with 300+ payment methods. Popular in Africa and developing countries. Features escrow protection for trades.',
    'P2P Bitcoin marketplace with 300+ payment methods',
    'https://paxful.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Paxful'),
    'New York, USA',
    'US',
    'pending'
),
(
    'rain',
    'Rain',
    'Middle East first licensed cryptocurrency exchange. Serves Bahrain, UAE, Saudi Arabia, and Kuwait. Fully regulated with Sharia-compliant options.',
    'Middle East first licensed crypto exchange',
    'https://rain.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Rain'),
    'Manama, Bahrain',
    'BH',
    'pending'
),
(
    'bitoasis',
    'BitOasis',
    'UAE-based cryptocurrency exchange serving MENA region. Features AED deposits and compliance with UAE regulations. Popular in Gulf countries.',
    'UAE-based exchange for MENA region',
    'https://bitoasis.net',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'BitOasis'),
    'Dubai, UAE',
    'AE',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 8: DEX & AMM PROTOCOLS (Missing)
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Jupiter', 'https://jup.ag'),
    ('Orca', 'https://orca.so'),
    ('Meteora', 'https://meteora.ag'),
    ('Raydium', 'https://raydium.io'),
    ('Osmosis', 'https://osmosis.zone'),
    ('Astroport', 'https://astroport.fi'),
    ('Minswap', 'https://minswap.org'),
    ('SundaeSwap', 'https://sundaeswap.finance'),
    ('Ston.fi', 'https://ston.fi'),
    ('DeDust', 'https://dedust.io'),
    ('Maverick Protocol', 'https://mav.xyz'),
    ('Ambient', 'https://ambient.finance'),
    ('Izumi', 'https://izumi.finance')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
-- Solana DEXs
(
    'jupiter-aggregator',
    'Jupiter Aggregator',
    'Leading DEX aggregator on Solana routing through all major DEXs. Features limit orders, DCA, and perpetuals. Dominates Solana DeFi with best price execution.',
    'Leading Solana DEX aggregator',
    'https://jup.ag',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'Jupiter'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'orca',
    'Orca',
    'User-friendly AMM on Solana with concentrated liquidity. Features Whirlpools for efficient LP positions. One of the most used DEXs on Solana.',
    'User-friendly Solana AMM with concentrated liquidity',
    'https://orca.so',
    (SELECT id FROM product_types WHERE code = 'AMM'),
    (SELECT id FROM brands WHERE name = 'Orca'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'meteora',
    'Meteora',
    'Dynamic liquidity protocol on Solana with DLMM. Features dynamic fees and concentrated liquidity. Innovative LP model for volatile pairs.',
    'Dynamic liquidity protocol on Solana',
    'https://meteora.ag',
    (SELECT id FROM product_types WHERE code = 'AMM'),
    (SELECT id FROM brands WHERE name = 'Meteora'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Cosmos DEXs
(
    'osmosis-dex',
    'Osmosis',
    'Leading DEX in Cosmos ecosystem with superfluid staking. Features 100+ IBC tokens and innovative pool types. Gateway to Cosmos DeFi.',
    'Leading Cosmos ecosystem DEX',
    'https://osmosis.zone',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'Osmosis'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'astroport',
    'Astroport',
    'Multi-chain AMM across Terra, Injective, and Neutron. Features multiple pool types and yield aggregation. Major Cosmos ecosystem DEX.',
    'Multi-chain Cosmos AMM protocol',
    'https://astroport.fi',
    (SELECT id FROM product_types WHERE code = 'AMM'),
    (SELECT id FROM brands WHERE name = 'Astroport'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Cardano DEXs
(
    'minswap',
    'Minswap',
    'Largest DEX on Cardano by TVL. Features multiple pool types, yield farming, and staking. Community-driven with MIN token governance.',
    'Largest DEX on Cardano blockchain',
    'https://minswap.org',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'Minswap'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'sundaeswap',
    'SundaeSwap',
    'First DEX launched on Cardano mainnet. Features AMM pools, yield farming, and taste test rewards. Pioneer of Cardano DeFi.',
    'First DEX on Cardano mainnet',
    'https://sundaeswap.finance',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'SundaeSwap'),
    'Open Source Project',
    NULL,
    'pending'
),
-- TON DEXs
(
    'stonfi',
    'STON.fi',
    'Leading DEX on TON blockchain. Features low fees and integration with Telegram. Major gateway for TON ecosystem DeFi.',
    'Leading DEX on TON blockchain',
    'https://ston.fi',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'Ston.fi'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'dedust',
    'DeDust.io',
    'AMM protocol on TON with virtual liquidity. Features efficient swaps and multi-hop routing. Growing TON DeFi platform.',
    'AMM protocol on TON blockchain',
    'https://dedust.io',
    (SELECT id FROM product_types WHERE code = 'AMM'),
    (SELECT id FROM brands WHERE name = 'DeDust'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Innovative DEXs
(
    'maverick-protocol',
    'Maverick Protocol',
    'Revolutionary AMM with directional liquidity positioning. LPs can follow price movements for better returns. Live on Ethereum and zkSync.',
    'AMM with directional liquidity positioning',
    'https://mav.xyz',
    (SELECT id FROM product_types WHERE code = 'AMM'),
    (SELECT id FROM brands WHERE name = 'Maverick Protocol'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'ambient-finance',
    'Ambient Finance',
    'Zero-to-infinity concentrated liquidity DEX. Single contract design for gas efficiency. Formerly known as CrocSwap.',
    'Efficient concentrated liquidity DEX',
    'https://ambient.finance',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'Ambient'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'izumi-finance',
    'iZUMi Finance',
    'Multi-chain DEX with discretized liquidity AMM. Features concentrated liquidity across 20+ chains. Innovative LiquidBox for LP farming.',
    'Multi-chain DEX with discretized liquidity',
    'https://izumi.finance',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'Izumi'),
    'Open Source Project',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 9: LENDING & BORROWING PROTOCOLS
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Aave', 'https://aave.com'),
    ('Compound', 'https://compound.finance'),
    ('MakerDAO', 'https://makerdao.com'),
    ('Euler', 'https://euler.finance'),
    ('Morpho', 'https://morpho.org'),
    ('Silo', 'https://silo.finance'),
    ('Gearbox', 'https://gearbox.fi'),
    ('Notional', 'https://notional.finance'),
    ('Exactly', 'https://exact.ly'),
    ('Radiant Capital', 'https://radiant.capital'),
    ('Benqi', 'https://benqi.fi'),
    ('Kamino', 'https://kamino.finance'),
    ('MarginFi', 'https://marginfi.com'),
    ('Solend', 'https://solend.fi')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'aave-v3',
    'Aave V3',
    'Latest version of Aave lending protocol with efficiency mode, isolation mode, and portal for cross-chain liquidity. Deployed on 10+ chains. Leading DeFi lending protocol.',
    'Leading multi-chain lending protocol',
    'https://app.aave.com',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Aave'),
    'London, UK',
    'GB',
    'pending'
),
(
    'compound-v3',
    'Compound V3',
    'Simplified lending protocol focused on single borrowable asset per market. Lower gas costs and improved risk management. Pioneer of DeFi lending.',
    'Simplified single-asset lending markets',
    'https://app.compound.finance',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Compound'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'spark-protocol',
    'Spark Protocol',
    'Maker-backed lending protocol for DAI. Features DAI savings rate and low borrow rates. Extension of MakerDAO ecosystem.',
    'Maker-backed DAI lending protocol',
    'https://spark.fi',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'MakerDAO'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'morpho-blue',
    'Morpho Blue',
    'Trustless lending protocol with isolated markets. Features flexible oracle choices and immutable market creation. Next evolution of Morpho.',
    'Trustless lending with isolated markets',
    'https://morpho.org',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Morpho'),
    'Paris, France',
    'FR',
    'pending'
),
(
    'euler-v2',
    'Euler V2',
    'Modular lending protocol rebuilt after V1 exploit. Features vault system and customizable risk parameters. Returning to DeFi with improved security.',
    'Modular lending protocol with vault system',
    'https://euler.finance',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Euler'),
    'London, UK',
    'GB',
    'pending'
),
(
    'silo-finance',
    'Silo Finance',
    'Isolated lending markets for any token pair. Risk contained to individual silos. Supports long-tail assets safely.',
    'Isolated lending markets for any token',
    'https://silo.finance',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Silo'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'gearbox-protocol',
    'Gearbox Protocol',
    'Leveraged lending protocol for composable DeFi. Access leverage for Curve, Uniswap, and other protocols. Credit accounts for capital efficiency.',
    'Composable leveraged lending protocol',
    'https://gearbox.fi',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Gearbox'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'notional-finance',
    'Notional Finance',
    'Fixed-rate lending protocol on Ethereum. Borrows and lends at fixed rates up to 1 year. Important for institutional DeFi adoption.',
    'Fixed-rate lending and borrowing protocol',
    'https://notional.finance',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Notional'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'exactly-protocol',
    'Exactly Protocol',
    'Fixed and variable rate lending on Optimism. Features fixed-rate pools with maturity dates. Growing Base and Optimism presence.',
    'Fixed and variable rate lending protocol',
    'https://exact.ly',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Exactly'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'radiant-capital',
    'Radiant Capital',
    'Cross-chain lending protocol using LayerZero. Borrow on one chain, collateral on another. Omnichain money market concept.',
    'Cross-chain omnichain lending protocol',
    'https://radiant.capital',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Radiant Capital'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Solana Lending
(
    'kamino-finance',
    'Kamino Finance',
    'Leading lending protocol on Solana. Features automated liquidity vaults and multiply strategies. Major Solana DeFi primitive.',
    'Leading Solana lending protocol',
    'https://kamino.finance',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Kamino'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'marginfi',
    'MarginFi',
    'Solana lending protocol with points system. Features risk-adjusted lending rates and capital efficiency. Growing Solana DeFi platform.',
    'Solana lending protocol with points',
    'https://marginfi.com',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'MarginFi'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'solend',
    'Solend',
    'Original Solana lending protocol. Features isolated pools and permissionless market creation. Pioneer of Solana DeFi lending.',
    'Original Solana lending protocol',
    'https://solend.fi',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Solend'),
    'Open Source Project',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 10: LIQUID STAKING PROTOCOLS
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Lido', 'https://lido.fi'),
    ('Rocket Pool', 'https://rocketpool.net'),
    ('Frax', 'https://frax.finance'),
    ('Swell', 'https://swellnetwork.io'),
    ('Renzo', 'https://renzoprotocol.com'),
    ('EtherFi', 'https://ether.fi'),
    ('Puffer', 'https://puffer.fi'),
    ('Kelp', 'https://kelpdao.xyz'),
    ('Eigenlayer', 'https://eigenlayer.xyz'),
    ('Symbiotic', 'https://symbiotic.fi'),
    ('Jito', 'https://jito.network'),
    ('Marinade', 'https://marinade.finance'),
    ('Stride', 'https://stride.zone'),
    ('Ankr', 'https://ankr.com')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
-- Ethereum Liquid Staking
(
    'lido-steth',
    'Lido stETH',
    'Largest liquid staking protocol with 30%+ of all staked ETH. Issues stETH rebasing token. Dominant DeFi primitive used across protocols.',
    'Largest Ethereum liquid staking protocol',
    'https://stake.lido.fi',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Lido'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'rocket-pool-reth',
    'Rocket Pool rETH',
    'Decentralized liquid staking with permissionless node operators. Issues rETH value-accruing token. More decentralized than Lido.',
    'Decentralized Ethereum liquid staking',
    'https://rocketpool.net',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Rocket Pool'),
    'Brisbane, Australia',
    'AU',
    'pending'
),
(
    'frax-eth',
    'Frax Ether (frxETH)',
    'Dual-token liquid staking with frxETH and sfrxETH. Higher yields through validator optimization. Part of Frax Finance ecosystem.',
    'High-yield Ethereum liquid staking',
    'https://app.frax.finance/frxeth/mint',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Frax'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'swell-sweth',
    'Swell swETH',
    'Liquid staking with restaking benefits. Issues swETH and rswETH for native restaking. Growing protocol with EigenLayer integration.',
    'Liquid staking with native restaking',
    'https://swellnetwork.io',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Swell'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'etherfi-eeth',
    'EtherFi eETH',
    'Non-custodial liquid staking with automatic restaking. Users maintain control of keys. Largest liquid restaking protocol.',
    'Non-custodial liquid restaking protocol',
    'https://ether.fi',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'EtherFi'),
    'Cayman Islands',
    'KY',
    'pending'
),
(
    'puffer-pufeth',
    'Puffer pufETH',
    'Native liquid restaking with anti-slashing technology. Features secure-signer for validator protection. Growing EigenLayer ecosystem player.',
    'Native liquid restaking with anti-slashing',
    'https://puffer.fi',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Puffer'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'renzo-ezeth',
    'Renzo ezETH',
    'Liquid restaking protocol issuing ezETH. Automatic restaking across EigenLayer operators. Simple interface for restaking exposure.',
    'Simple liquid restaking protocol',
    'https://renzoprotocol.com',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Renzo'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'kelp-rseth',
    'Kelp rsETH',
    'Liquid restaked token aggregating multiple LSTs. Provides diversified restaking exposure. Managed by Stader Labs.',
    'Aggregated liquid restaking token',
    'https://kelpdao.xyz',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Kelp'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Restaking Platforms
(
    'eigenlayer',
    'EigenLayer',
    'Restaking protocol enabling ETH stakers to secure additional services. Foundation of restaking ecosystem. Billions in restaked ETH.',
    'Ethereum restaking protocol for shared security',
    'https://eigenlayer.xyz',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Eigenlayer'),
    'Seattle, USA',
    'US',
    'pending'
),
(
    'symbiotic-protocol',
    'Symbiotic',
    'Permissionless restaking protocol competing with EigenLayer. More flexible collateral options. Backed by Lido and Paradigm.',
    'Permissionless restaking protocol',
    'https://symbiotic.fi',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Symbiotic'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Solana Liquid Staking
(
    'jito-staking',
    'Jito',
    'Solana liquid staking with MEV rewards. Issues JitoSOL with extra yield from MEV. Leading Solana LST by features.',
    'Solana liquid staking with MEV rewards',
    'https://jito.network',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Jito'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'marinade-finance',
    'Marinade Finance',
    'Largest Solana liquid staking by TVL. Issues mSOL and native staking options. Pioneer of Solana liquid staking.',
    'Largest Solana liquid staking protocol',
    'https://marinade.finance',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Marinade'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Cosmos Liquid Staking
(
    'stride-zone',
    'Stride',
    'Liquid staking for Cosmos ecosystem. Issues stATOM, stOSMO, and other stTokens. Leading Cosmos liquid staking solution.',
    'Cosmos ecosystem liquid staking',
    'https://stride.zone',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Stride'),
    'Open Source Project',
    NULL,
    'pending'
),
-- Multi-chain
(
    'ankr-staking',
    'Ankr Staking',
    'Multi-chain liquid staking supporting 10+ networks. Issues ankrETH, ankrBNB, and more. Wide chain coverage.',
    'Multi-chain liquid staking platform',
    'https://ankr.com/staking',
    (SELECT id FROM product_types WHERE code = 'Staking'),
    (SELECT id FROM brands WHERE name = 'Ankr'),
    'San Francisco, USA',
    'US',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 11: NFT MARKETPLACES
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('OpenSea', 'https://opensea.io'),
    ('Blur', 'https://blur.io'),
    ('Foundation', 'https://foundation.app'),
    ('Zora', 'https://zora.co'),
    ('Art Blocks', 'https://artblocks.io'),
    ('SuperRare', 'https://superrare.com'),
    ('Tensor', 'https://tensor.trade'),
    ('Magic Eden', 'https://magiceden.io'),
    ('Nifty Gateway', 'https://niftygateway.com'),
    ('X2Y2', 'https://x2y2.io'),
    ('Element', 'https://element.market'),
    ('Reservoir', 'https://reservoir.tools'),
    ('Sound', 'https://sound.xyz')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'opensea',
    'OpenSea',
    'Largest NFT marketplace by trading volume. Supports Ethereum, Polygon, Solana, and more. Features collections, auctions, and bundles.',
    'Largest multi-chain NFT marketplace',
    'https://opensea.io',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'OpenSea'),
    'New York, USA',
    'US',
    'pending'
),
(
    'blur-marketplace',
    'Blur',
    'Professional NFT marketplace for traders. Zero fees, optional royalties, and advanced trading tools. Dominant for high-volume trading.',
    'Professional zero-fee NFT marketplace',
    'https://blur.io',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'Blur'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'foundation-app',
    'Foundation',
    'Curated NFT marketplace for digital artists. Higher quality focus with artist-centric model. Popular for 1/1 art sales.',
    'Curated marketplace for digital artists',
    'https://foundation.app',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'Foundation'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'zora-marketplace',
    'Zora',
    'Creator-owned NFT protocol and marketplace. Hyperstructure approach with permissionless minting. Strong focus on creator ownership.',
    'Creator-owned NFT protocol and marketplace',
    'https://zora.co',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'Zora'),
    'Los Angeles, USA',
    'US',
    'pending'
),
(
    'artblocks',
    'Art Blocks',
    'Platform for generative art NFTs. Artists upload algorithms that create unique art. Pioneer of on-chain generative art.',
    'Generative art NFT platform',
    'https://artblocks.io',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'Art Blocks'),
    'Houston, USA',
    'US',
    'pending'
),
(
    'superrare',
    'SuperRare',
    'High-end digital art marketplace. Curated artists with 1/1 focus. Gallery-like experience for serious collectors.',
    'High-end curated digital art marketplace',
    'https://superrare.com',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'SuperRare'),
    'New York, USA',
    'US',
    'pending'
),
(
    'tensor-trade',
    'Tensor',
    'Leading Solana NFT marketplace with advanced trading tools. AMM pools and instant sells. Blur of Solana ecosystem.',
    'Leading Solana NFT marketplace',
    'https://tensor.trade',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'Tensor'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'nifty-gateway',
    'Nifty Gateway',
    'NFT marketplace owned by Gemini. Features drops from major artists and brands. Credit card purchases available.',
    'NFT marketplace by Gemini with fiat support',
    'https://niftygateway.com',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'Nifty Gateway'),
    'New York, USA',
    'US',
    'pending'
),
(
    'sound-xyz',
    'Sound.xyz',
    'Music NFT platform for artists. Features listening parties and limited edition drops. Pioneer of music NFTs.',
    'Music NFT platform for artists',
    'https://sound.xyz',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'Sound'),
    'Los Angeles, USA',
    'US',
    'pending'
),
(
    'element-market',
    'Element Market',
    'Multi-chain NFT aggregator marketplace. Best prices across OpenSea, Blur, and more. Growing presence in Asia.',
    'Multi-chain NFT aggregator marketplace',
    'https://element.market',
    (SELECT id FROM product_types WHERE code = 'NFT Market'),
    (SELECT id FROM brands WHERE name = 'Element'),
    'Singapore',
    'SG',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 12: LAYER 2 & SCALING SOLUTIONS
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Arbitrum', 'https://arbitrum.io'),
    ('Optimism', 'https://optimism.io'),
    ('zkSync', 'https://zksync.io'),
    ('StarkWare', 'https://starkware.co'),
    ('Polygon', 'https://polygon.technology'),
    ('Base', 'https://base.org'),
    ('Scroll', 'https://scroll.io'),
    ('Linea', 'https://linea.build'),
    ('Mantle', 'https://mantle.xyz'),
    ('Blast', 'https://blast.io'),
    ('Mode', 'https://mode.network'),
    ('Metis', 'https://metis.io'),
    ('Boba', 'https://boba.network'),
    ('Manta', 'https://manta.network'),
    ('Taiko', 'https://taiko.xyz'),
    ('zkLink', 'https://zklink.io')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'arbitrum-one',
    'Arbitrum One',
    'Leading Ethereum L2 by TVL using optimistic rollups. Full EVM compatibility with low fees. Dominant DeFi ecosystem.',
    'Leading Ethereum L2 with optimistic rollups',
    'https://arbitrum.io',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Arbitrum'),
    'New York, USA',
    'US',
    'pending'
),
(
    'arbitrum-nova',
    'Arbitrum Nova',
    'Arbitrum L2 optimized for gaming and social. Lower fees than One via AnyTrust. Gaming-focused chain.',
    'Gaming-focused Arbitrum L2',
    'https://nova.arbitrum.io',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Arbitrum'),
    'New York, USA',
    'US',
    'pending'
),
(
    'optimism-mainnet',
    'OP Mainnet',
    'Major Ethereum L2 using optimistic rollups. Part of Superchain vision. Strong DeFi and public goods focus.',
    'Major Ethereum L2 and Superchain hub',
    'https://optimism.io',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Optimism'),
    'Remote',
    NULL,
    'pending'
),
(
    'base-network',
    'Base',
    'Coinbase Ethereum L2 built on OP Stack. Fiat onramp integration and Coinbase ecosystem. Fast-growing L2.',
    'Coinbase Ethereum L2 on OP Stack',
    'https://base.org',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Base'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'zksync-era',
    'zkSync Era',
    'Leading ZK rollup with native account abstraction. Full EVM compatibility via zkEVM. Major zkSync ecosystem.',
    'Leading ZK rollup with account abstraction',
    'https://zksync.io',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'zkSync'),
    'Berlin, Germany',
    'DE',
    'pending'
),
(
    'starknet',
    'StarkNet',
    'ZK rollup using STARK proofs and Cairo language. Account abstraction native. Growing ecosystem with unique architecture.',
    'STARK-based ZK rollup with Cairo',
    'https://starknet.io',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'StarkWare'),
    'Tel Aviv, Israel',
    'IL',
    'pending'
),
(
    'polygon-pos',
    'Polygon PoS',
    'Ethereum sidechain with low fees. Most used scaling solution by transactions. Broad ecosystem support.',
    'Popular Ethereum sidechain',
    'https://polygon.technology',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Polygon'),
    'India / Remote',
    'IN',
    'pending'
),
(
    'polygon-zkevm',
    'Polygon zkEVM',
    'Type 2 zkEVM by Polygon with EVM equivalence. ZK rollup with strong compatibility. Part of Polygon ecosystem.',
    'Polygon ZK rollup with EVM equivalence',
    'https://polygon.technology/polygon-zkevm',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Polygon'),
    'India / Remote',
    'IN',
    'pending'
),
(
    'scroll-mainnet',
    'Scroll',
    'zkEVM rollup with bytecode-level compatibility. Community-focused development. Growing zkEVM option.',
    'Community-focused zkEVM rollup',
    'https://scroll.io',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Scroll'),
    'Remote',
    NULL,
    'pending'
),
(
    'linea-mainnet',
    'Linea',
    'Consensys-backed zkEVM rollup. MetaMask integration and enterprise focus. Type 2 zkEVM.',
    'Consensys zkEVM with MetaMask integration',
    'https://linea.build',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Linea'),
    'New York, USA',
    'US',
    'pending'
),
(
    'mantle-network',
    'Mantle Network',
    'Modular L2 with data availability layer. Backed by BitDAO treasury. Focus on capital efficiency.',
    'Modular L2 backed by BitDAO',
    'https://mantle.xyz',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Mantle'),
    'Cayman Islands',
    'KY',
    'pending'
),
(
    'blast-l2',
    'Blast',
    'L2 with native yield for ETH and stablecoins. Auto-rebasing ETH and USDB. Innovative yield L2 concept.',
    'L2 with native yield for assets',
    'https://blast.io',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Blast'),
    'Remote',
    NULL,
    'pending'
),
(
    'mode-network',
    'Mode Network',
    'OP Stack L2 focused on DeFi. Sequencer fee sharing with developers. Growing DeFi ecosystem.',
    'DeFi-focused OP Stack L2',
    'https://mode.network',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Mode'),
    'Remote',
    NULL,
    'pending'
),
(
    'manta-pacific',
    'Manta Pacific',
    'Modular L2 with ZK applications. Focus on privacy and ZK-enabled apps. Part of Manta Network.',
    'Modular L2 for ZK applications',
    'https://pacific.manta.network',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Manta'),
    'Remote',
    NULL,
    'pending'
),
(
    'taiko-mainnet',
    'Taiko',
    'Based contestable rollup with decentralized sequencing. Type 1 zkEVM goal. Community-driven development.',
    'Decentralized based rollup',
    'https://taiko.xyz',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Taiko'),
    'Remote',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 13: BRIDGES & CROSS-CHAIN
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('LayerZero', 'https://layerzero.network'),
    ('Wormhole', 'https://wormhole.com'),
    ('Axelar', 'https://axelar.network'),
    ('Celer', 'https://celer.network'),
    ('Connext', 'https://connext.network'),
    ('Across', 'https://across.to'),
    ('Stargate', 'https://stargate.finance'),
    ('Hop Protocol', 'https://hop.exchange'),
    ('Synapse', 'https://synapseprotocol.com'),
    ('deBridge', 'https://debridge.finance'),
    ('Orbiter', 'https://orbiter.finance'),
    ('Bungee', 'https://bungee.exchange'),
    ('Chainflip', 'https://chainflip.io')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'layerzero',
    'LayerZero',
    'Omnichain messaging protocol connecting 50+ chains. Foundation for cross-chain apps. Used by Stargate and major DeFi.',
    'Omnichain interoperability protocol',
    'https://layerzero.network',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'LayerZero'),
    'Vancouver, Canada',
    'CA',
    'pending'
),
(
    'wormhole-bridge',
    'Wormhole',
    'Cross-chain messaging connecting Ethereum, Solana, and 20+ chains. Major bridge for Solana ecosystem. Guardian network security.',
    'Cross-chain messaging protocol',
    'https://wormhole.com',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Wormhole'),
    'Remote',
    NULL,
    'pending'
),
(
    'axelar-network',
    'Axelar',
    'Universal interoperability network. Cross-chain calls and token transfers. Powers Squid Router.',
    'Universal cross-chain interoperability',
    'https://axelar.network',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Axelar'),
    'Toronto, Canada',
    'CA',
    'pending'
),
(
    'stargate-finance',
    'Stargate Finance',
    'LayerZero-based omnichain bridge. Unified liquidity pools across chains. Major cross-chain DEX.',
    'LayerZero omnichain liquidity bridge',
    'https://stargate.finance',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Stargate'),
    'Remote',
    NULL,
    'pending'
),
(
    'across-bridge',
    'Across Protocol',
    'Intent-based bridge with fast finality. Uses optimistic verification. Capital efficient bridging.',
    'Intent-based cross-chain bridge',
    'https://across.to',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Across'),
    'Remote',
    NULL,
    'pending'
),
(
    'hop-exchange',
    'Hop Protocol',
    'Fast L2-to-L2 bridge using Bonders. Quick finality for rollup transfers. Popular for L2 bridging.',
    'Fast L2-to-L2 bridge protocol',
    'https://hop.exchange',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Hop Protocol'),
    'Remote',
    NULL,
    'pending'
),
(
    'synapse-bridge',
    'Synapse Protocol',
    'Cross-chain bridge and AMM. Supports 15+ chains with deep liquidity. nUSD stablecoin bridge.',
    'Cross-chain bridge with AMM',
    'https://synapseprotocol.com',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Synapse'),
    'Remote',
    NULL,
    'pending'
),
(
    'celer-cbridge',
    'Celer cBridge',
    'State channel based bridge by Celer Network. Fast and low-cost transfers. Good for frequent bridging.',
    'State channel cross-chain bridge',
    'https://cbridge.celer.network',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Celer'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'debridge',
    'deBridge',
    'Cross-chain interoperability protocol. DLN for intent-based bridging. Fast execution times.',
    'Cross-chain interoperability with DLN',
    'https://debridge.finance',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'deBridge'),
    'Remote',
    NULL,
    'pending'
),
(
    'orbiter-finance',
    'Orbiter Finance',
    'Low-cost L2-to-L2 bridge. Maker-based model for fast transfers. Popular for rollup bridging.',
    'Low-cost L2-to-L2 bridge',
    'https://orbiter.finance',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Orbiter'),
    'Remote',
    NULL,
    'pending'
),
(
    'bungee-exchange',
    'Bungee',
    'Bridge aggregator finding best routes. Compares Stargate, Hop, Across, and more. Part of Socket ecosystem.',
    'Bridge aggregator with best routes',
    'https://bungee.exchange',
    (SELECT id FROM product_types WHERE code = 'Protocol'),
    (SELECT id FROM brands WHERE name = 'Bungee'),
    'Remote',
    NULL,
    'pending'
),
(
    'chainflip',
    'Chainflip',
    'Native cross-chain DEX without wrapped tokens. Direct BTC, ETH swaps. Decentralized liquidity network.',
    'Native cross-chain DEX without wrapped tokens',
    'https://chainflip.io',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'Chainflip'),
    'Berlin, Germany',
    'DE',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 14: PRIVACY PROTOCOLS
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Zcash', 'https://z.cash'),
    ('Monero', 'https://getmonero.org'),
    ('Secret Network', 'https://scrt.network'),
    ('Oasis', 'https://oasisprotocol.org'),
    ('Railgun', 'https://railgun.org'),
    ('Aztec', 'https://aztec.network'),
    ('Penumbra', 'https://penumbra.zone'),
    ('Nym', 'https://nymtech.net'),
    ('Iron Fish', 'https://ironfish.network'),
    ('Firo', 'https://firo.org'),
    ('Haven', 'https://havenprotocol.org')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'zcash',
    'Zcash',
    'Privacy-focused cryptocurrency using zk-SNARKs. Optional shielded transactions hide sender, receiver, and amount. Pioneer of ZK privacy.',
    'Privacy cryptocurrency using zk-SNARKs',
    'https://z.cash',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Zcash'),
    'Remote',
    NULL,
    'pending'
),
(
    'monero-xmr',
    'Monero',
    'Leading privacy cryptocurrency with mandatory privacy. Ring signatures, stealth addresses, and RingCT. Default private transactions.',
    'Leading privacy-by-default cryptocurrency',
    'https://getmonero.org',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Monero'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'secret-network',
    'Secret Network',
    'Privacy-preserving smart contract platform. Secret contracts with encrypted inputs and outputs. Cosmos SDK based.',
    'Privacy-preserving smart contract platform',
    'https://scrt.network',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Secret Network'),
    'Remote',
    NULL,
    'pending'
),
(
    'oasis-network',
    'Oasis Network',
    'Privacy-enabled blockchain with confidential ParaTimes. TEE-based privacy for smart contracts. Focus on data privacy.',
    'Privacy blockchain with confidential compute',
    'https://oasisprotocol.org',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Oasis'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'railgun-protocol',
    'Railgun',
    'Privacy system for Ethereum DeFi. Shield tokens and use DeFi privately. ZK-based transaction privacy.',
    'Privacy system for Ethereum DeFi',
    'https://railgun.org',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Railgun'),
    'Open Source Project',
    NULL,
    'pending'
),
(
    'aztec-network',
    'Aztec Network',
    'Privacy L2 using ZK proofs. Encrypted transactions on Ethereum L2. Building zkVM for private DeFi.',
    'Privacy L2 for Ethereum with ZK proofs',
    'https://aztec.network',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Aztec'),
    'London, UK',
    'GB',
    'pending'
),
(
    'penumbra-zone',
    'Penumbra',
    'Private DEX and shielded transactions for Cosmos. ZK-based privacy for IBC assets. Private staking and governance.',
    'Private DEX for Cosmos ecosystem',
    'https://penumbra.zone',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Penumbra'),
    'Remote',
    NULL,
    'pending'
),
(
    'nym-mixnet',
    'Nym',
    'Privacy infrastructure using mixnet technology. Protects metadata and network-level privacy. Incentivized mixnet nodes.',
    'Mixnet privacy infrastructure',
    'https://nymtech.net',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Nym'),
    'Switzerland',
    'CH',
    'pending'
),
(
    'iron-fish',
    'Iron Fish',
    'Privacy cryptocurrency with encrypted transactions. Lightweight client support. Focus on usability.',
    'Privacy cryptocurrency with lightweight clients',
    'https://ironfish.network',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Iron Fish'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'firo',
    'Firo',
    'Privacy cryptocurrency formerly known as Zcoin. Uses Lelantus Spark protocol. Focus on scalable privacy.',
    'Privacy cryptocurrency using Lelantus Spark',
    'https://firo.org',
    (SELECT id FROM product_types WHERE code = 'Privacy'),
    (SELECT id FROM brands WHERE name = 'Firo'),
    'Thailand',
    'TH',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 15: ORACLES
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Chainlink', 'https://chain.link'),
    ('Pyth', 'https://pyth.network'),
    ('Redstone', 'https://redstone.finance'),
    ('API3', 'https://api3.org'),
    ('Band Protocol', 'https://bandprotocol.com'),
    ('Tellor', 'https://tellor.io'),
    ('UMA', 'https://uma.xyz'),
    ('Chronicle', 'https://chroniclelabs.org'),
    ('Switchboard', 'https://switchboard.xyz'),
    ('DIA', 'https://diadata.org')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'chainlink-oracle',
    'Chainlink',
    'Dominant decentralized oracle network. Price feeds, VRF, and CCIP cross-chain. Industry standard for DeFi data.',
    'Dominant decentralized oracle network',
    'https://chain.link',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'Chainlink'),
    'Cayman Islands',
    'KY',
    'pending'
),
(
    'pyth-oracle',
    'Pyth Network',
    'High-frequency oracle from TradFi market makers. Sub-second updates for DeFi. Strong Solana presence.',
    'High-frequency oracle from market makers',
    'https://pyth.network',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'Pyth'),
    'Remote',
    NULL,
    'pending'
),
(
    'redstone-oracle',
    'RedStone',
    'Modular oracle with push and pull models. Cost-efficient data delivery. Growing presence in DeFi.',
    'Modular oracle with flexible data delivery',
    'https://redstone.finance',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'Redstone'),
    'Poland',
    'PL',
    'pending'
),
(
    'api3-oracle',
    'API3',
    'First-party oracle connecting APIs directly. dAPIs without middleware. DAO-governed oracle network.',
    'First-party oracle network',
    'https://api3.org',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'API3'),
    'Cayman Islands',
    'KY',
    'pending'
),
(
    'band-oracle',
    'Band Protocol',
    'Cross-chain oracle built on Cosmos. IBC-native data delivery. Alternative to Chainlink.',
    'Cross-chain Cosmos oracle',
    'https://bandprotocol.com',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'Band Protocol'),
    'Thailand',
    'TH',
    'pending'
),
(
    'tellor-oracle',
    'Tellor',
    'Decentralized oracle with staking security. Permissionless data submission. Focus on decentralization.',
    'Decentralized permissionless oracle',
    'https://tellor.io',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'Tellor'),
    'Remote',
    NULL,
    'pending'
),
(
    'uma-oracle',
    'UMA',
    'Optimistic oracle with human-powered dispute resolution. oSnap for governance. Unique verification model.',
    'Optimistic oracle with human verification',
    'https://uma.xyz',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'UMA'),
    'Remote',
    NULL,
    'pending'
),
(
    'chronicle-oracle',
    'Chronicle',
    'MakerDAO-incubated oracle network. Powers DAI oracles. Scribe for efficient price updates.',
    'MakerDAO-incubated oracle protocol',
    'https://chroniclelabs.org',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'Chronicle'),
    'Remote',
    NULL,
    'pending'
),
(
    'switchboard-oracle',
    'Switchboard',
    'Permissionless oracle for Solana. Custom data feeds and VRF. Growing Solana oracle option.',
    'Permissionless Solana oracle',
    'https://switchboard.xyz',
    (SELECT id FROM product_types WHERE code = 'Oracle'),
    (SELECT id FROM brands WHERE name = 'Switchboard'),
    'Remote',
    NULL,
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    total_products INTEGER;
    new_products INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_products FROM products;
    RAISE NOTICE 'Total products in database: %', total_products;
END $$;

-- ============================================================
-- DONE!
-- ============================================================
