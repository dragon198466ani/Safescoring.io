-- Migration 250: Expand leads table for contact form
-- Adds columns needed by the /contact page

ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS message TEXT;
