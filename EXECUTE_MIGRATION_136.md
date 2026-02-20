# Migration 136 - Community Evaluation Votes

## Instructions

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet SafeScoring

2. **Aller dans SQL Editor**
   - Menu gauche → SQL Editor
   - Cliquer "New Query"

3. **Copier et exécuter le SQL ci-dessous**

---

```sql
-- ============================================================================
-- MIGRATION 136: Community Evaluation Votes + Token Gamification
-- ============================================================================

-- 1. Table evaluation_votes
CREATE TABLE IF NOT EXISTS evaluation_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    norm_id INTEGER NOT NULL,
    vote_agrees BOOLEAN NOT NULL,
    justification TEXT,
    evidence_url TEXT,
    evidence_type VARCHAR(50),
    voter_hash TEXT NOT NULL,
    voter_type VARCHAR(20) DEFAULT 'email',
    vote_weight NUMERIC(4,2) DEFAULT 0.3,
    status VARCHAR(20) DEFAULT 'pending',
    validation_score NUMERIC(5,2) DEFAULT 0,
    tokens_earned INTEGER DEFAULT 0,
    tokens_claimed BOOLEAN DEFAULT FALSE,
    ip_hash TEXT,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    CONSTRAINT unique_evaluation_vote UNIQUE (evaluation_id, voter_hash)
);

-- 2. Table token_rewards
CREATE TABLE IF NOT EXISTS token_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_hash TEXT NOT NULL UNIQUE,
    user_type VARCHAR(20) DEFAULT 'email',
    total_earned INTEGER DEFAULT 0,
    total_claimed INTEGER DEFAULT 0,
    total_pending INTEGER DEFAULT 0,
    votes_submitted INTEGER DEFAULT 0,
    votes_validated INTEGER DEFAULT 0,
    votes_rejected INTEGER DEFAULT 0,
    challenges_won INTEGER DEFAULT 0,
    challenges_lost INTEGER DEFAULT 0,
    wallet_address TEXT,
    last_claim_at TIMESTAMPTZ,
    daily_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_vote_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table token_transactions
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_hash TEXT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    tokens_amount INTEGER NOT NULL,
    evaluation_vote_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table reward_config
CREATE TABLE IF NOT EXISTS reward_config (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) UNIQUE NOT NULL,
    base_tokens INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed reward configuration
INSERT INTO reward_config (action_type, base_tokens, description) VALUES
    ('vote_agree', 1, 'Vote VRAI - confirme evaluation IA'),
    ('vote_disagree_pending', 2, 'Vote FAUX soumis - en attente'),
    ('vote_disagree_validated', 10, 'Vote FAUX valide - IA avait tort'),
    ('vote_disagree_rejected', -1, 'Vote FAUX rejete - IA avait raison'),
    ('daily_first_vote', 2, 'Bonus premier vote du jour'),
    ('streak_3_days', 5, 'Bonus streak 3 jours'),
    ('streak_7_days', 15, 'Bonus streak 7 jours'),
    ('streak_30_days', 50, 'Bonus streak 30 jours')
ON CONFLICT (action_type) DO NOTHING;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_eval_votes_evaluation ON evaluation_votes(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_eval_votes_product ON evaluation_votes(product_id);
CREATE INDEX IF NOT EXISTS idx_eval_votes_voter ON evaluation_votes(voter_hash);
CREATE INDEX IF NOT EXISTS idx_eval_votes_status ON evaluation_votes(status);
CREATE INDEX IF NOT EXISTS idx_token_rewards_user ON token_rewards(user_hash);
CREATE INDEX IF NOT EXISTS idx_token_tx_user ON token_transactions(user_hash);
CREATE INDEX IF NOT EXISTS idx_token_tx_date ON token_transactions(created_at DESC);

-- 7. Enable RLS
ALTER TABLE evaluation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
CREATE POLICY "evaluation_votes_read" ON evaluation_votes FOR SELECT USING (true);
CREATE POLICY "evaluation_votes_insert" ON evaluation_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "token_rewards_read" ON token_rewards FOR SELECT USING (true);
CREATE POLICY "token_transactions_read" ON token_transactions FOR SELECT USING (true);

-- Done!
SELECT 'Migration 136 complete!' as status;
```

---

4. **Cliquer "Run"** pour exécuter

5. **Vérifier** avec:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('evaluation_votes', 'token_rewards', 'token_transactions', 'reward_config');
```

## Tables créées

| Table | Description |
|-------|-------------|
| `evaluation_votes` | Votes VRAI/FAUX sur évaluations IA |
| `token_rewards` | Récompenses $SAFE par utilisateur |
| `token_transactions` | Historique des transactions |
| `reward_config` | Barème des récompenses |

## Barème $SAFE

| Action | Tokens |
|--------|--------|
| Vote VRAI (consensus) | +1 |
| Vote FAUX soumis | +2 |
| Vote FAUX validé | +10 |
| Streak 3 jours | +5 |
| Streak 7 jours | +15 |
| Streak 30 jours | +50 |
