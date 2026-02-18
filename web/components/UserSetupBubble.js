"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { getScoreColor } from "@/libs/design-tokens";

/**
 * UserSetupBubble - Floating bubble showing user's setup on Map 3D
 * 
 * Displays when user is viewing the globe/map, showing their current
 * crypto setup with quick stats and navigation.
 * 
 * Features:
 * - Minimizable/expandable
 * - Draggable position
 * - Touch-friendly
 * - Smooth animations
 * 
 * @example
 * <UserSetupBubble 
 *   setup={currentSetup}
 *   position="bottom-left"
 *   onExpand={() => navigate('/dashboard/setup')}
 * />
 */
const UserSetupBubble = memo(function UserSetupBubble({
  setup,
  position = "bottom-left",
  minimized: initialMinimized = false,
  onExpand,
  onMinimize,
  className = "",
}) {
  const [minimized, setMinimized] = useState(initialMinimized);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!setup) return null;

  const score = setup.combinedScore?.note_finale || 0;
  const scoreColor = getScoreColor(score);
  const productCount = setup.productDetails?.length || setup.products?.length || 0;

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  const handleToggle = () => {
    const newState = !minimized;
    setMinimized(newState);
    if (newState && onMinimize) onMinimize();
  };

  return (
    <div
      className={`
        fixed z-40
        ${positionClasses[position] || positionClasses["bottom-left"]}
        transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        ${className}
      `}
    >
      {minimized ? (
        // Minimized state - just a floating score badge
        <button
          onClick={handleToggle}
          className="
            group relative
            w-16 h-16 rounded-full
            bg-base-100/90 backdrop-blur-md
            border-2 border-base-content/10
            shadow-xl hover:shadow-2xl
            flex items-center justify-center
            transition-all duration-300
            hover:scale-110 active:scale-95
            touch-manipulation
          "
          aria-label="Expand setup bubble"
        >
          {/* Score circle */}
          <div
            className="text-2xl font-bold"
            style={{ color: scoreColor }}
          >
            {score}
          </div>
          
          {/* Pulse ring */}
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: scoreColor }}
          />
          
          {/* Expand indicator */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-primary-content">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </div>
        </button>
      ) : (
        // Expanded state - full bubble with details
        <div className="
          w-72 max-w-[calc(100vw-2rem)]
          bg-base-100/95 backdrop-blur-md
          rounded-2xl
          border border-base-content/10
          shadow-2xl
          overflow-hidden
          animate-in slide-in-from-bottom-4 fade-in duration-300
        ">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-base-content/10">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ 
                  backgroundColor: `${scoreColor}20`,
                  color: scoreColor,
                }}
              >
                {score}
              </div>
              <div>
                <h4 className="font-semibold text-sm truncate max-w-[140px]">
                  {setup.name || "My Setup"}
                </h4>
                <p className="text-xs text-base-content/60">
                  {productCount} product{productCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleToggle}
              className="p-2 hover:bg-base-200 rounded-lg transition-colors touch-manipulation"
              aria-label="Minimize"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
              </svg>
            </button>
          </div>

          {/* Products preview */}
          <div className="p-3 space-y-2">
            {setup.productDetails?.slice(0, 3).map((product, i) => (
              <div
                key={product.id || i}
                className="flex items-center gap-2 p-2 bg-base-200/50 rounded-lg"
              >
                {product.logo_url ? (
                  <img
                    src={product.logo_url}
                    alt=""
                    className="w-6 h-6 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-base-300 flex items-center justify-center text-xs">
                    {product.name?.[0] || "?"}
                  </div>
                )}
                <span className="text-sm truncate flex-1">{product.name}</span>
                {product.safe_score && (
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${getScoreColor(product.safe_score)}20`,
                      color: getScoreColor(product.safe_score),
                    }}
                  >
                    {product.safe_score}
                  </span>
                )}
              </div>
            ))}
            
            {productCount > 3 && (
              <p className="text-xs text-center text-base-content/50">
                +{productCount - 3} more
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 pt-0 flex gap-2">
            <Link
              href={`/dashboard/setup/${setup.id || ""}`}
              className="
                flex-1 btn btn-sm btn-primary
                touch-manipulation
              "
              onClick={onExpand}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View Details
            </Link>
            <Link
              href="/dashboard/setup/new"
              className="
                btn btn-sm btn-ghost
                touch-manipulation
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Link>
          </div>

          {/* Score breakdown mini */}
          {setup.combinedScore && (
            <div className="px-3 pb-3">
              <div className="flex gap-1">
                {["S", "A", "F", "E"].map((pillar) => {
                  const pillarScore = setup.combinedScore[`${pillar.toLowerCase()}_score`] || 0;
                  return (
                    <div
                      key={pillar}
                      className="flex-1 h-1.5 rounded-full bg-base-300 overflow-hidden"
                      title={`${pillar}: ${pillarScore}`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pillarScore}%`,
                          backgroundColor: getScoreColor(pillarScore),
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-base-content/40">
                <span>S</span>
                <span>A</span>
                <span>F</span>
                <span>E</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default UserSetupBubble;

/**
 * SetupQuickStats - Compact stats display for setup
 */
export function SetupQuickStats({ setup, className = "" }) {
  if (!setup) return null;

  const score = setup.combinedScore?.note_finale || 0;
  const productCount = setup.productDetails?.length || 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="px-3 py-1.5 rounded-full text-sm font-bold"
        style={{
          backgroundColor: `${getScoreColor(score)}20`,
          color: getScoreColor(score),
        }}
      >
        Score: {score}
      </div>
      <div className="text-sm text-base-content/60">
        {productCount} product{productCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
