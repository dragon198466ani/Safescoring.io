# Guide : Géographie des Produits - Pays d'Origine et Pays Légaux

## 📋 Vue d'ensemble

Ce système complet permet de gérer deux types d'informations géographiques pour chaque produit :

1. **Pays d'origine** (`country_origin`) : Où le produit a été créé/fondé
2. **Pays légaux** (`legal_countries`) : Où le produit peut légalement être utilisé
3. **Siège social** (`headquarters`) : Localisation du siège social

## 🗄️ Structure de la base de données

### Table `products` - Nouveaux champs

```sql
-- Champs existants
country_origin VARCHAR(2)         -- Code ISO 2 lettres (ex: "US", "FR", "CH")
headquarters VARCHAR(100)          -- Ville et pays (ex: "Paris, France")

-- NOUVEAU champ ajouté
legal_countries VARCHAR(2)[]      -- Array de codes ISO (ex: {'US', 'CA', 'GB', 'FR'})
```

### Table `product_country_compliance` (Existante)

Cette table gère les détails de conformité pays par pays :
- `status` : 'available', 'banned', 'restricted', 'available_restricted'
- `regulatory_risk` : 'very_low', 'low', 'medium', 'high', 'critical'
- `kyc_required` : Booléen
- `compliance_notes` : Texte explicatif

## 🚀 Installation

### Étape 1 : Exécuter la migration SQL

Dans Supabase SQL Editor, exécutez :

```bash
# Exécuter la migration 011 pour ajouter le champ legal_countries
psql -f config/migrations/011_product_legal_countries.sql
```

Ou dans Supabase Dashboard → SQL Editor :
```sql
-- Copier-coller le contenu de config/migrations/011_product_legal_countries.sql
```

Cette migration va :
- ✅ Ajouter la colonne `legal_countries` à la table `products`
- ✅ Créer un index GIN pour des requêtes efficaces
- ✅ Créer un trigger pour synchroniser automatiquement avec `product_country_compliance`
- ✅ Créer une fonction `sync_legal_countries_from_compliance()` pour la synchronisation

### Étape 2 : Charger les données géographiques

Exécutez le script de chargement complet :

```bash
# Dans Supabase SQL Editor
psql -f config/LOAD_ALL_DATA.sql
```

Ce script va charger :
- **70-100 produits** avec pays d'origine et siège social
- **Pays légaux** pour chaque produit (basé sur les régulations connues)
- **30+ incidents physiques** avec coordonnées GPS

### Étape 3 : Charger les données de conformité (optionnel mais recommandé)

```bash
# Charger les détails de conformité pays par pays
psql -f config/seed_product_compliance.sql
```

Cette table contient 200+ mappings détaillés de conformité.

## 🤖 Enrichissement automatique via IA

### Programme Python : `enrich_products_ai.py`

Ce programme utilise l'IA (Gemini/Mistral) pour enrichir automatiquement les produits.

#### Configuration

1. Créer un fichier de configuration (si pas déjà fait) :

```bash
# Copier le template
cp config/env_template_free.txt config/env.txt

# Éditer avec vos clés API
nano config/env.txt
```

Ajouter vos clés :
```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
GOOGLE_API_KEY=votre_clé_gemini
MISTRAL_API_KEY=votre_clé_mistral
```

#### Utilisation

```bash
# Enrichir 5 produits de test
python _archive/utils/enrich_products_ai.py --test 5

# Enrichir tous les produits
python _archive/utils/enrich_products_ai.py --all

# Enrichir un produit spécifique
python _archive/utils/enrich_products_ai.py --product "Binance"
```

#### Ce que fait l'IA

L'IA va automatiquement extraire pour chaque produit :

```json
{
  "country_origin": "US",
  "headquarters": "San Francisco, USA",
  "legal_countries": ["US", "CA", "GB", "FR", "DE", "IT", "ES", "NL", ...],
  "excluded_countries": ["CN", "KP", "IR", "SY"],
  "year_founded": 2012,
  "price_eur": 79,
  "price_details": "Hardware wallet - 79€",
  "key_metrics": {
    "users": "5M+",
    "supported_coins": "5000+"
  }
}
```

Les informations sont stockées dans :
- ✅ Colonnes dédiées : `country_origin`, `headquarters`, `legal_countries`
- ✅ Champ `specs` (JSONB) : Pour l'historique complet

## 📊 Requêtes utiles

### Voir tous les produits avec leur géographie

```sql
SELECT
    name,
    country_origin as origin,
    headquarters,
    ARRAY_LENGTH(legal_countries, 1) as num_legal_countries,
    legal_countries[1:5] as sample_countries
FROM products
WHERE country_origin IS NOT NULL
ORDER BY ARRAY_LENGTH(legal_countries, 1) DESC;
```

### Produits disponibles dans un pays spécifique

```sql
SELECT
    p.name,
    p.country_origin,
    p.legal_countries
FROM products p
WHERE 'FR' = ANY(p.legal_countries)
ORDER BY p.name;
```

### Produits par pays d'origine

```sql
SELECT
    country_origin,
    COUNT(*) as num_products,
    ARRAY_AGG(name) as products
FROM products
WHERE country_origin IS NOT NULL
GROUP BY country_origin
ORDER BY num_products DESC;
```

### Produits les plus globaux (disponibles dans le + de pays)

```sql
SELECT
    name,
    country_origin,
    ARRAY_LENGTH(legal_countries, 1) as num_countries,
    legal_countries
FROM products
WHERE legal_countries IS NOT NULL
ORDER BY num_countries DESC
LIMIT 10;
```

### Produits avec restrictions (peu de pays)

```sql
SELECT
    name,
    country_origin,
    ARRAY_LENGTH(legal_countries, 1) as num_countries,
    legal_countries
FROM products
WHERE legal_countries IS NOT NULL
  AND ARRAY_LENGTH(legal_countries, 1) < 10
ORDER BY num_countries ASC;
```

## 🔄 Synchronisation automatique

Le système maintient automatiquement la cohérence entre les tables via un trigger.

### Synchronisation manuelle (si nécessaire)

```sql
-- Synchroniser legal_countries depuis product_country_compliance
SELECT sync_legal_countries_from_compliance();
```

### Ajouter une conformité pays et voir la mise à jour automatique

```sql
-- Ajouter une nouvelle conformité
INSERT INTO product_country_compliance (product_id, country_code, status, compliance_notes)
SELECT id, 'JP', 'available', 'Licensed and available in Japan'
FROM products WHERE slug = 'coinbase';

-- Le trigger met automatiquement à jour products.legal_countries
-- Vérifier :
SELECT name, legal_countries
FROM products
WHERE slug = 'coinbase';
```

## 📈 Exemples de données chargées

### Hardware Wallets
- **Ledger** : Origine FR, disponible dans 40+ pays
- **Trezor** : Origine CZ, disponible dans 40+ pays
- **Coldcard** : Origine CA, disponible dans 40+ pays

### Exchanges
- **Binance** : Origine AE, disponible dans 40+ pays (exclu US, CN, GB)
- **Coinbase** : Origine US, disponible dans 15 pays (focus US/EU)
- **Kraken** : Origine US, disponible dans 19 pays

### DeFi Protocols
- **Uniswap** : Origine US, accessible dans 45+ pays (décentralisé)
- **Aave** : Origine GB, accessible dans 32+ pays
- **Curve** : Origine CH, accessible dans 32+ pays

### Blockchains
- **Bitcoin** : Origine XX (décentralisé), accessible dans 50+ pays
- **Ethereum** : Origine CH, accessible dans 50+ pays

## 🔍 Vérification des données

```sql
-- Statistiques globales
SELECT
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE country_origin IS NOT NULL) as with_origin,
    COUNT(*) FILTER (WHERE legal_countries IS NOT NULL) as with_legal_countries,
    COUNT(*) FILTER (WHERE headquarters IS NOT NULL) as with_headquarters,
    AVG(ARRAY_LENGTH(legal_countries, 1)) as avg_legal_countries
FROM products;

-- Produits manquants de données géographiques
SELECT
    name,
    slug,
    CASE WHEN country_origin IS NULL THEN '❌' ELSE '✅' END as has_origin,
    CASE WHEN headquarters IS NULL THEN '❌' ELSE '✅' END as has_hq,
    CASE WHEN legal_countries IS NULL THEN '❌' ELSE '✅' END as has_legal
FROM products
WHERE country_origin IS NULL
   OR headquarters IS NULL
   OR legal_countries IS NULL
ORDER BY name;
```

## 🎯 Utilisation dans l'application web

### API Next.js - Exemple de route

```javascript
// app/api/products/[slug]/geography/route.js
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  const { slug } = params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: product } = await supabase
    .from('products')
    .select('name, country_origin, headquarters, legal_countries')
    .eq('slug', slug)
    .single();

  return Response.json({
    product: product.name,
    origin: product.country_origin,
    headquarters: product.headquarters,
    legalIn: product.legal_countries,
    numCountries: product.legal_countries?.length || 0
  });
}
```

### Composant React - Affichage

```jsx
// components/ProductGeography.jsx
export function ProductGeography({ product }) {
  return (
    <div className="geography-info">
      <h3>🌍 Informations géographiques</h3>

      <div className="origin">
        <strong>Pays d'origine :</strong> {product.country_origin}
      </div>

      <div className="headquarters">
        <strong>Siège social :</strong> {product.headquarters}
      </div>

      <div className="legal-countries">
        <strong>Disponible dans {product.legal_countries.length} pays :</strong>
        <div className="country-flags">
          {product.legal_countries.map(code => (
            <span key={code} className="flag">
              {getFlagEmoji(code)} {code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## 🛠️ Maintenance

### Mettre à jour les données géographiques

```sql
-- Mettre à jour un produit manuellement
UPDATE products
SET country_origin = 'US',
    headquarters = 'New York, USA',
    legal_countries = ARRAY['US', 'CA', 'GB', 'FR', 'DE']
WHERE slug = 'exemple-produit';
```

### Ajouter un nouveau pays légal

```sql
-- Ajouter via product_country_compliance (recommandé - trigger automatique)
INSERT INTO product_country_compliance (product_id, country_code, status)
SELECT id, 'BR', 'available'
FROM products WHERE slug = 'metamask';

-- OU directement (manuel)
UPDATE products
SET legal_countries = array_append(legal_countries, 'BR')
WHERE slug = 'metamask'
  AND NOT ('BR' = ANY(legal_countries));
```

## 📝 Notes importantes

1. **Codes pays** : Toujours utiliser les codes ISO 3166-1 alpha-2 (2 lettres majuscules)
2. **Synchronisation** : Le trigger maintient la cohérence automatiquement
3. **Performance** : Index GIN sur `legal_countries` pour requêtes rapides
4. **IA** : Le programme Python enrichit automatiquement mais vérifiez toujours les données
5. **Conformité** : Utilisez `product_country_compliance` pour les détails réglementaires

## 🆘 Dépannage

### Problème : legal_countries NULL après migration

```sql
-- Lancer la synchronisation manuelle
SELECT sync_legal_countries_from_compliance();
```

### Problème : Données incohérentes

```sql
-- Vérifier les incohérences
SELECT
    p.name,
    p.legal_countries as product_legal,
    ARRAY_AGG(pcc.country_code) as compliance_available
FROM products p
LEFT JOIN product_country_compliance pcc ON pcc.product_id = p.id
    AND pcc.status IN ('available', 'available_restricted')
WHERE p.legal_countries IS NOT NULL
GROUP BY p.id, p.name, p.legal_countries
HAVING p.legal_countries != ARRAY_AGG(pcc.country_code);
```

### Problème : Programme Python ne trouve pas les produits

```bash
# Vérifier la connexion Supabase
python _archive/utils/enrich_products_ai.py --test 1

# Vérifier les logs
# Si erreur 401 : Vérifier SUPABASE_ANON_KEY
# Si erreur 404 : Vérifier SUPABASE_URL
```

## 🎉 Résumé

Vous avez maintenant un système complet pour gérer :

✅ **Pays d'origine** des produits (où ils ont été créés)
✅ **Pays légaux** (où ils peuvent être utilisés)
✅ **Enrichissement automatique** via IA
✅ **Synchronisation automatique** entre les tables
✅ **Données complètes** pour 70-100 produits

Tous les fichiers importants :
- [`config/migrations/011_product_legal_countries.sql`](config/migrations/011_product_legal_countries.sql) : Migration
- [`config/LOAD_ALL_DATA.sql`](config/LOAD_ALL_DATA.sql) : Données complètes
- [`_archive/utils/enrich_products_ai.py`](_archive/utils/enrich_products_ai.py) : Enrichissement IA
- [`config/seed_product_compliance.sql`](config/seed_product_compliance.sql) : Conformité détaillée
