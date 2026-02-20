-- ============================================================================
-- MIGRATION 054: Evaluation History / Changelog
-- ============================================================================
-- Tracks ALL changes to evaluations for audit trail and debugging.
-- When an evaluation changes (YES→NO, TBD→YES, etc.), we record it here.
-- ============================================================================

-- 1. Create the evaluation_history table
CREATE TABLE IF NOT EXISTS evaluation_history (
    id SERIAL PRIMARY KEY,

    -- Reference to the evaluation
    product_id INTEGER NOT NULL,
    norm_id INTEGER NOT NULL,

    -- Old and new values
    old_result VARCHAR(10),  -- NULL for new evaluations
    new_result VARCHAR(10) NOT NULL,
    old_justification TEXT,
    new_justification TEXT,

    -- Metadata
    change_source VARCHAR(50) DEFAULT 'unknown',  -- 'ai_evaluation', 'user_correction', 'manual', 'bulk_update'
    changed_by TEXT,  -- User email or 'ai_provider:gemini', 'system'
    batch_id UUID,  -- Optional: group related changes together

    -- Timestamps
    recorded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Optional: link to score change
    score_before DECIMAL(5,2),
    score_after DECIMAL(5,2)
);

-- 2. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_eval_history_product ON evaluation_history(product_id);
CREATE INDEX IF NOT EXISTS idx_eval_history_norm ON evaluation_history(norm_id);
CREATE INDEX IF NOT EXISTS idx_eval_history_recorded ON evaluation_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_history_source ON evaluation_history(change_source);
CREATE INDEX IF NOT EXISTS idx_eval_history_batch ON evaluation_history(batch_id) WHERE batch_id IS NOT NULL;

-- 3. Create the trigger function
CREATE OR REPLACE FUNCTION record_evaluation_change()
RETURNS TRIGGER AS $$
DECLARE
    v_score_before DECIMAL(5,2);
    v_score_after DECIMAL(5,2);
BEGIN
    -- Get current score before change (for UPDATE)
    IF TG_OP = 'UPDATE' THEN
        SELECT note_finale INTO v_score_before
        FROM safe_scoring_results
        WHERE product_id = NEW.product_id;
    END IF;

    -- Record the change
    IF TG_OP = 'UPDATE' AND (OLD.result IS DISTINCT FROM NEW.result) THEN
        -- Only record if result actually changed
        INSERT INTO evaluation_history (
            product_id,
            norm_id,
            old_result,
            new_result,
            old_justification,
            new_justification,
            change_source,
            changed_by,
            score_before
        ) VALUES (
            NEW.product_id,
            NEW.norm_id,
            OLD.result,
            NEW.result,
            OLD.why_this_result,
            NEW.why_this_result,
            COALESCE(NEW.evaluated_by, 'unknown'),
            COALESCE(current_setting('app.current_user', true), 'system'),
            v_score_before
        );

    ELSIF TG_OP = 'INSERT' THEN
        -- New evaluation
        INSERT INTO evaluation_history (
            product_id,
            norm_id,
            old_result,
            new_result,
            new_justification,
            change_source,
            changed_by
        ) VALUES (
            NEW.product_id,
            NEW.norm_id,
            NULL,
            NEW.result,
            NEW.why_this_result,
            COALESCE(NEW.evaluated_by, 'ai_evaluation'),
            COALESCE(current_setting('app.current_user', true), 'system')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger on evaluations table
DROP TRIGGER IF EXISTS trigger_evaluation_history ON evaluations;
CREATE TRIGGER trigger_evaluation_history
    AFTER INSERT OR UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION record_evaluation_change();

-- 5. Create a view for easy querying of evaluation changes with product/norm names
CREATE OR REPLACE VIEW v_evaluation_changelog AS
SELECT
    eh.id,
    eh.recorded_at,
    p.name AS product_name,
    p.slug AS product_slug,
    n.code AS norm_code,
    n.title AS norm_title,
    n.pillar,
    eh.old_result,
    eh.new_result,
    CASE
        WHEN eh.old_result IS NULL THEN 'NEW'
        WHEN eh.old_result = eh.new_result THEN 'NO_CHANGE'
        WHEN eh.old_result IN ('YES', 'YESp') AND eh.new_result = 'NO' THEN 'DOWNGRADE'
        WHEN eh.old_result = 'NO' AND eh.new_result IN ('YES', 'YESp') THEN 'UPGRADE'
        WHEN eh.old_result = 'TBD' THEN 'RESOLVED'
        ELSE 'CHANGED'
    END AS change_type,
    eh.change_source,
    eh.changed_by,
    eh.score_before,
    eh.score_after
FROM evaluation_history eh
JOIN products p ON p.id = eh.product_id
JOIN norms n ON n.id = eh.norm_id
ORDER BY eh.recorded_at DESC;

-- 6. Create a function to get evaluation history for a product
CREATE OR REPLACE FUNCTION get_evaluation_history(
    p_product_slug TEXT,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    recorded_at TIMESTAMPTZ,
    norm_code TEXT,
    norm_title TEXT,
    pillar TEXT,
    old_result TEXT,
    new_result TEXT,
    change_type TEXT,
    change_source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        eh.recorded_at,
        n.code::TEXT,
        n.title::TEXT,
        n.pillar::TEXT,
        eh.old_result::TEXT,
        eh.new_result::TEXT,
        CASE
            WHEN eh.old_result IS NULL THEN 'NEW'
            WHEN eh.old_result IN ('YES', 'YESp') AND eh.new_result = 'NO' THEN 'DOWNGRADE'
            WHEN eh.old_result = 'NO' AND eh.new_result IN ('YES', 'YESp') THEN 'UPGRADE'
            ELSE 'CHANGED'
        END::TEXT,
        eh.change_source::TEXT
    FROM evaluation_history eh
    JOIN products p ON p.id = eh.product_id
    JOIN norms n ON n.id = eh.norm_id
    WHERE p.slug = p_product_slug
    ORDER BY eh.recorded_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a summary function for dashboard
CREATE OR REPLACE FUNCTION get_evaluation_stats()
RETURNS TABLE (
    total_changes BIGINT,
    changes_today BIGINT,
    changes_this_week BIGINT,
    upgrades BIGINT,
    downgrades BIGINT,
    new_evaluations BIGINT,
    products_affected BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_changes,
        COUNT(*) FILTER (WHERE recorded_at > NOW() - INTERVAL '1 day')::BIGINT AS changes_today,
        COUNT(*) FILTER (WHERE recorded_at > NOW() - INTERVAL '7 days')::BIGINT AS changes_this_week,
        COUNT(*) FILTER (WHERE old_result = 'NO' AND new_result IN ('YES', 'YESp'))::BIGINT AS upgrades,
        COUNT(*) FILTER (WHERE old_result IN ('YES', 'YESp') AND new_result = 'NO')::BIGINT AS downgrades,
        COUNT(*) FILTER (WHERE old_result IS NULL)::BIGINT AS new_evaluations,
        COUNT(DISTINCT product_id)::BIGINT AS products_affected
    FROM evaluation_history;
END;
$$ LANGUAGE plpgsql;

-- 8. Add RLS policies
ALTER TABLE evaluation_history ENABLE ROW LEVEL SECURITY;

-- Allow read for all (public audit log)
CREATE POLICY "Allow read evaluation_history for all"
ON evaluation_history FOR SELECT
USING (true);

-- Allow insert for all (triggers execute with caller's permissions)
-- The trigger itself controls what gets inserted
CREATE POLICY "Allow insert evaluation_history for triggers"
ON evaluation_history FOR INSERT
WITH CHECK (true);

-- No updates or deletes allowed (immutable audit log)
-- No policies for UPDATE/DELETE = denied by default

COMMENT ON TABLE evaluation_history IS 'Immutable audit log of all evaluation changes. Tracks when evaluations change (YES→NO, TBD→YES, etc.) for debugging and accountability.';
