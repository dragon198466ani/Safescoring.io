-- =============================================================================
-- SAFESCORING - SUPABASE #2 SCHEMA (Reference Data)
-- =============================================================================
-- Exécuter dans Supabase #2 > SQL Editor
-- Ce projet stocke: products, norms, evaluations (données de référence)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(500),

    -- SAFE Scores
    safe_score DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),

    -- Consumer/Essential scores
    consumer_score DECIMAL(5,2),
    essential_score DECIMAL(5,2),

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    price_eur DECIMAL(10,2),
    price_details TEXT,

    -- Timestamps
    last_evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- NORMS TABLE (Standards de sécurité)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS norms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    pillar CHAR(1) CHECK (pillar IN ('S', 'A', 'F', 'E')),

    -- Classification
    is_essential BOOLEAN DEFAULT false,
    consumer BOOLEAN DEFAULT false,
    category VARCHAR(100),

    -- Documentation
    official_doc_summary TEXT,
    official_link VARCHAR(500),
    year INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- EVALUATIONS TABLE (Product x Norm results)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evaluations (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    norm_id INTEGER REFERENCES norms(id) ON DELETE CASCADE,

    result VARCHAR(10) CHECK (result IN ('YES', 'NO', 'N/A', 'TBD')),
    confidence DECIMAL(3,2),
    source VARCHAR(100),
    notes TEXT,

    evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, norm_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SAFE SCORING RESULTS (Scores calculés)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS safe_scoring_results (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,

    note_finale DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),

    -- Counts
    yes_count INTEGER DEFAULT 0,
    no_count INTEGER DEFAULT 0,
    na_count INTEGER DEFAULT 0,
    tbd_count INTEGER DEFAULT 0,

    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCT TYPES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    definition TEXT,
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PHYSICAL INCIDENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS physical_incidents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    incident_type VARCHAR(50),
    description TEXT,
    date DATE,
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    amount_stolen_usd BIGINT,
    severity_score INTEGER,
    verified BOOLEAN DEFAULT false,
    source_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- CRYPTO LEGISLATION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crypto_legislation (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL UNIQUE,
    country_name VARCHAR(100),
    legal_status VARCHAR(50),
    tax_rate DECIMAL(5,2),
    regulations TEXT,
    kyc_required BOOLEAN,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCT COMPATIBILITY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_compatibility (
    id SERIAL PRIMARY KEY,
    product_a_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    product_b_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    compatibility_score DECIMAL(5,2),
    warnings TEXT[],
    benefits TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_a_id, product_b_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_score ON products(safe_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_evaluations_product ON evaluations(product_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_norm ON evaluations(norm_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_result ON evaluations(result);

CREATE INDEX IF NOT EXISTS idx_norms_pillar ON norms(pillar);
CREATE INDEX IF NOT EXISTS idx_norms_code ON norms(code);
CREATE INDEX IF NOT EXISTS idx_norms_essential ON norms(is_essential) WHERE is_essential = true;

CREATE INDEX IF NOT EXISTS idx_scoring_product ON safe_scoring_results(product_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (Public read access)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE norms ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_scoring_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_legislation ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_compatibility ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data = public)
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read norms" ON norms FOR SELECT USING (true);
CREATE POLICY "Public read evaluations" ON evaluations FOR SELECT USING (true);
CREATE POLICY "Public read scores" ON safe_scoring_results FOR SELECT USING (true);
CREATE POLICY "Public read types" ON product_types FOR SELECT USING (true);
CREATE POLICY "Public read incidents" ON physical_incidents FOR SELECT USING (true);
CREATE POLICY "Public read legislation" ON crypto_legislation FOR SELECT USING (true);
CREATE POLICY "Public read compat" ON product_compatibility FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service write products" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write norms" ON norms FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write evaluations" ON evaluations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write scores" ON safe_scoring_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write types" ON product_types FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write incidents" ON physical_incidents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write legislation" ON crypto_legislation FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write compat" ON product_compatibility FOR ALL USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
    'SUPABASE #2 SCHEMA CRÉÉ!' AS status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables_count;
