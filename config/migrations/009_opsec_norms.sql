-- ============================================================
-- MIGRATION 009: OPSEC NORMS ENHANCEMENT
-- ============================================================
-- Purpose: Enhance Adversity pillar with comprehensive OPSEC norms
--          ANTI-DOUBLON: Vérifie les normes existantes avant d'ajouter
-- Date: 2025-01-03
-- Author: SafeScoring OPSEC Initiative
-- ============================================================

-- IMPORTANT: Le pilier A (Adversity) couvre déjà conceptuellement :
-- - Anti-coercion mechanisms (duress PIN, panic button)
-- - Hidden wallets and decoy accounts
-- - Plausible deniability
-- - Theft protection (wipe, kill switch, time-locks)
-- - Physical tamper resistance
-- - Self-destruct mechanisms
--
-- Cette migration COMPLÈTE les normes existantes sans créer de doublons.
-- Stratégie: ON CONFLICT DO NOTHING sur le code de norme

-- ============================================================
-- 1. VERIFICATION DES NORMES EXISTANTES
-- ============================================================

-- Créer une vue temporaire pour audit (à supprimer après migration)
CREATE OR REPLACE VIEW v_existing_adversity_norms AS
SELECT
    code,
    title,
    description,
    is_essential,
    consumer,
    "full"
FROM norms
WHERE pillar = 'A'
ORDER BY code;

-- Compter les normes A existantes
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM norms WHERE pillar = 'A';
    RAISE NOTICE 'Normes Adversity existantes: %', v_count;
END $$;

-- ============================================================
-- 2. CATÉGORIES OPSEC
-- ============================================================
-- Les normes OPSEC sont organisées en 6 catégories:
-- DRS = Duress Protection (Protection sous contrainte)
-- HDN = Hidden Wallets (Wallets cachés)
-- PNC = Panic Mode (Mode panique)
-- PHY = Physical Stealth (Discrétion physique)
-- OPS = Operational Security (Sécurité opérationnelle avancée)
-- SOC = Social Recovery (Récupération sociale sécurisée)

-- ============================================================
-- 3. INSERTION DES NORMES OPSEC (ANTI-DOUBLON)
-- ============================================================

-- A. DURESS PROTECTION (Essential + Consumer)
-- Protection sous contrainte physique / extorsion

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full") VALUES
-- Normes essentielles (non-négociables)
('A-DRS-001', 'A', 'Duress PIN/Password Support',
 'Product supports duress PIN or password that appears legitimate but triggers protective actions (access to decoy wallet, silent alarm, data wipe, etc.). Critical for $5 wrench attack protection.',
 true, true, true),

('A-DRS-002', 'A', 'Duress Mode Indistinguishable',
 'Duress mode is completely indistinguishable from normal mode. Attacker cannot determine if duress PIN was used. No UI differences, timing differences, or other tells.',
 true, true, true),

('A-DRS-003', 'A', 'Multiple Duress Levels',
 'Supports multiple duress PINs/passwords with different access levels (e.g., PIN #1 shows 10% of holdings, PIN #2 shows 1%, real PIN shows 100%).',
 false, false, true)

ON CONFLICT (code) DO NOTHING;

-- B. HIDDEN & DECOY WALLETS (Essential + Consumer)
-- Wallets cachés et leurres pour plausible deniability

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full") VALUES
('A-HDN-001', 'A', 'Hidden Wallet Support',
 'Product supports creating hidden wallets that are invisible without special passphrase/PIN. Provides plausible deniability.',
 true, true, true),

('A-HDN-002', 'A', 'Plausible Deniability Design',
 'Product is designed from the ground up for plausible deniability. Impossible to prove existence of additional hidden wallets without special credentials.',
 true, true, true),

('A-HDN-003', 'A', 'Automatic Decoy Wallet Setup',
 'Product automatically or easily creates a decoy wallet with small holdings during initial setup. Reduces user friction for OPSEC best practices.',
 false, true, true),

('A-HDN-004', 'A', 'Unlimited Hidden Wallets',
 'Supports unlimited number of hidden wallets with different passphrases. Useful for complex OPSEC scenarios.',
 false, false, true),

('A-HDN-005', 'A', 'Hidden Wallet Cannot Be Detected',
 'Technical analysis of the device cannot reveal existence of hidden wallets (no unused storage, no metadata leaks, no timing attacks).',
 false, false, true)

ON CONFLICT (code) DO NOTHING;

-- C. PANIC MODE & EMERGENCY (Essential + Consumer)
-- Mode panique pour situations d'urgence

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full") VALUES
('A-PNC-001', 'A', 'Panic Mode Available',
 'Dedicated panic mode can be triggered quickly in emergency. Shows decoy state and/or alerts trusted contacts.',
 true, true, true),

('A-PNC-002', 'A', 'Instant Wipe Capability',
 'Device can be instantly wiped (all keys destroyed) with a special command/PIN. Irreversible but prevents access under torture.',
 false, false, true),

('A-PNC-003', 'A', 'Remote Wipe Support',
 'Device can be wiped remotely in case of theft. Requires secure authentication to prevent abuse.',
 false, false, true),

('A-PNC-004', 'A', 'Dead Man Switch',
 'Automatic action (e.g., transfer funds to trusted address, wipe device) if no activity detected for specified period. Useful for emergency scenarios.',
 false, false, true),

('A-PNC-005', 'A', 'Panic PIN Sends Alert',
 'Using duress/panic PIN silently sends alert to pre-configured trusted contacts with location data.',
 false, true, true),

('A-PNC-006', 'A', 'Self-Destruct on Tamper',
 'Physical tampering (opening device, voltage glitching, etc.) triggers automatic key erasure. Protects against forensic attacks.',
 false, false, true)

ON CONFLICT (code) DO NOTHING;

-- D. PHYSICAL STEALTH (Consumer)
-- Discrétion physique pour ne pas attirer l'attention

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full") VALUES
('A-PHY-001', 'A', 'Discreet Physical Appearance',
 'Device does not obviously look like a crypto wallet. Could pass for USB key, credit card, or other common object.',
 false, true, true),

('A-PHY-002', 'A', 'No Visible Branding',
 'No logos, brand names, or text identifying the product as a crypto wallet. Prevents targeted theft.',
 false, true, true),

('A-PHY-003', 'A', 'Disguised as Common Object',
 'Intentionally designed to look like a common object (USB drive, credit card, etc.). Active camouflage.',
 false, false, true),

('A-PHY-004', 'A', 'Minimal Physical Footprint',
 'Extremely small and portable. Easy to hide or conceal. Does not draw attention.',
 false, true, true)

ON CONFLICT (code) DO NOTHING;

-- E. OPERATIONAL SECURITY - Advanced (Full)
-- Sécurité opérationnelle avancée

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full") VALUES
('A-OPS-001', 'A', 'Geofencing Support',
 'Transactions can be restricted by geographic location. Prevents transfers if device is outside trusted locations.',
 false, false, true),

('A-OPS-002', 'A', 'Time-Lock Large Transfers',
 'Large transactions automatically have mandatory delay (e.g., 24-48h). Gives time to react if device compromised.',
 false, false, true),

('A-OPS-003', 'A', 'Multi-Device Confirmation Required',
 'High-value transactions require confirmation from multiple devices. Prevents single point of compromise.',
 false, false, true),

('A-OPS-004', 'A', 'IP Whitelisting',
 'Transactions only allowed from pre-approved IP addresses/ranges. Prevents remote compromise.',
 false, false, true),

('A-OPS-005', 'A', 'Velocity Limits',
 'Automatic limits on transaction amounts per day/week/month. Caps potential losses from compromise.',
 false, true, true),

('A-OPS-006', 'A', 'Transaction Whitelist',
 'Only pre-approved destination addresses allowed. Prevents unauthorized transfers even if device accessed.',
 false, false, true),

('A-OPS-007', 'A', 'Biometric + Knowledge Factor',
 'Requires both biometric (fingerprint, face) AND knowledge factor (PIN/password). Resists coercion better.',
 false, true, true),

('A-OPS-008', 'A', 'OPSEC Documentation Provided',
 'Product includes comprehensive OPSEC guide: how to avoid becoming a target, safe travel, incident response, etc.',
 false, true, true)

ON CONFLICT (code) DO NOTHING;

-- F. SOCIAL RECOVERY (Consumer)
-- Récupération sociale sans révéler les holdings

INSERT INTO norms (code, pillar, title, description, is_essential, consumer, "full") VALUES
('A-SOC-001', 'A', 'Social Recovery Without Amount Disclosure',
 'Social recovery/inheritance mechanism that does not reveal holding amounts to guardians unless activated.',
 false, true, true),

('A-SOC-002', 'A', 'Shamir Secret Sharing',
 'Supports Shamir Secret Sharing (SSS/SLIP39) for backup. K-of-N shares required, prevents single point of failure.',
 false, true, true),

('A-SOC-003', 'A', 'Encrypted Social Backup',
 'Social recovery guardians hold encrypted shards. Guardian compromise does not reveal seed/keys.',
 false, true, true),

('A-SOC-004', 'A', 'Time-Locked Inheritance',
 'Inheritance mechanism with mandatory time delay. Prevents hasty decisions and allows intervention if unauthorized.',
 false, false, true)

ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. NORM APPLICABILITY
-- ============================================================
-- Définir pour quels types de produits ces normes s'appliquent

-- DURESS & HIDDEN WALLETS: Applicable à tous les wallets
INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
SELECT
    n.id,
    pt.id,
    true
FROM norms n
CROSS JOIN product_types pt
WHERE n.code LIKE 'A-DRS-%' OR n.code LIKE 'A-HDN-%'
AND pt.code IN ('HW_WALLET', 'SW_WALLET_HOT', 'SW_WALLET_COLD', 'MULTISIG')
AND NOT EXISTS (
    SELECT 1 FROM norm_applicability na
    WHERE na.norm_id = n.id AND na.type_id = pt.id
)
ON CONFLICT DO NOTHING;

-- PANIC MODE: Tous les wallets + Exchanges
INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
SELECT
    n.id,
    pt.id,
    true
FROM norms n
CROSS JOIN product_types pt
WHERE n.code LIKE 'A-PNC-%'
AND pt.code IN ('HW_WALLET', 'SW_WALLET_HOT', 'SW_WALLET_COLD', 'MULTISIG', 'EXCHANGE')
AND NOT EXISTS (
    SELECT 1 FROM norm_applicability na
    WHERE na.norm_id = n.id AND na.type_id = pt.id
)
ON CONFLICT DO NOTHING;

-- PHYSICAL STEALTH: Hardware wallets uniquement
INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
SELECT
    n.id,
    pt.id,
    true
FROM norms n
CROSS JOIN product_types pt
WHERE n.code LIKE 'A-PHY-%'
AND pt.code = 'HW_WALLET'
AND NOT EXISTS (
    SELECT 1 FROM norm_applicability na
    WHERE na.norm_id = n.id AND na.type_id = pt.id
)
ON CONFLICT DO NOTHING;

-- OPS: Tous les produits custody
INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
SELECT
    n.id,
    pt.id,
    true
FROM norms n
CROSS JOIN product_types pt
WHERE n.code LIKE 'A-OPS-%'
AND pt.is_safe_applicable = true
AND NOT EXISTS (
    SELECT 1 FROM norm_applicability na
    WHERE na.norm_id = n.id AND na.type_id = pt.id
)
ON CONFLICT DO NOTHING;

-- SOCIAL RECOVERY: Wallets principalement
INSERT INTO norm_applicability (norm_id, type_id, is_applicable)
SELECT
    n.id,
    pt.id,
    true
FROM norms n
CROSS JOIN product_types pt
WHERE n.code LIKE 'A-SOC-%'
AND pt.code IN ('HW_WALLET', 'SW_WALLET_HOT', 'SW_WALLET_COLD', 'MULTISIG')
AND NOT EXISTS (
    SELECT 1 FROM norm_applicability na
    WHERE na.norm_id = n.id AND na.type_id = pt.id
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. SAFE SCORING DEFINITIONS
-- ============================================================
-- Ajouter les normes OPSEC aux définitions de scoring

-- Toutes les normes essentielles vont dans Essential
INSERT INTO safe_scoring_definitions (norm_id, is_essential, is_consumer, is_full)
SELECT
    n.id,
    n.is_essential,
    n.consumer,
    n."full"
FROM norms n
WHERE n.code LIKE 'A-DRS-%'
   OR n.code LIKE 'A-HDN-%'
   OR n.code LIKE 'A-PNC-%'
   OR n.code LIKE 'A-PHY-%'
   OR n.code LIKE 'A-OPS-%'
   OR n.code LIKE 'A-SOC-%'
ON CONFLICT (norm_id) DO UPDATE SET
    is_essential = EXCLUDED.is_essential,
    is_consumer = EXCLUDED.is_consumer,
    is_full = EXCLUDED.is_full;

-- ============================================================
-- 6. VUES POUR OPSEC SCORING
-- ============================================================

-- Vue: Toutes les normes OPSEC groupées
CREATE OR REPLACE VIEW v_opsec_norms AS
SELECT
    n.id,
    n.code,
    n.title,
    n.description,
    n.pillar,
    n.is_essential,
    n.consumer,
    n."full",
    CASE
        WHEN n.code LIKE 'A-DRS-%' THEN 'Duress Protection'
        WHEN n.code LIKE 'A-HDN-%' THEN 'Hidden Wallets'
        WHEN n.code LIKE 'A-PNC-%' THEN 'Panic Mode'
        WHEN n.code LIKE 'A-PHY-%' THEN 'Physical Stealth'
        WHEN n.code LIKE 'A-OPS-%' THEN 'Operational Security'
        WHEN n.code LIKE 'A-SOC-%' THEN 'Social Recovery'
        ELSE 'Other'
    END as opsec_category,
    CASE
        WHEN n.is_essential THEN 10  -- Essential norms count 3x more
        WHEN n.consumer THEN 5       -- Consumer norms count 2x
        ELSE 3                       -- Full-only norms count 1x
    END as weight
FROM norms n
WHERE n.code LIKE 'A-DRS-%'
   OR n.code LIKE 'A-HDN-%'
   OR n.code LIKE 'A-PNC-%'
   OR n.code LIKE 'A-PHY-%'
   OR n.code LIKE 'A-OPS-%'
   OR n.code LIKE 'A-SOC-%'
ORDER BY n.code;

-- Vue: OPSEC Score par produit
CREATE OR REPLACE VIEW v_product_opsec_scores AS
SELECT
    p.id as product_id,
    p.slug,
    p.name,
    COUNT(DISTINCT CASE WHEN e.result IN ('YES', 'YESp') THEN opn.id END) as opsec_norms_passed,
    COUNT(DISTINCT opn.id) as opsec_norms_total,
    ROUND(
        (SUM(CASE WHEN e.result IN ('YES', 'YESp') THEN opn.weight ELSE 0 END)::NUMERIC /
         NULLIF(SUM(opn.weight), 0)) * 100,
        0
    ) as opsec_score_weighted,
    COUNT(DISTINCT CASE WHEN opn.opsec_category = 'Duress Protection' AND e.result IN ('YES', 'YESp') THEN opn.id END) as duress_features,
    COUNT(DISTINCT CASE WHEN opn.opsec_category = 'Hidden Wallets' AND e.result IN ('YES', 'YESp') THEN opn.id END) as hidden_wallet_features,
    COUNT(DISTINCT CASE WHEN opn.opsec_category = 'Panic Mode' AND e.result IN ('YES', 'YESp') THEN opn.id END) as panic_features,
    COUNT(DISTINCT CASE WHEN opn.opsec_category = 'Physical Stealth' AND e.result IN ('YES', 'YESp') THEN opn.id END) as stealth_features,
    -- Indicateurs binaires pour features critiques
    (COUNT(DISTINCT CASE WHEN opn.code = 'A-DRS-001' AND e.result IN ('YES', 'YESp') THEN 1 END) > 0) as has_duress_pin,
    (COUNT(DISTINCT CASE WHEN opn.code = 'A-HDN-001' AND e.result IN ('YES', 'YESp') THEN 1 END) > 0) as has_hidden_wallet,
    (COUNT(DISTINCT CASE WHEN opn.code = 'A-PNC-001' AND e.result IN ('YES', 'YESp') THEN 1 END) > 0) as has_panic_mode
FROM products p
LEFT JOIN evaluations e ON e.product_id = p.id
LEFT JOIN v_opsec_norms opn ON opn.id = e.norm_id
GROUP BY p.id, p.slug, p.name;

-- ============================================================
-- 7. FUNCTIONS
-- ============================================================

-- Fonction: Calculer le OPSEC Score d'un produit
CREATE OR REPLACE FUNCTION calculate_product_opsec_score(p_product_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER;
BEGIN
    SELECT COALESCE(opsec_score_weighted, 0)::INTEGER
    INTO v_score
    FROM v_product_opsec_scores
    WHERE product_id = p_product_id;

    RETURN COALESCE(v_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Fonction: Récupérer les features OPSEC d'un produit
CREATE OR REPLACE FUNCTION get_product_opsec_features(p_product_slug VARCHAR)
RETURNS TABLE (
    category VARCHAR,
    feature_code VARCHAR,
    feature_title VARCHAR,
    feature_available BOOLEAN,
    is_critical BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        opn.opsec_category as category,
        opn.code as feature_code,
        opn.title as feature_title,
        (e.result IN ('YES', 'YESp')) as feature_available,
        opn.is_essential as is_critical
    FROM products p
    JOIN evaluations e ON e.product_id = p.id
    JOIN v_opsec_norms opn ON opn.id = e.norm_id
    WHERE p.slug = p_product_slug
    ORDER BY opn.opsec_category, opn.code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. COMMENTS
-- ============================================================

COMMENT ON VIEW v_opsec_norms IS 'All OPSEC-related norms from Adversity pillar, grouped by category with weights';
COMMENT ON VIEW v_product_opsec_scores IS 'OPSEC scores for all products based on OPSEC norm evaluations';

-- ============================================================
-- 9. STATISTICS & VERIFICATION
-- ============================================================

DO $$
DECLARE
    v_total_opsec_norms INTEGER;
    v_essential_count INTEGER;
    v_consumer_count INTEGER;
    v_full_count INTEGER;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE is_essential = true),
        COUNT(*) FILTER (WHERE consumer = true),
        COUNT(*) FILTER (WHERE "full" = true)
    INTO v_total_opsec_norms, v_essential_count, v_consumer_count, v_full_count
    FROM norms
    WHERE code LIKE 'A-DRS-%'
       OR code LIKE 'A-HDN-%'
       OR code LIKE 'A-PNC-%'
       OR code LIKE 'A-PHY-%'
       OR code LIKE 'A-OPS-%'
       OR code LIKE 'A-SOC-%';

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'OPSEC NORMS MIGRATION COMPLETED';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total OPSEC Norms: %', v_total_opsec_norms;
    RAISE NOTICE '  - Essential: %', v_essential_count;
    RAISE NOTICE '  - Consumer: %', v_consumer_count;
    RAISE NOTICE '  - Full: %', v_full_count;
    RAISE NOTICE '===========================================';
END $$;

-- Afficher un résumé des normes par catégorie
SELECT
    opsec_category,
    COUNT(*) as total_norms,
    COUNT(*) FILTER (WHERE is_essential = true) as essential,
    COUNT(*) FILTER (WHERE consumer = true) as consumer,
    COUNT(*) FILTER (WHERE "full" = true) as full_only,
    SUM(weight) as total_weight
FROM v_opsec_norms
GROUP BY opsec_category
ORDER BY opsec_category;

-- ============================================================
-- 10. CLEANUP
-- ============================================================

-- Supprimer la vue temporaire d'audit
DROP VIEW IF EXISTS v_existing_adversity_norms;

-- ============================================================
-- END OF MIGRATION 009
-- ============================================================

SELECT
    'OPSEC Norms Enhancement Completed!' as status,
    'Run SELECT * FROM v_opsec_norms to see all OPSEC norms' as next_step;
