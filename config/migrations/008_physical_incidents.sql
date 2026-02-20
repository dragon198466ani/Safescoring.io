-- ============================================================
-- MIGRATION 008: PHYSICAL INCIDENTS TRACKING
-- ============================================================
-- Purpose: Add physical security incident tracking (kidnappings,
--          robberies, extorsions) to complement technical incidents
-- Date: 2025-01-03
-- Author: SafeScoring OPSEC Initiative
-- ============================================================

-- ============================================================
-- 1. PHYSICAL INCIDENTS TABLE
-- ============================================================
-- Tracks real-world physical attacks against crypto holders

CREATE TABLE IF NOT EXISTS physical_incidents (
    id SERIAL PRIMARY KEY,

    -- Identification
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'kidnapping',           -- Enlèvement avec demande de rançon crypto
        'home_invasion',        -- Invasion de domicile pour voler crypto
        'robbery',              -- Vol à main armée
        'extortion',            -- Extorsion / menaces
        'assault',              -- Agression physique
        'murder',               -- Homicide lié à crypto holdings
        'disappearance',        -- Disparition suspecte
        'social_engineering'    -- Manipulation en personne
    )),

    -- Détails de l'incident
    description TEXT,
    date DATE,
    location_city VARCHAR(100),
    location_country VARCHAR(2),        -- ISO 2-letter code
    location_coordinates POINT,         -- Pour carte interactive mondiale

    -- Informations sur la victime (anonymisées)
    victim_pseudonym VARCHAR(100),      -- Pseudonyme ou "Crypto Holder X"
    victim_type VARCHAR(50) CHECK (victim_type IN (
        'influencer',                   -- Influenceur crypto public
        'trader',                       -- Trader connu
        'holder',                       -- Holder anonyme
        'exchange_exec',                -- Dirigeant d'exchange
        'developer',                    -- Développeur crypto
        'miner',                        -- Mineur
        'investor',                     -- Investisseur
        'other'
    )),
    victim_had_public_profile BOOLEAN DEFAULT FALSE,  -- Profil public sur Twitter/X ?
    victim_disclosed_holdings BOOLEAN DEFAULT FALSE,  -- Avait divulgué ses holdings ?

    -- Impact financier
    amount_stolen_usd BIGINT,           -- Montant volé en USD
    amount_stolen_crypto DECIMAL(20, 8), -- Montant en crypto
    asset_type VARCHAR(50),             -- BTC, ETH, etc.
    funds_recovered BOOLEAN DEFAULT FALSE,
    recovery_percentage INTEGER CHECK (recovery_percentage >= 0 AND recovery_percentage <= 100),

    -- Analyse OPSEC (Operational Security)
    opsec_failures TEXT[],              -- Liste des erreurs OPSEC identifiées
    attack_vector TEXT,                 -- Comment l'attaque s'est produite
    how_victim_was_identified TEXT,     -- Comment l'attaquant a trouvé la victime
    prevention_possible BOOLEAN,        -- Aurait pu être évité ?
    prevention_methods TEXT[],          -- Ce qui aurait pu l'empêcher

    -- Produits impliqués (si connu)
    products_compromised INTEGER[],     -- ARRAY de product_ids
    duress_protection_available BOOLEAN, -- Le produit avait-il un duress PIN ?
    duress_protection_used BOOLEAN,     -- Le duress PIN a-t-il été utilisé ?
    duress_protection_bypassed BOOLEAN, -- Protection contournée malgré tout ?

    -- Statut juridique et résolution
    status VARCHAR(50) DEFAULT 'under_investigation' CHECK (status IN (
        'confirmed',            -- Confirmé par sources fiables
        'under_investigation',  -- En cours d'investigation
        'disputed',            -- Informations contradictoires
        'resolved',            -- Résolu (fonds récupérés, suspects arrêtés)
        'unresolved'           -- Non résolu
    )),
    perpetrators_caught BOOLEAN DEFAULT FALSE,
    legal_outcome TEXT,                -- Résultat juridique si connu

    -- Sources et médias
    source_urls TEXT[],                -- URLs des sources (articles, police, etc.)
    media_coverage_level VARCHAR(20) CHECK (media_coverage_level IN (
        'none',     -- Non médiatisé
        'local',    -- Presse locale uniquement
        'national', -- Presse nationale
        'international', -- Média international
        'viral'     -- Très médiatisé / viral sur crypto Twitter
    )),

    -- Contenu éducatif
    case_study_available BOOLEAN DEFAULT FALSE,
    case_study_url VARCHAR(255),       -- URL vers l'étude de cas détaillée
    lessons_learned TEXT[],            -- Leçons à tirer

    -- Scoring et métriques
    severity_score INTEGER NOT NULL CHECK (severity_score >= 1 AND severity_score <= 10),
    opsec_risk_level VARCHAR(20) CHECK (opsec_risk_level IN (
        'low',      -- Attaque sophistiquée, difficilement évitable
        'medium',   -- Quelques erreurs OPSEC
        'high',     -- Erreurs OPSEC majeures
        'critical'  -- Erreurs OPSEC catastrophiques (holdings publics, etc.)
    )),

    -- Vérification et qualité des données
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(100),
    verification_date TIMESTAMP,
    confidence_level VARCHAR(20) CHECK (confidence_level IN (
        'confirmed',    -- Confirmé par police/média fiable
        'high',        -- Plusieurs sources concordantes
        'medium',      -- Source unique fiable
        'low',         -- Rumeurs/sources non vérifiées
        'speculative'  -- Spéculatif
    )) DEFAULT 'medium',

    -- Métadonnées
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- ============================================================
-- 2. PRODUCT IMPACT TABLE
-- ============================================================
-- Relie les incidents physiques aux produits (wallets, etc.)

CREATE TABLE IF NOT EXISTS physical_incident_product_impact (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES physical_incidents(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Rôle du produit dans l'incident
    product_role VARCHAR(50) CHECK (product_role IN (
        'primary_target',       -- Le produit était la cible principale
        'successfully_bypassed', -- Les protections ont été contournées
        'protection_worked',    -- Les protections ont fonctionné (duress PIN utilisé avec succès)
        'not_used',            -- Produit possédé mais pas utilisé lors de l'incident
        'recommended_alternative', -- Produit qui aurait pu éviter l'incident
        'mentioned'            -- Simplement mentionné dans le rapport
    )),

    -- Analyse technique
    bypass_method TEXT,            -- Comment les protections ont été contournées
    features_that_failed TEXT[],   -- Features qui n'ont pas fonctionné
    features_that_worked TEXT[],   -- Features qui ont fonctionné
    technical_notes TEXT,

    -- Impact sur le scoring OPSEC du produit
    opsec_score_impact INTEGER DEFAULT 0 CHECK (opsec_score_impact >= -20 AND opsec_score_impact <= 20),
    -- Négatif = le produit a échoué à protéger
    -- Positif = le produit a réussi à protéger (duress PIN efficace par ex)
    impact_reason TEXT,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(incident_id, product_id)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

-- Recherche et filtrage
CREATE INDEX IF NOT EXISTS idx_physical_incidents_date ON physical_incidents(date DESC);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_type ON physical_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_country ON physical_incidents(location_country);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_severity ON physical_incidents(severity_score DESC);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_status ON physical_incidents(status);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_slug ON physical_incidents(slug);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_verified ON physical_incidents(verified);

-- GIN index pour recherche dans arrays
CREATE INDEX IF NOT EXISTS idx_physical_incidents_products_gin ON physical_incidents USING GIN(products_compromised);
CREATE INDEX IF NOT EXISTS idx_physical_incidents_opsec_failures_gin ON physical_incidents USING GIN(opsec_failures);

-- Index géospatial pour la carte
CREATE INDEX IF NOT EXISTS idx_physical_incidents_coordinates ON physical_incidents USING GIST(location_coordinates);

-- Impact produits
CREATE INDEX IF NOT EXISTS idx_physical_impact_incident ON physical_incident_product_impact(incident_id);
CREATE INDEX IF NOT EXISTS idx_physical_impact_product ON physical_incident_product_impact(product_id);
CREATE INDEX IF NOT EXISTS idx_physical_impact_role ON physical_incident_product_impact(product_role);

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_physical_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist before creating them (idempotence)
DROP TRIGGER IF EXISTS trigger_physical_incidents_updated_at ON physical_incidents;
DROP TRIGGER IF EXISTS trigger_physical_impact_updated_at ON physical_incident_product_impact;

CREATE TRIGGER trigger_physical_incidents_updated_at
    BEFORE UPDATE ON physical_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_physical_incidents_updated_at();

CREATE TRIGGER trigger_physical_impact_updated_at
    BEFORE UPDATE ON physical_incident_product_impact
    FOR EACH ROW
    EXECUTE FUNCTION update_physical_incidents_updated_at();

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Fonction : Récupérer les incidents par région pour la carte
CREATE OR REPLACE FUNCTION get_physical_incidents_by_region(
    p_country VARCHAR(2) DEFAULT NULL,
    p_min_severity INTEGER DEFAULT 1,
    p_only_verified BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(200),
    slug VARCHAR(200),
    incident_type VARCHAR(50),
    date DATE,
    location_city VARCHAR(100),
    location_country VARCHAR(2),
    location_coordinates POINT,
    severity_score INTEGER,
    opsec_risk_level VARCHAR(20),
    amount_stolen_usd BIGINT,
    status VARCHAR(50),
    victim_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pi.id,
        pi.title,
        pi.slug,
        pi.incident_type,
        pi.date,
        pi.location_city,
        pi.location_country,
        pi.location_coordinates,
        pi.severity_score,
        pi.opsec_risk_level,
        pi.amount_stolen_usd,
        pi.status,
        pi.victim_type
    FROM physical_incidents pi
    WHERE
        (p_country IS NULL OR pi.location_country = p_country)
        AND pi.severity_score >= p_min_severity
        AND (NOT p_only_verified OR pi.verified = TRUE)
        AND pi.status IN ('confirmed', 'resolved', 'unresolved')
    ORDER BY pi.date DESC, pi.severity_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Statistiques des incidents physiques
CREATE OR REPLACE FUNCTION get_physical_incident_stats()
RETURNS TABLE (
    total_incidents BIGINT,
    total_amount_stolen_usd BIGINT,
    incidents_2024 BIGINT,
    incidents_2025 BIGINT,
    most_common_type VARCHAR(50),
    most_dangerous_country VARCHAR(2),
    avg_severity_score NUMERIC,
    victims_with_public_profile BIGINT,
    victims_disclosed_holdings BIGINT,
    successful_duress_uses BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_incidents,
        COALESCE(SUM(amount_stolen_usd), 0)::BIGINT as total_amount_stolen_usd,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM date) = 2024)::BIGINT as incidents_2024,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM date) = 2025)::BIGINT as incidents_2025,
        (
            SELECT incident_type
            FROM physical_incidents
            WHERE status IN ('confirmed', 'resolved', 'unresolved')
            GROUP BY incident_type
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) as most_common_type,
        (
            SELECT location_country
            FROM physical_incidents
            WHERE status IN ('confirmed', 'resolved', 'unresolved')
            AND location_country IS NOT NULL
            GROUP BY location_country
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) as most_dangerous_country,
        AVG(severity_score) as avg_severity_score,
        COUNT(*) FILTER (WHERE victim_had_public_profile = TRUE)::BIGINT as victims_with_public_profile,
        COUNT(*) FILTER (WHERE victim_disclosed_holdings = TRUE)::BIGINT as victims_disclosed_holdings,
        COUNT(*) FILTER (WHERE duress_protection_used = TRUE AND duress_protection_bypassed = FALSE)::BIGINT as successful_duress_uses
    FROM physical_incidents
    WHERE status IN ('confirmed', 'resolved', 'unresolved');
END;
$$ LANGUAGE plpgsql;

-- Fonction : Impact OPSEC score basé sur incidents
CREATE OR REPLACE FUNCTION calculate_product_opsec_incident_impact(p_product_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_impact INTEGER;
BEGIN
    SELECT COALESCE(SUM(pipi.opsec_score_impact), 0)
    INTO v_impact
    FROM physical_incident_product_impact pipi
    JOIN physical_incidents pi ON pipi.incident_id = pi.id
    WHERE pipi.product_id = p_product_id
    AND pi.status IN ('confirmed', 'resolved')
    AND pi.verified = TRUE;

    RETURN v_impact;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE physical_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_incident_product_impact ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotence)
DROP POLICY IF EXISTS "Anyone can read verified incidents" ON physical_incidents;
DROP POLICY IF EXISTS "Admins can read all incidents" ON physical_incidents;
DROP POLICY IF EXISTS "Admins can modify incidents" ON physical_incidents;
DROP POLICY IF EXISTS "Anyone can read product impacts" ON physical_incident_product_impact;
DROP POLICY IF EXISTS "Admins can modify product impacts" ON physical_incident_product_impact;

-- Politique : Tout le monde peut lire les incidents vérifiés
CREATE POLICY "Anyone can read verified incidents"
    ON physical_incidents FOR SELECT
    USING (verified = TRUE OR status IN ('confirmed', 'resolved'));

-- Politique : Admins peuvent tout voir
CREATE POLICY "Admins can read all incidents"
    ON physical_incidents FOR SELECT
    USING (
        auth.jwt() ->> 'email' = 'admin@safescoring.io'
    );

-- Politique : Admins peuvent modifier
CREATE POLICY "Admins can modify incidents"
    ON physical_incidents FOR ALL
    USING (
        auth.jwt() ->> 'email' = 'admin@safescoring.io'
    );

-- Politique : Tout le monde peut lire les impacts
CREATE POLICY "Anyone can read product impacts"
    ON physical_incident_product_impact FOR SELECT
    USING (TRUE);

-- Politique : Admins peuvent modifier les impacts
CREATE POLICY "Admins can modify product impacts"
    ON physical_incident_product_impact FOR ALL
    USING (
        auth.jwt() ->> 'email' = 'admin@safescoring.io'
    );

-- ============================================================
-- 7. COMMENTS
-- ============================================================

COMMENT ON TABLE physical_incidents IS 'Tracks real-world physical security incidents (kidnappings, robberies, etc.) targeting crypto holders';
COMMENT ON TABLE physical_incident_product_impact IS 'Links physical incidents to crypto products (wallets, etc.) and tracks OPSEC feature effectiveness';

COMMENT ON COLUMN physical_incidents.opsec_failures IS 'Array of OPSEC mistakes that enabled the attack (e.g., "disclosed_holdings_publicly", "predictable_location")';
COMMENT ON COLUMN physical_incidents.prevention_methods IS 'Array of methods that could have prevented the attack (e.g., "use_duress_pin", "avoid_public_disclosure")';
COMMENT ON COLUMN physical_incident_product_impact.opsec_score_impact IS 'Impact on product OPSEC score: negative if protection failed, positive if protection worked';

-- ============================================================
-- 8. INITIAL DATA - Incident Example (Dubai 2024)
-- ============================================================

-- Example incident (anonymized) - à compléter avec les détails réels
INSERT INTO physical_incidents (
    title,
    slug,
    incident_type,
    description,
    date,
    location_city,
    location_country,
    victim_pseudonym,
    victim_type,
    victim_had_public_profile,
    victim_disclosed_holdings,
    amount_stolen_usd,
    opsec_failures,
    attack_vector,
    how_victim_was_identified,
    prevention_possible,
    prevention_methods,
    status,
    media_coverage_level,
    severity_score,
    opsec_risk_level,
    confidence_level,
    verified,
    lessons_learned
) VALUES (
    'Dubai Crypto Influencer Kidnapping (2024)',
    'dubai-crypto-kidnapping-2024',
    'kidnapping',
    'High-profile crypto influencer kidnapped in Dubai. Attackers targeted victim after public disclosure of significant crypto holdings on social media. Incident highlights critical OPSEC failures in the crypto community.',
    '2024-12-15',
    'Dubai',
    'AE',
    'Crypto Influencer (Name Redacted)',
    'influencer',
    TRUE,
    TRUE,
    NULL, -- Amount not publicly disclosed
    ARRAY[
        'Public disclosure of holdings on Twitter/X',
        'Predictable daily routine and locations',
        'Posted real-time location on social media',
        'No security personnel despite high profile',
        'Traveled alone despite known wealth'
    ],
    'Victim was identified through social media posts about crypto holdings. Attackers monitored location posts and daily patterns to plan kidnapping.',
    'Social media posts with location tags and wealth displays',
    TRUE,
    ARRAY[
        'Never disclose crypto holdings publicly',
        'Avoid real-time location sharing on social media',
        'Use duress wallet with decoy holdings',
        'Maintain unpredictable routines',
        'Employ security measures proportional to holdings',
        'Use anonymous pseudonyms instead of real identity'
    ],
    'confirmed',
    'viral',
    9,
    'critical',
    'confirmed',
    TRUE,
    ARRAY[
        'Public crypto profiles create physical security risks',
        'Real-time location sharing is extremely dangerous for crypto holders',
        'Duress wallets could have limited losses',
        'OPSEC is not just digital - physical security is critical',
        'The $5 wrench attack is real and growing'
    ]
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 9. VERIFICATION
-- ============================================================

SELECT
    'Physical Incidents Tracking System Created!' as status,
    (SELECT COUNT(*) FROM physical_incidents) as incidents_count,
    (SELECT COUNT(*) FROM physical_incident_product_impact) as product_impacts_count;

-- ============================================================
-- END OF MIGRATION 008
-- ============================================================
