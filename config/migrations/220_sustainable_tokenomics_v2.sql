-- ============================================================================
-- Migration 220: Sustainable Tokenomics v2 — AUTONOMOUS TOKEN MODEL
-- ============================================================================
-- The $SAFE token is 100% independent from EUR subscription revenue.
-- EUR revenue = founder's income. Token = separate economy.
--
-- How $SAFE gains value WITHOUT subscription revenue:
--
-- 1. DEMAND: Token-exclusive features force users to BUY $SAFE on market
--    → Raw API, early access 48h, priority eval, custom alerts
--    → These features are NOT available via EUR subscription
--
-- 2. BURN: Every time a user spends $SAFE, 50% is permanently burned
--    → Supply decreases with every usage
--
-- 3. SCARCITY: Emission halving (500K → 250K → 125K/month)
--    → New tokens entering circulation decrease over time
--
-- 4. VESTING: Team/Treasury locked on-chain (no insider dump)
--    → Team: 12-month cliff + 36-month linear
--    → Treasury: 6-month cliff + 24-month linear
--
-- Vote power: 1 person = 1 vote, always. Zero effect from staking.
-- ============================================================================

-- ============================================================================
-- 1. Token supply tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_supply_v2 (
  id SERIAL PRIMARY KEY,

  -- Fixed supply
  max_supply BIGINT NOT NULL DEFAULT 100000000,  -- 100M fixed

  -- Distribution (immutable after TGE)
  community_allocation BIGINT NOT NULL DEFAULT 40000000,  -- 40%
  treasury_allocation BIGINT NOT NULL DEFAULT 20000000,   -- 20%
  team_allocation BIGINT NOT NULL DEFAULT 20000000,       -- 20%
  liquidity_allocation BIGINT NOT NULL DEFAULT 10000000,  -- 10%
  burn_reserve BIGINT NOT NULL DEFAULT 10000000,          -- 10% (burned via spend)

  -- Minted tracking
  community_minted BIGINT NOT NULL DEFAULT 0,
  treasury_minted BIGINT NOT NULL DEFAULT 0,
  team_minted BIGINT NOT NULL DEFAULT 0,
  liquidity_minted BIGINT NOT NULL DEFAULT 10000000,      -- Minted at deployment

  -- Burn tracking
  total_spend_burned BIGINT NOT NULL DEFAULT 0,
  total_emitted BIGINT NOT NULL DEFAULT 0,
  recycled_pool BIGINT NOT NULL DEFAULT 0,

  -- Computed
  circulating_supply BIGINT GENERATED ALWAYS AS (
    liquidity_minted + community_minted - total_spend_burned
  ) STORED,

  -- Emission schedule
  monthly_emission_cap BIGINT NOT NULL DEFAULT 500000,  -- Halves yearly
  current_month_emitted BIGINT NOT NULL DEFAULT 0,
  last_month_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deploy_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Monthly emission vs burn stats (transparency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_monthly_stats (
  id SERIAL PRIMARY KEY,
  month_year VARCHAR(7) NOT NULL UNIQUE,  -- '2026-02'

  -- Emissions
  tokens_emitted BIGINT NOT NULL DEFAULT 0,
  emission_cap BIGINT NOT NULL DEFAULT 500000,

  -- Burns (from user spending only — no buyback in autonomous model)
  tokens_spend_burned BIGINT NOT NULL DEFAULT 0,

  -- Ratio: >1.0 = deflationary, <1.0 = inflationary
  burn_emission_ratio DECIMAL(8, 4) GENERATED ALWAYS AS (
    CASE WHEN tokens_emitted > 0
      THEN tokens_spend_burned::DECIMAL / tokens_emitted
      ELSE 1.0
    END
  ) STORED,

  -- Is this month net deflationary?
  is_deflationary BOOLEAN GENERATED ALWAYS AS (
    tokens_spend_burned >= tokens_emitted
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Vesting schedule tracking (Test 3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_vesting_schedules (
  id SERIAL PRIMARY KEY,

  beneficiary_type VARCHAR(20) NOT NULL CHECK (beneficiary_type IN ('team', 'treasury')),
  beneficiary_label VARCHAR(100),

  -- Contract addresses (on-chain)
  vesting_contract_address VARCHAR(42),
  token_contract_address VARCHAR(42),
  chain_id INT,

  -- Schedule parameters
  total_allocation BIGINT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  cliff_months INT NOT NULL,
  vesting_months INT NOT NULL,
  cliff_end_date TIMESTAMPTZ NOT NULL,
  vesting_end_date TIMESTAMPTZ NOT NULL,

  -- Current state (synced from chain)
  tokens_vested BIGINT NOT NULL DEFAULT 0,
  tokens_claimed BIGINT NOT NULL DEFAULT 0,
  tokens_locked BIGINT NOT NULL DEFAULT 0,
  vested_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Token-exclusive features (NOT available via EUR subscription)
-- ============================================================================
-- These create BUY PRESSURE: users must buy $SAFE to access them.

CREATE TABLE IF NOT EXISTS token_exclusive_features (
  id SERIAL PRIMARY KEY,
  feature_key VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Requirements
  min_staking_tier INT NOT NULL DEFAULT 0,  -- 0=any, 1=bronze...5=diamond
  requires_staking BOOLEAN NOT NULL DEFAULT TRUE,

  -- This feature is NOT available via EUR subscription
  eur_equivalent BOOLEAN NOT NULL DEFAULT FALSE,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed token-exclusive features
-- NOTE: NO revenue share. Token is autonomous, 0% of EUR goes to token.
-- NOTE: Vote power is NOT a feature. 1 person = 1 vote, always.
INSERT INTO token_exclusive_features (feature_key, title, description, min_staking_tier, eur_equivalent) VALUES
  ('raw_api', 'Raw Evaluation Data API', 'Access raw norm-level evaluation data via API', 3, FALSE),
  ('priority_eval', 'Priority Evaluation Queue', 'New product evaluation requests processed first', 2, FALSE),
  ('early_access', 'Early Score Access', 'See new evaluations 48h before public release', 2, FALSE),
  ('custom_alerts', 'Custom Score Alerts', 'Real-time alerts when specific products change score', 1, FALSE)
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================================
-- 5. Updated token earn rules (with emission cap awareness)
-- ============================================================================

ALTER TABLE token_earn_rules ADD COLUMN IF NOT EXISTS
  counts_toward_emission_cap BOOLEAN DEFAULT TRUE;

-- Reduce earn amounts to be sustainable with 500K/month cap
-- 500K/month = ~16,700/day across all users
UPDATE token_earn_rules SET tokens_amount = 1, max_per_day = 20 WHERE action = 'vote';
UPDATE token_earn_rules SET tokens_amount = 2, max_per_day = 10 WHERE action = 'vote_correct';
UPDATE token_earn_rules SET tokens_amount = 5 WHERE action = 'challenge_validated';
UPDATE token_earn_rules SET tokens_amount = 10 WHERE action = 'streak_7';
UPDATE token_earn_rules SET tokens_amount = 25 WHERE action = 'streak_30';
UPDATE token_earn_rules SET tokens_amount = 15 WHERE action = 'referral_signup';
UPDATE token_earn_rules SET tokens_amount = 50 WHERE action = 'referral_subscribe';

-- ============================================================================
-- 6. Update spend items to use 50% burn
-- ============================================================================

ALTER TABLE token_spend_items ADD COLUMN IF NOT EXISTS burn_percent INT DEFAULT 50;

-- ============================================================================
-- 7. Initialize supply record
-- ============================================================================

INSERT INTO token_supply_v2 (max_supply) VALUES (100000000)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. Seed vesting schedules
-- ============================================================================

INSERT INTO token_vesting_schedules
  (beneficiary_type, beneficiary_label, total_allocation, start_date, cliff_months, vesting_months, cliff_end_date, vesting_end_date, tokens_locked)
VALUES
  ('team', 'Core Team', 20000000, NOW(), 12, 36, NOW() + INTERVAL '12 months', NOW() + INTERVAL '48 months', 20000000),
  ('treasury', 'Development Treasury', 20000000, NOW(), 6, 24, NOW() + INTERVAL '6 months', NOW() + INTERVAL '30 months', 20000000)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. Initialize first monthly stats record
-- ============================================================================

INSERT INTO token_monthly_stats (month_year, emission_cap)
VALUES (TO_CHAR(NOW(), 'YYYY-MM'), 500000)
ON CONFLICT (month_year) DO NOTHING;

-- ============================================================================
-- 10. Tokenomics Viability Norms (12 new SAFE scoring norms)
-- ============================================================================
-- These norms evaluate OTHER products' token economics using the 3 tests.
-- Applied to all product types that have a native/governance token.

INSERT INTO norms (code, pillar, title, description, is_essential, consumer) VALUES
  -- TEST 1: Revenue > Emissions (Pillar F)
  ('F-TOK-REV', 'F', 'Revenue > Emissions Ratio', 'Le revenu du protocole est supérieur aux émissions de nouveaux tokens. Ratio burn/emission > 1.0 vérifiable on-chain.', TRUE, TRUE),
  ('F-TOK-BURN', 'F', 'On-chain Token Burn', 'Mécanisme de burn vérifiable on-chain lié au revenu réel (buyback & burn, fee burn).', FALSE, TRUE),
  ('F-TOK-TREASURY', 'F', 'Treasury Diversification', 'Trésorerie diversifiée (stablecoins, ETH), pas 100% en token natif.', FALSE, TRUE),

  -- TEST 2: Real Reason to Hold (Pillar E)
  ('E-TOK-REALYIELD', 'E', 'Real Yield Distribution', 'Rendement payé en actifs non-inflationnaires (ETH, USDC) provenant des revenus réels.', TRUE, TRUE),
  ('E-TOK-UTIL', 'E', 'Concrete Token Utility', 'Utilité fonctionnelle concrète au-delà du staking inflationnaire.', FALSE, TRUE),
  ('E-TOK-ACCRUE', 'E', 'Value Accrual Mechanism', 'La valeur générée revient aux détenteurs (fee switch, buyback, revenue share).', FALSE, TRUE),

  -- TEST 3: Insider Vesting (Pillar A)
  ('A-TOK-VEST', 'A', 'On-chain Vesting Schedule', 'Calendrier de déblocage vérifiable on-chain via smart contract immutable.', TRUE, TRUE),
  ('A-TOK-ALLOC', 'A', 'Insider Allocation < 30%', 'Part insiders (team + investors + advisors) ne dépasse pas 30% de la supply.', FALSE, TRUE),
  ('A-TOK-LOCK', 'A', 'Smart Contract Lock', 'Tokens team/treasury verrouillés on-chain avec cliff et unlock linéaire.', TRUE, TRUE),

  -- TOKEN SECURITY (Pillar S)
  ('S-TOK-MINT', 'S', 'Mint Function Restricted', 'Fonction mint restreinte (cap fixe) ou renoncée. Pas de mint arbitraire.', TRUE, TRUE),
  ('S-TOK-ECON', 'S', 'Tokenomics Audited', 'Modèle économique audité par un tiers indépendant (Gauntlet, Chaos Labs).', FALSE, TRUE),
  ('S-TOK-SUPPLY', 'S', 'Max Supply On-chain', 'Supply maximale codée en dur (constant/immutable), non modifiable.', FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;
