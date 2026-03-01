-- Enterprise Configuration Table
-- Stores white-label, team, and webhook settings for Enterprise customers

CREATE TABLE IF NOT EXISTS enterprise_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_domain TEXT,
  white_label_config JSONB DEFAULT '{}',
  webhook_url TEXT,
  team_size INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  api_key_prefix TEXT, -- First 8 chars of API key for identification
  custom_scoring_config JSONB DEFAULT '{}', -- Custom pillar weights, thresholds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enterprise_user ON enterprise_configs(user_id);
CREATE INDEX idx_enterprise_domain ON enterprise_configs(company_domain) WHERE company_domain IS NOT NULL;

-- Enterprise team members
CREATE TABLE IF NOT EXISTS enterprise_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id UUID NOT NULL REFERENCES enterprise_configs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  user_id UUID REFERENCES profiles(id),
  UNIQUE(enterprise_id, email)
);

CREATE INDEX idx_enterprise_team ON enterprise_team_members(enterprise_id);

-- RLS
ALTER TABLE enterprise_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own enterprise config" ON enterprise_configs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Enterprise admins manage team" ON enterprise_team_members
  FOR ALL USING (
    enterprise_id IN (SELECT id FROM enterprise_configs WHERE user_id = auth.uid())
  );
