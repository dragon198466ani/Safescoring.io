-- ============================================
-- Web3 Integration Migration for SafeScoring
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add wallet_address column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- 2. Create index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- 3. Ensure wallet addresses are unique (one wallet per user)
ALTER TABLE users ADD CONSTRAINT users_wallet_address_unique UNIQUE (wallet_address);

-- 4. Create table to track NFT-based access (cache from blockchain)
CREATE TABLE IF NOT EXISTS nft_access_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    nft_contract TEXT NOT NULL,
    token_id INTEGER,
    tier TEXT NOT NULL, -- 'explorer', 'professional', 'enterprise'
    chain_id INTEGER NOT NULL DEFAULT 137, -- Polygon
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Cache expiry (e.g., 1 hour)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT nft_access_cache_wallet_contract_unique UNIQUE (wallet_address, nft_contract)
);

-- 5. Index for NFT cache lookups
CREATE INDEX IF NOT EXISTS idx_nft_access_wallet ON nft_access_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_access_expires ON nft_access_cache(expires_at);

-- 6. Create table to track on-chain score publications
CREATE TABLE IF NOT EXISTS onchain_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id INTEGER NOT NULL REFERENCES products(id),
    chain_id INTEGER NOT NULL DEFAULT 137,
    tx_hash TEXT NOT NULL,
    block_number BIGINT,
    overall_score INTEGER NOT NULL,
    security_score INTEGER,
    adversity_score INTEGER,
    fidelity_score INTEGER,
    efficiency_score INTEGER,
    evaluation_hash TEXT, -- IPFS hash
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT onchain_scores_tx_unique UNIQUE (chain_id, tx_hash)
);

-- 7. Index for on-chain score lookups
CREATE INDEX IF NOT EXISTS idx_onchain_scores_product ON onchain_scores(product_id);
CREATE INDEX IF NOT EXISTS idx_onchain_scores_published ON onchain_scores(published_at DESC);

-- 8. Create table for crypto payments (USDC transactions)
CREATE TABLE IF NOT EXISTS crypto_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    wallet_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 137,
    tx_hash TEXT NOT NULL,
    amount_usdc DECIMAL(18, 6) NOT NULL,
    payment_type TEXT NOT NULL, -- 'nft_mint', 'subscription', 'one_time'
    tier TEXT, -- 'explorer', 'professional', 'enterprise'
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT crypto_payments_tx_unique UNIQUE (chain_id, tx_hash)
);

-- 9. Index for crypto payment lookups
CREATE INDEX IF NOT EXISTS idx_crypto_payments_user ON crypto_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_wallet ON crypto_payments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON crypto_payments(status);

-- 10. Function to clean up expired NFT cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_nft_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM nft_access_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 11. RLS Policies for new tables

-- NFT Access Cache: Only service role can write, authenticated users can read their own
ALTER TABLE nft_access_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own NFT cache"
    ON nft_access_cache FOR SELECT
    TO authenticated
    USING (
        wallet_address = (
            SELECT wallet_address FROM users WHERE id = auth.uid()
        )
    );

-- On-chain Scores: Public read, only service role can write
ALTER TABLE onchain_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view on-chain scores"
    ON onchain_scores FOR SELECT
    TO anon, authenticated
    USING (true);

-- Crypto Payments: Users can view their own payments
ALTER TABLE crypto_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
    ON crypto_payments FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if migration was successful:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'wallet_address';
-- SELECT * FROM information_schema.tables WHERE table_name IN ('nft_access_cache', 'onchain_scores', 'crypto_payments');
