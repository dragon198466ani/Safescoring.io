"use client";

import { useMemo } from "react";

// Couleurs des piliers SAFE
const PILLAR_COLORS = {
  S: { bg: "bg-emerald-500/15", text: "text-emerald-400", accent: "bg-emerald-500", label: "Security", icon: "S" },
  A: { bg: "bg-amber-500/15", text: "text-amber-400", accent: "bg-amber-500", label: "Adversity", icon: "A" },
  F: { bg: "bg-violet-500/15", text: "text-violet-400", accent: "bg-violet-500", label: "Fidelity", icon: "F" },
  E: { bg: "bg-sky-500/15", text: "text-sky-400", accent: "bg-sky-500", label: "Ecosystem", icon: "E" },
};

/**
 * SwipeCard - Carte d'évaluation swipeable
 * Design: question claire en hero, contexte produit/norme lisible, feedback visuel
 */
export default function SwipeCard({
  evaluation,
  isTop = false,
  stackPosition = 0,
  gesture = { isDragging: false, deltaX: 0, progress: 0, direction: null },
  flyingOut = false,
  flyDirection = null,
  blindMode = true,
}) {
  const pillar = evaluation?.pillar || "S";
  const pillarStyle = PILLAR_COLORS[pillar] || PILLAR_COLORS.S;

  // Calcul du style de la carte basé sur le geste
  const cardStyle = useMemo(() => {
    if (flyingOut) {
      return {
        "--swipe-x": `${gesture.deltaX}px`,
        "--swipe-rotate": `${(gesture.deltaX / 100) * 15}deg`,
      };
    }
    if (!isTop || !gesture.isDragging) {
      return {
        transform: `scale(${1 - stackPosition * 0.05}) translateY(${stackPosition * 12}px)`,
        zIndex: 10 - stackPosition,
        opacity: stackPosition === 0 ? 1 : 0.7 - stackPosition * 0.2,
      };
    }
    const rotation = (gesture.deltaX / 100) * 15;
    return {
      transform: `translateX(${gesture.deltaX}px) rotate(${rotation}deg)`,
      transition: "none",
      zIndex: 20,
    };
  }, [isTop, stackPosition, gesture, flyingOut]);

  // Opacité des overlays basée sur la progression
  const overlayOpacity = useMemo(() => {
    if (!isTop || !gesture.isDragging) return { green: 0, red: 0 };
    return {
      green: gesture.direction === "right" ? Math.min(gesture.progress * 0.6, 0.5) : 0,
      red: gesture.direction === "left" ? Math.min(gesture.progress * 0.6, 0.5) : 0,
    };
  }, [isTop, gesture]);

  const showStamp = isTop && gesture.progress > 0.3 && gesture.direction;

  // Total votes and progress toward consensus (3 unanimous or 5 majority)
  const totalVotes = (evaluation?.votes_agree || 0) + (evaluation?.votes_disagree || 0);
  const maxVotes = 5;

  return (
    <div
      className={`
        absolute inset-0
        rounded-2xl bg-base-200 overflow-hidden
        shadow-xl
        touch-manipulation select-none
        ${isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}
        ${flyingOut ? (flyDirection === "right" ? "animate-swipe-right" : "animate-swipe-left") : ""}
      `}
      style={cardStyle}
    >
      {/* Overlay vert (OUI) */}
      <div
        className="absolute inset-0 bg-green-500 pointer-events-none transition-opacity duration-100 z-[1]"
        style={{ opacity: overlayOpacity.green }}
      />

      {/* Overlay rouge (NON) */}
      <div
        className="absolute inset-0 bg-red-500 pointer-events-none transition-opacity duration-100 z-[1]"
        style={{ opacity: overlayOpacity.red }}
      />

      {/* Stamp OUI */}
      {showStamp && gesture.direction === "right" && (
        <div className="absolute top-8 left-5 animate-stamp z-10">
          <span className="text-3xl sm:text-4xl font-black text-green-500 border-4 border-green-500 px-4 py-1.5 rounded-xl -rotate-12 bg-green-500/10 backdrop-blur-sm">
            OUI
          </span>
        </div>
      )}

      {/* Stamp NON */}
      {showStamp && gesture.direction === "left" && (
        <div className="absolute top-8 right-5 animate-stamp z-10">
          <span className="text-3xl sm:text-4xl font-black text-red-500 border-4 border-red-500 px-4 py-1.5 rounded-xl rotate-12 bg-red-500/10 backdrop-blur-sm">
            NON
          </span>
        </div>
      )}

      {/* ===== CARD CONTENT ===== */}
      <div className="relative h-full flex flex-col z-[2]">

        {/* ── Top bar: pillar accent stripe ── */}
        <div className={`h-1.5 w-full ${pillarStyle.accent}`} />

        {/* ── Header: product + pillar + token hint ── */}
        <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 pt-3 sm:pt-4 pb-2">
          {/* Pillar icon */}
          <div className={`w-9 h-9 rounded-lg ${pillarStyle.bg} flex items-center justify-center shrink-0`}>
            <span className={`text-sm font-black ${pillarStyle.text}`}>{pillarStyle.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-tight truncate">
              {evaluation?.product_name || "Product"}
            </h3>
            <p className={`text-xs font-medium ${pillarStyle.text}`}>
              {pillarStyle.label}
            </p>
          </div>
          {/* Token reward hint */}
          <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10">
            <span className="text-xs">+1</span>
            <span className="text-xs font-bold text-primary">$SAFE</span>
          </div>
        </div>

        {/* ── Norm context ── */}
        <div className="px-5 pb-3">
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5 text-base-content/30 text-xs font-mono">{evaluation?.norm_code}</span>
          </div>
          <p className="text-sm text-base-content/70 leading-snug line-clamp-2 mt-1">
            {evaluation?.norm_title || "Security standard"}
          </p>
        </div>

        {/* ── HERO: The question ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
          {blindMode ? (
            <>
              <p className="text-base-content/50 text-sm mb-3 font-medium uppercase tracking-wide">
                Your opinion
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold leading-tight text-base-content max-w-[280px]">
                Does <span className={pillarStyle.text}>{evaluation?.product_name}</span> meet this standard?
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-base-300/60 rounded-full">
                <svg className="w-3.5 h-3.5 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
                <span className="text-xs text-base-content/40">AI result revealed after vote</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-base-content/50 text-xs mb-2 font-medium uppercase tracking-wide">
                AI Evaluation
              </p>
              <div className={`text-3xl font-black mb-1 ${
                evaluation?.ai_result === "YES" ? "text-green-400" :
                evaluation?.ai_result === "NO" ? "text-red-400" : "text-amber-400"
              }`}>
                {evaluation?.ai_result === "YES" ? "YES" :
                 evaluation?.ai_result === "NO" ? "NO" : "PARTIAL"}
              </div>
              {evaluation?.ai_confidence && (
                <p className="text-xs text-base-content/40 mb-2">
                  Confidence: {Math.round(evaluation.ai_confidence * 100)}%
                </p>
              )}
              {evaluation?.ai_justification && (
                <p className="text-sm text-base-content/60 line-clamp-3 max-w-[280px]">
                  {evaluation.ai_justification}
                </p>
              )}
              <p className="text-lg font-bold mt-3 text-base-content">
                Do you agree?
              </p>
            </>
          )}
        </div>

        {/* ── Bottom: vote progress + swipe hints ── */}
        <div className="px-5 pb-4 pt-2">
          {/* Vote progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {Array.from({ length: maxVotes }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < totalVotes
                    ? "bg-primary"
                    : "bg-base-content/15"
                }`}
              />
            ))}
            <span className="text-xs text-base-content/50 ml-1.5">
              {totalVotes}/{maxVotes}
            </span>
          </div>

          {/* Swipe direction hints */}
          {isTop && !gesture.isDragging && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-red-400/70">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span className="text-xs font-semibold">NO</span>
              </div>
              <span className="text-xs text-base-content/50 font-medium">Swipe or tap</span>
              <div className="flex items-center gap-1.5 text-green-400/70">
                <span className="text-xs font-semibold">YES</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
