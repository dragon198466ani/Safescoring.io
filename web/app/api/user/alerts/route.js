import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { validateUrl } from "@/libs/url-validator";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * Alert Rules Engine — CRUD for multi-condition alert rules
 *
 * GET  - List user's alert rules (requires auth)
 * POST - Create new alert rule (requires auth, paid plan)
 *
 * Alert rule schema:
 *   name: string
 *   enabled: boolean
 *   conditions: [{ type, product_slug, pillar, threshold }]  (AND logic)
 *   channels: ["email", "telegram", "webhook"]
 *   webhook_url: string | null
 *   cooldown_minutes: number (default 60)
 */

// Limits per plan
const ALERT_RULE_LIMITS = {
  free: 0,
  explorer: 5,
  professional: 20,
  enterprise: -1, // unlimited
};

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
    console.warn(`[SECURITY] CSRF attempt blocked on alert-rules: ${check.reason}`);
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

  // pillar_below requires a pillar
  if (condition.type === "pillar_below" && !condition.pillar) {
    return `conditions[${index}]: pillar_below condition requires a pillar (S, A, F, or E)`;
  }

  // score_change, score_below, score_above, pillar_below require a threshold
  if (condition.type !== "incident_detected") {
    if (typeof condition.threshold !== "number" || condition.threshold < 0 || condition.threshold > 100) {
      return `conditions[${index}].threshold: must be a number between 0 and 100`;
    }
  }

  return null;
}

/**
 * GET - List user's alert rules
 */
export async function GET(request) {
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

  try {
    const { data: rules, error } = await supabase
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
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching alert rules:", error);
      return NextResponse.json({ error: "Failed to fetch alert rules" }, { status: 500 });
    }

    // Get plan limits
    const access = await checkUnifiedAccess({ userId: session.user.id });
    const planLimit = ALERT_RULE_LIMITS[access.plan] ?? ALERT_RULE_LIMITS.free;

    return NextResponse.json({
      rules: (rules || []).map((r) => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
        conditions: r.conditions,
        channels: r.channels,
        webhookUrl: r.webhook_url ? "***" : null, // Hide full URL for security
        cooldownMinutes: r.cooldown_minutes,
        lastTriggeredAt: r.last_triggered_at,
        triggerCount: r.trigger_count || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      count: (rules || []).length,
      limit: planLimit,
      canCreate: planLimit === -1 || (rules || []).length < planLimit,
    });
  } catch (error) {
    console.error("Error in alert rules GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new alert rule
 */
export async function POST(request) {
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

  // Check if user's plan has alerts access (paid feature)
  const access = await checkUnifiedAccess({ userId: session.user.id });
  const limits = getPlanLimits(access.plan);

  if (!limits.alerts) {
    return NextResponse.json(
      { error: "Alert rules require a paid plan (Explorer or higher)", upgrade: true },
      { status: 403 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      name,
      conditions,
      channels = ["email"],
      webhookUrl = null,
      cooldownMinutes = 60,
    } = body;

    // --- Validate name ---
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Alert rule name is required" }, { status: 400 });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Name too long (max ${MAX_NAME_LENGTH} characters)` },
        { status: 400 }
      );
    }

    // --- Validate conditions ---
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return NextResponse.json(
        { error: "At least one condition is required" },
        { status: 400 }
      );
    }
    if (conditions.length > MAX_CONDITIONS) {
      return NextResponse.json(
        { error: `Too many conditions (max ${MAX_CONDITIONS})` },
        { status: 400 }
      );
    }
    for (let i = 0; i < conditions.length; i++) {
      const err = validateCondition(conditions[i], i);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }

    // --- Validate channels ---
    if (!Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json(
        { error: "At least one notification channel is required" },
        { status: 400 }
      );
    }
    for (const ch of channels) {
      if (!VALID_CHANNELS.includes(ch)) {
        return NextResponse.json(
          { error: `Invalid channel: ${ch}. Valid: ${VALID_CHANNELS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // --- Validate webhook URL if webhook channel selected ---
    if (channels.includes("webhook")) {
      if (!webhookUrl) {
        return NextResponse.json(
          { error: "webhook_url is required when webhook channel is selected" },
          { status: 400 }
        );
      }
      if (webhookUrl.length > MAX_WEBHOOK_URL_LENGTH) {
        return NextResponse.json({ error: "Webhook URL too long" }, { status: 400 });
      }
      // SECURITY: Validate webhook URL to prevent SSRF attacks
      const urlValidation = validateUrl(webhookUrl, { allowHttp: true });
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: `Invalid webhook URL: ${urlValidation.error}` },
          { status: 400 }
        );
      }
    }

    // --- Validate cooldown ---
    const cooldown = Math.max(5, Math.min(1440, Number(cooldownMinutes) || 60));

    // --- Check plan limit on number of rules ---
    const planLimit = ALERT_RULE_LIMITS[access.plan] ?? ALERT_RULE_LIMITS.free;
    if (planLimit !== -1) {
      const { count: currentCount } = await supabase
        .from("alert_rules")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      if (currentCount >= planLimit) {
        return NextResponse.json(
          {
            error: `Alert rule limit reached (${planLimit}). Upgrade your plan for more.`,
            upgrade: true,
            limit: planLimit,
          },
          { status: 403 }
        );
      }
    }

    // --- Sanitize conditions (only keep known fields) ---
    const sanitizedConditions = conditions.map((c) => ({
      type: c.type,
      product_slug: c.product_slug || null,
      pillar: c.pillar || null,
      threshold: c.type !== "incident_detected" ? Number(c.threshold) : null,
    }));

    // --- Insert ---
    const { data, error } = await supabase
      .from("alert_rules")
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        enabled: true,
        conditions: sanitizedConditions,
        channels,
        webhook_url: channels.includes("webhook") ? webhookUrl : null,
        cooldown_minutes: cooldown,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error creating alert rule:", error);
      return NextResponse.json({ error: "Failed to create alert rule" }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: data.id,
        createdAt: data.created_at,
        message: "Alert rule created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in alert rules POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
