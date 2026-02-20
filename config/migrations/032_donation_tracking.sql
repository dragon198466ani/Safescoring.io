-- =====================================================
-- DONATION TRACKING SYSTEM
-- Migration 032: Track donations from crypto and fiat sources
-- =====================================================

-- =====================================================
-- 1. DONATIONS TABLE
-- Tracks all donations from any source
-- =====================================================

CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Amount
    amount_usd DECIMAL(12,2) NOT NULL,
    amount_original DECIMAL(18,8), -- Original amount in source currency
    currency VARCHAR(10) NOT NULL, -- 'USD', 'EUR', 'BTC', 'ETH', etc.

    -- Source information
    source VARCHAR(30) NOT NULL CHECK (source IN ('crypto_btc', 'crypto_eth', 'fiat_stripe', 'fiat_lemonsqueezy', 'fiat_buymeacoffee', 'manual')),

    -- Blockchain details (for crypto donations)
    tx_hash VARCHAR(100),
    from_address VARCHAR(100),
    to_address VARCHAR(100),
    block_number BIGINT,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    network VARCHAR(20), -- 'bitcoin', 'ethereum', 'polygon', etc.

    -- Fiat details
    payment_provider VARCHAR(50),
    payment_id VARCHAR(100),

    -- Supporter info (optional, for recognition)
    supporter_email VARCHAR(255),
    supporter_name VARCHAR(100),
    supporter_message TEXT,
    is_anonymous BOOLEAN DEFAULT TRUE,

    -- User association (if logged in)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_donations_source ON donations(source);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_tx_hash ON donations(tx_hash);
CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);

-- Unique constraint to prevent duplicate blockchain transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_unique_tx ON donations(tx_hash, network) WHERE tx_hash IS NOT NULL;

-- Unique constraint to prevent duplicate fiat payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_unique_fiat ON donations(payment_id, payment_provider) WHERE payment_id IS NOT NULL;

-- =====================================================
-- 2. DONATION ADDRESSES TABLE
-- Tracks wallet addresses to monitor
-- =====================================================

CREATE TABLE IF NOT EXISTS donation_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    network VARCHAR(20) NOT NULL, -- 'bitcoin', 'ethereum'
    address VARCHAR(100) NOT NULL,
    label VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,

    -- Last sync info
    last_synced_at TIMESTAMP WITH TIME ZONE,
    last_synced_block BIGINT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_addresses_unique ON donation_addresses(network, address);

-- Insert default addresses (update with your real addresses)
INSERT INTO donation_addresses (network, address, label) VALUES
    ('bitcoin', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Main BTC Donation Address'),
    ('ethereum', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD05', 'Main ETH Donation Address')
ON CONFLICT (network, address) DO NOTHING;

-- =====================================================
-- 3. DONATION MILESTONES TABLE
-- Track milestone progress and achievements
-- =====================================================

CREATE TABLE IF NOT EXISTS donation_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    goal_amount DECIMAL(12,2) NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),

    -- Status
    is_reached BOOLEAN DEFAULT FALSE,
    reached_at TIMESTAMP WITH TIME ZONE,

    -- Order
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default milestones
INSERT INTO donation_milestones (goal_amount, label, description, icon, sort_order) VALUES
    (5000, 'Serveurs dedies', 'Infrastructure dediee pour une meilleure performance', 'server', 1),
    (15000, 'API publique', 'API ouverte pour les developpeurs et integrateurs', 'code', 2),
    (30000, 'App mobile', 'Application iOS et Android native', 'mobile', 3),
    (50000, 'Audit externe', 'Audit de securite par une firme independante', 'shield', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. MATERIALIZED VIEW: Donation Stats
-- Pre-calculated stats for fast queries
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS donation_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'confirmed') as total_donations,
    COUNT(DISTINCT COALESCE(user_id::text, supporter_email, from_address)) FILTER (WHERE status = 'confirmed') as unique_supporters,
    COALESCE(SUM(amount_usd) FILTER (WHERE status = 'confirmed'), 0) as total_amount_usd,

    -- By source
    COALESCE(SUM(amount_usd) FILTER (WHERE source LIKE 'crypto_%' AND status = 'confirmed'), 0) as crypto_total,
    COALESCE(SUM(amount_usd) FILTER (WHERE source LIKE 'fiat_%' AND status = 'confirmed'), 0) as fiat_total,

    -- By currency
    COALESCE(SUM(amount_usd) FILTER (WHERE source = 'crypto_btc' AND status = 'confirmed'), 0) as btc_total,
    COALESCE(SUM(amount_usd) FILTER (WHERE source = 'crypto_eth' AND status = 'confirmed'), 0) as eth_total,

    -- Recent activity
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'confirmed') as donations_last_30_days,
    COALESCE(SUM(amount_usd) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'confirmed'), 0) as amount_last_30_days,

    -- Top donation
    COALESCE(MAX(amount_usd) FILTER (WHERE status = 'confirmed'), 0) as largest_donation,

    -- Average
    COALESCE(AVG(amount_usd) FILTER (WHERE status = 'confirmed'), 0) as average_donation,

    NOW() as calculated_at
FROM donations;

CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_stats_singleton ON donation_stats(calculated_at);

-- =====================================================
-- 5. FUNCTION: Refresh donation stats
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_donation_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY donation_stats;

    -- Update milestone status
    UPDATE donation_milestones m
    SET
        is_reached = TRUE,
        reached_at = COALESCE(reached_at, NOW())
    FROM (SELECT total_amount_usd FROM donation_stats LIMIT 1) s
    WHERE m.goal_amount <= s.total_amount_usd
      AND m.is_reached = FALSE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNCTION: Record crypto donation
-- Called by the blockchain sync job
-- =====================================================

CREATE OR REPLACE FUNCTION record_crypto_donation(
    p_tx_hash VARCHAR,
    p_from_address VARCHAR,
    p_to_address VARCHAR,
    p_amount_original DECIMAL,
    p_amount_usd DECIMAL,
    p_currency VARCHAR,
    p_network VARCHAR,
    p_block_number BIGINT,
    p_block_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS UUID AS $$
DECLARE
    v_donation_id UUID;
BEGIN
    INSERT INTO donations (
        tx_hash,
        from_address,
        to_address,
        amount_original,
        amount_usd,
        currency,
        source,
        network,
        block_number,
        block_timestamp,
        status
    ) VALUES (
        p_tx_hash,
        p_from_address,
        p_to_address,
        p_amount_original,
        p_amount_usd,
        p_currency,
        CASE
            WHEN p_network = 'bitcoin' THEN 'crypto_btc'
            WHEN p_network = 'ethereum' THEN 'crypto_eth'
            ELSE 'crypto_' || p_network
        END,
        p_network,
        p_block_number,
        p_block_timestamp,
        'confirmed'
    )
    ON CONFLICT (tx_hash, network) DO NOTHING
    RETURNING id INTO v_donation_id;

    -- Refresh stats if a new donation was recorded
    IF v_donation_id IS NOT NULL THEN
        PERFORM refresh_donation_stats();
    END IF;

    RETURN v_donation_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_milestones ENABLE ROW LEVEL SECURITY;

-- Public can view aggregate stats (via API)
-- Individual donations are not publicly visible

-- Service role has full access
CREATE POLICY "Service role manages donations" ON donations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages addresses" ON donation_addresses
    FOR ALL USING (auth.role() = 'service_role');

-- Public can view milestones
CREATE POLICY "Public can view milestones" ON donation_milestones
    FOR SELECT USING (true);

-- Service role can update milestones
CREATE POLICY "Service role manages milestones" ON donation_milestones
    FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own donations
CREATE POLICY "Users can view own donations" ON donations
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE donations IS 'Tracks all donations from crypto and fiat sources';
COMMENT ON TABLE donation_addresses IS 'Wallet addresses monitored for incoming donations';
COMMENT ON TABLE donation_milestones IS 'Funding milestones with unlockable features';
COMMENT ON MATERIALIZED VIEW donation_stats IS 'Pre-calculated donation statistics for fast queries';

COMMENT ON FUNCTION record_crypto_donation IS 'Records a crypto donation detected on blockchain';
COMMENT ON FUNCTION refresh_donation_stats IS 'Refreshes the donation stats materialized view';
