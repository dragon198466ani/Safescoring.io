"use client";

import { useState, useMemo, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductLogo from "@/components/ProductLogo";
import { PILLARS } from "@/libs/design-tokens";
import { MiniScoreCircle as ScoreCircle } from "@/components/ScoreCircle";
import { formatDate } from "./constants";

// Memoized ProductCard component - Golden Ratio Design (phi = 1.618)
// Content/Scores: 61.8% | Image: 38.2%
// OPTIMIZED: Receives scoreType instead of scores object to avoid breaking memo
// ENHANCED: Supports drag-and-drop to add to stack
const ProductCard = memo(({ product, scoreType = "full", onAddToStack, isInStack = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  // Get scores based on scoreType - computed once per product/scoreType change
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
  // OPTIMIZED: Memoize image extraction
  const productImage = useMemo(() =>
    product.media?.find(m => m.type === 'image' || m.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i))?.url,
    [product.media]
  );

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

  // Quick add to stack
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
        className={`group flex flex-row rounded-xl bg-base-100 border transition-all duration-200 overflow-hidden ${
          isInStack
            ? "border-primary/50 bg-primary/5"
            : "border-base-300 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10"
        }`}
      >
      {/* Image Area - Left side (38.2% - Golden Ratio) */}
      <div className="relative bg-gradient-to-br from-base-200 to-base-300 overflow-hidden min-h-[160px]" style={{ flexBasis: '38.2%' }}>
        {productImage && (
          <Image
            src={productImage}
            alt={productName}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, (max-width: 1280px) 18vw, 180px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            quality={75}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBRIhMQYTQWH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECAAMRMf/aAAwDAQACEQMRAD8Aw/T7q7toVEMr4BAxtPHFFFFNAJVl0TArsf/Z"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        {/* Fallback placeholder */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          <div className="w-12 h-12 rounded-xl bg-base-100/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xl font-bold text-primary/60">
              {productName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        {/* Price Badge + Fees - Bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          {product.priceEur ? (
            <div className="bg-amber-500 text-white px-2 py-1 rounded-full shadow-lg inline-flex items-center gap-1">
              <span className="text-xs font-bold">
                {product.priceEur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} &euro;
              </span>
            </div>
          ) : (
            <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg inline-block">
              Free
            </div>
          )}
          {/* Fees / Gas details */}
          {product.priceDetails && (
            <div className="text-[8px] text-white/90 mt-1 line-clamp-2 drop-shadow-md">
              {product.priceDetails}
            </div>
          )}
        </div>
      </div>

      {/* Content/Scores - Right side (61.8% - Golden Ratio) */}
      <div className="flex flex-col p-3" style={{ flexBasis: '61.8%' }}>
        {/* Header: Logo + Name */}
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-base-200 shadow-sm bg-white">
              <ProductLogo
                logoUrl={product.logoUrl}
                fallbackUrl={product.fallbackUrl}
                name={productName}
                size="xs"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1 leading-tight">
              {productName}
            </h3>
            {/* Types inline - show all, full names */}
            <div className="flex flex-wrap gap-1 mt-1">
              {productTypes.length > 0 ? (
                productTypes.map((t, idx) => (
                  <span
                    key={t.code || idx}
                    className={`text-[8px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
                      idx === 0 ? 'bg-primary/10 text-primary' : 'bg-base-200 text-base-content/60'
                    }`}
                  >
                    {t.name}
                  </span>
                ))
              ) : (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/50">
                  {product.type || 'Product'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* HERO: Main Score - Circular Display */}
        <div className="flex items-center justify-center my-2 relative">
          <ScoreCircle score={totalScore} size={72} strokeWidth={6} />
          {/* Tier badge - show when not "full" */}
          {scoreType !== "full" && (
            <span className={`absolute -top-0.5 -right-0.5 text-[7px] font-bold px-1 py-0.5 rounded border ${
              scoreType === "essential"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}>
              {scoreType === "essential" ? "ESS" : "CON"}
            </span>
          )}
        </div>

        {/* SAFE Pillars - Compact Grid */}
        <div className="grid grid-cols-4 gap-1 mt-auto">
          {PILLARS.map((pillar) => {
            const scoreValue = scores?.[pillar.code.toLowerCase()];
            const hasScore = scoreValue != null;
            const displayScore = hasScore ? Math.round(scoreValue) : 0;
            return (
              <div key={pillar.code} className="flex flex-col items-center py-1.5 px-1 rounded-lg bg-base-200/50 dark:bg-base-300/30">
                <span className="text-[9px] font-bold" style={{ color: pillar.primary }}>
                  {pillar.code}
                </span>
                <span className={`text-xs font-bold tabular-nums ${hasScore ? 'text-amber-600 dark:text-amber-400' : 'text-base-content/30'}`}>
                  {hasScore ? displayScore : "-"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-base-200">
          <span className="text-[8px] text-base-content/40">{formatDate(product.lastUpdate)}</span>
          {product.verified && (
            <span className="inline-flex items-center gap-0.5 text-[8px] text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
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
          className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-primary/90 text-primary-content opacity-0 group-hover:opacity-100 hover:bg-primary hover:scale-110 transition-all duration-200 shadow-lg"
          title="Add to my stack"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}

      {/* In Stack Indicator */}
      {isInStack && (
        <div className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-primary text-primary-content shadow-lg">
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
