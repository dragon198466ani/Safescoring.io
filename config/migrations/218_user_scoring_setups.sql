-- =====================================================
-- Migration 218: User Scoring Setups
-- Custom pillar weight configurations per user
-- Users can create up to 3 setups with custom S/A/F/E
-- weights that sum to 100. Scores recompute client-side.
-- =====================================================

CREATE TABLE IF NOT EXISTS user_scoring_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Setup',
    weight_s INTEGER NOT NULL DEFAULT 25 CHECK (weight_s >= 0 AND weight_s <= 100),
    weight_a INTEGER NOT NULL DEFAULT 25 CHECK (weight_a >= 0 AND weight_a <= 100),
    weight_f INTEGER NOT NULL DEFAULT 25 CHECK (weight_f >= 0 AND weight_f <= 100),
    weight_e INTEGER NOT NULL DEFAULT 25 CHECK (weight_e >= 0 AND weight_e <= 100),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Weights must sum to 100
    CONSTRAINT weights_sum_100 CHECK (weight_s + weight_a + weight_f + weight_e = 100)
);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_scoring_setups_user
ON user_scoring_setups(user_id);

-- Fast lookup for active setup
CREATE INDEX IF NOT EXISTS idx_scoring_setups_active
ON user_scoring_setups(user_id, is_active) WHERE is_active = TRUE;

-- Only one active setup per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_scoring_setups_unique_active
ON user_scoring_setups(user_id) WHERE is_active = TRUE;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_scoring_setup_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scoring_setup_updated ON user_scoring_setups;
CREATE TRIGGER trg_scoring_setup_updated
    BEFORE UPDATE ON user_scoring_setups
    FOR EACH ROW EXECUTE FUNCTION update_scoring_setup_timestamp();

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE user_scoring_setups ENABLE ROW LEVEL SECURITY;

-- Users can read their own setups
DROP POLICY IF EXISTS "scoring_setups_select" ON user_scoring_setups;
CREATE POLICY "scoring_setups_select" ON user_scoring_setups
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own setups
DROP POLICY IF EXISTS "scoring_setups_insert" ON user_scoring_setups;
CREATE POLICY "scoring_setups_insert" ON user_scoring_setups
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own setups
DROP POLICY IF EXISTS "scoring_setups_update" ON user_scoring_setups;
CREATE POLICY "scoring_setups_update" ON user_scoring_setups
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own setups
DROP POLICY IF EXISTS "scoring_setups_delete" ON user_scoring_setups;
CREATE POLICY "scoring_setups_delete" ON user_scoring_setups
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Service role has full access
DROP POLICY IF EXISTS "scoring_setups_service" ON user_scoring_setups;
CREATE POLICY "scoring_setups_service" ON user_scoring_setups
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE user_scoring_setups IS 'Custom pillar weight configurations. Users create up to 3 setups with custom S/A/F/E weights summing to 100. SAFE score is recomputed client-side.';
