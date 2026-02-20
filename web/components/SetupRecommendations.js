"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";
import { getScoreColor } from "@/components/ScoreCircle";

/**
 * Pillar configuration with colors and icons
 */
const PILLAR_CONFIG = {
  S: {
    name: "Security",
    color: "green",
    bgClass: "bg-green-500/10",
    textClass: "text-green-400",
    borderClass: "border-green-500/30",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  A: {
    name: "Adversity",
    color: "amber",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  F: {
    name: "Fidelity",
    color: "blue",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/30",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
  E: {
    name: "Efficiency",
    color: "purple",
    bgClass: "bg-purple-500/10",
    textClass: "text-purple-400",
    borderClass: "border-purple-500/30",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
  },
};

/**
 * Single recommendation card
 */
const RecommendationCard = memo(function RecommendationCard({
  product,
  targetPillar,
  onAdd,
  isAdding = false,
}) {
  const pillarConfig = PILLAR_CONFIG[targetPillar];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-base-300/50 border border-base-content/5 hover:border-base-content/10 transition-colors">
      <ProductLogo
        logoUrl={product.logoUrl}
        name={product.name}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${product.slug}`}
          className="font-medium text-sm hover:text-primary transition-colors truncate block"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-base-content/40">{product.type}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${pillarConfig.bgClass} ${pillarConfig.textClass}`}>
            {targetPillar}: {product.targetPillarScore}
          </span>
        </div>
        <p className="text-xs text-base-content/40 mt-1 truncate">
          {product.reason}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Overall score */}
        <div className={`text-sm font-bold ${getScoreColor(product.scores.total)}`}>
          {product.scores.total}
        </div>

        {/* Add button */}
        {onAdd && (
          <button
            onClick={() => onAdd(product)}
            disabled={isAdding}
            className="btn btn-xs btn-primary btn-circle"
            title="Add to stack"
          >
            {isAdding ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
});

/**
 * Pillar tab button
 */
const PillarTab = memo(function PillarTab({ pillar, isActive, score, onClick }) {
  const config = PILLAR_CONFIG[pillar];

  return (
    <button
      onClick={() => onClick(pillar)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        isActive
          ? `${config.bgClass} ${config.textClass} border ${config.borderClass}`
          : "bg-base-300/50 text-base-content/60 hover:bg-base-300"
      }`}
    >
      {config.icon}
      <span className="text-sm font-medium">{pillar}</span>
      <span className={`text-xs ${isActive ? "" : "text-base-content/40"}`}>
        {score}
      </span>
    </button>
  );
});

/**
 * Setup recommendations component
 */
function SetupRecommendations({
  setupId,
  currentScores,
  onAddProduct,
  initialPillar,
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPillar, setSelectedPillar] = useState(initialPillar || null);
  const [allPillars, setAllPillars] = useState([]);
  const [addingProductId, setAddingProductId] = useState(null);

  // Fetch recommendations
  const fetchRecommendations = useCallback(
    async (pillar) => {
      if (!setupId) return;

      try {
        setLoading(true);
        const url = pillar
          ? `/api/setups/${setupId}/recommendations?pillar=${pillar}`
          : `/api/setups/${setupId}/recommendations`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }

        const data = await response.json();

        setRecommendations(data.recommendations || []);
        setSelectedPillar(data.targetPillar);
        setAllPillars(data.allPillars || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [setupId]
  );

  // Initial load
  useEffect(() => {
    fetchRecommendations(initialPillar);
  }, [fetchRecommendations, initialPillar]);

  // Handle pillar change
  const handlePillarChange = useCallback(
    (pillar) => {
      fetchRecommendations(pillar);
    },
    [fetchRecommendations]
  );

  // Handle add product
  const handleAddProduct = useCallback(
    async (product) => {
      if (!onAddProduct) return;

      setAddingProductId(product.id);
      try {
        await onAddProduct(product);
        // Refetch recommendations after adding
        fetchRecommendations(selectedPillar);
      } catch (error) {
        console.error("Failed to add product:", error);
      } finally {
        setAddingProductId(null);
      }
    },
    [onAddProduct, fetchRecommendations, selectedPillar]
  );

  if (error) {
    return (
      <div className="bg-base-200 rounded-xl p-4 border border-base-300 text-center">
        <p className="text-sm text-red-400">Failed to load recommendations</p>
        <button
          onClick={() => fetchRecommendations(selectedPillar)}
          className="btn btn-xs btn-ghost mt-2"
        >
          Retry
        </button>
      </div>
    );
  }

  const pillarConfig = selectedPillar ? PILLAR_CONFIG[selectedPillar] : null;

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300">
        <h3 className="font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          Recommendations
        </h3>
        {selectedPillar && pillarConfig && (
          <p className="text-xs text-base-content/40 mt-1">
            Products to improve your <span className={pillarConfig.textClass}>{pillarConfig.name}</span> score
          </p>
        )}
      </div>

      {/* Pillar tabs */}
      <div className="px-4 py-3 border-b border-base-content/5 flex gap-2 overflow-x-auto">
        {allPillars.map((p) => (
          <PillarTab
            key={p.pillar}
            pillar={p.pillar}
            score={p.score}
            isActive={selectedPillar === p.pillar}
            onClick={handlePillarChange}
          />
        ))}
        {loading && allPillars.length === 0 && (
          <div className="flex gap-2">
            {["S", "A", "F", "E"].map((p) => (
              <div
                key={p}
                className="w-16 h-9 bg-base-300 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}
      </div>

      {/* Recommendations list */}
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-base-300" />
                <div className="flex-1">
                  <div className="h-4 bg-base-300 rounded w-3/4" />
                  <div className="h-3 bg-base-300 rounded w-1/2 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-6 text-base-content/40">
            <p className="text-sm">No recommendations available</p>
            <p className="text-xs mt-1">
              {selectedPillar
                ? `Your ${PILLAR_CONFIG[selectedPillar].name} score is already excellent!`
                : "Add more products to get recommendations"}
            </p>
          </div>
        ) : (
          recommendations.map((product) => (
            <RecommendationCard
              key={product.id}
              product={product}
              targetPillar={selectedPillar}
              onAdd={onAddProduct ? handleAddProduct : undefined}
              isAdding={addingProductId === product.id}
            />
          ))
        )}
      </div>

      {/* Footer tip */}
      {recommendations.length > 0 && (
        <div className="px-4 py-2 bg-base-100/50 border-t border-base-content/5 text-xs text-base-content/40">
          Click + to add a product to your stack
        </div>
      )}
    </div>
  );
}

export default memo(SetupRecommendations);
export { RecommendationCard, PillarTab, PILLAR_CONFIG };
