-- ============================================
-- SAFESCORING - Users Table for ShipFast
-- ============================================
-- Run this script in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Users table (for ShipFast/NextAuth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    image VARCHAR(500),
    
    -- Lemon Squeezy
    lemon_squeezy_customer_id VARCHAR(100),
    price_id VARCHAR(100),
    
    -- Access
    has_access BOOLEAN DEFAULT FALSE,
    subscription_id INTEGER REFERENCES subscriptions(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    email_verified TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_lemon_squeezy ON users(lemon_squeezy_customer_id);

-- Trigger updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Modify subscriptions table for Lemon Squeezy
-- ============================================

-- Add lemon_squeezy_id column if it doesn't exist
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS lemon_squeezy_id VARCHAR(100);

-- Add current_period_end
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;

-- Rename stripe_id to lemon_squeezy_id (optional, if you want to keep compatibility)
-- ALTER TABLE subscriptions RENAME COLUMN stripe_id TO lemon_squeezy_id;

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_squeezy ON subscriptions(lemon_squeezy_id);

-- ============================================
-- RLS for users table
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
    ON users FOR SELECT 
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
    ON users FOR UPDATE 
    USING (auth.uid() = id);

-- Allow insertion via service role (webhooks)
CREATE POLICY "Service role can insert users" 
    ON users FOR INSERT 
    WITH CHECK (true);

-- ============================================
-- View for user dashboard
-- ============================================

CREATE OR REPLACE VIEW user_dashboard_view AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.has_access,
    u.created_at,
    s.status as subscription_status,
    sp.code as plan_code,
    sp.name as plan_name,
    sp.max_setups,
    sp.max_products,
    (SELECT COUNT(*) FROM user_setups WHERE user_id = u.id) as current_setups
FROM users u
LEFT JOIN subscriptions s ON u.subscription_id = s.id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id;

-- ============================================
-- Function to check plan limits
-- ============================================

CREATE OR REPLACE FUNCTION check_user_limits(user_uuid UUID)
RETURNS TABLE (
    can_create_setup BOOLEAN,
    can_add_product BOOLEAN,
    setups_remaining INTEGER,
    products_remaining INTEGER
) AS $$
DECLARE
    max_setups_limit INTEGER;
    max_products_limit INTEGER;
    current_setups_count INTEGER;
    current_products_count INTEGER;
BEGIN
    -- Get plan limits
    SELECT sp.max_setups, sp.max_products
    INTO max_setups_limit, max_products_limit
    FROM users u
    LEFT JOIN subscriptions s ON u.subscription_id = s.id
    LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE u.id = user_uuid;
    
    -- Default values (free plan)
    max_setups_limit := COALESCE(max_setups_limit, 1);
    max_products_limit := COALESCE(max_products_limit, 10);
    
    -- Count current setups
    SELECT COUNT(*) INTO current_setups_count
    FROM user_setups WHERE user_id = user_uuid;
    
    -- Count products in all setups
    SELECT COALESCE(SUM(jsonb_array_length(products)), 0) INTO current_products_count
    FROM user_setups WHERE user_id = user_uuid;
    
    RETURN QUERY SELECT 
        current_setups_count < max_setups_limit,
        current_products_count < max_products_limit,
        max_setups_limit - current_setups_count,
        max_products_limit - current_products_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Test
-- ============================================

SELECT 'Users and subscriptions tables updated for ShipFast + Lemon Squeezy!' as status;
