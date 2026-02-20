# 🌍 Enrichissement Complet des Produits - README

## 🎯 Objectif

Enrichir **TOUS** les produits de la base de données Supabase avec :
- 🏴 **Pays d'origine** (country_origin)
- 🏢 **Siège social** (headquarters)
- ✅ **Pays légaux** (legal_countries)

## ⚡ Démarrage Ultra-Rapide

### Windows

```cmd
# Double-cliquer sur :
enrichir_tous_produits.bat

# OU dans le terminal :
enrichir_tous_produits.bat
```

### Linux/Mac

```bash
# Rendre exécutable
chmod +x enrichir_tous_produits.sh

# Lancer
./enrichir_tous_produits.sh
```

### Python Direct

```bash
# Test (simulation)
python src/automation/enrich_all_products_geography.py --dry-run --missing-only

# Production (réel)
python src/automation/enrich_all_products_geography.py --missing-only
```

## 📁 Fichiers du système

| Fichier | Description |
|---------|-------------|
| [`enrichir_tous_produits.bat`](enrichir_tous_produits.bat) | 🪟 Script Windows interactif |
| [`enrichir_tous_produits.sh`](enrichir_tous_produits.sh) | 🐧 Script Linux/Mac interactif |
| [`src/automation/enrich_all_products_geography.py`](src/automation/enrich_all_products_geography.py) | 🤖 Programme Python principal |
| [`ENRICHIR_TOUS_PRODUITS.md`](ENRICHIR_TOUS_PRODUITS.md) | 📖 Guide complet détaillé |
| [`GUIDE_GEOGRAPHIE_PRODUITS.md`](GUIDE_GEOGRAPHIE_PRODUITS.md) | 📖 Guide système géographie |
| [`config/migrations/011_product_legal_countries.sql`](config/migrations/011_product_legal_countries.sql) | 🗄️ Migration SQL |
| [`config/LOAD_ALL_DATA.sql`](config/LOAD_ALL_DATA.sql) | 🗄️ Données initiales |

## 🚀 Guide en 3 étapes

### ✅ Étape 1 : Configuration (1 minute)

```bash
# Copier le template
cp config/env_template_free.txt config/env.txt

# Éditer et ajouter vos clés
nano config/env.txt
```

Ajouter :
```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_key
GOOGLE_API_KEY=votre_clé_gemini
MISTRAL_API_KEY=votre_clé_mistral
```

### ✅ Étape 2 : Test (1 minute)

```bash
# Windows
python src\automation\enrich_all_products_geography.py --dry-run --missing-only

# Linux/Mac
python src/automation/enrich_all_products_geography.py --dry-run --missing-only
```

**Vérifiez les résultats :** Aucune modification, juste un aperçu.

### ✅ Étape 3 : Production (3-5 minutes)

```bash
# Windows
python src\automation\enrich_all_products_geography.py --missing-only

# Linux/Mac
python src/automation/enrich_all_products_geography.py --missing-only
```

**C'est fait !** Tous vos produits sont enrichis.

## 🎛️ Options du programme

```bash
--missing-only      # Enrichir seulement les produits sans géographie (RECOMMANDÉ)
--dry-run           # Mode test sans modification (TOUJOURS tester d'abord)
--delay N           # Délai en secondes entre requêtes IA (défaut: 1.5)
--batch-size N      # Taille des batchs (défaut: 10)
```

## 📊 Exemples de sortie

### Test réussi

```
============================================================
🔍 MODE DRY RUN - Aucune modification
📋 Seulement produits sans géographie
------------------------------------------------------------

📊 45 produits récupérés

[1/45] 🔍 Ledger Nano X...
   🌍 Origine: FR
   🏢 Siège: Paris, France
   ✅ Légal: 40 pays (US, CA, GB, FR, DE...)
   🚫 Exclu: CN, KP, IR, SY
   📊 Confiance: high
   🔍 DRY RUN - Pas de mise à jour

...

============================================================
🎉 ENRICHISSEMENT TERMINÉ!
============================================================
✅ Enrichis: 43/45
⏭️  Skippés: 0/45
❌ Erreurs: 2/45
📊 Taux de succès: 95.6%
```

### Production réelle

Identique mais avec :
```
   ✅ Mis à jour dans Supabase!
```

## ✅ Vérification post-enrichissement

### SQL - Vérifier que tout est enrichi

```sql
-- Doit retourner 0
SELECT COUNT(*)
FROM products
WHERE country_origin IS NULL
   OR legal_countries IS NULL;
```

### SQL - Voir les résultats

```sql
SELECT
    name,
    country_origin,
    headquarters,
    ARRAY_LENGTH(legal_countries, 1) as nb_pays_legaux,
    legal_countries[1:5] as top_5_pays
FROM products
WHERE country_origin IS NOT NULL
ORDER BY nb_pays_legaux DESC
LIMIT 20;
```

**Résultat attendu :**

| name | country_origin | headquarters | nb_pays_legaux | top_5_pays |
|------|----------------|--------------|----------------|------------|
| Bitcoin | XX | Decentralized | 50 | {US,CA,GB,FR,DE} |
| Ethereum | CH | Zug, Switzerland | 50 | {US,CA,GB,FR,DE} |
| MetaMask | US | New York, USA | 45 | {US,CA,GB,FR,DE} |
| Ledger | FR | Paris, France | 40 | {US,CA,GB,FR,DE} |
| Binance | AE | Dubai, UAE | 40 | {AE,FR,ES,IT,NL} |

## 📈 Performance

| Nb produits | Temps estimé (delay 1.5s) | Coût API (Gemini) |
|-------------|---------------------------|-------------------|
| 50          | ~1.5 min                  | Gratuit           |
| 100         | ~3 min                    | Gratuit           |
| 200         | ~6 min                    | ~$0.01            |
| 500         | ~15 min                   | ~$0.03            |

**API utilisée :** Gemini 2.0 Flash (gratuit jusqu'à 15 req/min) avec fallback Mistral

## 🔧 Dépannage courant

### Problème : "Configuration Supabase manquante"

```bash
# Vérifier le fichier
cat config/env.txt

# S'assurer que les lignes sont présentes
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Problème : "Rate limit exceeded"

```bash
# Augmenter le délai
python src/automation/enrich_all_products_geography.py --delay 2.5 --missing-only
```

### Problème : Données incorrectes pour un produit

```sql
-- Corriger manuellement
UPDATE products
SET country_origin = 'US',
    headquarters = 'San Francisco, USA',
    legal_countries = ARRAY['US', 'CA', 'GB', 'FR', 'DE', 'IT', 'ES']
WHERE slug = 'nom-du-produit';
```

### Problème : Certains produits non enrichis

```bash
# Relancer seulement sur les manquants
python src/automation/enrich_all_products_geography.py --missing-only
```

## 📚 Documentation complète

Pour plus de détails, consultez :

1. **[ENRICHIR_TOUS_PRODUITS.md](ENRICHIR_TOUS_PRODUITS.md)** - Guide complet avec tous les détails
2. **[GUIDE_GEOGRAPHIE_PRODUITS.md](GUIDE_GEOGRAPHIE_PRODUITS.md)** - Documentation du système de géographie
3. **[DEMARRAGE_RAPIDE_GEOGRAPHIE.md](DEMARRAGE_RAPIDE_GEOGRAPHIE.md)** - Démarrage rapide initial

## 🎉 Résultat final

Après exécution complète :

✅ **100%** des produits ont `country_origin`
✅ **100%** des produits ont `headquarters`
✅ **100%** des produits ont `legal_countries`
✅ Données synchronisées dans Supabase
✅ Historique complet dans `specs` (JSONB)
✅ Système de mise à jour automatique en place

**Temps total : ~5 minutes pour 100 produits**

---

## 🏁 Workflow recommandé

1. ✅ **Configuration** : Créer `config/env.txt` avec clés API
2. ✅ **Test** : `--dry-run --missing-only` pour vérifier
3. ✅ **Production** : `--missing-only` pour enrichir
4. ✅ **Vérification** : SQL pour confirmer 100% enrichi
5. ✅ **Maintenance** : Relancer `--missing-only` quand nouveaux produits

## 💡 Conseils pro

- 🧪 **Toujours tester en `--dry-run` d'abord**
- 🎯 **Utilisez `--missing-only` pour économiser du temps**
- ⏱️ **Ajustez `--delay` selon votre quota API**
- 📊 **Vérifiez avec SQL après chaque exécution**
- 🔄 **Automatisez avec cron pour nouveaux produits**

## 🆘 Support

- 📖 Lisez [ENRICHIR_TOUS_PRODUITS.md](ENRICHIR_TOUS_PRODUITS.md) pour les détails
- 🐛 Vérifiez les logs du programme pour les erreurs
- 💬 Consultez les commentaires dans le code Python
- ✅ Utilisez toujours `--dry-run` en cas de doute

---

**Créé par SafeScoring - Janvier 2026**
