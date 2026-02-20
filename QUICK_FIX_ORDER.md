# ⚡ Ordre d'Exécution Correct

## ❌ Erreur Actuelle
```
Error: column "geographic_scope" does not exist
```

**Cause**: Vous avez exécuté le script de vérification AVANT la migration.

---

## ✅ Solution: Exécuter dans le Bon Ordre

### 📍 Étape 1: MIGRATION (OBLIGATOIRE EN PREMIER)

**Fichier**: `config/migrations/011_norms_geographic_scope.sql`

**Actions**:
1. Ouvrir Supabase SQL Editor: https://supabase.com/dashboard/project/xusznpwzhiuzhqvhddxj/sql/new
2. Copier **TOUT** le contenu de `011_norms_geographic_scope.sql` (396 lignes)
3. Coller dans le SQL Editor
4. Cliquer "Run" ou `Ctrl+Enter`

**Résultat attendu**:
```
NOTICE: Normes Adversity existantes: 222
NOTICE: ============================================================
NOTICE: NORMS GEOGRAPHIC DISTRIBUTION
NOTICE: ============================================================
NOTICE: Total norms: 981
NOTICE: Global norms: 920 (93.8%)
NOTICE: Regional norms: 61 (6.2%)
NOTICE:   - EU-specific: 9
NOTICE:   - US-specific: 3
NOTICE: ============================================================
```

Si vous voyez ces NOTICE → ✅ **Succès!**

---

### 📍 Étape 2: VÉRIFICATION (OPTIONNEL, APRÈS)

**Fichier**: `config/migrations/verify_011.sql`

**Actions**:
1. Dans le même SQL Editor
2. Copier le contenu de `verify_011.sql`
3. Coller et exécuter

**Résultat attendu**:
- ✓ Total norms: 981
- ✓ New columns: geographic_scope, regional_details, etc.
- ✓ Standards: CCSS, NIST, ISO, GDPR, MiCA, etc.
- ✅ MIGRATION SUCCESSFUL

---

## 🎯 Vérification Rapide (Alternative)

Au lieu d'exécuter tout `verify_011.sql`, vous pouvez juste faire:

```sql
-- Compter les normes (devrait être 981)
SELECT COUNT(*) FROM norms;

-- Vérifier qu'une nouvelle colonne existe
SELECT code, geographic_scope, issuing_authority
FROM norms
WHERE code = 'S-CCSS-001'
LIMIT 1;
```

Si cette requête retourne une ligne avec `geographic_scope = 'global'` et `issuing_authority = 'C4 - CryptoCurrency Certification Consortium'` → ✅ **Migration réussie!**

---

## 📝 Résumé Visuel

```
INCORRECT ❌:
verify_011.sql → ERROR (colonne n'existe pas)

CORRECT ✅:
011_norms_geographic_scope.sql → Succès (colonnes créées + normes ajoutées)
    ↓
verify_011.sql → Succès (vérification complète)
```

---

## 🆘 Si Problème lors de la Migration

### Erreur: "permission denied"
→ Utiliser le SQL Editor Supabase (pas psql en local)

### Erreur: "column already exists"
→ Normal! La migration utilise `IF NOT EXISTS`, elle peut être ré-exécutée

### Erreur: "duplicate key"
→ Normal! La migration utilise `ON CONFLICT DO NOTHING`

### Aucun NOTICE affiché
→ Vérifier manuellement avec:
```sql
SELECT COUNT(*) FROM norms;
-- Devrait retourner 981 au lieu de 946
```

---

## ✨ Après la Migration Réussie

1. **Vérifier le total**:
   ```sql
   SELECT COUNT(*) FROM norms; -- Devrait être 981
   ```

2. **Voir les nouvelles normes CCSS**:
   ```sql
   SELECT code, title, geographic_scope
   FROM norms
   WHERE code LIKE 'S-CCSS-%';
   ```

3. **Voir les normes EU (GDPR + MiCA)**:
   ```sql
   SELECT code, title, standard_reference
   FROM norms
   WHERE geographic_scope = 'EU';
   ```

4. **Distribution géographique**:
   ```sql
   SELECT geographic_scope, COUNT(*)
   FROM norms
   GROUP BY geographic_scope;
   ```

---

**Prêt?** → [Ouvrir Supabase et exécuter 011_norms_geographic_scope.sql maintenant](https://supabase.com/dashboard/project/xusznpwzhiuzhqvhddxj/sql/new)
