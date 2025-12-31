-- ============================================================
-- SAFESCORING.IO - MASTER CONSOLIDATED MIGRATION
-- ============================================================
-- Version: 1.0 - Consolidated from 28 SQL files
-- Date: 2025-12-26
--
-- This is the SINGLE SOURCE OF TRUTH for the database schema.
-- Run this on a fresh Supabase instance to create all tables.
--
-- EXECUTION ORDER:
-- 1. Run this file ONCE on a new Supabase project
-- 2. Then run cleanup_product_types.sql to populate product types
-- 3. Then run your norms data import
--
-- ============================================================
-- TABLE OF CONTENTS:
-- ============================================================
-- SECTION 0: Extensions
-- SECTION 1: Core Tables (MVP1)
--    - product_types
--    - brands
--    - products
--    - product_type_mapping (multi-type support)
-- SECTION 2: Norms & Evaluations
--    - norms
--    - norm_applicability
--    - evaluations
-- SECTION 3: SAFE Scoring System
--    - safe_methodology
--    - safe_pillar_definitions
--    - consumer_type_definitions
--    - safe_scoring_definitions
--    - safe_scoring_results
-- SECTION 4: Users & Authentication (NextAuth + Lemon Squeezy/Stripe)
--    - users
--    - accounts
--    - sessions
--    - verification_tokens
--    - leads
-- SECTION 5: Subscriptions & Business
--    - subscription_plans
--    - subscriptions
--    - user_setups
-- SECTION 6: Security & Alerts
--    - security_alerts
--    - alert_user_matches
-- SECTION 7: Moat Features
--    - score_history
--    - security_incidents
--    - incident_product_impact
-- SECTION 8: Automation & Cache
--    - automation_logs
--    - scrape_cache
--    - ai_usage_stats
-- SECTION 9: Indexes
-- SECTION 10: Functions & Triggers
-- SECTION 11: Views
-- SECTION 12: RLS Policies
-- SECTION 13: Initial Data
-- ============================================================

-- ============================================================
-- SECTION 0: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- SECTION 1: CORE TABLES (MVP1)
-- ============================================================

-- 1.1 Product Types
CREATE TABLE IF NOT EXISTS product_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100),  -- French name (legacy support)
    category VARCHAR(100),

    -- Detailed definitions
    definition TEXT,
    description TEXT,
    includes TEXT[],
    excludes TEXT[],
    risk_factors TEXT[],
    examples TEXT[],
    keywords TEXT[],

    -- Scoring configuration
    evaluation_focus JSONB,
    pillar_weights JSONB DEFAULT '{"S": 25, "A": 25, "F": 25, "E": 25}'::jsonb,
    scores_full JSONB DEFAULT '{}'::jsonb,
    scores_consumer JSONB DEFAULT '{}'::jsonb,
    scores_essential JSONB DEFAULT '{}'::jsonb,

    -- Type characteristics
    is_hardware BOOLEAN DEFAULT FALSE,
    is_custodial BOOLEAN DEFAULT NULL,  -- NULL = varies/unknown
    is_safe_applicable BOOLEAN DEFAULT TRUE,  -- TRUE = SAFE score applies

    -- Methodology integration
    objectives JSONB,
    pillar_relevance JSONB,
    applicable_keywords TEXT[],

    -- Legacy columns
    advantages TEXT,
    disadvantages TEXT,
    pillar_scores JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 1.2 Brands
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 1.3 Products (central table)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    short_description VARCHAR(150),
    url VARCHAR(255),
    type_id INTEGER REFERENCES product_types(id),
    brand_id INTEGER REFERENCES brands(id),

    -- Specifications (JSONB via AI extraction)
    specs JSONB DEFAULT '{}'::jsonb,

    -- Scores (auto-calculated JSONB)
    scores JSONB DEFAULT '{}'::jsonb,

    -- Security
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    security_status VARCHAR(20) DEFAULT 'pending' CHECK (security_status IN ('pending', 'secure', 'warning', 'critical')),

    -- Enrichment data
    price_eur DECIMAL(10,2),
    price_details VARCHAR(200),
    country_origin VARCHAR(2),  -- ISO 2-letter code
    excluded_countries TEXT[],
    headquarters VARCHAR(100),
    year_founded INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_security_scan TIMESTAMP,
    last_monthly_update TIMESTAMP
);

-- 1.4 Product Type Mapping (many-to-many for multi-type support)
CREATE TABLE IF NOT EXISTS product_type_mapping (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type_id INTEGER NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, type_id)
);

-- ============================================================
-- SECTION 2: NORMS AND EVALUATIONS
-- ============================================================

-- 2.1 SAFE Norms
CREATE TABLE IF NOT EXISTS norms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    pillar CHAR(1) CHECK (pillar IN ('S', 'A', 'F', 'E')),
    title VARCHAR(200),
    description TEXT,

    -- Classification flags
    is_essential BOOLEAN DEFAULT FALSE,
    consumer BOOLEAN DEFAULT FALSE,
    "full" BOOLEAN DEFAULT TRUE,

    -- Classification metadata
    classification_method VARCHAR(20) DEFAULT 'manual',
    classification_date TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 2.2 Norm Applicability by Product Type
CREATE TABLE IF NOT EXISTS norm_applicability (
    norm_id INTEGER REFERENCES norms(id) ON DELETE CASCADE,
    type_id INTEGER REFERENCES product_types(id) ON DELETE CASCADE,
    is_applicable BOOLEAN DEFAULT TRUE,
    applicability_reason TEXT,
    PRIMARY KEY (norm_id, type_id)
);

-- 2.3 Evaluations (AI results)
CREATE TABLE IF NOT EXISTS evaluations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    norm_id INTEGER REFERENCES norms(id) ON DELETE CASCADE,
    result VARCHAR(10) CHECK (result IN ('YES', 'YESp', 'NO', 'TBD', 'N/A')),
    why_this_result TEXT,  -- AI explanation
    evaluated_by VARCHAR(50) NOT NULL,  -- 'mistral', 'gemini', 'ollama'
    evaluation_date TIMESTAMP DEFAULT NOW(),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,

    UNIQUE(product_id, norm_id, evaluation_date)
);

-- ============================================================
-- SECTION 3: SAFE SCORING SYSTEM
-- ============================================================

-- 3.1 SAFE Methodology
CREATE TABLE IF NOT EXISTS safe_methodology (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name VARCHAR(100) NOT NULL DEFAULT 'SAFE SCORING',
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    description TEXT,
    formula TEXT,
    pillars JSONB,
    score_categories JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3.2 SAFE Pillar Definitions
CREATE TABLE IF NOT EXISTS safe_pillar_definitions (
    id SERIAL PRIMARY KEY,
    pillar_code CHAR(1) NOT NULL UNIQUE,
    pillar_name VARCHAR(100) NOT NULL,
    definition TEXT NOT NULL,
    includes TEXT[] NOT NULL,
    excludes TEXT[],
    typical_norm_ranges TEXT[],
    metrics TEXT[] NOT NULL,
    hardware_criteria JSONB,
    software_criteria JSONB,
    keywords TEXT[],
    example_norms TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '2.0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3.3 Consumer Type Definitions (Essential/Consumer/Full)
CREATE TABLE IF NOT EXISTS consumer_type_definitions (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(20) NOT NULL UNIQUE,
    type_name VARCHAR(50) NOT NULL,
    definition TEXT NOT NULL,
    target_audience TEXT,
    inclusion_criteria TEXT[] NOT NULL,
    exclusion_criteria TEXT[],
    keywords TEXT[],
    negative_keywords TEXT[],
    example_norms TEXT[],
    counter_examples TEXT[],
    target_percentage DECIMAL(5,2),
    priority_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3.4 SAFE Scoring Definitions (norm classifications)
CREATE TABLE IF NOT EXISTS safe_scoring_definitions (
    id SERIAL PRIMARY KEY,
    norm_id INTEGER REFERENCES norms(id) ON DELETE CASCADE UNIQUE,
    is_essential BOOLEAN DEFAULT FALSE,
    is_consumer BOOLEAN DEFAULT FALSE,
    is_full BOOLEAN DEFAULT TRUE,
    classification_method VARCHAR(30) DEFAULT 'manual',
    classification_reason TEXT,
    classification_confidence DECIMAL(3,2) DEFAULT 1.0,
    classified_at TIMESTAMP DEFAULT NOW(),
    classified_by VARCHAR(100),
    criteria_security_impact INTEGER DEFAULT 0,
    criteria_user_relevance INTEGER DEFAULT 0,
    criteria_complexity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3.5 SAFE Scoring Results (per product)
CREATE TABLE IF NOT EXISTS safe_scoring_results (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE UNIQUE,

    -- Full scores
    note_finale DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),

    -- Consumer scores
    note_consumer DECIMAL(5,2),
    s_consumer DECIMAL(5,2),
    a_consumer DECIMAL(5,2),
    f_consumer DECIMAL(5,2),
    e_consumer DECIMAL(5,2),

    -- Essential scores
    note_essential DECIMAL(5,2),
    s_essential DECIMAL(5,2),
    a_essential DECIMAL(5,2),
    f_essential DECIMAL(5,2),
    e_essential DECIMAL(5,2),

    -- Statistics
    total_norms_evaluated INTEGER DEFAULT 0,
    total_yes INTEGER DEFAULT 0,
    total_no INTEGER DEFAULT 0,
    total_na INTEGER DEFAULT 0,
    total_tbd INTEGER DEFAULT 0,

    calculated_at TIMESTAMP DEFAULT NOW(),
    last_evaluation_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SECTION 4: USERS & AUTHENTICATION
-- ============================================================
-- Unified table supporting NextAuth + Lemon Squeezy + Stripe

-- 4.1 Users (NextAuth compatible)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    image VARCHAR(500),
    email_verified TIMESTAMP,

    -- Lemon Squeezy integration
    lemon_squeezy_customer_id VARCHAR(100),
    lemon_squeezy_subscription_id VARCHAR(100),

    -- Stripe integration (alternative)
    stripe_customer_id VARCHAR(100),

    -- Subscription
    price_id VARCHAR(100),
    has_access BOOLEAN DEFAULT FALSE,
    subscription_id INTEGER,  -- FK added after subscriptions table

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4.2 Accounts (OAuth providers)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, provider_account_id)
);

-- 4.3 Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL
);

-- 4.4 Verification Tokens (email magic links)
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- 4.5 Leads (landing page signups)
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SECTION 5: SUBSCRIPTIONS & BUSINESS
-- ============================================================

-- 5.1 Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50),
    max_setups INTEGER DEFAULT 5,
    max_products INTEGER DEFAULT 50,
    price_monthly DECIMAL(10,2) DEFAULT 0.00,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5.2 Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES subscription_plans(id),

    -- Payment provider IDs
    stripe_id VARCHAR(100),
    lemon_squeezy_id VARCHAR(100),

    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    current_period_end TIMESTAMP,

    UNIQUE(user_id, status)
);

-- Add FK from users to subscriptions (now that table exists)
ALTER TABLE users
ADD CONSTRAINT fk_users_subscription
FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

-- 5.3 User Setups (multi-product configurations)
CREATE TABLE IF NOT EXISTS user_setups (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    products JSONB DEFAULT '[]'::jsonb,
    combined_score JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (jsonb_typeof(products) = 'array')
);

-- ============================================================
-- SECTION 6: SECURITY & ALERTS
-- ============================================================

-- 6.1 Security Alerts (CVE)
CREATE TABLE IF NOT EXISTS security_alerts (
    id SERIAL PRIMARY KEY,
    cve_id VARCHAR(20) UNIQUE NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(200),
    description TEXT,
    affected_ids INTEGER[] DEFAULT '{}',
    source_url VARCHAR(255),
    published_date DATE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6.2 Alert User Matches
CREATE TABLE IF NOT EXISTS alert_user_matches (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES security_alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    setup_id INTEGER REFERENCES user_setups(id) ON DELETE CASCADE,
    notified_at TIMESTAMP,
    notification_method VARCHAR(20),
    notification_status VARCHAR(20) DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(alert_id, user_id, setup_id)
);

-- 6.4 Claim Requests
CREATE TABLE IF NOT EXISTS claim_requests (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_slug VARCHAR(100),

    -- Company info
    company_name VARCHAR(200) NOT NULL,
    website VARCHAR(500),

    -- Contact info
    contact_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    message TEXT,

    -- Social links
    social_links JSONB DEFAULT '{}',

    -- Verification
    domain_match BOOLEAN DEFAULT FALSE,
    dns_verified BOOLEAN DEFAULT FALSE,
    dns_token VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'dns_verified', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_email ON claim_requests(email);

-- ============================================================
-- SECTION 7: MOAT FEATURES
-- ============================================================

-- 7.1 Score History
CREATE TABLE IF NOT EXISTS score_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT NOW(),

    -- Score snapshots
    safe_score DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),
    consumer_score DECIMAL(5,2),
    essential_score DECIMAL(5,2),

    -- Statistics
    total_evaluations INTEGER DEFAULT 0,
    total_yes INTEGER DEFAULT 0,
    total_no INTEGER DEFAULT 0,
    total_na INTEGER DEFAULT 0,
    total_tbd INTEGER DEFAULT 0,

    -- Change tracking
    previous_safe_score DECIMAL(5,2),
    score_change DECIMAL(5,2),
    change_reason VARCHAR(200),
    triggered_by VARCHAR(50) DEFAULT 'manual',

    created_at TIMESTAMP DEFAULT NOW()
);

-- 7.2 Security Incidents
CREATE TABLE IF NOT EXISTS security_incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'hack', 'exploit', 'vulnerability', 'rug_pull',
        'smart_contract_bug', 'frontend_attack', 'phishing',
        'insider_threat', 'oracle_manipulation', 'bridge_attack',
        'flash_loan_attack', 'other'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    funds_lost_usd DECIMAL(18,2) DEFAULT 0,
    users_affected INTEGER DEFAULT 0,

    -- Score impact
    score_impact_s DECIMAL(5,2) DEFAULT 0,
    score_impact_a DECIMAL(5,2) DEFAULT 0,
    score_impact_f DECIMAL(5,2) DEFAULT 0,
    score_impact_e DECIMAL(5,2) DEFAULT 0,

    affected_product_ids INTEGER[] DEFAULT '{}',

    -- Dates
    incident_date TIMESTAMP NOT NULL,
    discovered_date TIMESTAMP,
    disclosed_date TIMESTAMP,
    resolved_date TIMESTAMP,

    -- Sources
    source_urls TEXT[],
    transaction_hashes TEXT[],
    cve_ids TEXT[],

    -- Response
    response_quality VARCHAR(20) CHECK (response_quality IN ('excellent', 'good', 'adequate', 'poor', 'none')),
    funds_recovered_usd DECIMAL(18,2) DEFAULT 0,
    postmortem_url VARCHAR(500),

    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('investigating', 'confirmed', 'active', 'contained', 'resolved', 'disputed')),
    is_published BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- 7.3 Incident Product Impact
CREATE TABLE IF NOT EXISTS incident_product_impact (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES security_incidents(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    impact_level VARCHAR(20) CHECK (impact_level IN ('direct', 'indirect', 'dependency', 'same_codebase')),
    funds_lost_usd DECIMAL(18,2) DEFAULT 0,
    users_affected INTEGER DEFAULT 0,
    score_adjustment_s DECIMAL(5,2) DEFAULT 0,
    score_adjustment_a DECIMAL(5,2) DEFAULT 0,
    score_adjustment_f DECIMAL(5,2) DEFAULT 0,
    score_adjustment_e DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(incident_id, product_id)
);

-- ============================================================
-- SECTION 7B: COMPATIBILITY MATRIX (Type x Type & Product x Product)
-- ============================================================

-- 7B.1 Type Compatibility (21 types × 21 types = 441 combinations)
-- Determines baseline compatibility between product TYPES
CREATE TABLE IF NOT EXISTS type_compatibility (
    id SERIAL PRIMARY KEY,
    type_a_id INTEGER NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
    type_b_id INTEGER NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,

    -- Compatibility result
    is_compatible BOOLEAN DEFAULT TRUE,
    compatibility_level VARCHAR(20) DEFAULT 'partial' CHECK (
        compatibility_level IN ('native', 'partial', 'via_bridge', 'incompatible')
    ),

    -- Connection details
    base_method TEXT,  -- How these types typically connect
    description TEXT,  -- Why they are/aren't compatible

    -- Analysis metadata
    analyzed_by VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'ai_mistral', 'ai_gemini', 'ai_auto'
    analyzed_at TIMESTAMP DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Unique constraint for the pair (both directions)
    UNIQUE(type_a_id, type_b_id)
);

-- 7B.2 Product Compatibility (Product × Product)
-- Specific compatibility between individual products, enriched by AI + scraping
CREATE TABLE IF NOT EXISTS product_compatibility (
    id SERIAL PRIMARY KEY,
    product_a_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_b_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Type-level compatibility (cached from type_compatibility)
    type_compatible BOOLEAN DEFAULT TRUE,

    -- AI analysis results
    ai_compatible BOOLEAN DEFAULT NULL,  -- NULL = not yet analyzed
    ai_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    ai_method VARCHAR(500),  -- Connection/integration method
    ai_steps TEXT,  -- Step-by-step integration guide (max 1000 chars)
    ai_limitations TEXT,  -- Known limitations or requirements (max 500 chars)
    ai_justification TEXT,  -- AI explanation of WHY products are compatible/incompatible
    ai_confidence_factors VARCHAR(300),  -- Factors used to calculate confidence (+official_docs +same_network etc.)

    -- Analysis metadata
    analyzed_at TIMESTAMP,
    analyzed_by VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'ai_scraper', 'manual', 'ai_mistral', etc.

    -- Scraping metadata
    scraped_content_a_hash VARCHAR(64),  -- Hash of scraped content for cache invalidation
    scraped_content_b_hash VARCHAR(64),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Unique constraint for the pair
    UNIQUE(product_a_id, product_b_id)
);

-- 7B.3 Compatibility Use Cases (optional - for common integration patterns)
CREATE TABLE IF NOT EXISTS compatibility_use_cases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Involved type pairs (JSONB array)
    type_pairs JSONB DEFAULT '[]'::jsonb,  -- [{"type_a": "HW_COLD", "type_b": "SW_BROWSER"}]

    -- Category of use case
    category VARCHAR(50) CHECK (category IN (
        'security_storage',      -- TX signing, backup/recovery, cold→hot
        'connection_access',     -- Web3 interface, WalletConnect, hardware connection
        'defi_trading',          -- Composability, liquidity, collateral & mint
        'cross_chain',           -- Bridge, multi-chain
        'custody_management',    -- Multisig, institutional
        'other'
    )),

    -- Example products (JSONB array of product slugs)
    example_products JSONB DEFAULT '[]'::jsonb,

    -- Typical integration steps
    integration_steps TEXT,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SECTION 8: AUTOMATION & CACHE
-- ============================================================

-- 8.1 Automation Logs
CREATE TABLE IF NOT EXISTS automation_logs (
    id SERIAL PRIMARY KEY,
    run_date TIMESTAMP NOT NULL,
    run_type VARCHAR(20) DEFAULT 'monthly' CHECK (run_type IN ('daily', 'weekly', 'monthly', 'manual')),
    products_updated INTEGER DEFAULT 0,
    evaluations_count INTEGER DEFAULT 0,
    alerts_created INTEGER DEFAULT 0,
    ai_service VARCHAR(50),
    duration_sec INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (jsonb_typeof(errors) = 'array')
);

-- 8.2 Scrape Cache
CREATE TABLE IF NOT EXISTS scrape_cache (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(255) NOT NULL,
    content_hash VARCHAR(64),
    scraped_at TIMESTAMP DEFAULT NOW(),
    raw_content TEXT,
    raw_specs JSONB DEFAULT '{}'::jsonb,
    status_code INTEGER,
    scrape_duration_ms INTEGER,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(product_id, url)
);

-- 8.3 AI Usage Stats
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    service VARCHAR(50) NOT NULL,
    requests INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0.0000,
    avg_response_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.0,
    errors_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, service)
);

-- ============================================================
-- SECTION 9: INDEXES
-- ============================================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_type_id ON products(type_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_security_status ON products(security_status);
CREATE INDEX IF NOT EXISTS idx_products_last_scan ON products(last_security_scan);
CREATE INDEX IF NOT EXISTS idx_products_monthly_update ON products(last_monthly_update);
CREATE INDEX IF NOT EXISTS idx_products_country_origin ON products(country_origin);
CREATE INDEX IF NOT EXISTS idx_products_year_founded ON products(year_founded);
CREATE INDEX IF NOT EXISTS idx_products_specs_gin ON products USING GIN(specs);
CREATE INDEX IF NOT EXISTS idx_products_scores_gin ON products USING GIN(scores);

-- Product Type Mapping
CREATE INDEX IF NOT EXISTS idx_ptm_product_id ON product_type_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_ptm_type_id ON product_type_mapping(type_id);
CREATE INDEX IF NOT EXISTS idx_ptm_is_primary ON product_type_mapping(is_primary);

-- Norms
CREATE INDEX IF NOT EXISTS idx_norms_pillar ON norms(pillar);

-- Norm Applicability
CREATE INDEX IF NOT EXISTS idx_norm_applicability_type ON norm_applicability(type_id);
CREATE INDEX IF NOT EXISTS idx_norm_applicability_norm ON norm_applicability(norm_id);

-- Evaluations
CREATE INDEX IF NOT EXISTS idx_evaluations_product_id ON evaluations(product_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_norm_id ON evaluations(norm_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON evaluations(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_evaluations_result ON evaluations(result);

-- SAFE Scoring
CREATE INDEX IF NOT EXISTS idx_ssd_norm_id ON safe_scoring_definitions(norm_id);
CREATE INDEX IF NOT EXISTS idx_ssd_essential ON safe_scoring_definitions(is_essential);
CREATE INDEX IF NOT EXISTS idx_ssd_consumer ON safe_scoring_definitions(is_consumer);
CREATE INDEX IF NOT EXISTS idx_ssd_method ON safe_scoring_definitions(classification_method);

CREATE INDEX IF NOT EXISTS idx_ssr_product_id ON safe_scoring_results(product_id);
CREATE INDEX IF NOT EXISTS idx_ssr_note_finale ON safe_scoring_results(note_finale DESC);
CREATE INDEX IF NOT EXISTS idx_ssr_note_consumer ON safe_scoring_results(note_consumer DESC);
CREATE INDEX IF NOT EXISTS idx_ssr_note_essential ON safe_scoring_results(note_essential DESC);
CREATE INDEX IF NOT EXISTS idx_ssr_calculated_at ON safe_scoring_results(calculated_at);

CREATE INDEX IF NOT EXISTS idx_ctd_type_code ON consumer_type_definitions(type_code);
CREATE INDEX IF NOT EXISTS idx_ctd_active ON consumer_type_definitions(is_active);

CREATE INDEX IF NOT EXISTS idx_spd_pillar_code ON safe_pillar_definitions(pillar_code);
CREATE INDEX IF NOT EXISTS idx_spd_active ON safe_pillar_definitions(is_active);

-- Users & Auth
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_lemon_squeezy ON users(lemon_squeezy_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_squeezy ON subscriptions(lemon_squeezy_id);

-- User Setups
CREATE INDEX IF NOT EXISTS idx_user_setups_user_id ON user_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_setups_products_gin ON user_setups USING GIN(products);

-- Security Alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_published ON security_alerts(is_published);
CREATE INDEX IF NOT EXISTS idx_security_alerts_affected_ids ON security_alerts USING GIN(affected_ids);

-- Score History
CREATE INDEX IF NOT EXISTS idx_score_history_product_id ON score_history(product_id);
CREATE INDEX IF NOT EXISTS idx_score_history_recorded_at ON score_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_score_history_product_date ON score_history(product_id, recorded_at DESC);

-- Security Incidents
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON security_incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_published ON security_incidents(is_published);
CREATE INDEX IF NOT EXISTS idx_incidents_affected_products ON security_incidents USING GIN(affected_product_ids);

-- Incident Product Impact
CREATE INDEX IF NOT EXISTS idx_ipi_incident ON incident_product_impact(incident_id);
CREATE INDEX IF NOT EXISTS idx_ipi_product ON incident_product_impact(product_id);

-- Automation
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_date ON automation_logs(run_date);
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_type ON automation_logs(run_type);
CREATE INDEX IF NOT EXISTS idx_scrape_cache_expires ON scrape_cache(expires_at);

-- Composite indexes for performance optimization (MVP1)
CREATE INDEX IF NOT EXISTS idx_ptm_type_product ON product_type_mapping(type_id, product_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_product_norm ON evaluations(product_id, norm_id);
CREATE INDEX IF NOT EXISTS idx_ipi_product_incident ON incident_product_impact(product_id, incident_id);
CREATE INDEX IF NOT EXISTS idx_ssd_essential_full ON safe_scoring_definitions(is_essential, is_full);

-- Type Compatibility indexes
CREATE INDEX IF NOT EXISTS idx_type_compat_type_a ON type_compatibility(type_a_id);
CREATE INDEX IF NOT EXISTS idx_type_compat_type_b ON type_compatibility(type_b_id);
CREATE INDEX IF NOT EXISTS idx_type_compat_level ON type_compatibility(compatibility_level);
CREATE INDEX IF NOT EXISTS idx_type_compat_is_compatible ON type_compatibility(is_compatible);
CREATE INDEX IF NOT EXISTS idx_type_compat_pair ON type_compatibility(type_a_id, type_b_id);

-- Product Compatibility indexes
CREATE INDEX IF NOT EXISTS idx_product_compat_a ON product_compatibility(product_a_id);
CREATE INDEX IF NOT EXISTS idx_product_compat_b ON product_compatibility(product_b_id);
CREATE INDEX IF NOT EXISTS idx_product_compat_pair ON product_compatibility(product_a_id, product_b_id);
CREATE INDEX IF NOT EXISTS idx_product_compat_ai_compatible ON product_compatibility(ai_compatible);
CREATE INDEX IF NOT EXISTS idx_product_compat_type_compatible ON product_compatibility(type_compatible);
CREATE INDEX IF NOT EXISTS idx_product_compat_analyzed_at ON product_compatibility(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_compat_confidence ON product_compatibility(ai_confidence DESC);

-- Compatibility Use Cases indexes
CREATE INDEX IF NOT EXISTS idx_compat_use_cases_category ON compatibility_use_cases(category);
CREATE INDEX IF NOT EXISTS idx_compat_use_cases_active ON compatibility_use_cases(is_active);
CREATE INDEX IF NOT EXISTS idx_compat_use_cases_type_pairs ON compatibility_use_cases USING GIN(type_pairs);

-- ============================================================
-- SECTION 10: FUNCTIONS & TRIGGERS
-- ============================================================

-- 10.1 Update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_product_types_updated_at ON product_types;
CREATE TRIGGER update_product_types_updated_at
    BEFORE UPDATE ON product_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_setups_updated_at ON user_setups;
CREATE TRIGGER update_user_setups_updated_at
    BEFORE UPDATE ON user_setups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_usage_stats_updated_at ON ai_usage_stats;
CREATE TRIGGER update_ai_usage_stats_updated_at
    BEFORE UPDATE ON ai_usage_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ssd_updated_at ON safe_scoring_definitions;
CREATE TRIGGER update_ssd_updated_at
    BEFORE UPDATE ON safe_scoring_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ssr_updated_at ON safe_scoring_results;
CREATE TRIGGER update_ssr_updated_at
    BEFORE UPDATE ON safe_scoring_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10.2 Sync definitions to norms table
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

DROP TRIGGER IF EXISTS sync_definitions_trigger ON safe_scoring_definitions;
CREATE TRIGGER sync_definitions_trigger
    AFTER INSERT OR UPDATE ON safe_scoring_definitions
    FOR EACH ROW EXECUTE FUNCTION sync_definitions_to_norms();

-- 10.3 Get product type IDs
CREATE OR REPLACE FUNCTION get_product_type_ids(p_product_id INTEGER)
RETURNS INTEGER[] AS $$
DECLARE
    result INTEGER[];
BEGIN
    SELECT ARRAY_AGG(type_id ORDER BY is_primary DESC)
    INTO result
    FROM product_type_mapping
    WHERE product_id = p_product_id;

    IF result IS NULL OR array_length(result, 1) IS NULL THEN
        SELECT ARRAY[type_id]
        INTO result
        FROM products
        WHERE id = p_product_id AND type_id IS NOT NULL;
    END IF;

    RETURN COALESCE(result, '{}');
END;
$$ LANGUAGE plpgsql;

-- 10.4 Get product applicable norms
CREATE OR REPLACE FUNCTION get_product_applicable_norms(p_product_id INTEGER)
RETURNS TABLE(norm_id INTEGER, is_applicable BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        na.norm_id,
        TRUE as is_applicable
    FROM product_type_mapping ptm
    JOIN norm_applicability na ON ptm.type_id = na.type_id
    WHERE ptm.product_id = p_product_id
    AND na.is_applicable = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10.5 Check user limits
CREATE OR REPLACE FUNCTION check_user_limits(user_uuid UUID)
RETURNS TABLE (
    can_create_setup BOOLEAN,
    can_add_product BOOLEAN,
    setups_remaining INTEGER,
    products_remaining INTEGER
) AS $$
DECLARE
    max_setups_limit INTEGER;
    max_products_limit INTEGER;
    current_setups_count INTEGER;
    current_products_count INTEGER;
BEGIN
    SELECT sp.max_setups, sp.max_products
    INTO max_setups_limit, max_products_limit
    FROM users u
    LEFT JOIN subscriptions s ON u.subscription_id = s.id
    LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE u.id = user_uuid;

    max_setups_limit := COALESCE(max_setups_limit, 1);
    max_products_limit := COALESCE(max_products_limit, 10);

    SELECT COUNT(*) INTO current_setups_count
    FROM user_setups WHERE user_id = user_uuid;

    SELECT COALESCE(SUM(jsonb_array_length(products)), 0) INTO current_products_count
    FROM user_setups WHERE user_id = user_uuid;

    RETURN QUERY SELECT
        current_setups_count < max_setups_limit,
        current_products_count < max_products_limit,
        max_setups_limit - current_setups_count,
        max_products_limit - current_products_count;
END;
$$ LANGUAGE plpgsql;

-- 10.6 Record score history
CREATE OR REPLACE FUNCTION record_score_history(
    p_product_id INTEGER,
    p_triggered_by VARCHAR(50) DEFAULT 'manual',
    p_change_reason VARCHAR(200) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_scores RECORD;
    v_previous RECORD;
    v_new_id INTEGER;
    v_score_change DECIMAL(5,2);
BEGIN
    SELECT
        ssr.note_finale as safe_score,
        ssr.score_s,
        ssr.score_a,
        ssr.score_f,
        ssr.score_e,
        ssr.note_consumer as consumer_score,
        ssr.note_essential as essential_score,
        ssr.total_norms_evaluated,
        ssr.total_yes,
        ssr.total_no,
        ssr.total_na,
        ssr.total_tbd
    INTO v_scores
    FROM safe_scoring_results ssr
    WHERE ssr.product_id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No scores found for product: %', p_product_id;
    END IF;

    SELECT safe_score INTO v_previous
    FROM score_history
    WHERE product_id = p_product_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    IF v_previous.safe_score IS NOT NULL AND v_scores.safe_score IS NOT NULL THEN
        v_score_change := v_scores.safe_score - v_previous.safe_score;
    ELSE
        v_score_change := NULL;
    END IF;

    INSERT INTO score_history (
        product_id, recorded_at, safe_score, score_s, score_a, score_f, score_e,
        consumer_score, essential_score, total_evaluations, total_yes, total_no,
        total_na, total_tbd, previous_safe_score, score_change, change_reason, triggered_by
    )
    VALUES (
        p_product_id, NOW(), v_scores.safe_score, v_scores.score_s, v_scores.score_a,
        v_scores.score_f, v_scores.score_e, v_scores.consumer_score, v_scores.essential_score,
        v_scores.total_norms_evaluated, v_scores.total_yes, v_scores.total_no,
        v_scores.total_na, COALESCE(v_scores.total_tbd, 0), v_previous.safe_score,
        v_score_change, p_change_reason, p_triggered_by
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- 10.7 Get score evolution
CREATE OR REPLACE FUNCTION get_score_evolution(
    p_product_id INTEGER,
    p_limit INTEGER DEFAULT 12
)
RETURNS TABLE (
    recorded_at TIMESTAMP,
    safe_score DECIMAL(5,2),
    score_s DECIMAL(5,2),
    score_a DECIMAL(5,2),
    score_f DECIMAL(5,2),
    score_e DECIMAL(5,2),
    score_change DECIMAL(5,2),
    change_reason VARCHAR(200)
) AS $$
BEGIN
    RETURN QUERY
    SELECT sh.recorded_at, sh.safe_score, sh.score_s, sh.score_a, sh.score_f,
           sh.score_e, sh.score_change, sh.change_reason
    FROM score_history sh
    WHERE sh.product_id = p_product_id
    ORDER BY sh.recorded_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 10.8 Get product incidents
CREATE OR REPLACE FUNCTION get_product_incidents(p_product_id INTEGER)
RETURNS TABLE (
    incident_id VARCHAR(50),
    title VARCHAR(300),
    incident_type VARCHAR(50),
    severity VARCHAR(20),
    incident_date TIMESTAMP,
    funds_lost_usd DECIMAL(18,2),
    status VARCHAR(20),
    impact_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT si.incident_id, si.title, si.incident_type, si.severity,
           si.incident_date, si.funds_lost_usd, si.status, ipi.impact_level
    FROM security_incidents si
    JOIN incident_product_impact ipi ON si.id = ipi.incident_id
    WHERE ipi.product_id = p_product_id AND si.is_published = TRUE
    ORDER BY si.incident_date DESC;
END;
$$ LANGUAGE plpgsql;

-- 10.9 AI Classification Helper
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
        norm_id, is_essential, is_consumer, is_full, classification_method,
        classification_reason, classification_confidence, classified_at, classified_by
    ) VALUES (
        p_norm_id, p_is_essential, p_is_consumer, TRUE, p_ai_model,
        p_classification_reason, p_confidence, NOW(), p_ai_model
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

-- 10.10 Get pillar definition
DROP FUNCTION IF EXISTS get_pillar_definition(character);
DROP FUNCTION IF EXISTS get_pillar_definition(char);
CREATE OR REPLACE FUNCTION get_pillar_definition(p_pillar_code CHAR(1))
RETURNS TABLE (
    pillar_name VARCHAR(100),
    definition TEXT,
    includes TEXT[],
    excludes TEXT[],
    metrics TEXT[],
    keywords TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT spd.pillar_name, spd.definition, spd.includes, spd.excludes, spd.metrics, spd.keywords
    FROM safe_pillar_definitions spd
    WHERE spd.pillar_code = p_pillar_code AND spd.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10.11 Suggest pillar for norm
DROP FUNCTION IF EXISTS suggest_pillar_for_norm(text, text);
CREATE OR REPLACE FUNCTION suggest_pillar_for_norm(
    p_norm_title TEXT,
    p_norm_description TEXT
)
RETURNS TABLE (
    suggested_pillar CHAR(1),
    pillar_name VARCHAR(100),
    confidence_reason TEXT
) AS $$
DECLARE
    v_text TEXT;
    v_pillar RECORD;
    v_match_count INTEGER;
    v_best_pillar CHAR(1) := 'S';
    v_best_count INTEGER := 0;
    v_best_name VARCHAR(100);
BEGIN
    v_text := LOWER(p_norm_title || ' ' || COALESCE(p_norm_description, ''));

    FOR v_pillar IN
        SELECT pillar_code, spd.pillar_name, keywords
        FROM safe_pillar_definitions spd
        WHERE is_active = TRUE
    LOOP
        v_match_count := 0;
        FOR i IN 1..array_length(v_pillar.keywords, 1) LOOP
            IF v_text LIKE '%' || LOWER(v_pillar.keywords[i]) || '%' THEN
                v_match_count := v_match_count + 1;
            END IF;
        END LOOP;

        IF v_match_count > v_best_count THEN
            v_best_count := v_match_count;
            v_best_pillar := v_pillar.pillar_code;
            v_best_name := v_pillar.pillar_name;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_best_pillar, v_best_name, 'Matched ' || v_best_count || ' keywords from pillar definition';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10.12 COMPATIBILITY FUNCTIONS
-- ============================================================

-- 10.12.1 Get type compatibility (bidirectional lookup)
CREATE OR REPLACE FUNCTION get_type_compatibility(p_type_a_id INTEGER, p_type_b_id INTEGER)
RETURNS TABLE (
    is_compatible BOOLEAN,
    compatibility_level VARCHAR(20),
    base_method TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT tc.is_compatible, tc.compatibility_level, tc.base_method, tc.description
    FROM type_compatibility tc
    WHERE (tc.type_a_id = p_type_a_id AND tc.type_b_id = p_type_b_id)
       OR (tc.type_a_id = p_type_b_id AND tc.type_b_id = p_type_a_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10.12.2 Get product compatibility (bidirectional lookup)
CREATE OR REPLACE FUNCTION get_product_compatibility(p_product_a_id INTEGER, p_product_b_id INTEGER)
RETURNS TABLE (
    type_compatible BOOLEAN,
    ai_compatible BOOLEAN,
    ai_confidence DECIMAL(3,2),
    ai_confidence_factors VARCHAR(300),
    ai_method VARCHAR(500),
    ai_steps TEXT,
    ai_limitations TEXT,
    ai_justification TEXT,
    analyzed_at TIMESTAMP,
    analyzed_by VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT pc.type_compatible, pc.ai_compatible, pc.ai_confidence, pc.ai_confidence_factors, pc.ai_method,
           pc.ai_steps, pc.ai_limitations, pc.ai_justification, pc.analyzed_at, pc.analyzed_by
    FROM product_compatibility pc
    WHERE (pc.product_a_id = p_product_a_id AND pc.product_b_id = p_product_b_id)
       OR (pc.product_a_id = p_product_b_id AND pc.product_b_id = p_product_a_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10.12.3 Get all compatible products for a given product (multi-type aware)
CREATE OR REPLACE FUNCTION get_compatible_products(p_product_id INTEGER)
RETURNS TABLE (
    product_id INTEGER,
    product_name VARCHAR(200),
    product_slug VARCHAR(100),
    ai_compatible BOOLEAN,
    ai_confidence DECIMAL(3,2),
    ai_method VARCHAR(500),
    compatibility_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE WHEN pc.product_a_id = p_product_id THEN pc.product_b_id ELSE pc.product_a_id END as product_id,
        p.name as product_name,
        p.slug as product_slug,
        pc.ai_compatible,
        pc.ai_confidence,
        pc.ai_method,
        CASE
            WHEN pc.ai_confidence >= 0.8 THEN 'native'::VARCHAR(20)
            WHEN pc.ai_confidence >= 0.5 THEN 'partial'::VARCHAR(20)
            WHEN pc.ai_confidence >= 0.3 THEN 'via_bridge'::VARCHAR(20)
            ELSE 'incompatible'::VARCHAR(20)
        END as compatibility_level
    FROM product_compatibility pc
    JOIN products p ON p.id = CASE WHEN pc.product_a_id = p_product_id THEN pc.product_b_id ELSE pc.product_a_id END
    WHERE (pc.product_a_id = p_product_id OR pc.product_b_id = p_product_id)
      AND pc.ai_compatible = TRUE
    ORDER BY pc.ai_confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- 10.12.4 Get compatibility matrix for a list of products (for user setups)
CREATE OR REPLACE FUNCTION get_setup_compatibility_matrix(p_product_ids INTEGER[])
RETURNS TABLE (
    product_a_id INTEGER,
    product_a_name VARCHAR(200),
    product_b_id INTEGER,
    product_b_name VARCHAR(200),
    is_compatible BOOLEAN,
    ai_confidence DECIMAL(3,2),
    ai_method VARCHAR(500)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pc.product_a_id,
        pa.name as product_a_name,
        pc.product_b_id,
        pb.name as product_b_name,
        COALESCE(pc.ai_compatible, pc.type_compatible) as is_compatible,
        pc.ai_confidence,
        pc.ai_method
    FROM product_compatibility pc
    JOIN products pa ON pa.id = pc.product_a_id
    JOIN products pb ON pb.id = pc.product_b_id
    WHERE pc.product_a_id = ANY(p_product_ids)
      AND pc.product_b_id = ANY(p_product_ids)
    ORDER BY pc.product_a_id, pc.product_b_id;
END;
$$ LANGUAGE plpgsql;

-- 10.12.5 Get best type compatibility for multi-type products
CREATE OR REPLACE FUNCTION get_best_type_compatibility_for_products(p_product_a_id INTEGER, p_product_b_id INTEGER)
RETURNS TABLE (
    type_a_id INTEGER,
    type_a_code VARCHAR(50),
    type_b_id INTEGER,
    type_b_code VARCHAR(50),
    is_compatible BOOLEAN,
    compatibility_level VARCHAR(20),
    base_method TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.type_a_id,
        pta.code as type_a_code,
        tc.type_b_id,
        ptb.code as type_b_code,
        tc.is_compatible,
        tc.compatibility_level,
        tc.base_method
    FROM product_type_mapping ptma
    JOIN product_type_mapping ptmb ON TRUE
    JOIN type_compatibility tc ON
        (tc.type_a_id = ptma.type_id AND tc.type_b_id = ptmb.type_id)
        OR (tc.type_a_id = ptmb.type_id AND tc.type_b_id = ptma.type_id)
    JOIN product_types pta ON pta.id = tc.type_a_id
    JOIN product_types ptb ON ptb.id = tc.type_b_id
    WHERE ptma.product_id = p_product_a_id
      AND ptmb.product_id = p_product_b_id
    ORDER BY
        tc.is_compatible DESC,
        CASE tc.compatibility_level
            WHEN 'native' THEN 1
            WHEN 'partial' THEN 2
            WHEN 'via_bridge' THEN 3
            ELSE 4
        END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10.12.6 Get compatibility statistics
CREATE OR REPLACE FUNCTION get_compatibility_stats()
RETURNS TABLE (
    total_type_pairs INTEGER,
    compatible_type_pairs INTEGER,
    total_product_pairs INTEGER,
    analyzed_product_pairs INTEGER,
    compatible_product_pairs INTEGER,
    avg_confidence DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM type_compatibility) as total_type_pairs,
        (SELECT COUNT(*)::INTEGER FROM type_compatibility WHERE is_compatible = TRUE) as compatible_type_pairs,
        (SELECT COUNT(*)::INTEGER FROM product_compatibility) as total_product_pairs,
        (SELECT COUNT(*)::INTEGER FROM product_compatibility WHERE ai_compatible IS NOT NULL) as analyzed_product_pairs,
        (SELECT COUNT(*)::INTEGER FROM product_compatibility WHERE ai_compatible = TRUE) as compatible_product_pairs,
        (SELECT COALESCE(AVG(ai_confidence), 0)::DECIMAL(3,2) FROM product_compatibility WHERE ai_confidence IS NOT NULL) as avg_confidence;
END;
$$ LANGUAGE plpgsql;

-- 10.13 Auto-record history trigger (INSERT + UPDATE)
-- Records history for both initial scores and score changes
CREATE OR REPLACE FUNCTION trigger_record_score_history_on_results()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT: always record the initial score
    IF TG_OP = 'INSERT' AND NEW.note_finale IS NOT NULL THEN
        INSERT INTO score_history (
            product_id, recorded_at, safe_score, score_s, score_a, score_f, score_e,
            consumer_score, essential_score, total_evaluations, total_yes, total_no,
            total_na, total_tbd, previous_safe_score, score_change, change_reason, triggered_by
        )
        VALUES (
            NEW.product_id, NOW(), NEW.note_finale, NEW.score_s, NEW.score_a,
            NEW.score_f, NEW.score_e, NEW.note_consumer, NEW.note_essential,
            NEW.total_norms_evaluated, NEW.total_yes, NEW.total_no,
            NEW.total_na, COALESCE(NEW.total_tbd, 0), NULL,
            NULL, 'Initial score recording', 'auto_trigger_insert'
        );
        RETURN NEW;
    END IF;

    -- For UPDATE: record when score changes
    IF TG_OP = 'UPDATE' AND OLD.note_finale IS DISTINCT FROM NEW.note_finale THEN
        INSERT INTO score_history (
            product_id, recorded_at, safe_score, score_s, score_a, score_f, score_e,
            consumer_score, essential_score, total_evaluations, total_yes, total_no,
            total_na, total_tbd, previous_safe_score, score_change, change_reason, triggered_by
        )
        VALUES (
            NEW.product_id, NOW(), NEW.note_finale, NEW.score_s, NEW.score_a,
            NEW.score_f, NEW.score_e, NEW.note_consumer, NEW.note_essential,
            NEW.total_norms_evaluated, NEW.total_yes, NEW.total_no,
            NEW.total_na, COALESCE(NEW.total_tbd, 0), OLD.note_finale,
            NEW.note_finale - COALESCE(OLD.note_finale, 0),
            CASE
                WHEN NEW.note_finale > COALESCE(OLD.note_finale, 0) THEN 'Score improved'
                WHEN NEW.note_finale < COALESCE(OLD.note_finale, 100) THEN 'Score decreased'
                ELSE 'Score recalculated'
            END,
            'auto_trigger_update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ssr_score_history ON safe_scoring_results;
CREATE TRIGGER trigger_ssr_score_history
    AFTER INSERT OR UPDATE OF note_finale ON safe_scoring_results
    FOR EACH ROW
    EXECUTE FUNCTION trigger_record_score_history_on_results();

-- ============================================================
-- SECTION 11: VIEWS
-- ============================================================

-- 11.1 Product scores view
CREATE OR REPLACE VIEW product_scores_view AS
SELECT
    p.id, p.name, p.slug, p.risk_score, p.security_status, p.last_security_scan,
    pt.name as type_name, b.name as brand_name,
    COALESCE(
        (SELECT COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM norm_applicability WHERE type_id = p.type_id), 0) * 100
         FROM evaluations e JOIN norms n ON e.norm_id = n.id
         WHERE e.product_id = p.id AND e.result = 'YES'), 0
    ) as safe_score_percent,
    (SELECT COUNT(*) FROM evaluations WHERE product_id = p.id) as evaluations_count
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN brands b ON p.brand_id = b.id;

-- 11.2 Recent automation logs view
CREATE OR REPLACE VIEW recent_automation_logs AS
SELECT
    run_date, run_type, products_updated, evaluations_count, ai_service, duration_sec,
    CASE
        WHEN errors = '[]' THEN 'Success'
        WHEN jsonb_array_length(errors) > 5 THEN 'Many Errors'
        ELSE 'Some Errors'
    END as status
FROM automation_logs
ORDER BY run_date DESC
LIMIT 30;

-- 11.3 Product types view
CREATE OR REPLACE VIEW v_product_types AS
SELECT
    p.id as product_id, p.name as product_name, p.slug,
    ARRAY_AGG(pt.id ORDER BY ptm.is_primary DESC, pt.code) as type_ids,
    ARRAY_AGG(pt.code ORDER BY ptm.is_primary DESC, pt.code) as type_codes,
    ARRAY_AGG(pt.name ORDER BY ptm.is_primary DESC, pt.code) as type_names,
    (SELECT pt2.code FROM product_type_mapping ptm2
     JOIN product_types pt2 ON ptm2.type_id = pt2.id
     WHERE ptm2.product_id = p.id AND ptm2.is_primary = TRUE LIMIT 1) as primary_type_code
FROM products p
LEFT JOIN product_type_mapping ptm ON p.id = ptm.product_id
LEFT JOIN product_types pt ON ptm.type_id = pt.id
GROUP BY p.id, p.name, p.slug;

-- 11.4 User dashboard view
CREATE OR REPLACE VIEW user_dashboard_view AS
SELECT
    u.id, u.email, u.name, u.has_access, u.created_at,
    s.status as subscription_status, sp.code as plan_code, sp.name as plan_name,
    sp.max_setups, sp.max_products,
    (SELECT COUNT(*) FROM user_setups WHERE user_id = u.id) as current_setups
FROM users u
LEFT JOIN subscriptions s ON u.subscription_id = s.id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id;

-- 11.5 SAFE scoring results view
CREATE OR REPLACE VIEW v_safe_scoring_results AS
SELECT
    p.id as product_id, p.name as product_name, p.slug, p.type_id, p.brand_id,
    ssr.note_finale, ssr.score_s, ssr.score_a, ssr.score_f, ssr.score_e,
    ssr.note_consumer, ssr.s_consumer, ssr.a_consumer, ssr.f_consumer, ssr.e_consumer,
    ssr.note_essential, ssr.s_essential, ssr.a_essential, ssr.f_essential, ssr.e_essential,
    ssr.total_norms_evaluated, ssr.total_yes, ssr.total_no, ssr.total_na, ssr.calculated_at
FROM products p
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
ORDER BY ssr.note_finale DESC NULLS LAST;

-- 11.6 Norm definitions view
CREATE OR REPLACE VIEW v_norm_definitions AS
SELECT
    n.id as norm_id, n.code, n.pillar, n.title, n.description,
    COALESCE(ssd.is_essential, n.is_essential, FALSE) as is_essential,
    COALESCE(ssd.is_consumer, n.consumer, FALSE) as is_consumer,
    COALESCE(ssd.is_full, n."full", TRUE) as is_full,
    COALESCE(ssd.classification_method, 'manual') as classification_method,
    ssd.classification_reason, ssd.classification_confidence, ssd.classified_at
FROM norms n
LEFT JOIN safe_scoring_definitions ssd ON n.id = ssd.norm_id
ORDER BY n.pillar, n.code;

-- 11.7 Definition stats by pillar view
CREATE OR REPLACE VIEW v_definition_stats_by_pillar AS
SELECT
    pillar, COUNT(*) as total_norms,
    SUM(CASE WHEN COALESCE(ssd.is_essential, n.is_essential, FALSE) THEN 1 ELSE 0 END) as essential_count,
    SUM(CASE WHEN COALESCE(ssd.is_consumer, n.consumer, FALSE) THEN 1 ELSE 0 END) as consumer_count,
    SUM(CASE WHEN COALESCE(ssd.is_full, n."full", TRUE) THEN 1 ELSE 0 END) as full_count,
    ROUND(SUM(CASE WHEN COALESCE(ssd.is_essential, n.is_essential, FALSE) THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 1) as essential_pct,
    ROUND(SUM(CASE WHEN COALESCE(ssd.is_consumer, n.consumer, FALSE) THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 1) as consumer_pct
FROM norms n
LEFT JOIN safe_scoring_definitions ssd ON n.id = ssd.norm_id
GROUP BY pillar ORDER BY pillar;

-- 11.8 AI pillar context view
CREATE OR REPLACE VIEW v_ai_pillar_context AS
SELECT pillar_code, pillar_name, definition, includes, excludes, keywords, metrics, hardware_criteria, software_criteria
FROM safe_pillar_definitions
WHERE is_active = TRUE ORDER BY pillar_code;

-- 11.9 Classification summary view
CREATE OR REPLACE VIEW v_classification_summary AS
SELECT
    ctd.type_code, ctd.type_name, ctd.target_percentage, ctd.definition,
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
WHERE ctd.is_active = TRUE ORDER BY ctd.priority_order;

-- 11.10 Products with incidents view
CREATE OR REPLACE VIEW v_products_with_incidents AS
SELECT
    p.id, p.name, p.slug, ssr.note_finale as safe_score, ssr.score_s, ssr.score_a, ssr.score_f, ssr.score_e,
    (SELECT COUNT(*) FROM incident_product_impact ipi JOIN security_incidents si ON ipi.incident_id = si.id
     WHERE ipi.product_id = p.id AND si.is_published = TRUE) as incident_count,
    (SELECT SUM(si.funds_lost_usd) FROM incident_product_impact ipi JOIN security_incidents si ON ipi.incident_id = si.id
     WHERE ipi.product_id = p.id) as total_funds_lost,
    (SELECT MAX(si.incident_date) FROM incident_product_impact ipi JOIN security_incidents si ON ipi.incident_id = si.id
     WHERE ipi.product_id = p.id) as last_incident_date
FROM products p
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id;

-- 11.11 Score evolution summary view
CREATE OR REPLACE VIEW v_score_evolution_summary AS
SELECT
    p.id as product_id, p.name as product_name, p.slug,
    ssr.note_finale as current_score,
    (SELECT safe_score FROM score_history WHERE product_id = p.id ORDER BY recorded_at DESC OFFSET 1 LIMIT 1) as previous_score,
    (SELECT ssr.note_finale - sh.safe_score FROM score_history sh
     WHERE sh.product_id = p.id AND sh.recorded_at >= NOW() - INTERVAL '30 days'
     ORDER BY sh.recorded_at ASC LIMIT 1) as change_30d,
    (SELECT COUNT(*) FROM score_history WHERE product_id = p.id) as history_count,
    (SELECT MIN(recorded_at) FROM score_history WHERE product_id = p.id) as first_recorded,
    (SELECT MAX(recorded_at) FROM score_history WHERE product_id = p.id) as last_recorded
FROM products p
LEFT JOIN safe_scoring_results ssr ON p.id = ssr.product_id
WHERE ssr.note_finale IS NOT NULL
ORDER BY current_score DESC NULLS LAST;

-- 11.12 Recent incidents dashboard view
CREATE OR REPLACE VIEW v_recent_incidents AS
SELECT
    si.incident_id, si.title, si.incident_type, si.severity, si.incident_date,
    si.funds_lost_usd, si.status, si.response_quality,
    array_length(si.affected_product_ids, 1) as products_affected_count,
    (SELECT string_agg(p.name, ', ') FROM products p WHERE p.id = ANY(si.affected_product_ids)) as affected_products
FROM security_incidents si
WHERE si.is_published = TRUE
ORDER BY si.incident_date DESC LIMIT 50;

-- 11.13 Methodology stats view
CREATE OR REPLACE VIEW methodology_stats AS
SELECT
    (SELECT COUNT(*) FROM norms) as total_norms,
    (SELECT COUNT(*) FROM norms WHERE "full" = TRUE) as full_norms,
    (SELECT COUNT(*) FROM norms WHERE consumer = TRUE) as consumer_norms,
    (SELECT COUNT(*) FROM norms WHERE is_essential = TRUE) as essential_norms,
    (SELECT COUNT(*) FROM product_types) as total_product_types,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM norm_applicability WHERE is_applicable = TRUE) as applicable_rules;

-- 11.14 Type Compatibility Matrix view
CREATE OR REPLACE VIEW v_type_compatibility_matrix AS
SELECT
    tc.id,
    pta.code as type_a_code,
    pta.name as type_a_name,
    ptb.code as type_b_code,
    ptb.name as type_b_name,
    tc.is_compatible,
    tc.compatibility_level,
    tc.base_method,
    tc.description,
    tc.analyzed_by,
    tc.analyzed_at
FROM type_compatibility tc
JOIN product_types pta ON pta.id = tc.type_a_id
JOIN product_types ptb ON ptb.id = tc.type_b_id
ORDER BY pta.code, ptb.code;

-- 11.15 Product Compatibility view (with product details)
CREATE OR REPLACE VIEW v_product_compatibility AS
SELECT
    pc.id,
    pc.product_a_id,
    pa.name as product_a_name,
    pa.slug as product_a_slug,
    pc.product_b_id,
    pb.name as product_b_name,
    pb.slug as product_b_slug,
    pc.type_compatible,
    pc.ai_compatible,
    pc.ai_confidence,
    pc.ai_confidence_factors,
    pc.ai_method,
    pc.ai_steps,
    pc.ai_limitations,
    pc.ai_justification,
    pc.analyzed_at,
    pc.analyzed_by,
    -- Computed fields
    CASE
        WHEN pc.ai_compatible = TRUE AND pc.ai_confidence >= 0.8 THEN 'high'
        WHEN pc.ai_compatible = TRUE AND pc.ai_confidence >= 0.5 THEN 'medium'
        WHEN pc.ai_compatible = TRUE THEN 'low'
        WHEN pc.ai_compatible = FALSE THEN 'none'
        ELSE 'unknown'
    END as compatibility_score
FROM product_compatibility pc
JOIN products pa ON pa.id = pc.product_a_id
JOIN products pb ON pb.id = pc.product_b_id
ORDER BY pc.ai_confidence DESC NULLS LAST;

-- 11.16 Product Compatibility Summary view (aggregated stats per product)
CREATE OR REPLACE VIEW v_product_compatibility_summary AS
SELECT
    p.id as product_id,
    p.name as product_name,
    p.slug,
    COUNT(DISTINCT pc.id) as total_analyzed,
    COUNT(DISTINCT CASE WHEN pc.ai_compatible = TRUE THEN pc.id END) as compatible_count,
    COUNT(DISTINCT CASE WHEN pc.ai_compatible = FALSE THEN pc.id END) as incompatible_count,
    COUNT(DISTINCT CASE WHEN pc.ai_compatible IS NULL THEN pc.id END) as pending_count,
    ROUND(AVG(pc.ai_confidence) * 100, 1) as avg_confidence_pct,
    MAX(pc.analyzed_at) as last_analyzed_at
FROM products p
LEFT JOIN (
    SELECT product_a_id as product_id, id, ai_compatible, ai_confidence, analyzed_at FROM product_compatibility
    UNION ALL
    SELECT product_b_id as product_id, id, ai_compatible, ai_confidence, analyzed_at FROM product_compatibility
) pc ON pc.product_id = p.id
GROUP BY p.id, p.name, p.slug
ORDER BY compatible_count DESC, p.name;

-- 11.17 Type Compatibility Statistics view
CREATE OR REPLACE VIEW v_type_compatibility_stats AS
SELECT
    pt.id as type_id,
    pt.code as type_code,
    pt.name as type_name,
    COUNT(tc.id) as total_pairs,
    SUM(CASE WHEN tc.is_compatible THEN 1 ELSE 0 END) as compatible_count,
    SUM(CASE WHEN NOT tc.is_compatible THEN 1 ELSE 0 END) as incompatible_count,
    ROUND(SUM(CASE WHEN tc.is_compatible THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(tc.id), 0) * 100, 1) as compatibility_rate,
    SUM(CASE WHEN tc.compatibility_level = 'native' THEN 1 ELSE 0 END) as native_count,
    SUM(CASE WHEN tc.compatibility_level = 'partial' THEN 1 ELSE 0 END) as partial_count,
    SUM(CASE WHEN tc.compatibility_level = 'via_bridge' THEN 1 ELSE 0 END) as via_bridge_count
FROM product_types pt
LEFT JOIN (
    SELECT type_a_id as type_id, id, is_compatible, compatibility_level FROM type_compatibility
    UNION ALL
    SELECT type_b_id as type_id, id, is_compatible, compatibility_level FROM type_compatibility
) tc ON tc.type_id = pt.id
GROUP BY pt.id, pt.code, pt.name
ORDER BY compatibility_rate DESC NULLS LAST, pt.code;

-- ============================================================
-- SECTION 12: RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_user_matches ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can insert users" ON users;
CREATE POLICY "Service role can insert users" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to users" ON users;
CREATE POLICY "Service role full access to users" ON users FOR ALL USING (auth.role() = 'service_role');

-- Accounts policies
DROP POLICY IF EXISTS "Service role full access to accounts" ON accounts;
CREATE POLICY "Service role full access to accounts" ON accounts FOR ALL USING (auth.role() = 'service_role');

-- Sessions policies
DROP POLICY IF EXISTS "Service role full access to sessions" ON sessions;
CREATE POLICY "Service role full access to sessions" ON sessions FOR ALL USING (auth.role() = 'service_role');

-- Verification tokens policies
DROP POLICY IF EXISTS "Service role full access to verification_tokens" ON verification_tokens;
CREATE POLICY "Service role full access to verification_tokens" ON verification_tokens FOR ALL USING (auth.role() = 'service_role');

-- Leads policies
DROP POLICY IF EXISTS "Service role full access to leads" ON leads;
CREATE POLICY "Service role full access to leads" ON leads FOR ALL USING (auth.role() = 'service_role');

-- User setups policies
DROP POLICY IF EXISTS "Users can view own setups" ON user_setups;
CREATE POLICY "Users can view own setups" ON user_setups FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own setups" ON user_setups;
CREATE POLICY "Users can insert own setups" ON user_setups FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own setups" ON user_setups;
CREATE POLICY "Users can update own setups" ON user_setups FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own setups" ON user_setups;
CREATE POLICY "Users can delete own setups" ON user_setups FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Alert user matches policies
DROP POLICY IF EXISTS "Users can view own alert matches" ON alert_user_matches;
CREATE POLICY "Users can view own alert matches" ON alert_user_matches FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 13: INITIAL DATA
-- ============================================================

-- Subscription plans
INSERT INTO subscription_plans (code, name, max_setups, max_products, price_monthly, features) VALUES
('free', 'Free', 1, 10, 0.00, '["10 products", "1 setup", "Monthly updates", "Community support"]'),
('basic', 'Basic', 5, 50, 19.99, '["50 products", "5 setups", "Weekly updates", "Email support"]'),
('pro', 'Professional', 20, 200, 49.99, '["200 products", "20 setups", "Daily updates", "Priority support", "API access"]')
ON CONFLICT (code) DO NOTHING;

-- Consumer type definitions
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
    'Important norms for general public users. These norms cover aspects that any non-technical user should verify before using a product.',
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
    'All norms in the SAFE framework. This level includes advanced technical criteria, optimizations, and complete best practices.',
    'Experts, analysts, and advanced users - Complete and detailed evaluation',
    ARRAY[
        'All norms are included by default',
        'Advanced technical criteria',
        'Performance optimizations',
        'Industry best practices',
        'Detailed metrics',
        'Code and architecture analysis'
    ],
    NULL,
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

-- ============================================================
-- SECTION 14: TABLE COMMENTS
-- ============================================================

COMMENT ON TABLE products IS 'Central products table with JSONB specs and auto-calculated scores';
COMMENT ON TABLE evaluations IS 'AI evaluations of SAFE norms per product';
COMMENT ON TABLE automation_logs IS 'Monthly automatic execution logs';
COMMENT ON TABLE score_history IS 'Historical snapshots of product scores - UNIQUE DATA that cannot be copied';
COMMENT ON TABLE security_incidents IS 'Security incidents (hacks, exploits, vulnerabilities) affecting products';
COMMENT ON TABLE incident_product_impact IS 'Junction table linking incidents to affected products';
COMMENT ON TABLE product_type_mapping IS 'Many-to-many relationship between products and types';
COMMENT ON TABLE consumer_type_definitions IS 'Definitions of ESSENTIAL/CONSUMER/FULL classification types';
COMMENT ON TABLE safe_scoring_definitions IS 'Norm classification definitions (essential/consumer/full)';
COMMENT ON TABLE safe_scoring_results IS 'SAFE scoring results per product - Automatically calculated';
COMMENT ON TABLE safe_pillar_definitions IS 'Detailed definitions for each SAFE pillar (S, A, F, E)';
COMMENT ON TABLE safe_methodology IS 'SAFE SCORING Methodology - Pillar and category definitions';

COMMENT ON COLUMN products.specs IS 'Specifications extracted via Gemini/Mistral (JSONB)';
COMMENT ON COLUMN products.scores IS 'Security scores calculated automatically (JSONB)';
COMMENT ON COLUMN user_setups.products IS 'Multi-product configuration with roles (JSONB array)';
COMMENT ON COLUMN evaluations.why_this_result IS 'AI explanation for why this result was given';
COMMENT ON COLUMN product_type_mapping.is_primary IS 'TRUE for the main/primary type used for display';
COMMENT ON COLUMN product_types.is_safe_applicable IS 'TRUE if SAFE cryptographic score applies to this type';

-- ============================================================
-- DONE!
-- ============================================================

SELECT 'MASTER MIGRATION completed successfully! All tables created.' as status;
