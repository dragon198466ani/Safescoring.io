-- ============================================================
-- MIGRATION 033: PENDING INCIDENTS FOR AI REVIEW
-- ============================================================
-- Table for AI-detected incidents awaiting manual verification
-- ============================================================

-- Table for pending/unverified incidents
CREATE TABLE IF NOT EXISTS institutional_incidents_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    incident_type TEXT,
    description TEXT,

    -- Location
    country_code CHAR(2),
    institution_type TEXT,
    institution_name TEXT,

    -- Source
    source_url TEXT,
    source_name TEXT,
    raw_data JSONB,

    -- AI Analysis
    ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 1 AND 10),
    severity_score INTEGER CHECK (severity_score BETWEEN 1 AND 10),
    systemic_risk_level TEXT,
    crypto_holders_targeted BOOLEAN DEFAULT FALSE,
    data_types_exposed TEXT[],
    estimated_victims INTEGER,

    -- Review status
    review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_info')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Timestamps
    auto_detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add AI-related columns to main table
ALTER TABLE institutional_incidents
ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS needs_verification BOOLEAN DEFAULT TRUE;

-- Add AI-related columns to country risks
ALTER TABLE country_institutional_risks
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;

-- Index for review queue
CREATE INDEX IF NOT EXISTS idx_pending_status ON institutional_incidents_pending(review_status);
CREATE INDEX IF NOT EXISTS idx_pending_country ON institutional_incidents_pending(country_code);
CREATE INDEX IF NOT EXISTS idx_pending_date ON institutional_incidents_pending(auto_detected_at DESC);

-- Function to approve pending incident
CREATE OR REPLACE FUNCTION approve_pending_incident(p_pending_id UUID, p_reviewer TEXT)
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
    v_pending RECORD;
BEGIN
    -- Get pending incident
    SELECT * INTO v_pending FROM institutional_incidents_pending WHERE id = p_pending_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending incident not found';
    END IF;

    -- Insert into main table
    INSERT INTO institutional_incidents (
        title, slug, incident_type, description,
        country_code, institution_type, institution_name,
        severity_score, systemic_risk_level, crypto_holders_targeted,
        data_types_exposed, estimated_victims,
        source_urls, verified, ai_confidence_score, ai_generated
    ) VALUES (
        v_pending.title, v_pending.slug, v_pending.incident_type, v_pending.description,
        v_pending.country_code, v_pending.institution_type, v_pending.institution_name,
        v_pending.severity_score, v_pending.systemic_risk_level, v_pending.crypto_holders_targeted,
        v_pending.data_types_exposed, v_pending.estimated_victims,
        ARRAY[v_pending.source_url], TRUE, v_pending.ai_confidence_score, TRUE
    )
    RETURNING id INTO v_new_id;

    -- Update pending status
    UPDATE institutional_incidents_pending SET
        review_status = 'approved',
        reviewed_by = p_reviewer,
        reviewed_at = NOW()
    WHERE id = p_pending_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- View: Pending incidents for review
CREATE OR REPLACE VIEW v_pending_incidents_review AS
SELECT
    p.*,
    c.country_name,
    c.overall_risk_level as country_current_risk
FROM institutional_incidents_pending p
LEFT JOIN country_institutional_risks c ON p.country_code = c.country_code
WHERE p.review_status = 'pending'
ORDER BY p.ai_confidence_score DESC, p.auto_detected_at DESC;
