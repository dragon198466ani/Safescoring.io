"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSetupSubscription } from "./useSupabaseSubscription";

/**
 * useSetupScores - Manages real-time SAFE score calculations for a setup
 *
 * Features:
 * - Real-time score updates when products change
 * - Automatic recalculation on product score changes
 * - Score change detection and callbacks
 * - Animated transitions support
 *
 * @param {Object} options Configuration options
 * @param {Object} options.setup - The setup object with products
 * @param {Function} options.onScoreChange - Callback when scores change
 * @param {boolean} options.enabled - Whether to enable real-time updates
 *
 * @returns {Object} { scores, previousScores, loading, isConnected, hasChanges, refreshScores }
 */
export function useSetupScores({ setup, onScoreChange, enabled = true }) {
  const [scores, setScores] = useState(null);
  const [previousScores, setPreviousScores] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const lastFetchRef = useRef(0);
  const fetchTimeoutRef = useRef(null);

  // Calculate product IDs for subscription filtering
  const productIds = setup?.products?.map((p) => p.product_id) || [];

  // Fetch scores from API
  const fetchScores = useCallback(async () => {
    if (!setup?.id) return null;

    // Debounce rapid calls
    const now = Date.now();
    if (now - lastFetchRef.current < 500) {
      return scores;
    }
    lastFetchRef.current = now;

    try {
      const response = await fetch(`/api/setups/${setup.id}`);
      if (!response.ok) throw new Error("Failed to fetch setup");

      const data = await response.json();
      return data.setup?.combinedScore || null;
    } catch (error) {
      console.error("Error fetching setup scores:", error);
      return null;
    }
  }, [setup?.id, scores]);

  // Handle score changes with animation support
  const handleScoreUpdate = useCallback(
    (newScores) => {
      if (!newScores) return;

      setScores((currentScores) => {
        // Check if scores actually changed
        const changed =
          !currentScores ||
          currentScores.note_finale !== newScores.note_finale ||
          currentScores.score_s !== newScores.score_s ||
          currentScores.score_a !== newScores.score_a ||
          currentScores.score_f !== newScores.score_f ||
          currentScores.score_e !== newScores.score_e;

        if (changed) {
          setPreviousScores(currentScores);
          setHasChanges(true);

          // Call the change callback with old and new scores
          if (onScoreChange && currentScores) {
            onScoreChange({
              previous: currentScores,
              current: newScores,
              changes: {
                total: newScores.note_finale - (currentScores.note_finale || 0),
                s: newScores.score_s - (currentScores.score_s || 0),
                a: newScores.score_a - (currentScores.score_a || 0),
                f: newScores.score_f - (currentScores.score_f || 0),
                e: newScores.score_e - (currentScores.score_e || 0),
              },
            });
          }

          // Reset hasChanges flag after animation duration
          setTimeout(() => setHasChanges(false), 2000);
        }

        return newScores;
      });
    },
    [onScoreChange]
  );

  // Real-time subscription handler
  const handleRealtimeUpdate = useCallback(
    async (payload) => {
      // Clear any pending fetch
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Debounce the fetch slightly to batch rapid updates
      fetchTimeoutRef.current = setTimeout(async () => {
        const newScores = await fetchScores();
        if (newScores) {
          handleScoreUpdate(newScores);
        }
      }, 300);
    },
    [fetchScores, handleScoreUpdate]
  );

  // Subscribe to real-time updates
  const { isConnected, connectionError, forceRefresh } = useSetupSubscription({
    setupId: setup?.id,
    productIds,
    onUpdate: handleRealtimeUpdate,
    enabled: enabled && !!setup?.id,
  });

  // Initial load
  useEffect(() => {
    if (!setup?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Use combinedScore from setup if available
    if (setup.combinedScore) {
      setScores(setup.combinedScore);
      setLoading(false);
    } else {
      // Fetch from API
      fetchScores().then((data) => {
        if (data) setScores(data);
        setLoading(false);
      });
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [setup?.id, setup?.combinedScore, fetchScores]);

  // Manual refresh function
  const refreshScores = useCallback(async () => {
    setLoading(true);
    const newScores = await fetchScores();
    if (newScores) {
      handleScoreUpdate(newScores);
    }
    setLoading(false);
  }, [fetchScores, handleScoreUpdate]);

  return {
    scores,
    previousScores,
    loading,
    isConnected,
    connectionError,
    hasChanges,
    refreshScores,
    forceRefresh,
  };
}

/**
 * useAnimatedScore - Animated counter for score display
 *
 * @param {number} targetValue - Target score value
 * @param {number} duration - Animation duration in ms (default: 800)
 *
 * @returns {number} Current animated value
 */
export function useAnimatedScore(targetValue, duration = 800) {
  const [displayValue, setDisplayValue] = useState(targetValue || 0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(displayValue);

  useEffect(() => {
    if (targetValue === undefined || targetValue === null) return;
    if (targetValue === displayValue) return;

    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      const newValue = Math.round(
        startValueRef.current + (targetValue - startValueRef.current) * eased
      );

      setDisplayValue(newValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, displayValue]);

  return displayValue;
}

/**
 * useScoreChange - Detects and tracks score changes
 *
 * @param {Object} scores - Current scores object
 * @returns {Object} { direction, magnitude, pillarChanges }
 */
export function useScoreChange(scores) {
  const previousRef = useRef(null);
  const [change, setChange] = useState({
    direction: null, // 'up', 'down', null
    magnitude: 0,
    pillarChanges: {},
  });

  useEffect(() => {
    if (!scores || !previousRef.current) {
      previousRef.current = scores;
      return;
    }

    const prev = previousRef.current;
    const diff = (scores.note_finale || 0) - (prev.note_finale || 0);

    if (diff !== 0) {
      setChange({
        direction: diff > 0 ? "up" : "down",
        magnitude: Math.abs(diff),
        pillarChanges: {
          S: (scores.score_s || 0) - (prev.score_s || 0),
          A: (scores.score_a || 0) - (prev.score_a || 0),
          F: (scores.score_f || 0) - (prev.score_f || 0),
          E: (scores.score_e || 0) - (prev.score_e || 0),
        },
      });

      // Reset after animation
      const timer = setTimeout(() => {
        setChange({ direction: null, magnitude: 0, pillarChanges: {} });
      }, 3000);

      previousRef.current = scores;
      return () => clearTimeout(timer);
    }

    previousRef.current = scores;
  }, [scores]);

  return change;
}

export default useSetupScores;
