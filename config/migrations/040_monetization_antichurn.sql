-- ============================================================================
-- Migration 040: Monetization & Anti-Churn System
-- Complete implementation for revenue optimization
-- ============================================================================

-- ============================================================================
-- 0. PREREQUISITE: Add missing columns to users table
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_discount INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- ============================================================================
-- 1. USER HEALTH SCORE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Health score (0-100)
    health_score INTEGER DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
    health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'at_risk', 'danger', 'critical')),

    -- Activity signals
    last_login_at TIMESTAMPTZ,
    logins_last_7_days INTEGER DEFAULT 0,
    logins_last_30_days INTEGER DEFAULT 0,

    -- Engagement signals
    setups_modified_last_30_days INTEGER DEFAULT 0,
    comparisons_last_30_days INTEGER DEFAULT 0,
    alerts_opened_last_30_days INTEGER DEFAULT 0,
    pdf_exports_last_30_days INTEGER DEFAULT 0,
    api_calls_last_30_days INTEGER DEFAULT 0,

    -- Negative signals
    support_tickets_open INTEGER DEFAULT 0,
    payment_failures INTEGER DEFAULT 0,
    days_since_last_activity INTEGER DEFAULT 0,

    -- Calculated at
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_health_scores_user ON user_health_scores(user_id);
CREATE INDEX idx_health_scores_status ON user_health_scores(health_status);
CREATE INDEX idx_health_scores_score ON user_health_scores(health_score);

-- ============================================================================
-- 2. FEATURE USAGE TRACKING (for feature gating triggers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Feature usage counts (reset monthly)
    comparisons_this_month INTEGER DEFAULT 0,
    score_details_this_month INTEGER DEFAULT 0,
    pdf_exports_this_month INTEGER DEFAULT 0,
    api_calls_this_month INTEGER DEFAULT 0,

    -- Lifetime counts
    total_comparisons INTEGER DEFAULT 0,
    total_score_details INTEGER DEFAULT 0,
    total_pdf_exports INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,

    -- Upgrade triggers hit
    setup_limit_hit_count INTEGER DEFAULT 0,
    comparison_limit_hit_count INTEGER DEFAULT 0,
    detail_limit_hit_count INTEGER DEFAULT 0,
    export_limit_hit_count INTEGER DEFAULT 0,

    -- Timestamps
    month_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()),
    last_upgrade_prompt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_feature_usage_user ON feature_usage(user_id);

-- ============================================================================
-- 3. CANCELLATION FLOW TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS cancellation_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Flow status
    status TEXT DEFAULT 'initiated' CHECK (status IN (
        'initiated', 'reason_selected', 'offer_shown', 'offer_accepted',
        'downgraded', 'paused', 'cancelled', 'retained'
    )),

    -- Reason for leaving
    cancel_reason TEXT CHECK (cancel_reason IN (
        'too_expensive', 'not_using', 'missing_feature', 'competitor',
        'temporary', 'other'
    )),
    cancel_reason_detail TEXT,

    -- Retention offers
    offer_type TEXT CHECK (offer_type IN (
        'discount_50_3mo', 'discount_30_3mo', 'downgrade', 'pause_1mo',
        'pause_3mo', 'free_month', 'none'
    )),
    offer_shown_at TIMESTAMPTZ,
    offer_response TEXT CHECK (offer_response IN ('accepted', 'rejected', 'ignored')),
    offer_responded_at TIMESTAMPTZ,

    -- Previous plan info
    previous_plan TEXT,
    previous_mrr DECIMAL(10, 2),

    -- Result
    final_outcome TEXT CHECK (final_outcome IN ('retained', 'downgraded', 'paused', 'churned')),
    revenue_saved DECIMAL(10, 2) DEFAULT 0,

    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cancellation_user ON cancellation_flows(user_id);
CREATE INDEX idx_cancellation_status ON cancellation_flows(status);
CREATE INDEX idx_cancellation_reason ON cancellation_flows(cancel_reason);

-- ============================================================================
-- 4. DUNNING (Failed Payment Recovery)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dunning_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Payment failure info
    failure_count INTEGER DEFAULT 1,
    first_failure_at TIMESTAMPTZ DEFAULT NOW(),
    last_failure_at TIMESTAMPTZ DEFAULT NOW(),
    failure_reason TEXT,

    -- Dunning sequence status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'recovered', 'churned', 'paused')),
    current_step INTEGER DEFAULT 0,

    -- Email tracking
    email_1_sent_at TIMESTAMPTZ, -- Day 0: Soft reminder
    email_2_sent_at TIMESTAMPTZ, -- Day 3: Reminder + help
    email_3_sent_at TIMESTAMPTZ, -- Day 7: Urgency
    email_4_sent_at TIMESTAMPTZ, -- Day 10: Last chance
    email_5_sent_at TIMESTAMPTZ, -- Day 14: Win-back offer

    -- Recovery
    recovered_at TIMESTAMPTZ,
    recovery_method TEXT CHECK (recovery_method IN (
        'automatic_retry', 'card_updated', 'manual_payment', 'downgrade', 'win_back'
    )),

    -- Timestamps
    grace_period_ends_at TIMESTAMPTZ,
    access_revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dunning_user ON dunning_sequences(user_id);
CREATE INDEX idx_dunning_status ON dunning_sequences(status);

-- ============================================================================
-- 5. WIN-BACK CAMPAIGNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS winback_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Campaign info
    campaign_type TEXT DEFAULT 'standard' CHECK (campaign_type IN (
        'standard', 'high_value', 'feature_request', 'competitor_switch'
    )),

    -- Churn info
    churned_at TIMESTAMPTZ NOT NULL,
    churn_reason TEXT,
    previous_plan TEXT,
    previous_ltv DECIMAL(10, 2),

    -- Email sequence
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'unsubscribed')),
    email_1_sent_at TIMESTAMPTZ, -- Day 7: "We miss you"
    email_2_sent_at TIMESTAMPTZ, -- Day 14: New feature announcement
    email_3_sent_at TIMESTAMPTZ, -- Day 30: 30% discount
    email_4_sent_at TIMESTAMPTZ, -- Day 60: Data deletion warning
    email_5_sent_at TIMESTAMPTZ, -- Day 90: Final 50% offer

    -- Offers
    discount_offered INTEGER, -- Percentage
    discount_code TEXT,
    discount_expires_at TIMESTAMPTZ,

    -- Conversion
    converted_at TIMESTAMPTZ,
    converted_plan TEXT,

    -- Timestamps
    data_deletion_scheduled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_winback_user ON winback_campaigns(user_id);
CREATE INDEX idx_winback_status ON winback_campaigns(status);

-- ============================================================================
-- 6. UPSELL EVENTS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS upsell_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Trigger info
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'setup_limit', 'comparison_limit', 'detail_limit', 'export_limit',
        'api_limit', 'feature_locked', 'trial_ending', 'usage_milestone',
        'time_based', 'behavior_based'
    )),
    trigger_context JSONB DEFAULT '{}',

    -- Display info
    modal_shown BOOLEAN DEFAULT FALSE,
    modal_shown_at TIMESTAMPTZ,

    -- Response
    response TEXT CHECK (response IN ('converted', 'dismissed', 'later', 'ignored')),
    responded_at TIMESTAMPTZ,

    -- Conversion
    converted_to_plan TEXT,
    revenue_generated DECIMAL(10, 2),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_user ON upsell_events(user_id);
CREATE INDEX idx_upsell_trigger ON upsell_events(trigger_type);
CREATE INDEX idx_upsell_converted ON upsell_events(response) WHERE response = 'converted';

-- ============================================================================
-- 7. ADD-ONS & EXPANSION REVENUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Add-on info
    addon_type TEXT NOT NULL CHECK (addon_type IN (
        'api_boost', 'white_label', 'custom_scoring', 'dedicated_support',
        'extra_setups', 'team_seats', 'priority_alerts'
    )),
    addon_name TEXT NOT NULL,

    -- Pricing
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'one_time')),

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),

    -- Subscription
    lemon_squeezy_subscription_id TEXT,

    -- Dates
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addons_user ON user_addons(user_id);
CREATE INDEX idx_addons_type ON user_addons(addon_type);
CREATE INDEX idx_addons_status ON user_addons(status);

-- ============================================================================
-- 8. RETENTION OFFERS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Offer definition
    offer_code TEXT UNIQUE NOT NULL,
    offer_name TEXT NOT NULL,
    offer_type TEXT NOT NULL CHECK (offer_type IN (
        'discount', 'free_month', 'downgrade', 'pause', 'addon_free'
    )),

    -- Discount details
    discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_months INTEGER DEFAULT 1,
    free_months INTEGER DEFAULT 0,

    -- Eligibility
    eligible_plans TEXT[] DEFAULT ARRAY['explorer', 'professional', 'enterprise'],
    eligible_reasons TEXT[] DEFAULT ARRAY['too_expensive', 'not_using', 'missing_feature'],
    min_tenure_days INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,

    -- Limits
    total_budget DECIMAL(10, 2),
    used_budget DECIMAL(10, 2) DEFAULT 0,
    total_uses INTEGER DEFAULT 0,
    max_total_uses INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention offers
INSERT INTO retention_offers (offer_code, offer_name, offer_type, discount_percent, discount_months, eligible_reasons) VALUES
('STAY50_3MO', '50% off for 3 months', 'discount', 50, 3, ARRAY['too_expensive']),
('STAY30_3MO', '30% off for 3 months', 'discount', 30, 3, ARRAY['not_using', 'missing_feature']),
('FREE_MONTH', '1 free month', 'free_month', 100, 1, ARRAY['temporary', 'other']),
('PAUSE_1MO', 'Pause for 1 month', 'pause', 0, 0, ARRAY['temporary']),
('PAUSE_3MO', 'Pause for 3 months', 'pause', 0, 0, ARRAY['temporary'])
ON CONFLICT (offer_code) DO NOTHING;

-- ============================================================================
-- 9. SUBSCRIPTION PAUSE FEATURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_pauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Pause info
    pause_reason TEXT,
    pause_duration_months INTEGER DEFAULT 1 CHECK (pause_duration_months >= 1 AND pause_duration_months <= 3),

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resumed', 'expired', 'cancelled')),

    -- Plan preservation
    preserved_plan TEXT NOT NULL,
    preserved_price_id TEXT,

    -- Dates
    paused_at TIMESTAMPTZ DEFAULT NOW(),
    resumes_at TIMESTAMPTZ NOT NULL,
    resumed_at TIMESTAMPTZ,

    -- Reminder emails
    reminder_1_sent_at TIMESTAMPTZ, -- 7 days before resume
    reminder_2_sent_at TIMESTAMPTZ, -- 1 day before resume

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pauses_user ON subscription_pauses(user_id);
CREATE INDEX idx_pauses_status ON subscription_pauses(status);
CREATE INDEX idx_pauses_resumes ON subscription_pauses(resumes_at) WHERE status = 'active';

-- ============================================================================
-- 10. ENGAGEMENT EMAILS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Email info
    email_type TEXT NOT NULL CHECK (email_type IN (
        'welcome', 'onboarding_1', 'onboarding_2', 'onboarding_3',
        'weekly_digest', 'score_change', 'new_feature', 'milestone',
        'reengagement_7d', 'reengagement_14d', 'reengagement_30d',
        'trial_ending_7d', 'trial_ending_3d', 'trial_ending_1d',
        'dunning_1', 'dunning_2', 'dunning_3', 'dunning_4',
        'winback_1', 'winback_2', 'winback_3', 'winback_4', 'winback_5',
        'upsell', 'annual_reminder'
    )),
    email_subject TEXT,

    -- Status
    status TEXT DEFAULT 'sent' CHECK (status IN ('scheduled', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),

    -- Tracking
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    resend_message_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_engagement_user ON engagement_emails(user_id);
CREATE INDEX idx_engagement_type ON engagement_emails(email_type);
CREATE INDEX idx_engagement_sent ON engagement_emails(sent_at);

-- ============================================================================
-- 11. DISCOUNT CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Code info
    code TEXT UNIQUE NOT NULL,
    description TEXT,

    -- Discount
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,

    -- Applicability
    applicable_plans TEXT[] DEFAULT ARRAY['explorer', 'professional', 'enterprise'],
    applicable_periods TEXT[] DEFAULT ARRAY['monthly', 'yearly'],

    -- Limits
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,

    -- Validity
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    -- Lemon Squeezy
    lemon_squeezy_discount_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discount_code ON discount_codes(code);
CREATE INDEX idx_discount_active ON discount_codes(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 12. MRR TRACKING (for analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mrr_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Date
    snapshot_date DATE NOT NULL UNIQUE,

    -- MRR breakdown
    total_mrr DECIMAL(12, 2) DEFAULT 0,
    new_mrr DECIMAL(12, 2) DEFAULT 0,
    expansion_mrr DECIMAL(12, 2) DEFAULT 0,
    contraction_mrr DECIMAL(12, 2) DEFAULT 0,
    churned_mrr DECIMAL(12, 2) DEFAULT 0,
    reactivation_mrr DECIMAL(12, 2) DEFAULT 0,

    -- Net MRR
    net_new_mrr DECIMAL(12, 2) DEFAULT 0,

    -- Customer counts
    total_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    churned_customers INTEGER DEFAULT 0,

    -- Plan breakdown
    free_users INTEGER DEFAULT 0,
    explorer_users INTEGER DEFAULT 0,
    professional_users INTEGER DEFAULT 0,
    enterprise_users INTEGER DEFAULT 0,

    -- Rates
    churn_rate DECIMAL(5, 2) DEFAULT 0,
    expansion_rate DECIMAL(5, 2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mrr_date ON mrr_snapshots(snapshot_date);

-- ============================================================================
-- 13. FUNCTIONS: Calculate User Health Score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_user_health_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 50;
    v_user RECORD;
    v_usage RECORD;
    v_days_inactive INTEGER;
BEGIN
    -- Get user data
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN 0; END IF;

    -- Get feature usage
    SELECT * INTO v_usage FROM feature_usage WHERE user_id = p_user_id;

    -- Positive signals
    -- Login this week: +20
    IF v_user.last_login_at > NOW() - INTERVAL '7 days' THEN
        v_score := v_score + 20;
    END IF;

    -- Setup modified this month: +15
    IF v_usage IS NOT NULL AND v_usage.updated_at > NOW() - INTERVAL '30 days' THEN
        v_score := v_score + 15;
    END IF;

    -- Active usage: +10 each
    IF v_usage IS NOT NULL THEN
        IF v_usage.comparisons_this_month > 0 THEN v_score := v_score + 10; END IF;
        IF v_usage.pdf_exports_this_month > 0 THEN v_score := v_score + 10; END IF;
        IF v_usage.api_calls_this_month > 0 THEN v_score := v_score + 5; END IF;
    END IF;

    -- Negative signals
    -- Days since last login
    IF v_user.last_login_at IS NOT NULL THEN
        v_days_inactive := EXTRACT(DAY FROM NOW() - v_user.last_login_at)::INTEGER;
        IF v_days_inactive > 30 THEN v_score := v_score - 40;
        ELSIF v_days_inactive > 14 THEN v_score := v_score - 30;
        ELSIF v_days_inactive > 7 THEN v_score := v_score - 15;
        END IF;
    END IF;

    -- Clamp score between 0 and 100
    v_score := GREATEST(0, LEAST(100, v_score));

    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 14. FUNCTIONS: Update Health Score
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_health_score(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_score INTEGER;
    v_status TEXT;
BEGIN
    v_score := calculate_user_health_score(p_user_id);

    -- Determine status
    IF v_score >= 80 THEN v_status := 'healthy';
    ELSIF v_score >= 60 THEN v_status := 'at_risk';
    ELSIF v_score >= 40 THEN v_status := 'danger';
    ELSE v_status := 'critical';
    END IF;

    -- Upsert health score
    INSERT INTO user_health_scores (user_id, health_score, health_status, calculated_at)
    VALUES (p_user_id, v_score, v_status, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        health_score = EXCLUDED.health_score,
        health_status = EXCLUDED.health_status,
        calculated_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 15. FUNCTIONS: Track Feature Usage
-- ============================================================================

CREATE OR REPLACE FUNCTION track_feature_usage(
    p_user_id UUID,
    p_feature TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_usage RECORD;
    v_limits RECORD;
    v_user RECORD;
    v_limit_hit BOOLEAN := FALSE;
    v_current_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get or create usage record
    INSERT INTO feature_usage (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Reset monthly counts if needed
    UPDATE feature_usage
    SET comparisons_this_month = 0,
        score_details_this_month = 0,
        pdf_exports_this_month = 0,
        api_calls_this_month = 0,
        month_reset_at = DATE_TRUNC('month', NOW())
    WHERE user_id = p_user_id
    AND month_reset_at < DATE_TRUNC('month', NOW());

    -- Update the specific feature
    CASE p_feature
        WHEN 'comparison' THEN
            UPDATE feature_usage
            SET comparisons_this_month = comparisons_this_month + p_increment,
                total_comparisons = total_comparisons + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id;
        WHEN 'score_detail' THEN
            UPDATE feature_usage
            SET score_details_this_month = score_details_this_month + p_increment,
                total_score_details = total_score_details + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id;
        WHEN 'pdf_export' THEN
            UPDATE feature_usage
            SET pdf_exports_this_month = pdf_exports_this_month + p_increment,
                total_pdf_exports = total_pdf_exports + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id;
        WHEN 'api_call' THEN
            UPDATE feature_usage
            SET api_calls_this_month = api_calls_this_month + p_increment,
                total_api_calls = total_api_calls + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id;
        ELSE
            -- Unknown feature, just return
            RETURN jsonb_build_object('success', true, 'limit_hit', false);
    END CASE;

    -- Get updated usage
    SELECT * INTO v_usage FROM feature_usage WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'feature', p_feature,
        'current_count', CASE p_feature
            WHEN 'comparison' THEN v_usage.comparisons_this_month
            WHEN 'score_detail' THEN v_usage.score_details_this_month
            WHEN 'pdf_export' THEN v_usage.pdf_exports_this_month
            WHEN 'api_call' THEN v_usage.api_calls_this_month
            ELSE 0
        END
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 16. TRIGGER: Auto-update health score on login
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_health_on_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_login_at IS DISTINCT FROM OLD.last_login_at THEN
        PERFORM update_user_health_score(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_health_on_login ON users;
CREATE TRIGGER trg_update_health_on_login
    AFTER UPDATE OF last_login_at ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_health_on_login();

-- ============================================================================
-- 17. RLS POLICIES
-- ============================================================================

ALTER TABLE user_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_pauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_emails ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users view own health scores" ON user_health_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own feature usage" ON feature_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own cancellation flows" ON cancellation_flows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own addons" ON user_addons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own pauses" ON subscription_pauses FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access health_scores" ON user_health_scores FOR ALL USING (true);
CREATE POLICY "Service role full access feature_usage" ON feature_usage FOR ALL USING (true);
CREATE POLICY "Service role full access cancellation_flows" ON cancellation_flows FOR ALL USING (true);
CREATE POLICY "Service role full access dunning" ON dunning_sequences FOR ALL USING (true);
CREATE POLICY "Service role full access winback" ON winback_campaigns FOR ALL USING (true);
CREATE POLICY "Service role full access upsell" ON upsell_events FOR ALL USING (true);
CREATE POLICY "Service role full access addons" ON user_addons FOR ALL USING (true);
CREATE POLICY "Service role full access pauses" ON subscription_pauses FOR ALL USING (true);
CREATE POLICY "Service role full access emails" ON engagement_emails FOR ALL USING (true);

-- ============================================================================
-- 18. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_health_status_score ON user_health_scores(health_status, health_score);
CREATE INDEX IF NOT EXISTS idx_cancellation_date ON cancellation_flows(initiated_at);
CREATE INDEX IF NOT EXISTS idx_upsell_date ON upsell_events(created_at);
-- Note: idx_mrr_date already exists on snapshot_date (created with table)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
