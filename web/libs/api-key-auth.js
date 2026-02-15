import { createHash, randomBytes } from "crypto";

/**
 * API Key Authentication Middleware
 * Validates API keys for programmatic access to protected endpoints.
 * Keys are stored as SHA-256 hashes — the full key is only shown once on creation.
 */

let _supabaseAdmin = null;

async function getSupabase() {
  if (_supabaseAdmin) return _supabaseAdmin;
  try {
    const { supabaseAdmin } = await import("@/libs/supabase");
    _supabaseAdmin = supabaseAdmin;
    return _supabaseAdmin;
  } catch {
    return null;
  }
}

/**
 * Generate a new API key
 * @returns {{ fullKey: string, prefix: string, hash: string }}
 */
export function generateApiKey() {
  const randomPart = randomBytes(32).toString("hex");
  const fullKey = `sk_live_${randomPart}`;
  const prefix = randomPart.substring(0, 8);
  const hash = createHash("sha256").update(fullKey).digest("hex");
  return { fullKey, prefix, hash };
}

/**
 * Hash an API key for lookup
 * @param {string} key - The full API key
 * @returns {string} SHA-256 hash
 */
export function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate an API key from a request
 * Checks x-api-key header or api_key query param
 * @param {Request} request
 * @returns {{ valid: boolean, userId?: string, permissions?: string[], rateLimit?: number, error?: string }}
 */
export async function validateApiKey(request) {
  // Extract API key from header or query param
  const apiKey =
    request.headers.get("x-api-key") ||
    new URL(request.url).searchParams.get("api_key");

  if (!apiKey) {
    return { valid: false, error: "no_key" };
  }

  // Must start with sk_live_
  if (!apiKey.startsWith("sk_live_")) {
    return { valid: false, error: "invalid_format" };
  }

  const supabase = await getSupabase();
  if (!supabase) {
    return { valid: false, error: "db_unavailable" };
  }

  try {
    const keyHash = hashApiKey(apiKey);

    // Look up key by hash
    const { data: keyRecord, error } = await supabase
      .from("api_keys")
      .select("id, user_id, permissions, rate_limit_per_hour, is_active, expires_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (error || !keyRecord) {
      return { valid: false, error: "key_not_found" };
    }

    // Check if active
    if (!keyRecord.is_active) {
      return { valid: false, error: "key_revoked" };
    }

    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return { valid: false, error: "key_expired" };
    }

    // Update usage stats (fire and forget)
    supabase
      .from("api_keys")
      .update({
        last_used_at: new Date().toISOString(),
        total_requests: (keyRecord.total_requests || 0) + 1,
      })
      .eq("id", keyRecord.id)
      .then(() => {});

    return {
      valid: true,
      userId: keyRecord.user_id,
      keyId: keyRecord.id,
      permissions: keyRecord.permissions || ["read"],
      rateLimit: keyRecord.rate_limit_per_hour || 100,
    };
  } catch (err) {
    console.error("API key validation error:", err);
    return { valid: false, error: "validation_error" };
  }
}
