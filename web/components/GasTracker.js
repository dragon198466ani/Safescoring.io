"use client";

import { useState, useEffect } from "react";

/**
 * GasTracker - Multi-chain gas price display
 * Shows real-time gas prices for major EVM chains
 */
export default function GasTracker({ variant = "default", className = "" }) {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchGasPrices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchGasPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchGasPrices = async () => {
    try {
      const res = await fetch("/api/crypto/gas");
      const data = await res.json();

      if (res.ok && data.chains) {
        setChains(data.chains);
        setLastUpdate(new Date(data.timestamp));
        setError(null);
      } else {
        throw new Error(data.error || "Failed to fetch");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getGasLevel = (gasPrice) => {
    if (gasPrice <= 10) return { label: "Low", color: "text-green-400" };
    if (gasPrice <= 30) return { label: "Medium", color: "text-amber-400" };
    if (gasPrice <= 100) return { label: "High", color: "text-orange-400" };
    return { label: "Very High", color: "text-red-400" };
  };

  if (loading) {
    return (
      <div className={`rounded-xl bg-base-200 border border-base-300 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-base-300 rounded animate-pulse"></div>
          <span className="text-sm font-semibold">Gas Tracker</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-base-300 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl bg-base-200 border border-base-300 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-error">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">Failed to load gas prices</span>
        </div>
      </div>
    );
  }

  // Compact variant for widgets
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 overflow-x-auto ${className}`}>
        {chains.slice(0, 4).map((chain) => (
          <div
            key={chain.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-200 border border-base-300 shrink-0"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: chain.color }}
            />
            <span className="text-xs text-base-content/60">{chain.name}</span>
            <span className="text-sm font-semibold">
              {chain.gas?.standard?.toFixed(0) || "-"}
            </span>
            <span className="text-xs text-base-content/50">gwei</span>
          </div>
        ))}
      </div>
    );
  }

  // Default full variant
  return (
    <div className={`rounded-xl bg-base-200 border border-base-300 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
            <path fillRule="evenodd" d="M13.5 4.938a7 7 0 11-9.006 1.737c.202-.257.59-.218.793.039.278.352.594.672.943.954.332.269.786-.049.773-.476a5.977 5.977 0 01.572-2.759 6.026 6.026 0 012.486-2.665c.247-.14.55-.016.677.238A6.967 6.967 0 0013.5 4.938zM14 12a4 4 0 01-4 4c-1.913 0-3.52-1.398-3.91-3.182-.093-.429.44-.643.814-.413a4.043 4.043 0 001.601.564c.303.038.531-.24.51-.544a5.975 5.975 0 011.315-4.192.447.447 0 01.431-.16A4.001 4.001 0 0114 12z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Gas Tracker</span>
          <span className="badge badge-ghost badge-xs">Live</span>
        </div>
        {lastUpdate && (
          <span className="text-xs text-base-content/50">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Chain grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {chains.map((chain) => {
          const gasLevel = chain.gas?.standard ? getGasLevel(chain.gas.standard) : null;

          return (
            <div
              key={chain.id}
              className="p-3 rounded-lg bg-base-300/50 border border-base-300 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chain.color }}
                />
                <span className="text-sm font-medium truncate">{chain.name}</span>
              </div>

              {chain.status === "ok" && chain.gas ? (
                <>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`text-xl font-bold ${gasLevel?.color || ""}`}>
                      {chain.gas.standard?.toFixed(0) || "-"}
                    </span>
                    <span className="text-xs text-base-content/50">gwei</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-base-content/60">
                    <span>
                      <span className="text-green-400">{chain.gas.slow?.toFixed(0)}</span>
                      {" / "}
                      <span className="text-amber-400">{chain.gas.standard?.toFixed(0)}</span>
                      {" / "}
                      <span className="text-red-400">{chain.gas.fast?.toFixed(0)}</span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-base-content/40">Unavailable</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-base-300 text-xs text-base-content/50">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          Slow
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Standard
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          Fast
        </span>
      </div>
    </div>
  );
}
