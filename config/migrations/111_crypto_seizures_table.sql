-- ============================================================
-- MIGRATION 111: CRYPTO SEIZURES TABLE
-- ============================================================
-- Purpose: Track real-world crypto seizure cases by country
-- Date: 2025-01-21
-- ============================================================

CREATE TABLE IF NOT EXISTS crypto_seizures (
    id SERIAL PRIMARY KEY,
    country_name VARCHAR(100),
    country_code VARCHAR(2),
    incident_date VARCHAR(50),
    agency VARCHAR(200),
    incident_type VARCHAR(100) DEFAULT 'seizure',
    description TEXT,
    amount VARCHAR(200),
    outcome TEXT,
    source_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seizures_country ON crypto_seizures(country_code);
CREATE INDEX IF NOT EXISTS idx_seizures_date ON crypto_seizures(incident_date);
CREATE INDEX IF NOT EXISTS idx_seizures_type ON crypto_seizures(incident_type);

-- Comments
COMMENT ON TABLE crypto_seizures IS 'Real-world documented crypto seizure cases by country';
COMMENT ON COLUMN crypto_seizures.amount IS 'Amount seized (formatted string with currency)';
COMMENT ON COLUMN crypto_seizures.outcome IS 'Result of the seizure case';

-- ============================================================
-- END OF MIGRATION 111
-- ============================================================
