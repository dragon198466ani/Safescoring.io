-- ============================================================================
-- Migration 221: Autonomous Token Model — FULL CLEANUP
-- ============================================================================
-- Resolves ALL conflicts between old migrations (211-215) and the autonomous
-- token model established in migration 220.
--
-- RULES:
--   1. 0% EUR subscription revenue goes to the token
--   2. 1 person = 1 vote (no multipliers)
--   3. Staking = pure utility (feature access tiers, NO APY/yield)
--   4. 50% burn on all token spends (via spendAndBurn on-chain)
--   5. Simple pass system: Explorer/Pro × 4 durations + permanent setup
--   6. Earn rules from migration 220 are the source of truth
-- ============================================================================

-- ============================================================================
-- 1. CLEAN UP OLD SPEND ITEMS — Replace with pass system
-- ============================================================================

-- Delete ALL old token spend items (from migrations 211, 212, 214, 215)
DELETE FROM token_spend_items WHERE TRUE;

-- Insert the 9 coherent pass options
-- Prices calibrated on: active user earns ~20 $SAFE/day (~600/month)
-- 50% of spent tokens burned on-chain via spendAndBurn()
INSERT INTO token_spend_items (item_key, title, description, cost_tokens, category, burn_percent, is_active) VALUES
  -- Explorer tier passes (EUR equivalent: $19/month)
  ('explorer_1d',   'Explorer 1 jour',     'Accès Explorer pendant 24 heures',    15,    'pass', 50, TRUE),
  ('explorer_1w',   'Explorer 1 semaine',  'Accès Explorer pendant 7 jours',      80,    'pass', 50, TRUE),
  ('explorer_1m',   'Explorer 1 mois',     'Accès Explorer pendant 30 jours',     250,   'pass', 50, TRUE),
  ('explorer_1y',   'Explorer 1 an',       'Accès Explorer pendant 365 jours',    2000,  'pass', 50, TRUE),

  -- Pro tier passes (EUR equivalent: $49/month)
  ('pro_1d',        'Pro 1 jour',          'Accès Professional pendant 24 heures', 40,   'pass', 50, TRUE),
  ('pro_1w',        'Pro 1 semaine',       'Accès Professional pendant 7 jours',   200,  'pass', 50, TRUE),
  ('pro_1m',        'Pro 1 mois',          'Accès Professional pendant 30 jours',  600,  'pass', 50, TRUE),
  ('pro_1y',        'Pro 1 an',            'Accès Professional pendant 365 jours', 5000, 'pass', 50, TRUE),

  -- Permanent unlocks
  ('extra_setup',   '+1 Setup permanent',  'Ajouter un slot de setup supplémentaire de manière permanente', 40, 'unlock', 50, TRUE)
ON CONFLICT (item_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  cost_tokens = EXCLUDED.cost_tokens,
  category = EXCLUDED.category,
  burn_percent = EXCLUDED.burn_percent,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- 2. CLEAN UP VOTE MULTIPLIERS — Force 1 person = 1 vote
-- ============================================================================

-- Remove vote multiplier functions if they exist
UPDATE staking_tiers SET vote_multiplier = 1.0 WHERE TRUE;

-- Force subscription vote multipliers to 1.0
UPDATE subscription_token_alignment SET vote_multiplier = 1.0 WHERE TRUE;

-- Remove vote boost products
DELETE FROM token_spend_items WHERE item_key IN ('vote_boost_x2', 'super_vote', 'mega_vote', 'governance_vote_boost');

-- Remove vote weight calculation overrides
DROP FUNCTION IF EXISTS calculate_vote_weight(UUID);

-- ============================================================================
-- 3. CLEAN UP STAKING TIERS — Pure utility, NO APY
-- ============================================================================

-- Remove APY from all staking tiers
UPDATE staking_tiers SET
  apy = 0,
  weekly_reward_rate = 0,
  vote_multiplier = 1.0
WHERE TRUE;

-- Remove staking reward distributions (no yield in autonomous model)
DROP TABLE IF EXISTS staking_revenue_distributions CASCADE;
DROP TABLE IF EXISTS staking_rewards_log CASCADE;

-- ============================================================================
-- 4. CLEAN UP SUBSCRIPTION-TOKEN ALIGNMENT — 0% EUR to token
-- ============================================================================

-- Remove monthly token rewards from EUR subscriptions
UPDATE subscription_token_alignment SET
  monthly_token_reward = 0,
  included_tier = NULL,
  vote_multiplier = 1.0
WHERE TRUE;

-- Or if easier, just reset the whole table
DELETE FROM subscription_token_alignment WHERE TRUE;
INSERT INTO subscription_token_alignment (plan_code, monthly_token_reward, included_tier, vote_multiplier) VALUES
  ('free', 0, NULL, 1.0),
  ('explorer', 0, NULL, 1.0),
  ('pro', 0, NULL, 1.0),
  ('enterprise', 0, NULL, 1.0)
ON CONFLICT (plan_code) DO UPDATE SET
  monthly_token_reward = 0,
  included_tier = NULL,
  vote_multiplier = 1.0;

-- ============================================================================
-- 5. CLEAN UP SHOP ITEMS — Remove cosmetic/social features
-- ============================================================================

DELETE FROM token_shop_items WHERE category IN ('cosmetic', 'boost');
DELETE FROM token_shop_items WHERE item_key IN (
  'badge_og', 'badge_expert', 'frame_gold', 'frame_animated',
  'title_custom', 'super_vote', 'highlight_24h',
  'leaderboard_highlight', 'profile_frame_gold', 'profile_frame_animated',
  'custom_title'
);

-- ============================================================================
-- 6. CLEAN UP OLD TOKEN PRODUCTS — Replaced by pass system
-- ============================================================================

DELETE FROM token_products WHERE TRUE;

-- ============================================================================
-- 7. CLEAN UP PREMIUM CONTENT PRICING — Now included in passes
-- ============================================================================

-- Premium content is now included in Explorer/Pro passes, not individual purchases
UPDATE premium_content_types SET
  cost_tokens = 0,
  requires_pass = TRUE
WHERE TRUE;

-- Add pass requirement column if not exists
ALTER TABLE premium_content_types ADD COLUMN IF NOT EXISTS requires_pass BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- 8. CLEAN UP API TIERS — Now included in Pro pass
-- ============================================================================

-- API access is part of Pro tier, not separately purchasable
DELETE FROM api_tiers WHERE tier_code NOT IN ('free');
UPDATE api_tiers SET
  monthly_token_cost = 0,
  description = 'API access included in Professional plan or Pro $SAFE pass'
WHERE TRUE;

-- ============================================================================
-- 9. ALIGN EARN RULES — Migration 220 is source of truth
-- ============================================================================

-- Reset ALL earn rules to migration 220 values
UPDATE token_earn_rules SET
  tokens_amount = CASE action
    WHEN 'vote' THEN 1
    WHEN 'vote_correct' THEN 2
    WHEN 'challenge_validated' THEN 5
    WHEN 'streak_7' THEN 10
    WHEN 'streak_30' THEN 25
    WHEN 'referral_signup' THEN 15
    WHEN 'referral_subscribe' THEN 50
    ELSE tokens_amount
  END,
  max_per_day = CASE action
    WHEN 'vote' THEN 20
    WHEN 'vote_correct' THEN 10
    ELSE max_per_day
  END
WHERE action IN ('vote', 'vote_correct', 'challenge_validated', 'streak_7', 'streak_30', 'referral_signup', 'referral_subscribe');

-- Remove earn rules that shouldn't exist in autonomous model
DELETE FROM token_earn_rules WHERE action IN (
  'subscription_bonus',     -- 0% EUR to token
  'first_vote_of_day',      -- Merged into vote
  'anniversary_1_year',     -- No subscription bonus
  'quality_feedback',       -- Not needed
  'bug_report_valid'        -- Not needed
);

-- ============================================================================
-- 10. CLEAN UP TOKEN EXCLUSIVE FEATURES — Now via passes
-- ============================================================================

-- Features are now part of Explorer/Pro passes, not separate staking unlocks
DELETE FROM token_exclusive_features WHERE TRUE;
INSERT INTO token_exclusive_features (feature_key, title, description, min_staking_tier, eur_equivalent) VALUES
  ('explorer_pass', 'Explorer Access via $SAFE', 'Toutes les fonctionnalités Explorer accessibles via pass $SAFE', 0, FALSE),
  ('pro_pass', 'Professional Access via $SAFE', 'Toutes les fonctionnalités Professional accessibles via pass $SAFE', 0, FALSE)
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================================
-- 11. ADD TOKEN PASS TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_passes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which pass
  pass_type VARCHAR(20) NOT NULL CHECK (pass_type IN ('explorer', 'pro')),
  duration_key VARCHAR(10) NOT NULL CHECK (duration_key IN ('1d', '1w', '1m', '1y')),

  -- Cost & burn
  tokens_spent INT NOT NULL,
  tokens_burned INT NOT NULL,       -- 50% of spent
  tokens_recycled INT NOT NULL,     -- 50% of spent

  -- Validity
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  is_active BOOLEAN GENERATED ALWAYS AS (
    NOW() < expires_at
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_token_passes_user_active
  ON token_passes (user_id, expires_at DESC);

-- Permanent unlocks (extra setups, etc.)
CREATE TABLE IF NOT EXISTS token_permanent_unlocks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_type VARCHAR(30) NOT NULL CHECK (unlock_type IN ('extra_setup')),
  tokens_spent INT NOT NULL,
  tokens_burned INT NOT NULL,
  tokens_recycled INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_unlocks_user
  ON token_permanent_unlocks (user_id, unlock_type);

-- ============================================================================
-- 12. COHERENCE VERIFICATION QUERIES
-- ============================================================================

-- Verify: No APY anywhere
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM staking_tiers WHERE apy > 0 OR weekly_reward_rate > 0) THEN
    RAISE NOTICE 'WARNING: Staking tiers still have APY > 0';
  END IF;
END $$;

-- Verify: No vote multipliers > 1
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM staking_tiers WHERE vote_multiplier > 1.0) THEN
    RAISE NOTICE 'WARNING: Vote multipliers still > 1.0';
  END IF;
END $$;

-- Verify: No subscription token rewards
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_token_alignment WHERE monthly_token_reward > 0) THEN
    RAISE NOTICE 'WARNING: Subscription still gives token rewards';
  END IF;
END $$;

-- Verify: Exactly 9 spend items
DO $$
DECLARE
  count INT;
BEGIN
  SELECT COUNT(*) INTO count FROM token_spend_items WHERE is_active = TRUE;
  IF count != 9 THEN
    RAISE NOTICE 'WARNING: Expected 9 active spend items, found %', count;
  END IF;
END $$;

-- ============================================================================
-- 13. PRICING COHERENCE SUMMARY (for reference)
-- ============================================================================
--
-- EARN RATES (source of truth):
--   vote=1 (max 20/day), vote_correct=2 (max 10/day)
--   challenge_validated=5, streak_7=10, streak_30=25
--   referral_signup=15, referral_subscribe=50
--   → Active user: ~20 $SAFE/day = ~600 $SAFE/month
--
-- SPEND PRICES (all 50% burn):
--   Explorer 1d=15, 1w=80, 1m=250, 1y=2000
--   Pro 1d=40, 1w=200, 1m=600, 1y=5000
--   +1 Setup=40
--
-- EMISSION CAP: 500,000 $SAFE/month (halving yearly)
--
-- STAKING TIERS (pure utility, NO APY):
--   Bronze=100, Silver=500, Gold=1000, Platinum=2500, Diamond=5000
--   → Unlocks: extra setups, PDF, API, alerts, SafeBot messages
--   → NO weekly rewards, NO vote multipliers
--
-- VOTE SYSTEM: 1 person = 1 vote, always
--
-- SUBSCRIPTION-TOKEN: 0% EUR goes to token. Completely independent.
--
