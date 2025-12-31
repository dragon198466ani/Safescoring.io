-- ============================================
-- SAFESCORING - TRIGGERS & QUEUE SYSTEM
-- ============================================
-- Execute this SQL in Supabase SQL Editor
-- Adapte au schema existant de SafeScoring
-- ============================================

-- ===========================================
-- TABLE: Task Queue
-- ===========================================
CREATE TABLE IF NOT EXISTS task_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type VARCHAR(50) NOT NULL,
    target_id INTEGER,
    target_type VARCHAR(20),
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending',
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    retries INTEGER DEFAULT 0
);

-- Index pour traitement efficace
CREATE INDEX IF NOT EXISTS idx_queue_status_priority
ON task_queue(status, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_queue_created
ON task_queue(created_at DESC);

-- ===========================================
-- TABLE: Scrape Cache
-- ===========================================
CREATE TABLE IF NOT EXISTS scrape_cache (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    content TEXT,
    content_hash VARCHAR(64),
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_cache_url ON scrape_cache(url);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON scrape_cache(expires_at);

-- ===========================================
-- TABLE: Automation Logs
-- ===========================================
CREATE TABLE IF NOT EXISTS automation_logs (
    id SERIAL PRIMARY KEY,
    run_date TIMESTAMPTZ DEFAULT NOW(),
    run_type VARCHAR(50),
    products_processed INTEGER DEFAULT 0,
    norms_evaluated INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    duration_sec NUMERIC,
    stats JSONB DEFAULT '{}'
);

-- ===========================================
-- Add columns to norms (official_link existe deja)
-- ===========================================
ALTER TABLE norms ADD COLUMN IF NOT EXISTS official_content TEXT;
ALTER TABLE norms ADD COLUMN IF NOT EXISTS official_scraped_at TIMESTAMPTZ;

-- ===========================================
-- Add columns to products
-- ===========================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS scores JSONB DEFAULT '{}';

-- ===========================================
-- TRIGGER: Nouveau produit ajoute
-- ===========================================
-- Utilise 'url' (TEXT) pas 'urls' (JSONB)
CREATE OR REPLACE FUNCTION on_product_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Ajouter tache: classifier le type (si pas deja defini)
    IF NEW.type_id IS NULL THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority, payload)
        VALUES ('classify_type', NEW.id, 'product', 2,
                jsonb_build_object('name', NEW.name, 'slug', NEW.slug));
    END IF;

    -- Ajouter tache: scraper l'URL (si URL fournie)
    IF NEW.url IS NOT NULL AND NEW.url != '' THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority, payload)
        VALUES ('scrape_product', NEW.id, 'product', 3,
                jsonb_build_object('url', NEW.url));
    ELSE
        -- Si pas d'URL mais type defini, evaluer directement
        IF NEW.type_id IS NOT NULL THEN
            INSERT INTO task_queue (task_type, target_id, target_type, priority)
            VALUES ('evaluate_product', NEW.id, 'product', 4);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_insert ON products;
CREATE TRIGGER trigger_product_insert
AFTER INSERT ON products
FOR EACH ROW EXECUTE FUNCTION on_product_insert();

-- ===========================================
-- TRIGGER: Produit modifie
-- ===========================================
CREATE OR REPLACE FUNCTION on_product_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Si specs changees -> re-evaluer
    IF OLD.specs IS DISTINCT FROM NEW.specs AND NEW.specs IS NOT NULL THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority)
        VALUES ('evaluate_product', NEW.id, 'product', 3);
    END IF;

    -- Si type change -> re-evaluer avec nouvelles normes
    IF OLD.type_id IS DISTINCT FROM NEW.type_id AND NEW.type_id IS NOT NULL THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority)
        VALUES ('evaluate_product', NEW.id, 'product', 2);
    END IF;

    -- Si URL changee -> re-scraper
    IF OLD.url IS DISTINCT FROM NEW.url AND NEW.url IS NOT NULL AND NEW.url != '' THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority, payload)
        VALUES ('scrape_product', NEW.id, 'product', 3,
                jsonb_build_object('url', NEW.url));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_update ON products;
CREATE TRIGGER trigger_product_update
AFTER UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION on_product_update();

-- ===========================================
-- TRIGGER: Nouvelle norme ajoutee
-- ===========================================
-- Utilise 'official_link' pas 'official_url'
CREATE OR REPLACE FUNCTION on_norm_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Scraper doc officiel si URL fournie
    IF NEW.official_link IS NOT NULL AND NEW.official_link != '' THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority, payload)
        VALUES ('scrape_norm', NEW.id, 'norm', 2,
                jsonb_build_object('url', NEW.official_link));
    END IF;

    -- Evaluer cette norme pour tous les produits concernes
    INSERT INTO task_queue (task_type, target_id, target_type, priority)
    VALUES ('evaluate_norm_all', NEW.id, 'norm', 4);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_norm_insert ON norms;
CREATE TRIGGER trigger_norm_insert
AFTER INSERT ON norms
FOR EACH ROW EXECUTE FUNCTION on_norm_insert();

-- ===========================================
-- TRIGGER: Norme modifiee
-- ===========================================
CREATE OR REPLACE FUNCTION on_norm_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Si URL officielle changee -> re-scraper
    IF OLD.official_link IS DISTINCT FROM NEW.official_link
       AND NEW.official_link IS NOT NULL AND NEW.official_link != '' THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority, payload)
        VALUES ('scrape_norm', NEW.id, 'norm', 2,
                jsonb_build_object('url', NEW.official_link));
    END IF;

    -- Si description changee -> re-evaluer tous les produits
    IF OLD.description IS DISTINCT FROM NEW.description THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority)
        VALUES ('evaluate_norm_all', NEW.id, 'norm', 4);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_norm_update ON norms;
CREATE TRIGGER trigger_norm_update
AFTER UPDATE ON norms
FOR EACH ROW EXECUTE FUNCTION on_norm_update();

-- ===========================================
-- TRIGGER: Nouvelle applicabilite ajoutee
-- ===========================================
CREATE OR REPLACE FUNCTION on_applicability_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Quand une norme devient applicable a un type, evaluer tous les produits de ce type
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_applicable = true AND OLD.is_applicable = false) THEN
        INSERT INTO task_queue (task_type, target_id, target_type, priority, payload)
        SELECT 'evaluate_product', p.id, 'product', 5,
               jsonb_build_object('norm_id', NEW.norm_id)
        FROM products p
        WHERE p.type_id = NEW.product_type_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_applicability_change ON norm_applicability;
CREATE TRIGGER trigger_applicability_change
AFTER INSERT OR UPDATE ON norm_applicability
FOR EACH ROW EXECUTE FUNCTION on_applicability_change();

-- ===========================================
-- FUNCTION: Nettoyer les taches anciennes
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_old_tasks()
RETURNS void AS $$
BEGIN
    -- Supprimer les taches terminees de plus de 7 jours
    DELETE FROM task_queue
    WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '7 days';

    -- Supprimer les taches echouees de plus de 30 jours
    DELETE FROM task_queue
    WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '30 days';

    -- Nettoyer le cache expire
    DELETE FROM scrape_cache
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- FUNCTION: Stats de la queue
-- ===========================================
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS TABLE (
    pending_count BIGINT,
    processing_count BIGINT,
    completed_today BIGINT,
    failed_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'processing'),
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '24 hours'),
        COUNT(*) FILTER (WHERE status = 'failed')
    FROM task_queue;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- DONE!
-- ===========================================
-- Maintenant, chaque INSERT/UPDATE sur products ou norms
-- creera automatiquement les taches dans task_queue
--
-- Pour tester:
--   INSERT INTO products (name, slug, url) VALUES ('Test', 'test', 'https://example.com');
--   SELECT * FROM task_queue;
-- ===========================================
