-- Migration 131: Staking Benefits & Weekly Rewards System
-- Transforms staking from "vote power" to real tangible benefits

-- =============================================================================
-- 1. Add rewards tracking table
-- =============================================================================

CREATE TABLE IF NOT EXISTS staking_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    reward_type TEXT NOT NULL DEFAULT 'weekly_apy',
    tier_at_reward TEXT NOT NULL, -- bronze, silver, gold, platinum, diamond
    staked_amount_at_reward INTEGER NOT NULL,
    rate_applied NUMERIC(6,4) NOT NULL, -- e.g., 0.0100 for 1%
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staking_rewards_user_id ON staking_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_rewards_created_at ON staking_rewards(created_at);

-- =============================================================================
-- 2. Enhanced staking summary view with tier calculation
-- =============================================================================

DROP VIEW IF EXISTS user_staking_summary;

CREATE VIEW user_staking_summary AS
SELECT
    user_id,
    COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as total_staked,
    COUNT(*) FILTER (WHERE status = 'active') as stake_count,
    MIN(staked_at) FILTER (WHERE status = 'active') as first_stake_at,
    COALESCE(SUM(amount) FILTER (WHERE status = 'unstaking'), 0) as total_unstaking,
    -- Calculate tier
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

-- =============================================================================
-- 3. Function to calculate tier and benefits
-- =============================================================================

CREATE OR REPLACE FUNCTION get_staking_tier(p_total_staked INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF p_total_staked >= 5000 THEN RETURN 'diamond';
    ELSIF p_total_staked >= 2500 THEN RETURN 'platinum';
    ELSIF p_total_staked >= 1000 THEN RETURN 'gold';
    ELSIF p_total_staked >= 500 THEN RETURN 'silver';
    ELSIF p_total_staked >= 100 THEN RETURN 'bronze';
    ELSE RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 4. Function to get weekly reward rate by tier
-- =============================================================================

CREATE OR REPLACE FUNCTION get_staking_reward_rate(p_tier TEXT)
RETURNS NUMERIC AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'diamond' THEN 0.02    -- 2% weekly
        WHEN 'platinum' THEN 0.0125 -- 1.25% weekly
        WHEN 'gold' THEN 0.01       -- 1% weekly
        WHEN 'silver' THEN 0.0075   -- 0.75% weekly
        WHEN 'bronze' THEN 0.005    -- 0.5% weekly
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 5. Function to distribute weekly rewards (called by cron)
-- =============================================================================

CREATE OR REPLACE FUNCTION distribute_staking_rewards()
RETURNS JSONB AS $$
DECLARE
    v_staker RECORD;
    v_reward INTEGER;
    v_rate NUMERIC;
    v_total_distributed INTEGER := 0;
    v_stakers_rewarded INTEGER := 0;
BEGIN
    -- Process all stakers with active stakes
    FOR v_staker IN
        SELECT
            user_id,
            total_staked,
            tier
        FROM user_staking_summary
        WHERE total_staked >= 100 AND tier IS NOT NULL
    LOOP
        -- Get reward rate for tier
        v_rate := get_staking_reward_rate(v_staker.tier);

        -- Calculate reward (capped at 200 per week)
        v_reward := LEAST(FLOOR(v_staker.total_staked * v_rate), 200);

        IF v_reward > 0 THEN
            -- Add reward to user balance
            INSERT INTO user_points (user_id, balance, total_earned)
            VALUES (v_staker.user_id, v_reward, v_reward)
            ON CONFLICT (user_id) DO UPDATE
            SET balance = user_points.balance + v_reward,
                total_earned = user_points.total_earned + v_reward,
                updated_at = NOW();

            -- Log the reward
            INSERT INTO staking_rewards (
                user_id,
                amount,
                reward_type,
                tier_at_reward,
                staked_amount_at_reward,
                rate_applied
            )
            VALUES (
                v_staker.user_id,
                v_reward,
                'weekly_apy',
                v_staker.tier,
                v_staker.total_staked,
                v_rate
            );

            v_total_distributed := v_total_distributed + v_reward;
            v_stakers_rewarded := v_stakers_rewarded + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total_distributed', v_total_distributed,
        'stakers_rewarded', v_stakers_rewarded,
        'distributed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. Function to get user's staking benefits
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_staking_benefits(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_summary RECORD;
    v_benefits JSONB;
BEGIN
    -- Get user's staking summary
    SELECT * INTO v_summary
    FROM user_staking_summary
    WHERE user_id = p_user_id;

    IF v_summary IS NULL OR v_summary.total_staked < 100 THEN
        RETURN jsonb_build_object(
            'tier', NULL,
            'total_staked', COALESCE(v_summary.total_staked, 0),
            'extra_setups', 0,
            'extra_products_per_setup', 0,
            'export_pdf', false,
            'api_daily_limit', 0,
            'safebot_bonus', 0,
            'alerts', false,
            'score_history', false,
            'comparisons', false,
            'priority_support', false,
            'weekly_reward_rate', 0
        );
    END IF;

    -- Build benefits based on tier
    v_benefits := CASE v_summary.tier
        WHEN 'diamond' THEN jsonb_build_object(
            'tier', 'diamond',
            'tier_name', 'Diamond',
            'tier_icon', '💠',
            'extra_setups', 15,
            'extra_products_per_setup', 5,
            'export_pdf', true,
            'api_daily_limit', 500,
            'safebot_bonus', 100,
            'alerts', true,
            'score_history', true,
            'comparisons', true,
            'priority_support', true,
            'weekly_reward_rate', 0.02,
            'monthly_value', 35
        )
        WHEN 'platinum' THEN jsonb_build_object(
            'tier', 'platinum',
            'tier_name', 'Platinum',
            'tier_icon', '💎',
            'extra_setups', 5,
            'extra_products_per_setup', 2,
            'export_pdf', true,
            'api_daily_limit', 300,
            'safebot_bonus', 50,
            'alerts', true,
            'score_history', true,
            'comparisons', true,
            'priority_support', false,
            'weekly_reward_rate', 0.0125,
            'monthly_value', 19
        )
        WHEN 'gold' THEN jsonb_build_object(
            'tier', 'gold',
            'tier_name', 'Gold',
            'tier_icon', '🥇',
            'extra_setups', 5,
            'extra_products_per_setup', 2,
            'export_pdf', true,
            'api_daily_limit', 200,
            'safebot_bonus', 30,
            'alerts', true,
            'score_history', true,
            'comparisons', false,
            'priority_support', false,
            'weekly_reward_rate', 0.01,
            'monthly_value', 15
        )
        WHEN 'silver' THEN jsonb_build_object(
            'tier', 'silver',
            'tier_name', 'Silver',
            'tier_icon', '🥈',
            'extra_setups', 3,
            'extra_products_per_setup', 1,
            'export_pdf', true,
            'api_daily_limit', 100,
            'safebot_bonus', 15,
            'alerts', true,
            'score_history', false,
            'comparisons', false,
            'priority_support', false,
            'weekly_reward_rate', 0.0075,
            'monthly_value', 10
        )
        WHEN 'bronze' THEN jsonb_build_object(
            'tier', 'bronze',
            'tier_name', 'Bronze',
            'tier_icon', '🥉',
            'extra_setups', 1,
            'extra_products_per_setup', 0,
            'export_pdf', true,
            'api_daily_limit', 0,
            'safebot_bonus', 5,
            'alerts', false,
            'score_history', false,
            'comparisons', false,
            'priority_support', false,
            'weekly_reward_rate', 0.005,
            'monthly_value', 5
        )
        ELSE jsonb_build_object('tier', NULL)
    END;

    -- Add total_staked to response
    v_benefits := v_benefits || jsonb_build_object(
        'total_staked', v_summary.total_staked,
        'stake_count', v_summary.stake_count,
        'first_stake_at', v_summary.first_stake_at
    );

    RETURN v_benefits;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 7. View for staking leaderboard with tiers
-- =============================================================================

CREATE OR REPLACE VIEW staking_leaderboard AS
SELECT
    s.user_id,
    s.total_staked,
    s.tier,
    s.first_stake_at,
    COALESCE(u.name, 'Anonymous') as display_name,
    u.image as avatar_url,
    RANK() OVER (ORDER BY s.total_staked DESC) as rank
FROM user_staking_summary s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.total_staked >= 100
ORDER BY s.total_staked DESC;

-- =============================================================================
-- 8. RLS Policies for rewards table
-- =============================================================================

ALTER TABLE staking_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards"
    ON staking_rewards FOR SELECT
    USING (auth.uid() = user_id);

-- =============================================================================
-- 9. Stats for platform
-- =============================================================================

CREATE OR REPLACE VIEW staking_stats AS
SELECT
    COUNT(DISTINCT user_id) as total_stakers,
    SUM(total_staked) as total_staked,
    AVG(total_staked)::INTEGER as avg_stake,
    COUNT(*) FILTER (WHERE tier = 'diamond') as diamond_count,
    COUNT(*) FILTER (WHERE tier = 'platinum') as platinum_count,
    COUNT(*) FILTER (WHERE tier = 'gold') as gold_count,
    COUNT(*) FILTER (WHERE tier = 'silver') as silver_count,
    COUNT(*) FILTER (WHERE tier = 'bronze') as bronze_count
FROM user_staking_summary
WHERE total_staked >= 100;

-- =============================================================================
-- 10. Comments
-- =============================================================================

COMMENT ON TABLE staking_rewards IS 'Tracks all $SAFE rewards distributed to stakers';
COMMENT ON FUNCTION distribute_staking_rewards IS 'Weekly cron function to distribute APY rewards to all stakers';
COMMENT ON FUNCTION get_user_staking_benefits IS 'Returns all unlocked benefits for a user based on their stake';
COMMENT ON VIEW staking_leaderboard IS 'Public leaderboard of top stakers with tiers';
