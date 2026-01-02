-- Migration: Referral System
-- SafeScoring - User Referral and Rewards Program

-- ============================================================================
-- PART 1: Create referrals table
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_user_id TEXT NOT NULL,           -- User who shared the referral
    referred_user_id TEXT NOT NULL,           -- New user who signed up
    referral_code VARCHAR(20) NOT NULL,       -- The code used
    status VARCHAR(20) DEFAULT 'pending',     -- pending, confirmed, expired
    reward_claimed BOOLEAN DEFAULT FALSE,     -- Has reward been claimed?
    reward_type VARCHAR(50),                  -- Type of reward given
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,                   -- When referral was confirmed

    CONSTRAINT referrals_referred_unique UNIQUE (referred_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ============================================================================
-- PART 2: Create referral_rewards table for tracking rewards
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    reward_type VARCHAR(50) NOT NULL,         -- free_month_explorer, free_month_pro, airdrop_priority
    reward_value TEXT,                        -- Additional details
    earned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,                     -- When reward expires (if applicable)
    claimed_at TIMESTAMP,                     -- When user claimed/used the reward
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON referral_rewards(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- PART 3: Function to confirm a referral and grant rewards
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_referral(p_referred_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id TEXT;
    v_referral_count INTEGER;
BEGIN
    -- Get the referrer
    SELECT referrer_user_id INTO v_referrer_id
    FROM referrals
    WHERE referred_user_id = p_referred_user_id
      AND status = 'pending';

    IF v_referrer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update referral status
    UPDATE referrals
    SET status = 'confirmed',
        confirmed_at = NOW()
    WHERE referred_user_id = p_referred_user_id;

    -- Count confirmed referrals for reward tier
    SELECT COUNT(*) INTO v_referral_count
    FROM referrals
    WHERE referrer_user_id = v_referrer_id
      AND status = 'confirmed';

    -- Grant rewards based on count
    IF v_referral_count = 1 THEN
        -- First referral: 1 month free Explorer
        INSERT INTO referral_rewards (user_id, reward_type, reward_value, expires_at)
        VALUES (v_referrer_id, 'free_month_explorer', '1 month Explorer tier', NOW() + INTERVAL '30 days');
    ELSIF v_referral_count = 5 THEN
        -- 5th referral: 1 month free Professional
        INSERT INTO referral_rewards (user_id, reward_type, reward_value, expires_at)
        VALUES (v_referrer_id, 'free_month_pro', '1 month Professional tier', NOW() + INTERVAL '30 days');
    ELSIF v_referral_count = 10 THEN
        -- 10th referral: Airdrop priority
        INSERT INTO referral_rewards (user_id, reward_type, reward_value)
        VALUES (v_referrer_id, 'airdrop_priority', 'Priority for $SAFE airdrop');
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: View for referral leaderboard
-- ============================================================================

CREATE OR REPLACE VIEW v_referral_leaderboard AS
SELECT
    referrer_user_id AS user_id,
    COUNT(*) AS total_referrals,
    COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_referrals,
    MIN(created_at) AS first_referral_at,
    MAX(created_at) AS last_referral_at
FROM referrals
GROUP BY referrer_user_id
HAVING COUNT(*) FILTER (WHERE status = 'confirmed') > 0
ORDER BY confirmed_referrals DESC;

COMMENT ON VIEW v_referral_leaderboard IS 'Leaderboard of users by confirmed referrals';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT * FROM referrals LIMIT 5;
-- SELECT * FROM v_referral_leaderboard LIMIT 10;
