-- ============================================================================
-- MIGRATION 060: VAT COMPLIANCE SYSTEM FOR INTERNATIONAL SALES
-- ============================================================================
-- Purpose: Full EU/International VAT compliance for SaaS (LLC USA with OSS)
-- Covers: Crypto + Fiat payments, B2B reverse charge, VIES validation
-- Created: 2026-01-10
-- ============================================================================

-- 1. EU VAT RATES TABLE
-- Standard rates by country for digital services, updated annually
CREATE TABLE IF NOT EXISTS eu_vat_rates (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    standard_rate DECIMAL(5, 3) NOT NULL,      -- e.g., 0.200 for 20%
    is_eu_member BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,                       -- NULL means current
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick rate lookups
CREATE INDEX IF NOT EXISTS idx_vat_rates_country ON eu_vat_rates(country_code);

-- 2. SEED EU VAT RATES (2025-2026)
INSERT INTO eu_vat_rates (country_code, country_name, standard_rate, is_eu_member) VALUES
    ('AT', 'Austria', 0.200, true),
    ('BE', 'Belgium', 0.210, true),
    ('BG', 'Bulgaria', 0.200, true),
    ('HR', 'Croatia', 0.250, true),
    ('CY', 'Cyprus', 0.190, true),
    ('CZ', 'Czech Republic', 0.210, true),
    ('DK', 'Denmark', 0.250, true),
    ('EE', 'Estonia', 0.240, true),
    ('FI', 'Finland', 0.255, true),
    ('FR', 'France', 0.200, true),
    ('DE', 'Germany', 0.190, true),
    ('GR', 'Greece', 0.240, true),
    ('HU', 'Hungary', 0.270, true),
    ('IE', 'Ireland', 0.230, true),
    ('IT', 'Italy', 0.220, true),
    ('LV', 'Latvia', 0.210, true),
    ('LT', 'Lithuania', 0.210, true),
    ('LU', 'Luxembourg', 0.170, true),
    ('MT', 'Malta', 0.180, true),
    ('NL', 'Netherlands', 0.210, true),
    ('PL', 'Poland', 0.230, true),
    ('PT', 'Portugal', 0.230, true),
    ('RO', 'Romania', 0.190, true),
    ('SK', 'Slovakia', 0.230, true),
    ('SI', 'Slovenia', 0.220, true),
    ('ES', 'Spain', 0.210, true),
    ('SE', 'Sweden', 0.250, true)
ON CONFLICT (country_code) DO UPDATE SET
    standard_rate = EXCLUDED.standard_rate,
    updated_at = NOW();

-- 3. VAT VALIDATION CACHE TABLE
-- Caches VIES validation results (EU requirement: re-validate periodically)
CREATE TABLE IF NOT EXISTS vat_validations (
    id SERIAL PRIMARY KEY,
    vat_number VARCHAR(20) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    company_name VARCHAR(500),
    company_address TEXT,
    request_identifier VARCHAR(100),
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vat_number, country_code)
);

CREATE INDEX IF NOT EXISTS idx_vat_validations_number ON vat_validations(vat_number);
CREATE INDEX IF NOT EXISTS idx_vat_validations_expires ON vat_validations(expires_at);

-- 4. BILLING PROFILES TABLE
-- Store customer billing info for VAT compliance
CREATE TABLE IF NOT EXISTS billing_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Customer type
    is_business BOOLEAN DEFAULT false,

    -- Contact info
    billing_email VARCHAR(255),
    billing_name VARCHAR(255),

    -- Company details (for B2B)
    company_name VARCHAR(255),
    vat_number VARCHAR(20),
    vat_number_validated BOOLEAN DEFAULT false,
    vat_validation_date TIMESTAMPTZ,

    -- Address
    country_code VARCHAR(2) NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    state_province VARCHAR(100),

    -- Tax status
    is_eu_customer BOOLEAN DEFAULT false,
    vat_exempt BOOLEAN DEFAULT false,
    applicable_vat_rate DECIMAL(5, 3),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_profiles_vat ON billing_profiles(vat_number);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_country ON billing_profiles(country_code);

-- 5. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,

    -- Links
    user_id UUID REFERENCES users(id),
    billing_profile_id UUID REFERENCES billing_profiles(id),
    payment_id UUID,
    payment_type VARCHAR(20),

    -- Invoice type
    invoice_type VARCHAR(20) DEFAULT 'invoice',

    -- Seller info (SafeScoring)
    seller_name VARCHAR(255) NOT NULL DEFAULT 'SafeScoring LLC',
    seller_address TEXT DEFAULT 'Wyoming, United States',
    seller_country VARCHAR(2) DEFAULT 'US',
    seller_vat_number VARCHAR(20),

    -- Buyer info
    buyer_name VARCHAR(255) NOT NULL,
    buyer_company VARCHAR(255),
    buyer_address TEXT,
    buyer_country VARCHAR(2) NOT NULL,
    buyer_vat_number VARCHAR(20),
    buyer_email VARCHAR(255),

    -- Line items
    line_items JSONB NOT NULL,

    -- Totals
    subtotal_amount DECIMAL(18, 2) NOT NULL,
    vat_amount DECIMAL(18, 2) DEFAULT 0,
    total_amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- VAT details
    vat_rate DECIMAL(5, 3),
    vat_treatment VARCHAR(50) NOT NULL,
    reverse_charge_note TEXT,

    -- Dates
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    payment_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'draft',

    -- PDF storage
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 6. INVOICE NUMBER SEQUENCE
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- 7. TRIGGER: Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' ||
                              LPAD(nextval('invoice_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoice_number ON invoices;
CREATE TRIGGER trigger_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- 8. CREATE CRYPTO_PAYMENTS TABLE (if not exists) + VAT columns
CREATE TABLE IF NOT EXISTS crypto_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    wallet_address VARCHAR(100),
    chain_id INTEGER DEFAULT 137,
    tx_hash VARCHAR(100) UNIQUE,
    amount_usdc DECIMAL(18, 6),
    payment_type VARCHAR(50) DEFAULT 'subscription',
    tier VARCHAR(50),
    order_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- VAT columns
    billing_profile_id UUID REFERENCES billing_profiles(id),
    customer_country VARCHAR(2),
    customer_name VARCHAR(255),
    is_business BOOLEAN DEFAULT false,
    vat_number VARCHAR(20),
    vat_validated BOOLEAN DEFAULT false,
    vat_rate DECIMAL(5, 3) DEFAULT 0,
    amount_net DECIMAL(18, 2),
    vat_amount DECIMAL(18, 2),
    vat_treatment VARCHAR(50),
    invoice_number VARCHAR(50),
    invoice_generated_at TIMESTAMPTZ
);

-- Add VAT columns to existing crypto_payments if table existed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crypto_payments') THEN
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS billing_profile_id UUID REFERENCES billing_profiles(id);
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS customer_country VARCHAR(2);
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false;
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS vat_number VARCHAR(20);
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS vat_validated BOOLEAN DEFAULT false;
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5, 3) DEFAULT 0;
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS amount_net DECIMAL(18, 2);
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(18, 2);
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS vat_treatment VARCHAR(50);
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
        ALTER TABLE crypto_payments ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crypto_payments_user ON crypto_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_tx ON crypto_payments(tx_hash);

-- 9. CREATE FIAT_PAYMENTS TABLE (if not exists) + VAT columns
CREATE TABLE IF NOT EXISTS fiat_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(50) DEFAULT 'lemonsqueezy',
    provider_payment_id VARCHAR(255),
    amount DECIMAL(18, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(50) DEFAULT 'subscription',
    tier VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- VAT columns
    billing_profile_id UUID REFERENCES billing_profiles(id),
    customer_country VARCHAR(2),
    customer_name VARCHAR(255),
    is_business BOOLEAN DEFAULT false,
    vat_number VARCHAR(20),
    vat_validated BOOLEAN DEFAULT false,
    vat_treatment VARCHAR(50),
    invoice_number VARCHAR(50) UNIQUE,
    invoice_generated_at TIMESTAMPTZ
);

-- Add VAT columns to existing fiat_payments if table existed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiat_payments') THEN
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS billing_profile_id UUID REFERENCES billing_profiles(id);
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS customer_country VARCHAR(2);
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false;
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS vat_number VARCHAR(20);
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS vat_validated BOOLEAN DEFAULT false;
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS vat_treatment VARCHAR(50);
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
        ALTER TABLE fiat_payments ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fiat_payments_user ON fiat_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_fiat_payments_status ON fiat_payments(status);

-- 9b. WEBHOOK_EVENTS TABLE (for idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100),
    provider VARCHAR(50),
    payload_hash VARCHAR(255),
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_key ON webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);

-- 9c. SUBSCRIPTIONS TABLE (for user access tracking)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lemon_squeezy_id VARCHAR(255),
    plan_name VARCHAR(100),
    plan_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    renews_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 10. VIEW: VAT Summary for OSS Reporting
CREATE OR REPLACE VIEW v_vat_oss_report AS
SELECT
    DATE_TRUNC('quarter', i.invoice_date) AS quarter,
    i.buyer_country,
    i.vat_treatment,
    i.vat_rate,
    COUNT(*) AS transaction_count,
    SUM(i.subtotal_amount) AS total_net_amount,
    SUM(i.vat_amount) AS total_vat_collected,
    SUM(i.total_amount) AS total_gross_amount,
    i.currency
FROM invoices i
WHERE i.status IN ('issued', 'paid')
  AND i.vat_treatment = 'standard'
  AND i.buyer_country IN (SELECT country_code FROM eu_vat_rates WHERE is_eu_member = true)
GROUP BY
    DATE_TRUNC('quarter', i.invoice_date),
    i.buyer_country,
    i.vat_treatment,
    i.vat_rate,
    i.currency
ORDER BY quarter DESC, buyer_country;

-- 11. VIEW: Monthly Revenue by VAT Treatment
CREATE OR REPLACE VIEW v_revenue_by_vat_treatment AS
SELECT
    DATE_TRUNC('month', i.invoice_date) AS month,
    i.vat_treatment,
    COUNT(*) AS invoice_count,
    SUM(i.subtotal_amount) AS total_net,
    SUM(i.vat_amount) AS total_vat,
    SUM(i.total_amount) AS total_gross
FROM invoices i
WHERE i.status IN ('issued', 'paid')
GROUP BY DATE_TRUNC('month', i.invoice_date), i.vat_treatment
ORDER BY month DESC, vat_treatment;

-- 12. FUNCTION: Get VAT rate for a country
CREATE OR REPLACE FUNCTION get_vat_rate(p_country_code VARCHAR(2))
RETURNS DECIMAL(5, 3) AS $$
DECLARE
    v_rate DECIMAL(5, 3);
BEGIN
    SELECT standard_rate INTO v_rate
    FROM eu_vat_rates
    WHERE country_code = p_country_code
      AND is_eu_member = true
      AND (effective_until IS NULL OR effective_until > CURRENT_DATE);

    RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- 13. FUNCTION: Determine VAT treatment
CREATE OR REPLACE FUNCTION determine_vat_treatment(
    p_customer_country VARCHAR(2),
    p_is_business BOOLEAN,
    p_vat_valid BOOLEAN
)
RETURNS TABLE (
    treatment VARCHAR(50),
    rate DECIMAL(5, 3),
    description TEXT
) AS $$
DECLARE
    v_is_eu BOOLEAN;
    v_rate DECIMAL(5, 3);
BEGIN
    -- Check if EU country
    SELECT EXISTS(
        SELECT 1 FROM eu_vat_rates
        WHERE country_code = p_customer_country AND is_eu_member = true
    ) INTO v_is_eu;

    IF NOT v_is_eu THEN
        -- Non-EU: Export exempt
        RETURN QUERY SELECT
            'export_exempt'::VARCHAR(50),
            0::DECIMAL(5, 3),
            'Outside EU - No VAT applicable'::TEXT;
        RETURN;
    END IF;

    IF p_is_business AND p_vat_valid THEN
        -- B2B EU with valid VAT: Reverse charge
        RETURN QUERY SELECT
            'reverse_charge'::VARCHAR(50),
            0::DECIMAL(5, 3),
            'EU B2B - Reverse charge mechanism (Art. 196 Directive 2006/112/EC)'::TEXT;
        RETURN;
    END IF;

    -- B2C EU or B2B without valid VAT: Standard rate
    v_rate := get_vat_rate(p_customer_country);
    RETURN QUERY SELECT
        'standard'::VARCHAR(50),
        v_rate,
        ('EU ' || CASE WHEN p_is_business THEN 'B2B (no valid VAT)' ELSE 'B2C' END ||
         ' - ' || (v_rate * 100)::TEXT || '% VAT')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 14. RLS POLICIES
ALTER TABLE billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_validations ENABLE ROW LEVEL SECURITY;

-- Users can see their own billing profile
CREATE POLICY "Users can view own billing_profile"
ON billing_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can see their own invoices
CREATE POLICY "Users can view own invoices"
ON invoices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role manages billing_profiles"
ON billing_profiles FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role manages invoices"
ON invoices FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role manages vat_validations"
ON vat_validations FOR ALL
TO service_role
USING (true);

-- VAT rates are public read
CREATE POLICY "Anyone can read VAT rates"
ON eu_vat_rates FOR SELECT
TO anon, authenticated
USING (true);

-- Comments
COMMENT ON TABLE eu_vat_rates IS 'EU VAT rates by country for digital services (OSS compliance)';
COMMENT ON TABLE vat_validations IS 'Cache of VIES VAT number validations (30 day TTL)';
COMMENT ON TABLE billing_profiles IS 'Customer billing info for VAT compliance';
COMMENT ON TABLE invoices IS 'Full invoice records for accounting and OSS reporting';
COMMENT ON VIEW v_vat_oss_report IS 'Quarterly OSS report by country for EU tax filing';
COMMENT ON FUNCTION get_vat_rate IS 'Get current VAT rate for a country code';
COMMENT ON FUNCTION determine_vat_treatment IS 'Determine VAT treatment based on customer location and business status';
