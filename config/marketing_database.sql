-- ============================================
-- SAFESCORING MARKETING DATABASE
-- Stores all promotional strategies, templates, and methods
-- ============================================

-- Marketing Strategies (proven methods)
CREATE TABLE IF NOT EXISTS marketing_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'acquisition', 'engagement', 'retention', 'viral'
    method_type TEXT NOT NULL, -- 'content', 'outreach', 'paid', 'referral', 'seo', 'social'
    description TEXT,
    psychology TEXT, -- Why it works
    difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    cost TEXT DEFAULT 'free', -- 'free', 'low', 'medium', 'high'
    effectiveness_score INT DEFAULT 50, -- 0-100 based on results
    time_to_results TEXT, -- 'immediate', 'days', 'weeks', 'months'
    best_for TEXT[], -- ['b2c', 'b2b', 'saas', 'crypto']
    examples TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Templates (ready-to-use content)
CREATE TABLE IF NOT EXISTS marketing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID REFERENCES marketing_strategies(id),
    name TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'twitter', 'reddit', 'linkedin', 'email', 'blog'
    template_type TEXT NOT NULL, -- 'hook', 'thread', 'post', 'email', 'ad'
    content TEXT NOT NULL,
    variables TEXT[], -- Variables to replace: {product_name}, {score}, etc.
    tone TEXT DEFAULT 'professional', -- 'professional', 'casual', 'urgent', 'curious'
    soft_sell_level INT DEFAULT 3, -- 1-5 (1=hard sell, 5=pure value)
    character_count INT,
    expected_engagement TEXT, -- 'low', 'medium', 'high', 'viral'
    best_time_to_post TEXT, -- 'morning', 'afternoon', 'evening', 'weekend'
    use_count INT DEFAULT 0,
    success_rate DECIMAL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Hooks (attention grabbers)
CREATE TABLE IF NOT EXISTS marketing_hooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hook_type TEXT NOT NULL, -- 'question', 'statistic', 'controversy', 'curiosity', 'fear', 'social_proof'
    content TEXT NOT NULL,
    psychology TEXT, -- Why this hook works
    platform TEXT[], -- ['twitter', 'linkedin', 'reddit']
    effectiveness_score INT DEFAULT 50,
    use_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing CTAs (call to action)
CREATE TABLE IF NOT EXISTS marketing_ctas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cta_type TEXT NOT NULL, -- 'soft', 'medium', 'hard'
    content TEXT NOT NULL,
    target_url TEXT,
    psychology TEXT,
    platform TEXT[],
    is_allowed BOOLEAN DEFAULT true, -- Based on freemium rules
    use_count INT DEFAULT 0,
    conversion_rate DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Campaigns (combinations of strategies)
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    goal TEXT NOT NULL, -- 'awareness', 'traffic', 'signups', 'conversions'
    strategy_ids UUID[],
    start_date DATE,
    end_date DATE,
    budget DECIMAL DEFAULT 0,
    target_metrics JSONB,
    actual_metrics JSONB,
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Results (track what works)
CREATE TABLE IF NOT EXISTS marketing_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES marketing_templates(id),
    platform TEXT NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    engagements INT DEFAULT 0,
    conversions INT DEFAULT 0,
    revenue DECIMAL DEFAULT 0,
    content_used TEXT,
    notes TEXT
);

-- Marketing Schedule (automation)
CREATE TABLE IF NOT EXISTS marketing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES marketing_templates(id),
    platform TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'posted', 'failed', 'cancelled'
    posted_at TIMESTAMPTZ,
    result_id UUID REFERENCES marketing_results(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor Strategies (what others do)
CREATE TABLE IF NOT EXISTS competitor_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    strategy_observed TEXT,
    content_example TEXT,
    effectiveness_guess TEXT, -- 'low', 'medium', 'high'
    can_adapt BOOLEAN DEFAULT true,
    adaptation_notes TEXT,
    observed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_strategies_category ON marketing_strategies(category);
CREATE INDEX IF NOT EXISTS idx_templates_platform ON marketing_templates(platform);
CREATE INDEX IF NOT EXISTS idx_templates_strategy ON marketing_templates(strategy_id);
CREATE INDEX IF NOT EXISTS idx_results_template ON marketing_results(template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON marketing_schedule(status);
