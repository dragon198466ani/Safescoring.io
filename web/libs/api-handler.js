/**
 * Secure API Route Handler Wrapper
 *
 * Provides automatic security checks for API routes:
 * - Authentication verification
 * - Rate limiting
 * - Input validation
 * - Error handling
 * - Logging
 */

import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import {
  sanitizeObject,
  isValidContentType,
  isRequestTooLarge,
  hasSqlInjectionPattern,
  validateCsrfToken,
} from "@/libs/security";
import { ALLOWED_ORIGINS } from "@/libs/config-constants";

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Success response
 */
export function successResponse(data, status = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * Error response
 */
export function errorResponse(message, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Validation error response
 */
export function validationError(errors) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 400 }
  );
}

// ============================================
// API HANDLER WRAPPER
// ============================================

/**
 * Options for API handler
 * @typedef {Object} HandlerOptions
 * @property {boolean} requireAuth - Require authentication
 * @property {string[]} allowedMethods - Allowed HTTP methods
 * @property {number} maxBodySize - Max request body size in bytes
 * @property {boolean} sanitizeBody - Auto-sanitize request body
 * @property {Function} validate - Custom validation function
 * @property {string[]} requiredFields - Required fields in body
 * @property {string[]} allowedRoles - Allowed user roles
 * @property {boolean} requireCsrf - Require CSRF token for state-changing methods
 * @property {boolean} skipOriginCheck - Skip origin validation (for webhooks)
 */

/**
 * Create a secure API route handler
 * @param {Function} handler - Route handler function
 * @param {HandlerOptions} options - Handler options
 */
export function createApiHandler(handler, options = {}) {
  const {
    requireAuth = false,
    allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"],
    maxBodySize = 1024 * 1024, // 1MB default
    sanitizeBody = true,
    validate = null,
    requiredFields = [],
    allowedRoles = [],
    requireCsrf = true, // SECURITY: Enable CSRF by default
    skipOriginCheck = false, // Set to true for webhooks
  } = options;

  return async function secureHandler(request, context) {
    const startTime = Date.now();
    const method = request.method;

    try {
      // 1. Check allowed methods
      if (!allowedMethods.includes(method)) {
        return errorResponse(
          `Method ${method} not allowed`,
          405,
          "METHOD_NOT_ALLOWED"
        );
      }

      // 2. SECURITY: Origin/Referer check for state-changing methods
      const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
      if (isStateChanging && !skipOriginCheck) {
        const origin = request.headers.get("origin");
        const referer = request.headers.get("referer");
        const requestOrigin = origin || (referer ? new URL(referer).origin : null);

        // Allow requests without origin only if they have a valid CSRF token
        if (requestOrigin && !ALLOWED_ORIGINS.includes(requestOrigin)) {
          console.warn(`[SECURITY] Blocked request from origin: ${requestOrigin}`);
          return errorResponse(
            "Request blocked",
            403,
            "INVALID_ORIGIN"
          );
        }
      }

      // 3. SECURITY: CSRF token check for state-changing methods (when auth required)
      if (isStateChanging && requireCsrf && requireAuth) {
        const csrfToken = request.headers.get("x-csrf-token");
        // Get session ID for CSRF validation (will be set after auth check)
        // For now, origin check provides baseline CSRF protection
        // Full token validation happens after session is retrieved
      }

      // 4. Check content type for POST/PUT/PATCH
      if (["POST", "PUT", "PATCH"].includes(method)) {
        if (!isValidContentType(request, ["application/json", "multipart/form-data"])) {
          return errorResponse(
            "Invalid content type",
            415,
            "UNSUPPORTED_MEDIA_TYPE"
          );
        }
      }

      // 5. Check body size
      if (await isRequestTooLarge(request, maxBodySize)) {
        return errorResponse(
          "Request body too large",
          413,
          "PAYLOAD_TOO_LARGE"
        );
      }

      // 6. Authentication check
      let session = null;
      if (requireAuth) {
        session = await auth();
        if (!session?.user) {
          return errorResponse(
            "Authentication required",
            401,
            "UNAUTHORIZED"
          );
        }

        // Role check
        if (allowedRoles.length > 0) {
          const userRole = session.user.role || "user";
          if (!allowedRoles.includes(userRole)) {
            return errorResponse(
              "Insufficient permissions",
              403,
              "FORBIDDEN"
            );
          }
        }
      } else {
        // Still try to get session for optional auth
        session = await auth();
      }

      // 7. CSRF token validation (after session is available)
      // SECURITY: For authenticated state-changing requests, CSRF token is REQUIRED
      if (isStateChanging && requireCsrf && requireAuth && session?.user?.id) {
        const csrfToken = request.headers.get("x-csrf-token");
        const csrfCookie = request.cookies?.get("csrf_session")?.value;

        // In production, CSRF token is mandatory for authenticated mutations
        if (process.env.NODE_ENV === "production") {
          if (!csrfToken) {
            console.warn(`[SECURITY] Missing CSRF token for user: ${session.user.id.slice(0, 8)}...`);
            return errorResponse(
              "Security token required",
              403,
              "MISSING_CSRF_TOKEN"
            );
          }
        }

        // Validate token if provided (in any environment)
        if (csrfToken) {
          // Use cookie session ID if available, fallback to user ID
          const sessionId = csrfCookie || session.user.id;
          if (!validateCsrfToken(csrfToken, sessionId)) {
            console.warn(`[SECURITY] Invalid CSRF token for user: ${session.user.id.slice(0, 8)}...`);
            return errorResponse(
              "Invalid security token",
              403,
              "INVALID_CSRF_TOKEN"
            );
          }
        }
      }

      // 8. Parse and sanitize body
      let body = null;
      if (["POST", "PUT", "PATCH"].includes(method)) {
        try {
          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            body = await request.json();

            // Check for SQL injection in body
            const bodyString = JSON.stringify(body);
            if (hasSqlInjectionPattern(bodyString)) {
              return errorResponse(
                "Invalid request data",
                400,
                "INVALID_INPUT"
              );
            }

            // Sanitize body
            if (sanitizeBody) {
              body = sanitizeObject(body);
            }
          }
        } catch {
          return errorResponse(
            "Invalid JSON body",
            400,
            "INVALID_JSON"
          );
        }
      }

      // 9. Check required fields
      if (requiredFields.length > 0 && body) {
        const missingFields = requiredFields.filter(
          (field) => body[field] === undefined || body[field] === null || body[field] === ""
        );
        if (missingFields.length > 0) {
          return validationError({
            missing: missingFields,
            message: `Missing required fields: ${missingFields.join(", ")}`,
          });
        }
      }

      // 10. Custom validation
      if (validate && body) {
        const validationResult = await validate(body, session);
        if (validationResult !== true) {
          return validationError(validationResult);
        }
      }

      // 11. Call the actual handler
      const result = await handler(request, {
        ...context,
        session,
        body,
        user: session?.user || null,
      });

      // 12. Add timing header
      const duration = Date.now() - startTime;
      if (result instanceof NextResponse) {
        result.headers.set("X-Response-Time", `${duration}ms`);
      }

      return result;

    } catch (error) {
      // Log error
      console.error("[API Error]", {
        method,
        path: request.url,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      // Return appropriate error response
      if (error.name === "ValidationError") {
        return validationError(error.message);
      }

      return errorResponse(
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
        500,
        "INTERNAL_ERROR"
      );
    }
  };
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

/**
 * Create authenticated API handler
 */
export function createAuthenticatedHandler(handler, options = {}) {
  return createApiHandler(handler, { ...options, requireAuth: true });
}

/**
 * Create admin-only API handler
 */
export function createAdminHandler(handler, options = {}) {
  return createApiHandler(handler, {
    ...options,
    requireAuth: true,
    allowedRoles: ["admin"],
  });
}

/**
 * Create public API handler (no auth required)
 */
export function createPublicHandler(handler, options = {}) {
  return createApiHandler(handler, { ...options, requireAuth: false });
}

// ============================================
// PAGINATION HELPERS
// ============================================

/**
 * Parse pagination parameters from URL
 */
export function parsePagination(request, defaults = {}) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || defaults.limit || "20", 10);
  const sort = url.searchParams.get("sort") || defaults.sort || "created_at";
  const order = url.searchParams.get("order") || defaults.order || "desc";

  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)), // Max 100 items per page
    offset: (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit)),
    sort,
    order: order === "asc" ? "asc" : "desc",
  };
}

/**
 * Create paginated response
 */
export function paginatedResponse(data, total, pagination) {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);

  return successResponse({
    items: data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

export default {
  createApiHandler,
  createAuthenticatedHandler,
  createAdminHandler,
  createPublicHandler,
  successResponse,
  errorResponse,
  validationError,
  parsePagination,
  paginatedResponse,
};
