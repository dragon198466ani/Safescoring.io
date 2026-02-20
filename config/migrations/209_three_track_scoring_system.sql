-- ============================================================================
-- MIGRATION 209: Three-Track Scoring System
-- SafeScoring - 2026-02-03
-- ============================================================================
-- Implements the 3-graph scoring display:
-- 1. AI Score (pure AI evaluations)
-- 2. Community Score (community consensus/requalified evaluations)
-- 3. Hybrid Score (weighted combination of AI + Community)
-- ============================================================================

-- ============================================================================
-- 1. VOTES REQUIRED PER EVALUATION
-- ============================================================================
-- Different evaluation types may require different vote thresholds

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS votes_required INTEGER DEFAULT 3;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS votes_weight NUMERIC(3,2) DEFAULT 1.0;

COMMENT ON COLUMN evaluations.votes_required IS 'Number of votes required for consensus (default 3)';
COMMENT ON COLUMN evaluations.votes_weight IS 'Weight of this evaluation in scoring (0.0-1.0)';

-- Set higher vote requirements for critical norms
UPDATE evaluations e
SET votes_required = 5
FROM norms n
WHERE e.norm_id = n.id
AND n.pillar = 'S'  -- Security pillar needs more votes
AND e.votes_required = 3;

-- ============================================================================
-- 2. THREE-TRACK SCORES TABLE
-- ============================================================================
-- Stores current scores for each product per pillar in 3 tracks

CREATE TABLE IF NOT EXISTS product_scores_3track (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pillar VARCHAR(1) NOT NULL CHECK (pillar IN ('S', 'A', 'F', 'E')),

    -- AI Track (pure AI evaluations)
    ai_score NUMERIC(5,2) CHECK (ai_score >= 0 AND ai_score <= 100),
    ai_evaluated_count INTEGER DEFAULT 0,
    ai_passed_count INTEGER DEFAULT 0,
    ai_failed_count INTEGER DEFAULT 0,
    ai_partial_count INTEGER DEFAULT 0,

    -- Community Track (consensus-modified evaluations only)
    community_score NUMERIC(5,2) CHECK (community_score >= 0 AND community_score <= 100),
    community_confirmed_count INTEGER DEFAULT 0,
    community_challenged_count INTEGER DEFAULT 0,
    community_pending_count INTEGER DEFAULT 0,
    community_total_votes INTEGER DEFAULT 0,

    -- Hybrid Track (weighted combination)
    hybrid_score NUMERIC(5,2) CHECK (hybrid_score >= 0 AND hybrid_score <= 100),
    hybrid_ai_weight NUMERIC(3,2) DEFAULT 0.60,  -- 60% AI weight by default
    hybrid_community_weight NUMERIC(3,2) DEFAULT 0.40,  -- 40% Community weight

    -- Confidence metrics
    ai_confidence NUMERIC(3,2) DEFAULT 0.5,
    community_confidence NUMERIC(3,2) DEFAULT 0.0,
    overall_confidence NUMERIC(3,2) DEFAULT 0.0,

    -- Metadata
    last_ai_update TIMESTAMPTZ,
    last_community_update TIMESTAMPTZ,
    last_calculated TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(product_id, pillar)
);

CREATE INDEX IF NOT EXISTS idx_product_scores_3track_product ON product_scores_3track(product_id);
CREATE INDEX IF NOT EXISTS idx_product_scores_3track_pillar ON product_scores_3track(pillar);

-- ============================================================================
-- 3. TEMPORAL SCORE HISTORY
-- ============================================================================
-- Track score changes over time for graph display

CREATE TABLE IF NOT EXISTS product_scores_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pillar VARCHAR(1) NOT NULL CHECK (pillar IN ('S', 'A', 'F', 'E')),

    -- Score snapshots
    ai_score NUMERIC(5,2),
    community_score NUMERIC(5,2),
    hybrid_score NUMERIC(5,2),

    -- What triggered this snapshot
    change_type TEXT CHECK (change_type IN (
        'ai_evaluation',           -- New AI evaluation
        'ai_re_evaluation',        -- AI re-evaluated
        'community_confirmed',     -- Community confirmed AI
        'community_challenged',    -- Community challenged AI
        'weight_adjustment',       -- Hybrid weights changed
        'periodic_snapshot'        -- Daily/weekly snapshot
    )),

    -- Context
    evaluation_id INTEGER REFERENCES evaluations(id),
    votes_at_time INTEGER,

    -- Timestamp
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_scores_history_product ON product_scores_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_scores_history_pillar ON product_scores_history(product_id, pillar);
CREATE INDEX IF NOT EXISTS idx_product_scores_history_time ON product_scores_history(recorded_at DESC);

-- ============================================================================
-- 4. FUNCTION: Calculate AI Score per Pillar
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_ai_pillar_score(
    p_product_id INTEGER,
    p_pillar VARCHAR(1)
)
RETURNS TABLE (
    score NUMERIC(5,2),
    evaluated_count INTEGER,
    passed_count INTEGER,
    failed_count INTEGER,
    partial_count INTEGER,
    confidence NUMERIC(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Score: (YES*100 + PARTIAL*50) / total with YES or NO or PARTIAL
        ROUND(
            (
                COUNT(*) FILTER (WHERE e.result = 'YES') * 100.0 +
                COUNT(*) FILTER (WHERE e.result = 'PARTIAL') * 50.0
            ) / NULLIF(
                COUNT(*) FILTER (WHERE e.result IN ('YES', 'NO', 'PARTIAL')),
                0
            ),
            2
        )::NUMERIC(5,2) as score,

        COUNT(*)::INTEGER as evaluated_count,
        COUNT(*) FILTER (WHERE e.result = 'YES')::INTEGER as passed_count,
        COUNT(*) FILTER (WHERE e.result = 'NO')::INTEGER as failed_count,
        COUNT(*) FILTER (WHERE e.result = 'PARTIAL')::INTEGER as partial_count,

        -- Confidence based on how many norms were evaluated
        LEAST(1.0, COUNT(*) FILTER (WHERE e.result IN ('YES', 'NO', 'PARTIAL'))::NUMERIC / 10.0)::NUMERIC(3,2) as confidence

    FROM evaluations e
    JOIN norms n ON e.norm_id = n.id
    WHERE e.product_id = p_product_id
      AND n.pillar = p_pillar
      AND e.result IN ('YES', 'NO', 'PARTIAL', 'TBD')
      AND (e.is_honeypot = FALSE OR e.is_honeypot IS NULL);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. FUNCTION: Calculate Community Score per Pillar
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_community_pillar_score(
    p_product_id INTEGER,
    p_pillar VARCHAR(1)
)
RETURNS TABLE (
    score NUMERIC(5,2),
    confirmed_count INTEGER,
    challenged_count INTEGER,
    pending_count INTEGER,
    total_votes INTEGER,
    confidence NUMERIC(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Score based on effective results (community overrides when challenged)
        ROUND(
            (
                COUNT(*) FILTER (WHERE
                    (e.community_consensus = 'CHALLENGED' AND e.community_suggested_result = 'YES')
                    OR (e.community_consensus = 'CONFIRMED' AND e.result = 'YES')
                    OR (e.community_consensus IS NULL AND e.result = 'YES')
                ) * 100.0 +
                COUNT(*) FILTER (WHERE
                    (e.community_consensus = 'CHALLENGED' AND e.community_suggested_result = 'PARTIAL')
                    OR (e.community_consensus = 'CONFIRMED' AND e.result = 'PARTIAL')
                    OR (e.community_consensus IS NULL AND e.result = 'PARTIAL')
                ) * 50.0
            ) / NULLIF(
                COUNT(*) FILTER (WHERE e.result IN ('YES', 'NO', 'PARTIAL')),
                0
            ),
            2
        )::NUMERIC(5,2) as score,

        COUNT(*) FILTER (WHERE e.community_consensus = 'CONFIRMED')::INTEGER as confirmed_count,
        COUNT(*) FILTER (WHERE e.community_consensus = 'CHALLENGED')::INTEGER as challenged_count,
        COUNT(*) FILTER (WHERE e.community_consensus IS NULL AND e.consensus_vote_count > 0)::INTEGER as pending_count,
        COALESCE(SUM(e.consensus_vote_count), 0)::INTEGER as total_votes,

        -- Confidence based on how many have consensus
        LEAST(1.0,
            COUNT(*) FILTER (WHERE e.community_consensus IS NOT NULL)::NUMERIC /
            NULLIF(COUNT(*) FILTER (WHERE e.result IN ('YES', 'NO', 'PARTIAL')), 0)
        )::NUMERIC(3,2) as confidence

    FROM evaluations e
    JOIN norms n ON e.norm_id = n.id
    WHERE e.product_id = p_product_id
      AND n.pillar = p_pillar
      AND (e.is_honeypot = FALSE OR e.is_honeypot IS NULL);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. FUNCTION: Recalculate All Scores for a Product
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_product_3track_scores(
    p_product_id INTEGER,
    p_change_type TEXT DEFAULT 'ai_evaluation',
    p_evaluation_id INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_pillar VARCHAR(1);
    v_ai RECORD;
    v_community RECORD;
    v_hybrid_score NUMERIC(5,2);
    v_ai_weight NUMERIC(3,2);
    v_community_weight NUMERIC(3,2);
BEGIN
    -- Process each pillar
    FOR v_pillar IN SELECT unnest(ARRAY['S', 'A', 'F', 'E'])
    LOOP
        -- Get AI scores
        SELECT * INTO v_ai FROM calculate_ai_pillar_score(p_product_id, v_pillar);

        -- Get Community scores
        SELECT * INTO v_community FROM calculate_community_pillar_score(p_product_id, v_pillar);

        -- Calculate hybrid score with dynamic weights
        -- More community votes = more community weight
        IF COALESCE(v_community.confidence, 0) > 0 THEN
            v_ai_weight := 0.60 - (v_community.confidence * 0.20);  -- 60% down to 40%
            v_community_weight := 0.40 + (v_community.confidence * 0.20);  -- 40% up to 60%
        ELSE
            v_ai_weight := 1.0;
            v_community_weight := 0.0;
        END IF;

        v_hybrid_score := ROUND(
            COALESCE(v_ai.score, 0) * v_ai_weight +
            COALESCE(v_community.score, 0) * v_community_weight,
            2
        );

        -- Upsert current scores
        INSERT INTO product_scores_3track (
            product_id, pillar,
            ai_score, ai_evaluated_count, ai_passed_count, ai_failed_count, ai_partial_count,
            community_score, community_confirmed_count, community_challenged_count,
            community_pending_count, community_total_votes,
            hybrid_score, hybrid_ai_weight, hybrid_community_weight,
            ai_confidence, community_confidence, overall_confidence,
            last_ai_update, last_community_update, last_calculated
        ) VALUES (
            p_product_id, v_pillar,
            v_ai.score, v_ai.evaluated_count, v_ai.passed_count, v_ai.failed_count, v_ai.partial_count,
            v_community.score, v_community.confirmed_count, v_community.challenged_count,
            v_community.pending_count, v_community.total_votes,
            v_hybrid_score, v_ai_weight, v_community_weight,
            v_ai.confidence, v_community.confidence,
            (v_ai.confidence * v_ai_weight + v_community.confidence * v_community_weight),
            CASE WHEN p_change_type LIKE 'ai_%' THEN NOW() ELSE NULL END,
            CASE WHEN p_change_type LIKE 'community_%' THEN NOW() ELSE NULL END,
            NOW()
        )
        ON CONFLICT (product_id, pillar) DO UPDATE SET
            ai_score = EXCLUDED.ai_score,
            ai_evaluated_count = EXCLUDED.ai_evaluated_count,
            ai_passed_count = EXCLUDED.ai_passed_count,
            ai_failed_count = EXCLUDED.ai_failed_count,
            ai_partial_count = EXCLUDED.ai_partial_count,
            community_score = EXCLUDED.community_score,
            community_confirmed_count = EXCLUDED.community_confirmed_count,
            community_challenged_count = EXCLUDED.community_challenged_count,
            community_pending_count = EXCLUDED.community_pending_count,
            community_total_votes = EXCLUDED.community_total_votes,
            hybrid_score = EXCLUDED.hybrid_score,
            hybrid_ai_weight = EXCLUDED.hybrid_ai_weight,
            hybrid_community_weight = EXCLUDED.hybrid_community_weight,
            ai_confidence = EXCLUDED.ai_confidence,
            community_confidence = EXCLUDED.community_confidence,
            overall_confidence = EXCLUDED.overall_confidence,
            last_ai_update = CASE
                WHEN p_change_type LIKE 'ai_%' THEN NOW()
                ELSE product_scores_3track.last_ai_update
            END,
            last_community_update = CASE
                WHEN p_change_type LIKE 'community_%' THEN NOW()
                ELSE product_scores_3track.last_community_update
            END,
            last_calculated = NOW();

        -- Record history
        INSERT INTO product_scores_history (
            product_id, pillar,
            ai_score, community_score, hybrid_score,
            change_type, evaluation_id, votes_at_time, recorded_at
        ) VALUES (
            p_product_id, v_pillar,
            v_ai.score, v_community.score, v_hybrid_score,
            p_change_type, p_evaluation_id, v_community.total_votes, NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGER: Auto-recalculate on Consensus Change
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_on_consensus()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when consensus is reached
    IF NEW.community_consensus IS NOT NULL AND OLD.community_consensus IS NULL THEN
        PERFORM recalculate_product_3track_scores(
            NEW.product_id,
            CASE NEW.community_consensus
                WHEN 'CONFIRMED' THEN 'community_confirmed'
                WHEN 'CHALLENGED' THEN 'community_challenged'
            END,
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_scores_on_consensus ON evaluations;
CREATE TRIGGER trg_recalculate_scores_on_consensus
AFTER UPDATE OF community_consensus ON evaluations
FOR EACH ROW
WHEN (OLD.community_consensus IS DISTINCT FROM NEW.community_consensus)
EXECUTE FUNCTION trigger_recalculate_on_consensus();

-- ============================================================================
-- 8. TRIGGER: Auto-recalculate on AI Evaluation
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_on_ai_eval()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for AI evaluations (not honeypots)
    IF (NEW.is_honeypot = FALSE OR NEW.is_honeypot IS NULL) THEN
        PERFORM recalculate_product_3track_scores(
            NEW.product_id,
            CASE
                WHEN TG_OP = 'INSERT' THEN 'ai_evaluation'
                ELSE 'ai_re_evaluation'
            END,
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_scores_on_ai_eval ON evaluations;
CREATE TRIGGER trg_recalculate_scores_on_ai_eval
AFTER INSERT OR UPDATE OF result ON evaluations
FOR EACH ROW
WHEN (NEW.result IN ('YES', 'NO', 'PARTIAL'))
EXECUTE FUNCTION trigger_recalculate_on_ai_eval();

-- ============================================================================
-- 9. VIEW: Graph Data for Frontend
-- ============================================================================

CREATE OR REPLACE VIEW product_scores_graph_data AS
SELECT
    p.id as product_id,
    p.slug as product_slug,
    p.name as product_name,

    -- Overall scores (average across pillars)
    ROUND(AVG(s.ai_score), 2) as overall_ai_score,
    ROUND(AVG(s.community_score), 2) as overall_community_score,
    ROUND(AVG(s.hybrid_score), 2) as overall_hybrid_score,

    -- Per-pillar scores as JSON
    jsonb_object_agg(
        s.pillar,
        jsonb_build_object(
            'ai_score', s.ai_score,
            'community_score', s.community_score,
            'hybrid_score', s.hybrid_score,
            'ai_confidence', s.ai_confidence,
            'community_confidence', s.community_confidence,
            'total_votes', s.community_total_votes,
            'confirmed', s.community_confirmed_count,
            'challenged', s.community_challenged_count
        )
    ) as pillar_scores,

    -- Totals
    SUM(s.ai_evaluated_count)::INTEGER as total_evaluations,
    SUM(s.community_total_votes)::INTEGER as total_community_votes,
    SUM(s.community_confirmed_count)::INTEGER as total_confirmed,
    SUM(s.community_challenged_count)::INTEGER as total_challenged,

    -- Last updates
    MAX(s.last_ai_update) as last_ai_update,
    MAX(s.last_community_update) as last_community_update

FROM products p
LEFT JOIN product_scores_3track s ON p.id = s.product_id
GROUP BY p.id, p.slug, p.name;

COMMENT ON VIEW product_scores_graph_data IS 'Aggregated 3-track scores per product for frontend graph display';

-- ============================================================================
-- 10. VIEW: Score History for Timeline Graph
-- ============================================================================

CREATE OR REPLACE VIEW product_scores_timeline AS
SELECT
    h.product_id,
    p.slug as product_slug,
    h.pillar,
    h.ai_score,
    h.community_score,
    h.hybrid_score,
    h.change_type,
    h.votes_at_time,
    h.recorded_at,
    -- For charting: extract date components
    DATE(h.recorded_at) as record_date,
    EXTRACT(HOUR FROM h.recorded_at)::INTEGER as record_hour
FROM product_scores_history h
JOIN products p ON p.id = h.product_id
ORDER BY h.recorded_at DESC;

COMMENT ON VIEW product_scores_timeline IS 'Temporal score data for timeline/chart display';

-- ============================================================================
-- 11. FUNCTION: Get Score History for Graph
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_score_history(
    p_product_slug TEXT,
    p_pillar VARCHAR(1) DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    recorded_at TIMESTAMPTZ,
    pillar VARCHAR(1),
    ai_score NUMERIC(5,2),
    community_score NUMERIC(5,2),
    hybrid_score NUMERIC(5,2),
    change_type TEXT,
    votes_at_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.recorded_at,
        h.pillar,
        h.ai_score,
        h.community_score,
        h.hybrid_score,
        h.change_type,
        h.votes_at_time
    FROM product_scores_history h
    JOIN products p ON p.id = h.product_id
    WHERE p.slug = p_product_slug
      AND h.recorded_at > NOW() - (p_days || ' days')::INTERVAL
      AND (p_pillar IS NULL OR h.pillar = p_pillar)
    ORDER BY h.recorded_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 12. RLS POLICIES
-- ============================================================================

ALTER TABLE product_scores_3track ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_scores_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product scores"
    ON product_scores_3track FOR SELECT USING (true);

CREATE POLICY "Anyone can view score history"
    ON product_scores_history FOR SELECT USING (true);

-- ============================================================================
-- 13. PERMISSIONS
-- ============================================================================

GRANT SELECT ON product_scores_3track TO authenticated, anon;
GRANT SELECT ON product_scores_history TO authenticated, anon;
GRANT SELECT ON product_scores_graph_data TO authenticated, anon;
GRANT SELECT ON product_scores_timeline TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_product_score_history TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_ai_pillar_score TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_community_pillar_score TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 209 - Three-Track Scoring System';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE '3 TRACKS:';
    RAISE NOTICE '  1. AI Score - Pure AI evaluations (immutable)';
    RAISE NOTICE '  2. Community Score - Consensus-modified results';
    RAISE NOTICE '  3. Hybrid Score - Weighted AI + Community';
    RAISE NOTICE '';
    RAISE NOTICE 'TABLES:';
    RAISE NOTICE '  - product_scores_3track: Current scores per pillar';
    RAISE NOTICE '  - product_scores_history: Temporal tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'FEATURES:';
    RAISE NOTICE '  - votes_required per evaluation (default 3, Security=5)';
    RAISE NOTICE '  - Auto-recalculate on consensus/AI change';
    RAISE NOTICE '  - Dynamic hybrid weights based on community confidence';
    RAISE NOTICE '  - Timeline data for graph display';
    RAISE NOTICE '';
    RAISE NOTICE 'VIEWS:';
    RAISE NOTICE '  - product_scores_graph_data: Aggregated for frontend';
    RAISE NOTICE '  - product_scores_timeline: For timeline charts';
    RAISE NOTICE '===========================================';
END $$;
