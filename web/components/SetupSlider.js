"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";
import { getScoreColor } from "@/components/ScoreCircle";

/**
 * SetupSlider - Horizontal scrolling carousel of user setups
 * Click on a setup to navigate to its detail page
 */

function SetupSliderCard({ setup, onClick }) {
  const { name, productDetails, combinedScore, created_at } = setup;
  const score = combinedScore?.note_finale;

  return (
    <button
      onClick={() => onClick(setup)}
      className="flex-shrink-0 w-72 bg-base-200 rounded-xl border border-base-300 overflow-hidden
                 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all
                 text-left group cursor-pointer"
    >
      {/* Header with score */}
      <div className="p-4 border-b border-base-300/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-xs text-base-content/50 mt-0.5">
              {productDetails?.length || 0} produits
            </p>
          </div>
          {score ? (
            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
          ) : (
            <div className="text-2xl font-bold text-base-content/30">—</div>
          )}
        </div>
      </div>

      {/* Products preview */}
      <div className="p-4">
        {productDetails && productDetails.length > 0 ? (
          <div className="flex -space-x-2">
            {productDetails.slice(0, 5).map((product, idx) => (
              <div
                key={product.id}
                className="w-8 h-8 rounded-full bg-base-300 border-2 border-base-200 overflow-hidden"
                style={{ zIndex: 5 - idx }}
              >
                <ProductLogo
                  logoUrl={product.slug ? `https://www.google.com/s2/favicons?domain=${product.slug}.com&sz=128` : null}
                  name={product.name}
                  size="sm"
                />
              </div>
            ))}
            {productDetails.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-base-300 border-2 border-base-200 flex items-center justify-center text-xs font-medium text-base-content/60">
                +{productDetails.length - 5}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-base-content/40">Aucun produit</div>
        )}

        {/* SAFE mini pillars */}
        {combinedScore && (
          <div className="flex gap-2 mt-3">
            {['S', 'A', 'F', 'E'].map((pillar) => {
              const pillarScore = combinedScore[`score_${pillar.toLowerCase()}`];
              return (
                <div key={pillar} className="flex-1 text-center">
                  <span className="text-[10px] text-base-content/40">{pillar}</span>
                  <div className={`text-xs font-semibold ${getScoreColor(pillarScore)}`}>
                    {pillarScore || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover indicator */}
      <div className="px-4 pb-3">
        <div className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Voir détails
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function EmptySetupCard({ onCreateNew }) {
  return (
    <button
      onClick={onCreateNew}
      className="flex-shrink-0 w-72 h-48 bg-base-200/50 rounded-xl border-2 border-dashed border-base-300
                 hover:border-primary/50 hover:bg-base-200 transition-all
                 flex flex-col items-center justify-center gap-3 cursor-pointer group"
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-medium text-sm">Créer un setup</p>
        <p className="text-xs text-base-content/50 mt-0.5">Combinez vos produits</p>
      </div>
    </button>
  );
}

export default function SetupSlider({ setups = [], onSelect, onCreateNew, loading = false }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [setups]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (loading) {
    return (
      <div className="relative">
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-72 h-48 bg-base-300/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group/slider">
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10
                     w-10 h-10 rounded-full bg-base-100 border border-base-300 shadow-lg
                     flex items-center justify-center
                     opacity-0 group-hover/slider:opacity-100 transition-opacity
                     hover:bg-base-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10
                     w-10 h-10 rounded-full bg-base-100 border border-base-300 shadow-lg
                     flex items-center justify-center
                     opacity-0 group-hover/slider:opacity-100 transition-opacity
                     hover:bg-base-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {setups.map(setup => (
          <div key={setup.id} className="snap-start">
            <SetupSliderCard setup={setup} onClick={onSelect} />
          </div>
        ))}
        <div className="snap-start">
          <EmptySetupCard onCreateNew={onCreateNew} />
        </div>
      </div>

      {/* Gradient fade edges */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-base-100 to-transparent pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-base-100 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
