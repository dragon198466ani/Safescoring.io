-- ============================================================================
-- MIGRATION 212: Revolutionary $SAFE Token Utility
-- SafeScoring - 2026-02-03
-- ============================================================================
--
-- IDEES NON-CONVENTIONNELLES pour rendre le token INDISPENSABLE:
--
-- 1. ASSURANCE COMMUNAUTAIRE - Si ton setup se fait hacker, tu es rembourse
-- 2. SCORE ORACLE ON-CHAIN - DeFi protocols utilisent nos scores
-- 3. ALERTES PRIORITAIRES - Stakers savent avant tout le monde
-- 4. COPY-SETUP - Copie les meilleurs setups contre $SAFE
-- 5. BOUNTY NETWORK - Paye pour trouver des failles
-- 6. PREDICTION MARKETS - Parie sur l'evolution des scores
--
-- ============================================================================

-- ============================================================================
-- 1. COMMUNITY INSURANCE FUND
-- ============================================================================
-- Si tu stakes et que ton setup se fait hacker → remboursement
-- Plus tu stakes → plus de couverture

CREATE TABLE IF NOT EXISTS insurance_fund (
    id SERIAL PRIMARY KEY,
    total_pool NUMERIC(20,8) DEFAULT 0,  -- Total $SAFE dans le fond
    total_claims_paid NUMERIC(20,8) DEFAULT 0,
    active_policies INTEGER DEFAULT 0,
    total_coverage NUMERIC(20,8) DEFAULT 0,  -- Couverture totale promise
    reserve_ratio NUMERIC(5,4) DEFAULT 0.20,  -- 20% reserve minimum
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO insurance_fund (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS insurance_policies (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    setup_id BIGINT,  -- Setup couvert

    -- Couverture
    stake_amount NUMERIC(20,8) NOT NULL,  -- $SAFE stake
    coverage_amount NUMERIC(20,8) NOT NULL,  -- Montant couvert (stake x multiplier)
    coverage_multiplier NUMERIC(4,2) DEFAULT 5.0,  -- 5x par defaut

    -- Conditions
    min_setup_score INTEGER DEFAULT 60,  -- Setup doit avoir 60+ pour etre couvert
    setup_score_at_creation INTEGER,
    products_covered TEXT[],  -- Slugs des produits couverts

    -- Statut
    status TEXT DEFAULT 'active',  -- active, expired, claimed, cancelled
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- NULL = permanent tant que stake

    -- Si claim
    claim_date TIMESTAMPTZ,
    claim_amount NUMERIC(20,8),
    claim_evidence TEXT,
    claim_status TEXT,  -- pending, approved, rejected

    CONSTRAINT valid_coverage CHECK (coverage_amount <= stake_amount * 10)
);

-- Fonction: Calculer la couverture basee sur le stake
CREATE OR REPLACE FUNCTION calculate_insurance_coverage(
    p_stake_amount NUMERIC,
    p_setup_score INTEGER,
    p_staking_tier TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_base_multiplier NUMERIC := 5.0;
    v_score_bonus NUMERIC;
    v_tier_bonus NUMERIC;
BEGIN
    -- Bonus basé sur le score du setup (60-100 → 1x-2x)
    v_score_bonus := 1 + ((p_setup_score - 60) / 40.0);

    -- Bonus basé sur le tier de staking
    v_tier_bonus := CASE p_staking_tier
        WHEN 'platinum' THEN 1.5
        WHEN 'gold' THEN 1.3
        WHEN 'silver' THEN 1.2
        WHEN 'bronze' THEN 1.1
        ELSE 1.0
    END;

    RETURN p_stake_amount * v_base_multiplier * v_score_bonus * v_tier_bonus;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. PRIORITY ALERTS SYSTEM
-- ============================================================================
-- Stakers recoivent les alertes AVANT le public (time = money)

CREATE TABLE IF NOT EXISTS alert_priority_queue (
    id BIGSERIAL PRIMARY KEY,
    alert_type TEXT NOT NULL,  -- 'hack', 'vulnerability', 'score_drop', 'incident'

    -- Contenu
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,  -- 'critical', 'high', 'medium', 'low'
    affected_products TEXT[],

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    public_release_at TIMESTAMPTZ,  -- Quand le public peut voir

    -- Stats
    stakers_notified INTEGER DEFAULT 0,
    public_views INTEGER DEFAULT 0
);

-- Delais d'acces selon le tier
CREATE TABLE IF NOT EXISTS alert_access_delays (
    staking_tier TEXT PRIMARY KEY,
    critical_delay_minutes INTEGER,  -- Delai avant public
    high_delay_minutes INTEGER,
    medium_delay_minutes INTEGER,
    low_delay_minutes INTEGER
);

INSERT INTO alert_access_delays VALUES
    ('platinum', 0, 5, 15, 30),     -- Platinum: instantane pour critical
    ('gold', 5, 15, 30, 60),        -- Gold: 5min de delai sur critical
    ('silver', 15, 30, 60, 120),    -- Silver: 15min
    ('bronze', 30, 60, 120, 240),   -- Bronze: 30min
    ('none', 60, 120, 240, 480)     -- Non-stakers: 1h minimum
ON CONFLICT (staking_tier) DO UPDATE SET
    critical_delay_minutes = EXCLUDED.critical_delay_minutes;

-- Fonction: Verifier si user peut voir l'alerte
CREATE OR REPLACE FUNCTION can_see_alert(
    p_user_id UUID,
    p_alert_id BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_alert RECORD;
    v_user_tier TEXT;
    v_delay INTEGER;
    v_can_see_at TIMESTAMPTZ;
BEGIN
    -- Get alert
    SELECT * INTO v_alert FROM alert_priority_queue WHERE id = p_alert_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;

    -- Get user tier
    SELECT COALESCE(staking_tier, 'none') INTO v_user_tier
    FROM user_token_balances WHERE user_id = p_user_id;

    IF v_user_tier IS NULL THEN v_user_tier := 'none'; END IF;

    -- Get delay for this tier and severity
    SELECT CASE v_alert.severity
        WHEN 'critical' THEN critical_delay_minutes
        WHEN 'high' THEN high_delay_minutes
        WHEN 'medium' THEN medium_delay_minutes
        ELSE low_delay_minutes
    END INTO v_delay
    FROM alert_access_delays WHERE staking_tier = v_user_tier;

    v_can_see_at := v_alert.created_at + (v_delay || ' minutes')::INTERVAL;

    RETURN NOW() >= v_can_see_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. COPY-SETUP MARKETPLACE
-- ============================================================================
-- Les meilleurs setups peuvent etre copies contre $SAFE
-- Createurs gagnent des royalties

CREATE TABLE IF NOT EXISTS setup_templates (
    id BIGSERIAL PRIMARY KEY,
    creator_id UUID REFERENCES auth.users(id),
    setup_id BIGINT,  -- Setup original

    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    target_audience TEXT,  -- 'beginner', 'intermediate', 'advanced', 'institution'
    use_case TEXT,  -- 'hodl', 'trading', 'defi', 'privacy', 'institutional'

    -- Contenu
    products JSONB NOT NULL,  -- Liste des produits avec roles
    combined_score INTEGER,
    pillar_scores JSONB,

    -- Pricing
    price_tokens NUMERIC(20,8) DEFAULT 10,
    creator_royalty_pct NUMERIC(4,2) DEFAULT 0.70,  -- 70% au createur
    platform_fee_pct NUMERIC(4,2) DEFAULT 0.20,    -- 20% plateforme
    burn_pct NUMERIC(4,2) DEFAULT 0.10,            -- 10% burned

    -- Stats
    times_copied INTEGER DEFAULT 0,
    total_earned NUMERIC(20,8) DEFAULT 0,
    avg_rating NUMERIC(3,2),
    review_count INTEGER DEFAULT 0,

    -- Statut
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS setup_purchases (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT REFERENCES setup_templates(id),
    buyer_id UUID REFERENCES auth.users(id),

    -- Transaction
    price_paid NUMERIC(20,8),
    to_creator NUMERIC(20,8),
    to_platform NUMERIC(20,8),
    burned NUMERIC(20,8),

    -- Result
    new_setup_id BIGINT,  -- Setup cree pour l'acheteur

    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction: Acheter un template de setup
CREATE OR REPLACE FUNCTION purchase_setup_template(
    p_buyer_id UUID,
    p_template_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
    v_template RECORD;
    v_balance RECORD;
    v_to_creator NUMERIC;
    v_to_platform NUMERIC;
    v_to_burn NUMERIC;
BEGIN
    -- Get template
    SELECT * INTO v_template FROM setup_templates WHERE id = p_template_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Template not found');
    END IF;

    -- Check balance
    SELECT * INTO v_balance FROM user_token_balances WHERE user_id = p_buyer_id;
    IF NOT FOUND OR v_balance.available_balance < v_template.price_tokens THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Insufficient balance');
    END IF;

    -- Calculate splits
    v_to_creator := v_template.price_tokens * v_template.creator_royalty_pct;
    v_to_platform := v_template.price_tokens * v_template.platform_fee_pct;
    v_to_burn := v_template.price_tokens * v_template.burn_pct;

    -- Deduct from buyer
    UPDATE user_token_balances
    SET available_balance = available_balance - v_template.price_tokens,
        lifetime_spent = lifetime_spent + v_template.price_tokens
    WHERE user_id = p_buyer_id;

    -- Pay creator
    UPDATE user_token_balances
    SET available_balance = available_balance + v_to_creator,
        lifetime_earned = lifetime_earned + v_to_creator
    WHERE user_id = v_template.creator_id;

    -- Burn tokens
    UPDATE token_supply
    SET burned_supply = burned_supply + v_to_burn,
        circulating_supply = circulating_supply - v_to_burn
    WHERE id = 1;

    -- Record purchase
    INSERT INTO setup_purchases (
        template_id, buyer_id, price_paid,
        to_creator, to_platform, burned
    ) VALUES (
        p_template_id, p_buyer_id, v_template.price_tokens,
        v_to_creator, v_to_platform, v_to_burn
    );

    -- Update template stats
    UPDATE setup_templates
    SET times_copied = times_copied + 1,
        total_earned = total_earned + v_to_creator
    WHERE id = p_template_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'template', v_template.name,
        'price_paid', v_template.price_tokens,
        'products', v_template.products
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. SECURITY BOUNTY NETWORK
-- ============================================================================
-- Users paient $SAFE pour mettre des bounties sur leurs produits preferes
-- Researchers gagnent en trouvant des failles

CREATE TABLE IF NOT EXISTS security_bounties (
    id BIGSERIAL PRIMARY KEY,
    creator_id UUID REFERENCES auth.users(id),

    -- Target
    product_id INTEGER REFERENCES products(id),
    target_type TEXT NOT NULL,  -- 'vulnerability', 'documentation', 'verification'

    -- Bounty details
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT[],

    -- Reward
    reward_tokens NUMERIC(20,8) NOT NULL,
    bonus_for_critical NUMERIC(20,8) DEFAULT 0,  -- Bonus si faille critique

    -- Status
    status TEXT DEFAULT 'open',  -- open, claimed, completed, expired, cancelled
    deadline TIMESTAMPTZ,

    -- Winner
    winner_id UUID REFERENCES auth.users(id),
    submission_url TEXT,
    completion_date TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bounty_submissions (
    id BIGSERIAL PRIMARY KEY,
    bounty_id BIGINT REFERENCES security_bounties(id),
    submitter_id UUID REFERENCES auth.users(id),

    -- Submission
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    severity TEXT,  -- 'critical', 'high', 'medium', 'low', 'info'

    -- Review
    status TEXT DEFAULT 'pending',  -- pending, approved, rejected
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,

    -- Reward
    reward_earned NUMERIC(20,8),

    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. SCORE PREDICTION MARKET
-- ============================================================================
-- Parie sur l'evolution des scores avec $SAFE

CREATE TABLE IF NOT EXISTS score_predictions (
    id BIGSERIAL PRIMARY KEY,
    creator_id UUID REFERENCES auth.users(id),

    -- Prediction target
    product_id INTEGER REFERENCES products(id),
    pillar VARCHAR(1),  -- NULL = overall score

    -- Prediction
    prediction_type TEXT NOT NULL,  -- 'above', 'below', 'change'
    target_score INTEGER,  -- Score cible
    target_change INTEGER,  -- Ou changement cible (+/- X points)

    -- Timing
    resolution_date TIMESTAMPTZ NOT NULL,  -- Quand on verifie

    -- Pool
    total_pool NUMERIC(20,8) DEFAULT 0,
    yes_pool NUMERIC(20,8) DEFAULT 0,
    no_pool NUMERIC(20,8) DEFAULT 0,

    -- Resolution
    status TEXT DEFAULT 'open',  -- open, closed, resolved
    actual_score INTEGER,
    winning_side TEXT,  -- 'yes', 'no', 'push'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prediction_bets (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT REFERENCES score_predictions(id),
    bettor_id UUID REFERENCES auth.users(id),

    side TEXT NOT NULL,  -- 'yes', 'no'
    amount NUMERIC(20,8) NOT NULL,

    -- Payout
    potential_payout NUMERIC(20,8),
    actual_payout NUMERIC(20,8),
    claimed BOOLEAN DEFAULT FALSE,

    placed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. SCORE ORACLE (Pour DeFi on-chain)
-- ============================================================================
-- Publie les scores on-chain pour que d'autres protocoles les utilisent

CREATE TABLE IF NOT EXISTS oracle_publications (
    id BIGSERIAL PRIMARY KEY,

    -- Score data
    product_id INTEGER REFERENCES products(id),
    product_slug TEXT,
    score_type TEXT,  -- 'full', 'consumer', 'essential'

    -- Scores
    total_score INTEGER,
    score_s INTEGER,
    score_a INTEGER,
    score_f INTEGER,
    score_e INTEGER,

    -- On-chain
    chain TEXT,  -- 'ethereum', 'polygon', 'arbitrum', 'base'
    contract_address TEXT,
    tx_hash TEXT,
    block_number BIGINT,

    -- Governance
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    approved BOOLEAN DEFAULT FALSE,

    -- Cost (payé par la communauté)
    publication_cost_tokens NUMERIC(20,8),
    gas_cost_usd NUMERIC(10,2),

    published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Qui peut voter sur les publications oracle
CREATE TABLE IF NOT EXISTS oracle_votes (
    id BIGSERIAL PRIMARY KEY,
    publication_id BIGINT REFERENCES oracle_publications(id),
    voter_id UUID REFERENCES auth.users(id),

    vote TEXT NOT NULL,  -- 'for', 'against'
    vote_weight NUMERIC(20,8),  -- Basé sur staked tokens
    reason TEXT,

    voted_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(publication_id, voter_id)
);

-- ============================================================================
-- 7. SETUP SCORE GUARANTEE
-- ============================================================================
-- Si ton setup a 80+ et tu te fais quand meme hacker → remboursement garanti

CREATE TABLE IF NOT EXISTS score_guarantees (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    setup_id BIGINT,

    -- Guarantee terms
    min_score_required INTEGER DEFAULT 80,
    setup_score_at_activation INTEGER,
    guaranteed_amount NUMERIC(20,8),  -- Montant garanti en $SAFE

    -- Stake required
    stake_amount NUMERIC(20,8),
    stake_locked_until TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'active',
    activated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Claim
    claim_date TIMESTAMPTZ,
    claim_reason TEXT,
    claim_evidence TEXT[],
    claim_approved BOOLEAN,
    claim_payout NUMERIC(20,8)
);

-- ============================================================================
-- 8. REFERRAL BOOST TOKENS
-- ============================================================================
-- Paye des $SAFE pour booster tes referrals

CREATE TABLE IF NOT EXISTS referral_boosts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),

    -- Boost config
    boost_amount NUMERIC(20,8),  -- $SAFE payés
    bonus_pct NUMERIC(4,2),  -- % bonus pour les referrés
    max_referrals INTEGER,  -- Nombre max de referrals boostés

    -- Usage
    referrals_used INTEGER DEFAULT 0,
    total_bonus_paid NUMERIC(20,8) DEFAULT 0,

    -- Status
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================================
-- VIEWS: Marketplace Stats
-- ============================================================================

CREATE OR REPLACE VIEW setup_marketplace_stats AS
SELECT
    COUNT(*) as total_templates,
    COUNT(*) FILTER (WHERE is_featured) as featured_templates,
    SUM(times_copied) as total_copies,
    SUM(total_earned) as total_creator_earnings,
    AVG(price_tokens) as avg_price,
    MAX(times_copied) as most_popular_copies
FROM setup_templates
WHERE is_public = TRUE;

CREATE OR REPLACE VIEW bounty_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'open') as open_bounties,
    SUM(reward_tokens) FILTER (WHERE status = 'open') as total_open_rewards,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_bounties,
    SUM(reward_tokens) FILTER (WHERE status = 'completed') as total_paid_out
FROM security_bounties;

CREATE OR REPLACE VIEW prediction_market_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'open') as active_predictions,
    SUM(total_pool) FILTER (WHERE status = 'open') as total_locked,
    COUNT(DISTINCT product_id) as products_with_predictions
FROM score_predictions;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT SELECT ON setup_marketplace_stats TO authenticated, anon;
GRANT SELECT ON bounty_stats TO authenticated, anon;
GRANT SELECT ON prediction_market_stats TO authenticated, anon;
GRANT SELECT ON setup_templates TO authenticated, anon;
GRANT SELECT ON security_bounties TO authenticated, anon;
GRANT SELECT ON score_predictions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION purchase_setup_template TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_insurance_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION can_see_alert TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 212 - Revolutionary $SAFE Utilities';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NOUVELLES UTILITES:';
    RAISE NOTICE '';
    RAISE NOTICE '1. ASSURANCE COMMUNAUTAIRE';
    RAISE NOTICE '   Stake $SAFE → Couverture si hack';
    RAISE NOTICE '   Plus tu stakes + score eleve = plus de couverture';
    RAISE NOTICE '';
    RAISE NOTICE '2. ALERTES PRIORITAIRES';
    RAISE NOTICE '   Platinum: alertes critiques instantanees';
    RAISE NOTICE '   Public: 1h de delai minimum';
    RAISE NOTICE '';
    RAISE NOTICE '3. COPY-SETUP MARKETPLACE';
    RAISE NOTICE '   Vends tes setups → 70%% royalties';
    RAISE NOTICE '   Achete les meilleurs setups';
    RAISE NOTICE '';
    RAISE NOTICE '4. BOUNTY NETWORK';
    RAISE NOTICE '   Mets des bounties sur tes produits preferes';
    RAISE NOTICE '   Gagne en trouvant des failles';
    RAISE NOTICE '';
    RAISE NOTICE '5. PREDICTION MARKET';
    RAISE NOTICE '   Parie sur evolution des scores';
    RAISE NOTICE '   "Ledger aura 85+ dans 6 mois?"';
    RAISE NOTICE '';
    RAISE NOTICE '6. SCORE ORACLE ON-CHAIN';
    RAISE NOTICE '   Publie scores pour DeFi protocols';
    RAISE NOTICE '   Gouvernance communautaire';
    RAISE NOTICE '';
    RAISE NOTICE '7. SCORE GUARANTEE';
    RAISE NOTICE '   Setup 80+ et hack = remboursement garanti';
    RAISE NOTICE '===========================================';
END $$;
