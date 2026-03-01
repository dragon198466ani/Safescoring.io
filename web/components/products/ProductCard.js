"use client";

import { useState, useMemo, memo } from "react";
import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";
import { PILLARS } from "@/libs/design-tokens";
import { MiniScoreCircle as ScoreCircle } from "@/components/ScoreCircle";
import { formatDate } from "./constants";

// Memoized ProductCard — Vertical minimal design
// Clean layout: Header → Score → Pillar bars → Footer
const ProductCard = memo(({ product, scoreType = "full", onAddToStack, isInStack = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const scores = useMemo(() => {
    switch (scoreType) {
      case "consumer": return product.consumerScores;
      case "essential": return product.essentialScores;
      default: return product.scores;
    }
  }, [product.consumerScores, product.essentialScores, product.scores, scoreType]);

  const totalScore = scores?.total ?? 0;
  const productTypes = product.types?.slice(0, 2) || [];
  const productName = product.name || "Unknown Product";

  // Drag handlers
  const handleDragStart = (e) => {
    setIsDragging(true);
    const dragData = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      logoUrl: product.logoUrl,
      scores: product.scores,
      types: product.types,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToStack && !isInStack) {
      onAddToStack(product);
    }
  };

  return (
    <div
      draggable={!isInStack}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`relative group ${isDragging ? "opacity-50 scale-95" : ""} ${!isInStack ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <Link
        href={`/products/${product.slug || product.id}`}
        className={`block rounded-xl bg-base-100 border p-3 sm:p-4 transition-all duration-200 ${
          isInStack
            ? "border-white/30 bg-white/5"
            : "border-base-300 hover:border-base-content/20 hover:shadow-lg"
        }`}
      >
        {/* Header: Logo + Name + Types */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex-shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-base-200 bg-white">
              <ProductLogo
                logoUrl={product.logoUrl}
                fallbackUrl={product.fallbackUrl}
                name={productName}
                size="xs"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-base-content group-hover:text-white transition-colors line-clamp-1">
              {productName}
            </h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {productTypes.length > 0 ? (
                productTypes.map((t, idx) => (
                  <span
                    key={t.code || idx}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/60 font-medium"
                  >
                    {t.name}
                  </span>
                ))
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/50">
                  {product.type || "Product"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score circle — centered */}
        <div className="flex items-center justify-center mb-3 sm:mb-4 relative">
          <ScoreCircle score={totalScore} size={72} strokeWidth={6} />
          {scoreType !== "full" && (
            <span className={`absolute -top-1 right-1/4 text-[8px] font-bold px-1.5 py-0.5 rounded border ${
              scoreType === "essential"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}>
              {scoreType === "essential" ? "ESS" : "CON"}
            </span>
          )}
        </div>

        {/* SAFE Pillar bars — horizontal fill bars */}
        <div className="space-y-1.5 mb-3">
          {PILLARS.map((pillar) => {
            const scoreValue = scores?.[pillar.code.toLowerCase()];
            const hasScore = scoreValue != null;
            const displayScore = hasScore ? Math.round(scoreValue) : 0;
            return (
              <div key={pillar.code} className="flex items-center gap-2">
                <span className="text-[10px] font-bold w-3" style={{ color: pillar.primary }}>
                  {pillar.code}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-base-300 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: hasScore ? `${displayScore}%` : "0%",
                      backgroundColor: pillar.primary,
                    }}
                  />
                </div>
                <span className={`text-[10px] font-semibold tabular-nums w-5 text-right ${
                  hasScore ? "text-base-content/70" : "text-base-content/30"
                }`}>
                  {hasScore ? displayScore : "-"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-base-200">
          <span className="text-[9px] text-base-content/40">{formatDate(product.lastUpdate)}</span>
          <div className="flex items-center gap-2">
            {product.priceEur ? (
              <span className="text-[9px] text-base-content/50 font-medium">
                {product.priceEur.toLocaleString("en-US", { maximumFractionDigits: 0 })} &euro;
              </span>
            ) : (
              <span className="text-[9px] text-base-content/50 font-medium">Free</span>
            )}
            {product.verified && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Quick Add to Stack Button */}
      {onAddToStack && !isInStack && (
        <button
          onClick={handleQuickAdd}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white text-black opacity-0 group-hover:opacity-100 hover:scale-110 transition-all duration-200 shadow-lg"
          title="Add to my stack"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}

      {/* In Stack Indicator */}
      {isInStack && (
        <div className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white text-black shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      )}
    </div>
  );
});
ProductCard.displayName = "ProductCard";

export default ProductCard;
