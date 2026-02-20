-- ============================================
-- EVALUATION PROOFS TABLE
-- Stocke les preuves d'antériorité des évaluations
-- ============================================

CREATE TABLE IF NOT EXISTS evaluation_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Hash et données
    proof_hash TEXT NOT NULL,           -- 0x... SHA256 hash
    proof_data TEXT NOT NULL,           -- JSON canonique pour vérification
    proof_timestamp BIGINT NOT NULL,    -- Unix timestamp ms

    -- Blockchain (optionnel)
    blockchain_tx TEXT,                 -- Transaction hash Polygon
    blockchain_block INTEGER,           -- Block number
    verification_url TEXT,              -- URL Polygonscan

    -- Archive.org (optionnel)
    archive_url TEXT,                   -- URL archive.org

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Index pour recherche rapide
    CONSTRAINT unique_proof_hash UNIQUE (proof_hash)
);

-- Index pour recherche par produit
CREATE INDEX IF NOT EXISTS idx_proofs_product_id ON evaluation_proofs(product_id);
CREATE INDEX IF NOT EXISTS idx_proofs_timestamp ON evaluation_proofs(proof_timestamp DESC);

-- RLS
ALTER TABLE evaluation_proofs ENABLE ROW LEVEL SECURITY;

-- Lecture publique (les preuves sont publiques par design)
CREATE POLICY "Proofs are publicly readable"
    ON evaluation_proofs FOR SELECT
    USING (true);

-- Seul le service peut insérer
CREATE POLICY "Service can insert proofs"
    ON evaluation_proofs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- VUE SIMPLIFIÉE POUR L'API
-- ============================================

CREATE OR REPLACE VIEW product_proof_summary AS
SELECT
    p.id as product_id,
    p.slug as product_slug,
    p.name as product_name,
    COUNT(ep.id) as total_proofs,
    MIN(ep.proof_timestamp) as first_proof_date,
    MAX(ep.proof_timestamp) as latest_proof_date,
    (SELECT proof_hash FROM evaluation_proofs WHERE product_id = p.id ORDER BY proof_timestamp DESC LIMIT 1) as latest_hash,
    (SELECT verification_url FROM evaluation_proofs WHERE product_id = p.id AND verification_url IS NOT NULL ORDER BY proof_timestamp DESC LIMIT 1) as latest_blockchain_url,
    COUNT(ep.blockchain_tx) FILTER (WHERE ep.blockchain_tx IS NOT NULL) as blockchain_proofs_count
FROM products p
LEFT JOIN evaluation_proofs ep ON p.id = ep.product_id
GROUP BY p.id, p.slug, p.name;

-- ============================================
-- TRIGGER: Auto-génération de preuve à chaque mise à jour de score
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_proof()
RETURNS TRIGGER AS $$
DECLARE
    proof_data_json TEXT;
    proof_hash_hex TEXT;
BEGIN
    -- Générer les données canoniques
    proof_data_json := json_build_object(
        'v', 1,
        'p', NEW.product_id,
        'score', ROUND(COALESCE(NEW.note_finale, 0)::numeric, 2),
        'pillars', json_build_object(
            'S', ROUND(COALESCE(NEW.score_s, 0)::numeric, 2),
            'A', ROUND(COALESCE(NEW.score_a, 0)::numeric, 2),
            'F', ROUND(COALESCE(NEW.score_f, 0)::numeric, 2),
            'E', ROUND(COALESCE(NEW.score_e, 0)::numeric, 2)
        ),
        't', EXTRACT(EPOCH FROM NOW()) * 1000
    )::text;

    -- Générer le hash SHA256
    proof_hash_hex := '0x' || encode(sha256(proof_data_json::bytea), 'hex');

    -- Insérer la preuve
    INSERT INTO evaluation_proofs (product_id, proof_hash, proof_data, proof_timestamp)
    VALUES (NEW.product_id, proof_hash_hex, proof_data_json, EXTRACT(EPOCH FROM NOW()) * 1000)
    ON CONFLICT (proof_hash) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur la table des scores
DROP TRIGGER IF EXISTS trigger_auto_proof ON safe_scoring_results;
CREATE TRIGGER trigger_auto_proof
    AFTER INSERT OR UPDATE ON safe_scoring_results
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_proof();

COMMENT ON TABLE evaluation_proofs IS 'Preuves d''antériorité IA-proof pour chaque évaluation';
