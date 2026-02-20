import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { getDaysUntilExpiry } from "@/libs/crypto-retention";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Check if user needs to renew crypto subscription
 * GET /api/crypto/renewal
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ needsRenewal: false });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's crypto subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, payment_method, current_period_end, status")
      .eq("user_id", session.user.id)
      .eq("payment_method", "crypto")
      .eq("status", "active")
      .single();

    if (!subscription) {
      return NextResponse.json({ needsRenewal: false });
    }

    const daysLeft = await getDaysUntilExpiry(session.user.id);

    // Show renewal banner if 14 days or less
    if (daysLeft !== null && daysLeft <= 14) {
      return NextResponse.json({
        needsRenewal: true,
        daysLeft,
        plan: subscription.plan_type,
        expiresAt: subscription.current_period_end,
      });
    }

    return NextResponse.json({ needsRenewal: false });
  } catch (error) {
    console.error("Renewal check error:", error);
    return NextResponse.json({ needsRenewal: false });
  }
}
