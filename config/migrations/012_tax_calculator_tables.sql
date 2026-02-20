-- Migration 012: Tables pour calculateur d'impôts SASU
-- Créé le: 2025-01-03
-- Description: Ajoute les tables pour gérer les dépenses et récompenses staking

-- Table des dépenses professionnelles
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  category TEXT, -- 'servers', 'tools', 'salaries', 'other'
  receipt_url TEXT, -- URL vers justificatif
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des récompenses staking
CREATE TABLE IF NOT EXISTS staking_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  crypto TEXT NOT NULL, -- 'SOL', 'ETH', 'MATIC', 'DOT'
  amount DECIMAL(18, 8) NOT NULL, -- Quantité de crypto reçue
  value_eur DECIMAL(10, 2) NOT NULL, -- Valeur en EUR au cours du jour
  date DATE NOT NULL,
  tx_hash TEXT, -- Hash de transaction (optionnel)
  source TEXT, -- 'phantom', 'lido', 'coinbase', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_staking_user_id ON staking_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_date ON staking_rewards(date DESC);

-- Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staking_rewards ENABLE ROW LEVEL SECURITY;

-- Policies pour expenses
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour staking_rewards
CREATE POLICY "Users can view their own staking rewards"
  ON staking_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own staking rewards"
  ON staking_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own staking rewards"
  ON staking_rewards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own staking rewards"
  ON staking_rewards FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staking_rewards_updated_at
  BEFORE UPDATE ON staking_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vue pour résumé fiscal annuel
CREATE OR REPLACE VIEW fiscal_summary AS
SELECT
  EXTRACT(YEAR FROM COALESCE(cp.created_at, sr.date, e.date)) as year,
  COALESCE(SUM(cp.amount_usdc), 0) as total_crypto_revenue,
  COALESCE(SUM(sr.value_eur), 0) as total_staking_rewards,
  COALESCE(SUM(e.amount), 0) as total_expenses,
  COALESCE(SUM(cp.amount_usdc), 0) + COALESCE(SUM(sr.value_eur), 0) - COALESCE(SUM(e.amount), 0) as taxable_profit
FROM
  crypto_payments cp
  FULL OUTER JOIN staking_rewards sr ON EXTRACT(YEAR FROM cp.created_at) = EXTRACT(YEAR FROM sr.date)
  FULL OUTER JOIN expenses e ON EXTRACT(YEAR FROM COALESCE(cp.created_at, sr.date)) = EXTRACT(YEAR FROM e.date)
WHERE
  cp.status = 'confirmed' OR cp.status IS NULL
GROUP BY year
ORDER BY year DESC;

-- Commentaires
COMMENT ON TABLE expenses IS 'Dépenses professionnelles déductibles pour la SASU';
COMMENT ON TABLE staking_rewards IS 'Récompenses de staking (imposables à l''IS)';
COMMENT ON VIEW fiscal_summary IS 'Résumé fiscal annuel pour calcul de l''IS';
