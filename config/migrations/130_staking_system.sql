-- Migration: Staking System for $SAFE tokens
-- Allows users to stake tokens to increase vote power

-- Table des stakes actifs
CREATE TABLE IF NOT EXISTS user_staking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    staked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_at TIMESTAMPTZ, -- NULL = locked until manual unstake
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unstaking', 'withdrawn')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour queries rapides
CREATE INDEX IF NOT EXISTS idx_user_staking_user_id ON user_staking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_staking_status ON user_staking(status);

-- Vue pour le total staké par user
CREATE OR REPLACE VIEW user_staking_summary AS
SELECT
    user_id,
    SUM(amount) FILTER (WHERE status = 'active') as total_staked,
    COUNT(*) FILTER (WHERE status = 'active') as stake_count,
    MIN(staked_at) FILTER (WHERE status = 'active') as first_stake_at
FROM user_staking
GROUP BY user_id;

-- Fonction pour calculer le bonus de vote basé sur le staking
CREATE OR REPLACE FUNCTION calculate_staking_vote_bonus(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total_staked INTEGER;
    v_bonus NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_staked
    FROM user_staking
    WHERE user_id = p_user_id AND status = 'active';

    -- Tiers de bonus:
    -- 0-99: 0x
    -- 100-499: +0.2x
    -- 500-999: +0.5x
    -- 1000+: +1.0x (max)
    v_bonus := CASE
        WHEN v_total_staked >= 1000 THEN 1.0
        WHEN v_total_staked >= 500 THEN 0.5
        WHEN v_total_staked >= 100 THEN 0.2
        ELSE 0
    END;

    RETURN v_bonus;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction pour staker des tokens
CREATE OR REPLACE FUNCTION stake_tokens(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_balance INTEGER;
    v_new_stake_id UUID;
    v_total_staked INTEGER;
    v_new_bonus NUMERIC;
BEGIN
    -- Vérifier le solde
    SELECT balance INTO v_balance
    FROM user_points
    WHERE user_id = p_user_id;

    IF v_balance IS NULL OR v_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Solde insuffisant'
        );
    END IF;

    -- Minimum 100 tokens
    IF p_amount < 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Minimum 100 $SAFE pour staker'
        );
    END IF;

    -- Déduire du solde
    UPDATE user_points
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Créer le stake
    INSERT INTO user_staking (user_id, amount)
    VALUES (p_user_id, p_amount)
    RETURNING id INTO v_new_stake_id;

    -- Calculer le nouveau total et bonus
    SELECT COALESCE(SUM(amount), 0) INTO v_total_staked
    FROM user_staking
    WHERE user_id = p_user_id AND status = 'active';

    v_new_bonus := calculate_staking_vote_bonus(p_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'stake_id', v_new_stake_id,
        'amount_staked', p_amount,
        'total_staked', v_total_staked,
        'new_vote_bonus', v_new_bonus,
        'new_balance', v_balance - p_amount
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour unstaker (avec période de cooldown de 7 jours)
CREATE OR REPLACE FUNCTION unstake_tokens(
    p_user_id UUID,
    p_stake_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_stake RECORD;
BEGIN
    -- Vérifier que le stake existe et appartient à l'user
    SELECT * INTO v_stake
    FROM user_staking
    WHERE id = p_stake_id AND user_id = p_user_id AND status = 'active';

    IF v_stake IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stake non trouvé'
        );
    END IF;

    -- Mettre en mode unstaking avec 7 jours de cooldown
    UPDATE user_staking
    SET status = 'unstaking',
        unlock_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = p_stake_id;

    RETURN jsonb_build_object(
        'success', true,
        'stake_id', p_stake_id,
        'amount', v_stake.amount,
        'unlock_at', NOW() + INTERVAL '7 days',
        'message', 'Unstaking initié. Tokens disponibles dans 7 jours.'
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour retirer les tokens après cooldown
CREATE OR REPLACE FUNCTION withdraw_unstaked_tokens(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_withdrawn INTEGER := 0;
    v_count INTEGER := 0;
BEGIN
    -- Retirer tous les stakes dont le cooldown est terminé
    WITH withdrawn AS (
        UPDATE user_staking
        SET status = 'withdrawn',
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND status = 'unstaking'
          AND unlock_at <= NOW()
        RETURNING amount
    )
    SELECT COALESCE(SUM(amount), 0), COUNT(*) INTO v_total_withdrawn, v_count
    FROM withdrawn;

    IF v_total_withdrawn > 0 THEN
        -- Recréditer le solde
        UPDATE user_points
        SET balance = balance + v_total_withdrawn,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'withdrawn_amount', v_total_withdrawn,
        'stakes_withdrawn', v_count
    );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE user_staking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stakes"
    ON user_staking FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stakes"
    ON user_staking FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stakes"
    ON user_staking FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_staking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_staking_updated_at
    BEFORE UPDATE ON user_staking
    FOR EACH ROW
    EXECUTE FUNCTION update_staking_updated_at();

-- Ajouter colonne staking_bonus au calcul de vote si pas déjà présente
-- (Le calcul sera fait dynamiquement via la fonction)

COMMENT ON TABLE user_staking IS 'Tokens $SAFE stakés par les utilisateurs pour augmenter leur vote power';
COMMENT ON FUNCTION calculate_staking_vote_bonus IS 'Calcule le bonus de vote (0 à 1.0x) basé sur le montant staké';
