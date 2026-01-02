import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";

/**
 * GET /api/access/check
 * Check unified access for current user
 * Query params:
 *   - requiredPlan: minimum plan required (optional)
 *   - wallet: wallet address to check (optional, uses linked wallet if not provided)
 */
export async function GET(req) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);

    const requiredPlan = searchParams.get("requiredPlan") || "free";
    const walletAddress = searchParams.get("wallet");

    if (!session?.user?.id && !walletAddress) {
      return NextResponse.json({
        hasAccess: false,
        plan: "free",
        message: "Not authenticated",
      });
    }

    const access = await checkUnifiedAccess({
      userId: session?.user?.id,
      walletAddress,
      requiredPlan,
    });

    const limits = getPlanLimits(access.plan);

    return NextResponse.json({
      ...access,
      limits,
    });
  } catch (error) {
    console.error("Access check error:", error);
    return NextResponse.json(
      { error: "Failed to check access" },
      { status: 500 }
    );
  }
}
