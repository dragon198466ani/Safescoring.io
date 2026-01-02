import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Newsletter Subscription API
 * POST /api/newsletter
 */

export async function POST(request) {
  try {
    const { email, source = "website" } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      // Log to console if no DB
      console.log(`Newsletter signup: ${normalizedEmail} from ${source}`);
      return NextResponse.json({ success: true, message: "Subscribed" });
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json(
          { success: true, message: "Already subscribed" }
        );
      }

      // Reactivate if previously unsubscribed
      await supabase
        .from("newsletter_subscribers")
        .update({ status: "active", resubscribed_at: new Date().toISOString() })
        .eq("id", existing.id);

      return NextResponse.json({ success: true, message: "Resubscribed" });
    }

    // Insert new subscriber
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: normalizedEmail,
      source,
      status: "active",
      subscribed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Newsletter subscription error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 500 }
      );
    }

    // TODO: Send welcome email via SendGrid/Resend

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed",
    });
  } catch (error) {
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Unsubscribe endpoint
 * DELETE /api/newsletter?email=xxx
 */
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email) {
    return NextResponse.json(
      { error: "Email required" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  // TODO: Verify unsubscribe token for security

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", email.toLowerCase().trim());

  if (error) {
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Successfully unsubscribed",
  });
}
