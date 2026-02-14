import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { newsletterSchema, validateBody } from "@/libs/validations";

/**
 * Newsletter Subscription API
 * POST /api/newsletter
 */

export async function POST(request) {
  try {
    // Validate input with Zod
    const validation = await validateBody(request, newsletterSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, source } = validation.data;

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

    // Send welcome email if Resend is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "SafeScoring <noreply@safescoring.io>",
          to: normalizedEmail,
          subject: "Welcome to SafeScoring!",
          html: `<h2>Welcome to SafeScoring!</h2>
            <p>Thank you for subscribing to our newsletter. You'll receive security insights and product updates.</p>
            <p>— The SafeScoring Team</p>`,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }

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

  // Verify unsubscribe token (HMAC-based) if provided
  if (token) {
    const crypto = await import("crypto");
    const secret = process.env.NEXTAUTH_SECRET || "";
    const expectedToken = crypto
      .createHmac("sha256", secret)
      .update(email.toLowerCase().trim())
      .digest("hex")
      .substring(0, 32);
    if (token !== expectedToken) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token" },
        { status: 403 }
      );
    }
  }

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
