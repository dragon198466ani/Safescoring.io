/**
 * STANDARDIZED API RESPONSES - SafeScoring
 *
 * All API routes should use these helpers for consistent response format.
 *
 * SUCCESS: { data: any, meta?: object }
 * ERROR:   { error: string, code: string, status: number, details?: object }
 *
 * Usage:
 *   import { success, error, paginated, ERROR_CODES } from '@/libs/api-response';
 *
 *   return success({ products: [...] });
 *   return error.notFound('Product not found');
 *   return error.validation('Email is required', { field: 'email' });
 *   return paginated(products, { limit: 50, offset: 0, total: 1302 });
 */

import { NextResponse } from "next/server";

// ============================================================================
// ERROR CODES - Use these for consistent error identification
// ============================================================================

export const ERROR_CODES = {
  // Authentication (401)
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID: "AUTH_INVALID",
  AUTH_EXPIRED: "AUTH_EXPIRED",

  // Authorization (403)
  FORBIDDEN: "FORBIDDEN",
  PLAN_LIMIT: "PLAN_LIMIT",
  RATE_LIMIT: "RATE_LIMIT",

  // Validation (400)
  VALIDATION: "VALIDATION",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_FIELD: "MISSING_FIELD",

  // Not Found (404)
  NOT_FOUND: "NOT_FOUND",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",

  // Conflict (409)
  DUPLICATE: "DUPLICATE",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Server (500)
  INTERNAL: "INTERNAL",
  DATABASE: "DATABASE",
  EXTERNAL_API: "EXTERNAL_API",
};

// ============================================================================
// SUCCESS RESPONSES
// ============================================================================

/**
 * Return a successful response
 * @param {any} data - Response data
 * @param {object} meta - Optional metadata
 * @param {number} status - HTTP status (default 200)
 */
export function success(data, meta = null, status = 200) {
  const response = { data };
  if (meta) response.meta = meta;

  return NextResponse.json(response, { status });
}

/**
 * Return a created response (201)
 */
export function created(data, meta = null) {
  return success(data, meta, 201);
}

/**
 * Return a paginated response
 * @param {array} items - Array of items
 * @param {object} pagination - { limit, offset, total }
 */
export function paginated(items, { limit, offset, total }) {
  return success(items, {
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + items.length < total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * Create an error response
 * @param {string} message - Human-readable error message
 * @param {string} code - Error code from ERROR_CODES
 * @param {number} status - HTTP status code
 * @param {object} details - Optional additional details
 */
function createError(message, code, status, details = null) {
  const response = {
    error: message,
    code,
    status,
  };
  if (details) response.details = details;

  return NextResponse.json(response, { status });
}

export const error = {
  // 400 Bad Request
  validation: (message, details = null) =>
    createError(message, ERROR_CODES.VALIDATION, 400, details),

  invalidInput: (message, details = null) =>
    createError(message, ERROR_CODES.INVALID_INPUT, 400, details),

  missingField: (field) =>
    createError(`${field} is required`, ERROR_CODES.MISSING_FIELD, 400, { field }),

  // 401 Unauthorized
  authRequired: (message = "Authentication required") =>
    createError(message, ERROR_CODES.AUTH_REQUIRED, 401),

  authInvalid: (message = "Invalid credentials") =>
    createError(message, ERROR_CODES.AUTH_INVALID, 401),

  authExpired: (message = "Session expired") =>
    createError(message, ERROR_CODES.AUTH_EXPIRED, 401),

  // 403 Forbidden
  forbidden: (message = "Access denied") =>
    createError(message, ERROR_CODES.FORBIDDEN, 403),

  planLimit: (message = "Plan limit reached. Please upgrade.") =>
    createError(message, ERROR_CODES.PLAN_LIMIT, 403),

  rateLimit: (message = "Too many requests. Please try again later.") =>
    createError(message, ERROR_CODES.RATE_LIMIT, 429),

  // 404 Not Found
  notFound: (resource = "Resource") =>
    createError(`${resource} not found`, ERROR_CODES.NOT_FOUND, 404),

  productNotFound: (identifier = "") =>
    createError(
      identifier ? `Product "${identifier}" not found` : "Product not found",
      ERROR_CODES.PRODUCT_NOT_FOUND,
      404
    ),

  userNotFound: () =>
    createError("User not found", ERROR_CODES.USER_NOT_FOUND, 404),

  // 409 Conflict
  duplicate: (message = "Resource already exists") =>
    createError(message, ERROR_CODES.DUPLICATE, 409),

  alreadyExists: (resource = "Resource") =>
    createError(`${resource} already exists`, ERROR_CODES.ALREADY_EXISTS, 409),

  // 500 Internal Server Error
  internal: (message = "An unexpected error occurred") =>
    createError(message, ERROR_CODES.INTERNAL, 500),

  database: (message = "Database error") =>
    createError(message, ERROR_CODES.DATABASE, 500),

  externalApi: (service = "External service") =>
    createError(`${service} unavailable`, ERROR_CODES.EXTERNAL_API, 502),
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate required fields and return error response if any missing
 * @param {object} body - Request body
 * @param {string[]} requiredFields - List of required field names
 * @returns {NextResponse|null} Error response or null if valid
 */
export function validateRequired(body, requiredFields) {
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return error.missingField(field);
    }
  }
  return null;
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} max - Maximum length
 * @param {number} min - Minimum length (default 0)
 */
export function validateLength(value, fieldName, max, min = 0) {
  if (typeof value !== "string") {
    return error.validation(`${fieldName} must be a string`);
  }
  if (value.length < min) {
    return error.validation(`${fieldName} must be at least ${min} characters`, {
      field: fieldName,
      min,
    });
  }
  if (value.length > max) {
    return error.validation(`${fieldName} must be at most ${max} characters`, {
      field: fieldName,
      max,
    });
  }
  return null;
}

/**
 * Validate array length
 * @param {array} arr - Array to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} max - Maximum items
 * @param {number} min - Minimum items (default 0)
 */
export function validateArrayLength(arr, fieldName, max, min = 0) {
  if (!Array.isArray(arr)) {
    return error.validation(`${fieldName} must be an array`);
  }
  if (arr.length < min) {
    return error.validation(`${fieldName} must have at least ${min} items`, {
      field: fieldName,
      min,
    });
  }
  if (arr.length > max) {
    return error.validation(`${fieldName} must have at most ${max} items`, {
      field: fieldName,
      max,
    });
  }
  return null;
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return error.validation("Invalid email format", { field: "email" });
  }
  return null;
}

/**
 * Validate pagination parameters
 * @param {number} limit - Requested limit
 * @param {number} offset - Requested offset
 * @param {number} maxLimit - Maximum allowed limit (default 100)
 */
export function validatePagination(limit, offset, maxLimit = 100) {
  const safeLimit = Math.min(Math.max(1, limit || 50), maxLimit);
  const safeOffset = Math.max(0, offset || 0);

  return { limit: safeLimit, offset: safeOffset };
}

// ============================================================================
// RATE LIMIT HEADERS
// ============================================================================

/**
 * Add rate limit headers to response
 * @param {NextResponse} response - Response to modify
 * @param {object} limits - { limit, remaining, reset }
 */
export function addRateLimitHeaders(response, { limit, remaining, reset }) {
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", reset.toString());
  return response;
}

// ============================================================================
// WRAPPER FOR EASY MIGRATION
// ============================================================================

/**
 * Wrap an existing API handler to use new response format
 * Use this for gradual migration of existing routes
 *
 * @example
 * export const GET = wrapHandler(async (request) => {
 *   const products = await fetchProducts();
 *   return { data: products }; // Auto-wrapped with success()
 * });
 */
export function wrapHandler(handler) {
  return async (request, context) => {
    try {
      const result = await handler(request, context);

      // Already a NextResponse - return as-is
      if (result instanceof NextResponse) {
        return result;
      }

      // Object with data property - wrap with success()
      if (result && typeof result === "object" && "data" in result) {
        return success(result.data, result.meta);
      }

      // Raw data - wrap with success()
      return success(result);
    } catch (err) {
      console.error("[API Error]", err);

      // Known error types
      if (err.code === "PGRST116") {
        return error.notFound();
      }

      return error.internal(
        process.env.NODE_ENV === "development" ? err.message : undefined
      );
    }
  };
}
