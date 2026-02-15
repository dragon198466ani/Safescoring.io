/**
 * Webhook Idempotency Helper
 *
 * Prevents duplicate webhook processing across multiple server instances.
 * Uses Supabase (DB-backed) when available, falls back to in-memory Map.
 *
 * DB table required:
 * CREATE TABLE IF NOT EXISTS webhook_events (
 *   event_id TEXT PRIMARY KEY,
 *   source TEXT NOT NULL,           -- 'lemonsqueezy' | 'moonpay'
 *   processed_at TIMESTAMPTZ DEFAULT NOW(),
 *   event_type TEXT
 * );
 * -- Auto-cleanup: add a cron/pg_cron to delete rows older than 48h
 */

import { supabaseAdmin } from "@/libs/supabase";

// In-memory fallback (single-instance only)
const memoryStore = new Map();
const EVENT_TTL = 48 * 60 * 60 * 1000; // 48 hours

// Cleanup in-memory store every hour
setInterval(() => {
  const cutoff = Date.now() - EVENT_TTL;
  for (const [id, timestamp] of memoryStore.entries()) {
    if (timestamp < cutoff) memoryStore.delete(id);
  }
}, 60 * 60 * 1000);

/**
 * Check if a webhook event has already been processed.
 * If not, marks it as processed and returns false.
 * If already processed, returns true (skip this event).
 *
 * @param {string} eventId — Unique event ID from the payment provider
 * @param {string} source — 'lemonsqueezy' | 'moonpay'
 * @param {string} [eventType] — Optional event type for logging
 * @returns {Promise<boolean>} true if duplicate (already processed)
 */
export async function isDuplicateWebhookEvent(eventId, source, eventType) {
  if (!eventId) return false;

  // Try DB-backed check first
  if (supabaseAdmin) {
    try {
      // Attempt to insert — if it already exists, the primary key constraint will fail
      const { error } = await supabaseAdmin
        .from("webhook_events")
        .insert({
          event_id: eventId,
          source,
          event_type: eventType || null,
        });

      if (error) {
        // Duplicate key = already processed
        if (error.code === "23505") {
          return true;
        }
        // Other DB error — fall through to memory
        console.warn("[WEBHOOK-IDEMPOTENCY] DB error, using memory fallback:", error.message);
      } else {
        // Successfully inserted = first time seeing this event
        return false;
      }
    } catch (e) {
      console.warn("[WEBHOOK-IDEMPOTENCY] DB unavailable, using memory fallback:", e.message);
    }
  }

  // In-memory fallback
  if (memoryStore.has(eventId)) {
    return true;
  }
  memoryStore.set(eventId, Date.now());
  return false;
}
