-- ============================================================================
-- Migration 041: Crypto Subscription Retention System
-- Handles renewal reminders, loyalty offers, and retention for crypto payments
-- ============================================================================

-- ============================================================================
-- 1. CRYPTO SUBSCRIPTIONS TRACKING (enhanced)
-- ============================================================================

-- Add crypto-specific fields to existing tables or create new tracking
ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS subscription_period_months INTEGER DEFAULT 1;
ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMPTZ;
ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS is_renewal BOOLEAN DEFAULT FALSE;
ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS previous_payment_id UUID;
ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS renewal_discount_percent INTEGER DEFAULT 0;
ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'new';

-- ============================================================================
-- 2. CRYPTO RENEWAL REMINDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crypto_renewal_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Subscription info
    subscription_ends_at TIMESTAMPTZ NOT NULL,
    plan_code TEXT NOT NULL,
    plan_name TEXT,
    original_price DECIMAL(10, 2),

    -- Reminder sequence
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'reminder_1_sent', 'reminder_2_sent', 'reminder_3_sent',
        'final_sent', 'renewed', 'expired', 'cancelled'
    )),

    -- Email tracking
    reminder_14d_sent_at TIMESTAMPTZ,  -- 14 days before
    reminder_7d_sent_at TIMESTAMPTZ,   -- 7 days before
    reminder_3d_sent_at TIMESTAMPTZ,   -- 3 days before
    reminder_1d_sent_at TIMESTAMPTZ,   -- 1 day before
    expired_sent_at TIMESTAMPTZ,       -- Day of expiration

    -- Loyalty offer
    loyalty_discount_percent INTEGER DEFAULT 0,
    loyalty_discount_code TEXT,
    loyalty_discount_expires_at TIMESTAMPTZ,

    -- Result
    renewed_at TIMESTAMPTZ,
    renewed_payment_id TEXT,
    renewal_amount DECIMAL(10, 2),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crypto_renewal_user ON crypto_renewal_reminders(user_id);
CREATE INDEX idx_crypto_renewal_status ON crypto_renewal_reminders(status);
CREATE INDEX idx_crypto_renewal_ends ON crypto_renewal_reminders(subscription_ends_at) WHERE status NOT IN ('renewed', 'expired', 'cancelled');

-- ============================================================================
-- 3. CRYPTO LOYALTY TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crypto_loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Loyalty metrics
    total_payments INTEGER DEFAULT 0,
    total_amount_usd DECIMAL(12, 2) DEFAULT 0,
    consecutive_renewals INTEGER DEFAULT 0,
    first_payment_at TIMESTAMPTZ,
    last_payment_at TIMESTAMPTZ,

    -- Current tier
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    tier_updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Tier benefits
    current_discount_percent INTEGER DEFAULT 0,
    lifetime_savings DECIMAL(10, 2) DEFAULT 0,

    -- Referral bonus
    referrals_count INTEGER DEFAULT 0,
    referral_bonus_percent INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_crypto_loyalty_tier ON crypto_loyalty_tiers(tier);

-- Insert tier definitions
CREATE TABLE IF NOT EXISTS loyalty_tier_definitions (
    tier TEXT PRIMARY KEY,
    min_payments INTEGER NOT NULL,
    min_amount_usd DECIMAL(10, 2) NOT NULL,
    discount_percent INTEGER NOT NULL,
    bonus_features TEXT[],
    badge_color TEXT
);

INSERT INTO loyalty_tier_definitions (tier, min_payments, min_amount_usd, discount_percent, bonus_features, badge_color) VALUES
('bronze', 1, 0, 5, ARRAY['Priority support'], '#CD7F32'),
('silver', 3, 100, 10, ARRAY['Priority support', 'Early access'], '#C0C0C0'),
('gold', 6, 300, 15, ARRAY['Priority support', 'Early access', 'Beta features'], '#FFD700'),
('platinum', 12, 600, 20, ARRAY['Priority support', 'Early access', 'Beta features', 'Custom alerts'], '#E5E4E2'),
('diamond', 24, 1500, 25, ARRAY['All features', 'Dedicated support', 'Custom integrations'], '#B9F2FF')
ON CONFLICT (tier) DO UPDATE SET
    min_payments = EXCLUDED.min_payments,
    min_amount_usd = EXCLUDED.min_amount_usd,
    discount_percent = EXCLUDED.discount_percent;

-- ============================================================================
-- 4. CRYPTO RETENTION OFFERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crypto_retention_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Offer definition
    offer_code TEXT UNIQUE NOT NULL,
    offer_name TEXT NOT NULL,
    offer_type TEXT NOT NULL CHECK (offer_type IN (
        'early_renewal', 'loyalty_bonus', 'win_back', 'upgrade_incentive', 'annual_switch'
    )),

    -- Discount
    discount_percent INTEGER NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 50),
    bonus_months INTEGER DEFAULT 0,

    -- Eligibility
    min_loyalty_tier TEXT DEFAULT 'bronze',
    min_consecutive_renewals INTEGER DEFAULT 0,
    days_before_expiry_min INTEGER, -- NULL = no minimum
    days_before_expiry_max INTEGER, -- NULL = no maximum

    -- Limits
    max_uses_per_user INTEGER DEFAULT 1,
    total_uses INTEGER DEFAULT 0,
    max_total_uses INTEGER,
    budget_remaining DECIMAL(10, 2),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default crypto retention offers
INSERT INTO crypto_retention_offers (offer_code, offer_name, offer_type, discount_percent, bonus_months, days_before_expiry_min, days_before_expiry_max) VALUES
-- Early renewal offers (renew before expiry)
('CRYPTO_EARLY_14D', 'Early Bird - 14 days', 'early_renewal', 15, 0, 7, 14),
('CRYPTO_EARLY_7D', 'Last Week Deal', 'early_renewal', 10, 0, 3, 7),
('CRYPTO_EARLY_3D', 'Final Days', 'early_renewal', 5, 0, 1, 3),

-- Loyalty bonuses
('CRYPTO_LOYAL_SILVER', 'Silver Member Bonus', 'loyalty_bonus', 10, 0, NULL, NULL),
('CRYPTO_LOYAL_GOLD', 'Gold Member Bonus', 'loyalty_bonus', 15, 1, NULL, NULL),
('CRYPTO_LOYAL_PLATINUM', 'Platinum VIP', 'loyalty_bonus', 20, 1, NULL, NULL),
('CRYPTO_LOYAL_DIAMOND', 'Diamond Elite', 'loyalty_bonus', 25, 2, NULL, NULL),

-- Annual switch incentive
('CRYPTO_ANNUAL_SWITCH', 'Switch to Annual - 2 months free', 'annual_switch', 17, 2, NULL, NULL),

-- Win-back offers (after expiry)
('CRYPTO_WINBACK_7D', 'Come Back - 7 days', 'win_back', 20, 0, -7, -1),
('CRYPTO_WINBACK_30D', 'We Miss You - 30 days', 'win_back', 30, 1, -30, -7),
('CRYPTO_WINBACK_90D', 'Special Return Offer', 'win_back', 40, 1, -90, -30)
ON CONFLICT (offer_code) DO NOTHING;

-- ============================================================================
-- 5. CRYPTO PAYMENT PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS crypto_payment_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Preferred payment method
    preferred_currency TEXT DEFAULT 'usdcmatic',
    preferred_network TEXT DEFAULT 'polygon',

    -- Saved wallet (for faster checkout)
    saved_wallet_address TEXT,
    wallet_verified BOOLEAN DEFAULT FALSE,

    -- Auto-renewal settings
    auto_renewal_enabled BOOLEAN DEFAULT FALSE,
    auto_renewal_reminder_days INTEGER DEFAULT 7,

    -- Notification preferences
    email_renewal_reminders BOOLEAN DEFAULT TRUE,
    email_price_alerts BOOLEAN DEFAULT FALSE,
    telegram_notifications BOOLEAN DEFAULT FALSE,
    telegram_chat_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- ============================================================================
-- 6. FUNCTIONS: Calculate Loyalty Tier
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_crypto_loyalty_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_total_payments INTEGER;
    v_total_amount DECIMAL(10, 2);
    v_tier TEXT := 'bronze';
BEGIN
    -- Get payment stats
    SELECT
        COUNT(*),
        COALESCE(SUM(amount_usdc), 0)
    INTO v_total_payments, v_total_amount
    FROM crypto_payments
    WHERE user_id = p_user_id
    AND status = 'confirmed';

    -- Determine tier
    SELECT tier INTO v_tier
    FROM loyalty_tier_definitions
    WHERE min_payments <= v_total_payments
    AND min_amount_usd <= v_total_amount
    ORDER BY discount_percent DESC
    LIMIT 1;

    RETURN COALESCE(v_tier, 'bronze');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTIONS: Update Loyalty After Payment
-- ============================================================================

CREATE OR REPLACE FUNCTION update_crypto_loyalty(p_user_id UUID, p_amount DECIMAL)
RETURNS void AS $$
DECLARE
    v_new_tier TEXT;
    v_discount INTEGER;
BEGIN
    -- Calculate new tier
    v_new_tier := calculate_crypto_loyalty_tier(p_user_id);

    -- Get discount for tier
    SELECT discount_percent INTO v_discount
    FROM loyalty_tier_definitions
    WHERE tier = v_new_tier;

    -- Upsert loyalty record
    INSERT INTO crypto_loyalty_tiers (
        user_id,
        total_payments,
        total_amount_usd,
        last_payment_at,
        tier,
        tier_updated_at,
        current_discount_percent
    )
    SELECT
        p_user_id,
        COUNT(*),
        SUM(amount_usdc),
        MAX(confirmed_at),
        v_new_tier,
        NOW(),
        v_discount
    FROM crypto_payments
    WHERE user_id = p_user_id
    AND status = 'confirmed'
    ON CONFLICT (user_id) DO UPDATE SET
        total_payments = EXCLUDED.total_payments,
        total_amount_usd = EXCLUDED.total_amount_usd,
        last_payment_at = EXCLUDED.last_payment_at,
        tier = EXCLUDED.tier,
        tier_updated_at = CASE
            WHEN crypto_loyalty_tiers.tier != EXCLUDED.tier THEN NOW()
            ELSE crypto_loyalty_tiers.tier_updated_at
        END,
        current_discount_percent = EXCLUDED.current_discount_percent,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FUNCTIONS: Create Renewal Reminder
-- ============================================================================

CREATE OR REPLACE FUNCTION create_crypto_renewal_reminder(
    p_user_id UUID,
    p_subscription_ends_at TIMESTAMPTZ,
    p_plan_code TEXT,
    p_original_price DECIMAL
)
RETURNS UUID AS $$
DECLARE
    v_reminder_id UUID;
    v_loyalty_tier TEXT;
    v_discount INTEGER;
    v_discount_code TEXT;
BEGIN
    -- Get user's loyalty tier
    SELECT tier, current_discount_percent
    INTO v_loyalty_tier, v_discount
    FROM crypto_loyalty_tiers
    WHERE user_id = p_user_id;

    -- Default to bronze if no loyalty record
    IF v_loyalty_tier IS NULL THEN
        v_loyalty_tier := 'bronze';
        v_discount := 5;
    END IF;

    -- Generate unique discount code
    v_discount_code := 'RENEW_' || UPPER(SUBSTRING(MD5(p_user_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));

    -- Create reminder
    INSERT INTO crypto_renewal_reminders (
        user_id,
        subscription_ends_at,
        plan_code,
        original_price,
        loyalty_discount_percent,
        loyalty_discount_code,
        loyalty_discount_expires_at
    ) VALUES (
        p_user_id,
        p_subscription_ends_at,
        p_plan_code,
        p_original_price,
        v_discount,
        v_discount_code,
        p_subscription_ends_at + INTERVAL '7 days'
    )
    RETURNING id INTO v_reminder_id;

    RETURN v_reminder_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. TRIGGER: Create reminder on crypto payment confirmation
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_create_crypto_renewal_reminder()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for confirmed subscription payments
    IF NEW.status = 'confirmed' AND NEW.payment_type = 'subscription' AND NEW.user_id IS NOT NULL THEN
        -- Update subscription end date
        NEW.subscription_starts_at := COALESCE(NEW.subscription_starts_at, NOW());
        NEW.subscription_ends_at := COALESCE(
            NEW.subscription_ends_at,
            NEW.subscription_starts_at + (COALESCE(NEW.subscription_period_months, 1) || ' months')::INTERVAL
        );

        -- Create renewal reminder
        PERFORM create_crypto_renewal_reminder(
            NEW.user_id,
            NEW.subscription_ends_at,
            NEW.tier,
            NEW.amount_usdc
        );

        -- Update loyalty tier
        PERFORM update_crypto_loyalty(NEW.user_id, NEW.amount_usdc);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crypto_payment_confirmed ON crypto_payments;
CREATE TRIGGER trg_crypto_payment_confirmed
    BEFORE UPDATE OF status ON crypto_payments
    FOR EACH ROW
    WHEN (OLD.status != 'confirmed' AND NEW.status = 'confirmed')
    EXECUTE FUNCTION trigger_create_crypto_renewal_reminder();

-- Also trigger on insert with confirmed status
CREATE OR REPLACE FUNCTION trigger_crypto_payment_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND NEW.payment_type = 'subscription' AND NEW.user_id IS NOT NULL THEN
        -- Set subscription dates
        NEW.subscription_starts_at := COALESCE(NEW.subscription_starts_at, NOW());
        NEW.subscription_ends_at := COALESCE(
            NEW.subscription_ends_at,
            NEW.subscription_starts_at + (COALESCE(NEW.subscription_period_months, 1) || ' months')::INTERVAL
        );

        -- Create renewal reminder (after insert)
        -- Note: This is handled by the UPDATE trigger or API
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crypto_payment_insert ON crypto_payments;
CREATE TRIGGER trg_crypto_payment_insert
    BEFORE INSERT ON crypto_payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_crypto_payment_insert();

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

ALTER TABLE crypto_renewal_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_payment_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users view own crypto renewals" ON crypto_renewal_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own crypto loyalty" ON crypto_loyalty_tiers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own crypto preferences" ON crypto_payment_preferences FOR ALL USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service full access crypto_renewal" ON crypto_renewal_reminders FOR ALL USING (true);
CREATE POLICY "Service full access crypto_loyalty" ON crypto_loyalty_tiers FOR ALL USING (true);
CREATE POLICY "Service full access crypto_preferences" ON crypto_payment_preferences FOR ALL USING (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
