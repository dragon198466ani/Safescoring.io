"use client";

import { useMemo } from "react";

// Couleurs des piliers SAFE
const PILLAR_COLORS = {
  S: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", label: "Security" },
  A: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", label: "Adversity" },
  F: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", label: "Fidelity" },
  E: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", label: "Ecosystem" },
};

// Mapping résultat -> affichage
const RESULT_DISPLAY = {
  YES: { label: "Conforme", color: "text-green-400", icon: "✓" },
  NO: { label: "Non conforme", color: "text-red-400", icon: "✗" },
  PARTIAL: { label: "Partiel", color: "text-amber-400", icon: "~" },
  "N/A": { label: "N/A", color: "text-base-content/50", icon: "-" },
  TBD: { label: "À évaluer", color: "text-base-content/50", icon: "?" },
};

/**
 * SwipeCard - Carte d'évaluation swipeable
 *
 * @param {Object} evaluation - Données de l'évaluation
 * @param {boolean} isTop - Est-ce la carte du dessus (interactive)
 * @param {number} stackPosition - Position dans la pile (0=top)
 * @param {Object} gesture - État du geste de swipe
 * @param {boolean} flyingOut - Animation de sortie en cours
 * @param {string} flyDirection - Direction de sortie (left/right)
 * @param {boolean} blindMode - Mode aveugle: cacher l'évaluation IA avant le vote
 */
export default function SwipeCard({
  evaluation,
  isTop = false,
  stackPosition = 0,
  gesture = { isDragging: false, deltaX: 0, progress: 0, direction: null },
  flyingOut = false,
  flyDirection = null,
  blindMode = true, // Par défaut: mode aveugle activé
}) {
  const pillar = evaluation?.pillar || "S";
  const pillarStyle = PILLAR_COLORS[pillar] || PILLAR_COLORS.S;
  const result = RESULT_DISPLAY[evaluation?.ai_result] || RESULT_DISPLAY.TBD;

  // Calcul du style de la carte basé sur le geste
  const cardStyle = useMemo(() => {
    // Animation de sortie
    if (flyingOut) {
      return {
        "--swipe-x": `${gesture.deltaX}px`,
        "--swipe-rotate": `${(gesture.deltaX / 100) * 15}deg`,
      };
    }

    // Carte non-interactive (empilée derrière)
    if (!isTop || !gesture.isDragging) {
      return {
        transform: `scale(${1 - stackPosition * 0.05}) translateY(${stackPosition * 12}px)`,
        zIndex: 10 - stackPosition,
        opacity: stackPosition === 0 ? 1 : 0.7 - stackPosition * 0.2,
      };
    }

    // Carte en cours de drag
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

  // Affichage du stamp
  const showStamp = isTop && gesture.progress > 0.3 && gesture.direction;

  return (
    <div
      className={`
        absolute inset-0
        rounded-2xl bg-base-200 border border-base-300
        shadow-xl overflow-hidden
        touch-manipulation select-none
        ${isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}
        ${flyingOut ? (flyDirection === "right" ? "animate-swipe-right" : "animate-swipe-left") : ""}
      `}
      style={cardStyle}
    >
      {/* Overlay vert (OUI - user thinks YES) */}
      <div
        className="absolute inset-0 bg-green-500 pointer-events-none transition-opacity duration-100"
        style={{ opacity: overlayOpacity.green }}
      />

      {/* Overlay rouge (NON - user thinks NO) */}
      <div
        className="absolute inset-0 bg-red-500 pointer-events-none transition-opacity duration-100"
        style={{ opacity: overlayOpacity.red }}
      />

      {/* Stamp OUI - User agrees the product complies */}
      {showStamp && gesture.direction === "right" && (
        <div className="absolute top-6 left-6 animate-stamp z-10">
          <span className="text-3xl sm:text-4xl font-black text-green-500 border-4 border-green-500 px-3 py-1 rounded-lg -rotate-12 bg-green-500/10">
            OUI
          </span>
        </div>
      )}

      {/* Stamp NON - User disagrees, product doesn't comply */}
      {showStamp && gesture.direction === "left" && (
        <div className="absolute top-6 right-6 animate-stamp z-10">
          <span className="text-3xl sm:text-4xl font-black text-red-500 border-4 border-red-500 px-3 py-1 rounded-lg rotate-12 bg-red-500/10">
            NON
          </span>
        </div>
      )}

      {/* Contenu de la carte */}
      <div className="relative h-full flex flex-col p-4 sm:p-6">
        {/* Header: Produit + Pilier */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{evaluation?.product_name || "Produit"}</h3>
            <p className="text-sm text-base-content/60 truncate">{evaluation?.norm_code}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${pillarStyle.bg} ${pillarStyle.text}`}>
            {pillarStyle.label}
          </span>
        </div>

        {/* Norme title */}
        <div className="mb-4">
          <p className="text-sm text-base-content/80 line-clamp-2">{evaluation?.norm_title || "Norme de sécurité"}</p>
        </div>

        {/* Résultat IA - Mode aveugle ou visible */}
        <div className={`flex-1 bg-base-300/50 rounded-xl p-4 ${pillarStyle.border} border`}>
          {blindMode ? (
            // MODE AVEUGLE: L'utilisateur vote sans voir ce que l'IA a décidé
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">🤔</div>
              <p className="text-base font-medium text-base-content/80 mb-2">
                Votre avis compte !
              </p>
              <p className="text-sm text-base-content/60">
                Selon vous, <span className="font-medium">{evaluation?.product_name}</span> respecte-t-il cette norme ?
              </p>
              <div className="mt-4 px-3 py-1.5 bg-primary/10 rounded-lg">
                <p className="text-xs text-primary">
                  L'évaluation IA sera révélée après votre vote
                </p>
              </div>
            </div>
          ) : (
            // MODE VISIBLE: Affiche l'évaluation IA (après vote ou mode désactivé)
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-base-content/50 uppercase tracking-wide">Évaluation IA</span>
                {evaluation?.ai_confidence && (
                  <span className="text-xs text-base-content/40">({Math.round(evaluation.ai_confidence * 100)}%)</span>
                )}
              </div>

              <div className={`text-2xl font-bold mb-2 ${result.color}`}>
                <span className="mr-2">{result.icon}</span>
                {result.label}
              </div>

              {evaluation?.ai_justification && (
                <p className="text-sm text-base-content/70 line-clamp-4">{evaluation.ai_justification}</p>
              )}
            </>
          )}
        </div>

        {/* Footer: Stats votes */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-green-400">
              <span className="font-medium">{evaluation?.votes_agree || 0}</span> OUI
            </span>
            <span className="text-red-400">
              <span className="font-medium">{evaluation?.votes_disagree || 0}</span> NON
            </span>
          </div>
          {evaluation?.community_consensus && (
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                evaluation.community_consensus.includes("confirmed")
                  ? "bg-green-500/20 text-green-400"
                  : evaluation.community_consensus.includes("challenged")
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-base-300 text-base-content/60"
              }`}
            >
              {evaluation.community_consensus === "confirmed"
                ? "✓ IA confirmée"
                : evaluation.community_consensus === "challenged"
                  ? "⚠ IA contestée"
                  : "En cours"}
            </span>
          )}
        </div>

        {/* Instructions swipe - VOTRE AVIS */}
        {isTop && !gesture.isDragging && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-xs text-base-content/60 mb-1">Selon vous, ce produit respecte cette norme ?</p>
            <p className="text-xs text-base-content/40">
              <span className="text-red-400">← NON</span>
              <span className="mx-3">|</span>
              <span className="text-green-400">OUI →</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
