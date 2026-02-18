-- Migration 102: Certification Program
-- SafeScoring B2B Certification System
--
-- Tables:
-- - certification_applications: B2B certification requests
-- - certification_badges: Active certification badges
-- - certification_evaluations: Re-evaluation history
-- - certification_invoices: Billing records

-- ============================================================================
-- CERTIFICATION APPLICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,

    -- Tier: starter ($990/mo), verified ($2990/mo), enterprise ($9990/mo)
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('starter', 'verified', 'enterprise')),

    -- Company information
    company_name VARCHAR(200) NOT NULL,
    company_website VARCHAR(500),
    company_size VARCHAR(50), -- startup, small, medium, large, enterprise
    contact_name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(50),
    billing_address JSONB,
    vat_number VARCHAR(50),

    -- Application details
    reason TEXT, -- Why they want certification
    expected_use TEXT, -- How they plan to use it
    marketing_consent BOOLEAN DEFAULT FALSE,

    -- Status workflow
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Just submitted
        'payment_pending',   -- Awaiting payment
        'payment_received',  -- Payment confirmed
        'evaluating',        -- Evaluation in progress
        'review',            -- Manual review needed
        'approved',          -- Certification granted
        'rejected',          -- Application rejected
        'expired',           -- Certification expired
        'cancelled'          -- Cancelled by user
    )),

    -- Payment
    payment_provider VARCHAR(20) DEFAULT 'lemonsqueezy',
    payment_id VARCHAR(100),
    subscription_id VARCHAR(100),
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    amount_paid DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    paid_at TIMESTAMP WITH TIME ZONE,
    next_billing_at TIMESTAMP WITH TIME ZONE,

    -- Evaluation
    evaluation_started_at TIMESTAMP WITH TIME ZONE,
    evaluation_completed_at TIMESTAMP WITH TIME ZONE,
    final_score DECIMAL(5,2),
    pillar_scores JSONB, -- {s: 80, a: 75, f: 85, e: 70}
    evaluation_notes TEXT,
    evaluation_passed BOOLEAN,

    -- Review (for manual review cases)
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    rejection_reason TEXT,

    -- Certification details
    certificate_number VARCHAR(50) UNIQUE,
    certificate_issued_at TIMESTAMP WITH TIME ZONE,
    certificate_expires_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(product_id, status) -- One active application per product
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cert_applications_user ON certification_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_applications_product ON certification_applications(product_id);
CREATE INDEX IF NOT EXISTS idx_cert_applications_status ON certification_applications(status);
CREATE INDEX IF NOT EXISTS idx_cert_applications_tier ON certification_applications(tier);

-- ============================================================================
-- CERTIFICATION BADGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certification_id UUID REFERENCES certification_applications(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) NOT NULL,

    -- Badge configuration
    tier VARCHAR(20) NOT NULL,
    badge_style VARCHAR(30) DEFAULT 'default', -- default, minimal, premium, dark
    show_score BOOLEAN DEFAULT TRUE,
    show_tier BOOLEAN DEFAULT TRUE,
    custom_label VARCHAR(100), -- Optional custom text

    -- URLs
    badge_url VARCHAR(500), -- SVG badge URL
    verification_url VARCHAR(500), -- Verify page URL
    embed_code TEXT, -- HTML embed snippet

    -- Validity
    is_active BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,

    -- Current score (updated on re-evaluation)
    current_score DECIMAL(5,2),
    last_score_update TIMESTAMP WITH TIME ZONE,

    -- Statistics
    impression_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    unique_domains JSONB DEFAULT '[]'::jsonb, -- Domains where badge is displayed

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_badges_product ON certification_badges(product_id);
CREATE INDEX IF NOT EXISTS idx_cert_badges_active ON certification_badges(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- CERTIFICATION EVALUATIONS (Re-evaluation history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certification_id UUID REFERENCES certification_applications(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES certification_badges(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) NOT NULL,

    -- Evaluation type
    evaluation_type VARCHAR(30) NOT NULL CHECK (evaluation_type IN (
        'initial',      -- First evaluation
        'scheduled',    -- Scheduled re-evaluation
        'manual',       -- Triggered manually
        'incident',     -- Triggered by incident
        'score_drop'    -- Triggered by score drop
    )),

    -- Results
    score_before DECIMAL(5,2),
    score_after DECIMAL(5,2),
    pillar_scores_before JSONB,
    pillar_scores_after JSONB,
    score_change DECIMAL(5,2) GENERATED ALWAYS AS (score_after - score_before) STORED,

    -- Analysis
    norms_changed INTEGER DEFAULT 0, -- Number of norms that changed
    critical_changes JSONB, -- Critical changes detected
    recommendations TEXT,

    -- Outcome
    passed BOOLEAN NOT NULL,
    action_taken VARCHAR(50), -- none, warning, suspension, revocation
    action_reason TEXT,

    -- Notification
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_evaluations_cert ON certification_evaluations(certification_id);
CREATE INDEX IF NOT EXISTS idx_cert_evaluations_product ON certification_evaluations(product_id);
CREATE INDEX IF NOT EXISTS idx_cert_evaluations_date ON certification_evaluations(evaluated_at);

-- ============================================================================
-- CERTIFICATION INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certification_id UUID REFERENCES certification_applications(id),
    user_id UUID REFERENCES auth.users(id) NOT NULL,

    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Items
    line_items JSONB NOT NULL, -- [{description, quantity, unit_price, amount}]

    -- Payment
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),

    -- PDF
    pdf_url VARCHAR(500),
    pdf_generated_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_invoices_user ON certification_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_invoices_status ON certification_invoices(status);

-- ============================================================================
-- PRICING CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS certification_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR(20) NOT NULL UNIQUE,

    -- Monthly pricing
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL, -- Annual with discount

    -- Features
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    reevaluation_frequency_days INTEGER NOT NULL, -- 90 for starter, 30 for verified, 7 for enterprise

    -- Limits
    max_badge_impressions INTEGER, -- NULL = unlimited
    api_access BOOLEAN DEFAULT FALSE,
    white_label_reports BOOLEAN DEFAULT FALSE,
    dedicated_support BOOLEAN DEFAULT FALSE,

    -- Display
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_popular BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed pricing data
INSERT INTO certification_pricing (tier, price_monthly, price_yearly, reevaluation_frequency_days, display_name, features, is_popular, sort_order, api_access, white_label_reports, dedicated_support)
VALUES
    ('starter', 990, 9500, 90, 'Starter', '["SAFE evaluation on all norms", "Public score display", "Quarterly re-evaluation", "Basic security roadmap", "Email support"]'::jsonb, FALSE, 1, FALSE, FALSE, FALSE),
    ('verified', 2990, 28700, 30, 'Verified', '["Everything in Starter", "Verified Badge (animated)", "Monthly re-evaluation", "Priority directory listing", "Dedicated account manager", "Custom recommendations"]'::jsonb, TRUE, 2, FALSE, TRUE, FALSE),
    ('enterprise', 9990, 95900, 7, 'Enterprise', '["Everything in Verified", "Enterprise Badge (premium)", "Weekly monitoring", "Custom scoring criteria", "White-label reports", "API access", "Board-ready reports", "24/7 priority support"]'::jsonb, FALSE, 3, TRUE, TRUE, TRUE)
ON CONFLICT (tier) DO UPDATE SET
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    features = EXCLUDED.features,
    reevaluation_frequency_days = EXCLUDED.reevaluation_frequency_days;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    year_part VARCHAR(4);
    random_part VARCHAR(8);
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::VARCHAR;
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 8));
    RETURN 'SAFE-' || year_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate certificate number on approval
CREATE OR REPLACE FUNCTION trigger_generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        NEW.certificate_number := generate_certificate_number();
        NEW.certificate_issued_at := NOW();
        -- Set expiry based on billing cycle
        IF NEW.billing_cycle = 'yearly' THEN
            NEW.certificate_expires_at := NOW() + INTERVAL '1 year';
        ELSE
            NEW.certificate_expires_at := NOW() + INTERVAL '1 month';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cert_number ON certification_applications;
CREATE TRIGGER trigger_cert_number
    BEFORE UPDATE ON certification_applications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_certificate_number();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_certification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cert_app_updated ON certification_applications;
CREATE TRIGGER trigger_cert_app_updated
    BEFORE UPDATE ON certification_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_certification_timestamp();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active certifications view
CREATE OR REPLACE VIEW active_certifications AS
SELECT
    ca.id,
    ca.product_id,
    p.name AS product_name,
    p.slug AS product_slug,
    ca.tier,
    ca.company_name,
    ca.certificate_number,
    ca.certificate_issued_at,
    ca.certificate_expires_at,
    ca.final_score,
    cb.badge_url,
    cb.verification_url,
    cb.impression_count,
    cb.click_count
FROM certification_applications ca
JOIN products p ON p.id = ca.product_id
LEFT JOIN certification_badges cb ON cb.certification_id = ca.id AND cb.is_active = TRUE
WHERE ca.status = 'approved'
AND ca.certificate_expires_at > NOW();

-- Certifications due for re-evaluation
CREATE OR REPLACE VIEW certifications_due_reevaluation AS
SELECT
    ca.id AS certification_id,
    ca.product_id,
    p.name AS product_name,
    ca.tier,
    cp.reevaluation_frequency_days,
    ca.certificate_issued_at,
    COALESCE(
        (SELECT MAX(evaluated_at) FROM certification_evaluations ce WHERE ce.certification_id = ca.id),
        ca.certificate_issued_at
    ) AS last_evaluation,
    COALESCE(
        (SELECT MAX(evaluated_at) FROM certification_evaluations ce WHERE ce.certification_id = ca.id),
        ca.certificate_issued_at
    ) + (cp.reevaluation_frequency_days || ' days')::interval AS next_evaluation_due
FROM certification_applications ca
JOIN products p ON p.id = ca.product_id
JOIN certification_pricing cp ON cp.tier = ca.tier
WHERE ca.status = 'approved'
AND ca.certificate_expires_at > NOW()
AND (
    COALESCE(
        (SELECT MAX(evaluated_at) FROM certification_evaluations ce WHERE ce.certification_id = ca.id),
        ca.certificate_issued_at
    ) + (cp.reevaluation_frequency_days || ' days')::interval
) <= NOW();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE certification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
    ON certification_applications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create applications
CREATE POLICY "Users can create applications"
    ON certification_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own badges
CREATE POLICY "Users can view own badges"
    ON certification_badges FOR SELECT
    USING (
        certification_id IN (
            SELECT id FROM certification_applications WHERE user_id = auth.uid()
        )
    );

-- Public can view active badges (for verification)
CREATE POLICY "Public can view active badges"
    ON certification_badges FOR SELECT
    USING (is_active = TRUE);

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
    ON certification_invoices FOR SELECT
    USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access on certification_applications"
    ON certification_applications FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on certification_badges"
    ON certification_badges FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on certification_evaluations"
    ON certification_evaluations FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on certification_invoices"
    ON certification_invoices FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE certification_applications IS 'B2B certification applications with payment and evaluation tracking';
COMMENT ON TABLE certification_badges IS 'Active certification badges displayed on product websites';
COMMENT ON TABLE certification_evaluations IS 'History of certification re-evaluations';
COMMENT ON TABLE certification_invoices IS 'Billing records for certification subscriptions';
COMMENT ON TABLE certification_pricing IS 'Pricing tiers and features for certification program';
