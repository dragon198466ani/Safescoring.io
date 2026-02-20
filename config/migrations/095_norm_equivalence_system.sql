-- ============================================================================
-- MIGRATION 095: Norm Equivalence System
-- ============================================================================
-- This migration adds support for norm equivalences where one certification
-- can validate another (e.g., CC EAL5+ validates FIPS 140-3 Level 3)
--
-- Key concepts:
-- - score WITHOUT equivalence = raw evaluation results only
-- - score WITH equivalence = includes equivalent certifications
-- - equivalence_remark = explanation in English of why equivalence applies
-- ============================================================================

-- ============================================================================
-- 1. ADD EQUIVALENCE COLUMNS TO safe_scoring_results
-- ============================================================================

-- Add equivalence score columns (mirrors existing score columns)
ALTER TABLE safe_scoring_results
ADD COLUMN IF NOT EXISTS note_finale_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS score_s_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS score_a_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS score_f_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS score_e_with_equiv DECIMAL(5,2);

-- Add consumer equivalence scores
ALTER TABLE safe_scoring_results
ADD COLUMN IF NOT EXISTS note_consumer_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS s_consumer_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS a_consumer_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS f_consumer_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS e_consumer_with_equiv DECIMAL(5,2);

-- Add essential equivalence scores
ALTER TABLE safe_scoring_results
ADD COLUMN IF NOT EXISTS note_essential_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS s_essential_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS a_essential_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS f_essential_with_equiv DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS e_essential_with_equiv DECIMAL(5,2);

-- Add equivalence metadata
ALTER TABLE safe_scoring_results
ADD COLUMN IF NOT EXISTS equivalences_applied INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS equivalence_boost DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS equivalence_details JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN safe_scoring_results.note_finale_with_equiv IS 'Overall SAFE score including norm equivalences (e.g., CC EAL5+ counts for FIPS 140-3)';
COMMENT ON COLUMN safe_scoring_results.equivalences_applied IS 'Number of equivalence rules that were applied to boost the score';
COMMENT ON COLUMN safe_scoring_results.equivalence_boost IS 'Total score improvement from equivalence rules';
COMMENT ON COLUMN safe_scoring_results.equivalence_details IS 'JSON array of applied equivalences with details';

-- ============================================================================
-- 2. ADD EQUIVALENCE REMARK TO evaluations TABLE
-- ============================================================================

ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS equivalence_remark TEXT,
ADD COLUMN IF NOT EXISTS equivalent_to VARCHAR(20),
ADD COLUMN IF NOT EXISTS equivalence_score DECIMAL(3,2);

COMMENT ON COLUMN evaluations.equivalence_remark IS 'English explanation of equivalence (e.g., "Valid by equivalence: CC EAL5+ provides equivalent or superior protection to FIPS 140-3 Level 3")';
COMMENT ON COLUMN evaluations.equivalent_to IS 'Norm code that this evaluation is equivalent to (e.g., S51 equivalent to S50)';
COMMENT ON COLUMN evaluations.equivalence_score IS 'Equivalence factor (0.0-1.0), e.g., 0.95 for CC EAL5+ vs FIPS 140-3';

-- ============================================================================
-- 3. CREATE norm_equivalences REFERENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS norm_equivalences (
    id SERIAL PRIMARY KEY,

    -- Source norm (the one that provides equivalence)
    source_norm_code VARCHAR(20) NOT NULL,
    source_norm_value VARCHAR(100), -- e.g., 'CC EAL5+', 'CC EAL6+'

    -- Target norm (the one that gets validated by equivalence)
    target_norm_code VARCHAR(20) NOT NULL,
    target_norm_value VARCHAR(100), -- e.g., 'FIPS 140-3 Level 3'

    -- Equivalence details
    equivalence_factor DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- 0.95 = 95% equivalent
    equivalence_type VARCHAR(50) NOT NULL DEFAULT 'certification', -- 'certification', 'protocol', 'implication'

    -- Conditions
    condition_product_types TEXT[], -- NULL = all types, or specific types like {'HW Cold', 'HW Hot'}
    condition_min_source_value VARCHAR(50), -- e.g., 'EAL5' minimum level required

    -- Documentation
    remark_template TEXT NOT NULL, -- English template for equivalence_remark
    justification TEXT, -- Why this equivalence is valid

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(source_norm_code, source_norm_value, target_norm_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_norm_equiv_source ON norm_equivalences(source_norm_code);
CREATE INDEX IF NOT EXISTS idx_norm_equiv_target ON norm_equivalences(target_norm_code);
CREATE INDEX IF NOT EXISTS idx_norm_equiv_active ON norm_equivalences(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE norm_equivalences IS 'Defines which norms can validate other norms by equivalence (e.g., CC EAL5+ validates FIPS 140-3 Level 3)';

-- ============================================================================
-- 4. SEED INITIAL EQUIVALENCE RULES
-- ============================================================================

INSERT INTO norm_equivalences (source_norm_code, source_norm_value, target_norm_code, target_norm_value, equivalence_factor, equivalence_type, remark_template, justification) VALUES

-- ======================
-- SECURITY CERTIFICATIONS
-- ======================

-- CC EAL5+ → FIPS 140-3 Level 3 (95% equivalent)
('S51', 'CC EAL5+', 'S52', 'FIPS 140-3 Level 3', 0.95, 'certification',
 'Valid by equivalence: CC EAL5+ certification provides equivalent or superior physical and logical attack resistance compared to FIPS 140-3 Level 3 requirements.',
 'Common Criteria EAL5+ includes semi-formal design verification and covert channel analysis, offering comparable tamper resistance to FIPS 140-3 Level 3.'),

-- CC EAL6+ → FIPS 140-3 Level 3 (97% equivalent)
('S51', 'CC EAL6+', 'S52', 'FIPS 140-3 Level 3', 0.97, 'certification',
 'Valid by equivalence: CC EAL6+ certification exceeds FIPS 140-3 Level 3 requirements with semi-formally verified design.',
 'CC EAL6+ requires semi-formally verified design and structured presentation, exceeding FIPS 140-3 Level 3 tamper resistance requirements.'),

-- CC EAL5+ → Secure Element (100% - proves SE exists)
('S51', 'CC EAL5+', 'S50', 'Secure Element', 1.0, 'implication',
 'Valid by implication: CC EAL5+ certification confirms the presence of a certified Secure Element.',
 'Any product with CC EAL5+ certification necessarily uses a certified Secure Element.'),

-- FIPS 140-3 Level 3 → Secure Element (100%)
('S52', 'FIPS 140-3 Level 3', 'S50', 'Secure Element', 1.0, 'implication',
 'Valid by implication: FIPS 140-3 Level 3 certification confirms secure cryptographic module with tamper resistance.',
 'FIPS 140-3 Level 3 requires physical tamper resistance, confirming secure hardware implementation.'),

-- FIPS 140-3 Level 4 → FIPS 140-3 Level 3 (100%)
('S52', 'FIPS 140-3 Level 4', 'S52', 'FIPS 140-3 Level 3', 1.0, 'certification',
 'Valid by equivalence: FIPS 140-3 Level 4 exceeds all Level 3 requirements with additional environmental protection.',
 'Level 4 includes all Level 3 requirements plus environmental failure protection.'),

-- ANSSI Qualification → CC EAL (French equivalent)
('S53', 'ANSSI Qualification', 'S51', 'CC EAL4+', 0.90, 'certification',
 'Valid by equivalence: ANSSI Qualification provides French government-grade security assessment comparable to CC EAL4+.',
 'ANSSI certification follows Common Criteria methodology with French-specific requirements.'),

-- ======================
-- CRYPTOGRAPHIC STANDARDS
-- ======================

-- AES-256-GCM → AES-256 (100%)
('S03', 'AES-256-GCM', 'S01', 'AES-256', 1.0, 'implication',
 'Valid by implication: AES-256-GCM mode includes AES-256 encryption.',
 'GCM is an authenticated encryption mode built on AES-256.'),

-- ChaCha20-Poly1305 → AES-256 (95% - different but equivalent security)
('S04', 'ChaCha20-Poly1305', 'S01', 'AES-256', 0.95, 'certification',
 'Valid by equivalence: ChaCha20-Poly1305 provides equivalent 256-bit security level to AES-256.',
 'ChaCha20 offers 256-bit security and is preferred in some contexts (mobile, TLS 1.3).'),

-- ======================
-- BIP STANDARDS (HD WALLETS)
-- ======================

-- BIP-39 → BIP-32 (100% - BIP-39 requires BIP-32)
('S16', 'BIP-39', 'S17', 'BIP-32', 1.0, 'implication',
 'Valid by implication: BIP-39 mnemonic implementation requires BIP-32 hierarchical deterministic key derivation.',
 'BIP-39 seed phrases are designed to work with BIP-32 HD wallet structure.'),

-- BIP-39 → BIP-44 (100%)
('S16', 'BIP-39', 'S18', 'BIP-44', 1.0, 'implication',
 'Valid by implication: BIP-39 support typically includes BIP-44 multi-account hierarchy.',
 'Modern BIP-39 implementations follow BIP-44 derivation paths.'),

-- BIP-84 → BIP-32 (100%)
('S20', 'BIP-84', 'S17', 'BIP-32', 1.0, 'implication',
 'Valid by implication: BIP-84 native SegWit requires BIP-32 HD wallet structure.',
 'BIP-84 defines derivation paths within the BIP-32 framework.'),

-- ======================
-- PROTOCOL-BASED EQUIVALENCES
-- ======================

-- Ethereum support → secp256k1 (100%)
('E01', 'Ethereum', 'S31', 'secp256k1', 1.0, 'protocol',
 'Valid by protocol: Ethereum uses secp256k1 elliptic curve for all cryptographic operations.',
 'The Ethereum protocol mandates secp256k1 for address generation and transaction signing.'),

-- Ethereum support → Keccak-256 (100%)
('E01', 'Ethereum', 'S21', 'Keccak-256', 1.0, 'protocol',
 'Valid by protocol: Ethereum uses Keccak-256 for hashing operations.',
 'Ethereum addresses and transaction hashes use Keccak-256.'),

-- Bitcoin support → secp256k1 (100%)
('E10', 'Bitcoin', 'S31', 'secp256k1', 1.0, 'protocol',
 'Valid by protocol: Bitcoin uses secp256k1 elliptic curve for all cryptographic operations.',
 'The Bitcoin protocol mandates secp256k1 for key generation and transaction signing.'),

-- Bitcoin support → SHA-256 (100%)
('E10', 'Bitcoin', 'S22', 'SHA-256', 1.0, 'protocol',
 'Valid by protocol: Bitcoin uses SHA-256 for block hashing and transaction IDs.',
 'SHA-256d (double SHA-256) is fundamental to Bitcoin security.'),

-- Solana support → Ed25519 (100%)
('E20', 'Solana', 'S35', 'Ed25519', 1.0, 'protocol',
 'Valid by protocol: Solana uses Ed25519 for all signature operations.',
 'Solana accounts and transactions are signed using Ed25519.'),

-- ======================
-- AUDIT EQUIVALENCES
-- ======================

-- Multiple audits → Recent audit (100%)
('S262', 'Multiple audits', 'S261', 'Recent audit', 1.0, 'implication',
 'Valid by implication: Multiple security audits confirm ongoing audit practice.',
 'Products with multiple audits necessarily have audit history.'),

-- Trail of Bits audit → Security audit (100%)
('S263', 'Trail of Bits', 'S261', 'Security audit', 1.0, 'certification',
 'Valid by equivalence: Trail of Bits is a recognized top-tier security auditor.',
 'Trail of Bits audits meet or exceed industry security audit standards.'),

-- OpenZeppelin audit → Smart contract audit (100%)
('S264', 'OpenZeppelin', 'S221', 'Smart contract audit', 1.0, 'certification',
 'Valid by equivalence: OpenZeppelin is a leading smart contract security auditor.',
 'OpenZeppelin audits are industry-standard for smart contract security.'),

-- ======================
-- HARDWARE SECURITY
-- ======================

-- HSM certification → Crypto module (100%)
('S101', 'HSM', 'S100', 'Hardware crypto module', 1.0, 'implication',
 'Valid by implication: HSM usage confirms hardware cryptographic module implementation.',
 'Hardware Security Modules are specialized hardware crypto modules.'),

-- TEE attestation → Secure execution (100%)
('S105', 'TEE attestation', 'S104', 'TEE', 1.0, 'implication',
 'Valid by implication: TEE attestation confirms Trusted Execution Environment usage.',
 'Attestation is only possible with a functioning TEE.')

ON CONFLICT (source_norm_code, source_norm_value, target_norm_code) DO UPDATE SET
    equivalence_factor = EXCLUDED.equivalence_factor,
    remark_template = EXCLUDED.remark_template,
    justification = EXCLUDED.justification,
    updated_at = NOW();

-- ============================================================================
-- 5. CREATE FUNCTION TO APPLY EQUIVALENCES
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_norm_equivalences(p_product_id INTEGER)
RETURNS TABLE (
    norm_code VARCHAR(20),
    original_result VARCHAR(10),
    equivalent_result VARCHAR(10),
    equivalence_remark TEXT,
    source_norm VARCHAR(20),
    equivalence_factor DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH product_evals AS (
        -- Get current evaluations for the product
        SELECT
            e.norm_id,
            n.code as norm_code,
            e.result,
            e.why_this_result
        FROM evaluations e
        JOIN norms n ON e.norm_id = n.id
        WHERE e.product_id = p_product_id
    ),
    positive_evals AS (
        -- Get norms with YES/YESp results
        SELECT pe.norm_code, pe.result
        FROM product_evals pe
        WHERE pe.result IN ('YES', 'YESp')
    ),
    applicable_equivalences AS (
        -- Find equivalences where source norm is YES and target is NO/TBD
        SELECT
            ne.target_norm_code,
            ne.source_norm_code,
            ne.equivalence_factor,
            ne.remark_template,
            pe_target.result as current_result
        FROM norm_equivalences ne
        JOIN positive_evals pe_source ON pe_source.norm_code = ne.source_norm_code
        LEFT JOIN product_evals pe_target ON pe_target.norm_code = ne.target_norm_code
        WHERE ne.is_active = TRUE
        AND (pe_target.result IS NULL OR pe_target.result IN ('NO', 'TBD', 'N/A'))
    )
    SELECT
        ae.target_norm_code::VARCHAR(20),
        COALESCE(ae.current_result, 'NO')::VARCHAR(10) as original_result,
        'YESe'::VARCHAR(10) as equivalent_result, -- YESe = YES by Equivalence
        ae.remark_template::TEXT,
        ae.source_norm_code::VARCHAR(20),
        ae.equivalence_factor
    FROM applicable_equivalences ae;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_norm_equivalences IS 'Identifies which norms can be marked as YES by equivalence based on other positive evaluations';

-- ============================================================================
-- 6. UPDATE calculate_product_scores TO INCLUDE EQUIVALENCES
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_product_scores_with_equiv(p_product_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_equiv_count INTEGER := 0;
    v_equiv_boost DECIMAL(5,2) := 0;
    v_equiv_details JSONB := '[]'::jsonb;

    -- Raw scores (without equivalence)
    v_score_s DECIMAL(5,2);
    v_score_a DECIMAL(5,2);
    v_score_f DECIMAL(5,2);
    v_score_e DECIMAL(5,2);
    v_note_finale DECIMAL(5,2);

    -- Scores with equivalence
    v_score_s_equiv DECIMAL(5,2);
    v_score_a_equiv DECIMAL(5,2);
    v_score_f_equiv DECIMAL(5,2);
    v_score_e_equiv DECIMAL(5,2);
    v_note_finale_equiv DECIMAL(5,2);
BEGIN
    -- First calculate raw scores (existing logic)
    SELECT
        calculate_product_scores(p_product_id) INTO v_result;

    -- Extract raw scores
    v_score_s := (v_result->>'score_s')::DECIMAL(5,2);
    v_score_a := (v_result->>'score_a')::DECIMAL(5,2);
    v_score_f := (v_result->>'score_f')::DECIMAL(5,2);
    v_score_e := (v_result->>'score_e')::DECIMAL(5,2);
    v_note_finale := (v_result->>'note_finale')::DECIMAL(5,2);

    -- Apply equivalences and calculate boosted scores
    WITH equiv_applied AS (
        SELECT * FROM apply_norm_equivalences(p_product_id)
    ),
    equiv_by_pillar AS (
        SELECT
            n.pillar,
            COUNT(*) as equiv_count,
            SUM(ea.equivalence_factor) as equiv_factor_sum
        FROM equiv_applied ea
        JOIN norms n ON n.code = ea.norm_code
        GROUP BY n.pillar
    )
    SELECT
        COALESCE(SUM(equiv_count), 0),
        jsonb_agg(jsonb_build_object(
            'norm_code', ea.norm_code,
            'source_norm', ea.source_norm,
            'remark', ea.equivalence_remark,
            'factor', ea.equivalence_factor
        ))
    INTO v_equiv_count, v_equiv_details
    FROM equiv_applied ea;

    -- Calculate scores with equivalences
    -- For each pillar, add equivalent YES results weighted by equivalence_factor
    WITH all_evals AS (
        -- Original evaluations
        SELECT
            n.pillar,
            n.code,
            e.result,
            1.0 as weight
        FROM evaluations e
        JOIN norms n ON e.norm_id = n.id
        WHERE e.product_id = p_product_id

        UNION ALL

        -- Equivalent evaluations (YESe)
        SELECT
            n.pillar,
            ea.norm_code as code,
            'YESe' as result,
            ea.equivalence_factor as weight
        FROM apply_norm_equivalences(p_product_id) ea
        JOIN norms n ON n.code = ea.norm_code
    ),
    pillar_scores_equiv AS (
        SELECT
            pillar,
            SUM(CASE WHEN result IN ('YES', 'YESp', 'YESe') THEN weight ELSE 0 END) as positive,
            SUM(CASE WHEN result IN ('YES', 'YESp', 'YESe', 'NO') THEN weight ELSE 0 END) as total
        FROM all_evals
        WHERE result NOT IN ('N/A', 'TBD')
        GROUP BY pillar
    )
    SELECT
        COALESCE(MAX(CASE WHEN pillar = 'S' THEN ROUND(positive / NULLIF(total, 0) * 100, 2) END), v_score_s),
        COALESCE(MAX(CASE WHEN pillar = 'A' THEN ROUND(positive / NULLIF(total, 0) * 100, 2) END), v_score_a),
        COALESCE(MAX(CASE WHEN pillar = 'F' THEN ROUND(positive / NULLIF(total, 0) * 100, 2) END), v_score_f),
        COALESCE(MAX(CASE WHEN pillar = 'E' THEN ROUND(positive / NULLIF(total, 0) * 100, 2) END), v_score_e)
    INTO v_score_s_equiv, v_score_a_equiv, v_score_f_equiv, v_score_e_equiv
    FROM pillar_scores_equiv;

    -- Calculate final score with equivalence
    v_note_finale_equiv := ROUND((v_score_s_equiv + v_score_a_equiv + v_score_f_equiv + v_score_e_equiv) / 4, 2);
    v_equiv_boost := v_note_finale_equiv - v_note_finale;

    -- Update safe_scoring_results with equivalence scores
    UPDATE safe_scoring_results SET
        note_finale_with_equiv = v_note_finale_equiv,
        score_s_with_equiv = v_score_s_equiv,
        score_a_with_equiv = v_score_a_equiv,
        score_f_with_equiv = v_score_f_equiv,
        score_e_with_equiv = v_score_e_equiv,
        equivalences_applied = v_equiv_count,
        equivalence_boost = v_equiv_boost,
        equivalence_details = COALESCE(v_equiv_details, '[]'::jsonb)
    WHERE product_id = p_product_id;

    -- Update evaluations with equivalence remarks
    UPDATE evaluations e SET
        equivalence_remark = ea.equivalence_remark,
        equivalent_to = ea.source_norm,
        equivalence_score = ea.equivalence_factor
    FROM apply_norm_equivalences(p_product_id) ea
    JOIN norms n ON n.code = ea.norm_code
    WHERE e.product_id = p_product_id
    AND e.norm_id = n.id;

    -- Return comprehensive result
    RETURN jsonb_build_object(
        'product_id', p_product_id,
        'scores_raw', jsonb_build_object(
            'note_finale', v_note_finale,
            'score_s', v_score_s,
            'score_a', v_score_a,
            'score_f', v_score_f,
            'score_e', v_score_e
        ),
        'scores_with_equivalence', jsonb_build_object(
            'note_finale', v_note_finale_equiv,
            'score_s', v_score_s_equiv,
            'score_a', v_score_a_equiv,
            'score_f', v_score_f_equiv,
            'score_e', v_score_e_equiv
        ),
        'equivalences_applied', v_equiv_count,
        'equivalence_boost', v_equiv_boost,
        'equivalence_details', v_equiv_details
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_product_scores_with_equiv IS 'Calculates both raw scores and scores with norm equivalences applied';

-- ============================================================================
-- 7. CREATE VIEW FOR EASY ACCESS
-- ============================================================================

CREATE OR REPLACE VIEW v_product_scores_complete AS
SELECT
    p.id as product_id,
    p.slug,
    p.name,
    pt.name as product_type,

    -- Raw scores (without equivalence)
    ssr.note_finale,
    ssr.score_s,
    ssr.score_a,
    ssr.score_f,
    ssr.score_e,

    -- Scores with equivalence
    ssr.note_finale_with_equiv,
    ssr.score_s_with_equiv,
    ssr.score_a_with_equiv,
    ssr.score_f_with_equiv,
    ssr.score_e_with_equiv,

    -- Equivalence metadata
    ssr.equivalences_applied,
    ssr.equivalence_boost,
    ssr.equivalence_details,

    -- Statistics
    ssr.total_norms_evaluated,
    ssr.total_yes,
    ssr.total_no,
    ssr.total_na,
    ssr.total_tbd,
    ssr.calculated_at
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id;

COMMENT ON VIEW v_product_scores_complete IS 'Complete product scores with both raw and equivalence-adjusted scores';

-- ============================================================================
-- 8. CREATE VIEW FOR EVALUATIONS WITH EQUIVALENCES
-- ============================================================================

CREATE OR REPLACE VIEW v_evaluations_with_equivalence AS
SELECT
    e.id,
    e.product_id,
    p.name as product_name,
    p.slug as product_slug,
    e.norm_id,
    n.code as norm_code,
    n.pillar,
    n.title as norm_title,
    e.result,
    e.why_this_result,
    e.equivalence_remark,
    e.equivalent_to,
    e.equivalence_score,
    CASE
        WHEN e.equivalence_remark IS NOT NULL THEN 'YESe'
        ELSE e.result
    END as effective_result,
    e.evaluated_by,
    e.evaluation_date
FROM evaluations e
JOIN products p ON e.product_id = p.id
JOIN norms n ON e.norm_id = n.id;

COMMENT ON VIEW v_evaluations_with_equivalence IS 'Evaluations view showing both original results and equivalence-adjusted results';

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON v_product_scores_complete TO authenticated;
GRANT SELECT ON v_evaluations_with_equivalence TO authenticated;
GRANT SELECT ON norm_equivalences TO authenticated;

-- Admin permissions
GRANT ALL ON norm_equivalences TO service_role;
GRANT EXECUTE ON FUNCTION apply_norm_equivalences TO service_role;
GRANT EXECUTE ON FUNCTION calculate_product_scores_with_equiv TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
