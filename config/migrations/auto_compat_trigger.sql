-- Auto-update compatibility when product scores change
-- Creates a queue table and trigger

-- Queue table for products needing compatibility refresh
CREATE TABLE IF NOT EXISTS compat_refresh_queue (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    old_score_s NUMERIC,
    new_score_s NUMERIC,
    old_score_a NUMERIC,
    new_score_a NUMERIC,
    old_score_f NUMERIC,
    new_score_f NUMERIC,
    old_score_e NUMERIC,
    new_score_e NUMERIC,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    UNIQUE(product_id, processed_at)
);

-- Index for unprocessed items
CREATE INDEX IF NOT EXISTS idx_compat_queue_unprocessed
ON compat_refresh_queue(product_id)
WHERE processed_at IS NULL;

-- Function to queue product for compat refresh when scores change
CREATE OR REPLACE FUNCTION queue_compat_refresh()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if any SAFE score changed
    IF (OLD.pilier_s IS DISTINCT FROM NEW.pilier_s OR
        OLD.pilier_a IS DISTINCT FROM NEW.pilier_a OR
        OLD.pilier_f IS DISTINCT FROM NEW.pilier_f OR
        OLD.pilier_e IS DISTINCT FROM NEW.pilier_e) THEN

        INSERT INTO compat_refresh_queue (
            product_id,
            old_score_s, new_score_s,
            old_score_a, new_score_a,
            old_score_f, new_score_f,
            old_score_e, new_score_e
        ) VALUES (
            NEW.id,
            OLD.pilier_s, NEW.pilier_s,
            OLD.pilier_a, NEW.pilier_a,
            OLD.pilier_f, NEW.pilier_f,
            OLD.pilier_e, NEW.pilier_e
        )
        ON CONFLICT (product_id, processed_at)
        WHERE processed_at IS NULL
        DO UPDATE SET
            new_score_s = EXCLUDED.new_score_s,
            new_score_a = EXCLUDED.new_score_a,
            new_score_f = EXCLUDED.new_score_f,
            new_score_e = EXCLUDED.new_score_e,
            created_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on products table
DROP TRIGGER IF EXISTS trg_queue_compat_refresh ON products;
CREATE TRIGGER trg_queue_compat_refresh
AFTER UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION queue_compat_refresh();

-- Function to get pending products for refresh
CREATE OR REPLACE FUNCTION get_pending_compat_refresh(batch_limit INTEGER DEFAULT 100)
RETURNS TABLE(product_id INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT q.product_id
    FROM compat_refresh_queue q
    WHERE q.processed_at IS NULL
    ORDER BY q.product_id
    LIMIT batch_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark products as processed
CREATE OR REPLACE FUNCTION mark_compat_refreshed(p_product_ids INTEGER[])
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE compat_refresh_queue
    SET processed_at = NOW()
    WHERE product_id = ANY(p_product_ids)
    AND processed_at IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Grant access
GRANT SELECT, INSERT, UPDATE ON compat_refresh_queue TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE compat_refresh_queue_id_seq TO authenticated;
