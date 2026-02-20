import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Exchange Fee Comparator API
 *
 * GET /api/crypto/fees
 *
 * Returns fee comparison data for major exchanges:
 * - Spot trading fees (maker/taker)
 * - Withdrawal fees (by coin)
 * - Deposit methods
 *
 * Query params:
 * - type: "spot" | "withdrawal" | "all" (default: "all")
 * - coin: Filter withdrawal fees by coin (e.g., "BTC", "ETH")
 */

// Static fee data for major exchanges (updated periodically)
// In production, this could be fetched from exchange APIs or a database
const EXCHANGE_FEES = [
  {
    id: "binance",
    name: "Binance",
    logo: "/logos/binance.svg",
    type: "CEX",
    safeScore: null, // Will be filled from DB
    spot: {
      maker: 0.10,
      taker: 0.10,
      makerVip: 0.02,
      takerVip: 0.04,
      discountToken: "BNB",
      discountPercent: 25,
    },
    withdrawal: {
      BTC: { fee: 0.0001, network: "Bitcoin" },
      ETH: { fee: 0.00063, network: "Ethereum" },
      USDT: { fee: 1, network: "TRC-20" },
      USDC: { fee: 1, network: "Ethereum" },
    },
    deposit: {
      crypto: true,
      bankTransfer: true,
      card: true,
      cardFee: 1.8,
    },
    url: "https://binance.com",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    logo: "/logos/coinbase.svg",
    type: "CEX",
    safeScore: null,
    spot: {
      maker: 0.40,
      taker: 0.60,
      makerVip: 0.00,
      takerVip: 0.05,
      discountToken: null,
      discountPercent: 0,
    },
    withdrawal: {
      BTC: { fee: 0, network: "Bitcoin", note: "Network fee only" },
      ETH: { fee: 0, network: "Ethereum", note: "Network fee only" },
      USDT: { fee: 0, network: "Ethereum", note: "Network fee only" },
      USDC: { fee: 0, network: "Ethereum", note: "Free for USDC" },
    },
    deposit: {
      crypto: true,
      bankTransfer: true,
      card: true,
      cardFee: 3.99,
    },
    url: "https://coinbase.com",
  },
  {
    id: "kraken",
    name: "Kraken",
    logo: "/logos/kraken.svg",
    type: "CEX",
    safeScore: null,
    spot: {
      maker: 0.16,
      taker: 0.26,
      makerVip: 0.00,
      takerVip: 0.10,
      discountToken: null,
      discountPercent: 0,
    },
    withdrawal: {
      BTC: { fee: 0.00015, network: "Bitcoin" },
      ETH: { fee: 0.0025, network: "Ethereum" },
      USDT: { fee: 2.5, network: "Ethereum" },
      USDC: { fee: 2.5, network: "Ethereum" },
    },
    deposit: {
      crypto: true,
      bankTransfer: true,
      card: true,
      cardFee: 3.75,
    },
    url: "https://kraken.com",
  },
  {
    id: "bybit",
    name: "Bybit",
    logo: "/logos/bybit.svg",
    type: "CEX",
    safeScore: null,
    spot: {
      maker: 0.10,
      taker: 0.10,
      makerVip: 0.00,
      takerVip: 0.02,
      discountToken: null,
      discountPercent: 0,
    },
    withdrawal: {
      BTC: { fee: 0.0002, network: "Bitcoin" },
      ETH: { fee: 0.0012, network: "Ethereum" },
      USDT: { fee: 1, network: "TRC-20" },
      USDC: { fee: 1, network: "Ethereum" },
    },
    deposit: {
      crypto: true,
      bankTransfer: true,
      card: true,
      cardFee: 2.5,
    },
    url: "https://bybit.com",
  },
  {
    id: "okx",
    name: "OKX",
    logo: "/logos/okx.svg",
    type: "CEX",
    safeScore: null,
    spot: {
      maker: 0.08,
      taker: 0.10,
      makerVip: 0.00,
      takerVip: 0.02,
      discountToken: "OKB",
      discountPercent: 25,
    },
    withdrawal: {
      BTC: { fee: 0.0001, network: "Bitcoin" },
      ETH: { fee: 0.00035, network: "Ethereum" },
      USDT: { fee: 0.8, network: "TRC-20" },
      USDC: { fee: 3, network: "Ethereum" },
    },
    deposit: {
      crypto: true,
      bankTransfer: true,
      card: true,
      cardFee: 2.99,
    },
    url: "https://okx.com",
  },
  {
    id: "kucoin",
    name: "KuCoin",
    logo: "/logos/kucoin.svg",
    type: "CEX",
    safeScore: null,
    spot: {
      maker: 0.10,
      taker: 0.10,
      makerVip: 0.00,
      takerVip: 0.03,
      discountToken: "KCS",
      discountPercent: 20,
    },
    withdrawal: {
      BTC: { fee: 0.0004, network: "Bitcoin" },
      ETH: { fee: 0.004, network: "Ethereum" },
      USDT: { fee: 1, network: "TRC-20" },
      USDC: { fee: 5, network: "Ethereum" },
    },
    deposit: {
      crypto: true,
      bankTransfer: true,
      card: true,
      cardFee: 3.0,
    },
    url: "https://kucoin.com",
  },
  {
    id: "gemini",
    name: "Gemini",
    logo: "/logos/gemini.svg",
    type: "CEX",
    safeScore: null,
    spot: {
      maker: 0.20,
      taker: 0.40,
      makerVip: 0.00,
      takerVip: 0.03,
      discountToken: null,
      discountPercent: 0,
    },
    withdrawal: {
      BTC: { fee: 0, network: "Bitcoin", note: "10 free/month" },
      ETH: { fee: 0, network: "Ethereum", note: "10 free/month" },
      USDT: { fee: 0, network: "Ethereum", note: "10 free/month" },
      USDC: { fee: 0, network: "Ethereum", note: "10 free/month" },
    },
    deposit: {
      crypto: true,
      bankTransfer: true,
      card: true,
      cardFee: 3.49,
    },
    url: "https://gemini.com",
  },
  {
    id: "bitstamp",
    name: "Bitstamp",
    logo: "/logos/bitstamp.svg",
    type: "CEX",
    safeScore: null,
    spot: {
      maker: 0.30,
      taker: 0.40,
      makerVip: 0.00,
      takerVip: 0.05,
      discountToken: null,
      discountPercent: 0,
    },
    withdrawal: {
      BTC: { fee: 0, network: "Bitcoin", note: "Network fee only" },
      ETH: { fee: 0, network: "Ethereum", note: "Network fee only" },
      USDT: { fee: 5, network: "Ethereum" },
      USDC: { fee: 5, network: "Ethereum" },
    },
    deposit: {
      crypto: true,
      bankTransfer: true,
      card: true,
      cardFee: 5.0,
    },
    url: "https://bitstamp.net",
  },
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const coin = searchParams.get("coin")?.toUpperCase();

  let exchanges = [...EXCHANGE_FEES];

  // Try to get SAFE scores from database
  if (isSupabaseConfigured()) {
    try {
      const exchangeNames = exchanges.map(e => e.name);
      const { data: products } = await supabase
        .from("products")
        .select(`
          name,
          safe_scoring_results!inner (
            note_finale
          )
        `)
        .in("name", exchangeNames)
        .order("safe_scoring_results.calculated_at", { ascending: false });

      // Create score map
      const scoreMap = {};
      for (const product of products || []) {
        if (!scoreMap[product.name] && product.safe_scoring_results?.length > 0) {
          scoreMap[product.name] = Math.round(product.safe_scoring_results[0].note_finale || 0);
        }
      }

      // Add scores to exchanges
      exchanges = exchanges.map(e => ({
        ...e,
        safeScore: scoreMap[e.name] || null,
      }));
    } catch (e) {
      console.error("Error fetching SAFE scores:", e);
    }
  }

  // Filter response based on type
  let response;

  if (type === "spot") {
    response = {
      type: "spot",
      exchanges: exchanges.map(e => ({
        id: e.id,
        name: e.name,
        logo: e.logo,
        safeScore: e.safeScore,
        spot: e.spot,
        url: e.url,
      })),
    };
  } else if (type === "withdrawal") {
    const coinList = coin ? [coin] : ["BTC", "ETH", "USDT", "USDC"];
    response = {
      type: "withdrawal",
      coins: coinList,
      exchanges: exchanges.map(e => ({
        id: e.id,
        name: e.name,
        logo: e.logo,
        safeScore: e.safeScore,
        withdrawal: Object.fromEntries(
          Object.entries(e.withdrawal).filter(([k]) => coinList.includes(k))
        ),
        url: e.url,
      })),
    };
  } else {
    response = {
      type: "all",
      exchanges,
    };
  }

  return NextResponse.json({
    ...response,
    lastUpdated: "2025-01-01", // Static data update date
    disclaimer: "Fees are subject to change. Always verify on the exchange website.",
  }, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
