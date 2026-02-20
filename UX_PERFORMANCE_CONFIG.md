# ⚡ Configuration de Performance Next.js

## 📋 next.config.js Optimisé

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Optimisation des images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    domains: ['res.cloudinary.com', 'images.unsplash.com'],
  },

  // Compression et optimisation
  compress: true,
  swcMinify: true,

  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lodash',
      'date-fns',
      'react-icons',
      '@heroicons/react',
    ],
  },

  // Headers for better caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // PWA Support
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
});
```

## 🚀 Optimisations de Bundle

### 1. Dynamic Imports Stratégiques

```javascript
// components/DynamicLoader.js
import dynamic from 'next/dynamic';

// Composants lourds à charger dynamiquement
export const ChartComponent = dynamic(
  () => import('./ChartComponent'),
  {
    loading: () => <div className="h-64 bg-base-300 animate-pulse rounded-lg" />,
    ssr: false // Désactiver SSR pour les composants interactifs
  }
);

export const MapComponent = dynamic(
  () => import('./MapComponent'),
  {
    loading: () => <div className="h-96 bg-base-300 animate-pulse rounded-lg" />,
    ssr: false
  }
);

export const MarkdownEditor = dynamic(
  () => import('./MarkdownEditor'),
  {
    loading: () => <div className="h-64 bg-base-300 animate-pulse rounded-lg" />,
    ssr: false
  }
);
```

### 2. Code Splitting par Route

```javascript
// app/products/page.js
import dynamic from 'next/dynamic';

// Lazy load des sections non critiques
const ProductFilters = dynamic(() => import('@/components/ProductFilters'));
const ProductComparison = dynamic(() => import('@/components/ProductComparison'));
const ProductAnalytics = dynamic(() => import('@/components/ProductAnalytics'));

export default function ProductsPage() {
  return (
    <main>
      {/* Contenu critique chargé immédiatement */}
      <ProductList />

      {/* Contenu secondaire lazy-loaded */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ProductFilters />
      </Suspense>
    </main>
  );
}
```

## 📱 Optimisations Mobile Spécifiques

### 1. Viewport et Meta Tags

```html
<!-- app/layout.js -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
<meta name="theme-color" content="#6366f1" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

### 2. Font Optimization

```javascript
// app/layout.js
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
});
```

### 3. Prefetching Stratégique

```javascript
// components/SmartLink.js
import Link from 'next/link';
import { useInView } from 'react-intersection-observer';

export default function SmartLink({ href, children, ...props }) {
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
  });

  // Prefetch when link is visible
  const prefetch = inView;

  return (
    <Link ref={ref} href={href} prefetch={prefetch} {...props}>
      {children}
    </Link>
  );
}
```

## 🎯 Lighthouse Optimizations

### 1. Reduce JavaScript Execution Time

```javascript
// utils/debounce.js
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Usage in components
const SearchInput = () => {
  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    []
  );

  return (
    <input
      onChange={(e) => debouncedSearch(e.target.value)}
      className="touch-manipulation"
    />
  );
};
```

### 2. Optimize Cumulative Layout Shift (CLS)

```css
/* Réserver l'espace pour les images */
.image-container {
  aspect-ratio: 16/9;
  background: var(--base-300);
}

/* Fonts avec fallback approprié */
.heading {
  font-family: 'Inter', system-ui, sans-serif;
  font-display: swap;
}

/* Skeleton loaders pour éviter les sauts */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--base-300) 25%,
    var(--base-200) 50%,
    var(--base-300) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}
```

### 3. Reduce Time to Interactive (TTI)

```javascript
// Lazy load des scripts tiers
useEffect(() => {
  // Charger les analytics après le chargement initial
  if (window.requestIdleCallback) {
    requestIdleCallback(() => {
      loadAnalytics();
    });
  } else {
    setTimeout(loadAnalytics, 2000);
  }
}, []);
```

## 📊 Métriques Cibles

### Mobile (3G Slow)
- **FCP**: < 2.5s
- **LCP**: < 4s
- **TTI**: < 7s
- **CLS**: < 0.1
- **FID**: < 100ms

### Desktop
- **FCP**: < 1s
- **LCP**: < 2.5s
- **TTI**: < 3.5s
- **CLS**: < 0.05
- **FID**: < 50ms

## 🔧 Scripts de Build Optimisés

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "next start",
    "lighthouse": "lighthouse http://localhost:3000 --view",
    "lighthouse:mobile": "lighthouse http://localhost:3000 --emulated-form-factor=mobile --throttling-method=simulate --view"
  }
}
```

## ✅ Checklist de Déploiement

- [ ] Images optimisées avec next/image
- [ ] Fonts avec display: swap
- [ ] Code splitting pour les routes
- [ ] Lazy loading pour les composants lourds
- [ ] Compression gzip/brotli activée
- [ ] Headers de cache configurés
- [ ] Service Worker pour offline
- [ ] Meta tags pour mobile
- [ ] Manifest.json pour PWA
- [ ] Sitemap.xml généré
- [ ] Robots.txt configuré