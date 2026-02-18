"use client";

import { useState, useEffect } from "react";

/**
 * CryptoPricePreview
 * Displays real-time crypto prices for a given USD amount
 * Uses CoinGecko free API (no key required)
 */
export default function CryptoPricePreview({ usdAmount }) {
  const [prices, setPrices] = useState({
    btc: null,
    eth: null,
    sol: null,
    usdc: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCryptoPrices();
    // Refresh prices every 60 seconds
    const interval = setInterval(fetchCryptoPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchCryptoPrices = async () => {
    try {
      // Use our API endpoint (cached server-side)
      const response = await fetch("/api/crypto/prices");

      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }

      const data = await response.json();

      if (data.success && data.prices) {
        setPrices({
          btc: data.prices.btc || null,
          eth: data.prices.eth || null,
          sol: data.prices.sol || null,
          usdc: data.prices.usdc || 1, // USDC is pegged to $1
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching crypto prices:", error);
      setLoading(false);
    }
  };

  const calculateCryptoAmount = (cryptoPrice) => {
    if (!cryptoPrice || !usdAmount) return null;
    const amount = usdAmount / cryptoPrice;
    // Show more decimals for BTC (8), fewer for others (4-6)
    if (amount < 0.001) {
      return amount.toFixed(8); // BTC usually
    } else if (amount < 1) {
      return amount.toFixed(6);
    } else {
      return amount.toFixed(4);
    }
  };

  if (loading) {
    return (
      <div className="text-xs text-base-content/50">
        Loading crypto prices...
      </div>
    );
  }

  return (
    <div className="space-y-1 text-xs text-base-content/60">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5 mb-2 text-[10px] text-success">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
        <span>Live rates</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span>₿</span>
          <span>BTC</span>
        </span>
        <span className="font-mono">
          {prices.btc ? `≈ ${calculateCryptoAmount(prices.btc)} BTC` : "—"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span>💎</span>
          <span>ETH</span>
        </span>
        <span className="font-mono">
          {prices.eth ? `≈ ${calculateCryptoAmount(prices.eth)} ETH` : "—"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span>🟣</span>
          <span>SOL</span>
        </span>
        <span className="font-mono">
          {prices.sol ? `≈ ${calculateCryptoAmount(prices.sol)} SOL` : "—"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1">
          <span>🔵</span>
          <span>USDC</span>
        </span>
        <span className="font-mono">
          {prices.usdc ? `≈ ${calculateCryptoAmount(prices.usdc)} USDC` : "—"}
        </span>
      </div>
    </div>
  );
}
