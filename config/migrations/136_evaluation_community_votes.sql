-- ============================================================================
-- MIGRATION 136: Community Evaluation Votes + Token Gamification
-- SafeScoring - 2026-02-01
-- ============================================================================
-- OBJECTIF: Permettre à la communauté de valider/contester les évaluations IA
--
-- Système simple: VRAI ou FAUX sur chaque évaluation
-- Si FAUX: justification + source obligatoire
-- Gamification: Gagner des tokens $SAFE pour chaque vote validé
-- ============================================================================
-- AUDIT: Corrigé le 2026-02-01
--   - FIX CRITIQUE: Récursion infinie dans award_tokens
--   - FIX CRITIQUE: Race condition dans validate_challenge_vote
--   - FIX RGPD: Nettoyage device_fingerprint
--   - FIX RLS: Policies UPDATE/DELETE manquantes
--   - FIX: votes_validated jamais incrémenté
-- ============================================================================

-- ============================================================================
-- 1. TABLE: evaluation_votes (votes VRAI/FAUX sur évaluations IA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evaluation_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Évaluation concernée (lien vers la table evaluations)
    evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    norm_id INTEGER NOT NULL REFERENCES norms(id) ON DELETE CASCADE,

    -- Vote: TRUE = d'accord avec l'IA, FALSE = pas d'accord
    vote_agrees BOOLEAN NOT NULL,

    -- Si pas d'accord (vote_agrees = FALSE), justification obligatoire
    justification TEXT,
    evidence_url TEXT, -- URL de la source/documentation
    evidence_type VARCHAR(50), -- 'official_doc', 'github', 'whitepaper', 'article', 'other'

    -- Votant (anonymisé RGPD)
    voter_hash TEXT NOT NULL, -- Hash email ou wallet
    voter_type VARCHAR(20) DEFAULT 'email', -- 'email', 'wallet'

    -- Poids du vote (basé sur réputation)
    vote_weight NUMERIC(4,2) DEFAULT 0.3,

    -- Statut du vote (pour validation par d'autres)
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'validated', 'rejected'
    validation_score NUMERIC(5,2) DEFAULT 0,

    -- Récompenses tokens
    tokens_earned INTEGER DEFAULT 0, -- Tokens $SAFE gagnés
    tokens_claimed BOOLEAN DEFAULT FALSE,

    -- Anti-fraude (RGPD: supprimé après 24h)
    ip_hash TEXT,
    device_fingerprint TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,

    -- Contraintes
    CONSTRAINT unique_evaluation_vote UNIQUE (evaluation_id, voter_hash),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'validated', 'rejected')),
    CONSTRAINT valid_voter_type CHECK (voter_type IN ('email', 'wallet')),
    CONSTRAINT valid_evidence_type CHECK (evidence_type IS NULL OR evidence_type IN ('official_doc', 'github', 'whitepaper', 'article', 'other')),
    CONSTRAINT justification_required_for_disagree CHECK (
        vote_agrees = TRUE OR (justification IS NOT NULL AND LENGTH(justification) >= 10)
    )
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_eval_votes_evaluation ON evaluation_votes(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_eval_votes_product ON evaluation_votes(product_id);
CREATE INDEX IF NOT EXISTS idx_eval_votes_norm ON evaluation_votes(norm_id);
CREATE INDEX IF NOT EXISTS idx_eval_votes_voter ON evaluation_votes(voter_hash);
CREATE INDEX IF NOT EXISTS idx_eval_votes_status ON evaluation_votes(status);
CREATE INDEX IF NOT EXISTS idx_eval_votes_pending ON evaluation_votes(status) WHERE status = 'pending';

COMMENT ON TABLE evaluation_votes IS 'Votes communautaires VRAI/FAUX sur les évaluations IA. RGPD compliant.';


-- ============================================================================
-- 2. TABLE: token_rewards (récompenses en tokens $SAFE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Utilisateur (anonymisé)
    user_hash TEXT NOT NULL,
    user_type VARCHAR(20) DEFAULT 'email',

    -- Totaux
    total_earned INTEGER DEFAULT 0, -- Total tokens gagnés
    total_claimed INTEGER DEFAULT 0, -- Total tokens réclamés
    total_pending INTEGER DEFAULT 0, -- En attente de claim

    -- Détails par action
    votes_submitted INTEGER DEFAULT 0,
    votes_validated INTEGER DEFAULT 0, -- Votes qui ont été confirmés par consensus
    votes_rejected INTEGER DEFAULT 0, -- Votes qui ont été contredits
    challenges_won INTEGER DEFAULT 0, -- Contestations gagnées (IA avait tort)
    challenges_lost INTEGER DEFAULT 0, -- Contestations perdues

    -- Wallet pour claim
    wallet_address TEXT,
    last_claim_at TIMESTAMPTZ,

    -- Streak bonus
    daily_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_vote_date DATE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT unique_user_rewards UNIQUE (user_hash),
    CONSTRAINT valid_claimed CHECK (total_claimed <= total_earned)
);

CREATE INDEX IF NOT EXISTS idx_token_rewards_user ON token_rewards(user_hash);
CREATE INDEX IF NOT EXISTS idx_token_rewards_wallet ON token_rewards(wallet_address) WHERE wallet_address IS NOT NULL;

COMMENT ON TABLE token_rewards IS 'Récompenses tokens $SAFE pour la communauté. Gamification.';


-- ============================================================================
-- 3. TABLE: token_transactions (historique des transactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_hash TEXT NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'vote_agree', 'vote_disagree', 'challenge_won', 'daily_bonus', 'streak_bonus', 'claim'
    tokens_amount INTEGER NOT NULL,

    -- Référence (optionnel)
    evaluation_vote_id UUID REFERENCES evaluation_votes(id) ON DELETE SET NULL,

    -- Détails
    description TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_tx_user ON token_transactions(user_hash);
CREATE INDEX IF NOT EXISTS idx_token_tx_date ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_tx_action ON token_transactions(action_type);


-- ============================================================================
-- 4. CONFIG: Barème des récompenses
-- ============================================================================

CREATE TABLE IF NOT EXISTS reward_config (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) UNIQUE NOT NULL,
    base_tokens INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer le barème
INSERT INTO reward_config (action_type, base_tokens, description) VALUES
    ('vote_agree', 1, 'Vote VRAI - confirme l''évaluation IA'),
    ('vote_disagree_pending', 2, 'Vote FAUX soumis - en attente de validation'),
    ('vote_disagree_validated', 10, 'Vote FAUX validé - l''IA avait tort!'),
    ('vote_disagree_rejected', -1, 'Vote FAUX rejeté - l''IA avait raison'),
    ('source_provided', 2, 'Bonus source/preuve fournie avec vote FAUX'),
    ('daily_first_vote', 2, 'Bonus premier vote du jour'),
    ('streak_3_days', 5, 'Bonus streak 3 jours'),
    ('streak_7_days', 15, 'Bonus streak 7 jours'),
    ('streak_30_days', 50, 'Bonus streak 30 jours'),
    ('referral_bonus', 20, 'Bonus parrainage')
ON CONFLICT (action_type) DO NOTHING;


-- ============================================================================
-- 5. FONCTION: Calculer et attribuer les tokens
-- ============================================================================
-- FIX: Guard clause pour éviter récursion infinie sur bonus actions

CREATE OR REPLACE FUNCTION award_tokens(
    p_user_hash TEXT,
    p_action_type TEXT,
    p_evaluation_vote_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_tokens INTEGER;
    v_is_first_today BOOLEAN;
    v_current_streak INTEGER;
    v_bonus_actions TEXT[] := ARRAY['daily_first_vote', 'streak_3_days', 'streak_7_days', 'streak_30_days', 'referral_bonus'];
BEGIN
    -- Récupérer le nombre de tokens pour cette action
    SELECT base_tokens INTO v_tokens
    FROM reward_config
    WHERE action_type = p_action_type AND is_active = TRUE;

    IF v_tokens IS NULL THEN
        RETURN 0;
    END IF;

    -- Créer ou mettre à jour le record de récompenses
    INSERT INTO token_rewards (user_hash, total_earned, total_pending, votes_submitted)
    VALUES (p_user_hash, v_tokens, v_tokens, CASE WHEN p_action_type IN ('vote_agree', 'vote_disagree_pending') THEN 1 ELSE 0 END)
    ON CONFLICT (user_hash) DO UPDATE SET
        total_earned = token_rewards.total_earned + v_tokens,
        total_pending = token_rewards.total_pending + v_tokens,
        votes_submitted = token_rewards.votes_submitted + CASE WHEN p_action_type IN ('vote_agree', 'vote_disagree_pending') THEN 1 ELSE 0 END,
        updated_at = NOW();

    -- Logger la transaction
    INSERT INTO token_transactions (user_hash, action_type, tokens_amount, evaluation_vote_id)
    VALUES (p_user_hash, p_action_type, v_tokens, p_evaluation_vote_id);

    -- FIX: Ne pas traiter les bonus pour les actions bonus (évite récursion infinie)
    IF p_action_type = ANY(v_bonus_actions) THEN
        RETURN v_tokens;
    END IF;

    -- Vérifier si c'est le premier vote du jour (bonus)
    SELECT (last_vote_date IS NULL OR last_vote_date < CURRENT_DATE)
    INTO v_is_first_today
    FROM token_rewards WHERE user_hash = p_user_hash;

    IF v_is_first_today THEN
        -- Mettre à jour le streak AVANT d'attribuer les bonus
        UPDATE token_rewards
        SET
            daily_streak = CASE
                WHEN last_vote_date = CURRENT_DATE - 1 THEN daily_streak + 1
                ELSE 1
            END,
            last_vote_date = CURRENT_DATE,
            longest_streak = GREATEST(longest_streak, CASE
                WHEN last_vote_date = CURRENT_DATE - 1 THEN daily_streak + 1
                ELSE 1
            END)
        WHERE user_hash = p_user_hash;

        -- Attribuer bonus premier vote du jour
        PERFORM award_tokens(p_user_hash, 'daily_first_vote');

        -- Vérifier les bonus de streak
        SELECT daily_streak INTO v_current_streak
        FROM token_rewards WHERE user_hash = p_user_hash;

        IF v_current_streak = 3 THEN
            PERFORM award_tokens(p_user_hash, 'streak_3_days');
        ELSIF v_current_streak = 7 THEN
            PERFORM award_tokens(p_user_hash, 'streak_7_days');
        ELSIF v_current_streak = 30 THEN
            PERFORM award_tokens(p_user_hash, 'streak_30_days');
        END IF;
    END IF;

    RETURN v_tokens;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 6. FONCTION: Traiter un vote sur évaluation
-- ============================================================================
-- FIX: Meilleure gestion des erreurs pour votes dupliqués

CREATE OR REPLACE FUNCTION process_evaluation_vote(
    p_evaluation_id INTEGER,
    p_voter_hash TEXT,
    p_vote_agrees BOOLEAN,
    p_justification TEXT DEFAULT NULL,
    p_evidence_url TEXT DEFAULT NULL,
    p_evidence_type TEXT DEFAULT NULL
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
BEGIN
    -- Vérifier si l'utilisateur a déjà voté
    SELECT id INTO v_existing_vote
    FROM evaluation_votes
    WHERE evaluation_id = p_evaluation_id AND voter_hash = p_voter_hash;

    IF v_existing_vote IS NOT NULL THEN
        RETURN jsonb_build_object('error', 'Already voted on this evaluation', 'vote_id', v_existing_vote);
    END IF;

    -- Récupérer product_id et norm_id de l'évaluation
    SELECT product_id, norm_id INTO v_product_id, v_norm_id
    FROM evaluations WHERE id = p_evaluation_id;

    IF v_product_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Evaluation not found');
    END IF;

    -- Calculer le poids du vote basé sur les tokens gagnés
    SELECT total_earned INTO v_user_total FROM token_rewards WHERE user_hash = p_voter_hash;
    IF v_user_total IS NOT NULL THEN
        IF v_user_total > 1000 THEN v_vote_weight := 2.0;
        ELSIF v_user_total > 500 THEN v_vote_weight := 1.5;
        ELSIF v_user_total > 100 THEN v_vote_weight := 1.0;
        ELSIF v_user_total > 50 THEN v_vote_weight := 0.5;
        END IF;
    END IF;

    -- Insérer le vote
    INSERT INTO evaluation_votes (
        evaluation_id, product_id, norm_id,
        vote_agrees, justification, evidence_url, evidence_type,
        voter_hash, vote_weight
    ) VALUES (
        p_evaluation_id, v_product_id, v_norm_id,
        p_vote_agrees, p_justification, p_evidence_url, p_evidence_type,
        p_voter_hash, v_vote_weight
    )
    RETURNING id INTO v_vote_id;

    -- Attribuer les tokens
    IF p_vote_agrees THEN
        v_tokens_earned := award_tokens(p_voter_hash, 'vote_agree', v_vote_id);
    ELSE
        v_tokens_earned := award_tokens(p_voter_hash, 'vote_disagree_pending', v_vote_id);
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'vote_id', v_vote_id,
        'tokens_earned', v_tokens_earned,
        'vote_weight', v_vote_weight,
        'vote_agrees', p_vote_agrees
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('error', 'Already voted on this evaluation');
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 7. FONCTION: Valider/Rejeter un vote de contestation
-- ============================================================================
-- FIX: FOR UPDATE + vérification status pour éviter race condition

CREATE OR REPLACE FUNCTION validate_challenge_vote(
    p_vote_id UUID,
    p_is_valid BOOLEAN,
    p_validator_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_vote evaluation_votes%ROWTYPE;
    v_bonus_tokens INTEGER;
BEGIN
    -- FIX: FOR UPDATE pour éviter race condition
    SELECT * INTO v_vote
    FROM evaluation_votes
    WHERE id = p_vote_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Vote not found');
    END IF;

    IF v_vote.vote_agrees = TRUE THEN
        RETURN jsonb_build_object('error', 'Only disagreement votes can be validated');
    END IF;

    -- FIX: Vérifier que le vote n'a pas déjà été traité
    IF v_vote.status != 'pending' THEN
        RETURN jsonb_build_object(
            'error', 'Vote already processed',
            'current_status', v_vote.status,
            'validated_at', v_vote.validated_at
        );
    END IF;

    IF p_is_valid THEN
        -- Vote validé: l'IA avait tort, gros bonus!
        UPDATE evaluation_votes
        SET status = 'validated', validated_at = NOW()
        WHERE id = p_vote_id;

        v_bonus_tokens := award_tokens(v_vote.voter_hash, 'vote_disagree_validated', p_vote_id);

        -- FIX: Mettre à jour votes_validated ET challenges_won
        UPDATE token_rewards
        SET
            challenges_won = challenges_won + 1,
            votes_validated = votes_validated + 1
        WHERE user_hash = v_vote.voter_hash;
    ELSE
        -- Vote rejeté: l'IA avait raison
        UPDATE evaluation_votes
        SET status = 'rejected', validated_at = NOW()
        WHERE id = p_vote_id;

        v_bonus_tokens := award_tokens(v_vote.voter_hash, 'vote_disagree_rejected', p_vote_id);

        -- FIX: Mettre à jour votes_rejected ET challenges_lost
        UPDATE token_rewards
        SET
            challenges_lost = challenges_lost + 1,
            votes_rejected = votes_rejected + 1
        WHERE user_hash = v_vote.voter_hash;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'status', CASE WHEN p_is_valid THEN 'validated' ELSE 'rejected' END,
        'tokens_change', v_bonus_tokens
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 8. VUE: Évaluations à voter (avec pagination recommandée)
-- ============================================================================

CREATE OR REPLACE VIEW evaluations_to_vote AS
SELECT
    e.id as evaluation_id,
    e.product_id,
    p.name as product_name,
    p.slug as product_slug,
    e.norm_id,
    n.code as norm_code,
    n.title as norm_title,
    n.pillar,
    e.result as ai_result,
    COALESCE(ev.agree_count, 0) as agree_count,
    COALESCE(ev.disagree_count, 0) as disagree_count,
    COALESCE(ev.total_weight, 0) as total_vote_weight
FROM evaluations e
JOIN products p ON e.product_id = p.id
JOIN norms n ON e.norm_id = n.id
LEFT JOIN (
    SELECT
        evaluation_id,
        COUNT(*) FILTER (WHERE vote_agrees = TRUE) as agree_count,
        COUNT(*) FILTER (WHERE vote_agrees = FALSE) as disagree_count,
        SUM(vote_weight) as total_weight
    FROM evaluation_votes
    GROUP BY evaluation_id
) ev ON e.id = ev.evaluation_id
WHERE e.result IS NOT NULL
  AND e.result NOT IN ('N/A', 'TBD')
ORDER BY ev.total_weight ASC NULLS FIRST, e.evaluation_date DESC;

COMMENT ON VIEW evaluations_to_vote IS 'Évaluations IA disponibles pour vote communautaire. IMPORTANT: Utiliser LIMIT dans les requêtes.';


-- ============================================================================
-- 9. FONCTION: Récupérer évaluations à voter avec pagination
-- ============================================================================

CREATE OR REPLACE FUNCTION get_evaluations_to_vote(
    p_voter_hash TEXT DEFAULT NULL,
    p_product_slug TEXT DEFAULT NULL,
    p_pillar TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
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
    agree_count BIGINT,
    disagree_count BIGINT,
    total_vote_weight NUMERIC,
    user_has_voted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        etv.evaluation_id,
        etv.product_id,
        etv.product_name,
        etv.product_slug,
        etv.norm_id,
        etv.norm_code,
        etv.norm_title,
        etv.pillar,
        etv.ai_result,
        etv.agree_count,
        etv.disagree_count,
        etv.total_vote_weight,
        CASE WHEN ev.id IS NOT NULL THEN TRUE ELSE FALSE END as user_has_voted
    FROM evaluations_to_vote etv
    LEFT JOIN evaluation_votes ev ON ev.evaluation_id = etv.evaluation_id
        AND ev.voter_hash = p_voter_hash
    WHERE (p_product_slug IS NULL OR etv.product_slug = p_product_slug)
      AND (p_pillar IS NULL OR etv.pillar = p_pillar)
    ORDER BY etv.total_vote_weight ASC NULLS FIRST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================================
-- 10. VUE: Leaderboard des contributeurs
-- ============================================================================

CREATE OR REPLACE VIEW community_leaderboard AS
SELECT
    tr.user_hash,
    tr.user_type,
    tr.total_earned as tokens_earned,
    tr.total_claimed as tokens_claimed,
    tr.votes_submitted,
    tr.votes_validated,
    tr.votes_rejected,
    tr.challenges_won,
    tr.challenges_lost,
    tr.daily_streak,
    tr.longest_streak,
    tr.wallet_address IS NOT NULL as is_wallet_verified,
    RANK() OVER (ORDER BY tr.total_earned DESC) as rank,
    -- Taux de succès des challenges
    CASE
        WHEN (tr.challenges_won + tr.challenges_lost) > 0
        THEN ROUND(tr.challenges_won::NUMERIC / (tr.challenges_won + tr.challenges_lost) * 100, 1)
        ELSE NULL
    END as challenge_success_rate
FROM token_rewards tr
WHERE tr.total_earned > 0
ORDER BY tr.total_earned DESC;


-- ============================================================================
-- 11. RLS Policies
-- ============================================================================

ALTER TABLE evaluation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_config ENABLE ROW LEVEL SECURITY;

-- Votes: lecture publique (transparence)
DROP POLICY IF EXISTS "evaluation_votes_read" ON evaluation_votes;
CREATE POLICY "evaluation_votes_read" ON evaluation_votes
    FOR SELECT USING (true);

-- Votes: insertion par service uniquement (via API)
DROP POLICY IF EXISTS "evaluation_votes_insert" ON evaluation_votes;
CREATE POLICY "evaluation_votes_insert" ON evaluation_votes
    FOR INSERT TO service_role WITH CHECK (true);

-- Votes: update par service uniquement (validation)
DROP POLICY IF EXISTS "evaluation_votes_update" ON evaluation_votes;
CREATE POLICY "evaluation_votes_update" ON evaluation_votes
    FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Token rewards: lecture publique (anonymisé)
DROP POLICY IF EXISTS "token_rewards_read" ON token_rewards;
CREATE POLICY "token_rewards_read" ON token_rewards
    FOR SELECT USING (true);

-- Token rewards: modification par service uniquement
DROP POLICY IF EXISTS "token_rewards_modify" ON token_rewards;
CREATE POLICY "token_rewards_modify" ON token_rewards
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Transactions: lecture publique (anonymisée)
DROP POLICY IF EXISTS "token_transactions_read" ON token_transactions;
CREATE POLICY "token_transactions_read" ON token_transactions
    FOR SELECT USING (true);

-- Transactions: insertion par service uniquement
DROP POLICY IF EXISTS "token_transactions_insert" ON token_transactions;
CREATE POLICY "token_transactions_insert" ON token_transactions
    FOR INSERT TO service_role WITH CHECK (true);

-- Config: lecture publique, modification service uniquement
DROP POLICY IF EXISTS "reward_config_read" ON reward_config;
CREATE POLICY "reward_config_read" ON reward_config
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "reward_config_modify" ON reward_config;
CREATE POLICY "reward_config_modify" ON reward_config
    FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================================================
-- 12. PERMISSIONS
-- ============================================================================

GRANT SELECT ON evaluations_to_vote TO authenticated, anon;
GRANT SELECT ON community_leaderboard TO authenticated, anon;
GRANT EXECUTE ON FUNCTION process_evaluation_vote TO service_role;
GRANT EXECUTE ON FUNCTION validate_challenge_vote TO service_role;
GRANT EXECUTE ON FUNCTION award_tokens TO service_role;
GRANT EXECUTE ON FUNCTION get_evaluations_to_vote TO authenticated, anon;


-- ============================================================================
-- 13. NETTOYAGE RGPD (supprimer PII après 24h)
-- ============================================================================
-- FIX: Inclut device_fingerprint

CREATE OR REPLACE FUNCTION cleanup_evaluation_votes_pii()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE evaluation_votes
    SET
        ip_hash = NULL,
        device_fingerprint = NULL
    WHERE (ip_hash IS NOT NULL OR device_fingerprint IS NOT NULL)
      AND created_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_evaluation_votes_pii IS 'RGPD: Supprime ip_hash et device_fingerprint après 24h. À appeler via cron.';


-- ============================================================================
-- 14. TRIGGER: Sync product_id/norm_id depuis evaluations
-- ============================================================================
-- Garantit la cohérence des données dénormalisées

CREATE OR REPLACE FUNCTION sync_evaluation_vote_refs()
RETURNS TRIGGER AS $$
BEGIN
    SELECT product_id, norm_id INTO NEW.product_id, NEW.norm_id
    FROM evaluations WHERE id = NEW.evaluation_id;

    IF NEW.product_id IS NULL THEN
        RAISE EXCEPTION 'Evaluation % not found', NEW.evaluation_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_evaluation_vote_refs ON evaluation_votes;
CREATE TRIGGER trg_sync_evaluation_vote_refs
    BEFORE INSERT ON evaluation_votes
    FOR EACH ROW
    EXECUTE FUNCTION sync_evaluation_vote_refs();


-- ============================================================================
-- 15. VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 136 - Community Evaluation Votes installée (AUDITED)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables créées:';
    RAISE NOTICE '  - evaluation_votes: Votes VRAI/FAUX sur évaluations IA';
    RAISE NOTICE '  - token_rewards: Récompenses tokens $SAFE';
    RAISE NOTICE '  - token_transactions: Historique des gains';
    RAISE NOTICE '  - reward_config: Barème des récompenses';
    RAISE NOTICE '';
    RAISE NOTICE 'Corrections appliquées:';
    RAISE NOTICE '  ✓ Récursion infinie dans award_tokens corrigée';
    RAISE NOTICE '  ✓ Race condition dans validate_challenge_vote corrigée';
    RAISE NOTICE '  ✓ RGPD: device_fingerprint nettoyé après 24h';
    RAISE NOTICE '  ✓ RLS policies UPDATE/DELETE ajoutées';
    RAISE NOTICE '  ✓ votes_validated maintenant incrémenté';
    RAISE NOTICE '  ✓ Fonction paginée get_evaluations_to_vote ajoutée';
    RAISE NOTICE '';
    RAISE NOTICE 'Barème des tokens:';
    RAISE NOTICE '  - Vote VRAI: +1 $SAFE';
    RAISE NOTICE '  - Vote FAUX (soumis): +2 $SAFE';
    RAISE NOTICE '  - Vote FAUX validé (IA avait tort): +10 $SAFE';
    RAISE NOTICE '  - Bonus premier vote/jour: +2 $SAFE';
    RAISE NOTICE '  - Streak 7 jours: +15 $SAFE';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage:';
    RAISE NOTICE '  SELECT process_evaluation_vote(eval_id, voter_hash, TRUE/FALSE, justification, url);';
    RAISE NOTICE '  SELECT * FROM get_evaluations_to_vote(''user_hash'', NULL, NULL, 20, 0);';
END $$;

-- ============================================================================
-- AGGREGATION FUNCTIONS (Server-side calculations, NOT client-side!)
-- ============================================================================

-- Function to get total tokens distributed (avoids fetching all records client-side)
CREATE OR REPLACE FUNCTION get_total_tokens_distributed()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(SUM(total_earned), 0)::BIGINT
    FROM token_rewards
    WHERE total_earned > 0;
$$;

COMMENT ON FUNCTION get_total_tokens_distributed IS 'Returns total $SAFE tokens distributed. Use this instead of fetching all records and summing client-side.';

-- Function to get community stats in one call (efficient)
CREATE OR REPLACE FUNCTION get_community_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_voters', (SELECT COUNT(*) FROM token_rewards WHERE total_earned > 0),
        'total_tokens_distributed', (SELECT COALESCE(SUM(total_earned), 0) FROM token_rewards),
        'total_votes', (SELECT COUNT(*) FROM evaluation_votes),
        'total_agrees', (SELECT COUNT(*) FROM evaluation_votes WHERE vote_agrees = true),
        'total_challenges', (SELECT COUNT(*) FROM evaluation_votes WHERE vote_agrees = false),
        'challenges_validated', (SELECT COUNT(*) FROM evaluation_votes WHERE vote_agrees = false AND status = 'validated'),
        'challenges_rejected', (SELECT COUNT(*) FROM evaluation_votes WHERE vote_agrees = false AND status = 'rejected'),
        'avg_daily_votes', (
            SELECT COALESCE(AVG(daily_count), 0)
            FROM (
                SELECT DATE(created_at) as vote_date, COUNT(*) as daily_count
                FROM evaluation_votes
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
            ) daily_stats
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION get_community_stats IS 'Returns all community stats in one efficient call. Avoids N+1 queries.';
