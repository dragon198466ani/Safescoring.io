"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * AutonomousChat - Chatbot IA autonome avec function calling
 *
 * RÈGLE #1: Toujours afficher les scores SAFE
 * RÈGLE #2: Proposer d'ajouter au setup
 * RÈGLE #3: Upsell vers rapports payants
 */

// Score color helper
const getScoreColor = (score) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
};

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/10 border-green-500/30";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/30";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
};

// =============================================================================
// ACTION CARDS - UI components for different actions
// =============================================================================

// Pillar progress bar component
function PillarBar({ pillar, data }) {
  const colorClasses = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  const bgClasses = {
    green: "bg-green-500/20",
    amber: "bg-amber-500/20",
    orange: "bg-orange-500/20",
    red: "bg-red-500/20",
  };

  return (
    <div className="bg-base-100/60 rounded-lg p-2.5 space-y-1.5">
      {/* Header with emoji, name and score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{data.emoji}</span>
          <span className="text-xs font-semibold">{data.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-sm font-black ${getScoreColor(data.value)}`}>{data.value}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${bgClasses[data.statusColor]} ${getScoreColor(data.value)}`}>
            {data.status}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[data.statusColor]} transition-all duration-500`}
          style={{ width: `${data.value}%` }}
        />
      </div>

      {/* Stats showing depth */}
      <div className="flex items-center justify-between text-[9px] opacity-50">
        <span>{data.stats?.total || 0} normes vérifiées</span>
        <span>{data.stats?.passed || 0}✓ {data.stats?.failed || 0}✗</span>
      </div>

      {/* FREE insight */}
      {data.freeInsight && (
        <div className={`text-[10px] rounded px-2 py-1 ${
          data.freeInsight.type === "warning"
            ? "bg-error/10 text-error"
            : "bg-success/10 text-success"
        }`}>
          <span className="font-mono mr-1">{data.freeInsight.code}</span>
          <span className="opacity-80">{data.freeInsight.text}</span>
        </div>
      )}

      {/* Locked teaser */}
      {data.lockedInsights > 0 && (
        <div className="text-[9px] text-primary/70 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          +{data.lockedInsights} insights dans le rapport complet
        </div>
      )}
    </div>
  );
}

function ScoreCard({ data, onAddToSetup }) {
  if (!data || data.error) return null;

  const hasPillars = data.pillars && Object.keys(data.pillars).length === 4;

  return (
    <div className={`rounded-xl border p-4 mt-3 ${getScoreBg(data.score_safe)}`}>
      {/* Header with score */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-lg">{data.name}</h4>
          <p className="text-xs opacity-70">{data.type}</p>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-black ${getScoreColor(data.score_safe)}`}>
            {data.score_safe}
          </div>
          <div className="text-[10px] opacity-50">Score SAFE / 100</div>
        </div>
      </div>

      {/* 4 Pillars showcase */}
      {hasPillars ? (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold">Méthodologie SAFE</span>
            <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">4 piliers × 25%</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.pillars).map(([key, pillar]) => (
              <PillarBar key={key} pillar={key} data={pillar} />
            ))}
          </div>
        </div>
      ) : (
        /* Legacy pillar display */
        <div className="grid grid-cols-4 gap-2 mb-3">
          {Object.entries(data.scores || {}).map(([key, val]) => (
            <div key={key} className="text-center p-2 bg-base-100/50 rounded-lg">
              <div className={`text-lg font-bold ${getScoreColor(val.value || val)}`}>
                {val.value || val}
              </div>
              <div className="text-[10px] opacity-60 font-medium">{key}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stats bar */}
      {data.stats && (
        <div className="flex items-center justify-between bg-base-100/40 rounded-lg px-3 py-2 mb-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="opacity-60">{data.stats.norms_checked} critères analysés</span>
            <span className="text-success">{data.stats.passed} ✓</span>
            <span className="text-error">{data.stats.failed} ✗</span>
          </div>
        </div>
      )}

      {/* Critical failures teaser */}
      {data.critical_count > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-error">
              {data.critical_count} faille{data.critical_count > 1 ? "s" : ""} critique{data.critical_count > 1 ? "s" : ""}
            </span>
            {data.teaser?.locked_details > 0 && (
              <span className="text-[9px] bg-error/20 text-error px-2 py-0.5 rounded-full flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                +{data.teaser.locked_details} dans le rapport
              </span>
            )}
          </div>
          <div className="space-y-1">
            {data.critical_failures?.slice(0, 2).map((f, i) => (
              <div key={i} className="text-xs bg-error/10 rounded px-2 py-1.5 border-l-2 border-error">
                <span className="font-mono text-error">{f.code}</span>
                <span className="opacity-70 ml-1">{f.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upsell teaser */}
      {data.teaser?.upsell_urgency && (
        <div className={`rounded-lg p-3 mb-3 ${
          data.teaser.upsell_urgency === "critical" ? "bg-error/10 border border-error/30" :
          data.teaser.upsell_urgency === "high" ? "bg-warning/10 border border-warning/30" :
          "bg-primary/10 border border-primary/30"
        }`}>
          <div className="flex items-start gap-2">
            <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              data.teaser.upsell_urgency === "critical" ? "text-error" :
              data.teaser.upsell_urgency === "high" ? "text-warning" : "text-primary"
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium">{data.teaser.upsell_reason}</p>
              <p className="text-[10px] opacity-60 mt-1">
                Obtenez le rapport complet pour découvrir tous les détails et un plan d'action personnalisé.
              </p>
              <ul className="mt-2 space-y-1">
                {data.teaser.premium_features?.slice(0, 2).map((f, i) => (
                  <li key={i} className="text-[10px] flex items-center gap-1 opacity-70">
                    <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary btn-xs mt-2">
                Rapport complet - 9,99€
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onAddToSetup?.(data)}
          className="btn btn-primary btn-sm flex-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter au setup
        </button>
        <a href={`/products/${data.slug}`} className="btn btn-ghost btn-sm">
          Voir fiche
        </a>
      </div>
    </div>
  );
}

function ComparisonCard({ data }) {
  if (!data?.products) return null;

  return (
    <div className="rounded-xl border border-base-300 p-4 mt-3 bg-base-200/50">
      <h4 className="font-bold mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Comparaison
      </h4>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Produit</th>
              <th className="text-center">SAFE</th>
              <th className="text-center">S</th>
              <th className="text-center">A</th>
              <th className="text-center">F</th>
              <th className="text-center">E</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((p, i) => (
              <tr key={i} className={p.name === data.winner ? "bg-success/10" : ""}>
                <td className="font-medium">
                  {p.name}
                  {p.name === data.winner && (
                    <span className="badge badge-success badge-xs ml-1">Best</span>
                  )}
                </td>
                <td className={`text-center font-bold ${getScoreColor(p.score_safe)}`}>
                  {p.score_safe}
                </td>
                <td className="text-center text-sm">{p.scores?.S?.value || p.scores?.S}</td>
                <td className="text-center text-sm">{p.scores?.A?.value || p.scores?.A}</td>
                <td className="text-center text-sm">{p.scores?.F?.value || p.scores?.F}</td>
                <td className="text-center text-sm">{p.scores?.E?.value || p.scores?.E}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.comparison && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-base-100/50 rounded p-2">
            <span className="opacity-50">Meilleure sécurité:</span>
            <span className="font-medium ml-1">{data.comparison.best_security}</span>
          </div>
          <div className="bg-base-100/50 rounded p-2">
            <span className="opacity-50">Meilleure résilience:</span>
            <span className="font-medium ml-1">{data.comparison.best_adversity}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function RankingCard({ data, onAddToSetup }) {
  if (!data?.ranking) return null;

  return (
    <div className="rounded-xl border border-base-300 p-4 mt-3 bg-base-200/50">
      <h4 className="font-bold mb-3">
        Top {data.type_name || data.type}
      </h4>

      <div className="space-y-2">
        {data.ranking.map((p) => (
          <div
            key={p.slug}
            className="flex items-center gap-3 p-2 rounded-lg bg-base-100/50 hover:bg-base-100 transition-all cursor-pointer"
            onClick={() => onAddToSetup?.(p)}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              p.rank === 1 ? "bg-amber-500 text-black" :
              p.rank === 2 ? "bg-gray-300 text-black" :
              p.rank === 3 ? "bg-amber-700 text-white" :
              "bg-base-300"
            }`}>
              {p.rank}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{p.name}</p>
            </div>
            <div className={`text-lg font-bold ${getScoreColor(p.score_safe)}`}>
              {p.score_safe}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetupAnalysisCard({ data, onAddToSetup }) {
  if (!data || data.error) return null;

  return (
    <div className={`rounded-xl border p-4 mt-3 ${getScoreBg(data.setup_score)}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-lg">Analyse de votre Setup</h4>
          <p className="text-xs opacity-70">{data.products?.length} produits analysés</p>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-black ${getScoreColor(data.setup_score)}`}>
            {data.setup_score}
          </div>
          <div className="text-xs opacity-50">Score global</div>
        </div>
      </div>

      {/* Pillar radar */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(data.pillar_scores || {}).map(([key, val]) => (
          <div key={key} className="text-center">
            <div className={`text-xl font-bold ${getScoreColor(val)}`}>{val}</div>
            <div className="text-[10px] opacity-60">{key}</div>
          </div>
        ))}
      </div>

      {/* Weakest points */}
      {data.weakest_product && (
        <div className="bg-warning/10 rounded-lg p-2 mb-3 text-sm">
          <span className="text-warning font-medium">Point faible:</span>
          <span className="ml-1">{data.weakest_product.name} (score: {data.weakest_product.score})</span>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-medium opacity-70">Recommandations:</p>
          {data.recommendations.map((r, i) => (
            <div
              key={i}
              className={`text-sm p-2 rounded-lg ${
                r.priority === "HIGH" ? "bg-error/10 border-l-2 border-error" :
                "bg-warning/10 border-l-2 border-warning"
              }`}
            >
              {r.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpsellCard({ data }) {
  if (!data) return null;

  // Support both old format (report_name/price) and new format (plan_name/price_label)
  const planName = data.plan_name || data.report_name;
  const priceLabel = data.price_label || `${data.price}€`;
  const checkoutUrl = data._checkout_url || "/pricing";
  const hasTrial = data.trial_available && data.trial_days > 0;

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4 mt-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-lg">{planName}</h4>
            <span className="badge badge-primary badge-sm">{priceLabel}</span>
          </div>
          {data.reason && (
            <p className="text-sm text-primary/80 font-medium mb-2">{data.reason}</p>
          )}
          {hasTrial && (
            <div className="flex items-center gap-1 text-xs text-success mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{data.trial_days} jours d'essai gratuit</span>
            </div>
          )}
          <ul className="text-xs space-y-1.5 mb-3 bg-base-100/50 rounded-lg p-2">
            {data.features?.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <a
            href={data.plan_code === "enterprise" ? "/pricing#enterprise" : checkoutUrl}
            className="btn btn-primary btn-sm w-full gap-2"
          >
            {hasTrial ? "Essayer gratuitement" : data.plan_code === "enterprise" ? "Demander une démo" : `Passer à ${planName}`}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function AddToSetupPrompt({ data, onConfirm, onDismiss }) {
  if (!data?.product) return null;

  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-4 mt-3">
      <p className="text-sm mb-3">{data._message}</p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium">{data.product.name}</p>
          <p className="text-xs opacity-50">Score SAFE: {data.product.score}</p>
        </div>
        <button onClick={() => onConfirm(data.product)} className="btn btn-success btn-sm">
          Ajouter
        </button>
        <button onClick={onDismiss} className="btn btn-ghost btn-sm">
          Non merci
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// FREEMIUM LIMIT INDICATOR - Shows remaining messages
// =============================================================================

function FreemiumLimitIndicator({ usage }) {
  if (!usage || usage.remaining === -1) return null; // Enterprise/unlimited

  const isLow = usage.remaining <= 3 && usage.remaining > 0;
  const isExhausted = usage.remaining === 0;
  const planLabels = {
    free: "Gratuit",
    explorer: "Explorer",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  if (isExhausted) {
    return (
      <div className="px-4 py-3 bg-error/10 border-t border-error/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-error">Limite quotidienne atteinte</p>
            <p className="text-xs opacity-70">Passez à Explorer pour 50 messages/jour</p>
          </div>
          <a href="/pricing" className="btn btn-error btn-sm">
            Upgrade
          </a>
        </div>
      </div>
    );
  }

  if (isLow) {
    return (
      <div className="px-4 py-2 bg-warning/10 border-t border-warning/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">
              <span className="font-bold text-warning">{usage.remaining}</span>/{usage.limit} messages restants
            </span>
          </div>
          <a href="/pricing" className="text-xs text-primary hover:underline">
            + de messages →
          </a>
        </div>
      </div>
    );
  }

  // Normal state - show subtle indicator
  return (
    <div className="px-4 py-1.5 border-t border-base-200">
      <div className="flex items-center justify-between text-[10px] opacity-50">
        <span>{planLabels[usage.plan] || "Free"} • {usage.remaining}/{usage.limit} msg/jour</span>
        {usage.plan === "free" && (
          <a href="/pricing" className="hover:text-primary">Upgrade →</a>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// QUICK ACTION SUGGESTIONS - Dynamic contextual suggestions
// =============================================================================

function QuickActionSuggestions({ messages, userSetup, setInput, handleSend, session }) {
  // Generate contextual suggestions based on conversation state
  const getSuggestions = () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
    const hasSetup = userSetup?.length > 0;
    const isLoggedIn = !!session?.user;
    const messageCount = messages.length;

    // Initial suggestions (no conversation yet)
    if (messageCount <= 1) {
      return [
        { icon: "🏆", text: "Top 5 wallets sécurisés", prompt: "Quels sont les 5 wallets les plus sécurisés ?" },
        { icon: "⚔️", text: "Ledger vs Trezor", prompt: "Compare Ledger Nano X et Trezor Model T" },
        { icon: "🎯", text: "Aide-moi à choisir", prompt: "Je débute en crypto, quel wallet me conseilles-tu ?" },
        { icon: "🔧", text: "Crée mon setup", prompt: "Crée-moi un setup sécurisé pour débuter" },
      ];
    }

    // Contextual suggestions based on last response
    const suggestions = [];
    const lastContent = lastAssistantMessage?.content?.toLowerCase() || "";
    const lastActions = lastAssistantMessage?.actions || [];

    // After showing products - suggest comparisons or adding to setup
    if (lastActions.some(a => a._action === "SHOW_PRODUCTS" || a.products)) {
      suggestions.push({ icon: "📊", text: "Compare ces produits", prompt: "Compare ces produits entre eux" });
      if (isLoggedIn) {
        suggestions.push({ icon: "➕", text: "Ajoute au setup", prompt: "Ajoute le meilleur à mon setup" });
      }
    }

    // After showing a score - suggest alternatives or deep analysis
    if (lastContent.includes("score safe") || lastContent.includes("/100")) {
      suggestions.push({ icon: "🔍", text: "Analyse détaillée", prompt: "Donne-moi plus de détails sur ce score" });
      suggestions.push({ icon: "🔄", text: "Alternatives", prompt: "Y a-t-il des alternatives plus sécurisées ?" });
    }

    // After setup-related actions
    if (lastActions.some(a => a._action?.includes("SETUP"))) {
      suggestions.push({ icon: "📈", text: "Améliorer le score", prompt: "Comment améliorer le score de mon setup ?" });
      suggestions.push({ icon: "⚠️", text: "Points faibles", prompt: "Quels sont les points faibles de mon setup ?" });
    }

    // If user has a setup, always offer analysis
    if (hasSetup && !suggestions.some(s => s.text.includes("setup"))) {
      suggestions.push({ icon: "🎯", text: "Analyser setup", prompt: "Analyse mon setup actuel" });
    }

    // General suggestions to fill gaps
    const generalSuggestions = [
      { icon: "🏦", text: "Meilleur exchange", prompt: "Quel est l'exchange le plus sécurisé ?" },
      { icon: "🔐", text: "Conseils sécurité", prompt: "Donne-moi des conseils de sécurité pour protéger mes cryptos" },
      { icon: "💡", text: "DeFi sécurisé", prompt: "Quels protocoles DeFi sont les plus sécurisés ?" },
      { icon: "🌐", text: "Multi-chain", prompt: "Quel wallet supporte le plus de blockchains ?" },
    ];

    // Add general suggestions to reach 4 total
    while (suggestions.length < 4) {
      const randomSuggestion = generalSuggestions[Math.floor(Math.random() * generalSuggestions.length)];
      if (!suggestions.some(s => s.text === randomSuggestion.text)) {
        suggestions.push(randomSuggestion);
      }
      if (suggestions.length >= generalSuggestions.length) break;
    }

    return suggestions.slice(0, 4);
  };

  const suggestions = getSuggestions();

  const handleClick = (prompt) => {
    setInput(prompt);
    // Auto-send after a small delay for UX
    setTimeout(() => {
      handleSend?.();
    }, 100);
  };

  return (
    <div className="px-4 py-2 border-t border-base-200">
      <p className="text-[10px] text-base-content/40 mb-1.5">Suggestions</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => handleClick(s.prompt)}
            className="btn btn-xs btn-ghost whitespace-nowrap gap-1 hover:bg-primary/10"
          >
            <span>{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductsListCard({ data, onAddToSetup }) {
  if (!data?.products || data.products.length === 0) return null;

  return (
    <div className="rounded-xl border border-base-300 p-4 mt-3 bg-base-200/50">
      <h4 className="font-bold mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        {data.title || "Produits"}
      </h4>

      <div className="space-y-2">
        {data.products.map((p, i) => (
          <div
            key={p.slug || i}
            className="flex items-center gap-3 p-3 rounded-lg bg-base-100/50 hover:bg-base-100 transition-all cursor-pointer"
            onClick={() => onAddToSetup?.(p)}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${getScoreBg(p.score_safe)}`}>
              <span className={getScoreColor(p.score_safe)}>{p.score_safe}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{p.name}</p>
              <p className="text-xs opacity-60 truncate">{p.type || p.product_type}</p>
            </div>
            <a
              href={`/products/${p.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="btn btn-ghost btn-xs"
            >
              Voir
            </a>
          </div>
        ))}
      </div>

      {data.total > data.products.length && (
        <p className="text-xs text-center opacity-50 mt-3">
          +{data.total - data.products.length} autres produits
        </p>
      )}
    </div>
  );
}

function AlternativesCard({ data, onAddToSetup }) {
  if (!data?.alternatives || data.alternatives.length === 0) {
    // Handle "no alternatives needed" message
    if (data?.message) {
      return (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 mt-3">
          <div className="flex items-center gap-2 text-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{data.message}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  // Support both API formats: current_product or original_product
  const originalProduct = data.current_product || data.original_product;

  return (
    <div className="rounded-xl border border-info/30 bg-info/5 p-4 mt-3">
      <h4 className="font-bold mb-2 flex items-center gap-2 text-info">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Alternatives à {originalProduct}
        {data.current_score && (
          <span className="badge badge-ghost badge-sm">score actuel: {data.current_score}</span>
        )}
      </h4>
      {data.reason && (
        <p className="text-xs opacity-70 mb-3">{data.reason}</p>
      )}

      <div className="space-y-2">
        {data.alternatives.map((alt, i) => (
          <div
            key={alt.slug || i}
            className="flex items-center gap-3 p-3 rounded-lg bg-base-100/80 hover:bg-base-100 transition-all cursor-pointer border border-base-300"
            onClick={() => onAddToSetup?.(alt)}
          >
            <div className={`text-2xl font-black ${getScoreColor(alt.score_safe || alt.score)}`}>
              {alt.score_safe || alt.score}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{alt.name}</p>
              <p className="text-xs opacity-60">{alt.advantage || alt.type}</p>
            </div>
            {(alt.score_diff > 0 || alt.improvement > 0) && (
              <span className="badge badge-success badge-sm">+{alt.score_diff || alt.improvement}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OptimalSetupCard({ data, onAddToSetup }) {
  // Support both API formats: recommended_products (from suggest_optimal_setup) or setup
  const products = data?.recommended_products || data?.setup;
  if (!products || products.length === 0) return null;

  const totalScore = data.estimated_setup_score || data.total_score || Math.round(
    products.reduce((acc, p) => acc + (p.score_safe || p.score || 0), 0) / products.length
  );

  return (
    <div className={`rounded-xl border p-4 mt-3 ${getScoreBg(totalScore)}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Setup Optimal
          </h4>
          <p className="text-xs opacity-70">{data.profile || "Configuration recommandée"}</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-black ${getScoreColor(totalScore)}`}>
            {totalScore}
          </div>
          <div className="text-[10px] opacity-50">Score moyen</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {products.map((p, i) => (
          <div
            key={p.slug || i}
            className="flex items-center gap-3 p-2 rounded-lg bg-base-100/50 hover:bg-base-100 transition-all cursor-pointer"
            onClick={() => onAddToSetup?.(p)}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-[10px] opacity-60">{p.role || p.type}</p>
            </div>
            <div className={`text-lg font-bold ${getScoreColor(p.score_safe || p.score)}`}>
              {p.score_safe || p.score}
            </div>
          </div>
        ))}
      </div>

      {(data.budget || data.total_cost) && (
        <div className="text-xs bg-base-100/50 rounded p-2 mb-3">
          <span className="opacity-60">Budget estimé:</span>
          <span className="font-medium ml-1">{data.budget || data.total_cost}</span>
        </div>
      )}

      {data.description && (
        <p className="text-xs opacity-70 mb-3">{data.description}</p>
      )}

      <button
        onClick={() => products.forEach(p => onAddToSetup?.(p))}
        className="btn btn-primary btn-sm w-full"
      >
        Adopter ce setup complet
      </button>
    </div>
  );
}

function IncidentsCard({ data }) {
  if (!data?.incidents || data.incidents.length === 0) return null;

  const severityColors = {
    critical: "bg-error/10 border-error text-error",
    high: "bg-warning/10 border-warning text-warning",
    medium: "bg-amber-500/10 border-amber-500 text-amber-500",
    low: "bg-info/10 border-info text-info",
  };

  return (
    <div className="rounded-xl border border-error/30 bg-error/5 p-4 mt-3">
      <h4 className="font-bold mb-3 flex items-center gap-2 text-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Incidents de sécurité
        {data.product_name && <span className="opacity-70 font-normal">- {data.product_name}</span>}
      </h4>

      <div className="space-y-2">
        {data.incidents.map((inc, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg border-l-4 ${severityColors[inc.severity] || severityColors.medium}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-sm">{inc.title}</p>
                <p className="text-xs opacity-70 mt-1">{inc.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs opacity-50">{inc.date}</span>
                {inc.loss && (
                  <p className="text-xs font-medium">{inc.loss}</p>
                )}
              </div>
            </div>
            {inc.resolution && (
              <p className="text-[10px] mt-2 opacity-60 border-t border-base-300 pt-2">
                Resolution: {inc.resolution}
              </p>
            )}
          </div>
        ))}
      </div>

      {data.total_loss && (
        <div className="mt-3 p-2 bg-error/10 rounded text-center">
          <span className="text-xs opacity-70">Pertes totales documentées:</span>
          <span className="font-bold text-error ml-1">{data.total_loss}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SIGNUP PROMPT - Funnel d'inscription naturel
// =============================================================================

function SignupPromptBanner({ data, onSignup, onDismiss }) {
  if (!data) return null;

  const priorityStyles = {
    HIGH: "bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30",
    MEDIUM: "bg-base-200/80 border-base-300",
    LOW: "bg-base-200/50 border-base-300",
  };

  return (
    <div className={`px-4 py-3 border-b ${priorityStyles[data.priority] || priorityStyles.MEDIUM}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          {data.trigger === "SAVE_SETUP" ? (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          ) : data.trigger === "RISK_ANALYSIS" ? (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm">{data.title}</h4>
          <p className="text-xs opacity-70 mt-0.5">{data.message}</p>

          {/* Benefits */}
          {data.benefits?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {data.benefits.map((b, i) => (
                <li key={i} className="text-xs flex items-center gap-1 opacity-80">
                  <svg className="w-3 h-3 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* Urgency */}
          {data.urgency && (
            <p className="text-xs text-warning mt-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {data.urgency}
            </p>
          )}

          {/* CTA Buttons */}
          <div className="flex gap-2 mt-3">
            <button onClick={onSignup} className="btn btn-primary btn-sm">
              {data.cta}
            </button>
            <button onClick={onDismiss} className="btn btn-ghost btn-sm text-xs">
              {data.ctaSecondary}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// NAVIGATION CARD - Pour les actions de navigation
// =============================================================================

function NavigationCard({ data, onNavigate }) {
  if (!data?.path) return null;

  return (
    <button
      onClick={() => onNavigate(data.path)}
      className="w-full rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 p-4 mt-3 text-left transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-medium">{data.label}</p>
          <p className="text-xs opacity-60">{data.description}</p>
        </div>
        <svg className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AutonomousChat({
  userSetup = [],
  onAddToSetup,
  isOpen,
  onToggle,
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [signupPrompt, setSignupPrompt] = useState(null);
  const [usage, setUsage] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: locale === "fr"
        ? "Bonjour ! Je suis l'assistant SAFE. Posez-moi vos questions sur la sécurité crypto.\n\nJe peux:\n• Analyser des produits avec leur score SAFE\n• Comparer plusieurs solutions\n• Vous recommander les meilleurs produits par catégorie\n• Analyser votre setup complet\n\nQue souhaitez-vous savoir ?"
        : "Hi! I'm the SAFE assistant. Ask me about crypto security.\n\nI can:\n• Analyze products with SAFE scores\n• Compare solutions\n• Recommend best products by category\n• Analyze your complete setup\n\nWhat would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat/autonomous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          userSetup: userSetup.map((p) => p.slug || p),
          language: locale,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const newMessage = {
          role: "assistant",
          content: data.response,
          actions: data.actions || [],
          toolsUsed: data.toolsUsed || [],
        };
        setMessages((prev) => [...prev, newMessage]);

        // Handle signup prompt for anonymous users
        if (data.signupPrompt && !session) {
          setSignupPrompt(data.signupPrompt);
        }

        // Track usage
        if (data.usage) {
          setUsage(data.usage);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Désolé, une erreur s'est produite.",
          },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erreur de connexion. Veuillez réessayer.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddToSetup = (product) => {
    if (!session) {
      // If not logged in, show signup prompt
      setSignupPrompt({
        trigger: "SAVE_SETUP",
        priority: "HIGH",
        title: "Sauvegardez votre setup",
        message: `Créez un compte gratuit pour ajouter ${product.name} à votre setup`,
        cta: "Créer mon compte",
        ctaSecondary: "Plus tard",
        benefits: ["Sauvegarde illimitée", "Alertes de changement", "Historique"],
      });
      return;
    }
    onAddToSetup?.(product);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `${product.name} a été ajouté à votre setup.`,
      },
    ]);
  };

  const handleSignup = () => {
    // Store chat state for recovery
    sessionStorage.setItem("pendingChat", JSON.stringify({ messages, signupPrompt }));
    router.push("/signin?callbackUrl=/dashboard");
  };

  const handleNavigate = (path) => {
    router.push(path);
  };

  // Render action cards based on type
  const renderAction = (action, index) => {
    switch (action.type) {
      case "SHOW_SCORE_CARD":
        return <ScoreCard key={index} data={action.data} onAddToSetup={handleAddToSetup} />;
      case "SHOW_COMPARISON":
        return <ComparisonCard key={index} data={action.data} />;
      case "SHOW_RANKING":
        return <RankingCard key={index} data={action.data} onAddToSetup={handleAddToSetup} />;
      case "SHOW_SETUP_ANALYSIS":
        return <SetupAnalysisCard key={index} data={action.data} onAddToSetup={handleAddToSetup} />;
      case "SHOW_UPSELL":
        return <UpsellCard key={index} data={action.data} />;
      case "PROMPT_ADD_TO_SETUP":
        return (
          <AddToSetupPrompt
            key={index}
            data={action.data}
            onConfirm={handleAddToSetup}
            onDismiss={() => setPendingAction(null)}
          />
        );
      case "NAVIGATE":
        return <NavigationCard key={index} data={action.data} onNavigate={handleNavigate} />;
      case "SHOW_PRODUCTS":
        return <ProductsListCard key={index} data={action.data} onAddToSetup={handleAddToSetup} />;
      case "SHOW_ALTERNATIVES":
        return <AlternativesCard key={index} data={action.data} onAddToSetup={handleAddToSetup} />;
      case "SHOW_OPTIMAL_SETUP":
        return <OptimalSetupCard key={index} data={action.data} onAddToSetup={handleAddToSetup} />;
      case "SHOW_INCIDENTS":
        return <IncidentsCard key={index} data={action.data} />;
      default:
        return null;
    }
  };

  // Collapsed state
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 btn btn-primary btn-circle btn-lg shadow-xl z-50 animate-pulse"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[440px] max-w-[calc(100vw-2rem)] bg-base-100 rounded-2xl border border-base-300 shadow-2xl z-50 flex flex-col max-h-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold">Assistant SAFE</h3>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              Autonome & Intelligent
            </p>
          </div>
        </div>
        <button onClick={onToggle} className="btn btn-ghost btn-sm btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[350px] max-h-[500px]">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-primary text-primary-content rounded-br-md"
                    : "bg-base-200 rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>

            {/* Render action cards */}
            {msg.actions?.map((action, j) => renderAction(action, `${i}-${j}`))}

            {/* Tools used indicator */}
            {msg.toolsUsed?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 ml-2">
                {msg.toolsUsed.map((t, j) => (
                  <span key={j} className="badge badge-ghost badge-xs">
                    {t.tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-base-200 p-4 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2">
                <span className="loading loading-dots loading-sm"></span>
                <span className="text-sm opacity-50">Analyse en cours...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions - Dynamic suggestions */}
      <QuickActionSuggestions
        messages={messages}
        userSetup={userSetup}
        setInput={setInput}
        handleSend={handleSend}
        session={session}
      />

      {/* Freemium Limit Indicator */}
      <FreemiumLimitIndicator usage={usage} />

      {/* Input */}
      <div className="p-4 border-t border-base-300">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={usage?.remaining === 0 ? "Limite atteinte..." : "Posez votre question..."}
            className="input input-bordered flex-1"
            disabled={isLoading || usage?.remaining === 0}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || usage?.remaining === 0}
            className="btn btn-primary"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-center mt-2 opacity-40">
          Powered by SAFE methodology | Données vérifiées Supabase
        </p>
      </div>
    </div>
  );
}
