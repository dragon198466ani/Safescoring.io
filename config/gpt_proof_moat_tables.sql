-- ============================================================
-- SAFESCORING - GPT-PROOF MOAT TABLES
-- ============================================================
-- Version: 1.0
-- Date: 2025-12-30
--
-- These tables create UNIQUE, TIME-DEPENDENT data that:
-- 1. Cannot be replicated by AI or competitors
-- 2. Become MORE valuable over time
-- 3. Create a closed-loop data flywheel
--
-- IMPORTANT: Each product is UNIQUE - we track product-specific
-- data that creates an irreplaceable competitive advantage.
-- ============================================================

-- ============================================================
-- SECTION 1: PRODUCT-SPECIFIC UNIQUE METRICS
-- ============================================================
-- Since each product is unique, we track unique data per product

-- 1.1 Product Unique Metrics (Per-product proprietary data)
CREATE TABLE IF NOT EXISTS product_unique_metrics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT NOW(),

    -- On-chain metrics (unique to each protocol)
    tvl_usd DECIMAL(18,2),
    tvl_change_24h DECIMAL(8,4),
    tvl_change_7d DECIMAL(8,4),
    tvl_change_30d DECIMAL(8,4),

    -- Protocol-specific metrics
    unique_users_24h INTEGER,
    unique_users_7d INTEGER,
    transactions_24h INTEGER,
    volume_24h_usd DECIMAL(18,2),

    -- Token metrics (if applicable)
    token_price_usd DECIMAL(18,8),
    token_market_cap DECIMAL(18,2),
    token_holders INTEGER,

    -- Security metrics (UNIQUE - our own calculation)
    risk_score_calculated DECIMAL(5,2),
    vulnerability_count INTEGER DEFAULT 0,
    days_since_last_incident INTEGER,
    audit_freshness_days INTEGER,

    -- Social metrics
    twitter_followers INTEGER,
    twitter_engagement_rate DECIMAL(5,4),
    discord_members INTEGER,
    github_stars INTEGER,
    github_commits_30d INTEGER,

    -- Metadata
    data_sources JSONB DEFAULT '[]',
    data_quality_score DECIMAL(3,2) DEFAULT 1.0,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups per product over time
CREATE INDEX IF NOT EXISTS idx_pum_product_time ON product_unique_metrics(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pum_recorded_at ON product_unique_metrics(recorded_at DESC);

-- ============================================================
-- SECTION 2: CLOSED-LOOP DATA SYSTEM (User Feedback)
-- ============================================================
-- User corrections improve our data, creating a flywheel

-- 2.1 User Corrections (Feedback loop)
CREATE TABLE IF NOT EXISTS user_corrections (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    norm_id INTEGER REFERENCES norms(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- What the user is correcting
    field_corrected VARCHAR(100) NOT NULL, -- 'evaluation', 'product_info', 'incident', etc.
    original_value TEXT,
    suggested_value TEXT NOT NULL,
    correction_reason TEXT,

    -- Evidence provided
    evidence_urls TEXT[],
    evidence_description TEXT,

    -- Verification status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'partial')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    -- Impact tracking
    was_applied BOOLEAN DEFAULT FALSE,
    score_impact DECIMAL(5,2),

    -- Metadata
    user_reputation_score DECIMAL(5,2) DEFAULT 50.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uc_product ON user_corrections(product_id);
CREATE INDEX IF NOT EXISTS idx_uc_status ON user_corrections(status);
CREATE INDEX IF NOT EXISTS idx_uc_user ON user_corrections(user_id);
-- Index for consensus checking (find similar pending corrections quickly)
CREATE INDEX IF NOT EXISTS idx_uc_consensus ON user_corrections(product_id, field_corrected, suggested_value, status)
WHERE status = 'pending';

-- 2.2 User Reputation (Track who gives good corrections)
CREATE TABLE IF NOT EXISTS user_reputation (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Correction stats
    corrections_submitted INTEGER DEFAULT 0,
    corrections_approved INTEGER DEFAULT 0,
    corrections_rejected INTEGER DEFAULT 0,

    -- Reputation score (0-100)
    reputation_score DECIMAL(5,2) DEFAULT 50.0,
    reputation_level VARCHAR(20) DEFAULT 'newcomer' CHECK (reputation_level IN ('newcomer', 'contributor', 'trusted', 'expert', 'oracle')),

    -- Rewards tracking
    points_earned INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SECTION 3: PREDICTION ACCURACY TRACKING
-- ============================================================
-- Track if our scores PREDICT incidents - proves value

-- 3.1 Prediction Records
CREATE TABLE IF NOT EXISTS prediction_accuracy (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Score at prediction time
    prediction_date TIMESTAMP NOT NULL,
    safe_score_at_prediction DECIMAL(5,2),
    score_s_at_prediction DECIMAL(5,2),
    score_a_at_prediction DECIMAL(5,2),
    score_f_at_prediction DECIMAL(5,2),
    score_e_at_prediction DECIMAL(5,2),

    -- Our risk assessment
    predicted_risk_level VARCHAR(20) CHECK (predicted_risk_level IN ('very_low', 'low', 'medium', 'high', 'critical')),
    risk_factors JSONB DEFAULT '[]',

    -- What actually happened
    incident_occurred BOOLEAN DEFAULT FALSE,
    incident_id INTEGER REFERENCES security_incidents(id),
    incident_date TIMESTAMP,
    days_until_incident INTEGER,
    funds_lost_usd DECIMAL(18,2),

    -- Prediction evaluation
    prediction_accuracy VARCHAR(20) CHECK (prediction_accuracy IN ('correct_positive', 'correct_negative', 'false_positive', 'false_negative')),
    accuracy_notes TEXT,

    -- This is UNIQUE data - proves our methodology works
    validated_at TIMESTAMP,
    validated_by VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pa_product ON prediction_accuracy(product_id);
CREATE INDEX IF NOT EXISTS idx_pa_incident ON prediction_accuracy(incident_occurred);
CREATE INDEX IF NOT EXISTS idx_pa_accuracy ON prediction_accuracy(prediction_accuracy);

-- ============================================================
-- SECTION 4: SOCIAL SENTIMENT TRACKING
-- ============================================================
-- Track sentiment over time for each product

-- 4.1 Social Sentiment History
CREATE TABLE IF NOT EXISTS social_sentiment (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT NOW(),

    -- Sentiment scores (-1.0 to 1.0)
    overall_sentiment DECIMAL(4,3),
    twitter_sentiment DECIMAL(4,3),
    reddit_sentiment DECIMAL(4,3),
    discord_sentiment DECIMAL(4,3),

    -- Volume metrics
    mentions_24h INTEGER DEFAULT 0,
    mentions_7d INTEGER DEFAULT 0,

    -- Trending indicators
    is_trending BOOLEAN DEFAULT FALSE,
    trending_reason VARCHAR(200),

    -- Alert detection
    sentiment_alerts JSONB DEFAULT '[]', -- [{type: 'fud', severity: 'high', text: '...'}]

    -- Source data
    sample_tweets JSONB DEFAULT '[]',
    data_sources TEXT[],

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ss_product_time ON social_sentiment(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ss_trending ON social_sentiment(is_trending);

-- ============================================================
-- SECTION 5: API USAGE ANALYTICS
-- ============================================================
-- Understand market interest - which products are queried most?

-- 5.1 API Usage Analytics
CREATE TABLE IF NOT EXISTS api_usage_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,

    -- Endpoint tracking
    endpoint VARCHAR(100) NOT NULL,
    product_slug VARCHAR(100), -- NULL for non-product endpoints

    -- Usage metrics
    requests_count INTEGER DEFAULT 0,
    unique_ips INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,

    -- Response metrics
    avg_response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,

    -- User tier breakdown
    free_tier_requests INTEGER DEFAULT 0,
    pro_tier_requests INTEGER DEFAULT 0,
    enterprise_requests INTEGER DEFAULT 0,

    -- Geographic data (anonymized)
    top_countries JSONB DEFAULT '[]',

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(date, endpoint, product_slug)
);

CREATE INDEX IF NOT EXISTS idx_aua_date ON api_usage_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_aua_product ON api_usage_analytics(product_slug);
CREATE INDEX IF NOT EXISTS idx_aua_endpoint ON api_usage_analytics(endpoint);

-- 5.2 Product Interest Score (derived from API usage)
CREATE TABLE IF NOT EXISTS product_interest_metrics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Interest metrics
    api_requests INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    comparison_appearances INTEGER DEFAULT 0, -- How often in comparisons

    -- Derived scores
    interest_score DECIMAL(5,2), -- 0-100
    trend VARCHAR(20) CHECK (trend IN ('rising', 'stable', 'declining', 'viral', 'dead')),

    -- Weekly/monthly aggregates
    interest_7d_avg DECIMAL(5,2),
    interest_30d_avg DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(product_id, date)
);

CREATE INDEX IF NOT EXISTS idx_pim_product_date ON product_interest_metrics(product_id, date DESC);

-- ============================================================
-- SECTION 6: ENHANCED SCORE HISTORY (Hourly Granularity)
-- ============================================================
-- More frequent snapshots = faster moat building

-- 6.1 Hourly Score Snapshots
CREATE TABLE IF NOT EXISTS score_history_hourly (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT NOW(),

    -- Scores
    safe_score DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),
    consumer_score DECIMAL(5,2),
    essential_score DECIMAL(5,2),

    -- Change tracking (vs previous hour)
    score_change_1h DECIMAL(5,2),

    -- Trigger info
    triggered_by VARCHAR(50) DEFAULT 'hourly_cron',
    trigger_reason TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Partition by month for performance (optional, for high volume)
CREATE INDEX IF NOT EXISTS idx_shh_product_time ON score_history_hourly(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_shh_recorded ON score_history_hourly(recorded_at DESC);

-- ============================================================
-- SECTION 7: DATA PROTECTION (Anti-Scraping)
-- ============================================================

-- 7.1 Data Watermarks (Detect data theft)
CREATE TABLE IF NOT EXISTS data_watermarks (
    id SERIAL PRIMARY KEY,
    watermark_type VARCHAR(50) NOT NULL, -- 'score_variation', 'fake_product', 'timestamp_signature'
    watermark_value TEXT NOT NULL,
    applied_to VARCHAR(100), -- 'api_response', 'export', 'public_page'

    -- Detection tracking
    detected_externally BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP,
    detected_source VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '90 days'
);

-- 7.2 Scraper Detection Log
CREATE TABLE IF NOT EXISTS scraper_detection_log (
    id SERIAL PRIMARY KEY,
    ip_address INET,
    user_agent TEXT,
    fingerprint_hash VARCHAR(64),

    -- Detection reason
    detection_type VARCHAR(50), -- 'rate_limit', 'pattern', 'honeypot', 'fingerprint'
    confidence_score DECIMAL(3,2),

    -- Action taken
    action_taken VARCHAR(50), -- 'warned', 'rate_limited', 'blocked', 'none'

    -- Request details
    requests_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdl_ip ON scraper_detection_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_sdl_fingerprint ON scraper_detection_log(fingerprint_hash);

-- ============================================================
-- SECTION 8: COMPETITIVE INTELLIGENCE
-- ============================================================

-- 8.1 Market Data Snapshots
CREATE TABLE IF NOT EXISTS market_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,

    -- DeFi metrics
    total_defi_tvl DECIMAL(18,2),
    total_dex_volume_24h DECIMAL(18,2),
    total_lending_supplied DECIMAL(18,2),
    total_lending_borrowed DECIMAL(18,2),

    -- Market leaders
    top_gainers JSONB DEFAULT '[]',
    top_losers JSONB DEFAULT '[]',

    -- Our coverage
    products_tracked INTEGER,
    products_with_scores INTEGER,
    coverage_percentage DECIMAL(5,2),

    -- Incident summary
    incidents_today INTEGER DEFAULT 0,
    funds_lost_today DECIMAL(18,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 8.2 Competitor Tracking (Optional)
CREATE TABLE IF NOT EXISTS competitor_data (
    id SERIAL PRIMARY KEY,
    competitor_name VARCHAR(100) NOT NULL,
    data_point VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW(),

    value_text TEXT,
    value_numeric DECIMAL(18,4),

    source_url VARCHAR(255),
    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SECTION 9: DATA COLLECTION LOGS
-- ============================================================

-- 9.1 Data Collection Logs (Track all collection runs)
CREATE TABLE IF NOT EXISTS data_collection_logs (
    id SERIAL PRIMARY KEY,
    collection_type VARCHAR(50) NOT NULL, -- 'incidents', 'onchain', 'social', 'scores', 'market'
    run_date TIMESTAMP DEFAULT NOW(),

    -- Results
    items_collected INTEGER DEFAULT 0,
    items_saved INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,

    -- Performance
    duration_seconds INTEGER,

    -- Details
    source_breakdown JSONB DEFAULT '{}', -- {defillama: 50, twitter: 10, ...}
    error_details JSONB DEFAULT '[]',

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dcl_type_date ON data_collection_logs(collection_type, run_date DESC);

-- ============================================================
-- SECTION 10: FUNCTIONS FOR GPT-PROOF DATA
-- ============================================================

-- 10.1 Record hourly score snapshot
CREATE OR REPLACE FUNCTION record_hourly_score_snapshot(
    p_product_id INTEGER,
    p_triggered_by VARCHAR(50) DEFAULT 'hourly_cron'
)
RETURNS INTEGER AS $$
DECLARE
    v_scores RECORD;
    v_previous DECIMAL(5,2);
    v_new_id INTEGER;
BEGIN
    -- Get current scores
    SELECT note_finale, score_s, score_a, score_f, score_e,
           note_consumer, note_essential
    INTO v_scores
    FROM safe_scoring_results
    WHERE product_id = p_product_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Get previous hourly score
    SELECT safe_score INTO v_previous
    FROM score_history_hourly
    WHERE product_id = p_product_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    -- Insert new snapshot
    INSERT INTO score_history_hourly (
        product_id, safe_score, score_s, score_a, score_f, score_e,
        consumer_score, essential_score, score_change_1h, triggered_by
    )
    VALUES (
        p_product_id, v_scores.note_finale, v_scores.score_s, v_scores.score_a,
        v_scores.score_f, v_scores.score_e, v_scores.note_consumer,
        v_scores.note_essential,
        CASE WHEN v_previous IS NOT NULL THEN v_scores.note_finale - v_previous ELSE 0 END,
        p_triggered_by
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- 10.2 Snapshot all products hourly
CREATE OR REPLACE FUNCTION snapshot_all_scores_hourly()
RETURNS TABLE(products_snapshotted INTEGER, errors INTEGER) AS $$
DECLARE
    v_product RECORD;
    v_count INTEGER := 0;
    v_errors INTEGER := 0;
BEGIN
    FOR v_product IN
        SELECT product_id FROM safe_scoring_results WHERE note_finale IS NOT NULL
    LOOP
        BEGIN
            PERFORM record_hourly_score_snapshot(v_product.product_id, 'hourly_batch');
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
        END;
    END LOOP;

    RETURN QUERY SELECT v_count, v_errors;
END;
$$ LANGUAGE plpgsql;

-- 10.3 Get product data moat (unique data points for a product)
CREATE OR REPLACE FUNCTION get_product_moat_data(p_product_id INTEGER)
RETURNS TABLE (
    score_history_count BIGINT,
    hourly_snapshots_count BIGINT,
    incidents_count BIGINT,
    corrections_count BIGINT,
    predictions_count BIGINT,
    sentiment_records BIGINT,
    onchain_records BIGINT,
    first_tracked DATE,
    days_tracked INTEGER,
    moat_strength VARCHAR(20)
) AS $$
DECLARE
    v_total_points BIGINT;
    v_first_date DATE;
BEGIN
    -- Count all data points
    SELECT COUNT(*) INTO score_history_count FROM score_history WHERE product_id = p_product_id;
    SELECT COUNT(*) INTO hourly_snapshots_count FROM score_history_hourly WHERE product_id = p_product_id;
    SELECT COUNT(*) INTO incidents_count FROM incident_product_impact WHERE product_id = p_product_id;
    SELECT COUNT(*) INTO corrections_count FROM user_corrections WHERE product_id = p_product_id;
    SELECT COUNT(*) INTO predictions_count FROM prediction_accuracy WHERE product_id = p_product_id;
    SELECT COUNT(*) INTO sentiment_records FROM social_sentiment WHERE product_id = p_product_id;
    SELECT COUNT(*) INTO onchain_records FROM product_unique_metrics WHERE product_id = p_product_id;

    -- Get first tracking date
    SELECT MIN(recorded_at)::DATE INTO v_first_date FROM score_history WHERE product_id = p_product_id;
    first_tracked := v_first_date;
    days_tracked := COALESCE(CURRENT_DATE - v_first_date, 0);

    -- Calculate moat strength
    v_total_points := score_history_count + hourly_snapshots_count + incidents_count +
                      corrections_count + predictions_count + sentiment_records + onchain_records;

    moat_strength := CASE
        WHEN v_total_points >= 1000 AND days_tracked >= 365 THEN 'FORTRESS'
        WHEN v_total_points >= 500 AND days_tracked >= 180 THEN 'STRONG'
        WHEN v_total_points >= 100 AND days_tracked >= 90 THEN 'BUILDING'
        WHEN v_total_points >= 30 THEN 'EMERGING'
        ELSE 'STARTING'
    END;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 10.4 Validate prediction accuracy (run after incidents)
CREATE OR REPLACE FUNCTION validate_prediction_for_incident(p_incident_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_incident RECORD;
    v_product_id INTEGER;
    v_prediction RECORD;
    v_updated INTEGER := 0;
BEGIN
    -- Get incident details
    SELECT * INTO v_incident FROM security_incidents WHERE id = p_incident_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- For each affected product
    FOR v_product_id IN
        SELECT product_id FROM incident_product_impact WHERE incident_id = p_incident_id
    LOOP
        -- Find predictions made before the incident
        FOR v_prediction IN
            SELECT * FROM prediction_accuracy
            WHERE product_id = v_product_id
            AND prediction_date < v_incident.incident_date
            AND incident_occurred IS NULL OR incident_occurred = FALSE
        LOOP
            -- Update prediction with actual result
            UPDATE prediction_accuracy
            SET
                incident_occurred = TRUE,
                incident_id = p_incident_id,
                incident_date = v_incident.incident_date,
                days_until_incident = EXTRACT(DAY FROM v_incident.incident_date - prediction_date),
                funds_lost_usd = v_incident.funds_lost_usd,
                prediction_accuracy = CASE
                    WHEN predicted_risk_level IN ('high', 'critical') THEN 'correct_positive'
                    ELSE 'false_negative'
                END,
                validated_at = NOW(),
                validated_by = 'auto_validation'
            WHERE id = v_prediction.id;

            v_updated := v_updated + 1;
        END LOOP;
    END LOOP;

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- 10.5 Calculate user reputation
CREATE OR REPLACE FUNCTION update_user_reputation(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_stats RECORD;
    v_new_score DECIMAL(5,2);
    v_level VARCHAR(20);
BEGIN
    -- Get correction stats
    SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
    INTO v_stats
    FROM user_corrections
    WHERE user_id = p_user_id;

    -- Calculate score (base 50, adjust based on approval rate)
    IF v_stats.total > 0 THEN
        v_new_score := 50 + ((v_stats.approved::DECIMAL / v_stats.total) - 0.5) * 100;
        v_new_score := GREATEST(0, LEAST(100, v_new_score)); -- Clamp 0-100
    ELSE
        v_new_score := 50;
    END IF;

    -- Determine level
    v_level := CASE
        WHEN v_new_score >= 90 AND v_stats.approved >= 50 THEN 'oracle'
        WHEN v_new_score >= 80 AND v_stats.approved >= 20 THEN 'expert'
        WHEN v_new_score >= 70 AND v_stats.approved >= 10 THEN 'trusted'
        WHEN v_new_score >= 60 AND v_stats.approved >= 5 THEN 'contributor'
        ELSE 'newcomer'
    END;

    -- Update reputation
    INSERT INTO user_reputation (user_id, corrections_submitted, corrections_approved, corrections_rejected, reputation_score, reputation_level)
    VALUES (p_user_id, v_stats.total, v_stats.approved, v_stats.rejected, v_new_score, v_level)
    ON CONFLICT (user_id) DO UPDATE SET
        corrections_submitted = v_stats.total,
        corrections_approved = v_stats.approved,
        corrections_rejected = v_stats.rejected,
        reputation_score = v_new_score,
        reputation_level = v_level,
        updated_at = NOW();

    RETURN v_new_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 11: VIEWS FOR GPT-PROOF DATA
-- ============================================================

-- 11.1 Product Moat Overview
CREATE OR REPLACE VIEW v_product_moat_overview AS
SELECT
    p.id as product_id,
    p.name as product_name,
    p.slug,
    ssr.note_finale as current_score,
    (SELECT COUNT(*) FROM score_history WHERE product_id = p.id) as daily_snapshots,
    (SELECT COUNT(*) FROM score_history_hourly WHERE product_id = p.id) as hourly_snapshots,
    (SELECT COUNT(*) FROM incident_product_impact WHERE product_id = p.id) as incidents,
    (SELECT COUNT(*) FROM user_corrections WHERE product_id = p.id AND status = 'approved') as corrections,
    (SELECT MIN(recorded_at)::DATE FROM score_history WHERE product_id = p.id) as tracking_since,
    CURRENT_DATE - (SELECT MIN(recorded_at)::DATE FROM score_history WHERE product_id = p.id) as days_tracked
FROM products p
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
ORDER BY days_tracked DESC NULLS LAST;

-- 11.2 Prediction Success Rate
CREATE OR REPLACE VIEW v_prediction_success_rate AS
SELECT
    COUNT(*) as total_predictions,
    COUNT(*) FILTER (WHERE prediction_accuracy = 'correct_positive') as correct_positive,
    COUNT(*) FILTER (WHERE prediction_accuracy = 'correct_negative') as correct_negative,
    COUNT(*) FILTER (WHERE prediction_accuracy = 'false_positive') as false_positive,
    COUNT(*) FILTER (WHERE prediction_accuracy = 'false_negative') as false_negative,
    ROUND(
        COUNT(*) FILTER (WHERE prediction_accuracy IN ('correct_positive', 'correct_negative'))::DECIMAL /
        NULLIF(COUNT(*) FILTER (WHERE prediction_accuracy IS NOT NULL), 0) * 100, 2
    ) as accuracy_percentage,
    SUM(funds_lost_usd) FILTER (WHERE prediction_accuracy = 'correct_positive') as funds_correctly_predicted
FROM prediction_accuracy;

-- 11.3 Data Collection Summary
CREATE OR REPLACE VIEW v_data_collection_summary AS
SELECT
    collection_type,
    COUNT(*) as total_runs,
    SUM(items_collected) as total_items_collected,
    SUM(items_saved) as total_items_saved,
    SUM(errors_count) as total_errors,
    MAX(run_date) as last_run,
    AVG(duration_seconds) as avg_duration_seconds
FROM data_collection_logs
GROUP BY collection_type
ORDER BY last_run DESC;

-- 11.4 Global Moat Statistics
CREATE OR REPLACE VIEW v_global_moat_stats AS
SELECT
    (SELECT COUNT(*) FROM score_history) as total_daily_snapshots,
    (SELECT COUNT(*) FROM score_history_hourly) as total_hourly_snapshots,
    (SELECT COUNT(*) FROM security_incidents) as total_incidents,
    (SELECT COUNT(*) FROM user_corrections WHERE status = 'approved') as total_corrections,
    (SELECT COUNT(*) FROM prediction_accuracy) as total_predictions,
    (SELECT COUNT(DISTINCT product_id) FROM score_history) as products_tracked,
    (SELECT MIN(recorded_at)::DATE FROM score_history) as tracking_since,
    CURRENT_DATE - (SELECT MIN(recorded_at)::DATE FROM score_history) as days_of_data,
    CASE
        WHEN (SELECT COUNT(*) FROM score_history) >= 10000 THEN 'FORTRESS'
        WHEN (SELECT COUNT(*) FROM score_history) >= 5000 THEN 'STRONG'
        WHEN (SELECT COUNT(*) FROM score_history) >= 1000 THEN 'BUILDING'
        WHEN (SELECT COUNT(*) FROM score_history) >= 100 THEN 'EMERGING'
        ELSE 'STARTING'
    END as moat_strength;

-- ============================================================
-- SECTION 12: TRIGGERS FOR AUTOMATIC DATA COLLECTION
-- ============================================================

-- 12.1 Auto-create prediction when score is low
CREATE OR REPLACE FUNCTION auto_create_prediction_on_low_score()
RETURNS TRIGGER AS $$
BEGIN
    -- If score drops below 50, create a prediction record
    IF NEW.note_finale IS NOT NULL AND NEW.note_finale < 50 THEN
        INSERT INTO prediction_accuracy (
            product_id, prediction_date, safe_score_at_prediction,
            score_s_at_prediction, score_a_at_prediction, score_f_at_prediction, score_e_at_prediction,
            predicted_risk_level, risk_factors
        )
        VALUES (
            NEW.product_id, NOW(), NEW.note_finale,
            NEW.score_s, NEW.score_a, NEW.score_f, NEW.score_e,
            CASE
                WHEN NEW.note_finale < 30 THEN 'critical'
                WHEN NEW.note_finale < 40 THEN 'high'
                ELSE 'medium'
            END,
            jsonb_build_array(
                CASE WHEN NEW.score_s < 50 THEN 'Low Security score' END,
                CASE WHEN NEW.score_a < 50 THEN 'Low Adversity score' END,
                CASE WHEN NEW.score_f < 50 THEN 'Low Fidelity score' END,
                CASE WHEN NEW.score_e < 50 THEN 'Low Efficiency score' END
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_prediction ON safe_scoring_results;
CREATE TRIGGER trigger_auto_prediction
    AFTER INSERT OR UPDATE OF note_finale ON safe_scoring_results
    FOR EACH ROW
    WHEN (NEW.note_finale < 50)
    EXECUTE FUNCTION auto_create_prediction_on_low_score();

-- 12.2 Auto-validate predictions when incident occurs
CREATE OR REPLACE FUNCTION auto_validate_predictions_on_incident()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate predictions for all affected products
    IF NEW.affected_product_ids IS NOT NULL AND array_length(NEW.affected_product_ids, 1) > 0 THEN
        PERFORM validate_prediction_for_incident(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_predictions ON security_incidents;
CREATE TRIGGER trigger_validate_predictions
    AFTER INSERT ON security_incidents
    FOR EACH ROW
    WHEN (NEW.affected_product_ids IS NOT NULL)
    EXECUTE FUNCTION auto_validate_predictions_on_incident();

-- 12.3 Update user reputation when correction is reviewed
CREATE OR REPLACE FUNCTION auto_update_reputation_on_review()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
        PERFORM update_user_reputation(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reputation ON user_corrections;
CREATE TRIGGER trigger_update_reputation
    AFTER UPDATE OF status ON user_corrections
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_reputation_on_review();

-- ============================================================
-- SECTION 13: COMMENTS
-- ============================================================

COMMENT ON TABLE product_unique_metrics IS 'Per-product unique metrics tracked over time - UNIQUE DATA impossible to replicate';
COMMENT ON TABLE user_corrections IS 'User feedback loop - improves data quality, creates engagement moat';
COMMENT ON TABLE prediction_accuracy IS 'Tracks if our scores predict incidents - PROVES methodology value';
COMMENT ON TABLE social_sentiment IS 'Social sentiment per product over time - UNIQUE time-series data';
COMMENT ON TABLE api_usage_analytics IS 'API usage analytics - reveals market interest patterns';
COMMENT ON TABLE score_history_hourly IS 'Hourly score snapshots - 24x faster moat building';
COMMENT ON TABLE data_watermarks IS 'Anti-scraping protection - detect data theft';

-- ============================================================
-- DONE!
-- ============================================================
SELECT 'GPT-PROOF MOAT TABLES created successfully!' as status;
