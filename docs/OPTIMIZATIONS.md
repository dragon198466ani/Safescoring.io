# SafeScoring - Optimisations Implémentées

## Vue d'ensemble

Ce document résume toutes les optimisations implémentées pour améliorer les performances frontend et backend de SafeScoring.

---

## 1. Base de données - Temps Réel

### Migrations créées

| Migration | Description |
|-----------|-------------|
| `077_realtime_score_recalculation.sql` | Recalcul automatique des scores SAFE |
| `078_norms_cascade_updates.sql` | Cascades depuis norms vers tables dépendantes |
| `079_foreign_keys_integrity.sql` | Contraintes FK et intégrité référentielle |
| `080_realtime_all_tables.sql` | Temps réel pour user, setup, dashboard, 3D map |

### Triggers temps réel

```
norms (modification) 
  → safe_scoring_definitions (sync auto)
  → evaluations (mark stale)
  → score_recalculation_queue (recalcul)

evaluations (modification)
  → score_recalculation_queue
  → safe_scoring_results (recalcul)

user_setups (modification)
  → setup_history (log)
  → pg_notify (temps réel)

user_presence (modification)
  → pg_notify('presence_update')
```

---

## 2. API Optimisations

### Avant/Après - `/api/products/[slug]`

**Avant** (3 requêtes séquentielles):
```javascript
// 1. Fetch product
const { data: product } = await supabase.from("products").select(...);
// 2. Fetch evaluations
const { data: evaluations } = await supabase.from("evaluations").select(...);
// 3. Fetch scores
const { data: scores } = await supabase.from("safe_scoring_results").select(...);
```

**Après** (1 requête RPC):
```javascript
const product = await getProductComplete(slug);
```

**Gain**: 40-60% plus rapide

---

## 3. React Query - Caching Frontend

### Configuration

```javascript
// libs/query-client.js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 secondes
      gcTime: 5 * 60 * 1000,     // 5 minutes cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Hooks disponibles

```javascript
import { 
  useProduct,           // Produit par slug
  useProducts,          // Liste avec filtres
  useUserSetups,        // Setups utilisateur
  useUserWatchlist,     // Watchlist
  useIncidentsMap,      // Incidents pour carte
  useLeaderboard,       // Classement
} from "@/hooks";
```

### Exemple d'utilisation

```javascript
// Avant (fetch manuel)
const [product, setProduct] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch(`/api/products/${slug}`)
    .then(r => r.json())
    .then(setProduct)
    .finally(() => setLoading(false));
}, [slug]);

// Après (React Query)
const { data: product, isLoading } = useProduct(slug);
```

---

## 4. Imports Unifiés

### Supabase

```javascript
// Avant (imports dispersés)
import { supabase } from "@/libs/supabase";
import { getProductComplete } from "@/libs/supabase-optimized";

// Après (import unifié)
import { 
  getSupabase,
  getProductComplete,
  isSupabaseConfigured,
} from "@/libs/supabase";
```

### Security

```javascript
// Avant (6+ fichiers différents)
import { generateCsrfToken } from "@/libs/security";
import { quickProtect } from "@/libs/api-protection";
import { protectAuthenticatedRequest } from "@/libs/user-protection";

// Après (import unifié)
import { 
  generateCsrfToken,
  quickProtect,
  protectAuthenticatedRequest,
} from "@/libs/security";
```

---

## 5. Hooks Temps Réel

### Disponibles

```javascript
import {
  useRealtimeTable,           // Générique pour toute table
  useUserNotifications,       // Notifications utilisateur
  useWatchlistAlerts,         // Alertes watchlist
  useSetupRealtime,           // Changements setup
  useMapPresence,             // Présence 3D map
  useIncidentsRealtime,       // Nouveaux incidents
  useDashboardStats,          // Stats dashboard
  useAllRealtimeNotifications, // Tout combiné
} from "@/hooks";
```

### Exemple

```javascript
const { activeUsers, userCount, isConnected } = useMapPresence({
  onUserJoin: (user) => console.log("User joined:", user),
  onUserLeave: (user) => console.log("User left:", user),
});
```

---

## 6. Structure des fichiers

```
web/
├── libs/
│   ├── supabase/
│   │   └── index.js          # Exports unifiés Supabase
│   ├── security/
│   │   └── index.js          # Exports unifiés Security
│   ├── query-client.js       # Configuration React Query
│   └── ...
├── hooks/
│   ├── index.js              # Exports centralisés
│   ├── useQueries.js         # Hooks React Query
│   ├── useRealtimeNotifications.js  # Hooks temps réel
│   └── ...
└── components/
    └── LayoutClient.js       # QueryClientProvider ajouté
```

---

## 7. Commandes de vérification

### Vérifier l'état temps réel (SQL)

```sql
-- État de cohérence
SELECT * FROM v_data_coherence_status;

-- Intégrité référentielle
SELECT * FROM v_referential_integrity_check;

-- Statut MVP des normes
SELECT get_norms_mvp_status();

-- Santé temps réel
SELECT get_realtime_health();
```

### Réparer les incohérences

```sql
SELECT repair_data_coherence();
```

---

## 8. Prochaines optimisations suggérées

1. **Splitter Globe3D.jsx** (54KB) en sous-composants
2. **Réduire middleware.js** (665 lignes) - extraire rate limiting
3. **Ajouter prefetching** sur hover des liens produits
4. **Implémenter ISR** pour les pages statiques
5. **Optimiser images** avec next/image et formats modernes

---

## Métriques attendues

| Métrique | Avant | Après |
|----------|-------|-------|
| API /products/[slug] | ~300ms | ~120ms |
| Requêtes DB par page produit | 3 | 1 |
| Re-renders inutiles | Fréquents | Rares (cache) |
| Temps réel latence | N/A | <100ms |

---

*Dernière mise à jour: 2026-01-19*
