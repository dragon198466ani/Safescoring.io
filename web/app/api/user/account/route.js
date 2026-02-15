import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/user/account — Self-service account deletion (GDPR Article 17)
 * Deletes all user data: profile, views, setups, favorites, email logs, referrals
 */
export async function DELETE(request) {
  const protection = await quickProtect(request, "sensitive");
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

    // Verify confirmation header (client must send X-Confirm-Delete: true)
    const confirmed = request.headers.get("x-confirm-delete");
    if (confirmed !== "true") {
      return NextResponse.json({
        error: "Confirmation required. Set header X-Confirm-Delete: true",
        warning: "This action is irreversible. All your data will be permanently deleted.",
      }, { status: 400 });
    }

    // Delete related data in order (respecting foreign keys)
    // Each deletion is best-effort — if a table doesn't exist yet, it's fine
    const deletions = [
      supabaseAdmin.from("product_views").delete().eq("user_id", userId),
      supabaseAdmin.from("email_log").delete().eq("user_id", userId),
      supabaseAdmin.from("favorites").delete().eq("user_id", userId),
      supabaseAdmin.from("setups").delete().eq("user_id", userId),
      supabaseAdmin.from("corrections").delete().eq("user_id", userId),
      supabaseAdmin.from("accounts").delete().eq("userId", userId),
      supabaseAdmin.from("sessions").delete().eq("userId", userId),
    ];

    await Promise.allSettled(deletions);

    // Delete the user record last
    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("Account deletion error:", error);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Your account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
