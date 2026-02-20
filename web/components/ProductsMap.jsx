"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import { getCountryCoordinates, getCountryName } from "@/libs/country-coordinates";
import Link from "next/link";

// Fix for default marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom marker icons for products
const createProductIcon = (color, emoji, size = 36) => {
  return L.divIcon({
    className: "custom-product-marker",
    html: `<div style="
      background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.5}px;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      cursor: pointer;
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Icons by product type
const PRODUCT_ICONS = {
  hardware: createProductIcon("#22c55e", "🔐", 40), // Green
  software: createProductIcon("#3b82f6", "💻", 38), // Blue
  exchange: createProductIcon("#f59e0b", "🏦", 42), // Amber
  defi: createProductIcon("#8b5cf6", "🌐", 38), // Purple
  layer2: createProductIcon("#06b6d4", "⚡", 36), // Cyan
  blockchain: createProductIcon("#6366f1", "⛓️", 44), // Indigo
  default: createProductIcon("#64748b", "📦", 36), // Slate
};

// Get icon based on product type
const getProductIcon = (productType) => {
  if (productType?.toLowerCase().includes("hardware")) return PRODUCT_ICONS.hardware;
  if (productType?.toLowerCase().includes("software") || productType?.toLowerCase().includes("wallet")) return PRODUCT_ICONS.software;
  if (productType?.toLowerCase().includes("exchange")) return PRODUCT_ICONS.exchange;
  if (productType?.toLowerCase().includes("defi") || productType?.toLowerCase().includes("protocol")) return PRODUCT_ICONS.defi;
  if (productType?.toLowerCase().includes("layer") || productType?.toLowerCase().includes("l2")) return PRODUCT_ICONS.layer2;
  if (productType?.toLowerCase().includes("blockchain")) return PRODUCT_ICONS.blockchain;
  return PRODUCT_ICONS.default;
};

export default function ProductsMap({ products, showLegalCountries = true, highlightProduct = null }) {
  if (!products || products.length === 0) return null;

  // Group products by country of origin
  const productsByCountry = products.reduce((acc, product) => {
    const country = product.country_origin || product.countryOrigin;
    if (!country) return acc;

    if (!acc[country]) {
      acc[country] = [];
    }
    acc[country].push(product);
    return acc;
  }, {});

  // Get center point (average of all coordinates)
  const getCenterPoint = () => {
    const validCoords = Object.keys(productsByCountry)
      .map(code => getCountryCoordinates(code))
      .filter(Boolean);

    if (validCoords.length === 0) return [20, 0];

    const avgLat = validCoords.reduce((sum, c) => sum + c.lat, 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, c) => sum + c.lng, 0) / validCoords.length;

    return [avgLat, avgLng];
  };

  return (
    <MapContainer
      center={getCenterPoint()}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      minZoom={2}
      maxZoom={10}
      scrollWheelZoom={true}
      className="rounded-lg shadow-xl"
    >
      {/* Dark theme tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | SafeScoring'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Product markers grouped by country */}
      {Object.entries(productsByCountry).map(([countryCode, countryProducts]) => {
        const coords = getCountryCoordinates(countryCode);
        if (!coords) return null;

        const isHighlighted = highlightProduct && countryProducts.some(p => p.slug === highlightProduct);
        const markerSize = isHighlighted ? 48 : (countryProducts.length > 5 ? 42 : 38);

        // Determine dominant product type for icon
        const productTypes = countryProducts.map(p => p.description || p.type || '');
        const dominantType = productTypes[0] || 'default';

        return (
          <Marker
            key={`country-${countryCode}`}
            position={[coords.lat, coords.lng]}
            icon={getProductIcon(dominantType)}
            zIndexOffset={isHighlighted ? 1000 : 0}
          >
            <Popup maxWidth={400} className="product-popup">
              <div className="p-3">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">{getCountryFlag(countryCode)}</div>
                  <div>
                    <h3 className="font-bold text-xl text-base-content">
                      {getCountryName(countryCode)}
                    </h3>
                    <p className="text-sm text-base-content/70">
                      {countryProducts.length} {countryProducts.length === 1 ? 'product' : 'products'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="stats shadow bg-base-200 mb-4 w-full">
                  <div className="stat py-3 px-4">
                    <div className="stat-title text-xs">Products</div>
                    <div className="stat-value text-2xl text-primary">{countryProducts.length}</div>
                  </div>
                  <div className="stat py-3 px-4">
                    <div className="stat-title text-xs">Global Reach</div>
                    <div className="stat-value text-2xl text-accent">
                      {Math.max(...countryProducts.map(p => p.legal_country_count || p.legal_countries?.length || 0))}
                    </div>
                    <div className="stat-desc text-xs">countries</div>
                  </div>
                </div>

                {/* Product list */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {countryProducts.map((product, idx) => {
                    const legalCountries = product.legal_countries || product.legalCountries || [];
                    const headquarters = product.headquarters || 'N/A';

                    return (
                      <Link
                        key={idx}
                        href={`/products/${product.slug}`}
                        className={`block card bg-base-100 hover:bg-base-200 p-3 transition-all border-2 ${
                          product.slug === highlightProduct
                            ? 'border-primary shadow-lg'
                            : 'border-transparent'
                        }`}
                      >
                        {/* Product name and type */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-base text-base-content flex-1">
                            {product.name}
                          </h4>
                          {product.slug === highlightProduct && (
                            <span className="badge badge-primary badge-sm">Highlighted</span>
                          )}
                        </div>

                        {/* Headquarters */}
                        <div className="text-xs text-base-content/70 mb-2 flex items-center gap-1">
                          <span>🏢</span>
                          <span>{headquarters}</span>
                        </div>

                        {/* Legal countries */}
                        {showLegalCountries && legalCountries.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-base-300">
                            <div className="text-xs font-semibold text-base-content/80 mb-1">
                              ✅ Legal in {legalCountries.length} countries
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {legalCountries.slice(0, 8).map(code => (
                                <span
                                  key={code}
                                  className="badge badge-xs badge-success badge-outline"
                                  title={getCountryName(code)}
                                >
                                  {getCountryFlag(code)} {code}
                                </span>
                              ))}
                              {legalCountries.length > 8 && (
                                <span className="badge badge-xs">
                                  +{legalCountries.length - 8} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Year founded */}
                        {product.year_founded && (
                          <div className="text-xs text-base-content/60 mt-2">
                            Founded: {product.year_founded}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-base-300">
                  <Link
                    href={`/?filter=country:${countryCode}`}
                    className="btn btn-sm btn-primary w-full"
                  >
                    View All {countryCode} Products →
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Legal countries circles (semi-transparent) */}
      {showLegalCountries && highlightProduct && products.map((product) => {
        if (product.slug !== highlightProduct) return null;

        const legalCountries = product.legal_countries || product.legalCountries || [];
        const originCoords = getCountryCoordinates(product.country_origin || product.countryOrigin);

        if (!originCoords) return null;

        return legalCountries.map((countryCode) => {
          const coords = getCountryCoordinates(countryCode);
          if (!coords) return null;

          return (
            <React.Fragment key={`legal-${product.slug}-${countryCode}`}>
              {/* Circle for legal country */}
              <Circle
                center={[coords.lat, coords.lng]}
                radius={200000} // 200km radius
                pathOptions={{
                  color: '#22c55e',
                  fillColor: '#22c55e',
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />

              {/* Line from origin to legal country */}
              <Polyline
                positions={[
                  [originCoords.lat, originCoords.lng],
                  [coords.lat, coords.lng],
                ]}
                pathOptions={{
                  color: '#22c55e',
                  weight: 1,
                  opacity: 0.3,
                  dashArray: '5, 10',
                }}
              />
            </React.Fragment>
          );
        });
      })}
    </MapContainer>
  );
}

// Helper: Get country flag emoji
function getCountryFlag(countryCode) {
  if (!countryCode || countryCode === 'XX') return '🌍';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());

  return String.fromCodePoint(...codePoints);
}
