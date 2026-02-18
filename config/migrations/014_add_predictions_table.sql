-- Migration: Add predictions table for risk predictions
-- This table stores cryptographic commitments of risk predictions

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,

    -- Prediction details
    prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    safe_score_at_prediction DECIMAL(5,2) NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL')),
    incident_probability DECIMAL(4,3) NOT NULL,
    prediction_window_days INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,

    -- Analysis details
    weakest_pillar CHAR(1) CHECK (weakest_pillar IN ('S', 'A', 'F', 'E')),
    weakest_pillar_score DECIMAL(5,2),
    confidence DECIMAL(4,3) DEFAULT 0.85,
    methodology_version TEXT DEFAULT 'SAFE-v2.0',

    -- Cryptographic commitment (SHA-256 hash)
    commitment_hash TEXT UNIQUE NOT NULL,
    predictions_json JSONB,

    -- Blockchain anchoring
    blockchain_tx_hash TEXT,
    blockchain_network TEXT DEFAULT 'polygon',
    blockchain_block_number BIGINT,
    blockchain_timestamp TIMESTAMPTZ,

    -- Validation
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'validated')),
    validated_at TIMESTAMPTZ,
    incident_occurred BOOLEAN,
    validation_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_predictions_product_id ON predictions(product_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_risk_level ON predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_expires_at ON predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_predictions_commitment_hash ON predictions(commitment_hash);

-- Create function to auto-update timestamps
CREATE OR REPLACE FUNCTION update_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_predictions_updated_at ON predictions;
CREATE TRIGGER trigger_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_predictions_updated_at();

-- Create view for prediction accuracy stats
CREATE OR REPLACE VIEW prediction_accuracy_stats AS
SELECT
    risk_level,
    COUNT(*) as total_predictions,
    COUNT(*) FILTER (WHERE status = 'validated') as validated,
    COUNT(*) FILTER (WHERE status = 'validated' AND (
        (risk_level IN ('CRITICAL', 'HIGH') AND incident_occurred = true) OR
        (risk_level IN ('LOW', 'MINIMAL') AND incident_occurred = false) OR
        (risk_level = 'MEDIUM' AND incident_occurred = false)
    )) as correct,
    COUNT(*) FILTER (WHERE status = 'validated' AND NOT (
        (risk_level IN ('CRITICAL', 'HIGH') AND incident_occurred = true) OR
        (risk_level IN ('LOW', 'MINIMAL') AND incident_occurred = false) OR
        (risk_level = 'MEDIUM' AND incident_occurred = false)
    )) as incorrect,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'validated' AND (
            (risk_level IN ('CRITICAL', 'HIGH') AND incident_occurred = true) OR
            (risk_level IN ('LOW', 'MINIMAL') AND incident_occurred = false) OR
            (risk_level = 'MEDIUM' AND incident_occurred = false)
        )) / NULLIF(COUNT(*) FILTER (WHERE status = 'validated'), 0),
        2
    ) as accuracy_percent
FROM predictions
GROUP BY risk_level;

-- Create view for product risk summary
CREATE OR REPLACE VIEW product_risk_summary AS
SELECT
    p.id as product_id,
    p.name as product_name,
    p.slug,
    pred.risk_level,
    pred.incident_probability,
    pred.prediction_window_days,
    pred.weakest_pillar,
    pred.safe_score_at_prediction,
    pred.prediction_date,
    pred.expires_at,
    pred.blockchain_tx_hash IS NOT NULL as is_on_chain
FROM products p
LEFT JOIN LATERAL (
    SELECT * FROM predictions
    WHERE product_id = p.id AND status = 'active'
    ORDER BY prediction_date DESC
    LIMIT 1
) pred ON true;

-- Enable RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read predictions"
    ON predictions FOR SELECT
    USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role can manage predictions"
    ON predictions FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE predictions IS 'Risk predictions based on SAFE scores with blockchain anchoring for proof of anteriority';
