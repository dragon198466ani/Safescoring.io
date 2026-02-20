import { NextResponse } from "next/server";
import { quickProtect } from "@/libs/api-protection";

/**
 * GET /api/crypto/prices
 * Returns current crypto prices in USD
 * Uses CoinGecko free API (cached for 60 seconds)
 */

let priceCache = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 60000; // 60 seconds

export async function GET(request) {
  // SECURITY: Rate limiting to prevent abuse
  const protection = await quickProtect(request, "public");
  if (protection.blocked) {
    return protection.response;
  }

  try {
    // Return cached data if still valid
    const now = Date.now();
    if (priceCache.data && now - priceCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        prices: priceCache.data,
        cached: true,
        timestamp: priceCache.timestamp,
      });
    }

    // Fetch fresh prices from CoinGecko
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd",
      {
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch crypto prices");
    }

    const data = await response.json();

    const prices = {
      btc: data.bitcoin?.usd || null,
      eth: data.ethereum?.usd || null,
      sol: data.solana?.usd || null,
      timestamp: now,
    };

    // Update cache
    priceCache = {
      data: prices,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      prices,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching crypto prices:", error);

    // Return cached data if available, even if expired
    if (priceCache.data) {
      return NextResponse.json({
        success: true,
        prices: priceCache.data,
        cached: true,
        stale: true,
        error: "Using stale cache",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch crypto prices",
        prices: {
          btc: null,
          eth: null,
          sol: null,
        },
      },
      { status: 500 }
    );
  }
}
