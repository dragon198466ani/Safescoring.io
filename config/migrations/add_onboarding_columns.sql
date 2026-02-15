-- SafeScoring: Add onboarding columns to users table
-- Run this if the onboarding flow returns _migrationNeeded: true
-- Safe to re-run (IF NOT EXISTS)

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_product_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Also ensure product_views table exists for free tier tracking
CREATE TABLE IF NOT EXISTS product_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  month_year VARCHAR(7) NOT NULL, -- "2025-01" format
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id, month_year)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_views_user_month
  ON product_views(user_id, month_year);

-- Webhook events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-cleanup old webhook events (older than 48h)
-- Requires pg_cron extension
-- SELECT cron.schedule('cleanup-webhook-events', '0 */6 * * *',
--   $$DELETE FROM webhook_events WHERE processed_at < now() - interval '48 hours'$$
-- );
