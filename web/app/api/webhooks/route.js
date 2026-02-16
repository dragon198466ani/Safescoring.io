import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const MAX_WEBHOOKS = 5;
const VALID_EVENTS = ["score_change", "new_product", "incident_reported"];

// GET /api/webhooks - List user's webhooks
export async function GET(request) {
  try {
    const protection = await quickProtect(request, "standard");
    if (protection.blocked) return protection.response;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Enterprise only
    const planType = (session.user.planType || "free").toLowerCase();
    if (planType !== "enterprise") {
      return NextResponse.json(
        { error: "Webhooks require an Enterprise plan", webhooks: [], planType },
        { status: 200 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { data: webhooks, error } = await supabaseAdmin
      .from("user_webhooks")
      .select("id, url, events, is_active, last_triggered_at, failure_count, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Table might not exist yet
      return NextResponse.json({ webhooks: [], limit: MAX_WEBHOOKS, planType });
    }

    return NextResponse.json({
      webhooks: webhooks || [],
      limit: MAX_WEBHOOKS,
      planType,
    });
  } catch (error) {
    console.error("Webhooks GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request) {
  try {
    const protection = await quickProtect(request, "standard");
    if (protection.blocked) return protection.response;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const planType = (session.user.planType || "free").toLowerCase();
    if (planType !== "enterprise") {
      return NextResponse.json(
        { error: "Webhooks require an Enterprise plan" },
        { status: 403 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { url, events } = body;

    // Validate URL
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Validate events
    const selectedEvents = Array.isArray(events)
      ? events.filter((e) => VALID_EVENTS.includes(e))
      : ["score_change"];

    if (selectedEvents.length === 0) {
      return NextResponse.json({ error: "At least one valid event is required" }, { status: 400 });
    }

    // Check limit
    const { count } = await supabaseAdmin
      .from("user_webhooks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id);

    if (count >= MAX_WEBHOOKS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_WEBHOOKS} webhooks allowed` },
        { status: 403 }
      );
    }

    // Generate webhook secret
    const secret = randomBytes(32).toString("hex");

    const { error } = await supabaseAdmin.from("user_webhooks").insert({
      user_id: session.user.id,
      url,
      secret,
      events: selectedEvents,
      is_active: true,
    });

    if (error) {
      console.error("Webhook insert error:", error);
      return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
    }

    return NextResponse.json({
      secret,
      url,
      events: selectedEvents,
      message: "Save this secret now — it won't be shown again.",
    });
  } catch (error) {
    console.error("Webhooks POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/webhooks - Update a webhook
export async function PATCH(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, is_active, url, events } = body;

    if (!id) {
      return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });
    }

    const updates = {};
    if (typeof is_active === "boolean") updates.is_active = is_active;
    if (url) {
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== "https:") {
          return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
        }
        updates.url = url;
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
    }
    if (Array.isArray(events)) {
      updates.events = events.filter((e) => VALID_EVENTS.includes(e));
    }

    const { error } = await supabaseAdmin
      .from("user_webhooks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhooks PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/webhooks?id=... - Delete a webhook
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("user_webhooks")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhooks DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
