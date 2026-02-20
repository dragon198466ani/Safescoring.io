"use client";

/**
 * useScoreNotifications - Écoute les notifications pg_notify pour les mises à jour de scores
 * 
 * Ce hook utilise Supabase Realtime pour écouter le canal 'score_updates'
 * qui est déclenché par la fonction calculate_product_scores() en base.
 * 
 * Cela permet des mises à jour INSTANTANÉES sans polling.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Hook pour écouter les notifications de mise à jour de scores en temps réel
 * 
 * @param {Object} options Configuration
 * @param {Function} options.onScoreUpdate - Callback quand un score est mis à jour
 * @param {number[]} options.productIds - Liste des product_id à surveiller (optionnel, tous si vide)
 * @param {boolean} options.enabled - Activer/désactiver l'écoute
 * 
 * @returns {Object} { isConnected, lastUpdate }
 */
export function useScoreNotifications({
  onScoreUpdate,
  productIds = [],
  enabled = true,
} = {}) {
  const supabaseRef = useRef(null);
  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Initialiser Supabase
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabaseRef.current = getSupabase();
    }
  }, []);

  // Handler pour les notifications
  const handleNotification = useCallback(
    (payload) => {
      try {
        // Le payload de pg_notify arrive dans payload.payload
        const data = typeof payload.payload === 'string' 
          ? JSON.parse(payload.payload) 
          : payload.payload;

        // Filtrer par productIds si spécifié
        if (productIds.length > 0 && !productIds.includes(data.product_id)) {
          return;
        }

        setLastUpdate({
          productId: data.product_id,
          score: data.note_finale,
          change: data.score_change,
          timestamp: new Date(),
        });

        if (onScoreUpdate) {
          onScoreUpdate(data);
        }
      } catch (error) {
        console.warn("[useScoreNotifications] Error parsing notification:", error);
      }
    },
    [onScoreUpdate, productIds]
  );

  // Setup du channel Realtime
  useEffect(() => {
    if (!enabled || !supabaseRef.current) {
      return;
    }

    const supabase = supabaseRef.current;

    // Écouter les changements sur safe_scoring_results via postgres_changes
    // C'est plus fiable que pg_notify pour Supabase Realtime
    channelRef.current = supabase
      .channel("score_updates_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "safe_scoring_results",
        },
        (payload) => {
          const data = payload.new || payload.old;
          if (!data) return;

          // Filtrer par productIds si spécifié
          if (productIds.length > 0 && !productIds.includes(data.product_id)) {
            return;
          }

          const update = {
            product_id: data.product_id,
            note_finale: data.note_finale,
            score_s: data.score_s,
            score_a: data.score_a,
            score_f: data.score_f,
            score_e: data.score_e,
            eventType: payload.eventType,
            timestamp: new Date(),
          };

          setLastUpdate(update);

          if (onScoreUpdate) {
            onScoreUpdate(update);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          console.log("[useScoreNotifications] Connected to score updates");
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, onScoreUpdate, productIds]);

  return {
    isConnected,
    lastUpdate,
  };
}

/**
 * Hook pour surveiller les scores d'un produit spécifique
 */
export function useProductScoreWatch({ productId, onScoreChange, enabled = true }) {
  return useScoreNotifications({
    onScoreUpdate: onScoreChange,
    productIds: productId ? [productId] : [],
    enabled: enabled && !!productId,
  });
}

/**
 * Hook pour surveiller les scores de plusieurs produits (ex: setup)
 */
export function useMultiProductScoreWatch({ productIds = [], onScoreChange, enabled = true }) {
  return useScoreNotifications({
    onScoreUpdate: onScoreChange,
    productIds,
    enabled: enabled && productIds.length > 0,
  });
}

export default useScoreNotifications;
