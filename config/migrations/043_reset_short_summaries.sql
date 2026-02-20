-- ============================================================
-- Migration 043: Reset Short Summaries for Re-generation
-- Date: 2026-01-14
-- ============================================================
-- Problem: Old summaries are too short (<1000 chars)
-- Solution: NULL them out so the scraper regenerates with 10-part (~7000 words)
-- ============================================================

-- Count before
DO $$
DECLARE
    short_count INT;
BEGIN
    SELECT COUNT(*) INTO short_count
    FROM norms
    WHERE official_doc_summary IS NOT NULL
    AND LENGTH(official_doc_summary) < 1000;

    RAISE NOTICE 'Short summaries to reset: %', short_count;
END $$;

-- Reset short summaries (< 1000 chars = old single-call summaries)
UPDATE norms
SET official_doc_summary = NULL,
    official_scraped_at = NULL
WHERE official_doc_summary IS NOT NULL
AND LENGTH(official_doc_summary) < 1000;

-- Also reset medium summaries (< 30000 chars = partial failures)
UPDATE norms
SET official_doc_summary = NULL,
    official_scraped_at = NULL
WHERE official_doc_summary IS NOT NULL
AND LENGTH(official_doc_summary) < 30000;

-- Count after
DO $$
DECLARE
    remaining INT;
    good_summaries INT;
BEGIN
    SELECT COUNT(*) INTO remaining
    FROM norms
    WHERE official_doc_summary IS NULL;

    SELECT COUNT(*) INTO good_summaries
    FROM norms
    WHERE official_doc_summary IS NOT NULL
    AND LENGTH(official_doc_summary) >= 30000;

    RAISE NOTICE 'Migration 043 complete:';
    RAISE NOTICE '  Summaries reset (to regenerate): %', remaining;
    RAISE NOTICE '  Good summaries kept (>30k chars): %', good_summaries;
END $$;
