import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { checkFeatureAccess, trackFeatureUsage, getUserUsageSummary } from "@/libs/feature-gating";
import { applyUserRateLimit } from "@/libs/rate-limiters";

/**
 * POST /api/user/feature-access
 * Check if user can access a specific feature
 */
export async function POST(req) {
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

    const { feature, ...options } = await req.json();

    if (!feature) {
      return NextResponse.json({ error: "Feature is required" }, { status: 400 });
    }

    const result = await checkFeatureAccess(session.user.id, feature, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Feature access check error:", error);
    return NextResponse.json(
      { error: "Failed to check feature access" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/feature-access
 * Get user's usage summary
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

    const summary = await getUserUsageSummary(session.user.id);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Usage summary error:", error);
    return NextResponse.json(
      { error: "Failed to get usage summary" },
      { status: 500 }
    );
  }
}
