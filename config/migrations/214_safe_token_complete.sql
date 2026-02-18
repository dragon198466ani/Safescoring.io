-- ============================================================================
-- MIGRATION 214: $SAFE Token - Système Complet
-- Combine: Gagner (activité) + Staker (APY) + Dépenser (perks)
-- ============================================================================

-- ============================================================================
-- 1. BALANCE UTILISATEUR
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_token_balances (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),

    -- Soldes
    available_balance NUMERIC(18,4) DEFAULT 0,  -- Disponible
    staked_balance NUMERIC(18,4) DEFAULT 0,     -- Staké (locké)
    pending_rewards NUMERIC(18,4) DEFAULT 0,    -- Rewards à claim

    -- Stats
    lifetime_earned NUMERIC(18,4) DEFAULT 0,
    lifetime_spent NUMERIC(18,4) DEFAULT 0,
    lifetime_staking_rewards NUMERIC(18,4) DEFAULT 0,

    -- Staking
    staking_tier TEXT,  -- bronze, silver, gold, platinum
    staking_started_at TIMESTAMPTZ,
    last_reward_claim TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. GAGNER DES TOKENS (Activité)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_earn_actions (
    id SERIAL PRIMARY KEY,
    action_code TEXT UNIQUE NOT NULL,
    action_name TEXT NOT NULL,
    tokens_reward INTEGER NOT NULL,
    cooldown_hours INTEGER DEFAULT 0,  -- 0 = pas de limite
    daily_limit INTEGER,               -- NULL = illimité
    description TEXT
);

INSERT INTO token_earn_actions VALUES
    -- Votes communautaires
    (1, 'vote_cast', 'Vote soumis', 1, 0, 50, 'Chaque vote sur une évaluation'),
    (2, 'vote_correct', 'Vote correct', 2, 0, NULL, 'Vote qui match le consensus final'),
    (3, 'challenge_validated', 'Challenge validé', 10, 0, NULL, 'Ton challenge a été confirmé par la communauté'),

    -- Streaks
    (4, 'streak_3', 'Streak 3 jours', 5, 72, 1, '3 jours consécutifs actif'),
    (5, 'streak_7', 'Streak 7 jours', 15, 168, 1, '7 jours consécutifs actif'),
    (6, 'streak_30', 'Streak 30 jours', 75, 720, 1, '30 jours consécutifs actif'),

    -- Engagement
    (7, 'first_setup', 'Premier setup', 20, 0, 1, 'Création de ton premier setup'),
    (8, 'share_setup', 'Partage setup', 5, 24, 3, 'Partager ton setup'),
    (9, 'referral', 'Parrainage', 50, 0, NULL, 'Quelqu un s inscrit avec ton lien'),
    (10, 'referral_subscribes', 'Parrainage premium', 100, 0, NULL, 'Ton filleul prend un abonnement'),

    -- Abonnés (bonus mensuel)
    (11, 'sub_starter', 'Bonus Starter', 10, 720, 1, 'Bonus mensuel abonnés Starter'),
    (12, 'sub_pro', 'Bonus Pro', 30, 720, 1, 'Bonus mensuel abonnés Pro'),
    (13, 'sub_expert', 'Bonus Expert', 75, 720, 1, 'Bonus mensuel abonnés Expert')
ON CONFLICT (action_code) DO UPDATE SET tokens_reward = EXCLUDED.tokens_reward;

-- Historique des gains
CREATE TABLE IF NOT EXISTS token_earn_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action_code TEXT REFERENCES token_earn_actions(action_code),
    tokens_earned INTEGER NOT NULL,
    reference_id TEXT,  -- ID de l'objet lié (vote_id, setup_id, etc.)
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_earn_user ON token_earn_history(user_id, earned_at);

-- ============================================================================
-- 3. STAKING (APY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS staking_tiers (
    id SERIAL PRIMARY KEY,
    tier_code TEXT UNIQUE NOT NULL,
    tier_name TEXT NOT NULL,
    min_stake INTEGER NOT NULL,
    apy_percent NUMERIC(5,2) NOT NULL,
    description TEXT
);

INSERT INTO staking_tiers VALUES
    (1, 'bronze', 'Bronze', 100, 5.0, 'Stake 100+ $SAFE = 5% APY'),
    (2, 'silver', 'Silver', 500, 6.0, 'Stake 500+ $SAFE = 6% APY'),
    (3, 'gold', 'Gold', 2000, 8.0, 'Stake 2000+ $SAFE = 8% APY'),
    (4, 'platinum', 'Platinum', 10000, 10.0, 'Stake 10000+ $SAFE = 10% APY')
ON CONFLICT (tier_code) DO UPDATE SET apy_percent = EXCLUDED.apy_percent;

-- ============================================================================
-- 4. DÉPENSER DES TOKENS (Perks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_shop_items (
    id SERIAL PRIMARY KEY,
    item_code TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,  -- 'cosmetic', 'boost', 'feature'
    price_tokens INTEGER NOT NULL,
    description TEXT,
    is_one_time BOOLEAN DEFAULT TRUE,  -- TRUE = achat unique, FALSE = consommable
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO token_shop_items VALUES
    -- Cosmétiques (permanents)
    (1, 'badge_og', 'Badge OG', 'cosmetic', 200, 'Badge Early Adopter sur ton profil', TRUE, TRUE),
    (2, 'badge_expert', 'Badge Expert', 'cosmetic', 500, 'Badge Expert Sécurité', TRUE, TRUE),
    (3, 'frame_gold', 'Cadre Doré', 'cosmetic', 150, 'Cadre doré autour de ton avatar', TRUE, TRUE),
    (4, 'frame_animated', 'Cadre Animé', 'cosmetic', 300, 'Cadre avec effet animé', TRUE, TRUE),
    (5, 'title_custom', 'Titre Custom', 'cosmetic', 250, 'Titre personnalisé sous ton pseudo', TRUE, TRUE),

    -- Boosts (consommables)
    (6, 'vote_boost', 'Super Vote', 'boost', 10, 'Double le poids de ton prochain vote', FALSE, TRUE),
    (7, 'highlight_24h', 'Highlight 24h', 'boost', 25, 'Ton setup en avant sur le leaderboard 24h', FALSE, TRUE),

    -- Features
    (8, 'eval_request', 'Demande Évaluation', 'feature', 100, 'Demander l évaluation d un nouveau produit', FALSE, TRUE),
    (9, 'pdf_export', 'Export PDF', 'feature', 15, 'Exporter une analyse en PDF', FALSE, TRUE)
ON CONFLICT (item_code) DO UPDATE SET price_tokens = EXCLUDED.price_tokens;

-- Historique des achats
CREATE TABLE IF NOT EXISTS token_purchase_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    item_code TEXT REFERENCES token_shop_items(item_code),
    tokens_spent INTEGER NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. FONCTIONS
-- ============================================================================

-- Ajouter des tokens (quand user fait une action)
CREATE OR REPLACE FUNCTION earn_tokens(
    p_user_id UUID,
    p_action_code TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_action RECORD;
    v_recent_count INTEGER;
BEGIN
    -- Get action info
    SELECT * INTO v_action FROM token_earn_actions WHERE action_code = p_action_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown action');
    END IF;

    -- Check daily limit
    IF v_action.daily_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_recent_count
        FROM token_earn_history
        WHERE user_id = p_user_id
          AND action_code = p_action_code
          AND earned_at > NOW() - INTERVAL '24 hours';

        IF v_recent_count >= v_action.daily_limit THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Daily limit reached');
        END IF;
    END IF;

    -- Check cooldown
    IF v_action.cooldown_hours > 0 THEN
        SELECT COUNT(*) INTO v_recent_count
        FROM token_earn_history
        WHERE user_id = p_user_id
          AND action_code = p_action_code
          AND earned_at > NOW() - (v_action.cooldown_hours || ' hours')::INTERVAL;

        IF v_recent_count > 0 THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Cooldown active');
        END IF;
    END IF;

    -- Add tokens
    INSERT INTO user_token_balances (user_id, available_balance, lifetime_earned)
    VALUES (p_user_id, v_action.tokens_reward, v_action.tokens_reward)
    ON CONFLICT (user_id) DO UPDATE SET
        available_balance = user_token_balances.available_balance + v_action.tokens_reward,
        lifetime_earned = user_token_balances.lifetime_earned + v_action.tokens_reward,
        updated_at = NOW();

    -- Log
    INSERT INTO token_earn_history (user_id, action_code, tokens_earned, reference_id)
    VALUES (p_user_id, p_action_code, v_action.tokens_reward, p_reference_id);

    RETURN jsonb_build_object(
        'success', TRUE,
        'tokens_earned', v_action.tokens_reward,
        'action', v_action.action_name
    );
END;
$$ LANGUAGE plpgsql;

-- Staker des tokens
CREATE OR REPLACE FUNCTION stake_tokens(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_balance NUMERIC;
    v_new_staked NUMERIC;
    v_new_tier TEXT;
BEGIN
    -- Get current balance
    SELECT available_balance, staked_balance INTO v_balance, v_new_staked
    FROM user_token_balances WHERE user_id = p_user_id;

    IF v_balance IS NULL OR v_balance < p_amount THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Insufficient balance');
    END IF;

    v_new_staked := COALESCE(v_new_staked, 0) + p_amount;

    -- Determine tier
    SELECT tier_code INTO v_new_tier
    FROM staking_tiers
    WHERE min_stake <= v_new_staked
    ORDER BY min_stake DESC
    LIMIT 1;

    -- Update balances
    UPDATE user_token_balances SET
        available_balance = available_balance - p_amount,
        staked_balance = v_new_staked,
        staking_tier = v_new_tier,
        staking_started_at = COALESCE(staking_started_at, NOW()),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'staked', p_amount,
        'total_staked', v_new_staked,
        'tier', v_new_tier
    );
END;
$$ LANGUAGE plpgsql;

-- Unstake des tokens
CREATE OR REPLACE FUNCTION unstake_tokens(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_staked NUMERIC;
    v_new_staked NUMERIC;
    v_new_tier TEXT;
BEGIN
    SELECT staked_balance INTO v_staked
    FROM user_token_balances WHERE user_id = p_user_id;

    IF v_staked IS NULL OR v_staked < p_amount THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Insufficient staked balance');
    END IF;

    v_new_staked := v_staked - p_amount;

    -- Determine new tier
    SELECT tier_code INTO v_new_tier
    FROM staking_tiers
    WHERE min_stake <= v_new_staked
    ORDER BY min_stake DESC
    LIMIT 1;

    UPDATE user_token_balances SET
        available_balance = available_balance + p_amount,
        staked_balance = v_new_staked,
        staking_tier = v_new_tier,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'unstaked', p_amount,
        'total_staked', v_new_staked,
        'tier', v_new_tier
    );
END;
$$ LANGUAGE plpgsql;

-- Calculer et ajouter les rewards de staking (à appeler via cron)
CREATE OR REPLACE FUNCTION calculate_staking_rewards()
RETURNS INTEGER AS $$
DECLARE
    v_user RECORD;
    v_apy NUMERIC;
    v_daily_rate NUMERIC;
    v_reward NUMERIC;
    v_count INTEGER := 0;
BEGIN
    FOR v_user IN
        SELECT utb.user_id, utb.staked_balance, utb.staking_tier, st.apy_percent
        FROM user_token_balances utb
        JOIN staking_tiers st ON st.tier_code = utb.staking_tier
        WHERE utb.staked_balance > 0
          AND utb.staking_tier IS NOT NULL
    LOOP
        -- Daily rate = APY / 365
        v_daily_rate := v_user.apy_percent / 365 / 100;
        v_reward := v_user.staked_balance * v_daily_rate;

        IF v_reward > 0 THEN
            UPDATE user_token_balances SET
                pending_rewards = pending_rewards + v_reward,
                updated_at = NOW()
            WHERE user_id = v_user.user_id;

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Claim les rewards
CREATE OR REPLACE FUNCTION claim_staking_rewards(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_pending NUMERIC;
BEGIN
    SELECT pending_rewards INTO v_pending
    FROM user_token_balances WHERE user_id = p_user_id;

    IF v_pending IS NULL OR v_pending < 1 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'No rewards to claim');
    END IF;

    UPDATE user_token_balances SET
        available_balance = available_balance + FLOOR(v_pending),
        pending_rewards = v_pending - FLOOR(v_pending),
        lifetime_staking_rewards = lifetime_staking_rewards + FLOOR(v_pending),
        last_reward_claim = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'claimed', FLOOR(v_pending)
    );
END;
$$ LANGUAGE plpgsql;

-- Acheter un item
CREATE OR REPLACE FUNCTION purchase_shop_item(
    p_user_id UUID,
    p_item_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_balance NUMERIC;
    v_already_owned BOOLEAN;
BEGIN
    SELECT * INTO v_item FROM token_shop_items
    WHERE item_code = p_item_code AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Item not found');
    END IF;

    -- Check if already owned (for one-time items)
    IF v_item.is_one_time THEN
        SELECT EXISTS(
            SELECT 1 FROM token_purchase_history
            WHERE user_id = p_user_id AND item_code = p_item_code
        ) INTO v_already_owned;

        IF v_already_owned THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Already owned');
        END IF;
    END IF;

    -- Check balance
    SELECT available_balance INTO v_balance
    FROM user_token_balances WHERE user_id = p_user_id;

    IF v_balance IS NULL OR v_balance < v_item.price_tokens THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Insufficient balance');
    END IF;

    -- Deduct and log
    UPDATE user_token_balances SET
        available_balance = available_balance - v_item.price_tokens,
        lifetime_spent = lifetime_spent + v_item.price_tokens,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO token_purchase_history (user_id, item_code, tokens_spent)
    VALUES (p_user_id, p_item_code, v_item.price_tokens);

    RETURN jsonb_build_object(
        'success', TRUE,
        'item', v_item.item_name,
        'spent', v_item.price_tokens
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW user_token_summary AS
SELECT
    utb.user_id,
    utb.available_balance,
    utb.staked_balance,
    utb.pending_rewards,
    utb.staking_tier,
    st.apy_percent,
    utb.lifetime_earned,
    utb.lifetime_spent,
    utb.lifetime_staking_rewards,
    (utb.available_balance + utb.staked_balance + utb.pending_rewards) as total_balance
FROM user_token_balances utb
LEFT JOIN staking_tiers st ON st.tier_code = utb.staking_tier;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT SELECT ON token_earn_actions TO authenticated, anon;
GRANT SELECT ON staking_tiers TO authenticated, anon;
GRANT SELECT ON token_shop_items TO authenticated, anon;
GRANT EXECUTE ON FUNCTION earn_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION stake_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION unstake_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION claim_staking_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_shop_item TO authenticated;

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Migration 214 - Token Complet';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'GAGNER (Activite):';
    RAISE NOTICE '  Vote = +1, Vote correct = +2';
    RAISE NOTICE '  Streak 7j = +15, Streak 30j = +75';
    RAISE NOTICE '  Parrainage = +50/+100';
    RAISE NOTICE '';
    RAISE NOTICE 'STAKER (APY):';
    RAISE NOTICE '  Bronze (100+) = 5%% APY';
    RAISE NOTICE '  Silver (500+) = 6%% APY';
    RAISE NOTICE '  Gold (2000+) = 8%% APY';
    RAISE NOTICE '  Platinum (10000+) = 10%% APY';
    RAISE NOTICE '';
    RAISE NOTICE 'DEPENSER (Shop):';
    RAISE NOTICE '  Cosmétiques: 150-500 tokens';
    RAISE NOTICE '  Boosts: 10-25 tokens';
    RAISE NOTICE '  Features: 15-100 tokens';
    RAISE NOTICE '================================================';
END $$;
