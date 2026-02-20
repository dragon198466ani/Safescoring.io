"use client";

/**
 * SAFEProtectionGuide - How to protect yourself with this product
 *
 * Displays the `how_to_protect` JSONB data from product_pillar_analyses.
 * Shows step-by-step protection measures and emergency procedures.
 *
 * Data source: /api/products/[slug]/strategic-analyses → how_to_protect field
 *
 * Renders nothing if no how_to_protect data exists (graceful fallback).
 */

import { useState, useEffect } from "react";
import { PILLAR_COLORS } from "@/libs/design-tokens";

const RISK_COLORS = {
  low: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", icon: "text-green-400" },
  medium: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: "text-amber-400" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", icon: "text-orange-400" },
  critical: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: "text-red-400" },
};

function ProtectionCard({ pillar, howToProtect }) {
  const colors = PILLAR_COLORS[pillar];
  if (!howToProtect || !colors) return null;

  const { title, intro, steps, emergency, risk_level } = howToProtect;
  const riskColors = RISK_COLORS[risk_level] || RISK_COLORS.medium;

  // Need at least a title or steps to render
  if (!title && (!steps || steps.length === 0)) return null;

  return (
    <div className={`rounded-xl border ${colors.border} bg-base-200/50 overflow-hidden`}>
      {/* Header with pillar badge */}
      <div className={`flex items-center gap-3 p-4 ${colors.bg}`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-base-100/50`}>
          <span className={`text-sm font-black ${colors.text}`}>{pillar}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-base-content">{title || `${colors.name} Protection`}</h3>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Intro text */}
        {intro && (
          <p className="text-sm text-base-content/70 leading-relaxed pt-3">{intro}</p>
        )}

        {/* Steps */}
        {steps && steps.length > 0 && (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${colors.bg} shrink-0 mt-0.5`}>
                  <span className={`text-xs font-bold ${colors.text}`}>{i + 1}</span>
                </div>
                <p className="text-sm text-base-content/80 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        )}

        {/* Emergency Section */}
        {emergency && (
          <div className={`rounded-lg ${riskColors.bg} ${riskColors.border} border p-3 mt-2`}>
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${riskColors.icon}`}>
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className={`text-xs font-semibold ${riskColors.text} uppercase tracking-wider`}>Emergency</span>
            </div>
            <p className="text-sm text-base-content/70 leading-relaxed">{emergency}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SAFEProtectionGuide({ productSlug }) {
  const [protectionData, setProtectionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productSlug) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productSlug}/strategic-analyses`);
        if (res.ok) {
          const data = await res.json();
          setProtectionData(data);
        }
      } catch (err) {
        console.error("[SAFEProtectionGuide] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productSlug]);

  if (loading) return null; // Silent loading - no skeleton

  // Check if any pillar has how_to_protect data
  const pillarsWithProtection = ["S", "A", "F", "E"].filter(
    (p) => protectionData?.[p]?.how_to_protect && (
      protectionData[p].how_to_protect.title ||
      (protectionData[p].how_to_protect.steps && protectionData[p].how_to_protect.steps.length > 0)
    )
  );

  if (pillarsWithProtection.length === 0) {
    return null; // Don't render if no protection data
  }

  return (
    <div className="mb-12">
      {/* Section Title */}
      <div className="flex items-center gap-3 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-emerald-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
        <h2 className="text-xl font-bold text-base-content">Protection Guide</h2>
      </div>

      {/* Protection cards grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {pillarsWithProtection.map((pillar) => (
          <ProtectionCard
            key={pillar}
            pillar={pillar}
            howToProtect={protectionData[pillar].how_to_protect}
          />
        ))}
      </div>
    </div>
  );
}
