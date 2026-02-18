/**
 * Partner API Authentication
 */
import { createHash } from "crypto";
import { supabase } from "@/libs/supabase";

const rateLimitStore = new Map();

export async function validatePartnerKey(request) {
  const key = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!key) return { valid: false, error: "Missing API key" };

  const keyHash = createHash("sha256").update(key).digest("hex");
  const { data } = await supabase
    .from("partner_api_keys")
    .select("id, partner_id, is_active, partner_accounts!inner(plan_type, rate_limit_per_minute, white_label_enabled, status, features)")
    .eq("key_hash", keyHash)
    .single();

  if (!data?.is_active || data.partner_accounts.status !== "active") {
    return { valid: false, error: "Invalid or inactive API key" };
  }

  const partner = data.partner_accounts;
  const rateKey = `rate:${data.partner_id}`;
  const now = Date.now();
  let rateData = rateLimitStore.get(rateKey) || { count: 0, resetAt: now + 60000 };
  if (now > rateData.resetAt) rateData = { count: 0, resetAt: now + 60000 };
  if (rateData.count >= partner.rate_limit_per_minute) {
    return { valid: false, error: "Rate limit exceeded", retryAfter: Math.ceil((rateData.resetAt - now) / 1000) };
  }
  rateData.count++;
  rateLimitStore.set(rateKey, rateData);

  return {
    valid: true, partnerId: data.partner_id, keyId: data.id,
    plan: partner.plan_type, whiteLabel: partner.white_label_enabled,
    features: partner.features,
    rateLimit: { limit: partner.rate_limit_per_minute, remaining: partner.rate_limit_per_minute - rateData.count, reset: rateData.resetAt }
  };
}

export async function trackUsage(partnerId, keyId, endpoint, statusCode, responseTimeMs, productSlug = null) {
  await supabase.from("partner_api_usage").insert({ partner_id: partnerId, api_key_id: keyId, endpoint, status_code: statusCode, response_time_ms: responseTimeMs, product_slug: productSlug }).catch(() => {});
}
