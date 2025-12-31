-- ============================================================
-- SAFESCORING - AUTO SCORE CALCULATION
-- This script creates functions and triggers to automatically
-- recalculate SAFE scores when evaluations change
-- ============================================================

-- ============================================================
-- 1. FUNCTION: Calculate scores for a single product
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_product_scores(p_product_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_total_norms INT := 0;
    v_total_yes INT := 0;
    v_total_no INT := 0;
    v_total_na INT := 0;
    v_total_tbd INT := 0;

    -- Full scores by pillar
    v_full_s_yes INT := 0; v_full_s_no INT := 0;
    v_full_a_yes INT := 0; v_full_a_no INT := 0;
    v_full_f_yes INT := 0; v_full_f_no INT := 0;
    v_full_e_yes INT := 0; v_full_e_no INT := 0;

    -- Consumer scores by pillar
    v_consumer_s_yes INT := 0; v_consumer_s_no INT := 0;
    v_consumer_a_yes INT := 0; v_consumer_a_no INT := 0;
    v_consumer_f_yes INT := 0; v_consumer_f_no INT := 0;
    v_consumer_e_yes INT := 0; v_consumer_e_no INT := 0;

    -- Essential scores by pillar
    v_essential_s_yes INT := 0; v_essential_s_no INT := 0;
    v_essential_a_yes INT := 0; v_essential_a_no INT := 0;
    v_essential_f_yes INT := 0; v_essential_f_no INT := 0;
    v_essential_e_yes INT := 0; v_essential_e_no INT := 0;

    -- Calculated scores
    v_score_s DECIMAL(5,2);
    v_score_a DECIMAL(5,2);
    v_score_f DECIMAL(5,2);
    v_score_e DECIMAL(5,2);
    v_note_finale DECIMAL(5,2);

    v_s_consumer DECIMAL(5,2);
    v_a_consumer DECIMAL(5,2);
    v_f_consumer DECIMAL(5,2);
    v_e_consumer DECIMAL(5,2);
    v_note_consumer DECIMAL(5,2);

    v_s_essential DECIMAL(5,2);
    v_a_essential DECIMAL(5,2);
    v_f_essential DECIMAL(5,2);
    v_e_essential DECIMAL(5,2);
    v_note_essential DECIMAL(5,2);

    rec RECORD;
BEGIN
    -- Count evaluations by pillar and result
    FOR rec IN
        SELECT
            e.result,
            n.pillar,
            COALESCE(sd.is_full, true) as is_full,
            COALESCE(sd.is_consumer, false) as is_consumer,
            COALESCE(sd.is_essential, false) as is_essential
        FROM evaluations e
        JOIN norms n ON e.norm_id = n.id
        LEFT JOIN safe_scoring_definitions sd ON sd.norm_id = n.id
        WHERE e.product_id = p_product_id
    LOOP
        v_total_norms := v_total_norms + 1;

        -- Count by result type
        IF rec.result IN ('YES', 'YESp') THEN
            v_total_yes := v_total_yes + 1;
        ELSIF rec.result = 'NO' THEN
            v_total_no := v_total_no + 1;
        ELSIF rec.result IN ('N/A', 'NA') THEN
            v_total_na := v_total_na + 1;
        ELSIF rec.result = 'TBD' THEN
            v_total_tbd := v_total_tbd + 1;
        END IF;

        -- Skip N/A and TBD for score calculation
        IF rec.result IN ('N/A', 'NA', 'TBD') THEN
            CONTINUE;
        END IF;

        -- FULL scores
        IF rec.is_full THEN
            IF rec.pillar = 'S' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_full_s_yes := v_full_s_yes + 1;
                ELSIF rec.result = 'NO' THEN v_full_s_no := v_full_s_no + 1; END IF;
            ELSIF rec.pillar = 'A' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_full_a_yes := v_full_a_yes + 1;
                ELSIF rec.result = 'NO' THEN v_full_a_no := v_full_a_no + 1; END IF;
            ELSIF rec.pillar = 'F' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_full_f_yes := v_full_f_yes + 1;
                ELSIF rec.result = 'NO' THEN v_full_f_no := v_full_f_no + 1; END IF;
            ELSIF rec.pillar = 'E' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_full_e_yes := v_full_e_yes + 1;
                ELSIF rec.result = 'NO' THEN v_full_e_no := v_full_e_no + 1; END IF;
            END IF;
        END IF;

        -- CONSUMER scores
        IF rec.is_consumer THEN
            IF rec.pillar = 'S' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_consumer_s_yes := v_consumer_s_yes + 1;
                ELSIF rec.result = 'NO' THEN v_consumer_s_no := v_consumer_s_no + 1; END IF;
            ELSIF rec.pillar = 'A' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_consumer_a_yes := v_consumer_a_yes + 1;
                ELSIF rec.result = 'NO' THEN v_consumer_a_no := v_consumer_a_no + 1; END IF;
            ELSIF rec.pillar = 'F' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_consumer_f_yes := v_consumer_f_yes + 1;
                ELSIF rec.result = 'NO' THEN v_consumer_f_no := v_consumer_f_no + 1; END IF;
            ELSIF rec.pillar = 'E' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_consumer_e_yes := v_consumer_e_yes + 1;
                ELSIF rec.result = 'NO' THEN v_consumer_e_no := v_consumer_e_no + 1; END IF;
            END IF;
        END IF;

        -- ESSENTIAL scores
        IF rec.is_essential THEN
            IF rec.pillar = 'S' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_essential_s_yes := v_essential_s_yes + 1;
                ELSIF rec.result = 'NO' THEN v_essential_s_no := v_essential_s_no + 1; END IF;
            ELSIF rec.pillar = 'A' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_essential_a_yes := v_essential_a_yes + 1;
                ELSIF rec.result = 'NO' THEN v_essential_a_no := v_essential_a_no + 1; END IF;
            ELSIF rec.pillar = 'F' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_essential_f_yes := v_essential_f_yes + 1;
                ELSIF rec.result = 'NO' THEN v_essential_f_no := v_essential_f_no + 1; END IF;
            ELSIF rec.pillar = 'E' THEN
                IF rec.result IN ('YES', 'YESp') THEN v_essential_e_yes := v_essential_e_yes + 1;
                ELSIF rec.result = 'NO' THEN v_essential_e_no := v_essential_e_no + 1; END IF;
            END IF;
        END IF;
    END LOOP;

    -- Calculate FULL pillar scores
    IF (v_full_s_yes + v_full_s_no) > 0 THEN
        v_score_s := ROUND((v_full_s_yes::DECIMAL / (v_full_s_yes + v_full_s_no)) * 100, 2);
    END IF;
    IF (v_full_a_yes + v_full_a_no) > 0 THEN
        v_score_a := ROUND((v_full_a_yes::DECIMAL / (v_full_a_yes + v_full_a_no)) * 100, 2);
    END IF;
    IF (v_full_f_yes + v_full_f_no) > 0 THEN
        v_score_f := ROUND((v_full_f_yes::DECIMAL / (v_full_f_yes + v_full_f_no)) * 100, 2);
    END IF;
    IF (v_full_e_yes + v_full_e_no) > 0 THEN
        v_score_e := ROUND((v_full_e_yes::DECIMAL / (v_full_e_yes + v_full_e_no)) * 100, 2);
    END IF;

    -- Calculate FULL overall score
    DECLARE
        v_full_total_yes INT := v_full_s_yes + v_full_a_yes + v_full_f_yes + v_full_e_yes;
        v_full_total_no INT := v_full_s_no + v_full_a_no + v_full_f_no + v_full_e_no;
    BEGIN
        IF (v_full_total_yes + v_full_total_no) > 0 THEN
            v_note_finale := ROUND((v_full_total_yes::DECIMAL / (v_full_total_yes + v_full_total_no)) * 100, 2);
        END IF;
    END;

    -- Calculate CONSUMER pillar scores
    IF (v_consumer_s_yes + v_consumer_s_no) > 0 THEN
        v_s_consumer := ROUND((v_consumer_s_yes::DECIMAL / (v_consumer_s_yes + v_consumer_s_no)) * 100, 2);
    END IF;
    IF (v_consumer_a_yes + v_consumer_a_no) > 0 THEN
        v_a_consumer := ROUND((v_consumer_a_yes::DECIMAL / (v_consumer_a_yes + v_consumer_a_no)) * 100, 2);
    END IF;
    IF (v_consumer_f_yes + v_consumer_f_no) > 0 THEN
        v_f_consumer := ROUND((v_consumer_f_yes::DECIMAL / (v_consumer_f_yes + v_consumer_f_no)) * 100, 2);
    END IF;
    IF (v_consumer_e_yes + v_consumer_e_no) > 0 THEN
        v_e_consumer := ROUND((v_consumer_e_yes::DECIMAL / (v_consumer_e_yes + v_consumer_e_no)) * 100, 2);
    END IF;

    -- Calculate CONSUMER overall score
    DECLARE
        v_consumer_total_yes INT := v_consumer_s_yes + v_consumer_a_yes + v_consumer_f_yes + v_consumer_e_yes;
        v_consumer_total_no INT := v_consumer_s_no + v_consumer_a_no + v_consumer_f_no + v_consumer_e_no;
    BEGIN
        IF (v_consumer_total_yes + v_consumer_total_no) > 0 THEN
            v_note_consumer := ROUND((v_consumer_total_yes::DECIMAL / (v_consumer_total_yes + v_consumer_total_no)) * 100, 2);
        END IF;
    END;

    -- Calculate ESSENTIAL pillar scores
    IF (v_essential_s_yes + v_essential_s_no) > 0 THEN
        v_s_essential := ROUND((v_essential_s_yes::DECIMAL / (v_essential_s_yes + v_essential_s_no)) * 100, 2);
    END IF;
    IF (v_essential_a_yes + v_essential_a_no) > 0 THEN
        v_a_essential := ROUND((v_essential_a_yes::DECIMAL / (v_essential_a_yes + v_essential_a_no)) * 100, 2);
    END IF;
    IF (v_essential_f_yes + v_essential_f_no) > 0 THEN
        v_f_essential := ROUND((v_essential_f_yes::DECIMAL / (v_essential_f_yes + v_essential_f_no)) * 100, 2);
    END IF;
    IF (v_essential_e_yes + v_essential_e_no) > 0 THEN
        v_e_essential := ROUND((v_essential_e_yes::DECIMAL / (v_essential_e_yes + v_essential_e_no)) * 100, 2);
    END IF;

    -- Calculate ESSENTIAL overall score
    DECLARE
        v_essential_total_yes INT := v_essential_s_yes + v_essential_a_yes + v_essential_f_yes + v_essential_e_yes;
        v_essential_total_no INT := v_essential_s_no + v_essential_a_no + v_essential_f_no + v_essential_e_no;
    BEGIN
        IF (v_essential_total_yes + v_essential_total_no) > 0 THEN
            v_note_essential := ROUND((v_essential_total_yes::DECIMAL / (v_essential_total_yes + v_essential_total_no)) * 100, 2);
        END IF;
    END;

    -- Upsert into safe_scoring_results
    INSERT INTO safe_scoring_results (
        product_id,
        note_finale, score_s, score_a, score_f, score_e,
        note_consumer, s_consumer, a_consumer, f_consumer, e_consumer,
        note_essential, s_essential, a_essential, f_essential, e_essential,
        total_norms_evaluated, total_yes, total_no, total_na, total_tbd,
        calculated_at, last_evaluation_date
    ) VALUES (
        p_product_id,
        v_note_finale, v_score_s, v_score_a, v_score_f, v_score_e,
        v_note_consumer, v_s_consumer, v_a_consumer, v_f_consumer, v_e_consumer,
        v_note_essential, v_s_essential, v_a_essential, v_f_essential, v_e_essential,
        v_total_norms, v_total_yes, v_total_no, v_total_na, v_total_tbd,
        NOW(), NOW()
    )
    ON CONFLICT (product_id) DO UPDATE SET
        note_finale = EXCLUDED.note_finale,
        score_s = EXCLUDED.score_s,
        score_a = EXCLUDED.score_a,
        score_f = EXCLUDED.score_f,
        score_e = EXCLUDED.score_e,
        note_consumer = EXCLUDED.note_consumer,
        s_consumer = EXCLUDED.s_consumer,
        a_consumer = EXCLUDED.a_consumer,
        f_consumer = EXCLUDED.f_consumer,
        e_consumer = EXCLUDED.e_consumer,
        note_essential = EXCLUDED.note_essential,
        s_essential = EXCLUDED.s_essential,
        a_essential = EXCLUDED.a_essential,
        f_essential = EXCLUDED.f_essential,
        e_essential = EXCLUDED.e_essential,
        total_norms_evaluated = EXCLUDED.total_norms_evaluated,
        total_yes = EXCLUDED.total_yes,
        total_no = EXCLUDED.total_no,
        total_na = EXCLUDED.total_na,
        total_tbd = EXCLUDED.total_tbd,
        calculated_at = NOW(),
        last_evaluation_date = NOW();

    RETURN jsonb_build_object(
        'product_id', p_product_id,
        'note_finale', v_note_finale,
        'score_s', v_score_s,
        'score_a', v_score_a,
        'score_f', v_score_f,
        'score_e', v_score_e,
        'total_norms', v_total_norms,
        'total_yes', v_total_yes,
        'total_no', v_total_no
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. TRIGGER FUNCTION: Auto-recalculate when evaluations change
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_scores()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id INTEGER;
BEGIN
    -- Get the product_id from the affected row
    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
    ELSE
        v_product_id := NEW.product_id;
    END IF;

    -- Recalculate scores for this product
    PERFORM calculate_product_scores(v_product_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. CREATE THE TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS trigger_evaluations_score_recalc ON evaluations;

CREATE TRIGGER trigger_evaluations_score_recalc
    AFTER INSERT OR UPDATE OR DELETE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_recalculate_scores();

-- ============================================================
-- 4. FUNCTION: Recalculate ALL products (batch)
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_all_scores()
RETURNS JSONB AS $$
DECLARE
    v_count INT := 0;
    v_product RECORD;
BEGIN
    FOR v_product IN SELECT DISTINCT product_id FROM evaluations LOOP
        PERFORM calculate_product_scores(v_product.product_id);
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'products_updated', v_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. GRANT PERMISSIONS (for anon/authenticated roles)
-- ============================================================
GRANT EXECUTE ON FUNCTION calculate_product_scores(INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION recalculate_all_scores() TO authenticated, service_role;

-- ============================================================
-- 6. RUN INITIAL CALCULATION FOR ALL PRODUCTS
-- ============================================================
-- Uncomment the line below to run initial calculation:
-- SELECT recalculate_all_scores();

COMMENT ON FUNCTION calculate_product_scores IS 'Calculates SAFE scores (Full, Consumer, Essential) for a single product based on its evaluations';
COMMENT ON FUNCTION recalculate_all_scores IS 'Batch recalculates scores for all products with evaluations';
COMMENT ON TRIGGER trigger_evaluations_score_recalc ON evaluations IS 'Automatically recalculates product scores when evaluations are inserted, updated, or deleted';
