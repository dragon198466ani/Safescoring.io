-- Fix RLS policies for evaluation_history
-- Run this if you already applied 054_evaluation_history.sql

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read evaluation_history for authenticated" ON evaluation_history;
DROP POLICY IF EXISTS "Allow insert evaluation_history for service" ON evaluation_history;

-- Create new policies that work with triggers
CREATE POLICY "Allow read evaluation_history for all"
ON evaluation_history FOR SELECT
USING (true);

CREATE POLICY "Allow insert evaluation_history for triggers"
ON evaluation_history FOR INSERT
WITH CHECK (true);

-- Verify
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'evaluation_history';
