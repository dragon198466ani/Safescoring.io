-- Migration 100: Alert Rules Engine
-- Multi-condition alert system for score monitoring
-- Users can create rules like "notify when Binance score drops below 60"

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '[]',
  channels TEXT[] DEFAULT ARRAY['email'],
  webhook_url TEXT,
  cooldown_minutes INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);

-- Partial index for enabled rules (used by cron checker)
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled) WHERE enabled = true;

-- Enable Row Level Security
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own alert rules
CREATE POLICY "Users can manage own alerts" ON alert_rules
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_rules_updated_at();
