-- ============================================================
-- RPC Functions for Corrections System
-- Consolidates multiple queries into single database calls
-- ============================================================

-- Drop existing functions first (to handle return type changes)
DROP FUNCTION IF EXISTS submit_correction(UUID, INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT);
DROP FUNCTION IF EXISTS increment_user_corrections(UUID);
DROP FUNCTION IF EXISTS update_user_reputation(UUID);
DROP FUNCTION IF EXISTS get_user_corrections(UUID, TEXT, TEXT, INTEGER);

-- 1. Submit a correction with all validation in one call
CREATE OR REPLACE FUNCTION submit_correction(
    p_user_id UUID,
    p_product_id INTEGER DEFAULT NULL,
    p_product_slug TEXT DEFAULT NULL,
    p_norm_id INTEGER DEFAULT NULL,
    p_field_corrected TEXT DEFAULT 'evaluation',
    p_original_value TEXT DEFAULT NULL,
    p_suggested_value TEXT DEFAULT NULL,
    p_correction_reason TEXT DEFAULT NULL,
    p_evidence_urls TEXT[] DEFAULT '{}',
    p_evidence_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_resolved_product_id INTEGER;
    v_existing_correction_id INTEGER;
    v_user_reputation NUMERIC;
    v_correction_id INTEGER;
    v_consensus_count INTEGER;
    v_result JSONB;
BEGIN
    -- 1. Resolve product ID if only slug provided
    IF p_product_id IS NULL AND p_product_slug IS NOT NULL THEN
        SELECT id INTO v_resolved_product_id
        FROM products
        WHERE slug = p_product_slug;

        IF v_resolved_product_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Product not found',
                'status', 404
            );
        END IF;
    ELSE
        v_resolved_product_id := p_product_id;
    END IF;

    -- 2. Check for duplicate pending correction
    SELECT id INTO v_existing_correction_id
    FROM user_corrections
    WHERE user_id = p_user_id
      AND product_id = v_resolved_product_id
      AND field_corrected = p_field_corrected
      AND status = 'pending'
    LIMIT 1;

    IF v_existing_correction_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You already have a pending correction for this field',
            'status', 409
        );
    END IF;

    -- 3. Get user reputation score
    SELECT COALESCE(reputation_score, 50.0) INTO v_user_reputation
    FROM user_reputation
    WHERE user_id = p_user_id;

    IF v_user_reputation IS NULL THEN
        v_user_reputation := 50.0;
    END IF;

    -- 4. Insert the correction
    INSERT INTO user_corrections (
        product_id,
        norm_id,
        user_id,
        field_corrected,
        original_value,
        suggested_value,
        correction_reason,
        evidence_urls,
        evidence_description,
        status,
        user_reputation_score
    ) VALUES (
        v_resolved_product_id,
        p_norm_id,
        p_user_id,
        p_field_corrected,
        p_original_value,
        p_suggested_value,
        p_correction_reason,
        p_evidence_urls,
        p_evidence_description,
        'pending',
        v_user_reputation
    )
    RETURNING id INTO v_correction_id;

    -- 5. Update or create user reputation entry
    INSERT INTO user_reputation (user_id, corrections_submitted, reputation_score, reputation_level)
    VALUES (p_user_id, 1, 50.0, 'newcomer')
    ON CONFLICT (user_id) DO UPDATE
    SET corrections_submitted = user_reputation.corrections_submitted + 1,
        updated_at = NOW();

    -- 6. Check for consensus (3+ similar corrections)
    SELECT COUNT(*) INTO v_consensus_count
    FROM user_corrections
    WHERE product_id = v_resolved_product_id
      AND field_corrected = p_field_corrected
      AND suggested_value = p_suggested_value
      AND status = 'pending'
      AND (p_norm_id IS NULL AND norm_id IS NULL OR norm_id = p_norm_id);

    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'correction_id', v_correction_id,
        'product_id', v_resolved_product_id,
        'consensus_count', v_consensus_count,
        'votes_needed', GREATEST(0, 3 - v_consensus_count),
        'status', 200
    );

    -- 7. Auto-approve if consensus reached
    IF v_consensus_count >= 3 THEN
        -- Update all matching corrections to approved
        UPDATE user_corrections
        SET status = 'approved',
            reviewed_at = NOW(),
            review_notes = format('Auto-approved by consensus (%s votes)', v_consensus_count),
            was_applied = true
        WHERE product_id = v_resolved_product_id
          AND field_corrected = p_field_corrected
          AND suggested_value = p_suggested_value
          AND status = 'pending'
          AND (p_norm_id IS NULL AND norm_id IS NULL OR norm_id = p_norm_id);

        -- Update reputation for all contributing users
        UPDATE user_reputation ur
        SET corrections_approved = ur.corrections_approved + 1,
            points_earned = COALESCE(ur.points_earned, 0) + 50,
            updated_at = NOW()
        FROM user_corrections uc
        WHERE uc.user_id = ur.user_id
          AND uc.product_id = v_resolved_product_id
          AND uc.field_corrected = p_field_corrected
          AND uc.suggested_value = p_suggested_value
          AND uc.status = 'approved';

        v_result := v_result || jsonb_build_object(
            'consensus_reached', true,
            'message', 'Consensus reached! Correction auto-approved.'
        );
    ELSE
        v_result := v_result || jsonb_build_object(
            'consensus_reached', false,
            'message', format('Correction submitted. %s more vote(s) needed for auto-approval.', 3 - v_consensus_count)
        );
    END IF;

    RETURN v_result;
END;
$$;

-- 2. Increment user corrections count
CREATE OR REPLACE FUNCTION increment_user_corrections(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_reputation
    SET corrections_submitted = corrections_submitted + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- 3. Update user reputation after correction review
CREATE OR REPLACE FUNCTION update_user_reputation(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_approved INTEGER;
    v_rejected INTEGER;
    v_total INTEGER;
    v_approval_rate NUMERIC;
    v_new_score NUMERIC;
    v_new_level TEXT;
BEGIN
    -- Get correction stats
    SELECT
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0),
        COUNT(*)
    INTO v_approved, v_rejected, v_total
    FROM user_corrections
    WHERE user_id = p_user_id;

    -- Calculate approval rate
    IF v_total > 0 THEN
        v_approval_rate := (v_approved::NUMERIC / v_total) * 100;
    ELSE
        v_approval_rate := 50.0;
    END IF;

    -- Calculate new reputation score (base 50, +2 per approved, -5 per rejected)
    v_new_score := 50.0 + (v_approved * 2) - (v_rejected * 5);
    v_new_score := GREATEST(0, LEAST(100, v_new_score)); -- Clamp between 0-100

    -- Determine level
    IF v_approved >= 50 AND v_approval_rate >= 90 THEN
        v_new_level := 'oracle';
    ELSIF v_approved >= 20 AND v_approval_rate >= 80 THEN
        v_new_level := 'expert';
    ELSIF v_approved >= 10 AND v_approval_rate >= 70 THEN
        v_new_level := 'trusted';
    ELSIF v_approved >= 3 THEN
        v_new_level := 'contributor';
    ELSE
        v_new_level := 'newcomer';
    END IF;

    -- Update reputation
    UPDATE user_reputation
    SET
        corrections_approved = v_approved,
        corrections_rejected = v_rejected,
        reputation_score = v_new_score,
        reputation_level = v_new_level,
        points_earned = v_approved * 50, -- 50 points per approved correction
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- 4. Get user corrections with product info in one query
CREATE OR REPLACE FUNCTION get_user_corrections(
    p_user_id UUID,
    p_status TEXT DEFAULT NULL,
    p_product_slug TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    product_slug TEXT,
    norm_id INTEGER,
    norm_code TEXT,
    norm_title TEXT,
    field_corrected TEXT,
    original_value TEXT,
    suggested_value TEXT,
    correction_reason TEXT,
    status TEXT,
    was_applied BOOLEAN,
    score_impact NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        uc.id,
        uc.product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        uc.norm_id,
        n.code AS norm_code,
        n.title AS norm_title,
        uc.field_corrected,
        uc.original_value,
        uc.suggested_value,
        uc.correction_reason,
        uc.status,
        uc.was_applied,
        uc.score_impact,
        uc.created_at,
        uc.updated_at
    FROM user_corrections uc
    LEFT JOIN products p ON p.id = uc.product_id
    LEFT JOIN norms n ON n.id = uc.norm_id
    WHERE uc.user_id = p_user_id
      AND (p_status IS NULL OR uc.status = p_status)
      AND (p_product_slug IS NULL OR p.slug = p_product_slug)
    ORDER BY uc.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_correction TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_corrections TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_reputation TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_corrections TO authenticated;

-- Add comment
COMMENT ON FUNCTION submit_correction IS 'Submit a user correction with validation and consensus check in single call';
COMMENT ON FUNCTION get_user_corrections IS 'Get user corrections with product and norm info joined';
