/**
 * Unified Rate Limiters for SafeScoring APIs
 *
 * Provides easy-to-use rate limiting for different route types:
 * - User routes: /api/user/* (100 req/10min per user)
 * - Product routes: /api/products/* (50 req/1min per IP)
 * - Vote routes: /api/community/vote (30 req/1min per user)
 * - Admin routes: /api/admin/* (200 req/10min per admin)
 *
 * Usage:
 * ```javascript
 * import { applyUserRateLimit } from '@/libs/rate-limiters';
 *
 * export async function GET(req) {
 *   const rateLimitResult = await applyUserRateLimit(req);
 *   if (!rateLimitResult.allowed) {
 *     return rateLimitResult.response;
 *   }
 *   // ... handle request
 * }
 * ```
 */

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/libs/rate-limit';
import { auth } from '@/libs/auth';

// =============================================================================
// RATE LIMIT CONFIGURATIONS
// =============================================================================

/**
 * Rate limit tiers for different API types
 */
const RATE_LIMIT_TIERS = {
  // User routes: Authenticated user operations
  USER: {
    maxRequests: 100,
    windowMs: 10 * 60 * 1000,  // 10 minutes
    identifier: 'user',
    message: 'Too many requests. Please wait before trying again.'
  },

  // Product routes: Public product browsing
  PRODUCT: {
    maxRequests: 50,
    windowMs: 1 * 60 * 1000,  // 1 minute
    identifier: 'product',
    message: 'Too many product requests. Please slow down.'
  },

  // Vote routes: Community voting
  VOTE: {
    maxRequests: 30,
    windowMs: 1 * 60 * 1000,  // 1 minute
    identifier: 'vote',
    message: 'Too many votes. Please wait before voting again.'
  },

  // Admin routes: Admin operations
  ADMIN: {
    maxRequests: 200,
    windowMs: 10 * 60 * 1000,  // 10 minutes
    identifier: 'admin',
    message: 'Admin rate limit exceeded.'
  },

  // Public routes: Unauthenticated access
  PUBLIC: {
    maxRequests: 30,
    windowMs: 1 * 60 * 1000,  // 1 minute
    identifier: 'public',
    message: 'Too many requests from this IP. Please slow down.'
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get client identifier from request
 * Priority: user_id > email > IP
 */
function getClientIdentifier(req, session = null) {
  // 1. Try user ID from session
  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }

  // 2. Try email from session
  if (session?.user?.email) {
    return `email:${session.user.email}`;
  }

  // 3. Fall back to IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `ip:${ip}`;
}

/**
 * Create rate limit response with headers
 */
function createRateLimitResponse(result, config) {
  const retryAfter = Math.ceil((config.windowMs - (Date.now() - result.windowStart)) / 1000);

  return NextResponse.json(
    {
      error: config.message,
      retryAfter: retryAfter > 0 ? retryAfter : 60
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter > 0 ? retryAfter : 60),
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((result.windowStart + config.windowMs) / 1000))
      }
    }
  );
}

/**
 * Apply rate limit with configuration
 */
async function applyRateLimit(req, config, session = null) {
  const identifier = getClientIdentifier(req, session);
  const limitType = config.identifier;

  const result = checkRateLimit(
    identifier,
    limitType,
    config.maxRequests,
    config.windowMs
  );

  if (!result.allowed) {
    return {
      allowed: false,
      response: createRateLimitResponse(result, config)
    };
  }

  return {
    allowed: true,
    remaining: result.remaining,
    reset: result.reset,
    headers: {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000))
    }
  };
}

// =============================================================================
// PUBLIC API - EASY-TO-USE RATE LIMITERS
// =============================================================================

/**
 * Apply rate limiting to user routes (/api/user/*)
 *
 * @param {Request} req - Next.js request object
 * @returns {Promise<{allowed: boolean, response?: NextResponse, headers?: object}>}
 *
 * @example
 * export async function GET(req) {
 *   const rateLimitResult = await applyUserRateLimit(req);
 *   if (!rateLimitResult.allowed) {
 *     return rateLimitResult.response;
 *   }
 *   // ... handle request
 *   return NextResponse.json(data, { headers: rateLimitResult.headers });
 * }
 */
export async function applyUserRateLimit(req) {
  // Get authenticated session
  const session = await auth();

  // Require authentication for user routes
  if (!session?.user?.id) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  return applyRateLimit(req, RATE_LIMIT_TIERS.USER, session);
}

/**
 * Apply rate limiting to product routes (/api/products/*)
 *
 * @param {Request} req - Next.js request object
 * @param {object} session - Optional session (if already fetched)
 * @returns {Promise<{allowed: boolean, response?: NextResponse, headers?: object}>}
 */
export async function applyProductRateLimit(req, session = null) {
  if (!session) {
    session = await auth();
  }
  return applyRateLimit(req, RATE_LIMIT_TIERS.PRODUCT, session);
}

/**
 * Apply rate limiting to vote routes (/api/community/vote)
 *
 * @param {Request} req - Next.js request object
 * @returns {Promise<{allowed: boolean, response?: NextResponse, headers?: object}>}
 */
export async function applyVoteRateLimit(req) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  return applyRateLimit(req, RATE_LIMIT_TIERS.VOTE, session);
}

/**
 * Apply rate limiting to admin routes (/api/admin/*)
 *
 * @param {Request} req - Next.js request object
 * @returns {Promise<{allowed: boolean, response?: NextResponse, headers?: object}>}
 */
export async function applyAdminRateLimit(req) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  return applyRateLimit(req, RATE_LIMIT_TIERS.ADMIN, session);
}

/**
 * Apply rate limiting to public routes
 *
 * @param {Request} req - Next.js request object
 * @returns {Promise<{allowed: boolean, response?: NextResponse, headers?: object}>}
 */
export async function applyPublicRateLimit(req) {
  return applyRateLimit(req, RATE_LIMIT_TIERS.PUBLIC);
}

// =============================================================================
// CONVENIENCE WRAPPER FOR MULTIPLE HTTP METHODS
// =============================================================================

/**
 * Wrap a route handler with rate limiting
 *
 * @param {Function} handler - Route handler function
 * @param {Function} rateLimiter - Rate limiter function to use
 * @returns {Function} Wrapped handler
 *
 * @example
 * export const GET = withRateLimit(
 *   async (req) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   applyUserRateLimit
 * );
 */
export function withRateLimit(handler, rateLimiter) {
  return async (req, context) => {
    const rateLimitResult = await rateLimiter(req);

    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Call original handler
    const response = await handler(req, context);

    // Add rate limit headers to response if possible
    if (response && rateLimitResult.headers) {
      const headers = new Headers(response.headers);
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  };
}

// =============================================================================
// EXPORT CONFIGURATION (for monitoring/docs)
// =============================================================================

export { RATE_LIMIT_TIERS };
