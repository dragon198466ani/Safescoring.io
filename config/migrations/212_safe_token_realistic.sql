-- ============================================================================
-- MIGRATION 212: $SAFE Token - Utilités Réalistes
-- SafeScoring - Site de CONSEILS (pas d'assurance, pas de remboursement)
-- ============================================================================
--
-- UTILITES SIMPLES ET REELLES:
--
-- 1. Débloquer du contenu premium (analyses détaillées)
-- 2. Demander l'évaluation de nouveaux produits
-- 3. Accès prioritaire aux nouvelles évaluations
-- 4. Poids de vote dans le consensus communautaire
-- 5. Rapports PDF personnalisés
-- 6. API pour développeurs
-- 7. Badges et personnalisation profil
-- 8. Accès anticipé aux scores
--
-- ============================================================================

-- ============================================================================
-- 1. CONTENU PREMIUM - Analyses détaillées
-- ============================================================================
-- Les scores sont gratuits, mais l'ANALYSE DETAILLEE coûte des tokens

CREATE TABLE IF NOT EXISTS premium_content (
    id SERIAL PRIMARY KEY,
    content_type TEXT NOT NULL,  -- 'deep_analysis', 'pillar_breakdown', 'risk_report', 'comparison'
    content_name TEXT NOT NULL,
    description TEXT,

    -- Pricing
    price_tokens INTEGER NOT NULL,

    -- Access
    requires_staking BOOLEAN DEFAULT FALSE,
    min_staking_tier TEXT,

    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO premium_content (content_type, content_name, description, price_tokens, requires_staking) VALUES
    -- Analyses par produit
    ('deep_analysis', 'Analyse Complète Produit', 'Analyse détaillée des 916 normes avec justifications IA', 20, FALSE),
    ('pillar_breakdown', 'Détail par Pilier', 'Breakdown S/A/F/E avec points forts et faiblesses', 10, FALSE),
    ('risk_report', 'Rapport de Risques', 'Identification des vulnérabilités et recommandations', 15, FALSE),

    -- Analyses de setup
    ('setup_analysis', 'Analyse Setup Complète', 'Audit détaillé de ton setup avec recommandations', 25, FALSE),
    ('setup_comparison', 'Comparaison Setups', 'Compare ton setup avec les meilleurs du marché', 15, FALSE),

    -- Guides et tutoriels
    ('security_guide', 'Guide Sécurité Avancé', 'Guide complet pour sécuriser tes cryptos', 30, FALSE),
    ('opsec_checklist', 'Checklist OPSEC', 'Liste de vérification sécurité personnalisée', 10, FALSE),

    -- Rapports exportables
    ('pdf_report', 'Rapport PDF Produit', 'PDF exportable avec analyse complète', 15, FALSE),
    ('pdf_setup', 'Rapport PDF Setup', 'PDF de ton setup à partager/archiver', 20, FALSE)
ON CONFLICT DO NOTHING;

-- Historique des achats de contenu
CREATE TABLE IF NOT EXISTS content_purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    content_type TEXT NOT NULL,
    reference_id TEXT,  -- product_slug ou setup_id

    tokens_spent INTEGER NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),

    -- Accès
    access_expires_at TIMESTAMPTZ,  -- NULL = permanent
    download_count INTEGER DEFAULT 0
);

CREATE INDEX idx_content_purchases_user ON content_purchases(user_id);

-- ============================================================================
-- 2. DEMANDES D'ÉVALUATION
-- ============================================================================
-- Paye pour faire évaluer un nouveau produit

CREATE TABLE IF NOT EXISTS evaluation_requests (
    id BIGSERIAL PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id),

    -- Produit à évaluer
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    product_type TEXT,
    why_evaluate TEXT,  -- Pourquoi ce produit?

    -- Coût
    tokens_paid INTEGER NOT NULL,
    priority TEXT DEFAULT 'normal',  -- 'normal', 'priority'

    -- Statut
    status TEXT DEFAULT 'pending',  -- pending, in_progress, completed, rejected
    estimated_completion TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Résultat
    resulting_product_id INTEGER REFERENCES products(id),
    admin_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prix des évaluations
CREATE TABLE IF NOT EXISTS evaluation_pricing (
    id SERIAL PRIMARY KEY,
    priority TEXT UNIQUE NOT NULL,
    base_price INTEGER NOT NULL,
    estimated_days INTEGER,
    description TEXT
);

INSERT INTO evaluation_pricing VALUES
    (1, 'normal', 100, 14, 'Évaluation standard sous 2 semaines'),
    (2, 'priority', 300, 3, 'Évaluation prioritaire sous 3 jours')
ON CONFLICT (priority) DO UPDATE SET base_price = EXCLUDED.base_price;

-- ============================================================================
-- 3. POIDS DE VOTE COMMUNAUTAIRE
-- ============================================================================
-- Plus tu stakes = plus ton vote compte dans le consensus

-- Ajout du multiplicateur de vote basé sur les tokens
ALTER TABLE evaluation_votes ADD COLUMN IF NOT EXISTS token_weight_multiplier NUMERIC(4,2) DEFAULT 1.0;

-- Fonction: Calculer le poids de vote basé sur le staking
CREATE OR REPLACE FUNCTION calculate_vote_weight(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_staked NUMERIC;
    v_tier TEXT;
    v_base_weight NUMERIC := 1.0;
BEGIN
    SELECT staked_balance, staking_tier
    INTO v_staked, v_tier
    FROM user_token_balances
    WHERE user_id = p_user_id;

    IF NOT FOUND OR v_staked IS NULL THEN
        RETURN v_base_weight;
    END IF;

    -- Poids basé sur le tier
    RETURN CASE v_tier
        WHEN 'platinum' THEN 3.0
        WHEN 'gold' THEN 2.0
        WHEN 'silver' THEN 1.5
        WHEN 'bronze' THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. ACCÈS ANTICIPÉ AUX SCORES
-- ============================================================================
-- Stakers voient les nouvelles évaluations avant le public

CREATE TABLE IF NOT EXISTS early_access_scores (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),

    -- Nouveau score
    new_score_s INTEGER,
    new_score_a INTEGER,
    new_score_f INTEGER,
    new_score_e INTEGER,
    new_total INTEGER,

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    public_release_at TIMESTAMPTZ NOT NULL,  -- Quand le public peut voir

    -- Qui peut voir
    min_tier_required TEXT DEFAULT 'bronze'
);

-- Délais d'accès anticipé par tier
-- Platinum: voit immédiatement
-- Gold: 24h avant public
-- Silver: 12h avant public
-- Bronze: 6h avant public
-- Free: attend la release publique

CREATE OR REPLACE FUNCTION can_see_early_score(
    p_user_id UUID,
    p_score_id BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_score RECORD;
    v_user_tier TEXT;
    v_early_access_hours INTEGER;
    v_can_see_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_score FROM early_access_scores WHERE id = p_score_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;

    -- Score déjà public?
    IF NOW() >= v_score.public_release_at THEN RETURN TRUE; END IF;

    -- Get user tier
    SELECT COALESCE(staking_tier, 'none') INTO v_user_tier
    FROM user_token_balances WHERE user_id = p_user_id;

    -- Calculer heures d'accès anticipé
    v_early_access_hours := CASE v_user_tier
        WHEN 'platinum' THEN 168  -- 7 jours
        WHEN 'gold' THEN 72       -- 3 jours
        WHEN 'silver' THEN 24     -- 1 jour
        WHEN 'bronze' THEN 6      -- 6 heures
        ELSE 0
    END;

    v_can_see_at := v_score.public_release_at - (v_early_access_hours || ' hours')::INTERVAL;

    RETURN NOW() >= v_can_see_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. BADGES ET PERSONNALISATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    badge_code TEXT UNIQUE NOT NULL,
    badge_name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,

    -- Comment l'obtenir
    unlock_type TEXT NOT NULL,  -- 'purchase', 'achievement', 'staking', 'event'
    price_tokens INTEGER,  -- Si achetable
    required_tier TEXT,    -- Si nécessite staking

    -- Rareté
    max_supply INTEGER,  -- NULL = illimité
    current_holders INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO user_badges (badge_code, badge_name, description, unlock_type, price_tokens, required_tier) VALUES
    ('early_adopter', 'Early Adopter', 'Parmi les 1000 premiers utilisateurs', 'achievement', NULL, NULL),
    ('security_expert', 'Expert Sécurité', 'A voté correctement 100+ fois', 'achievement', NULL, NULL),
    ('challenger', 'Challenger', 'A contesté avec succès 10 évaluations IA', 'achievement', NULL, NULL),
    ('contributor', 'Contributeur', 'A soumis 5+ demandes d évaluation', 'achievement', NULL, NULL),

    ('bronze_staker', 'Bronze Staker', 'Stake Bronze actif', 'staking', NULL, 'bronze'),
    ('silver_staker', 'Silver Staker', 'Stake Silver actif', 'staking', NULL, 'silver'),
    ('gold_staker', 'Gold Staker', 'Stake Gold actif', 'staking', NULL, 'gold'),
    ('platinum_staker', 'Platinum Staker', 'Stake Platinum actif', 'staking', NULL, 'platinum'),

    ('custom_badge_1', 'Badge Personnalisé', 'Badge exclusif achetable', 'purchase', 500, NULL),
    ('verified_setup', 'Setup Vérifié', 'Setup avec score 90+', 'achievement', NULL, NULL)
ON CONFLICT (badge_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_badge_inventory (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    badge_code TEXT REFERENCES user_badges(badge_code),

    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    is_displayed BOOLEAN DEFAULT FALSE,  -- Badge affiché sur le profil

    UNIQUE(user_id, badge_code)
);

-- ============================================================================
-- 6. API ACCESS TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_tiers (
    id SERIAL PRIMARY KEY,
    tier_name TEXT UNIQUE NOT NULL,
    requests_per_day INTEGER NOT NULL,
    requests_per_month INTEGER NOT NULL,
    price_tokens_monthly INTEGER,  -- Coût mensuel en tokens
    features TEXT[]
);

INSERT INTO api_tiers VALUES
    (1, 'free', 100, 1000, 0, ARRAY['scores_basic', 'products_list']),
    (2, 'starter', 1000, 20000, 50, ARRAY['scores_basic', 'scores_detailed', 'products_list', 'products_detail']),
    (3, 'pro', 10000, 200000, 200, ARRAY['scores_basic', 'scores_detailed', 'products_list', 'products_detail', 'evaluations', 'history']),
    (4, 'enterprise', 100000, 2000000, 500, ARRAY['all'])
ON CONFLICT (tier_name) DO UPDATE SET
    requests_per_day = EXCLUDED.requests_per_day,
    price_tokens_monthly = EXCLUDED.price_tokens_monthly;

-- ============================================================================
-- 7. FONCTIONS UTILITAIRES
-- ============================================================================

-- Acheter du contenu premium
CREATE OR REPLACE FUNCTION purchase_content(
    p_user_id UUID,
    p_content_type TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_content RECORD;
    v_balance NUMERIC;
BEGIN
    -- Get content info
    SELECT * INTO v_content FROM premium_content
    WHERE content_type = p_content_type AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Content not found');
    END IF;

    -- Check balance
    SELECT available_balance INTO v_balance
    FROM user_token_balances WHERE user_id = p_user_id;

    IF v_balance IS NULL OR v_balance < v_content.price_tokens THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Insufficient balance',
            'required', v_content.price_tokens,
            'available', COALESCE(v_balance, 0)
        );
    END IF;

    -- Deduct tokens
    UPDATE user_token_balances
    SET available_balance = available_balance - v_content.price_tokens,
        lifetime_spent = lifetime_spent + v_content.price_tokens
    WHERE user_id = p_user_id;

    -- Record purchase
    INSERT INTO content_purchases (user_id, content_type, reference_id, tokens_spent)
    VALUES (p_user_id, p_content_type, p_reference_id, v_content.price_tokens);

    RETURN jsonb_build_object(
        'success', TRUE,
        'content', v_content.content_name,
        'tokens_spent', v_content.price_tokens
    );
END;
$$ LANGUAGE plpgsql;

-- Demander une évaluation
CREATE OR REPLACE FUNCTION request_evaluation(
    p_user_id UUID,
    p_product_name TEXT,
    p_product_url TEXT,
    p_product_type TEXT,
    p_why TEXT,
    p_priority TEXT DEFAULT 'normal'
)
RETURNS JSONB AS $$
DECLARE
    v_price INTEGER;
    v_balance NUMERIC;
    v_request_id BIGINT;
BEGIN
    -- Get price
    SELECT base_price INTO v_price FROM evaluation_pricing WHERE priority = p_priority;
    IF NOT FOUND THEN v_price := 100; END IF;

    -- Check balance
    SELECT available_balance INTO v_balance
    FROM user_token_balances WHERE user_id = p_user_id;

    IF v_balance IS NULL OR v_balance < v_price THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Insufficient balance',
            'required', v_price
        );
    END IF;

    -- Deduct tokens
    UPDATE user_token_balances
    SET available_balance = available_balance - v_price,
        lifetime_spent = lifetime_spent + v_price
    WHERE user_id = p_user_id;

    -- Create request
    INSERT INTO evaluation_requests (
        requester_id, product_name, product_url, product_type,
        why_evaluate, tokens_paid, priority
    ) VALUES (
        p_user_id, p_product_name, p_product_url, p_product_type,
        p_why, v_price, p_priority
    )
    RETURNING id INTO v_request_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'request_id', v_request_id,
        'tokens_paid', v_price,
        'priority', p_priority
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW token_utility_stats AS
SELECT
    (SELECT COUNT(*) FROM content_purchases WHERE purchased_at > NOW() - INTERVAL '30 days') as content_purchases_30d,
    (SELECT SUM(tokens_spent) FROM content_purchases WHERE purchased_at > NOW() - INTERVAL '30 days') as tokens_spent_content_30d,
    (SELECT COUNT(*) FROM evaluation_requests WHERE status = 'pending') as pending_evaluations,
    (SELECT COUNT(*) FROM user_badge_inventory) as total_badges_owned,
    (SELECT COUNT(DISTINCT user_id) FROM user_token_balances WHERE staking_tier IS NOT NULL) as active_stakers;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT SELECT ON premium_content TO authenticated, anon;
GRANT SELECT ON evaluation_pricing TO authenticated, anon;
GRANT SELECT ON user_badges TO authenticated, anon;
GRANT SELECT ON api_tiers TO authenticated, anon;
GRANT EXECUTE ON FUNCTION purchase_content TO authenticated;
GRANT EXECUTE ON FUNCTION request_evaluation TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_vote_weight TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 212 - Token Utilities Realistes';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'UTILITES IMPLEMENTEES:';
    RAISE NOTICE '';
    RAISE NOTICE '1. CONTENU PREMIUM';
    RAISE NOTICE '   - Analyse detaillee: 20 tokens';
    RAISE NOTICE '   - Rapport risques: 15 tokens';
    RAISE NOTICE '   - PDF export: 15-20 tokens';
    RAISE NOTICE '';
    RAISE NOTICE '2. DEMANDES EVALUATION';
    RAISE NOTICE '   - Normal (2 sem): 100 tokens';
    RAISE NOTICE '   - Priority (3j): 300 tokens';
    RAISE NOTICE '';
    RAISE NOTICE '3. POIDS DE VOTE';
    RAISE NOTICE '   - Platinum: x3';
    RAISE NOTICE '   - Gold: x2';
    RAISE NOTICE '   - Silver: x1.5';
    RAISE NOTICE '   - Bronze: x1.2';
    RAISE NOTICE '';
    RAISE NOTICE '4. ACCES ANTICIPE';
    RAISE NOTICE '   - Platinum: 7 jours avant';
    RAISE NOTICE '   - Gold: 3 jours avant';
    RAISE NOTICE '   - Silver: 1 jour avant';
    RAISE NOTICE '';
    RAISE NOTICE '5. BADGES & API';
    RAISE NOTICE '   - Badges de staking';
    RAISE NOTICE '   - API tiers (50-500 tokens/mois)';
    RAISE NOTICE '===========================================';
END $$;
