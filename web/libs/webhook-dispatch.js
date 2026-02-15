import { createHmac } from "crypto";
import { supabaseAdmin } from "@/libs/supabase";

/**
 * Webhook Dispatch System
 * Sends webhook events to subscribed Enterprise users with HMAC-SHA256 signatures.
 *
 * Event types: "score_change", "new_product", "incident_reported"
 *
 * Payload format:
 * {
 *   event: "score_change",
 *   timestamp: "2025-01-15T12:00:00.000Z",
 *   data: { ... }
 * }
 *
 * Headers:
 * - Content-Type: application/json
 * - X-SafeScoring-Event: <event_type>
 * - X-SafeScoring-Signature: sha256=<hmac_hex>
 * - X-SafeScoring-Timestamp: <unix_ms>
 * - User-Agent: SafeScoring-Webhook/1.0
 */

const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const MAX_FAILURE_COUNT = 10; // Auto-disable after this many consecutive failures

/**
 * Compute HMAC-SHA256 signature for a webhook payload.
 * Signs: `${timestamp}.${body}` with the webhook secret.
 */
function computeSignature(body, secret, timestamp) {
  const signedPayload = `${timestamp}.${body}`;
  return createHmac("sha256", secret).update(signedPayload).digest("hex");
}

/**
 * Send a single webhook request.
 * Returns { success: boolean, statusCode?: number, error?: string }
 */
async function sendWebhook(url, payload, secret, eventType) {
  const timestamp = Date.now().toString();
  const body = JSON.stringify(payload);
  const signature = computeSignature(body, secret, timestamp);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SafeScoring-Event": eventType,
        "X-SafeScoring-Signature": `sha256=${signature}`,
        "X-SafeScoring-Timestamp": timestamp,
        "User-Agent": "SafeScoring-Webhook/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 2xx = success
    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}`,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMessage =
      err.name === "AbortError" ? "Timeout (10s)" : err.message || "Network error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Dispatch a webhook event to all subscribed active webhooks.
 *
 * @param {string} eventType - One of: "score_change", "new_product", "incident_reported"
 * @param {object} data - Event-specific payload data
 * @returns {Promise<{ dispatched: number, failed: number, errors: string[] }>}
 */
export async function dispatchWebhookEvent(eventType, data) {
  const result = { dispatched: 0, failed: 0, errors: [] };

  if (!supabaseAdmin) {
    console.warn("[webhook-dispatch] Supabase not configured, skipping dispatch");
    return result;
  }

  try {
    // Find all active webhooks subscribed to this event type
    const { data: webhooks, error } = await supabaseAdmin
      .from("user_webhooks")
      .select("id, url, secret, events, failure_count")
      .eq("is_active", true)
      .lt("failure_count", MAX_FAILURE_COUNT);

    if (error) {
      console.error("[webhook-dispatch] Error fetching webhooks:", error);
      return result;
    }

    if (!webhooks || webhooks.length === 0) {
      return result;
    }

    // Filter to only webhooks subscribed to this event
    const matchingWebhooks = webhooks.filter(
      (wh) => Array.isArray(wh.events) && wh.events.includes(eventType)
    );

    if (matchingWebhooks.length === 0) {
      return result;
    }

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    // Dispatch to all matching webhooks in parallel
    const deliveries = matchingWebhooks.map(async (webhook) => {
      const deliveryResult = await deliverWithRetry(
        webhook,
        payload,
        eventType
      );
      if (deliveryResult.success) {
        result.dispatched++;
      } else {
        result.failed++;
        result.errors.push(`${webhook.url}: ${deliveryResult.error}`);
      }
    });

    await Promise.allSettled(deliveries);

    if (result.dispatched > 0) {
      console.log(
        `[webhook-dispatch] ${eventType}: ${result.dispatched} delivered, ${result.failed} failed`
      );
    }
  } catch (err) {
    console.error("[webhook-dispatch] Dispatch error:", err);
  }

  return result;
}

/**
 * Deliver a webhook with retry logic (exponential backoff).
 * Retries: immediate, 30s, 5min
 */
async function deliverWithRetry(webhook, payload, eventType) {
  const retryDelays = [0, 30_000, 300_000]; // 0s, 30s, 5min
  let lastResult = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Wait for retry delay (skip for first attempt)
    if (retryDelays[attempt] > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelays[attempt])
      );
    }

    lastResult = await sendWebhook(
      webhook.url,
      payload,
      webhook.secret,
      eventType
    );

    if (lastResult.success) {
      // Success — reset failure count and update last_triggered_at
      await updateWebhookSuccess(webhook.id);
      return { success: true };
    }

    console.warn(
      `[webhook-dispatch] Attempt ${attempt + 1}/${MAX_RETRIES} failed for ${webhook.url}: ${lastResult.error}`
    );

    // Don't retry on 4xx (client errors) — these won't resolve with retries
    if (lastResult.statusCode && lastResult.statusCode >= 400 && lastResult.statusCode < 500) {
      break;
    }
  }

  // All retries exhausted — increment failure count
  await updateWebhookFailure(webhook.id, webhook.failure_count);

  return {
    success: false,
    error: lastResult?.error || "All retries failed",
  };
}

/**
 * Update webhook on success: reset failure_count, set last_triggered_at
 */
async function updateWebhookSuccess(webhookId) {
  try {
    await supabaseAdmin
      .from("user_webhooks")
      .update({
        failure_count: 0,
        last_triggered_at: new Date().toISOString(),
      })
      .eq("id", webhookId);
  } catch (err) {
    console.error("[webhook-dispatch] Error updating success:", err);
  }
}

/**
 * Update webhook on failure: increment failure_count, auto-disable at threshold
 */
async function updateWebhookFailure(webhookId, currentCount) {
  try {
    const newCount = (currentCount || 0) + 1;
    const updates = { failure_count: newCount };

    // Auto-disable if too many failures
    if (newCount >= MAX_FAILURE_COUNT) {
      updates.is_active = false;
      console.warn(
        `[webhook-dispatch] Webhook ${webhookId} auto-disabled after ${newCount} failures`
      );
    }

    await supabaseAdmin
      .from("user_webhooks")
      .update(updates)
      .eq("id", webhookId);
  } catch (err) {
    console.error("[webhook-dispatch] Error updating failure:", err);
  }
}
