/**
 * ============================================================================
 * SECURE API WRAPPER - Zero Trust API Protection
 * ============================================================================
 *
 * Usage in API routes:
 *
 * import { secureRoute, secureAdminRoute } from "@/libs/secure-api";
 *
 * export const POST = secureRoute(async (request, { user, body }) => {
 *   // Your handler code here
 *   return { success: true, data: ... };
 * }, {
 *   schema: { name: { type: "string", required: true } },
 *   rateLimit: { maxRequests: 10, windowMs: 60000 },
 * });
 *
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import {
  protectRequest,
  validateRequestBody,
  logSecurityEvent,
  addSecurityHeaders,
  createBlockedResponse,
  sanitizeString,
  getClientIP,
  getClientIdentifier,
  recordFailedAttempt,
  clearFailedAttempts,
  isLockedOut,
} from "@/libs/security-hardcore";
import { requireAdmin } from "@/libs/admin-auth";
import { ALLOWED_ORIGINS } from "@/libs/config-constants";

// ============================================================================
// SECURE ROUTE WRAPPER
// ============================================================================

/**
 * Create a secure API route handler
 *
 * @param {Function} handler - Async function (request, context) => response
 * @param {Object} options - Security options
 */
export function secureRoute(handler, options = {}) {
  const {
    // Authentication
    requireAuth = false,
    requireAdmin: needsAdmin = false,

    // Rate limiting
    rateLimit = true,
    rateLimitOptions = {
      maxRequests: 60,
      windowMs: 60000,
    },

    // Input validation
    schema = null,

    // Threat detection
    detectThreats = true,

    // CSRF protection
    requireCsrf = false,
    strictCsrf = false,

    // Request limits
    maxBodySize = 1024 * 1024, // 1MB

    // Allowed methods
    methods = ["GET", "POST", "PUT", "PATCH", "DELETE"],

    // Logging
    logRequests = true,

    // Custom validators
    customValidators = [],
  } = options;

  return async (request, routeContext = {}) => {
    const startTime = Date.now();
    const clientId = getClientIdentifier(request);
    const ip = getClientIP(request);
    const method = request.method;
    const url = new URL(request.url);

    try {
      // 1. Method check
      if (!methods.includes(method)) {
        logSecurityEvent("METHOD_NOT_ALLOWED", { method, path: url.pathname, clientId });
        return NextResponse.json(
          { error: "Method not allowed" },
          { status: 405, headers: { "Allow": methods.join(", ") } }
        );
      }

      // 2. Lockout check
      if (isLockedOut(clientId)) {
        logSecurityEvent("LOCKOUT_BLOCKED", { clientId, ip });
        return createBlockedResponse("ACCOUNT_LOCKED");
      }

      // 3. Request protection (rate limit + threat detection)
      const protection = await protectRequest(request, {
        rateLimit,
        rateLimitOptions,
        detectThreats,
        logRequest: logRequests,
      });

      if (!protection.allowed) {
        return createBlockedResponse(protection.reason, protection.retryAfter);
      }

      // 4. Authentication check
      let user = null;
      let session = null;

      if (requireAuth || needsAdmin) {
        session = await auth();

        if (!session?.user?.id) {
          logSecurityEvent("UNAUTHORIZED_ACCESS", { path: url.pathname, clientId });
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        user = session.user;

        // Admin check
        if (needsAdmin) {
          const adminUser = await requireAdmin();
          if (!adminUser) {
            logSecurityEvent("ADMIN_ACCESS_DENIED", {
              userId: user.id,
              email: user.email,
              path: url.pathname,
            });
            return NextResponse.json(
              { error: "Forbidden" },
              { status: 403 }
            );
          }
          user = adminUser;
        }
      }

      // 5. CSRF check for state-changing requests
      if (requireCsrf && !["GET", "HEAD", "OPTIONS"].includes(method)) {
        const origin = request.headers.get("origin");
        const referer = request.headers.get("referer");
        const host = request.headers.get("host");

        // Use centralized config + dynamic host
        const allowedOrigins = [
          `https://${host}`,
          `http://${host}`,
          ...ALLOWED_ORIGINS,
        ].filter(Boolean);

        const requestOrigin = origin || (referer ? new URL(referer).origin : null);

        if (strictCsrf && !requestOrigin) {
          logSecurityEvent("CSRF_MISSING_ORIGIN", { path: url.pathname, clientId });
          return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 }
          );
        }

        if (requestOrigin && !allowedOrigins.some(o => requestOrigin.startsWith(o))) {
          logSecurityEvent("CSRF_INVALID_ORIGIN", {
            origin: requestOrigin,
            path: url.pathname,
            clientId,
          });
          return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 }
          );
        }

        // Check CSRF token if strict
        if (strictCsrf) {
          const csrfToken = request.headers.get("x-csrf-token");
          if (!csrfToken) {
            logSecurityEvent("CSRF_MISSING_TOKEN", { path: url.pathname, clientId });
            return NextResponse.json(
              { error: "CSRF token required" },
              { status: 403 }
            );
          }
          // Token validation would happen here
        }
      }

      // 6. Parse and validate body
      let body = null;
      let validatedBody = null;

      if (["POST", "PUT", "PATCH"].includes(method)) {
        try {
          const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
          if (contentLength > maxBodySize) {
            logSecurityEvent("BODY_TOO_LARGE", { size: contentLength, max: maxBodySize, clientId });
            return NextResponse.json(
              { error: "Request body too large" },
              { status: 413 }
            );
          }

          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            body = await request.json();
          } else if (contentType.includes("multipart/form-data")) {
            body = await request.formData();
          } else if (contentType.includes("application/x-www-form-urlencoded")) {
            const text = await request.text();
            body = Object.fromEntries(new URLSearchParams(text));
          }
        } catch (parseError) {
          logSecurityEvent("BODY_PARSE_ERROR", { error: parseError.message, clientId });
          return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
          );
        }

        // Schema validation
        if (schema && body) {
          const validation = validateRequestBody(body, schema);
          if (!validation.valid) {
            logSecurityEvent("VALIDATION_FAILED", {
              errors: validation.errors,
              path: url.pathname,
              clientId,
            });
            return NextResponse.json(
              { error: "Validation failed", details: validation.errors },
              { status: 400 }
            );
          }
          validatedBody = validation.sanitized;
        } else {
          validatedBody = body;
        }
      }

      // 7. Custom validators
      for (const validator of customValidators) {
        const result = await validator({ request, user, body: validatedBody });
        if (result !== true) {
          logSecurityEvent("CUSTOM_VALIDATION_FAILED", {
            reason: result,
            path: url.pathname,
            clientId,
          });
          return NextResponse.json(
            { error: result || "Validation failed" },
            { status: 400 }
          );
        }
      }

      // 8. Execute handler
      const context = {
        user,
        session,
        body: validatedBody,
        rawBody: body,
        clientId,
        ip,
        params: routeContext.params ? await routeContext.params : {},
        searchParams: Object.fromEntries(url.searchParams),
        protection,
      };

      const result = await handler(request, context);

      // 9. Build response
      let response;

      if (result instanceof Response || result instanceof NextResponse) {
        response = result;
      } else {
        response = NextResponse.json(result);
      }

      // 10. Add security headers
      response = addSecurityHeaders(response);

      // 11. Add timing header (dev only)
      if (process.env.NODE_ENV === "development") {
        response.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
      }

      // 12. Clear failed attempts on success (if authenticated)
      if (user) {
        clearFailedAttempts(clientId);
      }

      return response;

    } catch (error) {
      // Log error
      logSecurityEvent("HANDLER_ERROR", {
        error: error.message,
        path: url.pathname,
        clientId,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      console.error(`[SECURE-API] Error in ${url.pathname}:`, error);

      // Return safe error response
      return NextResponse.json(
        {
          error: "Internal server error",
          ...(process.env.NODE_ENV === "development" && { debug: error.message }),
        },
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// ADMIN ROUTE SHORTHAND
// ============================================================================

/**
 * Create a secure admin-only API route
 */
export function secureAdminRoute(handler, options = {}) {
  return secureRoute(handler, {
    requireAuth: true,
    requireAdmin: true,
    requireCsrf: true,
    strictCsrf: true,
    detectThreats: true,
    rateLimitOptions: {
      maxRequests: 100,
      windowMs: 60000,
    },
    ...options,
  });
}

// ============================================================================
// PUBLIC ROUTE SHORTHAND
// ============================================================================

/**
 * Create a secure public API route (no auth, but rate limited)
 */
export function securePublicRoute(handler, options = {}) {
  return secureRoute(handler, {
    requireAuth: false,
    rateLimit: true,
    rateLimitOptions: {
      maxRequests: 30,
      windowMs: 60000,
    },
    detectThreats: true,
    ...options,
  });
}

// ============================================================================
// AUTHENTICATED ROUTE SHORTHAND
// ============================================================================

/**
 * Create a secure authenticated API route
 */
export function secureAuthRoute(handler, options = {}) {
  return secureRoute(handler, {
    requireAuth: true,
    requireCsrf: true,
    rateLimit: true,
    rateLimitOptions: {
      maxRequests: 60,
      windowMs: 60000,
    },
    detectThreats: true,
    ...options,
  });
}

// ============================================================================
// VALIDATION SCHEMAS (Common patterns)
// ============================================================================

export const CommonSchemas = {
  // User update
  userUpdate: {
    name: { type: "string", required: false, maxLength: 100 },
    email: { type: "email", required: false },
    country: { type: "string", required: false, maxLength: 2 },
  },

  // Setup creation
  setupCreate: {
    name: { type: "string", required: true, minLength: 1, maxLength: 100 },
    description: { type: "string", required: false, maxLength: 500 },
    products: { type: "array", required: true, minLength: 1, maxLength: 50 },
  },

  // Correction submission
  correction: {
    productId: { type: "uuid", required: true },
    fieldCorrected: { type: "string", required: true },
    suggestedValue: { type: "string", required: true, maxLength: 1000 },
    correctionReason: { type: "string", required: false, maxLength: 2000 },
  },

  // Newsletter subscription
  newsletter: {
    email: { type: "email", required: true },
  },

  // API key creation
  apiKey: {
    name: { type: "string", required: true, minLength: 1, maxLength: 50 },
    tier: { type: "string", required: false },
  },

  // Memory creation
  memory: {
    content: { type: "string", required: true, minLength: 1, maxLength: 5000 },
    category: { type: "string", required: false },
    memory_type: { type: "string", required: false },
    importance: { type: "number", required: false, min: 1, max: 10 },
  },

  // Wallet linking
  walletLink: {
    wallet_address: { type: "ethAddress", required: true },
    signature: { type: "string", required: true },
    message: { type: "string", required: true },
    chain_id: { type: "number", required: false },
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  secureRoute,
  secureAdminRoute,
  securePublicRoute,
  secureAuthRoute,
  CommonSchemas,
};
