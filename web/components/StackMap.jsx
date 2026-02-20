"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import DOMPurify from "isomorphic-dompurify";
import { getCountryCoordinates, getCountryName } from "@/libs/country-coordinates";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// Security: Sanitize text to prevent XSS
function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

// Security: Validate image URL
function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (url.startsWith("data:") || url.startsWith("javascript:")) return false;
    const trustedDomains = ["localhost", "safescoring.com", "supabase.co", "githubusercontent.com", "cloudinary.com", "imgix.net"];
    return trustedDomains.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// Security: Validate setupId
function isValidSetupId(id) {
  if (typeof id === "number") return Number.isInteger(id) && id > 0;
  if (typeof id === "string") return /^[a-zA-Z0-9-]{1,64}$/.test(id);
  return false;
}

// Dynamically import the Map component (client-side only)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Custom marker icons
const createCustomIcon = (color, hasWallet) => {
  if (typeof window === "undefined") return null;
  const L = require("leaflet");

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${hasWallet ? '40px' : '30px'};
        height: ${hasWallet ? '40px' : '30px'};
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${hasWallet ? '20px' : '16px'};
      ">
        ${hasWallet ? '💰' : '🏢'}
      </div>
    `,
    iconSize: [hasWallet ? 40 : 30, hasWallet ? 40 : 30],
    iconAnchor: [hasWallet ? 20 : 15, hasWallet ? 40 : 30],
  });
};

export default function StackMap({ setupId, data }) {
  const [mapData, setMapData] = useState(data || null);
  const [loading, setLoading] = useState(!data);
  const [selectedLocation, setSelectedLocation] = useState(null);

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
      } else {
        console.error("Failed to fetch stack map data:", result.error);
      }
    } catch (error) {
      console.error("Error fetching stack map data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get marker color based on score
  const getMarkerColor = (averageScore) => {
    if (!averageScore) return "#64748b"; // gray
    if (averageScore >= 8) return "#10b981"; // green
    if (averageScore >= 6) return "#f59e0b"; // orange
    return "#ef4444"; // red
  };

  // Calculate map bounds to fit all markers
  const getMapBounds = useCallback(() => {
    if (!mapData?.locations || mapData.locations.length === 0) {
      return [[20, 0], [20, 0]]; // Default center
    }

    const coords = mapData.locations
      .map(loc => getCountryCoordinates(loc.location.country))
      .filter(c => c !== null);

    if (coords.length === 0) {
      return [[20, 0], [20, 0]];
    }

    const lats = coords.map(c => c.lat);
    const lngs = coords.map(c => c.lng);

    return [
      [Math.min(...lats) - 5, Math.min(...lngs) - 5],
      [Math.max(...lats) + 5, Math.max(...lngs) + 5],
    ];
  }, [mapData]);

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-base-200 rounded-lg">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Loading your stack map...</p>
        </div>
      </div>
    );
  }

  if (!mapData || !mapData.locations || mapData.locations.length === 0) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-base-200 rounded-lg">
        <div className="text-center">
          <p className="text-lg mb-2">No products in this stack yet</p>
          <p className="text-sm text-base-content/60">
            Add products to see them on the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Stack Info Header */}
      <div className="mb-4 p-4 bg-base-200 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">{sanitizeText(mapData.setup?.name) || "Your Stack"}</h2>
        {mapData.setup?.description && (
          <p className="text-base-content/70 mb-3">{sanitizeText(mapData.setup.description)}</p>
        )}

        <div className="stats stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-title">Products</div>
            <div className="stat-value text-primary">{typeof mapData.stats.totalProducts === "number" ? mapData.stats.totalProducts : 0}</div>
            <div className="stat-desc">Across {typeof mapData.stats.countries === "number" ? mapData.stats.countries : 0} countries</div>
          </div>

          <div className="stat">
            <div className="stat-title">Average SAFE Score</div>
            <div className="stat-value text-secondary">
              {mapData.stats.averageScore ? mapData.stats.averageScore.toFixed(1) : 'N/A'}
            </div>
            <div className="stat-desc">
              {mapData.stats.averageScore >= 8 ? '✅ Excellent' :
               mapData.stats.averageScore >= 6 ? '⚠️ Good' : '⚠️ Needs improvement'}
            </div>
          </div>

          {mapData.setup?.combined_score?.note_finale && (
            <div className="stat">
              <div className="stat-title">Combined Score</div>
              <div className="stat-value text-accent">
                {mapData.setup.combined_score.note_finale.toFixed(1)}
              </div>
              <div className="stat-desc">Weighted average</div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden shadow-2xl">
        <MapContainer
          bounds={getMapBounds()}
          style={{ height: "600px", width: "100%" }}
          scrollWheelZoom={true}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mapData.locations.map((location, idx) => {
            const coords = getCountryCoordinates(location.location.country);
            if (!coords) return null;

            const icon = createCustomIcon(
              getMarkerColor(location.averageScore),
              location.hasWallet
            );

            return (
              <Marker key={idx} position={[coords.lat, coords.lng]} icon={icon}>
                <Popup>
                  <div className="p-2 min-w-[250px]">
                    <h3 className="font-bold text-lg mb-2">
                      {sanitizeText(getCountryName(location.location.country))}
                      {location.hasWallet && " 💰"}
                    </h3>

                    {location.location.city && (
                      <p className="text-sm text-base-content/70 mb-2">
                        📍 {sanitizeText(location.location.city)}
                      </p>
                    )}

                    <div className="mb-3">
                      <div className="text-sm font-semibold">
                        {typeof location.count === "number" ? location.count : 0} product{location.count > 1 ? 's' : ''}
                      </div>
                      {typeof location.averageScore === "number" && (
                        <div className="text-sm">
                          Avg Score: <span className="font-bold">{location.averageScore.toFixed(1)}</span>/10
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      {Array.isArray(location.products) && location.products.map((product, pidx) => (
                        <div key={pidx} className="flex items-center gap-2 text-xs p-1 bg-base-100 rounded">
                          {isValidImageUrl(product.logo_url) ? (
                            <img
                              src={product.logo_url}
                              alt=""
                              className="w-6 h-6 rounded object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-base-300 flex items-center justify-center text-xs">📦</div>
                          )}
                          <div className="flex-1">
                            <div className="font-semibold">{sanitizeText(product.name) || "Unknown"}</div>
                            {product.score && typeof product.score.note_finale === "number" && (
                              <div className="text-base-content/60">
                                SAFE: {product.score.note_finale.toFixed(1)}
                              </div>
                            )}
                          </div>
                          {product.role === 'wallet' && (
                            <span className="badge badge-xs badge-primary">Wallet</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-base-200 rounded-lg">
        <h3 className="font-bold mb-2">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-success border-2 border-white"></div>
            <span>Score ≥ 8 (Excellent)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-warning border-2 border-white"></div>
            <span>Score 6-8 (Good)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-error border-2 border-white"></div>
            <span>Score &lt; 6 (Risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl">💰</div>
            <span>Contains wallet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
