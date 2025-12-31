-- Table pour les incidents de sécurité par produit
CREATE TABLE IF NOT EXISTS product_incidents (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'other', -- hack, exploit, vulnerability, rug_pull, smart_contract_bug, flash_loan_attack, etc.
    severity TEXT DEFAULT 'medium', -- critical, high, medium, low, info
    status TEXT DEFAULT 'resolved', -- active, resolved, investigating
    date DATE NOT NULL,
    funds_lost DECIMAL(20,2) DEFAULT 0,
    funds_recovered DECIMAL(20,2) DEFAULT 0,
    response_quality TEXT, -- excellent, good, average, poor
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par produit
CREATE INDEX IF NOT EXISTS idx_product_incidents_product_id ON product_incidents(product_id);
CREATE INDEX IF NOT EXISTS idx_product_incidents_date ON product_incidents(date DESC);

-- Table de stats agrégées par produit (cache)
CREATE TABLE IF NOT EXISTS product_security_stats (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    total_incidents INTEGER DEFAULT 0,
    total_funds_lost DECIMAL(20,2) DEFAULT 0,
    total_funds_recovered DECIMAL(20,2) DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    has_active_incidents BOOLEAN DEFAULT FALSE,
    risk_level TEXT DEFAULT 'low', -- critical, high, medium, low
    last_incident_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for easy access
ALTER TABLE product_incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_security_stats DISABLE ROW LEVEL SECURITY;
