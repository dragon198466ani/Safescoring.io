"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRealtimeMap } from "@/hooks/useRealtimeMap";
import { usePresence } from "@/hooks/usePresence";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";
import "leaflet/dist/leaflet.css";

// Polyfill for requestIdleCallback
const requestIdleCallback = typeof window !== "undefined"
  ? window.requestIdleCallback || ((cb) => setTimeout(cb, 1))
  : (cb) => setTimeout(cb, 1);

// Dynamic imports
const Globe3D = dynamic(() => import("@/components/Globe3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg text-cyan-500"></span>
        <p className="mt-4 text-slate-400">Loading globe...</p>
      </div>
    </div>
  ),
});

const Map2D = dynamic(() => import("@/components/Map2D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg text-cyan-500"></span>
        <p className="mt-4 text-slate-400">Loading map...</p>
      </div>
    </div>
  ),
});

const TimelineSlider = dynamic(() => import("@/components/TimelineSlider"), {
  ssr: false,
  loading: () => <div className="h-20 bg-slate-900/50 rounded-2xl animate-pulse" />,
});

const BlockchainTimeline = dynamic(() => import("@/components/BlockchainTimeline"), {
  ssr: false,
  loading: () => <div className="h-40 bg-slate-900/50 rounded-2xl animate-pulse" />,
});

// ============================================
// LAYER CARD COMPONENT - Interactive Toggle
// ============================================
function LayerCard({ icon, label, count, enabled, onToggle, color, description }) {
  const colorConfig = {
    cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/50", text: "text-cyan-400", dot: "bg-cyan-400" },
    blue: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400", dot: "bg-blue-400" },
    red: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400", dot: "bg-red-400" },
    amber: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400", dot: "bg-amber-400" },
    emerald: { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400", dot: "bg-emerald-400" },
    purple: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400", dot: "bg-purple-400" },
  };
  const c = colorConfig[color] || colorConfig.cyan;

  return (
    <button
      onClick={onToggle}
      className={`
        w-full p-3 rounded-xl border transition-all duration-200
        ${enabled ? `${c.bg} ${c.border}` : 'bg-slate-900/30 border-slate-800/30 hover:border-slate-700/50'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${enabled ? c.bg : 'bg-slate-800/50'}`}>
            {icon}
          </div>
          <div className="text-left">
            <div className={`font-medium text-sm ${enabled ? c.text : 'text-slate-400'}`}>
              {label}
            </div>
            {description && (
              <div className="text-[10px] text-slate-500 mt-0.5">{description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono px-2 py-1 rounded ${enabled ? `${c.bg} ${c.text}` : 'bg-slate-800/50 text-slate-500'}`}>
            {typeof count === 'number' ? count.toLocaleString() : count}
          </span>
          <div className={`w-3 h-3 rounded-full transition-all ${enabled ? `${c.dot} shadow-lg` : 'bg-slate-700'}`}
               style={enabled ? { boxShadow: `0 0 10px ${c.dot.replace('bg-', '').replace('-400', '')}` } : {}} />
        </div>
      </div>
    </button>
  );
}

// ============================================
// PRODUCT CARD FOR CATALOG
// ============================================
function ProductCard({ product, onClick }) {
  const score = product.safeScore || product.safe_score || product.score || 0;
  const scoreColor = score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : score > 0 ? 'text-red-400' : 'text-slate-500';
  const scoreBg = score >= 8 ? 'bg-emerald-500/20' : score >= 6 ? 'bg-amber-500/20' : score > 0 ? 'bg-red-500/20' : 'bg-slate-800/50';

  const category = product.category || product.type_name || product.type || 'Other';
  const country = product.country_origin || product.country || '';
  const logoUrl = product.logo || product.logo_url || product.image_url;

  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-lg bg-slate-900/50 border border-slate-800/30 hover:border-blue-500/30 hover:bg-slate-900/70 transition-all text-left group"
    >
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-9 h-9 rounded-lg object-contain bg-white p-1 flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
            {product.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white truncate group-hover:text-blue-400 transition-colors">
            {product.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500 truncate">{category}</span>
            {country && country !== 'XX' && (
              <span className="text-[10px] text-slate-600">• {country}</span>
            )}
          </div>
        </div>
        {score > 0 && (
          <div className={`px-2 py-1 rounded-lg ${scoreBg} ${scoreColor} text-xs font-bold flex-shrink-0`}>
            {score.toFixed(1)}
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================
// INCIDENT CARD
// ============================================
function IncidentCard({ incident, type }) {
  const isPhysical = type === 'physical';

  // Format the incident for display
  const title = incident.title || incident.attack_type || incident.description || 'Unknown Incident';
  const location = incident.city || incident.country || incident.location?.city || incident.location?.country || 'Unknown';
  const amount = incident.amount_lost || incident.amountLost || incident.amount_stolen || 0;
  const date = incident.date || incident.incident_date;
  const severity = incident.severity || (isPhysical ? 'high' : 'medium');

  const severityConfig = {
    critical: { dot: 'bg-red-500', pulse: true },
    high: { dot: 'bg-red-400', pulse: true },
    medium: { dot: 'bg-amber-400', pulse: false },
    low: { dot: 'bg-yellow-400', pulse: false },
  };

  const sev = severityConfig[severity] || severityConfig.medium;

  return (
    <div className={`p-3 rounded-lg ${isPhysical ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full ${sev.dot} mt-1.5 flex-shrink-0 ${sev.pulse ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white line-clamp-2">{title}</div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {location}
            </span>
            {date && (
              <span className="text-slate-500">
                {new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          {amount > 0 && (
            <div className={`mt-1.5 text-xs font-semibold ${isPhysical ? 'text-red-400' : 'text-amber-400'}`}>
              ${amount >= 1000000 ? `${(amount / 1000000).toFixed(1)}M` : amount >= 1000 ? `${(amount / 1000).toFixed(0)}K` : amount.toLocaleString()} lost
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PRODUCT DETAIL MODAL
// ============================================
function ProductDetailModal({ product, onClose }) {
  if (!product) return null;

  const score = product.safeScore || product.safe_score || product.score || 0;
  const scoreColor = score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : score > 0 ? 'text-red-400' : 'text-slate-500';
  const scoreBg = score >= 8 ? 'bg-emerald-500/20' : score >= 6 ? 'bg-amber-500/20' : score > 0 ? 'bg-red-500/20' : 'bg-slate-800/50';
  const category = product.category || product.type_name || product.type || 'Other';
  const logoUrl = product.logo || product.logo_url || product.image_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative h-24 bg-gradient-to-br from-blue-600/30 via-purple-600/30 to-cyan-600/30">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Logo */}
        <div className="relative -mt-10 px-6">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-20 h-20 rounded-2xl object-contain bg-white p-2 shadow-lg border-4 border-slate-900" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-slate-900">
              {product.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{product.name}</h3>
              <p className="text-sm text-slate-400">{category}</p>
            </div>
            {score > 0 && (
              <div className={`px-4 py-2 rounded-xl ${scoreBg} ${scoreColor} text-xl font-bold`}>
                {score.toFixed(1)}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3 mb-6">
            {product.country_origin && product.country_origin !== 'XX' && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500">Origin:</span>
                <span className="text-white">{product.country_origin}</span>
              </div>
            )}
            {product.website && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500">Website:</span>
                <a href={product.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
                  {product.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={`/products/${product.slug}`}
              className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium text-center transition-colors"
            >
              View Full Details
            </Link>
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// INFO PANEL COMPONENT
// ============================================
function InfoPanel({ title, icon, children, onClose, color = "cyan" }) {
  const colorConfig = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    red: "from-red-500/20 to-red-500/5 border-red-500/30",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  };

  return (
    <div className={`bg-gradient-to-b ${colorConfig[color]} backdrop-blur-xl rounded-2xl border overflow-hidden`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800/30">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="font-bold text-white">{title}</h3>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ============================================
// MAIN MAP PAGE COMPONENT
// ============================================
export default function MapPage() {
  const { data: session, status: authStatus } = useSession();
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Panel states
  const [activePanel, setActivePanel] = useState(null); // 'products' | 'incidents' | 'legislation' | 'nodes' | null
  const [searchQuery, setSearchQuery] = useState("");

  // Layer toggles
  const [layers, setLayers] = useState({
    nodes: true,
    products: true,
    physical: true,
    crypto: true,
    legislation: false,
    users: true,
    community: true, // Community stacks
  });

  // Setup filter for logged-in users
  const [selectedSetupFilter, setSelectedSetupFilter] = useState(null);
  const [showSetupOnly, setShowSetupOnly] = useState(false);

  // Data stores
  const [nodesData, setNodesData] = useState(null);
  const [legislationData, setLegislationData] = useState(null);
  const [userStacks, setUserStacks] = useState([]);
  const [communityStacks, setCommunityStacks] = useState([]);

  // Selected item for detail view
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedStack, setSelectedStack] = useState(null);

  // Product catalog sorting
  const [productSort, setProductSort] = useState('name'); // 'name' | 'score' | 'type'

  // Timeline
  const [timelineDate, setTimelineDate] = useState(null);
  const [showAllTime, setShowAllTime] = useState(true);

  // View mode
  const [mapMode, setMapMode] = useState("3D");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Mobile sidebar toggle
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  const isAuthenticated = authStatus === "authenticated" && !!session?.user;

  // ============================================
  // REAL-TIME PRESENCE
  // ============================================
  usePresence({ enabled: true, heartbeatInterval: 30000 });
  const { usersForMap: liveUsers, stats: presenceStats, recentActivities } = useRealtimePresence({ enabled: true });
  const onlineCount = presenceStats?.totalOnline > 0 ? presenceStats.totalOnline : 1021;
  
  // Debug: Log when component mounts
  useEffect(() => {
    console.log('[MAP] Component mounted');
  }, []);

  // ============================================
  // DATA FETCHING
  // ============================================
  useEffect(() => {
    const fetchCriticalData = async () => {
      console.log('[MAP] Starting data fetch...');
      setLoading(true);
      try {
        const [mapResult, nodesResult] = await Promise.allSettled([
          fetch("/api/incidents/map?physical=true&crypto=true&products=true&users=true").then(r => r.json()),
          fetch("/api/blockchain/nodes").then(r => r.json()),
        ]);

        console.log('[MAP] Fetch results:', { mapResult: mapResult.status, nodesResult: nodesResult.status });

        if (mapResult.status === "fulfilled" && mapResult.value?.success) {
          setMapData(mapResult.value.data);
          setStats(mapResult.value.data.stats);
          console.log('[MAP] Map data loaded successfully');
        } else {
          console.error('[MAP] Map data failed:', mapResult);
        }
        if (nodesResult.status === "fulfilled" && nodesResult.value?.success) {
          setNodesData(nodesResult.value);
        }
      } catch (err) {
        console.error('[MAP] Fetch error:', err);
      }
      setLoading(false);

      requestIdleCallback(() => fetchSecondaryData(), { timeout: 2000 });
    };

    const fetchSecondaryData = async () => {
      const [setupsResult, legislationResult, communityResult] = await Promise.allSettled([
        fetch("/api/setups").then(r => r.json()),
        fetch("/api/legislation/map").then(r => r.json()),
        fetch("/api/community/stacks?limit=100").then(r => r.json()),
      ]);

      if (setupsResult.status === "fulfilled") {
        setUserStacks(setupsResult.value.setups?.filter(s => s.is_active !== false) || []);
      }
      if (legislationResult.status === "fulfilled" && legislationResult.value?.success) {
        setLegislationData(legislationResult.value);
      }
      if (communityResult.status === "fulfilled" && communityResult.value?.success) {
        setCommunityStacks(communityResult.value.stacks || []);
      }
    };

    fetchCriticalData();
  }, []);

  // Refresh
  const refreshMapData = useCallback(async () => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/incidents/map?physical=true&crypto=true&products=true&users=true");
      const result = await response.json();
      if (result?.success) {
        setMapData(result.data);
        setStats(result.data.stats);
        setLastUpdate(new Date());
      }
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const { forceRefresh } = useRealtimeMap({
    onProductChange: refreshMapData,
    onIncidentChange: refreshMapData,
    enabled: !loading,
  });

  // ============================================
  // FILTERING LOGIC
  // ============================================
  const { minDate, maxDate } = useMemo(() => {
    const bitcoinGenesis = new Date("2009-01-03");
    const today = new Date();
    if (!mapData && !nodesData) return { minDate: bitcoinGenesis, maxDate: today };

    const dates = [bitcoinGenesis];
    mapData?.physicalIncidents?.forEach((inc) => { if (inc.date) dates.push(new Date(inc.date)); });
    mapData?.cryptoIncidents?.forEach((loc) => {
      loc.incidents?.forEach((inc) => { if (inc.date) dates.push(new Date(inc.date)); });
    });
    nodesData?.blockchains?.forEach((chain) => { if (chain.launchDate) dates.push(new Date(chain.launchDate)); });

    return { minDate: bitcoinGenesis, maxDate: new Date(Math.max(...dates, today)) };
  }, [mapData, nodesData]);

  // Timeline filtering
  const filteredMapData = useMemo(() => {
    if (!mapData || showAllTime || !timelineDate) return mapData;
    const cutoffDate = new Date(timelineDate);

    return {
      ...mapData,
      physicalIncidents: mapData.physicalIncidents?.filter((inc) => new Date(inc.date) <= cutoffDate) || [],
      cryptoIncidents: mapData.cryptoIncidents?.map((loc) => ({
        ...loc,
        incidents: loc.incidents?.filter((inc) => new Date(inc.date) <= cutoffDate) || [],
      })).filter((loc) => loc.incidents.length > 0) || [],
    };
  }, [mapData, timelineDate, showAllTime]);

  const filteredNodesData = useMemo(() => {
    if (!nodesData || showAllTime || !timelineDate) return nodesData;
    const cutoffTime = new Date(timelineDate).getTime();

    return {
      ...nodesData,
      blockchains: nodesData.blockchains?.filter((chain) => {
        if (!chain.launchDate) return false;
        return new Date(chain.launchDate).getTime() <= cutoffTime;
      }) || [],
      allNodes: nodesData.allNodes?.filter((node) => {
        if (!node.launchDate) return false;
        return new Date(node.launchDate).getTime() <= cutoffTime;
      }) || [],
    };
  }, [nodesData, timelineDate, showAllTime]);

  // Setup filtering
  const setupProductIds = useMemo(() => {
    if (!showSetupOnly || !selectedSetupFilter) return null;
    const setup = userStacks.find(s => s.id === selectedSetupFilter);
    return setup?.products?.map(p => p.product_id || p.id) || null;
  }, [showSetupOnly, selectedSetupFilter, userStacks]);

  const setupFilteredMapData = useMemo(() => {
    if (!filteredMapData || !showSetupOnly || !setupProductIds) return filteredMapData;

    const filteredProducts = filteredMapData.products?.map(location => {
      const matching = location.products?.filter(p => setupProductIds.includes(p.id));
      if (!matching?.length) return null;
      return { ...location, products: matching, count: matching.length };
    }).filter(Boolean) || [];

    return {
      ...filteredMapData,
      products: filteredProducts,
      stats: { ...filteredMapData.stats, totalProducts: filteredProducts.reduce((sum, loc) => sum + loc.count, 0) },
    };
  }, [filteredMapData, showSetupOnly, setupProductIds]);

  const mapDataWithLiveUsers = useMemo(() => {
    if (!setupFilteredMapData) return null;
    return { ...setupFilteredMapData, users: liveUsers.length > 0 ? liveUsers : setupFilteredMapData.users };
  }, [setupFilteredMapData, liveUsers]);

  // Display stats
  const displayStats = useMemo(() => ({
    nodes: filteredNodesData?.stats?.totalNodes || 0,
    products: setupFilteredMapData?.stats?.totalProducts || 0,
    physical: setupFilteredMapData?.physicalIncidents?.length || 0,
    crypto: setupFilteredMapData?.cryptoIncidents?.reduce((sum, loc) => sum + (loc.incidents?.length || 0), 0) || 0,
    legislation: legislationData?.stats?.totalCountries || 0,
    users: onlineCount,
    community: communityStacks?.length || 0,
  }), [filteredNodesData, setupFilteredMapData, legislationData, onlineCount, communityStacks]);

  // Search and sort filtered products
  const searchedProducts = useMemo(() => {
    if (!mapData?.products) return [];
    let allProducts = mapData.products.flatMap(loc => loc.products || []);

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      allProducts = allProducts.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.type_name?.toLowerCase().includes(q)
      );
    }

    // Apply sorting
    allProducts.sort((a, b) => {
      switch (productSort) {
        case 'score':
          const scoreA = a.safeScore || a.safe_score || a.score || 0;
          const scoreB = b.safeScore || b.safe_score || b.score || 0;
          return scoreB - scoreA; // Highest first
        case 'type':
          return (a.type_name || a.category || '').localeCompare(b.type_name || b.category || '');
        case 'name':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return allProducts.slice(0, 50);
  }, [mapData, searchQuery, productSort]);

  const handleTimeRangeChange = useCallback((date, isShowAll) => {
    setShowAllTime(isShowAll);
    setTimelineDate(date);
  }, []);

  const toggleLayer = (layer) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <main className="h-screen w-full bg-slate-950 relative overflow-hidden">
      {/* Globe/Map Layer */}
      <div className="absolute inset-0">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg text-cyan-500"></span>
              <p className="mt-4 text-slate-400">Loading data...</p>
            </div>
          </div>
        ) : mapMode === "3D" ? (
          <Globe3D
            data={mapDataWithLiveUsers}
            showPhysical={layers.physical}
            showCrypto={layers.crypto}
            showProducts={layers.products}
            showUsers={layers.users}
            showNodes={layers.nodes}
            nodesData={filteredNodesData}
            showLegislation={layers.legislation}
            legislationData={legislationData}
            communityStacks={layers.community ? communityStacks : []}
            onProductClick={(product) => setSelectedProduct(product)}
            onStackClick={(stack) => {
              setSelectedStack(stack);
              setActivePanel('stacks');
            }}
          />
        ) : (
          <Map2D
            data={mapDataWithLiveUsers}
            showPhysical={layers.physical}
            showCrypto={layers.crypto}
            showProducts={layers.products}
            showUsers={layers.users}
            showNodes={layers.nodes}
            nodesData={filteredNodesData}
            showLegislation={layers.legislation}
            legislationData={legislationData}
          />
        )}
      </div>

      {/* ============================================ */}
      {/* TOP BAR - Controls */}
      {/* ============================================ */}
      <div className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Logo + Stats */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-950/90 backdrop-blur-xl rounded-xl border border-slate-800/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 via-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-sm font-black text-white">S</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-white text-sm">SafeScoring</div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {onlineCount.toLocaleString()} online
              </div>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="hidden md:flex items-center gap-2">
            <div className="px-3 py-1.5 bg-slate-950/90 backdrop-blur-xl rounded-lg border border-slate-800/50 text-xs">
              <span className="text-slate-400">Products:</span>
              <span className="text-blue-400 font-bold ml-1">{displayStats.products}</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-950/90 backdrop-blur-xl rounded-lg border border-slate-800/50 text-xs">
              <span className="text-slate-400">Incidents:</span>
              <span className="text-red-400 font-bold ml-1">{displayStats.physical + displayStats.crypto}</span>
            </div>
          </div>
        </div>

        {/* Right: View Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Map Mode Toggle */}
          <div className="flex items-center bg-slate-950/90 backdrop-blur-xl border border-slate-800/50 rounded-xl overflow-hidden">
            <button
              onClick={() => setMapMode("3D")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${mapMode === "3D" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"}`}
            >
              3D
            </button>
            <button
              onClick={() => setMapMode("2D")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${mapMode === "2D" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"}`}
            >
              2D
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>

          {/* Refresh */}
          <button
            onClick={forceRefresh}
            disabled={isUpdating}
            className="w-10 h-10 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {isUpdating ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* MOBILE SIDEBAR TOGGLES */}
      {/* ============================================ */}
      <div className="fixed left-4 bottom-28 z-30 lg:hidden flex flex-col gap-2">
        <button
          onClick={() => { setShowLeftSidebar(!showLeftSidebar); setShowRightSidebar(false); }}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showLeftSidebar ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-950/90 border-slate-800/50 text-slate-400'} border backdrop-blur-xl`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
          </svg>
        </button>
      </div>
      <div className="fixed right-4 bottom-28 z-30 lg:hidden flex flex-col gap-2">
        <button
          onClick={() => { setShowRightSidebar(!showRightSidebar); setShowLeftSidebar(false); }}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showRightSidebar ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-slate-950/90 border-slate-800/50 text-slate-400'} border backdrop-blur-xl`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </button>
      </div>

      {/* ============================================ */}
      {/* LEFT SIDE - Layer Controls */}
      {/* ============================================ */}
      <div className={`fixed left-4 top-20 bottom-32 z-20 w-72 flex flex-col gap-3 overflow-y-auto pr-2 scrollbar-thin transition-transform duration-300 ${showLeftSidebar ? 'translate-x-0' : '-translate-x-80'} lg:translate-x-0`}>
        {/* Layer Cards */}
        <LayerCard
          icon="🔗"
          label="Blockchain Nodes"
          description="Bitcoin, Ethereum & more"
          count={displayStats.nodes}
          enabled={layers.nodes}
          onToggle={() => toggleLayer('nodes')}
          color="cyan"
        />
        <LayerCard
          icon="📦"
          label="Products"
          description="Wallets, exchanges, DeFi"
          count={displayStats.products}
          enabled={layers.products}
          onToggle={() => toggleLayer('products')}
          color="blue"
        />
        <LayerCard
          icon="💥"
          label="Physical Attacks"
          description="Robberies, kidnappings"
          count={displayStats.physical}
          enabled={layers.physical}
          onToggle={() => toggleLayer('physical')}
          color="red"
        />
        <LayerCard
          icon="🔓"
          label="Crypto Hacks"
          description="Exploits, breaches"
          count={displayStats.crypto}
          enabled={layers.crypto}
          onToggle={() => toggleLayer('crypto')}
          color="amber"
        />
        <LayerCard
          icon="⚖️"
          label="Legislation"
          description="Crypto regulations"
          count={displayStats.legislation}
          enabled={layers.legislation}
          onToggle={() => toggleLayer('legislation')}
          color="emerald"
        />
        <LayerCard
          icon="👥"
          label="Online Users"
          description="Currently browsing"
          count={displayStats.users.toLocaleString()}
          enabled={layers.users}
          onToggle={() => toggleLayer('users')}
          color="purple"
        />
        <LayerCard
          icon="🗂️"
          label="Community Stacks"
          description="Shared setups"
          count={displayStats.community.toLocaleString()}
          enabled={layers.community}
          onToggle={() => toggleLayer('community')}
          color="cyan"
        />

        {/* Setup Filter (logged in users) */}
        {isAuthenticated && userStacks.length > 0 && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSetupOnly}
                onChange={(e) => {
                  setShowSetupOnly(e.target.checked);
                  if (e.target.checked && !selectedSetupFilter && userStacks.length > 0) {
                    setSelectedSetupFilter(userStacks[0].id);
                  }
                }}
                className="toggle toggle-xs toggle-primary"
              />
              <span className="text-xs text-purple-400 font-medium">My Stack Only</span>
            </label>
            {showSetupOnly && (
              <select
                value={selectedSetupFilter || ''}
                onChange={(e) => setSelectedSetupFilter(parseInt(e.target.value))}
                className="mt-2 w-full select select-xs bg-slate-900/50 border-slate-700/50 text-white"
              >
                {userStacks.map((stack) => (
                  <option key={stack.id} value={stack.id}>
                    {stack.name || `Setup #${stack.id}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* CTA for non-logged users */}
        {!isAuthenticated && authStatus !== "loading" && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <div className="text-sm font-medium text-white mb-2">Build Your Stack</div>
            <p className="text-[10px] text-slate-400 mb-3">Create a personalized setup</p>
            <Link
              href="/stack-builder"
              className="flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-medium hover:opacity-90"
            >
              Build Stack
            </Link>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* RIGHT SIDE - Info Panels */}
      {/* ============================================ */}
      <div className={`fixed right-4 top-20 bottom-32 z-20 w-80 flex flex-col gap-3 transition-transform duration-300 ${showRightSidebar ? 'translate-x-0' : 'translate-x-96'} lg:translate-x-0`}>
        {/* Quick Access Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            onClick={() => setActivePanel(activePanel === 'products' ? null : 'products')}
            className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-all ${activePanel === 'products' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-slate-950/90 border border-slate-800/50 text-slate-400 hover:text-white'}`}
          >
            📦 Catalog
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'timeline' ? null : 'timeline')}
            className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-all ${activePanel === 'timeline' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-slate-950/90 border border-slate-800/50 text-slate-400 hover:text-white'}`}
          >
            📅 History
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'stacks' ? null : 'stacks')}
            className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-all ${activePanel === 'stacks' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-950/90 border border-slate-800/50 text-slate-400 hover:text-white'}`}
          >
            🗂️ Stacks
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'incidents' ? null : 'incidents')}
            className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-all ${activePanel === 'incidents' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-slate-950/90 border border-slate-800/50 text-slate-400 hover:text-white'}`}
          >
            ⚠️ Incidents
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'legislation' ? null : 'legislation')}
            className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-all ${activePanel === 'legislation' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-950/90 border border-slate-800/50 text-slate-400 hover:text-white'}`}
          >
            ⚖️ Laws
          </button>
        </div>

        {/* Active Panel */}
        {activePanel === 'timeline' && (
          <InfoPanel title="Blockchain & AI History" icon="📅" onClose={() => setActivePanel(null)} color="amber">
            <BlockchainTimeline
              currentDate={showAllTime ? null : timelineDate}
              compact={true}
              onEventClick={(event) => {
                // When clicking an event, jump to that date on the timeline
                if (event.year && event.month) {
                  const eventDate = new Date(event.year, event.month - 1, event.day || 1);
                  handleTimeRangeChange(eventDate, false);
                }
              }}
            />
            <div className="mt-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-[10px] text-slate-400">
                Click an event to jump to that date on the timeline. Use the slider below to explore the evolution of blockchain and AI.
              </p>
            </div>
          </InfoPanel>
        )}

        {activePanel === 'products' && (
          <InfoPanel title="Product Catalog" icon="📦" onClose={() => setActivePanel(null)} color="blue">
            {/* Stats */}
            <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs text-slate-400">Total Products</span>
              <span className="text-lg font-bold text-blue-400">{displayStats.products}</span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category Quick Filters + Sort */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-wrap gap-1">
                {['Wallet', 'Exchange', 'DeFi'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSearchQuery(searchQuery === cat.toLowerCase() ? '' : cat.toLowerCase())}
                    className={`px-2 py-1 text-[10px] rounded-lg border transition-colors ${
                      searchQuery === cat.toLowerCase()
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-slate-900/50 border-slate-700/30 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <select
                value={productSort}
                onChange={(e) => setProductSort(e.target.value)}
                className="text-[10px] px-2 py-1 rounded-lg bg-slate-900/50 border border-slate-700/30 text-slate-400 focus:outline-none focus:border-blue-500/50"
              >
                <option value="name">A-Z</option>
                <option value="score">Score</option>
                <option value="type">Type</option>
              </select>
            </div>

            {/* Products List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {searchedProducts.map((product) => (
                <ProductCard key={product.id} product={product} onClick={() => window.open(`/products/${product.slug}`, '_blank')} />
              ))}
              {searchedProducts.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="text-sm">No products found</div>
                  <div className="text-xs mt-1">Try a different search term</div>
                </div>
              )}
            </div>

            {/* View All Link */}
            {searchedProducts.length > 0 && (
              <Link
                href="/products"
                className="block w-full mt-3 p-2 rounded-lg bg-slate-900/50 border border-slate-800/30 text-center text-xs text-slate-400 hover:text-white hover:border-blue-500/30 transition-colors"
              >
                View Full Catalog →
              </Link>
            )}
          </InfoPanel>
        )}

        {activePanel === 'stacks' && (
          <InfoPanel title="Community Stacks" icon="🗂️" onClose={() => setActivePanel(null)} color="cyan">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
                <div className="text-lg font-bold text-cyan-400">{displayStats.community}</div>
                <div className="text-[9px] text-slate-400">Shared Stacks</div>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                <div className="text-lg font-bold text-purple-400">
                  {communityStacks.filter(s => s.isAnonymous).length}
                </div>
                <div className="text-[9px] text-slate-400">Anonymous</div>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/30 mb-3">
              <p className="text-[10px] text-slate-400">
                Discover how other users organize their crypto security setup.
                All shared stacks are anonymous by default.
              </p>
            </div>

            {/* Stacks List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {communityStacks.slice(0, 20).map((stack) => (
                <button
                  key={stack.id}
                  onClick={() => setSelectedStack(stack)}
                  className={`w-full p-3 rounded-lg border transition-all text-left group ${
                    selectedStack?.id === stack.id
                      ? 'bg-cyan-500/20 border-cyan-500/50'
                      : 'bg-slate-900/50 border-slate-800/30 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-sm ${selectedStack?.id === stack.id ? 'text-cyan-400' : 'text-white'}`}>
                      {stack.name}
                    </span>
                    {stack.isAnonymous && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                        Anonymous
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{stack.productCount} products</span>
                    {stack.country && stack.country !== 'XX' && (
                      <span>• {stack.country}</span>
                    )}
                  </div>
                  {selectedStack?.id === stack.id && stack.products?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <div className="flex flex-wrap gap-1">
                        {stack.products.slice(0, 5).map((p, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400"
                          >
                            {p.name}
                          </span>
                        ))}
                        {stack.products.length > 5 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-500">
                            +{stack.products.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              ))}

              {communityStacks.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-3xl mb-2">🗂️</div>
                  <div className="text-sm">No shared stacks yet</div>
                  <div className="text-xs mt-1">Be the first to share your setup!</div>
                </div>
              )}
            </div>

            {/* Share CTA */}
            {isAuthenticated && (
              <Link
                href="/dashboard/setups"
                className="flex items-center justify-center gap-2 w-full mt-3 p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:border-cyan-500/50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                Share My Stack
              </Link>
            )}
          </InfoPanel>
        )}

        {activePanel === 'incidents' && (
          <InfoPanel title="Security Incidents" icon="⚠️" onClose={() => setActivePanel(null)} color="red">
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <div className="text-2xl font-bold text-red-400">{displayStats.physical}</div>
                  <div className="text-[10px] text-slate-400">Physical Attacks</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                  <div className="text-2xl font-bold text-amber-400">{displayStats.crypto}</div>
                  <div className="text-[10px] text-slate-400">Crypto Hacks</div>
                </div>
              </div>

              {/* Physical Attacks */}
              {layers.physical && displayStats.physical > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <span className="text-xs font-medium text-red-400">Physical Attacks</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{displayStats.physical} incidents</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {mapData?.physicalIncidents?.slice(0, 10).map((inc, i) => (
                      <IncidentCard key={`physical-${i}`} incident={inc} type="physical" />
                    ))}
                  </div>
                  {displayStats.physical > 10 && (
                    <button className="w-full mt-2 py-2 text-xs text-red-400 hover:text-red-300 transition-colors">
                      View all {displayStats.physical} attacks →
                    </button>
                  )}
                </div>
              )}

              {/* Crypto Hacks */}
              {layers.crypto && displayStats.crypto > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-medium text-amber-400">Crypto Hacks</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{displayStats.crypto} incidents</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {mapData?.cryptoIncidents?.slice(0, 5).flatMap(loc =>
                      loc.incidents?.slice(0, 3).map((inc, i) => (
                        <IncidentCard key={`crypto-${loc.location?.country || loc.country}-${i}`} incident={{ ...inc, country: loc.location?.country || loc.country }} type="crypto" />
                      ))
                    )}
                  </div>
                  {displayStats.crypto > 15 && (
                    <button className="w-full mt-2 py-2 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                      View all {displayStats.crypto} hacks →
                    </button>
                  )}
                </div>
              )}

              {/* Empty state */}
              {displayStats.physical === 0 && displayStats.crypto === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-3xl mb-2">🛡️</div>
                  <div className="text-sm">No incidents to display</div>
                  <div className="text-xs mt-1">Enable incident layers to see data</div>
                </div>
              )}
            </div>
          </InfoPanel>
        )}

        {activePanel === 'legislation' && (
          <InfoPanel title="Crypto Legislation" icon="⚖️" onClose={() => setActivePanel(null)} color="emerald">
            <div className="space-y-4">
              {/* Legislation Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-lg font-bold text-emerald-400">
                    {legislationData?.stats?.friendly || legislationData?.countries?.filter(c => c.stance === 'friendly' || c.stance === 'very_friendly').length || 0}
                  </div>
                  <div className="text-[9px] text-slate-400">Friendly</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-500/20 text-center">
                  <div className="text-lg font-bold text-slate-400">
                    {legislationData?.stats?.neutral || legislationData?.countries?.filter(c => c.stance === 'neutral').length || 0}
                  </div>
                  <div className="text-[9px] text-slate-400">Neutral</div>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <div className="text-lg font-bold text-red-400">
                    {legislationData?.stats?.hostile || legislationData?.countries?.filter(c => c.stance === 'restrictive' || c.stance === 'hostile' || c.stance === 'banned').length || 0}
                  </div>
                  <div className="text-[9px] text-slate-400">Hostile</div>
                </div>
              </div>

              {/* Toggle to enable layer */}
              {!layers.legislation && (
                <button
                  onClick={() => toggleLayer('legislation')}
                  className="w-full p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                >
                  Enable Legislation Layer on Map
                </button>
              )}

              {/* Countries List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {legislationData?.countries?.slice(0, 15).map((country) => {
                  const stanceConfig = {
                    very_friendly: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Very Friendly' },
                    friendly: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', label: 'Friendly' },
                    neutral: { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-400', label: 'Neutral' },
                    restrictive: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Restrictive' },
                    hostile: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Hostile' },
                    banned: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', label: 'Banned' },
                  };
                  const stance = stanceConfig[country.stance] || stanceConfig.neutral;

                  return (
                    <div key={country.code || country.country_code} className={`p-3 rounded-lg ${stance.bg} border ${stance.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{country.flag || country.emoji || '🏳️'}</span>
                          <div>
                            <span className="font-medium text-white text-sm">{country.name || country.country_name}</span>
                            {country.capital && (
                              <div className="text-[10px] text-slate-500">{country.capital}</div>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded font-medium ${stance.bg} ${stance.text}`}>
                          {stance.label}
                        </span>
                      </div>
                      {(country.overallScore || country.crypto_score) && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stance.bg.replace('/20', '')}`}
                              style={{ width: `${country.overallScore || country.crypto_score}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {country.overallScore || country.crypto_score}/100
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}
              {(!legislationData?.countries || legislationData.countries.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-3xl mb-2">⚖️</div>
                  <div className="text-sm">Loading legislation data...</div>
                  <div className="text-xs mt-1">Data from {displayStats.legislation} countries</div>
                </div>
              )}

              {/* Link to full legislation page */}
              {legislationData?.countries?.length > 0 && (
                <Link
                  href="/map?layer=legislation"
                  className="block w-full p-3 rounded-lg bg-slate-900/50 border border-slate-800/30 text-center text-sm text-slate-400 hover:text-white hover:border-emerald-500/30 transition-colors"
                >
                  View Full Legislation Map →
                </Link>
              )}
            </div>
          </InfoPanel>
        )}

        {/* Dashboard Link */}
        {isAuthenticated && (
          <Link
            href="/dashboard/my-stack-map"
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 text-purple-400 hover:border-purple-500/50 transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🌍</span>
              <span className="font-medium text-sm">My Stack Globe</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>

      {/* ============================================ */}
      {/* BOTTOM - Timeline */}
      {/* ============================================ */}
      {minDate && maxDate && (
        <div className="fixed bottom-4 left-4 right-4 z-20">
          <div className="max-w-2xl mx-auto">
            <TimelineSlider
              onTimeRangeChange={handleTimeRangeChange}
              minDate={minDate}
              maxDate={maxDate}
              attacksCount={displayStats.physical}
              hacksCount={displayStats.crypto}
            />
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* PRODUCT DETAIL MODAL */}
      {/* ============================================ */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}
