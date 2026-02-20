-- Migration 101: Competitor Monitoring & Client Fingerprint Tracking
-- SafeScoring Anti-Copy Protection System
--
-- Tables:
-- - client_fingerprints: Track API access patterns for scraper detection
-- - competitor_scrapers: Known competitor sites to monitor
-- - competitor_products: Products found on competitor sites
-- - honeypot_detections: When our honeypots are found elsewhere

-- ============================================================================
-- CLIENT FINGERPRINT TRACKING
-- ============================================================================
-- Track API access patterns to detect scrapers

CREATE TABLE IF NOT EXISTS client_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(64) NOT NULL,           -- SHA256 hash of client signals
    ip_hash VARCHAR(32),                       -- Partial hash of IP (privacy)
    date_key DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Access statistics
    request_count INTEGER DEFAULT 1,
    last_endpoint VARCHAR(200),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_authenticated BOOLEAN DEFAULT FALSE,

    -- Scraper detection
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    flagged_at TIMESTAMP WITH TIME ZONE,

    -- Honeypots served to this client
    honeypots_served JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One record per client per day
    UNIQUE(client_id, date_key)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_client_fingerprints_client_id ON client_fingerprints(client_id);
CREATE INDEX IF NOT EXISTS idx_client_fingerprints_date_key ON client_fingerprints(date_key);
CREATE INDEX IF NOT EXISTS idx_client_fingerprints_flagged ON client_fingerprints(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_client_fingerprints_suspicious ON client_fingerprints(request_count) WHERE request_count > 100;

-- Trigger to increment request count on conflict
CREATE OR REPLACE FUNCTION increment_request_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.request_count := OLD.request_count + 1;
        NEW.last_seen := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_request_count ON client_fingerprints;
CREATE TRIGGER trigger_increment_request_count
    BEFORE UPDATE ON client_fingerprints
    FOR EACH ROW
    EXECUTE FUNCTION increment_request_count();

-- ============================================================================
-- COMPETITOR MONITORING
-- ============================================================================
-- Track competitor sites for honeypot detection

CREATE TABLE IF NOT EXISTS competitor_scrapers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Competitor info
    name VARCHAR(200) NOT NULL,
    domain VARCHAR(500) NOT NULL UNIQUE,
    description TEXT,

    -- Scraping configuration
    scrape_enabled BOOLEAN DEFAULT TRUE,
    scrape_frequency_hours INTEGER DEFAULT 24,
    scrape_selectors JSONB,                   -- CSS selectors for products
    requires_js BOOLEAN DEFAULT FALSE,        -- Needs Playwright/Puppeteer

    -- Statistics
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    products_found INTEGER DEFAULT 0,
    honeypots_detected INTEGER DEFAULT 0,
    last_honeypot_at TIMESTAMP WITH TIME ZONE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'blocked', 'error')),
    last_error TEXT,
    consecutive_errors INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_scrapers_domain ON competitor_scrapers(domain);
CREATE INDEX IF NOT EXISTS idx_competitor_scrapers_status ON competitor_scrapers(status) WHERE status = 'active';

-- ============================================================================
-- COMPETITOR PRODUCTS
-- ============================================================================
-- Products found on competitor sites (for comparison and honeypot detection)

CREATE TABLE IF NOT EXISTS competitor_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID REFERENCES competitor_scrapers(id) ON DELETE CASCADE,

    -- Product data as found
    external_id VARCHAR(100),                 -- ID on competitor site
    product_name VARCHAR(300) NOT NULL,
    product_slug VARCHAR(300),
    safe_score DECIMAL(5,2),
    pillar_scores JSONB,
    description TEXT,
    raw_html TEXT,                            -- Original HTML for evidence

    -- Matching
    matched_product_id INTEGER REFERENCES products(id),
    similarity_score DECIMAL(3,2),            -- 0.00-1.00

    -- Honeypot detection
    is_honeypot BOOLEAN DEFAULT FALSE,
    honeypot_seed VARCHAR(100),
    honeypot_confidence DECIMAL(3,2),
    honeypot_evidence JSONB,

    -- Fingerprint detection
    fingerprint_detected BOOLEAN DEFAULT FALSE,
    detected_fingerprint_hash VARCHAR(64),
    fingerprint_evidence JSONB,

    -- Timestamps
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Versioning (track changes)
    version INTEGER DEFAULT 1,

    UNIQUE(competitor_id, product_slug)
);

CREATE INDEX IF NOT EXISTS idx_competitor_products_competitor ON competitor_products(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_products_honeypot ON competitor_products(is_honeypot) WHERE is_honeypot = TRUE;
CREATE INDEX IF NOT EXISTS idx_competitor_products_fingerprint ON competitor_products(fingerprint_detected) WHERE fingerprint_detected = TRUE;

-- ============================================================================
-- HONEYPOT DETECTIONS
-- ============================================================================
-- When we find our honeypots on competitor sites

CREATE TABLE IF NOT EXISTS honeypot_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was detected
    competitor_product_id UUID REFERENCES competitor_products(id),
    competitor_id UUID REFERENCES competitor_scrapers(id),

    -- Honeypot details
    honeypot_name VARCHAR(300) NOT NULL,
    honeypot_seed VARCHAR(100) NOT NULL,
    client_fingerprint VARCHAR(64),           -- Which client received this honeypot

    -- Evidence
    confidence DECIMAL(3,2) NOT NULL,         -- 0.00-1.00
    match_type VARCHAR(50),                   -- exact_name, exact_slug, score_match
    evidence_json JSONB NOT NULL,
    screenshot_url TEXT,

    -- Legal
    legal_notice_sent BOOLEAN DEFAULT FALSE,
    legal_notice_sent_at TIMESTAMP WITH TIME ZONE,
    legal_response TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'detected' CHECK (status IN (
        'detected', 'verified', 'legal_notice_sent', 'resolved', 'false_positive'
    )),
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_honeypot_detections_competitor ON honeypot_detections(competitor_id);
CREATE INDEX IF NOT EXISTS idx_honeypot_detections_status ON honeypot_detections(status);
CREATE INDEX IF NOT EXISTS idx_honeypot_detections_fingerprint ON honeypot_detections(client_fingerprint);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- Suspicious clients summary
CREATE OR REPLACE VIEW suspicious_clients_summary AS
SELECT
    client_id,
    SUM(request_count) as total_requests,
    COUNT(DISTINCT date_key) as active_days,
    MAX(last_seen) as last_seen,
    BOOL_OR(is_flagged) as is_flagged,
    MAX(flag_reason) as flag_reason,
    jsonb_agg(DISTINCT last_endpoint) as endpoints_accessed
FROM client_fingerprints
WHERE date_key >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY client_id
HAVING SUM(request_count) > 100 OR BOOL_OR(is_flagged)
ORDER BY total_requests DESC;

-- Competitor summary
CREATE OR REPLACE VIEW competitor_summary AS
SELECT
    cs.id,
    cs.name,
    cs.domain,
    cs.status,
    cs.products_found,
    cs.honeypots_detected,
    cs.last_scraped_at,
    COUNT(DISTINCT cp.id) as unique_products,
    COUNT(DISTINCT CASE WHEN cp.is_honeypot THEN cp.id END) as honeypot_matches,
    MAX(hd.created_at) as last_detection
FROM competitor_scrapers cs
LEFT JOIN competitor_products cp ON cp.competitor_id = cs.id
LEFT JOIN honeypot_detections hd ON hd.competitor_id = cs.id
GROUP BY cs.id, cs.name, cs.domain, cs.status, cs.products_found, cs.honeypots_detected, cs.last_scraped_at
ORDER BY cs.honeypots_detected DESC, cs.products_found DESC;

-- Daily fingerprint stats
CREATE OR REPLACE VIEW daily_fingerprint_stats AS
SELECT
    date_key,
    COUNT(DISTINCT client_id) as unique_clients,
    SUM(request_count) as total_requests,
    AVG(request_count) as avg_requests_per_client,
    COUNT(DISTINCT CASE WHEN is_flagged THEN client_id END) as flagged_clients,
    COUNT(DISTINCT CASE WHEN is_authenticated THEN client_id END) as authenticated_clients
FROM client_fingerprints
WHERE date_key >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_key
ORDER BY date_key DESC;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE client_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_scrapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE honeypot_detections ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables (no public access)
CREATE POLICY "Service role access for client_fingerprints"
    ON client_fingerprints FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role access for competitor_scrapers"
    ON competitor_scrapers FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role access for competitor_products"
    ON competitor_products FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role access for honeypot_detections"
    ON honeypot_detections FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Auto-cleanup old fingerprint data (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_fingerprints()
RETURNS void AS $$
BEGIN
    DELETE FROM client_fingerprints
    WHERE date_key < CURRENT_DATE - INTERVAL '90 days'
    AND is_flagged = FALSE;

    -- Keep flagged clients longer (1 year)
    DELETE FROM client_fingerprints
    WHERE date_key < CURRENT_DATE - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily via cron or pg_cron)
-- SELECT cron.schedule('cleanup-fingerprints', '0 3 * * *', 'SELECT cleanup_old_fingerprints()');

COMMENT ON TABLE client_fingerprints IS 'Tracks API client access patterns for scraper detection';
COMMENT ON TABLE competitor_scrapers IS 'Competitor sites to monitor for data copying';
COMMENT ON TABLE competitor_products IS 'Products found on competitor sites';
COMMENT ON TABLE honeypot_detections IS 'Records of our honeypots found on competitor sites';
