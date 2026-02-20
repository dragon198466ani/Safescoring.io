"use client";

import { useState, useEffect, useMemo } from "react";
import ProductLogo from "@/components/ProductLogo";
import {
  calculateCombinedScore,
  getPercentile,
  getScoreLevel,
  getChallengeTexts,
  detectLocale,
  ROLE_ICONS,
} from "@/libs/challenge-utils";

/**
 * QuickScoreBuilder - Anonymous score calculator for viral challenges
 * Privacy-first: products are never shared, only the score
 */

const ROLES = [
  { id: "wallet", label: "Wallet", weight: "2x" },
  { id: "exchange", label: "Exchange", weight: "1x" },
  { id: "defi", label: "DeFi", weight: "1x" },
  { id: "other", label: "Other", weight: "1x" },
];

export default function QuickScoreBuilder({
  maxProducts = 3,
  opponentScore = null,
  opponentName = null,
  onScoreCalculated = () => {},
  onChallengeCreate = () => {},
  locale: propLocale = null,
}) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Locale detection
  const locale = propLocale || detectLocale();
  const t = getChallengeTexts(locale).ui;

  // Calculate score in real-time
  const score = useMemo(() => {
    if (selectedProducts.length === 0) return null;
    return calculateCombinedScore(selectedProducts);
  }, [selectedProducts]);

  // Notify parent when score changes
  useEffect(() => {
    if (score) {
      onScoreCalculated({
        score,
        percentile: getPercentile(score.note_finale),
        products: selectedProducts.map(p => ({
          product_id: p.product_id,
          role: p.role,
          // Note: name/slug NOT included in challenge data for privacy
        })),
      });
    }
  }, [score, selectedProducts, onScoreCalculated]);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(
          `/api/products?search=${encodeURIComponent(searchQuery)}&limit=8`
        );
        if (response.ok) {
          const data = await response.json();
          // Filter out already selected products
          const filtered = (data.products || []).filter(
            (p) => !selectedProducts.find((sp) => sp.product_id === p.id)
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedProducts]);

  const addProduct = (product) => {
    if (selectedProducts.length >= maxProducts) return;
    if (selectedProducts.find((p) => p.product_id === product.id)) return;

    // Determine role based on product type
    let role = "other";
    const type = product.typeCode?.toLowerCase() || product.type?.toLowerCase() || "";
    if (type.includes("wallet") || type.includes("hardware")) {
      role = "wallet";
    } else if (type.includes("exchange") || type.includes("cex")) {
      role = "exchange";
    } else if (type.includes("defi") || type.includes("dex") || type.includes("protocol")) {
      role = "defi";
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        product_id: product.id,
        role,
        name: product.name,
        slug: product.slug,
        logoUrl: product.logoUrl,
        scores: {
          note_finale: product.scores?.total,
          score_s: product.scores?.s,
          score_a: product.scores?.a,
          score_f: product.scores?.f,
          score_e: product.scores?.e,
        },
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product_id !== productId));
  };

  const updateRole = (productId, newRole) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.product_id === productId ? { ...p, role: newRole } : p
      )
    );
  };

  const scoreLevel = score ? getScoreLevel(score.note_finale) : null;
  const percentile = score ? getPercentile(score.note_finale) : null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder={t.searchPlaceholder}
            disabled={selectedProducts.length >= maxProducts}
            className="input input-bordered w-full pl-12 pr-4 py-3 text-lg bg-base-200 focus:bg-base-100 transition-colors"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searching && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 loading loading-spinner loading-sm" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-base-100 rounded-xl shadow-2xl border border-base-300 max-h-80 overflow-y-auto">
            {searchResults.map((product) => (
              <button
                key={product.id}
                onClick={() => addProduct(product)}
                className="w-full flex items-center gap-3 p-3 hover:bg-base-200 transition-colors text-left"
              >
                <ProductLogo
                  name={product.name}
                  logoUrl={product.logoUrl}
                  size={40}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-sm text-base-content/60">{product.type}</p>
                </div>
                {product.scores?.total && (
                  <div className="text-right">
                    <span className="font-bold text-lg">{product.scores.total}</span>
                    <span className="text-base-content/50">/100</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Click outside to close */}
        {showResults && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowResults(false)}
          />
        )}
      </div>

      {/* Product Count */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-base-content/70">
          {t.productsSelected(selectedProducts.length)}
        </span>
        {selectedProducts.length >= maxProducts && (
          <span className="badge badge-warning gap-1">Max reached</span>
        )}
      </div>

      {/* Selected Products */}
      <div className="space-y-3 mb-6">
        {selectedProducts.length === 0 ? (
          <div className="text-center py-12 bg-base-200/50 rounded-xl border-2 border-dashed border-base-300">
            <p className="text-base-content/50 text-lg">{t.noProducts}</p>
            <p className="text-base-content/40 text-sm mt-1">{t.addProduct}</p>
          </div>
        ) : (
          selectedProducts.map((product) => (
            <div
              key={product.product_id}
              className="flex items-center gap-3 p-4 bg-base-200 rounded-xl"
            >
              <ProductLogo
                name={product.name}
                logoUrl={product.logoUrl}
                size={48}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Role selector */}
                  <select
                    value={product.role}
                    onChange={(e) => updateRole(product.product_id, e.target.value)}
                    className="select select-xs select-bordered"
                  >
                    {ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {ROLE_ICONS[role.id]} {t.role[role.id]} ({role.weight})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Individual score */}
              <div className="text-right">
                <span className="font-bold text-xl">
                  {product.scores?.note_finale ?? "?"}
                </span>
                <span className="text-base-content/50">/100</span>
              </div>
              {/* Remove button */}
              <button
                onClick={() => removeProduct(product.product_id)}
                className="btn btn-ghost btn-sm btn-circle"
                title={t.removeProduct}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Live Score Display */}
      {score && (
        <div className={`p-6 rounded-2xl ${scoreLevel.bg} mb-6`}>
          {/* Opponent comparison header */}
          {opponentScore && (
            <div className="text-center mb-4 pb-4 border-b border-base-content/10">
              <p className="text-base-content/70">
                {t.challengeSubtitle(opponentScore)}
              </p>
            </div>
          )}

          {/* Main score */}
          <div className="text-center">
            <p className="text-base-content/70 text-sm uppercase tracking-wide mb-2">
              {t.yourScore}
            </p>
            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-7xl font-black ${scoreLevel.color}`}>
                {score.note_finale}
              </span>
              <span className="text-2xl text-base-content/40">/100</span>
            </div>

            {/* Percentile badge */}
            <div className="mt-3">
              <span className={`badge badge-lg ${scoreLevel.bg} ${scoreLevel.color} border-0`}>
                {t.topPercent(percentile)}
              </span>
            </div>

            {/* Comparison result */}
            {opponentScore && (
              <div className="mt-4 pt-4 border-t border-base-content/10">
                {score.note_finale > opponentScore ? (
                  <p className="text-green-500 font-bold text-lg">{t.youWon}</p>
                ) : score.note_finale < opponentScore ? (
                  <p className="text-orange-500 font-bold text-lg">{t.youLost}</p>
                ) : (
                  <p className="text-blue-500 font-bold text-lg">{t.itsTie}</p>
                )}
                <p className="text-base-content/60 mt-1">
                  {t.yourResult(score.note_finale, opponentScore)}
                </p>
              </div>
            )}
          </div>

          {/* SAFE Pillars breakdown */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {["S", "A", "F", "E"].map((pillar) => {
              const pillarScore = score[`score_${pillar.toLowerCase()}`];
              const pillarLevel = getScoreLevel(pillarScore);
              return (
                <div key={pillar} className="text-center">
                  <div
                    className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl font-bold ${pillarLevel.bg} ${pillarLevel.color}`}
                  >
                    {pillar}
                  </div>
                  <p className="mt-2 font-bold">{pillarScore}</p>
                  <p className="text-xs text-base-content/50">
                    {t.pillars[pillar]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {score && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() =>
              onChallengeCreate({
                score,
                percentile,
                products: selectedProducts,
              })
            }
            className="btn btn-primary h-14 min-h-0 flex-1 gap-2 touch-manipulation active:scale-[0.97] transition-transform"
          >
            <span className="text-xl">🔥</span>
            {t.challengeFriend}
          </button>
          <a
            href="/signin"
            className="btn btn-outline h-14 min-h-0 flex-1 touch-manipulation active:scale-[0.97] transition-transform"
          >
            {t.saveScore}
          </a>
        </div>
      )}

      {/* Privacy notice */}
      <p className="text-center text-xs text-base-content/40 mt-6">
        {locale === "fr"
          ? "Tes produits restent privés. Seul le score est partagé."
          : "Your products stay private. Only the score is shared."}
      </p>
    </div>
  );
}
