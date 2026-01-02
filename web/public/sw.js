/**
 * SafeScoring Service Worker
 * Provides offline caching and performance optimization
 */

const CACHE_VERSION = 2;
const CACHE_NAME = `safescoring-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `safescoring-runtime-v${CACHE_VERSION}`;
const API_CACHE = `safescoring-api-v${CACHE_VERSION}`;

// API cache TTL (in milliseconds)
const API_CACHE_TTL = {
  '/api/stats': 60 * 60 * 1000, // 1 hour
  '/api/leaderboard': 5 * 60 * 1000, // 5 minutes
  '/api/products': 10 * 60 * 1000, // 10 minutes
  default: 5 * 60 * 1000, // 5 minutes default
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/products',
  '/leaderboard',
  '/offline.html',
  '/manifest.json',
];

// Cache strategies
const CACHE_FIRST_PATTERNS = [
  /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(woff|woff2|ttf|otf)$/,
  /\.(css)$/,
];

const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /supabase/,
];

const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/_next\/static\//,
  /\.js$/,
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache some static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Determine caching strategy
  if (CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
  } else if (NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request));
  } else if (STALE_WHILE_REVALIDATE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    // Default: network first for HTML pages
    event.respondWith(networkFirst(request));
  }
});

// Cache First: good for static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network First: good for API calls and dynamic content
async function networkFirst(request) {
  const url = new URL(request.url);
  const isApiRequest = url.pathname.startsWith('/api/');

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cacheName = isApiRequest ? API_CACHE : RUNTIME_CACHE;
      const cache = await caches.open(cacheName);

      // For API requests, store with timestamp for TTL checking
      if (isApiRequest) {
        const clonedResponse = response.clone();
        const headers = new Headers(clonedResponse.headers);
        headers.set('sw-cache-time', Date.now().toString());
        const cachedResponse = new Response(await clonedResponse.blob(), {
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers: headers,
        });
        cache.put(request, cachedResponse);
      } else {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);

    // Check API cache TTL
    if (cached && isApiRequest) {
      const cacheTime = parseInt(cached.headers.get('sw-cache-time') || '0');
      const ttl = API_CACHE_TTL[url.pathname] || API_CACHE_TTL.default;
      if (Date.now() - cacheTime < ttl) {
        return cached;
      }
    } else if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }

    return new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate: good for JS bundles
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Background sync for failed API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-corrections') {
    event.waitUntil(syncCorrections());
  }
});

async function syncCorrections() {
  // Sync any pending correction submissions when back online
  // Implementation depends on IndexedDB storage of pending requests
  console.log('Syncing pending corrections...');
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New security update available',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SafeScoring', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
