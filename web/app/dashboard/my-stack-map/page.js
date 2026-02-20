"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DOMPurify from "isomorphic-dompurify";

// Security: Sanitize text to prevent XSS
function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

// Security: Validate setup ID (must be positive integer)
function isValidSetupId(id) {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

// Dynamically import map components to avoid SSR issues
const StackGlobe3D = dynamic(() => import("@/components/StackGlobe3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg text-cyan-500"></span>
        <p className="mt-4 text-slate-400">Loading 3D Globe...</p>
      </div>
    </div>
  ),
});

const StackMap = dynamic(() => import("@/components/StackMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-slate-950">
      <span className="loading loading-spinner loading-lg text-cyan-500"></span>
    </div>
  ),
});

// ============================================
// FILTER CHIP COMPONENT
// ============================================
function FilterChip({ label, active, onClick, count, color = "slate" }) {
  const colorClasses = {
    slate: active ? "bg-slate-600 text-white border-slate-500" : "bg-slate-900/50 text-slate-400 border-slate-700/50",
    emerald: active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-slate-900/50 text-slate-400 border-slate-700/50",
    blue: active ? "bg-blue-500/20 text-blue-400 border-blue-500/50" : "bg-slate-900/50 text-slate-400 border-slate-700/50",
    amber: active ? "bg-amber-500/20 text-amber-400 border-amber-500/50" : "bg-slate-900/50 text-slate-400 border-slate-700/50",
    purple: active ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-slate-900/50 text-slate-400 border-slate-700/50",
    cyan: active ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-slate-900/50 text-slate-400 border-slate-700/50",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 hover:bg-slate-800/50 ${colorClasses[color]}`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-white/20' : 'bg-slate-700/50'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================
function StatCard({ icon, value, label, color = "slate", trend }) {
  const colorClasses = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
    red: "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400",
    slate: "from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color].split(' ').pop()}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

// ============================================
// PRODUCT TYPE ICONS
// ============================================
const PRODUCT_TYPE_CONFIG = {
  wallet: { icon: "💰", label: "Wallets", color: "emerald" },
  hardware_wallet: { icon: "🔐", label: "Hardware", color: "amber" },
  software_wallet: { icon: "💻", label: "Software", color: "blue" },
  exchange: { icon: "🏦", label: "Exchanges", color: "purple" },
  defi: { icon: "🌐", label: "DeFi", color: "cyan" },
  layer2: { icon: "⚡", label: "Layer 2", color: "amber" },
  blockchain: { icon: "⛓️", label: "Blockchain", color: "slate" },
  default: { icon: "📦", label: "Other", color: "slate" },
};

export default function MyStackMapPage() {
  const { data: session, status } = useSession();
  const [setups, setSetups] = useState([]);
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("3d");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Advanced filters
  const [filterByProductType, setFilterByProductType] = useState(null);
  const [filterByCountry, setFilterByCountry] = useState(null);
  const [filterByRole, setFilterByRole] = useState(null); // 'wallet' | 'other' | null
  const [showIncidents, setShowIncidents] = useState(true);
  const [highlightWallets, setHighlightWallets] = useState(true);

  // Stack map data
  const [stackMapData, setStackMapData] = useState(null);

  // Fetch user's setups
  useEffect(() => {
    if (status === "authenticated") {
      fetchSetups();
    }
  }, [status]);

  // Fetch stack map data when setup changes
  useEffect(() => {
    if (selectedSetup && isValidSetupId(selectedSetup.id)) {
      fetchStackMapData(selectedSetup.id);
    }
  }, [selectedSetup]);

  const fetchSetups = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/setups");
      const result = await response.json();

      if (result.success && result.setups) {
        setSetups(result.setups);
        if (result.setups.length > 0) {
          setSelectedSetup(result.setups[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching setups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStackMapData = async (setupId) => {
    try {
      const response = await fetch(`/api/stack/map?setupId=${setupId}`);
      const result = await response.json();
      if (result.success) {
        setStackMapData(result.data);
      }
    } catch (error) {
      console.error("Error fetching stack map data:", error);
    }
  };

  // Handle setup selection
  const handleSetupChange = (setupId) => {
    const parsedId = parseInt(setupId, 10);
    if (!isValidSetupId(parsedId)) return;
    const setup = setups.find((s) => s.id === parsedId);
    if (setup) {
      setSelectedSetup(setup);
      // Reset filters on setup change
      setFilterByProductType(null);
      setFilterByCountry(null);
      setFilterByRole(null);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Calculate stats from stack data
  const stackStats = useMemo(() => {
    if (!stackMapData?.products) return null;

    const products = stackMapData.products;
    const countries = new Set(products.map(p => p.country_origin).filter(Boolean));
    const types = products.reduce((acc, p) => {
      const type = p.type_name || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const walletCount = products.filter(p => p.role === 'wallet').length;
    const avgScore = products.length > 0
      ? products.reduce((sum, p) => sum + (p.note_finale || 0), 0) / products.length
      : 0;

    return {
      totalProducts: products.length,
      totalCountries: countries.size,
      walletCount,
      avgScore: avgScore.toFixed(1),
      typeDistribution: types,
      countries: Array.from(countries),
    };
  }, [stackMapData]);

  // Get available product types for filter
  const availableProductTypes = useMemo(() => {
    if (!stackMapData?.products) return [];
    const types = new Map();
    stackMapData.products.forEach(p => {
      const typeName = p.type_name || 'other';
      if (!types.has(typeName)) {
        types.set(typeName, { name: typeName, count: 1 });
      } else {
        types.get(typeName).count++;
      }
    });
    return Array.from(types.values());
  }, [stackMapData]);

  // Get available countries for filter
  const availableCountries = useMemo(() => {
    if (!stackMapData?.products) return [];
    const countries = new Map();
    stackMapData.products.forEach(p => {
      const country = p.country_origin;
      if (country && !countries.has(country)) {
        countries.set(country, { code: country, count: 1 });
      } else if (country) {
        countries.get(country).count++;
      }
    });
    return Array.from(countries.values());
  }, [stackMapData]);

  // Filtered product IDs based on active filters
  const filteredProductIds = useMemo(() => {
    if (!stackMapData?.products) return null;

    let filtered = stackMapData.products;

    if (filterByProductType) {
      filtered = filtered.filter(p => (p.type_name || 'other') === filterByProductType);
    }

    if (filterByCountry) {
      filtered = filtered.filter(p => p.country_origin === filterByCountry);
    }

    if (filterByRole) {
      filtered = filtered.filter(p => p.role === filterByRole);
    }

    // If no filters active, return null (show all)
    if (!filterByProductType && !filterByCountry && !filterByRole) {
      return null;
    }

    return filtered.map(p => p.id);
  }, [stackMapData, filterByProductType, filterByCountry, filterByRole]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterByProductType(null);
    setFilterByCountry(null);
    setFilterByRole(null);
  }, []);

  const hasActiveFilters = filterByProductType || filterByCountry || filterByRole;

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-cyan-500"></div>
          <p className="mt-4 text-slate-400">Loading your stacks...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="max-w-md p-8 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
          <p className="text-slate-400 mb-6">Access your personalized stack map by signing in.</p>
          <Link href="/signin" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Fullscreen mode
  if (isFullscreen && viewMode === "3d" && selectedSetup && isValidSetupId(selectedSetup.id)) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950">
        <StackGlobe3D
          setupId={selectedSetup.id}
          height="100vh"
          showStats={true}
          autoRotate={true}
          filteredProductIds={filteredProductIds}
          highlightWallets={highlightWallets}
        />
        {/* Floating controls */}
        <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 relative">
      {/* ============================================ */}
      {/* SIDEBAR */}
      {/* ============================================ */}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 z-40
          w-80 bg-slate-950/95 backdrop-blur-xl
          border-r border-slate-800/50
          transform transition-all duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          overflow-y-auto
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-white">My Stack Globe</h1>
                <p className="text-xs text-slate-500">Personalized view</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Setup Selector */}
        {setups.length > 0 && (
          <div className="p-4 border-b border-slate-800/30">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Select Stack
            </label>
            <select
              className="w-full select select-sm bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50"
              value={selectedSetup?.id || ""}
              onChange={(e) => handleSetupChange(e.target.value)}
            >
              {setups.filter(setup => isValidSetupId(setup.id)).map((setup) => (
                <option key={setup.id} value={setup.id}>
                  {sanitizeText(setup.name) || "Unnamed Stack"} ({Array.isArray(setup.products) ? setup.products.length : 0})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stats Grid */}
        {stackStats && (
          <div className="p-4 border-b border-slate-800/30">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Stack Stats</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon="📦" value={stackStats.totalProducts} label="Products" color="blue" />
              <StatCard icon="🌍" value={stackStats.totalCountries} label="Countries" color="emerald" />
              <StatCard icon="💰" value={stackStats.walletCount} label="Wallets" color="amber" />
              <StatCard icon="⭐" value={stackStats.avgScore} label="Avg Score" color="cyan" />
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* ADVANCED FILTERS */}
        {/* ============================================ */}
        <div className="p-4 border-b border-slate-800/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              Filters
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter by Role */}
          <div className="mb-4">
            <label className="text-xs text-slate-400 mb-2 block">By Role</label>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All"
                active={!filterByRole}
                onClick={() => setFilterByRole(null)}
              />
              <FilterChip
                label="Wallets"
                active={filterByRole === 'wallet'}
                onClick={() => setFilterByRole(filterByRole === 'wallet' ? null : 'wallet')}
                color="emerald"
                count={stackStats?.walletCount}
              />
              <FilterChip
                label="Other"
                active={filterByRole === 'other'}
                onClick={() => setFilterByRole(filterByRole === 'other' ? null : 'other')}
                color="blue"
                count={stackStats ? stackStats.totalProducts - stackStats.walletCount : 0}
              />
            </div>
          </div>

          {/* Filter by Product Type */}
          {availableProductTypes.length > 0 && (
            <div className="mb-4">
              <label className="text-xs text-slate-400 mb-2 block">By Type</label>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="All"
                  active={!filterByProductType}
                  onClick={() => setFilterByProductType(null)}
                />
                {availableProductTypes.map((type) => {
                  const config = PRODUCT_TYPE_CONFIG[type.name] || PRODUCT_TYPE_CONFIG.default;
                  return (
                    <FilterChip
                      key={type.name}
                      label={`${config.icon} ${config.label}`}
                      active={filterByProductType === type.name}
                      onClick={() => setFilterByProductType(filterByProductType === type.name ? null : type.name)}
                      color={config.color}
                      count={type.count}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter by Country */}
          {availableCountries.length > 1 && (
            <div>
              <label className="text-xs text-slate-400 mb-2 block">By Country</label>
              <select
                value={filterByCountry || ''}
                onChange={(e) => setFilterByCountry(e.target.value || null)}
                className="w-full select select-sm bg-slate-900/50 border-slate-700/50 text-white focus:border-cyan-500/50"
              >
                <option value="">All Countries ({availableCountries.length})</option>
                {availableCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code} ({country.count} product{country.count > 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Display Options */}
        <div className="p-4 border-b border-slate-800/30">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Display Options</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={highlightWallets}
                onChange={(e) => setHighlightWallets(e.target.checked)}
                className="toggle toggle-sm toggle-warning"
              />
              <span className={`text-sm transition-colors ${highlightWallets ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'}`}>
                Highlight wallets
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={showIncidents}
                onChange={(e) => setShowIncidents(e.target.checked)}
                className="toggle toggle-sm toggle-error"
              />
              <span className={`text-sm transition-colors ${showIncidents ? 'text-red-400' : 'text-slate-400 group-hover:text-white'}`}>
                Show incidents
              </span>
            </label>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              href="/map"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.893 13.393l-1.135-1.135a2.252 2.252 0 01-.421-.585l-1.08-2.16a.414.414 0 00-.663-.107.827.827 0 01-.812.21l-1.273-.363a.89.89 0 00-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 01-1.81 1.025 1.055 1.055 0 01-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 01-1.383-2.46l.007-.042a2.25 2.25 0 01.29-.787l.09-.15a2.25 2.25 0 012.37-1.048l1.178.236a1.125 1.125 0 001.302-.795l.208-.73a1.125 1.125 0 00-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 01-1.591.659h-.18c-.249 0-.487.1-.662.274a.931.931 0 01-1.458-1.137l1.411-2.353a2.25 2.25 0 00.286-.76m11.928 9.869A9 9 0 008.965 3.525m11.928 9.868A9 9 0 118.965 3.525" />
              </svg>
              <span className="text-sm">Explore Global Map</span>
            </Link>
            <Link
              href="/stack-builder"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm">Create New Stack</span>
            </Link>
            <Link
              href="/dashboard/setups"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span className="text-sm">Manage Stacks</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ============================================ */}
      {/* MOBILE HAMBURGER */}
      {/* ============================================ */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      {/* ============================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================ */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}>
        {/* Top Controls */}
        <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("2d")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "2d"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "3d"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              3D
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="Fullscreen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
        </div>

        {/* Filter indicator */}
        {hasActiveFilters && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            <span className="text-sm font-medium">
              Filters active: {filteredProductIds?.length || 0} products shown
            </span>
            <button onClick={clearFilters} className="text-xs hover:text-white">
              Clear
            </button>
          </div>
        )}

        {/* Map/Globe */}
        <div className="h-screen">
          {setups.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-md p-8 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-center">
                <div className="text-6xl mb-4">🌍</div>
                <h2 className="text-2xl font-bold text-white mb-2">No Stacks Found</h2>
                <p className="text-slate-400 mb-6">
                  Create your first stack to see it visualized on the globe.
                </p>
                <Link href="/stack-builder" className="btn btn-primary">
                  Build Your First Stack
                </Link>
              </div>
            </div>
          ) : selectedSetup && isValidSetupId(selectedSetup.id) ? (
            viewMode === "3d" ? (
              <StackGlobe3D
                setupId={selectedSetup.id}
                height="100vh"
                showStats={false}
                autoRotate={true}
                filteredProductIds={filteredProductIds}
                highlightWallets={highlightWallets}
                showIncidents={showIncidents}
              />
            ) : (
              <div className="h-full pt-16">
                <StackMap
                  setupId={selectedSetup.id}
                  filteredProductIds={filteredProductIds}
                  highlightWallets={highlightWallets}
                />
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-slate-400">Select a stack to view</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </main>
  );
}
