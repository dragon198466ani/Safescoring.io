-- ============================================
-- SAFESCORING.IO - Table product_tables
-- Table de référence des produits avec fournisseurs et prix
-- ============================================

-- Créer la table product_tables
CREATE TABLE IF NOT EXISTS product_tables (
    id SERIAL PRIMARY KEY,
    type_product VARCHAR(100),
    name_product VARCHAR(200) NOT NULL,
    supplier VARCHAR(200),
    price DECIMAL(10,2) DEFAULT 0.00,
    link_supplier VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_product_tables_type ON product_tables(type_product);
CREATE INDEX IF NOT EXISTS idx_product_tables_name ON product_tables(name_product);
CREATE INDEX IF NOT EXISTS idx_product_tables_supplier ON product_tables(supplier);

-- Trigger pour updated_at
CREATE TRIGGER update_product_tables_updated_at 
    BEFORE UPDATE ON product_tables 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE product_tables IS 'Table de référence des produits avec informations fournisseurs et prix';
COMMENT ON COLUMN product_tables.type_product IS 'Type de produit (HW Cold, SW Browser, etc.)';
COMMENT ON COLUMN product_tables.name_product IS 'Nom du produit';
COMMENT ON COLUMN product_tables.supplier IS 'Fournisseur/Fabricant';
COMMENT ON COLUMN product_tables.price IS 'Prix en EUR';
COMMENT ON COLUMN product_tables.link_supplier IS 'Lien vers le site du fournisseur';

SELECT 'Table product_tables créée avec succès!' as status;
