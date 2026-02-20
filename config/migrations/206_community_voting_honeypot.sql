-- Migration 206: Community Voting Honeypot + Consensus System
-- Adds honeypot detection AND consensus voting (3 votes required)

-- =====================================================
-- 1. ADD CONSENSUS COLUMNS TO EVALUATIONS
-- =====================================================
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS community_consensus TEXT DEFAULT NULL;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS consensus_reached_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS consensus_vote_count INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS consensus_agrees INTEGER DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS consensus_disagrees INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_evaluations_pending_consensus
ON evaluations(consensus_vote_count)
WHERE community_consensus IS NULL;

COMMENT ON COLUMN evaluations.community_consensus IS 'CONFIRMED or CHALLENGED after 3+ votes with majority';
COMMENT ON COLUMN evaluations.consensus_vote_count IS 'Total votes received (need 3 for consensus)';
COMMENT ON COLUMN evaluations.consensus_agrees IS 'Number of votes agreeing with AI';
COMMENT ON COLUMN evaluations.consensus_disagrees IS 'Number of votes challenging the AI';

-- =====================================================
-- 2. Add honeypot columns to evaluations table
-- =====================================================

-- Flag to mark evaluations as honeypots (fake/wrong evaluations to detect lazy voters)
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS is_honeypot BOOLEAN DEFAULT FALSE;

-- Reason why this evaluation is a honeypot (for admin reference)
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS honeypot_reason TEXT;

COMMENT ON COLUMN evaluations.is_honeypot IS 'True if this is a fake evaluation used to detect lazy/farming voters';
COMMENT ON COLUMN evaluations.honeypot_reason IS 'Admin note explaining why this evaluation is wrong (for honeypot)';

-- =====================================================
-- 2. Add honeypot tracking to evaluation_votes table
-- =====================================================

-- Track if this vote was on a honeypot
ALTER TABLE evaluation_votes
ADD COLUMN IF NOT EXISTS is_honeypot_vote BOOLEAN DEFAULT FALSE;

-- Result of honeypot: caught (user fell for it) or detected (user caught the trap)
ALTER TABLE evaluation_votes
ADD COLUMN IF NOT EXISTS honeypot_result TEXT CHECK (honeypot_result IN ('caught', 'detected'));

-- When evidence was added (for proof bonus tracking)
ALTER TABLE evaluation_votes
ADD COLUMN IF NOT EXISTS evidence_added_at TIMESTAMPTZ;

COMMENT ON COLUMN evaluation_votes.is_honeypot_vote IS 'True if this vote was on a honeypot evaluation';
COMMENT ON COLUMN evaluation_votes.honeypot_result IS 'caught = user fell for honeypot, detected = user caught the trap';

-- =====================================================
-- 3. Add honeypot failure tracking to token_rewards
-- =====================================================

-- Count of consecutive honeypot failures
ALTER TABLE token_rewards
ADD COLUMN IF NOT EXISTS honeypot_fails INTEGER DEFAULT 0;

-- Temporary ban until timestamp
ALTER TABLE token_rewards
ADD COLUMN IF NOT EXISTS honeypot_banned_until TIMESTAMPTZ;

COMMENT ON COLUMN token_rewards.honeypot_fails IS 'Count of consecutive honeypot failures';
COMMENT ON COLUMN token_rewards.honeypot_banned_until IS 'Temporary ban expiration (3 fails = 24h ban)';

-- =====================================================
-- 4. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_evaluations_honeypot
ON evaluations(is_honeypot)
WHERE is_honeypot = TRUE;

CREATE INDEX IF NOT EXISTS idx_evaluation_votes_honeypot
ON evaluation_votes(is_honeypot_vote)
WHERE is_honeypot_vote = TRUE;

CREATE INDEX IF NOT EXISTS idx_token_rewards_banned
ON token_rewards(honeypot_banned_until)
WHERE honeypot_banned_until IS NOT NULL;

-- =====================================================
-- 5. Helper function to create honeypot evaluations
-- =====================================================

CREATE OR REPLACE FUNCTION create_honeypot_evaluation(
  p_product_id INTEGER,
  p_norm_id INTEGER,
  p_wrong_result TEXT,
  p_honeypot_reason TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_eval_id INTEGER;
BEGIN
  INSERT INTO evaluations (
    product_id,
    norm_id,
    result,
    why_this_result,
    is_honeypot,
    honeypot_reason
  ) VALUES (
    p_product_id,
    p_norm_id,
    p_wrong_result,
    'Cette évaluation contient une erreur intentionnelle.',
    TRUE,
    p_honeypot_reason
  )
  RETURNING id INTO v_eval_id;

  RETURN v_eval_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_honeypot_evaluation IS 'Creates a honeypot (fake) evaluation to detect lazy/farming voters';

-- =====================================================
-- 6. Function to get random evaluations with honeypot injection
-- =====================================================

CREATE OR REPLACE FUNCTION get_voting_evaluations(
  p_voter_hash TEXT,
  p_limit INTEGER DEFAULT 10,
  p_honeypot_rate FLOAT DEFAULT 0.10
) RETURNS TABLE (
  id INTEGER,
  product_id INTEGER,
  norm_id INTEGER,
  result TEXT,
  why_this_result TEXT,
  is_honeypot BOOLEAN
) AS $$
DECLARE
  v_honeypot_count INTEGER;
  v_real_count INTEGER;
BEGIN
  -- Calculate how many honeypots to include
  v_honeypot_count := CEIL(p_limit * p_honeypot_rate);
  v_real_count := p_limit - v_honeypot_count;

  -- Return mix of real and honeypot evaluations
  RETURN QUERY
  (
    -- Real evaluations (not voted yet by this user)
    SELECT e.id, e.product_id, e.norm_id, e.result, e.why_this_result, e.is_honeypot
    FROM evaluations e
    LEFT JOIN evaluation_votes ev ON e.id = ev.evaluation_id AND ev.voter_hash = p_voter_hash
    WHERE e.is_honeypot = FALSE
    AND ev.id IS NULL
    AND e.result IN ('YES', 'NO', 'PARTIAL')
    ORDER BY RANDOM()
    LIMIT v_real_count
  )
  UNION ALL
  (
    -- Honeypot evaluations (not voted yet by this user)
    SELECT e.id, e.product_id, e.norm_id, e.result, e.why_this_result, FALSE as is_honeypot -- Hide honeypot flag from client
    FROM evaluations e
    LEFT JOIN evaluation_votes ev ON e.id = ev.evaluation_id AND ev.voter_hash = p_voter_hash
    WHERE e.is_honeypot = TRUE
    AND ev.id IS NULL
    ORDER BY RANDOM()
    LIMIT v_honeypot_count
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_voting_evaluations IS 'Returns evaluations for voting with honeypots injected (honeypot flag hidden)';

-- =====================================================
-- 7. Seed some initial honeypot evaluations
-- =====================================================

-- Example honeypots (obviously wrong evaluations)
-- These will be inserted if the product/norm exists

DO $$
BEGIN
  -- Only insert if we have products and norms
  IF EXISTS (SELECT 1 FROM products LIMIT 1) AND EXISTS (SELECT 1 FROM norms LIMIT 1) THEN

    -- Honeypot 1: Ledger claiming NO hardware security
    INSERT INTO evaluations (product_id, norm_id, result, why_this_result, is_honeypot, honeypot_reason)
    SELECT
      p.id,
      n.id,
      'NO',
      'Le produit ne dispose pas de puce sécurisée.',
      TRUE,
      'PIÈGE: Ledger a évidemment une puce sécurisée, c''est sa caractéristique principale'
    FROM products p, norms n
    WHERE p.slug = 'ledger-nano-x'
    AND n.code LIKE '%SECURE%ELEMENT%'
    LIMIT 1
    ON CONFLICT DO NOTHING;

    -- Honeypot 2: Binance claiming perfect decentralization
    INSERT INTO evaluations (product_id, norm_id, result, why_this_result, is_honeypot, honeypot_reason)
    SELECT
      p.id,
      n.id,
      'YES',
      'La plateforme est totalement décentralisée et ne garde jamais vos clés.',
      TRUE,
      'PIÈGE: Binance est un CEX qui garde les clés des utilisateurs'
    FROM products p, norms n
    WHERE p.slug = 'binance'
    AND n.code LIKE '%SELF%CUSTODY%'
    LIMIT 1
    ON CONFLICT DO NOTHING;

  END IF;
END $$;

-- =====================================================
-- 8. CONSENSUS VOTING SYSTEM
-- =====================================================

-- Function to update consensus when vote submitted
CREATE OR REPLACE FUNCTION update_evaluation_consensus()
RETURNS TRIGGER AS $$
DECLARE
    v_agrees INTEGER;
    v_disagrees INTEGER;
    v_total INTEGER;
    v_consensus TEXT;
BEGIN
    -- Count current votes for this evaluation
    SELECT
        COUNT(*) FILTER (WHERE vote_agrees = true AND is_flagged = false),
        COUNT(*) FILTER (WHERE vote_agrees = false AND is_flagged = false),
        COUNT(*) FILTER (WHERE is_flagged = false)
    INTO v_agrees, v_disagrees, v_total
    FROM evaluation_votes
    WHERE evaluation_id = NEW.evaluation_id
    AND status IN ('pending', 'validated');

    -- Update the evaluation counters
    UPDATE evaluations SET
        consensus_agrees = v_agrees,
        consensus_disagrees = v_disagrees,
        consensus_vote_count = v_total
    WHERE id = NEW.evaluation_id;

    -- Check if consensus is reached (3+ votes with majority)
    IF v_total >= 3 THEN
        IF v_agrees > v_disagrees THEN
            v_consensus := 'CONFIRMED';
        ELSIF v_disagrees > v_agrees THEN
            v_consensus := 'CHALLENGED';
        ELSE
            v_consensus := NULL; -- Tie, need more votes
        END IF;

        IF v_consensus IS NOT NULL THEN
            UPDATE evaluations SET
                community_consensus = v_consensus,
                consensus_reached_at = NOW()
            WHERE id = NEW.evaluation_id
            AND community_consensus IS NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update consensus on vote insert
DROP TRIGGER IF EXISTS trg_update_consensus ON evaluation_votes;
CREATE TRIGGER trg_update_consensus
AFTER INSERT ON evaluation_votes
FOR EACH ROW
EXECUTE FUNCTION update_evaluation_consensus();

-- Function to get evaluations pending consensus
CREATE OR REPLACE FUNCTION get_pending_consensus_evaluations(
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0,
    p_user_hash TEXT DEFAULT NULL
)
RETURNS TABLE (
    evaluation_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    product_slug TEXT,
    norm_id INTEGER,
    norm_code TEXT,
    norm_title TEXT,
    pillar TEXT,
    ai_result TEXT,
    ai_confidence NUMERIC,
    ai_justification TEXT,
    votes_agree INTEGER,
    votes_disagree INTEGER,
    votes_total INTEGER,
    votes_needed INTEGER,
    user_already_voted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id AS evaluation_id,
        e.product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        e.norm_id,
        n.code AS norm_code,
        n.title AS norm_title,
        n.pillar,
        e.result AS ai_result,
        e.confidence AS ai_confidence,
        e.justification AS ai_justification,
        COALESCE(e.consensus_agrees, 0) AS votes_agree,
        COALESCE(e.consensus_disagrees, 0) AS votes_disagree,
        COALESCE(e.consensus_vote_count, 0) AS votes_total,
        GREATEST(0, 3 - COALESCE(e.consensus_vote_count, 0)) AS votes_needed,
        EXISTS (
            SELECT 1 FROM evaluation_votes ev
            WHERE ev.evaluation_id = e.id
            AND ev.voter_hash = p_user_hash
        ) AS user_already_voted
    FROM evaluations e
    JOIN products p ON p.id = e.product_id
    JOIN norms n ON n.id = e.norm_id
    WHERE e.community_consensus IS NULL
    AND e.result IS NOT NULL
    AND e.is_honeypot = FALSE
    ORDER BY
        e.consensus_vote_count DESC,
        e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- View for consensus statistics
CREATE OR REPLACE VIEW consensus_stats AS
SELECT
    COUNT(*) FILTER (WHERE community_consensus IS NULL AND consensus_vote_count > 0) AS pending_with_votes,
    COUNT(*) FILTER (WHERE community_consensus IS NULL AND consensus_vote_count = 0) AS pending_no_votes,
    COUNT(*) FILTER (WHERE community_consensus = 'CONFIRMED') AS confirmed_count,
    COUNT(*) FILTER (WHERE community_consensus = 'CHALLENGED') AS challenged_count,
    COUNT(*) FILTER (WHERE consensus_vote_count >= 1 AND consensus_vote_count < 3) AS needs_more_votes,
    AVG(consensus_vote_count) FILTER (WHERE community_consensus IS NOT NULL) AS avg_votes_to_consensus
FROM evaluations
WHERE result IS NOT NULL
AND is_honeypot = FALSE;

-- Permissions
GRANT SELECT ON consensus_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_pending_consensus_evaluations TO authenticated, anon;

-- =====================================================
-- Done
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 206 - Honeypot + Consensus System installed';
    RAISE NOTICE '';
    RAISE NOTICE 'Consensus features:';
    RAISE NOTICE '  ✓ 3 votes required for consensus';
    RAISE NOTICE '  ✓ Auto-update trigger on vote';
    RAISE NOTICE '  ✓ get_pending_consensus_evaluations()';
    RAISE NOTICE '  ✓ consensus_stats view';
    RAISE NOTICE '';
    RAISE NOTICE 'Honeypot features:';
    RAISE NOTICE '  ✓ Honeypot detection columns';
    RAISE NOTICE '  ✓ Anti-farming tracking';
    RAISE NOTICE '  ✓ Temporary bans (3 fails = 24h)';
END $$;
