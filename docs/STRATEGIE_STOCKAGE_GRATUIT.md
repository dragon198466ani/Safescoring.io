# 🚀 Stratégie Stockage Gratuit - SafeScoring

## Objectif
Stocker **10x plus de données** sans payer, en répartissant intelligemment sur plusieurs services gratuits.

---

## 📊 Architecture Multi-Tier

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SAFESCORING DATA ARCHITECTURE                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TIER 1: Supabase Principal (500 MB) - HOT DATA                    │
│  ├── users, profiles, subscriptions                                │
│  ├── user_setups, user_watchlist                                   │
│  ├── donations, fiat_payments                                      │
│  └── Realtime subscriptions                                        │
│                                                                     │
│  TIER 2: Supabase Secondaire (500 MB) - REFERENCE DATA             │
│  ├── norms (2000+ normes)                                          │
│  ├── products, evaluations                                         │
│  ├── physical_incidents                                            │
│  └── crypto_legislation                                            │
│                                                                     │
│  TIER 3: Turso (9 GB gratuit) - HISTORICAL DATA                    │
│  ├── evaluation_history                                            │
│  ├── score_history                                                 │
│  ├── audit_logs (archivés)                                         │
│  └── predictions                                                   │
│                                                                     │
│  TIER 4: Upstash Redis (10K req/jour) - CACHE                      │
│  ├── API response cache                                            │
│  ├── Rate limiting                                                 │
│  └── Session tokens                                                │
│                                                                     │
│  TIER 5: Cloudflare R2 (10 GB gratuit) - FILES                     │
│  ├── PDF reports                                                   │
│  ├── Norm documents                                                │
│  └── Product logos/images                                          │
│                                                                     │
│  TIER 6: Git/CDN Static (illimité) - READ-ONLY                     │
│  ├── norms.json (build-time)                                       │
│  ├── product_types.json                                            │
│  └── Static configurations                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💾 Capacité Totale Gratuite

| Service | Stockage | Usage |
|---------|----------|-------|
| **Supabase #1** | 500 MB | Users, setups, payments |
| **Supabase #2** | 500 MB | Products, norms, evaluations |
| **Turso** | 9 GB | Historical data, archives |
| **Upstash Redis** | 256 MB | Cache, rate limiting |
| **Cloudflare R2** | 10 GB | Files, PDFs, images |
| **Vercel Blob** | 1 GB | Temporary files |
| **Git LFS** | 1 GB | Static JSON data |
| **TOTAL** | **~22 GB** | 🎉 |

---

## 🔧 Implémentation par Service

### 1. Supabase #2 (Nouveau projet pour reference data)

**Créer sur:** https://supabase.com/dashboard → New Project

**Tables à migrer:**
- `norms` (~200 MB estimé avec 2000+ normes)
- `products` (~50 MB)
- `evaluations` (~150 MB)
- `product_types` (~1 MB)
- `physical_incidents` (~10 MB)
- `crypto_legislation` (~5 MB)

**Avantage:** Ces données changent rarement, pas besoin de Realtime

---

### 2. Turso (SQLite distribué - 9GB gratuit)

**Inscription:** https://turso.tech (gratuit, pas de CB)

**Parfait pour:**
- `evaluation_history` (immutable, append-only)
- `score_history` (time-series)
- `audit_logs` archivés
- `predictions` validées

**Code d'intégration:**
```javascript
// libs/turso.js
import { createClient } from '@libsql/client';

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Exemple: archiver les anciens logs
export async function archiveAuditLogs(logs) {
  await turso.execute({
    sql: 'INSERT INTO audit_logs_archive (id, action, created_at, data) VALUES (?, ?, ?, ?)',
    args: logs.map(l => [l.id, l.action, l.created_at, JSON.stringify(l)])
  });
}
```

---

### 3. Upstash Redis (Cache gratuit)

**Inscription:** https://upstash.com (10K requêtes/jour gratuit)

**Usage:**
```javascript
// libs/cache.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Cache API responses
export async function cachedFetch(key, fetcher, ttl = 3600) {
  const cached = await redis.get(key);
  if (cached) return cached;

  const data = await fetcher();
  await redis.set(key, data, { ex: ttl });
  return data;
}

// Cache les produits populaires (évite 90% des requêtes Supabase)
export async function getTopProducts() {
  return cachedFetch('top_products', async () => {
    const { data } = await supabase.from('products').select('*').limit(50);
    return data;
  }, 300); // 5 min cache
}
```

---

### 4. Cloudflare R2 (10GB fichiers gratuit)

**Inscription:** https://dash.cloudflare.com → R2

**Usage:**
- PDFs générés (`/api/products/[slug]/pdf`)
- Documents de normes scrapés
- Logos produits (au lieu de URLs externes)

```javascript
// libs/r2.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadPDF(slug, pdfBuffer) {
  await R2.send(new PutObjectCommand({
    Bucket: 'safescoring-files',
    Key: `reports/${slug}.pdf`,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  }));
  return `https://files.safescoring.io/reports/${slug}.pdf`;
}
```

---

### 5. Static JSON (Build-time data)

**Pour données qui changent rarement:**

```javascript
// scripts/export_static_data.js
// Exporter norms.json à chaque build

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function exportStaticData() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  // Export norms
  const { data: norms } = await supabase.from('norms').select('*');
  fs.writeFileSync('public/data/norms.json', JSON.stringify(norms));

  // Export product_types
  const { data: types } = await supabase.from('product_types').select('*');
  fs.writeFileSync('public/data/product_types.json', JSON.stringify(types));

  console.log('Static data exported!');
}

exportStaticData();
```

**Dans next.config.js:**
```javascript
// Charger au build-time, pas runtime
export async function getStaticProps() {
  const norms = require('../public/data/norms.json');
  return { props: { norms } };
}
```

---

## 📈 Migration Progressive

### Phase 1: Urgence (maintenant)
1. Nettoyer Supabase #1 avec EMERGENCY_cleanup_max.sql
2. Créer Supabase #2 pour reference data

### Phase 2: Cache (semaine 1)
1. Setup Upstash Redis
2. Cacher les requêtes fréquentes (products, leaderboard)
3. Réduire 80% des lectures Supabase

### Phase 3: Archive (semaine 2)
1. Setup Turso
2. Migrer historical data
3. Configurer auto-archive mensuel

### Phase 4: Files (semaine 3)
1. Setup Cloudflare R2
2. Migrer PDFs et images
3. Libérer espace Supabase

---

## 🔄 Routing Intelligent

```javascript
// libs/data-router.js
// Router les requêtes vers le bon stockage

export async function getProduct(slug) {
  // 1. Check Redis cache first
  const cached = await redis.get(`product:${slug}`);
  if (cached) return cached;

  // 2. Fetch from Supabase #2 (reference data)
  const { data } = await supabaseRef.from('products').select('*').eq('slug', slug).single();

  // 3. Cache for next time
  await redis.set(`product:${slug}`, data, { ex: 300 });

  return data;
}

export async function getUserSetups(userId) {
  // User data stays in Supabase #1
  return supabaseMain.from('user_setups').select('*').eq('user_id', userId);
}

export async function getScoreHistory(productId) {
  // Historical data from Turso
  return turso.execute({
    sql: 'SELECT * FROM score_history WHERE product_id = ? ORDER BY recorded_at DESC',
    args: [productId]
  });
}
```

---

## 💡 Astuces Bonus

### 1. Compression JSONB
```sql
-- Stocker les gros JSON compressés
ALTER TABLE evaluations
ADD COLUMN data_compressed BYTEA;

-- À l'insertion, compresser avec pg_compress
```

### 2. Partitioning par date
```sql
-- Partitionner les tables volumineuses
CREATE TABLE audit_logs_2024 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### 3. Materialized Views
```sql
-- Pré-calculer les stats au lieu de les recalculer
CREATE MATERIALIZED VIEW product_stats AS
SELECT product_id, AVG(score) as avg_score, COUNT(*) as eval_count
FROM evaluations GROUP BY product_id;

-- Refresh 1x/jour
REFRESH MATERIALIZED VIEW product_stats;
```

### 4. Cleanup automatique GitHub Actions
```yaml
# .github/workflows/db-cleanup.yml
name: Monthly DB Cleanup
on:
  schedule:
    - cron: '0 4 1 * *'  # 1er du mois à 4h
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/rest/v1/rpc/monthly_cleanup \
            -H "apikey: ${{ secrets.SUPABASE_KEY }}"
```

---

## 📊 Estimation Finale

| Donnée | Volume | Stockage | Coût |
|--------|--------|----------|------|
| Users/Setups | 100 MB | Supabase #1 | $0 |
| Products/Norms | 300 MB | Supabase #2 | $0 |
| Evaluations | 500 MB | Supabase #2 | $0 |
| History/Archive | 2 GB | Turso | $0 |
| Cache | 100 MB | Upstash | $0 |
| Files/PDFs | 5 GB | Cloudflare R2 | $0 |
| **TOTAL** | **~8 GB** | Multi-tier | **$0** |

Vs Supabase Pro seul: $25/mois pour 8GB

---

## ✅ Checklist Setup

- [ ] Nettoyer Supabase actuel (EMERGENCY script)
- [ ] Créer Supabase #2 (reference data)
- [ ] Créer compte Turso (historical)
- [ ] Créer compte Upstash (cache)
- [ ] Créer compte Cloudflare (files)
- [ ] Implémenter data router
- [ ] Configurer auto-archive
- [ ] Tester tous les flows
