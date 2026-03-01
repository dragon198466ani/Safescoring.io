"use client";

/**
 * SetupSAFEAnalysis - Layer 3: Setup Detail SAFE Analysis
 *
 * Mirrors the SAFEAnalysis (Layer 1) design but adapted for multi-product setups:
 * - Same visual language as product pages
 * - Combined SAFE pillar scores across all products
 * - Product combination visualization with compatibility
 * - Weakest link analysis (chain is as strong as weakest link)
 * - Per-product contribution breakdown in expanded panels
 *
 * Design coordination:
 * - Layer 1 (Product): Individual product analysis
 * - Layer 2 (Dashboard): Overview of all setups
 * - Layer 3 (Setup Detail): This component - deep dive into one setup
 */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";
import { PILLARS, PILLAR_COLORS } from "@/libs/design-tokens";
import { getScoreColor } from "@/libs/score-utils";
import { SetupAnalytics } from "@/components/SAFEAnalytics";

// Pillar icons (same as Layer 1)
const PILLAR_ICONS = {
  S: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  A: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  F: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  ),
  E: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
};

// Pillar descriptions for setups (aligned with methodology)
const PILLAR_DESCRIPTIONS = {
  S: "Cryptographic foundations across your stack",
  A: "Duress & coercion resistance of your setup",
  F: "Long-term reliability and trust across products",
  E: "Usability and ecosystem compatibility",
};

// Score interpretation (adapted from Layer 1 for setups)
const getScoreInterpretation = (score, productCount) => {
  if (score >= 80) return {
    verdict: "Excellent Setup",
    message: `Your ${productCount}-product stack meets high security standards. Well balanced for significant holdings.`,
    action: "Consider adding complementary products to diversify your security further.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  };
  if (score >= 60) return {
    verdict: "Good Setup",
    message: "Solid security foundation with some areas for improvement. Review individual products.",
    action: "Focus on upgrading or replacing products that drag down your overall score.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  };
  return {
    verdict: "Needs Improvement",
    message: "Security gaps identified in your stack. Consider restructuring.",
    action: "Replace low-scoring products with higher-rated alternatives.",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  };
};

export default function SetupSAFEAnalysis({
  setupId,
  setupName,
  products = [],
  combinedScore = null,
  compatibility = [],
  onProductClick,
  isPaid = false,
  isConnected = false,
}) {
  const [expandedPillar, setExpandedPillar] = useState(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [narrativeData, setNarrativeData] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  // Fetch narrative analysis when a pillar is expanded
  useEffect(() => {
    if (!setupId || narrativeData) return;

    const fetchNarratives = async () => {
      setNarrativeLoading(true);
      try {
        const res = await fetch(`/api/setups/${setupId}/narrative-analysis`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasNarratives) {
            setNarrativeData(data);
          }
        }
      } catch (err) {
        console.error("[SetupSAFEAnalysis] Narrative fetch error:", err);
      } finally {
        setNarrativeLoading(false);
      }
    };

    fetchNarratives();
  }, [setupId, narrativeData]);

  // Calculate pillar data with per-product contributions
  const pillarData = useMemo(() => {
    if (!combinedScore) return [];

    return ["S", "A", "F", "E"].map((code) => {
      const score = combinedScore[`score_${code.toLowerCase()}`] || 0;
      const pillar = PILLARS.find(p => p.code === code) || { name: code, color: "#888" };

      // Find which products contribute most/least to this pillar
      const productContributions = products.map((p) => {
        const scores = p.scores || {};
        const productScore = scores[code.toLowerCase()] || scores[`score_${code.toLowerCase()}`] || 0;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          logoUrl: p.logoUrl,
          score: productScore,
          delta: productScore - score,
        };
      }).sort((a, b) => a.score - b.score);

      const weakestProduct = productContributions[0];
      const strongestProduct = productContributions[productContributions.length - 1];

      return {
        code,
        name: pillar.name,
        color: pillar.color || PILLAR_COLORS[code]?.primary,
        score,
        icon: PILLAR_ICONS[code],
        description: PILLAR_DESCRIPTIONS[code],
        products: productContributions,
        weakestProduct,
        strongestProduct,
      };
    });
  }, [combinedScore, products]);

  // Sort pillars to find strongest/weakest
  const sortedPillars = useMemo(() => {
    return [...pillarData].sort((a, b) => a.score - b.score);
  }, [pillarData]);

  const weakestPillar = sortedPillars[0];
  const strongestPillar = sortedPillars[sortedPillars.length - 1];
  const allEqual = pillarData.every(p => p.score === pillarData[0]?.score);

  // Find the weakest link product (lowest overall score)
  const weakestProduct = useMemo(() => {
    if (products.length === 0) return null;
    return products.reduce((weakest, p) => {
      const score = p.scores?.total || p.scores?.note_finale || 0;
      const weakestScore = weakest?.scores?.total || weakest?.scores?.note_finale || Infinity;
      return score < weakestScore ? p : weakest;
    }, products[0]);
  }, [products]);

  const weakestProductScore = weakestProduct?.scores?.total || weakestProduct?.scores?.note_finale || 0;

  // Compatibility score
  const compatibilityScore = useMemo(() => {
    if (compatibility.length === 0) return null;
    const total = compatibility.reduce((sum, c) => sum + (c.score || 0), 0);
    return Math.round(total / compatibility.length);
  }, [compatibility]);

  // No products state
  if (products.length === 0) {
    return (
      <div className="rounded-xl bg-base-200/30 border border-base-content/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-base-content/10">
          <h2 className="text-lg font-bold">Setup SAFE Analysis</h2>
        </div>
        <div className="px-5 py-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base-300 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-base-content/50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="text-base-content/60 mb-2">Add products to see your setup analysis</p>
          <p className="text-sm text-base-content/40">Drag products from the catalog to build your stack</p>
        </div>
      </div>
    );
  }

  const totalScore = combinedScore?.note_finale || 0;
  const interpretation = getScoreInterpretation(totalScore, products.length);

  return (
    <div className="rounded-xl bg-base-200/30 border border-base-content/10 overflow-hidden">
      {/* Header - Same style as Layer 1 */}
      <div className="px-5 py-4 border-b border-base-content/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Setup Analysis
              {isConnected && (
                <span className="relative flex h-2 w-2" title="Real-time sync">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </h2>
            <p className="text-sm text-base-content/60">
              {products.length} product{products.length > 1 ? "s" : ""} combined
            </p>
          </div>
        </div>
        <Link href="/methodology" className="btn btn-sm btn-ghost gap-1">
          Learn more
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      {/* Score Interpretation - Same style as Layer 1 */}
      <div className={`px-5 py-4 border-b ${interpretation.borderColor} ${interpretation.bgColor}`}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-bold ${interpretation.color}`}>{interpretation.verdict}</span>
              <span className="text-xs text-base-content/50">(Score: {totalScore}/100)</span>
            </div>
            <p className="text-sm text-base-content/70 mb-1">{interpretation.message}</p>
            <p className="text-xs text-base-content/50 italic">{interpretation.action}</p>
          </div>
          {/* Product Chain Visualization */}
          <div className="flex items-center gap-1 shrink-0">
            {products.slice(0, 4).map((p, idx) => (
              <div key={p.id} className="flex items-center">
                <div className="w-8 h-8 rounded-lg border-2 border-base-content/20 overflow-hidden">
                  <ProductLogo logoUrl={p.logoUrl} name={p.name} size="xs" />
                </div>
                {idx < Math.min(products.length, 4) - 1 && (
                  <div className="w-3 h-0.5 bg-base-content/20 mx-0.5" />
                )}
              </div>
            ))}
            {products.length > 4 && (
              <span className="text-xs text-base-content/50 ml-1">+{products.length - 4}</span>
            )}
          </div>
        </div>
      </div>

      {/* Weakest Link Alert - Layer 3 specific */}
      {weakestProduct && weakestProductScore < 70 && (
        <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 0 0 6.364 6.365l3.129-3.129m5.614-5.615 1.757-1.757a4.5 4.5 0 0 0-6.364-6.365l-4.5 4.5c-.258.258-.479.541-.661.843m1.164 4.91a4.5 4.5 0 0 1-.485-.853" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-400">
              Weakest Link: {weakestProduct.name} ({weakestProductScore}%)
            </p>
            <p className="text-sm text-base-content/70 mt-0.5">
              Your setup is only as secure as its weakest component. Consider upgrading this product.
            </p>
          </div>
          <button
            onClick={() => onProductClick?.(weakestProduct)}
            className="btn btn-xs btn-ghost text-red-400 shrink-0"
          >
            View
          </button>
        </div>
      )}

      {/* Priority Alert - Same as Layer 1 */}
      {weakestPillar && weakestPillar.score < 70 && (!weakestProduct || weakestProductScore >= 70) && (
        <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-400">
              Priority: {weakestPillar.name} ({weakestPillar.score}%)
            </p>
            <p className="text-sm text-base-content/70 mt-0.5">
              Focus on improving {weakestPillar.name.toLowerCase()} across your products to strengthen overall security.
            </p>
          </div>
        </div>
      )}

      {/* Pillar Grid - Same style as Layer 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {pillarData.map((pillar, index) => {
          const isWeakest = pillar.code === weakestPillar?.code && !allEqual;
          const isStrongest = pillar.code === strongestPillar?.code && !allEqual;
          const isExpanded = expandedPillar === pillar.code;

          return (
            <button
              key={pillar.code}
              onClick={() => setExpandedPillar(isExpanded ? null : pillar.code)}
              className={`p-4 text-left relative transition-all hover:bg-base-content/5 ${
                index % 2 === 0 ? "border-r border-base-content/10" : ""
              } ${index < 2 ? "border-b lg:border-b-0 border-base-content/10" : ""} ${
                index < 3 ? "lg:border-r" : ""
              } ${isStrongest ? "bg-emerald-500/5" : isWeakest ? "bg-amber-500/5" : ""} ${
                isExpanded ? "ring-2 ring-primary/30 ring-inset" : ""
              }`}
            >
              {/* Badge */}
              {isStrongest && (
                <div className="absolute top-2 right-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  Best
                </div>
              )}
              {isWeakest && !isStrongest && (
                <div className="absolute top-2 right-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Focus
                </div>
              )}

              {/* Icon + Letter + Score */}
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: pillar.color }}>{pillar.icon}</span>
                <span className="text-2xl font-black" style={{ color: pillar.color }}>
                  {pillar.code}
                </span>
                <span className={`text-xl font-bold ${getScoreColor(pillar.score)}`}>
                  {pillar.score}
                </span>
              </div>

              {/* Name */}
              <p className="font-medium text-sm mb-1">{pillar.name}</p>

              {/* Description */}
              <p className="text-xs text-base-content/50 line-clamp-2 mb-2">
                {pillar.description}
              </p>

              {/* Weakest product indicator */}
              {pillar.weakestProduct && pillar.weakestProduct.score < pillar.score - 5 && (
                <div className="flex items-center gap-1 text-xs text-amber-400 mb-1">
                  <span>↓</span>
                  <span className="truncate max-w-[80px]">{pillar.weakestProduct.name}</span>
                  <span className="font-medium">{pillar.weakestProduct.score}</span>
                </div>
              )}

              {/* Expand indicator */}
              <div className="mt-2 flex items-center gap-1 text-xs text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
                {isExpanded ? "Close" : "Products"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Panel - Product contributions */}
      {expandedPillar && (() => {
        const pillar = pillarData.find(p => p.code === expandedPillar);
        if (!pillar) return null;

        return (
          <div className="border-t border-base-content/10 bg-base-300/30">
            <div className="p-5">
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span style={{ color: pillar.color }}>{pillar.icon}</span>
                  <h3 className="font-semibold">{pillar.name} Breakdown</h3>
                </div>
                <button
                  onClick={() => setExpandedPillar(null)}
                  className="btn btn-sm btn-ghost btn-circle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* AI Narrative Section */}
              {narrativeData?.pillarAnalysis?.[pillar.code]?.summary && (
                <div className="mb-4 space-y-3">
                  {/* Narrative Summary */}
                  <p className="text-sm text-base-content/80 leading-relaxed">
                    {narrativeData.pillarAnalysis[pillar.code].summary}
                  </p>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-2 gap-3">
                    {narrativeData.pillarAnalysis[pillar.code].strengths && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs font-semibold text-emerald-400 mb-1">Strengths</p>
                        <p className="text-xs text-base-content/70 leading-relaxed line-clamp-4">
                          {narrativeData.pillarAnalysis[pillar.code].strengths}
                        </p>
                      </div>
                    )}
                    {narrativeData.pillarAnalysis[pillar.code].weaknesses && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs font-semibold text-amber-400 mb-1">Weaknesses</p>
                        <p className="text-xs text-base-content/70 leading-relaxed line-clamp-4">
                          {narrativeData.pillarAnalysis[pillar.code].weaknesses}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Security Strategy */}
                  {narrativeData.pillarAnalysis[pillar.code].securityStrategy && (
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs font-semibold text-blue-400 mb-1">Security Strategy</p>
                      <p className="text-xs text-base-content/70 leading-relaxed line-clamp-3">
                        {narrativeData.pillarAnalysis[pillar.code].securityStrategy}
                      </p>
                    </div>
                  )}

                  {/* Worst Case */}
                  {narrativeData.pillarAnalysis[pillar.code].worstCase && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-xs font-semibold text-red-400 mb-1">Worst Case Scenario</p>
                      <p className="text-xs text-base-content/70 leading-relaxed line-clamp-3">
                        {narrativeData.pillarAnalysis[pillar.code].worstCase}
                      </p>
                    </div>
                  )}

                  <div className="border-b border-base-content/10 mt-2 mb-1" />
                  <p className="text-xs text-base-content/40 font-medium">Product Breakdown</p>
                </div>
              )}

              {narrativeLoading && !narrativeData && (
                <div className="mb-4 flex items-center gap-2 text-xs text-base-content/40">
                  <span className="loading loading-spinner loading-xs"></span>
                  Loading strategic analysis...
                </div>
              )}

              {/* Product contributions */}
              <div className="space-y-2">
                {pillar.products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => onProductClick?.({ ...product, slug: product.slug })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01] ${
                      product.score === pillar.weakestProduct?.score
                        ? "bg-amber-500/10 border-amber-500/30"
                        : product.score === pillar.strongestProduct?.score
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-base-200 border-base-content/10"
                    }`}
                  >
                    <ProductLogo logoUrl={product.logoUrl} name={product.name} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={getScoreColor(product.score)}>{product.score}/100</span>
                        {product.delta !== 0 && (
                          <span className={product.delta > 0 ? "text-green-400" : "text-red-400"}>
                            ({product.delta > 0 ? "+" : ""}{product.delta} vs avg)
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-20">
                      <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            product.score >= 80 ? "bg-green-500" :
                            product.score >= 60 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${product.score}%` }}
                        />
                      </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-base-content/40">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Recommendation */}
              {pillar.weakestProduct && pillar.weakestProduct.score < 70 && (
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-sm text-base-content/80 flex items-start gap-2">
                    <span className="text-primary">💡</span>
                    <span>
                      <strong>{pillar.weakestProduct.name}</strong> is dragging down your {pillar.name} score.
                      Consider replacing it with a higher-rated alternative.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Analytics Section - Layer 3 Data */}
      <div className="border-t border-base-content/10">
        <div className="px-3 sm:px-5 py-3 sm:py-4">
          <SetupAnalytics
            setupId={setupId}
            products={products}
            combinedScore={combinedScore?.note_finale}
            compatibility={compatibility}
            isConnected={isConnected}
          />
        </div>
      </div>

      {/* Global Risk Overview (from AI narratives) */}
      {narrativeData?.riskAnalysis && (
        <div className="border-t border-base-content/10 px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h3 className="text-sm font-semibold">Setup Risk Analysis</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              narrativeData.riskAnalysis.overallRisk === 'critical' ? 'bg-red-500/20 text-red-400' :
              narrativeData.riskAnalysis.overallRisk === 'high' ? 'bg-orange-500/20 text-orange-400' :
              narrativeData.riskAnalysis.overallRisk === 'medium' ? 'bg-amber-500/20 text-amber-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {narrativeData.riskAnalysis.overallRisk}
            </span>
          </div>

          {/* Executive Summary */}
          {narrativeData.riskAnalysis.executiveSummary && (
            <p className="text-sm text-base-content/70 leading-relaxed">
              {narrativeData.riskAnalysis.executiveSummary}
            </p>
          )}

          {/* Interaction Risks + Gap Analysis */}
          <div className="grid sm:grid-cols-2 gap-3">
            {narrativeData.riskAnalysis.interactionRisks?.length > 0 && (
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs font-semibold text-orange-400 mb-1">Interaction Risks</p>
                <ul className="text-xs text-base-content/60 space-y-1">
                  {narrativeData.riskAnalysis.interactionRisks.slice(0, 3).map((risk, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-orange-400 shrink-0">-</span>
                      <span className="line-clamp-2">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {narrativeData.riskAnalysis.priorityMitigations?.length > 0 && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs font-semibold text-emerald-400 mb-1">Priority Actions</p>
                <ul className="text-xs text-base-content/60 space-y-1">
                  {narrativeData.riskAnalysis.priorityMitigations.slice(0, 3).map((m, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-emerald-400 shrink-0">{i + 1}.</span>
                      <span className="line-clamp-2">{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Summary - Same as Layer 1 */}
      <div className="px-5 py-3 bg-base-300/30 border-t border-base-content/10 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-4">
          {!allEqual ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-base-content/60">Strongest:</span>
                <span className="font-medium" style={{ color: strongestPillar?.color }}>
                  {strongestPillar?.name}
                </span>
              </div>
              {weakestPillar?.score < 80 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-base-content/60">Priority:</span>
                  <span className="font-medium" style={{ color: weakestPillar?.color }}>
                    {weakestPillar?.name}
                  </span>
                </div>
              )}
            </>
          ) : (
            <span className="text-base-content/60">Balanced scores across all pillars</span>
          )}
        </div>
        <span className="text-xs text-base-content/40">
          {products.length} products • {compatibility.length} connections
        </span>
      </div>
    </div>
  );
}
