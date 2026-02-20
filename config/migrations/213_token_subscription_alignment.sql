-- ============================================================================
-- MIGRATION 213: Alignement Token + Abonnements
-- Le token COMPLÈTE les abonnements, il ne les remplace PAS
-- ============================================================================
--
-- MODÈLE COMMERCIAL:
-- - Abonnements ($19-$299/mois) = ACCÈS aux fonctionnalités
-- - Token $SAFE = INFLUENCE et BONUS en plus de l'accès
--
-- PRINCIPE CLÉ:
-- Un abonné Pro SANS token a accès à tout le contenu Pro
-- Un abonné Pro AVEC tokens a des BONUS (vote amplifié, priorité, rewards)
--
-- ============================================================================

-- ============================================================================
-- 1. MAPPING ABONNEMENT → TIER TOKEN AUTOMATIQUE
-- ============================================================================
-- Les abonnés reçoivent automatiquement un tier de base

CREATE TABLE IF NOT EXISTS subscription_token_mapping (
    id SERIAL PRIMARY KEY,
    subscription_plan TEXT UNIQUE NOT NULL,

    -- Tier token inclus avec l'abonnement
    included_token_tier TEXT NOT NULL,  -- 'none', 'bronze', 'silver', 'gold'

    -- Tokens offerts mensuellement aux abonnés
    monthly_token_reward INTEGER DEFAULT 0,

    -- Multiplicateur de vote inclus
    included_vote_multiplier NUMERIC(3,2) DEFAULT 1.0,

    description TEXT
);

INSERT INTO subscription_token_mapping VALUES
    (1, 'free', 'none', 0, 1.0, 'Gratuit - pas de bonus token'),
    (2, 'starter', 'bronze', 10, 1.2, 'Starter $19/mois - Bronze inclus + 10 tokens/mois'),
    (3, 'pro', 'silver', 30, 1.5, 'Pro $49/mois - Silver inclus + 30 tokens/mois'),
    (4, 'expert', 'gold', 75, 2.0, 'Expert $99/mois - Gold inclus + 75 tokens/mois'),
    (5, 'enterprise', 'gold', 200, 2.5, 'Enterprise $299/mois - Gold+ inclus + 200 tokens/mois')
ON CONFLICT (subscription_plan) DO UPDATE SET
    monthly_token_reward = EXCLUDED.monthly_token_reward,
    included_vote_multiplier = EXCLUDED.included_vote_multiplier;

-- ============================================================================
-- 2. CE QUE LE TOKEN AJOUTE (AU-DELÀ DE L'ABONNEMENT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_bonus_features (
    id SERIAL PRIMARY KEY,
    feature_code TEXT UNIQUE NOT NULL,
    feature_name TEXT NOT NULL,
    description TEXT,

    -- Le token permet de BOOSTER, pas de remplacer l'abonnement
    bonus_type TEXT NOT NULL,  -- 'vote_boost', 'priority_boost', 'exclusive_access', 'cosmetic'

    -- Coût en tokens (par utilisation ou par mois)
    token_cost INTEGER,
    cost_type TEXT DEFAULT 'per_use',  -- 'per_use', 'monthly', 'one_time'

    -- Ou nécessite du staking
    requires_staking BOOLEAN DEFAULT FALSE,
    min_staking_tier TEXT,

    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO token_bonus_features (feature_code, feature_name, description, bonus_type, token_cost, cost_type, requires_staking, min_staking_tier) VALUES
    -- BOOST DE VOTE (au-delà du multiplicateur inclus dans l'abonnement)
    ('vote_boost_x2', 'Super Vote', 'Double le poids de ton vote sur une évaluation', 'vote_boost', 5, 'per_use', FALSE, NULL),
    ('vote_boost_x5', 'Mega Vote', 'x5 le poids de ton vote (limité 3/jour)', 'vote_boost', 15, 'per_use', FALSE, NULL),

    -- PRIORITÉ (pour les abonnés qui veulent aller encore plus vite)
    ('eval_priority_boost', 'Boost Priorité', 'Passe ta demande d''évaluation en tête de file', 'priority_boost', 50, 'per_use', FALSE, NULL),
    ('support_priority', 'Support VIP', 'Réponse support en moins de 4h', 'priority_boost', 20, 'monthly', TRUE, 'silver'),

    -- ACCÈS EXCLUSIF (features expérimentales, pas le contenu standard)
    ('beta_features', 'Accès Beta', 'Teste les nouvelles features avant tout le monde', 'exclusive_access', 0, 'monthly', TRUE, 'gold'),
    ('private_channel', 'Channel Privé', 'Accès au Discord/Telegram privé des top stakers', 'exclusive_access', 0, 'monthly', TRUE, 'gold'),
    ('founder_calls', 'Calls Fondateurs', 'Appels mensuels avec l''équipe', 'exclusive_access', 0, 'monthly', TRUE, 'platinum'),

    -- COSMÉTIQUES (ne donnent pas d'avantage fonctionnel)
    ('profile_frame_gold', 'Cadre Doré', 'Cadre doré autour de ton avatar', 'cosmetic', 100, 'one_time', FALSE, NULL),
    ('profile_frame_animated', 'Cadre Animé', 'Cadre avec animation', 'cosmetic', 250, 'one_time', FALSE, NULL),
    ('custom_title', 'Titre Custom', 'Titre personnalisé sous ton pseudo', 'cosmetic', 150, 'one_time', FALSE, NULL),
    ('leaderboard_highlight', 'Highlight Leaderboard', 'Ton nom en couleur sur le leaderboard', 'cosmetic', 75, 'monthly', FALSE, NULL)
ON CONFLICT (feature_code) DO NOTHING;

-- ============================================================================
-- 3. REWARDS POUR FIDÉLITÉ (Gagner des tokens en étant abonné)
-- ============================================================================

CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id SERIAL PRIMARY KEY,
    reward_type TEXT UNIQUE NOT NULL,
    description TEXT,
    tokens_earned INTEGER NOT NULL,
    conditions JSONB
);

INSERT INTO loyalty_rewards VALUES
    (1, 'monthly_subscription', 'Reward mensuel pour abonnés', 0, '{"note": "Voir subscription_token_mapping"}'),
    (2, 'correct_vote', 'Vote qui match le consensus final', 2, '{"min_consensus_weight": 10}'),
    (3, 'first_vote_of_day', 'Premier vote du jour', 1, '{"max_per_day": 1}'),
    (4, 'streak_7_days', 'Connexion 7 jours consécutifs', 10, '{"streak_days": 7}'),
    (5, 'streak_30_days', 'Connexion 30 jours consécutifs', 50, '{"streak_days": 30}'),
    (6, 'refer_subscriber', 'Parrainage qui s''abonne', 100, '{"referred_must_subscribe": true}'),
    (7, 'quality_feedback', 'Feedback utile sur un produit', 5, '{"requires_admin_approval": true}'),
    (8, 'bug_report_valid', 'Bug report confirmé', 25, '{"requires_admin_approval": true}'),
    (9, 'anniversary_1_year', 'Abonné depuis 1 an', 200, '{"subscription_months": 12}')
ON CONFLICT (reward_type) DO UPDATE SET tokens_earned = EXCLUDED.tokens_earned;

-- ============================================================================
-- 4. HISTORIQUE DES REWARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_loyalty_rewards (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    reward_type TEXT REFERENCES loyalty_rewards(reward_type),
    tokens_earned INTEGER NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    reference_id TEXT,  -- evaluation_id, streak_id, etc.
    notes TEXT
);

CREATE INDEX idx_user_loyalty_user ON user_loyalty_rewards(user_id);
CREATE INDEX idx_user_loyalty_date ON user_loyalty_rewards(earned_at);

-- ============================================================================
-- 5. FONCTION: Calculer le vrai multiplicateur de vote
-- ============================================================================
-- Combine: abonnement + staking + boost temporaire

CREATE OR REPLACE FUNCTION get_effective_vote_multiplier(
    p_user_id UUID,
    p_boost_tokens INTEGER DEFAULT 0  -- Tokens dépensés pour boost ce vote
)
RETURNS NUMERIC AS $$
DECLARE
    v_sub_multiplier NUMERIC := 1.0;
    v_stake_multiplier NUMERIC := 1.0;
    v_boost_multiplier NUMERIC := 1.0;
    v_user_plan TEXT;
    v_user_tier TEXT;
BEGIN
    -- 1. Multiplicateur de l'abonnement
    SELECT p.subscription_plan INTO v_user_plan
    FROM profiles p WHERE p.id = p_user_id;

    SELECT included_vote_multiplier INTO v_sub_multiplier
    FROM subscription_token_mapping
    WHERE subscription_plan = COALESCE(v_user_plan, 'free');

    v_sub_multiplier := COALESCE(v_sub_multiplier, 1.0);

    -- 2. Multiplicateur du staking (s'ajoute, ne remplace pas)
    SELECT staking_tier INTO v_user_tier
    FROM user_token_balances
    WHERE user_id = p_user_id;

    IF v_user_tier IS NOT NULL THEN
        v_stake_multiplier := CASE v_user_tier
            WHEN 'platinum' THEN 1.5  -- +50% en plus de l'abonnement
            WHEN 'gold' THEN 1.3      -- +30%
            WHEN 'silver' THEN 1.2    -- +20%
            WHEN 'bronze' THEN 1.1    -- +10%
            ELSE 1.0
        END;
    END IF;

    -- 3. Boost temporaire (si tokens dépensés)
    IF p_boost_tokens >= 15 THEN
        v_boost_multiplier := 2.0;  -- Mega boost
    ELSIF p_boost_tokens >= 5 THEN
        v_boost_multiplier := 1.5;  -- Super boost
    END IF;

    -- Total: multiplicateurs se multiplient entre eux
    -- Ex: Pro (x1.5) + Gold stake (x1.3) + Super boost (x1.5) = x2.925
    RETURN v_sub_multiplier * v_stake_multiplier * v_boost_multiplier;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. FONCTION: Distribuer les rewards mensuels aux abonnés
-- ============================================================================

CREATE OR REPLACE FUNCTION distribute_monthly_subscriber_rewards()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_user RECORD;
BEGIN
    FOR v_user IN
        SELECT p.id as user_id, p.subscription_plan, stm.monthly_token_reward
        FROM profiles p
        JOIN subscription_token_mapping stm ON stm.subscription_plan = p.subscription_plan
        WHERE stm.monthly_token_reward > 0
        AND p.subscription_status = 'active'
    LOOP
        -- Ajouter les tokens
        INSERT INTO user_token_balances (user_id, available_balance, lifetime_earned)
        VALUES (v_user.user_id, v_user.monthly_token_reward, v_user.monthly_token_reward)
        ON CONFLICT (user_id) DO UPDATE SET
            available_balance = user_token_balances.available_balance + v_user.monthly_token_reward,
            lifetime_earned = user_token_balances.lifetime_earned + v_user.monthly_token_reward;

        -- Logger le reward
        INSERT INTO user_loyalty_rewards (user_id, reward_type, tokens_earned, notes)
        VALUES (v_user.user_id, 'monthly_subscription', v_user.monthly_token_reward,
                'Monthly reward for ' || v_user.subscription_plan || ' plan');

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FONCTION: Reward pour vote correct
-- ============================================================================

CREATE OR REPLACE FUNCTION reward_correct_vote(
    p_user_id UUID,
    p_evaluation_id BIGINT
)
RETURNS INTEGER AS $$
DECLARE
    v_reward INTEGER := 2;
    v_consensus_result BOOLEAN;
    v_user_vote BOOLEAN;
BEGIN
    -- Vérifier si l'évaluation a atteint le consensus
    SELECT final_community_result INTO v_consensus_result
    FROM community_consensus
    WHERE evaluation_id = p_evaluation_id
    AND is_consensus_reached = TRUE;

    IF v_consensus_result IS NULL THEN
        RETURN 0;  -- Pas encore de consensus
    END IF;

    -- Vérifier le vote de l'utilisateur
    SELECT vote_agrees INTO v_user_vote
    FROM evaluation_votes
    WHERE evaluation_id = p_evaluation_id
    AND voter_id = p_user_id;

    IF v_user_vote IS NULL THEN
        RETURN 0;  -- N'a pas voté
    END IF;

    -- Si le vote match le consensus
    IF v_user_vote = v_consensus_result THEN
        -- Ajouter le reward
        UPDATE user_token_balances
        SET available_balance = available_balance + v_reward,
            lifetime_earned = lifetime_earned + v_reward
        WHERE user_id = p_user_id;

        INSERT INTO user_loyalty_rewards (user_id, reward_type, tokens_earned, reference_id)
        VALUES (p_user_id, 'correct_vote', v_reward, p_evaluation_id::TEXT);

        RETURN v_reward;
    END IF;

    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. VIEW: Résumé utilisateur (abonnement + tokens)
-- ============================================================================

CREATE OR REPLACE VIEW user_full_status AS
SELECT
    p.id as user_id,
    p.email,
    p.name,

    -- Abonnement
    p.subscription_plan,
    p.subscription_status,
    stm.included_token_tier as sub_token_tier,
    stm.included_vote_multiplier as sub_vote_multiplier,
    stm.monthly_token_reward as sub_monthly_tokens,

    -- Tokens
    COALESCE(utb.available_balance, 0) as token_balance,
    COALESCE(utb.staked_balance, 0) as staked_tokens,
    utb.staking_tier as stake_tier,
    COALESCE(utb.lifetime_earned, 0) as lifetime_tokens_earned,
    COALESCE(utb.lifetime_spent, 0) as lifetime_tokens_spent,

    -- Multiplicateur effectif
    get_effective_vote_multiplier(p.id, 0) as effective_vote_multiplier,

    -- Tier effectif (le meilleur entre abonnement et staking)
    CASE
        WHEN utb.staking_tier = 'platinum' THEN 'platinum'
        WHEN utb.staking_tier = 'gold' OR stm.included_token_tier = 'gold' THEN 'gold'
        WHEN utb.staking_tier = 'silver' OR stm.included_token_tier = 'silver' THEN 'silver'
        WHEN utb.staking_tier = 'bronze' OR stm.included_token_tier = 'bronze' THEN 'bronze'
        ELSE 'none'
    END as effective_tier

FROM profiles p
LEFT JOIN subscription_token_mapping stm ON stm.subscription_plan = COALESCE(p.subscription_plan, 'free')
LEFT JOIN user_token_balances utb ON utb.user_id = p.id;

-- ============================================================================
-- 9. CE QUE CHAQUE TIER PEUT FAIRE
-- ============================================================================

CREATE OR REPLACE VIEW tier_capabilities AS
SELECT
    'free' as tier,
    1.0 as vote_multiplier,
    0 as monthly_tokens,
    FALSE as beta_access,
    FALSE as private_channel,
    FALSE as founder_calls,
    'Score de base visible' as description
UNION ALL SELECT
    'bronze', 1.2, 10, FALSE, FALSE, FALSE,
    'Vote amplifié x1.2, 10 tokens/mois'
UNION ALL SELECT
    'silver', 1.5, 30, FALSE, FALSE, FALSE,
    'Vote amplifié x1.5, 30 tokens/mois, support prioritaire'
UNION ALL SELECT
    'gold', 2.0, 75, TRUE, TRUE, FALSE,
    'Vote amplifié x2, 75 tokens/mois, accès beta, channel privé'
UNION ALL SELECT
    'platinum', 3.0, 200, TRUE, TRUE, TRUE,
    'Vote amplifié x3, 200 tokens/mois, calls fondateurs';

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT SELECT ON subscription_token_mapping TO authenticated, anon;
GRANT SELECT ON token_bonus_features TO authenticated, anon;
GRANT SELECT ON loyalty_rewards TO authenticated, anon;
GRANT SELECT ON tier_capabilities TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_effective_vote_multiplier TO authenticated;

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Migration 213 - Token + Abonnement Alignés';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'MODÈLE COMMERCIAL:';
    RAISE NOTICE '- Abonnement = ACCÈS (analyses, API, features)';
    RAISE NOTICE '- Token = BONUS en plus de l''accès';
    RAISE NOTICE '';
    RAISE NOTICE 'ABONNÉS REÇOIVENT:';
    RAISE NOTICE '- Starter ($19):  Bronze + 10 tokens/mois';
    RAISE NOTICE '- Pro ($49):      Silver + 30 tokens/mois';
    RAISE NOTICE '- Expert ($99):   Gold + 75 tokens/mois';
    RAISE NOTICE '- Enterprise:     Gold+ + 200 tokens/mois';
    RAISE NOTICE '';
    RAISE NOTICE 'TOKENS SERVENT À:';
    RAISE NOTICE '- Booster son vote (5-15 tokens)';
    RAISE NOTICE '- Accélérer demandes d''évaluation';
    RAISE NOTICE '- Acheter des cosmétiques';
    RAISE NOTICE '- Staker pour benefits exclusifs';
    RAISE NOTICE '';
    RAISE NOTICE 'GAGNER DES TOKENS:';
    RAISE NOTICE '- Reward mensuel abonné';
    RAISE NOTICE '- Vote correct = 2 tokens';
    RAISE NOTICE '- Streaks de connexion';
    RAISE NOTICE '- Parrainages';
    RAISE NOTICE '================================================';
END $$;
