# 🚀 Démarrage Rapide - Géographie des Produits

## En 3 étapes simples

### ✅ Étape 1 : Appliquer la migration SQL

Dans Supabase SQL Editor, exécutez :

```sql
-- Copier-coller le contenu de ce fichier :
config/migrations/011_product_legal_countries.sql
```

**Ce que ça fait :**
- Ajoute la colonne `legal_countries` à la table `products`
- Crée un trigger pour synchronisation automatique
- Crée une fonction de synchronisation manuelle

---

### ✅ Étape 2 : Charger les données

Dans Supabase SQL Editor, exécutez :

```sql
-- Copier-coller le contenu de ce fichier :
config/LOAD_ALL_DATA.sql
```

**Ce que ça fait :**
- Charge les pays d'origine pour 70-100 produits
- Charge les sièges sociaux
- Charge les pays légaux pour chaque produit
- Charge 30+ incidents physiques avec GPS

**Résultat attendu :**
```
QUICK DATA LOAD COMPLETE!
- products_with_country_origin: 70+
- products_with_legal_countries: 70+
- total_physical_incidents: 30+
```

---

### ✅ Étape 3 : Enrichissement automatique via IA (Optionnel)

#### 3.1 Configuration

Créez un fichier `config/env.txt` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
GOOGLE_API_KEY=votre_clé_gemini_api
MISTRAL_API_KEY=votre_clé_mistral_api
```

#### 3.2 Exécution

```bash
# Test avec 5 produits
python _archive/utils/enrich_products_ai.py --test 5

# Enrichir tous les produits
python _archive/utils/enrich_products_ai.py --all
```

**Ce que ça fait l'IA :**
- Recherche automatiquement le pays d'origine
- Identifie le siège social
- Détermine les pays légaux (basé sur régulations)
- Identifie les pays exclus
- Met à jour Supabase automatiquement

---

## 📊 Vérifier les données

```sql
-- Voir tous les produits avec leur géographie
SELECT
    name,
    country_origin as origin,
    headquarters,
    ARRAY_LENGTH(legal_countries, 1) as num_legal_countries,
    legal_countries[1:5] as top_5_countries
FROM products
WHERE country_origin IS NOT NULL
ORDER BY num_legal_countries DESC
LIMIT 10;
```

**Résultat attendu :**

| name | origin | headquarters | num_legal_countries | top_5_countries |
|------|--------|--------------|---------------------|-----------------|
| Bitcoin | XX | Decentralized | 50 | {US,CA,GB,FR,DE} |
| Ethereum | CH | Zug, Switzerland | 50 | {US,CA,GB,FR,DE} |
| MetaMask | US | New York, USA | 45 | {US,CA,GB,FR,DE} |
| Binance | AE | Dubai, UAE | 40 | {AE,FR,ES,IT,NL} |
| Ledger | FR | Paris, France | 40 | {US,CA,GB,FR,DE} |

---

## 🔍 Requêtes utiles

### Produits disponibles en France

```sql
SELECT name, country_origin, legal_countries
FROM products
WHERE 'FR' = ANY(legal_countries)
ORDER BY name;
```

### Produits par pays d'origine

```sql
SELECT
    country_origin,
    COUNT(*) as nombre_produits,
    ARRAY_AGG(name) as produits
FROM products
WHERE country_origin IS NOT NULL
GROUP BY country_origin
ORDER BY nombre_produits DESC;
```

### Produits avec le plus de restrictions

```sql
SELECT
    name,
    ARRAY_LENGTH(legal_countries, 1) as num_pays_legaux,
    legal_countries
FROM products
WHERE legal_countries IS NOT NULL
  AND ARRAY_LENGTH(legal_countries, 1) < 10
ORDER BY num_pays_legaux ASC;
```

---

## 🎯 Utilisation dans votre application

### API Next.js

```javascript
// app/api/products/[slug]/route.js
export async function GET(request, { params }) {
  const { data } = await supabase
    .from('products')
    .select('name, country_origin, headquarters, legal_countries')
    .eq('slug', params.slug)
    .single();

  return Response.json(data);
}
```

### Composant React

```jsx
function ProductGeography({ product }) {
  return (
    <div>
      <p>🏴 Origine : {product.country_origin}</p>
      <p>🏢 Siège : {product.headquarters}</p>
      <p>✅ Légal dans {product.legal_countries.length} pays</p>
      <div className="flags">
        {product.legal_countries.map(code => (
          <span key={code}>{getFlagEmoji(code)}</span>
        ))}
      </div>
    </div>
  );
}
```

---

## 📖 Documentation complète

Pour plus de détails, consultez :
- **[GUIDE_GEOGRAPHIE_PRODUITS.md](GUIDE_GEOGRAPHIE_PRODUITS.md)** : Guide complet

---

## 🆘 Aide rapide

### Problème : legal_countries est NULL

```sql
-- Lancer la synchronisation manuelle
SELECT sync_legal_countries_from_compliance();
```

### Problème : Programme Python ne fonctionne pas

```bash
# Vérifier la configuration
cat config/env.txt

# Tester la connexion
python _archive/utils/enrich_products_ai.py --test 1
```

### Problème : Données manquantes

```sql
-- Recharger toutes les données
\i config/LOAD_ALL_DATA.sql
```

---

## ✅ Checklist

- [ ] Migration 011 exécutée dans Supabase
- [ ] LOAD_ALL_DATA.sql exécuté
- [ ] Données vérifiées (70+ produits avec géographie)
- [ ] (Optionnel) Programme Python configuré
- [ ] (Optionnel) Enrichissement IA testé

---

## 🎉 C'est fait !

Vous avez maintenant :
- ✅ 70-100 produits avec pays d'origine
- ✅ Pays légaux pour chaque produit
- ✅ Synchronisation automatique
- ✅ Enrichissement IA disponible

**Temps total : 5-10 minutes**

Besoin d'aide ? Consultez [GUIDE_GEOGRAPHIE_PRODUITS.md](GUIDE_GEOGRAPHIE_PRODUITS.md)
