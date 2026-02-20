-- Migration: Alter price_details column from VARCHAR(200) to TEXT
-- This allows storing full JSON metadata for products
-- Run this in Supabase SQL Editor

ALTER TABLE products ALTER COLUMN price_details TYPE TEXT;

-- Also alter description if needed
ALTER TABLE products ALTER COLUMN description TYPE TEXT;

-- Verify
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('price_details', 'description');
