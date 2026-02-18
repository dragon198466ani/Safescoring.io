-- ============================================================
-- CONSOLIDATED MIGRATION: Map + Legislation System
-- ============================================================
-- Run this entire file in Supabase SQL Editor to set up everything at once
-- Execution time: ~1 minute
-- ============================================================

-- ============================================================
-- STEP 1/5: Physical Incidents Migration
-- ============================================================

-- (Migration 008 content will be inserted here - checking if table exists first)
CREATE TABLE IF NOT EXISTS physical_incidents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    incident_type VARCHAR(50) NOT NULL,
    description TEXT,
    date DATE,
    location_city VARCHAR(100),
    location_country VARCHAR(2),
    location_coordinates POINT,
    victim_pseudonym VARCHAR(100),
    victim_type VARCHAR(50),
    victim_had_public_profile BOOLEAN DEFAULT FALSE,
    victim_disclosed_holdings BOOLEAN DEFAULT FALSE,
    amount_stolen_usd BIGINT,
    amount_stolen_crypto DECIMAL(20, 8),
    asset_type VARCHAR(50),
    funds_recovered BOOLEAN DEFAULT FALSE,
    recovery_percentage INTEGER,
    opsec_failures TEXT[],
    attack_vector TEXT,
    how_victim_was_identified TEXT,
    prevention_possible BOOLEAN,
    prevention_methods TEXT[],
    products_compromised INTEGER[],
    duress_protection_available BOOLEAN,
    duress_protection_used BOOLEAN,
    duress_protection_bypassed BOOLEAN,
    status VARCHAR(50) DEFAULT 'under_investigation',
    perpetrators_caught BOOLEAN DEFAULT FALSE,
    legal_outcome TEXT,
    source_urls TEXT[],
    media_coverage_level VARCHAR(20),
    case_study_available BOOLEAN DEFAULT FALSE,
    case_study_url VARCHAR(255),
    lessons_learned TEXT[],
    severity_score INTEGER NOT NULL,
    opsec_risk_level VARCHAR(20),
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(100),
    verification_date TIMESTAMP,
    confidence_level VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- Indexes for physical_incidents
CREATE INDEX IF NOT EXISTS idx_physical_incidents_date ON physical_incidents(date DESC);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_coordinates ON physical_incidents USING GIST(location_coordinates);

-- ============================================================
-- STEP 2/5: Add Geography to Products
-- ============================================================

-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='products' AND column_name='headquarters') THEN
        ALTER TABLE products ADD COLUMN headquarters VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='products' AND column_name='country_origin') THEN
        ALTER TABLE products ADD COLUMN country_origin VARCHAR(2);
    END IF;
END $$;

-- Sample updates for major products (you can add more later)
UPDATE products SET headquarters = 'Paris, France', country_origin = 'FR' WHERE slug LIKE 'ledger%';
UPDATE products SET headquarters = 'Prague, Czech Republic', country_origin = 'CZ' WHERE slug LIKE 'trezor%';
UPDATE products SET headquarters = 'Zurich, Switzerland', country_origin = 'CH' WHERE slug LIKE 'bitbox%';
UPDATE products SET headquarters = 'San Francisco, USA', country_origin = 'US' WHERE slug LIKE 'coinbase%';
UPDATE products SET headquarters = 'Zug, Switzerland', country_origin = 'CH' WHERE slug = 'ethereum';
UPDATE products SET headquarters = 'Global', country_origin = 'XX' WHERE slug = 'bitcoin';

-- ============================================================
-- STEP 3/5: Crypto Legislation Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS crypto_legislation (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL,
    legislation_id VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    title VARCHAR(300) NOT NULL,
    short_title VARCHAR(100),
    description TEXT,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'proposed',
    severity VARCHAR(20) DEFAULT 'medium',
    proposed_date DATE,
    passed_date DATE,
    effective_date DATE,
    expiry_date DATE,
    affects_products BOOLEAN DEFAULT true,
    kyc_required BOOLEAN DEFAULT false,
    aml_required BOOLEAN DEFAULT false,
    license_required BOOLEAN DEFAULT false,
    regulatory_body VARCHAR(200),
    official_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    verified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS country_crypto_profiles (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    crypto_stance VARCHAR(50) DEFAULT 'neutral',
    regulatory_clarity_score INTEGER,
    compliance_difficulty_score INTEGER,
    innovation_score INTEGER,
    overall_score INTEGER,
    crypto_legal BOOLEAN DEFAULT true,
    trading_allowed BOOLEAN DEFAULT true,
    mining_allowed BOOLEAN DEFAULT true,
    crypto_taxed BOOLEAN DEFAULT false,
    capital_gains_tax_rate DECIMAL(5, 2),
    regulatory_body VARCHAR(200),
    cbdc_status VARCHAR(50),
    last_updated TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- STEP 4/5: Seed Country Profiles
-- ============================================================

INSERT INTO country_crypto_profiles (
    country_code, country_name, crypto_stance,
    regulatory_clarity_score, compliance_difficulty_score, innovation_score, overall_score,
    crypto_legal, trading_allowed, mining_allowed,
    crypto_taxed, capital_gains_tax_rate, regulatory_body
) VALUES
('US', 'United States', 'restrictive', 65, 70, 80, 65, true, true, true, true, 20.0, 'SEC, CFTC'),
('CH', 'Switzerland', 'very_friendly', 95, 35, 92, 90, true, true, true, true, 0.0, 'FINMA'),
('SG', 'Singapore', 'very_friendly', 90, 40, 90, 88, true, true, true, true, 0.0, 'MAS'),
('SV', 'El Salvador', 'very_friendly', 85, 25, 95, 92, true, true, true, false, 0.0, 'Central Bank'),
('AE', 'UAE', 'very_friendly', 80, 30, 88, 85, true, true, true, false, 0.0, 'SCA, VARA'),
('DE', 'Germany', 'friendly', 85, 45, 80, 78, true, true, true, true, 0.0, 'BaFin'),
('FR', 'France', 'friendly', 80, 50, 75, 72, true, true, true, true, 30.0, 'AMF'),
('JP', 'Japan', 'friendly', 90, 55, 75, 75, true, true, true, true, 20.0, 'FSA'),
('GB', 'United Kingdom', 'neutral', 75, 60, 70, 70, true, true, true, true, 20.0, 'FCA'),
('CN', 'China', 'very_hostile', 90, 100, 10, 15, false, false, false, false, 0.0, 'PBOC')
ON CONFLICT (country_code) DO UPDATE SET
    crypto_stance = EXCLUDED.crypto_stance,
    overall_score = EXCLUDED.overall_score;

-- ============================================================
-- STEP 5/5: Sample Physical Incident
-- ============================================================

INSERT INTO physical_incidents (
    title, slug, incident_type, description, date,
    location_city, location_country, location_coordinates,
    victim_pseudonym, victim_type,
    victim_had_public_profile, victim_disclosed_holdings,
    opsec_failures, status, severity_score, opsec_risk_level,
    verified, confidence_level,
    media_coverage_level
) VALUES (
    'Dubai Crypto Influencer Incident (2024)',
    'dubai-influencer-dec-2024',
    'kidnapping',
    'High-profile crypto influencer targeted after public disclosure of holdings.',
    '2024-12-15',
    'Dubai', 'AE',
    POINT(55.2708, 25.2048),  -- Dubai coordinates
    'Crypto Influencer (Redacted)', 'influencer',
    TRUE, TRUE,
    ARRAY['Public disclosure of holdings', 'Real-time location sharing', 'Predictable routine'],
    'confirmed', 9, 'critical',
    TRUE, 'confirmed',
    'viral'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT
    'Migration Complete!' as status,
    (SELECT COUNT(*) FROM physical_incidents) as physical_incidents,
    (SELECT COUNT(*) FROM products WHERE country_origin IS NOT NULL) as products_with_geography,
    (SELECT COUNT(*) FROM country_crypto_profiles) as country_profiles;
