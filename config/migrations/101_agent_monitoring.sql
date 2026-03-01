-- Migration 101: Agent Monitoring Subscriptions (Ray Donovan)
-- Allows AI agents to subscribe to product monitoring and receive webhook alerts
-- for score changes, incidents, and threshold breaches.

CREATE TABLE IF NOT EXISTS agent_monitoring_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  product_slugs TEXT[] NOT NULL,
  webhook_url TEXT NOT NULL,
  alert_types TEXT[] DEFAULT ARRAY['score_change', 'incident'],
  threshold INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  total_alerts_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_monitoring_wallet ON agent_monitoring_subscriptions(wallet_address);
CREATE INDEX idx_agent_monitoring_active ON agent_monitoring_subscriptions(is_active) WHERE is_active = true;
