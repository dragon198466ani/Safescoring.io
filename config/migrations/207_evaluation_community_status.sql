-- Migration 207: Add community consensus status to evaluations
-- Tracks when community has validated/challenged an AI evaluation
--
-- PRINCIPE:
-- 1. L'IA évalue: YES/NO/PARTIAL
-- 2. La communauté vote son propre avis: OUI/NON
-- 3. On compare: communauté = IA → confirmed, sinon → challenged

-- Ce que la communauté a décidé (indépendamment de l'IA)
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS community_decision TEXT
CHECK (community_decision IN ('yes', 'no', 'tie'));

-- Statut final après comparaison avec l'IA
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS community_status TEXT
CHECK (community_status IN ('confirmed', 'challenged'));

-- Timestamp de la décision
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS community_decided_at TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN evaluations.community_decision IS 'What the community voted: yes (product complies), no (product does not comply)';
COMMENT ON COLUMN evaluations.community_status IS 'Final status: confirmed (community agrees with AI), challenged (community disagrees with AI)';

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_evaluations_community_status
ON evaluations(community_status)
WHERE community_status IS NOT NULL;

-- View for evaluations needing votes
CREATE OR REPLACE VIEW evaluations_needing_votes AS
SELECT e.*,
  COALESCE(v.agree_count, 0) as votes_agree,
  COALESCE(v.disagree_count, 0) as votes_disagree,
  COALESCE(v.total_count, 0) as votes_total
FROM evaluations e
LEFT JOIN (
  SELECT
    evaluation_id,
    COUNT(*) FILTER (WHERE vote_agrees = true) as agree_count,
    COUNT(*) FILTER (WHERE vote_agrees = false) as disagree_count,
    COUNT(*) as total_count
  FROM evaluation_votes
  WHERE status != 'honeypot'
  GROUP BY evaluation_id
) v ON e.id = v.evaluation_id
WHERE e.community_status IS NULL
AND e.result IN ('YES', 'NO', 'PARTIAL');

-- =====================================================
-- SEPARATION AI vs COMMUNITY
-- =====================================================

-- IMPORTANT: AI result NEVER changes due to community votes
COMMENT ON COLUMN evaluations.result IS 'AI evaluation result (YES/NO/PARTIAL). IMMUTABLE - never modified by community.';
COMMENT ON COLUMN evaluations.evaluated_by IS 'AI model (claude-opus-4, gemini-2.0, etc.)';
COMMENT ON COLUMN evaluations.why_this_result IS 'AI justification';

-- Community suggested result when they challenge
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS community_suggested_result TEXT;
COMMENT ON COLUMN evaluations.community_suggested_result IS 'If community challenges, their suggested result';

-- Track if evaluation is superseded
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
COMMENT ON COLUMN evaluations.is_active IS 'FALSE if superseded by newer evaluation';

-- =====================================================
-- HISTORY TRACKING IMPROVEMENTS
-- =====================================================

-- Add source type to history for clear distinction
ALTER TABLE evaluation_history ADD COLUMN IF NOT EXISTS source_type TEXT;
COMMENT ON COLUMN evaluation_history.source_type IS 'ai_initial, ai_re_evaluation, community_consensus, admin_override';

-- Track community votes in history
ALTER TABLE evaluation_history ADD COLUMN IF NOT EXISTS community_votes_agree INTEGER;
ALTER TABLE evaluation_history ADD COLUMN IF NOT EXISTS community_votes_disagree INTEGER;
ALTER TABLE evaluation_history ADD COLUMN IF NOT EXISTS consensus_type TEXT;

-- =====================================================
-- VIEW: EFFECTIVE RESULT (AI or Community Override)
-- =====================================================

CREATE OR REPLACE VIEW evaluation_effective_result AS
SELECT
    e.id,
    e.product_id,
    p.name as product_name,
    p.slug as product_slug,
    e.norm_id,
    n.code as norm_code,
    n.title as norm_title,
    n.pillar,
    -- AI evaluation (original, never changes)
    e.result AS ai_result,
    e.evaluated_by AS ai_model,
    e.why_this_result AS ai_justification,
    e.confidence_score AS ai_confidence,
    e.evaluation_date AS ai_evaluated_at,
    -- Community consensus
    e.community_consensus,
    e.consensus_vote_count,
    e.consensus_agrees,
    e.consensus_disagrees,
    e.community_suggested_result,
    e.consensus_reached_at,
    -- EFFECTIVE RESULT: Community takes precedence if CHALLENGED
    CASE
        WHEN e.community_consensus = 'CHALLENGED' AND e.community_suggested_result IS NOT NULL
        THEN e.community_suggested_result
        ELSE e.result
    END AS effective_result,
    -- Source of effective result
    CASE
        WHEN e.community_consensus = 'CHALLENGED' THEN 'community'
        WHEN e.community_consensus = 'CONFIRMED' THEN 'ai_confirmed'
        ELSE 'ai'
    END AS result_source,
    -- Confidence level
    CASE
        WHEN e.community_consensus IS NOT NULL THEN 100
        ELSE COALESCE(e.confidence_score, 50)
    END AS effective_confidence
FROM evaluations e
JOIN products p ON p.id = e.product_id
JOIN norms n ON n.id = e.norm_id
WHERE (e.is_active = TRUE OR e.is_active IS NULL)
AND (e.is_honeypot = FALSE OR e.is_honeypot IS NULL);

COMMENT ON VIEW evaluation_effective_result IS 'Shows effective result considering AI and community. Community override takes precedence when CHALLENGED.';

-- =====================================================
-- TRIGGER: Record history on community consensus
-- =====================================================

CREATE OR REPLACE FUNCTION record_community_consensus_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.community_consensus IS NULL AND NEW.community_consensus IS NOT NULL THEN
        INSERT INTO evaluation_history (
            product_id, norm_id, old_result, new_result,
            old_justification, new_justification,
            change_source, changed_by, recorded_at,
            source_type, community_votes_agree, community_votes_disagree, consensus_type
        ) VALUES (
            NEW.product_id, NEW.norm_id,
            NEW.result,  -- AI result (unchanged)
            COALESCE(NEW.community_suggested_result, NEW.result),
            NEW.why_this_result,
            CASE NEW.community_consensus
                WHEN 'CONFIRMED' THEN 'Community confirmed AI evaluation'
                WHEN 'CHALLENGED' THEN 'Community challenged AI: ' || COALESCE(NEW.community_suggested_result, 'no alternative')
            END,
            'community_vote', 'community_consensus', NOW(),
            'community_consensus', NEW.consensus_agrees, NEW.consensus_disagrees, NEW.community_consensus
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_record_community_consensus ON evaluations;
CREATE TRIGGER trg_record_community_consensus
AFTER UPDATE ON evaluations
FOR EACH ROW
WHEN (OLD.community_consensus IS DISTINCT FROM NEW.community_consensus)
EXECUTE FUNCTION record_community_consensus_history();

-- =====================================================
-- TRIGGER: Record history on AI re-evaluation
-- =====================================================

CREATE OR REPLACE FUNCTION record_ai_evaluation_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.result IS DISTINCT FROM NEW.result AND
       NEW.evaluated_by IS NOT NULL AND
       NEW.evaluated_by NOT LIKE '%community%' THEN
        INSERT INTO evaluation_history (
            product_id, norm_id, old_result, new_result,
            old_justification, new_justification,
            change_source, changed_by, recorded_at, source_type
        ) VALUES (
            NEW.product_id, NEW.norm_id,
            OLD.result, NEW.result,
            OLD.why_this_result, NEW.why_this_result,
            'ai_evaluation', NEW.evaluated_by, NOW(),
            CASE WHEN OLD.result IS NULL THEN 'ai_initial' ELSE 'ai_re_evaluation' END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_record_ai_evaluation ON evaluations;
CREATE TRIGGER trg_record_ai_evaluation
AFTER UPDATE ON evaluations
FOR EACH ROW
WHEN (OLD.result IS DISTINCT FROM NEW.result)
EXECUTE FUNCTION record_ai_evaluation_history();

-- =====================================================
-- VIEW: Statistics AI vs Community
-- =====================================================

CREATE OR REPLACE VIEW evaluation_source_stats AS
SELECT
    COUNT(*) AS total_evaluations,
    COUNT(*) FILTER (WHERE result IS NOT NULL) AS ai_evaluated,
    COUNT(*) FILTER (WHERE community_consensus = 'CONFIRMED') AS community_confirmed,
    COUNT(*) FILTER (WHERE community_consensus = 'CHALLENGED') AS community_challenged,
    COUNT(*) FILTER (WHERE community_consensus IS NULL AND consensus_vote_count > 0) AS pending_consensus,
    ROUND(
        COUNT(*) FILTER (WHERE community_consensus = 'CHALLENGED')::NUMERIC /
        NULLIF(COUNT(*) FILTER (WHERE community_consensus IS NOT NULL), 0) * 100, 2
    ) AS ai_error_rate_pct
FROM evaluations
WHERE (is_honeypot = FALSE OR is_honeypot IS NULL);

COMMENT ON VIEW evaluation_source_stats IS 'Statistics: AI evaluations vs Community overrides';

-- Permissions
GRANT SELECT ON evaluation_effective_result TO authenticated, anon;
GRANT SELECT ON evaluation_source_stats TO authenticated, anon;
GRANT SELECT ON evaluations_needing_votes TO authenticated, anon;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 207 - AI/Community Separation';
    RAISE NOTICE '';
    RAISE NOTICE 'PRINCIPE CLE: Le resultat IA ne change JAMAIS';
    RAISE NOTICE '';
    RAISE NOTICE 'Colonnes:';
    RAISE NOTICE '  evaluations.result = Resultat IA (IMMUTABLE)';
    RAISE NOTICE '  evaluations.community_consensus = CONFIRMED/CHALLENGED';
    RAISE NOTICE '  evaluations.community_suggested_result = Alternative si challenge';
    RAISE NOTICE '';
    RAISE NOTICE 'Vue evaluation_effective_result:';
    RAISE NOTICE '  -> Retourne le resultat EFFECTIF (IA ou Community override)';
    RAISE NOTICE '';
    RAISE NOTICE 'Historique:';
    RAISE NOTICE '  evaluation_history.source_type distingue ai_* de community_*';
END $$;
