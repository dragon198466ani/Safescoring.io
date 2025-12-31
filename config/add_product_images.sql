-- Migration: Add logo and screenshots to products table
-- Run this in Supabase SQL Editor

-- Add logo_url column for product logo
ALTER TABLE products
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add screenshots column for product screenshots (JSONB array)
-- Format: ["url1", "url2", "url3"]
ALTER TABLE products
ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN products.logo_url IS 'URL of the product logo image';
COMMENT ON COLUMN products.screenshots IS 'JSON array of screenshot URLs for the product';

-- Create index for faster queries on products with images
CREATE INDEX IF NOT EXISTS idx_products_has_logo ON products ((logo_url IS NOT NULL));

-- Optional: Add RLS policy if you use Row Level Security
-- This allows public read access to the images
-- ALTER POLICY "products_read_policy" ON products USING (true);

-- Example data update (uncomment and modify as needed):
-- UPDATE products SET logo_url = 'https://example.com/logo.png' WHERE slug = 'product-slug';
-- UPDATE products SET screenshots = '["https://example.com/ss1.png", "https://example.com/ss2.png"]' WHERE slug = 'product-slug';
