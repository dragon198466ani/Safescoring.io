-- ============================================================
-- ANNUAL BILLING MIGRATION
-- Adds billing_cycle tracking to users table
-- ============================================================

-- Add billing cycle column (monthly or annual)
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(10) DEFAULT 'monthly';

-- Add billing_cycle to ppp_audit_log for tracking annual checkouts
ALTER TABLE ppp_audit_log ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(10) DEFAULT 'monthly';

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_users_billing_cycle ON users(billing_cycle);
