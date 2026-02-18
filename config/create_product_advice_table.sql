-- ============================================================
-- CREATE PRODUCT_ADVICE TABLE
-- ============================================================
-- Alternative to updating products table (bypasses trigger issue)
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- Create the table
CREATE TABLE IF NOT EXISTS product_advice (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    priority_pillar CHAR(1) CHECK (priority_pillar IN ('S', 'A', 'F', 'E')),
    advice_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_advice_product_id ON product_advice(product_id);

-- Enable RLS
ALTER TABLE product_advice ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON product_advice
    FOR SELECT USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Allow service role full access" ON product_advice
    FOR ALL USING (auth.role() = 'service_role');

-- Function to upsert advice
CREATE OR REPLACE FUNCTION upsert_product_advice(
    p_product_id INTEGER,
    p_priority_pillar CHAR(1),
    p_advice_json JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO product_advice (product_id, priority_pillar, advice_json, updated_at)
    VALUES (p_product_id, p_priority_pillar, p_advice_json, NOW())
    ON CONFLICT (product_id)
    DO UPDATE SET
        priority_pillar = EXCLUDED.priority_pillar,
        advice_json = EXCLUDED.advice_json,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION upsert_product_advice TO anon, authenticated;
