import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import {
  getCountryPPPTier,
  getPPPPrices,
  getPPPPricesAnnual,
  getCountryName,
  getCountryFlag,
  validateTimezoneMatch,
  validateLanguageMatch,
} from "@/libs/ppp";
import config from "@/config";

export const dynamic = "force-dynamic";

// ============================================================
// In-memory cache for proxycheck.io results (1h TTL)
// Saves API quota: free tier = 1,000 queries/day
// ============================================================
const proxyCache = new Map();
const PROXY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedProxyResult(ip) {
  const entry = proxyCache.get(ip);
  if (entry && Date.now() - entry.timestamp < PROXY_CACHE_TTL) {
    return entry.result;
  }
  proxyCache.delete(ip);
  return null;
}

function setCachedProxyResult(ip, result) {
  // Cap cache size at 5,000 entries to prevent memory leaks
  if (proxyCache.size > 5000) {
    const firstKey = proxyCache.keys().next().value;
    proxyCache.delete(firstKey);
  }
  proxyCache.set(ip, { result, timestamp: Date.now() });
}

// ============================================================
// POST /api/ppp/detect — Validate PPP tier with VPN detection
// ============================================================
export async function POST(request) {
  try {
    const { browserTimezone, browserLanguage, browserLanguages } = await request.json();

    // Read server-side headers (not spoofable by client)
    const ipCountry = request.headers.get("x-vercel-ip-country") || "";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") || "";

    if (!ipCountry) {
      // No geo data (localhost, dev) → return tier 0
      return NextResponse.json({
        country: "",
        countryName: "Unknown",
        countryFlag: "🌍",
        tier: 0,
        discount: 0,
        discountCode: null,
        surchargeVariants: null,
        surchargeVariantsAnnual: null,
        prices: getPPPPrices(1.0),
        pricesAnnual: getPPPPricesAnnual(1.0),
        factor: 1.0,
      });
    }

    // Get tier for this country
    const pppData = getCountryPPPTier(ipCountry);
    let appliedTier = pppData.tier;
    let vpnDetected = false;
    const vpnSignals = {};

    // ============================================================
    // VPN DETECTION (only for discount tiers, not surcharge)
    // ============================================================
    if (pppData.tier < 0) {
      // Signal 1: Timezone mismatch (strongest signal)
      if (browserTimezone) {
        const tzCheck = validateTimezoneMatch(ipCountry, browserTimezone);
        vpnSignals.timezone = {
          browserTimezone,
          ipCountry,
          expectedCountries: tzCheck.expectedCountries,
          match: tzCheck.match,
        };

        if (!tzCheck.match) {
          // Auto-deny: timezone mismatch = VPN/travel
          vpnDetected = true;
          appliedTier = 0;
        }
      }

      // Signal 2: Language mismatch (soft signal — only combined with others)
      if (browserLanguages?.length) {
        const langMatch = validateLanguageMatch(ipCountry, browserLanguages);
        vpnSignals.language = {
          browserLanguages,
          match: langMatch,
        };
        // Language mismatch alone does NOT deny PPP (travelers common)
      }

      // Signal 3: proxycheck.io VPN detection (for high-value discounts)
      const pppConfig = config?.ppp || {};
      const minTierForProxyCheck = pppConfig.proxyCheckMinTier || -2;

      if (
        !vpnDetected &&
        pppData.tier <= minTierForProxyCheck &&
        ip &&
        pppConfig.proxyCheckApiKey
      ) {
        try {
          let proxyResult = getCachedProxyResult(ip);

          if (!proxyResult) {
            const apiKey = pppConfig.proxyCheckApiKey;
            const url = `https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1`;
            const res = await fetch(url, { signal: AbortSignal.timeout(3000) });

            if (res.ok) {
              const data = await res.json();
              proxyResult = data[ip] || {};
              setCachedProxyResult(ip, proxyResult);
            }
          }

          if (proxyResult) {
            vpnSignals.proxycheck = {
              proxy: proxyResult.proxy,
              type: proxyResult.type,
              provider: proxyResult.provider,
              asn: proxyResult.asn,
            };

            if (proxyResult.proxy === "yes" || proxyResult.type === "VPN") {
              vpnDetected = true;
              appliedTier = 0;
            }
          }
        } catch {
          // proxycheck.io failed/timeout → graceful degradation (allow PPP)
          vpnSignals.proxycheck = { error: "timeout or unreachable" };
        }
      }
    }

    // Get final PPP data for the applied tier
    const finalPPP = vpnDetected ? getCountryPPPTier("US") : pppData;
    const prices = getPPPPrices(finalPPP.factor);
    const pricesAnnual = getPPPPricesAnnual(finalPPP.factor);

    // ============================================================
    // AUDIT LOG — track detections for fraud review
    // ============================================================
    if (supabaseAdmin) {
      try {
        const session = await auth();
        await supabaseAdmin.from("ppp_audit_log").insert({
          user_id: session?.user?.id || null,
          ip_address: ip ? ip.substring(0, 45) : null,
          ip_country: ipCountry,
          browser_timezone: browserTimezone || null,
          browser_language: browserLanguage || null,
          detected_tier: pppData.tier,
          applied_tier: appliedTier,
          vpn_detected: vpnDetected,
          vpn_signals: vpnSignals,
          discount_code: finalPPP.discountCode || null,
          action: "detect",
        });
      } catch {
        // Non-critical — don't fail the request if audit logging fails
      }
    }

    return NextResponse.json({
      country: ipCountry,
      countryName: getCountryName(ipCountry),
      countryFlag: getCountryFlag(ipCountry),
      tier: appliedTier,
      discount: appliedTier < 0 ? Math.abs(appliedTier) * 20 : appliedTier > 0 ? -(appliedTier * 20) : 0,
      discountCode: finalPPP.discountCode || null,
      surchargeVariants: finalPPP.surchargeVariants || null,
      surchargeVariantsAnnual: finalPPP.surchargeVariantsAnnual || null,
      prices,
      pricesAnnual,
      factor: finalPPP.factor,
    });
  } catch (error) {
    console.error("PPP detect error:", error);
    return NextResponse.json({
      country: "",
      countryName: "Unknown",
      countryFlag: "🌍",
      tier: 0,
      discount: 0,
      discountCode: null,
      surchargeVariants: null,
      surchargeVariantsAnnual: null,
      prices: getPPPPrices(1.0),
      pricesAnnual: getPPPPricesAnnual(1.0),
      factor: 1.0,
    });
  }
}
