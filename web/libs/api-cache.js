/**
 * API Cache Utility with Stale-While-Revalidate pattern
 * Provides fast cached responses while revalidating in background
 */

// In-memory cache for SSR and fast access
const memoryCache = new Map();

// Cache configuration
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL = 60 * 60 * 1000; // 1 hour (serve stale while revalidating)

/**
 * Get cached data with SWR pattern
 * @param {string} key - Cache key
 * @returns {{ data: any, isStale: boolean } | null}
 */
export function getFromCache(key) {
  // Try memory cache first (works on server and client)
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) {
    const age = Date.now() - memoryEntry.timestamp;
    if (age < DEFAULT_TTL) {
      return { data: memoryEntry.data, isStale: false };
    }
    if (age < STALE_TTL) {
      return { data: memoryEntry.data, isStale: true };
    }
    memoryCache.delete(key);
  }

  // Try localStorage on client
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        const age = Date.now() - timestamp;
        if (age < DEFAULT_TTL) {
          // Also populate memory cache
          memoryCache.set(key, { data, timestamp });
          return { data, isStale: false };
        }
        if (age < STALE_TTL) {
          memoryCache.set(key, { data, timestamp });
          return { data, isStale: true };
        }
        localStorage.removeItem(`cache_${key}`);
      }
    } catch {
      // localStorage not available or quota exceeded
    }
  }

  return null;
}

/**
 * Set cache data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export function setInCache(key, data) {
  const entry = { data, timestamp: Date.now() };

  // Always set in memory cache
  memoryCache.set(key, entry);

  // Try to persist to localStorage on client
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch {
      // localStorage full, clear old entries
      clearOldCacheEntries();
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch {
        // Still full, give up on localStorage
      }
    }
  }
}

/**
 * Clear old cache entries from localStorage
 */
function clearOldCacheEntries() {
  if (typeof window === "undefined") return;

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("cache_")) {
      try {
        const { timestamp } = JSON.parse(localStorage.getItem(key) || "{}");
        if (Date.now() - timestamp > STALE_TTL) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Fetch with cache and retry
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} options.ttl - Cache TTL in ms
 * @param {number} options.retries - Number of retries
 * @param {number} options.retryDelay - Delay between retries in ms
 */
export async function fetchWithCache(url, options = {}) {
  const {
    ttl = DEFAULT_TTL,
    retries = 2,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  const cacheKey = `${url}_${JSON.stringify(fetchOptions)}`;

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached && !cached.isStale) {
    return cached.data;
  }

  // If stale, return stale data and revalidate in background
  if (cached?.isStale) {
    // Revalidate in background (don't await)
    revalidateInBackground(url, cacheKey, fetchOptions, retries, retryDelay);
    return cached.data;
  }

  // No cache, fetch fresh data
  return fetchWithRetry(url, cacheKey, fetchOptions, retries, retryDelay);
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, cacheKey, fetchOptions, retries, retryDelay) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setInCache(cacheKey, data);
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Revalidate cache in background
 */
async function revalidateInBackground(url, cacheKey, fetchOptions, retries, retryDelay) {
  try {
    await fetchWithRetry(url, cacheKey, fetchOptions, retries, retryDelay);
  } catch {
    // Background revalidation failed, keep serving stale data
    console.warn(`Background revalidation failed for ${url}`);
  }
}

/**
 * Clear all cache
 */
export function clearCache() {
  memoryCache.clear();
  if (typeof window !== "undefined") {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("cache_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

export default { getFromCache, setInCache, fetchWithCache, clearCache };
