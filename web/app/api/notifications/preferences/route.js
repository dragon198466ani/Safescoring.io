import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

// GET /api/notifications/preferences
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(getDefaultPreferences());
    }

    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return NextResponse.json(data || getDefaultPreferences());
  } catch (error) {
    console.error("Preferences GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/notifications/preferences
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const body = await request.json();

    const allowed = [
      "email_score_changes",
      "email_security_incidents",
      "email_weekly_digest",
      "email_monthly_report",
      "alert_frequency",
      "min_score_change",
    ];

    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // Validate alert_frequency
    if (updates.alert_frequency && !["immediate", "daily", "weekly"].includes(updates.alert_frequency)) {
      return NextResponse.json({ error: "Invalid alert_frequency" }, { status: 400 });
    }

    // Validate min_score_change
    if (updates.min_score_change !== undefined) {
      updates.min_score_change = Math.max(1, Math.min(50, parseInt(updates.min_score_change) || 5));
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .upsert(
        { user_id: session.user.id, ...updates },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Preferences PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getDefaultPreferences() {
  return {
    email_score_changes: true,
    email_security_incidents: true,
    email_weekly_digest: true,
    email_monthly_report: true,
    alert_frequency: "immediate",
    min_score_change: 5,
  };
}
