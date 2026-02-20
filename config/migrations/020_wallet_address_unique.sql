-- Migration 020: Add UNIQUE constraint on wallet_address
-- SECURITY: Prevent wallet address hijacking by ensuring one wallet = one account
-- Date: 2026-01-04

-- Only run if wallet_address column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'wallet_address'
    ) THEN
        -- First, check for and handle any duplicate wallet addresses
        -- This query finds duplicates and keeps only the most recent one
        WITH duplicates AS (
          SELECT id, wallet_address, created_at,
                 ROW_NUMBER() OVER (PARTITION BY wallet_address ORDER BY created_at DESC) as rn
          FROM users
          WHERE wallet_address IS NOT NULL
        )
        UPDATE users
        SET wallet_address = NULL
        WHERE id IN (
          SELECT id FROM duplicates WHERE rn > 1
        );

        -- Now add the unique constraint
        -- Using a partial index to only enforce uniqueness on non-null values
        CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_address_unique_idx
        ON users (wallet_address)
        WHERE wallet_address IS NOT NULL;

        -- Add a comment explaining the security rationale
        COMMENT ON INDEX users_wallet_address_unique_idx IS
        'SECURITY: Prevents the same wallet address from being linked to multiple accounts.
        This prevents wallet hijacking attacks where an attacker could link a victim wallet
        to their own account.';

        -- Also add constraint to ensure wallet addresses are lowercase (normalized)
        -- This is enforced via a check constraint (only if not already exists)
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'wallet_address_lowercase_check'
        ) THEN
            ALTER TABLE users
            ADD CONSTRAINT wallet_address_lowercase_check
            CHECK (wallet_address = LOWER(wallet_address));
        END IF;
    END IF;
END $$;
