-- ============================================================
-- CHECK PRODUCT URLs - Vérification des URLs officielles
-- ============================================================

-- 1. Tous les produits avec leurs URLs (triés par statut URL)
SELECT
    p.id,
    p.slug,
    p.name,
    p.url,
    pt.name as product_type,
    CASE
        WHEN p.url IS NULL OR p.url = '' THEN '❌ MANQUANT'
        ELSE '✅ OK'
    END as url_status
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
ORDER BY
    CASE WHEN p.url IS NULL OR p.url = '' THEN 0 ELSE 1 END,
    p.name;

-- 2. Résumé : Combien ont une URL vs combien n'en ont pas
SELECT
    COUNT(*) as total_products,
    COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END) as with_url,
    COUNT(CASE WHEN url IS NULL OR url = '' THEN 1 END) as without_url,
    ROUND(
        COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END)::numeric / COUNT(*)::numeric * 100,
        1
    ) as percentage_complete
FROM products;

-- 3. Liste des produits SANS URL (à compléter)
SELECT
    p.id,
    p.slug,
    p.name,
    pt.name as product_type
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
WHERE p.url IS NULL OR p.url = ''
ORDER BY p.name;
