"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useRealtimeProducts } from "@/hooks/useRealtimeProducts";
import { useDebounce } from "@/hooks/useDebounce";
import ProductLogo from "@/components/ProductLogo";
import config from "@/config";
import { PILLARS } from "@/libs/design-tokens";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useNormStats } from "@/libs/NormStatsProvider";
import dynamic from "next/dynamic";
import { MiniScoreCircle as ScoreCircle } from "@/components/ScoreCircle";
import Breadcrumbs from "@/components/Breadcrumbs";

// TODO: Post-launch — Re-enable AI Chat when LLM integration is implemented
// const AIChat = dynamic(() => import("@/components/AIChat"), {
//   loading: () => null,
//   ssr: false,
// });
const FloatingStackBubble = dynamic(
  () => import("@/components/FloatingStackBubble"),
  { loading: () => null, ssr: false }
);

const getScoreTypes = (t) => [
  { id: "full", label: t("productsPage.scoreTypes.full"), description: t("productsPage.scoreTypes.fullDesc") },
  { id: "consumer", label: t("productsPage.scoreTypes.consumer"), description: t("productsPage.scoreTypes.consumerDesc") },
  { id: "essential", label: t("productsPage.scoreTypes.essential"), description: t("productsPage.scoreTypes.essentialDesc") },
];

const getSortOptions = (t) => [
  { id: "score-desc", label: t("productsPage.sortOptions.highestScore") },
  { id: "score-asc", label: t("productsPage.sortOptions.lowestScore") },
  { id: "name-asc", label: t("productsPage.sortOptions.nameAZ") },
  { id: "name-desc", label: t("productsPage.sortOptions.nameZA") },
  { id: "recent", label: t("productsPage.sortOptions.recentlyUpdated") },
];


const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// Memoized ProductCard component - Golden Ratio Design (φ = 1.618)
// Content/Scores: 61.8% | Image: 38.2%
// OPTIMIZED: Receives scoreType instead of scores object to avoid breaking memo
// ENHANCED: Supports drag-and-drop to add to stack
const ProductCard = memo(({ product, scoreType = "full", onAddToStack, isInStack = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  // Get scores based on scoreType - computed once per product/scoreType change
  const scores = useMemo(() => {
    switch (scoreType) {
      case "consumer": return product.consumerScores;
      case "essential": return product.essentialScores;
      default: return product.scores;
    }
  }, [product.consumerScores, product.essentialScores, product.scores, scoreType]);

  const totalScore = scores?.total ?? 0;
  const productTypes = product.types?.slice(0, 2) || [];
  const productName = product.name || "Unknown Product";
  // OPTIMIZED: Memoize image extraction
  const productImage = useMemo(() =>
    product.media?.find(m => m.type === 'image' || m.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i))?.url,
    [product.media]
  );

  // Drag handlers
  const handleDragStart = (e) => {
    setIsDragging(true);
    const dragData = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      logoUrl: product.logoUrl,
      scores: product.scores,
      types: product.types,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Quick add to stack
  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToStack && !isInStack) {
      onAddToStack(product);
    }
  };

  return (
    <div
      draggable={!isInStack}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`relative group ${isDragging ? "opacity-50 scale-95" : ""} ${!isInStack ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <Link
        href={`/products/${product.slug || product.id}`}
        className={`group flex flex-row rounded-xl bg-base-100 border transition-all duration-200 overflow-hidden ${
          isInStack
            ? "border-primary/50 bg-primary/5"
            : "border-base-300 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10"
        }`}
      >
      {/* Image Area - Left side (38.2% - Golden Ratio) */}
      <div className="relative bg-gradient-to-br from-base-200 to-base-300 overflow-hidden min-h-[160px]" style={{ flexBasis: '38.2%' }}>
        {productImage && (
          <Image
            src={productImage}
            alt={productName}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, (max-width: 1280px) 18vw, 180px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            quality={75}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBRIhMQYTQWH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECAAMRMf/aAAwDAQACEQMRAD8Aw/T7q7toVEMr4BAxtPHFFFFNAJVl0TArsf/Z"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        {/* Fallback placeholder */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          <div className="w-12 h-12 rounded-xl bg-base-100/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xl font-bold text-primary/60">
              {productName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        {/* Price Badge + Fees - Bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          {product.priceEur ? (
            <div className="bg-amber-500 text-white px-2 py-1 rounded-full shadow-lg inline-flex items-center gap-1">
              <span className="text-xs font-bold">
                {product.priceEur.toLocaleString('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
              </span>
            </div>
          ) : (
            <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg inline-block">
              Free
            </div>
          )}
          {/* Fees / Gas details */}
          {product.priceDetails && (
            <div className="text-[8px] text-white/90 mt-1 line-clamp-2 drop-shadow-md">
              {product.priceDetails}
            </div>
          )}
        </div>
      </div>

      {/* Content/Scores - Right side (61.8% - Golden Ratio) */}
      <div className="flex flex-col p-3" style={{ flexBasis: '61.8%' }}>
        {/* Header: Logo + Name */}
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-base-200 shadow-sm bg-white">
              <ProductLogo
                logoUrl={product.logoUrl}
                fallbackUrl={product.fallbackUrl}
                name={productName}
                size="xs"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1 leading-tight">
              {productName}
            </h3>
            {/* Types inline - show all, full names */}
            <div className="flex flex-wrap gap-1 mt-1">
              {productTypes.length > 0 ? (
                productTypes.map((t, idx) => (
                  <span
                    key={t.code || idx}
                    className={`text-[8px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
                      idx === 0 ? 'bg-primary/10 text-primary' : 'bg-base-200 text-base-content/60'
                    }`}
                  >
                    {t.name}
                  </span>
                ))
              ) : (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/50">
                  {product.type || 'Product'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* HERO: Main Score - Circular Display */}
        <div className="flex items-center justify-center my-2">
          <ScoreCircle score={totalScore} size={72} strokeWidth={6} />
        </div>

        {/* SAFE Pillars - Compact Grid */}
        <div className="grid grid-cols-4 gap-1 mt-auto">
          {PILLARS.map((pillar) => {
            const scoreValue = scores?.[pillar.code.toLowerCase()];
            const hasScore = scoreValue != null;
            const displayScore = hasScore ? Math.round(scoreValue) : 0;
            return (
              <div key={pillar.code} className="flex flex-col items-center py-1.5 px-1 rounded-lg bg-base-200/50 dark:bg-base-300/30">
                <span className="text-[9px] font-bold" style={{ color: pillar.primary }}>
                  {pillar.code}
                </span>
                <span className={`text-xs font-bold tabular-nums ${hasScore ? 'text-amber-600 dark:text-amber-400' : 'text-base-content/30'}`}>
                  {hasScore ? displayScore : "-"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-base-200">
          <span className="text-[8px] text-base-content/40">{formatDate(product.lastUpdate)}</span>
          {product.verified && (
            <span className="inline-flex items-center gap-0.5 text-[8px] text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Scored
            </span>
          )}
        </div>
      </div>
      </Link>

      {/* Quick Add to Stack Button */}
      {onAddToStack && !isInStack && (
        <button
          onClick={handleQuickAdd}
          className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-primary/90 text-primary-content opacity-0 group-hover:opacity-100 hover:bg-primary hover:scale-110 transition-all duration-200 shadow-lg"
          title="Add to my stack"
          aria-label={`Add ${productName} to my stack`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}

      {/* In Stack Indicator */}
      {isInStack && (
        <div className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-primary text-primary-content shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      )}
    </div>
  );
});
ProductCard.displayName = "ProductCard";

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
  // Initialize with server-safe defaults to avoid hydration mismatch
  // Cache is loaded in useEffect after mount
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
  const { t, locale } = useTranslation();
  const scoreTypes = getScoreTypes(t);
  const sortOptions = getSortOptions(t);
  const normStats = useNormStats();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sort, setSort] = useState("score-desc");
  const [scoreType, setScoreType] = useState("full");
  const [expandedType, setExpandedType] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  // TODO: Post-launch — AI Chat state
  // const [isChatOpen, setIsChatOpen] = useState(false);

  // Stack management for FloatingStackBubble
  const [stackProductIds, setStackProductIds] = useState(new Set());
  const [pendingAddProduct, setPendingAddProduct] = useState(null);

  // Load initial stack products on mount
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
        // Load from demo storage
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

  // Quick add handler - passes product to FloatingStackBubble
  const handleQuickAddToStack = useCallback((product) => {
    setPendingAddProduct(product);
  }, []);

  // Handle product added to stack (callback from FloatingStackBubble)
  const handleProductAddedToStack = useCallback((product) => {
    setStackProductIds(prev => new Set([...prev, product.id]));
    // Clear pending after successful add
    setPendingAddProduct(null);
  }, []);

  // Handle product removed from stack
  const handleProductRemovedFromStack = useCallback((product) => {
    setStackProductIds(prev => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
  }, []);

  // Debounce search pour éviter trop de requêtes (250ms pour une meilleure réactivité)
  const debouncedSearch = useDebounce(search, 250);

  const PRODUCTS_PER_PAGE = 25;

  // Load from cache after mount to avoid hydration mismatch
  useEffect(() => {
    setHasMounted(true);
    // Load cached data
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
        limit: String(PRODUCTS_PER_PAGE),
        offset: "0",
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (category !== "all") params.append("category", category);
      if (selectedType !== "all") params.append("type", selectedType);

      const controller = new AbortController();
      // Timeout plus long (30s) pour le premier chargement (compilation en dev)
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

      // Sauvegarder en cache seulement pour la requête par défaut (sans filtres)
      if (!debouncedSearch && category === "all" && selectedType === "all") {
        setCache(CACHE_KEY, { products: newProducts, total: newTotal });
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

  // Load more products (pagination)
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
      // Error logged only in development to avoid leaking info in production
      if (process.env.NODE_ENV === "development") console.error("Error loading more products:", err);
      toast.error("Failed to load more products. Please try again.", {
        duration: 3000,
        position: "bottom-right",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [products.length, totalProducts, hasMore, isLoadingMore, debouncedSearch, category, selectedType, sort, scoreType]);

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
  const { forceRefresh, isConnected, connectionFailed, reconnect } = useRealtimeProducts({
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
      <ErrorBoundary message="Failed to load products. Please refresh the page.">
        <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
          <div className="max-w-7xl mx-auto">
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Products" },
          ]} />
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t("productsPage.title")}
            </h1>
            <p className="text-lg text-base-content/60 max-w-2xl">
              {hasMounted && totalProducts > 0
                ? t("productsPage.description", { count: `${totalProducts}+`, norms: normStats?.totalNorms || "2000+" })
                : t("productsPage.descriptionFallback", { norms: normStats?.totalNorms || "2000+" })}
            </p>
            {/* Realtime sync indicator */}
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </>
                ) : connectionFailed ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-base-content/30"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500 animate-pulse"></span>
                )}
              </span>
              <span className={`text-sm ${isConnected ? 'text-green-500' : connectionFailed ? 'text-base-content/50' : 'text-yellow-500'}`}>
                {isConnected ? t("productsPage.realtimeSyncActive") : connectionFailed ? t("productsPage.offlineMode") : t("productsPage.connecting")}
              </span>
              {realtimeUpdate && (
                <span className="text-xs text-base-content/50">
                  ({t("productsPage.updated", { time: realtimeUpdate.toLocaleTimeString(locale) })})
                </span>
              )}
              {connectionFailed && (
                <button
                  onClick={reconnect}
                  className="ml-1 btn btn-ghost btn-xs text-primary"
                  title={t("product.retry")}
                >
                  {t("product.retry")}
                </button>
              )}
              <button
                onClick={forceRefresh}
                className="ml-2 btn btn-ghost btn-xs"
                title="Force refresh"
                aria-label="Force refresh scores"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            </div>
          </div>

          {/* Score Type Tabs - Compact horizontal scroll on mobile */}
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide" role="tablist" aria-label="Score type">
              {scoreTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setScoreType(type.id)}
                  role="tab"
                  aria-selected={scoreType === type.id}
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
              {scoreType === "essential" && t("productsPage.scoreTypeExplanations.essential")}
              {scoreType === "consumer" && t("productsPage.scoreTypeExplanations.consumer")}
              {scoreType === "full" && t("productsPage.scoreTypeExplanations.full", { count: normStats?.totalNorms || "2000+" })}
            </p>
          </div>

          {/* Search + Filter Button Row */}
          <div className="flex gap-2 mb-2">
            {/* Search */}
            <div className="relative flex-1">
              <label htmlFor="product-search" className="sr-only">Search products</label>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                id="product-search"
                type="text"
                placeholder={t("product.searchPlaceholder")}
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
              <span className="text-sm font-medium">{t("productsPage.filters")}</span>
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
                <option value="all">{t("productsPage.allCategories")}</option>
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
                <option value="all">{t("productsPage.allTypes", { count: filteredTypes.length })}</option>
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
                <option value="all">{t("productsPage.allCategories")}</option>
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
                <option value="all">{t("productsPage.allTypes", { count: filteredTypes.length })}</option>
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
                  {t("productsPage.clearFilters")}
                </button>
              )}
            </div>
          </div>

          {/* Stack Building Tip */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{t("productsPage.stackTip.title")}</h3>
                  <p className="text-xs text-base-content/70 leading-relaxed">
                    {t("productsPage.stackTip.description")}
                  </p>
                </div>
                <Link
                  href="/stack-builder"
                  className="flex-shrink-0 btn btn-primary btn-sm gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t("productsPage.stackTip.cta")}
                </Link>
              </div>

              {/* User Profiles - Quick suggestions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/10">
                <span className="text-xs text-base-content/50 self-center mr-1">{t("productsPage.stackTip.iAm")}</span>
                {/* Beginner */}
                <Link
                  href="/stack-builder?profile=beginner"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                  </svg>
                  {t("productsPage.stackTip.profiles.beginner")}
                </Link>
                {/* BTC Hodler */}
                <Link
                  href="/stack-builder?profile=hodler"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                  </svg>
                  {t("productsPage.stackTip.profiles.hodler")}
                </Link>
                {/* Active Trader */}
                <Link
                  href="/stack-builder?profile=trader"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors border border-green-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  {t("productsPage.stackTip.profiles.trader")}
                </Link>
                {/* DeFi User */}
                <Link
                  href="/stack-builder?profile=defi"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t("productsPage.stackTip.profiles.defi")}
                </Link>
                {/* Digital Nomad */}
                <Link
                  href="/stack-builder?profile=nomad"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 transition-colors border border-cyan-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  {t("productsPage.stackTip.profiles.nomad")}
                </Link>
                {/* Privacy Max */}
                <Link
                  href="/stack-builder?profile=privacy"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 transition-colors border border-slate-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                  {t("productsPage.stackTip.profiles.privacy")}
                </Link>
                {/* Enterprise */}
                <Link
                  href="/stack-builder?profile=enterprise"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                  {t("productsPage.stackTip.profiles.enterprise")}
                </Link>
                {/* Self-Sovereign */}
                <Link
                  href="/stack-builder?profile=sovereign"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                  {t("productsPage.stackTip.profiles.sovereign")}
                </Link>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm text-base-content/60">
              {t("productsPage.showingProducts", { count: filteredProducts.length })}
            </span>
            {(loading || isRefreshing) && (
              <span className="flex items-center gap-2 text-sm text-base-content/50">
                <span className="loading loading-spinner loading-sm text-primary"></span>
                {isRefreshing && t("productsPage.updating")}
              </span>
            )}
          </div>

          {/* Error state with retry */}
          {error && (
            <div className="alert alert-error mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex flex-col">
                <span className="font-medium">{error}</span>
                {error.includes("500") && (
                  <span className="text-xs opacity-80 mt-1">
                    {t("productsPage.dbConnectionIssue")}
                  </span>
                )}
              </div>
              <button
                onClick={() => fetchProducts(true)}
                className="btn btn-sm btn-ghost"
              >
                {t("product.retry")}
              </button>
            </div>
          )}

          {/* Retry indicator */}
          {retryCount > 0 && !error && (
            <div className="alert alert-warning mb-6">
              <span className="loading loading-spinner loading-sm"></span>
              <span>{t("productsPage.attempt", { current: retryCount, max: 3 })}</span>
            </div>
          )}

          {/* Loading state */}
          {loading && products.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-base-100 border border-base-300 flex flex-row overflow-hidden">
                  {/* Image skeleton - Left side */}
                  <div className="w-1/2 min-h-[180px] bg-base-300 relative flex-shrink-0">
                    <div className="absolute top-2 right-2 w-10 h-10 rounded-lg bg-base-200"></div>
                  </div>
                  {/* Content skeleton - Right side */}
                  <div className="flex-1 p-3 flex flex-col">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-base-300 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-4 w-full bg-base-300 rounded mb-1"></div>
                        <div className="h-3 w-2/3 bg-base-300 rounded"></div>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-2">
                      <div className="h-4 w-14 bg-base-300 rounded"></div>
                      <div className="h-4 w-10 bg-base-300 rounded"></div>
                    </div>
                    {/* Score bars skeleton */}
                    <div className="space-y-1 flex-1">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <div className="w-3 h-2 bg-base-300 rounded"></div>
                          <div className="flex-1 h-1 bg-base-300 rounded-full"></div>
                          <div className="w-5 h-2 bg-base-300 rounded"></div>
                        </div>
                      ))}
                    </div>
                    {/* Footer skeleton */}
                    <div className="mt-2 pt-1.5 border-t border-base-200">
                      <div className="h-2 w-16 bg-base-300 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products grid - using memoized ProductCard for better performance */}
          {/* OPTIMIZED: Pass scoreType string instead of scores object to preserve memo */}
          {/* ENHANCED: Drag-and-drop support for FloatingStackBubble integration */}
          {(!loading || products.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  scoreType={scoreType}
                  onAddToStack={handleQuickAddToStack}
                  isInStack={stackProductIds.has(product.id)}
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {!loading && hasMore && filteredProducts.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMoreProducts}
                disabled={isLoadingMore}
                className="btn btn-primary btn-outline gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {t("productsPage.loading")}
                  </>
                ) : (
                  <>
                    {t("productsPage.loadMore")}
                    <span className="badge badge-sm badge-ghost">
                      {filteredProducts.length} / {totalProducts}
                    </span>
                  </>
                )}
              </button>
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
              <h3 className="text-lg font-semibold mb-2">{t("productsPage.noProductsFound")}</h3>
              <p className="text-base-content/60 mb-4">
                {t("productsPage.adjustFilters")}
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setSelectedType("all");
                }}
                className="btn btn-primary btn-sm"
              >
                {t("productsPage.clearFilters")}
              </button>
            </div>
          )}

          {/* Product Types Overview - only show types with products */}
          {!loading && productTypes.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-2">{t("productsPage.typesOverview")}</h2>
              <p className="text-base-content/60 mb-6">{t("productsPage.typesOverviewDesc")}</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => {
                  const catTypes = productTypes.filter((t) => t.category === cat && t.productCount > 0);
                  if (catTypes.length === 0) return null;
                  return (
                    <div key={cat} className="rounded-xl bg-base-200 border border-base-300 overflow-hidden">
                      <div className="px-4 py-3 bg-primary/10 border-b border-base-300">
                        <h3 className="font-semibold text-primary">{cat}</h3>
                        <span className="text-xs text-base-content/50">{t("productsPage.nTypes", { count: catTypes.length })}</span>
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
                                    title={isExpanded ? t("productsPage.collapse") : t("productsPage.showDefinition")}
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
                                      {t("productsPage.viewNProducts", { count: type.productCount })}
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
      </ErrorBoundary>
      <Footer />

      {/* TODO: Post-launch — Re-enable AI Chat when LLM integration is implemented */}

      {/* Floating Stack Bubble - Drag-and-drop stack management */}
      <FloatingStackBubble
        products={products}
        pendingAddProduct={pendingAddProduct}
        onProductAdded={handleProductAddedToStack}
        onProductRemoved={handleProductRemovedFromStack}
      />
    </>
  );
}
