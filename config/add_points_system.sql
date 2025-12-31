-- ============================================================
-- SAFESCORING - POINTS SYSTEM FOR FUTURE TOKEN AIRDROP
-- ============================================================
-- Version: 1.0
-- Date: 2025-12-31
--
-- This migration adds the points tracking system for the future
-- $SAFE token airdrop. Points are earned through contributions
-- and multiplied by reputation level and seniority.
-- ============================================================

-- ============================================================
-- SECTION 1: UPDATE USER REPUTATION TABLE
-- ============================================================

-- Add points tracking columns if they don't exist
DO $$
BEGIN
    -- Add total_points if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_reputation' AND column_name = 'total_points'
    ) THEN
        ALTER TABLE user_reputation ADD COLUMN total_points INTEGER DEFAULT 0;
    END IF;

    -- Add streak tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_reputation' AND column_name = 'current_streak'
    ) THEN
        ALTER TABLE user_reputation ADD COLUMN current_streak INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_reputation' AND column_name = 'longest_streak'
    ) THEN
        ALTER TABLE user_reputation ADD COLUMN longest_streak INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_reputation' AND column_name = 'last_activity_date'
    ) THEN
        ALTER TABLE user_reputation ADD COLUMN last_activity_date DATE;
    END IF;
END $$;

-- ============================================================
-- SECTION 2: POINTS CONFIGURATION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS points_config (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) UNIQUE NOT NULL,
    base_points INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default points configuration
INSERT INTO points_config (action_type, base_points, description) VALUES
    ('correction_submitted', 10, 'Points for submitting a correction'),
    ('correction_approved', 50, 'Bonus points when correction is approved'),
    ('correction_rejected', -5, 'Penalty for rejected correction'),
    ('first_hack_report', 500, 'First to report a security incident'),
    ('streak_7_days', 25, 'Bonus for 7-day activity streak'),
    ('streak_30_days', 150, 'Bonus for 30-day activity streak'),
    ('level_contributor', 50, 'Bonus for reaching Contributor level'),
    ('level_trusted', 100, 'Bonus for reaching Trusted level'),
    ('level_expert', 200, 'Bonus for reaching Expert level'),
    ('level_oracle', 500, 'Bonus for reaching Oracle level'),
    ('referral_active', 100, 'Bonus when referred user becomes active'),
    ('daily_login', 1, 'Points for daily activity')
ON CONFLICT (action_type) DO NOTHING;

-- ============================================================
-- SECTION 3: POINTS TRANSACTIONS LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS points_transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    points_change INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id INTEGER, -- ID of correction, incident, etc.
    reference_type VARCHAR(50), -- 'correction', 'incident', 'streak', etc.
    multiplier_applied DECIMAL(4,2) DEFAULT 1.0,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pt_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pt_created ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_action ON points_transactions(action_type);

-- ============================================================
-- SECTION 4: FUNCTIONS FOR POINTS MANAGEMENT
-- ============================================================

-- 4.1 Add points to user
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id UUID,
    p_action_type VARCHAR(50),
    p_reference_id INTEGER DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_custom_points INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_base_points INTEGER;
    v_multiplier DECIMAL(4,2);
    v_level VARCHAR(20);
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_final_points INTEGER;
BEGIN
    -- Get base points from config
    IF p_custom_points IS NOT NULL THEN
        v_base_points := p_custom_points;
    ELSE
        SELECT base_points INTO v_base_points
        FROM points_config
        WHERE action_type = p_action_type AND is_active = TRUE;

        IF v_base_points IS NULL THEN
            RETURN 0;
        END IF;
    END IF;

    -- Get user's current level for multiplier
    SELECT reputation_level, COALESCE(points_earned, 0)
    INTO v_level, v_current_balance
    FROM user_reputation
    WHERE user_id = p_user_id;

    -- Calculate level multiplier
    v_multiplier := CASE v_level
        WHEN 'oracle' THEN 3.0
        WHEN 'expert' THEN 2.0
        WHEN 'trusted' THEN 1.5
        WHEN 'contributor' THEN 1.2
        ELSE 1.0
    END;

    -- Calculate final points (only apply multiplier for positive points)
    IF v_base_points > 0 THEN
        v_final_points := ROUND(v_base_points * v_multiplier);
    ELSE
        v_final_points := v_base_points;
    END IF;

    -- Calculate new balance
    v_new_balance := GREATEST(0, v_current_balance + v_final_points);

    -- Update user reputation
    UPDATE user_reputation
    SET
        points_earned = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- If no row was updated, create one
    IF NOT FOUND THEN
        INSERT INTO user_reputation (user_id, points_earned, reputation_score, reputation_level)
        VALUES (p_user_id, GREATEST(0, v_final_points), 50.0, 'newcomer');
        v_new_balance := GREATEST(0, v_final_points);
    END IF;

    -- Log transaction
    INSERT INTO points_transactions (
        user_id, action_type, points_change, balance_after,
        reference_id, reference_type, multiplier_applied, description
    )
    VALUES (
        p_user_id, p_action_type, v_final_points, v_new_balance,
        p_reference_id, p_reference_type, v_multiplier,
        FORMAT('%s: %s points (x%s multiplier)', p_action_type, v_final_points, v_multiplier)
    );

    RETURN v_final_points;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Update streak and award bonus
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_today DATE := CURRENT_DATE;
    v_bonus_points INTEGER := 0;
BEGIN
    -- Get current streak info
    SELECT last_activity_date, current_streak, longest_streak
    INTO v_last_activity, v_current_streak, v_longest_streak
    FROM user_reputation
    WHERE user_id = p_user_id;

    -- Initialize if no record
    IF v_last_activity IS NULL THEN
        UPDATE user_reputation
        SET last_activity_date = v_today, current_streak = 1
        WHERE user_id = p_user_id;
        RETURN 0;
    END IF;

    -- Same day - no update needed
    IF v_last_activity = v_today THEN
        RETURN 0;
    END IF;

    -- Consecutive day - increment streak
    IF v_last_activity = v_today - 1 THEN
        v_current_streak := COALESCE(v_current_streak, 0) + 1;

        -- Check for streak milestones
        IF v_current_streak = 7 THEN
            v_bonus_points := (SELECT base_points FROM points_config WHERE action_type = 'streak_7_days');
            PERFORM add_user_points(p_user_id, 'streak_7_days');
        ELSIF v_current_streak = 30 THEN
            v_bonus_points := (SELECT base_points FROM points_config WHERE action_type = 'streak_30_days');
            PERFORM add_user_points(p_user_id, 'streak_30_days');
        END IF;
    ELSE
        -- Streak broken - reset
        v_current_streak := 1;
    END IF;

    -- Update longest streak if needed
    IF v_current_streak > COALESCE(v_longest_streak, 0) THEN
        v_longest_streak := v_current_streak;
    END IF;

    -- Update user record
    UPDATE user_reputation
    SET
        last_activity_date = v_today,
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN v_bonus_points;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Increment user corrections counter
CREATE OR REPLACE FUNCTION increment_user_corrections(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_reputation (user_id, corrections_submitted, points_earned, reputation_score, reputation_level)
    VALUES (p_user_id, 1, 10, 50.0, 'newcomer')
    ON CONFLICT (user_id) DO UPDATE SET
        corrections_submitted = user_reputation.corrections_submitted + 1,
        updated_at = NOW();

    -- Add points for submission
    PERFORM add_user_points(p_user_id, 'correction_submitted');

    -- Update streak
    PERFORM update_user_streak(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 5: TRIGGERS FOR AUTOMATIC POINTS
-- ============================================================

-- 5.1 Award points when correction is approved/rejected
CREATE OR REPLACE FUNCTION handle_correction_review()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when status changes from pending
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
        IF NEW.status = 'approved' THEN
            -- Award approval bonus
            PERFORM add_user_points(NEW.user_id, 'correction_approved', NEW.id, 'correction');

            -- Update approved count
            UPDATE user_reputation
            SET corrections_approved = corrections_approved + 1
            WHERE user_id = NEW.user_id;
        ELSE
            -- Apply rejection penalty
            PERFORM add_user_points(NEW.user_id, 'correction_rejected', NEW.id, 'correction');

            -- Update rejected count
            UPDATE user_reputation
            SET corrections_rejected = corrections_rejected + 1
            WHERE user_id = NEW.user_id;
        END IF;

        -- Recalculate reputation
        PERFORM update_user_reputation(NEW.user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_correction_points ON user_corrections;
CREATE TRIGGER trigger_correction_points
    AFTER UPDATE OF status ON user_corrections
    FOR EACH ROW
    EXECUTE FUNCTION handle_correction_review();

-- ============================================================
-- SECTION 6: VIEWS FOR AIRDROP CALCULATION
-- ============================================================

-- 6.1 Airdrop estimation view
CREATE OR REPLACE VIEW v_airdrop_estimation AS
SELECT
    ur.user_id,
    u.name,
    u.email,
    u.created_at as joined_at,
    EXTRACT(DAY FROM NOW() - u.created_at) as days_since_joined,
    ur.points_earned as base_points,
    ur.reputation_level,
    ur.corrections_approved,
    ur.current_streak,
    ur.longest_streak,
    -- Level multiplier
    CASE ur.reputation_level
        WHEN 'oracle' THEN 3.0
        WHEN 'expert' THEN 2.0
        WHEN 'trusted' THEN 1.5
        WHEN 'contributor' THEN 1.2
        ELSE 1.0
    END as level_multiplier,
    -- Seniority multiplier (max 2.0 at 1 year)
    LEAST(2.0, 1.0 + (EXTRACT(DAY FROM NOW() - u.created_at) / 365.0)) as seniority_multiplier,
    -- Estimated airdrop
    ROUND(
        COALESCE(ur.points_earned, 0) *
        CASE ur.reputation_level
            WHEN 'oracle' THEN 3.0
            WHEN 'expert' THEN 2.0
            WHEN 'trusted' THEN 1.5
            WHEN 'contributor' THEN 1.2
            ELSE 1.0
        END *
        LEAST(2.0, 1.0 + (EXTRACT(DAY FROM NOW() - u.created_at) / 365.0))
    ) as estimated_airdrop_points
FROM user_reputation ur
JOIN users u ON ur.user_id = u.id
ORDER BY estimated_airdrop_points DESC;

-- 6.2 Leaderboard view
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT
    ROW_NUMBER() OVER (ORDER BY estimated_airdrop_points DESC) as rank,
    user_id,
    name,
    base_points,
    reputation_level,
    level_multiplier,
    seniority_multiplier,
    estimated_airdrop_points,
    corrections_approved,
    days_since_joined
FROM v_airdrop_estimation
WHERE base_points > 0;

-- ============================================================
-- SECTION 7: COMMENTS
-- ============================================================

COMMENT ON TABLE points_config IS 'Configuration for points awarded per action type';
COMMENT ON TABLE points_transactions IS 'Audit log of all points transactions for future token airdrop';
COMMENT ON VIEW v_airdrop_estimation IS 'Calculates estimated airdrop for each user based on points, level, and seniority';
COMMENT ON VIEW v_leaderboard IS 'Ranked leaderboard for display on dashboard';

-- ============================================================
-- DONE!
-- ============================================================
SELECT 'Points system for $SAFE token airdrop created successfully!' as status;
