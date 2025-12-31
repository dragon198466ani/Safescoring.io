-- ============================================================
-- SAFESCORING.IO - MOAT FEATURES (V2 - Fixed)
-- Score History & Security Incidents Tables
-- ============================================================
--
-- FIXED: Uses safe_scoring_results instead of products.scores
--
-- ============================================================

-- ============================================================
-- 1. TABLE: score_history
-- ============================================================

CREATE TABLE IF NOT EXISTS score_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,

    -- Snapshot date
    recorded_at TIMESTAMP DEFAULT NOW(),

    -- FULL SCORES SNAPSHOT
    safe_score DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),

    -- CONSUMER & ESSENTIAL SNAPSHOTS
    consumer_score DECIMAL(5,2),
    essential_score DECIMAL(5,2),

    -- STATISTICS SNAPSHOT
    total_evaluations INTEGER DEFAULT 0,
    total_yes INTEGER DEFAULT 0,
    total_no INTEGER DEFAULT 0,
    total_na INTEGER DEFAULT 0,
    total_tbd INTEGER DEFAULT 0,

    -- CHANGE TRACKING
    previous_safe_score DECIMAL(5,2),
    score_change DECIMAL(5,2),
    change_reason VARCHAR(200),

    -- Trigger source
    triggered_by VARCHAR(50) DEFAULT 'manual',

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_score_history_product_id ON score_history(product_id);
CREATE INDEX IF NOT EXISTS idx_score_history_recorded_at ON score_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_score_history_product_date ON score_history(product_id, recorded_at DESC);

-- ============================================================
-- 2. TABLE: security_incidents
-- ============================================================

CREATE TABLE IF NOT EXISTS security_incidents (
    id SERIAL PRIMARY KEY,

    incident_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,

    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'hack', 'exploit', 'vulnerability', 'rug_pull',
        'smart_contract_bug', 'frontend_attack', 'phishing',
        'insider_threat', 'oracle_manipulation', 'bridge_attack',
        'flash_loan_attack', 'other'
    )),

    severity VARCHAR(20) NOT NULL CHECK (severity IN (
        'critical', 'high', 'medium', 'low', 'info'
    )),

    funds_lost_usd DECIMAL(18,2) DEFAULT 0,
    users_affected INTEGER DEFAULT 0,

    score_impact_s DECIMAL(5,2) DEFAULT 0,
    score_impact_a DECIMAL(5,2) DEFAULT 0,
    score_impact_f DECIMAL(5,2) DEFAULT 0,
    score_impact_e DECIMAL(5,2) DEFAULT 0,

    affected_product_ids INTEGER[] DEFAULT '{}',

    incident_date TIMESTAMP NOT NULL,
    discovered_date TIMESTAMP,
    disclosed_date TIMESTAMP,
    resolved_date TIMESTAMP,

    source_urls TEXT[],
    transaction_hashes TEXT[],
    cve_ids TEXT[],

    response_quality VARCHAR(20) CHECK (response_quality IN (
        'excellent', 'good', 'adequate', 'poor', 'none'
    )),
    funds_recovered_usd DECIMAL(18,2) DEFAULT 0,
    postmortem_url VARCHAR(500),

    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'investigating', 'confirmed', 'active', 'contained', 'resolved', 'disputed'
    )),

    is_published BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON security_incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_published ON security_incidents(is_published);
CREATE INDEX IF NOT EXISTS idx_incidents_affected_products ON security_incidents USING GIN(affected_product_ids);

-- ============================================================
-- 3. TABLE: incident_product_impact
-- ============================================================

CREATE TABLE IF NOT EXISTS incident_product_impact (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES security_incidents(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,

    impact_level VARCHAR(20) CHECK (impact_level IN (
        'direct', 'indirect', 'dependency', 'same_codebase'
    )),

    funds_lost_usd DECIMAL(18,2) DEFAULT 0,
    users_affected INTEGER DEFAULT 0,

    score_adjustment_s DECIMAL(5,2) DEFAULT 0,
    score_adjustment_a DECIMAL(5,2) DEFAULT 0,
    score_adjustment_f DECIMAL(5,2) DEFAULT 0,
    score_adjustment_e DECIMAL(5,2) DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(incident_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_ipi_incident ON incident_product_impact(incident_id);
CREATE INDEX IF NOT EXISTS idx_ipi_product ON incident_product_impact(product_id);

-- ============================================================
-- 4. FUNCTION: Record score history snapshot
-- ============================================================
-- FIXED: Uses safe_scoring_results instead of products.scores

CREATE OR REPLACE FUNCTION record_score_history(
    p_product_id INTEGER,
    p_triggered_by VARCHAR(50) DEFAULT 'manual',
    p_change_reason VARCHAR(200) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_scores RECORD;
    v_previous RECORD;
    v_new_id INTEGER;
    v_score_change DECIMAL(5,2);
BEGIN
    -- Get current product scores from safe_scoring_results
    SELECT
        ssr.note_finale as safe_score,
        ssr.score_s,
        ssr.score_a,
        ssr.score_f,
        ssr.score_e,
        ssr.note_consumer as consumer_score,
        ssr.note_essential as essential_score,
        ssr.total_norms_evaluated,
        ssr.total_yes,
        ssr.total_no,
        ssr.total_na,
        ssr.total_tbd
    INTO v_scores
    FROM safe_scoring_results ssr
    WHERE ssr.product_id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No scores found for product: %', p_product_id;
    END IF;

    -- Get previous score for delta calculation
    SELECT safe_score INTO v_previous
    FROM score_history
    WHERE product_id = p_product_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    -- Calculate score change
    IF v_previous.safe_score IS NOT NULL AND v_scores.safe_score IS NOT NULL THEN
        v_score_change := v_scores.safe_score - v_previous.safe_score;
    ELSE
        v_score_change := NULL;
    END IF;

    -- Insert history record
    INSERT INTO score_history (
        product_id,
        recorded_at,
        safe_score,
        score_s,
        score_a,
        score_f,
        score_e,
        consumer_score,
        essential_score,
        total_evaluations,
        total_yes,
        total_no,
        total_na,
        total_tbd,
        previous_safe_score,
        score_change,
        change_reason,
        triggered_by
    )
    VALUES (
        p_product_id,
        NOW(),
        v_scores.safe_score,
        v_scores.score_s,
        v_scores.score_a,
        v_scores.score_f,
        v_scores.score_e,
        v_scores.consumer_score,
        v_scores.essential_score,
        v_scores.total_norms_evaluated,
        v_scores.total_yes,
        v_scores.total_no,
        v_scores.total_na,
        COALESCE(v_scores.total_tbd, 0),
        v_previous.safe_score,
        v_score_change,
        p_change_reason,
        p_triggered_by
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. FUNCTION: Get score evolution for a product
-- ============================================================

CREATE OR REPLACE FUNCTION get_score_evolution(
    p_product_id INTEGER,
    p_limit INTEGER DEFAULT 12
)
RETURNS TABLE (
    recorded_at TIMESTAMP,
    safe_score DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),
    score_change DECIMAL(5,2),
    change_reason VARCHAR(200)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.recorded_at,
        sh.safe_score,
        sh.score_s,
        sh.score_a,
        sh.score_f,
        sh.score_e,
        sh.score_change,
        sh.change_reason
    FROM score_history sh
    WHERE sh.product_id = p_product_id
    ORDER BY sh.recorded_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. FUNCTION: Get product incidents
-- ============================================================

CREATE OR REPLACE FUNCTION get_product_incidents(
    p_product_id INTEGER
)
RETURNS TABLE (
    incident_id VARCHAR(50),
    title VARCHAR(300),
    incident_type VARCHAR(50),
    severity VARCHAR(20),
    incident_date TIMESTAMP,
    funds_lost_usd DECIMAL(18,2),
    status VARCHAR(20),
    impact_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        si.incident_id,
        si.title,
        si.incident_type,
        si.severity,
        si.incident_date,
        si.funds_lost_usd,
        si.status,
        ipi.impact_level
    FROM security_incidents si
    JOIN incident_product_impact ipi ON si.id = ipi.incident_id
    WHERE ipi.product_id = p_product_id
    AND si.is_published = TRUE
    ORDER BY si.incident_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. VIEW: Products with incident count
-- ============================================================
-- FIXED: Uses safe_scoring_results instead of products.scores

CREATE OR REPLACE VIEW v_products_with_incidents AS
SELECT
    p.id,
    p.name,
    p.slug,
    ssr.note_finale as safe_score,
    ssr.score_s,
    ssr.score_a,
    ssr.score_f,
    ssr.score_e,
    (SELECT COUNT(*)
     FROM incident_product_impact ipi
     JOIN security_incidents si ON ipi.incident_id = si.id
     WHERE ipi.product_id = p.id
     AND si.is_published = TRUE) as incident_count,
    (SELECT SUM(si.funds_lost_usd)
     FROM incident_product_impact ipi
     JOIN security_incidents si ON ipi.incident_id = si.id
     WHERE ipi.product_id = p.id) as total_funds_lost,
    (SELECT MAX(si.incident_date)
     FROM incident_product_impact ipi
     JOIN security_incidents si ON ipi.incident_id = si.id
     WHERE ipi.product_id = p.id) as last_incident_date
FROM products p
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id;

-- ============================================================
-- 8. VIEW: Score evolution summary
-- ============================================================
-- FIXED: Uses safe_scoring_results instead of products.scores

CREATE OR REPLACE VIEW v_score_evolution_summary AS
SELECT
    p.id as product_id,
    p.name as product_name,
    p.slug,

    -- Current score from safe_scoring_results
    ssr.note_finale as current_score,

    -- Previous score from history
    (SELECT safe_score FROM score_history
     WHERE product_id = p.id
     ORDER BY recorded_at DESC OFFSET 1 LIMIT 1) as previous_score,

    -- 30-day change
    (SELECT ssr.note_finale - sh.safe_score
     FROM score_history sh
     WHERE sh.product_id = p.id
     AND sh.recorded_at >= NOW() - INTERVAL '30 days'
     ORDER BY sh.recorded_at ASC
     LIMIT 1) as change_30d,

    -- History count
    (SELECT COUNT(*) FROM score_history WHERE product_id = p.id) as history_count,

    -- First recorded date
    (SELECT MIN(recorded_at) FROM score_history WHERE product_id = p.id) as first_recorded,

    -- Latest recorded date
    (SELECT MAX(recorded_at) FROM score_history WHERE product_id = p.id) as last_recorded

FROM products p
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
WHERE ssr.note_finale IS NOT NULL
ORDER BY current_score DESC NULLS LAST;

-- ============================================================
-- 9. VIEW: Recent incidents dashboard
-- ============================================================

CREATE OR REPLACE VIEW v_recent_incidents AS
SELECT
    si.incident_id,
    si.title,
    si.incident_type,
    si.severity,
    si.incident_date,
    si.funds_lost_usd,
    si.status,
    si.response_quality,
    array_length(si.affected_product_ids, 1) as products_affected_count,
    (SELECT string_agg(p.name, ', ')
     FROM products p
     WHERE p.id = ANY(si.affected_product_ids)) as affected_products
FROM security_incidents si
WHERE si.is_published = TRUE
ORDER BY si.incident_date DESC
LIMIT 50;

-- ============================================================
-- 10. TRIGGER: Auto-record history on score change
-- ============================================================
-- FIXED: Triggers on safe_scoring_results changes instead

CREATE OR REPLACE FUNCTION trigger_record_score_history_on_results()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if score actually changed
    IF OLD.note_finale IS DISTINCT FROM NEW.note_finale THEN
        PERFORM record_score_history(
            NEW.product_id,
            'auto_trigger',
            CASE
                WHEN NEW.note_finale > COALESCE(OLD.note_finale, 0) THEN 'Score improved'
                WHEN NEW.note_finale < COALESCE(OLD.note_finale, 100) THEN 'Score decreased'
                ELSE 'Score recalculated'
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on safe_scoring_results
DROP TRIGGER IF EXISTS trigger_ssr_score_history ON safe_scoring_results;
CREATE TRIGGER trigger_ssr_score_history
    AFTER UPDATE OF note_finale ON safe_scoring_results
    FOR EACH ROW
    WHEN (OLD.note_finale IS DISTINCT FROM NEW.note_finale)
    EXECUTE FUNCTION trigger_record_score_history_on_results();

-- ============================================================
-- 11. COMMENTS
-- ============================================================

COMMENT ON TABLE score_history IS 'Historical snapshots of product scores - UNIQUE DATA that cannot be copied';
COMMENT ON TABLE security_incidents IS 'Security incidents (hacks, exploits, vulnerabilities) affecting products';
COMMENT ON TABLE incident_product_impact IS 'Junction table linking incidents to affected products';

COMMENT ON FUNCTION record_score_history IS 'Records a score snapshot for a product in the history table';
COMMENT ON FUNCTION get_score_evolution IS 'Returns score evolution history for a product';
COMMENT ON FUNCTION get_product_incidents IS 'Returns all incidents affecting a product';

-- ============================================================
-- END OF SCRIPT
-- ============================================================

SELECT 'MOAT FEATURES V2 (score_history + security_incidents) created successfully!' as status;
