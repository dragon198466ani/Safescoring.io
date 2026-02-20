-- ============================================
-- $SAFE SHOP - Dépenser ses tokens
-- ============================================

-- 1. PRODUITS DE LA BOUTIQUE
CREATE TABLE IF NOT EXISTS shop_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_safe INTEGER NOT NULL,        -- Prix en $SAFE
    category TEXT NOT NULL CHECK (category IN ('premium', 'badge', 'feature', 'cosmetic')),

    -- Durée (pour premium/features)
    duration_days INTEGER,              -- NULL = permanent

    -- Badge (pour badges)
    badge_emoji TEXT,
    badge_color TEXT,

    -- Limites
    max_purchases INTEGER,              -- NULL = illimité
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACHATS UTILISATEURS
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES shop_items(id),

    price_paid INTEGER NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,             -- NULL = permanent

    -- Status
    is_active BOOLEAN DEFAULT true
);

-- 3. BADGES UTILISATEURS
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    badge_id TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_emoji TEXT,
    badge_color TEXT,

    earned_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'purchase',     -- 'purchase', 'achievement', 'admin'

    UNIQUE(user_id, badge_id)
);

-- 4. SEED: Items de base
INSERT INTO shop_items (id, name, description, price_safe, category, duration_days, badge_emoji, badge_color) VALUES
    -- Premium
    ('premium_week', 'Premium 1 semaine', 'Accès Premium pendant 7 jours', 200, 'premium', 7, NULL, NULL),
    ('premium_month', 'Premium 1 mois', 'Accès Premium pendant 30 jours', 500, 'premium', 30, NULL, NULL),
    ('premium_year', 'Premium 1 an', 'Accès Premium pendant 365 jours', 4000, 'premium', 365, NULL, NULL),

    -- Badges
    ('badge_verified', 'Badge Vérifié', 'Montre que tu es un vérificateur actif', 100, 'badge', NULL, '✓', 'green'),
    ('badge_expert', 'Badge Expert', 'Reconnu comme expert de la communauté', 500, 'badge', NULL, '🏆', 'gold'),
    ('badge_og', 'Badge OG', 'Early adopter de SafeScoring', 1000, 'badge', NULL, '💎', 'purple'),
    ('badge_whale', 'Badge Whale', 'Top contributeur', 5000, 'badge', NULL, '🐋', 'blue'),

    -- Features
    ('no_ads', 'Sans publicité', 'Retire toutes les pubs pendant 30 jours', 150, 'feature', 30, NULL, NULL),
    ('api_boost', 'API Boost', '+100 requêtes API par jour pendant 30 jours', 300, 'feature', 30, NULL, NULL),
    ('export_pdf', 'Export PDF illimité', 'Exporte en PDF sans limite pendant 30 jours', 250, 'feature', 30, NULL, NULL)
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
    -- Récupérer l'item
    SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item not found');
    END IF;

    -- Vérifier balance
    SELECT balance INTO v_balance FROM user_points WHERE user_id = p_user_id;
    IF v_balance IS NULL OR v_balance < v_item.price_safe THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'required', v_item.price_safe, 'current', COALESCE(v_balance, 0));
    END IF;

    -- Vérifier limite d'achats
    IF v_item.max_purchases IS NOT NULL THEN
        SELECT COUNT(*) INTO v_purchase_count
        FROM user_purchases
        WHERE user_id = p_user_id AND item_id = p_item_id;

        IF v_purchase_count >= v_item.max_purchases THEN
            RETURN jsonb_build_object('success', false, 'error', 'Max purchases reached');
        END IF;
    END IF;

    -- Calculer expiration
    IF v_item.duration_days IS NOT NULL THEN
        v_expires_at := NOW() + (v_item.duration_days || ' days')::INTERVAL;
    END IF;

    -- Déduire les points
    UPDATE user_points
    SET balance = balance - v_item.price_safe, updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    -- Logger la transaction
    INSERT INTO points_transactions (user_id, amount, balance_after, tx_type, description)
    VALUES (p_user_id, -v_item.price_safe, v_new_balance, 'premium_spent', 'Achat: ' || v_item.name);

    -- Créer l'achat
    INSERT INTO user_purchases (user_id, item_id, price_paid, expires_at)
    VALUES (p_user_id, p_item_id, v_item.price_safe, v_expires_at);

    -- Si c'est un badge, l'ajouter
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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

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

CREATE POLICY "Shop items public" ON shop_items FOR SELECT USING (true);
CREATE POLICY "User sees own purchases" ON user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Badges public" ON user_badges FOR SELECT USING (true);
