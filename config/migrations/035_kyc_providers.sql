-- ============================================================================
-- Migration 035: KYC Providers & Product KYC Mapping
--
-- Tracks which KYC identity verification providers are used by each product,
-- their data collection practices, and any known data incidents.
-- This enables the KYC Exposure feature in user setups.
-- ============================================================================

-- KYC identity verification providers
CREATE TABLE IF NOT EXISTS kyc_providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  website VARCHAR(255),
  -- Incident tracking (neutral terminology)
  incident_status BOOLEAN DEFAULT FALSE,
  incident_date DATE,
  incident_details TEXT,
  -- Data practices
  data_types_collected TEXT[] DEFAULT '{}', -- e.g. {'passport', 'selfie', 'address', 'phone', 'bank_account'}
  countries_operating TEXT[] DEFAULT '{}',
  records_affected BIGINT DEFAULT 0,
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mapping between products and their KYC providers
CREATE TABLE IF NOT EXISTS product_kyc_mapping (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  kyc_provider_id INTEGER REFERENCES kyc_providers(id) ON DELETE CASCADE,
  kyc_required BOOLEAN DEFAULT TRUE,
  kyc_level VARCHAR(20) DEFAULT 'full' CHECK (kyc_level IN ('none', 'basic', 'enhanced', 'full')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, kyc_provider_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_kyc_product ON product_kyc_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_product_kyc_provider ON product_kyc_mapping(kyc_provider_id);
CREATE INDEX IF NOT EXISTS idx_kyc_providers_incident ON kyc_providers(incident_status);

-- RLS policies
ALTER TABLE kyc_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_kyc_mapping ENABLE ROW LEVEL SECURITY;

-- Read-only access for all authenticated users
CREATE POLICY "kyc_providers_read" ON kyc_providers FOR SELECT USING (true);
CREATE POLICY "product_kyc_mapping_read" ON product_kyc_mapping FOR SELECT USING (true);

-- ============================================================================
-- Seed data: Known KYC providers
-- Data is factual and neutral — based on publicly available information only
-- ============================================================================

INSERT INTO kyc_providers (name, website, incident_status, incident_date, incident_details, data_types_collected, countries_operating, records_affected) VALUES
  ('Sumsub', 'https://sumsub.com', true, '2024-01-01', 'Data incident reported in 2024 affecting multiple client platforms', ARRAY['passport', 'selfie', 'address', 'phone'], ARRAY['global'], 0),
  ('ID Merit', 'https://idmerit.com', true, '2024-01-01', 'Data incident reported in 2024', ARRAY['passport', 'selfie', 'address'], ARRAY['global'], 0),
  ('Jumio', 'https://jumio.com', false, NULL, NULL, ARRAY['passport', 'selfie'], ARRAY['global'], 0),
  ('Onfido', 'https://onfido.com', false, NULL, NULL, ARRAY['passport', 'selfie', 'address'], ARRAY['global'], 0),
  ('Veriff', 'https://veriff.com', false, NULL, NULL, ARRAY['passport', 'selfie'], ARRAY['global'], 0),
  ('Internal (proprietary)', NULL, false, NULL, NULL, ARRAY['passport', 'selfie'], ARRAY['varies'], 0),
  ('Shufti Pro', 'https://shuftipro.com', false, NULL, NULL, ARRAY['passport', 'selfie', 'address'], ARRAY['global'], 0),
  ('Trulioo', 'https://trulioo.com', false, NULL, NULL, ARRAY['passport', 'address'], ARRAY['global'], 0),
  ('Au10tix', 'https://au10tix.com', false, NULL, NULL, ARRAY['passport', 'selfie'], ARRAY['global'], 0),
  ('None (no KYC)', NULL, false, NULL, NULL, ARRAY[]::TEXT[], ARRAY[]::TEXT[], 0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Product-to-provider mappings (based on publicly documented information)
-- Note: product_id references must match actual IDs in the products table.
-- These are placeholder examples — actual IDs should be verified.
-- ============================================================================

-- To be populated via a script that matches product names to IDs:
-- Example pattern:
-- INSERT INTO product_kyc_mapping (product_id, kyc_provider_id, kyc_required, kyc_level)
-- SELECT p.id, kp.id, true, 'full'
-- FROM products p, kyc_providers kp
-- WHERE p.name = 'Binance' AND kp.name = 'Sumsub';
