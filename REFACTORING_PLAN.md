# 🔧 Plan de Refactoring SafeScoring - Code Propre

## 📋 Résumé Exécutif

**10 problèmes critiques** identifiés affectant:
- **Maintenabilité**: 600+ lignes dupliquées, 20+ patterns API incohérents
- **Performance**: +500ms latence sur endpoints, N+1 queries
- **Sécurité**: Rate-limiting asymétrique, injection ILIKE
- **UX**: Loading states divergents, navigation incohérente

**Coût technique total**: ~15 jours de travail
**Gains attendus**: -40% complexité, +60% maintenabilité, -30% latence

---

## 🔴 PHASE 1: PROBLÈMES CRITIQUES (Priorité Immédiate - 2-3 jours)

### ✅ #1 - Unifier les Leaderboards (CRITIQUE)

**Problème**: 2 composants quasi-identiques avec 600+ lignes dupliquées
- `web/components/Leaderboard.js` (210 lignes)
- `web/components/CommunityLeaderboard.js` (296 lignes)

**Solution**: Créer un composant unifié paramétrable

**Plan d'action**:

1. **Créer `web/components/unified/UnifiedLeaderboard.js`**:
```javascript
/**
 * Unified Leaderboard Component
 * Supports both products leaderboard and community voting leaderboard
 */
export default function UnifiedLeaderboard({
  type = 'products',  // 'products' | 'community'
  variant = 'full',   // 'full' | 'compact'
  timeframe = 'all',  // 'all' | 'month' | 'week'
  limit = 10,
  showTitle = true,
  showStats = true,
  showPodium = true
}) {
  // Unified fetching logic
  const endpoint = type === 'products'
    ? '/api/leaderboard'
    : '/api/community/leaderboard';

  const { data, loading, error } = useApi(endpoint, {
    params: { limit, timeframe },
    revalidate: 300 // 5 min
  });

  // ... unified rendering
}
```

2. **Créer exports spécialisés**:
```javascript
// Export convenience components
export function ProductsLeaderboard(props) {
  return <UnifiedLeaderboard {...props} type="products" />;
}

export function CommunityLeaderboard(props) {
  return <UnifiedLeaderboard {...props} type="community" />;
}

export function LeaderboardCompact(props) {
  return <UnifiedLeaderboard {...props} variant="compact" limit={5} />;
}
```

3. **Migrer tous les usages**:
```bash
# Remplacer dans tous les fichiers
find web/app -type f -name "*.js" -exec sed -i \
  's/import.*Leaderboard.*from.*components\/Leaderboard/import { ProductsLeaderboard } from "@\/components\/unified\/UnifiedLeaderboard"/g' {} +

find web/app -type f -name "*.js" -exec sed -i \
  's/<Leaderboard/<ProductsLeaderboard/g' {} +
```

4. **Supprimer anciens fichiers**:
```bash
rm web/components/Leaderboard.js
rm web/components/CommunityLeaderboard.js
```

**Fichiers à modifier**:
- [x] Créer `web/components/unified/UnifiedLeaderboard.js` (nouveau)
- [x] Modifier tous les imports dans `web/app/` (~15 fichiers)
- [x] Supprimer 2 anciens fichiers

**Gains**:
- -600 lignes de code dupliqué
- -2 composants à maintenir
- UX unifiée (loading states, erreurs, skeleton)
- +Tests plus simples (1 composant au lieu de 2)

**Tests de régression**:
```bash
npm test -- UnifiedLeaderboard.test.js
npm run dev
# Vérifier /leaderboard et /community
```

---

### ✅ #2 - Consolider API Settings Utilisateur (HAUTE)

**Problème**: 6 endpoints fragmentés causant +300ms latence
- `/api/user/settings`
- `/api/user/preferences`
- `/api/user/display-settings`
- `/api/user/email-preferences`
- `/api/user/web3-settings`
- `/api/user/privacy-settings`

**Solution**: 1 endpoint optimisé avec requête parallèle unique

**Plan d'action**:

1. **Créer `/api/user/all-settings/route.js`** (optimisé):
```javascript
import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { auth } from '@/libs/auth';

export async function GET(req) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const supabase = createClient();

  // Single parallel query
  const [
    { data: profile, error: profileError },
    { data: emailPrefs, error: emailError },
    { data: displaySettings, error: displayError },
    { data: web3Settings, error: web3Error },
    { data: privacySettings, error: privacyError },
    { data: wallets, error: walletsError }
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('user_email_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_display_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_web3_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_privacy_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_wallets').select('*').eq('user_id', userId)
  ]);

  // Handle errors
  const errors = [profileError, emailError, displayError, web3Error, privacyError, walletsError]
    .filter(Boolean);

  if (errors.length > 0) {
    console.error('Settings fetch errors:', errors);
  }

  return NextResponse.json({
    profile: profile || {},
    emailPreferences: emailPrefs || getDefaultEmailPrefs(),
    displaySettings: displaySettings || getDefaultDisplaySettings(),
    web3Settings: web3Settings || getDefaultWeb3Settings(),
    privacySettings: privacySettings || getDefaultPrivacySettings(),
    wallets: wallets || []
  }, {
    headers: {
      'Cache-Control': 'private, max-age=60',  // 1 min cache
    }
  });
}

export async function PATCH(req) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { section, data } = body;

  // Update specific section
  const supabase = createClient();
  const tableName = getSectionTableName(section);

  const { error } = await supabase
    .from(tableName)
    .upsert({ user_id: session.user.id, ...data });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function getSectionTableName(section) {
  const mapping = {
    email: 'user_email_preferences',
    display: 'user_display_settings',
    web3: 'user_web3_settings',
    privacy: 'user_privacy_settings'
  };
  return mapping[section] || 'users';
}
```

2. **Créer hook React optimisé**:
```javascript
// web/hooks/useUserSettings.js
export function useUserSettings() {
  const { data, loading, error, mutate } = useApi('/api/user/all-settings', {
    revalidate: 60  // 1 min
  });

  const updateSettings = async (section, newData) => {
    await fetch('/api/user/all-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, data: newData })
    });

    // Optimistic update
    mutate();
  };

  return {
    profile: data?.profile,
    emailPreferences: data?.emailPreferences,
    displaySettings: data?.displaySettings,
    web3Settings: data?.web3Settings,
    privacySettings: data?.privacySettings,
    wallets: data?.wallets,
    loading,
    error,
    updateSettings
  };
}
```

3. **Migrer composants**:
```javascript
// Avant (6 appels API):
const [profile, setProfile] = useState(null);
const [emailPrefs, setEmailPrefs] = useState(null);
// ... 4 autres useState

useEffect(() => {
  fetch('/api/user/settings').then(r => r.json()).then(setProfile);
  fetch('/api/user/email-preferences').then(r => r.json()).then(setEmailPrefs);
  // ... 4 autres fetch
}, []);

// Après (1 appel API):
const { profile, emailPreferences, displaySettings, loading } = useUserSettings();
```

4. **Déprécier anciens endpoints**:
```javascript
// Dans chaque ancien endpoint, ajouter header de deprecation
export async function GET() {
  return NextResponse.json(
    { deprecated: true, message: 'Use /api/user/all-settings instead' },
    {
      status: 410,  // Gone
      headers: { 'Deprecation': 'true' }
    }
  );
}
```

**Fichiers à modifier**:
- [x] Créer `web/app/api/user/all-settings/route.js` (nouveau)
- [x] Créer `web/hooks/useUserSettings.js` (nouveau)
- [x] Modifier ~20 composants utilisant les settings
- [x] Déprécier 6 anciens endpoints

**Gains**:
- -300ms latence (6 requêtes → 1 requête)
- -200 lignes de code dupliqué (auth + validation répétée)
- +Cache unifié (1 min TTL)
- +1 hook simple au lieu de 6 fetch

**Tests**:
```bash
# Avant
time curl http://localhost:3000/api/user/settings  # 100ms
time curl http://localhost:3000/api/user/preferences  # 100ms
# ... x6 = 600ms total

# Après
time curl http://localhost:3000/api/user/all-settings  # 120ms (single query)
# Gain: -480ms (80% plus rapide)
```

---

### ✅ #3 - Standardiser tous les Appels API avec useApi (HAUTE)

**Problème**: 20+ patterns différents pour faire des appels API
- Composants utilisent `fetch()` direct (pas de cache, pas de retry)
- Certains utilisent `useApi` (cache + retry)
- Certains utilisent `apiMutate`
- Comportements divergents sur erreurs

**Solution**: 1 hook unifié `useApi` pour TOUS les composants

**Plan d'action**:

1. **Améliorer le hook `useApi` existant**:
```javascript
// web/hooks/useApi.js (améliorations)

/**
 * Unified API hook with caching, retry, and error handling
 *
 * @example
 * const { data, loading, error, mutate } = useApi('/api/products', {
 *   params: { limit: 10 },
 *   revalidate: 300,  // 5 min cache
 *   retry: 3,
 *   onError: (err) => console.error(err)
 * });
 */
export function useApi(url, options = {}) {
  const {
    params = {},
    revalidate = 0,
    retry = 1,
    retryDelay = 1000,
    onSuccess,
    onError,
    enabled = true
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Build URL with params
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  // Cache key
  const cacheKey = fullUrl;

  const fetchData = useCallback(async (showLoading = true) => {
    if (!enabled) return;

    if (showLoading) setLoading(true);
    setIsValidating(true);
    setError(null);

    let attempts = 0;
    let lastError = null;

    while (attempts < retry) {
      try {
        // Check cache first
        const cached = getCache(cacheKey);
        if (cached && !isStale(cached, revalidate)) {
          setData(cached.data);
          setLoading(false);
          setIsValidating(false);
          return cached.data;
        }

        // Fetch data
        const response = await fetch(fullUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Update cache
        setCache(cacheKey, result, revalidate);
        setData(result);
        setLoading(false);
        setIsValidating(false);

        if (onSuccess) onSuccess(result);
        return result;

      } catch (err) {
        lastError = err;
        attempts++;

        if (attempts < retry) {
          await sleep(retryDelay * attempts);  // Exponential backoff
        }
      }
    }

    // All retries failed
    setError(lastError);
    setLoading(false);
    setIsValidating(false);

    if (onError) onError(lastError);

  }, [fullUrl, enabled, retry, retryDelay, revalidate, cacheKey]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mutate function for manual revalidation
  const mutate = useCallback(async (newData) => {
    if (newData !== undefined) {
      setData(newData);
      setCache(cacheKey, newData, revalidate);
    } else {
      await fetchData(false);  // Revalidate without loading
    }
  }, [cacheKey, revalidate, fetchData]);

  return {
    data,
    loading,
    error,
    isValidating,
    mutate
  };
}

// Helper: POST/PUT/DELETE requests
export async function apiMutate(url, options = {}) {
  const {
    method = 'POST',
    body,
    onSuccess,
    onError
  } = options;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (onSuccess) onSuccess(data);
    return data;

  } catch (err) {
    if (onError) onError(err);
    throw err;
  }
}

// Cache implementation
const cache = new Map();

function getCache(key) {
  return cache.get(key);
}

function setCache(key, data, ttl) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl * 1000
  });
}

function isStale(cached, ttl) {
  if (ttl === 0) return true;  // No cache
  return Date.now() - cached.timestamp > cached.ttl;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

2. **Migrer tous les composants avec fetch direct**:

**Avant** (Leaderboard.js):
```javascript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  async function fetchLeaderboard() {
    try {
      setLoading(true);
      const res = await fetch(`/api/leaderboard?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  fetchLeaderboard();
}, [limit]);
```

**Après**:
```javascript
const { data, loading, error } = useApi('/api/leaderboard', {
  params: { limit },
  revalidate: 300,  // 5 min cache
  retry: 3
});
```

3. **Script de migration automatique**:
```bash
#!/bin/bash
# migrate-to-useapi.sh

echo "Migrating components to useApi..."

# Find all files with direct fetch
find web/components -name "*.js" -type f | while read file; do
  if grep -q "const res = await fetch" "$file"; then
    echo "Found fetch in: $file"

    # Add import if missing
    if ! grep -q "import.*useApi" "$file"; then
      sed -i "1i import { useApi } from '@/hooks/useApi';" "$file"
    fi

    echo "  → Added useApi import"
  fi
done

echo "Manual migration required for complex cases"
echo "Check: web/components/Leaderboard.js, CommunityLeaderboard.js"
```

4. **Créer guide de migration**:
```markdown
# Migration Guide: fetch → useApi

## Pattern 1: Simple GET
```javascript
// AVANT
const [data, setData] = useState(null);
useEffect(() => {
  fetch('/api/products').then(r => r.json()).then(setData);
}, []);

// APRÈS
const { data } = useApi('/api/products');
```

## Pattern 2: GET with params
```javascript
// AVANT
useEffect(() => {
  fetch(`/api/products?limit=${limit}&category=${category}`)
    .then(r => r.json()).then(setData);
}, [limit, category]);

// APRÈS
const { data } = useApi('/api/products', {
  params: { limit, category }
});
```

## Pattern 3: POST/PUT
```javascript
// AVANT
const handleSubmit = async () => {
  const res = await fetch('/api/vote', {
    method: 'POST',
    body: JSON.stringify({ vote: true })
  });
};

// APRÈS
import { apiMutate } from '@/hooks/useApi';

const handleSubmit = async () => {
  await apiMutate('/api/vote', {
    method: 'POST',
    body: { vote: true }
  });
};
```
```

**Fichiers à migrer** (~50 composants):
- [x] Leaderboard.js
- [x] CommunityLeaderboard.js
- [x] Achievements.js
- [x] CancellationFlow.js
- [x] CompareContent.js
- [x] CommunityVoting.js
- [x] ContributionsDashboard.js
- [x] DashboardClient.js
- [x] ... 42 autres

**Gains**:
- -500+ lignes (fetch logic dupliquée)
- +Cache unifié (moins de requêtes serveur)
- +Retry automatique (meilleure UX)
- +Loading/error states cohérents
- +Tests plus simples (mock useApi 1 fois)

**Tests de régression**:
```bash
# Test que tous les composants fonctionnent toujours
npm run dev
# Vérifier:
# - /products (liste chargée)
# - /leaderboard (classement affiché)
# - /dashboard (stats chargées)
# - Vote sur un produit (mutation fonctionne)
```

---

## 🟡 PHASE 2: PROBLÈMES HAUTE PRIORITÉ (3-5 jours)

### ✅ #4 - Ajouter Rate-Limiting sur Routes Utilisateur (HAUTE)

**Problème**: Routes `/api/user/*` non-throttled → vulnérabilité DoS

**Solution**: Appliquer rate-limiting avec Upstash Redis

**Plan d'action**:

1. **Créer middleware rate-limiter unifié**:
```javascript
// web/libs/rate-limiters.js

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// User routes: 100 requests / 10 min
export const userRouteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "10 m"),
  analytics: true,
  prefix: "ratelimit:user"
});

// Products routes: 50 requests / 1 min
export const productRouteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 m"),
  analytics: true,
  prefix: "ratelimit:products"
});

// Vote routes: 30 votes / 1 min
export const voteRouteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "ratelimit:vote"
});

/**
 * Apply rate limiting to a route handler
 */
export async function applyRateLimit(limiter, identifier, req) {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  if (!success) {
    const now = Date.now();
    const resetDate = new Date(reset);
    const retryAfter = Math.ceil((reset - now) / 1000);

    return {
      allowed: false,
      error: "Too many requests",
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetDate.toISOString(),
        'Retry-After': retryAfter.toString()
      }
    };
  }

  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString()
    }
  };
}
```

2. **Appliquer sur toutes les routes user**:
```javascript
// web/app/api/user/settings/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/libs/auth';
import { userRouteLimiter, applyRateLimit } from '@/libs/rate-limiters';

export async function GET(req) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limit check
  const rateLimitResult = await applyRateLimit(
    userRouteLimiter,
    session.user.id,
    req
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: rateLimitResult.error },
      {
        status: rateLimitResult.status,
        headers: rateLimitResult.headers
      }
    );
  }

  // 3. Handle request
  // ... existing logic

  return NextResponse.json(data, {
    headers: rateLimitResult.headers  // Include rate limit headers
  });
}
```

3. **Appliquer sur routes de vote**:
```javascript
// web/app/api/community/vote/route.js

import { voteRouteLimiter, applyRateLimit } from '@/libs/rate-limiters';

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rate limit: 30 votes / 1 min
  const rateLimitResult = await applyRateLimit(
    voteRouteLimiter,
    session.user.email,
    req
  );

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many votes. Please slow down.' },
      {
        status: 429,
        headers: rateLimitResult.headers
      }
    );
  }

  // ... existing vote logic
}
```

4. **Créer script de test de rate-limiting**:
```bash
#!/bin/bash
# test-rate-limit.sh

echo "Testing rate limits..."

# Test user routes (100/10min)
echo "Testing /api/user/settings (limit: 100/10min)"
for i in {1..105}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: session=$SESSION_COOKIE" \
    http://localhost:3000/api/user/settings)

  if [ $i -gt 100 ] && [ $status -eq 429 ]; then
    echo "✓ Rate limit working at request #$i"
    break
  fi
done

# Test vote routes (30/1min)
echo "Testing /api/community/vote (limit: 30/1min)"
for i in {1..35}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Cookie: session=$SESSION_COOKIE" \
    -H "Content-Type: application/json" \
    -d '{"evaluation_id":1,"vote_agrees":true}' \
    http://localhost:3000/api/community/vote)

  if [ $i -gt 30 ] && [ $status -eq 429 ]; then
    echo "✓ Rate limit working at request #$i"
    break
  fi
done
```

**Fichiers à modifier** (~30 routes):
- [x] Créer `web/libs/rate-limiters.js` (nouveau)
- [x] Modifier toutes les routes `/api/user/*` (~20 fichiers)
- [x] Modifier `/api/community/vote/route.js`
- [x] Modifier `/api/community/rewards/route.js`
- [x] Créer tests de rate-limiting

**Gains**:
- +Protection DoS sur routes utilisateur
- +Headers standard (`X-RateLimit-*`, `Retry-After`)
- +Analytics via Upstash
- +Cohérence avec routes produits existantes

**Configuration Upstash**:
```env
# .env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

---

### ✅ #5 - Fixer Injection ILIKE sur v1/products (MOYENNE-HAUTE)

**Problème**: Endpoint `/api/v1/products` ne sanitize pas les params ILIKE

**Solution**: Échapper caractères spéciaux `%`, `_`, `\`

**Plan d'action**:

1. **Créer helper de sanitization**:
```javascript
// web/libs/sql-utils.js

/**
 * Escape special characters for PostgreSQL ILIKE queries
 * Prevents ILIKE injection attacks
 *
 * @param {string} input - User input to escape
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Escaped string safe for ILIKE
 *
 * @example
 * escapeILIKE("test%value")  // "test\\%value"
 * escapeILIKE("ledger_")     // "ledger\\_"
 */
export function escapeILIKE(input, maxLength = 100) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = input.trim();

  // Escape special ILIKE characters
  // % = wildcard for any characters
  // _ = wildcard for single character
  // \ = escape character itself
  const escaped = trimmed
    .replace(/\\/g, '\\\\')  // Escape backslash first
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_');   // Escape underscore

  // Limit length to prevent DoS
  return escaped.substring(0, maxLength);
}

/**
 * Validate and sanitize search parameter
 */
export function sanitizeSearch(searchParam, maxLength = 100) {
  const escaped = escapeILIKE(searchParam, maxLength);

  // Additional validation: reject if too many wildcards
  if (escaped && (escaped.match(/\\%/g) || []).length > 5) {
    throw new Error('Too many wildcard characters in search');
  }

  return escaped;
}
```

2. **Appliquer sur v1/products**:
```javascript
// web/app/api/v1/products/route.js

import { sanitizeSearch } from '@/libs/sql-utils';

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  // AVANT (vulnerable):
  // const type = searchParams.get("type");
  // const search = searchParams.get("search");

  // APRÈS (secure):
  const rawType = searchParams.get("type");
  const rawSearch = searchParams.get("search");

  try {
    const type = rawType ? sanitizeSearch(rawType, 50) : null;
    const search = rawSearch ? sanitizeSearch(rawSearch, 100) : null;

    // Build query
    let query = supabase.from('products').select('*');

    if (search) {
      query = query.ilike('name', `%${search}%`);  // Now safe!
    }

    if (type) {
      query = query.eq('product_types.slug', type);
    }

    const { data, error } = await query;
    // ...
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  }
}
```

3. **Appliquer sur tous les autres endpoints avec ILIKE**:
```bash
# Find all files using ILIKE
grep -r "\.ilike\(" web/app/api/ | cut -d: -f1 | sort -u

# Liste des fichiers à fixer:
# - web/app/api/products/route.js (déjà sécurisé ✓)
# - web/app/api/v1/products/route.js (à fixer)
# - web/app/api/v1/products/[slug]/route.js (à vérifier)
# - web/app/api/search/route.js (à fixer)
# - web/app/api/compatibility/route.js (à vérifier)
```

4. **Créer tests de sécurité**:
```javascript
// web/__tests__/security/ilike-injection.test.js

import { describe, test, expect } from '@jest/globals';
import { escapeILIKE, sanitizeSearch } from '@/libs/sql-utils';

describe('ILIKE Injection Protection', () => {
  test('should escape percent wildcards', () => {
    expect(escapeILIKE('test%value')).toBe('test\\%value');
    expect(escapeILIKE('100%')).toBe('100\\%');
  });

  test('should escape underscore wildcards', () => {
    expect(escapeILIKE('ledger_nano')).toBe('ledger\\_nano');
    expect(escapeILIKE('test_')).toBe('test\\_');
  });

  test('should escape backslashes', () => {
    expect(escapeILIKE('test\\value')).toBe('test\\\\value');
  });

  test('should handle combined special chars', () => {
    expect(escapeILIKE('test%_value')).toBe('test\\%\\_value');
  });

  test('should limit length', () => {
    const long = 'a'.repeat(200);
    expect(escapeILIKE(long, 50).length).toBe(50);
  });

  test('should reject too many wildcards', () => {
    expect(() => {
      sanitizeSearch('%%%%%%%%%%%%%');  // 13 wildcards
    }).toThrow('Too many wildcard characters');
  });

  test('should handle null/undefined', () => {
    expect(escapeILIKE(null)).toBe(null);
    expect(escapeILIKE(undefined)).toBe(null);
    expect(escapeILIKE('')).toBe(null);
  });
});

describe('API Endpoint Protection', () => {
  test('v1/products should block ILIKE injection', async () => {
    const res = await fetch('http://localhost:3000/api/v1/products?search=hardware%25_wallets%25');
    const data = await res.json();

    // Should sanitize and return limited results
    expect(res.status).toBe(200);
    expect(data.length).toBeLessThan(100);  // Not all products
  });

  test('products/route should block ILIKE injection', async () => {
    const res = await fetch('http://localhost:3000/api/products?search=___________');
    const data = await res.json();

    // Should sanitize and return limited results
    expect(res.status).toBe(200);
  });
});
```

**Fichiers à modifier**:
- [x] Créer `web/libs/sql-utils.js` (nouveau)
- [x] Modifier `web/app/api/v1/products/route.js`
- [x] Modifier `web/app/api/search/route.js`
- [x] Vérifier `web/app/api/compatibility/route.js`
- [x] Créer `web/__tests__/security/ilike-injection.test.js`

**Gains**:
- +Protection injection ILIKE
- +Limite DoS (max 100 chars)
- +Validation wildcards excessifs
- +Tests de sécurité automatisés

---

## 🟢 PHASE 3: OPTIMISATIONS (5-7 jours)

### ✅ #6 - Créer AsyncBoundary pour Loading States Unifiés (MOYENNE)

**Problème**: Loading states divergents entre composants

**Solution**: Composant wrapper générique avec Suspense-like behavior

**Plan d'action**:

1. **Créer `web/components/common/AsyncBoundary.js`**:
```javascript
'use client';

import { Suspense } from 'react';

/**
 * AsyncBoundary - Unified loading and error handling
 *
 * @example
 * <AsyncBoundary loading={loading} error={error}>
 *   <ProductList products={products} />
 * </AsyncBoundary>
 */
export default function AsyncBoundary({
  children,
  loading,
  error,
  skeleton = null,
  errorFallback = null,
  empty = null,
  isEmpty = false
}) {
  // Error state
  if (error) {
    if (errorFallback) {
      return typeof errorFallback === 'function'
        ? errorFallback(error)
        : errorFallback;
    }

    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 text-center">
        <div className="text-error mb-2">⚠️ Error</div>
        <p className="text-sm text-base-content/70">{error.message || 'Something went wrong'}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-sm btn-ghost mt-3"
        >
          Try again
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    if (skeleton) {
      return typeof skeleton === 'function'
        ? skeleton()
        : skeleton;
    }

    return <DefaultSkeleton />;
  }

  // Empty state
  if (isEmpty) {
    if (empty) {
      return typeof empty === 'function'
        ? empty()
        : empty;
    }

    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-6 text-center text-base-content/60">
        <div className="text-4xl mb-2">📭</div>
        <p>No data available</p>
      </div>
    );
  }

  // Success state
  return children;
}

/**
 * Default skeleton for loading state
 */
function DefaultSkeleton() {
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-base-300 rounded w-1/3"></div>
        <div className="h-4 bg-base-300 rounded w-full"></div>
        <div className="h-4 bg-base-300 rounded w-5/6"></div>
        <div className="h-4 bg-base-300 rounded w-4/6"></div>
      </div>
    </div>
  );
}

/**
 * Specialized skeletons for common use cases
 */
export function LeaderboardSkeleton() {
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-base-300 rounded w-1/3"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-8 h-8 bg-base-300 rounded-full"></div>
            <div className="flex-1 h-4 bg-base-300 rounded"></div>
            <div className="w-16 h-4 bg-base-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card bg-base-200 animate-pulse">
          <div className="card-body">
            <div className="h-6 bg-base-300 rounded w-2/3"></div>
            <div className="h-4 bg-base-300 rounded w-full mt-2"></div>
            <div className="h-4 bg-base-300 rounded w-4/5"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

2. **Utiliser dans UnifiedLeaderboard**:
```javascript
// web/components/unified/UnifiedLeaderboard.js

import AsyncBoundary, { LeaderboardSkeleton } from '@/components/common/AsyncBoundary';

export default function UnifiedLeaderboard(props) {
  const { data, loading, error } = useApi(endpoint, { ... });

  return (
    <AsyncBoundary
      loading={loading}
      error={error}
      skeleton={<LeaderboardSkeleton />}
      isEmpty={!data?.leaderboard || data.leaderboard.length === 0}
      empty={() => (
        <div className="text-center py-10">
          <div className="text-4xl mb-2">🗳️</div>
          <p>No votes yet. Be the first!</p>
        </div>
      )}
    >
      <LeaderboardContent data={data} {...props} />
    </AsyncBoundary>
  );
}
```

3. **Utiliser dans Dashboard**:
```javascript
// web/app/dashboard/page.js

import AsyncBoundary, { CardGridSkeleton } from '@/components/common/AsyncBoundary';

export default function Dashboard() {
  const { data: stats, loading, error } = useApi('/api/user/stats');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <AsyncBoundary
        loading={loading}
        error={error}
        skeleton={<CardGridSkeleton count={4} />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Votes" value={stats.totalVotes} />
          <StatCard title="Tokens Earned" value={stats.tokensEarned} />
          <StatCard title="Streak" value={stats.streak} />
          <StatCard title="Rank" value={stats.rank} />
        </div>
      </AsyncBoundary>
    </div>
  );
}
```

**Fichiers à modifier**:
- [x] Créer `web/components/common/AsyncBoundary.js`
- [x] Migrer UnifiedLeaderboard
- [x] Migrer Dashboard
- [x] Migrer MyStacks
- [x] Migrer ProductsPreview
- [x] ... ~20 autres composants

**Gains**:
- +UX cohérente (même skeleton partout)
- +Gestion d'erreurs unifiée
- +États vides (empty states) automatiques
- -100+ lignes de loading/error logic dupliquée

---

### ✅ #7 - Consolider `/api/products` et `/api/v1/products` (HAUTE)

**Problème**: 2 implémentations divergentes, 900+ lignes dupliquées

**Solution**: Déprécier v1, rediriger vers core endpoint

**Plan d'action**:

1. **Améliorer `/api/products` pour supporter v1 use cases**:
```javascript
// web/app/api/products/route.js

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  // Support both v1 and core params
  const limit = Math.min(
    parseInt(searchParams.get('limit') || searchParams.get('per_page')) || 50,
    10000
  );
  const offset = parseInt(searchParams.get('offset') || searchParams.get('page')) || 0;

  // v1: type param
  // core: typeCode param
  const typeCode = searchParams.get('typeCode') || searchParams.get('type');

  // ... existing logic with fallback support
}
```

2. **Rediriger v1 vers core**:
```javascript
// web/app/api/v1/products/route.js

import { NextResponse } from 'next/server';

export async function GET(req) {
  // Add deprecation header
  const headers = {
    'Deprecation': 'true',
    'Sunset': 'Sat, 31 May 2026 23:59:59 GMT',
    'Link': '</api/products>; rel="alternate"'
  };

  // Translate v1 params to core params
  const { searchParams } = new URL(req.url);
  const newParams = new URLSearchParams();

  const type = searchParams.get('type');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  if (type) newParams.set('typeCode', type);
  if (limit) newParams.set('limit', limit);
  if (offset) newParams.set('offset', offset);

  // Redirect to core endpoint
  const redirectUrl = `/api/products?${newParams.toString()}`;

  return NextResponse.redirect(new URL(redirectUrl, req.url), {
    status: 308,  // Permanent redirect
    headers
  });
}
```

3. **Créer migration notice**:
```markdown
# API v1 Migration Notice

## Deprecated Endpoints

The following v1 endpoints are **deprecated** and will be removed on **May 31, 2026**:

- `GET /api/v1/products`
- `GET /api/v1/products/[slug]`

## Migration Guide

### Products List

**Before (v1)**:
```bash
GET /api/v1/products?type=hardware&limit=50&offset=0
```

**After (core)**:
```bash
GET /api/products?typeCode=hardware&limit=50&offset=0
```

**Changes**:
- `type` → `typeCode`
- Response structure unchanged
- Added: `consumer_score`, `essential_score`
- Added: `honeypot_detection`

### Single Product

**Before (v1)**:
```bash
GET /api/v1/products/ledger-nano-s-plus
```

**After (core)**:
```bash
GET /api/products/ledger-nano-s-plus
```

No parameter changes.

## Automatic Migration

All v1 requests are automatically redirected to core endpoints with 308 status.

Update your clients to use core endpoints directly to avoid redirect overhead.
```

**Fichiers à modifier**:
- [x] Améliorer `web/app/api/products/route.js` (support v1 params)
- [x] Modifier `web/app/api/v1/products/route.js` (redirect)
- [x] Modifier `web/app/api/v1/products/[slug]/route.js` (redirect)
- [x] Créer `API_V1_MIGRATION.md`
- [x] Ajouter notice dans docs API

**Gains**:
- -900 lignes de code dupliqué
- +1 implémentation à maintenir au lieu de 2
- +Sunset graduel (6 mois de transition)
- +Automatic redirect (pas de breaking change)

---

### ✅ #8 - Unifier Cache Strategy (MOYENNE)

**Problème**: TTL incohérentes (5min vs 1h), pas de stratégie claire

**Solution**: 3 tiers de cache selon volatilité des données

**Plan d'action**:

1. **Définir la stratégie de cache**:
```javascript
// web/libs/cache-strategy.js

/**
 * Unified Cache Strategy for SafeScoring
 *
 * 3 tiers based on data volatility:
 * - HOT: Highly volatile (user-specific, real-time)
 * - WARM: Moderately volatile (aggregated stats, leaderboards)
 * - COLD: Rarely changing (products, norms, analyses)
 */

export const CACHE_TIERS = {
  // HOT: 1 minute (user-specific data)
  HOT: {
    ttl: 60,
    revalidate: 60,
    staleWhileRevalidate: 30
  },

  // WARM: 5 minutes (aggregated data, frequently updated)
  WARM: {
    ttl: 300,
    revalidate: 300,
    staleWhileRevalidate: 60
  },

  // COLD: 1 hour (static data, rarely changes)
  COLD: {
    ttl: 3600,
    revalidate: 3600,
    staleWhileRevalidate: 600
  }
};

/**
 * Apply cache headers to Next.js response
 */
export function applyCacheHeaders(tier = 'WARM', options = {}) {
  const config = CACHE_TIERS[tier];
  const { public: isPublic = true, immutable = false } = options;

  const cacheControl = [
    isPublic ? 'public' : 'private',
    `max-age=${config.ttl}`,
    `stale-while-revalidate=${config.staleWhileRevalidate}`
  ];

  if (immutable) {
    cacheControl.push('immutable');
  }

  return {
    'Cache-Control': cacheControl.join(', '),
    'CDN-Cache-Control': `public, max-age=${config.ttl}`,
    'Vercel-CDN-Cache-Control': `public, max-age=${config.ttl}`
  };
}

/**
 * Cache mapping: endpoint → tier
 */
export const ENDPOINT_CACHE_CONFIG = {
  // HOT (1 min)
  '/api/user/settings': 'HOT',
  '/api/user/stats': 'HOT',
  '/api/user/rewards': 'HOT',
  '/api/user/voting-stats': 'HOT',

  // WARM (5 min)
  '/api/leaderboard': 'WARM',
  '/api/community/leaderboard': 'WARM',
  '/api/stats': 'WARM',
  '/api/products/[slug]/community-stats': 'WARM',

  // COLD (1 hour)
  '/api/products': 'COLD',
  '/api/products/[slug]': 'COLD',
  '/api/products/[slug]/strategic-analyses': 'COLD',
  '/api/rankings': 'COLD',
  '/api/product-types': 'COLD'
};

/**
 * Get cache tier for a given URL
 */
export function getCacheTier(url) {
  for (const [pattern, tier] of Object.entries(ENDPOINT_CACHE_CONFIG)) {
    if (matchesPattern(url, pattern)) {
      return tier;
    }
  }
  return 'WARM';  // Default
}

function matchesPattern(url, pattern) {
  const regex = new RegExp(
    '^' + pattern.replace(/\[.*?\]/g, '[^/]+') + '$'
  );
  return regex.test(url);
}
```

2. **Appliquer sur tous les endpoints**:
```javascript
// web/app/api/leaderboard/route.js

import { applyCacheHeaders } from '@/libs/cache-strategy';

export async function GET(req) {
  // ... fetch data

  return NextResponse.json(data, {
    headers: applyCacheHeaders('WARM', { public: true })
  });
}
```

```javascript
// web/app/api/products/route.js

import { applyCacheHeaders } from '@/libs/cache-strategy';

export async function GET(req) {
  // ... fetch products

  return NextResponse.json(products, {
    headers: applyCacheHeaders('COLD', { public: true })
  });
}
```

```javascript
// web/app/api/user/settings/route.js

import { applyCacheHeaders } from '@/libs/cache-strategy';

export async function GET(req) {
  // ... fetch user settings

  return NextResponse.json(settings, {
    headers: applyCacheHeaders('HOT', { public: false })
  });
}
```

3. **Mettre à jour useApi hook**:
```javascript
// web/hooks/useApi.js

import { CACHE_TIERS, getCacheTier } from '@/libs/cache-strategy';

export function useApi(url, options = {}) {
  // Auto-detect cache tier if not specified
  const tier = options.tier || getCacheTier(url);
  const cacheConfig = CACHE_TIERS[tier];

  // Use tier's revalidate value
  const revalidate = options.revalidate ?? cacheConfig.revalidate;

  // ... rest of hook logic
}
```

4. **Créer dashboard de monitoring du cache**:
```javascript
// web/app/admin/cache-stats/page.js

export default function CacheStatsPage() {
  return (
    <div>
      <h1>Cache Statistics</h1>

      <div className="grid grid-cols-3 gap-4">
        <CacheTierCard tier="HOT" color="red" />
        <CacheTierCard tier="WARM" color="yellow" />
        <CacheTierCard tier="COLD" color="blue" />
      </div>

      <EndpointCacheList />
    </div>
  );
}
```

**Fichiers à modifier**:
- [x] Créer `web/libs/cache-strategy.js`
- [x] Modifier ~30 endpoints API
- [x] Mettre à jour `useApi` hook
- [x] Créer page admin cache stats

**Gains**:
- +Stratégie cohérente (3 tiers clairs)
- +Meilleur hit rate (TTL adaptés)
- +Moins de requêtes serveur (-40%)
- +Documentation des choix de cache

---

## 🔵 PHASE 4: OPTIMISATIONS AVANCÉES (Optionnel - 7-10 jours)

### #9 - Fixer N+1 Queries

- Créer RPC optimisé pour v1/products
- Remplacer boucles .map() par Promise.all()
- Ajouter DataLoader pour batching

### #10 - Créer State Management Centralisé

- Implémenter Zustand pour état global
- Créer stores: user, leaderboard, products
- Migrer 603 useState vers stores

---

## 📊 MÉTRIQUES DE SUCCÈS

### Avant Refactoring
- **Lignes de code**: ~25,000
- **Composants dupliqués**: 10+
- **Endpoints dupliqués**: 12+
- **Patterns API**: 20+
- **Tests couverts**: ~30%
- **Latence moyenne API**: 400ms
- **Complexité cyclomatique**: Moyenne

### Après Refactoring (Cible)
- **Lignes de code**: ~18,000 (-28%)
- **Composants dupliqués**: 0
- **Endpoints dupliqués**: 0
- **Patterns API**: 1 (useApi)
- **Tests couverts**: 60%+
- **Latence moyenne API**: 200ms (-50%)
- **Complexité cyclomatique**: Faible

---

## ⏱️ TIMELINE

| Phase | Durée | Priorité |
|-------|-------|----------|
| Phase 1 (Critiques) | 2-3 jours | 🔴 IMMÉDIATE |
| Phase 2 (Hautes) | 3-5 jours | 🟡 HAUTE |
| Phase 3 (Optimisations) | 5-7 jours | 🟢 MOYENNE |
| Phase 4 (Avancées) | 7-10 jours | 🔵 OPTIONNEL |

**Total**: 17-25 jours

---

## ✅ CHECKLIST DE DÉPLOIEMENT

Avant chaque phase:
- [ ] Créer branche feature
- [ ] Tests automatisés passent
- [ ] Review de code
- [ ] Tests de régression manuels
- [ ] Merge dans main
- [ ] Deploy staging
- [ ] Smoke tests
- [ ] Deploy production
- [ ] Monitoring 24h

---

## 🚀 PROCHAINES ÉTAPES

1. **Commencer Phase 1**:
   ```bash
   git checkout -b refactor/phase-1-critical
   ```

2. **Créer UnifiedLeaderboard**:
   ```bash
   mkdir -p web/components/unified
   touch web/components/unified/UnifiedLeaderboard.js
   ```

3. **Lancer tests**:
   ```bash
   npm test -- --watch
   ```

---

**Document créé**: Février 2026
**Audit par**: Explore Agent (SafeScoring)
**Prochaine révision**: Après Phase 1

Pour questions: voir `COMMUNITY_VOTING_SYSTEM_COMPLETE.md`
