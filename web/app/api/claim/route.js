import { NextResponse } from "next/server";
import { sendEmail } from "@/libs/resend";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

/**
 * Escape HTML to prevent XSS in email templates
 */
function escapeHtml(text) {
  if (!text) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Skip verification in development if no secret is set
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY not set, skipping captcha verification");
    return true;
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}

/**
 * POST /api/claim
 * Handle product claim requests from creators
 */
export async function POST(request) {
  // Rate limit: public form submission with email sending
  const protection = await quickProtect(request, "sensitive");
  if (protection.blocked) return protection.response;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      productSlug,
      companyName,
      contactName,
      email,
      website,
      role,
      message,
      discord,
      twitter,
      telegram,
      captchaToken,
      dnsVerified,
      dnsToken,
    } = body;

    // Validation
    if (!companyName || !contactName || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Verify captcha
    if (!captchaToken) {
      return NextResponse.json(
        { error: "Captcha verification required" },
        { status: 400 }
      );
    }

    const captchaValid = await verifyTurnstile(captchaToken);
    if (!captchaValid) {
      return NextResponse.json(
        { error: "Captcha verification failed. Please try again." },
        { status: 400 }
      );
    }

    // Get product info if slug provided
    let productInfo = null;
    if (productSlug && isSupabaseConfigured()) {
      const { data } = await supabase
        .from("products")
        .select("id, name, url, slug")
        .eq("slug", productSlug)
        .maybeSingle();
      productInfo = data;
    }

    // Check if email domain matches website domain (for verification hint)
    const emailDomain = email.split("@")[1]?.toLowerCase();
    const websiteDomain = website
      ? new URL(website.startsWith("http") ? website : `https://${website}`)
          .hostname.replace("www.", "")
          .toLowerCase()
      : null;
    const domainMatch = emailDomain && websiteDomain &&
      (emailDomain === websiteDomain || emailDomain.endsWith(`.${websiteDomain}`));

    // Store claim request in database (optional)
    if (isSupabaseConfigured()) {
      try {
        await supabase.from("claim_requests").insert({
          product_id: productInfo?.id || null,
          product_slug: productSlug || null,
          company_name: companyName,
          contact_name: contactName,
          email: email,
          website: website,
          role: role,
          message: message,
          social_links: {
            discord: discord || null,
            twitter: twitter || null,
            telegram: telegram || null,
          },
          domain_match: domainMatch,
          dns_verified: dnsVerified || false,
          dns_token: dnsToken || null,
          status: dnsVerified ? "dns_verified" : "pending",
          created_at: new Date().toISOString(),
        });
      } catch (dbError) {
        // Table might not exist, continue anyway
        console.log("Could not save to database:", dbError.message);
      }
    }

    // Send notification email to admin
    const adminEmail = process.env.ADMIN_EMAIL || "team@safescoring.io";

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">New Product Claim Request</h2>

        ${dnsVerified ? `
          <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #10b981;">
            <strong style="color: #059669;">DNS Verified</strong><br>
            <span style="font-size: 14px;">Domain ownership confirmed via DNS TXT record</span>
          </div>
        ` : ""}

        ${productInfo ? `
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <strong>Product:</strong> ${escapeHtml(productInfo.name)}<br>
            <strong>Slug:</strong> ${escapeHtml(productInfo.slug)}<br>
            <strong>URL:</strong> ${escapeHtml(productInfo.url) || "N/A"}
          </div>
        ` : productSlug ? `
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <strong>Requested Slug:</strong> ${escapeHtml(productSlug)}<br>
            <em>Product not found in database</em>
          </div>
        ` : ""}

        <h3>Company Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Company Name</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(companyName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Website</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(website) || "N/A"}</td>
          </tr>
        </table>

        <h3>Contact Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Name</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(contactName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
              ${escapeHtml(email)}
              ${domainMatch ?
                '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">Domain Match ✓</span>' :
                '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">Domain Mismatch</span>'
              }
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Role</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(role)}</td>
          </tr>
        </table>

        ${(discord || twitter || telegram) ? `
          <h3>Social Links Provided</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${discord ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Discord</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(discord)}</td></tr>` : ""}
            ${twitter ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Twitter</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(twitter)}</td></tr>` : ""}
            ${telegram ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Telegram</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(telegram)}</td></tr>` : ""}
          </table>
        ` : ""}

        ${message ? `
          <h3>Message</h3>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1;">
            ${escapeHtml(message).replace(/\n/g, "<br>")}
          </div>
        ` : ""}

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Next Steps:</strong><br>
          1. Verify the email domain matches the company website<br>
          2. Check their social media profiles<br>
          3. Reply to confirm or request additional verification
        </p>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          This email was sent from SafeScoring.io claim system
        </p>
      </div>
    `;

    await sendEmail({
      to: adminEmail,
      subject: `[Claim Request] ${escapeHtml(companyName)} - ${escapeHtml(productInfo?.name || productSlug || "New Product")}`,
      text: `New claim request from ${contactName} (${email}) for ${companyName}`,
      html: emailHtml,
      replyTo: email,
    });

    // Send confirmation email to requester
    const confirmationHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Claim Request Received</h2>

        <p>Hi ${escapeHtml(contactName)},</p>

        <p>Thank you for submitting your claim request for <strong>${escapeHtml(companyName)}</strong>.</p>

        <p>Our team will review your request and get back to you within <strong>2-3 business days</strong>.</p>

        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <strong>What happens next?</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>We verify your ownership of the product</li>
            <li>Once verified, you&apos;ll receive a confirmation email</li>
            <li>You&apos;ll be able to update your product listing</li>
          </ul>
        </div>

        <p>If you have any questions, simply reply to this email.</p>

        <p>Best regards,<br>The SafeScoring Team</p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">

        <p style="color: #9ca3af; font-size: 12px;">
          SafeScoring.io — Crypto Security Evaluations<br>
          Evaluations are for informational purposes only. Not financial, investment, or security advice.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Your claim request for ${companyName} has been received`,
      text: `Hi ${contactName}, your claim request for ${companyName} has been received. We'll review it within 2-3 business days.`,
      html: confirmationHtml,
    });

    return NextResponse.json({
      success: true,
      message: "Claim request submitted successfully",
    });

  } catch (error) {
    console.error("Claim API error:", error);
    return NextResponse.json(
      { error: "Failed to submit claim request" },
      { status: 500 }
    );
  }
}
