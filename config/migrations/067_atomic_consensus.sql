-- ============================================================================
-- MIGRATION 067: Atomic Consensus Check for Corrections
-- SafeScoring - 2026-01-15
-- ============================================================================
-- Fixes race condition where multiple concurrent requests can all trigger
-- consensus approval, causing double-approval bugs.
-- ============================================================================

-- ============================================================================
-- ATOMIC CONSENSUS FUNCTION
-- ============================================================================
-- This function atomically:
-- 1. Inserts the correction
-- 2. Checks consensus count
-- 3. If threshold reached, approves all and applies correction
-- Returns: { correction_id, consensus_reached, vote_count, already_applied }

CREATE OR REPLACE FUNCTION insert_correction_with_consensus(
    p_user_id UUID,
    p_product_id INTEGER,
    p_norm_id INTEGER,
    p_field_corrected VARCHAR(50),
    p_original_value TEXT,
    p_suggested_value TEXT,
    p_correction_reason TEXT,
    p_evidence_urls TEXT[],
    p_evidence_description TEXT,
    p_consensus_threshold INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correction_id UUID;
    v_vote_count INTEGER;
    v_already_applied BOOLEAN := FALSE;
    v_correction_ids UUID[];
    v_user_ids UUID[];
BEGIN
    -- Lock similar corrections to prevent race condition
    -- This ensures only one request can process consensus at a time
    PERFORM 1 FROM user_corrections
    WHERE product_id = p_product_id
      AND field_corrected = p_field_corrected
      AND suggested_value = p_suggested_value
      AND status = 'pending'
    FOR UPDATE;

    -- Check if this exact correction was already applied
    SELECT EXISTS(
        SELECT 1 FROM user_corrections
        WHERE product_id = p_product_id
          AND field_corrected = p_field_corrected
          AND suggested_value = p_suggested_value
          AND status = 'approved'
          AND was_applied = TRUE
    ) INTO v_already_applied;

    IF v_already_applied THEN
        RETURN jsonb_build_object(
            'correction_id', NULL,
            'consensus_reached', TRUE,
            'vote_count', p_consensus_threshold,
            'already_applied', TRUE,
            'message', 'This correction has already been applied'
        );
    END IF;

    -- Check if user already submitted this exact correction
    IF EXISTS(
        SELECT 1 FROM user_corrections
        WHERE user_id = p_user_id
          AND product_id = p_product_id
          AND field_corrected = p_field_corrected
          AND suggested_value = p_suggested_value
    ) THEN
        RETURN jsonb_build_object(
            'correction_id', NULL,
            'consensus_reached', FALSE,
            'vote_count', 0,
            'already_applied', FALSE,
            'message', 'You have already submitted this correction'
        );
    END IF;

    -- Insert the new correction
    INSERT INTO user_corrections (
        user_id,
        product_id,
        norm_id,
        field_corrected,
        original_value,
        suggested_value,
        correction_reason,
        evidence_urls,
        evidence_description,
        status,
        created_at
    ) VALUES (
        p_user_id,
        p_product_id,
        p_norm_id,
        p_field_corrected,
        p_original_value,
        p_suggested_value,
        p_correction_reason,
        p_evidence_urls,
        p_evidence_description,
        'pending',
        NOW()
    )
    RETURNING id INTO v_correction_id;

    -- Count total pending corrections with same value (including the one just inserted)
    SELECT COUNT(*), ARRAY_AGG(id), ARRAY_AGG(DISTINCT user_id)
    INTO v_vote_count, v_correction_ids, v_user_ids
    FROM user_corrections
    WHERE product_id = p_product_id
      AND field_corrected = p_field_corrected
      AND suggested_value = p_suggested_value
      AND status = 'pending';

    -- Check if consensus threshold reached
    IF v_vote_count >= p_consensus_threshold THEN
        -- Approve all similar corrections atomically
        UPDATE user_corrections
        SET status = 'approved',
            reviewed_at = NOW(),
            review_notes = 'Auto-approved by consensus (' || v_vote_count || ' votes)',
            was_applied = TRUE
        WHERE id = ANY(v_correction_ids);

        -- Increment reputation for all contributing users
        UPDATE users
        SET reputation_score = COALESCE(reputation_score, 50) + 10
        WHERE id = ANY(v_user_ids);

        RETURN jsonb_build_object(
            'correction_id', v_correction_id,
            'consensus_reached', TRUE,
            'vote_count', v_vote_count,
            'already_applied', FALSE,
            'approved_ids', v_correction_ids,
            'message', 'Consensus reached! Correction auto-approved.'
        );
    END IF;

    -- Not enough votes yet
    RETURN jsonb_build_object(
        'correction_id', v_correction_id,
        'consensus_reached', FALSE,
        'vote_count', v_vote_count,
        'already_applied', FALSE,
        'votes_needed', p_consensus_threshold - v_vote_count,
        'message', 'Correction submitted. ' || (p_consensus_threshold - v_vote_count) || ' more vote(s) needed.'
    );

END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION insert_correction_with_consensus TO authenticated;

-- ============================================================================
-- USAGE EXAMPLE (from API):
-- ============================================================================
-- const { data, error } = await supabase.rpc('insert_correction_with_consensus', {
--   p_user_id: session.user.id,
--   p_product_id: productId,
--   p_norm_id: normId,
--   p_field_corrected: 'evaluation',
--   p_original_value: 'NO',
--   p_suggested_value: 'YES',
--   p_correction_reason: 'Product now supports 2FA',
--   p_evidence_urls: ['https://example.com/docs'],
--   p_evidence_description: 'Official docs confirm feature'
-- });
--
-- if (data.consensus_reached) {
--   // Apply correction to main tables
-- }
-- ============================================================================

COMMENT ON FUNCTION insert_correction_with_consensus IS
'Atomically inserts a correction and checks for consensus.
Prevents race conditions in concurrent submissions.
Returns JSONB with correction status and vote count.';
