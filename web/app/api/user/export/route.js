import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { protectAuthenticatedRequest } from "@/libs/user-protection";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * RGPD Art. 20 - Right to Data Portability
 *
 * This endpoint allows users to export all their personal data
 * in a machine-readable format (JSON).
 */

export const dynamic = "force-dynamic";

// GET /api/user/export - Export all user data
export async function GET(request) {
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

    const userId = session.user.id;
    const userEmail = session.user.email;

    // SECURITY: Rate limiting for expensive export operation (max 5 exports per hour)
    const protection = await protectAuthenticatedRequest(userId, "/api/user/export", {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });
    if (!protection.allowed) {
      return NextResponse.json(
        { error: protection.message, retryAfter: protection.retryAfter },
        { status: protection.status, headers: { "Retry-After": String(protection.retryAfter || 3600) } }
      );
    }

    // Check format parameter
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    // Collect all user data
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        format: format,
        gdprArticle: "Art. 20 - Right to Data Portability",
        dataController: "SafeScoring",
        contact: "privacy@safescoring.io",
      },
      userData: {},
    };

    // 1. User profile
    const { data: userProfile } = await supabase
      .from("users")
      .select("id, email, name, image, created_at, updated_at, onboarding_completed, user_type, interests, country, plan_type")
      .eq("id", userId)
      .single();

    if (userProfile) {
      // Remove sensitive fields
      const { ...safeProfile } = userProfile;
      exportData.userData.profile = safeProfile;
    }

    // 2. User preferences
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (preferences) {
      exportData.userData.preferences = {
        preferences: preferences.preferences,
        quiz_results: preferences.quiz_results,
        ai_insights: preferences.ai_insights,
        min_preferred_score: preferences.min_preferred_score,
        max_preferred_score: preferences.max_preferred_score,
        preferred_product_types: preferences.preferred_product_types,
        created_at: preferences.created_at,
        updated_at: preferences.updated_at,
      };
    }

    // 3. API keys (excluding sensitive hash)
    const { data: apiKeys } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, tier, rate_limit, is_active, created_at, last_used_at, expires_at")
      .eq("user_id", userId);

    if (apiKeys && apiKeys.length > 0) {
      exportData.userData.apiKeys = apiKeys;

      // 4. API usage (last 30 days, anonymized)
      const keyIds = apiKeys.map(k => k.id);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: apiUsage } = await supabase
        .from("api_usage")
        .select("endpoint, method, status_code, response_time_ms, created_at")
        .in("api_key_id", keyIds)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      // Note: IP and user_agent are intentionally excluded for privacy
      exportData.userData.apiUsage = {
        period: "Last 30 days",
        totalRequests: apiUsage?.length || 0,
        requests: apiUsage || [],
      };
    }

    // 5. Alert subscriptions
    const { data: alerts } = await supabase
      .from("alert_subscriptions")
      .select("type, product_id, threshold, email, created_at")
      .eq("user_id", userId);

    if (alerts && alerts.length > 0) {
      exportData.userData.alertSubscriptions = alerts;
    }

    // 6. Newsletter subscription status
    if (userEmail) {
      const { data: newsletter } = await supabase
        .from("newsletter_subscribers")
        .select("email, status, source, subscribed_at, unsubscribed_at")
        .eq("email", userEmail)
        .single();

      if (newsletter) {
        exportData.userData.newsletter = newsletter;
      }
    }

    // 7. Payment history (summary only - full records retained for legal)
    const { data: payments } = await supabase
      .from("fiat_payments")
      .select("tier, payment_type, amount_eur, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (payments && payments.length > 0) {
      exportData.userData.payments = {
        note: "Full payment records retained for 10 years per legal requirements",
        summary: payments,
      };
    }

    // Add data categories explanation
    exportData.dataCategories = {
      profile: "Your account information",
      preferences: "Your saved preferences and quiz results",
      apiKeys: "Your API keys (without sensitive hashes)",
      apiUsage: "Your API usage history (IP addresses excluded for privacy)",
      alertSubscriptions: "Your alert subscriptions",
      newsletter: "Your newsletter subscription status",
      payments: "Summary of your payment history",
    };

    // Format response based on requested format
    if (format === "csv") {
      // Convert to CSV format (simplified)
      const csvLines = ["Category,Field,Value"];

      const flattenObject = (obj, prefix = "") => {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            flattenObject(value, fullKey);
          } else {
            const safeValue = String(value).replace(/"/g, '""');
            csvLines.push(`"${prefix}","${key}","${safeValue}"`);
          }
        }
      };

      flattenObject(exportData.userData);

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="safescoring-data-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Default: JSON format with download headers
    const jsonString = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="safescoring-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });

  } catch (error) {
    console.error("Error in GET /api/user/export:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Please contact privacy@safescoring.io for manual export",
      },
      { status: 500 }
    );
  }
}

// POST /api/user/export - Request export via email (for large datasets)
export async function POST(request) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(request);
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

  // For now, redirect to GET endpoint
  // In production, this could queue a background job for large exports
  return NextResponse.json({
    message: "Data export requested",
    description: "For immediate download, use GET /api/user/export",
    formats: ["json", "csv"],
    usage: {
      json: "GET /api/user/export?format=json",
      csv: "GET /api/user/export?format=csv",
    },
    gdprInfo: {
      article: "Art. 20 - Right to Data Portability",
      responseTime: "Immediate (or within 30 days for complex requests)",
      contact: "privacy@safescoring.io",
    },
  });
}
