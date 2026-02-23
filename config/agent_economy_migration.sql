-- ============================================================
-- SAFESCORING.IO - AGENT ECONOMY MIGRATION
-- ============================================================
-- Version: 1.0
-- Date: 2026-02-21
-- Purpose: Add tables for Agent-to-Agent economy (B2B)
--          Pay-per-query with USDC credits, wallet auth,
--          Superfluid streaming support
-- ============================================================

-- ============================================================
-- SECTION 1: AGENT CREDITS (wallet-based prepaid balance)
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    label TEXT, -- optional friendly name for the agent
    balance_usdc DECIMAL(18,6) DEFAULT 0 CHECK (balance_usdc >= 0),
    total_deposited DECIMAL(18,6) DEFAULT 0,
    total_spent DECIMAL(18,6) DEFAULT 0,
    total_queries INTEGER DEFAULT 0,
    -- Superfluid streaming
    has_active_stream BOOLEAN DEFAULT FALSE,
    stream_flow_rate TEXT, -- wei/sec as string (too large for integer)
    stream_checked_at TIMESTAMPTZ,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_credits_wallet ON agent_credits(wallet_address);

-- ============================================================
-- SECTION 2: AGENT TRANSACTIONS (query/deposit history)
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL REFERENCES agent_credits(wallet_address),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'query', 'analysis', 'batch', 'refund', 'stream_access')),
    amount_usdc DECIMAL(18,6) NOT NULL,
    -- Query details
    endpoint TEXT,
    product_slug TEXT,
    products_count INTEGER, -- for batch queries
    -- Payment details
    tx_hash TEXT, -- on-chain transaction hash for deposits
    payment_method TEXT CHECK (payment_method IN ('nowpayments', 'direct_transfer', 'superfluid', 'admin')),
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tx_wallet ON agent_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_agent_tx_created ON agent_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tx_type ON agent_transactions(type);

-- ============================================================
-- SECTION 3: AGENT NONCES (replay attack prevention)
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    nonce TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_nonces_wallet ON agent_nonces(wallet_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_nonces_unique ON agent_nonces(wallet_address, nonce);

-- ============================================================
-- SECTION 4: FUNCTIONS
-- ============================================================

-- 4.1 Atomic debit for agent credits (prevents race conditions)
CREATE OR REPLACE FUNCTION debit_agent_credits(
    p_wallet TEXT,
    p_amount DECIMAL(18,6),
    p_type TEXT,
    p_endpoint TEXT DEFAULT NULL,
    p_product_slug TEXT DEFAULT NULL,
    p_products_count INTEGER DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance DECIMAL(18,6),
    error_message TEXT
) AS $$
DECLARE
    v_current_balance DECIMAL(18,6);
    v_new_balance DECIMAL(18,6);
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT balance_usdc INTO v_current_balance
    FROM agent_credits
    WHERE wallet_address = LOWER(p_wallet)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL(18,6), 'Wallet not registered'::TEXT;
        RETURN;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient balance'::TEXT;
        RETURN;
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- Update balance
    UPDATE agent_credits
    SET balance_usdc = v_new_balance,
        total_spent = total_spent + p_amount,
        total_queries = total_queries + 1,
        updated_at = NOW()
    WHERE wallet_address = LOWER(p_wallet);

    -- Record transaction
    INSERT INTO agent_transactions (wallet_address, type, amount_usdc, endpoint, product_slug, products_count)
    VALUES (LOWER(p_wallet), p_type, p_amount, p_endpoint, p_product_slug, p_products_count);

    RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Credit deposit for agent
CREATE OR REPLACE FUNCTION credit_agent_deposit(
    p_wallet TEXT,
    p_amount DECIMAL(18,6),
    p_tx_hash TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'direct_transfer'
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance DECIMAL(18,6)
) AS $$
DECLARE
    v_new_balance DECIMAL(18,6);
BEGIN
    -- Upsert: create wallet if not exists, add balance if exists
    INSERT INTO agent_credits (wallet_address, balance_usdc, total_deposited)
    VALUES (LOWER(p_wallet), p_amount, p_amount)
    ON CONFLICT (wallet_address) DO UPDATE SET
        balance_usdc = agent_credits.balance_usdc + p_amount,
        total_deposited = agent_credits.total_deposited + p_amount,
        updated_at = NOW()
    RETURNING balance_usdc INTO v_new_balance;

    -- Record transaction
    INSERT INTO agent_transactions (wallet_address, type, amount_usdc, tx_hash, payment_method)
    VALUES (LOWER(p_wallet), 'deposit', p_amount, p_tx_hash, p_payment_method);

    RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Get agent stats
CREATE OR REPLACE FUNCTION get_agent_stats(p_wallet TEXT)
RETURNS TABLE (
    balance DECIMAL(18,6),
    total_deposited DECIMAL(18,6),
    total_spent DECIMAL(18,6),
    total_queries INTEGER,
    queries_today INTEGER,
    queries_this_month INTEGER,
    has_active_stream BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ac.balance_usdc,
        ac.total_deposited,
        ac.total_spent,
        ac.total_queries,
        (SELECT COUNT(*)::INTEGER FROM agent_transactions at2
         WHERE at2.wallet_address = LOWER(p_wallet)
         AND at2.type IN ('query', 'analysis', 'batch')
         AND at2.created_at >= CURRENT_DATE),
        (SELECT COUNT(*)::INTEGER FROM agent_transactions at3
         WHERE at3.wallet_address = LOWER(p_wallet)
         AND at3.type IN ('query', 'analysis', 'batch')
         AND at3.created_at >= date_trunc('month', CURRENT_DATE)),
        ac.has_active_stream
    FROM agent_credits ac
    WHERE ac.wallet_address = LOWER(p_wallet);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 5: VIEWS
-- ============================================================

-- Agent economy dashboard view
CREATE OR REPLACE VIEW v_agent_economy_stats AS
SELECT
    COUNT(*) as total_agents,
    SUM(balance_usdc) as total_balance,
    SUM(total_deposited) as total_deposited,
    SUM(total_spent) as total_revenue,
    SUM(total_queries) as total_queries,
    COUNT(CASE WHEN has_active_stream THEN 1 END) as streaming_agents,
    COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_24h,
    COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_7d
FROM agent_credits;

-- ============================================================
-- SECTION 6: RLS POLICIES
-- ============================================================

ALTER TABLE agent_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_nonces ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to agent_credits"
    ON agent_credits FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to agent_transactions"
    ON agent_transactions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to agent_nonces"
    ON agent_nonces FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SECTION 7: CLEANUP (nonce expiry)
-- ============================================================

-- Function to clean expired nonces (call periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_agent_nonces()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM agent_nonces WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;
