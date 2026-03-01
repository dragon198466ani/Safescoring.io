-- Migration Tracker for SafeScoring
-- Run this FIRST before any other migrations

CREATE TABLE IF NOT EXISTS _migration_log (
  id SERIAL PRIMARY KEY,
  migration_file TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT,
  applied_by TEXT DEFAULT current_user,
  execution_time_ms INTEGER,
  rollback_sql TEXT,
  notes TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_migration_log_file ON _migration_log(migration_file);

-- Helper function: check if migration was already applied
CREATE OR REPLACE FUNCTION is_migration_applied(p_file TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM _migration_log WHERE migration_file = p_file);
END;
$$ LANGUAGE plpgsql;

-- Helper function: record migration application
CREATE OR REPLACE FUNCTION record_migration(
  p_file TEXT,
  p_checksum TEXT DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT NULL,
  p_rollback_sql TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO _migration_log (migration_file, checksum, execution_time_ms, rollback_sql, notes)
  VALUES (p_file, p_checksum, p_execution_time_ms, p_rollback_sql, p_notes)
  ON CONFLICT (migration_file) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- View for migration status
CREATE OR REPLACE VIEW migration_status AS
SELECT
  migration_file,
  applied_at,
  execution_time_ms,
  CASE WHEN rollback_sql IS NOT NULL THEN 'yes' ELSE 'no' END AS has_rollback,
  notes
FROM _migration_log
ORDER BY migration_file;
