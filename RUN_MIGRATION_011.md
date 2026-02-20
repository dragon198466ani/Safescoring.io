# 🚀 Exécution de la Migration 011

## Option 1: Via Supabase Dashboard (Recommandé) ✨

### Étapes:

1. **Ouvrir le SQL Editor**
   ```
   https://supabase.com/dashboard/project/xusznpwzhiuzhqvhddxj/sql/new
   ```

2. **Copier le contenu de la migration**
   - Fichier: `config/migrations/011_norms_geographic_scope.sql`
   - Taille: 396 lignes

3. **Coller dans le SQL Editor**
   - Paste complet
   - Click "Run" (ou Ctrl+Enter)

4. **Vérifier l'exécution**
   - Devrait afficher des NOTICE avec les statistiques
   - Total norms devrait passer de 946 à ~981

5. **Valider les résultats**
   ```sql
   -- Vérifier le nombre total
   SELECT COUNT(*) FROM norms;

   -- Vérifier la distribution géographique
   SELECT geographic_scope, COUNT(*)
   FROM norms
   GROUP BY geographic_scope;

   -- Vérifier les nouveaux standards
   SELECT issuing_authority, COUNT(*)
   FROM norms
   WHERE issuing_authority IS NOT NULL
   GROUP BY issuing_authority
   ORDER BY COUNT(*) DESC;
   ```

---

## Option 2: Via Python Script 🐍

### Pré-requis:
```bash
pip install supabase
```

### Exécution:
```bash
cd scripts
python run_migration_011.py
```

Le script va:
- ✓ Vérifier les stats avant migration
- ✓ Guider pour l'exécution manuelle via Dashboard
- ✓ Vérifier les résultats après migration
- ✓ Afficher les statistiques détaillées

---

## Option 3: Via psql (Linux/Mac/WSL) 🖥️

### Si psql est installé:
```bash
# Définir les variables d'environnement
export PGHOST=db.xusznpwzhiuzhqvhddxj.supabase.co
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=postgres
export PGPASSWORD=your_password_here

# Exécuter la migration
psql -f config/migrations/011_norms_geographic_scope.sql

# Ou utiliser le script de test
cd scripts
chmod +x test_migration_011.sh
./test_migration_011.sh
```

---

## ✅ Vérifications Post-Migration

### 1. Compter les normes
```sql
SELECT COUNT(*) FROM norms;
-- Avant: 946
-- Après: ~981 (946 + 35)
```

### 2. Distribution géographique
```sql
SELECT geographic_scope, COUNT(*) as count,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM norms), 1) as pct
FROM norms
GROUP BY geographic_scope
ORDER BY count DESC;

-- Attendu:
-- global: ~920 (93%)
-- EU: ~9 (1%)
-- US: ~3 (<1%)
```

### 3. Nouveaux standards ajoutés
```sql
SELECT issuing_authority, COUNT(*)
FROM norms
WHERE issuing_authority IS NOT NULL
GROUP BY issuing_authority
ORDER BY COUNT(*) DESC;

-- Devrait inclure:
-- NIST, ISO/IEC, C4, Common Criteria, European Commission,
-- OWASP Foundation, AICPA, etc.
```

### 4. Exemples de nouvelles normes
```sql
-- CCSS norms
SELECT code, title FROM norms WHERE code LIKE 'S-CCSS-%';

-- GDPR norms (EU-specific)
SELECT code, title, geographic_scope FROM norms WHERE code LIKE 'F-GDPR-%';

-- MiCA norms (EU-specific)
SELECT code, title, geographic_scope FROM norms WHERE code LIKE 'F-MICA-%';

-- OWASP mobile security
SELECT code, title FROM norms WHERE code LIKE 'A-OWASP-%';

-- EIP Ethereum standards
SELECT code, title FROM norms WHERE code LIKE 'E-EIP-%';
```

### 5. Tester les nouvelles vues
```sql
-- Vue 1: Normes par géographie
SELECT * FROM v_norms_by_geography;

-- Vue 2: Couverture des standards
SELECT * FROM v_standards_coverage LIMIT 20;

-- Vue 3: Exigences régionales
SELECT * FROM v_regional_requirements;
```

---

## 🎯 Résultats Attendus

### Statistiques

| Métrique | Avant | Après | Ajouté |
|----------|-------|-------|--------|
| Total normes | 946 | ~981 | +35 |
| Normes globales | - | ~920 | - |
| Normes EU | - | ~9 | +9 |
| Normes US | - | ~3 | +3 |
| Standards mappés | Partiel | 12+ | - |

### Nouveaux Standards (35 normes)

| Standard | Nombre | Scope |
|----------|--------|-------|
| CCSS | 4 | Global |
| NIST/FIPS | 3 | Global/US |
| Common Criteria | 3 | Global |
| ISO 27001 | 4 | Global |
| GDPR | 3 | EU |
| MiCA | 3 | EU |
| PCI DSS | 2 | Global |
| OWASP MASVS | 4 | Global |
| SOC 2 | 3 | Global |
| ETSI | 1 | EU |
| EIP | 3 | Global |
| SLIP | 2 | Global |

---

## 🐛 Troubleshooting

### Erreur: "column already exists"
✅ **Normal!** La migration utilise `IF NOT EXISTS`, donc safe à ré-exécuter.

### Erreur: "duplicate key value violates unique constraint"
✅ **Normal!** La migration utilise `ON CONFLICT (code) DO NOTHING`.

### Pas de nouvelles normes ajoutées
❌ Vérifier si les codes existent déjà:
```sql
SELECT code FROM norms WHERE code LIKE '%-CCSS-%' OR code LIKE '%-GDPR-%';
```

### Permission denied
❌ Vérifier les credentials Supabase ou utiliser le Dashboard (Option 1).

---

## 📚 Documentation

Voir [NORMS_GEOGRAPHIC_ENHANCEMENT.md](./NORMS_GEOGRAPHIC_ENHANCEMENT.md) pour:
- Description complète des 35 normes ajoutées
- Mapping vers standards internationaux
- Exemples de requêtes avancées
- FAQ détaillée

---

## ⏭️ Prochaines Étapes

Après validation de la migration:

1. **Mettre à jour le frontend** pour afficher `geographic_scope`
2. **Ajouter filtres** par région dans l'UI produits
3. **Documenter** les nouveaux standards dans `/methodology`
4. **Mettre à jour FAQ** avec info sur les normes régionales
5. **Annoncer** l'enhancement (blog post, changelog)

---

**Questions?** Voir la documentation complète ou ouvrir une issue.
