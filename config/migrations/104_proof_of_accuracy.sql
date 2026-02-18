-- Migration 104: Proof of Accuracy System
-- Builds historical track record that AI cannot replicate

-- Daily score snapshots (automatic history)
CREATE TABLE IF NOT EXISTS score_snapshots (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    snapshot_date DATE NOT NULL,
    note_finale DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),
    tier CHAR(1),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, snapshot_date)
);

-- Public predictions (blockchain-anchored)
CREATE TABLE IF NOT EXISTS public_predictions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    prediction_type VARCHAR(50) NOT NULL, -- 'incident_risk', 'score_change', 'vulnerability'
    prediction_text TEXT NOT NULL,
    risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    confidence DECIMAL(3,2),
    predicted_timeframe VARCHAR(50), -- '30_days', '90_days', '1_year'

    -- Blockchain proof
    commitment_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64),
    block_number BIGINT,
    tx_hash VARCHAR(66),

    -- Outcome tracking
    outcome_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'correct', 'incorrect', 'expired'
    outcome_date DATE,
    outcome_details TEXT,
    incident_id INTEGER REFERENCES security_incidents(id),

    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

-- Accuracy metrics (auto-calculated)
CREATE TABLE IF NOT EXISTS accuracy_metrics (
    id SERIAL PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Prediction accuracy
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    incorrect_predictions INTEGER DEFAULT 0,
    pending_predictions INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,2),

    -- Incident correlation
    total_incidents INTEGER DEFAULT 0,
    incidents_on_low_score INTEGER DEFAULT 0, -- score < 50
    incidents_on_high_score INTEGER DEFAULT 0, -- score >= 70
    correlation_strength DECIMAL(5,2),

    -- Coverage
    products_tracked INTEGER DEFAULT 0,
    products_with_incidents INTEGER DEFAULT 0,

    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(period_start, period_end)
);

-- Milestone achievements (for marketing)
CREATE TABLE IF NOT EXISTS platform_milestones (
    id SERIAL PRIMARY KEY,
    milestone_type VARCHAR(50) NOT NULL,
    milestone_value INTEGER,
    milestone_text TEXT,
    achieved_at TIMESTAMP DEFAULT NOW(),
    proof_data JSONB
);

-- Insert initial milestones
INSERT INTO platform_milestones (milestone_type, milestone_value, milestone_text, proof_data) VALUES
('platform_launch', 1, 'SafeScoring platform launched', '{"date": "2024-01-01"}'),
('first_prediction', 1, 'First public prediction made', '{}');

-- Function to take daily snapshot
CREATE OR REPLACE FUNCTION take_daily_snapshots()
RETURNS INTEGER AS $$
DECLARE
    snapshot_count INTEGER;
BEGIN
    INSERT INTO score_snapshots (product_id, snapshot_date, note_finale, score_s, score_a, score_f, score_e, tier)
    SELECT DISTINCT ON (product_id)
        product_id,
        CURRENT_DATE,
        note_finale,
        score_s,
        score_a,
        score_f,
        score_e,
        tier
    FROM safe_scoring_results
    WHERE calculated_at >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY product_id, calculated_at DESC
    ON CONFLICT (product_id, snapshot_date) DO NOTHING;

    GET DIAGNOSTICS snapshot_count = ROW_COUNT;
    RETURN snapshot_count;
END;
$$ LANGUAGE plpgsql;

-- Function to verify prediction outcomes
CREATE OR REPLACE FUNCTION verify_prediction_outcomes()
RETURNS TABLE(verified INTEGER, correct INTEGER, incorrect INTEGER) AS $$
DECLARE
    v_verified INTEGER := 0;
    v_correct INTEGER := 0;
    v_incorrect INTEGER := 0;
BEGIN
    -- Check predictions against actual incidents
    UPDATE public_predictions pp
    SET
        outcome_status = 'correct',
        outcome_date = si.incident_date,
        outcome_details = si.title,
        incident_id = si.id,
        verified_at = NOW()
    FROM security_incidents si
    WHERE pp.product_id = si.product_id
      AND pp.outcome_status = 'pending'
      AND pp.prediction_type = 'incident_risk'
      AND si.incident_date > pp.created_at
      AND si.incident_date < pp.created_at +
          CASE pp.predicted_timeframe
              WHEN '30_days' THEN INTERVAL '30 days'
              WHEN '90_days' THEN INTERVAL '90 days'
              WHEN '1_year' THEN INTERVAL '1 year'
              ELSE INTERVAL '90 days'
          END;

    GET DIAGNOSTICS v_correct = ROW_COUNT;

    -- Mark expired predictions as incorrect
    UPDATE public_predictions
    SET outcome_status = 'expired', verified_at = NOW()
    WHERE outcome_status = 'pending'
      AND created_at +
          CASE predicted_timeframe
              WHEN '30_days' THEN INTERVAL '30 days'
              WHEN '90_days' THEN INTERVAL '90 days'
              WHEN '1_year' THEN INTERVAL '1 year'
              ELSE INTERVAL '90 days'
          END < NOW();

    GET DIAGNOSTICS v_incorrect = ROW_COUNT;
    v_verified := v_correct + v_incorrect;

    RETURN QUERY SELECT v_verified, v_correct, v_incorrect;
END;
$$ LANGUAGE plpgsql;

-- View: Public accuracy dashboard
CREATE OR REPLACE VIEW public_accuracy_dashboard AS
SELECT
    (SELECT COUNT(*) FROM products WHERE is_active = true) as products_tracked,
    (SELECT COUNT(*) FROM score_snapshots) as total_snapshots,
    (SELECT COUNT(DISTINCT snapshot_date) FROM score_snapshots) as days_of_history,
    (SELECT MIN(snapshot_date) FROM score_snapshots) as tracking_since,
    (SELECT COUNT(*) FROM public_predictions) as total_predictions,
    (SELECT COUNT(*) FROM public_predictions WHERE outcome_status = 'correct') as correct_predictions,
    (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE outcome_status = 'correct') /
            NULLIF(COUNT(*) FILTER (WHERE outcome_status != 'pending'), 0), 1)
     FROM public_predictions) as accuracy_percentage,
    (SELECT COUNT(*) FROM security_incidents) as incidents_tracked,
    (SELECT ROUND(AVG(note_finale), 1) FROM safe_scoring_results sr
     JOIN security_incidents si ON sr.product_id = si.product_id
     WHERE sr.calculated_at < si.incident_date) as avg_score_before_incident;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON score_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_product ON score_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON public_predictions(outcome_status);
CREATE INDEX IF NOT EXISTS idx_predictions_product ON public_predictions(product_id);
