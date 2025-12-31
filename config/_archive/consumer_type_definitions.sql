-- ============================================================
-- SAFE SCORING - Consumer Type Definitions
-- ============================================================
-- 
-- This table defines what ESSENTIAL, CONSUMER, and FULL mean.
-- The AI uses these definitions to automatically classify norms
-- in the safe_scoring_definitions table.
--
-- ============================================================

-- ============================================================
-- TABLE: consumer_type_definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS consumer_type_definitions (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(20) NOT NULL UNIQUE,  -- 'essential', 'consumer', 'full'
    type_name VARCHAR(50) NOT NULL,          -- Display name
    
    -- Core definition
    definition TEXT NOT NULL,                -- Clear definition of this type
    target_audience TEXT,                    -- Who this type is for
    
    -- Criteria for AI classification
    inclusion_criteria TEXT[] NOT NULL,      -- Criteria that make a norm belong to this type
    exclusion_criteria TEXT[],               -- Criteria that exclude a norm from this type
    
    -- Keywords for AI matching
    keywords TEXT[],                         -- Keywords that suggest this classification
    negative_keywords TEXT[],                -- Keywords that suggest NOT this classification
    
    -- Examples for AI context
    example_norms TEXT[],                    -- Example norm codes that belong to this type
    counter_examples TEXT[],                 -- Example norm codes that do NOT belong
    
    -- Quotas and statistics
    target_percentage DECIMAL(5,2),          -- Target % of norms (e.g., 17% for essential)
    priority_order INTEGER DEFAULT 1,        -- 1=highest priority (essential), 3=lowest (full)
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ctd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ctd_updated_at ON consumer_type_definitions;
CREATE TRIGGER trigger_ctd_updated_at
    BEFORE UPDATE ON consumer_type_definitions
    FOR EACH ROW EXECUTE FUNCTION update_ctd_updated_at();

-- ============================================================
-- INSERT DEFAULT DEFINITIONS
-- ============================================================

INSERT INTO consumer_type_definitions (
    type_code, 
    type_name, 
    definition, 
    target_audience, 
    inclusion_criteria, 
    exclusion_criteria, 
    keywords, 
    target_percentage, 
    priority_order
)
VALUES 
-- ═══════════════════════════════════════════════════════════
-- ESSENTIAL - Critical norms (~17% of norms)
-- ═══════════════════════════════════════════════════════════
(
    'essential',
    'Essential',
    'Critical and fundamental norms for basic security. These norms represent the absolute minimum that any crypto product must meet to be considered safe. Failure on these norms indicates a major risk for the user. Essential norms cover: user fund security (custody, private keys, seed phrase), protection against known hacks and exploits, third-party security audits, transparency on major risks, recovery mechanisms, basic regulatory compliance, and protection against total loss of funds.',
    'All users - These criteria are non-negotiable for any crypto product, regardless of expertise level',
    ARRAY[
        'User fund security (custody, private keys, seed phrase)',
        'Protection against known hacks and exploits',
        'Third-party security audit by recognized firm',
        'Transparency on major risks',
        'Recovery mechanisms in case of problems',
        'Basic regulatory compliance',
        'Protection against total loss of funds',
        'Secure authentication (2FA, biometrics)',
        'Encryption of sensitive data'
    ],
    ARRAY[
        'Optional advanced features',
        'Performance optimizations',
        'Cosmetic or UX features',
        'Non-critical third-party integrations',
        'Developer-only metrics'
    ],
    ARRAY[
        'security', 'audit', 'custody', 'keys', 'private key', 'seed phrase',
        'hack', 'exploit', 'funds', 'critical', 'fundamental', 'mandatory',
        'major risk', 'authentication', '2FA', 'MFA', 'encryption',
        'backup', 'recovery', 'vulnerability', 'breach', 'protection'
    ],
    17.00,
    1
),

-- ═══════════════════════════════════════════════════════════
-- CONSUMER - Norms for general public users (~38% of norms)
-- ═══════════════════════════════════════════════════════════
(
    'consumer',
    'Consumer',
    'Important norms for general public users. These norms cover aspects that any non-technical user should verify before using a product. They include ease of use, fee transparency, and consumer protection. Consumer norms focus on: clear UX and usability, transparent fees and costs, accessible customer support, understandable documentation, personal data protection, clear complaint process, risk information in simple language, project history and reputation.',
    'General public users - People without deep technical expertise who use crypto products for everyday needs',
    ARRAY[
        'Ease of use and clear UX',
        'Fee and cost transparency',
        'Accessible customer support',
        'Documentation understandable for non-experts',
        'Personal data protection',
        'Clear complaint process',
        'Risk information in simple language',
        'Project history and reputation',
        'Mobile-friendly interface',
        'Clear notifications and alerts'
    ],
    ARRAY[
        'Advanced technical details (source code, architecture)',
        'Developer metrics',
        'Complex configurations',
        'Professional trader optimizations',
        'Technical APIs and integrations'
    ],
    ARRAY[
        'user', 'consumer', 'fees', 'costs', 'support', 'documentation',
        'simple', 'accessible', 'transparent', 'UX', 'interface', 'mobile',
        'app', 'notification', 'alert', 'easy', 'beginner', 'guide',
        'tutorial', 'help', 'customer', 'service'
    ],
    38.00,
    2
),

-- ═══════════════════════════════════════════════════════════
-- FULL - All norms (100%)
-- ═══════════════════════════════════════════════════════════
(
    'full',
    'Full',
    'All norms in the SAFE framework. This level includes advanced technical criteria, optimizations, and complete best practices. Intended for expert users, analysts, and in-depth audits. Full scoring provides comprehensive evaluation covering: all technical criteria, performance optimizations, industry best practices, detailed metrics, code and architecture analysis, governance and tokenomics, interoperability and standards compliance.',
    'Experts, analysts, developers, and advanced users - Complete and detailed evaluation for exhaustive analysis',
    ARRAY[
        'All norms are included by default',
        'Advanced technical criteria',
        'Performance optimizations',
        'Industry best practices',
        'Detailed metrics',
        'Code and architecture analysis',
        'Governance and tokenomics',
        'Interoperability and standards'
    ],
    NULL,  -- No exclusion for FULL - everything is included
    ARRAY[
        'complete', 'technical', 'advanced', 'expert', 'detailed',
        'architecture', 'code', 'performance', 'optimization',
        'governance', 'tokenomics', 'comprehensive', 'full'
    ],
    100.00,
    3
)
ON CONFLICT (type_code) DO UPDATE SET
    definition = EXCLUDED.definition,
    target_audience = EXCLUDED.target_audience,
    inclusion_criteria = EXCLUDED.inclusion_criteria,
    exclusion_criteria = EXCLUDED.exclusion_criteria,
    keywords = EXCLUDED.keywords,
    target_percentage = EXCLUDED.target_percentage,
    updated_at = NOW();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ctd_type_code ON consumer_type_definitions(type_code);
CREATE INDEX IF NOT EXISTS idx_ctd_active ON consumer_type_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_ctd_priority ON consumer_type_definitions(priority_order);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE consumer_type_definitions IS 'ESSENTIAL/CONSUMER/FULL type definitions - Used by AI to automatically classify norms';

COMMENT ON COLUMN consumer_type_definitions.type_code IS 'Unique code: essential, consumer, full';
COMMENT ON COLUMN consumer_type_definitions.definition IS 'Clear definition of what this type means';
COMMENT ON COLUMN consumer_type_definitions.target_audience IS 'Target audience for this classification type';
COMMENT ON COLUMN consumer_type_definitions.inclusion_criteria IS 'Inclusion criteria - AI checks if norm matches at least one criterion';
COMMENT ON COLUMN consumer_type_definitions.exclusion_criteria IS 'Exclusion criteria - If norm matches, it does NOT belong to this type';
COMMENT ON COLUMN consumer_type_definitions.keywords IS 'Keywords that suggest this classification';
COMMENT ON COLUMN consumer_type_definitions.target_percentage IS 'Target percentage of norms (17% essential, 38% consumer, 100% full)';
COMMENT ON COLUMN consumer_type_definitions.priority_order IS 'Priority order: 1=essential (most restrictive), 3=full (all included)';

-- ============================================================
-- VIEW: Summary of definitions
-- ============================================================

CREATE OR REPLACE VIEW v_consumer_type_summary AS
SELECT 
    type_code,
    type_name,
    target_percentage,
    LEFT(definition, 100) || '...' as definition_preview,
    array_length(inclusion_criteria, 1) as num_inclusion_criteria,
    array_length(keywords, 1) as num_keywords,
    priority_order,
    is_active
FROM consumer_type_definitions
ORDER BY priority_order;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 
    type_code,
    type_name,
    target_percentage || '%' as target,
    array_length(inclusion_criteria, 1) as criteria_count,
    array_length(keywords, 1) as keywords_count
FROM consumer_type_definitions
ORDER BY priority_order;

SELECT 'Consumer type definitions created successfully!' as status;
