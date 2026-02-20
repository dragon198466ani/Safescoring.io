-- ============================================================================
-- Migration 062: Privacy Requests Table (GDPR/CCPA Compliance)
-- Stores privacy rights requests for audit trail and processing
-- ============================================================================

CREATE TABLE IF NOT EXISTS privacy_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Requester info
    email TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- May be null for non-users

    -- Request details
    request_type TEXT NOT NULL CHECK (request_type IN (
        'do_not_sell',  -- CCPA: Do Not Sell My Personal Information
        'know',         -- CCPA/GDPR: Right to Know / Access
        'delete',       -- CCPA/GDPR: Right to Delete / Erasure
        'correct',      -- CCPA/GDPR: Right to Rectification
        'limit',        -- CCPA: Limit Sensitive Data Use
        'portability',  -- GDPR: Data Portability
        'object'        -- GDPR: Right to Object
    )),
    jurisdiction TEXT NOT NULL DEFAULT 'GDPR' CHECK (jurisdiction IN (
        'GDPR', 'CCPA', 'UK_GDPR', 'LGPD', 'PIPEDA', 'APPI'
    )),

    -- Verification
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN (
        'pending_verification',  -- Awaiting email verification
        'verified',              -- Email verified, pending processing
        'in_progress',           -- Being processed
        'completed',             -- Request fulfilled
        'rejected',              -- Invalid or fraudulent request
        'expired'                -- Verification token expired
    )),
    verification_token TEXT,
    verification_expires TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,

    -- Processing
    processed_by TEXT,           -- Admin who processed
    processed_at TIMESTAMPTZ,
    processing_notes TEXT,

    -- Compliance tracking
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,  -- Legal deadline (45 days CCPA, 30 days GDPR)
    completed_at TIMESTAMPTZ,

    -- Audit
    ip_hash TEXT,                -- Hashed IP for fraud prevention
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_privacy_requests_email ON privacy_requests(email);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_token ON privacy_requests(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_requests_due ON privacy_requests(due_date) WHERE status IN ('verified', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_privacy_requests_user ON privacy_requests(user_id) WHERE user_id IS NOT NULL;

-- RLS Policies
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests (by email match via function)
CREATE POLICY "Users view own privacy requests" ON privacy_requests
    FOR SELECT USING (
        user_id = auth.uid() OR
        email = (SELECT email FROM users WHERE id = auth.uid())
    );

-- Service role full access for backend processing
CREATE POLICY "Service role full access privacy_requests" ON privacy_requests
    FOR ALL USING (true);

-- Function to auto-expire old verification tokens
CREATE OR REPLACE FUNCTION expire_privacy_verification_tokens()
RETURNS void AS $$
BEGIN
    UPDATE privacy_requests
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending_verification'
    AND verification_expires < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check approaching deadlines (for alerts)
CREATE OR REPLACE FUNCTION get_privacy_requests_due_soon(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
    id UUID,
    email TEXT,
    request_type TEXT,
    jurisdiction TEXT,
    due_date TIMESTAMPTZ,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.id,
        pr.email,
        pr.request_type,
        pr.jurisdiction,
        pr.due_date,
        EXTRACT(DAY FROM pr.due_date - NOW())::INTEGER as days_remaining
    FROM privacy_requests pr
    WHERE pr.status IN ('verified', 'in_progress')
    AND pr.due_date <= NOW() + (days_ahead || ' days')::INTERVAL
    ORDER BY pr.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
