"use client";

/**
 * ProductRealtimeWrapper - Layer 1: Real-time Product Data
 *
 * Wraps product page content to enable:
 * - Real-time score updates via Supabase subscription
 * - "Last updated" indicator showing data freshness
 * - Connection status indicator (green dot)
 * - Link to user's setups containing this product
 *
 * Part of the Inception-style architecture:
 * Layer 1 (Product) -> Layer 2 (Dashboard) -> Layer 3 (Setup Detail)
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRealtimeProduct, useRealtimeStack } from "@/hooks/useRealtimeStack";
import { useProductScoreSubscription } from "@/hooks/useSupabaseSubscription";
import { getScoreColor } from "@/libs/design-tokens";

/**
 * Real-time score display with live updates
 */
export function ProductScoreRealtime({
  productId,
  productSlug,
  initialScore,
  initialScores,
  onScoreUpdate
}) {
  const [currentScore, setCurrentScore] = useState(initialScore);
  const [currentScores, setCurrentScores] = useState(initialScores);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [scoreChange, setScoreChange] = useState(null);

  // Subscribe to real-time score changes
  const handleScoreUpdate = useCallback((payload) => {
    if (payload.eventType === "UPDATE" && payload.new) {
      const newData = payload.new;
      // Check if this update is for our product
      if (newData.product_id === productId) {
        const oldScore = currentScore;
        const newScore = newData.note_finale;

        setCurrentScore(newScore);
        setCurrentScores({
          total: newScore,
          s: newData.score_s,
          a: newData.score_a,
          f: newData.score_f,
          e: newData.score_e,
        });
        setLastUpdate(new Date());

        // Calculate score change
        if (oldScore && newScore !== oldScore) {
          setScoreChange(newScore - oldScore);
          // Clear change indicator after 10 seconds
          setTimeout(() => setScoreChange(null), 10000);
        }

        // Notify parent if callback provided
        if (onScoreUpdate) {
          onScoreUpdate({
            score: newScore,
            scores: {
              total: newScore,
              s: newData.score_s,
              a: newData.score_a,
              f: newData.score_f,
              e: newData.score_e,
            }
          });
        }
      }
    }
  }, [productId, currentScore, onScoreUpdate]);

  const { isConnected, connectionError } = useProductScoreSubscription({
    onUpdate: handleScoreUpdate,
    enabled: true,
  });

  return {
    score: currentScore,
    scores: currentScores,
    lastUpdate,
    scoreChange,
    isConnected,
    connectionError,
  };
}

/**
 * Connection status indicator (green pulsing dot)
 */
export function RealtimeIndicator({ isConnected, lastUpdate }) {
  const formatTimeAgo = (date) => {
    if (!date) return null;
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Connection indicator */}
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-500 font-medium">Live</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-amber-500 font-medium">Syncing...</span>
          </>
        )}
      </div>

      {/* Last update time */}
      {lastUpdate && (
        <span className="text-base-content/50">
          Updated {formatTimeAgo(lastUpdate)}
        </span>
      )}
    </div>
  );
}

/**
 * Score change indicator (+3 or -2)
 */
export function ScoreChangeIndicator({ change }) {
  if (!change || change === 0) return null;

  const isPositive = change > 0;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
      isPositive
        ? "bg-green-500/20 text-green-400"
        : "bg-red-500/20 text-red-400"
    }`}>
      {isPositive ? "+" : ""}{change}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={`w-3 h-3 ${isPositive ? "" : "rotate-180"}`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    </span>
  );
}

/**
 * Shows which user setups contain this product
 */
export function ProductInSetups({ productId, productSlug }) {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSetups = async () => {
      try {
        const res = await fetch("/api/setups");
        if (res.ok) {
          const data = await res.json();
          // Filter setups that contain this product
          const containingSetups = (data.setups || []).filter(setup =>
            setup.products?.some(p => p.product_id === productId)
          );
          setSetups(containingSetups);
        }
      } catch (err) {
        console.error("Failed to fetch setups:", err);
      }
      setLoading(false);
    };

    fetchSetups();
  }, [productId]);

  if (loading) return null;
  if (setups.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-base-content/50">In your setups:</span>
      <div className="flex items-center gap-1">
        {setups.slice(0, 3).map((setup, index) => (
          <Link
            key={setup.id}
            href={`/dashboard/setups/${setup.id}`}
            className="px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {setup.name}
          </Link>
        ))}
        {setups.length > 3 && (
          <Link
            href="/dashboard/setups"
            className="px-2 py-0.5 rounded bg-base-300 text-base-content/60 hover:bg-base-300/80"
          >
            +{setups.length - 3} more
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Data freshness indicator
 */
export function DataFreshness({ lastEvaluatedAt, calculatedAt }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) return "Less than 1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getFreshnessColor = (dateStr) => {
    if (!dateStr) return "text-base-content/50";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return "text-green-500";
    if (diffDays < 30) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-base-content/50">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <span className="text-base-content/50">Last evaluated:</span>
      <span className={getFreshnessColor(lastEvaluatedAt || calculatedAt)}>
        {formatDate(lastEvaluatedAt || calculatedAt)}
      </span>
    </div>
  );
}

/**
 * Complete real-time header for product page
 */
export default function ProductRealtimeHeader({
  productId,
  productSlug,
  productName,
  initialScore,
  initialScores,
  lastEvaluatedAt,
  calculatedAt,
}) {
  const [score, setScore] = useState(initialScore);
  const [scores, setScores] = useState(initialScores);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [scoreChange, setScoreChange] = useState(null);

  // Subscribe to real-time updates
  const handleUpdate = useCallback((payload) => {
    if (payload.new && payload.new.product_id === productId) {
      const newScore = payload.new.note_finale;
      const oldScore = score;

      setScore(newScore);
      setScores({
        total: newScore,
        s: payload.new.score_s,
        a: payload.new.score_a,
        f: payload.new.score_f,
        e: payload.new.score_e,
      });
      setLastUpdate(new Date());

      if (oldScore && newScore !== oldScore) {
        setScoreChange(newScore - oldScore);
        setTimeout(() => setScoreChange(null), 10000);
      }
    }
  }, [productId, score]);

  const { isConnected } = useProductScoreSubscription({
    onUpdate: handleUpdate,
    enabled: true,
  });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 px-3 rounded-lg bg-base-200/50 border border-base-300 text-sm">
      {/* Real-time indicator */}
      <RealtimeIndicator isConnected={isConnected} lastUpdate={lastUpdate} />

      {/* Score change */}
      {scoreChange && <ScoreChangeIndicator change={scoreChange} />}

      {/* Divider */}
      <div className="hidden sm:block w-px h-4 bg-base-300" />

      {/* Data freshness */}
      <DataFreshness lastEvaluatedAt={lastEvaluatedAt} calculatedAt={calculatedAt} />

      {/* Divider */}
      <div className="hidden sm:block w-px h-4 bg-base-300" />

      {/* Product in setups */}
      <ProductInSetups productId={productId} productSlug={productSlug} />
    </div>
  );
}
