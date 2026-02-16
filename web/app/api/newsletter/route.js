import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { sendEmail } from "@/libs/resend";
import { quickProtect } from "@/libs/api-protection";
import { newsletterSchema, validateBody } from "@/libs/validations";
import config from "@/config";

// Generate HMAC token for a given email + purpose (unsubscribe, confirm, etc.)
function generateToken(email, purpose = "unsubscribe") {
  const crypto = require("crypto");
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto
    .createHmac("sha256", secret)
    .update(`${purpose}:${email.toLowerCase().trim()}`)
    .digest("hex");
}

// Legacy unsubscribe token (backwards-compatible)
function generateUnsubscribeToken(email) {
  const crypto = require("crypto");
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto
    .createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex");
}

// Build a complete unsubscribe URL with token
function getUnsubscribeUrl(email) {
  const token = generateUnsubscribeToken(email);
  if (!token) return `https://${config.domainName}/api/newsletter?email=${encodeURIComponent(email)}`;
  return `https://${config.domainName}/api/newsletter?email=${encodeURIComponent(email)}&token=${token}`;
}

// Build a confirmation URL for double opt-in
function getConfirmUrl(email) {
  const token = generateToken(email, "confirm");
  if (!token) return null;
  return `https://${config.domainName}/api/newsletter/confirm?email=${encodeURIComponent(email)}&token=${token}`;
}

/**
 * Newsletter Subscription API
 * POST /api/newsletter
 */

export async function POST(request) {
  // Rate limit to prevent abuse
  const protection = await quickProtect(request, "sensitive");
  if (protection.blocked) return protection.response;

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
        // Already active — generic message (prevent enumeration)
        return NextResponse.json({ success: true, message: "Please check your email to confirm your subscription" });
      }
      if (existing.status === "unsubscribed") {
        // Previously unsubscribed — reset to pending, resend confirmation
        await supabase
          .from("newsletter_subscribers")
          .update({ status: "pending", resubscribed_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      // If pending, resend confirmation below
    } else {
      // Insert new subscriber as pending (double opt-in)
      const { error } = await supabase.from("newsletter_subscribers").insert({
        email: normalizedEmail,
        source,
        status: "pending",
        subscribed_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Newsletter subscription error:", error);
        return NextResponse.json(
          { error: "Failed to subscribe" },
          { status: 500 }
        );
      }
    }

    // Send double opt-in confirmation email
    const confirmUrl = getConfirmUrl(normalizedEmail);
    if (process.env.RESEND_API_KEY && confirmUrl) {
      sendEmail({
        to: normalizedEmail,
        subject: "Confirm your SafeScoring subscription",
        text: `Please confirm your subscription to SafeScoring by clicking this link: ${confirmUrl}`,
        html: `<h2>Confirm your subscription</h2>
          <p>Thank you for your interest in SafeScoring! Please confirm your email address by clicking the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Confirm Subscription</a>
          </p>
          <p style="font-size: 12px; color: #888;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 11px; color: #888;">SafeScoring provides informational content only. Not financial, investment, or security advice. <a href="https://${config.domainName}/tos">Terms</a> | <a href="https://${config.domainName}/privacy-policy">Privacy</a></p>
          <p style="font-size: 10px; color: #ccc;">SafeScoring &middot; Individual entrepreneur &middot; Contact: legal@safescoring.io</p>`,
      }).catch((err) => {
        console.error("Confirmation email failed:", err.message);
      });
    }

    // Always return same generic message (prevents email enumeration)
    return NextResponse.json({
      success: true,
      message: "Please check your email to confirm your subscription",
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
 * Unsubscribe endpoint (GET for email link clicks)
 * GET /api/newsletter?email=xxx&token=xxx
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return new Response("<html><body><h2>Invalid unsubscribe link</h2><p>Please contact support@safescoring.io</p></body></html>", {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Validate token
  const expectedToken = generateUnsubscribeToken(email);
  if (!expectedToken) {
    return new Response("<html><body><h2>Server error</h2></body></html>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  const crypto = require("crypto");
  let tokensMatch = false;
  try {
    tokensMatch = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    tokensMatch = false;
  }
  // Legacy 16-char token support removed for security (prevents partial HMAC bypass)

  if (!tokensMatch) {
    return new Response("<html><body><h2>Invalid or expired unsubscribe link</h2><p>Please contact support@safescoring.io</p></body></html>", {
      status: 403,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (isSupabaseConfigured()) {
    await supabase
      .from("newsletter_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("email", email.toLowerCase().trim());
  }

  return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>You've been unsubscribed</h2><p>You will no longer receive emails from SafeScoring.</p><p><a href="https://${config.domainName}">Back to SafeScoring</a></p></body></html>`, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * Unsubscribe endpoint (API)
 * DELETE /api/newsletter?email=xxx&token=xxx
 */
export async function DELETE(request) {
  // Rate limit to prevent email enumeration / token brute-force
  const protection = await quickProtect(request, "sensitive");
  if (protection.blocked) {
    return protection.response;
  }

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

  // Verify unsubscribe token (simple HMAC-based verification)
  if (!token) {
    return NextResponse.json(
      { error: "Unsubscribe token required" },
      { status: 400 }
    );
  }

  // Validate token matches expected value for this email
  const crypto = await import("crypto");
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("NEXTAUTH_SECRET is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const fullToken = crypto
    .createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex");
  // Legacy 16-char token support removed for security (prevents partial HMAC bypass)

  // Timing-safe comparison — full token only
  let tokensMatch = false;
  try {
    tokensMatch = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(fullToken));
  } catch {
    tokensMatch = false;
  }

  if (!tokensMatch) {
    return NextResponse.json(
      { error: "Invalid unsubscribe token" },
      { status: 403 }
    );
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
