-- Migration 021: Add expiration to share tokens
-- SECURITY: Limit exposure window for shared stacks
-- Date: 2026-01-04

-- Add expiration column to user_setups
ALTER TABLE user_setups
ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMPTZ;

-- Add comment explaining the security rationale
COMMENT ON COLUMN user_setups.share_token_expires_at IS
'SECURITY: Expiration timestamp for share tokens. Limits the exposure window
for shared stacks. Tokens expire after 30 days by default. Users can regenerate
tokens to extend access or revoke them immediately via DELETE.';

-- Create index for efficient expiration checking
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_setups' AND column_name = 'share_token'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_setups_share_token_expires
        ON user_setups(share_token_expires_at)
        WHERE share_token IS NOT NULL;
    ELSE
        -- Create simpler index without WHERE clause if share_token doesn't exist
        CREATE INDEX IF NOT EXISTS idx_user_setups_share_token_expires
        ON user_setups(share_token_expires_at)
        WHERE share_token_expires_at IS NOT NULL;
    END IF;
END $$;

-- Optional: Set expiration for existing tokens (30 days from now)
-- Uncomment if you want to retroactively expire existing tokens
-- UPDATE user_setups
-- SET share_token_expires_at = NOW() + INTERVAL '30 days'
-- WHERE share_token IS NOT NULL AND share_token_expires_at IS NULL;
