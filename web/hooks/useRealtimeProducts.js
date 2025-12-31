"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Hook pour la synchronisation en temps réel des produits
 * S'abonne aux changements de la table safe_scoring_results
 * et déclenche un refresh quand les scores sont mis à jour
 */
export function useRealtimeProducts({ onUpdate, enabled = true }) {
  const channelRef = useRef(null);
  const lastUpdateRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);

  const handleChange = useCallback(
    (payload) => {
      // Éviter les updates en double (debounce de 2 secondes)
      const now = Date.now();
      if (lastUpdateRef.current && now - lastUpdateRef.current < 2000) {
        return;
      }
      lastUpdateRef.current = now;

      if (onUpdate && mountedRef.current) {
        onUpdate(payload);
      }
    },
    [onUpdate]
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !isSupabaseConfigured() || !supabase) {
      return;
    }

    // Créer un channel uniquement pour safe_scoring_results
    // (les autres tables déclenchent trop d'updates inutiles)
    const channel = supabase
      .channel("safe_scoring_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "safe_scoring_results",
        },
        handleChange
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "products",
        },
        handleChange
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "products",
        },
        handleChange
      )
      .subscribe((status) => {
        if (mountedRef.current) {
          setIsConnected(status === "SUBSCRIBED");
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, handleChange]);

  // Fonction pour forcer un refresh manuel
  const forceRefresh = useCallback(() => {
    if (onUpdate) {
      onUpdate({ eventType: "MANUAL_REFRESH" });
    }
  }, [onUpdate]);

  return {
    forceRefresh,
    isConnected,
  };
}

export default useRealtimeProducts;
