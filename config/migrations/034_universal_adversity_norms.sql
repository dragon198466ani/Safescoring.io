-- =============================================================================
-- MIGRATION 034: Universal Adversity Norms
-- =============================================================================
-- Purpose: Add universal A-pillar norms that apply to ALL product types
-- This ensures every product has a score on the Adversity (A) pillar
-- =============================================================================

-- =============================================================================
-- PART 1: Add Universal Adversity Norms (A151-A170)
-- =============================================================================
-- These norms apply to ALL products regardless of type (wallet, DEX, protocol, etc.)

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full", geographic_scope, scope_type, crypto_relevance)
VALUES
-- Incident Response (A151-A155)
('A151', 'A', 'Incident Response Plan', 'Documented incident response plan publicly available', true, true, true, 'global', 'international', 'Critical for all crypto products to handle security incidents'),
('A152', 'A', 'Incident Disclosure Policy', 'Transparent policy for disclosing security incidents to users', true, true, true, 'global', 'international', 'Users need to know about security issues affecting their assets'),
('A153', 'A', 'Post-Mortem Reports', 'Publishes detailed post-mortem reports after incidents', false, true, true, 'global', 'international', 'Demonstrates accountability and learning from security events'),
('A154', 'A', 'Bug Bounty Program', 'Active bug bounty program for responsible disclosure', true, true, true, 'global', 'international', 'Encourages white-hat security research'),
('A155', 'A', 'Security Contact', 'Dedicated security contact (security@, PGP key)', false, true, true, 'global', 'international', 'Enables secure communication for vulnerability reports'),

-- Insurance Coverage (A156-A160)
('A156', 'A', 'Insurance Coverage', 'Insurance policy covering user funds in case of hack/exploit', true, true, true, 'global', 'international', 'Financial protection for users in case of security breach'),
('A157', 'A', 'Insurance Provider Disclosed', 'Name and details of insurance provider publicly disclosed', false, true, true, 'global', 'international', 'Transparency about insurance coverage'),
('A158', 'A', 'Coverage Amount Disclosed', 'Total insurance coverage amount publicly disclosed', false, true, true, 'global', 'international', 'Users can assess coverage adequacy'),
('A159', 'A', 'Claims Process Documented', 'Clear process for filing insurance claims', false, true, true, 'global', 'international', 'Users know how to claim if needed'),
('A160', 'A', 'Treasury Reserve', 'Dedicated treasury/reserve fund for emergencies', false, true, true, 'global', 'international', 'Additional financial buffer for unexpected events'),

-- Transparency (A161-A165)
('A161', 'A', 'Proof of Reserves', 'Regular proof of reserves/solvency reports', true, true, true, 'global', 'crypto_native', 'Essential for custody and exchange products'),
('A162', 'A', 'Team Transparency', 'Team members publicly identified with verifiable backgrounds', true, true, true, 'global', 'international', 'Reduces rug pull risk'),
('A163', 'A', 'Company Registration', 'Legal entity registered and verifiable', true, true, true, 'global', 'international', 'Legal accountability'),
('A164', 'A', 'Regular Updates', 'Regular public updates on security and operations', false, true, true, 'global', 'international', 'Ongoing communication with users'),
('A165', 'A', 'Audit Reports Public', 'All security audit reports publicly available', true, true, true, 'global', 'international', 'Transparency about security posture'),

-- Disaster Recovery (A166-A170)
('A166', 'A', 'Disaster Recovery Plan', 'Documented disaster recovery procedures', true, true, true, 'global', 'international', 'Essential for business continuity'),
('A167', 'A', 'Data Backup Strategy', 'Regular automated backups with tested recovery', false, true, true, 'global', 'international', 'Protects against data loss'),
('A168', 'A', 'Geographic Redundancy', 'Infrastructure distributed across multiple regions', false, true, true, 'global', 'international', 'Resilience against regional failures'),
('A169', 'A', 'Failover Testing', 'Regular testing of failover procedures', false, true, true, 'global', 'international', 'Ensures recovery plans work'),
('A170', 'A', 'Recovery Time Objective', 'Published RTO/RPO targets', false, true, true, 'global', 'international', 'Users know expected recovery times')

ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    is_essential = EXCLUDED.is_essential,
    consumer = EXCLUDED.consumer,
    "full" = EXCLUDED."full",
    geographic_scope = EXCLUDED.geographic_scope,
    scope_type = EXCLUDED.scope_type,
    crypto_relevance = EXCLUDED.crypto_relevance;

-- =============================================================================
-- PART 2: Set these norms as applicable to ALL product types
-- =============================================================================

-- First, add the applicability_reason column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'norm_applicability' AND column_name = 'applicability_reason'
    ) THEN
        ALTER TABLE norm_applicability ADD COLUMN applicability_reason TEXT;
    END IF;
END $$;

-- Insert applicability for all product types
INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
SELECT
    n.id as norm_id,
    pt.id as type_id,
    true as is_applicable
FROM norms n
CROSS JOIN product_types pt
WHERE n.code IN (
    'A151', 'A152', 'A153', 'A154', 'A155',
    'A156', 'A157', 'A158', 'A159', 'A160',
    'A161', 'A162', 'A163', 'A164', 'A165',
    'A166', 'A167', 'A168', 'A169', 'A170'
)
ON CONFLICT (norm_id, type_id) DO UPDATE SET
    is_applicable = true;

-- =============================================================================
-- PART 3: Update ai_strategy ranges for universal A norms
-- =============================================================================
-- These norms use simpler evaluation (GROQ) as they are factual verifications

COMMENT ON TABLE norms IS 'Norms table with universal adversity norms (A151-A170) that apply to ALL product types.
Universal norms ensure every product gets a score on all 4 SAFE pillars (S, A, F, E).
Categories: Incident Response (A151-A155), Insurance (A156-A160), Transparency (A161-A165), Disaster Recovery (A166-A170)';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these after migration to verify:

-- Check universal A norms exist
-- SELECT code, title FROM norms WHERE code LIKE 'A15%' OR code LIKE 'A16%' OR code = 'A170' ORDER BY code;

-- Check applicability for a DeFi product type (should have A norms now)
-- SELECT n.code, n.title, na.is_applicable
-- FROM norms n
-- JOIN norm_applicability na ON n.id = na.norm_id
-- JOIN product_types pt ON na.type_id = pt.id
-- WHERE pt.code = 'DEX' AND n.pillar = 'A'
-- ORDER BY n.code;

-- Count A norms per product type (should be > 0 for all types)
-- SELECT pt.code, COUNT(DISTINCT n.id) as a_norm_count
-- FROM product_types pt
-- JOIN norm_applicability na ON pt.id = na.type_id
-- JOIN norms n ON na.norm_id = n.id
-- WHERE n.pillar = 'A' AND na.is_applicable = true
-- GROUP BY pt.code
-- ORDER BY a_norm_count;
