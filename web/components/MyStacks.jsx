"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getScoreColor, getScoreBgGradient } from "@/libs/design-tokens";
import { useProductScoreSubscription } from "@/hooks/useSupabaseSubscription";
import { useUserSetups } from "@/hooks/useApi";

// Dynamically import globe for Vue Globale
const StackGlobe3D = dynamic(() => import("@/components/StackGlobe3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-black/50 rounded-2xl">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  ),
});

// Use getScoreBgGradient from design-tokens (returns "from-X/20 to-X/5 border-X/30")
// Extract just the gradient part for backwards compatibility
const getScoreBg = (score) => {
  const gradient = getScoreBgGradient(score);
  // Remove border part if present
  return gradient.split(" border-")[0];
};

const getRoleIcon = (role) => {
  switch (role) {
    case "wallet":
      return "💰";
    case "exchange":
      return "🏦";
    case "defi":
      return "🔄";
    case "staking":
      return "📈";
    default:
      return "📦";
  }
};

// Helper: Get demo setups from localStorage
const getDemoSetups = () => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("safescoring_demo_setups");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export default function MyStacks() {
  const [stacks, setStacks] = useState([]);
  const [showGlobalView, setShowGlobalView] = useState(false);
  const [selectedStackForGlobe, setSelectedStackForGlobe] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Use useApi hook with caching and auto-retry
  const { data: setupsData, isLoading: loading, error } = useUserSetups();

  // Real-time subscription: Listen for score changes
  const handleScoreUpdate = useCallback((payload) => {
    if (payload.eventType === "UPDATE" && payload.new) {
      const updatedProductId = payload.new.product_id;
      const newScores = {
        note_finale: payload.new.note_finale,
        score_s: payload.new.score_s,
        score_a: payload.new.score_a,
        score_f: payload.new.score_f,
        score_e: payload.new.score_e,
      };

      // Update stacks that contain this product
      setStacks(prevStacks => prevStacks.map(stack => {
        const hasProduct = stack.productDetails?.some(p => p.id === updatedProductId);
        if (!hasProduct) return stack;

        // Update product scores in productDetails
        const updatedProductDetails = stack.productDetails.map(p => {
          if (p.id !== updatedProductId) return p;
          return {
            ...p,
            scores: {
              ...p.scores,
              total: newScores.note_finale,
              note_finale: newScores.note_finale,
              s: newScores.score_s,
              a: newScores.score_a,
              f: newScores.score_f,
              e: newScores.score_e,
            }
          };
        });

        // Recalculate combined score
        const combinedScore = calculateCombinedScore(updatedProductDetails);

        return {
          ...stack,
          productDetails: updatedProductDetails,
          combinedScore,
        };
      }));

      setLastUpdate(new Date());
    }
  }, []);

  // Subscribe to real-time score updates
  const { isConnected } = useProductScoreSubscription({
    onUpdate: handleScoreUpdate,
    enabled: !isDemoMode, // Only enable for authenticated users
  });

  // Helper: Calculate combined score for a stack
  const calculateCombinedScore = (productDetails) => {
    if (!productDetails || productDetails.length === 0) return null;

    let totalWeight = 0;
    let weightedSum = { S: 0, A: 0, F: 0, E: 0, total: 0 };

    productDetails.forEach(product => {
      const weight = product.role === "wallet" ? 2 : 1;
      totalWeight += weight;

      const scores = product.scores || {};
      weightedSum.S += (scores.s || scores.score_s || 0) * weight;
      weightedSum.A += (scores.a || scores.score_a || 0) * weight;
      weightedSum.F += (scores.f || scores.score_f || 0) * weight;
      weightedSum.E += (scores.e || scores.score_e || 0) * weight;
      weightedSum.total += (scores.total || scores.note_finale || 0) * weight;
    });

    if (totalWeight === 0) return null;

    return {
      score_s: Math.round(weightedSum.S / totalWeight),
      score_a: Math.round(weightedSum.A / totalWeight),
      score_f: Math.round(weightedSum.F / totalWeight),
      score_e: Math.round(weightedSum.E / totalWeight),
      note_finale: Math.round(weightedSum.total / totalWeight),
      products_count: productDetails.length,
    };
  };

  // Process data from useUserSetups hook (handles demo mode and errors)
  useEffect(() => {
    if (setupsData) {
      // Check if user is anonymous (demo mode)
      if (setupsData.limits?.isAnonymous) {
        setIsDemoMode(true);
        // Load demo setups from localStorage
        const demoSetups = getDemoSetups();
        setStacks(demoSetups);
      } else {
        setIsDemoMode(false);
        setStacks(setupsData.setups || []);
      }
    } else if (error) {
      // Fallback to demo mode on error
      setIsDemoMode(true);
      const demoSetups = getDemoSetups();
      setStacks(demoSetups);
    }
  }, [setupsData, error]);

  // Calculate global stats
  const globalStats = {
    totalSetups: stacks.length,
    totalProducts: stacks.reduce((sum, s) => sum + (s.productDetails?.length || 0), 0),
    avgScore: stacks.length > 0
      ? Math.round(
          stacks.reduce((sum, s) => sum + (s.combinedScore?.note_finale || 0), 0) /
            stacks.filter(s => s.combinedScore?.note_finale).length || 1
        )
      : 0,
    activeStacks: stacks.filter(s => s.is_active !== false).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-base-300 rounded animate-pulse" />
          <div className="h-10 w-28 bg-base-300 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-base-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="p-2 rounded-xl bg-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
              </svg>
            </span>
            My Setups
            {/* Real-time connection indicator */}
            {!isDemoMode && isConnected && (
              <span className="relative flex h-2.5 w-2.5" title="Real-time sync active">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            )}
          </h2>
          <p className="text-base-content/60 mt-1">
            {stacks.length === 0
              ? "Create your first crypto setup"
              : `${stacks.length} setup${stacks.length > 1 ? 's' : ''} • ${globalStats.totalProducts} products`}
            {/* Last update indicator */}
            {lastUpdate && !isDemoMode && (
              <span className="ml-2 text-xs text-green-500">
                • Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Vue Globale toggle - only show if user has stacks and is NOT in demo mode */}
          {stacks.length > 0 && !isDemoMode && (
            <button
              onClick={() => setShowGlobalView(!showGlobalView)}
              className={`btn btn-sm gap-2 ${showGlobalView ? 'btn-primary' : 'btn-ghost'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              Global View
            </button>
          )}
          <Link href="/dashboard/setups" className="btn btn-primary btn-sm gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Setup
          </Link>
        </div>
      </div>

      {/* Demo Mode CTA Banner - Show when user has demo setups */}
      {isDemoMode && stacks.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">You&apos;re using demo mode</p>
              <p className="text-xs text-base-content/60">Create an account to save your setups permanently and unlock more features</p>
            </div>
          </div>
          <Link href="/signin?callbackUrl=/dashboard/setups" className="btn btn-primary btn-sm shrink-0">
            Create Account
          </Link>
        </div>
      )}

      {/* Empty state */}
      {stacks.length === 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-base-200 to-secondary/10 border border-base-300 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Create your first setup</h3>
          <p className="text-base-content/60 max-w-md mx-auto mb-6">
            A setup combines your wallets, exchanges and DeFi tools to calculate an overall SAFE security score.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
            <div className="p-4 rounded-xl bg-base-200/50 border border-base-300">
              <div className="text-3xl mb-2">1</div>
              <p className="text-xs text-base-content/70">Add your products</p>
            </div>
            <div className="p-4 rounded-xl bg-base-200/50 border border-base-300">
              <div className="text-3xl mb-2">2</div>
              <p className="text-xs text-base-content/70">Assign roles</p>
            </div>
            <div className="p-4 rounded-xl bg-base-200/50 border border-base-300">
              <div className="text-3xl mb-2">3</div>
              <p className="text-xs text-base-content/70">Analyze the score</p>
            </div>
          </div>

          <Link href="/dashboard/setups" className="btn btn-primary btn-lg gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create my first setup
          </Link>
        </div>
      )}

      {/* INDIVIDUAL SETUPS - Priority Section */}
      {stacks.length > 0 && !showGlobalView && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stacks.map((stack, index) => (
            <Link
              key={stack.id}
              href={isDemoMode ? "/dashboard/setups" : `/dashboard/setups/${stack.id}`}
              className={`group relative rounded-2xl bg-gradient-to-br ${getScoreBg(stack.combinedScore?.note_finale || 50)} border border-base-300 p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ${
                stack.is_active === false ? "opacity-60" : ""
              }`}
            >
              {/* Setup number badge */}
              <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-base-100 border-2 border-primary flex items-center justify-center font-bold text-sm text-primary shadow-md">
                {index + 1}
              </div>

              {/* Demo badge */}
              {isDemoMode && (
                <div className="absolute top-3 right-3 badge badge-sm badge-warning gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                  Demo
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                    {stack.name || `Setup ${index + 1}`}
                  </h3>
                  {stack.description && (
                    <p className="text-xs text-base-content/50 truncate mt-1">
                      {stack.description}
                    </p>
                  )}
                </div>

                {/* Score */}
                {stack.combinedScore?.note_finale && (
                  <div className="flex flex-col items-center">
                    <div className={`text-3xl font-black ${getScoreColor(stack.combinedScore.note_finale)}`}>
                      {stack.combinedScore.note_finale}
                    </div>
                    <div className="text-[10px] text-base-content/50 tracking-widest">SAFE</div>
                  </div>
                )}
              </div>

              {/* SAFE Pillars */}
              {stack.combinedScore && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { code: "S", score: stack.combinedScore.score_s, color: "#22c55e", label: "Security" },
                    { code: "A", score: stack.combinedScore.score_a, color: "#f59e0b", label: "Audit" },
                    { code: "F", score: stack.combinedScore.score_f, color: "#3b82f6", label: "Financials" },
                    { code: "E", score: stack.combinedScore.score_e, color: "#8b5cf6", label: "Experience" },
                  ].map(pillar => (
                    <div key={pillar.code} className="text-center p-2 rounded-lg bg-base-100/50">
                      <div className="text-lg font-bold" style={{ color: pillar.color }}>
                        {pillar.score || "—"}
                      </div>
                      <div className="text-[9px] text-base-content/40 font-medium">{pillar.code}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Products */}
              <div className="flex flex-wrap gap-1.5">
                {(stack.productDetails || []).slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-base-100/50 text-xs"
                    title={product.name}
                  >
                    <span>{getRoleIcon(product.role)}</span>
                    <span className="truncate max-w-[60px]">{product.name}</span>
                  </div>
                ))}
                {(stack.productDetails?.length || 0) > 4 && (
                  <div className="px-2 py-1 rounded-lg bg-base-100/50 text-xs text-base-content/50">
                    +{stack.productDetails.length - 4}
                  </div>
                )}
                {(!stack.productDetails || stack.productDetails.length === 0) && (
                  <div className="text-xs text-base-content/40">No products</div>
                )}
              </div>

              {/* Status badge */}
              {stack.is_active === false && !isDemoMode && (
                <div className="absolute top-3 right-3 badge badge-sm badge-ghost">Disabled</div>
              )}

              {/* Hover arrow */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}

          {/* Add new setup card */}
          <Link
            href="/dashboard/setups"
            className="rounded-2xl border-2 border-dashed border-base-300 p-5 flex flex-col items-center justify-center min-h-[200px] hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-base-200 group-hover:bg-primary/20 flex items-center justify-center mb-3 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-base-content/50 group-hover:text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-sm font-medium text-base-content/50 group-hover:text-primary">
              Add a setup
            </span>
          </Link>
        </div>
      )}

      {/* GLOBAL VIEW - Bonus Section */}
      {stacks.length > 0 && showGlobalView && (
        <div className="space-y-4">
          {/* Global Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
              <div className="text-3xl font-bold text-primary">{globalStats.totalSetups}</div>
              <div className="text-xs text-base-content/60">Setups</div>
            </div>
            <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
              <div className="text-3xl font-bold">{globalStats.totalProducts}</div>
              <div className="text-xs text-base-content/60">Products</div>
            </div>
            <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
              <div className={`text-3xl font-bold ${getScoreColor(globalStats.avgScore)}`}>
                {globalStats.avgScore || "—"}
              </div>
              <div className="text-xs text-base-content/60">Avg Score</div>
            </div>
            <div className="rounded-xl bg-base-200 border border-base-300 p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{globalStats.activeStacks}</div>
              <div className="text-xs text-base-content/60">Active</div>
            </div>
          </div>

          {/* Setup selector for globe */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-base-200 border border-base-300">
            <span className="text-sm font-medium">View on globe:</span>
            <select
              className="select select-sm select-bordered flex-1 max-w-xs"
              value={selectedStackForGlobe?.id || ""}
              onChange={(e) => {
                const stack = stacks.find(s => s.id === parseInt(e.target.value));
                setSelectedStackForGlobe(stack);
              }}
            >
              <option value="">Select a setup</option>
              {stacks.map((stack, index) => (
                <option key={stack.id} value={stack.id}>
                  Setup {index + 1}: {stack.name} ({stack.productDetails?.length || 0} products)
                </option>
              ))}
            </select>
            <Link
              href="/dashboard/my-stack-map"
              className="btn btn-sm btn-ghost gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              Fullscreen
            </Link>
          </div>

          {/* Globe */}
          {selectedStackForGlobe ? (
            <div className="rounded-2xl overflow-hidden border border-base-300">
              <StackGlobe3D
                setupId={selectedStackForGlobe.id}
                setup={selectedStackForGlobe}
                height="400px"
                showStats={false}
                autoRotate={true}
                showSetupBubble={true}
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-base-300 p-12 text-center">
              <div className="text-6xl mb-4">🌍</div>
              <h3 className="text-lg font-semibold mb-2">3D Globe View</h3>
              <p className="text-base-content/60 text-sm mb-4">
                Select a setup to view on the interactive globe
              </p>
            </div>
          )}

          {/* Back to setups */}
          <button
            onClick={() => setShowGlobalView(false)}
            className="btn btn-ghost btn-sm gap-2 mx-auto flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Retour aux setups
          </button>
        </div>
      )}
    </div>
  );
}
