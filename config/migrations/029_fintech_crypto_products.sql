-- ============================================================
-- Migration 029: Fintech & Neobank Crypto Products
-- ============================================================
-- Adds all fintech apps, neobanks, payment apps, and trading
-- platforms that offer cryptocurrency services
-- ============================================================

-- ============================================================
-- SECTION 1: NEW PRODUCT TYPE - Fintech/Neobank
-- ============================================================

INSERT INTO product_types (code, name, name_fr, category, definition, includes, excludes, risk_factors, examples, keywords, is_hardware, is_custodial, is_safe_applicable) VALUES
(
    'Fintech',
    'Fintech / Neobank',
    'Fintech / Néobanque',
    'Financial Services',
    'Traditional fintech applications and neobanks that have integrated cryptocurrency buying, selling, or holding features alongside their core banking/payment services. Regulated as financial institutions in most jurisdictions.',
    ARRAY[
        'Cryptocurrency buy/sell functionality',
        'Fiat bank account integration',
        'Debit/credit card services',
        'Traditional banking features',
        'Regulated financial entity',
        'KYC/AML compliance',
        'FDIC/equivalent insurance on fiat',
        'Mobile-first experience'
    ],
    ARRAY[
        'Full crypto exchange features',
        'DeFi functionality',
        'Self-custody wallets',
        'Advanced trading (futures, options)',
        'Decentralized governance'
    ],
    ARRAY[
        'Limited crypto withdrawal options',
        'No private key access',
        'Regulatory restrictions on crypto features',
        'Higher fees than crypto-native platforms',
        'Geographic limitations',
        'Account freezing risk'
    ],
    ARRAY['Revolut', 'PayPal', 'Cash App', 'Venmo', 'Robinhood', 'eToro', 'N26', 'Wise'],
    ARRAY['neobank', 'fintech', 'banking app', 'payment app', 'trading app', 'revolut', 'paypal'],
    FALSE,
    TRUE,
    TRUE  -- SAFE applicable: users trust these apps with their funds
),
(
    'Crypto Card',
    'Crypto Debit Card',
    'Carte Crypto',
    'Payment',
    'Debit or prepaid cards that allow spending cryptocurrency converted to fiat at point of sale. Often includes cashback rewards in crypto. Bridges crypto holdings with traditional payment infrastructure.',
    ARRAY[
        'Spend crypto as fiat',
        'Visa/Mastercard network',
        'Cashback in crypto',
        'ATM withdrawals',
        'Auto-conversion at POS',
        'Mobile app management',
        'Spending limits and controls'
    ],
    ARRAY[
        'Credit cards',
        'Pure fiat cards',
        'Hardware wallets',
        'Direct crypto payments'
    ],
    ARRAY[
        'Tax events on each spend',
        'Conversion fees',
        'Limited acceptance',
        'Card issuer restrictions',
        'Regulatory changes'
    ],
    ARRAY['Crypto.com Card', 'Binance Card', 'Coinbase Card', 'Wirex Card', 'Plutus Card'],
    ARRAY['crypto card', 'bitcoin card', 'debit card', 'cashback', 'spend crypto', 'visa', 'mastercard'],
    FALSE,
    TRUE,
    TRUE  -- SAFE applicable: card security and fraud protection matter
),
(
    'Onramp',
    'Fiat On/Off Ramp',
    'Rampe Fiat',
    'Payment',
    'Services that facilitate the conversion between fiat currencies and cryptocurrencies. Often embedded as widgets in wallets and DApps. Critical infrastructure for crypto adoption.',
    ARRAY[
        'Credit/debit card purchases',
        'Bank transfer support',
        'Widget/API integration',
        'Multiple crypto support',
        'KYC verification',
        'Multi-country support',
        'Instant purchases'
    ],
    ARRAY[
        'Full exchange functionality',
        'Trading features',
        'Custody services',
        'DeFi features'
    ],
    ARRAY[
        'High fees on small purchases',
        'KYC requirements',
        'Geographic restrictions',
        'Payment method limitations',
        'Regulatory compliance costs'
    ],
    ARRAY['MoonPay', 'Ramp Network', 'Transak', 'Banxa', 'Simplex', 'Mercuryo'],
    ARRAY['onramp', 'offramp', 'buy crypto', 'fiat gateway', 'moonpay', 'ramp', 'card purchase'],
    FALSE,
    TRUE,
    TRUE  -- SAFE applicable: security of fiat-crypto conversion is critical
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_fr = EXCLUDED.name_fr,
    definition = EXCLUDED.definition,
    includes = EXCLUDED.includes,
    excludes = EXCLUDED.excludes,
    risk_factors = EXCLUDED.risk_factors,
    is_safe_applicable = EXCLUDED.is_safe_applicable;

-- ============================================================
-- ALL PRODUCT TYPES ARE SAFE APPLICABLE
-- ============================================================
-- Every product type that handles user funds, keys, or crypto assets
-- should be evaluated for security. The evaluation criteria may differ
-- by type, but they all need safety assessment:
--
-- - Fintech/Neobank: Account security, fund protection, regulatory compliance
-- - Crypto Card: Card fraud, conversion security, spending limits
-- - Onramp: Transaction security, KYC integrity, delivery reliability
-- - NFT Market: Smart contract security, asset custody, scam protection
-- - Oracle: Data integrity, manipulation resistance (critical for DeFi)
-- - Paper Wallet: Generator integrity, randomness, no data leakage
-- - Payment: Transaction security, fraud protection
-- - Identity: Privacy, data protection, attestation integrity
-- - All others: Each has security considerations for users
--
-- NOTE: Evaluation CRITERIA differ by type, but all types are SAFE applicable

-- ============================================================
-- SECTION 2: BRANDS
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Revolut', 'https://revolut.com'),
    ('PayPal', 'https://paypal.com'),
    ('Venmo', 'https://venmo.com'),
    ('Cash App', 'https://cash.app'),
    ('Robinhood', 'https://robinhood.com'),
    ('eToro', 'https://etoro.com'),
    ('N26', 'https://n26.com'),
    ('Wise', 'https://wise.com'),
    ('SoFi', 'https://sofi.com'),
    ('Nubank', 'https://nubank.com.br'),
    ('Monzo', 'https://monzo.com'),
    ('Chime', 'https://chime.com'),
    ('Trading 212', 'https://trading212.com'),
    ('Webull', 'https://webull.com'),
    ('Public', 'https://public.com'),
    ('Freetrade', 'https://freetrade.io'),
    ('Stake', 'https://stake.com.au'),
    ('Plutus', 'https://plutus.it'),
    ('hi', 'https://hi.com'),
    ('Vivid', 'https://vivid.money'),
    ('Lydia', 'https://lydia-app.com'),
    ('Curve', 'https://curve.com'),
    ('Ziglu', 'https://ziglu.io'),
    ('Mode Banking', 'https://modebanking.com'),
    ('Skrill', 'https://skrill.com'),
    ('Neteller', 'https://neteller.com'),
    ('MoonPay', 'https://moonpay.com'),
    ('Ramp Network', 'https://ramp.network'),
    ('Transak', 'https://transak.com'),
    ('Banxa', 'https://banxa.com'),
    ('Simplex', 'https://simplex.com'),
    ('Mercuryo', 'https://mercuryo.io'),
    ('Mt Pelerin', 'https://mtpelerin.com'),
    ('Onramper', 'https://onramper.com'),
    ('Sardine', 'https://sardine.ai'),
    ('Alchemy Pay', 'https://alchemypay.org'),
    ('Utorg', 'https://utorg.pro'),
    ('Paybis', 'https://paybis.com'),
    ('Guardarian', 'https://guardarian.com'),
    ('Kado', 'https://kado.money'),
    ('Unlimit', 'https://unlimit.com'),
    ('Fold', 'https://foldapp.com'),
    ('Strike', 'https://strike.me'),
    ('Relai', 'https://relai.app'),
    ('Pocket Bitcoin', 'https://pocketbitcoin.com'),
    ('Peach Bitcoin', 'https://peachbitcoin.com'),
    ('Swan Bitcoin', 'https://swanbitcoin.com'),
    ('River', 'https://river.com'),
    ('Amber', 'https://amber.app'),
    ('Shakepay', 'https://shakepay.com'),
    ('Newton', 'https://newton.co'),
    ('Bitbuy', 'https://bitbuy.ca'),
    ('Bull Bitcoin', 'https://bullbitcoin.com')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SECTION 3: NEOBANKS WITH CRYPTO
-- ============================================================

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
-- Revolut
(
    'revolut',
    'Revolut',
    'Global fintech super-app with 35+ million users. Offers crypto trading for 100+ tokens alongside banking services. Features include auto-exchange, round-ups into crypto, and crypto staking. Regulated in UK and EU.',
    'Global fintech super-app with crypto trading',
    'https://revolut.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Revolut'),
    'London, UK',
    'GB',
    'pending'
),
(
    'revolut-card',
    'Revolut Card',
    'Debit card linked to Revolut account. Can spend from crypto balance with auto-conversion. Cashback available on premium tiers. Accepted worldwide on Visa/Mastercard network.',
    'Revolut debit card with crypto spending',
    'https://revolut.com/cards',
    (SELECT id FROM product_types WHERE code = 'Crypto Card'),
    (SELECT id FROM brands WHERE name = 'Revolut'),
    'London, UK',
    'GB',
    'pending'
),
-- PayPal & Venmo
(
    'paypal-crypto',
    'PayPal Crypto',
    'Crypto buying and selling within PayPal app. Supports BTC, ETH, LTC, BCH. Features Checkout with Crypto for online purchases. Over 400 million accounts with crypto access.',
    'Crypto trading within PayPal',
    'https://paypal.com/us/digital-wallet/manage-money/crypto',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'PayPal'),
    'San Jose, USA',
    'US',
    'pending'
),
(
    'venmo-crypto',
    'Venmo Crypto',
    'Crypto features within Venmo payment app. Buy, sell, and hold BTC, ETH, LTC, BCH. Cash back to crypto feature. Part of PayPal ecosystem.',
    'Crypto trading within Venmo app',
    'https://venmo.com/about/crypto',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Venmo'),
    'New York, USA',
    'US',
    'pending'
),
-- Cash App
(
    'cash-app',
    'Cash App',
    'Square/Block payment app with Bitcoin integration. Buy, sell, send, and receive BTC. Features Bitcoin Boost cashback and Lightning Network support. Popular for BTC in US.',
    'Square payment app with Bitcoin focus',
    'https://cash.app',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Cash App'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'cash-app-card',
    'Cash App Card',
    'Debit card for Cash App with Bitcoin Boost. Earn BTC cashback on purchases. Customizable card design. Visa network.',
    'Cash App debit card with BTC cashback',
    'https://cash.app/card',
    (SELECT id FROM product_types WHERE code = 'Crypto Card'),
    (SELECT id FROM brands WHERE name = 'Cash App'),
    'San Francisco, USA',
    'US',
    'pending'
),
-- Robinhood
(
    'robinhood-app',
    'Robinhood',
    'Commission-free trading app for stocks and crypto. Supports 15+ cryptocurrencies. Features include recurring buys and crypto wallets. 23+ million users.',
    'Commission-free stock and crypto trading app',
    'https://robinhood.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Robinhood'),
    'Menlo Park, USA',
    'US',
    'pending'
),
(
    'robinhood-wallet',
    'Robinhood Wallet',
    'Self-custody crypto wallet from Robinhood. Supports Ethereum and Polygon. Swap, send, and connect to DApps. Separate from trading app.',
    'Self-custody wallet from Robinhood',
    'https://robinhood.com/wallet',
    (SELECT id FROM product_types WHERE code = 'SW Mobile'),
    (SELECT id FROM brands WHERE name = 'Robinhood'),
    'Menlo Park, USA',
    'US',
    'pending'
),
-- eToro
(
    'etoro',
    'eToro',
    'Social trading platform with crypto. Copy trading feature for following successful traders. Supports 80+ cryptocurrencies. 30+ million users globally.',
    'Social trading platform with copy trading',
    'https://etoro.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'eToro'),
    'Tel Aviv, Israel',
    'IL',
    'pending'
),
(
    'etoro-money',
    'eToro Money',
    'eToro digital wallet and debit card. Spend from eToro portfolio. Transfer crypto between eToro and external wallets.',
    'eToro digital wallet and card',
    'https://etoromoney.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'eToro'),
    'Tel Aviv, Israel',
    'IL',
    'pending'
),
-- European Neobanks
(
    'n26-crypto',
    'N26 Crypto',
    'German neobank with crypto trading via Bitpanda partnership. Buy and sell 200+ cryptocurrencies. Integrated in N26 app. Regulated German bank.',
    'German neobank with Bitpanda crypto integration',
    'https://n26.com/crypto',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'N26'),
    'Berlin, Germany',
    'DE',
    'pending'
),
(
    'vivid-money',
    'Vivid Money',
    'European neobank with crypto trading. Features crypto cashback, stock pockets, and savings. Supports 50+ cryptocurrencies.',
    'European neobank with crypto and stock trading',
    'https://vivid.money',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Vivid'),
    'Berlin, Germany',
    'DE',
    'pending'
),
(
    'lydia-crypto',
    'Lydia',
    'French payment app with crypto trading. Popular among young French users. Buy, sell, and hold crypto alongside euro payments.',
    'French payment app with crypto',
    'https://lydia-app.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Lydia'),
    'Paris, France',
    'FR',
    'pending'
),
(
    'ziglu',
    'Ziglu',
    'UK fintech app for crypto and forex. FCA regulated. Features instant crypto purchases and GBP accounts. Acquired by Robinhood.',
    'UK FCA-regulated crypto and forex app',
    'https://ziglu.io',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Ziglu'),
    'London, UK',
    'GB',
    'pending'
),
(
    'mode-banking',
    'Mode Banking',
    'UK fintech focused on Bitcoin. FCA regulated with Bitcoin cashback card. Only Bitcoin, no altcoins. Emphasis on BTC savings.',
    'UK Bitcoin-focused fintech',
    'https://modebanking.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Mode Banking'),
    'London, UK',
    'GB',
    'pending'
),
-- US Fintechs
(
    'sofi-crypto',
    'SoFi Crypto',
    'US financial services app with crypto trading. Part of SoFi ecosystem with loans, banking, and investing. Supports 20+ cryptocurrencies.',
    'US fintech with crypto alongside banking',
    'https://sofi.com/invest/crypto',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'SoFi'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'public-crypto',
    'Public.com',
    'Social investing app with crypto, stocks, and alternatives. Features community discussions and themed portfolios. Supports 25+ cryptocurrencies.',
    'Social investing app with crypto',
    'https://public.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Public'),
    'New York, USA',
    'US',
    'pending'
),
(
    'webull-crypto',
    'Webull',
    'Advanced trading app with crypto. Features extended hours trading, technical analysis tools. Supports 40+ cryptocurrencies.',
    'Advanced trading app with crypto',
    'https://webull.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Webull'),
    'New York, USA',
    'US',
    'pending'
),
-- European Trading Apps
(
    'trading212-crypto',
    'Trading 212',
    'Commission-free trading app popular in Europe. Crypto CFDs and real crypto trading. 2+ million users.',
    'European commission-free trading app',
    'https://trading212.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Trading 212'),
    'London, UK',
    'GB',
    'pending'
),
(
    'freetrade-crypto',
    'Freetrade',
    'UK commission-free stock trading app. Crypto through Freetrade Crypto feature. FCA regulated.',
    'UK commission-free trading with crypto',
    'https://freetrade.io',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Freetrade'),
    'London, UK',
    'GB',
    'pending'
),
-- Latin America
(
    'nubank-crypto',
    'Nubank Crypto',
    'Brazil largest digital bank with crypto trading. Nucripto feature for BTC and ETH. 80+ million customers in Latin America.',
    'Brazil largest neobank with crypto',
    'https://nubank.com.br',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Nubank'),
    'São Paulo, Brazil',
    'BR',
    'pending'
),
-- Payment Services
(
    'skrill-crypto',
    'Skrill',
    'Digital payment service with crypto trading. Buy, sell, and hold 40+ cryptocurrencies. Part of Paysafe group.',
    'Digital payments with crypto trading',
    'https://skrill.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Skrill'),
    'London, UK',
    'GB',
    'pending'
),
(
    'neteller-crypto',
    'Neteller',
    'Digital wallet with crypto trading. Supports 60+ cryptocurrencies. Part of Paysafe group with Skrill.',
    'Digital wallet with crypto trading',
    'https://neteller.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Neteller'),
    'London, UK',
    'GB',
    'pending'
),
(
    'wise-crypto',
    'Wise (TransferWise)',
    'International money transfer service. Crypto feature for holding BTC, ETH. Focus on low-fee international transfers.',
    'International transfers with crypto holding',
    'https://wise.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Wise'),
    'London, UK',
    'GB',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 4: CRYPTO CARDS
-- ============================================================

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'plutus-card',
    'Plutus Card',
    'Crypto rewards debit card with up to 8% cashback in PLU token. Non-custodial with DEX integration. European Visa card with Apple/Google Pay.',
    'Non-custodial crypto rewards card',
    'https://plutus.it',
    (SELECT id FROM product_types WHERE code = 'Crypto Card'),
    (SELECT id FROM brands WHERE name = 'Plutus'),
    'London, UK',
    'GB',
    'pending'
),
(
    'hi-card',
    'hi Card',
    'Crypto debit card with daily rewards. Spend from 20+ cryptocurrencies. Tiered membership with varying benefits.',
    'Crypto card with daily rewards',
    'https://hi.com',
    (SELECT id FROM product_types WHERE code = 'Crypto Card'),
    (SELECT id FROM brands WHERE name = 'hi'),
    'Singapore',
    'SG',
    'pending'
),
(
    'fold-card',
    'Fold Card',
    'Bitcoin rewards debit card. Earn BTC on every purchase with spin-the-wheel feature. US-focused with Visa network.',
    'Bitcoin rewards debit card',
    'https://foldapp.com',
    (SELECT id FROM product_types WHERE code = 'Crypto Card'),
    (SELECT id FROM brands WHERE name = 'Fold'),
    'Austin, USA',
    'US',
    'pending'
),
(
    'curve-card',
    'Curve Card',
    'All-in-one card that can link to crypto cards. Go Back in Time feature to switch payment sources. Aggregates multiple cards.',
    'Card aggregator linking multiple cards',
    'https://curve.com',
    (SELECT id FROM product_types WHERE code = 'Crypto Card'),
    (SELECT id FROM brands WHERE name = 'Curve'),
    'London, UK',
    'GB',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 5: FIAT ON/OFF RAMPS
-- ============================================================

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'moonpay',
    'MoonPay',
    'Leading fiat onramp integrated in 100+ wallets and DApps. Supports credit card, bank transfer, and Apple Pay. Available in 160+ countries.',
    'Leading crypto onramp for wallets and DApps',
    'https://moonpay.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'MoonPay'),
    'Miami, USA',
    'US',
    'pending'
),
(
    'ramp-network',
    'Ramp Network',
    'European fiat onramp with competitive fees. Integrated in MetaMask and major wallets. Supports instant bank transfers in EU.',
    'European fiat onramp with low fees',
    'https://ramp.network',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Ramp Network'),
    'Warsaw, Poland',
    'PL',
    'pending'
),
(
    'transak',
    'Transak',
    'Global fiat onramp with wide coverage. Integrated in 300+ DApps and wallets. Supports 170+ cryptocurrencies.',
    'Global fiat onramp for DApps',
    'https://transak.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Transak'),
    'Miami, USA',
    'US',
    'pending'
),
(
    'banxa',
    'Banxa',
    'Australian fiat gateway for crypto. White-label solution for exchanges. Supports local payment methods globally.',
    'Australian fiat gateway',
    'https://banxa.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Banxa'),
    'Melbourne, Australia',
    'AU',
    'pending'
),
(
    'simplex-onramp',
    'Simplex',
    'Fiat onramp owned by Nuvei. Known for credit card processing. Integrated in major exchanges like Binance.',
    'Credit card focused fiat onramp',
    'https://simplex.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Simplex'),
    'Tel Aviv, Israel',
    'IL',
    'pending'
),
(
    'mercuryo',
    'Mercuryo',
    'European crypto payments infrastructure. Widget for buying/selling crypto. B2B and B2C solutions.',
    'European crypto payments infrastructure',
    'https://mercuryo.io',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Mercuryo'),
    'London, UK',
    'GB',
    'pending'
),
(
    'mt-pelerin',
    'Mt Pelerin',
    'Swiss-regulated crypto gateway. Bridge Wallet for self-custody purchases. No KYC under CHF 1000.',
    'Swiss-regulated crypto gateway',
    'https://mtpelerin.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Mt Pelerin'),
    'Geneva, Switzerland',
    'CH',
    'pending'
),
(
    'onramper',
    'Onramper',
    'Aggregator of fiat onramps. Compares MoonPay, Ramp, Transak, and more. Single integration for best rates.',
    'Fiat onramp aggregator',
    'https://onramper.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Onramper'),
    'Amsterdam, Netherlands',
    'NL',
    'pending'
),
(
    'sardine-onramp',
    'Sardine',
    'Fraud-prevention focused fiat onramp. Higher approval rates with risk scoring. Enterprise solution.',
    'Fraud-prevention fiat onramp',
    'https://sardine.ai',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Sardine'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'alchemy-pay-onramp',
    'Alchemy Pay',
    'Asian-focused fiat onramp. Supports local payment methods in Asia. Both on and off-ramp services.',
    'Asian-focused fiat on/off ramp',
    'https://alchemypay.org',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Alchemy Pay'),
    'Singapore',
    'SG',
    'pending'
),
(
    'utorg',
    'Utorg',
    'European fiat onramp with bank transfers. Competitive rates for EU users. Quick verification process.',
    'European fiat onramp',
    'https://utorg.pro',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Utorg'),
    'Estonia',
    'EE',
    'pending'
),
(
    'paybis',
    'Paybis',
    'UK-based fiat gateway since 2014. Supports credit cards and bank transfers. Simple interface for beginners.',
    'UK fiat gateway since 2014',
    'https://paybis.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Paybis'),
    'Glasgow, UK',
    'GB',
    'pending'
),
(
    'guardarian',
    'Guardarian',
    'Estonian fiat onramp with 400+ cryptocurrencies. No registration required for small amounts. Fast transactions.',
    'Estonian onramp with 400+ cryptos',
    'https://guardarian.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Guardarian'),
    'Tallinn, Estonia',
    'EE',
    'pending'
),
(
    'kado-money',
    'Kado',
    'Fiat onramp focused on DeFi. Direct deposits to DeFi protocols. Supports stablecoins on multiple chains.',
    'DeFi-focused fiat onramp',
    'https://kado.money',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Kado'),
    'Miami, USA',
    'US',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 6: BITCOIN-ONLY APPS
-- ============================================================

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'strike-app',
    'Strike',
    'Bitcoin and Lightning payment app. Send money globally with low fees via Lightning. Bitcoin purchases with no fees. Strong El Salvador presence.',
    'Bitcoin Lightning payment app',
    'https://strike.me',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Strike'),
    'Chicago, USA',
    'US',
    'pending'
),
(
    'relai-app',
    'Relai',
    'Swiss Bitcoin-only app. Auto-invest in Bitcoin with recurring buys. No KYC under limits. Self-custody focused.',
    'Swiss Bitcoin auto-invest app',
    'https://relai.app',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Relai'),
    'Zurich, Switzerland',
    'CH',
    'pending'
),
(
    'pocket-bitcoin',
    'Pocket Bitcoin',
    'Swiss Bitcoin buying service. Direct to self-custody with no account needed. Bank transfer purchases.',
    'Swiss non-custodial Bitcoin buying',
    'https://pocketbitcoin.com',
    (SELECT id FROM product_types WHERE code = 'Onramp'),
    (SELECT id FROM brands WHERE name = 'Pocket Bitcoin'),
    'Zurich, Switzerland',
    'CH',
    'pending'
),
(
    'peach-bitcoin',
    'Peach Bitcoin',
    'Peer-to-peer Bitcoin trading app. No KYC required. Direct trades between users with escrow protection.',
    'P2P Bitcoin trading without KYC',
    'https://peachbitcoin.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Peach Bitcoin'),
    'Switzerland',
    'CH',
    'pending'
),
(
    'swan-bitcoin',
    'Swan Bitcoin',
    'US Bitcoin accumulation platform. Automatic recurring purchases. IRA accounts for Bitcoin. Educational resources.',
    'US Bitcoin accumulation platform',
    'https://swanbitcoin.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Swan Bitcoin'),
    'Los Angeles, USA',
    'US',
    'pending'
),
(
    'river-financial',
    'River',
    'US Bitcoin-only financial services. Private client services, mining, and Lightning. Focus on high-net-worth individuals.',
    'US Bitcoin financial services',
    'https://river.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'River'),
    'San Francisco, USA',
    'US',
    'pending'
),
(
    'amber-app',
    'Amber',
    'Australian Bitcoin accumulation app. Round-ups and recurring buys. Self-custody with withdrawal to own wallet.',
    'Australian Bitcoin app with round-ups',
    'https://amber.app',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Amber'),
    'Sydney, Australia',
    'AU',
    'pending'
),
-- Canadian Apps
(
    'shakepay',
    'Shakepay',
    'Canadian Bitcoin and Ethereum app. Shake feature to earn free BTC. Visa card with BTC cashback. Popular in Canada.',
    'Canadian Bitcoin app with rewards',
    'https://shakepay.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Shakepay'),
    'Montreal, Canada',
    'CA',
    'pending'
),
(
    'newton-crypto',
    'Newton',
    'Canadian no-fee crypto trading. Supports 70+ cryptocurrencies. Competitive spreads for CAD.',
    'Canadian no-fee crypto trading',
    'https://newton.co',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Newton'),
    'Toronto, Canada',
    'CA',
    'pending'
),
(
    'bitbuy',
    'Bitbuy',
    'Canadian crypto exchange. Registered with securities regulators. CAD deposits via Interac.',
    'Canadian registered crypto exchange',
    'https://bitbuy.ca',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Bitbuy'),
    'Toronto, Canada',
    'CA',
    'pending'
),
(
    'bull-bitcoin',
    'Bull Bitcoin',
    'Canadian Bitcoin-only exchange. Non-custodial with direct to wallet delivery. No altcoins, only Bitcoin.',
    'Canadian Bitcoin-only non-custodial exchange',
    'https://bullbitcoin.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Bull Bitcoin'),
    'Montreal, Canada',
    'CA',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 7: CRYPTO-NATIVE FINTECH
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Crypto.com', 'https://crypto.com'),
    ('Nexo', 'https://nexo.io'),
    ('YouHodler', 'https://youhodler.com'),
    ('SwissBorg', 'https://swissborg.com'),
    ('Wirex', 'https://wirex.com'),
    ('BlockFi', 'https://blockfi.com'),
    ('Celsius', 'https://celsius.network'),
    ('Ledn', 'https://ledn.io'),
    ('Midas', 'https://midas.investments'),
    ('Abra', 'https://abra.com'),
    ('Uphold', 'https://uphold.com')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'crypto-com-app',
    'Crypto.com App',
    'Crypto super-app with 100+ million users. Buy, sell, stake, and earn on 250+ cryptocurrencies. Visa card integration and DeFi wallet.',
    'Major crypto super-app with cards and DeFi',
    'https://crypto.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Crypto.com'),
    'Singapore',
    'SG',
    'pending'
),
(
    'crypto-com-visa',
    'Crypto.com Visa Card',
    'Metal Visa card with up to 5% cashback in CRO. Spotify, Netflix, and Amazon Prime rebates. Multiple tiers with staking requirements.',
    'Metal Visa card with crypto cashback',
    'https://crypto.com/cards',
    (SELECT id FROM product_types WHERE code = 'Crypto Card'),
    (SELECT id FROM brands WHERE name = 'Crypto.com'),
    'Singapore',
    'SG',
    'pending'
),
(
    'nexo-platform',
    'Nexo',
    'Crypto lending and earning platform. Borrow against crypto collateral. Earn interest on crypto and stablecoins. Regulated in multiple jurisdictions.',
    'Crypto lending and earning platform',
    'https://nexo.io',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Nexo'),
    'London, UK',
    'GB',
    'pending'
),
(
    'nexo-card',
    'Nexo Card',
    'Crypto-backed credit card. Spend credit line backed by crypto. No need to sell assets. Mastercard network.',
    'Crypto-backed credit card',
    'https://nexo.io/nexo-card',
    (SELECT id FROM product_types WHERE code = 'Crypto Card'),
    (SELECT id FROM brands WHERE name = 'Nexo'),
    'London, UK',
    'GB',
    'pending'
),
(
    'youhodler',
    'YouHodler',
    'Swiss-based crypto lending platform. Multi HODL leveraged trading. Turbocharge yield strategies. EU and Swiss regulated.',
    'Swiss crypto lending with leverage',
    'https://youhodler.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'YouHodler'),
    'Lausanne, Switzerland',
    'CH',
    'pending'
),
(
    'swissborg',
    'SwissBorg',
    'Swiss crypto wealth management app. Smart Yield for optimized returns. CHSB token for premium features. 800K+ users.',
    'Swiss crypto wealth management',
    'https://swissborg.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'SwissBorg'),
    'Lausanne, Switzerland',
    'CH',
    'pending'
),
(
    'wirex-app',
    'Wirex',
    'Crypto-friendly payment platform. Visa card with X-tras rewards. Supports 150+ currencies. Multi-currency accounts.',
    'Crypto payment platform with rewards',
    'https://wirex.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Wirex'),
    'London, UK',
    'GB',
    'pending'
),
(
    'ledn',
    'Ledn',
    'Canadian crypto lending platform. Bitcoin-backed loans. B2X product for leveraged BTC exposure. Proof of reserves.',
    'Canadian Bitcoin lending platform',
    'https://ledn.io',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Ledn'),
    'Toronto, Canada',
    'CA',
    'pending'
),
(
    'uphold',
    'Uphold',
    'Multi-asset trading platform. Trade crypto, stocks, metals in one account. XRP-friendly platform. US and EU available.',
    'Multi-asset trading platform',
    'https://uphold.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Uphold'),
    'New York, USA',
    'US',
    'pending'
),
(
    'abra',
    'Abra',
    'Crypto wealth management for high-net-worth. Private client services. Earn, borrow, and trade. Institutional focus.',
    'Crypto wealth management',
    'https://abra.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Abra'),
    'San Francisco, USA',
    'US',
    'pending'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 8: DEFUNCT/WARNING PRODUCTS (Historical)
-- ============================================================

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
VALUES
(
    'blockfi',
    'BlockFi (DEFUNCT)',
    'DEFUNCT - Filed for bankruptcy in November 2022 following FTX collapse. Was a crypto lending platform offering interest accounts and loans. Users lost access to funds.',
    'DEFUNCT crypto lending platform (bankruptcy 2022)',
    'https://blockfi.com',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'BlockFi'),
    'New Jersey, USA',
    'US',
    'critical'
),
(
    'celsius-network',
    'Celsius Network (DEFUNCT)',
    'DEFUNCT - Filed for bankruptcy in July 2022. Was a crypto lending platform with 1.7M users. Froze withdrawals before collapse. Major crypto failure.',
    'DEFUNCT crypto lending platform (bankruptcy 2022)',
    'https://celsius.network',
    (SELECT id FROM product_types WHERE code = 'Fintech'),
    (SELECT id FROM brands WHERE name = 'Celsius'),
    'New Jersey, USA',
    'US',
    'critical'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    fintech_count INTEGER;
    card_count INTEGER;
    onramp_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fintech_count FROM products WHERE type_id = (SELECT id FROM product_types WHERE code = 'Fintech');
    SELECT COUNT(*) INTO card_count FROM products WHERE type_id = (SELECT id FROM product_types WHERE code = 'Crypto Card');
    SELECT COUNT(*) INTO onramp_count FROM products WHERE type_id = (SELECT id FROM product_types WHERE code = 'Onramp');

    RAISE NOTICE 'Fintech products: %', fintech_count;
    RAISE NOTICE 'Crypto Card products: %', card_count;
    RAISE NOTICE 'Onramp products: %', onramp_count;
END $$;

-- ============================================================
-- DONE!
-- ============================================================
