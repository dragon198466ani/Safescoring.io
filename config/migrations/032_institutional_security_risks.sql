-- ============================================================
-- MIGRATION 032: INSTITUTIONAL SECURITY RISKS BY COUNTRY
-- ============================================================
-- Tracks government data breaches, corruption incidents, and
-- institutional vulnerabilities that expose crypto holders
--
-- Use case: French tax office scandal (Bobigny 2024) where employee
-- sold confidential fiscal data to criminal networks
-- ============================================================

-- ============================================================
-- PART 1: INSTITUTIONAL INCIDENTS TABLE
-- ============================================================
-- Tracks actual incidents of government/institutional failures

CREATE TABLE IF NOT EXISTS institutional_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN (
        'data_breach',           -- Data leaked/stolen from institution
        'insider_corruption',    -- Employee selling data
        'systemic_breach',       -- Large-scale hack of government systems
        'unauthorized_access',   -- Unauthorized access to confidential data
        'data_sale',             -- Data sold on dark web
        'social_engineering',    -- Social engineering attack on institution
        'policy_failure',        -- Policy that exposed citizens
        'judicial_leak',         -- Leak from courts/legal system
        'intelligence_leak'      -- Leak from intelligence services
    )),

    -- Description
    description TEXT NOT NULL,
    detailed_analysis TEXT,

    -- Location & Institution
    country_code CHAR(2) NOT NULL,
    institution_type TEXT NOT NULL CHECK (institution_type IN (
        'tax_authority',         -- DGFIP, IRS, HMRC, etc.
        'financial_regulator',   -- AMF, SEC, FCA, etc.
        'central_bank',          -- National banks
        'police',                -- Law enforcement
        'intelligence',          -- DGSI, NSA, MI5, etc.
        'customs',               -- Customs/border agencies
        'judiciary',             -- Courts, prosecutors
        'registry',              -- Business/property registries
        'social_security',       -- Social security agencies
        'other_government'       -- Other government bodies
    )),
    institution_name TEXT NOT NULL,  -- e.g., "DGFIP - Centre des impôts de Bobigny"

    -- Timeline
    incident_date DATE,
    discovered_date DATE,
    disclosed_date DATE,

    -- Impact assessment
    data_types_exposed TEXT[] DEFAULT '{}',  -- e.g., ['names', 'addresses', 'crypto_holdings', 'tax_returns']
    estimated_victims INTEGER,
    confirmed_victims INTEGER,
    crypto_holders_targeted BOOLEAN DEFAULT FALSE,

    -- Financial impact
    estimated_damage_usd DECIMAL(15,2),
    ransom_paid_usd DECIMAL(15,2),

    -- Criminal consequences enabled by breach
    known_physical_attacks INTEGER DEFAULT 0,      -- Attacks enabled by this data
    known_extortions INTEGER DEFAULT 0,
    known_kidnappings INTEGER DEFAULT 0,
    known_robberies INTEGER DEFAULT 0,

    -- Response & Accountability
    perpetrator_identified BOOLEAN DEFAULT FALSE,
    perpetrator_prosecuted BOOLEAN DEFAULT FALSE,
    perpetrator_convicted BOOLEAN DEFAULT FALSE,
    sentence_details TEXT,
    institutional_response TEXT,  -- What the institution did after
    systemic_changes_made TEXT[], -- Reforms implemented

    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    source_urls TEXT[] DEFAULT '{}',
    court_case_reference TEXT,
    media_coverage_level TEXT CHECK (media_coverage_level IN ('local', 'national', 'international', 'viral')),

    -- Severity scoring
    severity_score INTEGER CHECK (severity_score BETWEEN 1 AND 10),
    systemic_risk_level TEXT CHECK (systemic_risk_level IN ('low', 'medium', 'high', 'critical')),

    -- Lessons
    lessons_learned TEXT[],
    protection_recommendations TEXT[],

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_institutional_incidents_country ON institutional_incidents(country_code);
CREATE INDEX IF NOT EXISTS idx_institutional_incidents_type ON institutional_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_institutional_incidents_institution ON institutional_incidents(institution_type);
CREATE INDEX IF NOT EXISTS idx_institutional_incidents_date ON institutional_incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_institutional_incidents_crypto ON institutional_incidents(crypto_holders_targeted);

-- ============================================================
-- PART 2: COUNTRY INSTITUTIONAL RISK PROFILE
-- ============================================================
-- Aggregated risk scores per country for institutional trust

CREATE TABLE IF NOT EXISTS country_institutional_risks (
    country_code CHAR(2) PRIMARY KEY,
    country_name TEXT NOT NULL,

    -- Overall institutional trust score (0-100, higher = safer)
    institutional_trust_score INTEGER CHECK (institutional_trust_score BETWEEN 0 AND 100),

    -- Component scores (0-100, higher = safer)
    data_protection_score INTEGER CHECK (data_protection_score BETWEEN 0 AND 100),
    corruption_perception_score INTEGER,  -- From Transparency International CPI
    government_transparency_score INTEGER CHECK (government_transparency_score BETWEEN 0 AND 100),
    judicial_independence_score INTEGER CHECK (judicial_independence_score BETWEEN 0 AND 100),
    whistleblower_protection_score INTEGER CHECK (whistleblower_protection_score BETWEEN 0 AND 100),

    -- Specific crypto-related risks
    tax_authority_breach_history BOOLEAN DEFAULT FALSE,
    known_insider_threats INTEGER DEFAULT 0,
    mandatory_crypto_declaration BOOLEAN DEFAULT FALSE,  -- Must you declare crypto?
    declaration_includes_amounts BOOLEAN DEFAULT FALSE,  -- Must you declare HOW MUCH?
    declaration_includes_addresses BOOLEAN DEFAULT FALSE, -- Must you declare wallet addresses?
    data_shared_with_other_agencies BOOLEAN DEFAULT FALSE,
    data_shared_internationally BOOLEAN DEFAULT FALSE,

    -- Data retention risks
    tax_data_retention_years INTEGER,  -- How long they keep your data
    data_accessible_by_employees INTEGER,  -- Estimated # of employees with access
    known_dark_web_leaks BOOLEAN DEFAULT FALSE,

    -- Physical security implications
    address_in_tax_file BOOLEAN DEFAULT TRUE,  -- Is your address in tax files?
    wealth_indicators_visible BOOLEAN DEFAULT FALSE,  -- Can employees see wealth level?

    -- Recent incidents count
    incidents_last_5_years INTEGER DEFAULT 0,
    incidents_crypto_related INTEGER DEFAULT 0,

    -- Risk classification
    overall_risk_level TEXT CHECK (overall_risk_level IN (
        'very_low',    -- Switzerland-level protection
        'low',         -- Strong institutions, rare breaches
        'medium',      -- Occasional issues, generally trustworthy
        'high',        -- Known problems, caution advised
        'very_high',   -- Systemic corruption, avoid declaring
        'critical'     -- Active threat to declarants
    )),

    -- Recommendations
    declaration_risk_assessment TEXT,
    recommended_precautions TEXT[],
    alternative_strategies TEXT[],

    -- Sources
    data_sources TEXT[],
    last_updated TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 3: ADD COLUMNS TO EXISTING country_crypto_profiles
-- ============================================================

-- Add institutional risk reference to existing country profiles
ALTER TABLE country_crypto_profiles
ADD COLUMN IF NOT EXISTS institutional_trust_score INTEGER,
ADD COLUMN IF NOT EXISTS declaration_risk_level TEXT CHECK (declaration_risk_level IN ('safe', 'caution', 'risky', 'dangerous')),
ADD COLUMN IF NOT EXISTS mandatory_crypto_declaration BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS declaration_includes_amounts BOOLEAN DEFAULT FALSE;

-- ============================================================
-- PART 4: LINK PHYSICAL INCIDENTS TO INSTITUTIONAL BREACHES
-- ============================================================

-- Track which physical attacks were enabled by institutional data leaks
ALTER TABLE physical_incidents
ADD COLUMN IF NOT EXISTS enabled_by_institutional_breach UUID REFERENCES institutional_incidents(id),
ADD COLUMN IF NOT EXISTS data_source_suspected TEXT CHECK (data_source_suspected IN (
    'tax_authority',
    'bank',
    'exchange_kyc',
    'social_media',
    'insider_tip',
    'surveillance',
    'unknown'
));

-- ============================================================
-- PART 5: HELPER VIEWS
-- ============================================================

-- View: Countries ranked by institutional safety for crypto holders
CREATE OR REPLACE VIEW v_country_institutional_safety AS
SELECT
    cir.country_code,
    cir.country_name,
    cir.institutional_trust_score,
    cir.overall_risk_level,
    cir.mandatory_crypto_declaration,
    cir.declaration_includes_amounts,
    cir.incidents_last_5_years,
    ccp.crypto_stance,
    ccp.capital_gains_tax_rate,
    ccp.overall_score as crypto_friendliness_score,
    CASE
        WHEN cir.mandatory_crypto_declaration = FALSE THEN 'NO_DECLARATION_REQUIRED'
        WHEN cir.declaration_includes_amounts = FALSE THEN 'DECLARATION_NO_AMOUNTS'
        WHEN cir.overall_risk_level IN ('very_low', 'low') THEN 'DECLARATION_SAFE'
        WHEN cir.overall_risk_level = 'medium' THEN 'DECLARATION_CAUTION'
        ELSE 'DECLARATION_RISKY'
    END as declaration_safety_status
FROM country_institutional_risks cir
LEFT JOIN country_crypto_profiles ccp ON cir.country_code = ccp.country_code
ORDER BY cir.institutional_trust_score DESC NULLS LAST;

-- View: Institutional incidents with full context
CREATE OR REPLACE VIEW v_institutional_incidents_full AS
SELECT
    ii.*,
    cir.institutional_trust_score,
    cir.overall_risk_level,
    ccp.crypto_stance,
    (SELECT COUNT(*) FROM physical_incidents pi WHERE pi.enabled_by_institutional_breach = ii.id) as linked_physical_attacks
FROM institutional_incidents ii
LEFT JOIN country_institutional_risks cir ON ii.country_code = cir.country_code
LEFT JOIN country_crypto_profiles ccp ON ii.country_code = ccp.country_code;

-- ============================================================
-- PART 6: FUNCTIONS
-- ============================================================

-- Function to calculate country institutional risk score
CREATE OR REPLACE FUNCTION calculate_institutional_risk_score(p_country_code CHAR(2))
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 50;  -- Base score
    v_incident_count INTEGER;
    v_crypto_incidents INTEGER;
    v_has_breach_history BOOLEAN;
    v_mandatory_declaration BOOLEAN;
    v_includes_amounts BOOLEAN;
BEGIN
    SELECT
        incidents_last_5_years,
        incidents_crypto_related,
        tax_authority_breach_history,
        mandatory_crypto_declaration,
        declaration_includes_amounts
    INTO v_incident_count, v_crypto_incidents, v_has_breach_history, v_mandatory_declaration, v_includes_amounts
    FROM country_institutional_risks
    WHERE country_code = p_country_code;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Deduct for incidents
    v_score := v_score - (v_incident_count * 5);
    v_score := v_score - (v_crypto_incidents * 10);

    -- Deduct for breach history
    IF v_has_breach_history THEN
        v_score := v_score - 15;
    END IF;

    -- Deduct for mandatory declaration with amounts
    IF v_mandatory_declaration AND v_includes_amounts THEN
        v_score := v_score - 10;
    END IF;

    -- Clamp to 0-100
    RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql;

-- Trigger to update scores on incident insert
CREATE OR REPLACE FUNCTION update_country_risk_on_incident()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE country_institutional_risks
    SET
        incidents_last_5_years = incidents_last_5_years + 1,
        incidents_crypto_related = incidents_crypto_related + CASE WHEN NEW.crypto_holders_targeted THEN 1 ELSE 0 END,
        tax_authority_breach_history = CASE WHEN NEW.institution_type = 'tax_authority' THEN TRUE ELSE tax_authority_breach_history END,
        last_updated = NOW()
    WHERE country_code = NEW.country_code;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_country_risk ON institutional_incidents;
CREATE TRIGGER trg_update_country_risk
AFTER INSERT ON institutional_incidents
FOR EACH ROW
EXECUTE FUNCTION update_country_risk_on_incident();

COMMENT ON TABLE institutional_incidents IS 'Tracks government/institutional data breaches and corruption incidents that expose crypto holders to physical risks';
COMMENT ON TABLE country_institutional_risks IS 'Aggregated institutional trust and data protection scores by country';
