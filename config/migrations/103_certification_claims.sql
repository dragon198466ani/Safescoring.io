-- Migration 103: Certification Claims System
-- Allows crypto projects to claim "SafeScoring Approved" certification
-- Part of Phase 3 - Care Economy features

CREATE TABLE IF NOT EXISTS certification_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_slug TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  contact_email TEXT NOT NULL,
  company_name TEXT,
  website TEXT,
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'verified', 'premium')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  current_score NUMERIC,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  nft_token_id TEXT,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cert_claims_product ON certification_claims(product_slug);
CREATE INDEX idx_cert_claims_status ON certification_claims(status);
