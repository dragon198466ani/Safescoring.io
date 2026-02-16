/**
 * Security utilities — centralized input validation, sanitization, and protection
 * Used across API routes and components
 */

/**
 * Sanitize HTML — strip all tags to prevent XSS
 * For cases where you need plain text from potentially tainted input
 */
export function sanitizeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate email format (strict)
 */
export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  // RFC 5322 simplified — catches 99.9% of valid emails
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email) && email.length <= 254;
}

/**
 * Validate URL — only allows https, blocks internal/private IPs
 */
export function isValidUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    // Block internal/private hostnames
    const blocked = [
      "localhost", "127.0.0.1", "0.0.0.0", "::1",
      "metadata.google.internal", "169.254.169.254",
    ];
    const host = parsed.hostname.toLowerCase();
    if (blocked.some((b) => host === b || host.endsWith("." + b))) return false;
    // Block private IP ranges
    const parts = host.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      if (parts[0] === 10) return false; // 10.0.0.0/8
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false; // 172.16.0.0/12
      if (parts[0] === 192 && parts[1] === 168) return false; // 192.168.0.0/16
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and clamp integer parameter
 */
export function safeInt(value, { min = 0, max = 1000, fallback = 0 } = {}) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * Validate string parameter — trim, max length, no null bytes
 */
export function safeString(value, { maxLength = 500, fallback = "" } = {}) {
  if (typeof value !== "string") return fallback;
  // Strip null bytes and control characters (except newline, tab)
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate slug format (alphanumeric, hyphens only)
 */
export function isValidSlug(slug) {
  if (typeof slug !== "string") return false;
  return /^[a-z0-9][a-z0-9-]{0,128}[a-z0-9]$/.test(slug);
}

/**
 * Validate that request origin matches allowed origins
 * Prevents CORS bypass attacks
 */
export function isAllowedOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin requests don't send Origin header
  const allowed = (process.env.ALLOWED_ORIGINS || "https://safescoring.io")
    .split(",")
    .map((o) => o.trim().toLowerCase());
  return allowed.includes(origin.toLowerCase());
}

/**
 * Validate JSON body safely with size limit
 */
export async function parseJsonBody(request, { maxSize = 100_000 } = {}) {
  try {
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > maxSize) {
      return { error: "Request body too large", status: 413 };
    }
    const body = await request.json();
    return { data: body };
  } catch {
    return { error: "Invalid JSON body", status: 400 };
  }
}

/**
 * Check for required NEXTAUTH_SECRET at startup
 */
export function requireSecret(name = "NEXTAUTH_SECRET") {
  const val = process.env[name];
  if (!val || val === "default-secret" || val.length < 32) {
    throw new Error(`${name} must be a secure random string of at least 32 characters`);
  }
  return val;
}
