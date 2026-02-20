"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import Link from "next/link";
import { COUNTRY_COORDINATES } from "@/libs/country-coordinates";

// Use centralized coordinates
function getApproxCoords(countryCode) {
  if (!countryCode) return null;
  const coordData = COUNTRY_COORDINATES[countryCode.toUpperCase()];
  return coordData ? { lat: coordData.lat, lng: coordData.lng } : null;
}

// Component to auto-center map on user location
function MapController({ userCoords }) {
  const map = useMap();

  useEffect(() => {
    if (userCoords) {
      map.setView([userCoords.lat, userCoords.lng], 4, { animate: true });
    }
  }, [userCoords, map]);

  return null;
}

// Dark popup styles injected via CSS
const darkPopupStyles = `
  .leaflet-popup-content-wrapper {
    background: rgba(15, 23, 42, 0.95) !important;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(51, 65, 85, 0.5) !important;
    border-radius: 12px !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
    color: #e2e8f0 !important;
  }
  .leaflet-popup-tip {
    background: rgba(15, 23, 42, 0.95) !important;
    border: 1px solid rgba(51, 65, 85, 0.5) !important;
  }
  .leaflet-popup-close-button {
    color: #94a3b8 !important;
  }
  .leaflet-popup-close-button:hover {
    color: #e2e8f0 !important;
  }
  .leaflet-container {
    background: #0f172a !important;
  }
`;

export default function Map2D({
  data,
  showPhysical = true,
  showCrypto = true,
  showProducts = true,
  showUsers = true,
  showNodes = true,
  nodesData = null,
  showLegislation = false,
  legislationData = null,
}) {
  const [userCoords, setUserCoords] = useState(null);

  // Detect user location
  useEffect(() => {
    async function detectLocation() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const geoData = await response.json();
        if (geoData.latitude && geoData.longitude) {
          setUserCoords({ lat: geoData.latitude, lng: geoData.longitude });
        }
      } catch (err) {
        console.error("Failed to detect location:", err);
      }
    }
    detectLocation();
  }, []);

  const formatCurrency = (amount) => {
    if (!amount) return "Unknown";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  return (
    <>
      {/* Inject dark popup styles */}
      <style>{darkPopupStyles}</style>

      <MapContainer
        center={userCoords ? [userCoords.lat, userCoords.lng] : [20, 0]}
        zoom={userCoords ? 4 : 2}
        minZoom={2}
        maxZoom={18}
        className="w-full h-full"
        style={{ background: "#0f172a" }}
        worldCopyJump={true}
      >
        {/* Dark stylized tiles - Stadia Alidade Smooth Dark */}
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
        />

        {/* Auto-center on user location */}
        {userCoords && <MapController userCoords={userCoords} />}

        {/* Physical Incidents - Red with pulse effect */}
        {showPhysical && data?.physicalIncidents?.filter(incident =>
          incident.location?.coordinates?.lat && incident.location?.coordinates?.lng
        ).map((incident, idx) => (
          <CircleMarker
            key={`physical-${idx}`}
            center={[incident.location.coordinates.lat, incident.location.coordinates.lng]}
            radius={10}
            pathOptions={{
              fillColor: "#ef4444",
              fillOpacity: 0.7,
              color: "#fca5a5",
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-1 min-w-[220px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="font-bold text-red-400 text-sm">Attaque Physique</span>
                </div>
                <h3 className="font-semibold text-white mb-1">{incident.title}</h3>
                <p className="text-sm text-slate-400 mb-2">{incident.location?.city || incident.location?.country}</p>
                {incident.date && (
                  <p className="text-xs text-slate-500">
                    {new Date(incident.date).toLocaleDateString("fr-FR")}
                  </p>
                )}
                {incident.amountLost > 0 && (
                  <p className="text-sm text-red-400 font-medium mt-1">
                    {formatCurrency(incident.amountLost)} perdus
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Crypto Incidents - Amber */}
        {showCrypto && data?.cryptoIncidents?.map((location, idx) => {
          const coords = getApproxCoords(location.location?.country);
          if (!coords) return null;
          return (
            <CircleMarker
              key={`crypto-${idx}`}
              center={[coords.lat, coords.lng]}
              radius={Math.min(8 + location.count * 2, 24)}
              pathOptions={{
                fillColor: "#f59e0b",
                fillOpacity: 0.6,
                color: "#fcd34d",
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="font-bold text-amber-400 text-sm">Hacks Crypto</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{location.location?.country}</h3>
                  <p className="text-sm text-slate-400">
                    {location.count} incident{location.count > 1 ? "s" : ""}
                  </p>
                  {location.totalFundsLost > 0 && (
                    <p className="text-sm text-amber-400 font-medium mt-1">
                      {formatCurrency(location.totalFundsLost)} perdus
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Products - Blue */}
        {showProducts && data?.products?.map((location, idx) => {
          const coords = getApproxCoords(location.location?.country);
          if (!coords) return null;
          return (
            <CircleMarker
              key={`product-${idx}`}
              center={[coords.lat, coords.lng]}
              radius={Math.min(6 + location.count, 16)}
              pathOptions={{
                fillColor: "#3b82f6",
                fillOpacity: 0.7,
                color: "#93c5fd",
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="font-bold text-blue-400 text-sm">Produits</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{location.location?.country}</h3>
                  <p className="text-sm text-slate-400 mb-2">{location.count} produit{location.count > 1 ? "s" : ""}</p>
                  {location.products?.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      className="block text-xs text-blue-400 hover:underline py-0.5"
                    >
                      {p.name}
                    </Link>
                  ))}
                  {location.products?.length > 5 && (
                    <p className="text-xs text-slate-500 mt-1">+{location.products.length - 5} autres</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Blockchain Nodes - Cyan (smaller, many points) */}
        {showNodes && nodesData?.allNodes?.filter(node => node.lat && node.lng).map((node, idx) => (
          <CircleMarker
            key={`node-${idx}`}
            center={[node.lat, node.lng]}
            radius={Math.min(4 + Math.log(node.count || 1), 10)}
            pathOptions={{
              fillColor: node.color || "#06b6d4",
              fillOpacity: 0.5,
              color: "#22d3ee",
              weight: 1,
            }}
          >
            <Popup>
              <div className="p-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color || "#06b6d4" }}></span>
                  <span className="font-medium text-cyan-400 text-sm">{node.blockchainName || node.blockchain}</span>
                </div>
                <p className="text-sm text-white">{node.count} noeud{node.count > 1 ? "s" : ""}</p>
                <p className="text-xs text-slate-400">{node.city}, {node.country}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Users - Purple */}
        {showUsers && data?.users?.map((userGroup, idx) => {
          const coords = getApproxCoords(userGroup.country);
          if (!coords) return null;
          return (
            <CircleMarker
              key={`user-${idx}`}
              center={[coords.lat, coords.lng]}
              radius={Math.min(5 + userGroup.count, 18)}
              pathOptions={{
                fillColor: "#a855f7",
                fillOpacity: 0.4,
                color: "#c084fc",
                weight: 1,
              }}
            >
              <Popup>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span className="font-medium text-purple-400 text-sm">Membres</span>
                  </div>
                  <p className="text-sm text-white">{userGroup.count} membre{userGroup.count > 1 ? "s" : ""}</p>
                  <p className="text-xs text-slate-400">{userGroup.country}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </>
  );
}
