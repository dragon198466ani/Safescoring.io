-- ============================================
-- PERSONALIZED NEWSLETTERS SYSTEM
-- Newsletter par setup avec incidents, hacks et warnings
-- ============================================

-- Table pour les newsletters personnalisées par utilisateur
CREATE TABLE IF NOT EXISTS user_newsletters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contenu
    subject TEXT NOT NULL,
    content_html TEXT,
    content_text TEXT,

    -- Stats de ce qui est inclus
    stats JSONB DEFAULT '{}',
    -- Ex: { "score_changes": 3, "incidents": 1, "warnings": 5, "corrections": 2 }

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMPTZ,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Index pour les newsletters à envoyer
CREATE INDEX IF NOT EXISTS idx_user_newsletters_pending ON user_newsletters(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_newsletters_user ON user_newsletters(user_id);

-- Table pour les préférences de notification
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Fréquence
    newsletter_frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly', 'never'

    -- Types de notifications
    notify_score_changes BOOLEAN DEFAULT true,
    notify_incidents BOOLEAN DEFAULT true,
    notify_warnings BOOLEAN DEFAULT true,
    notify_community_updates BOOLEAN DEFAULT true,
    notify_new_products BOOLEAN DEFAULT false,

    -- Seuils
    min_score_change INTEGER DEFAULT 5, -- Notifier si changement >= 5 points
    incident_severity_threshold TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_frequency CHECK (newsletter_frequency IN ('daily', 'weekly', 'monthly', 'never')),
    CONSTRAINT valid_severity CHECK (incident_severity_threshold IN ('low', 'medium', 'high', 'critical'))
);

-- RLS
ALTER TABLE user_newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own newsletters
CREATE POLICY "Users can read own newsletters"
    ON user_newsletters FOR SELECT
    USING (auth.uid() = user_id);

-- Users can manage their notification preferences
CREATE POLICY "Users can manage own preferences"
    ON user_notification_preferences FOR ALL
    USING (auth.uid() = user_id);

-- Vue pour les stats de newsletters
CREATE OR REPLACE VIEW newsletter_stats AS
SELECT
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'sent') as successfully_sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    AVG((stats->>'score_changes')::int) as avg_score_changes,
    AVG((stats->>'incidents')::int) as avg_incidents,
    AVG((stats->>'warnings')::int) as avg_warnings
FROM user_newsletters
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

COMMENT ON TABLE user_newsletters IS 'Newsletters personnalisées par setup utilisateur';
COMMENT ON TABLE user_notification_preferences IS 'Préférences de notification par utilisateur';
