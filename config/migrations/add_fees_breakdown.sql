-- ============================================
-- Migration: Add fees_breakdown JSONB column
-- ============================================
-- Adds structured fee data alongside existing price_eur + price_details
-- Schema v1: { version, fees[], source, parsed_at }
-- Each fee: { id, label, type, value, value_max, unit, context, discount, conversion }

ALTER TABLE products
ADD COLUMN IF NOT EXISTS fees_breakdown JSONB DEFAULT NULL;

-- GIN index for JSONB queries (search by fee type, filter by unit, etc.)
CREATE INDEX IF NOT EXISTS idx_products_fees_breakdown
ON products USING GIN (fees_breakdown);

COMMENT ON COLUMN products.fees_breakdown IS
  'Structured fee data parsed from price_details. Schema v1: {version, fees[], source, parsed_at}. Each fee: {id, label, type, value, value_max, unit, context, discount, conversion}';
