/**
 * URL Validation & SSRF Protection
 * Prevents Server-Side Request Forgery attacks
 */

// Private IP ranges that should be blocked
const PRIVATE_IP_RANGES = [
  // IPv4 private ranges
  /^127\./,                          // Loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Class B private
  /^192\.168\./,                     // Class C private
  /^169\.254\./,                     // Link-local
  /^0\./,                            // Current network
  /^224\./,                          // Multicast
  /^240\./,                          // Reserved

  // IPv6 private ranges
  /^::1$/,                           // Loopback
  /^fe80:/i,                         // Link-local
  /^fc00:/i,                         // Unique local
  /^fd00:/i,                         // Unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",        // GCP metadata
  "169.254.169.254",                 // AWS/GCP/Azure metadata
  "metadata.azure.com",              // Azure metadata
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ["https:", "http:"];

/**
 * Check if an IP address is private
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIP(ip) {
  return PRIVATE_IP_RANGES.some((regex) => regex.test(ip));
}

/**
 * Check if a hostname is blocked
 * @param {string} hostname
 * @returns {boolean}
 */
function isBlockedHostname(hostname) {
  const normalizedHostname = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some(
    (blocked) => normalizedHostname === blocked || normalizedHostname.endsWith(`.${blocked}`)
  );
}

/**
 * Validate a URL for SSRF protection
 * @param {string} urlString - URL to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowHttp - Allow HTTP (default: false, only HTTPS)
 * @param {string[]} options.allowedDomains - Whitelist of allowed domains
 * @param {string[]} options.blockedDomains - Additional blocked domains
 * @returns {Object} { valid: boolean, url: URL|null, error: string|null }
 */
export function validateUrl(urlString, options = {}) {
  const {
    allowHttp = false,
    allowedDomains = [],
    blockedDomains = [],
  } = options;

  // Check if URL is provided
  if (!urlString || typeof urlString !== "string") {
    return { valid: false, url: null, error: "URL is required" };
  }

  // Trim and validate basic structure
  const trimmedUrl = urlString.trim();
  if (!trimmedUrl) {
    return { valid: false, url: null, error: "URL cannot be empty" };
  }

  // Parse URL
  let url;
  try {
    url = new URL(trimmedUrl);
  } catch {
    return { valid: false, url: null, error: "Invalid URL format" };
  }

  // Check protocol
  const allowedProtocols = allowHttp ? ALLOWED_PROTOCOLS : ["https:"];
  if (!allowedProtocols.includes(url.protocol)) {
    return {
      valid: false,
      url: null,
      error: `Invalid protocol. Allowed: ${allowedProtocols.join(", ")}`,
    };
  }

  // Check for blocked hostnames
  if (isBlockedHostname(url.hostname)) {
    return { valid: false, url: null, error: "This hostname is not allowed" };
  }

  // Check for private IP addresses
  if (isPrivateIP(url.hostname)) {
    return { valid: false, url: null, error: "Private IP addresses are not allowed" };
  }

  // Check custom blocked domains
  if (blockedDomains.length > 0) {
    const isBlocked = blockedDomains.some(
      (domain) =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
    if (isBlocked) {
      return { valid: false, url: null, error: "This domain is blocked" };
    }
  }

  // Check allowed domains whitelist (if provided)
  if (allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some(
      (domain) =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) {
      return {
        valid: false,
        url: null,
        error: `Domain not in whitelist. Allowed: ${allowedDomains.join(", ")}`,
      };
    }
  }

  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /@/,              // Credentials in URL
    /%00/,            // Null byte
    /%0[aAdD]/,       // CRLF injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmedUrl)) {
      return { valid: false, url: null, error: "URL contains suspicious patterns" };
    }
  }

  return { valid: true, url, error: null };
}

/**
 * Sanitize a URL for safe use
 * @param {string} urlString
 * @param {Object} options
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeUrl(urlString, options = {}) {
  const result = validateUrl(urlString, options);
  if (!result.valid) {
    return null;
  }

  // Return the sanitized URL (reconstructed from parsed URL object)
  return result.url.toString();
}

/**
 * Extract and validate domain from URL
 * @param {string} urlString
 * @returns {string|null} Domain or null if invalid
 */
export function extractDomain(urlString) {
  const result = validateUrl(urlString, { allowHttp: true });
  if (!result.valid) {
    return null;
  }
  return result.url.hostname;
}
