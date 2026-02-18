"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { getCountryName, COUNTRY_COORDINATES } from "@/libs/country-coordinates";
import UserSetupBubble from "@/components/UserSetupBubble";

// Security: Sanitize text to prevent XSS
function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

// Security: Validate image URL (only allow HTTPS and known domains)
function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== "https:") return false;
    // Block data: URLs and javascript: URLs
    if (url.startsWith("data:") || url.startsWith("javascript:")) return false;
    // Whitelist trusted domains (adjust as needed)
    const trustedDomains = [
      "localhost",
      "safescoring.com",
      "supabase.co",
      "githubusercontent.com",
      "cloudinary.com",
      "imgix.net",
    ];
    const hostname = parsed.hostname;
    return trustedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// Security: Validate setupId format (positive integer or alphanumeric string)
function isValidSetupId(id) {
  if (id === null || id === undefined) return false;
  // Accept positive integers
  if (typeof id === "number") {
    return Number.isInteger(id) && id > 0 && id <= 2147483647;
  }
  // Accept numeric strings or alphanumeric IDs
  if (typeof id === "string") {
    if (/^\d+$/.test(id)) {
      const num = parseInt(id, 10);
      return num > 0 && num <= 2147483647;
    }
    return /^[a-zA-Z0-9-]{1,64}$/.test(id);
  }
  return false;
}

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-white">Loading 3D Globe...</p>
      </div>
    </div>
  ),
});

// Get coordinates for a country code
function getCoords(countryCode) {
  if (!countryCode) return null;
  const data = COUNTRY_COORDINATES[countryCode.toUpperCase()];
  return data ? { lat: data.lat, lng: data.lng } : null;
}

// Score to color mapping
function getScoreColor(score) {
  if (!score) return "#64748b";
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

// Score to glow intensity
function getScoreGlow(score) {
  if (!score) return 0.3;
  if (score >= 80) return 1;
  if (score >= 60) return 0.7;
  return 0.5;
}

export default function StackGlobe3D({
  setupId,
  data,
  setup = null,              // Full setup object for UserSetupBubble
  height = "100vh",
  showStats = true,
  autoRotate = true,
  onProductClick,
  filteredProductIds = null, // Array of product IDs to show, null = show all
  highlightWallets = true,   // Highlight wallet products
  showIncidents = true,      // Show incident indicators (future feature)
  showSetupBubble = true,    // Show floating setup bubble
}) {
  const globeRef = useRef();
  const [mapData, setMapData] = useState(data || null);
  const [loading, setLoading] = useState(!data);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [focusedCountry, setFocusedCountry] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);

  // Fetch map data if not provided
  useEffect(() => {
    if (!data && setupId) {
      fetchMapData();
    }
  }, [setupId, data]);

  const fetchMapData = async () => {
    // Security: Validate setupId before making request
    if (!isValidSetupId(setupId)) {
      console.error("Invalid setupId format");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/stack/map?setupId=${encodeURIComponent(setupId)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setMapData(result.data);
      }
    } catch (error) {
      console.error("Error fetching stack map data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Transform data for globe points
  const globePoints = useMemo(() => {
    if (!mapData?.locations) return [];

    return mapData.locations.flatMap((location) => {
      const coords = getCoords(location.location.country);
      if (!coords) return [];

      // Filter products if filteredProductIds is provided
      let productsToShow = location.products;
      if (filteredProductIds && Array.isArray(filteredProductIds)) {
        productsToShow = location.products.filter(p => filteredProductIds.includes(p.id));
      }

      if (productsToShow.length === 0) return [];

      // Create a point for each product in this location
      return productsToShow.map((product, idx) => {
        // Spread products slightly around the center
        const angle = (idx / productsToShow.length) * Math.PI * 2;
        const spread = productsToShow.length > 1 ? 0.5 : 0;
        const isWallet = product.role === "wallet";

        return {
          lat: coords.lat + Math.cos(angle) * spread,
          lng: coords.lng + Math.sin(angle) * spread,
          product,
          location,
          country: location.location.country,
          score: product.score?.note_finale || 0,
          isWallet,
          // Larger size for wallets when highlighting is enabled
          size: isWallet && highlightWallets ? 1.4 : (isWallet ? 1.0 : 0.8),
          // Filtered indicator
          isFiltered: filteredProductIds !== null,
        };
      });
    });
  }, [mapData, filteredProductIds, highlightWallets]);

  // Arcs between products (connections in the stack)
  const arcsData = useMemo(() => {
    if (globePoints.length < 2) return [];

    const arcs = [];
    const wallets = globePoints.filter(p => p.isWallet);
    const others = globePoints.filter(p => !p.isWallet);

    // Connect wallets to other products
    wallets.forEach(wallet => {
      others.forEach(other => {
        if (wallet.country !== other.country) {
          arcs.push({
            startLat: wallet.lat,
            startLng: wallet.lng,
            endLat: other.lat,
            endLng: other.lng,
            color: [`${getScoreColor(wallet.score)}88`, `${getScoreColor(other.score)}88`],
          });
        }
      });
    });

    return arcs;
  }, [globePoints]);

  // Handle globe ready
  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);

    if (globeRef.current && globePoints.length > 0) {
      // Auto-rotate
      if (autoRotate) {
        globeRef.current.controls().autoRotate = true;
        globeRef.current.controls().autoRotateSpeed = 0.5;
      }

      // Focus on first point after a delay
      setTimeout(() => {
        if (globePoints[0]) {
          globeRef.current.pointOfView({
            lat: globePoints[0].lat,
            lng: globePoints[0].lng,
            altitude: 2,
          }, 1000);
        }
      }, 500);
    }
  }, [globePoints, autoRotate]);

  // Handle point click - zoom to it
  const handlePointClick = useCallback((point) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({
        lat: point.lat,
        lng: point.lng,
        altitude: 1.5,
      }, 1000);

      setFocusedCountry(point.country);

      if (onProductClick) {
        onProductClick(point.product);
      }
    }
  }, [onProductClick]);

  // Loading state
  if (loading) {
    return (
      <div
        className="w-full flex items-center justify-center bg-black"
        style={{ height }}
      >
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-white">Loading your stack...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!mapData || globePoints.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-black"
        style={{ height }}
      >
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🌍</div>
          <h2 className="text-2xl font-bold mb-2">No Products in Stack</h2>
          <p className="text-white/60 mb-6">Add products to visualize them on the globe</p>
          <Link href="/stack-builder" className="btn btn-primary">
            Build Your Stack
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-black" style={{ height }}>
      {/* Globe */}
      {/* Security Note: Consider self-hosting these assets to avoid CDN supply-chain risks */}
      <Globe
        ref={globeRef}
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"

        // Points (products)
        pointsData={globePoints}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d) => {
          // Gold/amber color for wallets when highlighting
          if (d.isWallet && highlightWallets) return "#f59e0b";
          return getScoreColor(d.score);
        }}
        pointAltitude={(d) => d.isWallet && highlightWallets ? 0.18 : (d.isWallet ? 0.12 : 0.08)}
        pointRadius={(d) => d.size}
        pointLabel={(d) => {
          // Security: Sanitize all user-provided content
          const safeName = sanitizeText(d.product.name);
          const safeTypeName = sanitizeText(d.product.type_name);
          const safeCountry = sanitizeText(getCountryName(d.country));
          const safeScore = typeof d.score === "number" ? d.score.toFixed(0) : "N/A";
          const scoreColor = getScoreColor(d.score);
          const hasValidLogo = isValidImageUrl(d.product.logo_url);

          return `
            <div class="bg-slate-900/95 backdrop-blur-sm p-3 rounded-lg border border-slate-700 shadow-xl min-w-[200px]">
              <div class="flex items-center gap-2 mb-2">
                ${hasValidLogo ? `<img src="${encodeURI(d.product.logo_url)}" class="w-8 h-8 rounded" loading="lazy" referrerpolicy="no-referrer" />` : '<div class="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">📦</div>'}
                <div>
                  <div class="font-bold text-white">${safeName || "Unknown"}</div>
                  <div class="text-xs text-slate-400">${d.isWallet ? "💰 Primary Wallet" : safeTypeName || "Product"}</div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400">${safeCountry}</span>
                <span class="font-bold" style="color: ${scoreColor}">${safeScore}</span>
              </div>
            </div>
          `;
        }}
        onPointClick={handlePointClick}
        onPointHover={setHoveredPoint}

        // Arcs (connections)
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={0.5}
        arcAltitudeAutoScale={0.3}

        // Atmosphere
        atmosphereColor="#6366f1"
        atmosphereAltitude={0.15}

        // Events
        onGlobeReady={handleGlobeReady}

        // Performance
        animateIn={true}
        width={typeof window !== 'undefined' ? window.innerWidth : 1000}
        height={typeof window !== 'undefined' ? parseInt(height) || window.innerHeight : 800}
      />

      {/* Stats Overlay */}
      {showStats && mapData.stats && (
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            {sanitizeText(mapData.setup?.name) || "My Stack"}
          </h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {typeof mapData.stats.totalProducts === "number" ? mapData.stats.totalProducts : 0}
              </div>
              <div className="text-white/60 text-xs">Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">
                {typeof mapData.stats.countries === "number" ? mapData.stats.countries : 0}
              </div>
              <div className="text-white/60 text-xs">Countries</div>
            </div>
            <div className="col-span-2 text-center pt-2 border-t border-white/10">
              <div
                className="text-3xl font-bold"
                style={{ color: getScoreColor(typeof mapData.stats.averageScore === "number" ? mapData.stats.averageScore * 10 : 0) }}
              >
                {typeof mapData.stats.averageScore === "number" ? mapData.stats.averageScore.toFixed(1) : "N/A"}
              </div>
              <div className="text-white/60 text-xs">Average SAFE Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10">
        <div className="flex items-center gap-4 text-xs text-white/80">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Score ≥80</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>60-79</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>&lt;60</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">💰</span>
            <span>Wallet</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => {
            if (globeRef.current) {
              globeRef.current.pointOfView({ altitude: 2.5 }, 500);
            }
          }}
          className="btn btn-circle btn-sm bg-black/60 border-white/20 text-white hover:bg-white/20"
          title="Zoom out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (globeRef.current) {
              globeRef.current.pointOfView({ altitude: 1 }, 500);
            }
          }}
          className="btn btn-circle btn-sm bg-black/60 border-white/20 text-white hover:bg-white/20"
          title="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (globeRef.current) {
              const ctrl = globeRef.current.controls();
              ctrl.autoRotate = !ctrl.autoRotate;
            }
          }}
          className="btn btn-circle btn-sm bg-black/60 border-white/20 text-white hover:bg-white/20"
          title="Toggle rotation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Focused Country Info */}
      {focusedCountry && hoveredPoint && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/20 max-w-xs">
          <div className="flex items-center gap-3 mb-3">
            {isValidImageUrl(hoveredPoint.product.logo_url) ? (
              <img
                src={hoveredPoint.product.logo_url}
                alt=""
                className="w-12 h-12 rounded-lg"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-2xl">
                📦
              </div>
            )}
            <div>
              <h4 className="text-white font-bold">{sanitizeText(hoveredPoint.product.name) || "Unknown"}</h4>
              <p className="text-white/60 text-sm">{sanitizeText(getCountryName(focusedCountry))}</p>
            </div>
          </div>

          {hoveredPoint.score > 0 && (
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <span className="text-white/60 text-sm">SAFE Score</span>
              <span
                className="text-xl font-bold"
                style={{ color: getScoreColor(hoveredPoint.score) }}
              >
                {hoveredPoint.score.toFixed(0)}
              </span>
            </div>
          )}

          {hoveredPoint.product.slug && /^[a-zA-Z0-9-]+$/.test(hoveredPoint.product.slug) && (
            <Link
              href={`/products/${encodeURIComponent(hoveredPoint.product.slug)}`}
              className="btn btn-primary btn-sm w-full mt-3"
            >
              View Details
            </Link>
          )}
        </div>
      )}

      {/* User Setup Bubble - shows current setup info */}
      {showSetupBubble && setup && (
        <UserSetupBubble
          setup={setup}
          position="bottom-left"
        />
      )}
    </div>
  );
}
