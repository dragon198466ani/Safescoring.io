-- ============================================
-- $SAFE POINTS SYSTEM
-- Points internes convertibles en token plus tard
-- ============================================

-- 1. BALANCE UTILISATEUR
CREATE TABLE IF NOT EXISTS user_points (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

    balance INTEGER DEFAULT 0,           -- Points actuels
    total_earned INTEGER DEFAULT 0,      -- Total gagné (jamais décrémenté)

    -- Stats
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
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    amount INTEGER NOT NULL,             -- + ou -
    balance_after INTEGER NOT NULL,

    -- Type de transaction
    tx_type TEXT NOT NULL CHECK (tx_type IN (
        'verification',      -- Vérification d'une norme
        'consensus_bonus',   -- Bonus quand ton vote = consensus
        'streak_bonus',      -- Bonus streak journalier
        'level_up',          -- Bonus passage de niveau
        'referral',          -- Parrainage
        'premium_spent',     -- Dépensé pour premium
        'admin_grant'        -- Ajout admin
    )),

    description TEXT,
    related_product_id UUID REFERENCES products(id),
    related_norm_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VÉRIFICATIONS DE NORMES
CREATE TABLE IF NOT EXISTS norm_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    norm_id UUID NOT NULL,

    -- Le user confirme ou conteste le résultat IA
    agrees BOOLEAN NOT NULL,  -- true = confirme, false = conteste

    -- Si conteste, quelle valeur ?
    suggested_value TEXT CHECK (suggested_value IN ('YES', 'NO', 'N/A')),
    reason TEXT,
    evidence_url TEXT,

    -- Points gagnés pour cette vérif
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
    pr.name,
    pr.avatar_url,
    up.balance,
    up.total_earned,
    up.level,
    up.verifications_count,
    up.streak_days,
    RANK() OVER (ORDER BY up.total_earned DESC) as rank
FROM user_points up
JOIN profiles pr ON pr.id = up.user_id
WHERE up.total_earned > 0
ORDER BY up.total_earned DESC;

-- 6. FONCTION: Ajouter des points
CREATE OR REPLACE FUNCTION add_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_tx_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_product_id UUID DEFAULT NULL,
    p_norm_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Créer user_points si n'existe pas
    INSERT INTO user_points (user_id, balance, total_earned)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Mettre à jour balance
    UPDATE user_points
    SET balance = balance + p_amount,
        total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    -- Logger la transaction
    INSERT INTO points_transactions (user_id, amount, balance_after, tx_type, description, related_product_id, related_norm_id)
    VALUES (p_user_id, p_amount, v_new_balance, p_tx_type, p_description, p_product_id, p_norm_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 7. FONCTION: Traiter une vérification
CREATE OR REPLACE FUNCTION submit_verification(
    p_user_id UUID,
    p_product_id UUID,
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
    -- Vérifier si déjà voté
    SELECT NOT EXISTS (
        SELECT 1 FROM norm_verifications
        WHERE user_id = p_user_id AND product_id = p_product_id AND norm_id = p_norm_id
    ) INTO v_is_new;

    IF NOT v_is_new THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already verified this norm');
    END IF;

    -- Bonus si preuve fournie
    IF p_evidence_url IS NOT NULL THEN
        v_points := v_points + 5;
    END IF;

    -- Insérer vérification
    INSERT INTO norm_verifications (user_id, product_id, norm_id, agrees, suggested_value, reason, evidence_url, points_earned)
    VALUES (p_user_id, p_product_id, p_norm_id, p_agrees, p_suggested_value, p_reason, p_evidence_url, v_points);

    -- Ajouter points
    SELECT add_points(p_user_id, v_points, 'verification', 'Norm verification', p_product_id, p_norm_id) INTO v_new_balance;

    -- Mettre à jour compteur
    UPDATE user_points
    SET verifications_count = verifications_count + 1
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'points_earned', v_points,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql;

-- 8. INDEX
CREATE INDEX IF NOT EXISTS idx_points_tx_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_tx_date ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verif_product ON norm_verifications(product_id);
CREATE INDEX IF NOT EXISTS idx_verif_user ON norm_verifications(user_id);

-- 9. RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE norm_verifications ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Points public read" ON user_points FOR SELECT USING (true);
CREATE POLICY "Leaderboard public" ON points_transactions FOR SELECT USING (true);
CREATE POLICY "Verifications public" ON norm_verifications FOR SELECT USING (true);

-- Écriture par user authentifié
CREATE POLICY "User can verify" ON norm_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
