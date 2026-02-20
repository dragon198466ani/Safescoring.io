-- Migration 200: Newsletter System + Audit Requests
-- Revenue features: SAFE Weekly newsletter + DeFi audit requests

-- =====================================================
-- NEWSLETTER SYSTEM
-- =====================================================

-- Newsletters table (generated content)
CREATE TABLE IF NOT EXISTS newsletters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    content_text TEXT,
    content_premium_html TEXT, -- Premium version with full content
    stats JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'sent', 'failed')),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    recipient_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_premium column to newsletter_subscribers if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsletter_subscribers'
        AND column_name = 'is_premium'
    ) THEN
        ALTER TABLE newsletter_subscribers ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Newsletter tracking (opens, clicks)
CREATE TABLE IF NOT EXISTS newsletter_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    newsletter_id UUID REFERENCES newsletters(id) ON DELETE CASCADE,
    subscriber_email TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click', 'unsubscribe', 'bounce', 'complaint')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for newsletter
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_scheduled ON newsletters(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_newsletter_events_newsletter ON newsletter_events(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_type ON newsletter_events(event_type, created_at);

-- =====================================================
-- AUDIT REQUESTS (Quick 1k/day revenue)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT UNIQUE NOT NULL,

    -- Project info
    project_name TEXT NOT NULL,
    project_url TEXT NOT NULL,
    project_type TEXT DEFAULT 'other' CHECK (project_type IN ('defi', 'wallet', 'exchange', 'bridge', 'nft', 'other')),
    description TEXT,

    -- Contact info
    email TEXT NOT NULL,
    telegram TEXT,
    twitter TEXT,

    -- Pricing
    tier TEXT NOT NULL CHECK (tier IN ('express', 'standard', 'premium')),
    price INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),

    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- New request
        'contacted',    -- We've reached out
        'paid',         -- Payment received
        'in_progress',  -- Audit underway
        'review',       -- Internal review
        'completed',    -- Delivered
        'cancelled',    -- Cancelled/refunded
        'expired'       -- No response
    )),

    -- Audit results
    product_id UUID REFERENCES products(id),
    final_score INTEGER,
    report_url TEXT,
    badge_issued BOOLEAN DEFAULT FALSE,

    -- Payment tracking
    payment_method TEXT,
    payment_id TEXT,
    paid_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    contacted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Notes
    internal_notes TEXT
);

-- Indexes for audit requests
CREATE INDEX IF NOT EXISTS idx_audit_requests_status ON audit_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_requests_email ON audit_requests(email);
CREATE INDEX IF NOT EXISTS idx_audit_requests_created ON audit_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_requests_reference ON audit_requests(reference);

-- =====================================================
-- SPONSORSHIP TRACKING (Newsletter + Featured)
-- =====================================================

CREATE TABLE IF NOT EXISTS sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sponsor info
    sponsor_name TEXT NOT NULL,
    sponsor_email TEXT NOT NULL,
    sponsor_url TEXT,

    -- Sponsorship details
    type TEXT NOT NULL CHECK (type IN (
        'newsletter',       -- Newsletter feature ($500-2000)
        'featured',         -- Featured product listing ($1000/mo)
        'banner',           -- Website banner ($2000/mo)
        'comparison'        -- Comparison page feature ($500)
    )),

    -- Product being promoted (if applicable)
    product_id UUID REFERENCES products(id),

    -- Pricing
    price INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',

    -- Schedule
    start_date DATE,
    end_date DATE,

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),

    -- Content
    ad_copy TEXT,
    ad_image_url TEXT,

    -- Payment
    payment_id TEXT,
    paid_at TIMESTAMPTZ,

    -- Metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_type ON sponsorships(type);
CREATE INDEX IF NOT EXISTS idx_sponsorships_dates ON sponsorships(start_date, end_date) WHERE status = 'active';

-- =====================================================
-- TRIGGER: Update timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to new tables
DROP TRIGGER IF EXISTS update_newsletters_updated_at ON newsletters;
CREATE TRIGGER update_newsletters_updated_at
    BEFORE UPDATE ON newsletters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audit_requests_updated_at ON audit_requests;
CREATE TRIGGER update_audit_requests_updated_at
    BEFORE UPDATE ON audit_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sponsorships_updated_at ON sponsorships;
CREATE TRIGGER update_sponsorships_updated_at
    BEFORE UPDATE ON sponsorships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access to newsletters" ON newsletters
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to newsletter_events" ON newsletter_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to audit_requests" ON audit_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to sponsorships" ON sponsorships
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE newsletters IS 'Generated newsletter content for SAFE Weekly';
COMMENT ON TABLE audit_requests IS 'DeFi audit requests - quick 1k/day revenue source';
COMMENT ON TABLE sponsorships IS 'Paid sponsorships for newsletter and website features';

COMMENT ON COLUMN audit_requests.tier IS 'express=$500/24h, standard=$1000/48h, premium=$2000/72h';
COMMENT ON COLUMN audit_requests.urgency IS 'urgent adds 20% to price';
