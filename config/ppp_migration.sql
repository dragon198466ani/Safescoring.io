-- ============================================================
-- PPP (Purchasing Power Parity) Audit Log
-- Tracks geo detection, VPN signals, and applied discounts
-- for fraud review and analytics.
-- ============================================================

-- Section 11: PPP Audit Log
CREATE TABLE IF NOT EXISTS ppp_audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),  -- IPv4 or IPv6
    ip_country VARCHAR(2) NOT NULL,
    browser_timezone VARCHAR(100),
    browser_language VARCHAR(20),
    detected_tier INTEGER NOT NULL DEFAULT 0,
    applied_tier INTEGER NOT NULL DEFAULT 0,
    vpn_detected BOOLEAN DEFAULT FALSE,
    vpn_signals JSONB DEFAULT '{}',
    discount_code VARCHAR(50),
    action VARCHAR(20) DEFAULT 'detect', -- 'detect', 'checkout', 'denied'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fraud review queries
CREATE INDEX IF NOT EXISTS idx_ppp_audit_user ON ppp_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ppp_audit_country ON ppp_audit_log(ip_country);
CREATE INDEX IF NOT EXISTS idx_ppp_audit_vpn ON ppp_audit_log(vpn_detected) WHERE vpn_detected = TRUE;
CREATE INDEX IF NOT EXISTS idx_ppp_audit_date ON ppp_audit_log(created_at);

-- Useful view: suspicious activity (VPN detected or tier mismatch)
CREATE OR REPLACE VIEW ppp_suspicious_activity AS
SELECT
    pal.*,
    u.email,
    u.plan_type
FROM ppp_audit_log pal
LEFT JOIN users u ON u.id = pal.user_id
WHERE pal.vpn_detected = TRUE
   OR pal.detected_tier != pal.applied_tier
ORDER BY pal.created_at DESC;
