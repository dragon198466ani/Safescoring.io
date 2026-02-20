-- Migration 085: Product Strategies and Enhanced Sources
-- Adds structured storage for SAFE strategies and social/news sources per product
-- ============================================================================

-- 1. Product Strategies Table
-- Stores personalized strategies for each SAFE pillar based on evaluations
CREATE TABLE IF NOT EXISTS product_strategies (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pillar CHAR(1) NOT NULL CHECK (pillar IN ('S', 'A', 'F', 'E')),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    strategy_title VARCHAR(200) NOT NULL,
    strategy_description TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, pillar, strategy_title)
);

-- Index for fast lookups by product
CREATE INDEX IF NOT EXISTS idx_product_strategies_product_id ON product_strategies(product_id);
CREATE INDEX IF NOT EXISTS idx_product_strategies_pillar ON product_strategies(pillar);

-- 2. Product Sources Table
-- Stores verified external sources (news, social, documentation)
CREATE TABLE IF NOT EXISTS product_sources (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'twitter', 'discord', 'telegram', 'reddit', 'github',
        'documentation', 'blog', 'news', 'audit_report', 'whitepaper',
        'youtube', 'medium', 'forum', 'official_website', 'other'
    )),
    url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    is_official BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, source_type, url)
);

-- Indexes for product sources
CREATE INDEX IF NOT EXISTS idx_product_sources_product_id ON product_sources(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sources_type ON product_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_product_sources_official ON product_sources(is_official) WHERE is_official = true;

-- 3. Product Chart Data Table
-- Stores time-series data for product charts (TVL, volume, users, etc.)
CREATE TABLE IF NOT EXISTS product_chart_data (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
        'tvl', 'volume_24h', 'users_active', 'transactions',
        'safe_score', 'github_commits', 'github_stars', 'social_mentions'
    )),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    value NUMERIC NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, metric_type, recorded_at)
);

-- Indexes for chart data
CREATE INDEX IF NOT EXISTS idx_product_chart_data_product_id ON product_chart_data(product_id);
CREATE INDEX IF NOT EXISTS idx_product_chart_data_metric ON product_chart_data(metric_type);
CREATE INDEX IF NOT EXISTS idx_product_chart_data_time ON product_chart_data(recorded_at DESC);

-- 4. Add new columns to products table for enhanced data
ALTER TABLE products ADD COLUMN IF NOT EXISTS safe_priority_pillar CHAR(1);
ALTER TABLE products ADD COLUMN IF NOT EXISTS safe_priority_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS news_sentiment VARCHAR(20) DEFAULT 'neutral';
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_news_check TIMESTAMP WITH TIME ZONE;

-- 5. Create view for product page with all related data
CREATE OR REPLACE VIEW v_product_complete AS
SELECT 
    p.id,
    p.slug,
    p.name,
    p.url,
    p.description,
    p.short_description,
    p.logo_url,
    p.media,
    p.social_links,
    p.verified,
    p.security_status,
    p.safe_priority_pillar,
    p.safe_priority_reason,
    p.news_sentiment,
    p.defillama_slug,
    p.coingecko_id,
    p.github_repo,
    p.headquarters,
    p.country_origin,
    p.updated_at,
    p.last_evaluated_at,
    -- Latest scores
    ssr.note_finale AS safe_score,
    ssr.score_s,
    ssr.score_a,
    ssr.score_f,
    ssr.score_e,
    ssr.calculated_at AS score_calculated_at,
    -- Type info
    pt.code AS type_code,
    pt.name AS type_name,
    pt.category AS type_category,
    -- Aggregated counts
    (SELECT COUNT(*) FROM product_strategies ps WHERE ps.product_id = p.id AND ps.is_active = true) AS strategies_count,
    (SELECT COUNT(*) FROM product_sources pso WHERE pso.product_id = p.id AND pso.is_active = true) AS sources_count,
    (SELECT COUNT(*) FROM evaluations e WHERE e.product_id = p.id) AS evaluations_count
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN LATERAL (
    SELECT * FROM safe_scoring_results 
    WHERE product_id = p.id 
    ORDER BY calculated_at DESC 
    LIMIT 1
) ssr ON true
WHERE p.deleted_at IS NULL AND p.is_active = true;

-- 6. Function to auto-generate strategies from evaluations
CREATE OR REPLACE FUNCTION generate_product_strategies(p_product_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_pillar CHAR(1);
    v_score NUMERIC;
    v_failed_norms RECORD;
BEGIN
    -- Get latest scores
    SELECT score_s, score_a, score_f, score_e INTO v_score
    FROM safe_scoring_results
    WHERE product_id = p_product_id
    ORDER BY calculated_at DESC
    LIMIT 1;

    -- For each pillar with score < 80, generate improvement strategies
    FOR v_pillar IN SELECT unnest(ARRAY['S', 'A', 'F', 'E']) LOOP
        -- Get failed norms for this pillar
        FOR v_failed_norms IN 
            SELECT n.code, n.title, e.why_this_result
            FROM evaluations e
            JOIN norms n ON e.norm_id = n.id
            WHERE e.product_id = p_product_id 
              AND n.pillar = v_pillar
              AND e.result IN ('NO', 'N')
            ORDER BY n.is_essential DESC
            LIMIT 3
        LOOP
            INSERT INTO product_strategies (
                product_id, pillar, priority, strategy_title, strategy_description, risk_level
            ) VALUES (
                p_product_id,
                v_pillar,
                1,
                'Improve ' || v_failed_norms.title,
                COALESCE(v_failed_norms.why_this_result, 'Review and address this security requirement.'),
                CASE 
                    WHEN v_pillar = 'S' THEN 'high'
                    WHEN v_pillar = 'A' THEN 'medium'
                    ELSE 'low'
                END
            )
            ON CONFLICT (product_id, pillar, strategy_title) DO UPDATE
            SET strategy_description = EXCLUDED.strategy_description,
                updated_at = NOW();
            
            v_count := v_count + 1;
        END LOOP;
    END LOOP;

    -- Update priority pillar on product
    UPDATE products 
    SET safe_priority_pillar = (
        SELECT pillar FROM (
            SELECT 'S' as pillar, score_s as score FROM safe_scoring_results WHERE product_id = p_product_id ORDER BY calculated_at DESC LIMIT 1
            UNION ALL
            SELECT 'A', score_a FROM safe_scoring_results WHERE product_id = p_product_id ORDER BY calculated_at DESC LIMIT 1
            UNION ALL
            SELECT 'F', score_f FROM safe_scoring_results WHERE product_id = p_product_id ORDER BY calculated_at DESC LIMIT 1
            UNION ALL
            SELECT 'E', score_e FROM safe_scoring_results WHERE product_id = p_product_id ORDER BY calculated_at DESC LIMIT 1
        ) scores
        ORDER BY score ASC
        LIMIT 1
    ),
    updated_at = NOW()
    WHERE id = p_product_id;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to sync social links from products.social_links to product_sources
CREATE OR REPLACE FUNCTION sync_product_social_links(p_product_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_social_links JSONB;
    v_key TEXT;
    v_value TEXT;
    v_count INTEGER := 0;
BEGIN
    SELECT social_links INTO v_social_links
    FROM products
    WHERE id = p_product_id;

    IF v_social_links IS NULL THEN
        RETURN 0;
    END IF;

    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_social_links) LOOP
        IF v_value IS NOT NULL AND v_value != '' THEN
            INSERT INTO product_sources (
                product_id, source_type, url, is_official, is_verified
            ) VALUES (
                p_product_id,
                CASE v_key
                    WHEN 'twitter' THEN 'twitter'
                    WHEN 'x' THEN 'twitter'
                    WHEN 'discord' THEN 'discord'
                    WHEN 'telegram' THEN 'telegram'
                    WHEN 'reddit' THEN 'reddit'
                    WHEN 'github' THEN 'github'
                    WHEN 'docs' THEN 'documentation'
                    WHEN 'documentation' THEN 'documentation'
                    WHEN 'blog' THEN 'blog'
                    WHEN 'medium' THEN 'medium'
                    WHEN 'youtube' THEN 'youtube'
                    WHEN 'website' THEN 'official_website'
                    ELSE 'other'
                END,
                v_value,
                true,
                true
            )
            ON CONFLICT (product_id, source_type, url) DO UPDATE
            SET is_official = true, is_verified = true, updated_at = NOW();
            
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger to auto-sync social links when products are updated
CREATE OR REPLACE FUNCTION trigger_sync_social_links()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.social_links IS DISTINCT FROM OLD.social_links THEN
        PERFORM sync_product_social_links(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_social_links ON products;
CREATE TRIGGER trg_sync_social_links
    AFTER UPDATE OF social_links ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_social_links();

-- 9. Enable RLS on new tables
ALTER TABLE product_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_chart_data ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read product_strategies" ON product_strategies FOR SELECT USING (true);
CREATE POLICY "Public read product_sources" ON product_sources FOR SELECT USING (true);
CREATE POLICY "Public read product_chart_data" ON product_chart_data FOR SELECT USING (true);

-- Admin write access (service role)
CREATE POLICY "Service write product_strategies" ON product_strategies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write product_sources" ON product_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write product_chart_data" ON product_chart_data FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE product_strategies IS 'Personalized SAFE improvement strategies per product';
COMMENT ON TABLE product_sources IS 'External sources and social links for products';
COMMENT ON TABLE product_chart_data IS 'Time-series metrics for product charts';
