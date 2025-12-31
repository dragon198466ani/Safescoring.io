-- ============================================================
-- SAFE SCORING - Definitions and Results Tables
-- ============================================================
-- 
-- This script creates:
-- 0. consumer_type_definitions - Definitions of ESSENTIAL/CONSUMER/FULL criteria
-- 1. safe_scoring_definitions - Definitions linked to norms (essential/consumer/full)
-- 2. safe_scoring_results - Results per product (like Excel file)
--
-- ============================================================

-- ============================================================
-- 0. TABLE: consumer_type_definitions
-- ============================================================
-- Defines what ESSENTIAL, CONSUMER, and FULL mean
-- AI uses these definitions to classify norms automatically

CREATE TABLE IF NOT EXISTS consumer_type_definitions (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(20) NOT NULL UNIQUE,  -- 'essential', 'consumer', 'full'
    type_name VARCHAR(50) NOT NULL,          -- Display name
    
    -- Core definition
    definition TEXT NOT NULL,                -- Clear definition of this type
    target_audience TEXT,                    -- Who this type is for
    
    -- Criteria for AI classification
    inclusion_criteria TEXT[] NOT NULL,      -- Criteria that make a norm belong to this type
    exclusion_criteria TEXT[],               -- Criteria that exclude a norm from this type
    
    -- Keywords for AI matching
    keywords TEXT[],                         -- Keywords that suggest this classification
    negative_keywords TEXT[],                -- Keywords that suggest NOT this classification
    
    -- Examples for AI context
    example_norms TEXT[],                    -- Example norm codes that belong to this type
    counter_examples TEXT[],                 -- Example norm codes that do NOT belong
    
    -- Quotas and statistics
    target_percentage DECIMAL(5,2),          -- Target % of norms (e.g., 17% for essential)
    priority_order INTEGER DEFAULT 1,        -- 1=highest priority (essential), 3=lowest (full)
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default definitions
INSERT INTO consumer_type_definitions (type_code, type_name, definition, target_audience, inclusion_criteria, exclusion_criteria, keywords, target_percentage, priority_order)
VALUES 
(
    'essential',
    'Essential',
    'Critical and fundamental norms for basic security. These norms represent the absolute minimum that any crypto product must meet to be considered safe. Failure on these norms indicates a major risk.',
    'All users - These criteria are non-negotiable for any crypto product',
    ARRAY[
        'User fund security (custody, private keys)',
        'Protection against known hacks and exploits',
        'Third-party security audit by recognized firm',
        'Transparency on major risks',
        'Recovery mechanisms in case of problems',
        'Basic regulatory compliance',
        'Protection against total loss of funds'
    ],
    ARRAY[
        'Optional advanced features',
        'Performance optimizations',
        'Cosmetic or UX features',
        'Non-critical third-party integrations'
    ],
    ARRAY['security', 'audit', 'custody', 'keys', 'hack', 'exploit', 'funds', 'critical', 'fundamental', 'mandatory', 'major risk'],
    17.00,
    1
),
(
    'consumer',
    'Consumer',
    'Important norms for general public users. These norms cover aspects that any non-technical user should verify before using a product. They include ease of use, fee transparency, and consumer protection.',
    'General public users - People without deep technical expertise',
    ARRAY[
        'Ease of use and clear UX',
        'Fee and cost transparency',
        'Accessible customer support',
        'Understandable documentation',
        'Personal data protection',
        'Clear complaint process',
        'Risk information in simple language',
        'Project history and reputation'
    ],
    ARRAY[
        'Advanced technical details',
        'Developer metrics',
        'Complex configurations',
        'Professional trader optimizations'
    ],
    ARRAY['user', 'consumer', 'fees', 'support', 'documentation', 'simple', 'accessible', 'transparent', 'UX', 'interface'],
    38.00,
    2
),
(
    'full',
    'Full',
    'All norms in the SAFE framework. This level includes advanced technical criteria, optimizations, and complete best practices. Intended for expert users and in-depth analysis.',
    'Experts, analysts, and advanced users - Complete and detailed evaluation',
    ARRAY[
        'All norms are included by default',
        'Advanced technical criteria',
        'Performance optimizations',
        'Industry best practices',
        'Detailed metrics',
        'Code and architecture analysis'
    ],
    NULL,  -- No exclusion for FULL
    ARRAY['complete', 'technical', 'advanced', 'expert', 'detailed', 'architecture', 'code', 'performance', 'optimization'],
    100.00,
    3
)
ON CONFLICT (type_code) DO UPDATE SET
    definition = EXCLUDED.definition,
    target_audience = EXCLUDED.target_audience,
    inclusion_criteria = EXCLUDED.inclusion_criteria,
    exclusion_criteria = EXCLUDED.exclusion_criteria,
    keywords = EXCLUDED.keywords,
    target_percentage = EXCLUDED.target_percentage,
    updated_at = NOW();

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ctd_type_code ON consumer_type_definitions(type_code);
CREATE INDEX IF NOT EXISTS idx_ctd_active ON consumer_type_definitions(is_active);

-- ============================================================
-- 1. TABLE: safe_scoring_definitions
-- ============================================================
-- Stores norm classification definitions
-- Linked to norms table via norm_id

CREATE TABLE IF NOT EXISTS safe_scoring_definitions (
    id SERIAL PRIMARY KEY,
    norm_id INTEGER REFERENCES norms(id) ON DELETE CASCADE UNIQUE,
    
    -- Classification flags (determined by AI or manually)
    is_essential BOOLEAN DEFAULT FALSE,
    is_consumer BOOLEAN DEFAULT FALSE,
    is_full BOOLEAN DEFAULT TRUE,  -- Always TRUE by default
    
    -- Classification metadata
    classification_method VARCHAR(30) DEFAULT 'manual',  -- 'manual', 'ai_mistral', 'ai_gemini', 'ai_openai', 'heuristic'
    classification_reason TEXT,  -- AI explanation for classification
    classification_confidence DECIMAL(3,2) DEFAULT 1.0,  -- 0.0 to 1.0
    classified_at TIMESTAMP DEFAULT NOW(),
    classified_by VARCHAR(100),  -- User or system
    
    -- Classification criteria (stored for audit)
    criteria_security_impact INTEGER DEFAULT 0,  -- 1-5, security impact
    criteria_user_relevance INTEGER DEFAULT 0,   -- 1-5, relevance for standard user
    criteria_complexity INTEGER DEFAULT 0,       -- 1-5, technical complexity
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes to optimize queries
CREATE INDEX IF NOT EXISTS idx_ssd_norm_id ON safe_scoring_definitions(norm_id);
CREATE INDEX IF NOT EXISTS idx_ssd_essential ON safe_scoring_definitions(is_essential);
CREATE INDEX IF NOT EXISTS idx_ssd_consumer ON safe_scoring_definitions(is_consumer);
CREATE INDEX IF NOT EXISTS idx_ssd_method ON safe_scoring_definitions(classification_method);

-- ============================================================
-- 2. TABLE: safe_scoring_results
-- ============================================================
-- Stores scoring results per product
-- Structure similar to Excel file (FINAL SCORE, SCORE S/A/F/E, etc.)

CREATE TABLE IF NOT EXISTS safe_scoring_results (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    
    -- ═══════════════════════════════════════════════════════════
    -- FULL SCORES (All norms - 100%)
    -- ═══════════════════════════════════════════════════════════
    note_finale DECIMAL(5,2),        -- Global FULL score (0-100)
    score_s DECIMAL(5,2),            -- Security pillar score
    score_a DECIMAL(5,2),            -- Availability pillar score
    score_f DECIMAL(5,2),            -- Financial pillar score
    score_e DECIMAL(5,2),            -- Environmental pillar score
    
    -- ═══════════════════════════════════════════════════════════
    -- CONSUMER SCORES (Consumer norms - ~38%)
    -- ═══════════════════════════════════════════════════════════
    note_consumer DECIMAL(5,2),      -- Global Consumer score
    s_consumer DECIMAL(5,2),         -- S Consumer score
    a_consumer DECIMAL(5,2),         -- A Consumer score
    f_consumer DECIMAL(5,2),         -- F Consumer score
    e_consumer DECIMAL(5,2),         -- E Consumer score
    
    -- ═══════════════════════════════════════════════════════════
    -- ESSENTIAL SCORES (Critical norms - ~17%)
    -- ═══════════════════════════════════════════════════════════
    note_essential DECIMAL(5,2),     -- Global Essential score
    s_essential DECIMAL(5,2),        -- S Essential score
    a_essential DECIMAL(5,2),        -- A Essential score
    f_essential DECIMAL(5,2),        -- F Essential score
    e_essential DECIMAL(5,2),        -- E Essential score
    
    -- ═══════════════════════════════════════════════════════════
    -- STATISTICS
    -- ═══════════════════════════════════════════════════════════
    total_norms_evaluated INTEGER DEFAULT 0,
    total_yes INTEGER DEFAULT 0,
    total_no INTEGER DEFAULT 0,
    total_na INTEGER DEFAULT 0,
    total_tbd INTEGER DEFAULT 0,
    
    -- Timestamps
    calculated_at TIMESTAMP DEFAULT NOW(),
    last_evaluation_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes to optimize queries and ranking
CREATE INDEX IF NOT EXISTS idx_ssr_product_id ON safe_scoring_results(product_id);
CREATE INDEX IF NOT EXISTS idx_ssr_note_finale ON safe_scoring_results(note_finale DESC);
CREATE INDEX IF NOT EXISTS idx_ssr_note_consumer ON safe_scoring_results(note_consumer DESC);
CREATE INDEX IF NOT EXISTS idx_ssr_note_essential ON safe_scoring_results(note_essential DESC);
CREATE INDEX IF NOT EXISTS idx_ssr_calculated_at ON safe_scoring_results(calculated_at);

-- ============================================================
-- 3. TRIGGERS for automatic updates
-- ============================================================

-- Trigger for updated_at on safe_scoring_definitions
CREATE TRIGGER update_ssd_updated_at 
    BEFORE UPDATE ON safe_scoring_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on safe_scoring_results
CREATE TRIGGER update_ssr_updated_at 
    BEFORE UPDATE ON safe_scoring_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. FUNCTION: Sync definitions to norms table
-- ============================================================
-- When safe_scoring_definitions is updated, sync to norms

CREATE OR REPLACE FUNCTION sync_definitions_to_norms()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE norms 
    SET 
        is_essential = NEW.is_essential,
        consumer = NEW.is_consumer,
        "full" = NEW.is_full,
        classification_method = NEW.classification_method,
        classification_date = NEW.classified_at
    WHERE id = NEW.norm_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_definitions_trigger
    AFTER INSERT OR UPDATE ON safe_scoring_definitions
    FOR EACH ROW EXECUTE FUNCTION sync_definitions_to_norms();

-- ============================================================
-- 5. FUNCTION: Recalculate scores automatically
-- ============================================================
-- Called when an evaluation is added/modified

CREATE OR REPLACE FUNCTION recalculate_product_scores(p_product_id INTEGER)
RETURNS void AS $$
DECLARE
    v_type_id INTEGER;
    v_total_yes INTEGER := 0;
    v_total_no INTEGER := 0;
    v_total_na INTEGER := 0;
    
    -- Full scores
    v_full_s_yes INTEGER := 0; v_full_s_total INTEGER := 0;
    v_full_a_yes INTEGER := 0; v_full_a_total INTEGER := 0;
    v_full_f_yes INTEGER := 0; v_full_f_total INTEGER := 0;
    v_full_e_yes INTEGER := 0; v_full_e_total INTEGER := 0;
    
    -- Consumer scores
    v_consumer_s_yes INTEGER := 0; v_consumer_s_total INTEGER := 0;
    v_consumer_a_yes INTEGER := 0; v_consumer_a_total INTEGER := 0;
    v_consumer_f_yes INTEGER := 0; v_consumer_f_total INTEGER := 0;
    v_consumer_e_yes INTEGER := 0; v_consumer_e_total INTEGER := 0;
    
    -- Essential scores
    v_essential_s_yes INTEGER := 0; v_essential_s_total INTEGER := 0;
    v_essential_a_yes INTEGER := 0; v_essential_a_total INTEGER := 0;
    v_essential_f_yes INTEGER := 0; v_essential_f_total INTEGER := 0;
    v_essential_e_yes INTEGER := 0; v_essential_e_total INTEGER := 0;
    
    rec RECORD;
BEGIN
    -- Get product type
    SELECT type_id INTO v_type_id FROM products WHERE id = p_product_id;
    
    -- Loop through evaluations with norm info
    FOR rec IN 
        SELECT 
            e.result,
            n.pillar,
            COALESCE(ssd.is_essential, n.is_essential, FALSE) as is_essential,
            COALESCE(ssd.is_consumer, n.consumer, FALSE) as is_consumer,
            COALESCE(ssd.is_full, n."full", TRUE) as is_full
        FROM evaluations e
        JOIN norms n ON e.norm_id = n.id
        LEFT JOIN safe_scoring_definitions ssd ON n.id = ssd.norm_id
        WHERE e.product_id = p_product_id
    LOOP
        -- Global counters
        IF rec.result = 'YES' THEN v_total_yes := v_total_yes + 1;
        ELSIF rec.result = 'NO' THEN v_total_no := v_total_no + 1;
        ELSE v_total_na := v_total_na + 1;
        END IF;
        
        -- Skip N/A for score calculations
        IF rec.result = 'N/A' THEN CONTINUE; END IF;
        
        -- FULL scores (all norms where is_full = TRUE)
        IF rec.is_full THEN
            CASE rec.pillar
                WHEN 'S' THEN 
                    v_full_s_total := v_full_s_total + 1;
                    IF rec.result = 'YES' THEN v_full_s_yes := v_full_s_yes + 1; END IF;
                WHEN 'A' THEN 
                    v_full_a_total := v_full_a_total + 1;
                    IF rec.result = 'YES' THEN v_full_a_yes := v_full_a_yes + 1; END IF;
                WHEN 'F' THEN 
                    v_full_f_total := v_full_f_total + 1;
                    IF rec.result = 'YES' THEN v_full_f_yes := v_full_f_yes + 1; END IF;
                WHEN 'E' THEN 
                    v_full_e_total := v_full_e_total + 1;
                    IF rec.result = 'YES' THEN v_full_e_yes := v_full_e_yes + 1; END IF;
            END CASE;
        END IF;
        
        -- CONSUMER scores
        IF rec.is_consumer THEN
            CASE rec.pillar
                WHEN 'S' THEN 
                    v_consumer_s_total := v_consumer_s_total + 1;
                    IF rec.result = 'YES' THEN v_consumer_s_yes := v_consumer_s_yes + 1; END IF;
                WHEN 'A' THEN 
                    v_consumer_a_total := v_consumer_a_total + 1;
                    IF rec.result = 'YES' THEN v_consumer_a_yes := v_consumer_a_yes + 1; END IF;
                WHEN 'F' THEN 
                    v_consumer_f_total := v_consumer_f_total + 1;
                    IF rec.result = 'YES' THEN v_consumer_f_yes := v_consumer_f_yes + 1; END IF;
                WHEN 'E' THEN 
                    v_consumer_e_total := v_consumer_e_total + 1;
                    IF rec.result = 'YES' THEN v_consumer_e_yes := v_consumer_e_yes + 1; END IF;
            END CASE;
        END IF;
        
        -- ESSENTIAL scores
        IF rec.is_essential THEN
            CASE rec.pillar
                WHEN 'S' THEN 
                    v_essential_s_total := v_essential_s_total + 1;
                    IF rec.result = 'YES' THEN v_essential_s_yes := v_essential_s_yes + 1; END IF;
                WHEN 'A' THEN 
                    v_essential_a_total := v_essential_a_total + 1;
                    IF rec.result = 'YES' THEN v_essential_a_yes := v_essential_a_yes + 1; END IF;
                WHEN 'F' THEN 
                    v_essential_f_total := v_essential_f_total + 1;
                    IF rec.result = 'YES' THEN v_essential_f_yes := v_essential_f_yes + 1; END IF;
                WHEN 'E' THEN 
                    v_essential_e_total := v_essential_e_total + 1;
                    IF rec.result = 'YES' THEN v_essential_e_yes := v_essential_e_yes + 1; END IF;
            END CASE;
        END IF;
    END LOOP;
    
    -- Insert or update results
    INSERT INTO safe_scoring_results (
        product_id,
        -- Full scores
        note_finale, score_s, score_a, score_f, score_e,
        -- Consumer scores
        note_consumer, s_consumer, a_consumer, f_consumer, e_consumer,
        -- Essential scores
        note_essential, s_essential, a_essential, f_essential, e_essential,
        -- Stats
        total_norms_evaluated, total_yes, total_no, total_na,
        calculated_at, last_evaluation_date
    ) VALUES (
        p_product_id,
        -- Full scores (average of 4 pillars)
        CASE WHEN (v_full_s_total + v_full_a_total + v_full_f_total + v_full_e_total) > 0 
             THEN ROUND(((COALESCE(v_full_s_yes::DECIMAL / NULLIF(v_full_s_total, 0), 0) +
                          COALESCE(v_full_a_yes::DECIMAL / NULLIF(v_full_a_total, 0), 0) +
                          COALESCE(v_full_f_yes::DECIMAL / NULLIF(v_full_f_total, 0), 0) +
                          COALESCE(v_full_e_yes::DECIMAL / NULLIF(v_full_e_total, 0), 0)) / 4) * 100, 2)
             ELSE NULL END,
        CASE WHEN v_full_s_total > 0 THEN ROUND((v_full_s_yes::DECIMAL / v_full_s_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_full_a_total > 0 THEN ROUND((v_full_a_yes::DECIMAL / v_full_a_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_full_f_total > 0 THEN ROUND((v_full_f_yes::DECIMAL / v_full_f_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_full_e_total > 0 THEN ROUND((v_full_e_yes::DECIMAL / v_full_e_total) * 100, 2) ELSE NULL END,
        -- Consumer scores
        CASE WHEN (v_consumer_s_total + v_consumer_a_total + v_consumer_f_total + v_consumer_e_total) > 0 
             THEN ROUND(((COALESCE(v_consumer_s_yes::DECIMAL / NULLIF(v_consumer_s_total, 0), 0) +
                          COALESCE(v_consumer_a_yes::DECIMAL / NULLIF(v_consumer_a_total, 0), 0) +
                          COALESCE(v_consumer_f_yes::DECIMAL / NULLIF(v_consumer_f_total, 0), 0) +
                          COALESCE(v_consumer_e_yes::DECIMAL / NULLIF(v_consumer_e_total, 0), 0)) / 4) * 100, 2)
             ELSE NULL END,
        CASE WHEN v_consumer_s_total > 0 THEN ROUND((v_consumer_s_yes::DECIMAL / v_consumer_s_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_consumer_a_total > 0 THEN ROUND((v_consumer_a_yes::DECIMAL / v_consumer_a_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_consumer_f_total > 0 THEN ROUND((v_consumer_f_yes::DECIMAL / v_consumer_f_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_consumer_e_total > 0 THEN ROUND((v_consumer_e_yes::DECIMAL / v_consumer_e_total) * 100, 2) ELSE NULL END,
        -- Essential scores
        CASE WHEN (v_essential_s_total + v_essential_a_total + v_essential_f_total + v_essential_e_total) > 0 
             THEN ROUND(((COALESCE(v_essential_s_yes::DECIMAL / NULLIF(v_essential_s_total, 0), 0) +
                          COALESCE(v_essential_a_yes::DECIMAL / NULLIF(v_essential_a_total, 0), 0) +
                          COALESCE(v_essential_f_yes::DECIMAL / NULLIF(v_essential_f_total, 0), 0) +
                          COALESCE(v_essential_e_yes::DECIMAL / NULLIF(v_essential_e_total, 0), 0)) / 4) * 100, 2)
             ELSE NULL END,
        CASE WHEN v_essential_s_total > 0 THEN ROUND((v_essential_s_yes::DECIMAL / v_essential_s_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_essential_a_total > 0 THEN ROUND((v_essential_a_yes::DECIMAL / v_essential_a_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_essential_f_total > 0 THEN ROUND((v_essential_f_yes::DECIMAL / v_essential_f_total) * 100, 2) ELSE NULL END,
        CASE WHEN v_essential_e_total > 0 THEN ROUND((v_essential_e_yes::DECIMAL / v_essential_e_total) * 100, 2) ELSE NULL END,
        -- Stats
        v_total_yes + v_total_no + v_total_na,
        v_total_yes,
        v_total_no,
        v_total_na,
        NOW(),
        NOW()
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
        calculated_at = NOW(),
        last_evaluation_date = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. TRIGGER: Automatically recalculate after evaluation
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate scores for the affected product
    PERFORM recalculate_product_scores(
        CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on evaluations table
DROP TRIGGER IF EXISTS trigger_eval_recalculate ON evaluations;
CREATE TRIGGER trigger_eval_recalculate
    AFTER INSERT OR UPDATE OR DELETE ON evaluations
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_scores();

-- ============================================================
-- 7. VIEWS for easier queries
-- ============================================================

-- Complete results view with product name
CREATE OR REPLACE VIEW v_safe_scoring_results AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.slug,
    p.type_id,
    p.brand_id,
    
    -- Full scores
    ssr.note_finale,
    ssr.score_s,
    ssr.score_a,
    ssr.score_f,
    ssr.score_e,
    
    -- Consumer scores
    ssr.note_consumer,
    ssr.s_consumer,
    ssr.a_consumer,
    ssr.f_consumer,
    ssr.e_consumer,
    
    -- Essential scores
    ssr.note_essential,
    ssr.s_essential,
    ssr.a_essential,
    ssr.f_essential,
    ssr.e_essential,
    
    -- Stats
    ssr.total_norms_evaluated,
    ssr.total_yes,
    ssr.total_no,
    ssr.total_na,
    ssr.calculated_at
    
FROM products p
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
ORDER BY ssr.note_finale DESC NULLS LAST;

-- Definitions view with norm details
CREATE OR REPLACE VIEW v_norm_definitions AS
SELECT 
    n.id as norm_id,
    n.code,
    n.pillar,
    n.title,
    n.description,
    
    -- Definitions (priority to safe_scoring_definitions, otherwise norms)
    COALESCE(ssd.is_essential, n.is_essential, FALSE) as is_essential,
    COALESCE(ssd.is_consumer, n.consumer, FALSE) as is_consumer,
    COALESCE(ssd.is_full, n."full", TRUE) as is_full,
    
    -- Classification metadata
    COALESCE(ssd.classification_method, 'manual') as classification_method,
    ssd.classification_reason,
    ssd.classification_confidence,
    ssd.classified_at
    
FROM norms n
LEFT JOIN safe_scoring_definitions ssd ON n.id = ssd.norm_id
ORDER BY n.pillar, n.code;

-- Statistics view by pillar
CREATE OR REPLACE VIEW v_definition_stats_by_pillar AS
SELECT 
    pillar,
    COUNT(*) as total_norms,
    SUM(CASE WHEN COALESCE(ssd.is_essential, n.is_essential, FALSE) THEN 1 ELSE 0 END) as essential_count,
    SUM(CASE WHEN COALESCE(ssd.is_consumer, n.consumer, FALSE) THEN 1 ELSE 0 END) as consumer_count,
    SUM(CASE WHEN COALESCE(ssd.is_full, n."full", TRUE) THEN 1 ELSE 0 END) as full_count,
    ROUND(SUM(CASE WHEN COALESCE(ssd.is_essential, n.is_essential, FALSE) THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 1) as essential_pct,
    ROUND(SUM(CASE WHEN COALESCE(ssd.is_consumer, n.consumer, FALSE) THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 1) as consumer_pct
FROM norms n
LEFT JOIN safe_scoring_definitions ssd ON n.id = ssd.norm_id
GROUP BY pillar
ORDER BY pillar;

-- ============================================================
-- 8. VIEW: AI Classification Context
-- ============================================================
-- This view provides all context needed for AI to classify norms

CREATE OR REPLACE VIEW v_ai_classification_context AS
SELECT 
    n.id as norm_id,
    n.code as norm_code,
    n.pillar,
    n.title as norm_title,
    n.description as norm_description,
    
    -- Current classification (if exists)
    ssd.is_essential as current_essential,
    ssd.is_consumer as current_consumer,
    ssd.is_full as current_full,
    ssd.classification_method as current_method,
    
    -- Essential definition
    (SELECT definition FROM consumer_type_definitions WHERE type_code = 'essential') as essential_definition,
    (SELECT inclusion_criteria FROM consumer_type_definitions WHERE type_code = 'essential') as essential_criteria,
    (SELECT keywords FROM consumer_type_definitions WHERE type_code = 'essential') as essential_keywords,
    
    -- Consumer definition
    (SELECT definition FROM consumer_type_definitions WHERE type_code = 'consumer') as consumer_definition,
    (SELECT inclusion_criteria FROM consumer_type_definitions WHERE type_code = 'consumer') as consumer_criteria,
    (SELECT keywords FROM consumer_type_definitions WHERE type_code = 'consumer') as consumer_keywords
    
FROM norms n
LEFT JOIN safe_scoring_definitions ssd ON n.id = ssd.norm_id
ORDER BY n.pillar, n.code;

-- ============================================================
-- 9. FUNCTION: AI Classification Helper
-- ============================================================
-- Function to insert/update classification from AI

CREATE OR REPLACE FUNCTION classify_norm_by_ai(
    p_norm_id INTEGER,
    p_is_essential BOOLEAN,
    p_is_consumer BOOLEAN,
    p_classification_reason TEXT,
    p_ai_model VARCHAR(30) DEFAULT 'ai_mistral',
    p_confidence DECIMAL(3,2) DEFAULT 0.85
)
RETURNS void AS $$
BEGIN
    INSERT INTO safe_scoring_definitions (
        norm_id,
        is_essential,
        is_consumer,
        is_full,
        classification_method,
        classification_reason,
        classification_confidence,
        classified_at,
        classified_by
    ) VALUES (
        p_norm_id,
        p_is_essential,
        p_is_consumer,
        TRUE,  -- Full is always TRUE
        p_ai_model,
        p_classification_reason,
        p_confidence,
        NOW(),
        p_ai_model
    )
    ON CONFLICT (norm_id) DO UPDATE SET
        is_essential = EXCLUDED.is_essential,
        is_consumer = EXCLUDED.is_consumer,
        classification_method = EXCLUDED.classification_method,
        classification_reason = EXCLUDED.classification_reason,
        classification_confidence = EXCLUDED.classification_confidence,
        classified_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. VIEW: Classification Summary
-- ============================================================

CREATE OR REPLACE VIEW v_classification_summary AS
SELECT 
    ctd.type_code,
    ctd.type_name,
    ctd.target_percentage,
    ctd.definition,
    CASE ctd.type_code
        WHEN 'essential' THEN (SELECT COUNT(*) FROM safe_scoring_definitions WHERE is_essential = TRUE)
        WHEN 'consumer' THEN (SELECT COUNT(*) FROM safe_scoring_definitions WHERE is_consumer = TRUE)
        WHEN 'full' THEN (SELECT COUNT(*) FROM safe_scoring_definitions WHERE is_full = TRUE)
    END as current_count,
    (SELECT COUNT(*) FROM norms) as total_norms,
    ROUND(
        CASE ctd.type_code
            WHEN 'essential' THEN (SELECT COUNT(*) FROM safe_scoring_definitions WHERE is_essential = TRUE)::DECIMAL
            WHEN 'consumer' THEN (SELECT COUNT(*) FROM safe_scoring_definitions WHERE is_consumer = TRUE)::DECIMAL
            WHEN 'full' THEN (SELECT COUNT(*) FROM safe_scoring_definitions WHERE is_full = TRUE)::DECIMAL
        END / NULLIF((SELECT COUNT(*) FROM norms), 0) * 100, 2
    ) as actual_percentage
FROM consumer_type_definitions ctd
WHERE ctd.is_active = TRUE
ORDER BY ctd.priority_order;

-- ============================================================
-- 11. COMMENTS
-- ============================================================

COMMENT ON TABLE consumer_type_definitions IS 'Definitions of ESSENTIAL/CONSUMER/FULL classification types - Used by AI for automatic classification';
COMMENT ON TABLE safe_scoring_definitions IS 'Norm classification definitions (essential/consumer/full) - Linked to norms';
COMMENT ON TABLE safe_scoring_results IS 'SAFE scoring results per product - Automatically calculated';

COMMENT ON COLUMN consumer_type_definitions.definition IS 'Clear definition of what this type means';
COMMENT ON COLUMN consumer_type_definitions.inclusion_criteria IS 'Criteria that make a norm belong to this type - Used by AI';
COMMENT ON COLUMN consumer_type_definitions.exclusion_criteria IS 'Criteria that exclude a norm from this type';
COMMENT ON COLUMN consumer_type_definitions.keywords IS 'Keywords that suggest this classification';
COMMENT ON COLUMN consumer_type_definitions.target_percentage IS 'Target percentage of norms (17% essential, 38% consumer, 100% full)';

COMMENT ON COLUMN safe_scoring_definitions.is_essential IS 'TRUE if critical norm for basic security';
COMMENT ON COLUMN safe_scoring_definitions.is_consumer IS 'TRUE if relevant norm for consumer users';
COMMENT ON COLUMN safe_scoring_definitions.is_full IS 'TRUE for all norms (complete score)';
COMMENT ON COLUMN safe_scoring_definitions.classification_method IS 'Method: manual, ai_mistral, ai_gemini, ai_openai, heuristic';
COMMENT ON COLUMN safe_scoring_definitions.classification_reason IS 'AI explanation for classification';

COMMENT ON COLUMN safe_scoring_results.note_finale IS 'Global FULL score (0-100) - Average of 4 pillars';
COMMENT ON COLUMN safe_scoring_results.note_consumer IS 'Global Consumer score (0-100)';
COMMENT ON COLUMN safe_scoring_results.note_essential IS 'Global Essential score (0-100)';

COMMENT ON VIEW v_ai_classification_context IS 'Provides all context for AI to classify norms as essential/consumer/full';
COMMENT ON FUNCTION classify_norm_by_ai IS 'Helper function to insert/update norm classification from AI';

-- ============================================================
-- END OF SCRIPT
-- ============================================================

SELECT 'SAFE Scoring tables (definitions + results + AI classification) created successfully!' as status;
