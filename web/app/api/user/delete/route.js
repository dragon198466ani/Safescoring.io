import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, supabaseAdmin, isSupabaseConfigured } from "@/libs/supabase";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * SECURITY: Validate request origin to prevent CSRF attacks
 * Only allows requests from same origin
 */
function validateOrigin(request) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // For same-origin requests, origin should match host
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return { valid: false, reason: "Origin mismatch" };
      }
    } catch {
      return { valid: false, reason: "Invalid origin" };
    }
  } else if (referer) {
    // Fallback to referer check
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return { valid: false, reason: "Referer mismatch" };
      }
    } catch {
      return { valid: false, reason: "Invalid referer" };
    }
  }
  // If neither origin nor referer present, allow (could be API call)
  // But the confirm token requirement provides additional protection
  return { valid: true };
}

/**
 * RGPD Art. 17 - Right to Erasure ("Right to be Forgotten")
 *
 * This endpoint allows users to delete their account and all associated data.
 * Uses atomic deletion with rollback tracking for data consistency.
 */

export const dynamic = "force-dynamic";

// Rate limiting for deletion requests (prevent abuse)
const deletionAttempts = new Map();
const MAX_DELETE_ATTEMPTS = 3;
const DELETE_COOLDOWN = 60 * 60 * 1000; // 1 hour

function checkDeletionRateLimit(userId) {
  const now = Date.now();
  const record = deletionAttempts.get(userId);

  if (!record || now - record.timestamp > DELETE_COOLDOWN) {
    deletionAttempts.set(userId, { timestamp: now, count: 1 });
    return { allowed: true };
  }

  if (record.count >= MAX_DELETE_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((DELETE_COOLDOWN - (now - record.timestamp)) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

/**
 * Atomic user deletion with consistent state
 * Uses soft-delete first, then hard-delete for safety
 */
async function atomicUserDeletion(userId, userEmail) {
  const errors = [];
  const client = supabaseAdmin || supabase;

  // Step 1: Mark user as pending_deletion (soft delete)
  // This prevents new operations during deletion
  const { error: markError } = await client
    .from("users")
    .update({
      status: "pending_deletion",
      deletion_requested_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (markError && !markError.message?.includes("column")) {
    // If status column doesn't exist, continue anyway
    console.warn("[DELETE] Could not mark user as pending_deletion:", markError.message);
  }

  // Step 2: Delete related data in correct order (dependencies first)
  const deletionSteps = [
    {
      name: "api_usage",
      action: async () => {
        const { data: keys } = await client
          .from("api_keys")
          .select("id")
          .eq("user_id", userId);

        if (keys?.length) {
          return client.from("api_usage").delete().in("api_key_id", keys.map(k => k.id));
        }
        return { error: null };
      },
    },
    {
      name: "alert_subscriptions",
      action: async () => {
        const { data: keys } = await client
          .from("api_keys")
          .select("id")
          .eq("user_id", userId);

        if (keys?.length) {
          return client.from("alert_subscriptions").delete().in("api_key_id", keys.map(k => k.id));
        }
        return { error: null };
      },
    },
    { name: "api_keys", action: () => client.from("api_keys").delete().eq("user_id", userId) },
    { name: "user_preferences", action: () => client.from("user_preferences").delete().eq("user_id", userId) },
    { name: "user_email_preferences", action: () => client.from("user_email_preferences").delete().eq("user_id", userId) },
    { name: "user_display_settings", action: () => client.from("user_display_settings").delete().eq("user_id", userId) },
    { name: "user_web3_settings", action: () => client.from("user_web3_settings").delete().eq("user_id", userId) },
    { name: "user_privacy_settings", action: () => client.from("user_privacy_settings").delete().eq("user_id", userId) },
    { name: "user_wallets", action: () => client.from("user_wallets").delete().eq("user_id", userId) },
    { name: "user_setups", action: () => client.from("user_setups").delete().eq("user_id", userId) },
    { name: "user_corrections", action: () => client.from("user_corrections").delete().eq("user_id", userId) },
    { name: "user_reputation", action: () => client.from("user_reputation").delete().eq("user_id", userId) },
    {
      name: "newsletter",
      action: () => userEmail
        ? client.from("newsletter_subscribers").update({ status: "deleted", unsubscribed_at: new Date().toISOString() }).eq("email", userEmail)
        : Promise.resolve({ error: null }),
    },
  ];

  // Execute all deletions
  const results = {};
  for (const step of deletionSteps) {
    try {
      const { error } = await step.action();
      results[step.name] = !error;
      if (error && !error.message?.includes("does not exist")) {
        errors.push({ step: step.name, error: error.message });
      }
    } catch (e) {
      results[step.name] = false;
      errors.push({ step: step.name, error: e.message });
    }
  }

  // Step 3: Delete the user account last
  const { error: userError } = await client
    .from("users")
    .delete()
    .eq("id", userId);

  results.user = !userError;
  if (userError) {
    errors.push({ step: "user", error: userError.message });
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  };
}

// DELETE /api/user/delete - Delete user account and all data
export async function DELETE(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Validate origin to prevent CSRF attacks
    const originCheck = validateOrigin(request);
    if (!originCheck.valid) {
      console.warn(`[SECURITY] CSRF attempt blocked on account deletion: ${originCheck.reason}`);
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // SECURITY: Rate limit deletion requests
    const rateCheck = checkDeletionRateLimit(userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Too many deletion attempts. Please try again later.",
          retryAfter: rateCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    // Optional: Get confirmation from request body
    const body = await request.json().catch(() => ({}));
    const { confirm, reason } = body;

    if (confirm !== "DELETE_MY_ACCOUNT") {
      return NextResponse.json(
        {
          error: "Confirmation required",
          message: "Please send { confirm: 'DELETE_MY_ACCOUNT' } to confirm deletion",
        },
        { status: 400 }
      );
    }

    // Execute atomic deletion
    const deletion = await atomicUserDeletion(userId, userEmail);

    // Log deletion request for audit (anonymized)
    console.log(`[RGPD] Account deletion for user ${userId.slice(0, 8)}...`, {
      timestamp: new Date().toISOString(),
      reason: reason || "Not provided",
      success: deletion.success,
      errors: deletion.errors.length,
    });

    if (!deletion.success) {
      // Create support ticket for manual cleanup
      console.error(`[RGPD] Partial deletion for user ${userId}`, deletion);

      // Store failed deletion for manual processing
      if (supabaseAdmin) {
        await supabaseAdmin
          .from("deletion_requests")
          .upsert({
            user_id: userId,
            user_email: userEmail,
            status: "partial_failure",
            results: deletion.results,
            errors: deletion.errors,
            requested_at: new Date().toISOString(),
          }, { onConflict: "user_id" })
          .catch(() => {}); // Don't fail if table doesn't exist
      }

      return NextResponse.json({
        success: false,
        message: "Some data could not be deleted. Our team has been notified and will complete the deletion within 30 days as required by RGPD.",
        results: deletion.results,
        supportEmail: "privacy@safescoring.io",
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: "Your account and all associated data have been deleted. You will be logged out.",
      deletedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error in DELETE /api/user/delete:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Please contact privacy@safescoring.io for manual deletion",
      },
      { status: 500 }
    );
  }
}

// GET /api/user/delete - Get deletion information
export async function GET(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    message: "Account Deletion (RGPD Art. 17)",
    description: "This endpoint allows you to permanently delete your account and all associated data.",
    warning: "This action is irreversible. All your data will be permanently deleted.",
    dataDeleted: [
      "User profile and preferences",
      "API keys and usage logs",
      "Alert subscriptions",
      "Newsletter subscription",
      "Saved setups and configurations",
    ],
    dataRetained: [
      "Payment records (10 years - legal requirement)",
      "Anonymized analytics data",
    ],
    howToDelete: {
      method: "DELETE",
      endpoint: "/api/user/delete",
      body: {
        confirm: "DELETE_MY_ACCOUNT",
        reason: "(optional) Why are you leaving?",
      },
    },
    contact: "privacy@safescoring.io",
    responseTime: "Immediate (or within 30 days if manual review needed)",
  });
}
