"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useRealtimeProducts } from "@/hooks/useRealtimeProducts";
import { useDebounce } from "@/hooks/useDebounce";
import {
  PRODUCTS_PER_PAGE,
  CACHE_KEY,
  CACHE_TYPES_KEY,
  getCache,
  setCache,
} from "./constants";

// Custom hook encapsulating all products-page data fetching, caching,
// realtime subscriptions, pagination, and stack management.
export default function useProductsData() {
  // ---------- Core state ----------
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productTypes, setProductTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [error, setError] = useState(null);
  const [realtimeUpdate, setRealtimeUpdate] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ---------- Filters ----------
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sort, setSort] = useState("score-desc");
  const [scoreType, setScoreType] = useState("full");
  const [showFilters, setShowFilters] = useState(false);

  // ---------- Stack ----------
  const [stackProductIds, setStackProductIds] = useState(new Set());
  const [pendingAddProduct, setPendingAddProduct] = useState(null);

  const debouncedSearch = useDebounce(search, 250);

  // ---------- Stack loading ----------
  useEffect(() => {
    const loadStackProducts = async () => {
      try {
        const res = await fetch("/api/setups");
        if (res.ok) {
          const data = await res.json();
          const activeSetup = data.setups?.[0];
          if (activeSetup?.productDetails) {
            setStackProductIds(new Set(activeSetup.productDetails.map(p => p.id)));
          }
        }
      } catch {
        try {
          const demoSetups = localStorage.getItem("demo_setups");
          if (demoSetups) {
            const setups = JSON.parse(demoSetups);
            const activeSetup = setups[0];
            if (activeSetup?.productDetails) {
              setStackProductIds(new Set(activeSetup.productDetails.map(p => p.id)));
            }
          }
        } catch {
          // Ignore localStorage errors
        }
      }
    };
    loadStackProducts();
  }, []);

  const handleQuickAddToStack = useCallback((product) => {
    setPendingAddProduct(product);
  }, []);

  const handleProductAddedToStack = useCallback((product) => {
    setStackProductIds(prev => new Set([...prev, product.id]));
    setPendingAddProduct(null);
  }, []);

  const handleProductRemovedFromStack = useCallback((product) => {
    setStackProductIds(prev => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
  }, []);

  // ---------- Cache hydration ----------
  useEffect(() => {
    setHasMounted(true);
    const cachedProducts = getCache(CACHE_KEY);
    if (cachedProducts) {
      const prods = Array.isArray(cachedProducts) ? cachedProducts : (cachedProducts.products || []);
      const total = Array.isArray(cachedProducts) ? cachedProducts.length : (cachedProducts.total || 0);
      if (prods.length > 0) {
        setProducts(prods);
        setTotalProducts(total);
        setLoading(false);
      }
    }
    const cachedTypes = getCache(CACHE_TYPES_KEY);
    if (cachedTypes) {
      setProductTypes(cachedTypes.types || []);
      setCategories(cachedTypes.categories || []);
    }
  }, []);

  // ---------- Data fetching ----------
  const fetchProducts = useCallback(async (showLoading = true, retry = 0) => {
    const hasExistingData = products.length > 0;
    if (showLoading && !hasExistingData) setLoading(true);
    if (showLoading && hasExistingData) setIsRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sort,
        scoreType,
        limit: String(PRODUCTS_PER_PAGE),
        offset: "0",
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (category !== "all") params.append("category", category);
      if (selectedType !== "all") params.append("type", selectedType);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`/api/products?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const newProducts = data.products || [];
      const newTotal = data.total || newProducts.length;
      setProducts(newProducts);
      setTotalProducts(newTotal);
      setHasMore(newProducts.length < newTotal);
      setRetryCount(0);

      if (!debouncedSearch && category === "all" && selectedType === "all") {
        setCache(CACHE_KEY, { products: newProducts, total: newTotal });
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("La requ\u00eate a pris trop de temps. R\u00e9essayez.");
      } else if (retry < 2) {
        setTimeout(() => {
          setRetryCount(retry + 1);
          fetchProducts(showLoading, retry + 1);
        }, 1000 * (retry + 1));
        return;
      } else {
        setError(err.message || "Error loading products");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, category, selectedType, sort, scoreType, products.length]);

  const loadMoreProducts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams({
        sort,
        scoreType,
        limit: String(PRODUCTS_PER_PAGE),
        offset: String(products.length),
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (category !== "all") params.append("category", category);
      if (selectedType !== "all") params.append("type", selectedType);

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error("Failed to load more");

      const data = await response.json();
      const moreProducts = data.products || [];

      if (moreProducts.length === 0) {
        setHasMore(false);
      } else {
        setProducts(prev => [...prev, ...moreProducts]);
        setHasMore(products.length + moreProducts.length < (data.total || totalProducts));
      }
    } catch (err) {
      console.error("Error loading more products:", err);
      toast.error("Failed to load more products. Please try again.", {
        duration: 3000,
        position: "bottom-right",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [products.length, totalProducts, hasMore, isLoadingMore, debouncedSearch, category, selectedType, sort, scoreType]);

  // ---------- Realtime ----------
  const handleRealtimeUpdate = useCallback((payload) => {
    setRealtimeUpdate(new Date());
    fetchProducts(false);
    if (payload.eventType !== "MANUAL_REFRESH") {
      toast.success("Scores updated", { duration: 2000, position: "bottom-right" });
    }
  }, [fetchProducts]);

  const { forceRefresh, isConnected, connectionFailed, reconnect } = useRealtimeProducts({
    onUpdate: handleRealtimeUpdate,
    enabled: true,
  });

  // Trigger fetch on filter/search changes
  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // Fetch product types once
  useEffect(() => {
    let mounted = true;
    const fetchProductTypes = async () => {
      try {
        const response = await fetch("/api/product-types");
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) {
          setProductTypes(data.types || []);
          setCategories(data.categories || []);
          setCache(CACHE_TYPES_KEY, { types: data.types, categories: data.categories });
        }
      } catch {
        // Silently fail
      }
    };
    fetchProductTypes();
    return () => { mounted = false; };
  }, []);

  // ---------- Derived state ----------
  const filteredTypes = useMemo(() => {
    const withProducts = productTypes.filter((t) => t.productCount > 0);
    return category === "all"
      ? withProducts
      : withProducts.filter((t) => t.category === category);
  }, [category, productTypes]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (category !== "all") count++;
    if (selectedType !== "all") count++;
    if (sort !== "score-desc") count++;
    return count;
  }, [category, selectedType, sort]);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setCategory("all");
    setSelectedType("all");
  }, []);

  return {
    // Data
    products,
    totalProducts,
    productTypes,
    categories,
    loading,
    hasMounted,
    error,
    realtimeUpdate,
    retryCount,
    isRefreshing,
    hasMore,
    isLoadingMore,
    // Filters
    search, setSearch,
    category, setCategory,
    selectedType, setSelectedType,
    sort, setSort,
    scoreType, setScoreType,
    showFilters, setShowFilters,
    filteredTypes,
    activeFilterCount,
    // Actions
    fetchProducts,
    loadMoreProducts,
    handleClearFilters,
    // Realtime
    forceRefresh,
    isConnected,
    connectionFailed,
    reconnect,
    // Stack
    stackProductIds,
    pendingAddProduct,
    handleQuickAddToStack,
    handleProductAddedToStack,
    handleProductRemovedFromStack,
  };
}
