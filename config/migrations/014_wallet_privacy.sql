-- ============================================================================
-- Migration 014: Wallet Address Privacy Enhancement
-- ============================================================================
-- Implements privacy-preserving wallet address storage using hashing.
-- Original wallet addresses are no longer stored in plain text.
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW PRIVACY-PRESERVING COLUMNS
-- ============================================================================

-- Hash of wallet address (for lookups and duplicate detection)
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address_hash TEXT;

-- Masked display version (e.g., "0x1234...5678")
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address_display TEXT;

-- Create index on hash for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_hash ON users(wallet_address_hash)
WHERE wallet_address_hash IS NOT NULL;

-- ============================================================================
-- 2. MIGRATE EXISTING DATA
-- ============================================================================
-- Note: This migration hashes existing plain-text addresses.
-- Requires WALLET_HASH_SALT environment variable to be set.
-- Run the migration script to populate hashes for existing addresses.

-- Create a function to mask wallet addresses
CREATE OR REPLACE FUNCTION mask_wallet_address(address TEXT)
RETURNS TEXT AS $$
BEGIN
    IF address IS NULL OR LENGTH(address) < 12 THEN
        RETURN NULL;
    END IF;

    -- Return format: 0x1234...5678
    RETURN CONCAT(
        LEFT(address, 6),
        '...',
        RIGHT(address, 4)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate display addresses from existing plain addresses (if any exist)
UPDATE users
SET wallet_address_display = mask_wallet_address(wallet_address)
WHERE wallet_address IS NOT NULL
AND wallet_address_display IS NULL;

-- ============================================================================
-- 3. SECURITY CONSTRAINTS
-- ============================================================================

-- Ensure hash is unique (only one user per wallet)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_hash_unique
ON users(wallet_address_hash)
WHERE wallet_address_hash IS NOT NULL;

-- ============================================================================
-- 4. DEPRECATION NOTICE FOR OLD COLUMN
-- ============================================================================
-- The old wallet_address column is now deprecated.
-- It will be removed in a future migration after all clients are updated.
-- DO NOT use wallet_address in new code - use wallet_address_hash instead.

COMMENT ON COLUMN users.wallet_address IS 'DEPRECATED: Use wallet_address_hash instead. Will be removed in future migration.';
COMMENT ON COLUMN users.wallet_address_hash IS 'HMAC-SHA256 hash of wallet address for privacy-preserving lookups';
COMMENT ON COLUMN users.wallet_address_display IS 'Masked wallet address for display (e.g., 0x1234...5678)';

-- ============================================================================
-- 5. AUDIT LOG FOR MIGRATION
-- ============================================================================

-- Log this migration
INSERT INTO admin_audit_logs (admin_email, action, resource, details)
VALUES (
    'system',
    'MIGRATION',
    'wallet_privacy',
    jsonb_build_object(
        'migration', '014_wallet_privacy',
        'description', 'Added wallet address hashing for privacy',
        'affected_columns', ARRAY['wallet_address_hash', 'wallet_address_display']
    )
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed):
-- ============================================================================
-- DROP INDEX IF EXISTS idx_users_wallet_hash;
-- DROP INDEX IF EXISTS idx_users_wallet_hash_unique;
-- ALTER TABLE users DROP COLUMN IF EXISTS wallet_address_hash;
-- ALTER TABLE users DROP COLUMN IF EXISTS wallet_address_display;
-- DROP FUNCTION IF EXISTS mask_wallet_address;
-- ============================================================================
