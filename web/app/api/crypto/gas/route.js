import { NextResponse } from "next/server";

/**
 * Multi-Chain Gas Tracker API
 *
 * GET /api/crypto/gas
 *
 * Returns current gas prices for multiple chains:
 * - Ethereum (ETH)
 * - Polygon (MATIC)
 * - BSC (BNB)
 * - Arbitrum
 * - Optimism
 * - Avalanche
 *
 * Prices are fetched from public APIs and cached for 30 seconds.
 */

// Simple in-memory cache
let gasCache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 30 * 1000; // 30 seconds

// Chain configurations
const CHAINS = [
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    color: "#627eea",
    icon: "eth",
    rpcUrl: "https://eth.llamarpc.com",
    explorerApi: "https://api.etherscan.io/api",
    explorerKey: process.env.ETHERSCAN_API_KEY,
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    color: "#8247e5",
    icon: "polygon",
    rpcUrl: "https://polygon.llamarpc.com",
    explorerApi: "https://api.polygonscan.com/api",
    explorerKey: process.env.POLYGONSCAN_API_KEY,
  },
  {
    id: "bsc",
    name: "BNB Chain",
    symbol: "BNB",
    color: "#f3ba2f",
    icon: "bnb",
    rpcUrl: "https://bsc.llamarpc.com",
    explorerApi: "https://api.bscscan.com/api",
    explorerKey: process.env.BSCSCAN_API_KEY,
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ETH",
    color: "#28a0f0",
    icon: "arbitrum",
    rpcUrl: "https://arbitrum.llamarpc.com",
    explorerApi: "https://api.arbiscan.io/api",
    explorerKey: process.env.ARBISCAN_API_KEY,
  },
  {
    id: "optimism",
    name: "Optimism",
    symbol: "ETH",
    color: "#ff0420",
    icon: "optimism",
    rpcUrl: "https://optimism.llamarpc.com",
    explorerApi: "https://api-optimistic.etherscan.io/api",
    explorerKey: process.env.OPTIMISM_API_KEY,
  },
  {
    id: "avalanche",
    name: "Avalanche",
    symbol: "AVAX",
    color: "#e84142",
    icon: "avax",
    rpcUrl: "https://avalanche.llamarpc.com",
    explorerApi: "https://api.snowtrace.io/api",
    explorerKey: process.env.SNOWTRACE_API_KEY,
  },
];

/**
 * Fetch gas price from RPC (eth_gasPrice method)
 */
async function fetchGasFromRpc(rpcUrl, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.result) {
      // Convert hex wei to gwei
      const weiValue = parseInt(data.result, 16);
      const gweiValue = weiValue / 1e9;
      return Math.round(gweiValue * 100) / 100;
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.error(`RPC fetch failed for ${rpcUrl}:`, e.message);
  }

  return null;
}

/**
 * Fetch gas oracle from block explorer API (if available)
 */
async function fetchGasFromExplorer(chain, timeout = 5000) {
  if (!chain.explorerApi || !chain.explorerKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${chain.explorerApi}?module=gastracker&action=gasoracle&apikey=${chain.explorerKey}`;
    const response = await fetch(url, { signal: controller.signal });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === "1" && data.result) {
      return {
        slow: parseFloat(data.result.SafeGasPrice) || null,
        standard: parseFloat(data.result.ProposeGasPrice) || null,
        fast: parseFloat(data.result.FastGasPrice) || null,
        baseFee: parseFloat(data.result.suggestBaseFee) || null,
      };
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.error(`Explorer fetch failed for ${chain.id}:`, e.message);
  }

  return null;
}

/**
 * Get gas prices for all chains
 */
async function fetchAllGasPrices() {
  const results = await Promise.all(
    CHAINS.map(async (chain) => {
      // Try explorer API first (more detailed)
      const explorerData = await fetchGasFromExplorer(chain);

      if (explorerData) {
        return {
          ...chain,
          gas: {
            slow: explorerData.slow,
            standard: explorerData.standard,
            fast: explorerData.fast,
            baseFee: explorerData.baseFee,
          },
          source: "explorer",
          status: "ok",
        };
      }

      // Fallback to RPC
      const rpcGas = await fetchGasFromRpc(chain.rpcUrl);

      if (rpcGas !== null) {
        return {
          ...chain,
          gas: {
            slow: Math.round(rpcGas * 0.8 * 100) / 100,
            standard: rpcGas,
            fast: Math.round(rpcGas * 1.2 * 100) / 100,
            baseFee: null,
          },
          source: "rpc",
          status: "ok",
        };
      }

      // Failed to fetch
      return {
        ...chain,
        gas: null,
        source: null,
        status: "error",
      };
    })
  );

  return results;
}

export async function GET() {
  // Check cache
  const now = Date.now();
  if (gasCache.data && now - gasCache.timestamp < CACHE_TTL) {
    return NextResponse.json(gasCache.data, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const chains = await fetchAllGasPrices();

    const responseData = {
      chains: chains.map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        color: c.color,
        gas: c.gas,
        status: c.status,
      })),
      timestamp: new Date().toISOString(),
      cacheTtl: CACHE_TTL / 1000,
    };

    // Update cache
    gasCache = {
      data: responseData,
      timestamp: now,
    };

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Error fetching gas prices:", error);

    // Return cached data if available, even if stale
    if (gasCache.data) {
      return NextResponse.json(
        { ...gasCache.data, stale: true },
        {
          headers: {
            "Cache-Control": "public, max-age=10",
            "X-Cache": "STALE",
          },
        }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch gas prices" },
      { status: 500 }
    );
  }
}
