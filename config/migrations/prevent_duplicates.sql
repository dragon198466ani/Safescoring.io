-- Migration: Prevent Duplicates Across All Tables
-- Comprehensive unique constraints to prevent duplicate entries
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. USER_WALLETS - Prevent duplicate wallet addresses per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_wallets') THEN
    -- Add unique constraint if not exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_wallets_user_wallet_chain_unique'
    ) THEN
      ALTER TABLE user_wallets
      ADD CONSTRAINT user_wallets_user_wallet_chain_unique
      UNIQUE (user_id, wallet_address, chain_id);
      RAISE NOTICE 'Added unique constraint on user_wallets';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_wallets does not exist';
  END IF;
END $$;

-- ============================================
-- 2. ALERT_SUBSCRIPTIONS - Prevent duplicate alert subscriptions
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'alert_subscriptions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'alert_subscriptions_unique_rule'
    ) THEN
      ALTER TABLE alert_subscriptions
      ADD CONSTRAINT alert_subscriptions_unique_rule
      UNIQUE (api_key_hash, product_id, type, webhook_url);
      RAISE NOTICE 'Added unique constraint on alert_subscriptions';
    END IF;
  ELSE
    RAISE NOTICE 'Table alert_subscriptions does not exist';
  END IF;
END $$;

-- ============================================
-- 3. AFFILIATES - One affiliate account per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'affiliates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'affiliates_user_unique'
    ) THEN
      ALTER TABLE affiliates
      ADD CONSTRAINT affiliates_user_unique
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on affiliates (user_id)';
    END IF;
  ELSE
    RAISE NOTICE 'Table affiliates does not exist';
  END IF;
END $$;

-- ============================================
-- 4. USER_CORRECTIONS - Prevent exact duplicate corrections
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_corrections') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_corrections_unique_suggestion'
    ) THEN
      ALTER TABLE user_corrections
      ADD CONSTRAINT user_corrections_unique_suggestion
      UNIQUE (user_id, product_id, field_corrected, suggested_value);
      RAISE NOTICE 'Added unique constraint on user_corrections';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_corrections does not exist';
  END IF;
END $$;

-- ============================================
-- 5. CRYPTO_PAYMENT_PREFERENCES - One preference per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'crypto_payment_preferences') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'crypto_payment_preferences_user_unique'
    ) THEN
      ALTER TABLE crypto_payment_preferences
      ADD CONSTRAINT crypto_payment_preferences_user_unique
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on crypto_payment_preferences';
    END IF;
  ELSE
    RAISE NOTICE 'Table crypto_payment_preferences does not exist';
  END IF;
END $$;

-- ============================================
-- 6. NOTIFICATIONS_LOG - Prevent duplicate notifications per day
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications_log') THEN
    -- Create unique index instead of constraint (more flexible for partial matches)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_log_dedup
    ON notifications_log (user_id, notification_type, content_hash, (created_at::date));
    RAISE NOTICE 'Added unique index on notifications_log';
  ELSE
    RAISE NOTICE 'Table notifications_log does not exist';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add index on notifications_log: %', SQLERRM;
END $$;

-- ============================================
-- 7. USER_STREAKS - One streak record per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_streaks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_streaks_user_id_key'
    ) THEN
      ALTER TABLE user_streaks
      ADD CONSTRAINT user_streaks_user_id_key
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on user_streaks';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_streaks does not exist';
  END IF;
END $$;

-- ============================================
-- 8. PUSH_SUBSCRIPTIONS - One push subscription per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'push_subscriptions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_user_id_key'
    ) THEN
      ALTER TABLE push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_id_key
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on push_subscriptions';
    END IF;
  ELSE
    RAISE NOTICE 'Table push_subscriptions does not exist';
  END IF;
END $$;

-- ============================================
-- 9. USER_DISPLAY_SETTINGS - One display settings per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_display_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_display_settings_user_unique'
    ) THEN
      ALTER TABLE user_display_settings
      ADD CONSTRAINT user_display_settings_user_unique
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on user_display_settings';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_display_settings does not exist';
  END IF;
END $$;

-- ============================================
-- 10. USER_EMAIL_PREFERENCES - One email preferences per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_email_preferences') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_email_preferences_user_unique'
    ) THEN
      ALTER TABLE user_email_preferences
      ADD CONSTRAINT user_email_preferences_user_unique
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on user_email_preferences';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_email_preferences does not exist';
  END IF;
END $$;

-- ============================================
-- 11. USER_PRIVACY_SETTINGS - One privacy settings per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_privacy_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_privacy_settings_user_unique'
    ) THEN
      ALTER TABLE user_privacy_settings
      ADD CONSTRAINT user_privacy_settings_user_unique
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on user_privacy_settings';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_privacy_settings does not exist';
  END IF;
END $$;

-- ============================================
-- 12. USER_ONBOARDING - One onboarding state per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_onboarding') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_onboarding_user_unique'
    ) THEN
      ALTER TABLE user_onboarding
      ADD CONSTRAINT user_onboarding_user_unique
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on user_onboarding';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_onboarding does not exist';
  END IF;
END $$;

-- ============================================
-- 13. NEWSLETTER_SUBSCRIPTIONS - Prevent duplicate emails
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'newsletter_subscriptions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_subscriptions_email_unique'
    ) THEN
      ALTER TABLE newsletter_subscriptions
      ADD CONSTRAINT newsletter_subscriptions_email_unique
      UNIQUE (email);
      RAISE NOTICE 'Added unique constraint on newsletter_subscriptions';
    END IF;
  ELSE
    RAISE NOTICE 'Table newsletter_subscriptions does not exist';
  END IF;
END $$;

-- ============================================
-- 14. LEADS - Prevent duplicate leads by email
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leads') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'leads_email_unique'
    ) THEN
      ALTER TABLE leads
      ADD CONSTRAINT leads_email_unique
      UNIQUE (email);
      RAISE NOTICE 'Added unique constraint on leads';
    END IF;
  ELSE
    RAISE NOTICE 'Table leads does not exist';
  END IF;
END $$;

-- ============================================
-- 15. USER_FEATURE_ACCESS - One feature access record per user
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_feature_access') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_feature_access_user_unique'
    ) THEN
      ALTER TABLE user_feature_access
      ADD CONSTRAINT user_feature_access_user_unique
      UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on user_feature_access';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_feature_access does not exist';
  END IF;
END $$;

-- ============================================
-- 16. SETUP_SHARES - Prevent duplicate share tokens
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'setup_shares') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'setup_shares_token_unique'
    ) THEN
      ALTER TABLE setup_shares
      ADD CONSTRAINT setup_shares_token_unique
      UNIQUE (share_token);
      RAISE NOTICE 'Added unique constraint on setup_shares (token)';
    END IF;
  ELSE
    RAISE NOTICE 'Table setup_shares does not exist';
  END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR DUPLICATE LOOKUP PERFORMANCE
-- ============================================

-- Index for fast duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_payment_events_dedup
ON payment_events(payment_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
ON subscriptions(user_id);

-- ============================================
-- SUMMARY VIEW: Check all unique constraints
-- ============================================
CREATE OR REPLACE VIEW admin_unique_constraints AS
SELECT
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;

-- Grant access to view
GRANT SELECT ON admin_unique_constraints TO authenticated;

-- ============================================
-- FINAL CHECK: List all tables without unique constraints
-- ============================================
DO $$
DECLARE
  table_record RECORD;
  has_unique BOOLEAN;
BEGIN
  RAISE NOTICE '=== TABLES WITHOUT UNIQUE CONSTRAINTS ===';

  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.table_name = table_record.tablename
        AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
        AND tc.table_schema = 'public'
    ) INTO has_unique;

    IF NOT has_unique THEN
      RAISE NOTICE 'No unique constraint: %', table_record.tablename;
    END IF;
  END LOOP;

  RAISE NOTICE '=== END OF CHECK ===';
END $$;
