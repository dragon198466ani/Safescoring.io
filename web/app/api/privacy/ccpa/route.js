import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { sendEmail } from "@/libs/resend";
import config from "@/config";

/**
 * CCPA/CPRA Privacy Request API
 *
 * Handles California privacy rights requests:
 * - Do Not Sell My Personal Information
 * - Right to Know
 * - Right to Delete
 * - Right to Correct
 * - Limit Sensitive Data Use
 */

export const dynamic = "force-dynamic";

// Rate limiting for privacy requests (prevent abuse)
const privacyRequestLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_EMAIL = 3; // Max 3 requests per email per hour

function checkPrivacyRateLimit(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = privacyRequestLimits.get(key);

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    privacyRequestLimits.set(key, { timestamp: now, count: 1 });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_EMAIL) {
    return { allowed: false, retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - record.timestamp)) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

// POST - Submit a CCPA request
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, request_type } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Validate request type
    const validTypes = ["do_not_sell", "know", "delete", "correct", "limit"];
    if (!validTypes.includes(request_type)) {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }

    // SECURITY: Rate limiting to prevent abuse
    const rateCheck = checkPrivacyRateLimit(email);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    // Get client info for logging
    const userAgent = request.headers.get("user-agent");

    // Log the request (for compliance audit trail)
    console.log(`[CCPA] Privacy request received`, {
      type: request_type,
      email: email.slice(0, 3) + "***", // Partial email for logs
      timestamp: new Date().toISOString(),
      userAgent: userAgent?.slice(0, 50),
    });

    // Generate verification token
    const crypto = await import("crypto");
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // If Supabase is configured, store the request
    if (isSupabaseConfigured()) {
      const { error: insertError } = await supabase
        .from("privacy_requests")
        .insert({
          email,
          request_type,
          jurisdiction: "CCPA",
          status: "pending_verification", // SECURITY: Requires email verification
          verification_token: verificationToken,
          verification_expires: verificationExpiry.toISOString(),
          submitted_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days
        });

      if (insertError && !insertError.message.includes("does not exist")) {
        console.error("Error storing CCPA request:", insertError);
      }

      // Send verification email
      const verificationUrl = `${config.appUrl}/privacy/verify?token=${verificationToken}&type=${request_type}`;
      const requestTypeLabel = request_type.replace(/_/g, " ");

      try {
        await sendEmail({
          to: email,
          subject: `[SafeScoring] Verify your ${requestTypeLabel} privacy request`,
          text: `
You have submitted a CCPA ${requestTypeLabel} request on SafeScoring.

To verify your identity and process this request, please click the link below:

${verificationUrl}

This link expires in 24 hours.

If you did not make this request, you can safely ignore this email.

---
SafeScoring Privacy Team
privacy@safescoring.io
          `.trim(),
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">Verify Your Privacy Request</h2>
  <p>You have submitted a CCPA <strong>${requestTypeLabel}</strong> request on SafeScoring.</p>
  <p>To verify your identity and process this request, please click the button below:</p>
  <p style="margin: 30px 0;">
    <a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Verify My Request
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
  <p style="color: #666; font-size: 14px;">If you did not make this request, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">
    SafeScoring Privacy Team<br>
    <a href="mailto:privacy@safescoring.io" style="color: #2563eb;">privacy@safescoring.io</a>
  </p>
</body>
</html>
          `.trim(),
        });
        console.log(`[CCPA] Verification email sent to: ${email.slice(0, 3)}***`);
      } catch (emailError) {
        console.error("[CCPA] Failed to send verification email:", emailError.message);
        // Don't fail the request - the token is stored, user can request resend
      }
    }

    return NextResponse.json({
      success: true,
      message: "Privacy request received - verification email sent",
      request_type,
      deadline: "45 days (after verification)",
      confirmation: `A verification email has been sent to ${email.slice(0, 3)}***${email.slice(email.indexOf("@"))}. Please verify your email to process your ${request_type.replace(/_/g, " ")} request. The 45-day deadline starts after verification.`,
      requires_verification: true,
    });

  } catch (error) {
    console.error("Error in CCPA request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get CCPA disclosure information
export async function GET() {
  return NextResponse.json({
    jurisdiction: "California (CCPA/CPRA)",
    data_controller: "SafeScoring",
    contact: "privacy@safescoring.io",
    response_time: "45 days",
    rights: [
      {
        right: "Right to Know",
        description: "Request information about personal data collected",
        code: "know",
      },
      {
        right: "Right to Delete",
        description: "Request deletion of personal information",
        code: "delete",
      },
      {
        right: "Right to Opt-Out",
        description: "Opt-out of sale of personal information",
        code: "do_not_sell",
        note: "We do NOT sell personal information",
      },
      {
        right: "Right to Non-Discrimination",
        description: "Equal service regardless of privacy choices",
        code: "non_discrimination",
      },
      {
        right: "Right to Correct",
        description: "Request correction of inaccurate information",
        code: "correct",
      },
      {
        right: "Right to Limit",
        description: "Limit use of sensitive personal information",
        code: "limit",
      },
    ],
    categories_collected: [
      { category: "Identifiers", examples: "Email, username, wallet address", sold: false },
      { category: "Commercial Information", examples: "Purchase history", sold: false },
      { category: "Internet Activity", examples: "Browsing, API usage", sold: false },
      { category: "Geolocation", examples: "Country only", sold: false },
    ],
    data_sales: false,
    data_sharing: {
      stripe: "Payment processing",
      supabase: "Database hosting",
      vercel: "Website hosting",
    },
  });
}
