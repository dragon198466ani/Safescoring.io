"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useSession } from "next-auth/react";
import config from "@/config";

/**
 * AnonymousCatalog - Browse anonymous community setups
 *
 * Shows setups from the community WITHOUT revealing:
 * - User identity
 * - Specific products used
 *
 * DOES show:
 * - Overall score
 * - Product count
 * - Pillar breakdown (percentages, not products)
 * - Setup archetype/style
 * - Creation date (approximate)
 */

// Setup archetypes based on product categories and scores
// Descriptions are now i18n keys under "archetypes.*"
const ARCHETYPES = {
  hardwareMaximalist: {
    id: "hardwareMaximalist",
    icon: "🔐",
    gradient: "from-amber-500 to-orange-600",
    i18nKey: "archetypes.hardwareMaximalist",
  },
  defiNative: {
    id: "defiNative",
    icon: "🌐",
    gradient: "from-purple-500 to-indigo-600",
    i18nKey: "archetypes.defiNative",
  },
  balanced: {
    id: "balanced",
    icon: "⚖️",
    gradient: "from-blue-500 to-cyan-600",
    i18nKey: "archetypes.balanced",
  },
  privacyFirst: {
    id: "privacyFirst",
    icon: "👁️",
    gradient: "from-slate-600 to-gray-800",
    i18nKey: "archetypes.privacyFirst",
  },
  beginner: {
    id: "beginner",
    icon: "🌱",
    gradient: "from-green-500 to-emerald-600",
    i18nKey: "archetypes.beginner",
  },
  advanced: {
    id: "advanced",
    icon: "🚀",
    gradient: "from-rose-500 to-pink-600",
    i18nKey: "archetypes.advanced",
  },
};

/**
 * AnonymousSetupCard - Display a single anonymous setup
 */
const AnonymousSetupCard = ({ setup, onCompare, onInspire }) => {
  const { t } = useTranslation();
  const archetype = ARCHETYPES[setup.archetype] || ARCHETYPES.balanced;

  // Score color based on value
  const getScoreColor = (score) => {
    if (score >= 85) return "text-emerald-400";
    if (score >= 70) return "text-green-400";
    if (score >= 55) return "text-amber-400";
    return "text-red-400";
  };

  // Anonymize creation date (show only month/year or "X days ago")
  const getAnonymizedDate = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return t("catalog.thisWeek") || "This week";
    if (diffDays < 30) return t("catalog.thisMonth") || "This month";
    if (diffDays < 90) return t("catalog.recently") || "Recently";
    return t("catalog.established") || "Established";
  };

  return (
    <div className="card bg-base-200 hover:bg-base-200/80 transition-all duration-300 border border-base-300 hover:border-primary/30 group">
      <div className="card-body p-5">
        {/* Header with archetype */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${archetype.gradient} flex items-center justify-center text-xl shadow-lg`}>
              {archetype.icon}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {t(`archetypes.${archetype.id}`) || archetype.id}
              </h3>
              <p className="text-xs text-base-content/50">
                {t(archetype.i18nKey)}
              </p>
            </div>
          </div>

          {/* Anonymous badge */}
          <div className="badge badge-ghost badge-sm gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
            </svg>
            {t("catalog.anonymous") || "Anonymous"}
          </div>
        </div>

        {/* Score display */}
        <div className="flex items-center justify-center py-4 border-y border-base-300">
          <div className="text-center">
            <div className={`text-5xl font-black ${getScoreColor(setup.score)}`}>
              {setup.score}
            </div>
            <div className="text-xs text-base-content/50 mt-1">
              /100 SafeScore
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-base-300/50 rounded-lg p-2">
            <div className="text-lg font-bold">{setup.productCount}</div>
            <div className="text-xs text-base-content/50">
              {t("catalog.products") || "Products"}
            </div>
          </div>
          <div className="bg-base-300/50 rounded-lg p-2">
            <div className="text-lg font-bold">{setup.categoryCount}</div>
            <div className="text-xs text-base-content/50">
              {t("catalog.categories") || "Categories"}
            </div>
          </div>
          <div className="bg-base-300/50 rounded-lg p-2">
            <div className="text-lg font-bold text-primary">{setup.percentile}%</div>
            <div className="text-xs text-base-content/50">
              {t("catalog.percentile") || "Percentile"}
            </div>
          </div>
        </div>

        {/* Pillar bars (anonymous - no product names) */}
        <div className="mt-4 space-y-2">
          <div className="text-xs text-base-content/50 uppercase tracking-wide">
            {t("catalog.pillarStrengths") || "Security Pillars"}
          </div>
          {setup.pillars && Object.entries(setup.pillars).map(([pillar, value]) => (
            <div key={pillar} className="flex items-center gap-2">
              <span className="text-xs w-24 text-base-content/60 truncate">
                {t(`pillars.${pillar}`) || pillar}
              </span>
              <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    value >= 80 ? "bg-emerald-500" :
                    value >= 60 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-xs w-8 text-right">{value}%</span>
            </div>
          ))}
        </div>

        {/* Meta info */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-base-300 text-xs text-base-content/40">
          <span>{getAnonymizedDate(setup.createdAt)}</span>
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
              <path fillRule="evenodd" d="M1.38 8.28a.87.87 0 0 1 0-.566 7.003 7.003 0 0 1 13.238.006.87.87 0 0 1 0 .566A7.003 7.003 0 0 1 1.379 8.28ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" />
            </svg>
            {setup.views || 0} {t("catalog.views") || "views"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onCompare?.(setup)}
            className="btn btn-outline h-10 min-h-0 flex-1 gap-1 touch-manipulation active:scale-[0.97] transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M11.78 11.78a.75.75 0 0 0 0-1.06L9.06 8l2.72-2.72a.75.75 0 1 0-1.06-1.06L8 6.94 5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 0 0 1.06 0Z" clipRule="evenodd" />
            </svg>
            {t("catalog.compareToMine") || "vs Mine"}
          </button>
          <button
            onClick={() => onInspire?.(setup)}
            className="btn btn-primary h-10 min-h-0 flex-1 gap-1 touch-manipulation active:scale-[0.97] transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M8 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 1ZM10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM12.95 4.11a.75.75 0 1 0-1.06-1.06l-1.062 1.06a.75.75 0 0 0 1.061 1.062l1.06-1.061ZM15 8a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 15 8ZM11.89 12.95a.75.75 0 0 0 1.06-1.06l-1.06-1.062a.75.75 0 0 0-1.062 1.061l1.061 1.06ZM8 12a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 12ZM5.172 11.89a.75.75 0 0 0-1.061-1.062L3.05 11.89a.75.75 0 1 0 1.06 1.06l1.06-1.06ZM2.75 7.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM4.11 3.05a.75.75 0 0 0-1.06 1.06l1.06 1.061a.75.75 0 1 0 1.06-1.06L4.11 3.05Z" />
            </svg>
            {t("catalog.getInspired") || "Inspire"}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * AnonymousCatalog - Main catalog component
 */
const AnonymousCatalog = ({ className = "" }) => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, top10, similar, archetype
  const [archetypeFilter, setArchetypeFilter] = useState(null);
  const [sortBy, setSortBy] = useState("score"); // score, recent, views

  // Fetch anonymous setups
  useEffect(() => {
    const fetchSetups = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          filter,
          sort: sortBy,
          ...(archetypeFilter && { archetype: archetypeFilter }),
        });

        const res = await fetch(`/api/catalog/anonymous?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSetups(data.setups || []);
        }
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
        // Demo data for development
        setSetups(generateDemoSetups());
      } finally {
        setLoading(false);
      }
    };

    fetchSetups();
  }, [filter, sortBy, archetypeFilter]);

  // Demo data generator
  const generateDemoSetups = () => {
    const archetypeKeys = Object.keys(ARCHETYPES);
    return Array.from({ length: 12 }, (_, i) => ({
      id: `demo-${i}`,
      score: Math.floor(Math.random() * 40) + 55,
      productCount: Math.floor(Math.random() * 6) + 2,
      categoryCount: Math.floor(Math.random() * 4) + 1,
      percentile: Math.floor(Math.random() * 50) + 50,
      archetype: archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)],
      pillars: {
        custody: Math.floor(Math.random() * 40) + 60,
        track: Math.floor(Math.random() * 40) + 60,
        transparency: Math.floor(Math.random() * 40) + 60,
        resilience: Math.floor(Math.random() * 40) + 60,
      },
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      views: Math.floor(Math.random() * 500),
    }));
  };

  // Handle compare action
  const handleCompare = (setup) => {
    // Navigate to comparison with anonymous setup
    window.location.href = `/dashboard/setups?compare=${setup.id}`;
  };

  // Handle inspire action (shows tips to improve based on this setup's strengths)
  const handleInspire = (setup) => {
    // Could open a modal with improvement suggestions
    console.log("Inspire from setup:", setup);
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
              <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clipRule="evenodd" />
              <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
            </svg>
            {t("catalog.title") || "Community Setups"}
          </h2>
          <p className="text-base-content/60 text-sm mt-1">
            {t("catalog.subtitle") || "Browse anonymous setups from the community. Get inspired without revealing anyone's stack."}
          </p>
        </div>

        {/* Privacy badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-base-200 rounded-lg border border-base-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-500">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">
            {t("catalog.privacyProtected") || "Privacy Protected"}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Quick filters */}
        <div className="flex gap-2">
          {[
            { id: "all", label: t("catalog.filterAll") || "All" },
            { id: "top10", label: t("catalog.filterTop10") || "Top 10%" },
            { id: "similar", label: t("catalog.filterSimilar") || "Similar to Mine" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`btn btn-sm ${filter === f.id ? "btn-primary" : "btn-ghost"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Archetype filter */}
        <select
          value={archetypeFilter || ""}
          onChange={(e) => setArchetypeFilter(e.target.value || null)}
          className="select select-sm select-bordered"
        >
          <option value="">{t("catalog.allArchetypes") || "All Archetypes"}</option>
          {Object.entries(ARCHETYPES).map(([key, arch]) => (
            <option key={key} value={key}>
              {arch.icon} {t(`archetypes.${key}`) || key}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="select select-sm select-bordered ml-auto"
        >
          <option value="score">{t("catalog.sortScore") || "Highest Score"}</option>
          <option value="recent">{t("catalog.sortRecent") || "Most Recent"}</option>
          <option value="views">{t("catalog.sortViews") || "Most Viewed"}</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card bg-base-200 animate-pulse">
              <div className="card-body p-5 space-y-4">
                <div className="h-12 bg-base-300 rounded" />
                <div className="h-24 bg-base-300 rounded" />
                <div className="h-8 bg-base-300 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : setups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-bold">
            {t("catalog.noSetups") || "No setups yet"}
          </h3>
          <p className="text-base-content/60 mt-2">
            {t("catalog.beFirst") || "Be the first to share your setup anonymously!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {setups.map((setup) => (
            <AnonymousSetupCard
              key={setup.id}
              setup={setup}
              onCompare={handleCompare}
              onInspire={handleInspire}
            />
          ))}
        </div>
      )}

      {/* CTA to share own setup */}
      <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-primary/20 text-center">
        <h3 className="text-lg font-bold mb-2">
          {t("catalog.shareYours") || "Want to compare?"}
        </h3>
        <p className="text-base-content/60 text-sm mb-4">
          {t("catalog.shareYoursDesc") || "Share your setup anonymously and see how you rank against the community."}
        </p>
        <a href="/dashboard/setups" className="btn btn-primary">
          {t("catalog.shareSetup") || "Share My Setup Anonymously"}
        </a>
      </div>
    </div>
  );
};

export default AnonymousCatalog;
export { ARCHETYPES, AnonymousSetupCard };
