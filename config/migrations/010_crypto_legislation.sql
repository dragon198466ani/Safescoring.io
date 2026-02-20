-- ============================================================
-- MIGRATION 010: CRYPTO LEGISLATION & COMPLIANCE TRACKING
-- ============================================================
-- Purpose: Track crypto legislation by country and product compliance
-- Date: 2025-01-03
-- Author: SafeScoring Legal Compliance Team
-- ============================================================

-- This migration creates a comprehensive system to track:
-- 1. Crypto legislation by country (past, present, future)
-- 2. Product availability and restrictions by country
-- 3. Compliance requirements for products
-- 4. Regulatory risk scoring

-- ============================================================
-- 1. CRYPTO LEGISLATION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS crypto_legislation (
    id SERIAL PRIMARY KEY,

    -- Identification
    country_code VARCHAR(2) NOT NULL,  -- ISO 2-letter code
    legislation_id VARCHAR(100) UNIQUE NOT NULL,  -- Unique identifier (e.g., "US-2024-SAB121")
    slug VARCHAR(150) UNIQUE NOT NULL,

    -- Basic Information
    title VARCHAR(300) NOT NULL,
    short_title VARCHAR(100),
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'ban',              -- Complete crypto ban
        'restriction',      -- Partial restrictions
        'regulation',       -- Regulatory framework
        'taxation',         -- Tax laws
        'licensing',        -- License requirements
        'aml_kyc',         -- AML/KYC requirements
        'stablecoin',      -- Stablecoin specific
        'mining',          -- Mining regulations
        'defi',            -- DeFi regulations
        'nft',             -- NFT regulations
        'custody',         -- Custody regulations
        'ico_sto',         -- ICO/STO regulations
        'consumer_protection', -- Consumer protection
        'sandbox',         -- Regulatory sandbox
        'supportive',      -- Pro-crypto legislation
        'cbdc',            -- Central Bank Digital Currency
        'other'
    )),

    -- Status
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'proposed',        -- Bill proposed
        'draft',          -- Draft stage
        'under_review',   -- Under legislative review
        'passed',         -- Passed but not yet in effect
        'in_effect',      -- Currently in effect
        'amended',        -- Amended (see related_legislation_ids)
        'repealed',       -- No longer in effect
        'rejected'        -- Proposal rejected
    )) DEFAULT 'proposed',

    -- Timeline
    proposed_date DATE,
    passed_date DATE,
    effective_date DATE,
    expiry_date DATE,  -- NULL if permanent
    last_amended_date DATE,

    -- Severity & Impact
    severity VARCHAR(20) CHECK (severity IN (
        'critical',  -- Complete ban, severe restrictions
        'high',      -- Major impact on crypto usage
        'medium',    -- Moderate regulations
        'low',       -- Light touch regulation
        'neutral',   -- Neither restrictive nor supportive
        'positive'   -- Pro-crypto, supportive
    )) DEFAULT 'medium',

    -- What it affects
    affects_products BOOLEAN DEFAULT true,
    affects_exchanges BOOLEAN DEFAULT false,
    affects_defi BOOLEAN DEFAULT false,
    affects_mining BOOLEAN DEFAULT false,
    affects_individuals BOOLEAN DEFAULT true,
    affects_businesses BOOLEAN DEFAULT false,

    -- Product types affected (if affects_products = true)
    affected_product_types VARCHAR(50)[],  -- ['HW_WALLET', 'EXCHANGE', etc.]

    -- Specific restrictions
    restrictions JSONB,  -- Flexible structure for various restrictions
    -- Example: {
    --   "max_transaction_amount": 10000,
    --   "kyc_required_above": 1000,
    --   "banned_features": ["privacy_coins", "mixing"],
    --   "license_required": true,
    --   "tax_rate": 0.3
    -- }

    -- Compliance requirements
    kyc_required BOOLEAN DEFAULT false,
    aml_required BOOLEAN DEFAULT false,
    license_required BOOLEAN DEFAULT false,
    license_type VARCHAR(100),
    reporting_required BOOLEAN DEFAULT false,
    reporting_frequency VARCHAR(50),  -- 'monthly', 'quarterly', 'annual'

    -- Penalties
    max_penalty_individual VARCHAR(200),  -- e.g., "$250,000 or 5 years imprisonment"
    max_penalty_business VARCHAR(200),

    -- Related legislation
    related_legislation_ids VARCHAR(100)[],  -- Links to other laws
    amends_legislation_id VARCHAR(100),      -- If this amends another law
    supersedes_legislation_id VARCHAR(100),  -- If this replaces another law

    -- Sources & Documentation
    official_url TEXT,
    source_urls TEXT[],
    full_text_url TEXT,
    summary_url TEXT,

    -- Regulatory body
    regulatory_body VARCHAR(200),  -- e.g., "SEC", "FINMA", "FCA"
    enforcement_agency VARCHAR(200),

    -- Risk & Compliance
    compliance_difficulty VARCHAR(20) CHECK (compliance_difficulty IN (
        'very_easy',
        'easy',
        'moderate',
        'difficult',
        'very_difficult',
        'impossible'  -- For bans
    )),
    regulatory_clarity VARCHAR(20) CHECK (regulatory_clarity IN (
        'very_clear',
        'clear',
        'somewhat_clear',
        'unclear',
        'very_unclear'
    )),

    -- Political context
    political_stability VARCHAR(20) CHECK (political_stability IN (
        'stable',      -- Unlikely to change
        'moderate',    -- May change with new government
        'unstable',    -- Likely to change
        'volatile'     -- Changes frequently
    )),

    -- Notes & Analysis
    key_provisions TEXT[],
    exemptions TEXT[],
    enforcement_history TEXT,
    legal_challenges TEXT,
    expert_analysis TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system',
    verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(100),
    verification_date TIMESTAMP,

    -- Full text search
    search_vector tsvector
);

-- ============================================================
-- 2. PRODUCT-COUNTRY COMPLIANCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS product_country_compliance (
    id SERIAL PRIMARY KEY,

    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL,

    -- Availability status
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'available',           -- Fully available
        'available_restricted', -- Available with restrictions
        'available_vpn',       -- Only via VPN (geo-blocked)
        'license_required',    -- Requires special license
        'banned',             -- Explicitly banned
        'unavailable',        -- Not offered (business decision)
        'unknown'             -- Status unclear
    )) DEFAULT 'unknown',

    -- Restrictions
    kyc_required BOOLEAN DEFAULT false,
    kyc_threshold_usd DECIMAL(18, 2),  -- KYC required above this amount
    withdrawal_limit_daily_usd DECIMAL(18, 2),
    withdrawal_limit_monthly_usd DECIMAL(18, 2),
    features_disabled TEXT[],  -- e.g., ['staking', 'margin_trading']

    -- Compliance
    legislation_ids VARCHAR(100)[],  -- Laws affecting this product in this country
    compliance_notes TEXT,
    last_verified_date DATE,

    -- Risk assessment
    regulatory_risk VARCHAR(20) CHECK (regulatory_risk IN (
        'very_low',
        'low',
        'medium',
        'high',
        'very_high',
        'critical'
    )),
    risk_factors TEXT[],

    -- Product-specific info
    local_entity BOOLEAN DEFAULT false,  -- Does product have local entity?
    local_entity_name VARCHAR(200),
    local_license_number VARCHAR(100),
    local_support BOOLEAN DEFAULT false,
    local_fiat_support BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(product_id, country_code)
);

-- ============================================================
-- 3. COUNTRY CRYPTO PROFILES
-- ============================================================
-- Summary of crypto-friendliness by country

CREATE TABLE IF NOT EXISTS country_crypto_profiles (
    id SERIAL PRIMARY KEY,

    country_code VARCHAR(2) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,

    -- Overall stance
    crypto_stance VARCHAR(50) CHECK (crypto_stance IN (
        'very_hostile',    -- Complete ban
        'hostile',         -- Heavy restrictions
        'restrictive',     -- Significant regulations
        'neutral',         -- Basic regulations
        'friendly',        -- Light touch, supportive
        'very_friendly',   -- Pro-crypto, innovation hubs
        'unregulated'      -- No specific regulations
    )) DEFAULT 'neutral',

    -- Scores (0-100)
    regulatory_clarity_score INTEGER CHECK (regulatory_clarity_score >= 0 AND regulatory_clarity_score <= 100),
    compliance_difficulty_score INTEGER CHECK (compliance_difficulty_score >= 0 AND compliance_difficulty_score <= 100),
    innovation_score INTEGER CHECK (innovation_score >= 0 AND innovation_score <= 100),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),

    -- Specific allowances
    crypto_legal BOOLEAN DEFAULT true,
    crypto_as_property BOOLEAN DEFAULT false,
    crypto_as_currency BOOLEAN DEFAULT false,
    crypto_as_commodity BOOLEAN DEFAULT false,
    crypto_as_security BOOLEAN DEFAULT false,

    -- Activities allowed
    trading_allowed BOOLEAN DEFAULT true,
    mining_allowed BOOLEAN DEFAULT true,
    ico_allowed BOOLEAN DEFAULT false,
    defi_allowed BOOLEAN DEFAULT true,
    staking_allowed BOOLEAN DEFAULT true,
    nft_allowed BOOLEAN DEFAULT true,

    -- Taxation
    crypto_taxed BOOLEAN DEFAULT false,
    capital_gains_tax_rate DECIMAL(5, 2),  -- Percentage
    income_tax_applicable BOOLEAN DEFAULT false,
    vat_applicable BOOLEAN DEFAULT false,
    tax_reporting_required BOOLEAN DEFAULT false,

    -- Key facts
    total_legislation_count INTEGER DEFAULT 0,
    active_legislation_count INTEGER DEFAULT 0,
    last_major_legislation_date DATE,

    -- CBDC status
    cbdc_status VARCHAR(50) CHECK (cbdc_status IN (
        'no_plans',
        'research',
        'pilot',
        'launched',
        'rejected'
    )),
    cbdc_name VARCHAR(100),

    -- Notable facts
    crypto_adoption_rank INTEGER,  -- Global rank
    notable_cases TEXT[],
    regulatory_body VARCHAR(200),

    -- Metadata
    last_updated TIMESTAMP DEFAULT NOW(),
    data_quality VARCHAR(20) CHECK (data_quality IN (
        'verified',
        'high',
        'medium',
        'low',
        'outdated'
    )) DEFAULT 'medium'
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Crypto legislation indexes
CREATE INDEX IF NOT EXISTS idx_legislation_country ON crypto_legislation(country_code);
CREATE INDEX IF NOT EXISTS idx_legislation_status ON crypto_legislation(status);
CREATE INDEX IF NOT EXISTS idx_legislation_category ON crypto_legislation(category);
CREATE INDEX IF NOT EXISTS idx_legislation_severity ON crypto_legislation(severity);
CREATE INDEX IF NOT EXISTS idx_legislation_effective_date ON crypto_legislation(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_legislation_product_types_gin ON crypto_legislation USING GIN(affected_product_types);

-- Full text search
CREATE INDEX IF NOT EXISTS idx_legislation_search ON crypto_legislation USING GIN(search_vector);

-- Product compliance indexes
CREATE INDEX IF NOT EXISTS idx_compliance_product ON product_country_compliance(product_id);
CREATE INDEX IF NOT EXISTS idx_compliance_country ON product_country_compliance(country_code);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON product_country_compliance(status);
CREATE INDEX IF NOT EXISTS idx_compliance_risk ON product_country_compliance(regulatory_risk);
CREATE INDEX IF NOT EXISTS idx_compliance_legislation_gin ON product_country_compliance USING GIN(legislation_ids);

-- Country profile indexes
CREATE INDEX IF NOT EXISTS idx_country_profile_stance ON country_crypto_profiles(crypto_stance);
CREATE INDEX IF NOT EXISTS idx_country_profile_score ON country_crypto_profiles(overall_score DESC);

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Update search vector for legislation
CREATE OR REPLACE FUNCTION update_legislation_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.short_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.regulatory_body, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_legislation_search
    BEFORE INSERT OR UPDATE ON crypto_legislation
    FOR EACH ROW
    EXECUTE FUNCTION update_legislation_search_vector();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_legislation_timestamp
    BEFORE UPDATE ON crypto_legislation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_compliance_timestamp
    BEFORE UPDATE ON product_country_compliance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. VIEWS
-- ============================================================

-- Active legislation by country
CREATE OR REPLACE VIEW v_active_legislation AS
SELECT
    cl.*,
    ccp.country_name,
    ccp.crypto_stance
FROM crypto_legislation cl
LEFT JOIN country_crypto_profiles ccp ON ccp.country_code = cl.country_code
WHERE cl.status IN ('in_effect', 'passed')
  AND (cl.expiry_date IS NULL OR cl.expiry_date > CURRENT_DATE)
ORDER BY cl.effective_date DESC;

-- Country regulatory summary
CREATE OR REPLACE VIEW v_country_regulatory_summary AS
SELECT
    ccp.country_code,
    ccp.country_name,
    ccp.crypto_stance,
    ccp.overall_score,
    COUNT(DISTINCT cl.id) as total_laws,
    COUNT(DISTINCT cl.id) FILTER (WHERE cl.status = 'in_effect') as active_laws,
    COUNT(DISTINCT cl.id) FILTER (WHERE cl.severity = 'critical') as critical_laws,
    COUNT(DISTINCT pcc.product_id) as products_available,
    COUNT(DISTINCT pcc.product_id) FILTER (WHERE pcc.status = 'banned') as products_banned,
    ARRAY_AGG(DISTINCT cl.category) FILTER (WHERE cl.status = 'in_effect') as active_categories
FROM country_crypto_profiles ccp
LEFT JOIN crypto_legislation cl ON cl.country_code = ccp.country_code
LEFT JOIN product_country_compliance pcc ON pcc.country_code = ccp.country_code
GROUP BY ccp.country_code, ccp.country_name, ccp.crypto_stance, ccp.overall_score;

-- Product availability by country
CREATE OR REPLACE VIEW v_product_global_availability AS
SELECT
    p.id as product_id,
    p.slug,
    p.name,
    COUNT(DISTINCT pcc.country_code) as countries_available,
    COUNT(DISTINCT pcc.country_code) FILTER (WHERE pcc.status = 'available') as countries_unrestricted,
    COUNT(DISTINCT pcc.country_code) FILTER (WHERE pcc.status = 'banned') as countries_banned,
    COUNT(DISTINCT pcc.country_code) FILTER (WHERE pcc.status = 'available_restricted') as countries_restricted,
    ARRAY_AGG(DISTINCT pcc.country_code) FILTER (WHERE pcc.status = 'banned') as banned_countries,
    ARRAY_AGG(DISTINCT pcc.country_code) FILTER (WHERE pcc.regulatory_risk IN ('high', 'very_high', 'critical')) as high_risk_countries
FROM products p
LEFT JOIN product_country_compliance pcc ON pcc.product_id = p.id
GROUP BY p.id, p.slug, p.name;

-- ============================================================
-- 7. FUNCTIONS
-- ============================================================

-- Check if product is available in country
CREATE OR REPLACE FUNCTION is_product_available_in_country(
    p_product_id INTEGER,
    p_country_code VARCHAR(2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(50);
BEGIN
    SELECT status INTO v_status
    FROM product_country_compliance
    WHERE product_id = p_product_id
      AND country_code = p_country_code;

    RETURN v_status IN ('available', 'available_restricted', 'license_required');
END;
$$ LANGUAGE plpgsql;

-- Get country regulatory score
CREATE OR REPLACE FUNCTION get_country_regulatory_score(p_country_code VARCHAR(2))
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER;
BEGIN
    SELECT overall_score INTO v_score
    FROM country_crypto_profiles
    WHERE country_code = p_country_code;

    RETURN COALESCE(v_score, 50);  -- Default to neutral score
END;
$$ LANGUAGE plpgsql;

-- Get products available in country
CREATE OR REPLACE FUNCTION get_products_for_country(
    p_country_code VARCHAR(2),
    p_status VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    product_id INTEGER,
    product_slug VARCHAR,
    product_name VARCHAR,
    availability_status VARCHAR,
    regulatory_risk VARCHAR,
    kyc_required BOOLEAN,
    restrictions TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.slug,
        p.name,
        pcc.status,
        pcc.regulatory_risk,
        pcc.kyc_required,
        pcc.compliance_notes
    FROM products p
    JOIN product_country_compliance pcc ON pcc.product_id = p.id
    WHERE pcc.country_code = p_country_code
      AND (p_status IS NULL OR pcc.status = p_status)
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. COMMENTS
-- ============================================================

COMMENT ON TABLE crypto_legislation IS 'Comprehensive tracking of crypto legislation by country';
COMMENT ON TABLE product_country_compliance IS 'Product availability and restrictions by country';
COMMENT ON TABLE country_crypto_profiles IS 'Overall crypto regulatory stance by country';

COMMENT ON COLUMN crypto_legislation.severity IS 'Impact severity: critical (bans), high (major restrictions), medium (moderate), low (light touch), neutral, positive (supportive)';
COMMENT ON COLUMN crypto_legislation.restrictions IS 'JSONB field for flexible restriction data structure';
COMMENT ON COLUMN product_country_compliance.status IS 'Product availability status in specific country';

-- ============================================================
-- 9. ROW LEVEL SECURITY (Optional)
-- ============================================================

-- Enable RLS (commented out by default)
-- ALTER TABLE crypto_legislation ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE product_country_compliance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE country_crypto_profiles ENABLE ROW LEVEL SECURITY;

-- Public read policy (all verified data is public)
-- CREATE POLICY "Public legislation read" ON crypto_legislation
--     FOR SELECT USING (verified = true);

-- ============================================================
-- 10. INITIAL DATA EXAMPLES
-- ============================================================

-- Example: USA
INSERT INTO country_crypto_profiles (
    country_code, country_name, crypto_stance,
    regulatory_clarity_score, compliance_difficulty_score, innovation_score, overall_score,
    crypto_legal, crypto_as_property, trading_allowed, mining_allowed,
    crypto_taxed, capital_gains_tax_rate, regulatory_body
) VALUES (
    'US', 'United States', 'restrictive',
    65, 70, 80, 72,
    true, true, true, true,
    true, 20.0, 'SEC, CFTC, FinCEN'
) ON CONFLICT (country_code) DO NOTHING;

-- Example: El Salvador
INSERT INTO country_crypto_profiles (
    country_code, country_name, crypto_stance,
    regulatory_clarity_score, compliance_difficulty_score, innovation_score, overall_score,
    crypto_legal, crypto_as_currency, trading_allowed, mining_allowed,
    crypto_taxed, cbdc_status
) VALUES (
    'SV', 'El Salvador', 'very_friendly',
    80, 30, 95, 90,
    true, true, true, true,
    false, 'launched'
) ON CONFLICT (country_code) DO NOTHING;

-- Example: China
INSERT INTO country_crypto_profiles (
    country_code, country_name, crypto_stance,
    regulatory_clarity_score, compliance_difficulty_score, innovation_score, overall_score,
    crypto_legal, trading_allowed, mining_allowed,
    cbdc_status, cbdc_name
) VALUES (
    'CN', 'China', 'very_hostile',
    90, 100, 10, 20,
    false, false, false,
    'launched', 'Digital Yuan (e-CNY)'
) ON CONFLICT (country_code) DO NOTHING;

-- ============================================================
-- END OF MIGRATION 010
-- ============================================================

SELECT
    'Crypto Legislation System Created!' as status,
    'Use country_crypto_profiles and crypto_legislation tables' as next_step;
