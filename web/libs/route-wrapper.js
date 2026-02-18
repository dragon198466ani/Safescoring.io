/**
 * Unified API Route Wrapper
 *
 * Combines all common API route patterns into a single wrapper:
 * - Authentication (optional/required)
 * - Rate limiting
 * - CSRF/Origin validation
 * - Database configuration check
 * - Error handling
 * - Response formatting
 *
 * Eliminates boilerplate code across 109+ API routes.
 */

import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { checkRateLimit, getClientId, isClientBlocked } from "@/libs/rate-limit";
import { RATE_LIMITS } from "@/libs/config-constants";

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Success response
 */
export function success(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Error response
 */
export function error(message, status = 400, code = "ERROR") {
  return NextResponse.json(
    {
      success: false,
      error: { message, code, timestamp: new Date().toISOString() },
    },
    { status }
  );
}

/**
 * Paginated response
 */
export function paginated(items, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return success({
    items,
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

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate origin for state-changing requests
 */
function validateOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] Origin blocked: ${check.origin}`);
    return error("Invalid request origin", 403, "INVALID_ORIGIN");
  }
  return null;
}

/**
 * Check if client is blocked or rate limited
 */
function checkClientAccess(request, limitType = "public") {
  const clientId = getClientId(request);

  // Check if blocked
  if (isClientBlocked(clientId)) {
    return {
      blocked: true,
      response: error("Too many requests. Please try again later.", 429, "BLOCKED"),
    };
  }

  // Check rate limit
  const { allowed, remaining, resetIn, total } = checkRateLimit(clientId, limitType);

  if (!allowed) {
    return {
      blocked: true,
      response: NextResponse.json(
        {
          success: false,
          error: {
            message: "Rate limit exceeded",
            code: "RATE_LIMIT",
            retryAfter: Math.ceil(resetIn / 1000),
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(resetIn / 1000)),
            "X-RateLimit-Limit": String(total),
            "X-RateLimit-Remaining": "0",
          },
        }
      ),
    };
  }

  return { blocked: false, clientId, remaining, total };
}

// =============================================================================
// MAIN WRAPPER
// =============================================================================

/**
 * Create a wrapped API route handler
 *
 * @param {function} handler - The actual route handler
 * @param {object} options - Configuration options
 * @param {boolean} options.requireAuth - Require authentication (default: false)
 * @param {boolean} options.requireAdmin - Require admin role (default: false)
 * @param {string} options.rateLimit - Rate limit type: 'public' | 'authenticated' | 'sensitive' | 'admin'
 * @param {boolean} options.checkOrigin - Validate origin for POST/PUT/DELETE (default: true)
 * @param {boolean} options.requireDb - Require database configured (default: true)
 * @param {string[]} options.methods - Allowed HTTP methods (default: all)
 *
 * @example
 * // Public route with rate limiting
 * export const GET = createRoute(async (req, ctx) => {
 *   const data = await fetchData();
 *   return success(data);
 * });
 *
 * // Authenticated route
 * export const POST = createRoute(async (req, ctx) => {
 *   const { user, body } = ctx;
 *   await saveData(user.id, body);
 *   return success({ saved: true });
 * }, { requireAuth: true });
 *
 * // Admin-only route
 * export const DELETE = createRoute(async (req, ctx) => {
 *   await deleteAll();
 *   return success({ deleted: true });
 * }, { requireAuth: true, requireAdmin: true, rateLimit: 'admin' });
 */
export function createRoute(handler, options = {}) {
  const {
    requireAuth = false,
    requireAdmin = false,
    rateLimit = "public",
    checkOrigin = true,
    requireDb = true,
    methods = null,
  } = options;

  return async function wrappedHandler(request, routeContext) {
    const method = request.method;

    try {
      // 1. Check allowed methods
      if (methods && !methods.includes(method)) {
        return error(`Method ${method} not allowed`, 405, "METHOD_NOT_ALLOWED");
      }

      // 2. Check database configuration
      if (requireDb && !isSupabaseConfigured()) {
        return error("Database not configured", 500, "DB_NOT_CONFIGURED");
      }

      // 3. Check origin for state-changing methods
      const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
      if (isStateChanging && checkOrigin) {
        const originError = validateOrigin(request);
        if (originError) return originError;
      }

      // 4. Check rate limit
      const limitType = requireAuth
        ? (requireAdmin ? "admin" : "authenticated")
        : rateLimit;

      const accessCheck = checkClientAccess(request, limitType);
      if (accessCheck.blocked) {
        return accessCheck.response;
      }

      // 5. Get authentication
      let session = null;
      let user = null;

      try {
        session = await auth();
        user = session?.user || null;
      } catch (e) {
        // Auth check failed, continue as unauthenticated
      }

      // 6. Check auth requirement
      if (requireAuth && !user?.id) {
        return error("Authentication required", 401, "UNAUTHORIZED");
      }

      // 7. Check admin requirement
      if (requireAdmin) {
        const isAdmin = user?.role === "admin" || user?.is_admin === true;
        if (!isAdmin) {
          return error("Admin access required", 403, "FORBIDDEN");
        }
      }

      // 8. Parse body for POST/PUT/PATCH
      let body = null;
      if (["POST", "PUT", "PATCH"].includes(method)) {
        try {
          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            body = await request.json();
          }
        } catch (e) {
          return error("Invalid JSON body", 400, "INVALID_JSON");
        }
      }

      // 9. Build context
      const ctx = {
        ...routeContext,
        session,
        user,
        body,
        clientId: accessCheck.clientId,
        isAuthenticated: !!user,
        // Helper to get URL params
        searchParams: new URL(request.url).searchParams,
        // Helper to get pagination
        getPagination: (defaults = {}) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get("page") || "1", 10);
          const limit = Math.min(
            parseInt(url.searchParams.get("limit") || defaults.limit || "20", 10),
            100
          );
          return {
            page: Math.max(1, page),
            limit,
            offset: (Math.max(1, page) - 1) * limit,
          };
        },
      };

      // 10. Call the actual handler
      const response = await handler(request, ctx);

      // 11. Add rate limit headers
      if (response instanceof NextResponse) {
        response.headers.set("X-RateLimit-Remaining", String(accessCheck.remaining));
      }

      return response;

    } catch (err) {
      console.error(`[API Error] ${method} ${request.url}:`, err);
      return error(
        process.env.NODE_ENV === "development" ? err.message : "Internal server error",
        500,
        "INTERNAL_ERROR"
      );
    }
  };
}

// =============================================================================
// PRESET WRAPPERS
// =============================================================================

/**
 * Public route (no auth required)
 */
export function publicRoute(handler, options = {}) {
  return createRoute(handler, {
    ...options,
    requireAuth: false,
    rateLimit: options.rateLimit || "public",
  });
}

/**
 * Authenticated route (user must be logged in)
 */
export function authRoute(handler, options = {}) {
  return createRoute(handler, {
    ...options,
    requireAuth: true,
    rateLimit: options.rateLimit || "authenticated",
  });
}

/**
 * Admin route (must be admin)
 */
export function adminRoute(handler, options = {}) {
  return createRoute(handler, {
    ...options,
    requireAuth: true,
    requireAdmin: true,
    rateLimit: "admin",
  });
}

/**
 * Sensitive route (stricter rate limits)
 */
export function sensitiveRoute(handler, options = {}) {
  return createRoute(handler, {
    ...options,
    requireAuth: true,
    rateLimit: "sensitive",
  });
}

/**
 * Webhook route (no origin check, no auth)
 */
export function webhookRoute(handler, options = {}) {
  return createRoute(handler, {
    ...options,
    requireAuth: false,
    checkOrigin: false,
    rateLimit: "public",
  });
}

export default {
  createRoute,
  publicRoute,
  authRoute,
  adminRoute,
  sensitiveRoute,
  webhookRoute,
  success,
  error,
  paginated,
};
