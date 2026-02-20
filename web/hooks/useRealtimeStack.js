"use client";

/**
 * useRealtimeStack - Inception-style Real-time Synchronization
 *
 * Layer 1: Product Page (single product)
 *   ↓ updates flow to
 * Layer 2: Dashboard (all user setups overview)
 *   ↓ updates flow to
 * Layer 3: Setup Detail (multi-product analysis)
 *
 * Like Inception: changes at any level propagate through all connected layers.
 *
 * Features:
 * - Real-time Supabase subscriptions
 * - Optimistic updates for instant UI feedback
 * - Cross-component state synchronization
 * - Automatic score recalculation on changes
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { supabase } from "@/libs/supabase";

// ============================================================================
// CONTEXT - Global state shared across all layers
// ============================================================================

const RealtimeStackContext = createContext(null);

export function RealtimeStackProvider({ children }) {
  // Layer 1: Products cache (single products)
  const [productsCache, setProductsCache] = useState(new Map());

  // Layer 2: Setups cache (user's setups)
  const [setupsCache, setSetupsCache] = useState(new Map());

  // Layer 3: Active setup (currently viewed)
  const [activeSetup, setActiveSetup] = useState(null);

  // Subscriptions tracking
  const subscriptionsRef = useRef(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // ============================================================================
  // LAYER 1: Product-level updates
  // ============================================================================

  const subscribeToProduct = useCallback((productId) => {
    const key = `product:${productId}`;
    if (subscriptionsRef.current.has(key)) return;

    const channel = supabase
      .channel(`product-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "safe_scoring_results",
          filter: `product_id=eq.${productId}`,
        },
        (payload) => {
          console.log(`[Layer1] Product ${productId} score changed:`, payload);
          handleProductScoreChange(productId, payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evaluations",
          filter: `product_id=eq.${productId}`,
        },
        (payload) => {
          console.log(`[Layer1] Product ${productId} evaluation changed:`, payload);
          handleProductEvaluationChange(productId, payload);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        }
      });

    subscriptionsRef.current.set(key, channel);
  }, []);

  const unsubscribeFromProduct = useCallback((productId) => {
    const key = `product:${productId}`;
    const channel = subscriptionsRef.current.get(key);
    if (channel) {
      supabase.removeChannel(channel);
      subscriptionsRef.current.delete(key);
    }
  }, []);

  // Handle product score change - propagates to all setups containing this product
  const handleProductScoreChange = useCallback((productId, newScore) => {
    // Update product cache
    setProductsCache((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(productId) || {};
      updated.set(productId, {
        ...existing,
        scores: {
          total: newScore.note_finale,
          s: newScore.score_s,
          a: newScore.score_a,
          f: newScore.score_f,
          e: newScore.score_e,
        },
        lastUpdate: new Date().toISOString(),
      });
      return updated;
    });

    // INCEPTION: Propagate to Layer 2 (all setups containing this product)
    setSetupsCache((prev) => {
      const updated = new Map(prev);
      prev.forEach((setup, setupId) => {
        const hasProduct = setup.products?.some(
          (p) => p.product_id === productId || p.id === productId
        );
        if (hasProduct) {
          console.log(`[Layer2] Propagating to setup ${setupId}`);
          updated.set(setupId, {
            ...setup,
            _needsRecalculation: true,
            _changedProductId: productId,
          });
        }
      });
      return updated;
    });
  }, []);

  const handleProductEvaluationChange = useCallback((productId, payload) => {
    // Similar propagation for evaluation changes
    setProductsCache((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(productId) || {};
      updated.set(productId, {
        ...existing,
        _evaluationChanged: true,
        lastEvaluationUpdate: new Date().toISOString(),
      });
      return updated;
    });
  }, []);

  // ============================================================================
  // LAYER 2: Setup-level updates
  // ============================================================================

  const subscribeToSetup = useCallback((setupId) => {
    const key = `setup:${setupId}`;
    if (subscriptionsRef.current.has(key)) return;

    const channel = supabase
      .channel(`setup-${setupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_setups",
          filter: `id=eq.${setupId}`,
        },
        (payload) => {
          console.log(`[Layer2] Setup ${setupId} changed:`, payload);
          handleSetupChange(setupId, payload);
        }
      )
      .subscribe();

    subscriptionsRef.current.set(key, channel);
  }, []);

  const unsubscribeFromSetup = useCallback((setupId) => {
    const key = `setup:${setupId}`;
    const channel = subscriptionsRef.current.get(key);
    if (channel) {
      supabase.removeChannel(channel);
      subscriptionsRef.current.delete(key);
    }
  }, []);

  const handleSetupChange = useCallback((setupId, payload) => {
    if (payload.eventType === "DELETE") {
      setSetupsCache((prev) => {
        const updated = new Map(prev);
        updated.delete(setupId);
        return updated;
      });
      return;
    }

    setSetupsCache((prev) => {
      const updated = new Map(prev);
      updated.set(setupId, {
        ...prev.get(setupId),
        ...payload.new,
        _needsRecalculation: true,
      });
      return updated;
    });

    // If this is the active setup, update it
    if (activeSetup?.id === setupId) {
      setActiveSetup((prev) => ({
        ...prev,
        ...payload.new,
        _needsRecalculation: true,
      }));
    }
  }, [activeSetup]);

  // ============================================================================
  // LAYER 3: Active setup detail (deepest level)
  // ============================================================================

  const setActiveSetupWithSubscription = useCallback((setup) => {
    if (activeSetup?.id && activeSetup.id !== setup?.id) {
      // Unsubscribe from previous
      unsubscribeFromSetup(activeSetup.id);
      activeSetup.products?.forEach((p) => {
        unsubscribeFromProduct(p.product_id || p.id);
      });
    }

    setActiveSetup(setup);

    if (setup) {
      // Subscribe to new setup
      subscribeToSetup(setup.id);
      // Subscribe to all products in the setup
      setup.products?.forEach((p) => {
        subscribeToProduct(p.product_id || p.id);
      });
    }
  }, [activeSetup, subscribeToSetup, unsubscribeFromSetup, subscribeToProduct, unsubscribeFromProduct]);

  // ============================================================================
  // OPTIMISTIC UPDATES - Instant UI feedback
  // ============================================================================

  const addProductToSetup = useCallback(async (setupId, product, role = "other") => {
    // Optimistic update (instant UI feedback)
    setSetupsCache((prev) => {
      const updated = new Map(prev);
      const setup = updated.get(setupId);
      if (setup) {
        updated.set(setupId, {
          ...setup,
          products: [
            ...(setup.products || []),
            { product_id: product.id, role, name: product.name },
          ],
          productDetails: [
            ...(setup.productDetails || []),
            product,
          ],
          _needsRecalculation: true,
        });
      }
      return updated;
    });

    // Also update active setup if it matches
    if (activeSetup?.id === setupId) {
      setActiveSetup((prev) => ({
        ...prev,
        products: [
          ...(prev.products || []),
          { product_id: product.id, role, name: product.name },
        ],
        productDetails: [
          ...(prev.productDetails || []),
          product,
        ],
        _needsRecalculation: true,
      }));

      // Subscribe to the new product
      subscribeToProduct(product.id);
    }

    // Persist to server (will trigger real-time update to confirm)
    try {
      const setup = setupsCache.get(setupId);
      const newProducts = [
        ...(setup?.products || []),
        { product_id: product.id, role },
      ];

      await fetch(`/api/setups/${setupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: newProducts }),
      });
    } catch (error) {
      console.error("Failed to add product:", error);
      // Rollback optimistic update on error
      // (In production, would restore previous state)
    }
  }, [activeSetup, setupsCache, subscribeToProduct]);

  const removeProductFromSetup = useCallback(async (setupId, productId) => {
    // Optimistic update
    setSetupsCache((prev) => {
      const updated = new Map(prev);
      const setup = updated.get(setupId);
      if (setup) {
        updated.set(setupId, {
          ...setup,
          products: (setup.products || []).filter(
            (p) => (p.product_id || p.id) !== productId
          ),
          productDetails: (setup.productDetails || []).filter(
            (p) => p.id !== productId
          ),
          _needsRecalculation: true,
        });
      }
      return updated;
    });

    if (activeSetup?.id === setupId) {
      setActiveSetup((prev) => ({
        ...prev,
        products: (prev.products || []).filter(
          (p) => (p.product_id || p.id) !== productId
        ),
        productDetails: (prev.productDetails || []).filter(
          (p) => p.id !== productId
        ),
        _needsRecalculation: true,
      }));

      // Unsubscribe from removed product
      unsubscribeFromProduct(productId);
    }

    // Persist
    try {
      const setup = setupsCache.get(setupId);
      const newProducts = (setup?.products || []).filter(
        (p) => (p.product_id || p.id) !== productId
      );

      await fetch(`/api/setups/${setupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: newProducts }),
      });
    } catch (error) {
      console.error("Failed to remove product:", error);
    }
  }, [activeSetup, setupsCache, unsubscribeFromProduct]);

  // ============================================================================
  // SCORE RECALCULATION - Triggered when products change
  // ============================================================================

  const recalculateSetupScore = useCallback((setup) => {
    const products = setup.productDetails || [];
    if (products.length === 0) return null;

    let totalWeight = 0;
    const weightedSum = { S: 0, A: 0, F: 0, E: 0, total: 0 };

    products.forEach((product) => {
      const weight = product.role === "wallet" ? 2 : 1;
      totalWeight += weight;

      const scores = product.scores || {};
      weightedSum.S += (scores.s || scores.score_s || 0) * weight;
      weightedSum.A += (scores.a || scores.score_a || 0) * weight;
      weightedSum.F += (scores.f || scores.score_f || 0) * weight;
      weightedSum.E += (scores.e || scores.score_e || 0) * weight;
      weightedSum.total += (scores.total || scores.note_finale || 0) * weight;
    });

    if (totalWeight === 0) return null;

    return {
      score_s: Math.round(weightedSum.S / totalWeight),
      score_a: Math.round(weightedSum.A / totalWeight),
      score_f: Math.round(weightedSum.F / totalWeight),
      score_e: Math.round(weightedSum.E / totalWeight),
      note_finale: Math.round(weightedSum.total / totalWeight),
      products_count: products.length,
    };
  }, []);

  // Auto-recalculate when needed
  useEffect(() => {
    setupsCache.forEach((setup, setupId) => {
      if (setup._needsRecalculation) {
        const newScore = recalculateSetupScore(setup);
        setSetupsCache((prev) => {
          const updated = new Map(prev);
          updated.set(setupId, {
            ...setup,
            combinedScore: newScore,
            _needsRecalculation: false,
          });
          return updated;
        });

        if (activeSetup?.id === setupId) {
          setActiveSetup((prev) => ({
            ...prev,
            combinedScore: newScore,
            _needsRecalculation: false,
          }));
        }
      }
    });
  }, [setupsCache, activeSetup, recalculateSetupScore]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      // Cleanup all subscriptions on unmount
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = {
    // State
    productsCache,
    setupsCache,
    activeSetup,
    isConnected,

    // Setters
    setProductsCache,
    setSetupsCache,
    setActiveSetup: setActiveSetupWithSubscription,

    // Subscriptions
    subscribeToProduct,
    unsubscribeFromProduct,
    subscribeToSetup,
    unsubscribeFromSetup,

    // Actions
    addProductToSetup,
    removeProductFromSetup,
    recalculateSetupScore,

    // Utilities
    getProduct: (id) => productsCache.get(id),
    getSetup: (id) => setupsCache.get(id),
  };

  return (
    <RealtimeStackContext.Provider value={value}>
      {children}
    </RealtimeStackContext.Provider>
  );
}

// ============================================================================
// HOOKS for each layer
// ============================================================================

/**
 * Layer 1: Use in Product Page
 */
export function useRealtimeProduct(productId) {
  const context = useContext(RealtimeStackContext);

  // Graceful fallback when not inside provider (SSR or mounting phase)
  const noopSubscribe = useCallback(() => {}, []);
  const noopUnsubscribe = useCallback(() => {}, []);

  const fallbackContext = {
    productsCache: new Map(),
    subscribeToProduct: noopSubscribe,
    unsubscribeFromProduct: noopUnsubscribe,
    isConnected: false,
  };

  const safeContext = context || fallbackContext;

  const { productsCache, subscribeToProduct, unsubscribeFromProduct, isConnected } = safeContext;

  useEffect(() => {
    if (productId && context) {
      subscribeToProduct(productId);
    }
    return () => {
      if (productId && context) {
        unsubscribeFromProduct(productId);
      }
    };
  }, [productId, subscribeToProduct, unsubscribeFromProduct, context]);

  return {
    product: productsCache.get(productId),
    isConnected,
  };
}

/**
 * Layer 2: Use in Dashboard
 */
export function useRealtimeDashboard(setupIds = []) {
  const context = useContext(RealtimeStackContext);

  // Graceful fallback when not inside provider (SSR or mounting phase)
  const noopSubscribe = useCallback(() => {}, []);
  const noopUnsubscribe = useCallback(() => {}, []);
  const noopSetCache = useCallback(() => {}, []);

  const fallbackContext = {
    setupsCache: new Map(),
    setSetupsCache: noopSetCache,
    subscribeToSetup: noopSubscribe,
    unsubscribeFromSetup: noopUnsubscribe,
    isConnected: false,
  };

  const safeContext = context || fallbackContext;
  const { setupsCache, setSetupsCache, subscribeToSetup, unsubscribeFromSetup, isConnected } = safeContext;

  // Subscribe to all user setups
  useEffect(() => {
    if (context) {
      setupIds.forEach((id) => subscribeToSetup(id));
      return () => {
        setupIds.forEach((id) => unsubscribeFromSetup(id));
      };
    }
  }, [setupIds, subscribeToSetup, unsubscribeFromSetup, context]);

  // Initialize cache with fetched setups
  const initializeSetups = useCallback((setups) => {
    if (!context) return;
    setSetupsCache((prev) => {
      const updated = new Map(prev);
      setups.forEach((setup) => {
        updated.set(setup.id, setup);
      });
      return updated;
    });
  }, [setSetupsCache, context]);

  return {
    setups: Array.from(setupsCache.values()),
    initializeSetups,
    isConnected,
  };
}

/**
 * Layer 3: Use in Setup Detail
 */
export function useRealtimeSetup(setupId) {
  const context = useContext(RealtimeStackContext);

  // Graceful fallback when not inside provider (SSR or mounting phase)
  const noopFn = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => {}, []);

  const fallbackContext = {
    activeSetup: null,
    setActiveSetup: noopFn,
    addProductToSetup: noopAsync,
    removeProductFromSetup: noopAsync,
    isConnected: false,
  };

  const safeContext = context || fallbackContext;
  const {
    activeSetup,
    setActiveSetup,
    addProductToSetup,
    removeProductFromSetup,
    isConnected,
  } = safeContext;

  // Set as active when mounted
  useEffect(() => {
    if (setupId && context && (!activeSetup || activeSetup.id !== setupId)) {
      // Fetch and set as active
      fetch(`/api/setups/${setupId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.setup) {
            setActiveSetup(data.setup);
          }
        })
        .catch(console.error);
    }
  }, [setupId, activeSetup, setActiveSetup, context]);

  return {
    setup: activeSetup,
    isConnected,
    addProduct: (product, role) => context ? addProductToSetup(setupId, product, role) : Promise.resolve(),
    removeProduct: (productId) => context ? removeProductFromSetup(setupId, productId) : Promise.resolve(),
  };
}

/**
 * Main hook export
 */
export function useRealtimeStack() {
  const context = useContext(RealtimeStackContext);

  // Graceful fallback when not inside provider (SSR or mounting phase)
  if (!context) {
    return {
      productsCache: new Map(),
      setupsCache: new Map(),
      activeSetup: null,
      isConnected: false,
      setProductsCache: () => {},
      setSetupsCache: () => {},
      setActiveSetup: () => {},
      subscribeToProduct: () => {},
      unsubscribeFromProduct: () => {},
      subscribeToSetup: () => {},
      unsubscribeFromSetup: () => {},
      addProductToSetup: async () => {},
      removeProductFromSetup: async () => {},
      recalculateSetupScore: () => null,
      getProduct: () => undefined,
      getSetup: () => undefined,
    };
  }

  return context;
}

export default useRealtimeStack;
