/**
 * Enhanced Device Fingerprinting for Session Security
 *
 * Collects multiple signals to create a robust device fingerprint.
 * Used for session binding to detect hijacking attempts.
 *
 * SERVER-SIDE:
 *   import { generateServerFingerprint, validateFingerprint } from "@/libs/device-fingerprint";
 *
 * CLIENT-SIDE:
 *   Use the useDeviceFingerprint hook for browser-based signals
 */

import crypto from "crypto";

// ============================================
// SERVER-SIDE FINGERPRINTING
// ============================================

/**
 * Generate server-side fingerprint from request headers
 * This is collected on every request
 */
export function generateServerFingerprint(headers) {
  if (!headers) return null;

  const get = (name) => headers.get?.(name) || "";

  // Collect stable browser signals from headers
  const signals = {
    // User Agent family (not full string - too variable)
    uaFamily: extractUAFamily(get("user-agent")),

    // Accept headers (stable per browser)
    acceptLanguage: get("accept-language").split(",")[0]?.trim() || "",
    acceptEncoding: get("accept-encoding"),

    // Client Hints (modern browsers)
    platform: get("sec-ch-ua-platform"),
    mobile: get("sec-ch-ua-mobile"),
    bitness: get("sec-ch-ua-bitness"),
    arch: get("sec-ch-ua-arch"),

    // Screen hints
    dpr: get("sec-ch-dpr"),
    viewportWidth: get("sec-ch-viewport-width"),

    // Connection info
    connectionType: get("sec-ch-prefers-reduced-motion") || get("ect"),
  };

  // Create hash from stable signals
  const signalString = Object.values(signals).filter(Boolean).join("|");

  return crypto
    .createHash("sha256")
    .update(signalString)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Extract browser family from User-Agent (more stable than full UA)
 */
function extractUAFamily(ua) {
  if (!ua) return "unknown";

  ua = ua.toLowerCase();

  if (ua.includes("chrome") && !ua.includes("edge") && !ua.includes("opr")) {
    return "chrome";
  }
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari";
  if (ua.includes("edge")) return "edge";
  if (ua.includes("opr") || ua.includes("opera")) return "opera";
  if (ua.includes("msie") || ua.includes("trident")) return "ie";

  return "other";
}

/**
 * Get client IP with proper header priority
 */
export function getClientIP(headers) {
  if (!headers) return null;

  const get = (name) => headers.get?.(name) || "";

  // Priority order for IP headers
  const ip =
    get("cf-connecting-ip") ||
    get("true-client-ip") ||
    get("x-real-ip") ||
    get("x-forwarded-for").split(",")[0]?.trim() ||
    null;

  return ip;
}

/**
 * Get approximate geolocation from headers (if available from CDN)
 */
export function getGeoFromHeaders(headers) {
  if (!headers) return null;

  const get = (name) => headers.get?.(name) || "";

  return {
    country: get("cf-ipcountry") || get("x-vercel-ip-country") || null,
    city: get("cf-ipcity") || get("x-vercel-ip-city") || null,
    region: get("cf-ipregion") || get("x-vercel-ip-country-region") || null,
    timezone: get("cf-timezone") || null,
  };
}

/**
 * Compare two fingerprints and calculate similarity score
 * Returns 0-100 (100 = identical)
 */
export function compareFingerprints(fp1, fp2) {
  if (!fp1 || !fp2) return 0;
  if (fp1 === fp2) return 100;

  // Calculate Hamming distance for hex strings
  let matching = 0;
  const len = Math.min(fp1.length, fp2.length);

  for (let i = 0; i < len; i++) {
    if (fp1[i] === fp2[i]) matching++;
  }

  return Math.round((matching / len) * 100);
}

/**
 * Validate fingerprint consistency
 * Returns { valid: boolean, confidence: number, warnings: string[] }
 */
export function validateFingerprint(stored, current, options = {}) {
  const {
    minConfidence = 70, // Minimum similarity required
    strictMode = false, // If true, require exact match
  } = options;

  const warnings = [];

  if (!stored) {
    return { valid: true, confidence: 100, warnings: ["NO_STORED_FINGERPRINT"] };
  }

  if (!current) {
    return { valid: false, confidence: 0, warnings: ["NO_CURRENT_FINGERPRINT"] };
  }

  const similarity = compareFingerprints(stored, current);

  if (strictMode && similarity < 100) {
    warnings.push("FINGERPRINT_CHANGED");
    return { valid: false, confidence: similarity, warnings };
  }

  if (similarity < minConfidence) {
    warnings.push("LOW_FINGERPRINT_CONFIDENCE");
    return { valid: false, confidence: similarity, warnings };
  }

  if (similarity < 90) {
    warnings.push("MINOR_FINGERPRINT_VARIANCE");
  }

  return { valid: true, confidence: similarity, warnings };
}

/**
 * Check for geographic anomaly based on IP
 */
export function checkGeoAnomaly(storedGeo, currentGeo) {
  if (!storedGeo || !currentGeo) return { anomaly: false, reason: null };

  // Country change is significant
  if (storedGeo.country && currentGeo.country && storedGeo.country !== currentGeo.country) {
    return {
      anomaly: true,
      reason: "COUNTRY_CHANGED",
      details: { from: storedGeo.country, to: currentGeo.country },
    };
  }

  return { anomaly: false, reason: null };
}

/**
 * Calculate risk score based on various signals
 * Returns 0-100 (0 = no risk, 100 = high risk)
 */
export function calculateSessionRisk(session, current) {
  let risk = 0;
  const factors = [];

  // Fingerprint mismatch
  if (session.fingerprint && current.fingerprint) {
    const similarity = compareFingerprints(session.fingerprint, current.fingerprint);
    if (similarity < 50) {
      risk += 40;
      factors.push("fingerprint_major_change");
    } else if (similarity < 80) {
      risk += 20;
      factors.push("fingerprint_minor_change");
    }
  }

  // IP change
  if (session.ip && current.ip && session.ip !== current.ip) {
    risk += 15;
    factors.push("ip_changed");

    // Different IP class = more suspicious
    const sessionClass = session.ip.split(".")[0];
    const currentClass = current.ip.split(".")[0];
    if (sessionClass !== currentClass) {
      risk += 15;
      factors.push("ip_class_changed");
    }
  }

  // Country change
  if (session.geo?.country && current.geo?.country) {
    if (session.geo.country !== current.geo.country) {
      risk += 30;
      factors.push("country_changed");
    }
  }

  // Timezone change
  if (session.timezone && current.timezone) {
    if (session.timezone !== current.timezone) {
      risk += 10;
      factors.push("timezone_changed");
    }
  }

  return {
    score: Math.min(100, risk),
    factors,
    level: risk > 60 ? "high" : risk > 30 ? "medium" : "low",
  };
}

// ============================================
// CLIENT-SIDE FINGERPRINT COLLECTION
// ============================================

/**
 * Collect browser fingerprint signals (run on client)
 * Export this data to send with auth requests
 */
export const clientFingerprintScript = `
(function() {
  const fp = {
    // Screen
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
    },
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    // Language
    language: navigator.language,
    languages: navigator.languages?.join(','),
    // Platform
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    // Features
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    touchSupport: 'ontouchstart' in window,
    // Canvas fingerprint (basic)
    canvas: (function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('SafeScoring FP', 2, 2);
        return canvas.toDataURL().slice(-50);
      } catch(e) { return null; }
    })(),
  };
  return fp;
})()
`;

export default {
  generateServerFingerprint,
  getClientIP,
  getGeoFromHeaders,
  compareFingerprints,
  validateFingerprint,
  checkGeoAnomaly,
  calculateSessionRisk,
  clientFingerprintScript,
};
