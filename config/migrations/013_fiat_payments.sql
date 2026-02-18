-- Migration 013: Table pour paiements FIAT (carte bancaire)
-- Créé le: 2025-01-03
-- Description: Enregistre les revenus Lemon Squeezy pour la comptabilité SASU

-- Table des paiements FIAT (Lemon Squeezy, Stripe, etc.)
CREATE TABLE IF NOT EXISTS fiat_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  -- Provider
  payment_provider TEXT NOT NULL DEFAULT 'lemonsqueezy',
  external_id TEXT UNIQUE, -- Lemon Squeezy order/subscription ID

  -- Montants
  amount_eur DECIMAL(10, 2) NOT NULL, -- Montant TTC
  amount_ht DECIMAL(10, 2), -- Auto-calculé
  tva_amount DECIMAL(10, 2), -- Auto-calculé
  tva_rate DECIMAL(4, 3) DEFAULT 0.20,

  -- Détails
  payment_type TEXT DEFAULT 'subscription',
  tier TEXT, -- 'explorer', 'pro', 'enterprise'
  description TEXT,
  status TEXT DEFAULT 'confirmed',

  -- Client
  customer_email TEXT,

  -- Timestamps
  payment_date TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fiat_payments_user_id ON fiat_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_fiat_payments_date ON fiat_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_fiat_payments_status ON fiat_payments(status);

-- RLS
ALTER TABLE fiat_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fiat payments"
  ON fiat_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage fiat payments"
  ON fiat_payments FOR ALL
  USING (true);

-- Trigger calcul automatique HT/TVA
CREATE OR REPLACE FUNCTION calculate_fiat_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount_ht IS NULL THEN
    NEW.amount_ht = NEW.amount_eur / (1 + NEW.tva_rate);
    NEW.tva_amount = NEW.amount_eur - NEW.amount_ht;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fiat_amounts_trigger
  BEFORE INSERT OR UPDATE ON fiat_payments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_fiat_amounts();

-- Vue unifiée: TOUS les revenus (crypto + fiat)
CREATE OR REPLACE VIEW all_revenues AS
SELECT
  'crypto' as source,
  id,
  user_id,
  amount_usdc as amount_ttc,
  amount_usdc / 1.20 as amount_ht,
  amount_usdc - (amount_usdc / 1.20) as tva_amount,
  tier,
  created_at as payment_date
FROM crypto_payments
WHERE status = 'confirmed'

UNION ALL

SELECT
  'fiat' as source,
  id,
  user_id,
  amount_eur as amount_ttc,
  amount_ht,
  tva_amount,
  tier,
  payment_date
FROM fiat_payments
WHERE status = 'confirmed';

COMMENT ON TABLE fiat_payments IS 'Paiements carte bancaire (Lemon Squeezy) pour comptabilité SASU';
COMMENT ON VIEW all_revenues IS 'Tous les revenus: crypto (NOWPayments) + fiat (Lemon Squeezy)';
