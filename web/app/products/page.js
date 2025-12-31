"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRealtimeProducts } from "@/hooks/useRealtimeProducts";
import { useDebounce } from "@/hooks/useDebounce";
import ProductLogo from "@/components/ProductLogo";
import config from "@/config";

const scoreTypes = [
  { id: "full", label: "Full", description: "100% des normes" },
  { id: "consumer", label: "Consumer", description: "38% des normes" },
  { id: "essential", label: "Essential", description: "17% des normes" },
];

const sortOptions = [
  { id: "score-desc", label: "Highest Score" },
  { id: "score-asc", label: "Lowest Score" },
  { id: "name-asc", label: "Name A-Z" },
  { id: "name-desc", label: "Name Z-A" },
  { id: "recent", label: "Recently Updated" },
];

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

// Composant ScoreCircle memoized pour éviter les re-renders inutiles
const ScoreCircle = memo(({ score, size = 56, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeScore = score ?? 0;
  const offset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="score-circle" width={size} height={size}>
        <circle
          className="score-circle-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="score-circle-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={safeScore >= 80 ? "#22c55e" : safeScore >= 60 ? "#f59e0b" : "#ef4444"}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${getScoreColor(safeScore)}`}>
          {safeScore > 0 ? Math.round(safeScore) : "-"}
        </span>
      </div>
    </div>
  );
});
ScoreCircle.displayName = "ScoreCircle";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// Helper pour le cache localStorage
const CACHE_KEY = "safescoring_products_cache";
const CACHE_TYPES_KEY = "safescoring_types_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCache = (key) => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const setCache = (key, data) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Silently fail if localStorage is full
  }
};

export default function ProductsPage() {
  // Charger les données du cache immédiatement pour un affichage instantané
  const [products, setProducts] = useState(() => getCache(CACHE_KEY) || []);
  const [productTypes, setProductTypes] = useState(() => getCache(CACHE_TYPES_KEY)?.types || []);
  const [categories, setCategories] = useState(() => getCache(CACHE_TYPES_KEY)?.categories || []);
  // Si on a des données en cache, ne pas afficher le loading
  const [loading, setLoading] = useState(() => !getCache(CACHE_KEY));
  const [error, setError] = useState(null);
  const [realtimeUpdate, setRealtimeUpdate] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sort, setSort] = useState("score-desc");
  const [scoreType, setScoreType] = useState("full");
  const [expandedType, setExpandedType] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search pour éviter trop de requêtes (250ms pour une meilleure réactivité)
  const debouncedSearch = useDebounce(search, 250);

  // Fonction de fetch des produits avec retry et cache
  const fetchProducts = useCallback(async (showLoading = true, retry = 0) => {
    // Si on a déjà des produits, montrer un indicateur de refresh au lieu du loading complet
    const hasExistingData = products.length > 0;
    if (showLoading && !hasExistingData) setLoading(true);
    if (showLoading && hasExistingData) setIsRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sort,
        scoreType,
        limit: "200",
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (category !== "all") params.append("category", category);
      if (selectedType !== "all") params.append("type", selectedType);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/products?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const newProducts = data.products || [];
      setProducts(newProducts);
      setRetryCount(0);

      // Sauvegarder en cache seulement pour la requête par défaut (sans filtres)
      if (!debouncedSearch && category === "all" && selectedType === "all") {
        setCache(CACHE_KEY, newProducts);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("La requête a pris trop de temps. Réessayez.");
      } else if (retry < 2) {
        // Retry automatique avec backoff
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

  // Handler for real-time updates
  const handleRealtimeUpdate = useCallback((payload) => {
    setRealtimeUpdate(new Date());
    fetchProducts(false);
    if (payload.eventType !== "MANUAL_REFRESH") {
      toast.success("Scores updated", {
        duration: 2000,
        position: "bottom-right",
      });
    }
  }, [fetchProducts]);

  // Subscription Supabase Realtime
  const { forceRefresh, isConnected } = useRealtimeProducts({
    onUpdate: handleRealtimeUpdate,
    enabled: true,
  });

  // Fetch initial des produits (déclenché par debouncedSearch)
  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // Fetch product types (une seule fois) avec cache
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
          // Sauvegarder en cache
          setCache(CACHE_TYPES_KEY, { types: data.types, categories: data.categories });
        }
      } catch {
        // Silently fail - product types are not critical
      }
    };
    // Fetch en background même si on a des données en cache
    fetchProductTypes();
    return () => { mounted = false; };
  }, []);

  // Get scores based on selected score type (memoized)
  const getProductScores = useCallback((product) => {
    switch (scoreType) {
      case "consumer":
        return product.consumerScores;
      case "essential":
        return product.essentialScores;
      default:
        return product.scores;
    }
  }, [scoreType]);

  // Les produits sont déjà triés et filtrés par l'API
  // On garde juste la référence directe
  const filteredProducts = products;

  // Get types for selected category (memoized) - only types with products
  const filteredTypes = useMemo(() => {
    const withProducts = productTypes.filter((t) => t.productCount > 0);
    return category === "all"
      ? withProducts
      : withProducts.filter((t) => t.category === category);
  }, [category, productTypes]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (category !== "all") count++;
    if (selectedType !== "all") count++;
    if (sort !== "score-desc") count++;
    return count;
  }, [category, selectedType, sort]);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Crypto Products Database
            </h1>
            <p className="text-lg text-base-content/60 max-w-2xl">
              Browse security scores for {products.length}+ crypto products.
              Each product is evaluated against {config.safe.stats.totalNorms} security norms across the SAFE methodology.
            </p>
            {/* Realtime sync indicator */}
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                )}
              </span>
              <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-yellow-500'}`}>
                {isConnected ? 'Real-time sync active' : 'Connecting...'}
              </span>
              {realtimeUpdate && (
                <span className="text-xs text-base-content/50">
                  (Updated: {realtimeUpdate.toLocaleTimeString("en-US")})
                </span>
              )}
              <button
                onClick={forceRefresh}
                className="ml-2 btn btn-ghost btn-xs"
                title="Force refresh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            </div>
          </div>

          {/* Score Type Tabs - Compact horizontal scroll on mobile */}
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {scoreTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setScoreType(type.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    scoreType === type.id
                      ? "bg-primary text-primary-content"
                      : "bg-base-200 text-base-content/70 hover:bg-base-300"
                  }`}
                >
                  <span>{type.label}</span>
                  <span className="ml-1.5 text-xs opacity-70">({type.description})</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-base-content/50">
              {scoreType === "essential" && "Critical norms for basic security - Non-negotiable criteria"}
              {scoreType === "consumer" && "Important norms for general public users - Ease of use and transparency"}
              {scoreType === "full" && `Complete evaluation with all ${config.safe.stats.totalNorms} norms - Expert analysis`}
            </p>
          </div>

          {/* Search + Filter Button Row */}
          <div className="flex gap-2 mb-2">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                className="input input-bordered input-sm w-full pl-10 bg-base-200 border-base-300 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Toggle Button - visible on mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`lg:hidden flex items-center gap-2 px-3 h-10 rounded-lg border transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-base-200 border-base-300 text-base-content/70"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Desktop filters - always visible on lg+ */}
            <div className="hidden lg:flex gap-2">
              <select
                className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSelectedType("all");
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types ({filteredTypes.length})</option>
                {filteredTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.name} ({type.productCount})
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Collapsible Filters */}
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            showFilters ? "max-h-48 opacity-100 mb-4" : "max-h-0 opacity-0"
          }`}>
            <div className="flex flex-col gap-2 pt-2">
              <select
                className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0 w-full"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSelectedType("all");
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0 w-full"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types ({filteredTypes.length})</option>
                {filteredTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.name} ({type.productCount})
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered select-sm bg-base-200 border-base-300 h-10 min-h-0 w-full"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setCategory("all");
                    setSelectedType("all");
                    setSort("score-desc");
                  }}
                  className="btn btn-ghost btn-sm text-error"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm text-base-content/60">
              Showing {filteredProducts.length} products
            </span>
            {(loading || isRefreshing) && (
              <span className="flex items-center gap-2 text-sm text-base-content/50">
                <span className="loading loading-spinner loading-sm text-primary"></span>
                {isRefreshing && "Updating..."}
              </span>
            )}
          </div>

          {/* Error state with retry */}
          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
              <button
                onClick={() => fetchProducts(true)}
                className="btn btn-sm btn-ghost"
              >
                Retry
              </button>
            </div>
          )}

          {/* Retry indicator */}
          {retryCount > 0 && !error && (
            <div className="alert alert-warning mb-6">
              <span className="loading loading-spinner loading-sm"></span>
              <span>Attempt {retryCount}/3...</span>
            </div>
          )}

          {/* Loading state */}
          {loading && products.length === 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse p-6 rounded-xl bg-base-200 border border-base-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-base-300"></div>
                      <div>
                        <div className="h-4 w-24 bg-base-300 rounded mb-2"></div>
                        <div className="h-3 w-16 bg-base-300 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-base-300"></div>
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="text-center">
                          <div className="h-3 w-4 bg-base-300 rounded mx-auto mb-1"></div>
                          <div className="h-4 w-6 bg-base-300 rounded mx-auto"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products grid - Afficher même pendant le refresh si on a des données */}
          {(!loading || products.length > 0) && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const scores = getProductScores(product);

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="product-card group block p-6 rounded-xl bg-base-200 border border-base-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <ProductLogo logoUrl={product.logoUrl} fallbackUrl={product.fallbackUrl} name={product.name} size="sm" />
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(product.types && product.types.length > 0 ? product.types : [{ name: product.type }]).map((t, idx) => (
                              <span
                                key={t.code || idx}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  t.isPrimary || idx === 0
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-base-300 text-base-content/60'
                                }`}
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {product.verified && (
                          <span className="badge badge-sm badge-verified">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        )}
                        {product.isHardware !== null && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            product.isHardware
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                          }`}>
                            {product.isHardware ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                  <path d="M7 1a.75.75 0 01.75.75V6h4.5a.75.75 0 010 1.5h-4.5v4.25a.75.75 0 01-1.5 0V7.5h-4.5a.75.75 0 010-1.5h4.5V1.75A.75.75 0 017 1z"/>
                                </svg>
                                Physical
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm10.5 5.707a.5.5 0 00-.146-.353l-2.5-2.5a.5.5 0 00-.708.708L10.793 9H5.5a.5.5 0 000 1h5.293l-1.647 1.646a.5.5 0 00.708.708l2.5-2.5a.5.5 0 00.146-.354z" clipRule="evenodd"/>
                                </svg>
                                Digital
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score display */}
                    <div className="flex items-center gap-6">
                      <ScoreCircle score={scores?.total || 0} />
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        {[
                          { code: "S", score: scores?.s, color: "#22c55e" },
                          { code: "A", score: scores?.a, color: "#f59e0b" },
                          { code: "F", score: scores?.f, color: "#3b82f6" },
                          { code: "E", score: scores?.e, color: "#8b5cf6" },
                        ].map((pillar) => (
                          <div key={pillar.code} className="text-center">
                            <div
                              className="text-xs font-bold mb-1"
                              style={{ color: pillar.color }}
                            >
                              {pillar.code}
                            </div>
                            <div className="text-sm font-medium text-base-content/80">
                              {Math.round(pillar.score) || "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Score type indicator */}
                    <div className="mt-3 flex gap-1">
                      <span className={`badge badge-xs ${scoreType === 'full' ? 'badge-primary' : 'badge-ghost'}`}>
                        Full: {Math.round(product.scores?.total) || "-"}
                      </span>
                      <span className={`badge badge-xs ${scoreType === 'consumer' ? 'badge-primary' : 'badge-ghost'}`}>
                        Consumer: {Math.round(product.consumerScores?.total) || "-"}
                      </span>
                      <span className={`badge badge-xs ${scoreType === 'essential' ? 'badge-primary' : 'badge-ghost'}`}>
                        Essential: {Math.round(product.essentialScores?.total) || "-"}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-base-300 flex items-center justify-between text-xs text-base-content/50">
                      <span>Updated {formatDate(product.lastUpdate)}</span>
                      <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        View details
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && !isRefreshing && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-base-content/50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-base-content/60 mb-4">
                Try adjusting your search or filters
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setSelectedType("all");
                }}
                className="btn btn-primary btn-sm"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Product Types Overview - only show types with products */}
          {!loading && productTypes.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-2">Product Types Overview</h2>
              <p className="text-base-content/60 mb-6">Click on a type to filter products, or expand to read the definition.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => {
                  const catTypes = productTypes.filter((t) => t.category === cat && t.productCount > 0);
                  if (catTypes.length === 0) return null;
                  return (
                    <div key={cat} className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
                      <div className="px-4 py-3 bg-primary/10 border-b border-base-300">
                        <h3 className="font-semibold text-primary">{cat}</h3>
                        <span className="text-xs text-base-content/50">{catTypes.length} types</span>
                      </div>
                      <div className="p-3 space-y-1">
                        {catTypes.map((type) => {
                          const isExpanded = expandedType === type.code;
                          return (
                            <div
                              key={type.code}
                              className={`rounded-lg transition-all duration-200 ${isExpanded ? 'bg-base-300 ring-1 ring-primary/30' : 'bg-base-300/30 hover:bg-base-300/60'}`}
                            >
                              <div className="flex items-center gap-2 p-3">
                                {/* Expand button */}
                                {type.definition && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedType(isExpanded ? null : type.code);
                                    }}
                                    className="flex-shrink-0 w-6 h-6 rounded-md bg-base-100/50 hover:bg-base-100 flex items-center justify-center transition-colors"
                                    title={isExpanded ? "Collapse" : "Show definition"}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                      className={`w-3.5 h-3.5 text-base-content/60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                  </button>
                                )}
                                {!type.definition && <div className="w-6" />}

                                {/* Type name - clickable to filter */}
                                <button
                                  onClick={() => {
                                    setCategory(cat);
                                    setSelectedType(type.code);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }}
                                  className="flex-1 text-left group"
                                >
                                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                    {type.name}
                                  </span>
                                </button>

                                {/* Product count badge */}
                                <span className="badge badge-sm bg-base-100/80 border-0 text-base-content/70">
                                  {type.productCount}
                                </span>
                              </div>

                              {/* Expanded definition */}
                              {type.definition && isExpanded && (
                                <div className="px-3 pb-3 pt-0">
                                  <div className="pl-8 pr-2">
                                    <p className="text-xs text-base-content/70 leading-relaxed">
                                      {type.definition}
                                    </p>
                                    <button
                                      onClick={() => {
                                        setCategory(cat);
                                        setSelectedType(type.code);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                      className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      View {type.productCount} products
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
