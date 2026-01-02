-- ============================================
-- SafeScoring - Row Level Security (RLS) Policies
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- 1. PRODUCTS - Lecture publique, écriture admin seulement
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read" ON products
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "products_admin_write" ON products
FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' IN (SELECT email FROM users WHERE role = 'admin'))
WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM users WHERE role = 'admin'));

-- 2. NORMS - Lecture publique
ALTER TABLE norms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "norms_public_read" ON norms
FOR SELECT TO anon, authenticated
USING (true);

-- 3. EVALUATIONS - Lecture publique
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluations_public_read" ON evaluations
FOR SELECT TO anon, authenticated
USING (true);

-- 4. SAFE_SCORING_RESULTS - Lecture publique
ALTER TABLE safe_scoring_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scores_public_read" ON safe_scoring_results
FOR SELECT TO anon, authenticated
USING (true);

-- 5. PRODUCT_TYPES - Lecture publique
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "types_public_read" ON product_types
FOR SELECT TO anon, authenticated
USING (true);

-- 6. PRODUCT_TYPE_MAPPING - Lecture publique
ALTER TABLE product_type_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "type_mapping_public_read" ON product_type_mapping
FOR SELECT TO anon, authenticated
USING (true);

-- 7. NORM_APPLICABILITY - Lecture publique
ALTER TABLE norm_applicability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applicability_public_read" ON norm_applicability
FOR SELECT TO anon, authenticated
USING (true);

-- 8. USERS - Utilisateurs voient leur propre profil
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile" ON users
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 9. USER_SETUPS - Utilisateurs voient leurs propres setups
ALTER TABLE user_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "setups_own_read" ON user_setups
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "setups_own_write" ON user_setups
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "setups_own_update" ON user_setups
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "setups_own_delete" ON user_setups
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 10. CORRECTIONS - Utilisateurs voient leurs corrections
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corrections_own_read" ON corrections
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "corrections_own_write" ON corrections
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 11. SCORE_HISTORY - Lecture publique
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_public_read" ON score_history
FOR SELECT TO anon, authenticated
USING (true);

-- 12. SECURITY_INCIDENTS - Lecture publique
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_public_read" ON security_incidents
FOR SELECT TO anon, authenticated
USING (true);

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
