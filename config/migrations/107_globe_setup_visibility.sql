-- Migration 107: Globe Setup Visibility Preferences
-- Allows users to control whether their setup is visible on the 3D globe
-- with anonymous display and emoji customization

-- Add columns to user_privacy_settings for globe visibility
ALTER TABLE user_privacy_settings 
ADD COLUMN IF NOT EXISTS show_setup_on_globe BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS globe_display_emoji TEXT DEFAULT '🛡️',
ADD COLUMN IF NOT EXISTS globe_anonymous_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS globe_show_products BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN user_privacy_settings.show_setup_on_globe IS 'Whether to display user setup on the public 3D globe';
COMMENT ON COLUMN user_privacy_settings.globe_display_emoji IS 'Emoji to display next to anonymous user on globe';
COMMENT ON COLUMN user_privacy_settings.globe_anonymous_name IS 'Optional anonymous display name for globe (e.g., "CryptoExplorer")';
COMMENT ON COLUMN user_privacy_settings.globe_show_products IS 'Whether to show which products are in the setup on globe hover';

-- Create table for user setup globe data (cached for performance)
CREATE TABLE IF NOT EXISTS user_globe_presence (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    setup_id INTEGER REFERENCES user_setups(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL,
    display_emoji TEXT DEFAULT '🛡️',
    anonymous_name TEXT,
    show_products BOOLEAN DEFAULT false,
    product_count INTEGER DEFAULT 0,
    average_score DECIMAL(4,1),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for fast globe queries
CREATE INDEX IF NOT EXISTS idx_user_globe_presence_country ON user_globe_presence(country_code);
CREATE INDEX IF NOT EXISTS idx_user_globe_presence_active ON user_globe_presence(last_active_at DESC);

-- Enable RLS
ALTER TABLE user_globe_presence ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own globe presence
CREATE POLICY user_globe_presence_own_policy ON user_globe_presence
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Anyone can read globe presence (it's public by design)
CREATE POLICY user_globe_presence_read_policy ON user_globe_presence
    FOR SELECT
    USING (true);

-- Function to update globe presence when user updates their setup
CREATE OR REPLACE FUNCTION update_user_globe_presence()
RETURNS TRIGGER AS $$
DECLARE
    v_privacy_settings RECORD;
    v_country VARCHAR(2);
    v_product_count INTEGER;
    v_avg_score DECIMAL(4,1);
BEGIN
    -- Get user's privacy settings
    SELECT * INTO v_privacy_settings
    FROM user_privacy_settings
    WHERE user_id = NEW.user_id;
    
    -- If user doesn't want to show on globe, delete their presence
    IF v_privacy_settings IS NULL OR NOT v_privacy_settings.show_setup_on_globe THEN
        DELETE FROM user_globe_presence WHERE user_id = NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Get user's country
    SELECT country INTO v_country FROM users WHERE id = NEW.user_id;
    IF v_country IS NULL THEN
        v_country := 'XX';
    END IF;
    
    -- Calculate product count and average score for this setup
    SELECT 
        COUNT(*),
        AVG(ssr.note_finale)
    INTO v_product_count, v_avg_score
    FROM user_setup_products usp
    JOIN products p ON p.id = usp.product_id
    LEFT JOIN safe_scoring_results ssr ON ssr.product_id = p.id
    WHERE usp.setup_id = NEW.id;
    
    -- Upsert globe presence
    INSERT INTO user_globe_presence (
        user_id,
        setup_id,
        country_code,
        display_emoji,
        anonymous_name,
        show_products,
        product_count,
        average_score,
        last_active_at,
        updated_at
    ) VALUES (
        NEW.user_id,
        NEW.id,
        v_country,
        COALESCE(v_privacy_settings.globe_display_emoji, '🛡️'),
        v_privacy_settings.globe_anonymous_name,
        COALESCE(v_privacy_settings.globe_show_products, false),
        v_product_count,
        v_avg_score,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        setup_id = EXCLUDED.setup_id,
        country_code = EXCLUDED.country_code,
        display_emoji = EXCLUDED.display_emoji,
        anonymous_name = EXCLUDED.anonymous_name,
        show_products = EXCLUDED.show_products,
        product_count = EXCLUDED.product_count,
        average_score = EXCLUDED.average_score,
        last_active_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update globe presence when setup changes
DROP TRIGGER IF EXISTS trigger_update_globe_presence ON user_setups;
CREATE TRIGGER trigger_update_globe_presence
    AFTER INSERT OR UPDATE ON user_setups
    FOR EACH ROW
    EXECUTE FUNCTION update_user_globe_presence();

-- Function to sync globe presence when privacy settings change
CREATE OR REPLACE FUNCTION sync_globe_presence_on_privacy_change()
RETURNS TRIGGER AS $$
DECLARE
    v_setup RECORD;
BEGIN
    -- If show_setup_on_globe changed to false, remove presence
    IF NEW.show_setup_on_globe = false OR NEW.show_setup_on_globe IS NULL THEN
        DELETE FROM user_globe_presence WHERE user_id = NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- If enabled, find user's active setup and update presence
    SELECT * INTO v_setup
    FROM user_setups
    WHERE user_id = NEW.user_id AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;
    
    IF v_setup IS NOT NULL THEN
        -- Trigger the update function by doing a dummy update
        UPDATE user_setups SET updated_at = NOW() WHERE id = v_setup.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for privacy settings changes
DROP TRIGGER IF EXISTS trigger_sync_globe_on_privacy ON user_privacy_settings;
CREATE TRIGGER trigger_sync_globe_on_privacy
    AFTER INSERT OR UPDATE OF show_setup_on_globe, globe_display_emoji, globe_anonymous_name, globe_show_products
    ON user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION sync_globe_presence_on_privacy_change();

-- Available emojis for globe display (for UI reference)
CREATE TABLE IF NOT EXISTS globe_emoji_options (
    emoji TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    label TEXT NOT NULL
);

INSERT INTO globe_emoji_options (emoji, category, label) VALUES
    -- Security themed
    ('🛡️', 'security', 'Shield'),
    ('🔒', 'security', 'Lock'),
    ('🔐', 'security', 'Locked Key'),
    ('🔑', 'security', 'Key'),
    ('🗝️', 'security', 'Old Key'),
    -- Crypto themed
    ('₿', 'crypto', 'Bitcoin'),
    ('⟠', 'crypto', 'Ethereum'),
    ('💎', 'crypto', 'Diamond'),
    ('🪙', 'crypto', 'Coin'),
    ('💰', 'crypto', 'Money Bag'),
    -- Tech themed
    ('🤖', 'tech', 'Robot'),
    ('👾', 'tech', 'Alien'),
    ('🎮', 'tech', 'Gaming'),
    ('💻', 'tech', 'Laptop'),
    ('📱', 'tech', 'Phone'),
    -- Nature themed
    ('🦊', 'nature', 'Fox'),
    ('🐺', 'nature', 'Wolf'),
    ('🦁', 'nature', 'Lion'),
    ('🐉', 'nature', 'Dragon'),
    ('🦅', 'nature', 'Eagle'),
    -- Fun themed
    ('🚀', 'fun', 'Rocket'),
    ('⚡', 'fun', 'Lightning'),
    ('🌟', 'fun', 'Star'),
    ('🔥', 'fun', 'Fire'),
    ('✨', 'fun', 'Sparkles'),
    ('🎯', 'fun', 'Target'),
    ('🏆', 'fun', 'Trophy'),
    ('👑', 'fun', 'Crown')
ON CONFLICT (emoji) DO NOTHING;

-- Grant access
GRANT SELECT ON globe_emoji_options TO authenticated;
GRANT SELECT ON globe_emoji_options TO anon;
