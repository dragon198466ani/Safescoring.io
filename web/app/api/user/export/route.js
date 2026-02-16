import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/export — GDPR Article 20 Data Portability
 * Returns all personal data in JSON format for the authenticated user
 */
export async function GET(request) {
  const protection = await quickProtect(request, "standard");
  if (protection.blocked) return protection.response;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const userId = session.user.id;

    // Fetch all user data in parallel
    const [
      userResult,
      viewsResult,
      favoritesResult,
      setupsResult,
      correctionsResult,
      emailLogResult,
    ] = await Promise.allSettled([
      supabaseAdmin
        .from("users")
        .select("id, email, name, created_at, plan_type, user_type, interests, onboarding_completed, referral_code, referral_count, referred_by")
        .eq("id", userId)
        .single(),
      supabaseAdmin
        .from("product_views")
        .select("product_id, month_year, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("favorites")
        .select("product_id, created_at")
        .eq("user_id", userId),
      supabaseAdmin
        .from("setups")
        .select("id, name, description, products, created_at, updated_at")
        .eq("user_id", userId),
      supabaseAdmin
        .from("corrections")
        .select("product_id, field, value, status, created_at")
        .eq("user_id", userId),
      supabaseAdmin
        .from("email_log")
        .select("email_type, sent_at")
        .eq("user_id", userId),
    ]);

    const exportData = {
      _metadata: {
        exported_at: new Date().toISOString(),
        format: "JSON",
        gdpr_article: "Article 20 - Right to Data Portability",
        service: "SafeScoring",
      },
      profile: userResult.status === "fulfilled" ? userResult.value.data : null,
      product_views: viewsResult.status === "fulfilled" ? viewsResult.value.data : [],
      favorites: favoritesResult.status === "fulfilled" ? favoritesResult.value.data : [],
      setups: setupsResult.status === "fulfilled" ? setupsResult.value.data : [],
      corrections: correctionsResult.status === "fulfilled" ? correctionsResult.value.data : [],
      email_history: emailLogResult.status === "fulfilled" ? emailLogResult.value.data : [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="safescoring-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
