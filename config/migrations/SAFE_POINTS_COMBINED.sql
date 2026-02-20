-- ============================================================
-- $SAFE POINTS + SHOP SYSTEM - COMBINED MIGRATION
-- Copy and paste this entire file in Supabase SQL Editor
-- https://supabase.com/dashboard/project/ajdncttomdqojlozxjxu/sql/new
-- ============================================================

-- ============================================
-- PART 1: $SAFE POINTS SYSTEM
-- ============================================

-- 1. BALANCE UTILISATEUR
CREATE TABLE IF NOT EXISTS user_points (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    verifications_count INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_activity DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HISTORIQUE DES TRANSACTIONS
CREATE TABLE IF NOT EXISTS points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    tx_type TEXT NOT NULL CHECK (tx_type IN (
        'verification', 'consensus_bonus', 'streak_bonus',
        'level_up', 'referral', 'premium_spent', 'admin_grant'
    )),
    description TEXT,
    related_product_id INTEGER,  -- products.id is INTEGER
    related_norm_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VÉRIFICATIONS DE NORMES
CREATE TABLE IF NOT EXISTS norm_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,  -- products.id is INTEGER, no FK to avoid type issues
    norm_id UUID NOT NULL,
    agrees BOOLEAN NOT NULL,
    suggested_value TEXT CHECK (suggested_value IN ('YES', 'NO', 'N/A')),
    reason TEXT,
    evidence_url TEXT,
    points_earned INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id, norm_id)
);

-- 4. VUE: Stats de vérification par produit
CREATE OR REPLACE VIEW product_verification_stats AS
SELECT
    p.id as product_id,
    p.slug,
    COUNT(nv.id) as total_verifications,
    COUNT(DISTINCT nv.user_id) as unique_verifiers,
    COUNT(DISTINCT nv.norm_id) as norms_verified,
    (SELECT COUNT(*) FROM norms) as total_norms,
    ROUND(100.0 * COUNT(DISTINCT nv.norm_id) / NULLIF((SELECT COUNT(*) FROM norms), 0), 1) as percent_verified,
    COUNT(CASE WHEN nv.agrees THEN 1 END) as agreements,
    ROUND(100.0 * COUNT(CASE WHEN nv.agrees THEN 1 END) / NULLIF(COUNT(*), 0), 0) as agreement_rate
FROM products p
LEFT JOIN norm_verifications nv ON nv.product_id = p.id
GROUP BY p.id, p.slug;

-- 5. VUE: Leaderboard
CREATE OR REPLACE VIEW points_leaderboard AS
SELECT
    up.user_id,
    COALESCE(u.name, 'Anonymous') as name,
    u.image as avatar_url,
    up.balance,
    up.total_earned,
    up.level,
    up.verifications_count,
    up.streak_days,
    RANK() OVER (ORDER BY up.total_earned DESC) as rank
FROM user_points up
LEFT JOIN users u ON u.id = up.user_id
WHERE up.total_earned > 0
ORDER BY up.total_earned DESC;

-- 6. FONCTION: Ajouter des points
CREATE OR REPLACE FUNCTION add_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_tx_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_product_id INTEGER DEFAULT NULL,  -- products.id is INTEGER
    p_norm_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    INSERT INTO user_points (user_id, balance, total_earned)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE user_points
    SET balance = balance + p_amount,
        total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO points_transactions (user_id, amount, balance_after, tx_type, description, related_product_id, related_norm_id)
    VALUES (p_user_id, p_amount, v_new_balance, p_tx_type, p_description, p_product_id, p_norm_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FONCTION: Traiter une vérification
CREATE OR REPLACE FUNCTION submit_verification(
    p_user_id UUID,
    p_product_id INTEGER,  -- products.id is INTEGER
    p_norm_id UUID,
    p_agrees BOOLEAN,
    p_suggested_value TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_evidence_url TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_points INTEGER := 10;
    v_new_balance INTEGER;
    v_is_new BOOLEAN;
BEGIN
    SELECT NOT EXISTS (
        SELECT 1 FROM norm_verifications
        WHERE user_id = p_user_id AND product_id = p_product_id AND norm_id = p_norm_id
    ) INTO v_is_new;

    IF NOT v_is_new THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already verified this norm');
    END IF;

    IF p_evidence_url IS NOT NULL THEN
        v_points := v_points + 5;
    END IF;

    INSERT INTO norm_verifications (user_id, product_id, norm_id, agrees, suggested_value, reason, evidence_url, points_earned)
    VALUES (p_user_id, p_product_id, p_norm_id, p_agrees, p_suggested_value, p_reason, p_evidence_url, v_points);

    SELECT add_points(p_user_id, v_points, 'verification', 'Norm verification', p_product_id, p_norm_id) INTO v_new_balance;

    UPDATE user_points
    SET verifications_count = verifications_count + 1
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'points_earned', v_points,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. INDEX
CREATE INDEX IF NOT EXISTS idx_points_tx_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_date ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verif_product ON norm_verifications(product_id);
CREATE INDEX IF NOT EXISTS idx_verif_user ON norm_verifications(user_id);

-- 9. RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE norm_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Points public read" ON user_points;
DROP POLICY IF EXISTS "Leaderboard public" ON points_transactions;
DROP POLICY IF EXISTS "Verifications public" ON norm_verifications;
DROP POLICY IF EXISTS "User can verify" ON norm_verifications;

CREATE POLICY "Points public read" ON user_points FOR SELECT USING (true);
CREATE POLICY "Leaderboard public" ON points_transactions FOR SELECT USING (true);
CREATE POLICY "Verifications public" ON norm_verifications FOR SELECT USING (true);
CREATE POLICY "User can verify" ON norm_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 2: $SAFE SHOP SYSTEM
-- ============================================

-- 1. PRODUITS DE LA BOUTIQUE
CREATE TABLE IF NOT EXISTS shop_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_safe INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('premium', 'badge', 'feature', 'cosmetic')),
    duration_days INTEGER,
    badge_emoji TEXT,
    badge_color TEXT,
    max_purchases INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACHATS UTILISATEURS
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES shop_items(id),
    price_paid INTEGER NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- 3. BADGES UTILISATEURS
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_emoji TEXT,
    badge_color TEXT,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'purchase',
    UNIQUE(user_id, badge_id)
);

-- 4. SEED: Items de base (MVP)
-- Phase 1: Badges simples + 1 boost
INSERT INTO shop_items (id, name, description, price_safe, category, duration_days, badge_emoji, badge_color, max_purchases) VALUES
    -- BADGES MVP (status symbols)
    ('badge_verified', 'Badge Vérifié', 'Montre que tu es un vérificateur actif', 100, 'badge', NULL, '✓', 'green', 1),
    ('badge_og', 'Badge OG', 'Early adopter de SafeScoring - Edition limitée', 1000, 'badge', NULL, '💎', 'purple', 1),

    -- BOOST MVP (simple multiplier)
    ('boost_2x_points', 'Boost 2x Points', 'Double tes points pendant 7 jours', 250, 'feature', 7, '⚡', 'yellow', NULL)
ON CONFLICT (id) DO NOTHING;

-- 5. FONCTION: Acheter un item
CREATE OR REPLACE FUNCTION purchase_item(
    p_user_id UUID,
    p_item_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_item shop_items%ROWTYPE;
    v_balance INTEGER;
    v_new_balance INTEGER;
    v_expires_at TIMESTAMPTZ;
    v_purchase_count INTEGER;
BEGIN
    SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item not found');
    END IF;

    SELECT balance INTO v_balance FROM user_points WHERE user_id = p_user_id;
    IF v_balance IS NULL OR v_balance < v_item.price_safe THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'required', v_item.price_safe, 'current', COALESCE(v_balance, 0));
    END IF;

    IF v_item.max_purchases IS NOT NULL THEN
        SELECT COUNT(*) INTO v_purchase_count
        FROM user_purchases
        WHERE user_id = p_user_id AND item_id = p_item_id;

        IF v_purchase_count >= v_item.max_purchases THEN
            RETURN jsonb_build_object('success', false, 'error', 'Max purchases reached');
        END IF;
    END IF;

    IF v_item.duration_days IS NOT NULL THEN
        v_expires_at := NOW() + (v_item.duration_days || ' days')::INTERVAL;
    END IF;

    UPDATE user_points
    SET balance = balance - v_item.price_safe, updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO points_transactions (user_id, amount, balance_after, tx_type, description)
    VALUES (p_user_id, -v_item.price_safe, v_new_balance, 'premium_spent', 'Achat: ' || v_item.name);

    INSERT INTO user_purchases (user_id, item_id, price_paid, expires_at)
    VALUES (p_user_id, p_item_id, v_item.price_safe, v_expires_at);

    IF v_item.category = 'badge' THEN
        INSERT INTO user_badges (user_id, badge_id, badge_name, badge_emoji, badge_color, source)
        VALUES (p_user_id, p_item_id, v_item.name, v_item.badge_emoji, v_item.badge_color, 'purchase')
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'item', v_item.name,
        'price', v_item.price_safe,
        'new_balance', v_new_balance,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FONCTION: Vérifier si user a un item actif
CREATE OR REPLACE FUNCTION user_has_item(p_user_id UUID, p_item_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_purchases
        WHERE user_id = p_user_id
        AND item_id = p_item_id
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FONCTION: Check premium status
CREATE OR REPLACE FUNCTION user_has_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_purchases
        WHERE user_id = p_user_id
        AND item_id LIKE 'premium_%'
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. VUE: Items actifs d'un user
CREATE OR REPLACE VIEW user_active_items AS
SELECT
    up.user_id,
    up.item_id,
    si.name,
    si.category,
    up.purchased_at,
    up.expires_at,
    CASE
        WHEN up.expires_at IS NULL THEN 'permanent'
        WHEN up.expires_at > NOW() THEN 'active'
        ELSE 'expired'
    END as status
FROM user_purchases up
JOIN shop_items si ON si.id = up.item_id
WHERE up.is_active = true;

-- 9. INDEX
CREATE INDEX IF NOT EXISTS idx_purchases_user ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_expires ON user_purchases(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_badges_user ON user_badges(user_id);

-- 10. RLS
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop items public" ON shop_items;
DROP POLICY IF EXISTS "User sees own purchases" ON user_purchases;
DROP POLICY IF EXISTS "Badges public" ON user_badges;

CREATE POLICY "Shop items public" ON shop_items FOR SELECT USING (true);
CREATE POLICY "User sees own purchases" ON user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Badges public" ON user_badges FOR SELECT USING (true);

-- ============================================
-- PART 3: STAKING SYSTEM
-- ============================================

-- 1. TABLE DES STAKES
CREATE TABLE IF NOT EXISTS user_staking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount >= 100),
    staked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unstaking', 'withdrawn')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HISTORIQUE DES REWARDS
CREATE TABLE IF NOT EXISTS staking_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stake_id UUID REFERENCES user_staking(id),
    amount INTEGER NOT NULL,
    tier TEXT,
    apy_rate NUMERIC(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEX
CREATE INDEX IF NOT EXISTS idx_staking_user ON user_staking(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_status ON user_staking(status);
CREATE INDEX IF NOT EXISTS idx_staking_rewards_user ON staking_rewards(user_id);

-- 3b. VUE: Résumé staking par utilisateur (avec tier)
CREATE OR REPLACE VIEW user_staking_summary AS
SELECT
    user_id,
    COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as total_staked,
    COUNT(*) FILTER (WHERE status = 'active') as stake_count,
    MIN(staked_at) FILTER (WHERE status = 'active') as first_stake_at,
    COALESCE(SUM(amount) FILTER (WHERE status = 'unstaking'), 0) as total_unstaking,
    -- Calculate tier based on total staked
    CASE
        WHEN COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) >= 5000 THEN 'diamond'
        WHEN COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) >= 2500 THEN 'platinum'
        WHEN COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) >= 1000 THEN 'gold'
        WHEN COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) >= 500 THEN 'silver'
        WHEN COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) >= 100 THEN 'bronze'
        ELSE NULL
    END as tier
FROM user_staking
GROUP BY user_id;

-- 4. FONCTION: Staker des tokens
CREATE OR REPLACE FUNCTION stake_tokens(
    p_user_id UUID,
    p_amount INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_balance INTEGER;
    v_new_stake_id UUID;
    v_total_staked INTEGER;
BEGIN
    IF p_amount < 100 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Minimum 100 $SAFE');
    END IF;

    SELECT balance INTO v_balance FROM user_points WHERE user_id = p_user_id;

    IF v_balance IS NULL OR v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE user_points SET balance = balance - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO user_staking (user_id, amount)
    VALUES (p_user_id, p_amount)
    RETURNING id INTO v_new_stake_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_staked
    FROM user_staking WHERE user_id = p_user_id AND status = 'active';

    INSERT INTO points_transactions (user_id, amount, balance_after, tx_type, description)
    VALUES (p_user_id, -p_amount, v_balance - p_amount, 'premium_spent', 'Staked ' || p_amount || ' $SAFE');

    RETURN jsonb_build_object(
        'success', true,
        'stake_id', v_new_stake_id,
        'amount_staked', p_amount,
        'total_staked', v_total_staked,
        'new_balance', v_balance - p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FONCTION: Unstaker (7 jours cooldown)
CREATE OR REPLACE FUNCTION unstake_tokens(
    p_user_id UUID,
    p_stake_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_stake user_staking%ROWTYPE;
    v_unlock_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_stake FROM user_staking
    WHERE id = p_stake_id AND user_id = p_user_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stake not found');
    END IF;

    v_unlock_at := NOW() + INTERVAL '7 days';

    UPDATE user_staking
    SET status = 'unstaking', unlock_at = v_unlock_at, updated_at = NOW()
    WHERE id = p_stake_id;

    RETURN jsonb_build_object(
        'success', true,
        'stake_id', p_stake_id,
        'amount', v_stake.amount,
        'unlock_at', v_unlock_at,
        'message', 'Unstaking initiated. Tokens available in 7 days.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FONCTION: Retirer après cooldown
CREATE OR REPLACE FUNCTION withdraw_unstaked_tokens(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total INTEGER := 0;
    v_count INTEGER := 0;
BEGIN
    WITH withdrawn AS (
        UPDATE user_staking
        SET status = 'withdrawn', updated_at = NOW()
        WHERE user_id = p_user_id AND status = 'unstaking' AND unlock_at <= NOW()
        RETURNING amount
    )
    SELECT COALESCE(SUM(amount), 0), COUNT(*) INTO v_total, v_count FROM withdrawn;

    IF v_total > 0 THEN
        UPDATE user_points SET balance = balance + v_total, updated_at = NOW()
        WHERE user_id = p_user_id;

        INSERT INTO points_transactions (user_id, amount, balance_after, tx_type, description)
        SELECT p_user_id, v_total, balance, 'admin_grant', 'Withdrawn staked tokens'
        FROM user_points WHERE user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'withdrawn_amount', v_total,
        'stakes_withdrawn', v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FONCTION: Distribuer les rewards hebdo (appelée par cron)
CREATE OR REPLACE FUNCTION distribute_staking_rewards()
RETURNS INTEGER AS $$
DECLARE
    v_user RECORD;
    v_reward INTEGER;
    v_tier TEXT;
    v_apy NUMERIC;
    v_count INTEGER := 0;
BEGIN
    FOR v_user IN
        SELECT user_id, SUM(amount) as total_staked
        FROM user_staking
        WHERE status = 'active'
        GROUP BY user_id
    LOOP
        -- Determine tier and APY
        IF v_user.total_staked >= 5000 THEN
            v_tier := 'diamond'; v_apy := 0.02;
        ELSIF v_user.total_staked >= 2500 THEN
            v_tier := 'platinum'; v_apy := 0.0125;
        ELSIF v_user.total_staked >= 1000 THEN
            v_tier := 'gold'; v_apy := 0.01;
        ELSIF v_user.total_staked >= 500 THEN
            v_tier := 'silver'; v_apy := 0.0075;
        ELSIF v_user.total_staked >= 100 THEN
            v_tier := 'bronze'; v_apy := 0.005;
        ELSE
            CONTINUE;
        END IF;

        -- Weekly reward (APY/52), capped at 200
        v_reward := LEAST(FLOOR(v_user.total_staked * v_apy), 200);

        IF v_reward > 0 THEN
            -- Add reward to balance
            PERFORM add_points(v_user.user_id, v_reward, 'admin_grant', 'Weekly staking reward (' || v_tier || ')');

            -- Log reward
            INSERT INTO staking_rewards (user_id, amount, tier, apy_rate)
            VALUES (v_user.user_id, v_reward, v_tier, v_apy);

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. VUE: Leaderboard staking
CREATE OR REPLACE VIEW staking_leaderboard AS
SELECT
    us.user_id,
    COALESCE(u.name, 'Anonymous') as display_name,
    u.image as avatar_url,
    SUM(us.amount) as total_staked,
    CASE
        WHEN SUM(us.amount) >= 5000 THEN 'diamond'
        WHEN SUM(us.amount) >= 2500 THEN 'platinum'
        WHEN SUM(us.amount) >= 1000 THEN 'gold'
        WHEN SUM(us.amount) >= 500 THEN 'silver'
        WHEN SUM(us.amount) >= 100 THEN 'bronze'
        ELSE NULL
    END as tier,
    RANK() OVER (ORDER BY SUM(us.amount) DESC) as rank
FROM user_staking us
LEFT JOIN users u ON u.id = us.user_id
WHERE us.status = 'active'
GROUP BY us.user_id, u.name, u.image
ORDER BY total_staked DESC;

-- 9. RLS
ALTER TABLE user_staking ENABLE ROW LEVEL SECURITY;
ALTER TABLE staking_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User sees own stakes" ON user_staking;
DROP POLICY IF EXISTS "User sees own rewards" ON staking_rewards;

CREATE POLICY "User sees own stakes" ON user_staking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User sees own rewards" ON staking_rewards FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- DONE! Complete $SAFE system is ready
-- Run distribute_staking_rewards() weekly via cron
-- ============================================
