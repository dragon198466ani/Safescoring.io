-- Migration 012: Add share_token to user_setups for shareable stacks
-- Purpose: Enable users to share their stacks via public URLs

-- Add share_token column to user_setups
ALTER TABLE user_setups
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for fast lookups by share_token
CREATE INDEX IF NOT EXISTS idx_user_setups_share_token
ON user_setups(share_token)
WHERE share_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_setups.share_token IS 'Unique token for sharing this setup publicly (read-only)';
