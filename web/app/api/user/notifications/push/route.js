import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase } from "@/libs/supabase";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * POST /api/user/notifications/push
 * Save push notification subscription
 */
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Store subscription in database
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: session.user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("Push subscription save error:", error);
      // Table might not exist yet - don't fail
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/notifications/push
 * Remove push notification subscription
 */
export async function DELETE(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Push unsubscribe error:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/user/notifications/push
 * Check if user has push subscription
 */
export async function GET(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, created_at")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Push fetch error:", error);
    }

    return NextResponse.json({
      isSubscribed: !!data,
      subscribedAt: data?.created_at || null,
    });
  } catch (error) {
    console.error("Push API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
