"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithCache, getFromCache } from "@/libs/api-cache";

/**
 * Custom hook for API calls with SWR pattern
 * - Returns cached data immediately
 * - Revalidates in background
 * - Handles loading, error states
 * - Supports retry and refetch
 *
 * @param {string} url - API endpoint
 * @param {Object} options - Options
 * @param {boolean} options.enabled - Enable/disable fetching (default: true)
 * @param {number} options.ttl - Cache TTL in ms
 * @param {number} options.retries - Number of retries
 * @param {any} options.initialData - Initial data before fetch
 */
export function useApi(url, options = {}) {
  const {
    enabled = true,
    ttl,
    retries = 2,
    initialData = null,
    onSuccess,
    onError,
  } = options;

  // Try to get cached data for initial state
  const getCachedInitial = () => {
    if (!url || !enabled) return initialData;
    const cached = getFromCache(url);
    return cached?.data ?? initialData;
  };

  const [data, setData] = useState(getCachedInitial);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(!getCachedInitial());
  const [isValidating, setIsValidating] = useState(false);

  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!url || !enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Check cache first
    const cached = getFromCache(url);
    if (cached?.data && !cached.isStale) {
      setData(cached.data);
      setIsLoading(false);
      return cached.data;
    }

    // If we have stale data, show it while revalidating
    if (cached?.data) {
      setData(cached.data);
      setIsLoading(false);
      setIsValidating(true);
    } else if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const result = await fetchWithCache(url, {
        ttl,
        retries,
        signal: abortControllerRef.current.signal,
      });

      setData(result);
      setError(null);
      onSuccess?.(result);
      return result;
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err);
      onError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [url, enabled, ttl, retries, onSuccess, onError]);

  // Fetch on mount and when URL changes
  useEffect(() => {
    if (enabled && url) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refetch function
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Mutate local data (optimistic update)
  const mutate = useCallback((newData) => {
    setData(typeof newData === "function" ? newData(data) : newData);
  }, [data]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refetch,
    mutate,
  };
}

/**
 * Hook for fetching user setups
 * @param {Object} options - Options passed to useApi
 * @returns {Object} { setups, ...rest } where setups is the data array
 */
export function useUserSetups(options = {}) {
  const result = useApi("/api/user-setups", options);
  return {
    ...result,
    setups: result.data?.setups || result.data || [],
  };
}

export default useApi;
