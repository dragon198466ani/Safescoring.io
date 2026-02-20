-- ============================================
-- SafeScoring Verified Badge System
-- Migration 007
--
-- Simple verified badge - proves score authenticity
-- Value: Dynamic SVG, click-to-verify, real-time, API flag
--
-- Pricing: $19/month or $190/year
-- ============================================

-- Verified badges table
CREATE TABLE IF NOT EXISTS verified_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_slug VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),

    -- Status
    is_active BOOLEAN DEFAULT false,

    -- Subscription
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    price_paid DECIMAL(10, 2),

    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    -- Payment (Stripe)
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),

    -- Customization
    badge_style VARCHAR(20) DEFAULT 'default', -- default, minimal, dark

    metadata JSONB DEFAULT '{}'
);

-- Badge embed tracking (for stats)
CREATE TABLE IF NOT EXISTS badge_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_id UUID REFERENCES verified_badges(id) ON DELETE CASCADE,
    domain VARCHAR(255),
    page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verified_badges_slug ON verified_badges(product_slug);
CREATE INDEX IF NOT EXISTS idx_verified_badges_active ON verified_badges(is_active);
CREATE INDEX IF NOT EXISTS idx_verified_badges_expires ON verified_badges(expires_at);
CREATE INDEX IF NOT EXISTS idx_badge_impressions_badge ON badge_impressions(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_impressions_date ON badge_impressions(created_at);

-- Auto-expire badges
CREATE OR REPLACE FUNCTION check_badge_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() THEN
        NEW.is_active := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_badge_expiry ON verified_badges;
CREATE TRIGGER trigger_check_badge_expiry
    BEFORE UPDATE ON verified_badges
    FOR EACH ROW
    EXECUTE FUNCTION check_badge_expiry();

-- RLS
ALTER TABLE verified_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_impressions ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a badge is active (for verification)
CREATE POLICY badges_public_read ON verified_badges
    FOR SELECT USING (is_active = true);

-- Users manage their own badges
CREATE POLICY badges_user_policy ON verified_badges
    FOR ALL USING (user_id = auth.uid());

-- Drop old certification tables if they exist
DROP TABLE IF EXISTS certification_verifications CASCADE;
DROP TABLE IF EXISTS certifications CASCADE;
DROP TABLE IF EXISTS certification_tiers CASCADE;
