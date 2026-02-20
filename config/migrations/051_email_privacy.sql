-- Migration: Email Privacy
-- Adds email hashing and masking for GDPR compliance and privacy protection
-- Similar to wallet_address_hash, we store a hash instead of plain email

-- Add email privacy columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS email_display VARCHAR(50);

-- Create index on email_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);

-- Comment on columns
COMMENT ON COLUMN users.email_hash IS 'HMAC-SHA256 hash of email for privacy-preserving lookups';
COMMENT ON COLUMN users.email_display IS 'Masked email for display (e.g., u***@g***.com)';

-- Function to hash existing emails (run once, then original emails can be cleared)
-- WARNING: Only run this after confirming EMAIL_HASH_SALT is set in environment
CREATE OR REPLACE FUNCTION hash_existing_emails()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- This is a placeholder - actual hashing must be done from application
  -- because the salt is stored in environment variables, not database
  RAISE NOTICE 'Email hashing must be done from the application layer';
  RAISE NOTICE 'Run the following from your app: POST /api/admin/privacy/hash-emails';
END;
$$ LANGUAGE plpgsql;

-- Security policy: Only the user can see their own email_display
-- (email_hash is used internally only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can view own email_display'
  ) THEN
    CREATE POLICY "Users can view own email_display"
      ON users
      FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;
