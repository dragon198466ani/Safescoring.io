/**
 * API Input Validation Schemas (Zod)
 * Centralized validation for all public API inputs
 */
import { z } from "zod";

// ============================================================
// Common schemas
// ============================================================

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});

export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, "Invalid slug format");

// ============================================================
// /api/search
// ============================================================

export const searchQuerySchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters").max(200),
  type: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ============================================================
// /api/products
// ============================================================

export const productsQuerySchema = z.object({
  category: z.string().max(50).optional(),
  type: z.string().max(50).optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["score-desc", "score-asc", "name-asc", "name-desc", "recent"]).default("score-desc"),
  scoreType: z.enum(["full", "consumer", "essential"]).default("full"),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});

// ============================================================
// /api/newsletter
// ============================================================

export const newsletterSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
});

export const unsubscribeSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  token: z.string().length(32, "Invalid token"),
});

// ============================================================
// /api/claim
// ============================================================

export const claimSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  companyName: z.string().min(1).max(200),
  email: z.string().email("Invalid email").max(255),
  role: z.string().min(1).max(100),
  message: z.string().max(2000).optional(),
  turnstileToken: z.string().min(1, "CAPTCHA required"),
});

// ============================================================
// /api/admin/corrections
// ============================================================

export const correctionSchema = z.object({
  productId: z.string().uuid(),
  field: z.string().min(1).max(100),
  currentValue: z.string().max(5000).optional(),
  suggestedValue: z.string().min(1).max(5000),
  justification: z.string().min(10).max(2000),
});

// ============================================================
// Helper: Parse and validate search params
// ============================================================

/**
 * Parse URL search params into an object and validate with a zod schema
 * @param {URLSearchParams} searchParams
 * @param {z.ZodSchema} schema
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
export function validateSearchParams(searchParams, schema) {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: `${firstError.path.join(".")}: ${firstError.message}`,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Parse JSON body and validate with a zod schema
 * @param {Request} request
 * @param {z.ZodSchema} schema
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function validateBody(request, schema) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return {
        success: false,
        error: `${firstError.path.join(".")}: ${firstError.message}`,
      };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Invalid JSON body" };
  }
}
