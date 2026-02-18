-- ============================================
-- COMMUNITY VOTES SYSTEM
-- Système de votes communautaires RGPD-compliant
-- ============================================

-- Table des corrections proposées
CREATE TABLE IF NOT EXISTS correction_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Produit concerné
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Norme concernée (optionnel)
    norm_id UUID REFERENCES norms(id) ON DELETE SET NULL,
    norm_code TEXT,

    -- Correction proposée
    field_type TEXT NOT NULL, -- 'evaluation', 'description', 'link', 'other'
    current_value TEXT,
    proposed_value TEXT NOT NULL,
    justification TEXT,
    evidence_urls TEXT[], -- Liens de preuve

    -- Statut
    status TEXT DEFAULT 'pending', -- 'pending', 'validated', 'rejected', 'disputed'
    vote_score NUMERIC DEFAULT 0, -- Score total des votes
    votes_count INTEGER DEFAULT 0,

    -- Soumis par (anonymisé)
    submitter_hash TEXT NOT NULL, -- Hash de l'email ou wallet
    submitter_type TEXT DEFAULT 'email', -- 'email', 'wallet'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

    -- Pas de données personnelles !
    CONSTRAINT valid_status CHECK (status IN ('pending', 'validated', 'rejected', 'disputed')),
    CONSTRAINT valid_field_type CHECK (field_type IN ('evaluation', 'description', 'link', 'other')),
    CONSTRAINT valid_submitter_type CHECK (submitter_type IN ('email', 'wallet'))
);

-- Table des votes sur corrections
CREATE TABLE IF NOT EXISTS correction_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Correction votée
    correction_id UUID NOT NULL REFERENCES correction_proposals(id) ON DELETE CASCADE,

    -- Votant (anonymisé)
    voter_hash TEXT NOT NULL, -- Hash email ou adresse wallet
    voter_type TEXT DEFAULT 'email', -- 'email', 'wallet'

    -- Vote
    vote TEXT NOT NULL, -- 'agree', 'disagree'
    vote_weight NUMERIC DEFAULT 0.3, -- Poids calculé

    -- Anti-fraude (anonymisé)
    ip_hash TEXT, -- Hash de l'IP (supprimé après 24h)
    device_hash TEXT, -- Fingerprint device

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Un seul vote par personne par correction
    CONSTRAINT unique_vote UNIQUE (correction_id, voter_hash),
    CONSTRAINT valid_vote CHECK (vote IN ('agree', 'disagree')),
    CONSTRAINT valid_voter_type CHECK (voter_type IN ('email', 'wallet'))
);

-- Table de réputation (anonymisée)
CREATE TABLE IF NOT EXISTS user_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifiant anonyme
    user_hash TEXT UNIQUE NOT NULL, -- Hash email ou wallet
    user_type TEXT DEFAULT 'email',

    -- Stats
    corrections_submitted INTEGER DEFAULT 0,
    corrections_validated INTEGER DEFAULT 0,
    corrections_rejected INTEGER DEFAULT 0,
    votes_cast INTEGER DEFAULT 0,

    -- Réputation calculée
    reputation_score NUMERIC DEFAULT 0,
    vote_weight NUMERIC DEFAULT 0.3, -- Poids de vote actuel

    -- Wallet (si connecté)
    wallet_address TEXT, -- Adresse publique (optionnel)
    wallet_verified_at TIMESTAMPTZ,
    wallet_age_days INTEGER,
    wallet_tx_count INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_user_type CHECK (user_type IN ('email', 'wallet'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_corrections_product ON correction_proposals(product_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON correction_proposals(status);
CREATE INDEX IF NOT EXISTS idx_corrections_submitter ON correction_proposals(submitter_hash);
CREATE INDEX IF NOT EXISTS idx_votes_correction ON correction_votes(correction_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON correction_votes(voter_hash);
CREATE INDEX IF NOT EXISTS idx_reputation_user ON user_reputation(user_hash);

-- RLS
ALTER TABLE correction_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

-- Lecture publique des corrections (transparence)
CREATE POLICY "Corrections are publicly readable"
    ON correction_proposals FOR SELECT USING (true);

-- Lecture publique des votes agrégés
CREATE POLICY "Votes are publicly readable"
    ON correction_votes FOR SELECT USING (true);

-- Réputation lisible publiquement (anonyme de toute façon)
CREATE POLICY "Reputation is publicly readable"
    ON user_reputation FOR SELECT USING (true);

-- ============================================
-- FONCTIONS
-- ============================================

-- Calculer le poids de vote d'un utilisateur
CREATE OR REPLACE FUNCTION calculate_vote_weight(p_user_hash TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_reputation user_reputation%ROWTYPE;
    v_weight NUMERIC := 0.3;
    v_account_age_days INTEGER;
BEGIN
    SELECT * INTO v_reputation FROM user_reputation WHERE user_hash = p_user_hash;

    IF NOT FOUND THEN
        RETURN 0.3; -- Nouveau compte
    END IF;

    -- Âge du compte
    v_account_age_days := EXTRACT(DAY FROM NOW() - v_reputation.created_at);

    -- Calcul du poids
    v_weight := 0.3; -- Base

    -- Bonus ancienneté
    IF v_account_age_days > 7 THEN v_weight := v_weight + 0.1; END IF;
    IF v_account_age_days > 30 THEN v_weight := v_weight + 0.1; END IF;

    -- Bonus corrections validées
    IF v_reputation.corrections_validated > 0 THEN v_weight := v_weight + 0.1; END IF;
    IF v_reputation.corrections_validated > 5 THEN v_weight := v_weight + 0.1; END IF;

    -- Bonus wallet vérifié
    IF v_reputation.wallet_verified_at IS NOT NULL THEN
        v_weight := v_weight + 0.2;
        -- Wallet ancien et actif
        IF v_reputation.wallet_age_days > 30 AND v_reputation.wallet_tx_count > 10 THEN
            v_weight := v_weight + 0.3;
        END IF;
    END IF;

    -- Malus rejets
    IF v_reputation.corrections_rejected > 3 THEN
        v_weight := v_weight - 0.2;
    END IF;

    -- Clamp entre 0.1 et 1.5
    RETURN GREATEST(0.1, LEAST(1.5, v_weight));
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour le score d'une correction après vote
CREATE OR REPLACE FUNCTION update_correction_score()
RETURNS TRIGGER AS $$
DECLARE
    v_agree_score NUMERIC;
    v_disagree_score NUMERIC;
    v_total_score NUMERIC;
    v_votes_count INTEGER;
BEGIN
    -- Calculer les scores
    SELECT
        COALESCE(SUM(CASE WHEN vote = 'agree' THEN vote_weight ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN vote = 'disagree' THEN vote_weight ELSE 0 END), 0),
        COUNT(*)
    INTO v_agree_score, v_disagree_score, v_votes_count
    FROM correction_votes
    WHERE correction_id = COALESCE(NEW.correction_id, OLD.correction_id);

    v_total_score := v_agree_score - v_disagree_score;

    -- Mettre à jour la correction
    UPDATE correction_proposals
    SET
        vote_score = v_total_score,
        votes_count = v_votes_count,
        -- Auto-validation si score >= 3.0
        status = CASE
            WHEN v_total_score >= 3.0 THEN 'validated'
            WHEN v_total_score <= -2.0 THEN 'rejected'
            ELSE status
        END,
        validated_at = CASE
            WHEN v_total_score >= 3.0 AND validated_at IS NULL THEN NOW()
            ELSE validated_at
        END
    WHERE id = COALESCE(NEW.correction_id, OLD.correction_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_correction_score
    AFTER INSERT OR UPDATE OR DELETE ON correction_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_correction_score();

-- ============================================
-- NETTOYAGE AUTOMATIQUE RGPD
-- ============================================

-- Supprimer les hash IP après 24h
CREATE OR REPLACE FUNCTION cleanup_ip_hashes()
RETURNS void AS $$
BEGIN
    UPDATE correction_votes
    SET ip_hash = NULL
    WHERE ip_hash IS NOT NULL
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Vue pour stats publiques (anonymisées)
CREATE OR REPLACE VIEW community_stats AS
SELECT
    COUNT(DISTINCT cp.id) as total_corrections,
    COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'validated') as validated_corrections,
    COUNT(DISTINCT cv.voter_hash) as total_voters,
    COUNT(DISTINCT ur.user_hash) as total_contributors,
    COUNT(DISTINCT ur.user_hash) FILTER (WHERE ur.wallet_verified_at IS NOT NULL) as wallet_verified_users
FROM correction_proposals cp
LEFT JOIN correction_votes cv ON true
LEFT JOIN user_reputation ur ON true;

COMMENT ON TABLE correction_proposals IS 'Corrections proposées par la communauté - RGPD compliant';
COMMENT ON TABLE correction_votes IS 'Votes sur corrections - anonymisés';
COMMENT ON TABLE user_reputation IS 'Réputation utilisateurs - hash uniquement, pas de données perso';
