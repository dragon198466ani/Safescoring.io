"use client";

import { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getCountryName, COUNTRY_COORDINATES } from "@/libs/country-coordinates";

// Escape HTML to prevent XSS in innerHTML assignments
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#000814] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 animate-spin" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-4 rounded-full bg-[#000814]"></div>
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-emerald-500/50 to-blue-500/50"></div>
        </div>
        <p className="text-cyan-400 font-medium">Loading Earth...</p>
        <p className="text-slate-500 text-sm mt-1">Preparing 3D visualization</p>
      </div>
    </div>
  )
});

// ============================================
// HIGH-QUALITY TEXTURE URLS
// ============================================
const GLOBE_TEXTURES = {
  // NASA Blue Marble - High resolution Earth texture
  earthDay: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  // Night lights texture for dark side of Earth
  earthNight: '//unpkg.com/three-globe/example/img/earth-night.jpg',
  // Topology/bump map for 3D relief
  earthBump: '//unpkg.com/three-globe/example/img/earth-topology.png',
  // Water specular map
  earthWater: '//unpkg.com/three-globe/example/img/earth-water.png',
  // Clouds layer
  clouds: '//unpkg.com/three-globe/example/img/earth-clouds.png',
  // Deep space background with stars
  nightSky: '//unpkg.com/three-globe/example/img/night-sky.png',
};

// ============================================
// DATAFAST-STYLE AVATAR SYSTEM
// ============================================

// Avatar skin tones (inclusive range)
const SKIN_TONES = [
  '#FFDFC4', // Light
  '#F0C8A0', // Light-medium
  '#D4A574', // Medium
  '#C68642', // Medium-dark
  '#8D5524', // Dark
  '#5C3317', // Very dark
];

// Hair colors
const HAIR_COLORS = [
  '#1a1a1a', // Black
  '#4a3728', // Dark brown
  '#8b4513', // Brown
  '#d4a574', // Blonde
  '#ff6b35', // Ginger
  '#22c55e', // Green (dyed)
  '#a855f7', // Purple (dyed)
  '#3b82f6', // Blue (dyed)
  '#ec4899', // Pink (dyed)
];

// Hair styles (SVG paths)
const HAIR_STYLES = [
  'short', 'medium', 'long', 'bald', 'mohawk', 'afro', 'ponytail', 'spiky'
];

// Accessories
const ACCESSORIES = [
  'none', 'glasses', 'sunglasses', 'headphones', 'cap', 'beanie', 'earrings'
];

// Activity labels (what users are "doing")
const ACTIVITY_LABELS = [
  'viewing /products',
  'comparing wallets',
  'checking scores',
  'reading reviews',
  'browsing /map',
  'viewing incidents',
  'checking nodes',
  'exploring DeFi',
  'researching',
  'joined now',
  'building stack',
  'viewing /compare',
  'checking security',
  'reading guides',
];

// Seeded random number generator for consistent avatar generation
function seededRandom(seed) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// Generate avatar configuration from seed
function generateAvatarConfig(seed) {
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const r3 = seededRandom(seed + 2);
  const r4 = seededRandom(seed + 3);
  const r5 = seededRandom(seed + 4);

  return {
    skinTone: SKIN_TONES[Math.floor(r1 * SKIN_TONES.length)],
    hairColor: HAIR_COLORS[Math.floor(r2 * HAIR_COLORS.length)],
    hairStyle: HAIR_STYLES[Math.floor(r3 * HAIR_STYLES.length)],
    accessory: ACCESSORIES[Math.floor(r4 * ACCESSORIES.length)],
    activity: ACTIVITY_LABELS[Math.floor(r5 * ACTIVITY_LABELS.length)],
    showActivity: r5 > 0.7, // 30% chance to show activity label
  };
}

// Generate SVG avatar
function generateAvatarSVG(config, size = 40) {
  const { skinTone, hairColor, hairStyle, accessory } = config;

  // Hair path based on style
  let hairPath = '';
  switch (hairStyle) {
    case 'short':
      hairPath = `<ellipse cx="20" cy="12" rx="12" ry="8" fill="${hairColor}"/>`;
      break;
    case 'medium':
      hairPath = `<path d="M8 20 Q8 6 20 6 Q32 6 32 20 L32 12 Q32 4 20 4 Q8 4 8 12 Z" fill="${hairColor}"/>`;
      break;
    case 'long':
      hairPath = `<path d="M8 20 Q8 6 20 6 Q32 6 32 20 L34 28 Q34 32 30 32 L10 32 Q6 32 6 28 Z M8 12 Q8 4 20 4 Q32 4 32 12 Z" fill="${hairColor}"/>`;
      break;
    case 'mohawk':
      hairPath = `<path d="M17 4 L20 0 L23 4 L20 2 Z" fill="${hairColor}" transform="scale(1.5) translate(-7, 2)"/>`;
      break;
    case 'afro':
      hairPath = `<circle cx="20" cy="14" r="14" fill="${hairColor}"/>`;
      break;
    case 'ponytail':
      hairPath = `<ellipse cx="20" cy="12" rx="12" ry="8" fill="${hairColor}"/><ellipse cx="32" cy="10" rx="4" ry="6" fill="${hairColor}"/>`;
      break;
    case 'spiky':
      hairPath = `<path d="M10 14 L8 4 L14 10 L16 2 L20 8 L24 2 L26 10 L32 4 L30 14 Z" fill="${hairColor}"/>`;
      break;
    case 'bald':
    default:
      hairPath = '';
  }

  // Accessory path
  let accessoryPath = '';
  switch (accessory) {
    case 'glasses':
      accessoryPath = `<g stroke="#333" stroke-width="1.5" fill="none">
        <circle cx="14" cy="18" r="4"/>
        <circle cx="26" cy="18" r="4"/>
        <line x1="18" y1="18" x2="22" y2="18"/>
        <line x1="10" y1="18" x2="6" y2="16"/>
        <line x1="30" y1="18" x2="34" y2="16"/>
      </g>`;
      break;
    case 'sunglasses':
      accessoryPath = `<g>
        <rect x="9" y="15" width="9" height="6" rx="2" fill="#1a1a1a"/>
        <rect x="22" y="15" width="9" height="6" rx="2" fill="#1a1a1a"/>
        <line x1="18" y1="18" x2="22" y2="18" stroke="#1a1a1a" stroke-width="2"/>
        <line x1="9" y1="17" x2="5" y2="15" stroke="#1a1a1a" stroke-width="2"/>
        <line x1="31" y1="17" x2="35" y2="15" stroke="#1a1a1a" stroke-width="2"/>
      </g>`;
      break;
    case 'headphones':
      accessoryPath = `<g>
        <path d="M6 20 Q6 8 20 8 Q34 8 34 20" stroke="#333" stroke-width="3" fill="none"/>
        <rect x="3" y="18" width="6" height="10" rx="2" fill="#333"/>
        <rect x="31" y="18" width="6" height="10" rx="2" fill="#333"/>
      </g>`;
      break;
    case 'cap':
      accessoryPath = `<g>
        <ellipse cx="20" cy="10" rx="14" ry="6" fill="#3b82f6"/>
        <rect x="6" y="8" width="28" height="4" fill="#3b82f6"/>
        <rect x="26" y="9" width="12" height="3" rx="1" fill="#2563eb"/>
      </g>`;
      break;
    case 'beanie':
      accessoryPath = `<g>
        <path d="M8 14 Q8 4 20 4 Q32 4 32 14 L30 16 L10 16 Z" fill="#ef4444"/>
        <circle cx="20" cy="2" r="3" fill="#ef4444"/>
      </g>`;
      break;
    case 'earrings':
      accessoryPath = `<g>
        <circle cx="6" cy="22" r="2" fill="#fbbf24"/>
        <circle cx="34" cy="22" r="2" fill="#fbbf24"/>
      </g>`;
      break;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}">
      <defs>
        <clipPath id="avatar-clip">
          <circle cx="20" cy="20" r="18"/>
        </clipPath>
      </defs>
      <g clip-path="url(#avatar-clip)">
        <!-- Background -->
        <circle cx="20" cy="20" r="20" fill="#1e293b"/>
        <!-- Hair behind (for long styles) -->
        ${hairStyle === 'long' ? `<path d="M6 28 L6 36 L34 36 L34 28 Q34 32 30 32 L10 32 Q6 32 6 28 Z" fill="${hairColor}"/>` : ''}
        <!-- Face -->
        <ellipse cx="20" cy="22" rx="12" ry="14" fill="${skinTone}"/>
        <!-- Eyes -->
        <ellipse cx="15" cy="20" rx="2" ry="2.5" fill="#1a1a1a"/>
        <ellipse cx="25" cy="20" rx="2" ry="2.5" fill="#1a1a1a"/>
        <circle cx="15.5" cy="19.5" r="0.8" fill="white"/>
        <circle cx="25.5" cy="19.5" r="0.8" fill="white"/>
        <!-- Eyebrows -->
        <path d="M12 16 Q15 14 18 16" stroke="#333" stroke-width="1" fill="none"/>
        <path d="M22 16 Q25 14 28 16" stroke="#333" stroke-width="1" fill="none"/>
        <!-- Nose -->
        <path d="M20 22 L19 26 L21 26" stroke="${skinTone}" stroke-width="1.5" fill="none" opacity="0.5"/>
        <!-- Mouth -->
        <path d="M16 29 Q20 32 24 29" stroke="#c0392b" stroke-width="1.5" fill="none"/>
        <!-- Hair -->
        ${hairPath}
        <!-- Accessory -->
        ${accessoryPath}
      </g>
      <!-- Border -->
      <circle cx="20" cy="20" r="18" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `;
}

// Memoized component for better performance
const Globe3D = memo(function Globe3D({
  data,
  showPhysical,
  showCrypto,
  showProducts,
  showUsers = true,
  showNodes = true,
  nodesData = null,
  showLegislation = false,
  legislationData = null,
}) {
  const globeEl = useRef();
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);
  // No texture needed - using stylized globe
  // Countries data removed - using texture for boundaries instead
  const [userCountry, setUserCountry] = useState(null);
  const [userCountryName, setUserCountryName] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  // Detect user's country from IP geolocation
  useEffect(() => {
    async function detectUserCountry() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const geoData = await response.json();

        if (geoData.country_code) {
          setUserCountry(geoData.country_code);
          setUserCountryName(geoData.country_name || getCountryName(geoData.country_code));

          // Get approximate coordinates for the country
          const coords = getApproxCoords(geoData.country_code);
          if (coords) {
            setUserCoords(coords);
          }
        }
      } catch {
        // Silent fail for geolocation
      }
    }

    detectUserCountry();
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    if (globeEl.current) {
      const currentPov = globeEl.current.pointOfView();
      const newAltitude = Math.max(0.5, currentPov.altitude * 0.7);
      globeEl.current.pointOfView({ ...currentPov, altitude: newAltitude }, 300);
    }
  };

  const handleZoomOut = () => {
    if (globeEl.current) {
      const currentPov = globeEl.current.pointOfView();
      const newAltitude = Math.min(4, currentPov.altitude * 1.4);
      globeEl.current.pointOfView({ ...currentPov, altitude: newAltitude }, 300);
    }
  };

  // Set globe ready immediately - no texture to load
  useEffect(() => {
    setGlobeReady(true);
  }, []);

  // Fallback timeout to show globe even if onGlobeReady doesn't fire
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!globeReady) setGlobeReady(true);
    }, 1500);
    return () => clearTimeout(fallbackTimer);
  }, [globeReady]);

  // Memoize points data to avoid recalculation on every render
  const allPoints = useMemo(() => {
    if (!data) return [];

    const points = [];

    // Physical incidents (red) - highest priority, LARGE markers
    if (showPhysical && data.physicalIncidents) {
      data.physicalIncidents.forEach((incident) => {
        if (incident.location?.coordinates) {
          points.push({
            lat: incident.location.coordinates.lat,
            lng: incident.location.coordinates.lng,
            size: 1.2, // Large red markers for physical incidents
            color: "#ff3333",
            type: "physical",
            label: incident.title,
            data: incident,
          });
        }
      });
    }

    // Crypto incidents (orange) - Size scales with incident count
    if (showCrypto && data.cryptoIncidents) {
      const maxCount = Math.max(...data.cryptoIncidents.map(c => c.count), 1);

      const topCrypto = [...data.cryptoIncidents]
        .sort((a, b) => (b.totalFundsLost || 0) - (a.totalFundsLost || 0));

      topCrypto.forEach((location) => {
        const coords = getApproxCoords(location.location.country);
        if (coords) {
          // Size scales logarithmically based on count
          const size = 0.5 + (Math.log(1 + location.count) / Math.log(1 + maxCount)) * 1.5;

          points.push({
            lat: coords.lat,
            lng: coords.lng,
            size: Math.min(Math.max(size, 0.5), 2.5),
            color: "#f59e0b",
            type: "crypto",
            label: `${location.count} incidents`,
            data: location,
          });
        }
      });
    }

    // Products (blue) - Size scales with product count
    if (showProducts && data.products) {
      // Find max count for normalization
      const maxCount = Math.max(...data.products.map(p => p.count), 1);

      const topProducts = [...data.products]
        .sort((a, b) => b.count - a.count);

      topProducts.forEach((location) => {
        const coords = getApproxCoords(location.location.country);
        if (coords) {
          // Size scales logarithmically: min 0.5, max 2.0 based on count
          const size = 0.5 + (Math.log(1 + location.count) / Math.log(1 + maxCount)) * 1.5;

          points.push({
            lat: coords.lat,
            lng: coords.lng,
            size: Math.min(Math.max(size, 0.5), 2.5), // Clamp between 0.5 and 2.5
            color: "#3b82f6",
            type: "product",
            label: `${location.count} products`,
            data: location,
          });
        }
      });
    }

    // Blockchain nodes (colored by chain) - Size scales with node count
    if (showNodes && nodesData?.allNodes) {
      const maxNodeCount = Math.max(...nodesData.allNodes.map(n => n.count), 1);

      nodesData.allNodes.forEach((node) => {
        // Size scales logarithmically based on node count
        const size = 0.5 + (Math.log(1 + node.count) / Math.log(1 + maxNodeCount)) * 1.5;

        points.push({
          lat: node.lat,
          lng: node.lng,
          size: Math.min(Math.max(size, 0.5), 2.0),
          color: node.color || "#06b6d4", // Use blockchain-specific color or default cyan
          type: "node",
          label: `${node.blockchainName}: ${node.count} nodes in ${node.city}`,
          data: node,
        });
      });
    }

    return points;
  }, [data, showPhysical, showCrypto, showProducts, showNodes, nodesData]);

  // Handle click on point - show info panel (for products, attacks, nodes, crypto)
  const handlePointClick = useCallback((point) => {
    if (point) {
      setSelectedPoint(point);
    }
  }, []);

  // Hover disabled - using click only
  const handlePointHover = useCallback(() => {}, []);

  // Countries polygons removed - using texture for better performance

  // User location ring data for visualization
  const userRingData = useMemo(() => {
    if (!userCoords || !userCountry) return [];
    return [{
      lat: userCoords.lat,
      lng: userCoords.lng,
      maxR: 8,
      propagationSpeed: 2,
      repeatPeriod: 1500,
      color: '#22c55e' // Green ring for user location
    }];
  }, [userCoords, userCountry]);

  // Legislation data for country rings
  const legislationRingsData = useMemo(() => {
    if (!showLegislation || !legislationData?.countries) return [];

    return legislationData.countries.map((country) => ({
      lat: country.lat,
      lng: country.lng,
      maxR: 6,
      propagationSpeed: 0.8,
      repeatPeriod: 3000,
      color: country.color,
      country: country,
    }));
  }, [showLegislation, legislationData]);

  // HTML labels for products with logos and other users
  const htmlLabelsData = useMemo(() => {
    const labels = [];

    // Add legislation country labels
    if (showLegislation && legislationData?.countries) {
      legislationData.countries.forEach((country) => {
        labels.push({
          lat: country.lat,
          lng: country.lng,
          type: 'legislation',
          country: country,
        });
      });
    }

    // Add current user marker if we have coordinates
    if (userCoords && userCountryName) {
      labels.push({
        lat: userCoords.lat,
        lng: userCoords.lng,
        type: 'currentUser',
        name: userCountryName,
      });
    }

    // Add other users distributed randomly across their countries
    // PERFORMANCE: Limit total user markers to avoid overloading the globe
    // Enhanced display: Show emoji + pseudonym + optional setup info
    // Supports both old format (seed, angle) and new real-time presence format with emoji/setup
    if (showUsers && data?.users) {
      let totalUserMarkers = 0;
      const MAX_TOTAL_MARKERS = 150; // Reduced for avatar performance (larger elements)
      const MAX_PER_COUNTRY = 10; // Max users shown per country
      let globalUserIndex = 0;

      for (const userGroup of data.users) {
        if (!userGroup.userSeeds || totalUserMarkers >= MAX_TOTAL_MARKERS) break;

        // Limit per country, proportional to actual count but capped
        const displayCount = Math.min(userGroup.userSeeds.length, MAX_PER_COUNTRY);
        const seeds = userGroup.userSeeds.slice(0, displayCount);

        for (const seedData of seeds) {
          if (totalUserMarkers >= MAX_TOTAL_MARKERS) break;

          const coords = getRandomCoordsInCountry(
            userGroup.country,
            seedData.seed,
            seedData.angle
          );
          if (coords) {
            // Support both old format and new real-time presence format
            const avatarSeed = seedData.avatarSeed || Math.floor(seedData.seed * 10000) + globalUserIndex;
            // For real-time users, show their actual activity; otherwise use position-based logic
            const hasRealActivity = !!seedData.currentAction;
            const showActivity = hasRealActivity || (globalUserIndex < 30 && (globalUserIndex % 4 === 0));
            
            // Check if user has custom emoji (from globe visibility settings)
            const hasCustomEmoji = !!seedData.emoji;
            // Check if user wants to show their setup
            const showSetup = seedData.showProducts && seedData.productCount > 0;

            labels.push({
              lat: coords.lat,
              lng: coords.lng,
              type: 'otherUser',
              country: userGroup.country,
              avatarSeed: avatarSeed,
              showActivity: showActivity,
              // Pass real-time activity data if available
              pseudonym: seedData.pseudonym || 'Anonymous',
              currentAction: seedData.currentAction,
              currentPage: seedData.currentPage,
              deviceType: seedData.deviceType,
              // New: custom emoji and setup visibility
              customEmoji: seedData.emoji,
              hasCustomEmoji: hasCustomEmoji,
              showSetup: showSetup,
              productCount: seedData.productCount,
              averageScore: seedData.averageScore,
              isActive: seedData.isActive,
            });
            totalUserMarkers++;
            globalUserIndex++;
          }
        }
      }
    }

    // Add product logos
    if (showProducts && data?.products) {
      const productLabels = data.products
        .filter(loc => loc.count >= 3 && loc.products?.[0]?.logo)
        .slice(0, 15)
        .map(loc => {
          const coords = getApproxCoords(loc.location.country);
          if (!coords) return null;

          return {
            lat: coords.lat,
            lng: coords.lng,
            type: 'product',
            logo: loc.products[0].logo,
            name: loc.products[0].name,
            count: loc.count,
          };
        })
        .filter(Boolean);

      labels.push(...productLabels);
    }

    return labels;
  }, [showProducts, showUsers, showLegislation, data?.products, data?.users, userCoords, userCountryName, legislationData]);

  // Callback when globe is ready
  const handleGlobeReady = useCallback(() => {
    setTimeout(() => {
      if (globeEl.current) {
        try {
          const controls = globeEl.current.controls();

          if (controls) {
            // Enable smooth zoom with mouse wheel
            controls.enableZoom = true;
            controls.zoomSpeed = 1.2;

            // Enable rotation with mouse drag - smooth and responsive
            controls.enableRotate = true;
            controls.rotateSpeed = 0.6;

            // Disable pan to keep globe centered
            controls.enablePan = false;

            // Elegant slow auto-rotate for visual appeal
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.3;

            // Very smooth damping for professional feel
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            // Zoom limits - allow close inspection of countries
            controls.minDistance = 101; // Very close zoom for country details
            controls.maxDistance = 500; // Far enough to see whole Earth

            // Stop auto-rotate when user interacts
            const stopAutoRotate = () => {
              controls.autoRotate = false;
            };
            controls.addEventListener('start', stopAutoRotate);
          }

          // Cinematic intro: start far and zoom in smoothly
          globeEl.current.pointOfView({ altitude: 4, lat: 20, lng: 0 }, 0);
          
          // Then animate to user's location or default view
          setTimeout(() => {
            if (userCoords) {
              globeEl.current.pointOfView({ altitude: 2.2, lat: userCoords.lat, lng: userCoords.lng }, 2500);
            } else {
              // Default world view
              globeEl.current.pointOfView({ altitude: 2.2, lat: 20, lng: 0 }, 2000);
            }
          }, 500);
        } catch {
          // Silent fail
        }
      }
      setGlobeReady(true);
    }, 100);
  }, [userCoords]);

  if (!data) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <p className="text-white">No data available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#000814] overflow-hidden">
      {/* Ambient glow effect behind globe */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.4) 0%, rgba(59,130,246,0.2) 40%, transparent 70%)' }}
        />
      </div>

      <Globe
        ref={globeEl}
        // High-quality NASA Blue Marble texture
        globeImageUrl={GLOBE_TEXTURES.earthDay}
        // Deep space with stars background
        backgroundImageUrl={GLOBE_TEXTURES.nightSky}
        // 3D topology for realistic terrain
        bumpImageUrl={GLOBE_TEXTURES.earthBump}

        // Realistic atmosphere glow
        showAtmosphere={true}
        atmosphereColor="#4da6ff"
        atmosphereAltitude={0.25}
        showGraticules={false}

        // Points layer - LARGER for better visibility
        pointsData={allPoints}
        pointAltitude={0.02} // More visible height
        pointRadius="size"
        pointColor="color"
        pointLabel="label"
        onPointClick={handlePointClick}
        onPointHover={handlePointHover}
        pointResolution={12} // Better looking points
        pointsMerge={false} // Don't merge so individual points are clickable

        // Performance optimizations
        rendererConfig={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}

        // Arcs for international connections (multi-country products, cross-border incidents)
        arcsData={[]}
        arcColor={() => ['rgba(34, 211, 238, 0.6)', 'rgba(168, 85, 247, 0.6)']}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={0.5}
        arcAltitudeAutoScale={0.3}

        // Rings: user location + legislation country rings
        ringsData={[...userRingData, ...legislationRingsData]}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringAltitude={0.01}

        // HTML elements for logos and user avatar on globe
        htmlElementsData={htmlLabelsData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.06}
        htmlElement={d => {
          const el = document.createElement('div');

          if (d.type === 'legislation') {
            // Legislation country marker with stance indicator
            const stanceLabels = {
              very_friendly: 'Very Friendly',
              friendly: 'Friendly',
              neutral: 'Neutral',
              restrictive: 'Restrictive',
              hostile: 'Hostile',
              very_hostile: 'Very Hostile',
              unregulated: 'Unregulated',
            };
            const stanceEmojis = {
              very_friendly: '✅',
              friendly: '👍',
              neutral: '⚖️',
              restrictive: '⚠️',
              hostile: '🚫',
              very_hostile: '❌',
              unregulated: '❓',
            };
            // Escape user-controlled values to prevent XSS
            const safeName = escapeHtml(d.country.name);
            const safeCode = escapeHtml(d.country.code);
            const safeStance = stanceLabels[d.country.stance] || 'Unknown';
            const safeScore = escapeHtml(String(d.country.overallScore || 'N/A'));
            el.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                transform: translate(-50%, -50%);
                pointer-events: auto;
                cursor: pointer;
              " title="${safeName}: ${safeStance} (Score: ${safeScore})">
                <div style="
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: ${d.country.color};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 2px 8px ${d.country.color}80;
                  border: 2px solid white;
                  font-size: 12px;
                ">${stanceEmojis[d.country.stance] || '?'}</div>
                <div style="
                  background: ${d.country.color}ee;
                  color: white;
                  font-size: 9px;
                  font-weight: 600;
                  padding: 2px 6px;
                  border-radius: 8px;
                  margin-top: 3px;
                  white-space: nowrap;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                ">${safeCode}</div>
              </div>
            `;
          } else if (d.type === 'currentUser') {
            // Current user avatar marker (with "Vous" label)
            el.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                transform: translate(-50%, -50%);
                animation: bounce 2s infinite;
              ">
                <div style="
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.5);
                  border: 2px solid white;
                ">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18">
                    <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div style="
                  background: rgba(34, 197, 94, 0.95);
                  color: white;
                  font-size: 10px;
                  font-weight: 600;
                  padding: 2px 8px;
                  border-radius: 10px;
                  margin-top: 4px;
                  white-space: nowrap;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                ">Vous</div>
              </div>
              <style>
                @keyframes bounce {
                  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
                  50% { transform: translate(-50%, -50%) translateY(-5px); }
                }
              </style>
            `;
          } else if (d.type === 'otherUser') {
            // Other users - Show emoji (if custom) or avatar, with pseudonym and optional setup info
            const avatarConfig = generateAvatarConfig(d.avatarSeed || 1);
            // Use real-time activity if available, otherwise use generated activity
            const activityLabel = d.currentAction || avatarConfig.activity;
            const showActivity = d.showActivity && (d.currentAction || avatarConfig.showActivity);
            // Real-time users or users with custom emoji get a special highlight
            const isRealtime = !!d.currentAction;
            const hasCustomEmoji = d.hasCustomEmoji && d.customEmoji;
            const isActive = d.isActive || isRealtime;
            // Get the pseudonym and escape to prevent XSS
            const pseudonym = escapeHtml(d.pseudonym || 'Anonymous');
            const safeActivityLabel = escapeHtml(activityLabel);
            const safeEmoji = d.customEmoji || '🛡️';
            
            // Determine border color based on status
            const borderColor = isActive ? '#22c55e' : (hasCustomEmoji ? '#a855f7' : 'white');
            const glowColor = isActive ? 'rgba(34, 197, 94, 0.5)' : (hasCustomEmoji ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.3)');
            
            // Build setup info if user wants to show it
            let setupInfoHtml = '';
            if (d.showSetup && d.productCount > 0) {
              const scoreColor = d.averageScore >= 70 ? '#22c55e' : d.averageScore >= 50 ? '#f59e0b' : '#ef4444';
              setupInfoHtml = `
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  background: rgba(15, 23, 42, 0.95);
                  padding: 2px 6px;
                  border-radius: 8px;
                  margin-top: 2px;
                  font-size: 8px;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                ">
                  <span style="color: #94a3b8;">📦 ${d.productCount}</span>
                  ${d.averageScore ? `<span style="color: ${scoreColor}; font-weight: 600;">⭐ ${Math.round(d.averageScore)}</span>` : ''}
                </div>
              `;
            }

            // Use emoji display if user has custom emoji, otherwise use avatar
            const avatarContent = hasCustomEmoji 
              ? `<span style="font-size: 22px;">${safeEmoji}</span>`
              : generateAvatarSVG(avatarConfig, 36);

            el.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                transform: translate(-50%, -50%);
                pointer-events: auto;
                cursor: pointer;
                animation: avatarFloat ${2 + (d.avatarSeed % 2)}s ease-in-out infinite;
              ">
                <div style="
                  width: 40px;
                  height: 40px;
                  border-radius: 50%;
                  background: ${hasCustomEmoji ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : '#1e293b'};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 4px 12px ${glowColor};
                  border: 2px solid ${borderColor};
                  overflow: hidden;
                  transition: transform 0.2s ease;
                "
                onmouseover="this.style.transform='scale(1.15)'"
                onmouseout="this.style.transform='scale(1)'"
                >
                  ${avatarContent}
                </div>
                <div style="
                  background: ${isActive ? 'rgba(34, 197, 94, 0.95)' : (hasCustomEmoji ? 'rgba(168, 85, 247, 0.9)' : 'rgba(30, 41, 59, 0.95)')};
                  color: white;
                  font-size: 10px;
                  font-weight: 600;
                  padding: 3px 8px;
                  border-radius: 10px;
                  margin-top: 4px;
                  white-space: nowrap;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  border: 1px solid ${isActive ? 'rgba(34, 197, 94, 0.5)' : (hasCustomEmoji ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.3)')};
                  animation: labelFadeIn 0.3s ease;
                  max-width: 120px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                ">${pseudonym}</div>
                ${showActivity ? `
                <div style="
                  background: rgba(15, 23, 42, 0.9);
                  color: #94a3b8;
                  font-size: 8px;
                  font-weight: 400;
                  padding: 2px 6px;
                  border-radius: 8px;
                  margin-top: 2px;
                  white-space: nowrap;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                ">${safeActivityLabel}</div>
                ` : ''}
                ${setupInfoHtml}
              </div>
              <style>
                @keyframes avatarFloat {
                  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
                  50% { transform: translate(-50%, -50%) translateY(-3px); }
                }
                @keyframes labelFadeIn {
                  from { opacity: 0; transform: translateY(-5px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              </style>
            `;
            // Build tooltip with all info
            let tooltipParts = [pseudonym];
            if (isActive) tooltipParts.push('(Active)');
            if (showActivity) tooltipParts.push(`- ${safeActivityLabel}`);
            if (d.showSetup && d.productCount > 0) {
              tooltipParts.push(`| Setup: ${d.productCount} products`);
              if (d.averageScore) tooltipParts.push(`(Score: ${Math.round(d.averageScore)})`);
            }
            el.title = tooltipParts.join(' ');
          } else if (d.type === 'product') {
            // Product logo marker - escape user-controlled values
            const safeLogo = escapeHtml(d.logo);
            const safeName = escapeHtml(d.name);
            el.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                transform: translate(-50%, -50%);
                pointer-events: none;
              ">
                <img
                  src="${safeLogo}"
                  alt="${safeName}"
                  style="
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    background: white;
                    object-fit: contain;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    border: 2px solid white;
                  "
                  onerror="this.style.display='none'"
                />
                <div style="
                  background: rgba(59, 130, 246, 0.95);
                  color: white;
                  font-size: 9px;
                  font-weight: bold;
                  padding: 1px 6px;
                  border-radius: 8px;
                  margin-top: 2px;
                ">${d.count}</div>
              </div>
            `;
          }

          return el;
        }}

        // Disable unused features
        hexPolygonsData={[]}
        labelsData={[]}
        pathsData={[]}
        tilesData={[]}
        customLayerData={[]}

        // Animation optimizations
        animateIn={true}
        waitForGlobeReady={false}
        enablePointerInteraction={true}

        // Ready callback
        onGlobeReady={handleGlobeReady}
      />

      {/* Info panel for selected point - click to open, X to close */}
      {selectedPoint && (
        <div
          className="absolute top-4 right-4 w-80 bg-base-100/95 backdrop-blur-sm rounded-xl shadow-2xl border border-base-300 overflow-hidden z-10 animate-in slide-in-from-right duration-200"
        >
          {/* Header with count */}
          <div className={`px-4 py-3 ${
            selectedPoint.type === "physical" ? "bg-red-500/10" :
            selectedPoint.type === "crypto" ? "bg-amber-500/10" :
            selectedPoint.type === "node" ? "bg-cyan-500/10" :
            "bg-blue-500/10"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`text-3xl font-bold`} style={{ color: selectedPoint.type === "node" ? selectedPoint.data?.color : undefined }}>
                  <span className={
                    selectedPoint.type === "physical" ? "text-red-500" :
                    selectedPoint.type === "crypto" ? "text-amber-500" :
                    selectedPoint.type === "node" ? "" :
                    "text-blue-500"
                  }>
                    {selectedPoint.data?.count || 1}
                  </span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">
                    {selectedPoint.type === "physical" ? "attaque physique" :
                     selectedPoint.type === "crypto" ? "incident" + (selectedPoint.data?.count > 1 ? "s" : "") + " crypto" :
                     selectedPoint.type === "node" ? "nœud" + (selectedPoint.data?.count > 1 ? "s" : "") :
                     "produit" + (selectedPoint.data?.count > 1 ? "s" : "")}
                  </div>
                  <div className="text-xs text-base-content/60">
                    {selectedPoint.type === "node"
                      ? `${selectedPoint.data?.city}, ${selectedPoint.data?.country}`
                      : getCountryName(selectedPoint.data?.location?.country) || ""}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="btn btn-ghost btn-sm btn-circle hover:bg-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {selectedPoint.type === "physical" && selectedPoint.data && (
              <div className="space-y-3">
                {/* Alert banner */}
                <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs text-red-400 font-medium">Attaque confirmée</span>
                </div>

                {/* Title and details */}
                <div>
                  <h4 className="font-semibold text-white text-sm leading-tight mb-1">{selectedPoint.data.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                    <span className="px-2 py-0.5 bg-base-200 rounded-full capitalize">
                      {selectedPoint.data.incidentType?.replace(/_/g, ' ') || 'Attaque'}
                    </span>
                    <span>•</span>
                    <span>{new Date(selectedPoint.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Amount lost */}
                {selectedPoint.data.amountLost > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="text-xs text-red-400/80 mb-1">Montant perdu</div>
                    <div className="text-xl font-bold text-red-500">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(selectedPoint.data.amountLost)}
                    </div>
                  </div>
                )}

                {/* Location info */}
                {selectedPoint.data.location?.city && (
                  <div className="flex items-center gap-2 text-xs text-base-content/60">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span>{selectedPoint.data.location.city}, {getCountryName(selectedPoint.data.location.country)}</span>
                  </div>
                )}
              </div>
            )}

            {selectedPoint.type === "crypto" && selectedPoint.data && (
              <div className="space-y-3">
                {/* Total funds lost */}
                {selectedPoint.data.totalFundsLost > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="text-xs text-amber-400/80 mb-1">Total des pertes</div>
                    <div className="text-xl font-bold text-amber-500">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(selectedPoint.data.totalFundsLost)}
                    </div>
                  </div>
                )}

                {/* Incidents list */}
                <div className="space-y-2">
                  <div className="text-xs text-base-content/60 font-medium">Incidents récents</div>
                  {selectedPoint.data.incidents?.slice(0, 5).map((inc, i) => (
                    <div key={i} className="p-2 bg-base-200 rounded-lg border border-base-300/50 hover:border-amber-500/30 transition-colors">
                      <div className="font-medium text-xs truncate text-white/90">{inc.title}</div>
                      <div className="flex items-center justify-between mt-1">
                        {inc.fundsLost > 0 && (
                          <span className="text-amber-500 text-xs font-medium">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', notation: 'compact' }).format(inc.fundsLost)}
                          </span>
                        )}
                        {inc.date && (
                          <span className="text-[10px] text-base-content/50">
                            {new Date(inc.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPoint.data.incidents?.length > 5 && (
                  <div className="text-xs text-center text-amber-400/70 pt-1">
                    +{selectedPoint.data.incidents.length - 5} autres incidents
                  </div>
                )}
              </div>
            )}

            {selectedPoint.type === "node" && selectedPoint.data && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg"
                    style={{ backgroundColor: selectedPoint.data.color, boxShadow: `0 4px 12px ${selectedPoint.data.color}50` }}
                  >
                    {selectedPoint.data.blockchain}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{selectedPoint.data.blockchainName}</div>
                    <div className="flex items-center gap-1 text-xs text-base-content/60">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span>{selectedPoint.data.city}, {selectedPoint.data.country}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-base-200 rounded-lg p-3 border border-base-300/50">
                    <div className="text-xs text-base-content/60 mb-1">Nœuds ici</div>
                    <div className="text-lg font-bold" style={{ color: selectedPoint.data.color }}>{selectedPoint.data.count?.toLocaleString()}</div>
                  </div>
                  <div className="bg-base-200 rounded-lg p-3 border border-base-300/50">
                    <div className="text-xs text-base-content/60 mb-1">Coordonnées</div>
                    <div className="font-mono text-xs text-white/80">{selectedPoint.data.lat?.toFixed(2)}, {selectedPoint.data.lng?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {selectedPoint.type === "product" && selectedPoint.data && (
              <div className="space-y-3">
                {/* Products header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-base-content/60 font-medium">
                    {selectedPoint.data.products?.length || 0} produit{(selectedPoint.data.products?.length || 0) > 1 ? 's' : ''} disponible{(selectedPoint.data.products?.length || 0) > 1 ? 's' : ''}
                  </span>
                  <Link
                    href={`/products?country=${selectedPoint.data.location?.country}`}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    Voir tout
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>

                {/* Product list */}
                <div className="space-y-2">
                  {selectedPoint.data.products?.slice(0, 6).map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="flex items-center gap-3 p-2.5 bg-base-200 rounded-xl border border-base-300/50 hover:border-blue-500/30 hover:bg-base-200/80 transition-all cursor-pointer group"
                    >
                      {/* Product logo with multi-country indicator */}
                      <div className="relative">
                        {product.logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={product.logo}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-contain bg-white p-1 shadow-sm"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center text-sm font-bold text-blue-400 border border-blue-500/20">
                            {product.name?.charAt(0) || '?'}
                          </div>
                        )}
                        {/* Multi-country badge */}
                        {product.isMultiCountry && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center" title="Disponible dans plusieurs pays">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-2.5 h-2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                          {product.name}
                          {product.isMultiCountry && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-medium">
                              Global
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.category && (
                            <span className="text-[10px] text-base-content/50 capitalize bg-base-300/50 px-1.5 py-0.5 rounded">
                              {product.category}
                            </span>
                          )}
                          {product.productType && product.productType !== product.category && (
                            <span className="text-[10px] text-base-content/40 capitalize">
                              {product.productType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* SAFE Score badge */}
                      {product.safeScore != null && (
                        <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border ${
                          product.safeScore >= 8 ? 'bg-green-500/10 border-green-500/30' :
                          product.safeScore >= 6 ? 'bg-amber-500/10 border-amber-500/30' :
                          'bg-red-500/10 border-red-500/30'
                        }`}>
                          <div className={`text-base font-bold ${
                            product.safeScore >= 8 ? 'text-green-400' :
                            product.safeScore >= 6 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {product.safeScore.toFixed(1)}
                          </div>
                          <div className="text-[8px] font-semibold text-base-content/50 tracking-wider">SAFE</div>
                        </div>
                      )}

                      {/* Arrow indicator */}
                      <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-blue-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* View more button */}
                {selectedPoint.data.products?.length > 6 && (
                  <Link
                    href={`/products?country=${selectedPoint.data.location?.country}`}
                    className="block w-full text-center py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-xs text-blue-400 font-medium transition-colors"
                  >
                    +{selectedPoint.data.products.length - 6} autres produits
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator - simplified */}
      {!globeReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 z-20">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-4 text-white/80">Loading Globe...</p>
          </div>
        </div>
      )}

      {/* Legend and user location moved to page.js for cleaner UX */}

      {/* Enhanced Controls Panel - Right side */}
      <div className="absolute bottom-8 right-4 flex flex-col gap-2 z-10">
        {/* Zoom controls */}
        <div className="flex flex-col gap-1 p-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 hover:border-cyan-500/50 border border-transparent flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all"
            title="Zoom in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 hover:border-cyan-500/50 border border-transparent flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all"
            title="Zoom out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <div className="h-px bg-slate-700/50 mx-1" />
          <button
            onClick={() => {
              if (globeEl.current) {
                globeEl.current.pointOfView({ altitude: 2.5, lat: 20, lng: 0 }, 1000);
              }
            }}
            className="w-10 h-10 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 hover:border-cyan-500/50 border border-transparent flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all"
            title="Reset view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </button>
        </div>

        {/* Share controls */}
        <div className="flex flex-col gap-1 p-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50">
          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              // Show toast or feedback
              const btn = document.getElementById('share-link-btn');
              if (btn) {
                btn.classList.add('text-emerald-400');
                setTimeout(() => btn.classList.remove('text-emerald-400'), 1500);
              }
            }}
            id="share-link-btn"
            className="w-10 h-10 rounded-lg bg-slate-800/90 hover:bg-emerald-500/20 hover:border-emerald-500/50 border border-transparent flex items-center justify-center text-slate-300 hover:text-emerald-400 transition-all"
            title="Copy link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </button>
          <button
            onClick={() => {
              const text = "Explore crypto security data on SafeScoring's interactive 3D globe 🌍";
              const url = window.location.href;
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=550,height=420');
            }}
            className="w-10 h-10 rounded-lg bg-slate-800/90 hover:bg-blue-500/20 hover:border-blue-500/50 border border-transparent flex items-center justify-center text-slate-300 hover:text-blue-400 transition-all"
            title="Share on X/Twitter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>
          <button
            onClick={() => {
              const url = window.location.href;
              window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=550,height=420');
            }}
            className="w-10 h-10 rounded-lg bg-slate-800/90 hover:bg-blue-600/20 hover:border-blue-600/50 border border-transparent flex items-center justify-center text-slate-300 hover:text-blue-500 transition-all"
            title="Share on LinkedIn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Branding watermark */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 backdrop-blur-sm border border-slate-800/50">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-500 via-cyan-500 to-purple-500 flex items-center justify-center">
          <span className="text-[10px] font-black text-white">S</span>
        </div>
        <span className="text-xs font-medium text-slate-400">SafeScoring</span>
        <span className="text-[10px] text-slate-600">|</span>
        <span className="text-[10px] text-slate-500">Crypto Security Map</span>
      </div>

      {/* Loading indicator - simplified */}
      {!globeReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 z-20">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-4 text-white/80">Loading Globe...</p>
          </div>
        </div>
      )}
    </div>
  );
});

// Optimized country coordinates lookup (memoized)
const COORDS_CACHE = new Map();

// Country geographic spread (approximate radius in degrees)
// Increased values for better visual distribution on the globe
const COUNTRY_RADIUS = {
  US: 18, CA: 22, RU: 28, CN: 14, BR: 14, AU: 14, IN: 10, AR: 12,
  MX: 8, ID: 10, SA: 10, KZ: 12, DZ: 10, FR: 5, ES: 5, DE: 4,
  IT: 4, GB: 4, JP: 4, PL: 4, SE: 6, NO: 6, FI: 5, TR: 5,
  UA: 5, EG: 5, ZA: 6, TH: 4, VN: 5, MY: 4, PH: 5, KR: 3,
  NL: 2.5, BE: 2, CH: 2, AT: 2.5, CZ: 2.5, PT: 3, GR: 3,
  HU: 2.5, RO: 4, BG: 3, HR: 2.5, SK: 2.5, SI: 1.5, LT: 2.5, LV: 2.5,
  EE: 2, IE: 3, DK: 2.5, IS: 3, NZ: 5, CL: 8, CO: 5, PE: 6,
  VE: 5, NG: 5, KE: 4, GH: 3, TZ: 5, UG: 3, MA: 5, TN: 3,
  SG: 1, HK: 1, MT: 0.8, CY: 1.5, LU: 1, LI: 0.8, MC: 0.5,
  AE: 3, QA: 1.5, KW: 1.5, BH: 1, IL: 2, JO: 2, LB: 1.5,
  TW: 2.5, PA: 2, CR: 2, GT: 2, SV: 1.5, HN: 2, NI: 2.5,
  JM: 1.5, TT: 1, BS: 2, BB: 0.8, SC: 0.8, KY: 0.8, BM: 0.5,
  XX: 2,
};

function getApproxCoords(countryCode) {
  if (!countryCode) return null;
  if (COORDS_CACHE.has(countryCode)) {
    return COORDS_CACHE.get(countryCode);
  }

  // Use centralized coordinates from libs/country-coordinates.js
  const coordData = COUNTRY_COORDINATES[countryCode.toUpperCase()];
  const result = coordData ? { lat: coordData.lat, lng: coordData.lng } : null;
  COORDS_CACHE.set(countryCode, result);
  return result;
}

// Generate random coordinates within a country's approximate area
function getRandomCoordsInCountry(countryCode, seed, angle) {
  const center = getApproxCoords(countryCode);
  if (!center) return null;

  const radius = COUNTRY_RADIUS[countryCode] || 2;
  // Use seed for consistent random distance, angle is already random
  const distance = Math.sqrt(seed) * radius; // sqrt for uniform distribution

  // Calculate lat offset
  const latOffset = distance * Math.cos(angle);

  // Adjust longitude offset for latitude (Earth's curvature)
  // At higher latitudes, 1° longitude covers less distance
  const latRadians = center.lat * Math.PI / 180;
  const lngCorrection = Math.cos(latRadians);
  const lngOffset = lngCorrection > 0.1
    ? (distance * Math.sin(angle)) / lngCorrection
    : distance * Math.sin(angle);

  return {
    lat: Math.max(-85, Math.min(85, center.lat + latOffset)),
    lng: ((center.lng + lngOffset + 180) % 360) - 180, // Normalize to -180 to 180
  };
}

export default Globe3D;
