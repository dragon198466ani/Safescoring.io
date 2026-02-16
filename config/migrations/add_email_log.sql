-- Migration: Create email_log table for email sequence tracking
-- Prevents duplicate sends and enables sequence analytics

CREATE TABLE IF NOT EXISTS email_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, email_type)
);

-- Index for fast lookup during cron
CREATE INDEX IF NOT EXISTS idx_email_log_user_type ON email_log(user_id, email_type);
