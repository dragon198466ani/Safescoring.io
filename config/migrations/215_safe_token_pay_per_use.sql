-- ============================================================================
-- MIGRATION 215: $SAFE Token - Pay Per Use
-- Token = Accès à l'unité | Abonnement = Accès illimité
-- ============================================================================
--
-- MODÈLE:
-- - Les abonnés ont accès illimité (comme maintenant)
-- - Les non-abonnés peuvent payer en tokens pour accès ponctuel
-- - Les tokens sont gagnés en votant sur les évaluations
-- - 50% des tokens dépensés sont BRÛLÉS (déflationniste)
--
-- ============================================================================

-- ============================================================================
-- 1. BALANCE UTILISATEUR
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_token_balances (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    available_balance INTEGER DEFAULT 0,
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_spent INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_token_balance_user ON user_token_balances(user_id);

-- ============================================================================
-- 2. COMMENT GAGNER DES TOKENS
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_earn_rules (
    id SERIAL PRIMARY KEY,
    action_code TEXT UNIQUE NOT NULL,
    tokens INTEGER NOT NULL,
    cooldown_minutes INTEGER DEFAULT 0,  -- 0 = pas de cooldown
    daily_limit INTEGER,                  -- NULL = illimité
    description TEXT
);

INSERT INTO token_earn_rules (action_code, tokens, cooldown_minutes, daily_limit, description) VALUES
    ('vote_cast', 1, 0, 100, 'Vote sur une évaluation'),
    ('vote_correct', 2, 0, NULL, 'Vote qui match le consensus final'),
    ('challenge_validated', 10, 0, NULL, 'Challenge accepté par la communauté'),
    ('streak_7', 15, 10080, 1, '7 jours consécutifs de votes'),
    ('streak_30', 75, 43200, 1, '30 jours consécutifs de votes'),
    ('referral_signup', 25, 0, 10, 'Parrainage inscription'),
    ('referral_subscribe', 100, 0, NULL, 'Parrainage qui s''abonne')
ON CONFLICT (action_code) DO UPDATE SET tokens = EXCLUDED.tokens;

-- ============================================================================
-- 3. COMMENT DÉPENSER DES TOKENS (Pay Per Use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_spend_items (
    id SERIAL PRIMARY KEY,
    item_code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,  -- 'access', 'request', 'boost'
    tokens_cost INTEGER NOT NULL,

    -- Pour les features normalement réservées aux abonnés
    equivalent_plan TEXT,  -- 'explorer', 'pro', 'enterprise'

    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO token_spend_items (item_code, category, tokens_cost, equivalent_plan, description) VALUES
    -- Accès aux features premium (normalement dans les abos)
    ('detailed_analysis', 'access', 10, 'explorer', 'Analyse détaillée d''un produit (breakdown S/A/F/E)'),
    ('pdf_export', 'access', 5, 'explorer', 'Export PDF d''un produit ou setup'),
    ('extra_setup', 'access', 20, 'explorer', 'Slot de setup supplémentaire'),
    ('api_calls_100', 'access', 15, 'pro', '100 appels API'),
    ('score_history', 'access', 8, 'pro', 'Historique des scores d''un produit'),

    -- Demandes exclusives (pas dans les abos)
    ('request_evaluation', 'request', 100, NULL, 'Demander l''évaluation d''un nouveau produit'),
    ('request_reevaluation', 'request', 50, NULL, 'Forcer la réévaluation d''un produit existant'),

    -- Boosts communautaires
    ('vote_boost_x2', 'boost', 5, NULL, 'Double le poids de ton prochain vote')
ON CONFLICT (item_code) DO UPDATE SET tokens_cost = EXCLUDED.tokens_cost;

-- ============================================================================
-- 4. HISTORIQUE DES TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Type: 'earn' ou 'spend'
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'burn')),

    -- Détails
    action_code TEXT,  -- earn: vote_cast, spend: detailed_analysis, etc.
    tokens_amount INTEGER NOT NULL,
    reference_id TEXT,  -- ID de l'objet concerné (evaluation_id, product_slug, etc.)

    -- Pour les burns
    burn_amount INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_tx_user ON token_transactions(user_id, created_at DESC);
CREATE INDEX idx_token_tx_type ON token_transactions(transaction_type);

-- ============================================================================
-- 5. ACHATS DÉBLOQUÉS (ce que l'user a acheté)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_unlocks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_code TEXT REFERENCES token_spend_items(item_code),
    reference_id TEXT,  -- product_slug, setup_id, etc.

    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- NULL = permanent

    UNIQUE(user_id, item_code, reference_id)
);

CREATE INDEX idx_token_unlocks_user ON token_unlocks(user_id);

-- ============================================================================
-- 6. STATS GLOBALES (pour la valeur du token)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_global_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,

    total_supply INTEGER DEFAULT 100000000,  -- 100M supply fixe
    total_circulating INTEGER DEFAULT 0,     -- Tokens distribués
    total_burned INTEGER DEFAULT 0,          -- Tokens brûlés

    -- Métriques d'activité
    total_earned_alltime INTEGER DEFAULT 0,
    total_spent_alltime INTEGER DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CHECK (id = 1)  -- Une seule ligne
);

INSERT INTO token_global_stats (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. FONCTIONS
-- ============================================================================

-- Gagner des tokens
CREATE OR REPLACE FUNCTION earn_tokens(
    p_user_id UUID,
    p_action_code TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_rule RECORD;
    v_recent INTEGER;
    v_today INTEGER;
BEGIN
    -- Récupérer la règle
    SELECT * INTO v_rule FROM token_earn_rules WHERE action_code = p_action_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown action');
    END IF;

    -- Vérifier cooldown
    IF v_rule.cooldown_minutes > 0 THEN
        SELECT COUNT(*) INTO v_recent
        FROM token_transactions
        WHERE user_id = p_user_id
          AND action_code = p_action_code
          AND created_at > NOW() - (v_rule.cooldown_minutes || ' minutes')::INTERVAL;

        IF v_recent > 0 THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Cooldown active');
        END IF;
    END IF;

    -- Vérifier limite journalière
    IF v_rule.daily_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_today
        FROM token_transactions
        WHERE user_id = p_user_id
          AND action_code = p_action_code
          AND created_at > CURRENT_DATE;

        IF v_today >= v_rule.daily_limit THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Daily limit reached');
        END IF;
    END IF;

    -- Ajouter les tokens
    INSERT INTO user_token_balances (user_id, available_balance, lifetime_earned)
    VALUES (p_user_id, v_rule.tokens, v_rule.tokens)
    ON CONFLICT (user_id) DO UPDATE SET
        available_balance = user_token_balances.available_balance + v_rule.tokens,
        lifetime_earned = user_token_balances.lifetime_earned + v_rule.tokens,
        updated_at = NOW();

    -- Logger la transaction
    INSERT INTO token_transactions (user_id, transaction_type, action_code, tokens_amount, reference_id)
    VALUES (p_user_id, 'earn', p_action_code, v_rule.tokens, p_reference_id);

    -- Mettre à jour les stats globales
    UPDATE token_global_stats SET
        total_circulating = total_circulating + v_rule.tokens,
        total_earned_alltime = total_earned_alltime + v_rule.tokens,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', TRUE,
        'earned', v_rule.tokens,
        'action', p_action_code
    );
END;
$$ LANGUAGE plpgsql;

-- Dépenser des tokens (avec burn 50%)
CREATE OR REPLACE FUNCTION spend_tokens(
    p_user_id UUID,
    p_item_code TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_balance INTEGER;
    v_burn_amount INTEGER;
    v_already_unlocked BOOLEAN;
BEGIN
    -- Récupérer l'item
    SELECT * INTO v_item FROM token_spend_items
    WHERE item_code = p_item_code AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Item not found');
    END IF;

    -- Vérifier si déjà débloqué (pour les achats permanents)
    IF p_reference_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM token_unlocks
            WHERE user_id = p_user_id
              AND item_code = p_item_code
              AND reference_id = p_reference_id
              AND (expires_at IS NULL OR expires_at > NOW())
        ) INTO v_already_unlocked;

        IF v_already_unlocked THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Already unlocked');
        END IF;
    END IF;

    -- Vérifier le solde
    SELECT available_balance INTO v_balance
    FROM user_token_balances WHERE user_id = p_user_id;

    IF v_balance IS NULL OR v_balance < v_item.tokens_cost THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Insufficient balance',
            'required', v_item.tokens_cost,
            'available', COALESCE(v_balance, 0)
        );
    END IF;

    -- Calculer le burn (50%)
    v_burn_amount := v_item.tokens_cost / 2;

    -- Déduire les tokens
    UPDATE user_token_balances SET
        available_balance = available_balance - v_item.tokens_cost,
        lifetime_spent = lifetime_spent + v_item.tokens_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Logger la transaction
    INSERT INTO token_transactions (user_id, transaction_type, action_code, tokens_amount, reference_id, burn_amount)
    VALUES (p_user_id, 'spend', p_item_code, v_item.tokens_cost, p_reference_id, v_burn_amount);

    -- Logger le burn
    INSERT INTO token_transactions (user_id, transaction_type, action_code, tokens_amount)
    VALUES (p_user_id, 'burn', 'auto_burn', v_burn_amount);

    -- Enregistrer le déblocage
    INSERT INTO token_unlocks (user_id, item_code, reference_id)
    VALUES (p_user_id, p_item_code, p_reference_id)
    ON CONFLICT (user_id, item_code, reference_id) DO UPDATE SET unlocked_at = NOW();

    -- Mettre à jour les stats globales
    UPDATE token_global_stats SET
        total_circulating = total_circulating - v_burn_amount,
        total_burned = total_burned + v_burn_amount,
        total_spent_alltime = total_spent_alltime + v_item.tokens_cost,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', TRUE,
        'spent', v_item.tokens_cost,
        'burned', v_burn_amount,
        'item', p_item_code,
        'reference', p_reference_id
    );
END;
$$ LANGUAGE plpgsql;

-- Vérifier si un user a accès à une feature
CREATE OR REPLACE FUNCTION has_token_access(
    p_user_id UUID,
    p_item_code TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM token_unlocks
        WHERE user_id = p_user_id
          AND item_code = p_item_code
          AND (reference_id = p_reference_id OR p_reference_id IS NULL)
          AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO v_has_access;

    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. VIEWS
-- ============================================================================

-- Vue du solde utilisateur
CREATE OR REPLACE VIEW user_token_status AS
SELECT
    utb.user_id,
    utb.available_balance,
    utb.lifetime_earned,
    utb.lifetime_spent,
    (SELECT COUNT(*) FROM token_unlocks WHERE user_id = utb.user_id) as total_unlocks
FROM user_token_balances utb;

-- Vue des stats globales (pour afficher la rareté)
CREATE OR REPLACE VIEW token_economics AS
SELECT
    total_supply,
    total_circulating,
    total_burned,
    total_supply - total_circulating as remaining_to_distribute,
    ROUND(total_burned::NUMERIC / NULLIF(total_supply, 0) * 100, 2) as burn_percentage,
    total_earned_alltime,
    total_spent_alltime
FROM token_global_stats;

-- ============================================================================
-- 9. TRIGGER: Auto-earn tokens quand vote
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_earn_on_vote()
RETURNS TRIGGER AS $$
BEGIN
    -- Donner 1 token pour le vote
    PERFORM earn_tokens(NEW.voter_id, 'vote_cast', NEW.evaluation_id::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur la table des votes
DROP TRIGGER IF EXISTS trg_auto_earn_vote ON evaluation_votes;
CREATE TRIGGER trg_auto_earn_vote
    AFTER INSERT ON evaluation_votes
    FOR EACH ROW
    EXECUTE FUNCTION auto_earn_on_vote();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

ALTER TABLE user_token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_unlocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own data
CREATE POLICY "Users see own balance" ON user_token_balances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users see own transactions" ON token_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users see own unlocks" ON token_unlocks
    FOR SELECT USING (auth.uid() = user_id);

-- Public read for items and rules
GRANT SELECT ON token_earn_rules TO authenticated, anon;
GRANT SELECT ON token_spend_items TO authenticated, anon;
GRANT SELECT ON token_economics TO authenticated, anon;

-- Functions
GRANT EXECUTE ON FUNCTION earn_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION spend_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION has_token_access TO authenticated;

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Migration 215 - $SAFE Token Pay Per Use';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'GAGNER:';
    RAISE NOTICE '  Vote = +1 $SAFE';
    RAISE NOTICE '  Vote correct = +2 $SAFE';
    RAISE NOTICE '  Challenge validé = +10 $SAFE';
    RAISE NOTICE '  Streak 7j = +15 $SAFE';
    RAISE NOTICE '';
    RAISE NOTICE 'DÉPENSER (accès à l''unité):';
    RAISE NOTICE '  Analyse détaillée = 10 $SAFE';
    RAISE NOTICE '  Export PDF = 5 $SAFE';
    RAISE NOTICE '  Setup extra = 20 $SAFE';
    RAISE NOTICE '  100 API calls = 15 $SAFE';
    RAISE NOTICE '  Demande évaluation = 100 $SAFE';
    RAISE NOTICE '';
    RAISE NOTICE 'DÉFLATIONNISTE:';
    RAISE NOTICE '  50%% des tokens dépensés sont BRÛLÉS';
    RAISE NOTICE '  Supply: 100M fixe, décroissant';
    RAISE NOTICE '================================================';
END $$;
