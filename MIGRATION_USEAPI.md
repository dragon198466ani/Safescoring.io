# Migration fetch() → useApi Hook

## 🎯 OBJECTIF

Migrer **81 composants** utilisant `fetch()` direct vers le hook `useApi` unifié.

**Gains attendus**:
- ✅ Cache automatique (moins de requêtes serveur)
- ✅ Retry automatique (meilleure UX)
- ✅ Loading/error states cohérents
- ✅ Annulation automatique des requêtes
- ✅ Revalidation au focus
- ✅ -500+ lignes de code dupliqué

---

## 📊 SITUATION ACTUELLE

### Statistiques
- **81 composants** avec `fetch()` direct
- **0 composants** utilisent `useApi`
- **150+ appels fetch** au total
- **100% à migrer**

### Pattern actuel (dupliqué 81 fois)
```javascript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/endpoint`);
      const data = await res.json();
      if (res.ok) setData(data);
      else setError(data.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [dependencies]);
```

**Problèmes**:
- 10-15 lignes de boilerplate par composant
- Pas de cache (requêtes redondantes)
- Pas de retry (mauvaise UX sur erreurs réseau)
- Pas d'annulation (memory leaks)
- Gestion d'erreurs incohérente

---

## ✅ SOLUTION: Hook useApi

Le hook existe déjà: [`web/hooks/useApi.js`](web/hooks/useApi.js)

**Fonctionnalités**:
- ✅ Cache automatique (memory + localStorage)
- ✅ Retry automatique (2 tentatives par défaut)
- ✅ SWR pattern (stale-while-revalidate)
- ✅ Annulation automatique (AbortController)
- ✅ Revalidation au focus (optionnel)
- ✅ Optimistic updates (mutate)
- ✅ Invalidation manuelle

---

## 🔄 PATTERNS DE MIGRATION

### Pattern 1: GET Simple (80% des cas)

**AVANT** (15 lignes):
```javascript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products?limit=10');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

**APRÈS** (2 lignes):
```javascript
import { useApi } from '@/hooks/useApi';

const { data, isLoading: loading, error } = useApi('/api/products?limit=10');
```

**Économie: -87% code (15 → 2 lignes)**

---

### Pattern 2: GET avec Paramètres Dynamiques

**AVANT** (20 lignes):
```javascript
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!category) return;

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products?category=${category}&limit=${limit}`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchProducts();
}, [category, limit]);
```

**APRÈS** (5 lignes):
```javascript
import { useProducts } from '@/hooks/useApi';

const { data: products, isLoading: loading } = useProducts({
  category,
  limit
});
```

**Économie: -75% code + cache automatique**

---

### Pattern 3: POST/Mutations

**AVANT** (25 lignes):
```javascript
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async (formData) => {
  try {
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message);
    }

    const result = await res.json();
    // Success
    onSuccess?.(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setSubmitting(false);
  }
};
```

**APRÈS** (10 lignes):
```javascript
import { apiMutate } from '@/hooks/useApi';

const handleSubmit = async (formData) => {
  try {
    const result = await apiMutate('/api/corrections', {
      method: 'POST',
      body: formData
    });
    onSuccess?.(result);
  } catch (err) {
    setError(err.message);
  }
};
```

**Économie: -60% code + gestion d'erreurs unifiée**

---

### Pattern 4: Hook Spécialisé

**AVANT** (Leaderboard.js - 18 lignes):
```javascript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchLeaderboard() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: limit.toString() });
      const res = await fetch(`/api/leaderboard?${params}`);

      if (!res.ok) throw new Error('Failed to fetch');

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  fetchLeaderboard();
}, [limit]);
```

**APRÈS** (1 ligne):
```javascript
import { useLeaderboard } from '@/hooks/useApi';

const { data, isLoading: loading } = useLeaderboard();
```

**Économie: -95% code!**

---

### Pattern 5: Polling/Refresh Périodique

**AVANT** (IncidentAlerts.js - 30 lignes):
```javascript
const [alerts, setAlerts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`/api/user/alerts?limit=${max}`);
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchAlerts();

  // Poll every 5 minutes
  const interval = setInterval(fetchAlerts, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, [max]);
```

**APRÈS** (10 lignes):
```javascript
import { useApi } from '@/hooks/useApi';

const { data: alerts, isLoading: loading, refetch } = useApi(
  `/api/user/alerts?limit=${max}`,
  {
    ttl: 5 * 60 * 1000,  // 5 min cache
    revalidateOnFocus: true
  }
);

// Manual polling si nécessaire
useEffect(() => {
  const interval = setInterval(refetch, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [refetch]);
```

**Économie: -67% code + cache + revalidation automatique**

---

## 🎯 TOP 20 COMPOSANTS PRIORITAIRES

### Priorité 1 - CRITIQUE (Layout/Pages principales)

#### 1. LayoutClient.js ⭐⭐⭐⭐
**Impact**: Chargé sur TOUTES les pages

**Migration**:
```diff
- const [setups, setSetups] = useState([]);
- const [loading, setLoading] = useState(true);
-
- useEffect(() => {
-   fetch('/api/setups').then(r => r.json()).then(setSetups);
- }, []);
+ import { useApi } from '@/hooks/useApi';
+ const { data: setups, isLoading: loading } = useApi('/api/setups');
```

#### 2. SAFEAnalysis.js ⭐⭐⭐⭐
**Impact**: Affiché sur pages produits

**Migration**:
```diff
- const [strategies, setStrategies] = useState(null);
- useEffect(() => {
-   fetch(`/api/products/${slug}/strategies`)
-     .then(r => r.json())
-     .then(setStrategies);
- }, [slug]);
+ const { data: strategies } = useApi(
+   slug ? `/api/products/${slug}/strategies` : null
+ );
```

#### 3. ProductCharts.js ⭐⭐⭐
**Migration**:
```diff
- const [chartData, setChartData] = useState(null);
- useEffect(() => {
-   const url = `/api/products/${slug}/chart-data?metric=${metric}&timeRange=${timeRange}`;
-   fetch(url).then(r => r.json()).then(setChartData);
- }, [slug, metric, timeRange]);
+ const { data: chartData } = useApi(
+   `/api/products/${slug}/chart-data?metric=${metric}&timeRange=${timeRange}`
+ );
```

#### 4. Leaderboard.js ⭐⭐⭐
**Migration**:
```diff
- const [data, setData] = useState(null);
- useEffect(() => {
-   fetch(`/api/leaderboard?limit=${limit}`)
-     .then(r => r.json()).then(setData);
- }, [limit]);
+ import { useLeaderboard } from '@/hooks/useApi';
+ const { data } = useLeaderboard();
```

#### 5. SetupCreator.js ⭐⭐⭐⭐
**Migration** (avec debounce):
```diff
- const [products, setProducts] = useState([]);
- useEffect(() => {
-   const timer = setTimeout(() => {
-     fetch(`/api/products?search=${query}`)
-       .then(r => r.json()).then(setProducts);
-   }, 300);
-   return () => clearTimeout(timer);
- }, [query]);
+ import { useProducts } from '@/hooks/useApi';
+ import { useDebouncedValue } from '@/hooks/useDebouncedValue';
+
+ const debouncedQuery = useDebouncedValue(query, 300);
+ const { data: products } = useProducts({ search: debouncedQuery });
```

---

### Priorité 2 - HAUTE (Gamification/Dashboard)

6. **RewardsDashboard.js** ⭐⭐⭐
7. **CorrectionForm.js** ⭐⭐
8. **QuickStart.js** ⭐⭐
9. **DualScoreChart.js** ⭐⭐⭐
10. **IncidentAlerts.js** ⭐⭐⭐⭐ (polling)

---

### Priorité 3 - MOYENNE (Features secondaires)

11-20: CommunityVotingInterface, CommunityStats, Achievements, ContributionsDashboard, CommunityLeaderboard, CountryOnboarding, CryptoRenewalBanner, AutoProductImage, AnonymousShareToggle, AutonomousChat

---

## 🤖 SCRIPT DE MIGRATION AUTOMATIQUE

### 1. Détection des composants

```bash
#!/bin/bash
# find-fetch-components.sh

echo "Finding components with fetch()..."

FILES=$(find web/components -name "*.js" -type f)

for file in $FILES; do
  if grep -q "fetch(" "$file" && ! grep -q "useApi" "$file"; then
    echo "  - $file"
  fi
done
```

### 2. Migration semi-automatique

```bash
#!/bin/bash
# migrate-to-useapi.sh

echo "Migrating components to useApi..."

# Pattern 1: Simple fetch without params
sed -i 's/const \[data, setData\] = useState(null);/\/\/ Migrated to useApi/' "$file"
sed -i 's/const \[loading, setLoading\] = useState(true);//' "$file"

# Add import if missing
if ! grep -q "import.*useApi" "$file"; then
  sed -i "1i import { useApi } from '@/hooks/useApi';" "$file"
  echo "  ✓ Added useApi import"
fi

echo "Manual review required for complex cases"
```

### 3. Migration Python (plus sophistiquée)

```python
#!/usr/bin/env python3
"""
Automated migration tool: fetch() → useApi

Usage:
  python migrate-useapi.py --component web/components/Leaderboard.js
  python migrate-useapi.py --all  # Migrate all components
"""

import re
import sys
from pathlib import Path

def detect_fetch_pattern(content):
    """Detect fetch() pattern in component"""
    patterns = {
        'simple_get': r'fetch\([\'"`](/api/[^\'"`]+)[\'"`]\)',
        'with_params': r'fetch\(`/api/[^`]+\$\{[^}]+\}[^`]*`\)',
        'post': r'fetch\([^,]+,\s*\{[^}]*method:\s*[\'"]POST[\'"]',
    }

    detected = []
    for name, pattern in patterns.items():
        if re.search(pattern, content):
            detected.append(name)

    return detected

def migrate_simple_get(content):
    """Migrate simple GET fetch to useApi"""
    # Pattern: const [data, setData] = useState(null); + fetch

    # Replace useState declarations
    content = re.sub(
        r'const \[(\w+), set\w+\] = useState\(null\);\s*'
        r'const \[(\w+), set\w+\] = useState\(true\);',
        r'// Migrated to useApi',
        content
    )

    # Replace fetch in useEffect
    content = re.sub(
        r'useEffect\(\(\) => \{\s*'
        r'fetch\([\'"`](/api/[^\'"`]+)[\'"`]\)\s*'
        r'\.then\(r => r\.json\(\)\)\s*'
        r'\.then\(set\w+\);\s*'
        r'\}, \[[^\]]*\]\);',
        r"const { data, isLoading } = useApi('\1');",
        content
    )

    return content

def add_useapi_import(content):
    """Add useApi import if missing"""
    if 'useApi' not in content:
        # Find first import line
        import_match = re.search(r'^import ', content, re.MULTILINE)
        if import_match:
            pos = import_match.start()
            content = (
                content[:pos] +
                "import { useApi } from '@/hooks/useApi';\n" +
                content[pos:]
            )
    return content

def migrate_component(file_path):
    """Migrate a single component"""
    print(f"Migrating {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Detect patterns
    patterns = detect_fetch_pattern(content)
    print(f"  Detected patterns: {patterns}")

    # Migrate
    if 'simple_get' in patterns:
        content = migrate_simple_get(content)
        content = add_useapi_import(content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  ✓ Migrated simple GET pattern")
    else:
        print(f"  ⚠ Complex pattern - manual migration required")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python migrate-useapi.py <component-path>")
        sys.exit(1)

    component_path = sys.argv[1]
    migrate_component(component_path)
```

---

## ✅ CHECKLIST DE MIGRATION

Pour chaque composant:

### Avant Migration
- [ ] Lire le composant pour comprendre la logique
- [ ] Identifier le pattern de fetch (GET, POST, polling, etc.)
- [ ] Noter les dépendances (useEffect deps)

### Migration
- [ ] Ajouter `import { useApi } from '@/hooks/useApi';`
- [ ] Remplacer `useState(null)` par destructuration useApi
- [ ] Supprimer `useState(loading)` (utiliser `isLoading`)
- [ ] Supprimer `useState(error)` (utiliser `error`)
- [ ] Supprimer `useEffect` avec fetch
- [ ] Pour POST: utiliser `apiMutate()` au lieu de `fetch()`
- [ ] Configurer TTL approprié (voir tableau ci-dessous)

### Après Migration
- [ ] Tester le composant (npm run dev)
- [ ] Vérifier que loading/error fonctionne
- [ ] Vérifier que le cache fonctionne (2ème chargement instantané)
- [ ] Vérifier les dépendances (pas de boucle infinie)
- [ ] Commit: `git commit -m "refactor: migrate ComponentName to useApi"`

---

## 📋 TTL RECOMMANDÉS PAR ENDPOINT

| Endpoint | TTL | Raison |
|----------|-----|--------|
| `/api/products` | 2 min | Liste change fréquemment |
| `/api/products/:slug` | 2 min | Détails produit |
| `/api/leaderboard` | 5 min | Stats agrégées |
| `/api/user/settings` | 1 min | Settings utilisateur (HOT) |
| `/api/stats` | 1 heure | Stats globales (COLD) |
| `/api/community/leaderboard` | 5 min | Classement communauté |
| `/api/setups` | 1 min | Setups utilisateur |
| `/api/user/alerts` | 5 min | Alertes (avec polling) |

---

## 📈 MÉTRIQUES DE SUCCÈS

### Code Quality
- [ ] 81 composants migrés (100%)
- [ ] 0 composants avec fetch() direct
- [ ] -500+ lignes de boilerplate

### Performance
- [ ] -60% requêtes serveur (grâce au cache)
- [ ] +Retry automatique (moins d'erreurs)
- [ ] +Annulation (pas de memory leaks)

### Tests
- [ ] Tests passent après migration
- [ ] Cache fonctionne (vérifier Network tab)
- [ ] Retry fonctionne (débrancher réseau)

---

## 🚀 PLAN D'EXÉCUTION

### Semaine 1: Composants Critiques (5)
- [ ] Jour 1: LayoutClient.js
- [ ] Jour 1: SAFEAnalysis.js
- [ ] Jour 2: ProductCharts.js
- [ ] Jour 2: Leaderboard.js
- [ ] Jour 3: SetupCreator.js

**Test**: Vérifier que pages principales fonctionnent

### Semaine 2: Composants Dashboard (15)
- [ ] RewardsDashboard, QuickStart, DualScoreChart
- [ ] IncidentAlerts (attention polling)
- [ ] CommunityVotingInterface, Achievements
- [ ] 9 autres composants dashboard

**Test**: Vérifier dashboard complet

### Semaine 3: Composants Secondaires (61)
- [ ] Batch migration avec script Python
- [ ] Review manuelle pour cas complexes
- [ ] Tests de régression

**Test**: Smoke tests sur toutes les pages

### Semaine 4: Cleanup & Documentation
- [ ] Supprimer ancien code commenté
- [ ] Documenter les hooks spécialisés
- [ ] Monitoring performance (Vercel Analytics)

---

## 💡 TIPS & TRICKS

### Tip 1: Hook Conditionnel

```javascript
// Fetch seulement si slug existe
const { data } = useApi(slug ? `/api/products/${slug}` : null);
```

### Tip 2: Optimistic Update

```javascript
const { data, mutate } = useApi('/api/setups');

const addSetup = (newSetup) => {
  // Update UI immédiatement
  mutate([...data, newSetup], false);

  // Puis persist au serveur
  apiMutate('/api/setups', { body: newSetup })
    .then(() => mutate());  // Refresh après succès
};
```

### Tip 3: Debounce avec useApi

```javascript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const debouncedQuery = useDebouncedValue(searchQuery, 300);
const { data } = useProducts({ search: debouncedQuery });
```

### Tip 4: Parallel Requests

```javascript
// Au lieu de Promise.all avec fetch
const { data: products } = useProducts();
const { data: stats } = useStats();
const { data: leaderboard } = useLeaderboard();

// useApi gère automatiquement les 3 en parallèle!
```

---

## 🧪 TESTS AUTOMATISÉS

```javascript
// web/hooks/__tests__/useApi.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../useApi';

describe('useApi', () => {
  test('caches GET requests', async () => {
    const { result, rerender } = renderHook(() =>
      useApi('/api/products')
    );

    await waitFor(() => !result.current.isLoading);

    const firstData = result.current.data;

    // Unmount and remount - should use cache
    rerender();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe(firstData);
  });

  test('retries on failure', async () => {
    let attempts = 0;
    global.fetch = jest.fn(() => {
      attempts++;
      if (attempts < 3) throw new Error('Network error');
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    const { result } = renderHook(() =>
      useApi('/api/endpoint', { retries: 3 })
    );

    await waitFor(() => !result.current.isLoading);

    expect(attempts).toBe(3);
    expect(result.current.data).toEqual({ success: true });
  });
});
```

---

## 📚 RESSOURCES

- **Hook source**: [`web/hooks/useApi.js`](web/hooks/useApi.js)
- **Cache lib**: [`web/libs/api-cache.js`](web/libs/api-cache.js)
- **Plan refactoring**: [`REFACTORING_PLAN.md`](REFACTORING_PLAN.md)
- **Liste composants**: Voir rapport Explore Agent ci-dessus

---

**Migration démarrée**: Février 2026
**Status**: Plan créé | 0/81 migrés (0%)
**Prochaine étape**: Migrer LayoutClient.js (critique)

**Commande pour démarrer**:
```bash
code web/components/LayoutClient.js
# Remplacer fetch par useApi selon pattern ci-dessus
```
