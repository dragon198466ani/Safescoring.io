import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { validateUrl } from "@/libs/url-validator";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * Single Alert Rule CRUD
 *
 * GET    /api/user/alerts/[id] - Get alert rule by ID
 * PUT    /api/user/alerts/[id] - Update alert rule
 * DELETE /api/user/alerts/[id] - Delete alert rule
 */

const VALID_CONDITION_TYPES = [
  "score_change",
  "score_below",
  "score_above",
  "pillar_below",
  "incident_detected",
];

const VALID_PILLARS = ["S", "A", "F", "E"];
const VALID_CHANNELS = ["email", "telegram", "webhook"];
const MAX_CONDITIONS = 10;
const MAX_NAME_LENGTH = 120;
const MAX_WEBHOOK_URL_LENGTH = 2000;

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on alert-rules/[id]: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

/**
 * Validate a single condition object
 */
function validateCondition(condition, index) {
  if (!condition || typeof condition !== "object") {
    return `conditions[${index}]: must be an object`;
  }

  if (!VALID_CONDITION_TYPES.includes(condition.type)) {
    return `conditions[${index}].type: must be one of ${VALID_CONDITION_TYPES.join(", ")}`;
  }

  if (condition.product_slug !== null && condition.product_slug !== undefined) {
    if (typeof condition.product_slug !== "string" || condition.product_slug.length > 100) {
      return `conditions[${index}].product_slug: must be a string (max 100 chars) or null`;
    }
  }

  if (condition.pillar !== null && condition.pillar !== undefined) {
    if (!VALID_PILLARS.includes(condition.pillar)) {
      return `conditions[${index}].pillar: must be one of ${VALID_PILLARS.join(", ")} or null`;
    }
  }

  if (condition.type === "pillar_below" && !condition.pillar) {
    return `conditions[${index}]: pillar_below condition requires a pillar (S, A, F, or E)`;
  }

  if (condition.type !== "incident_detected") {
    if (typeof condition.threshold !== "number" || condition.threshold < 0 || condition.threshold > 100) {
      return `conditions[${index}].threshold: must be a number between 0 and 100`;
    }
  }

  return null;
}

/**
 * Validate UUID format
 */
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * GET - Get a single alert rule by ID
 */
export async function GET(request, { params }) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { id } = await params;

  if (!id || !isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid alert rule ID" }, { status: 400 });
  }

  try {
    const { data: rule, error } = await supabase
      .from("alert_rules")
      .select(`
        id,
        name,
        enabled,
        conditions,
        channels,
        webhook_url,
        cooldown_minutes,
        last_triggered_at,
        trigger_count,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching alert rule:", error);
      return NextResponse.json({ error: "Failed to fetch alert rule" }, { status: 500 });
    }

    if (!rule) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }

    return NextResponse.json({
      rule: {
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        conditions: rule.conditions,
        channels: rule.channels,
        webhookUrl: rule.webhook_url ? "***" : null,
        cooldownMinutes: rule.cooldown_minutes,
        lastTriggeredAt: rule.last_triggered_at,
        triggerCount: rule.trigger_count || 0,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in alert rule GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT - Update an alert rule
 */
export async function PUT(request, { params }) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  // SECURITY: Validate origin to prevent CSRF
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { id } = await params;

  if (!id || !isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid alert rule ID" }, { status: 400 });
  }

  try {
    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("alert_rules")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error verifying alert rule ownership:", fetchError);
      return NextResponse.json({ error: "Failed to verify alert rule" }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates = {};

    // --- Name ---
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Name must be a non-empty string" }, { status: 400 });
      }
      if (body.name.length > MAX_NAME_LENGTH) {
        return NextResponse.json(
          { error: `Name too long (max ${MAX_NAME_LENGTH} characters)` },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    // --- Enabled ---
    if (body.enabled !== undefined) {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
      }
      updates.enabled = body.enabled;
    }

    // --- Conditions ---
    if (body.conditions !== undefined) {
      if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
        return NextResponse.json(
          { error: "At least one condition is required" },
          { status: 400 }
        );
      }
      if (body.conditions.length > MAX_CONDITIONS) {
        return NextResponse.json(
          { error: `Too many conditions (max ${MAX_CONDITIONS})` },
          { status: 400 }
        );
      }
      for (let i = 0; i < body.conditions.length; i++) {
        const err = validateCondition(body.conditions[i], i);
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 });
        }
      }
      updates.conditions = body.conditions.map((c) => ({
        type: c.type,
        product_slug: c.product_slug || null,
        pillar: c.pillar || null,
        threshold: c.type !== "incident_detected" ? Number(c.threshold) : null,
      }));
    }

    // --- Channels ---
    if (body.channels !== undefined) {
      if (!Array.isArray(body.channels) || body.channels.length === 0) {
        return NextResponse.json(
          { error: "At least one notification channel is required" },
          { status: 400 }
        );
      }
      for (const ch of body.channels) {
        if (!VALID_CHANNELS.includes(ch)) {
          return NextResponse.json(
            { error: `Invalid channel: ${ch}. Valid: ${VALID_CHANNELS.join(", ")}` },
            { status: 400 }
          );
        }
      }
      updates.channels = body.channels;
    }

    // --- Webhook URL ---
    const effectiveChannels = updates.channels || body.channels;
    if (body.webhookUrl !== undefined) {
      if (body.webhookUrl && effectiveChannels?.includes("webhook")) {
        if (body.webhookUrl.length > MAX_WEBHOOK_URL_LENGTH) {
          return NextResponse.json({ error: "Webhook URL too long" }, { status: 400 });
        }
        const urlValidation = validateUrl(body.webhookUrl, { allowHttp: true });
        if (!urlValidation.valid) {
          return NextResponse.json(
            { error: `Invalid webhook URL: ${urlValidation.error}` },
            { status: 400 }
          );
        }
        updates.webhook_url = body.webhookUrl;
      } else {
        updates.webhook_url = null;
      }
    }

    // --- Cooldown ---
    if (body.cooldownMinutes !== undefined) {
      updates.cooldown_minutes = Math.max(5, Math.min(1440, Number(body.cooldownMinutes) || 60));
    }

    // Nothing to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("alert_rules")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("id, updated_at")
      .single();

    if (error) {
      console.error("Error updating alert rule:", error);
      return NextResponse.json({ error: "Failed to update alert rule" }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      updatedAt: data.updated_at,
      message: "Alert rule updated successfully",
    });
  } catch (error) {
    console.error("Error in alert rule PUT:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE - Delete an alert rule
 */
export async function DELETE(request, { params }) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  // SECURITY: Validate origin to prevent CSRF
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { id } = await params;

  if (!id || !isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid alert rule ID" }, { status: 400 });
  }

  try {
    // Delete rule (only if owned by user)
    const { error } = await supabase
      .from("alert_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting alert rule:", error);
      return NextResponse.json({ error: "Failed to delete alert rule" }, { status: 500 });
    }

    return NextResponse.json({ message: "Alert rule deleted successfully" });
  } catch (error) {
    console.error("Error in alert rule DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
