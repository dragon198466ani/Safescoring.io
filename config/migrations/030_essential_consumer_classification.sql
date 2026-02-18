-- ============================================================
-- MIGRATION 030: ESSENTIAL & CONSUMER NORMS CLASSIFICATION
-- ============================================================
-- Purpose: Définir et appliquer les critères de classification
--          Essential (sécurité critique) et Consumer (utilisateurs individuels)
-- Date: 2025-01-07
-- Author: SafeScoring Classification System
-- ============================================================

-- ============================================================
-- DÉFINITIONS
-- ============================================================
--
-- ESSENTIAL (is_essential = TRUE):
--   Normes critiques, non-négociables pour la sécurité de base.
--   Sans ces normes, un produit présente des failles fondamentales.
--   Représente ~15-20% des normes totales.
--
-- CONSUMER (consumer = TRUE):
--   Normes applicables aux utilisateurs individuels.
--   Exclut les normes spécifiques aux entreprises/institutions.
--   Représente ~70-80% des normes totales.
--
-- HIÉRARCHIE: Full ⊇ Consumer ⊇ Essential
-- ============================================================

BEGIN;

-- ============================================================
-- 1. RESET: Mettre toutes les normes à l'état de base
-- ============================================================

-- Toutes les normes sont "full" par définition
UPDATE norms SET "full" = TRUE WHERE "full" IS NULL OR "full" = FALSE;

-- Reset consumer et essential pour reclassification
UPDATE norms SET
    consumer = TRUE,  -- Par défaut, applicable aux consommateurs
    is_essential = FALSE,  -- Par défaut, non-essential
    classification_method = 'ai_classification',
    classification_date = NOW();

-- ============================================================
-- 2. NORMES ESSENTIAL - PILIER S (SECURITY)
-- ============================================================
-- Normes cryptographiques et de sécurité fondamentales

UPDATE norms SET is_essential = TRUE WHERE pillar = 'S' AND (
    -- Cryptographie fondamentale
    LOWER(title) LIKE '%aes-256%' OR
    LOWER(title) LIKE '%aes 256%' OR
    LOWER(description) LIKE '%aes-256%' OR
    LOWER(title) LIKE '%encryption%' AND LOWER(title) LIKE '%key%' OR

    -- Gestion des clés
    LOWER(title) LIKE '%bip-32%' OR LOWER(title) LIKE '%bip32%' OR
    LOWER(title) LIKE '%bip-39%' OR LOWER(title) LIKE '%bip39%' OR
    LOWER(title) LIKE '%bip-44%' OR LOWER(title) LIKE '%bip44%' OR
    LOWER(title) LIKE '%key derivation%' OR
    LOWER(title) LIKE '%hd wallet%' OR
    LOWER(title) LIKE '%hierarchical deterministic%' OR

    -- Génération aléatoire sécurisée
    LOWER(title) LIKE '%csprng%' OR
    LOWER(title) LIKE '%random number%' OR
    LOWER(title) LIKE '%entropy%' AND LOWER(title) LIKE '%secure%' OR

    -- Communications sécurisées
    LOWER(title) LIKE '%tls 1.3%' OR
    LOWER(title) LIKE '%tls1.3%' OR
    LOWER(title) LIKE '%end-to-end encrypt%' OR
    LOWER(title) LIKE '%e2e encrypt%' OR

    -- Élément sécurisé
    LOWER(title) LIKE '%secure element%' OR
    LOWER(title) LIKE '%tee%' AND LOWER(title) LIKE '%trusted%' OR
    LOWER(title) LIKE '%hsm%' OR
    LOWER(title) LIKE '%hardware security%' OR
    LOWER(title) LIKE '%cc eal%' OR
    LOWER(title) LIKE '%fips 140%' OR

    -- Authentification
    LOWER(title) LIKE '%2fa%' OR
    LOWER(title) LIKE '%two-factor%' OR
    LOWER(title) LIKE '%two factor%' OR
    LOWER(title) LIKE '%mfa%' OR
    LOWER(title) LIKE '%multi-factor%' OR

    -- Multi-signature
    LOWER(title) LIKE '%multi-sig%' OR
    LOWER(title) LIKE '%multisig%' OR
    LOWER(title) LIKE '%multi signature%' OR

    -- Audits de sécurité
    LOWER(title) LIKE '%security audit%' AND LOWER(title) NOT LIKE '%optional%' OR
    LOWER(title) LIKE '%third-party audit%' OR
    LOWER(title) LIKE '%external audit%' OR

    -- Protection MEV/front-running
    LOWER(title) LIKE '%mev protection%' OR
    LOWER(title) LIKE '%front-running%' AND LOWER(title) LIKE '%protect%' OR

    -- Pas de vulnérabilités critiques
    LOWER(title) LIKE '%no critical vulner%' OR
    LOWER(title) LIKE '%zero known exploit%' OR

    -- Signature de firmware
    LOWER(title) LIKE '%signed firmware%' OR
    LOWER(title) LIKE '%firmware signature%' OR
    LOWER(title) LIKE '%secure boot%'
);

-- ============================================================
-- 3. NORMES ESSENTIAL - PILIER A (ADVERSITY)
-- ============================================================
-- Protection contre la coercition et les attaques physiques

UPDATE norms SET is_essential = TRUE WHERE pillar = 'A' AND (
    -- PIN/Mode de contrainte
    LOWER(title) LIKE '%duress pin%' OR
    LOWER(title) LIKE '%duress password%' OR
    LOWER(title) LIKE '%duress mode%' AND LOWER(title) NOT LIKE '%multiple%' OR

    -- Wallets cachés
    LOWER(title) LIKE '%hidden wallet%' AND LOWER(title) NOT LIKE '%unlimited%' OR
    LOWER(title) LIKE '%plausible deniability%' OR

    -- Sauvegarde seed phrase
    LOWER(title) LIKE '%seed phrase%' AND LOWER(title) LIKE '%backup%' OR
    LOWER(title) LIKE '%bip39%' AND LOWER(title) LIKE '%backup%' OR
    LOWER(title) LIKE '%mnemonic backup%' OR
    LOWER(title) LIKE '%recovery phrase%' OR

    -- Mode panique de base
    LOWER(title) LIKE '%panic mode%' AND LOWER(title) NOT LIKE '%remote%' OR
    LOWER(title) LIKE '%panic button%' OR

    -- Limites de vélocité (protection basique)
    LOWER(title) LIKE '%velocity limit%' OR
    LOWER(title) LIKE '%spending limit%' OR
    LOWER(title) LIKE '%transaction limit%' AND LOWER(title) LIKE '%daily%' OR

    -- Double facteur pour adversité
    LOWER(title) LIKE '%biometric%' AND LOWER(title) LIKE '%knowledge%'
);

-- ============================================================
-- 4. NORMES ESSENTIAL - PILIER F (FIDELITY)
-- ============================================================
-- Fiabilité et qualité essentielles

UPDATE norms SET is_essential = TRUE WHERE pillar = 'F' AND (
    -- Open source
    LOWER(title) LIKE '%open source%' AND LOWER(title) NOT LIKE '%partial%' OR
    LOWER(title) LIKE '%source code%' AND LOWER(title) LIKE '%available%' OR
    LOWER(title) LIKE '%source code%' AND LOWER(title) LIKE '%public%' OR

    -- Maintenance active
    LOWER(title) LIKE '%active maintenance%' OR
    LOWER(title) LIKE '%regular update%' OR
    LOWER(title) LIKE '%security patch%' AND LOWER(title) NOT LIKE '%slow%' OR

    -- Garantie minimum (hardware)
    LOWER(title) LIKE '%warranty%' AND (LOWER(title) LIKE '%2 year%' OR LOWER(title) LIKE '%two year%') OR

    -- Uptime critique (software)
    LOWER(title) LIKE '%uptime%' AND LOWER(title) LIKE '%99.9%' OR
    LOWER(title) LIKE '%availability%' AND LOWER(title) LIKE '%99.9%' OR

    -- Tests et couverture
    LOWER(title) LIKE '%test coverage%' AND LOWER(title) LIKE '%80%' OR

    -- Track record
    LOWER(title) LIKE '%no major incident%' OR
    LOWER(title) LIKE '%incident free%'
);

-- ============================================================
-- 5. NORMES ESSENTIAL - PILIER E (EFFICIENCY)
-- ============================================================
-- Efficacité et usabilité essentielles

UPDATE norms SET is_essential = TRUE WHERE pillar = 'E' AND (
    -- Support multi-chain de base
    LOWER(title) LIKE '%multi-chain%' AND LOWER(title) NOT LIKE '%50+%' OR
    LOWER(title) LIKE '%multichain%' AND LOWER(title) NOT LIKE '%50+%' OR
    LOWER(title) LIKE '%multiple blockchain%' OR

    -- Application mobile/desktop de base
    LOWER(title) LIKE '%mobile app%' AND LOWER(title) NOT LIKE '%optional%' OR
    LOWER(title) LIKE '%desktop app%' AND LOWER(title) NOT LIKE '%optional%' OR

    -- Onboarding clair
    LOWER(title) LIKE '%clear onboarding%' OR
    LOWER(title) LIKE '%guided setup%' OR
    LOWER(title) LIKE '%easy setup%' OR
    LOWER(title) LIKE '%beginner friendly%' OR

    -- WalletConnect
    LOWER(title) LIKE '%walletconnect%' OR
    LOWER(title) LIKE '%wallet connect%'
);

-- ============================================================
-- 6. NORMES NON-CONSUMER (Enterprise/Institutional only)
-- ============================================================
-- Ces normes sont exclues du scope Consumer

UPDATE norms SET consumer = FALSE WHERE (
    -- Fonctionnalités entreprise
    LOWER(title) LIKE '%enterprise%' OR
    LOWER(title) LIKE '%institutional%' OR
    LOWER(title) LIKE '%corporate%' OR

    -- SSO et gestion d'identité entreprise
    LOWER(title) LIKE '%sso%' OR
    LOWER(title) LIKE '%single sign-on%' OR
    LOWER(title) LIKE '%saml%' OR
    LOWER(title) LIKE '%ldap%' OR
    LOWER(title) LIKE '%active directory%' OR

    -- Contrôle d'accès avancé
    LOWER(title) LIKE '%rbac%' OR
    LOWER(title) LIKE '%role-based access%' OR
    LOWER(title) LIKE '%permission management%' AND LOWER(title) LIKE '%team%' OR

    -- API entreprise
    LOWER(title) LIKE '%api rate limit%' AND LOWER(title) LIKE '%enterprise%' OR
    LOWER(title) LIKE '%dedicated api%' OR

    -- Custody institutionnelle
    LOWER(title) LIKE '%institutional custody%' OR
    LOWER(title) LIKE '%qualified custodian%' OR
    LOWER(title) LIKE '%regulated custody%' OR

    -- Compliance entreprise
    LOWER(title) LIKE '%soc 2%' OR
    LOWER(title) LIKE '%soc2%' OR
    LOWER(title) LIKE '%soc 1%' OR
    LOWER(title) LIKE '%iso 27001%' AND LOWER(title) LIKE '%certified%' OR
    LOWER(title) LIKE '%pci dss%' AND LOWER(title) LIKE '%level 1%' OR

    -- SLA entreprise
    LOWER(title) LIKE '%enterprise sla%' OR
    LOWER(title) LIKE '%dedicated support%' OR
    LOWER(title) LIKE '%24/7 support%' AND LOWER(title) LIKE '%enterprise%' OR

    -- MPC institutionnel
    LOWER(title) LIKE '%mpc%' AND LOWER(title) LIKE '%institutional%' OR
    LOWER(title) LIKE '%threshold signature%' AND LOWER(title) LIKE '%enterprise%' OR

    -- Reporting avancé
    LOWER(title) LIKE '%audit trail%' AND LOWER(title) LIKE '%compliance%' OR
    LOWER(title) LIKE '%regulatory report%' OR

    -- Gouvernance d'entreprise
    LOWER(title) LIKE '%governance framework%' OR
    LOWER(title) LIKE '%board approval%' OR
    LOWER(title) LIKE '%committee%' AND LOWER(title) LIKE '%approval%'
);

-- ============================================================
-- 7. CODES OPSEC SPÉCIFIQUES (déjà définis dans migration 009)
-- ============================================================
-- S'assurer que les normes OPSEC ont la bonne classification

-- Essential OPSEC
UPDATE norms SET is_essential = TRUE WHERE code IN (
    'A-DRS-001',  -- Duress PIN/Password Support
    'A-DRS-002',  -- Duress Mode Indistinguishable
    'A-HDN-001',  -- Hidden Wallet Support
    'A-HDN-002',  -- Plausible Deniability Design
    'A-PNC-001',  -- Panic Mode Available
    'A-OPS-005',  -- Velocity Limits
    'A-OPS-007'   -- Biometric + Knowledge Factor
);

-- Consumer OPSEC (majorité sont consumer)
UPDATE norms SET consumer = TRUE WHERE code LIKE 'A-DRS-%' OR code LIKE 'A-HDN-%' OR code LIKE 'A-PNC-%' OR code LIKE 'A-PHY-%' OR code LIKE 'A-SOC-%';

-- Non-consumer OPSEC (enterprise features)
UPDATE norms SET consumer = FALSE WHERE code IN (
    'A-OPS-001',  -- Geofencing Support (enterprise)
    'A-OPS-003',  -- Multi-Device Confirmation (enterprise)
    'A-OPS-004',  -- IP Whitelisting (enterprise)
    'A-OPS-006'   -- Transaction Whitelist (enterprise)
);

-- ============================================================
-- 8. GARANTIR LA HIÉRARCHIE: Essential ⊆ Consumer ⊆ Full
-- ============================================================

-- Toutes les normes essential sont aussi consumer
UPDATE norms SET consumer = TRUE WHERE is_essential = TRUE;

-- Toutes les normes sont full
UPDATE norms SET "full" = TRUE;

-- ============================================================
-- 9. MISE À JOUR DE LA TABLE safe_scoring_definitions
-- ============================================================

INSERT INTO safe_scoring_definitions (norm_id, is_essential, is_consumer, is_full)
SELECT
    id,
    is_essential,
    consumer,
    "full"
FROM norms
ON CONFLICT (norm_id) DO UPDATE SET
    is_essential = EXCLUDED.is_essential,
    is_consumer = EXCLUDED.is_consumer,
    is_full = EXCLUDED.is_full;

-- ============================================================
-- 10. CRÉER/METTRE À JOUR LA VUE DE STATISTIQUES
-- ============================================================

CREATE OR REPLACE VIEW v_classification_summary AS
SELECT
    pillar,
    COUNT(*) as total_norms,
    SUM(CASE WHEN is_essential THEN 1 ELSE 0 END) as essential_count,
    SUM(CASE WHEN consumer THEN 1 ELSE 0 END) as consumer_count,
    SUM(CASE WHEN "full" THEN 1 ELSE 0 END) as full_count,
    ROUND(100.0 * SUM(CASE WHEN is_essential THEN 1 ELSE 0 END) / COUNT(*), 1) as essential_pct,
    ROUND(100.0 * SUM(CASE WHEN consumer THEN 1 ELSE 0 END) / COUNT(*), 1) as consumer_pct
FROM norms
GROUP BY pillar
ORDER BY pillar;

-- Vue globale
CREATE OR REPLACE VIEW v_classification_totals AS
SELECT
    'Essential' as category,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM norms), 1) as percentage
FROM norms WHERE is_essential = TRUE
UNION ALL
SELECT
    'Consumer' as category,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM norms), 1) as percentage
FROM norms WHERE consumer = TRUE
UNION ALL
SELECT
    'Full' as category,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM norms), 1) as percentage
FROM norms WHERE "full" = TRUE;

-- ============================================================
-- 11. FONCTION: Classifier une nouvelle norme
-- ============================================================

CREATE OR REPLACE FUNCTION classify_norm(
    p_title TEXT,
    p_description TEXT,
    p_pillar CHAR(1)
) RETURNS TABLE (
    is_essential BOOLEAN,
    is_consumer BOOLEAN,
    classification_reason TEXT
) AS $$
DECLARE
    v_text TEXT;
    v_is_essential BOOLEAN := FALSE;
    v_is_consumer BOOLEAN := TRUE;
    v_reason TEXT := '';
BEGIN
    v_text := LOWER(p_title || ' ' || COALESCE(p_description, ''));

    -- Check for essential keywords
    IF v_text ~ '(aes-256|bip-32|bip-39|secure element|2fa|multi-sig|seed phrase|duress|hidden wallet|open source|security audit)' THEN
        v_is_essential := TRUE;
        v_reason := v_reason || 'Essential: Contains critical security keywords. ';
    END IF;

    -- Check for enterprise-only keywords
    IF v_text ~ '(enterprise|institutional|sso|saml|rbac|soc 2|iso 27001|compliance report|dedicated support)' THEN
        v_is_consumer := FALSE;
        v_reason := v_reason || 'Non-consumer: Contains enterprise-only features. ';
    END IF;

    -- Default reason
    IF v_reason = '' THEN
        v_reason := 'Standard classification based on defaults.';
    END IF;

    RETURN QUERY SELECT v_is_essential, v_is_consumer, v_reason;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 12. VÉRIFICATION FINALE
-- ============================================================

DO $$
DECLARE
    v_total INTEGER;
    v_essential INTEGER;
    v_consumer INTEGER;
    v_enterprise INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM norms;
    SELECT COUNT(*) INTO v_essential FROM norms WHERE is_essential = TRUE;
    SELECT COUNT(*) INTO v_consumer FROM norms WHERE consumer = TRUE;
    SELECT COUNT(*) INTO v_enterprise FROM norms WHERE consumer = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'CLASSIFICATION ESSENTIAL/CONSUMER TERMINÉE';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total des normes: %', v_total;
    RAISE NOTICE '';
    RAISE NOTICE 'ESSENTIAL (sécurité critique):';
    RAISE NOTICE '  - Nombre: % (%.1f%%)', v_essential, (100.0 * v_essential / v_total);
    RAISE NOTICE '';
    RAISE NOTICE 'CONSUMER (utilisateurs individuels):';
    RAISE NOTICE '  - Nombre: % (%.1f%%)', v_consumer, (100.0 * v_consumer / v_total);
    RAISE NOTICE '';
    RAISE NOTICE 'ENTERPRISE-ONLY (non-consumer):';
    RAISE NOTICE '  - Nombre: % (%.1f%%)', v_enterprise, (100.0 * v_enterprise / v_total);
    RAISE NOTICE '================================================';
END $$;

-- Afficher le résumé par pilier
SELECT * FROM v_classification_summary;

-- Afficher les totaux
SELECT * FROM v_classification_totals;

COMMIT;

-- ============================================================
-- END OF MIGRATION 030
-- ============================================================

SELECT 'Migration 030: Essential & Consumer Classification - COMPLETED' as status;
