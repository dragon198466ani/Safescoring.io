-- ============================================================
-- SAFE SCORING - Norm Definition Matrix
-- ============================================================
-- 
-- Score structure:
-- - Full: All norms (911) where full=TRUE
-- - Consumer: Subset for individuals where consumer=TRUE
-- - Essential: Critical subset where is_essential=TRUE
--
-- Hierarchy: Full ⊇ Consumer ⊇ Essential
-- ============================================================

-- Check/Add necessary columns in norms table
DO $$
BEGIN
    -- full column (always TRUE for all norms)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'norms' AND column_name = 'full') THEN
        ALTER TABLE norms ADD COLUMN full BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- consumer column (determined by AI)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'norms' AND column_name = 'consumer') THEN
        ALTER TABLE norms ADD COLUMN consumer BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- is_essential column (determined by AI)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'norms' AND column_name = 'is_essential') THEN
        ALTER TABLE norms ADD COLUMN is_essential BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- classification_method column (how the norm was classified)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'norms' AND column_name = 'classification_method') THEN
        ALTER TABLE norms ADD COLUMN classification_method VARCHAR(20) DEFAULT 'manual';
    END IF;
    
    -- classification_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'norms' AND column_name = 'classification_date') THEN
        ALTER TABLE norms ADD COLUMN classification_date TIMESTAMP;
    END IF;
END $$;

-- Set full=TRUE for all norms (by definition)
UPDATE norms SET full = TRUE WHERE full IS NULL OR full = FALSE;

-- Create a view for classification statistics
CREATE OR REPLACE VIEW norm_classification_stats AS
SELECT 
    'Full' as category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM norms), 1) as percentage
FROM norms WHERE full = TRUE
UNION ALL
SELECT 
    'Consumer' as category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM norms), 1) as percentage
FROM norms WHERE consumer = TRUE
UNION ALL
SELECT 
    'Essential' as category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM norms), 1) as percentage
FROM norms WHERE is_essential = TRUE;

-- Create a detailed view by pillar
CREATE OR REPLACE VIEW norm_classification_by_pillar AS
SELECT 
    pillar,
    COUNT(*) as total,
    SUM(CASE WHEN consumer = TRUE THEN 1 ELSE 0 END) as consumer_count,
    SUM(CASE WHEN is_essential = TRUE THEN 1 ELSE 0 END) as essential_count,
    ROUND(SUM(CASE WHEN consumer = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as consumer_pct,
    ROUND(SUM(CASE WHEN is_essential = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as essential_pct
FROM norms
GROUP BY pillar
ORDER BY pillar;

-- Index to optimize queries
CREATE INDEX IF NOT EXISTS idx_norms_consumer ON norms(consumer);
CREATE INDEX IF NOT EXISTS idx_norms_essential ON norms(is_essential);
CREATE INDEX IF NOT EXISTS idx_norms_full ON norms(full);

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON COLUMN norms.full IS 'Always TRUE - Norm included in Full score (911 norms)';
COMMENT ON COLUMN norms.consumer IS 'TRUE if applicable to individuals - Determined by AI';
COMMENT ON COLUMN norms.is_essential IS 'TRUE if critical norm for security - Determined by AI';
COMMENT ON COLUMN norms.classification_method IS 'Classification method: manual, ai_mistral, ai_gemini, heuristic';
COMMENT ON COLUMN norms.classification_date IS 'Last classification date';
