"use client";

/**
 * ProductRealtimeScores - Client wrapper for real-time score updates on product pages
 *
 * INCEPTION Layer 1: Subscribes to a single product's score changes via Supabase.
 * When scores update in the database, this component fetches fresh data and
 * passes it to children via render props, overriding the ISR-cached scores.
 *
 * Usage (in SSR product page):
 *   <ProductRealtimeScores productId={product.id} initialScores={product.scores}>
 *     {(scores) => <ProductScoreTierView scores={scores} ... />}
 *   </ProductRealtimeScores>
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabaseSubscription } from "@/hooks/useSupabaseSubscription";

export default function ProductRealtimeScores({
  productId,
  initialScores,
  initialConsumerScores,
  initialEssentialScores,
  children,
}) {
  const [scores, setScores] = useState(initialScores);
  const [consumerScores, setConsumerScores] = useState(initialConsumerScores);
  const [essentialScores, setEssentialScores] = useState(initialEssentialScores);
  const [lastUpdate, setLastUpdate] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // When a score change is detected, fetch fresh scores from the API
  const handleScoreUpdate = useCallback(async () => {
    if (!productId || !mountedRef.current) return;
    try {
      const res = await fetch(`/api/products/${productId}?scores_only=1`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.scores && mountedRef.current) {
        setScores(data.scores);
        if (data.consumerScores) setConsumerScores(data.consumerScores);
        if (data.essentialScores) setEssentialScores(data.essentialScores);
        setLastUpdate(new Date().toISOString());
      }
    } catch {
      // Silently fail — ISR data is still displayed
    }
  }, [productId]);

  // Subscribe to this product's score changes in safe_scoring_results
  const { isConnected } = useSupabaseSubscription({
    channelName: `product_score_${productId}`,
    subscriptions: [
      {
        event: "UPDATE",
        table: "safe_scoring_results",
        filter: `product_id=eq.${productId}`,
      },
    ],
    onUpdate: handleScoreUpdate,
    enabled: !!productId,
    debounceMs: 1000,
  });

  return children({
    scores,
    consumerScores,
    essentialScores,
    isConnected,
    lastUpdate,
  });
}
