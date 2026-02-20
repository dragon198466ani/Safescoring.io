/**
 * Fingerprint Middleware
 *
 * Central orchestrator for anti-copy protection:
 * - Applies steganographic fingerprinting to all responses
 * - Injects honeypot products
 * - Tracks client access patterns for scraper detection
 * - Provides detection utilities
 *
 * Usage:
 *   import { protectResponse, getClientId } from "@/libs/fingerprint-middleware";
 *   const protectedData = await protectResponse(data, request, "/api/products");
 */

import crypto from "crypto";
import {
  fingerprintResponse,
  generateClientFingerprint,
} from "./steganographic-fingerprint";
import { injectHoneypots, generateHoneypotProduct } from "./honeypot-products";
import { supabase, isSupabaseConfigured } from "./supabase";

// Configuration
const CONFIG = {
  // Honeypot injection probability (0.0 - 1.0)
  // Higher = more protection but more fake data
  honeypotProbability: parseFloat(process.env.HONEYPOT_INJECTION_RATE || "0.7"),

  // Maximum honeypots per response
  maxHoneypots: parseInt(process.env.MAX_HONEYPOTS || "4"),

  // Enable client tracking in database
  enableTracking: process.env.ENABLE_FINGERPRINT_TRACKING !== "false",

  // Scraper detection threshold (requests per day)
  scraperThreshold: parseInt(process.env.SCRAPER_THRESHOLD || "100"),

  // Routes that should have honeypots injected
  honeypotRoutes: [
    "/api/products",
    "/api/search",
    "/api/v1/products",
    "/api/rankings",
  ],

  // Routes that should have fingerprinting applied
  fingerprintRoutes: [
    "/api/products",
    "/api/search",
    "/api/leaderboard",
    "/api/rankings",
    "/api/v1/products",
    "/api/compare",
    "/api/compatibility",
  ],
};

/**
 * Generate a unique client ID from request
 * Combines IP + User-Agent + other signals for uniqueness
 */
export function getClientId(request) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const acceptLanguage = request.headers.get("accept-language") || "";

  // Create a deterministic hash from client signals
  const clientSignals = `${ip}:${userAgent}:${acceptLanguage}`;

  return crypto
    .createHash("sha256")
    .update(clientSignals)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Get client IP from various headers
 */
function getClientIP(request) {
  return (
    request.headers.get("cf-connecting-ip") ||      // Cloudflare
    request.headers.get("x-real-ip") ||             // Nginx
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Check if current user is authenticated (less aggressive protection)
 */
function isAuthenticated(request) {
  // Check for session cookie or auth header
  const cookie = request.headers.get("cookie") || "";
  const authHeader = request.headers.get("authorization") || "";

  return (
    cookie.includes("next-auth.session-token") ||
    cookie.includes("__Secure-next-auth.session-token") ||
    authHeader.startsWith("Bearer ")
  );
}

/**
 * Main protection function - apply all anti-copy measures
 *
 * @param {Object} data - The response data to protect
 * @param {Request} request - The incoming request
 * @param {string} endpoint - The API endpoint path
 * @param {Object} options - Additional options
 * @returns {Object} Protected data with fingerprinting and honeypots
 */
export async function protectResponse(data, request, endpoint, options = {}) {
  const {
    injectHoneypotsFlag = true,
    applyFingerprint = true,
    trackAccess = CONFIG.enableTracking,
  } = options;

  const clientId = getClientId(request);
  const ip = getClientIP(request);
  const isAuth = isAuthenticated(request);
  const timestamp = Math.floor(Date.now() / 86400000); // Daily rotation

  // Generate client fingerprint
  const fingerprint = generateClientFingerprint(clientId, timestamp);

  // Start with original data (deep clone)
  let result = JSON.parse(JSON.stringify(data));

  // Track access for scraper detection
  if (trackAccess) {
    await recordClientAccess(clientId, ip, endpoint, isAuth);
  }

  // Determine if this route should have honeypots
  const shouldInjectHoneypots =
    injectHoneypotsFlag &&
    CONFIG.honeypotRoutes.some(route => endpoint.startsWith(route));

  // Inject honeypots for non-authenticated users or suspicious clients
  if (shouldInjectHoneypots && hasProductArray(result)) {
    const isSuspicious = await isClientSuspicious(clientId);

    // More aggressive honeypots for suspicious or unauthenticated clients
    const probability = isSuspicious
      ? 0.9
      : (isAuth ? 0.3 : CONFIG.honeypotProbability);

    result = injectHoneypotsToData(result, fingerprint.fullHash, {
      maxHoneypots: CONFIG.maxHoneypots,
      probability,
    });
  }

  // Apply fingerprinting
  const shouldFingerprint =
    applyFingerprint &&
    CONFIG.fingerprintRoutes.some(route => endpoint.startsWith(route));

  if (shouldFingerprint) {
    result = fingerprintResponse(result, clientId, endpoint);
  }

  // Add watermark metadata (can be stripped but provides additional proof)
  if (result && typeof result === "object") {
    result._meta = {
      t: Date.now(),
      v: "2.0",
    };
  }

  return result;
}

/**
 * Check if data contains a product array that can have honeypots
 */
function hasProductArray(data) {
  if (Array.isArray(data)) return true;
  if (data?.items && Array.isArray(data.items)) return true;
  if (data?.products && Array.isArray(data.products)) return true;
  if (data?.results && Array.isArray(data.results)) return true;
  if (data?.data && Array.isArray(data.data)) return true;
  return false;
}

/**
 * Inject honeypots into data structure
 */
function injectHoneypotsToData(data, clientFingerprint, options) {
  // Handle different data structures
  if (Array.isArray(data)) {
    return injectHoneypots(data, clientFingerprint, options);
  }

  if (data?.items && Array.isArray(data.items)) {
    return {
      ...data,
      items: injectHoneypots(data.items, clientFingerprint, options),
    };
  }

  if (data?.products && Array.isArray(data.products)) {
    return {
      ...data,
      products: injectHoneypots(data.products, clientFingerprint, options),
    };
  }

  if (data?.results && Array.isArray(data.results)) {
    return {
      ...data,
      results: injectHoneypots(data.results, clientFingerprint, options),
    };
  }

  if (data?.data && Array.isArray(data.data)) {
    return {
      ...data,
      data: injectHoneypots(data.data, clientFingerprint, options),
    };
  }

  return data;
}

/**
 * Record client access for tracking and analysis
 */
async function recordClientAccess(clientId, ip, endpoint, isAuthenticated) {
  if (!isSupabaseConfigured()) return;

  try {
    // Use upsert to update or create access record
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("client_fingerprints")
      .upsert(
        {
          client_id: clientId,
          ip_hash: crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16),
          last_endpoint: endpoint,
          last_seen: new Date().toISOString(),
          is_authenticated: isAuthenticated,
          request_count: 1, // Will be incremented by trigger
          date_key: today,
        },
        {
          onConflict: "client_id,date_key",
          ignoreDuplicates: false,
        }
      );

    if (error) {
      // Table might not exist yet - fail silently
      if (!error.message?.includes("does not exist")) {
        console.error("[Fingerprint] Tracking error:", error.message);
      }
    }
  } catch (err) {
    // Non-critical - don't break the request
    console.error("[Fingerprint] Tracking exception:", err.message);
  }
}

/**
 * Check if client shows suspicious scraping behavior
 */
async function isClientSuspicious(clientId) {
  if (!isSupabaseConfigured()) return false;

  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("client_fingerprints")
      .select("request_count, is_flagged")
      .eq("client_id", clientId)
      .eq("date_key", today)
      .single();

    if (error || !data) return false;

    // Flag as suspicious if too many requests
    return data.is_flagged || data.request_count > CONFIG.scraperThreshold;
  } catch {
    return false;
  }
}

/**
 * Get client access statistics (for admin dashboard)
 */
export async function getClientStats(clientId) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("client_fingerprints")
      .select("*")
      .eq("client_id", clientId)
      .order("date_key", { ascending: false })
      .limit(30);

    if (error) throw error;

    return {
      clientId,
      totalRequests: data?.reduce((sum, d) => sum + d.request_count, 0) || 0,
      lastSeen: data?.[0]?.last_seen,
      isSuspicious: data?.some(d => d.is_flagged),
      history: data,
    };
  } catch {
    return null;
  }
}

/**
 * Flag a client as suspicious (admin action)
 */
export async function flagClient(clientId, reason) {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("client_fingerprints")
      .update({
        is_flagged: true,
        flag_reason: reason,
        flagged_at: new Date().toISOString(),
      })
      .eq("client_id", clientId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Get all suspicious clients (for admin dashboard)
 */
export async function getSuspiciousClients(limit = 50) {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("client_fingerprints")
      .select("*")
      .or(`is_flagged.eq.true,request_count.gt.${CONFIG.scraperThreshold}`)
      .order("request_count", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Wrapper for route handlers - easily add protection
 *
 * Usage:
 *   export const GET = withProtection(async (request) => {
 *     const data = await fetchProducts();
 *     return data;
 *   });
 */
export function withProtection(handler, options = {}) {
  return async (request, context) => {
    try {
      // Execute the handler
      const result = await handler(request, context);

      // If result is a Response, we can't modify it
      if (result instanceof Response) {
        return result;
      }

      // Get endpoint from URL
      const url = new URL(request.url);
      const endpoint = url.pathname;

      // Apply protection
      const protectedData = await protectResponse(result, request, endpoint, options);

      return protectedData;
    } catch (error) {
      console.error("[Protection] Error:", error);
      throw error;
    }
  };
}

/**
 * Express-style middleware for custom integration
 */
export function createProtectionMiddleware(options = {}) {
  return async (request, response, next) => {
    // Store original json method
    const originalJson = response.json.bind(response);

    // Override json method to apply protection
    response.json = async (data) => {
      const url = new URL(request.url);
      const endpoint = url.pathname;

      const protectedData = await protectResponse(data, request, endpoint, options);
      return originalJson(protectedData);
    };

    return next();
  };
}

/**
 * Check if a product might be a honeypot (for internal use)
 */
export function mayBeHoneypot(product) {
  // Quick heuristics to detect honeypot-like products
  const suspiciousPatterns = [
    /SecureVault/i,
    /CryptoGuard/i,
    /BlockShield/i,
    /SafeKey/i,
    /TrustNode/i,
  ];

  return suspiciousPatterns.some(pattern =>
    pattern.test(product?.name || "") ||
    pattern.test(product?.slug || "")
  );
}
