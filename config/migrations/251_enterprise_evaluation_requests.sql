-- Migration 251: Enterprise custom evaluation requests
-- Allows Enterprise users to request evaluation of products not yet in the database (5/month quota)

CREATE TABLE IF NOT EXISTS enterprise_evaluation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_url TEXT,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quota check (count per user per month)
CREATE INDEX IF NOT EXISTS idx_eval_requests_user_date
  ON enterprise_evaluation_requests (user_id, created_at DESC);

-- RLS: users can only see their own requests
ALTER TABLE enterprise_evaluation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluation requests"
  ON enterprise_evaluation_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluation requests"
  ON enterprise_evaluation_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for admin/API)
CREATE POLICY "Service role full access on evaluation requests"
  ON enterprise_evaluation_requests FOR ALL
  USING (auth.role() = 'service_role');
