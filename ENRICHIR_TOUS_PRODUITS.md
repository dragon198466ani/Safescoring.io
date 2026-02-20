# 🌍 Enrichir TOUS les Produits - Guide Complet

## Vue d'ensemble

Ce guide explique comment enrichir **TOUS** les produits de votre base de données avec les données géographiques (pays d'origine, siège social, pays légaux) via IA automatiquement.

## 🚀 Méthode rapide (Recommandée)

### Étape 1 : Configuration

Créez ou éditez le fichier de configuration :

```bash
# Copier le template
cp config/env_template_free.txt config/env.txt

# Éditer avec vos clés
nano config/env.txt
```

Ajoutez vos clés API :

```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
GOOGLE_API_KEY=votre_clé_gemini_api
MISTRAL_API_KEY=votre_clé_mistral_api
```

### Étape 2 : Test en mode DRY RUN (Simulation)

Testez d'abord sans modifier la base :

```bash
# Windows
python src\automation\enrich_all_products_geography.py --dry-run --missing-only

# Linux/Mac
python src/automation/enrich_all_products_geography.py --dry-run --missing-only
```

Ce mode va :
- ✅ Récupérer tous les produits sans géographie
- ✅ Appeler l'IA pour chaque produit
- ✅ Afficher les résultats
- ❌ **NE PAS** modifier Supabase

### Étape 3 : Enrichissement réel

Une fois satisfait du test :

```bash
# Enrichir SEULEMENT les produits manquants
python src\automation\enrich_all_products_geography.py --missing-only

# OU enrichir TOUS les produits (même ceux déjà enrichis)
python src\automation\enrich_all_products_geography.py
```

## 📋 Options disponibles

```bash
python src\automation\enrich_all_products_geography.py [OPTIONS]

Options:
  --missing-only      Enrichir seulement les produits sans géographie
  --dry-run           Mode simulation (ne modifie pas la base)
  --batch-size N      Nombre de produits par batch (défaut: 10)
  --delay N           Délai en secondes entre requêtes IA (défaut: 1.5)
  -h, --help          Afficher l'aide
```

## 💡 Exemples d'utilisation

### Test rapide (5 premiers produits manquants)

```bash
# Simulation
python src\automation\enrich_all_products_geography.py --dry-run --missing-only

# Production
python src\automation\enrich_all_products_geography.py --missing-only
```

### Enrichir tous les produits

```bash
# Tous les produits, même ceux déjà enrichis
python src\automation\enrich_all_products_geography.py
```

### Optimiser pour grosse base (rate limiting)

```bash
# Délai de 2 secondes entre requêtes pour éviter les limites API
python src\automation\enrich_all_products_geography.py --delay 2.0 --missing-only
```

## 📊 Sortie attendue

### Mode DRY RUN

```
🚀 ENRICHISSEMENT COMPLET DES PRODUITS
============================================================
🔑 Supabase: ✅
🤖 Gemini API: ✅
🤖 Mistral API: ✅
📦 Batch size: 10
⏱️  Délai entre requêtes: 1.5s
============================================================

🔍 MODE DRY RUN - Aucune modification
📋 Seulement produits sans géographie
------------------------------------------------------------

📊 45 produits récupérés

🎯 45 produits à enrichir
============================================================

[1/45] 🔍 Ledger Nano X (ledger-nano-x)...
   🌍 Origine: FR
   🏢 Siège: Paris, France
   ✅ Légal: 40 pays (US, CA, GB, FR, DE...)
   🚫 Exclu: CN, KP, IR, SY
   📊 Confiance: high
   🔍 DRY RUN - Pas de mise à jour
   ⏳ Pause 1.5s...

[2/45] 🔍 MetaMask (metamask)...
   🌍 Origine: US
   🏢 Siège: New York, USA
   ✅ Légal: 45 pays (US, CA, GB, FR, DE...)
   🚫 Exclu: CN, KP, IR, SY
   📊 Confiance: high
   🔍 DRY RUN - Pas de mise à jour
   ⏳ Pause 1.5s...

...

============================================================
🎉 ENRICHISSEMENT TERMINÉ!
============================================================
✅ Enrichis: 43/45
⏭️  Skippés: 0/45
❌ Erreurs: 2/45
📊 Taux de succès: 95.6%

⚠️ MODE DRY RUN - Aucune modification apportée
Relancez sans --dry-run pour appliquer les changements
```

### Mode PRODUCTION

Identique mais avec :
```
   ✅ Mis à jour dans Supabase!
```

au lieu de `🔍 DRY RUN - Pas de mise à jour`

## 🎯 Ce qui est enrichi pour chaque produit

Le script enrichit automatiquement :

### 1. **country_origin** (Code ISO 2 lettres)
Pays où le produit a été créé/fondé
```
Exemples:
- Ledger: "FR" (France)
- MetaMask: "US" (USA)
- Binance: "AE" (UAE)
- Trezor: "CZ" (Czech Republic)
```

### 2. **headquarters** (Texte)
Ville et pays du siège social
```
Exemples:
- "Paris, France"
- "New York, USA"
- "Dubai, UAE"
- "Prague, Czech Republic"
```

### 3. **legal_countries** (Array de codes ISO)
Tous les pays où le produit peut être utilisé légalement
```
Exemples:
- Hardware wallets: ["US", "CA", "GB", "FR", "DE", ...] (40 pays)
- Binance: ["AE", "FR", "ES", "IT", ...] (40 pays, exclu US/GB/CN)
- Coinbase: ["US", "CA", "GB", "FR", ...] (15 pays)
- DeFi: ["US", "CA", "GB", "FR", "DE", ...] (45+ pays)
```

### 4. **specs** (JSONB - Historique)
Toutes les infos + métadonnées :
```json
{
  "country_origin": "FR",
  "headquarters": "Paris, France",
  "legal_countries": ["US", "CA", "GB", ...],
  "excluded_countries": ["CN", "KP", "IR", "SY"],
  "geo_confidence": "high",
  "geo_updated_at": "2026-01-03T10:30:00"
}
```

## ⚡ Performance et limites

### Limites API

- **Gemini**: 60 requêtes/minute (rate limit)
- **Mistral**: 5 requêtes/seconde
- **Recommandation**: `--delay 1.5` (40 produits/minute)

### Temps estimés

| Nombre de produits | Temps estimé (delay 1.5s) |
|-------------------|---------------------------|
| 50 produits       | ~1.5 minutes             |
| 100 produits      | ~3 minutes               |
| 200 produits      | ~6 minutes               |
| 500 produits      | ~15 minutes              |

### Optimisations

```bash
# Plus rapide (risque de rate limit)
python src\automation\enrich_all_products_geography.py --delay 1.0

# Plus prudent (aucun risque)
python src\automation\enrich_all_products_geography.py --delay 2.0
```

## 🔍 Vérification après enrichissement

### Dans Supabase SQL Editor

```sql
-- Statistiques globales
SELECT
    COUNT(*) as total_produits,
    COUNT(*) FILTER (WHERE country_origin IS NOT NULL) as avec_origine,
    COUNT(*) FILTER (WHERE headquarters IS NOT NULL) as avec_siege,
    COUNT(*) FILTER (WHERE legal_countries IS NOT NULL) as avec_pays_legaux,
    ROUND(AVG(ARRAY_LENGTH(legal_countries, 1))) as moy_pays_legaux
FROM products;
```

**Résultat attendu :**
```
total_produits | avec_origine | avec_siege | avec_pays_legaux | moy_pays_legaux
---------------|--------------|------------|------------------|----------------
     120       |     120      |    120     |       120        |       35
```

### Voir les produits enrichis

```sql
SELECT
    name,
    country_origin as origine,
    headquarters as siege,
    ARRAY_LENGTH(legal_countries, 1) as nb_pays,
    legal_countries[1:5] as sample_pays
FROM products
WHERE country_origin IS NOT NULL
ORDER BY ARRAY_LENGTH(legal_countries, 1) DESC
LIMIT 20;
```

### Produits manquants (après enrichissement)

```sql
SELECT
    name,
    slug,
    CASE WHEN country_origin IS NULL THEN '❌' ELSE '✅' END as origine,
    CASE WHEN headquarters IS NULL THEN '❌' ELSE '✅' END as siege,
    CASE WHEN legal_countries IS NULL THEN '❌' ELSE '✅' END as pays_legaux
FROM products
WHERE country_origin IS NULL
   OR headquarters IS NULL
   OR legal_countries IS NULL
ORDER BY name;
```

Si ce query retourne 0 lignes → **100% enrichi!** ✅

## 🛠️ Dépannage

### Erreur : "Configuration Supabase manquante"

```bash
# Vérifier le fichier de config
cat config/env.txt

# Ou utiliser variables d'environnement
export NEXT_PUBLIC_SUPABASE_URL="https://..."
export NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

### Erreur : "Aucune clé API IA configurée"

```bash
# Ajouter au moins une clé (Gemini OU Mistral)
export GOOGLE_API_KEY="votre_clé"
# OU
export MISTRAL_API_KEY="votre_clé"
```

### Erreur : "Rate limit exceeded"

```bash
# Augmenter le délai
python src\automation\enrich_all_products_geography.py --delay 2.5
```

### Produits avec données incorrectes

```sql
-- Corriger manuellement
UPDATE products
SET country_origin = 'US',
    headquarters = 'New York, USA',
    legal_countries = ARRAY['US', 'CA', 'GB', 'FR', 'DE']
WHERE slug = 'produit-a-corriger';
```

### Relancer seulement les erreurs

```bash
# Enrichir seulement les produits manquants
python src\automation\enrich_all_products_geography.py --missing-only
```

## 📈 Workflow complet recommandé

### 1. Préparation (1 fois)

```bash
# Configuration
cp config/env_template_free.txt config/env.txt
nano config/env.txt  # Ajouter les clés API
```

### 2. Test (avant production)

```bash
# Test en dry-run
python src\automation\enrich_all_products_geography.py --dry-run --missing-only
```

### 3. Production

```bash
# Enrichir les produits manquants
python src\automation\enrich_all_products_geography.py --missing-only

# Attendre la fin (~3 min pour 100 produits)
```

### 4. Vérification

```sql
-- Dans Supabase
SELECT COUNT(*) FROM products WHERE country_origin IS NULL;
-- Devrait retourner 0
```

### 5. Mise à jour régulière

```bash
# Tous les mois ou quand nouveaux produits ajoutés
python src\automation\enrich_all_products_geography.py --missing-only
```

## ✅ Checklist finale

- [ ] Configuration créée (config/env.txt)
- [ ] Clés API ajoutées (Gemini ou Mistral)
- [ ] Test en dry-run réussi
- [ ] Enrichissement production lancé
- [ ] Vérification SQL : 0 produits manquants
- [ ] Tous les produits ont `country_origin`, `headquarters`, `legal_countries`

## 🎉 Résultat final

Après exécution complète, vous aurez :

- ✅ **100%** des produits avec pays d'origine
- ✅ **100%** des produits avec siège social
- ✅ **100%** des produits avec liste des pays légaux
- ✅ Données stockées dans Supabase
- ✅ Historique complet dans le champ `specs`
- ✅ Synchronisation automatique future via triggers

**Temps total : ~5 minutes pour 100 produits**

---

## 📞 Support

Besoin d'aide ?
- Consultez [GUIDE_GEOGRAPHIE_PRODUITS.md](GUIDE_GEOGRAPHIE_PRODUITS.md) pour plus de détails
- Vérifiez les logs du script pour les erreurs spécifiques
- Testez toujours en `--dry-run` avant la production
