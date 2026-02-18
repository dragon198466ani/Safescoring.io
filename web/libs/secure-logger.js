/**
 * Secure Logger for SafeScoring
 *
 * Provides secure logging with automatic masking of sensitive data.
 * NEVER logs secrets, tokens, or full personal information.
 *
 * Usage:
 *   import { logger } from "@/libs/secure-logger";
 *   logger.info("User action", { userId, email }); // Email will be masked
 *   logger.error("API failed", error); // Stack traces sanitized in production
 */

const isProduction = process.env.NODE_ENV === "production";

// Patterns that should NEVER be logged
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /authorization/i,
  /bearer/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /seed[-_]?phrase/i,
  /mnemonic/i,
];

// Fields that should be masked
const MASK_FIELDS = [
  "email",
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "privateKey",
  "private_key",
  "authorization",
  "cookie",
  "session",
  "creditCard",
  "credit_card",
  "ssn",
  "phone",
  "ip",
  "ipAddress",
  "ip_address",
  "walletAddress",
  "wallet_address",
];

/**
 * Mask an email address
 * user@example.com -> us***@example.com
 */
function maskEmail(email) {
  if (!email || typeof email !== "string") return email;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length > 2 ? local.slice(0, 2) + "***" : "***";
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask a string (show first and last 2 chars)
 */
function maskString(str, showChars = 2) {
  if (!str || typeof str !== "string") return str;
  if (str.length <= showChars * 2 + 3) return "***";
  return `${str.slice(0, showChars)}***${str.slice(-showChars)}`;
}

/**
 * Mask an IP address
 * 192.168.1.100 -> 192.168.***
 */
function maskIP(ip) {
  if (!ip || typeof ip !== "string") return ip;
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***`;
  }
  // IPv6
  if (ip.includes(":")) {
    const ipv6Parts = ip.split(":");
    return `${ipv6Parts.slice(0, 2).join(":")}:***`;
  }
  return "***";
}

/**
 * Mask a wallet address
 * 0x1234567890abcdef... -> 0x1234...cdef
 */
function maskWallet(address) {
  if (!address || typeof address !== "string") return address;
  if (address.length < 12) return "***";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Recursively mask sensitive fields in an object
 */
function maskSensitiveData(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return "[MAX_DEPTH]";

  if (obj === null || obj === undefined) return obj;

  // Handle primitives
  if (typeof obj !== "object") return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item, depth + 1));
  }

  // Handle Error objects
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      // Only include stack in development
      ...(isProduction ? {} : { stack: obj.stack }),
    };
  }

  // Handle regular objects
  const masked = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    // Check if this key should be completely redacted
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
      masked[key] = "[REDACTED]";
      continue;
    }

    // Apply specific masking based on field name
    if (keyLower === "email" || keyLower.includes("email")) {
      masked[key] = maskEmail(value);
    } else if (keyLower.includes("ip") || keyLower === "ip_address") {
      masked[key] = maskIP(value);
    } else if (keyLower.includes("wallet") || keyLower.includes("address")) {
      masked[key] = maskWallet(value);
    } else if (MASK_FIELDS.some((f) => keyLower.includes(f.toLowerCase()))) {
      masked[key] = maskString(value);
    } else if (typeof value === "object") {
      masked[key] = maskSensitiveData(value, depth + 1);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Sanitize error for logging
 */
function sanitizeError(error) {
  if (!error) return null;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      // Only include stack in development
      ...(isProduction ? {} : { stack: error.stack?.split("\n").slice(0, 5).join("\n") }),
    };
  }

  if (typeof error === "object") {
    return maskSensitiveData(error);
  }

  return String(error);
}

/**
 * Format log message with timestamp and context
 */
function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data === null) {
    return `${prefix} ${message}`;
  }

  const maskedData = maskSensitiveData(data);
  return `${prefix} ${message} ${JSON.stringify(maskedData)}`;
}

/**
 * Secure logger instance
 */
export const logger = {
  /**
   * Log informational message
   */
  info(message, data = null) {
    if (isProduction) {
      // In production, use structured logging
      console.log(formatLog("info", message, data));
    } else {
      // In development, use prettier output
      console.log(`[INFO] ${message}`, data ? maskSensitiveData(data) : "");
    }
  },

  /**
   * Log warning
   */
  warn(message, data = null) {
    console.warn(formatLog("warn", message, data));
  },

  /**
   * Log error (never logs full stack traces in production)
   */
  error(message, error = null, context = null) {
    const sanitizedError = sanitizeError(error);
    const maskedContext = context ? maskSensitiveData(context) : null;

    if (isProduction) {
      console.error(
        formatLog("error", message, {
          error: sanitizedError,
          context: maskedContext,
        })
      );
    } else {
      console.error(`[ERROR] ${message}`, {
        error: sanitizedError,
        context: maskedContext,
      });
    }
  },

  /**
   * Log debug (only in development)
   */
  debug(message, data = null) {
    if (!isProduction) {
      console.log(`[DEBUG] ${message}`, data ? maskSensitiveData(data) : "");
    }
  },

  /**
   * Log security event (always logs, even in production)
   */
  security(event, severity, data = null) {
    const logData = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...maskSensitiveData(data || {}),
    };
    console.warn(`[SECURITY] [${severity.toUpperCase()}] ${event}`, logData);
  },

  /**
   * Log API request (with masked sensitive data)
   */
  api(method, path, statusCode, durationMs, context = null) {
    const logData = {
      method,
      path,
      status: statusCode,
      duration: `${durationMs}ms`,
      ...maskSensitiveData(context || {}),
    };

    if (statusCode >= 500) {
      console.error(formatLog("api", `${method} ${path} ${statusCode}`, logData));
    } else if (statusCode >= 400) {
      console.warn(formatLog("api", `${method} ${path} ${statusCode}`, logData));
    } else {
      console.log(formatLog("api", `${method} ${path} ${statusCode}`, logData));
    }
  },
};

// Helper functions for external use
export { maskEmail, maskString, maskIP, maskWallet, maskSensitiveData };

export default logger;
