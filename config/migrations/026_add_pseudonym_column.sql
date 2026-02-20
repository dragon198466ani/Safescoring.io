-- ============================================
-- ADD PSEUDONYM COLUMN TO USER_PRESENCE
-- Migration to add pseudonym support for existing tables
-- ============================================

-- Add pseudonym column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_presence' AND column_name = 'pseudonym'
    ) THEN
        ALTER TABLE user_presence ADD COLUMN pseudonym TEXT DEFAULT 'Anonymous';
    END IF;
END $$;

-- Update the active_users_summary view to include pseudonym
CREATE OR REPLACE VIEW active_users_summary AS
SELECT
    country,
    COUNT(*) as user_count,
    array_agg(DISTINCT current_page) FILTER (WHERE current_page IS NOT NULL) as pages,
    array_agg(DISTINCT device_type) FILTER (WHERE device_type IS NOT NULL) as devices,
    array_agg(DISTINCT pseudonym) FILTER (WHERE pseudonym IS NOT NULL) as pseudonyms,
    MAX(last_seen) as most_recent
FROM user_presence
WHERE last_seen > NOW() - INTERVAL '5 minutes'
GROUP BY country
ORDER BY user_count DESC;
