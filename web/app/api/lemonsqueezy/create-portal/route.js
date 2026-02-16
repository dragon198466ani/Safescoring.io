import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { getCustomerPortalUrl } from "@/libs/lemonsqueezy";
import { supabaseAdmin } from "@/libs/supabase";

/**
 * POST /api/lemonsqueezy/create-portal
 * Returns the LemonSqueezy Customer Portal URL for billing management
 */
export async function POST(req) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.returnUrl || !body.returnUrl.startsWith("/") || body.returnUrl.startsWith("//")) {
      return NextResponse.json(
        { error: "Invalid return URL" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { id } = session.user;

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("lemon_squeezy_customer_id")
      .eq("id", id)
      .single();

    if (!user?.lemon_squeezy_customer_id) {
      return NextResponse.json(
        {
          error:
            "You don't have a billing account yet. Make a purchase first.",
        },
        { status: 400 }
      );
    }

    const portalUrl = await getCustomerPortalUrl(
      user.lemon_squeezy_customer_id
    );

    if (!portalUrl) {
      return NextResponse.json(
        { error: "Failed to get billing portal URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: portalUrl });
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("LemonSqueezy portal error:", e);
    return NextResponse.json({ error: "Failed to create billing portal" }, { status: 500 });
  }
}
