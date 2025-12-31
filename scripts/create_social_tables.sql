-- Create tables for caching Trustpilot and Reddit data

-- Trustpilot Reviews Cache
CREATE TABLE IF NOT EXISTS product_trustpilot (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    score DECIMAL(2,1),
    total_reviews INTEGER DEFAULT 0,
    trustpilot_url TEXT,
    recent_reviews JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Reddit Mentions Cache
CREATE TABLE IF NOT EXISTS product_reddit (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    total_mentions INTEGER DEFAULT 0,
    sentiment JSONB,
    posts JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_trustpilot_product_id ON product_trustpilot(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reddit_product_id ON product_reddit(product_id);

-- Enable RLS (Row Level Security)
ALTER TABLE product_trustpilot ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reddit ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous read access
CREATE POLICY "Allow anonymous read access" ON product_trustpilot FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read access" ON product_reddit FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON product_trustpilot TO anon;
GRANT SELECT ON product_reddit TO anon;
