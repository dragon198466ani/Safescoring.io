import { NextResponse } from "next/server";
import { quickProtect } from "@/libs/api-protection";

// Cache for API responses (5 minutes)
let nodesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch real Bitcoin node count from Bitnodes API
// Note: Bitnodes doesn't provide geolocation in snapshots, only total count
async function fetchBitcoinNodeCount() {
  try {
    const response = await fetch("https://bitnodes.io/api/v1/snapshots/latest/", {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      console.error("Bitnodes API error:", response.status);
      return null;
    }

    const data = await response.json();
    return {
      totalNodes: data.total_nodes || 0,
      lastUpdated: data.timestamp,
      latestHeight: data.latest_height
    };
  } catch (error) {
    console.error("Failed to fetch Bitcoin node count:", error);
    return null;
  }
}

// Scale static node distribution to match real total count
function scaleNodeDistribution(staticNodes, realTotal, staticTotal) {
  if (!staticNodes || staticNodes.length === 0) return [];
  if (!staticTotal || staticTotal === 0) return staticNodes;

  const ratio = realTotal / staticTotal;
  return staticNodes.map(node => ({
    ...node,
    count: Math.round(node.count * ratio)
  })).filter(node => node.count >= 1);
}

// Fetch Ethereum nodes from Ethernodes API
async function fetchEthereumNodes() {
  try {
    // Ethernodes doesn't have a public API, using nodewatch.io alternative
    const response = await fetch("https://ethernodes.org/api/nodes", {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      return null; // Fall back to static data
    }

    const data = await response.json();
    // Process ethernodes data if available
    return null; // API might not be accessible, use fallback
  } catch (error) {
    return null; // Use fallback data
  }
}

// Fallback static data for chains without public APIs
// Launch dates are when the mainnet went live
// endDate is when the chain was discontinued or collapsed (optional)
const STATIC_BLOCKCHAIN_NODES = {
  // Defunct chains (have endDate)
  terra: {
    name: "Terra (Luna Classic)",
    symbol: "LUNC",
    color: "#5493f7",
    launchDate: "2019-04-24", // Terra mainnet
    endDate: "2022-05-13", // UST/LUNA collapse
    totalNodes: 130,
    nodes: [
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 35 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 25 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 18 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 15 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 12 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 10 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 8 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 7 },
    ],
  },
  bitconnect: {
    name: "BitConnect",
    symbol: "BCC",
    color: "#c41e3a",
    launchDate: "2016-11-01",
    endDate: "2018-01-17", // Ponzi scheme collapse
    totalNodes: 45,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 12 },
      { country: "IN", city: "Mumbai", lat: 19.076, lng: 72.8777, count: 10 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 8 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 6 },
      { country: "VN", city: "Ho Chi Minh", lat: 10.8231, lng: 106.6297, count: 5 },
      { country: "PH", city: "Manila", lat: 14.5995, lng: 120.9842, count: 4 },
    ],
  },
  onecoin: {
    name: "OneCoin",
    symbol: "ONE",
    color: "#d4af37",
    launchDate: "2015-01-01",
    endDate: "2017-10-01", // Exposed as fraud
    totalNodes: 20,
    nodes: [
      { country: "BG", city: "Sofia", lat: 42.6977, lng: 23.3219, count: 8 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 5 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 4 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 3 },
    ],
  },
  // Active chains
  bitcoin: {
    name: "Bitcoin",
    symbol: "BTC",
    color: "#f7931a",
    launchDate: "2009-01-03", // Genesis block
    totalNodes: 18500,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 2100 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 1800 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 950 },
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 720 },
      { country: "US", city: "Miami", lat: 25.7617, lng: -80.1918, count: 480 },
      { country: "US", city: "Seattle", lat: 47.6062, lng: -122.3321, count: 520 },
      { country: "US", city: "Dallas", lat: 32.7767, lng: -96.797, count: 380 },
      { country: "US", city: "Denver", lat: 39.7392, lng: -104.9903, count: 290 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 1650 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 480 },
      { country: "DE", city: "Munich", lat: 48.1351, lng: 11.582, count: 320 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 980 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 720 },
      { country: "FR", city: "Lyon", lat: 45.764, lng: 4.8357, count: 180 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 890 },
      { country: "GB", city: "Manchester", lat: 53.4808, lng: -2.2426, count: 220 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 650 },
      { country: "CA", city: "Vancouver", lat: 49.2827, lng: -123.1207, count: 380 },
      { country: "CA", city: "Montreal", lat: 45.5017, lng: -73.5673, count: 290 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 580 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 720 },
      { country: "JP", city: "Osaka", lat: 34.6937, lng: 135.5023, count: 180 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 420 },
      { country: "AU", city: "Melbourne", lat: -37.8136, lng: 144.9631, count: 280 },
      { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 380 },
      { country: "CH", city: "Geneva", lat: 46.2044, lng: 6.1432, count: 150 },
      { country: "FI", city: "Helsinki", lat: 60.1699, lng: 24.9384, count: 290 },
      { country: "SE", city: "Stockholm", lat: 59.3293, lng: 18.0686, count: 320 },
      { country: "NO", city: "Oslo", lat: 59.9139, lng: 10.7522, count: 180 },
      { country: "DK", city: "Copenhagen", lat: 55.6761, lng: 12.5683, count: 150 },
      { country: "IE", city: "Dublin", lat: 53.3498, lng: -6.2603, count: 220 },
      { country: "AT", city: "Vienna", lat: 48.2082, lng: 16.3738, count: 180 },
      { country: "PL", city: "Warsaw", lat: 52.2297, lng: 21.0122, count: 290 },
      { country: "CZ", city: "Prague", lat: 50.0755, lng: 14.4378, count: 180 },
      { country: "RU", city: "Moscow", lat: 55.7558, lng: 37.6173, count: 380 },
      { country: "RU", city: "St Petersburg", lat: 59.9343, lng: 30.3351, count: 150 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 420 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 380 },
      { country: "IN", city: "Mumbai", lat: 19.076, lng: 72.8777, count: 220 },
      { country: "IN", city: "Bangalore", lat: 12.9716, lng: 77.5946, count: 180 },
      { country: "BR", city: "Sao Paulo", lat: -23.5505, lng: -46.6333, count: 280 },
      { country: "AR", city: "Buenos Aires", lat: -34.6037, lng: -58.3816, count: 120 },
      { country: "ZA", city: "Johannesburg", lat: -26.2041, lng: 28.0473, count: 95 },
      { country: "IL", city: "Tel Aviv", lat: 32.0853, lng: 34.7818, count: 180 },
      { country: "AE", city: "Dubai", lat: 25.2048, lng: 55.2708, count: 150 },
    ],
  },
  ethereum: {
    name: "Ethereum",
    symbol: "ETH",
    color: "#627eea",
    launchDate: "2015-07-30", // Frontier release
    totalNodes: 9200,
    nodes: [
      { country: "US", city: "Ashburn", lat: 39.0438, lng: -77.4874, count: 1450 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 680 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 520 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 480 },
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 320 },
      { country: "US", city: "Seattle", lat: 47.6062, lng: -122.3321, count: 280 },
      { country: "US", city: "Dallas", lat: 32.7767, lng: -96.797, count: 220 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 1200 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 380 },
      { country: "DE", city: "Munich", lat: 48.1351, lng: 11.582, count: 220 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 750 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 520 },
      { country: "GB", city: "Manchester", lat: 53.4808, lng: -2.2426, count: 150 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 380 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 420 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 380 },
      { country: "JP", city: "Osaka", lat: 34.6937, lng: 135.5023, count: 120 },
      { country: "FI", city: "Helsinki", lat: 60.1699, lng: 24.9384, count: 280 },
      { country: "CA", city: "Montreal", lat: 45.5017, lng: -73.5673, count: 320 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 280 },
      { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 220 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 180 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 280 },
      { country: "SE", city: "Stockholm", lat: 59.3293, lng: 18.0686, count: 180 },
      { country: "PL", city: "Warsaw", lat: 52.2297, lng: 21.0122, count: 150 },
      { country: "IE", city: "Dublin", lat: 53.3498, lng: -6.2603, count: 180 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 220 },
      { country: "IN", city: "Mumbai", lat: 19.076, lng: 72.8777, count: 150 },
      { country: "BR", city: "Sao Paulo", lat: -23.5505, lng: -46.6333, count: 120 },
    ],
  },
  solana: {
    name: "Solana",
    symbol: "SOL",
    color: "#00ffa3",
    launchDate: "2020-03-16", // Mainnet beta
    totalNodes: 3400,
    nodes: [
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 580 },
      { country: "US", city: "Dallas", lat: 32.7767, lng: -96.797, count: 420 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 380 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 280 },
      { country: "US", city: "Miami", lat: 25.7617, lng: -80.1918, count: 220 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 180 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 380 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 150 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 290 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 250 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 220 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 180 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 150 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 120 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 110 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 90 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 120 },
    ],
  },
  polygon: {
    name: "Polygon",
    symbol: "MATIC",
    color: "#8247e5",
    launchDate: "2020-05-31", // Mainnet launch
    totalNodes: 1100,
    nodes: [
      { country: "US", city: "Virginia", lat: 37.4316, lng: -78.6569, count: 220 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 150 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 120 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 180 },
      { country: "IN", city: "Mumbai", lat: 19.076, lng: 72.8777, count: 150 },
      { country: "IN", city: "Bangalore", lat: 12.9716, lng: 77.5946, count: 95 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 120 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 95 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 85 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 75 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 65 },
    ],
  },
  avalanche: {
    name: "Avalanche",
    symbol: "AVAX",
    color: "#e84142",
    launchDate: "2020-09-21", // Mainnet launch
    totalNodes: 1800,
    nodes: [
      { country: "US", city: "Seattle", lat: 47.6062, lng: -122.3321, count: 320 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 220 },
      { country: "US", city: "Miami", lat: 25.7617, lng: -80.1918, count: 180 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 150 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 220 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 95 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 150 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 130 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 110 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 90 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 85 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 75 },
      { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 65 },
    ],
  },
  cardano: {
    name: "Cardano",
    symbol: "ADA",
    color: "#0033ad",
    launchDate: "2017-09-29", // Mainnet launch
    totalNodes: 3200,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 380 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 220 },
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 180 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 320 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 220 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 280 },
      { country: "JP", city: "Osaka", lat: 34.6937, lng: 135.5023, count: 95 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 220 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 190 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 150 },
      { country: "AU", city: "Melbourne", lat: -37.8136, lng: 144.9631, count: 120 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 95 },
      { country: "BR", city: "Sao Paulo", lat: -23.5505, lng: -46.6333, count: 95 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 110 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 120 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 85 },
    ],
  },
  xrp: {
    name: "XRP Ledger",
    symbol: "XRP",
    color: "#23292f",
    launchDate: "2012-06-02", // First ledger
    totalNodes: 850,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 180 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 120 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 150 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 95 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 85 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 75 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 65 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 45 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 55 },
    ],
  },
  litecoin: {
    name: "Litecoin",
    symbol: "LTC",
    color: "#bfbbbb",
    launchDate: "2011-10-13", // Genesis block
    totalNodes: 1400,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 280 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 220 },
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 150 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 180 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 120 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 95 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 75 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 85 },
      { country: "RU", city: "Moscow", lat: 55.7558, lng: 37.6173, count: 65 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 55 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 45 },
    ],
  },
  dogecoin: {
    name: "Dogecoin",
    symbol: "DOGE",
    color: "#c2a633",
    launchDate: "2013-12-06", // Genesis block
    totalNodes: 1200,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 250 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 180 },
      { country: "US", city: "Miami", lat: 25.7617, lng: -80.1918, count: 120 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 150 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 95 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 85 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 75 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 65 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 55 },
      { country: "BR", city: "Sao Paulo", lat: -23.5505, lng: -46.6333, count: 45 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 50 },
    ],
  },
  polkadot: {
    name: "Polkadot",
    symbol: "DOT",
    color: "#e6007a",
    launchDate: "2020-05-26",
    totalNodes: 1000,
    nodes: [
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 180 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 120 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 150 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 95 },
      { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 85 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 75 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 65 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 55 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 65 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 45 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 35 },
    ],
  },
  cosmos: {
    name: "Cosmos Hub",
    symbol: "ATOM",
    color: "#2e3148",
    launchDate: "2019-03-13",
    totalNodes: 450,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 85 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 65 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 55 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 45 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 35 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 45 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 35 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 30 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 35 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 25 },
    ],
  },
  tezos: {
    name: "Tezos",
    symbol: "XTZ",
    color: "#2c7df7",
    launchDate: "2018-09-17",
    totalNodes: 380,
    nodes: [
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 75 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 55 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 65 },
      { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 45 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 35 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 30 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 25 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 25 },
      { country: "CA", city: "Montreal", lat: 45.5017, lng: -73.5673, count: 20 },
    ],
  },
  algorand: {
    name: "Algorand",
    symbol: "ALGO",
    color: "#000000",
    launchDate: "2019-06-19",
    totalNodes: 1300,
    nodes: [
      { country: "US", city: "Boston", lat: 42.3601, lng: -71.0589, count: 280 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 220 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 150 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 120 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 95 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 85 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 75 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 65 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 55 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 45 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 50 },
      { country: "IT", city: "Milan", lat: 45.4642, lng: 9.19, count: 35 },
    ],
  },
  near: {
    name: "NEAR Protocol",
    symbol: "NEAR",
    color: "#00c08b",
    launchDate: "2020-04-22",
    totalNodes: 280,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 65 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 45 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 35 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 25 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 30 },
      { country: "UA", city: "Kyiv", lat: 50.4501, lng: 30.5234, count: 25 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 20 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 20 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 15 },
    ],
  },
  fantom: {
    name: "Fantom",
    symbol: "FTM",
    color: "#1969ff",
    launchDate: "2019-12-27",
    totalNodes: 65,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 15 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 12 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 10 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 8 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 8 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 6 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 6 },
    ],
  },
  arbitrum: {
    name: "Arbitrum",
    symbol: "ARB",
    color: "#28a0f0",
    launchDate: "2021-08-31",
    totalNodes: 45,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 12 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 8 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 8 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 6 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 5 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 4 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 4 },
    ],
  },
  optimism: {
    name: "Optimism",
    symbol: "OP",
    color: "#ff0420",
    launchDate: "2021-12-16",
    totalNodes: 35,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 10 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 8 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 6 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 4 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 4 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 3 },
    ],
  },
  bnbchain: {
    name: "BNB Chain",
    symbol: "BNB",
    color: "#f0b90b",
    launchDate: "2019-04-18",
    totalNodes: 56,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 12 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 10 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 8 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 6 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 6 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 5 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 5 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 4 },
    ],
  },
  tron: {
    name: "TRON",
    symbol: "TRX",
    color: "#ff0013",
    launchDate: "2018-05-31",
    totalNodes: 450,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 85 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 65 },
      { country: "CN", city: "Beijing", lat: 39.9042, lng: 116.4074, count: 55 },
      { country: "CN", city: "Shanghai", lat: 31.2304, lng: 121.4737, count: 45 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 45 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 35 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 30 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 35 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 25 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 30 },
    ],
  },
  stellar: {
    name: "Stellar",
    symbol: "XLM",
    color: "#14b6e7",
    launchDate: "2014-07-31",
    totalNodes: 85,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 20 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 15 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 12 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 10 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 8 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 8 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 6 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 6 },
    ],
  },
  monero: {
    name: "Monero",
    symbol: "XMR",
    color: "#ff6600",
    launchDate: "2014-04-18",
    totalNodes: 2800,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 380 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 280 },
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 180 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 320 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 150 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 220 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 180 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 150 },
      { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 120 },
      { country: "RU", city: "Moscow", lat: 55.7558, lng: 37.6173, count: 180 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 95 },
      { country: "FI", city: "Helsinki", lat: 60.1699, lng: 24.9384, count: 120 },
      { country: "SE", city: "Stockholm", lat: 59.3293, lng: 18.0686, count: 95 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 85 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 65 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 75 },
    ],
  },
  zcash: {
    name: "Zcash",
    symbol: "ZEC",
    color: "#ecb244",
    launchDate: "2016-10-28",
    totalNodes: 320,
    nodes: [
      { country: "US", city: "Denver", lat: 39.7392, lng: -104.9903, count: 75 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 55 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 45 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 35 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 30 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 25 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 20 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 18 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 15 },
    ],
  },
  dash: {
    name: "Dash",
    symbol: "DASH",
    color: "#008ce7",
    launchDate: "2014-01-18",
    totalNodes: 4500,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 650 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 480 },
      { country: "US", city: "Miami", lat: 25.7617, lng: -80.1918, count: 320 },
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 280 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 420 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 180 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 320 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 220 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 280 },
      { country: "VE", city: "Caracas", lat: 10.4806, lng: -66.9036, count: 180 },
      { country: "NG", city: "Lagos", lat: 6.5244, lng: 3.3792, count: 150 },
      { country: "BR", city: "Sao Paulo", lat: -23.5505, lng: -46.6333, count: 180 },
      { country: "AR", city: "Buenos Aires", lat: -34.6037, lng: -58.3816, count: 120 },
      { country: "MX", city: "Mexico City", lat: 19.4326, lng: -99.1332, count: 95 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 85 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 75 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 65 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 55 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 95 },
      { country: "RU", city: "Moscow", lat: 55.7558, lng: 37.6173, count: 120 },
    ],
  },
  bitcoincash: {
    name: "Bitcoin Cash",
    symbol: "BCH",
    color: "#8dc351",
    launchDate: "2017-08-01",
    totalNodes: 1100,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 180 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 150 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 95 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 120 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 95 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 75 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 85 },
      { country: "CN", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 65 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 55 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 45 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 55 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 45 },
    ],
  },
  ethereumclassic: {
    name: "Ethereum Classic",
    symbol: "ETC",
    color: "#328332",
    launchDate: "2016-07-20",
    totalNodes: 580,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 95 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 75 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 85 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 55 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 45 },
      { country: "CN", city: "Shanghai", lat: 31.2304, lng: 121.4737, count: 65 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 45 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 55 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 35 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 25 },
    ],
  },
  chainlink: {
    name: "Chainlink",
    symbol: "LINK",
    color: "#375bd2",
    launchDate: "2019-05-30",
    totalNodes: 850,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 180 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 150 },
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 85 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 95 },
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 55 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 75 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 55 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 45 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 45 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 35 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 30 },
    ],
  },
  uniswap: {
    name: "Uniswap",
    symbol: "UNI",
    color: "#ff007a",
    launchDate: "2018-11-02",
    totalNodes: 120,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 35 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 25 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 18 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 15 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 12 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 10 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 8 },
    ],
  },
  aave: {
    name: "Aave",
    symbol: "AAVE",
    color: "#b6509e",
    launchDate: "2020-01-08",
    totalNodes: 95,
    nodes: [
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 25 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 20 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 15 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 12 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 10 },
      { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 8 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 5 },
    ],
  },
  filecoin: {
    name: "Filecoin",
    symbol: "FIL",
    color: "#0090ff",
    launchDate: "2020-10-15",
    totalNodes: 2800,
    nodes: [
      { country: "CN", city: "Shenzhen", lat: 22.5431, lng: 114.0579, count: 650 },
      { country: "CN", city: "Shanghai", lat: 31.2304, lng: 121.4737, count: 480 },
      { country: "CN", city: "Beijing", lat: 39.9042, lng: 116.4074, count: 320 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 280 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 180 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 120 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 150 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 95 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 120 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 85 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 75 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 65 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 45 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 35 },
    ],
  },
  hedera: {
    name: "Hedera",
    symbol: "HBAR",
    color: "#00094f",
    launchDate: "2019-09-16",
    totalNodes: 39,
    nodes: [
      { country: "US", city: "Dallas", lat: 32.7767, lng: -96.797, count: 8 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 6 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 5 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 5 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 4 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 4 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 4 },
      { country: "IN", city: "Mumbai", lat: 19.076, lng: 72.8777, count: 3 },
    ],
  },
  sui: {
    name: "Sui",
    symbol: "SUI",
    color: "#4da2ff",
    launchDate: "2023-05-03",
    totalNodes: 106,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 25 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 18 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 15 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 12 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 10 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 8 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 8 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 6 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 4 },
    ],
  },
  aptos: {
    name: "Aptos",
    symbol: "APT",
    color: "#4cd9a1",
    launchDate: "2022-10-17",
    totalNodes: 102,
    nodes: [
      { country: "US", city: "Palo Alto", lat: 37.4419, lng: -122.143, count: 28 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 18 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 12 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 12 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 10 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 8 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 8 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 6 },
    ],
  },
  sei: {
    name: "Sei",
    symbol: "SEI",
    color: "#9b1c1c",
    launchDate: "2023-08-15",
    totalNodes: 85,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 22 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 15 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 12 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 10 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 8 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 8 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 6 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 4 },
    ],
  },
  injective: {
    name: "Injective",
    symbol: "INJ",
    color: "#00f2fe",
    launchDate: "2021-11-22",
    totalNodes: 65,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 15 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 12 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 10 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 8 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 7 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 6 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 5 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 4 },
    ],
  },
  celestia: {
    name: "Celestia",
    symbol: "TIA",
    color: "#7b2bf9",
    launchDate: "2023-10-31",
    totalNodes: 95,
    nodes: [
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 25 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 18 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 12 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 10 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 10 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 8 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 6 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 6 },
    ],
  },
  iota: {
    name: "IOTA",
    symbol: "IOTA",
    color: "#131f37",
    launchDate: "2016-07-11",
    totalNodes: 280,
    nodes: [
      { country: "DE", city: "Berlin", lat: 52.52, lng: 13.405, count: 65 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 45 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 35 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 28 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 25 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 22 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 18 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 15 },
      { country: "FI", city: "Helsinki", lat: 60.1699, lng: 24.9384, count: 15 },
      { country: "CH", city: "Zurich", lat: 47.3769, lng: 8.5417, count: 12 },
    ],
  },
  vechain: {
    name: "VeChain",
    symbol: "VET",
    color: "#15bdff",
    launchDate: "2018-06-30",
    totalNodes: 101,
    nodes: [
      { country: "CN", city: "Shanghai", lat: 31.2304, lng: 121.4737, count: 25 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 18 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 15 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 12 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 10 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 8 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 6 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 5 },
      { country: "IT", city: "Milan", lat: 45.4642, lng: 9.19, count: 4 },
    ],
  },
  theta: {
    name: "Theta",
    symbol: "THETA",
    color: "#2ab8e6",
    launchDate: "2019-03-15",
    totalNodes: 4500,
    nodes: [
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 850 },
      { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194, count: 520 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 380 },
      { country: "US", city: "Seattle", lat: 47.6062, lng: -122.3321, count: 280 },
      { country: "KR", city: "Seoul", lat: 37.5665, lng: 126.978, count: 420 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 320 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 280 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 220 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 180 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 150 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 120 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 95 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 85 },
      { country: "HK", city: "Hong Kong", lat: 22.3193, lng: 114.1694, count: 75 },
      { country: "BR", city: "Sao Paulo", lat: -23.5505, lng: -46.6333, count: 55 },
    ],
  },
  kaspa: {
    name: "Kaspa",
    symbol: "KAS",
    color: "#49eacb",
    launchDate: "2021-11-07",
    totalNodes: 450,
    nodes: [
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 85 },
      { country: "US", city: "Los Angeles", lat: 34.0522, lng: -118.2437, count: 65 },
      { country: "US", city: "Chicago", lat: 41.8781, lng: -87.6298, count: 45 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 55 },
      { country: "RU", city: "Moscow", lat: 55.7558, lng: 37.6173, count: 45 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 35 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 30 },
      { country: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832, count: 25 },
      { country: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503, count: 22 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 20 },
      { country: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093, count: 18 },
      { country: "FR", city: "Paris", lat: 48.8566, lng: 2.3522, count: 15 },
    ],
  },
  ton: {
    name: "TON",
    symbol: "TON",
    color: "#0098ea",
    launchDate: "2021-09-01",
    totalNodes: 380,
    nodes: [
      { country: "RU", city: "Moscow", lat: 55.7558, lng: 37.6173, count: 85 },
      { country: "RU", city: "St Petersburg", lat: 59.9343, lng: 30.3351, count: 45 },
      { country: "DE", city: "Frankfurt", lat: 50.1109, lng: 8.6821, count: 55 },
      { country: "US", city: "New York", lat: 40.7128, lng: -74.006, count: 45 },
      { country: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041, count: 35 },
      { country: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198, count: 30 },
      { country: "FI", city: "Helsinki", lat: 60.1699, lng: 24.9384, count: 25 },
      { country: "GB", city: "London", lat: 51.5074, lng: -0.1278, count: 22 },
      { country: "UA", city: "Kyiv", lat: 50.4501, lng: 30.5234, count: 20 },
      { country: "AE", city: "Dubai", lat: 25.2048, lng: 55.2708, count: 18 },
    ],
  },
};

export async function GET(request) {
  // SECURITY: Rate limiting to prevent abuse
  const protection = await quickProtect(request, "public");
  if (protection.blocked) {
    return protection.response;
  }

  try {
    // Check cache first
    const now = Date.now();
    if (nodesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(nodesCache);
    }

    // Fetch real Bitcoin node count from Bitnodes API
    const liveBitcoinData = await fetchBitcoinNodeCount();

    // Build blockchains array - use live data where available, static otherwise
    const blockchains = [];

    // Bitcoin - use real count with scaled distribution
    const staticBtc = STATIC_BLOCKCHAIN_NODES.bitcoin;
    const staticBtcTotal = staticBtc.nodes.reduce((sum, n) => sum + n.count, 0);

    if (liveBitcoinData && liveBitcoinData.totalNodes > 0) {
      // Scale the static distribution to match real node count
      const scaledNodes = scaleNodeDistribution(
        staticBtc.nodes,
        liveBitcoinData.totalNodes,
        staticBtcTotal
      );

      console.log(`✅ Bitcoin: ${liveBitcoinData.totalNodes.toLocaleString()} nodes (live) across ${scaledNodes.length} locations`);
      blockchains.push({
        id: "bitcoin",
        name: staticBtc.name,
        symbol: staticBtc.symbol,
        color: staticBtc.color,
        launchDate: staticBtc.launchDate,
        totalNodes: liveBitcoinData.totalNodes,
        isLive: true,
        lastUpdated: liveBitcoinData.lastUpdated,
        latestHeight: liveBitcoinData.latestHeight,
        locations: scaledNodes.map((node) => ({
          ...node,
          blockchain: staticBtc.symbol,
          blockchainName: staticBtc.name,
          color: staticBtc.color,
          launchDate: staticBtc.launchDate,
        })),
      });
    } else {
      // Fallback to static Bitcoin data
      console.log("⚠️ Bitcoin: using static data (Bitnodes API unavailable)");
      blockchains.push({
        id: "bitcoin",
        name: staticBtc.name,
        symbol: staticBtc.symbol,
        color: staticBtc.color,
        launchDate: staticBtc.launchDate,
        totalNodes: staticBtc.totalNodes,
        isLive: false,
        locations: staticBtc.nodes.map((node) => ({
          ...node,
          blockchain: staticBtc.symbol,
          blockchainName: staticBtc.name,
          color: staticBtc.color,
          launchDate: staticBtc.launchDate,
        })),
      });
    }

    // Add other chains from static data (excluding bitcoin which we handled above)
    for (const [key, chain] of Object.entries(STATIC_BLOCKCHAIN_NODES)) {
      if (key === "bitcoin") continue; // Already handled

      blockchains.push({
        id: key,
        name: chain.name,
        symbol: chain.symbol,
        color: chain.color,
        launchDate: chain.launchDate,
        endDate: chain.endDate || null, // null if still active
        isDefunct: !!chain.endDate,
        totalNodes: chain.totalNodes,
        isLive: false,
        locations: chain.nodes.map((node) => ({
          ...node,
          blockchain: chain.symbol,
          blockchainName: chain.name,
          color: chain.color,
          launchDate: chain.launchDate,
          endDate: chain.endDate || null,
        })),
      });
    }

    // Flatten all nodes for easy rendering
    const allNodes = blockchains.flatMap((chain) =>
      chain.locations.map((loc) => ({
        ...loc,
        id: `${chain.id}-${loc.country}-${loc.city}`,
        isLive: chain.isLive || false,
      }))
    );

    // Calculate totals
    const totalNodes = blockchains.reduce((sum, chain) => sum + chain.totalNodes, 0);
    const totalLocations = allNodes.length;
    const liveChains = blockchains.filter(c => c.isLive).length;

    const result = {
      success: true,
      blockchains,
      allNodes,
      stats: {
        totalNodes,
        totalLocations,
        totalBlockchains: blockchains.length,
        liveDataChains: liveChains,
      },
      _meta: {
        cached: false,
        timestamp: now,
        liveAPIs: liveChains > 0 ? ["bitnodes.io"] : [],
      }
    };

    // Cache the result
    nodesCache = { ...result, _meta: { ...result._meta, cached: true } };
    cacheTimestamp = now;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Blockchain nodes API error:", error);
    return NextResponse.json({ error: "Failed to fetch blockchain nodes" }, { status: 500 });
  }
}
