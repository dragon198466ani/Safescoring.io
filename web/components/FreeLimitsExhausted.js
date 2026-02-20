"use client";

import config from "@/config";

/**
 * FreeLimitsExhausted - Compelling upgrade banner when free tier is fully used
 * - Shows what the user has used (stacks, products)
 * - Highlights Pro features they're missing
 * - Strong visual call-to-action
 */

const PRO_FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
      </svg>
    ),
    title: "20 stacks",
    description: "HODL, Trading, DeFi, Privacy..."
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    title: "10 produits/stack",
    description: "Analyse complète de votre setup"
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    title: "Graphe compatibilité",
    description: "Visualisez les liaisons entre produits"
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    title: "Alertes sécurité",
    description: "Tous les incidents de vos produits"
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Export PDF",
    description: "Rapports professionnels"
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Historique scores",
    description: "Suivez l'évolution dans le temps"
  },
];

export default function FreeLimitsExhausted({
  usedStacks = 1,
  maxStacks = 1,
  usedProducts = 3,
  maxProducts = 3,
  onUpgradeClick,
  variant = "full" // "full" | "compact" | "inline"
}) {
  // Get Pro plan price from config
  const proPlan = config.lemonsqueezy?.plans?.find(p => p.isFeatured);
  const proPrice = proPlan?.price || 39;

  // Check if ALL limits are exhausted
  const stacksExhausted = usedStacks >= maxStacks;
  const productsExhausted = usedProducts >= maxProducts;
  const allExhausted = stacksExhausted && productsExhausted;

  // Inline variant - just a small alert
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-400">Limite atteinte</p>
          <p className="text-xs text-base-content/60">Passez à Pro pour continuer</p>
        </div>
        <button
          onClick={onUpgradeClick}
          className="btn btn-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600"
        >
          Upgrade
        </button>
      </div>
    );
  }

  // Compact variant - medium-sized banner
  if (variant === "compact") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-base-200 to-amber-500/5">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />

        <div className="relative p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Quota gratuit épuisé</h3>
                <span className="badge badge-sm bg-amber-500/20 text-amber-400 border-0">
                  {usedProducts}/{maxProducts} produits
                </span>
              </div>
              <p className="text-sm text-base-content/60 mb-3">
                Débloquez l'analyse complète avec le graphe de compatibilité, les alertes sécurité et plus encore.
              </p>
              <button
                onClick={onUpgradeClick}
                className="btn btn-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 hover:from-purple-600 hover:to-purple-700 gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Passer à Pro ({proPrice}€/mois)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full variant - complete banner with features preview
  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-base-200 to-amber-500/5">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          {/* Status badges */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${stacksExhausted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {usedStacks}/{maxStacks} stack{maxStacks > 1 ? 's' : ''}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${productsExhausted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {usedProducts}/{maxProducts} produits
            </span>
          </div>

          {/* Title */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-purple-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            {allExhausted ? "Vous avez tout exploré !" : "Limites presque atteintes"}
          </h2>
          <p className="text-base-content/60 max-w-lg mx-auto">
            {allExhausted
              ? "Vous avez utilisé 100% de votre quota gratuit. Passez à Pro pour débloquer toutes les fonctionnalités."
              : "Vous approchez de la limite de votre plan gratuit. Passez à Pro pour continuer à analyser vos setups."}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {PRO_FEATURES.map((feature, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-base-300/30 border border-base-content/5 hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                {feature.icon}
                <span className="font-medium text-sm">{feature.title}</span>
              </div>
              <p className="text-xs text-base-content/50">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onUpgradeClick}
            className="btn btn-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 hover:from-purple-600 hover:to-purple-700 gap-2 shadow-lg shadow-purple-500/25"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            Passer à Pro - {proPrice}€/mois
          </button>
          <p className="text-xs text-base-content/40 mt-3">
            14 jours d'essai gratuit • Annulez à tout moment
          </p>
        </div>

        {/* Social proof */}
        <div className="mt-6 pt-6 border-t border-base-content/5">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-base-content/50">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Paiement sécurisé
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Support prioritaire
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Mises à jour mensuelles
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
