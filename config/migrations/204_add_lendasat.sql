-- ============================================================================
-- Migration 204: Add Lendasat Product
-- ============================================================================
-- Bitcoin-backed lending platform with Lightning Network integration
-- Website: https://lendasat.com
-- ALREADY APPLIED via scripts/add_lendasat.py
-- ============================================================================

-- 1. Add Brand
INSERT INTO brands (name, website)
VALUES ('Lendasat', 'https://lendasat.com')
ON CONFLICT (name) DO NOTHING;

-- 2. Add Product
INSERT INTO products (
    slug,
    name,
    url,
    description,
    short_description,
    type_id,
    brand_id,
    is_active,
    verified,
    security_status
)
VALUES (
    'lendasat',
    'Lendasat',
    'https://lendasat.com',
    'Bitcoin-backed lending platform offering loans without counterparty risk. Features Lightning Network integration for fast transactions. Users can borrow against their Bitcoin collateral without selling their assets. Focused on Bitcoin-native lending with self-custody principles.',
    'Bitcoin-backed loans via Lightning Network',
    (SELECT id FROM product_types WHERE code = 'Protocol' LIMIT 1),
    (SELECT id FROM brands WHERE name = 'Lendasat'),
    true,
    false,
    'pending'
)
ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    url = EXCLUDED.url,
    is_active = EXCLUDED.is_active;

-- 3. Verify insertion
SELECT
    p.id,
    p.slug,
    p.name,
    pt.code as product_type,
    b.name as brand_name
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.slug = 'lendasat';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
