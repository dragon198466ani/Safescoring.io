import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { protectAuthenticatedRequest, sleep } from "@/libs/user-protection";
import { validateRequestOrigin } from "@/libs/security";
import { randomBytes } from "crypto";

/**
 * SECURITY: Validate origin for state-changing requests
 */
function requireValidOrigin(request) {
  const check = validateRequestOrigin(request);
  if (!check.valid) {
    console.warn(`[SECURITY] CSRF attempt blocked on setups/share: ${check.reason}`);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

// POST - Generate a shareable link for a setup
export async function POST(request, { params }) {
  try {
    // SECURITY: Validate origin to prevent CSRF
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check user-level rate limiting
    const isPaid = session.user.hasAccess || false;
    const userProtection = await protectAuthenticatedRequest(
      session.user.id,
      "/api/setups/share",
      { isPaid }
    );

    if (!userProtection.allowed) {
      return NextResponse.json(
        {
          error: userProtection.message,
          reason: userProtection.reason,
          retryAfter: userProtection.retryAfter,
        },
        {
          status: userProtection.status,
          headers: { "Retry-After": String(userProtection.retryAfter || 60) },
        }
      );
    }

    // Apply artificial delay
    if (userProtection.delay > 0) {
      await sleep(userProtection.delay);
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Verify setup belongs to user
    const { data: setup, error: fetchError } = await supabaseAdmin
      .from("user_setups")
      .select("id, user_id, share_token, share_token_expires_at")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (fetchError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    // If already has a share token, check if it's still valid
    if (setup.share_token) {
      const expiresAt = setup.share_token_expires_at ? new Date(setup.share_token_expires_at) : null;
      const isExpired = expiresAt && expiresAt < new Date();

      // If expired, fall through to generate a new token
      if (!isExpired) {
        return NextResponse.json({
          shareToken: setup.share_token,
          shareUrl: `${process.env.NEXTAUTH_URL || 'https://safescoring.io'}/stack/share/${setup.share_token}`,
          expiresAt: setup.share_token_expires_at,
        });
      }
    }

    // Generate a unique share token (URL-safe)
    const shareToken = randomBytes(16).toString("base64url");

    // SECURITY: Set token expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // SECURITY: Update setup with share token - include user_id to prevent TOCTOU race condition
    const { error: updateError } = await supabaseAdmin
      .from("user_setups")
      .update({
        share_token: shareToken,
        share_token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (updateError) {
      console.error("Error updating setup with share token:", updateError);
      return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
    }

    const shareUrl = `${process.env.NEXTAUTH_URL || 'https://safescoring.io'}/stack/share/${shareToken}`;

    return NextResponse.json({
      shareToken,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Share setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Revoke share link
export async function DELETE(request, { params }) {
  try {
    // SECURITY: Validate origin to prevent CSRF
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Verify setup belongs to user and remove share token
    const { error } = await supabaseAdmin
      .from("user_setups")
      .update({ share_token: null })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error revoking share token:", error);
      return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke share error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
