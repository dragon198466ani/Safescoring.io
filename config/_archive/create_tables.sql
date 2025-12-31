-- ============================================
-- SAFESCORING.IO - SAFE_SCORING_V7_FINAL Database
-- Tables according to ERD schema with automation
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- MAIN TABLES (MVP1)
-- ============================================

-- Product types
CREATE TABLE IF NOT EXISTS product_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Products (central table)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    url VARCHAR(255),
    type_id INTEGER REFERENCES product_types(id),
    brand_id INTEGER REFERENCES brands(id),
    
    -- Specifications (JSONB via AI extraction)
    specs JSONB DEFAULT '{}',
    
    -- Scores (auto-calculated JSONB)
    scores JSONB DEFAULT '{}',
    
    -- Security
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    security_status VARCHAR(20) DEFAULT 'pending' CHECK (security_status IN ('pending', 'secure', 'warning', 'critical')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_security_scan TIMESTAMP,
    last_monthly_update TIMESTAMP
);

-- ============================================
-- NORMS AND EVALUATIONS (MVP1)
-- ============================================

-- SAFE Norms (911 norms)
CREATE TABLE IF NOT EXISTS norms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    pillar CHAR(1) CHECK (pillar IN ('S', 'A', 'F', 'E')), -- Security/Availability/Financial/Environmental
    title VARCHAR(200),
    description TEXT,
    is_essential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pivot table: Norm applicability by product type
CREATE TABLE IF NOT EXISTS norm_applicability (
    norm_id INTEGER REFERENCES norms(id) ON DELETE CASCADE,
    type_id INTEGER REFERENCES product_types(id) ON DELETE CASCADE,
    is_applicable BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (norm_id, type_id)
);

-- Evaluations (AI results)
CREATE TABLE IF NOT EXISTS evaluations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    norm_id INTEGER REFERENCES norms(id) ON DELETE CASCADE,
    result VARCHAR(10) CHECK (result IN ('YES', 'NO', 'N/A')),
    evaluated_by VARCHAR(50) NOT NULL, -- 'mistral', 'gemini', 'ollama'
    evaluation_date TIMESTAMP DEFAULT NOW(),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Avoid duplicates
    UNIQUE(product_id, norm_id, evaluation_date)
);

-- ============================================
-- USERS AND BUSINESS (MVP2)
-- ============================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL, -- 'free', 'basic', 'pro'
    name VARCHAR(50),
    max_setups INTEGER DEFAULT 5,
    max_products INTEGER DEFAULT 50,
    price_monthly DECIMAL(10,2) DEFAULT 0.00,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES subscription_plans(id),
    stripe_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    
    -- Avoid duplicates
    UNIQUE(user_id, status)
);

-- User setups (multi-product configurations)
CREATE TABLE IF NOT EXISTS user_setups (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Product list with roles (JSONB)
    products JSONB DEFAULT '[]', -- [{"product_id": 1, "role": "primary"}, {"product_id": 5, "role": "backup"}]
    
    -- Auto-calculated combined score
    combined_score JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CHECK (jsonb_typeof(products) = 'array')
);

-- ============================================
-- SECURITY AND ALERTS
-- ============================================

-- Security alerts (CVE)
CREATE TABLE IF NOT EXISTS security_alerts (
    id SERIAL PRIMARY KEY,
    cve_id VARCHAR(20) UNIQUE NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(200),
    description TEXT,
    
    -- Affected products (array of IDs)
    affected_ids INTEGER[] DEFAULT '{}',
    
    -- Sources
    source_url VARCHAR(255),
    published_date DATE,
    
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CHECK (array_length(affected_ids, 1) IS NOT NULL OR affected_ids = '{}')
);

-- Alert → user matches
CREATE TABLE IF NOT EXISTS alert_user_matches (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES security_alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    setup_id INTEGER REFERENCES user_setups(id) ON DELETE CASCADE,
    
    notified_at TIMESTAMP,
    notification_method VARCHAR(20), -- 'email', 'telegram', 'push'
    notification_status VARCHAR(20) DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(alert_id, user_id, setup_id)
);

-- ============================================
-- AUTOMATION TABLES
-- ============================================

-- Automatic execution logs
CREATE TABLE IF NOT EXISTS automation_logs (
    id SERIAL PRIMARY KEY,
    run_date TIMESTAMP NOT NULL,
    run_type VARCHAR(20) DEFAULT 'monthly' CHECK (run_type IN ('daily', 'weekly', 'monthly', 'manual')),
    
    -- Statistics
    products_updated INTEGER DEFAULT 0,
    evaluations_count INTEGER DEFAULT 0,
    alerts_created INTEGER DEFAULT 0,
    
    -- AI services used
    ai_service VARCHAR(50), -- 'mistral', 'gemini', 'ollama', 'hybrid'
    
    -- Performance
    duration_sec INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    
    -- Errors
    errors JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CHECK (jsonb_typeof(errors) = 'array')
);

-- Scraping cache (avoid unnecessary re-scrape)
CREATE TABLE IF NOT EXISTS scrape_cache (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(255) NOT NULL,
    content_hash VARCHAR(64), -- SHA256 of content
    scraped_at TIMESTAMP DEFAULT NOW(),
    
    -- Raw content
    raw_content TEXT,
    raw_specs JSONB DEFAULT '{}',
    
    -- Metadata
    status_code INTEGER,
    scrape_duration_ms INTEGER,
    
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    
    UNIQUE(product_id, url)
);

-- AI usage statistics
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    service VARCHAR(50) NOT NULL, -- 'mistral', 'gemini', 'ollama'
    
    -- Usage
    requests INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0.0000, -- Always 0 for free services!
    
    -- Performance
    avg_response_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.0,
    errors_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(date, service)
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_type_id ON products(type_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_security_status ON products(security_status);
CREATE INDEX IF NOT EXISTS idx_products_last_scan ON products(last_security_scan);
CREATE INDEX IF NOT EXISTS idx_products_monthly_update ON products(last_monthly_update);

-- JSONB
CREATE INDEX IF NOT EXISTS idx_products_specs_gin ON products USING GIN(specs);
CREATE INDEX IF NOT EXISTS idx_products_scores_gin ON products USING GIN(scores);

-- Evaluations
CREATE INDEX IF NOT EXISTS idx_evaluations_product_id ON evaluations(product_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_norm_id ON evaluations(norm_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON evaluations(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_evaluations_result ON evaluations(result);

-- User setups
CREATE INDEX IF NOT EXISTS idx_user_setups_user_id ON user_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_setups_products_gin ON user_setups USING GIN(products);

-- Alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_published ON security_alerts(is_published);
CREATE INDEX IF NOT EXISTS idx_security_alerts_affected_ids ON security_alerts USING GIN(affected_ids);

-- Automation
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_date ON automation_logs(run_date);
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_type ON automation_logs(run_type);
CREATE INDEX IF NOT EXISTS idx_scrape_cache_expires ON scrape_cache(expires_at);

-- ============================================
-- AUTOMATIC TRIGGERS
-- ============================================

-- Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_product_types_updated_at BEFORE UPDATE ON product_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_setups_updated_at BEFORE UPDATE ON user_setups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_usage_stats_updated_at BEFORE UPDATE ON ai_usage_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Enable RLS
ALTER TABLE user_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_user_matches ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view own setups" ON user_setups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own setups" ON user_setups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own setups" ON user_setups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own setups" ON user_setups FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own alert matches" ON alert_user_matches FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- UTILITY VIEWS
-- ============================================

-- Products view with calculated scores
CREATE OR REPLACE VIEW product_scores_view AS
SELECT 
    p.id,
    p.name,
    p.slug,
    p.risk_score,
    p.security_status,
    p.last_security_scan,
    pt.name as type_name,
    b.name as brand_name,
    
    -- Calculate SAFE score (based on evaluations)
    COALESCE(
        (SELECT COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM norm_applicability WHERE type_id = p.type_id) * 100
         FROM evaluations e 
         JOIN norms n ON e.norm_id = n.id 
         WHERE e.product_id = p.id AND e.result = 'YES'), 0
    ) as safe_score_percent,
    
    -- Number of evaluations
    (SELECT COUNT(*) FROM evaluations WHERE product_id = p.id) as evaluations_count
    
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN brands b ON p.brand_id = b.id;

-- Recent automation logs view
CREATE OR REPLACE VIEW recent_automation_logs AS
SELECT 
    run_date,
    run_type,
    products_updated,
    evaluations_count,
    ai_service,
    duration_sec,
    CASE 
        WHEN errors = '[]' THEN 'Success'
        WHEN jsonb_array_length(errors) > 5 THEN 'Many Errors'
        ELSE 'Some Errors'
    END as status
FROM automation_logs 
ORDER BY run_date DESC 
LIMIT 30;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Subscription plans
INSERT INTO subscription_plans (code, name, max_setups, max_products, price_monthly, features) VALUES
('free', 'Free', 1, 10, 0.00, '["10 products", "1 setup", "Monthly updates", "Community support"]'),
('basic', 'Basic', 5, 50, 19.99, '["50 products", "5 setups", "Weekly updates", "Email support"]'),
('pro', 'Professional', 20, 200, 49.99, '["200 products", "20 setups", "Daily updates", "Priority support", "API access"]')
ON CONFLICT (code) DO NOTHING;

-- Common product types
INSERT INTO product_types (code, name, category) VALUES
('hw_wallet', 'Hardware Wallet', 'Hardware'),
('sw_wallet', 'Software Wallet', 'Software'),
('exchange', 'Crypto Exchange', 'Platform'),
('defi', 'DeFi Protocol', 'DeFi'),
('nft', 'NFT Platform', 'NFT')
ON CONFLICT (code) DO NOTHING;

-- Known brands
INSERT INTO brands (name, website) VALUES
('Ledger', 'https://www.ledger.com'),
('Trezor', 'https://www.trezor.io'),
('MetaMask', 'https://metamask.io'),
('Binance', 'https://www.binance.com'),
('Coinbase', 'https://www.coinbase.com')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE products IS 'Central products table with JSONB specs and auto-calculated scores';
COMMENT ON TABLE evaluations IS 'AI evaluations of SAFE norms per product';
COMMENT ON TABLE automation_logs IS 'Monthly automatic execution logs';
COMMENT ON COLUMN products.specs IS 'Specifications extracted via Gemini/Mistral (JSONB)';
COMMENT ON COLUMN products.scores IS 'Security scores calculated automatically (JSONB)';
COMMENT ON COLUMN user_setups.products IS 'Multi-product configuration with roles (JSONB array)';

-- ============================================
-- END OF SCRIPT
-- ============================================

SELECT 'SAFE_SCORING_V7_FINAL database created successfully!' as status;
