import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { sendEmail } from "@/libs/resend";
import config from "@/config";

/**
 * Newsletter Double Opt-In Confirmation
 * GET /api/newsletter/confirm?email=xxx&token=xxx
 *
 * Validates the HMAC token, activates the subscriber, and sends a welcome email.
 */

function generateToken(email, purpose = "confirm") {
  const crypto = require("crypto");
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto
    .createHmac("sha256", secret)
    .update(`${purpose}:${email.toLowerCase().trim()}`)
    .digest("hex");
}

function generateUnsubscribeToken(email) {
  const crypto = require("crypto");
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto
    .createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex");
}

function getUnsubscribeUrl(email) {
  const token = generateUnsubscribeToken(email);
  if (!token) return `https://${config.domainName}/api/newsletter?email=${encodeURIComponent(email)}`;
  return `https://${config.domainName}/api/newsletter?email=${encodeURIComponent(email)}&token=${token}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2>Invalid confirmation link</h2>
        <p>Please contact <a href="mailto:support@safescoring.io">support@safescoring.io</a></p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // Validate HMAC token
  const expectedToken = generateToken(email, "confirm");
  if (!expectedToken) {
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2>Server configuration error</h2>
      </body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  const crypto = require("crypto");
  let tokensMatch = false;
  try {
    tokensMatch = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    tokensMatch = false;
  }

  if (!tokensMatch) {
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2>Invalid or expired confirmation link</h2>
        <p>Please try subscribing again at <a href="https://${config.domainName}">${config.domainName}</a></p>
      </body></html>`,
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Activate the subscription
  if (isSupabaseConfigured()) {
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!existing) {
      return new Response(
        `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2>Subscription not found</h2>
          <p>Please subscribe again at <a href="https://${config.domainName}">${config.domainName}</a></p>
        </body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    if (existing.status !== "active") {
      await supabase
        .from("newsletter_subscribers")
        .update({
          status: "active",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  }

  // Send welcome email now that subscription is confirmed
  if (process.env.RESEND_API_KEY) {
    sendEmail({
      to: normalizedEmail,
      subject: "Welcome to SafeScoring!",
      text: "Thanks for confirming your subscription to SafeScoring! You'll receive monthly updates on crypto security scores and insights.",
      html: `<h2>Welcome to SafeScoring!</h2>
        <p>Your subscription is now confirmed! You'll receive monthly updates on:</p>
        <ul>
          <li>New product security evaluations</li>
          <li>Security incidents and their impact</li>
          <li>Methodology updates</li>
        </ul>
        <p>Visit <a href="https://${config.domainName}/products">${config.domainName}</a> to explore evaluations.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 11px; color: #888;">SafeScoring provides informational content only. Not financial, investment, or security advice. <a href="https://${config.domainName}/tos">Terms</a> | <a href="https://${config.domainName}/privacy-policy">Privacy</a></p>
        <p style="font-size: 11px; color: #888;"><a href="${getUnsubscribeUrl(normalizedEmail)}">Unsubscribe</a></p>
        <p style="font-size: 10px; color: #ccc;">SafeScoring &middot; Individual entrepreneur &middot; Contact: legal@safescoring.io</p>`,
    }).catch((err) => {
      console.error("Welcome email failed:", err.message);
    });
  }

  return new Response(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2 style="color: #22c55e;">Subscription Confirmed!</h2>
      <p>Thank you for subscribing to SafeScoring. You'll receive monthly updates on crypto security.</p>
      <p style="margin-top: 20px;"><a href="https://${config.domainName}" style="color: #6366f1;">Back to SafeScoring</a></p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
