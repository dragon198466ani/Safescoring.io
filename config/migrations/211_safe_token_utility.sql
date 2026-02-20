-- ============================================================================
-- MIGRATION 211: $SAFE Token Utility System
-- SafeScoring - 2026-02-03
-- ============================================================================
-- Makes $SAFE token USEFUL and DESIRABLE:
--
-- 1. UTILITY (What can you DO with it?)
--    - Unlock premium features
--    - Request product evaluations
--    - Boost vote weight
--    - Access exclusive data
--
-- 2. SCARCITY (Why is it valuable?)
--    - Fixed supply with burn mechanisms
--    - Staking locks tokens
--    - Fees burned
--
-- 3. DEMAND DRIVERS (Why would you BUY it?)
--    - Companies need it for certification
--    - Users need it for premium access
--    - Governance voting requires staking
--
-- 4. REWARDS (Why would you EARN it?)
--    - Quality voting rewards
--    - Community contributions
--    - Bug bounties
-- ============================================================================

-- ============================================================================
-- 1. TOKEN SUPPLY & TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_supply (
    id SERIAL PRIMARY KEY,
    total_supply NUMERIC(20,8) DEFAULT 100000000,  -- 100M fixed supply
    circulating_supply NUMERIC(20,8) DEFAULT 0,
    burned_supply NUMERIC(20,8) DEFAULT 0,
    staked_supply NUMERIC(20,8) DEFAULT 0,
    treasury_reserve NUMERIC(20,8) DEFAULT 30000000,  -- 30M for team/development
    community_pool NUMERIC(20,8) DEFAULT 40000000,   -- 40M for rewards
    liquidity_pool NUMERIC(20,8) DEFAULT 30000000,   -- 30M for liquidity
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize supply
INSERT INTO token_supply (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. USER TOKEN BALANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_token_balances (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    voter_hash TEXT,  -- For anonymous users

    -- Balances
    available_balance NUMERIC(20,8) DEFAULT 0,
    staked_balance NUMERIC(20,8) DEFAULT 0,
    pending_rewards NUMERIC(20,8) DEFAULT 0,
    lifetime_earned NUMERIC(20,8) DEFAULT 0,
    lifetime_spent NUMERIC(20,8) DEFAULT 0,
    lifetime_burned NUMERIC(20,8) DEFAULT 0,

    -- Staking info
    staking_tier TEXT DEFAULT 'none',  -- none, bronze, silver, gold, platinum
    staking_started_at TIMESTAMPTZ,
    staking_unlock_at TIMESTAMPTZ,

    -- Stats
    vote_multiplier NUMERIC(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id),
    UNIQUE(voter_hash)
);

CREATE INDEX IF NOT EXISTS idx_user_token_balances_user ON user_token_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_token_balances_staking ON user_token_balances(staking_tier);

-- ============================================================================
-- 3. STAKING TIERS - Lock tokens for benefits
-- ============================================================================

CREATE TABLE IF NOT EXISTS staking_tiers (
    id SERIAL PRIMARY KEY,
    tier_name TEXT UNIQUE NOT NULL,
    min_stake NUMERIC(20,8) NOT NULL,
    lock_days INTEGER NOT NULL,

    -- Benefits
    vote_weight_multiplier NUMERIC(3,2) DEFAULT 1.0,
    api_rate_limit_multiplier NUMERIC(3,2) DEFAULT 1.0,
    evaluation_request_discount NUMERIC(3,2) DEFAULT 0,
    early_access_days INTEGER DEFAULT 0,
    exclusive_reports BOOLEAN DEFAULT FALSE,
    governance_voting BOOLEAN DEFAULT FALSE,
    custom_badge BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,

    -- Rewards
    staking_apy NUMERIC(5,2) DEFAULT 0,  -- Annual percentage yield

    display_order INTEGER DEFAULT 0
);

-- Insert default tiers
INSERT INTO staking_tiers (tier_name, min_stake, lock_days, vote_weight_multiplier, api_rate_limit_multiplier, evaluation_request_discount, early_access_days, exclusive_reports, governance_voting, custom_badge, priority_support, staking_apy, display_order)
VALUES
    ('bronze', 100, 30, 1.2, 1.5, 0.10, 0, FALSE, FALSE, FALSE, FALSE, 5.0, 1),
    ('silver', 500, 90, 1.5, 2.0, 0.20, 3, TRUE, FALSE, FALSE, FALSE, 8.0, 2),
    ('gold', 2000, 180, 2.0, 3.0, 0.30, 7, TRUE, TRUE, TRUE, FALSE, 12.0, 3),
    ('platinum', 10000, 365, 3.0, 5.0, 0.50, 14, TRUE, TRUE, TRUE, TRUE, 18.0, 4)
ON CONFLICT (tier_name) DO UPDATE SET
    min_stake = EXCLUDED.min_stake,
    lock_days = EXCLUDED.lock_days,
    vote_weight_multiplier = EXCLUDED.vote_weight_multiplier,
    staking_apy = EXCLUDED.staking_apy;

-- ============================================================================
-- 4. TOKEN USE CASES - What can you BUY with $SAFE?
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_products (
    id SERIAL PRIMARY KEY,
    product_code TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,  -- 'feature', 'service', 'access', 'governance'

    -- Pricing
    price_tokens NUMERIC(20,8) NOT NULL,
    price_usd NUMERIC(10,2),  -- Alternative USD price (if any)

    -- Burn rate (% of tokens burned vs. going to treasury)
    burn_rate NUMERIC(3,2) DEFAULT 0.20,  -- 20% burned by default

    -- Limits
    max_per_user INTEGER,  -- NULL = unlimited
    max_total INTEGER,     -- NULL = unlimited
    current_sold INTEGER DEFAULT 0,

    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    requires_staking_tier TEXT,  -- NULL = anyone can buy

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert token products
INSERT INTO token_products (product_code, product_name, description, category, price_tokens, burn_rate, requires_staking_tier)
VALUES
    -- ACCESS FEATURES
    ('PREMIUM_MONTH', 'Premium Access (1 month)', 'Unlock all premium features for 30 days', 'access', 50, 0.10, NULL),
    ('PREMIUM_YEAR', 'Premium Access (1 year)', 'Unlock all premium features for 365 days', 'access', 400, 0.10, NULL),
    ('API_10K', 'API Credits (10,000 calls)', 'Additional API calls for integrations', 'access', 100, 0.15, NULL),
    ('API_100K', 'API Credits (100,000 calls)', 'Bulk API calls package', 'access', 800, 0.15, 'bronze'),

    -- SERVICES
    ('EVAL_REQUEST', 'Request Product Evaluation', 'Request evaluation of a new crypto product', 'service', 200, 0.25, NULL),
    ('EVAL_PRIORITY', 'Priority Evaluation', 'Get your product evaluated within 48h', 'service', 500, 0.30, 'silver'),
    ('CUSTOM_REPORT', 'Custom Security Report', 'Detailed PDF report for your portfolio', 'service', 150, 0.20, 'bronze'),
    ('AUDIT_REVIEW', 'Community Audit Review', 'Get community to review your setup', 'service', 100, 0.20, NULL),

    -- GOVERNANCE
    ('GOV_PROPOSAL', 'Governance Proposal', 'Submit a proposal for community vote', 'governance', 1000, 0.50, 'gold'),
    ('GOV_VOTE_BOOST', 'Governance Vote Boost', 'Double your voting power for one vote', 'governance', 50, 0.30, 'silver'),

    -- FEATURES
    ('CUSTOM_BADGE', 'Custom Profile Badge', 'Unique badge on your profile', 'feature', 500, 0.40, 'silver'),
    ('EARLY_ACCESS', 'Early Access Pass', 'See new features 7 days early', 'feature', 200, 0.20, NULL),
    ('AD_FREE', 'Ad-Free Experience (lifetime)', 'Remove all promotional content', 'feature', 1000, 0.30, NULL),

    -- COMPANY/B2B
    ('CERT_BADGE', 'Certification Badge', 'Display "SafeScoring Certified" badge', 'service', 5000, 0.20, NULL),
    ('WHITEPAPER_REVIEW', 'Whitepaper Security Review', 'Professional review of your whitepaper', 'service', 2000, 0.25, NULL)
ON CONFLICT (product_code) DO UPDATE SET
    price_tokens = EXCLUDED.price_tokens,
    burn_rate = EXCLUDED.burn_rate;

-- ============================================================================
-- 5. PURCHASE TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    voter_hash TEXT,

    -- Transaction details
    tx_type TEXT NOT NULL,  -- 'earn', 'spend', 'stake', 'unstake', 'burn', 'transfer', 'buy'
    amount NUMERIC(20,8) NOT NULL,
    balance_before NUMERIC(20,8),
    balance_after NUMERIC(20,8),

    -- Context
    product_code TEXT REFERENCES token_products(product_code),
    reference_type TEXT,  -- 'vote', 'evaluation', 'purchase', 'staking', 'reward'
    reference_id TEXT,    -- ID of related entity

    -- Burn tracking
    amount_burned NUMERIC(20,8) DEFAULT 0,
    amount_to_treasury NUMERIC(20,8) DEFAULT 0,

    -- Metadata
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_date ON token_transactions(created_at DESC);

-- ============================================================================
-- 6. GOVERNANCE PROPOSALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_proposals (
    id BIGSERIAL PRIMARY KEY,
    proposer_id UUID REFERENCES auth.users(id),

    -- Proposal content
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    proposal_type TEXT NOT NULL,  -- 'feature', 'parameter', 'treasury', 'norm', 'other'

    -- Voting
    vote_start_at TIMESTAMPTZ NOT NULL,
    vote_end_at TIMESTAMPTZ NOT NULL,
    quorum_required NUMERIC(20,8) DEFAULT 100000,  -- Min tokens to vote for validity
    votes_for NUMERIC(20,8) DEFAULT 0,
    votes_against NUMERIC(20,8) DEFAULT 0,
    votes_abstain NUMERIC(20,8) DEFAULT 0,
    unique_voters INTEGER DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'pending',  -- 'pending', 'active', 'passed', 'rejected', 'executed'
    executed_at TIMESTAMPTZ,
    execution_tx TEXT,

    -- Tokens
    tokens_spent NUMERIC(20,8),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_votes (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT REFERENCES governance_proposals(id),
    voter_id UUID REFERENCES auth.users(id),

    vote TEXT NOT NULL,  -- 'for', 'against', 'abstain'
    vote_weight NUMERIC(20,8) NOT NULL,  -- Based on staked tokens
    staking_tier TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(proposal_id, voter_id)
);

-- ============================================================================
-- 7. EVALUATION REQUEST QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS evaluation_requests (
    id BIGSERIAL PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id),

    -- Product to evaluate
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    product_type TEXT,
    product_description TEXT,

    -- Request details
    priority TEXT DEFAULT 'normal',  -- 'normal', 'priority', 'urgent'
    tokens_paid NUMERIC(20,8) NOT NULL,

    -- Status
    status TEXT DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'rejected'
    assigned_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    result_product_id INTEGER REFERENCES products(id),

    -- Refund if rejected
    refund_amount NUMERIC(20,8),
    refund_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. FUNCTIONS: Token Operations
-- ============================================================================

-- Function to purchase a product with tokens
CREATE OR REPLACE FUNCTION purchase_with_tokens(
    p_user_id UUID,
    p_product_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_product RECORD;
    v_balance RECORD;
    v_burn_amount NUMERIC(20,8);
    v_treasury_amount NUMERIC(20,8);
BEGIN
    -- Get product
    SELECT * INTO v_product
    FROM token_products
    WHERE product_code = p_product_code AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Product not found');
    END IF;

    -- Get user balance
    SELECT * INTO v_balance
    FROM user_token_balances
    WHERE user_id = p_user_id;

    IF NOT FOUND OR v_balance.available_balance < v_product.price_tokens THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Insufficient balance',
            'required', v_product.price_tokens,
            'available', COALESCE(v_balance.available_balance, 0)
        );
    END IF;

    -- Check staking requirement
    IF v_product.requires_staking_tier IS NOT NULL THEN
        IF v_balance.staking_tier IS NULL OR
           v_balance.staking_tier NOT IN (v_product.requires_staking_tier, 'gold', 'platinum') THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'Requires staking tier: ' || v_product.requires_staking_tier
            );
        END IF;
    END IF;

    -- Calculate burn and treasury amounts
    v_burn_amount := v_product.price_tokens * v_product.burn_rate;
    v_treasury_amount := v_product.price_tokens - v_burn_amount;

    -- Deduct from user balance
    UPDATE user_token_balances
    SET available_balance = available_balance - v_product.price_tokens,
        lifetime_spent = lifetime_spent + v_product.price_tokens,
        lifetime_burned = lifetime_burned + v_burn_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Update token supply (burn)
    UPDATE token_supply
    SET burned_supply = burned_supply + v_burn_amount,
        circulating_supply = circulating_supply - v_burn_amount,
        treasury_reserve = treasury_reserve + v_treasury_amount,
        last_updated = NOW()
    WHERE id = 1;

    -- Record transaction
    INSERT INTO token_transactions (
        user_id, tx_type, amount, product_code,
        amount_burned, amount_to_treasury, description
    ) VALUES (
        p_user_id, 'spend', v_product.price_tokens, p_product_code,
        v_burn_amount, v_treasury_amount,
        'Purchase: ' || v_product.product_name
    );

    -- Update product sold count
    UPDATE token_products
    SET current_sold = current_sold + 1
    WHERE product_code = p_product_code;

    RETURN jsonb_build_object(
        'success', TRUE,
        'product', v_product.product_name,
        'amount_spent', v_product.price_tokens,
        'amount_burned', v_burn_amount,
        'new_balance', v_balance.available_balance - v_product.price_tokens
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to stake tokens
CREATE OR REPLACE FUNCTION stake_tokens(
    p_user_id UUID,
    p_amount NUMERIC(20,8),
    p_tier TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_tier RECORD;
    v_balance RECORD;
    v_unlock_date TIMESTAMPTZ;
BEGIN
    -- Get tier requirements
    SELECT * INTO v_tier
    FROM staking_tiers
    WHERE tier_name = p_tier;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid tier');
    END IF;

    -- Check minimum stake
    IF p_amount < v_tier.min_stake THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Minimum stake for ' || p_tier || ' is ' || v_tier.min_stake
        );
    END IF;

    -- Get user balance
    SELECT * INTO v_balance
    FROM user_token_balances
    WHERE user_id = p_user_id;

    IF NOT FOUND OR v_balance.available_balance < p_amount THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Insufficient balance');
    END IF;

    -- Calculate unlock date
    v_unlock_date := NOW() + (v_tier.lock_days || ' days')::INTERVAL;

    -- Move tokens to staked
    UPDATE user_token_balances
    SET available_balance = available_balance - p_amount,
        staked_balance = staked_balance + p_amount,
        staking_tier = p_tier,
        staking_started_at = NOW(),
        staking_unlock_at = v_unlock_date,
        vote_multiplier = v_tier.vote_weight_multiplier,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Update global supply
    UPDATE token_supply
    SET staked_supply = staked_supply + p_amount,
        circulating_supply = circulating_supply - p_amount,
        last_updated = NOW()
    WHERE id = 1;

    -- Record transaction
    INSERT INTO token_transactions (
        user_id, tx_type, amount, reference_type, description, metadata
    ) VALUES (
        p_user_id, 'stake', p_amount, 'staking',
        'Staked for ' || p_tier || ' tier',
        jsonb_build_object('tier', p_tier, 'lock_days', v_tier.lock_days, 'apy', v_tier.staking_apy)
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'tier', p_tier,
        'amount_staked', p_amount,
        'unlock_date', v_unlock_date,
        'vote_multiplier', v_tier.vote_weight_multiplier,
        'staking_apy', v_tier.staking_apy,
        'benefits', jsonb_build_object(
            'api_multiplier', v_tier.api_rate_limit_multiplier,
            'evaluation_discount', v_tier.evaluation_request_discount,
            'early_access_days', v_tier.early_access_days,
            'governance_voting', v_tier.governance_voting
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim staking rewards
CREATE OR REPLACE FUNCTION claim_staking_rewards(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_balance RECORD;
    v_tier RECORD;
    v_days_staked INTEGER;
    v_reward NUMERIC(20,8);
BEGIN
    -- Get user balance and staking info
    SELECT * INTO v_balance
    FROM user_token_balances
    WHERE user_id = p_user_id AND staked_balance > 0;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'No staked tokens');
    END IF;

    -- Get tier APY
    SELECT * INTO v_tier
    FROM staking_tiers
    WHERE tier_name = v_balance.staking_tier;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid staking tier');
    END IF;

    -- Calculate days since last reward claim
    v_days_staked := EXTRACT(DAY FROM (NOW() - COALESCE(v_balance.updated_at, v_balance.staking_started_at)));

    IF v_days_staked < 1 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Must wait 24h between claims');
    END IF;

    -- Calculate reward: staked * (APY/365) * days
    v_reward := v_balance.staked_balance * (v_tier.staking_apy / 100.0 / 365.0) * v_days_staked;

    -- Add reward to available balance
    UPDATE user_token_balances
    SET available_balance = available_balance + v_reward,
        pending_rewards = 0,
        lifetime_earned = lifetime_earned + v_reward,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Deduct from community pool
    UPDATE token_supply
    SET community_pool = community_pool - v_reward,
        circulating_supply = circulating_supply + v_reward,
        last_updated = NOW()
    WHERE id = 1;

    -- Record transaction
    INSERT INTO token_transactions (
        user_id, tx_type, amount, reference_type, description
    ) VALUES (
        p_user_id, 'earn', v_reward, 'staking_reward',
        'Staking rewards for ' || v_days_staked || ' days'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'reward', v_reward,
        'days_staked', v_days_staked,
        'new_balance', v_balance.available_balance + v_reward
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. VIEWS: Token Statistics
-- ============================================================================

CREATE OR REPLACE VIEW token_statistics AS
SELECT
    ts.total_supply,
    ts.circulating_supply,
    ts.burned_supply,
    ts.staked_supply,
    ts.treasury_reserve,
    ts.community_pool,
    ROUND((ts.burned_supply / ts.total_supply * 100)::NUMERIC, 4) as burn_rate_pct,
    ROUND((ts.staked_supply / NULLIF(ts.circulating_supply + ts.staked_supply, 0) * 100)::NUMERIC, 2) as staking_ratio_pct,
    (SELECT COUNT(*) FROM user_token_balances WHERE available_balance > 0 OR staked_balance > 0) as holders_count,
    (SELECT COUNT(*) FROM user_token_balances WHERE staking_tier IS NOT NULL) as stakers_count,
    (SELECT SUM(amount) FROM token_transactions WHERE tx_type = 'spend' AND created_at > NOW() - INTERVAL '24 hours') as volume_24h,
    ts.last_updated
FROM token_supply ts
WHERE ts.id = 1;

CREATE OR REPLACE VIEW token_leaderboard AS
SELECT
    COALESCE(u.name, 'Anonymous') as username,
    utb.available_balance + utb.staked_balance as total_balance,
    utb.staked_balance,
    utb.staking_tier,
    utb.lifetime_earned,
    utb.vote_multiplier,
    ROW_NUMBER() OVER (ORDER BY utb.available_balance + utb.staked_balance DESC) as rank
FROM user_token_balances utb
LEFT JOIN users u ON u.id = utb.user_id
WHERE utb.available_balance + utb.staked_balance > 0
ORDER BY total_balance DESC
LIMIT 100;

-- ============================================================================
-- 10. BURN EVENTS (for transparency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_burn_events (
    id BIGSERIAL PRIMARY KEY,
    amount NUMERIC(20,8) NOT NULL,
    source TEXT NOT NULL,  -- 'purchase', 'governance_proposal', 'penalty', 'scheduled'
    reference_id TEXT,
    burned_at TIMESTAMPTZ DEFAULT NOW(),
    tx_hash TEXT  -- If on-chain
);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT SELECT ON token_statistics TO authenticated, anon;
GRANT SELECT ON token_leaderboard TO authenticated, anon;
GRANT SELECT ON staking_tiers TO authenticated, anon;
GRANT SELECT ON token_products TO authenticated, anon;
GRANT EXECUTE ON FUNCTION purchase_with_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION stake_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION claim_staking_rewards TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 211 - $SAFE Token Utility System';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'TOKEN SUPPLY:';
    RAISE NOTICE '  Total: 100,000,000 $SAFE';
    RAISE NOTICE '  Treasury: 30M | Community: 40M | Liquidity: 30M';
    RAISE NOTICE '';
    RAISE NOTICE 'STAKING TIERS:';
    RAISE NOTICE '  Bronze:   100 SAFE, 30d lock,  5%% APY, 1.2x vote';
    RAISE NOTICE '  Silver:   500 SAFE, 90d lock,  8%% APY, 1.5x vote';
    RAISE NOTICE '  Gold:    2000 SAFE, 180d lock, 12%% APY, 2.0x vote';
    RAISE NOTICE '  Platinum: 10K SAFE, 365d lock, 18%% APY, 3.0x vote';
    RAISE NOTICE '';
    RAISE NOTICE 'TOKEN USES:';
    RAISE NOTICE '  - Premium access (50-400 SAFE)';
    RAISE NOTICE '  - Request evaluations (200-500 SAFE)';
    RAISE NOTICE '  - API credits (100-800 SAFE)';
    RAISE NOTICE '  - Governance proposals (1000 SAFE)';
    RAISE NOTICE '  - Certification badge (5000 SAFE)';
    RAISE NOTICE '';
    RAISE NOTICE 'BURN MECHANISM:';
    RAISE NOTICE '  10-50%% of each purchase is burned';
    RAISE NOTICE '===========================================';
END $$;
