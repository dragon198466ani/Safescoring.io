-- MoonPay Crypto Transactions Table
-- Tracks crypto payments for subscriptions (non-EU + EU B2B)

CREATE TABLE IF NOT EXISTS crypto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Transaction identification
  external_id TEXT UNIQUE NOT NULL,
  moonpay_transaction_id TEXT UNIQUE,
  
  -- User info
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Plan details
  plan TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  
  -- Crypto details
  crypto_currency TEXT,
  crypto_amount NUMERIC(20,8),
  
  -- Customer info
  country_code TEXT NOT NULL,
  is_business BOOLEAN DEFAULT false,
  vat_number TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_crypto_transactions_user_id ON crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_status ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_external_id ON crypto_transactions(external_id);

ALTER TABLE crypto_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON crypto_transactions
  FOR SELECT USING (auth.uid() = user_id);
