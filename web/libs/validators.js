/**
 * INPUT VALIDATORS - SafeScoring
 *
 * Centralized validation functions for API routes.
 * All validators return { valid: boolean, error?: string, sanitized?: any }
 *
 * Usage:
 *   import { validateProductIds, validateSetupProducts, validateEmail } from '@/libs/validators';
 *
 *   const result = validateProductIds(productIds, { max: 10 });
 *   if (!result.valid) return error.validation(result.error);
 */

import { getSupabaseServer } from "@/libs/supabase";

// ============================================================================
// CONSTANTS
// ============================================================================

export const LIMITS = {
  // Setup limits by plan
  SETUP_PRODUCTS: {
    free: 5,
    explorer: 15,
    pro: 50,
    enterprise: 200,
  },
  // Pagination
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 50,
  // Input lengths
  MAX_REASON_LENGTH: 2000,
  MAX_DESCRIPTION_LENGTH: 5000,
  MIN_REASON_LENGTH: 10,
  // Arrays
  MAX_EVIDENCE_URLS: 10,
  MAX_PRODUCTS_PER_REQUEST: 10,
};

// ============================================================================
// BASIC VALIDATORS
// ============================================================================

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  // Length check
  if (trimmed.length > 254) {
    return { valid: false, error: "Email too long" };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate URL format
 */
export function validateUrl(url, options = {}) {
  const { required = true, allowedProtocols = ["http:", "https:"] } = options;

  if (!url) {
    return required
      ? { valid: false, error: "URL is required" }
      : { valid: true, sanitized: null };
  }

  try {
    const parsed = new URL(url);

    if (!allowedProtocols.includes(parsed.protocol)) {
      return { valid: false, error: `URL must use ${allowedProtocols.join(" or ")}` };
    }

    return { valid: true, sanitized: parsed.href };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Validate string length
 */
export function validateString(value, options = {}) {
  const {
    fieldName = "Value",
    required = true,
    minLength = 0,
    maxLength = 1000,
    trim = true,
  } = options;

  if (value === null || value === undefined) {
    return required
      ? { valid: false, error: `${fieldName} is required` }
      : { valid: true, sanitized: null };
  }

  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  const sanitized = trim ? value.trim() : value;

  if (required && sanitized.length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (sanitized.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${maxLength} characters`,
    };
  }

  return { valid: true, sanitized };
}

/**
 * Validate integer
 */
export function validateInteger(value, options = {}) {
  const { fieldName = "Value", required = true, min, max } = options;

  if (value === null || value === undefined) {
    return required
      ? { valid: false, error: `${fieldName} is required` }
      : { valid: true, sanitized: null };
  }

  const num = parseInt(value, 10);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { valid: true, sanitized: num };
}

// ============================================================================
// ARRAY VALIDATORS
// ============================================================================

/**
 * Validate array of integers (like product IDs)
 */
export function validateIntegerArray(arr, options = {}) {
  const {
    fieldName = "Array",
    required = true,
    minLength = 0,
    maxLength = 100,
    minValue,
    maxValue,
    unique = true,
  } = options;

  if (!arr) {
    return required
      ? { valid: false, error: `${fieldName} is required` }
      : { valid: true, sanitized: [] };
  }

  if (!Array.isArray(arr)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }

  if (arr.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must have at least ${minLength} items`,
    };
  }

  if (arr.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must have at most ${maxLength} items`,
    };
  }

  // Validate each item
  const sanitized = [];
  for (let i = 0; i < arr.length; i++) {
    const num = parseInt(arr[i], 10);

    if (isNaN(num)) {
      return { valid: false, error: `${fieldName}[${i}] must be a number` };
    }

    if (minValue !== undefined && num < minValue) {
      return {
        valid: false,
        error: `${fieldName}[${i}] must be at least ${minValue}`,
      };
    }

    if (maxValue !== undefined && num > maxValue) {
      return {
        valid: false,
        error: `${fieldName}[${i}] must be at most ${maxValue}`,
      };
    }

    sanitized.push(num);
  }

  // Remove duplicates if requested
  const finalArray = unique ? [...new Set(sanitized)] : sanitized;

  return { valid: true, sanitized: finalArray };
}

/**
 * Validate array of URLs
 */
export function validateUrlArray(arr, options = {}) {
  const { fieldName = "URLs", required = false, maxLength = 10 } = options;

  if (!arr) {
    return { valid: true, sanitized: [] };
  }

  if (!Array.isArray(arr)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }

  if (arr.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must have at most ${maxLength} items`,
    };
  }

  const sanitized = [];
  for (let i = 0; i < arr.length; i++) {
    const result = validateUrl(arr[i], { required: true });
    if (!result.valid) {
      return { valid: false, error: `${fieldName}[${i}]: ${result.error}` };
    }
    sanitized.push(result.sanitized);
  }

  return { valid: true, sanitized };
}

// ============================================================================
// BUSINESS LOGIC VALIDATORS
// ============================================================================

/**
 * Validate product IDs exist in database
 * @param {number[]} productIds - Array of product IDs to validate
 * @param {object} options - { max: number }
 * @returns {Promise<{ valid: boolean, error?: string, products?: object[] }>}
 */
export async function validateProductIds(productIds, options = {}) {
  const { max = LIMITS.MAX_PRODUCTS_PER_REQUEST } = options;

  // Basic array validation
  const arrayResult = validateIntegerArray(productIds, {
    fieldName: "Product IDs",
    required: true,
    minLength: 1,
    maxLength: max,
    minValue: 1,
  });

  if (!arrayResult.valid) {
    return arrayResult;
  }

  const ids = arrayResult.sanitized;

  // Check products exist in database
  const supabase = getSupabaseServer();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug")
    .in("id", ids);

  if (error) {
    console.error("Product validation error:", error);
    return { valid: false, error: "Failed to validate products" };
  }

  // Check all IDs were found
  const foundIds = new Set(products.map((p) => p.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    return {
      valid: false,
      error: `Products not found: ${missingIds.join(", ")}`,
      missingIds,
    };
  }

  return { valid: true, sanitized: ids, products };
}

/**
 * Validate setup products for user's plan
 * @param {number[]} productIds - Array of product IDs
 * @param {string} userPlan - User's subscription plan
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export async function validateSetupProducts(productIds, userPlan = "free") {
  const maxProducts = LIMITS.SETUP_PRODUCTS[userPlan] || LIMITS.SETUP_PRODUCTS.free;

  // Basic validation
  const arrayResult = validateIntegerArray(productIds, {
    fieldName: "Products",
    required: true,
    minLength: 1,
    maxLength: maxProducts,
    minValue: 1,
  });

  if (!arrayResult.valid) {
    // Check if it's a plan limit issue
    if (productIds?.length > maxProducts) {
      return {
        valid: false,
        error: `Your ${userPlan} plan allows up to ${maxProducts} products per setup. Please upgrade for more.`,
        planLimit: true,
        maxAllowed: maxProducts,
        requested: productIds.length,
      };
    }
    return arrayResult;
  }

  // Validate products exist
  return validateProductIds(arrayResult.sanitized, { max: maxProducts });
}

/**
 * Validate correction submission
 */
export function validateCorrection(data) {
  const errors = [];

  // Required fields
  if (!data.productId && !data.productSlug) {
    errors.push("Product ID or slug is required");
  }

  if (!data.fieldCorrected) {
    errors.push("Field to correct is required");
  }

  if (!data.suggestedValue) {
    errors.push("Suggested value is required");
  }

  // Length validations
  if (data.suggestedValue && data.suggestedValue.length > LIMITS.MAX_DESCRIPTION_LENGTH) {
    errors.push(`Suggested value must be at most ${LIMITS.MAX_DESCRIPTION_LENGTH} characters`);
  }

  if (data.correctionReason) {
    if (data.correctionReason.length < LIMITS.MIN_REASON_LENGTH) {
      errors.push(`Correction reason must be at least ${LIMITS.MIN_REASON_LENGTH} characters`);
    }
    if (data.correctionReason.length > LIMITS.MAX_REASON_LENGTH) {
      errors.push(`Correction reason must be at most ${LIMITS.MAX_REASON_LENGTH} characters`);
    }
  }

  // Evidence URLs
  if (data.evidenceUrls) {
    const urlResult = validateUrlArray(data.evidenceUrls, {
      fieldName: "Evidence URLs",
      maxLength: LIMITS.MAX_EVIDENCE_URLS,
    });
    if (!urlResult.valid) {
      errors.push(urlResult.error);
    }
  }

  // Valid field types
  const validFields = [
    "evaluation",
    "product_info",
    "website",
    "score",
    "incident",
    "methodology",
  ];
  if (data.fieldCorrected && !validFields.includes(data.fieldCorrected)) {
    errors.push(`Invalid field type. Must be one of: ${validFields.join(", ")}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

/**
 * Parse and validate pagination from URL search params
 */
export function parsePagination(searchParams, options = {}) {
  const { maxLimit = LIMITS.MAX_PAGE_SIZE, defaultLimit = LIMITS.DEFAULT_PAGE_SIZE } = options;

  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit")) || defaultLimit),
    maxLimit
  );

  const offset = Math.max(0, parseInt(searchParams.get("offset")) || 0);

  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);

  // If page is provided, calculate offset from it
  const calculatedOffset = searchParams.has("page") ? (page - 1) * limit : offset;

  return {
    limit,
    offset: calculatedOffset,
    page: Math.floor(calculatedOffset / limit) + 1,
  };
}

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize string for database (prevent injection)
 */
export function sanitizeString(str) {
  if (typeof str !== "string") return str;

  return str
    .replace(/[<>]/g, "") // Remove HTML tags
    .trim();
}

/**
 * Sanitize object keys to only allowed fields
 */
export function sanitizeFields(obj, allowedFields) {
  const sanitized = {};

  for (const field of allowedFields) {
    if (obj[field] !== undefined) {
      sanitized[field] = obj[field];
    }
  }

  return sanitized;
}
