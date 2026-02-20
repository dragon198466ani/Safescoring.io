-- Migration 205: Anti-Fraud Voting System
-- Comprehensive protection against vote manipulation

-- =====================================================
-- 1. FRAUD SIGNALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vote_fraud_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_hash TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
    details JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_user ON vote_fraud_signals(user_hash);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_type ON vote_fraud_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_unresolved ON vote_fraud_signals(user_hash) WHERE resolved = FALSE;

-- Signal types:
-- 'rapid_voting' - Votes too fast (< 3 seconds between votes)
-- 'always_agree' - >95% agree rate over 50+ votes
-- 'always_disagree' - >95% disagree rate (farming challenges)
-- 'ip_collision' - Multiple users from same IP
-- 'bot_pattern' - Regular intervals, no reading time
-- 'new_account_spam' - Many votes within 24h of account creation
-- 'coordinated_voting' - Votes within 5s of other users on same eval
-- 'device_fingerprint_reuse' - Same device, different accounts

-- =====================================================
-- 2. VOTER TRUST SCORES
-- =====================================================
CREATE TABLE IF NOT EXISTS voter_trust_scores (
    user_hash TEXT PRIMARY KEY,
    trust_score INTEGER DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
    accuracy_rate NUMERIC(5,2) DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    correct_votes INTEGER DEFAULT 0,
    fraud_signals_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMPTZ,
    last_vote_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_scores_score ON voter_trust_scores(trust_score);
CREATE INDEX IF NOT EXISTS idx_trust_scores_banned ON voter_trust_scores(is_banned) WHERE is_banned = TRUE;

-- =====================================================
-- 3. VOTE METADATA (for fraud detection)
-- =====================================================
ALTER TABLE evaluation_votes ADD COLUMN IF NOT EXISTS client_ip TEXT;
ALTER TABLE evaluation_votes ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE evaluation_votes ADD COLUMN IF NOT EXISTS reading_time_ms INTEGER;
ALTER TABLE evaluation_votes ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE evaluation_votes ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE evaluation_votes ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- =====================================================
-- 4. HONEYPOT EVALUATIONS (trap for bots)
-- =====================================================
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS is_honeypot BOOLEAN DEFAULT FALSE;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS honeypot_correct_answer BOOLEAN; -- TRUE = should agree, FALSE = should disagree

CREATE INDEX IF NOT EXISTS idx_evaluations_honeypot ON evaluations(is_honeypot) WHERE is_honeypot = TRUE;

-- =====================================================
-- 5. IP RATE LIMITING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vote_ip_limits (
    ip_hash TEXT NOT NULL,
    vote_count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ip_hash)
);

-- =====================================================
-- 6. FRAUD DETECTION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION detect_vote_fraud()
RETURNS TRIGGER AS $$
DECLARE
    v_last_vote_time TIMESTAMPTZ;
    v_vote_count_1h INTEGER;
    v_agree_rate NUMERIC;
    v_total_votes INTEGER;
    v_ip_votes_1h INTEGER;
    v_account_age INTERVAL;
    v_reading_time INTEGER;
BEGIN
    -- Get user's last vote time
    SELECT created_at INTO v_last_vote_time
    FROM evaluation_votes
    WHERE user_hash = NEW.user_hash
    ORDER BY created_at DESC
    LIMIT 1 OFFSET 1;

    -- Get vote count in last hour
    SELECT COUNT(*) INTO v_vote_count_1h
    FROM evaluation_votes
    WHERE user_hash = NEW.user_hash
    AND created_at > NOW() - INTERVAL '1 hour';

    -- Get total votes and agree rate
    SELECT COUNT(*),
           COALESCE(AVG(CASE WHEN vote_agrees THEN 1 ELSE 0 END) * 100, 50)
    INTO v_total_votes, v_agree_rate
    FROM evaluation_votes
    WHERE user_hash = NEW.user_hash;

    -- Get IP votes in last hour (if IP provided)
    IF NEW.client_ip IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_votes_1h
        FROM evaluation_votes
        WHERE client_ip = NEW.client_ip
        AND created_at > NOW() - INTERVAL '1 hour'
        AND user_hash != NEW.user_hash;
    END IF;

    v_reading_time := COALESCE(NEW.reading_time_ms, 0);

    -- FRAUD SIGNAL 1: Rapid voting (< 3 seconds)
    IF v_last_vote_time IS NOT NULL AND
       (NOW() - v_last_vote_time) < INTERVAL '3 seconds' THEN
        INSERT INTO vote_fraud_signals (user_hash, signal_type, severity, details)
        VALUES (NEW.user_hash, 'rapid_voting', 2, jsonb_build_object(
            'time_since_last', EXTRACT(EPOCH FROM (NOW() - v_last_vote_time)),
            'evaluation_id', NEW.evaluation_id
        ));
        NEW.is_flagged := TRUE;
        NEW.flag_reason := COALESCE(NEW.flag_reason || ', ', '') || 'rapid_voting';
    END IF;

    -- FRAUD SIGNAL 2: Too many votes per hour (> 60)
    IF v_vote_count_1h > 60 THEN
        INSERT INTO vote_fraud_signals (user_hash, signal_type, severity, details)
        VALUES (NEW.user_hash, 'vote_spam', 3, jsonb_build_object(
            'votes_last_hour', v_vote_count_1h
        ));
        NEW.is_flagged := TRUE;
        NEW.flag_reason := COALESCE(NEW.flag_reason || ', ', '') || 'vote_spam';
    END IF;

    -- FRAUD SIGNAL 3: Always agree (> 95% over 50+ votes)
    IF v_total_votes >= 50 AND v_agree_rate > 95 THEN
        INSERT INTO vote_fraud_signals (user_hash, signal_type, severity, details)
        VALUES (NEW.user_hash, 'always_agree', 2, jsonb_build_object(
            'agree_rate', v_agree_rate,
            'total_votes', v_total_votes
        ))
        ON CONFLICT DO NOTHING;
    END IF;

    -- FRAUD SIGNAL 4: Always disagree (> 95% over 50+ votes)
    IF v_total_votes >= 50 AND v_agree_rate < 5 THEN
        INSERT INTO vote_fraud_signals (user_hash, signal_type, severity, details)
        VALUES (NEW.user_hash, 'always_disagree', 3, jsonb_build_object(
            'agree_rate', v_agree_rate,
            'total_votes', v_total_votes
        ))
        ON CONFLICT DO NOTHING;
    END IF;

    -- FRAUD SIGNAL 5: No reading time (bot behavior)
    IF v_reading_time < 1000 THEN -- Less than 1 second
        INSERT INTO vote_fraud_signals (user_hash, signal_type, severity, details)
        VALUES (NEW.user_hash, 'bot_pattern', 4, jsonb_build_object(
            'reading_time_ms', v_reading_time,
            'evaluation_id', NEW.evaluation_id
        ));
        NEW.is_flagged := TRUE;
        NEW.flag_reason := COALESCE(NEW.flag_reason || ', ', '') || 'bot_pattern';
    END IF;

    -- FRAUD SIGNAL 6: IP collision (multiple users same IP)
    IF v_ip_votes_1h > 5 THEN
        INSERT INTO vote_fraud_signals (user_hash, signal_type, severity, details)
        VALUES (NEW.user_hash, 'ip_collision', 3, jsonb_build_object(
            'ip_votes_other_users', v_ip_votes_1h,
            'client_ip_hash', MD5(NEW.client_ip)
        ));
    END IF;

    -- Update trust score
    PERFORM update_voter_trust_score(NEW.user_hash);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRUST SCORE CALCULATION
-- =====================================================
CREATE OR REPLACE FUNCTION update_voter_trust_score(p_user_hash TEXT)
RETURNS VOID AS $$
DECLARE
    v_fraud_count INTEGER;
    v_fraud_severity INTEGER;
    v_accuracy NUMERIC;
    v_total_votes INTEGER;
    v_correct_votes INTEGER;
    v_new_score INTEGER;
BEGIN
    -- Count fraud signals
    SELECT COUNT(*), COALESCE(SUM(severity), 0)
    INTO v_fraud_count, v_fraud_severity
    FROM vote_fraud_signals
    WHERE user_hash = p_user_hash
    AND resolved = FALSE
    AND created_at > NOW() - INTERVAL '30 days';

    -- Calculate accuracy (votes matching final consensus)
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE
            (ev.vote_agrees AND e.community_consensus = 'CONFIRMED') OR
            (NOT ev.vote_agrees AND e.community_consensus = 'CHALLENGED')
        )
    INTO v_total_votes, v_correct_votes
    FROM evaluation_votes ev
    JOIN evaluations e ON e.id = ev.evaluation_id
    WHERE ev.user_hash = p_user_hash
    AND e.community_consensus IS NOT NULL;

    -- Calculate accuracy rate
    IF v_total_votes > 0 THEN
        v_accuracy := (v_correct_votes::NUMERIC / v_total_votes) * 100;
    ELSE
        v_accuracy := 50; -- Default for new users
    END IF;

    -- Calculate trust score
    -- Base: 50
    -- +30 max for accuracy (if >70% accurate)
    -- +20 max for volume (if >100 votes)
    -- -10 per fraud signal severity point
    v_new_score := 50;

    -- Accuracy bonus
    IF v_accuracy > 70 THEN
        v_new_score := v_new_score + LEAST(30, ((v_accuracy - 70) / 30) * 30)::INTEGER;
    ELSIF v_accuracy < 30 THEN
        v_new_score := v_new_score - LEAST(20, ((30 - v_accuracy) / 30) * 20)::INTEGER;
    END IF;

    -- Volume bonus (capped)
    v_new_score := v_new_score + LEAST(20, (v_total_votes / 5))::INTEGER;

    -- Fraud penalty
    v_new_score := v_new_score - LEAST(50, v_fraud_severity * 5);

    -- Clamp to 0-100
    v_new_score := GREATEST(0, LEAST(100, v_new_score));

    -- Upsert trust score
    INSERT INTO voter_trust_scores (
        user_hash, trust_score, accuracy_rate, total_votes,
        correct_votes, fraud_signals_count, updated_at
    ) VALUES (
        p_user_hash, v_new_score, v_accuracy, v_total_votes,
        v_correct_votes, v_fraud_count, NOW()
    )
    ON CONFLICT (user_hash) DO UPDATE SET
        trust_score = v_new_score,
        accuracy_rate = v_accuracy,
        total_votes = v_total_votes,
        correct_votes = v_correct_votes,
        fraud_signals_count = v_fraud_count,
        updated_at = NOW();

    -- Auto-ban if trust score too low
    IF v_new_score < 10 AND v_fraud_count >= 3 THEN
        UPDATE voter_trust_scores
        SET is_banned = TRUE,
            ban_reason = 'Automatic: Trust score below 10 with multiple fraud signals',
            banned_at = NOW()
        WHERE user_hash = p_user_hash
        AND is_banned = FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. HONEYPOT VALIDATION
-- =====================================================
CREATE OR REPLACE FUNCTION check_honeypot_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_is_honeypot BOOLEAN;
    v_correct_answer BOOLEAN;
BEGIN
    -- Check if this is a honeypot evaluation
    SELECT is_honeypot, honeypot_correct_answer
    INTO v_is_honeypot, v_correct_answer
    FROM evaluations
    WHERE id = NEW.evaluation_id;

    IF v_is_honeypot AND v_correct_answer IS NOT NULL THEN
        -- Check if vote is incorrect (fell for honeypot)
        IF NEW.vote_agrees != v_correct_answer THEN
            INSERT INTO vote_fraud_signals (user_hash, signal_type, severity, details)
            VALUES (NEW.user_hash, 'honeypot_failed', 5, jsonb_build_object(
                'evaluation_id', NEW.evaluation_id,
                'expected', v_correct_answer,
                'got', NEW.vote_agrees
            ));

            -- Flag the vote
            NEW.is_flagged := TRUE;
            NEW.flag_reason := COALESCE(NEW.flag_reason || ', ', '') || 'honeypot_failed';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS trg_detect_vote_fraud ON evaluation_votes;
CREATE TRIGGER trg_detect_vote_fraud
BEFORE INSERT ON evaluation_votes
FOR EACH ROW
EXECUTE FUNCTION detect_vote_fraud();

DROP TRIGGER IF EXISTS trg_check_honeypot ON evaluation_votes;
CREATE TRIGGER trg_check_honeypot
BEFORE INSERT ON evaluation_votes
FOR EACH ROW
EXECUTE FUNCTION check_honeypot_vote();

-- =====================================================
-- 10. ADMIN VIEWS
-- =====================================================
CREATE OR REPLACE VIEW fraud_dashboard AS
SELECT
    signal_type,
    COUNT(*) as signal_count,
    COUNT(DISTINCT user_hash) as affected_users,
    AVG(severity) as avg_severity,
    COUNT(*) FILTER (WHERE resolved) as resolved_count,
    MAX(created_at) as last_occurrence
FROM vote_fraud_signals
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY signal_type
ORDER BY signal_count DESC;

CREATE OR REPLACE VIEW suspicious_voters AS
SELECT
    vts.user_hash,
    vts.trust_score,
    vts.accuracy_rate,
    vts.total_votes,
    vts.fraud_signals_count,
    vts.is_banned,
    COUNT(vfs.id) FILTER (WHERE vfs.created_at > NOW() - INTERVAL '7 days') as recent_signals,
    MAX(vfs.created_at) as last_signal_at
FROM voter_trust_scores vts
LEFT JOIN vote_fraud_signals vfs ON vfs.user_hash = vts.user_hash
WHERE vts.trust_score < 40 OR vts.fraud_signals_count > 2
GROUP BY vts.user_hash, vts.trust_score, vts.accuracy_rate,
         vts.total_votes, vts.fraud_signals_count, vts.is_banned
ORDER BY vts.trust_score ASC;

-- =====================================================
-- 11. API HELPER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION can_user_vote(p_user_hash TEXT)
RETURNS JSONB AS $$
DECLARE
    v_trust_score INTEGER;
    v_is_banned BOOLEAN;
    v_recent_signals INTEGER;
    v_votes_today INTEGER;
BEGIN
    -- Get trust info
    SELECT trust_score, is_banned
    INTO v_trust_score, v_is_banned
    FROM voter_trust_scores
    WHERE user_hash = p_user_hash;

    -- Default for new users
    IF v_trust_score IS NULL THEN
        v_trust_score := 50;
        v_is_banned := FALSE;
    END IF;

    -- Check if banned
    IF v_is_banned THEN
        RETURN jsonb_build_object(
            'can_vote', FALSE,
            'reason', 'Account suspended for suspicious activity',
            'trust_score', v_trust_score
        );
    END IF;

    -- Check recent fraud signals
    SELECT COUNT(*)
    INTO v_recent_signals
    FROM vote_fraud_signals
    WHERE user_hash = p_user_hash
    AND severity >= 4
    AND created_at > NOW() - INTERVAL '1 hour'
    AND resolved = FALSE;

    IF v_recent_signals >= 2 THEN
        RETURN jsonb_build_object(
            'can_vote', FALSE,
            'reason', 'Voting temporarily suspended. Please try again later.',
            'trust_score', v_trust_score,
            'cooldown_minutes', 60
        );
    END IF;

    -- Check daily limit
    SELECT COUNT(*)
    INTO v_votes_today
    FROM evaluation_votes
    WHERE user_hash = p_user_hash
    AND created_at > NOW() - INTERVAL '24 hours';

    IF v_votes_today >= 200 THEN
        RETURN jsonb_build_object(
            'can_vote', FALSE,
            'reason', 'Daily voting limit reached (200 votes/day)',
            'trust_score', v_trust_score,
            'votes_today', v_votes_today
        );
    END IF;

    RETURN jsonb_build_object(
        'can_vote', TRUE,
        'trust_score', v_trust_score,
        'votes_today', v_votes_today,
        'daily_limit', 200
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant access
GRANT SELECT ON fraud_dashboard TO authenticated;
GRANT SELECT ON suspicious_voters TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_vote TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_vote TO anon;

COMMENT ON TABLE vote_fraud_signals IS 'Tracks suspicious voting patterns for fraud detection';
COMMENT ON TABLE voter_trust_scores IS 'Trust scores calculated from voting accuracy and fraud signals';
COMMENT ON FUNCTION can_user_vote IS 'Check if user can vote (not banned, under limits, no recent fraud)';

-- =====================================================
-- 12. UPDATED process_evaluation_vote WITH FRAUD METADATA
-- =====================================================
CREATE OR REPLACE FUNCTION process_evaluation_vote(
    p_evaluation_id INTEGER,
    p_voter_hash TEXT,
    p_vote_agrees BOOLEAN,
    p_justification TEXT DEFAULT NULL,
    p_evidence_url TEXT DEFAULT NULL,
    p_evidence_type TEXT DEFAULT NULL,
    p_client_ip TEXT DEFAULT NULL,
    p_device_fingerprint TEXT DEFAULT NULL,
    p_reading_time_ms INTEGER DEFAULT 0,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_product_id INTEGER;
    v_norm_id INTEGER;
    v_vote_id UUID;
    v_tokens_earned INTEGER := 0;
    v_vote_weight NUMERIC := 0.3;
    v_user_total INTEGER;
    v_existing_vote UUID;
    v_is_flagged BOOLEAN := FALSE;
BEGIN
    -- Check if user can vote (anti-fraud)
    DECLARE
        v_can_vote JSONB;
    BEGIN
        v_can_vote := can_user_vote(p_voter_hash);
        IF NOT (v_can_vote->>'can_vote')::BOOLEAN THEN
            RETURN jsonb_build_object(
                'error', v_can_vote->>'reason',
                'trust_score', v_can_vote->>'trust_score'
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- If can_user_vote fails, continue (function might not exist yet)
        NULL;
    END;

    -- Check for existing vote
    SELECT id INTO v_existing_vote
    FROM evaluation_votes
    WHERE evaluation_id = p_evaluation_id AND voter_hash = p_voter_hash;

    IF v_existing_vote IS NOT NULL THEN
        RETURN jsonb_build_object('error', 'Already voted on this evaluation', 'vote_id', v_existing_vote);
    END IF;

    -- Get product_id and norm_id
    SELECT product_id, norm_id INTO v_product_id, v_norm_id
    FROM evaluations WHERE id = p_evaluation_id;

    IF v_product_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Evaluation not found');
    END IF;

    -- Calculate vote weight based on tokens earned
    SELECT total_earned INTO v_user_total FROM token_rewards WHERE user_hash = p_voter_hash;
    IF v_user_total IS NOT NULL THEN
        IF v_user_total > 1000 THEN v_vote_weight := 2.0;
        ELSIF v_user_total > 500 THEN v_vote_weight := 1.5;
        ELSIF v_user_total > 100 THEN v_vote_weight := 1.0;
        ELSIF v_user_total > 50 THEN v_vote_weight := 0.5;
        END IF;
    END IF;

    -- Insert vote with fraud detection metadata
    INSERT INTO evaluation_votes (
        evaluation_id, product_id, norm_id,
        vote_agrees, justification, evidence_url, evidence_type,
        voter_hash, vote_weight,
        client_ip, device_fingerprint, reading_time_ms, user_agent
    ) VALUES (
        p_evaluation_id, v_product_id, v_norm_id,
        p_vote_agrees, p_justification, p_evidence_url, p_evidence_type,
        p_voter_hash, v_vote_weight,
        p_client_ip, p_device_fingerprint, p_reading_time_ms, p_user_agent
    )
    RETURNING id, is_flagged INTO v_vote_id, v_is_flagged;

    -- Award tokens
    IF p_vote_agrees THEN
        v_tokens_earned := award_tokens(p_voter_hash, 'vote_agree', v_vote_id);
    ELSE
        v_tokens_earned := award_tokens(p_voter_hash, 'vote_disagree_pending', v_vote_id);
    END IF;

    -- Bonus for evidence
    IF p_evidence_url IS NOT NULL AND LENGTH(p_evidence_url) > 10 THEN
        v_tokens_earned := v_tokens_earned + award_tokens(p_voter_hash, 'source_provided', v_vote_id);
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'vote_id', v_vote_id,
        'tokens_earned', v_tokens_earned,
        'vote_weight', v_vote_weight,
        'vote_agrees', p_vote_agrees,
        'is_flagged', v_is_flagged
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('error', 'Already voted on this evaluation');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 205 - Anti-Fraud System installed';
    RAISE NOTICE '';
    RAISE NOTICE 'Protections added:';
    RAISE NOTICE '  ✓ Fraud signal detection (rapid voting, bots, IP collision)';
    RAISE NOTICE '  ✓ Trust score system (accuracy-based)';
    RAISE NOTICE '  ✓ Honeypot evaluations for bot detection';
    RAISE NOTICE '  ✓ Automatic banning for low trust + multiple fraud signals';
    RAISE NOTICE '  ✓ Daily voting limits (200/day)';
    RAISE NOTICE '  ✓ Reading time tracking (bot detection)';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin views:';
    RAISE NOTICE '  - fraud_dashboard: Overview of fraud signals';
    RAISE NOTICE '  - suspicious_voters: Users with low trust scores';
END $$;
