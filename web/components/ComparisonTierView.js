"use client";

/**
 * ComparisonTierView - Client component for tier-switched product comparison.
 * Used on the /compare/[...slugs] page.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { SCORE_TIERS, SCORE_TIER_IDS } from "@/libs/config-constants";
import ProductLogo from "@/components/ProductLogo";

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/20 border-green-500/30";
  if (score >= 60) return "bg-amber-500/20 border-amber-500/30";
  return "bg-red-500/20 border-red-500/30";
};

const WinnerBadge = () => (
  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
    WINNER
  </span>
);

function getScoresForTier(product, tierId) {
  switch (tierId) {
    case "consumer":
      return product.consumerScores || { total: 0, s: 0, a: 0, f: 0, e: 0 };
    case "essential":
      return product.essentialScores || { total: 0, s: 0, a: 0, f: 0, e: 0 };
    default:
      return product.scores || { total: 0, s: 0, a: 0, f: 0, e: 0 };
  }
}

/**
 * @param {Object} props
 * @param {Object} props.productA - Product A with scores, consumerScores, essentialScores
 * @param {Object} props.productB - Product B with scores, consumerScores, essentialScores
 * @param {Array} props.pillars - Pillar config from config.safe.pillars
 * @param {number} props.totalNorms - Total norms count for display
 */
export default function ComparisonTierView({ productA, productB, pillars, totalNorms }) {
  const [activeTier, setActiveTier] = useState("full");

  const scoresA = useMemo(() => getScoresForTier(productA, activeTier), [productA, activeTier]);
  const scoresB = useMemo(() => getScoresForTier(productB, activeTier), [productB, activeTier]);

  // Determine winners
  const winners = useMemo(() => {
    const w = {
      total: scoresA.total > scoresB.total ? "A" : scoresA.total < scoresB.total ? "B" : "tie",
    };
    ["s", "a", "f", "e"].forEach((p) => {
      w[p] = scoresA[p] > scoresB[p] ? "A" : scoresA[p] < scoresB[p] ? "B" : "tie";
    });
    return w;
  }, [scoresA, scoresB]);

  const pillarWins = useMemo(() => {
    const wins = { A: 0, B: 0 };
    ["s", "a", "f", "e"].forEach((p) => {
      if (winners[p] === "A") wins.A++;
      if (winners[p] === "B") wins.B++;
    });
    return wins;
  }, [winners]);

  const tierConfig = SCORE_TIERS[activeTier];

  return (
    <>
      {/* Tier Selector */}
      <div className="flex justify-center gap-2 mb-8">
        {SCORE_TIER_IDS.map((tierId) => {
          const tier = SCORE_TIERS[tierId];
          const isActive = activeTier === tierId;
          return (
            <button
              key={tierId}
              onClick={() => setActiveTier(tierId)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-content border-primary shadow-sm"
                  : "bg-base-200 text-base-content/60 hover:bg-base-300 border-transparent"
              }`}
            >
              <span>{tier.label}</span>
              <span className="ml-1.5 text-xs opacity-70">({tier.normPercentage}%)</span>
            </button>
          );
        })}
      </div>

      {/* Tier description */}
      <p className="text-center text-xs text-base-content/50 mb-6 -mt-4">
        {tierConfig.description}
      </p>

      {/* Main comparison grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Product A */}
        <div className={`rounded-xl border p-6 relative transition-all ${getScoreBg(scoresA.total)}`}>
          {winners.total === "A" && <WinnerBadge />}
          <div className="flex items-center gap-3 mb-4">
            <ProductLogo logoUrl={productA.logoUrl} name={productA.name} size="md" />
            <div>
              <h2 className="font-bold text-lg">{productA.name}</h2>
              <p className="text-sm text-base-content/60">{productA.type}</p>
            </div>
          </div>
          <div
            className={`text-5xl font-bold text-center mb-2 transition-colors ${getScoreColor(scoresA.total)}`}
          >
            {scoresA.total}
          </div>
          <div className="text-center text-sm text-base-content/60 mb-4">
            SAFE Score
            {activeTier !== "full" && (
              <span className="ml-1 text-xs opacity-70">({tierConfig.label})</span>
            )}
          </div>
          <Link href={`/products/${productA.slug}`} className="btn btn-sm btn-outline w-full">
            View Details
          </Link>
        </div>

        {/* VS */}
        <div className="flex items-center justify-center">
          <div className="text-4xl font-black text-base-content/20">VS</div>
        </div>

        {/* Product B */}
        <div className={`rounded-xl border p-6 relative transition-all ${getScoreBg(scoresB.total)}`}>
          {winners.total === "B" && <WinnerBadge />}
          <div className="flex items-center gap-3 mb-4">
            <ProductLogo logoUrl={productB.logoUrl} name={productB.name} size="md" />
            <div>
              <h2 className="font-bold text-lg">{productB.name}</h2>
              <p className="text-sm text-base-content/60">{productB.type}</p>
            </div>
          </div>
          <div
            className={`text-5xl font-bold text-center mb-2 transition-colors ${getScoreColor(scoresB.total)}`}
          >
            {scoresB.total}
          </div>
          <div className="text-center text-sm text-base-content/60 mb-4">
            SAFE Score
            {activeTier !== "full" && (
              <span className="ml-1 text-xs opacity-70">({tierConfig.label})</span>
            )}
          </div>
          <Link href={`/products/${productB.slug}`} className="btn btn-sm btn-outline w-full">
            View Details
          </Link>
        </div>
      </div>

      {/* Pillar breakdown */}
      <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-12">
        <h2 className="text-xl font-bold mb-6 text-center">Pillar-by-Pillar Comparison</h2>

        <div className="space-y-4">
          {pillars.map((pillar) => {
            const codeKey = pillar.code.toLowerCase();
            const scoreA = scoresA[codeKey];
            const scoreB = scoresB[codeKey];
            const winner = winners[codeKey];

            return (
              <div
                key={pillar.code}
                className="grid grid-cols-7 gap-4 items-center p-4 rounded-lg bg-base-300/50"
              >
                {/* Product A score */}
                <div className={`col-span-2 text-right ${winner === "A" ? "font-bold" : ""}`}>
                  <span className={`text-2xl transition-colors ${getScoreColor(scoreA)}`}>
                    {scoreA}
                  </span>
                  {winner === "A" && <span className="ml-2 text-green-400">&#10003;</span>}
                </div>

                {/* Progress bar A */}
                <div className="col-span-1">
                  <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${scoreA}%`,
                        backgroundColor: pillar.color,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Pillar name */}
                <div className="col-span-1 text-center">
                  <div className="text-2xl font-black" style={{ color: pillar.color }}>
                    {pillar.code}
                  </div>
                  <div className="text-xs text-base-content/60">{pillar.name}</div>
                </div>

                {/* Progress bar B */}
                <div className="col-span-1">
                  <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${scoreB}%`,
                        backgroundColor: pillar.color,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Product B score */}
                <div className={`col-span-2 text-left ${winner === "B" ? "font-bold" : ""}`}>
                  {winner === "B" && <span className="mr-2 text-green-400">&#10003;</span>}
                  <span className={`text-2xl transition-colors ${getScoreColor(scoreB)}`}>
                    {scoreB}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 rounded-lg bg-base-300 text-center">
          <p className="text-base-content/80">
            <strong>{productA.name}</strong> wins in{" "}
            <strong className="text-green-400">{pillarWins.A}</strong> pillars &bull;{" "}
            <strong>{productB.name}</strong> wins in{" "}
            <strong className="text-green-400">{pillarWins.B}</strong> pillars
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center mb-12">
        <h2 className="text-2xl font-bold mb-4">Verdict</h2>
        {winners.total === "tie" ? (
          <p className="text-lg text-base-content/80">
            Both products have the same{" "}
            {activeTier !== "full" ? `${tierConfig.label} ` : ""}SAFE Score. Check
            individual pillar scores to see which best fits your needs.
          </p>
        ) : (
          <p className="text-lg text-base-content/80">
            <strong className="text-primary">
              {winners.total === "A" ? productA.name : productB.name}
            </strong>{" "}
            has a higher{" "}
            {activeTier !== "full" ? `${tierConfig.label} ` : ""}security score with{" "}
            <strong
              className={getScoreColor(
                winners.total === "A" ? scoresA.total : scoresB.total
              )}
            >
              {winners.total === "A" ? scoresA.total : scoresB.total}/100
            </strong>{" "}
            compared to{" "}
            <strong
              className={getScoreColor(
                winners.total === "A" ? scoresB.total : scoresA.total
              )}
            >
              {winners.total === "A" ? scoresB.total : scoresA.total}/100
            </strong>
            .
          </p>
        )}
      </div>
    </>
  );
}
