-- ============================================================
-- SAFESCORING - QUICK SETUP FOR MAP DATA
-- ============================================================
-- Run this in Supabase Dashboard SQL Editor to:
-- 1. Create predictions table
-- 2. Add sample products with country data
-- 3. Add physical incidents for map markers
-- ============================================================

-- ============================================================
-- STEP 1: CREATE PREDICTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    safe_score_at_prediction DECIMAL(5,2) NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL')),
    incident_probability DECIMAL(4,3) NOT NULL,
    prediction_window_days INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    weakest_pillar CHAR(1) CHECK (weakest_pillar IN ('S', 'A', 'F', 'E')),
    weakest_pillar_score DECIMAL(5,2),
    confidence DECIMAL(4,3) DEFAULT 0.85,
    methodology_version TEXT DEFAULT 'SAFE-v2.0',
    commitment_hash TEXT UNIQUE NOT NULL,
    predictions_json JSONB,
    blockchain_tx_hash TEXT,
    blockchain_network TEXT DEFAULT 'polygon',
    blockchain_block_number BIGINT,
    blockchain_timestamp TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'validated')),
    validated_at TIMESTAMPTZ,
    incident_occurred BOOLEAN,
    validation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_predictions_product_id ON predictions(product_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_risk_level ON predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_expires_at ON predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_predictions_commitment_hash ON predictions(commitment_hash);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_predictions_updated_at ON predictions;
CREATE TRIGGER trigger_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_predictions_updated_at();

-- RLS (skip if already exists)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'predictions' AND policyname = 'Anyone can read predictions') THEN
        CREATE POLICY "Anyone can read predictions" ON predictions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'predictions' AND policyname = 'Service role can manage predictions') THEN
        CREATE POLICY "Service role can manage predictions" ON predictions FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ============================================================
-- STEP 2: ENSURE PHYSICAL_INCIDENTS TABLE EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS physical_incidents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('robbery', 'home_invasion', 'kidnapping', 'assault', 'extortion', 'murder', 'other')),
    description TEXT,
    date DATE NOT NULL,
    location_city TEXT,
    location_country TEXT,
    location_coordinates POINT,
    victim_pseudonym TEXT,
    victim_type TEXT DEFAULT 'holder' CHECK (victim_type IN ('holder', 'trader', 'miner', 'influencer', 'developer', 'executive', 'other')),
    victim_had_public_profile BOOLEAN DEFAULT FALSE,
    victim_disclosed_holdings BOOLEAN DEFAULT FALSE,
    amount_stolen_usd DECIMAL(15,2),
    opsec_failures TEXT[],
    attack_vector TEXT,
    how_victim_was_identified TEXT,
    prevention_possible BOOLEAN DEFAULT TRUE,
    prevention_methods TEXT[],
    status TEXT DEFAULT 'unresolved' CHECK (status IN ('confirmed', 'unresolved', 'resolved', 'disputed')),
    media_coverage_level TEXT DEFAULT 'local' CHECK (media_coverage_level IN ('none', 'local', 'national', 'international', 'viral')),
    severity_score INTEGER DEFAULT 5 CHECK (severity_score >= 1 AND severity_score <= 10),
    opsec_risk_level TEXT DEFAULT 'medium' CHECK (opsec_risk_level IN ('low', 'medium', 'high', 'critical')),
    confidence_level TEXT DEFAULT 'confirmed' CHECK (confidence_level IN ('rumored', 'reported', 'confirmed', 'verified')),
    verified BOOLEAN DEFAULT FALSE,
    lessons_learned TEXT[],
    source_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for physical_incidents
CREATE INDEX IF NOT EXISTS idx_physical_incidents_country ON physical_incidents(location_country);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_date ON physical_incidents(date);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_type ON physical_incidents(incident_type);

-- RLS for physical_incidents (skip if already exists)
ALTER TABLE physical_incidents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'physical_incidents' AND policyname = 'Anyone can read physical incidents') THEN
        CREATE POLICY "Anyone can read physical incidents" ON physical_incidents FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================
-- STEP 3: ADD SAMPLE PHYSICAL INCIDENTS WITH COORDINATES
-- ============================================================

INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country, location_coordinates,
    victim_type, amount_stolen_usd,
    status, severity_score, opsec_risk_level, verified
) VALUES
    ('Dubai Crypto Trader Targeted', 'dubai-trader-2024', 'kidnapping',
     'High-profile crypto trader targeted after displaying wealth on social media.',
     '2024-12-15', 'Dubai', 'AE', POINT(55.2708, 25.2048),
     'influencer', 2500000, 'confirmed', 9, 'critical', TRUE),

    ('Hong Kong Bitcoin Holder Home Invasion', 'hk-home-invasion-2024', 'home_invasion',
     'Early Bitcoin adopter targeted at home. Attackers posed as delivery personnel.',
     '2024-09-08', 'Hong Kong', 'HK', POINT(114.1694, 22.3193),
     'holder', 3200000, 'confirmed', 8, 'high', TRUE),

    ('London OTC Trader Robbery', 'london-otc-2024', 'robbery',
     'OTC trader robbed during in-person cash deal. Met at public location but was followed.',
     '2024-07-22', 'London', 'GB', POINT(-0.1276, 51.5074),
     'trader', 890000, 'confirmed', 7, 'high', TRUE),

    ('Miami Beach Crypto Executive Assault', 'miami-exec-2024', 'assault',
     'Crypto exchange executive assaulted in parking garage. Attackers demanded wallet access.',
     '2024-06-15', 'Miami', 'US', POINT(-80.1918, 25.7617),
     'executive', 150000, 'resolved', 6, 'medium', TRUE),

    ('Singapore Trader Extortion', 'singapore-extortion-2024', 'extortion',
     'Trader received death threats demanding crypto payment. Attackers had personal information.',
     '2024-05-20', 'Singapore', 'SG', POINT(103.8198, 1.3521),
     'trader', 500000, 'resolved', 7, 'high', TRUE),

    ('Paris Mining Facility Break-in', 'paris-mining-2024', 'robbery',
     'Mining facility broken into. Hardware and cold storage devices stolen.',
     '2024-04-10', 'Paris', 'FR', POINT(2.3522, 48.8566),
     'miner', 1200000, 'unresolved', 5, 'medium', TRUE),

    ('Tokyo Exchange Employee Targeted', 'tokyo-exchange-2024', 'assault',
     'Exchange employee followed home and forced to transfer funds.',
     '2024-03-05', 'Tokyo', 'JP', POINT(139.6917, 35.6895),
     'executive', 450000, 'confirmed', 6, 'high', TRUE),

    ('Sydney Crypto Meetup Robbery', 'sydney-meetup-2024', 'robbery',
     'Group of attendees robbed after crypto meetup. Attackers waited outside venue.',
     '2024-02-18', 'Sydney', 'AU', POINT(151.2093, -33.8688),
     'holder', 280000, 'confirmed', 5, 'medium', TRUE),

    ('Amsterdam Developer Home Invasion', 'amsterdam-dev-2024', 'home_invasion',
     'DeFi protocol developer targeted at home. Attackers had insider information.',
     '2024-01-25', 'Amsterdam', 'NL', POINT(4.9041, 52.3676),
     'developer', 750000, 'confirmed', 7, 'high', TRUE),

    ('Berlin OTC Deal Gone Wrong', 'berlin-otc-2024', 'robbery',
     'Bitcoin for cash deal turned violent. Meeting arranged through Telegram.',
     '2024-01-10', 'Berlin', 'DE', POINT(13.4050, 52.5200),
     'trader', 180000, 'confirmed', 6, 'medium', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STEP 4: ENSURE PRODUCT_TYPES TABLE HAS DATA
-- ============================================================

INSERT INTO product_types (code, name, category, is_hardware, is_custodial) VALUES
    ('HW Cold', 'Hardware Wallet (Cold)', 'Wallets', TRUE, FALSE),
    ('SW Hot', 'Software Wallet (Hot)', 'Wallets', FALSE, FALSE),
    ('CEX', 'Centralized Exchange', 'Exchanges', FALSE, TRUE),
    ('DEX', 'Decentralized Exchange', 'Exchanges', FALSE, FALSE),
    ('DeFi', 'DeFi Protocol', 'DeFi', FALSE, FALSE),
    ('CUS', 'Custodial Service', 'Custody', FALSE, TRUE),
    ('CARD', 'Crypto Debit Card', 'Payments', FALSE, TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category;

-- ============================================================
-- STEP 5: ENSURE BRANDS TABLE HAS DATA
-- ============================================================

INSERT INTO brands (name, website) VALUES
    ('Ledger', 'https://ledger.com'),
    ('Trezor', 'https://trezor.io'),
    ('BitBox', 'https://shiftcrypto.ch'),
    ('Coldcard', 'https://coldcard.com'),
    ('Keystone', 'https://keyst.one'),
    ('GridPlus', 'https://gridplus.io'),
    ('Foundation', 'https://foundationdevices.com'),
    ('Binance', 'https://binance.com'),
    ('Coinbase', 'https://coinbase.com'),
    ('Kraken', 'https://kraken.com'),
    ('Uniswap', 'https://uniswap.org'),
    ('Metamask', 'https://metamask.io'),
    ('Trust Wallet', 'https://trustwallet.com'),
    ('Exodus', 'https://exodus.com'),
    ('Phantom', 'https://phantom.app')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STEP 6: ADD SAMPLE PRODUCTS WITH COUNTRY DATA
-- ============================================================

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'ledger-nano-x',
    'Ledger Nano X',
    'Premium hardware wallet with Bluetooth connectivity and support for 5500+ cryptocurrencies. Features CC EAL5+ certified Secure Element chip.',
    'Premium Bluetooth hardware wallet',
    'https://ledger.com/products/ledger-nano-x',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Ledger'),
    'Paris',
    'FR',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'ledger-nano-x');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'trezor-model-t',
    'Trezor Model T',
    'Premium open-source hardware wallet with full-color touchscreen. Supports 1800+ cryptocurrencies with Shamir Backup support.',
    'Open-source touchscreen hardware wallet',
    'https://trezor.io/trezor-model-t',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Trezor'),
    'Prague',
    'CZ',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'trezor-model-t');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'coldcard-mk4',
    'Coldcard Mk4',
    'Bitcoin-only hardware wallet with air-gap support, NFC, and military-grade security. Designed for maximum paranoia.',
    'Bitcoin-only air-gapped hardware wallet',
    'https://coldcard.com',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Coldcard'),
    'Toronto',
    'CA',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'coldcard-mk4');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'bitbox02',
    'BitBox02',
    'Swiss-made hardware wallet with minimalist design. Features secure chip, microSD backup, and open-source firmware.',
    'Swiss minimalist hardware wallet',
    'https://shiftcrypto.ch/bitbox02',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'BitBox'),
    'Zurich',
    'CH',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'bitbox02');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'binance',
    'Binance',
    'World''s largest cryptocurrency exchange by trading volume. Offers spot, margin, futures trading and staking services.',
    'Largest crypto exchange by volume',
    'https://binance.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Binance'),
    'Dubai',
    'AE',
    'warning'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'binance');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'coinbase',
    'Coinbase',
    'US-based publicly traded cryptocurrency exchange. Known for regulatory compliance and user-friendly interface.',
    'US regulated crypto exchange',
    'https://coinbase.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Coinbase'),
    'San Francisco',
    'US',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'coinbase');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'kraken',
    'Kraken',
    'US-based cryptocurrency exchange known for security and proof of reserves. Offers spot, margin, and futures trading.',
    'Security-focused US crypto exchange',
    'https://kraken.com',
    (SELECT id FROM product_types WHERE code = 'CEX'),
    (SELECT id FROM brands WHERE name = 'Kraken'),
    'San Francisco',
    'US',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'kraken');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'metamask',
    'MetaMask',
    'Most popular Ethereum wallet and browser extension. Supports all EVM chains and connects to dApps.',
    'Leading Ethereum browser wallet',
    'https://metamask.io',
    (SELECT id FROM product_types WHERE code = 'SW Hot'),
    (SELECT id FROM brands WHERE name = 'Metamask'),
    'San Francisco',
    'US',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'metamask');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'uniswap',
    'Uniswap',
    'Leading decentralized exchange on Ethereum. Pioneer of AMM model with billions in daily trading volume.',
    'Leading Ethereum DEX',
    'https://uniswap.org',
    (SELECT id FROM product_types WHERE code = 'DEX'),
    (SELECT id FROM brands WHERE name = 'Uniswap'),
    'New York',
    'US',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'uniswap');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'keystone-pro',
    'Keystone Pro',
    'Air-gapped hardware wallet with QR code signing. Features fingerprint sensor and open-source firmware.',
    'Air-gapped QR code hardware wallet',
    'https://keyst.one',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Keystone'),
    'Hong Kong',
    'HK',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'keystone-pro');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'gridplus-lattice1',
    'GridPlus Lattice1',
    'Enterprise-grade hardware wallet with large touchscreen. Supports smart card integration and SafeCards.',
    'Enterprise hardware wallet with smart cards',
    'https://gridplus.io',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'GridPlus'),
    'Austin',
    'US',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'gridplus-lattice1');

INSERT INTO products (slug, name, description, short_description, url, type_id, brand_id, headquarters, country_origin, security_status)
SELECT
    'foundation-passport',
    'Foundation Passport',
    'Bitcoin-only air-gapped hardware wallet. Open-source with focus on sovereignty and security.',
    'Bitcoin-only open-source hardware wallet',
    'https://foundationdevices.com',
    (SELECT id FROM product_types WHERE code = 'HW Cold'),
    (SELECT id FROM brands WHERE name = 'Foundation'),
    'Boston',
    'US',
    'secure'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'foundation-passport');

-- ============================================================
-- STEP 7: ADD SAMPLE SAFE SCORES FOR PRODUCTS
-- ============================================================

INSERT INTO safe_scoring_results (product_id, note_finale, note_s, note_a, note_f, note_e, version, calculated_at)
SELECT
    p.id,
    CASE
        WHEN p.slug = 'ledger-nano-x' THEN 8.2
        WHEN p.slug = 'trezor-model-t' THEN 8.5
        WHEN p.slug = 'coldcard-mk4' THEN 9.1
        WHEN p.slug = 'bitbox02' THEN 8.7
        WHEN p.slug = 'binance' THEN 6.8
        WHEN p.slug = 'coinbase' THEN 7.9
        WHEN p.slug = 'kraken' THEN 8.1
        WHEN p.slug = 'metamask' THEN 7.2
        WHEN p.slug = 'uniswap' THEN 7.5
        WHEN p.slug = 'keystone-pro' THEN 8.4
        WHEN p.slug = 'gridplus-lattice1' THEN 8.3
        WHEN p.slug = 'foundation-passport' THEN 8.9
        ELSE 7.0
    END,
    CASE WHEN p.slug LIKE '%cold%' OR p.slug LIKE '%passport%' THEN 9.0 ELSE 7.5 END,
    CASE WHEN p.slug LIKE '%trezor%' OR p.slug LIKE '%bitbox%' THEN 9.0 ELSE 7.0 END,
    7.5,
    8.0,
    'SAFE-v2.0',
    NOW()
FROM products p
WHERE p.slug IN ('ledger-nano-x', 'trezor-model-t', 'coldcard-mk4', 'bitbox02', 'binance', 'coinbase', 'kraken', 'metamask', 'uniswap', 'keystone-pro', 'gridplus-lattice1', 'foundation-passport')
AND NOT EXISTS (
    SELECT 1 FROM safe_scoring_results ssr WHERE ssr.product_id = p.id
);

-- ============================================================
-- DONE! Your map should now show:
-- - 12 products across multiple countries
-- - 10 physical incidents with map markers
-- - Predictions table ready for use
-- ============================================================

SELECT 'Setup complete!' as status,
       (SELECT COUNT(*) FROM products) as total_products,
       (SELECT COUNT(*) FROM physical_incidents) as total_incidents,
       (SELECT COUNT(*) FROM predictions) as total_predictions;
