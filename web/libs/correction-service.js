/**
 * Correction Service
 *
 * Centralized logic for handling user corrections.
 * Eliminates duplicate code between:
 * - /api/corrections/route.js
 * - /api/admin/corrections/route.js
 *
 * This module handles:
 * - Sanitization of product updates (security)
 * - Application of corrections to database
 * - Consensus checking and auto-approval
 */

import { supabase } from "@/libs/supabase";

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * Whitelist of fields that can be updated via user corrections
 * SECURITY: Only these fields are allowed to prevent arbitrary updates
 */
export const ALLOWED_PRODUCT_FIELDS = [
  "name",
  "description",
  "website",
  "logo_url",
  "category",
  "open_source",
  "github_url",
  "documentation_url",
  "twitter_url",
  "discord_url",
  "launch_date",
];

/**
 * Fields that should NEVER be updatable via corrections
 * SECURITY: These fields are critical and must never be modified by users
 */
export const FORBIDDEN_FIELDS = [
  "id",
  "user_id",
  "created_at",
  "updated_at",
  "slug",
  "plan_type",
  "has_access",
  "is_verified",
  "is_admin",
  "role",
  "password",
  "email",
];

/**
 * Valid evaluation results for norm evaluations
 */
export const VALID_EVALUATION_RESULTS = ["YES", "NO", "N/A", "PARTIAL", "UNKNOWN"];

/**
 * Valid correction field types
 */
export const VALID_CORRECTION_FIELDS = [
  "evaluation",      // Correction on norm evaluation (YES/NO/N/A)
  "product_info",    // Correction on product information
  "incident",        // Correction on incident data
  "methodology",     // Suggestion for methodology improvement
  "other"            // Other corrections
];

/**
 * Consensus threshold - number of users needed to auto-approve
 */
export const CONSENSUS_THRESHOLD = 3;

// =============================================================================
// VALIDATION & SANITIZATION
// =============================================================================

/**
 * Validate and sanitize product updates from corrections
 * SECURITY: Prevents arbitrary field injection
 *
 * @param {object} rawUpdates - Raw updates from user input
 * @returns {object|null} - Sanitized updates or null if invalid
 */
export function sanitizeProductUpdates(rawUpdates) {
  if (!rawUpdates || typeof rawUpdates !== "object") {
    return null;
  }

  const sanitized = {};
  let hasValidFields = false;

  for (const [key, value] of Object.entries(rawUpdates)) {
    // Skip forbidden fields
    if (FORBIDDEN_FIELDS.includes(key.toLowerCase())) {
      console.warn(`[SECURITY] Blocked forbidden field in correction: ${key}`);
      continue;
    }

    // Only allow whitelisted fields
    if (!ALLOWED_PRODUCT_FIELDS.includes(key)) {
      console.warn(`[SECURITY] Blocked non-whitelisted field in correction: ${key}`);
      continue;
    }

    // Validate value type and sanitize
    if (typeof value === "string") {
      // Limit string length to prevent storage attacks
      sanitized[key] = value.slice(0, 2000);
      hasValidFields = true;
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
      hasValidFields = true;
    } else if (typeof value === "number" && !isNaN(value)) {
      sanitized[key] = value;
      hasValidFields = true;
    }
    // Skip complex objects, functions, etc.
  }

  return hasValidFields ? sanitized : null;
}

/**
 * Validate correction input data
 *
 * @param {object} data - Correction data to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCorrectionInput(data) {
  const {
    productId,
    productSlug,
    fieldCorrected,
    suggestedValue,
    correctionReason,
    evidenceDescription,
    evidenceUrls,
  } = data;

  // Require product identification
  if (!productId && !productSlug) {
    return { valid: false, error: "Product ID or slug is required" };
  }

  // Require field and suggested value
  if (!fieldCorrected || !suggestedValue) {
    return { valid: false, error: "Field to correct and suggested value are required" };
  }

  // Validate field type
  if (!VALID_CORRECTION_FIELDS.includes(fieldCorrected)) {
    return {
      valid: false,
      error: `Invalid field type. Must be one of: ${VALID_CORRECTION_FIELDS.join(", ")}`
    };
  }

  // Length validations (prevent DoS/storage attacks)
  if (suggestedValue.length > 5000) {
    return { valid: false, error: "Suggested value too long (max 5000 characters)" };
  }

  if (correctionReason && correctionReason.length > 2000) {
    return { valid: false, error: "Correction reason too long (max 2000 characters)" };
  }

  if (evidenceDescription && evidenceDescription.length > 2000) {
    return { valid: false, error: "Evidence description too long (max 2000 characters)" };
  }

  if (evidenceUrls && Array.isArray(evidenceUrls) && evidenceUrls.length > 10) {
    return { valid: false, error: "Too many evidence URLs (max 10)" };
  }

  return { valid: true };
}

// =============================================================================
// CORRECTION APPLICATION
// =============================================================================

/**
 * Apply a user correction to the database
 * SECURITY: All updates are validated and sanitized
 *
 * @param {object} correction - The correction object from database
 * @param {string} source - Source of the correction ('user_correction' | 'community_consensus' | 'admin')
 */
export async function applyUserCorrection(correction, source = "user_correction") {
  try {
    switch (correction.field_corrected) {
      case "evaluation":
        await applyEvaluationCorrection(correction, source);
        break;

      case "product_info":
        await applyProductInfoCorrection(correction);
        break;

      case "incident":
        // Incidents require manual review - log only
        console.log(`[CORRECTION] Incident correction flagged for product ${correction.product_id}`);
        break;

      default:
        console.log(`[CORRECTION] Unknown correction type: ${correction.field_corrected}`);
    }

    // Record score impact
    await supabase
      .from("user_corrections")
      .update({ score_impact: 1.0 })
      .eq("id", correction.id);

  } catch (error) {
    console.error("[CORRECTION] Error applying correction:", error);
    throw error;
  }
}

/**
 * Apply an evaluation correction
 */
async function applyEvaluationCorrection(correction, source) {
  if (!correction.norm_id || !correction.product_id) {
    console.warn("[CORRECTION] Missing norm_id or product_id for evaluation correction");
    return;
  }

  // Validate evaluation result
  const upperValue = correction.suggested_value?.toUpperCase?.();
  if (!VALID_EVALUATION_RESULTS.includes(upperValue)) {
    console.warn(`[SECURITY] Invalid evaluation result: ${correction.suggested_value}`);
    return;
  }

  await supabase
    .from("evaluations")
    .update({
      result: upperValue,
      why_this_result: `${source === "community_consensus" ? "Community correction" : "User correction"}: ${(correction.correction_reason || "N/A").slice(0, 500)}`,
      evaluated_by: source,
      evaluation_date: new Date().toISOString(),
    })
    .eq("product_id", correction.product_id)
    .eq("norm_id", correction.norm_id);
}

/**
 * Apply a product info correction
 */
async function applyProductInfoCorrection(correction) {
  try {
    const rawUpdates = JSON.parse(correction.suggested_value);
    const sanitizedUpdates = sanitizeProductUpdates(rawUpdates);

    if (!sanitizedUpdates) {
      console.warn("[SECURITY] No valid fields in product correction");
      return;
    }

    await supabase
      .from("products")
      .update(sanitizedUpdates)
      .eq("id", correction.product_id);

    console.log(`[CORRECTION] Applied product update:`, Object.keys(sanitizedUpdates));
  } catch (parseError) {
    console.warn("[SECURITY] Invalid JSON in product correction:", parseError.message);
  }
}

// =============================================================================
// CONSENSUS SYSTEM
// =============================================================================

/**
 * Check if consensus is reached and auto-approve corrections
 * Consensus = CONSENSUS_THRESHOLD users suggesting the same correction
 *
 * @param {object} params - Parameters for consensus check
 * @param {string} params.productId - Product ID
 * @param {string|null} params.normId - Norm ID (optional)
 * @param {string} params.fieldCorrected - Type of field being corrected
 * @param {string} params.suggestedValue - The suggested value
 * @returns {Promise<{ applied: boolean, count: number }>}
 */
export async function checkAndApplyConsensus({ productId, normId, fieldCorrected, suggestedValue }) {
  try {
    // Find similar pending corrections (same product + field + suggested value)
    let query = supabase
      .from("user_corrections")
      .select("id, user_id, product_id, norm_id, field_corrected, suggested_value, correction_reason")
      .eq("product_id", productId)
      .eq("field_corrected", fieldCorrected)
      .eq("suggested_value", suggestedValue)
      .eq("status", "pending");

    if (normId) {
      query = query.eq("norm_id", normId);
    } else {
      query = query.is("norm_id", null);
    }

    const { data: similarCorrections, error } = await query;

    if (error || !similarCorrections) {
      console.error("Error checking consensus:", error);
      return { applied: false, count: 0 };
    }

    if (similarCorrections.length < CONSENSUS_THRESHOLD) {
      return { applied: false, count: similarCorrections.length };
    }

    // CONSENSUS REACHED - Auto-approve all similar corrections
    const correctionIds = similarCorrections.map(c => c.id);
    const userIds = [...new Set(similarCorrections.map(c => c.user_id).filter(Boolean))];

    // 1. Update status of all corrections to approved
    const { error: updateError } = await supabase
      .from("user_corrections")
      .update({
        status: "approved",
        reviewed_by: null, // system
        reviewed_at: new Date().toISOString(),
        review_notes: `Auto-approved by consensus (${similarCorrections.length} votes)`,
        was_applied: true
      })
      .in("id", correctionIds);

    if (updateError) {
      console.error("Error updating corrections:", updateError);
      return { applied: false, count: similarCorrections.length };
    }

    // 2. Apply the correction
    await applyUserCorrection(similarCorrections[0], "community_consensus");

    // 3. Update reputation for all contributing users
    for (const userId of userIds) {
      await supabase.rpc("update_user_reputation", { p_user_id: userId }).catch(() => {});
    }

    console.log(`[CONSENSUS] Auto-approved ${similarCorrections.length} corrections for product ${productId}`);
    return { applied: true, count: similarCorrections.length };

  } catch (error) {
    console.error("Consensus check error:", error);
    return { applied: false, count: 0 };
  }
}

// =============================================================================
// REPUTATION HELPERS
// =============================================================================

/**
 * Get or create user reputation entry
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} - User reputation data
 */
export async function getOrCreateUserReputation(userId) {
  // Try to get existing reputation
  const { data: existing } = await supabase
    .from("user_reputation")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return existing;
  }

  // Create new reputation entry
  const { data: created } = await supabase
    .from("user_reputation")
    .insert({
      user_id: userId,
      corrections_submitted: 0,
      corrections_approved: 0,
      corrections_rejected: 0,
      reputation_score: 50.0,
      reputation_level: "newcomer",
      points_earned: 0,
    })
    .select()
    .single();

  return created || {
    user_id: userId,
    corrections_submitted: 0,
    corrections_approved: 0,
    corrections_rejected: 0,
    reputation_score: 50.0,
    reputation_level: "newcomer",
    points_earned: 0,
  };
}

/**
 * Increment user corrections count
 *
 * @param {string} userId - User ID
 */
export async function incrementUserCorrections(userId) {
  try {
    // Try using RPC if available
    await supabase.rpc("increment_user_corrections", { p_user_id: userId });
  } catch {
    // Fallback: manual increment
    const { data: current } = await supabase
      .from("user_reputation")
      .select("corrections_submitted")
      .eq("user_id", userId)
      .single();

    if (current) {
      await supabase
        .from("user_reputation")
        .update({ corrections_submitted: (current.corrections_submitted || 0) + 1 })
        .eq("user_id", userId);
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Configuration
  ALLOWED_PRODUCT_FIELDS,
  FORBIDDEN_FIELDS,
  VALID_EVALUATION_RESULTS,
  VALID_CORRECTION_FIELDS,
  CONSENSUS_THRESHOLD,

  // Functions
  sanitizeProductUpdates,
  validateCorrectionInput,
  applyUserCorrection,
  checkAndApplyConsensus,
  getOrCreateUserReputation,
  incrementUserCorrections,
};
