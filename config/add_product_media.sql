-- Migration pour ajouter les médias (photos/vidéos) aux produits
-- Exécuter ce script dans Supabase SQL Editor

-- Colonne pour stocker les URLs des médias (images et vidéos)
ALTER TABLE products ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- Commentaire pour documenter le format attendu
COMMENT ON COLUMN products.media IS 'Array of media objects: [{"url": "https://...", "type": "image|video", "caption": "optional"}]';

-- Exemple d'insertion de médias pour un produit:
-- UPDATE products SET media = '[
--   {"url": "https://example.com/photo1.jpg", "type": "image"},
--   {"url": "https://example.com/photo2.jpg", "type": "image"},
--   {"url": "https://youtube.com/embed/xyz", "type": "video"}
-- ]'::jsonb WHERE slug = 'product-slug';
