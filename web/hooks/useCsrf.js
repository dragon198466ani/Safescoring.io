/**
 * CSRF Token Hook
 *
 * Provides CSRF token management for forms and API calls.
 * Automatically fetches and refreshes tokens as needed.
 *
 * Usage:
 *   const { csrfToken, fetchWithCsrf, isLoading, error } = useCsrf();
 *
 *   // Use with fetch
 *   const response = await fetchWithCsrf('/api/some-endpoint', {
 *     method: 'POST',
 *     body: JSON.stringify({ data: 'value' }),
 *   });
 *
 *   // Or manually add to headers
 *   headers: { 'x-csrf-token': csrfToken }
 */

"use client";

import { useState, useEffect, useCallback } from "react";

// Token cache (shared across hook instances)
let cachedToken = null;
let tokenExpiry = 0;
let fetchingPromise = null;

// Token refresh threshold (5 minutes before expiry)
const REFRESH_THRESHOLD = 5 * 60 * 1000;

/**
 * Fetch a fresh CSRF token from the API
 */
async function fetchCsrfToken() {
  // If already fetching, wait for the existing promise
  if (fetchingPromise) {
    return fetchingPromise;
  }

  fetchingPromise = (async () => {
    try {
      const response = await fetch("/api/csrf", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }

      const data = await response.json();

      if (data.success && data.token) {
        cachedToken = data.token;
        tokenExpiry = Date.now() + (data.expiresIn || 3600000);
        return data.token;
      }

      throw new Error("Invalid CSRF token response");
    } finally {
      fetchingPromise = null;
    }
  })();

  return fetchingPromise;
}

/**
 * Check if token needs refresh
 */
function needsRefresh() {
  if (!cachedToken) return true;
  return Date.now() > tokenExpiry - REFRESH_THRESHOLD;
}

/**
 * CSRF Hook
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState(cachedToken);
  const [isLoading, setIsLoading] = useState(!cachedToken);
  const [error, setError] = useState(null);

  // Fetch token on mount if needed
  useEffect(() => {
    if (needsRefresh()) {
      setIsLoading(true);
      fetchCsrfToken()
        .then((token) => {
          setCsrfToken(token);
          setError(null);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  /**
   * Refresh the CSRF token
   */
  const refreshToken = useCallback(async () => {
    setIsLoading(true);
    try {
      // Force refresh
      cachedToken = null;
      const token = await fetchCsrfToken();
      setCsrfToken(token);
      setError(null);
      return token;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch with CSRF token automatically included
   */
  const fetchWithCsrf = useCallback(
    async (url, options = {}) => {
      // Get current token or fetch new one
      let token = cachedToken;
      if (needsRefresh()) {
        token = await fetchCsrfToken();
        setCsrfToken(token);
      }

      // Merge headers
      const headers = new Headers(options.headers || {});
      headers.set("x-csrf-token", token);

      // Default to JSON content type for POST/PUT/PATCH
      if (
        ["POST", "PUT", "PATCH"].includes((options.method || "GET").toUpperCase()) &&
        !headers.has("Content-Type")
      ) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: options.credentials || "include",
      });

      // If CSRF token was rejected, refresh and retry once
      if (response.status === 403) {
        const data = await response.clone().json().catch(() => ({}));
        if (data.error?.code === "INVALID_CSRF_TOKEN" || data.error?.code === "MISSING_CSRF_TOKEN") {
          // Refresh token and retry
          const newToken = await refreshToken();
          headers.set("x-csrf-token", newToken);

          return fetch(url, {
            ...options,
            headers,
            credentials: options.credentials || "include",
          });
        }
      }

      return response;
    },
    [refreshToken]
  );

  /**
   * Get headers object with CSRF token included
   */
  const getCsrfHeaders = useCallback(() => {
    return {
      "x-csrf-token": csrfToken || "",
    };
  }, [csrfToken]);

  return {
    csrfToken,
    isLoading,
    error,
    refreshToken,
    fetchWithCsrf,
    getCsrfHeaders,
  };
}

/**
 * HOC to add CSRF protection to a form
 */
export function withCsrf(Component) {
  return function CsrfProtectedComponent(props) {
    const csrf = useCsrf();
    return <Component {...props} csrf={csrf} />;
  };
}

export default useCsrf;
