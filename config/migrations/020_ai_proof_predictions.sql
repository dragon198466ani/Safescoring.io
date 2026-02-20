-- =====================================================
-- AI-PROOF PREDICTIONS SYSTEM
-- Migration 020: Verifiable predictions with blockchain commitments
-- =====================================================

-- This system creates cryptographically committed predictions
-- that PROVE SafeScoring methodology accuracy over time.
-- AI cannot replicate years of historical predictions.

-- =====================================================
-- 1. PREDICTIONS TABLE
-- Stores predictions committed BEFORE events happen
-- =====================================================

CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Prediction timestamp (when prediction was made)
    prediction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Score at time of prediction
    safe_score_at_prediction DECIMAL(5,2) NOT NULL,

    -- Risk assessment
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL')),
    incident_probability DECIMAL(4,3) NOT NULL, -- 0.000 to 1.000
    prediction_window_days INTEGER NOT NULL, -- How many days this prediction is valid
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Analysis details
    weakest_pillar VARCHAR(20),
    weakest_pillar_score DECIMAL(5,2),
    confidence DECIMAL(4,3) NOT NULL, -- 0.000 to 1.000

    -- Cryptographic commitment (hash of prediction data)
    commitment_hash VARCHAR(66) NOT NULL, -- 0x + 64 hex chars

    -- Full prediction JSON for verification
    predictions_json JSONB NOT NULL,

    -- Blockchain proof (after publishing)
    blockchain_tx_hash VARCHAR(66),
    blockchain_network VARCHAR(20),
    blockchain_block_number BIGINT,
    blockchain_timestamp TIMESTAMP WITH TIME ZONE,

    -- Validation status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'validated', 'expired', 'cancelled')),

    -- Validation results (filled when incident occurs or prediction expires)
    validated_at TIMESTAMP WITH TIME ZONE,
    incident_occurred BOOLEAN,
    incident_id INTEGER REFERENCES security_incidents(id),
    days_until_incident INTEGER,
    accuracy VARCHAR(30) CHECK (accuracy IN ('correct_positive', 'correct_negative', 'false_positive', 'false_negative', 'late_positive')),

    -- Metadata
    methodology_version VARCHAR(20) NOT NULL DEFAULT 'SAFE-v2.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_predictions_product ON predictions(product_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_predictions_expires ON predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_predictions_risk ON predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_accuracy ON predictions(accuracy);
CREATE INDEX IF NOT EXISTS idx_predictions_commitment ON predictions(commitment_hash);

-- =====================================================
-- 2. PREDICTION ACCURACY STATS (Materialized View)
-- Pre-calculated accuracy metrics for fast queries
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS prediction_accuracy_stats AS
SELECT
    COUNT(*) as total_predictions,
    COUNT(CASE WHEN status IN ('validated', 'expired') THEN 1 END) as completed_predictions,
    COUNT(CASE WHEN accuracy = 'correct_positive' THEN 1 END) as correct_positive,
    COUNT(CASE WHEN accuracy = 'correct_negative' THEN 1 END) as correct_negative,
    COUNT(CASE WHEN accuracy = 'false_positive' THEN 1 END) as false_positive,
    COUNT(CASE WHEN accuracy = 'false_negative' THEN 1 END) as false_negative,
    COUNT(CASE WHEN accuracy = 'late_positive' THEN 1 END) as late_positive,

    -- Accuracy by risk level
    COUNT(CASE WHEN risk_level = 'CRITICAL' AND accuracy = 'correct_positive' THEN 1 END) as critical_correct,
    COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as critical_total,
    COUNT(CASE WHEN risk_level = 'HIGH' AND accuracy = 'correct_positive' THEN 1 END) as high_correct,
    COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_total,

    -- Calculate overall accuracy
    ROUND(
        (COUNT(CASE WHEN accuracy IN ('correct_positive', 'correct_negative') THEN 1 END)::DECIMAL /
        NULLIF(COUNT(CASE WHEN status IN ('validated', 'expired') THEN 1 END), 0)) * 100,
        2
    ) as overall_accuracy_percent,

    -- Time range
    MIN(prediction_date) as first_prediction,
    MAX(prediction_date) as last_prediction,

    NOW() as calculated_at
FROM predictions;

-- Refresh daily via cron
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_stats_calculated ON prediction_accuracy_stats(calculated_at);

-- =====================================================
-- 3. FINGERPRINT TRACKING TABLE
-- Tracks which fingerprints were sent to which clients
-- =====================================================

CREATE TABLE IF NOT EXISTS client_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(100) NOT NULL, -- IP:UA hash

    -- Fingerprint seeds used for this client
    score_seed BIGINT NOT NULL,
    text_seed BIGINT NOT NULL,
    order_seed BIGINT NOT NULL,
    full_hash VARCHAR(64) NOT NULL,

    -- Tracking
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_count INTEGER DEFAULT 1,

    -- Detection flags
    suspected_scraper BOOLEAN DEFAULT FALSE,
    suspected_competitor BOOLEAN DEFAULT FALSE,

    -- User association (if authenticated)
    user_id UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_client ON client_fingerprints(client_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON client_fingerprints(full_hash);

-- =====================================================
-- 4. HONEYPOT DETECTIONS TABLE
-- Records when honeypot products are found externally
-- =====================================================

CREATE TABLE IF NOT EXISTS honeypot_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Honeypot that was detected
    honeypot_seed VARCHAR(50) NOT NULL,
    honeypot_name VARCHAR(200),
    honeypot_slug VARCHAR(200),

    -- Where it was found
    competitor_url VARCHAR(500),
    competitor_name VARCHAR(200),
    detection_method VARCHAR(50), -- 'manual', 'automated_scan', 'user_report'

    -- Evidence
    screenshot_url VARCHAR(500),
    evidence_json JSONB,
    matched_fingerprint VARCHAR(16), -- Client fingerprint that received this honeypot

    -- Legal status
    legal_action_taken BOOLEAN DEFAULT FALSE,
    legal_notes TEXT,

    -- Timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_honeypot_detections_seed ON honeypot_detections(honeypot_seed);
CREATE INDEX IF NOT EXISTS idx_honeypot_detections_competitor ON honeypot_detections(competitor_name);

-- =====================================================
-- 5. BLOCKCHAIN COMMITMENTS TABLE
-- Tracks all blockchain publications
-- =====================================================

CREATE TABLE IF NOT EXISTS blockchain_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was committed
    commitment_type VARCHAR(30) NOT NULL CHECK (commitment_type IN ('score', 'prediction', 'methodology', 'weekly_summary')),
    commitment_hash VARCHAR(66) NOT NULL,
    commitment_data TEXT, -- JSON of committed data (for verification)

    -- Reference to source
    reference_type VARCHAR(30), -- 'product', 'prediction', 'norm_version'
    reference_id VARCHAR(100),

    -- Blockchain details
    network VARCHAR(20) NOT NULL, -- 'mainnet', 'polygon', 'arbitrum', etc.
    contract_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    gas_used BIGINT,
    gas_price_gwei DECIMAL(10,2),

    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_commitment_hash ON blockchain_commitments(commitment_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx ON blockchain_commitments(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_type ON blockchain_commitments(commitment_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_reference ON blockchain_commitments(reference_type, reference_id);

-- =====================================================
-- 6. FUNCTION: Auto-validate predictions on incident
-- =====================================================

-- This function is triggered when a product is linked to an incident
-- via the incident_product_impact junction table
CREATE OR REPLACE FUNCTION validate_predictions_on_incident_impact()
RETURNS TRIGGER AS $$
DECLARE
    v_incident_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the incident date from security_incidents
    SELECT incident_date INTO v_incident_date
    FROM security_incidents
    WHERE id = NEW.incident_id;

    -- Find and validate active predictions for this product
    UPDATE predictions
    SET
        status = 'validated',
        validated_at = NOW(),
        incident_occurred = TRUE,
        incident_id = NEW.incident_id,
        days_until_incident = EXTRACT(DAY FROM (v_incident_date - prediction_date)),
        accuracy = CASE
            WHEN EXTRACT(DAY FROM (v_incident_date - prediction_date)) <= prediction_window_days
            THEN 'correct_positive'
            ELSE 'late_positive'
        END,
        updated_at = NOW()
    WHERE product_id = NEW.product_id
      AND status = 'active'
      AND prediction_date < v_incident_date;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on incident_product_impact insertion (when product is linked to incident)
DROP TRIGGER IF EXISTS trigger_validate_predictions ON incident_product_impact;
CREATE TRIGGER trigger_validate_predictions
    AFTER INSERT ON incident_product_impact
    FOR EACH ROW
    EXECUTE FUNCTION validate_predictions_on_incident_impact();

-- =====================================================
-- 7. FUNCTION: Expire old predictions
-- Run daily via cron
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_predictions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE predictions
    SET
        status = 'expired',
        validated_at = NOW(),
        incident_occurred = FALSE,
        accuracy = CASE
            WHEN risk_level IN ('LOW', 'MINIMAL') THEN 'correct_negative'
            ELSE 'false_positive'
        END,
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    -- Refresh materialized view
    REFRESH MATERIALIZED VIEW prediction_accuracy_stats;

    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE honeypot_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_commitments ENABLE ROW LEVEL SECURITY;

-- Public can view validated predictions (proof of accuracy)
CREATE POLICY "Public can view validated predictions" ON predictions
    FOR SELECT USING (status IN ('validated', 'expired'));

-- Only service role can insert/update predictions
CREATE POLICY "Service role manages predictions" ON predictions
    FOR ALL USING (auth.role() = 'service_role');

-- Fingerprints are internal only
CREATE POLICY "Service role only for fingerprints" ON client_fingerprints
    FOR ALL USING (auth.role() = 'service_role');

-- Honeypot detections are internal only
CREATE POLICY "Service role only for honeypots" ON honeypot_detections
    FOR ALL USING (auth.role() = 'service_role');

-- Public can verify blockchain commitments
CREATE POLICY "Public can view blockchain commitments" ON blockchain_commitments
    FOR SELECT USING (true);

-- =====================================================
-- 9. CRON JOBS (requires pg_cron extension)
-- =====================================================

-- Expire predictions daily at 2 AM UTC
-- SELECT cron.schedule('expire-predictions', '0 2 * * *', 'SELECT expire_old_predictions()');

-- Refresh accuracy stats every 6 hours
-- SELECT cron.schedule('refresh-prediction-stats', '0 */6 * * *', 'REFRESH MATERIALIZED VIEW prediction_accuracy_stats');

-- =====================================================
-- 10. COMMENTS
-- =====================================================

COMMENT ON TABLE predictions IS 'AI-proof predictions: cryptographically committed before events, validated after';
COMMENT ON TABLE client_fingerprints IS 'Tracks steganographic fingerprints sent to each client';
COMMENT ON TABLE honeypot_detections IS 'Records when fake honeypot products are found on competitor sites';
COMMENT ON TABLE blockchain_commitments IS 'All data committed to blockchain for proof of anteriority';

COMMENT ON COLUMN predictions.commitment_hash IS 'SHA-256 hash of prediction data, published to blockchain BEFORE event';
COMMENT ON COLUMN predictions.accuracy IS 'correct_positive=predicted risk & incident occurred, correct_negative=predicted low risk & no incident';
