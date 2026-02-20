-- Add realtime_warnings column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS realtime_warnings JSONB;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_realtime_warnings ON products USING GIN (realtime_warnings);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'realtime_warnings';
