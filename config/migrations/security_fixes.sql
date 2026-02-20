-- Migration: Security Fixes
-- 1. Create missing tables
-- 2. Add unique constraint on payment_events for replay attack prevention
-- 3. Add RLS policies for missing tables
-- Run this in Supabase SQL Editor

-- ============================================
-- CREATE MISSING TABLES
-- ============================================

-- Payment events table (for webhook processing)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'nowpayments',
  status TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_type TEXT,
  amount NUMERIC,
  currency TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  payment_method TEXT,
  payment_provider TEXT,
  payment_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- PAYMENT EVENTS: Prevent replay attacks
-- ============================================

-- Add unique constraint on payment_id + status to prevent duplicate processing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_payment_id_status_unique'
  ) THEN
    ALTER TABLE payment_events
    ADD CONSTRAINT payment_events_payment_id_status_unique
    UNIQUE (payment_id, status);
  END IF;
END $$;

-- Add index for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_status
ON payment_events(payment_id, status);

-- ============================================
-- RLS POLICIES FOR PAYMENT/SUBSCRIPTION TABLES
-- ============================================

-- Enable RLS on payment_events
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment events
DROP POLICY IF EXISTS "Users can view own payment events" ON payment_events;
CREATE POLICY "Users can view own payment events" ON payment_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all payment events
DROP POLICY IF EXISTS "Service role can manage payment events" ON payment_events;
CREATE POLICY "Service role can manage payment events" ON payment_events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all subscriptions
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- RLS POLICIES FOR REFERENCE TABLES (if they exist)
-- ============================================

-- Product Type Mapping Table (run only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'product_type_mapping') THEN
    ALTER TABLE product_type_mapping ENABLE ROW LEVEL SECURITY;

    -- Drop and recreate policies
    DROP POLICY IF EXISTS "Public can read product type mappings" ON product_type_mapping;
    CREATE POLICY "Public can read product type mappings" ON product_type_mapping
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Service role can manage product type mappings" ON product_type_mapping;
    CREATE POLICY "Service role can manage product type mappings" ON product_type_mapping
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    RAISE NOTICE 'RLS policies created for product_type_mapping';
  ELSE
    RAISE NOTICE 'Table product_type_mapping does not exist, skipping';
  END IF;
END $$;

-- Norm Applicability Table (run only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'norm_applicability') THEN
    ALTER TABLE norm_applicability ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can read norm applicability" ON norm_applicability;
    CREATE POLICY "Public can read norm applicability" ON norm_applicability
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Service role can manage norm applicability" ON norm_applicability;
    CREATE POLICY "Service role can manage norm applicability" ON norm_applicability
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    RAISE NOTICE 'RLS policies created for norm_applicability';
  ELSE
    RAISE NOTICE 'Table norm_applicability does not exist, skipping';
  END IF;
END $$;

-- Incident Product Impact Table (run only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'incident_product_impact') THEN
    ALTER TABLE incident_product_impact ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can read incident product impact" ON incident_product_impact;
    CREATE POLICY "Public can read incident product impact" ON incident_product_impact
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Service role can manage incident product impact" ON incident_product_impact;
    CREATE POLICY "Service role can manage incident product impact" ON incident_product_impact
      FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    RAISE NOTICE 'RLS policies created for incident_product_impact';
  ELSE
    RAISE NOTICE 'Table incident_product_impact does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- Additional Security: Add indexes for RLS performance
-- ============================================

-- Index for faster RLS policy evaluation on user-specific tables
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_user_id ON payment_events(user_id);

-- Indexes for tables that may or may not exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_streaks') THEN
    CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
    RAISE NOTICE 'Index created on user_streaks';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'push_subscriptions') THEN
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
    RAISE NOTICE 'Index created on push_subscriptions';
  END IF;
END $$;

-- ============================================
-- Verify RLS is enabled on all sensitive tables
-- ============================================

-- Enable RLS on any tables that might have it disabled
DO $$
DECLARE
  tbl text;
  sensitive_tables text[] := ARRAY[
    'users',
    'subscriptions',
    'payment_events',
    'user_streaks',
    'push_subscriptions',
    'user_setups',
    'api_keys',
    'user_preferences',
    'user_notifications',
    'user_wallets',
    'corrections'
  ];
BEGIN
  FOREACH tbl IN ARRAY sensitive_tables
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'RLS enabled on %', tbl;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END;
  END LOOP;
END $$;

-- ============================================
-- Audit: Log table showing which tables have RLS
-- ============================================

-- Create a view to easily check RLS status (for admin dashboard)
CREATE OR REPLACE VIEW admin_rls_status AS
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- Grant access to this view for admins only
REVOKE ALL ON admin_rls_status FROM PUBLIC;
GRANT SELECT ON admin_rls_status TO authenticated;
