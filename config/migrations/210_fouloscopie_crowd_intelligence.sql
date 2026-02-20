-- ============================================================================
-- MIGRATION 210: Fouloscopie-Based Crowd Intelligence System
-- SafeScoring - 2026-02-03
-- ============================================================================
-- Implements crowd wisdom principles for 10,000+ voters at scale
-- Based on fouloscopie research (Mehdi Moussaid, etc.)
--
-- KEY PRINCIPLES:
-- 1. BLIND VOTING - Users don't see results before voting (prevents herding)
-- 2. INDEPENDENCE - Detect and penalize coordinated voting
-- 3. DIVERSITY - Weight by expertise domain, not just trust score
-- 4. AGGREGATION - Smart consensus that weights quality over quantity
-- 5. SKIN IN THE GAME - Reputation stakes on votes
-- ============================================================================

-- ============================================================================
-- 1. VOTER PROFILE & EXPERTISE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS voter_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    voter_hash TEXT UNIQUE NOT NULL,  -- For anonymous voters

    -- Expertise domains (based on voting history accuracy)
    expertise_security NUMERIC(4,2) DEFAULT 50.0 CHECK (expertise_security >= 0 AND expertise_security <= 100),
    expertise_adversity NUMERIC(4,2) DEFAULT 50.0 CHECK (expertise_adversity >= 0 AND expertise_adversity <= 100),
    expertise_fidelity NUMERIC(4,2) DEFAULT 50.0 CHECK (expertise_fidelity >= 0 AND expertise_fidelity <= 100),
    expertise_ecosystem NUMERIC(4,2) DEFAULT 50.0 CHECK (expertise_ecosystem >= 0 AND expertise_ecosystem <= 100),

    -- Product type expertise
    expertise_hardware_wallets NUMERIC(4,2) DEFAULT 50.0,
    expertise_exchanges NUMERIC(4,2) DEFAULT 50.0,
    expertise_defi NUMERIC(4,2) DEFAULT 50.0,
    expertise_software_wallets NUMERIC(4,2) DEFAULT 50.0,

    -- Voting behavior metrics
    total_votes INTEGER DEFAULT 0,
    correct_votes INTEGER DEFAULT 0,  -- Votes that aligned with final consensus
    early_correct_votes INTEGER DEFAULT 0,  -- Voted correctly before consensus
    contrarian_correct INTEGER DEFAULT 0,  -- Went against majority and was right

    -- Trust metrics
    trust_score NUMERIC(5,2) DEFAULT 50.0 CHECK (trust_score >= 0 AND trust_score <= 100),
    trust_velocity NUMERIC(4,2) DEFAULT 0,  -- Recent trust change rate

    -- Anti-gaming metrics
    voting_speed_avg_ms INTEGER,  -- Average time to vote
    evidence_rate NUMERIC(3,2) DEFAULT 0,  -- % of votes with evidence
    challenge_rate NUMERIC(3,2) DEFAULT 0,  -- % of votes that challenge AI

    -- Cohort identification
    voter_cohort TEXT,  -- 'expert', 'regular', 'newcomer', 'suspicious'
    cohort_assigned_at TIMESTAMPTZ,

    -- Activity
    last_vote_at TIMESTAMPTZ,
    streak_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voter_profiles_hash ON voter_profiles(voter_hash);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_trust ON voter_profiles(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_cohort ON voter_profiles(voter_cohort);

-- ============================================================================
-- 2. BLIND VOTING - Hide results until user votes
-- ============================================================================

-- Add blind voting config to evaluations
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS blind_voting_until TIMESTAMPTZ;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS min_blind_votes INTEGER DEFAULT 5;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS results_revealed_at TIMESTAMPTZ;

COMMENT ON COLUMN evaluations.blind_voting_until IS 'Results hidden until this time OR min_blind_votes reached';
COMMENT ON COLUMN evaluations.min_blind_votes IS 'Minimum votes before revealing any results';

-- Function to check if results should be visible
CREATE OR REPLACE FUNCTION should_reveal_results(p_evaluation_id INTEGER, p_voter_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_eval RECORD;
    v_has_voted BOOLEAN;
BEGIN
    SELECT
        blind_voting_until,
        min_blind_votes,
        consensus_vote_count,
        results_revealed_at
    INTO v_eval
    FROM evaluations
    WHERE id = p_evaluation_id;

    -- Check if user has voted
    SELECT EXISTS(
        SELECT 1 FROM evaluation_votes
        WHERE evaluation_id = p_evaluation_id
        AND voter_hash = p_voter_hash
    ) INTO v_has_voted;

    -- User can see results if they voted
    IF v_has_voted THEN
        RETURN TRUE;
    END IF;

    -- Results revealed if enough votes collected
    IF v_eval.consensus_vote_count >= v_eval.min_blind_votes THEN
        RETURN TRUE;
    END IF;

    -- Results revealed if blind period ended
    IF v_eval.blind_voting_until IS NOT NULL AND NOW() > v_eval.blind_voting_until THEN
        RETURN TRUE;
    END IF;

    -- Results explicitly revealed
    IF v_eval.results_revealed_at IS NOT NULL THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. WEIGHTED CONSENSUS CALCULATION
-- ============================================================================
-- Not all votes are equal - expertise and trust affect weight

CREATE OR REPLACE FUNCTION calculate_weighted_consensus(p_evaluation_id INTEGER)
RETURNS TABLE (
    weighted_agrees NUMERIC,
    weighted_disagrees NUMERIC,
    total_weight NUMERIC,
    consensus_strength NUMERIC,  -- 0-1, how strong is the consensus
    diversity_score NUMERIC,  -- 0-1, how diverse are the voters
    recommended_consensus TEXT
) AS $$
DECLARE
    v_pillar VARCHAR(1);
BEGIN
    -- Get pillar for this evaluation
    SELECT n.pillar INTO v_pillar
    FROM evaluations e
    JOIN norms n ON e.norm_id = n.id
    WHERE e.id = p_evaluation_id;

    RETURN QUERY
    WITH voter_weights AS (
        SELECT
            ev.id,
            ev.vote_agrees,
            vp.trust_score,
            -- Expertise weight based on pillar
            CASE v_pillar
                WHEN 'S' THEN COALESCE(vp.expertise_security, 50)
                WHEN 'A' THEN COALESCE(vp.expertise_adversity, 50)
                WHEN 'F' THEN COALESCE(vp.expertise_fidelity, 50)
                WHEN 'E' THEN COALESCE(vp.expertise_ecosystem, 50)
                ELSE 50
            END as expertise,
            -- Evidence bonus
            CASE WHEN ev.evidence_url IS NOT NULL THEN 1.2 ELSE 1.0 END as evidence_bonus,
            -- Early voter bonus (first 20% of votes)
            CASE WHEN ev.created_at <= (
                SELECT MIN(created_at) + (MAX(created_at) - MIN(created_at)) * 0.2
                FROM evaluation_votes WHERE evaluation_id = p_evaluation_id
            ) THEN 1.1 ELSE 1.0 END as early_bonus,
            -- Cohort
            vp.voter_cohort
        FROM evaluation_votes ev
        LEFT JOIN voter_profiles vp ON ev.voter_hash = vp.voter_hash
        WHERE ev.evaluation_id = p_evaluation_id
        AND ev.is_flagged = FALSE
        AND ev.status IN ('pending', 'validated')
    ),
    weighted_votes AS (
        SELECT
            vote_agrees,
            -- Final weight = trust * expertise * bonuses, normalized
            (COALESCE(trust_score, 50) / 100.0) *
            (COALESCE(expertise, 50) / 100.0) *
            evidence_bonus *
            early_bonus as vote_weight,
            voter_cohort
        FROM voter_weights
    ),
    cohort_diversity AS (
        SELECT
            COUNT(DISTINCT voter_cohort) as cohort_count,
            COUNT(*) as total_voters
        FROM weighted_votes
    )
    SELECT
        SUM(CASE WHEN vote_agrees THEN vote_weight ELSE 0 END)::NUMERIC as weighted_agrees,
        SUM(CASE WHEN NOT vote_agrees THEN vote_weight ELSE 0 END)::NUMERIC as weighted_disagrees,
        SUM(vote_weight)::NUMERIC as total_weight,
        -- Consensus strength: how lopsided is the result
        ABS(
            SUM(CASE WHEN vote_agrees THEN vote_weight ELSE 0 END) -
            SUM(CASE WHEN NOT vote_agrees THEN vote_weight ELSE 0 END)
        ) / NULLIF(SUM(vote_weight), 0) as consensus_strength,
        -- Diversity score
        (SELECT cohort_count::NUMERIC / GREATEST(4, total_voters) FROM cohort_diversity) as diversity_score,
        -- Recommended consensus
        CASE
            WHEN SUM(CASE WHEN vote_agrees THEN vote_weight ELSE 0 END) >
                 SUM(CASE WHEN NOT vote_agrees THEN vote_weight ELSE 0 END) * 1.2
            THEN 'CONFIRMED'
            WHEN SUM(CASE WHEN NOT vote_agrees THEN vote_weight ELSE 0 END) >
                 SUM(CASE WHEN vote_agrees THEN vote_weight ELSE 0 END) * 1.2
            THEN 'CHALLENGED'
            ELSE 'UNDECIDED'
        END as recommended_consensus
    FROM weighted_votes;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. ANTI-COLLUSION DETECTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS voting_patterns (
    id BIGSERIAL PRIMARY KEY,
    pattern_type TEXT NOT NULL,  -- 'temporal_cluster', 'ip_cluster', 'voting_similarity', 'referral_chain'
    detected_at TIMESTAMPTZ DEFAULT NOW(),

    -- Involved voters
    voter_hashes TEXT[],

    -- Pattern details
    similarity_score NUMERIC(3,2),  -- 0-1
    time_window_minutes INTEGER,
    shared_characteristics JSONB,

    -- Action taken
    action_taken TEXT,  -- 'flagged', 'votes_discounted', 'users_warned', 'users_banned'
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,

    -- Evidence
    evidence JSONB
);

CREATE INDEX IF NOT EXISTS idx_voting_patterns_type ON voting_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_voting_patterns_detected ON voting_patterns(detected_at DESC);

-- Function to detect voting collusion
CREATE OR REPLACE FUNCTION detect_voting_collusion()
RETURNS INTEGER AS $$
DECLARE
    v_patterns_found INTEGER := 0;
    v_pattern RECORD;
BEGIN
    -- Pattern 1: Temporal clustering (many votes in short time from similar profiles)
    INSERT INTO voting_patterns (pattern_type, voter_hashes, similarity_score, time_window_minutes, evidence)
    SELECT
        'temporal_cluster',
        array_agg(DISTINCT voter_hash),
        COUNT(*)::NUMERIC / 10,  -- Normalize
        5,
        jsonb_build_object(
            'vote_count', COUNT(*),
            'time_window', '5 minutes',
            'evaluation_id', evaluation_id
        )
    FROM evaluation_votes
    WHERE created_at > NOW() - INTERVAL '5 minutes'
    GROUP BY evaluation_id, DATE_TRUNC('minute', created_at)
    HAVING COUNT(*) > 10  -- More than 10 votes per minute is suspicious
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_patterns_found = ROW_COUNT;

    -- Pattern 2: IP clustering (many votes from same IP range)
    INSERT INTO voting_patterns (pattern_type, voter_hashes, similarity_score, shared_characteristics, evidence)
    SELECT
        'ip_cluster',
        array_agg(DISTINCT voter_hash),
        COUNT(*)::NUMERIC / 5,
        jsonb_build_object('ip_prefix', SUBSTRING(client_ip FROM 1 FOR 10)),
        jsonb_build_object(
            'vote_count', COUNT(*),
            'ip_prefix', SUBSTRING(client_ip FROM 1 FOR 10)
        )
    FROM evaluation_votes
    WHERE created_at > NOW() - INTERVAL '1 hour'
    AND client_ip IS NOT NULL
    GROUP BY SUBSTRING(client_ip FROM 1 FOR 10)
    HAVING COUNT(DISTINCT voter_hash) > 5
    ON CONFLICT DO NOTHING;

    -- Pattern 3: Voting similarity (voters who always vote the same way)
    INSERT INTO voting_patterns (pattern_type, voter_hashes, similarity_score, evidence)
    SELECT
        'voting_similarity',
        ARRAY[v1.voter_hash, v2.voter_hash],
        agreement_rate,
        jsonb_build_object(
            'shared_votes', shared_votes,
            'agreement_rate', agreement_rate
        )
    FROM (
        SELECT
            ev1.voter_hash as vh1,
            ev2.voter_hash as vh2,
            COUNT(*) as shared_votes,
            SUM(CASE WHEN ev1.vote_agrees = ev2.vote_agrees THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) as agreement_rate
        FROM evaluation_votes ev1
        JOIN evaluation_votes ev2 ON ev1.evaluation_id = ev2.evaluation_id
            AND ev1.voter_hash < ev2.voter_hash
        WHERE ev1.created_at > NOW() - INTERVAL '7 days'
        GROUP BY ev1.voter_hash, ev2.voter_hash
        HAVING COUNT(*) >= 10  -- At least 10 shared votes
        AND SUM(CASE WHEN ev1.vote_agrees = ev2.vote_agrees THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) > 0.95
    ) similarities
    JOIN voter_profiles v1 ON v1.voter_hash = similarities.vh1
    JOIN voter_profiles v2 ON v2.voter_hash = similarities.vh2
    ON CONFLICT DO NOTHING;

    -- Flag suspicious votes
    UPDATE evaluation_votes
    SET is_flagged = TRUE, flag_reason = 'Collusion pattern detected'
    WHERE voter_hash = ANY(
        SELECT UNNEST(voter_hashes)
        FROM voting_patterns
        WHERE detected_at > NOW() - INTERVAL '1 hour'
        AND action_taken IS NULL
    )
    AND is_flagged = FALSE;

    RETURN v_patterns_found;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. STRATIFIED SAMPLING FOR CONSENSUS
-- ============================================================================
-- Ensure diverse voter representation in final consensus

CREATE OR REPLACE FUNCTION get_stratified_consensus(p_evaluation_id INTEGER)
RETURNS TABLE (
    final_consensus TEXT,
    confidence NUMERIC,
    expert_agrees INTEGER,
    expert_disagrees INTEGER,
    regular_agrees INTEGER,
    regular_disagrees INTEGER,
    newcomer_agrees INTEGER,
    newcomer_disagrees INTEGER,
    is_unanimous BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH stratified_votes AS (
        SELECT
            ev.vote_agrees,
            COALESCE(vp.voter_cohort, 'newcomer') as cohort,
            COALESCE(vp.trust_score, 50) as trust
        FROM evaluation_votes ev
        LEFT JOIN voter_profiles vp ON ev.voter_hash = vp.voter_hash
        WHERE ev.evaluation_id = p_evaluation_id
        AND ev.is_flagged = FALSE
    ),
    cohort_results AS (
        SELECT
            cohort,
            SUM(CASE WHEN vote_agrees THEN 1 ELSE 0 END) as agrees,
            SUM(CASE WHEN NOT vote_agrees THEN 1 ELSE 0 END) as disagrees,
            -- Weighted by trust within cohort
            SUM(CASE WHEN vote_agrees THEN trust ELSE 0 END) as weighted_agrees,
            SUM(CASE WHEN NOT vote_agrees THEN trust ELSE 0 END) as weighted_disagrees
        FROM stratified_votes
        GROUP BY cohort
    ),
    final_calc AS (
        SELECT
            -- Expert votes count double
            SUM(CASE WHEN cohort = 'expert' THEN weighted_agrees * 2 ELSE weighted_agrees END) as total_agrees,
            SUM(CASE WHEN cohort = 'expert' THEN weighted_disagrees * 2 ELSE weighted_disagrees END) as total_disagrees,
            -- Individual cohort counts
            SUM(CASE WHEN cohort = 'expert' THEN agrees ELSE 0 END) as exp_agrees,
            SUM(CASE WHEN cohort = 'expert' THEN disagrees ELSE 0 END) as exp_disagrees,
            SUM(CASE WHEN cohort = 'regular' THEN agrees ELSE 0 END) as reg_agrees,
            SUM(CASE WHEN cohort = 'regular' THEN disagrees ELSE 0 END) as reg_disagrees,
            SUM(CASE WHEN cohort = 'newcomer' THEN agrees ELSE 0 END) as new_agrees,
            SUM(CASE WHEN cohort = 'newcomer' THEN disagrees ELSE 0 END) as new_disagrees
        FROM cohort_results
    )
    SELECT
        CASE
            WHEN total_agrees > total_disagrees * 1.2 THEN 'CONFIRMED'
            WHEN total_disagrees > total_agrees * 1.2 THEN 'CHALLENGED'
            ELSE 'UNDECIDED'
        END as final_consensus,
        ABS(total_agrees - total_disagrees) / NULLIF(total_agrees + total_disagrees, 0) as confidence,
        exp_agrees::INTEGER,
        exp_disagrees::INTEGER,
        reg_agrees::INTEGER,
        reg_disagrees::INTEGER,
        new_agrees::INTEGER,
        new_disagrees::INTEGER,
        (exp_disagrees = 0 AND reg_disagrees = 0 AND new_disagrees = 0) OR
        (exp_agrees = 0 AND reg_agrees = 0 AND new_agrees = 0) as is_unanimous
    FROM final_calc;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. DYNAMIC VOTE REQUIREMENTS
-- ============================================================================
-- Complex or controversial evaluations need more votes

CREATE OR REPLACE FUNCTION calculate_required_votes(p_evaluation_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_base_votes INTEGER := 3;
    v_pillar VARCHAR(1);
    v_is_controversial BOOLEAN;
    v_current_split NUMERIC;
    v_norm_complexity INTEGER;
BEGIN
    -- Get evaluation details
    SELECT
        n.pillar,
        COALESCE(n.complexity_score, 1)
    INTO v_pillar, v_norm_complexity
    FROM evaluations e
    JOIN norms n ON e.norm_id = n.id
    WHERE e.id = p_evaluation_id;

    -- Security pillar needs more votes
    IF v_pillar = 'S' THEN
        v_base_votes := v_base_votes + 2;
    END IF;

    -- Complex norms need more votes
    v_base_votes := v_base_votes + LEAST(v_norm_complexity, 3);

    -- Check if voting is currently split (controversial)
    SELECT
        ABS(consensus_agrees - consensus_disagrees)::NUMERIC /
        NULLIF(consensus_vote_count, 0)
    INTO v_current_split
    FROM evaluations
    WHERE id = p_evaluation_id;

    -- If votes are split (< 30% difference), need more votes
    IF v_current_split IS NOT NULL AND v_current_split < 0.3 THEN
        v_base_votes := v_base_votes + 3;
    END IF;

    -- Cap at reasonable maximum
    RETURN LEAST(v_base_votes, 15);
END;
$$ LANGUAGE plpgsql STABLE;

-- Update votes_required dynamically
CREATE OR REPLACE FUNCTION update_dynamic_vote_requirement()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate required votes after each vote
    UPDATE evaluations
    SET votes_required = calculate_required_votes(NEW.evaluation_id)
    WHERE id = NEW.evaluation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_vote_requirement ON evaluation_votes;
CREATE TRIGGER trg_update_vote_requirement
AFTER INSERT ON evaluation_votes
FOR EACH ROW
EXECUTE FUNCTION update_dynamic_vote_requirement();

-- ============================================================================
-- 7. EXPERTISE EVOLUTION
-- ============================================================================
-- Update voter expertise based on accuracy

CREATE OR REPLACE FUNCTION update_voter_expertise_on_consensus()
RETURNS TRIGGER AS $$
DECLARE
    v_pillar VARCHAR(1);
    v_expertise_col TEXT;
    v_vote RECORD;
BEGIN
    -- Only process when consensus is reached
    IF NEW.community_consensus IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get pillar
    SELECT n.pillar INTO v_pillar
    FROM norms n WHERE n.id = NEW.norm_id;

    v_expertise_col := CASE v_pillar
        WHEN 'S' THEN 'expertise_security'
        WHEN 'A' THEN 'expertise_adversity'
        WHEN 'F' THEN 'expertise_fidelity'
        WHEN 'E' THEN 'expertise_ecosystem'
    END;

    -- Update each voter's expertise
    FOR v_vote IN
        SELECT voter_hash, vote_agrees
        FROM evaluation_votes
        WHERE evaluation_id = NEW.id
        AND is_flagged = FALSE
    LOOP
        -- Determine if vote was correct
        IF (v_vote.vote_agrees AND NEW.community_consensus = 'CONFIRMED') OR
           (NOT v_vote.vote_agrees AND NEW.community_consensus = 'CHALLENGED') THEN
            -- Correct vote: increase expertise
            EXECUTE format(
                'UPDATE voter_profiles SET %I = LEAST(%I + 2, 100), correct_votes = correct_votes + 1, total_votes = total_votes + 1 WHERE voter_hash = $1',
                v_expertise_col, v_expertise_col
            ) USING v_vote.voter_hash;
        ELSE
            -- Incorrect vote: decrease expertise
            EXECUTE format(
                'UPDATE voter_profiles SET %I = GREATEST(%I - 1, 0), total_votes = total_votes + 1 WHERE voter_hash = $1',
                v_expertise_col, v_expertise_col
            ) USING v_vote.voter_hash;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_expertise_on_consensus ON evaluations;
CREATE TRIGGER trg_update_expertise_on_consensus
AFTER UPDATE OF community_consensus ON evaluations
FOR EACH ROW
WHEN (NEW.community_consensus IS NOT NULL AND OLD.community_consensus IS NULL)
EXECUTE FUNCTION update_voter_expertise_on_consensus();

-- ============================================================================
-- 8. COHORT CLASSIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION classify_voter_cohort(p_voter_hash TEXT)
RETURNS TEXT AS $$
DECLARE
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile
    FROM voter_profiles
    WHERE voter_hash = p_voter_hash;

    IF NOT FOUND THEN
        RETURN 'newcomer';
    END IF;

    -- Expert: high trust + high accuracy + many votes
    IF v_profile.trust_score >= 80 AND
       v_profile.total_votes >= 50 AND
       v_profile.correct_votes::NUMERIC / NULLIF(v_profile.total_votes, 0) > 0.75 THEN
        RETURN 'expert';
    END IF;

    -- Suspicious: low trust or flagged patterns
    IF v_profile.trust_score < 30 OR
       v_profile.voting_speed_avg_ms < 3000 THEN  -- Too fast
        RETURN 'suspicious';
    END IF;

    -- Regular: established voter
    IF v_profile.total_votes >= 10 THEN
        RETURN 'regular';
    END IF;

    RETURN 'newcomer';
END;
$$ LANGUAGE plpgsql STABLE;

-- Periodic cohort update job
CREATE OR REPLACE FUNCTION update_all_voter_cohorts()
RETURNS INTEGER AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    UPDATE voter_profiles
    SET
        voter_cohort = classify_voter_cohort(voter_hash),
        cohort_assigned_at = NOW(),
        updated_at = NOW()
    WHERE voter_cohort IS DISTINCT FROM classify_voter_cohort(voter_hash);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. REAL-TIME STATISTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW fouloscopie_stats AS
SELECT
    -- Global stats
    (SELECT COUNT(*) FROM voter_profiles) as total_voters,
    (SELECT COUNT(*) FROM voter_profiles WHERE voter_cohort = 'expert') as expert_voters,
    (SELECT COUNT(*) FROM voter_profiles WHERE voter_cohort = 'regular') as regular_voters,
    (SELECT COUNT(*) FROM voter_profiles WHERE voter_cohort = 'suspicious') as suspicious_voters,

    -- Voting activity
    (SELECT COUNT(*) FROM evaluation_votes WHERE created_at > NOW() - INTERVAL '24 hours') as votes_24h,
    (SELECT COUNT(*) FROM evaluation_votes WHERE created_at > NOW() - INTERVAL '7 days') as votes_7d,

    -- Consensus stats
    (SELECT AVG(consensus_vote_count) FROM evaluations WHERE community_consensus IS NOT NULL) as avg_votes_to_consensus,

    -- Accuracy (community vs eventual outcome)
    (SELECT
        COUNT(*) FILTER (WHERE community_consensus = 'CONFIRMED')::NUMERIC /
        NULLIF(COUNT(*) FILTER (WHERE community_consensus IS NOT NULL), 0) * 100
     FROM evaluations) as ai_confirmation_rate,

    -- Collusion detection
    (SELECT COUNT(*) FROM voting_patterns WHERE detected_at > NOW() - INTERVAL '24 hours') as patterns_detected_24h,

    -- Active evaluations needing votes
    (SELECT COUNT(*) FROM evaluations
     WHERE community_consensus IS NULL
     AND result IS NOT NULL
     AND (is_honeypot = FALSE OR is_honeypot IS NULL)) as evaluations_needing_votes;

-- ============================================================================
-- 10. API FUNCTIONS FOR FRONTEND
-- ============================================================================

-- Get evaluations for voting (with blind mode support)
CREATE OR REPLACE FUNCTION get_evaluations_for_voting(
    p_voter_hash TEXT,
    p_limit INTEGER DEFAULT 10,
    p_pillar VARCHAR(1) DEFAULT NULL
)
RETURNS TABLE (
    evaluation_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    product_slug TEXT,
    product_logo TEXT,
    norm_id INTEGER,
    norm_code TEXT,
    norm_title TEXT,
    norm_summary TEXT,
    pillar VARCHAR(1),
    ai_result TEXT,
    ai_justification TEXT,
    -- Blind voting: only show if conditions met
    can_see_results BOOLEAN,
    votes_agree INTEGER,
    votes_disagree INTEGER,
    votes_needed INTEGER,
    user_already_voted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id as evaluation_id,
        e.product_id,
        p.name as product_name,
        p.slug as product_slug,
        p.logo_url as product_logo,
        e.norm_id,
        n.code as norm_code,
        n.title as norm_title,
        n.short_summary as norm_summary,
        n.pillar,
        e.result as ai_result,
        e.why_this_result as ai_justification,
        should_reveal_results(e.id, p_voter_hash) as can_see_results,
        CASE WHEN should_reveal_results(e.id, p_voter_hash)
             THEN e.consensus_agrees ELSE NULL END as votes_agree,
        CASE WHEN should_reveal_results(e.id, p_voter_hash)
             THEN e.consensus_disagrees ELSE NULL END as votes_disagree,
        GREATEST(0, COALESCE(e.votes_required, 3) - e.consensus_vote_count) as votes_needed,
        EXISTS(
            SELECT 1 FROM evaluation_votes ev
            WHERE ev.evaluation_id = e.id AND ev.voter_hash = p_voter_hash
        ) as user_already_voted
    FROM evaluations e
    JOIN products p ON p.id = e.product_id
    JOIN norms n ON n.id = e.norm_id
    WHERE e.community_consensus IS NULL
    AND e.result IN ('YES', 'NO', 'PARTIAL')
    AND (e.is_honeypot = FALSE OR e.is_honeypot IS NULL)
    AND (p_pillar IS NULL OR n.pillar = p_pillar)
    AND NOT EXISTS(
        SELECT 1 FROM evaluation_votes ev
        WHERE ev.evaluation_id = e.id AND ev.voter_hash = p_voter_hash
    )
    ORDER BY
        -- Prioritize evaluations close to consensus
        e.consensus_vote_count DESC,
        -- Then by creation date
        e.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT SELECT ON voter_profiles TO authenticated;
GRANT SELECT ON fouloscopie_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_evaluations_for_voting TO authenticated, anon;
GRANT EXECUTE ON FUNCTION should_reveal_results TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_weighted_consensus TO authenticated;
GRANT EXECUTE ON FUNCTION get_stratified_consensus TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 210 - Fouloscopie Crowd Intelligence';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'PRINCIPES IMPLEMENTES:';
    RAISE NOTICE '  1. BLIND VOTING - Resultats caches avant vote';
    RAISE NOTICE '  2. WEIGHTED CONSENSUS - Votes ponderes par expertise';
    RAISE NOTICE '  3. ANTI-COLLUSION - Detection automatique';
    RAISE NOTICE '  4. STRATIFIED SAMPLING - Diversite des votants';
    RAISE NOTICE '  5. DYNAMIC REQUIREMENTS - Votes adaptatifs';
    RAISE NOTICE '';
    RAISE NOTICE 'TABLES:';
    RAISE NOTICE '  - voter_profiles: Expertise et metriques par votant';
    RAISE NOTICE '  - voting_patterns: Detection de collusion';
    RAISE NOTICE '';
    RAISE NOTICE 'COHORTS:';
    RAISE NOTICE '  - expert: trust>=80, votes>=50, accuracy>75%%';
    RAISE NOTICE '  - regular: votes>=10';
    RAISE NOTICE '  - newcomer: nouveau votant';
    RAISE NOTICE '  - suspicious: comportement anormal';
    RAISE NOTICE '===========================================';
END $$;
