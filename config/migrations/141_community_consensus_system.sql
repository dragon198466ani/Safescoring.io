-- =====================================================
-- Migration 141: Community Consensus System (Fouloscopie)
-- =====================================================
-- Mode aveugle: les utilisateurs votent SANS voir l'évaluation IA
-- Puis on compare leur vote avec l'IA pour détecter les erreurs
--
-- Règles de consensus:
-- - 3 votes unanimes OUI ou NON → décision prise
-- - Si mixte après 5 votes → majorité gagne
-- - Comparaison avec IA: confirmed (aligné) ou challenged (divergent)
-- =====================================================

-- Add community consensus columns to evaluations
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS community_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS community_decision TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS community_decided_at TIMESTAMPTZ DEFAULT NULL;

-- Constraints for community_status
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS evaluations_community_status_check;

ALTER TABLE evaluations
ADD CONSTRAINT evaluations_community_status_check
CHECK (community_status IS NULL OR community_status IN ('confirmed', 'challenged', 'pending'));

-- Constraints for community_decision (what the community voted)
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS evaluations_community_decision_check;

ALTER TABLE evaluations
ADD CONSTRAINT evaluations_community_decision_check
CHECK (community_decision IS NULL OR community_decision IN ('yes', 'no', 'tie'));

-- Index for finding evaluations by community status
CREATE INDEX IF NOT EXISTS idx_evaluations_community_status
ON evaluations(community_status) WHERE community_status IS NOT NULL;

-- Index for finding evaluations needing votes (no decision yet)
CREATE INDEX IF NOT EXISTS idx_evaluations_needs_votes
ON evaluations(id) WHERE community_status IS NULL AND result IN ('YES', 'NO', 'PARTIAL');

-- Add token_transactions table if not exists
CREATE TABLE IF NOT EXISTS token_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_hash TEXT NOT NULL,
  action_type TEXT NOT NULL,
  tokens_amount INTEGER NOT NULL,
  evaluation_vote_id BIGINT REFERENCES evaluation_votes(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user transactions
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_hash
ON token_transactions(user_hash);

-- Create function to increment tokens (idempotent)
CREATE OR REPLACE FUNCTION increment_tokens(p_user_hash TEXT, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE token_rewards
  SET total_earned = GREATEST(0, total_earned + p_amount)
  WHERE user_hash = p_user_hash;

  IF NOT FOUND THEN
    INSERT INTO token_rewards (user_hash, total_earned)
    VALUES (p_user_hash, GREATEST(0, p_amount));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN evaluations.community_status IS 'Result of comparing community vote with AI: confirmed (agrees), challenged (disagrees)';
COMMENT ON COLUMN evaluations.community_decision IS 'What the community voted: yes (agrees with norm), no (disagrees), tie';
COMMENT ON COLUMN evaluations.community_decided_at IS 'When the community reached consensus';

-- =====================================================
-- How the system works:
--
-- 1. User votes OUI/NON without seeing AI evaluation (blind mode)
-- 2. After vote, we reveal the AI result
-- 3. When 3 unanimous votes OR 5 total votes:
--    - community_decision = 'yes' (majority OUI) or 'no' (majority NON)
--    - Compare with AI:
--      - AI=YES & community=yes → confirmed
--      - AI=NO & community=no → confirmed
--      - AI≠community → challenged
-- 4. Users who voted with the majority get +5 $SAFE bonus
-- =====================================================
