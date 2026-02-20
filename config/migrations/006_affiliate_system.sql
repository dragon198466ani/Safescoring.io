-- ============================================
-- SafeScoring Affiliate System
-- Migration 006
-- ============================================

-- Affiliate accounts
CREATE TABLE IF NOT EXISTS affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255),
    website VARCHAR(500),
    commission_rate DECIMAL(5, 2) DEFAULT 20.00, -- 20% default
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, suspended
    payout_method VARCHAR(50), -- paypal, crypto, bank
    payout_details JSONB DEFAULT '{}',
    total_referrals INT DEFAULT 0,
    total_conversions INT DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    pending_payout DECIMAL(12, 2) DEFAULT 0,
    lifetime_payout DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    last_payout_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Referral clicks/visits
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    visitor_id VARCHAR(64), -- Hashed IP or fingerprint
    referrer_url TEXT,
    landing_page TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    country VARCHAR(2),
    device VARCHAR(20),
    browser VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral conversions
CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    click_id UUID REFERENCES affiliate_clicks(id),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- signup, subscription, api_key, upgrade
    value DECIMAL(12, 2) DEFAULT 0, -- Transaction value
    commission DECIMAL(12, 2) DEFAULT 0, -- Calculated commission
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Affiliate payouts
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    transaction_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Affiliate links/campaigns
CREATE TABLE IF NOT EXISTS affiliate_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    landing_page VARCHAR(500) DEFAULT '/',
    is_active BOOLEAN DEFAULT true,
    clicks INT DEFAULT 0,
    conversions INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created ON affiliate_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate ON affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON affiliate_conversions(status);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_affiliate ON affiliate_campaigns(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON affiliate_campaigns(slug);

-- Function to generate affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result VARCHAR(20) := '';
    i INT;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate affiliate code
CREATE OR REPLACE FUNCTION set_affiliate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        LOOP
            NEW.code := generate_affiliate_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM affiliates WHERE code = NEW.code);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_affiliate_code ON affiliates;
CREATE TRIGGER trigger_set_affiliate_code
    BEFORE INSERT ON affiliates
    FOR EACH ROW
    EXECUTE FUNCTION set_affiliate_code();

-- Function to update affiliate stats on conversion
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE affiliates
        SET total_conversions = total_conversions + 1,
            total_earnings = total_earnings + NEW.commission,
            pending_payout = pending_payout + NEW.commission
        WHERE id = NEW.affiliate_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE affiliates
        SET pending_payout = pending_payout - NEW.commission,
            lifetime_payout = lifetime_payout + NEW.commission
        WHERE id = NEW.affiliate_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_affiliate_stats ON affiliate_conversions;
CREATE TRIGGER trigger_update_affiliate_stats
    AFTER INSERT OR UPDATE ON affiliate_conversions
    FOR EACH ROW
    EXECUTE FUNCTION update_affiliate_stats();

-- Function to track click and update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_clicks()
RETURNS TRIGGER AS $$
BEGIN
    -- Update affiliate referrals count
    UPDATE affiliates
    SET total_referrals = total_referrals + 1
    WHERE id = NEW.affiliate_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaign_clicks ON affiliate_clicks;
CREATE TRIGGER trigger_update_campaign_clicks
    AFTER INSERT ON affiliate_clicks
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_clicks();

-- RLS Policies
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_campaigns ENABLE ROW LEVEL SECURITY;

-- Users can only see their own affiliate data
CREATE POLICY affiliates_user_policy ON affiliates
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY clicks_affiliate_policy ON affiliate_clicks
    FOR ALL USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY conversions_affiliate_policy ON affiliate_conversions
    FOR ALL USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY payouts_affiliate_policy ON affiliate_payouts
    FOR ALL USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY campaigns_affiliate_policy ON affiliate_campaigns
    FOR ALL USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));
