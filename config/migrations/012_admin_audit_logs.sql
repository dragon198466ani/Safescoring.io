-- ============================================================================
-- Migration 012: Admin Audit Logs Table
-- ============================================================================
-- Creates table for persisting admin action audit trails
-- Required for security compliance and incident investigation
-- ============================================================================

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_email ON admin_audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON admin_audit_logs(resource);

-- Enable Row Level Security
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can read audit logs (no one can modify/delete)
CREATE POLICY "Super admins can read audit logs" ON admin_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.email = auth.jwt() ->> 'email'
            AND users.email = (
                SELECT split_part(current_setting('app.admin_emails', true), ',', 1)
            )
        )
    );

-- Service role can insert (for API routes)
CREATE POLICY "Service role can insert audit logs" ON admin_audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE admin_audit_logs IS 'Audit trail for all admin actions - immutable for security compliance';
COMMENT ON COLUMN admin_audit_logs.action IS 'Action type: CREATE, UPDATE, DELETE, VIEW, EXPORT, etc.';
COMMENT ON COLUMN admin_audit_logs.resource IS 'Resource affected: products, users, corrections, etc.';
COMMENT ON COLUMN admin_audit_logs.details IS 'Additional context as JSON (before/after values, filters, etc.)';
