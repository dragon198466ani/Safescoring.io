import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateEmail, validateRequestOrigin } from "@/libs/security";
import { quickProtect } from "@/libs/api-protection";

/**
 * DeFi Audit Request API
 *
 * Quick 1k/day revenue model:
 * - Express Audit: $500 (24h turnaround, basic report)
 * - Standard Audit: $1000 (48h turnaround, detailed report)
 * - Premium Audit: $2000 (72h turnaround, detailed + recommendations + badge)
 *
 * This is a lead generation + service sales endpoint.
 */

const AUDIT_TIERS = {
  express: {
    name: "Express Audit",
    price: 500,
    turnaround: "24 hours",
    features: [
      "SAFE score calculation",
      "4-pillar breakdown",
      "Basic PDF report",
      "Email delivery",
    ],
  },
  standard: {
    name: "Standard Audit",
    price: 1000,
    turnaround: "48 hours",
    features: [
      "Everything in Express",
      "Detailed analysis per pillar",
      "Comparison with competitors",
      "Improvement recommendations",
      "Branded PDF report",
    ],
  },
  premium: {
    name: "Premium Audit",
    price: 2000,
    turnaround: "72 hours",
    features: [
      "Everything in Standard",
      "In-depth security review",
      "Code/architecture feedback",
      "SAFE Verified badge (1 year)",
      "Priority listing on SafeScoring",
      "Press release template",
      "30-day support",
    ],
  },
};

export async function GET() {
  // Return available audit tiers
  return NextResponse.json({
    success: true,
    tiers: AUDIT_TIERS,
    contact: "audits@safescoring.io",
    note: "All prices in USD. Payment via crypto or card.",
  });
}

export async function POST(request) {
  // Rate limiting
  const protection = await quickProtect(request, "public");
  if (protection.blocked) {
    return protection.response;
  }

  // CSRF protection
  const originCheck = validateRequestOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      project_name,
      project_url,
      project_type, // defi, wallet, exchange, other
      email,
      tier, // express, standard, premium
      description,
      telegram, // optional
      twitter, // optional
      urgency, // normal, urgent (+20%)
    } = body;

    // Validation
    if (!project_name || project_name.length < 2 || project_name.length > 100) {
      return NextResponse.json(
        { error: "Project name required (2-100 characters)" },
        { status: 400 }
      );
    }

    if (!project_url || !isValidUrl(project_url)) {
      return NextResponse.json(
        { error: "Valid project URL required" },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    if (!tier || !AUDIT_TIERS[tier]) {
      return NextResponse.json(
        { error: "Valid tier required (express, standard, premium)" },
        { status: 400 }
      );
    }

    const selectedTier = AUDIT_TIERS[tier];
    let finalPrice = selectedTier.price;

    // Urgent requests cost 20% more
    if (urgency === "urgent") {
      finalPrice = Math.round(finalPrice * 1.2);
    }

    // Store in database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Log request even without DB
      console.log("AUDIT REQUEST:", {
        project_name,
        project_url,
        email: emailValidation.sanitized,
        tier,
        price: finalPrice,
      });

      return NextResponse.json({
        success: true,
        message: "Audit request received! We'll contact you within 24 hours.",
        reference: `AUDIT-${Date.now()}`,
        tier: selectedTier.name,
        price: finalPrice,
        turnaround: selectedTier.turnaround,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate reference ID
    const reference = `SAFE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Store audit request
    const { data, error } = await supabase
      .from("audit_requests")
      .insert({
        reference,
        project_name,
        project_url,
        project_type: project_type || "other",
        email: emailValidation.sanitized,
        tier,
        price: finalPrice,
        urgency: urgency || "normal",
        description: description?.substring(0, 2000) || null,
        telegram: telegram?.substring(0, 100) || null,
        twitter: twitter?.substring(0, 100) || null,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to store audit request:", error);
      // Don't fail - we can still process manually
    }

    // Send notification (TODO: integrate with Slack/Discord webhook)
    await sendAuditNotification({
      reference,
      project_name,
      project_url,
      email: emailValidation.sanitized,
      tier: selectedTier.name,
      price: finalPrice,
    });

    return NextResponse.json({
      success: true,
      message: "Audit request received! We'll contact you within 24 hours.",
      reference,
      tier: selectedTier.name,
      price: finalPrice,
      currency: "USD",
      turnaround: selectedTier.turnaround,
      features: selectedTier.features,
      next_steps: [
        "You'll receive a confirmation email shortly",
        "Our team will review your project",
        "Payment link will be sent within 24h",
        "Audit begins after payment confirmation",
      ],
    });
  } catch (error) {
    console.error("Audit request error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

/**
 * Validate URL
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Send notification about new audit request
 */
async function sendAuditNotification(data) {
  // Discord webhook
  const discordWebhook = process.env.DISCORD_AUDIT_WEBHOOK;
  if (discordWebhook) {
    try {
      await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "New Audit Request",
            color: 0x3b82f6,
            fields: [
              { name: "Reference", value: data.reference, inline: true },
              { name: "Tier", value: data.tier, inline: true },
              { name: "Price", value: `$${data.price}`, inline: true },
              { name: "Project", value: data.project_name, inline: true },
              { name: "URL", value: data.project_url, inline: false },
              { name: "Email", value: data.email, inline: true },
            ],
            timestamp: new Date().toISOString(),
          }],
        }),
      });
    } catch (e) {
      console.error("Failed to send Discord notification:", e);
    }
  }

  // Slack webhook
  const slackWebhook = process.env.SLACK_AUDIT_WEBHOOK;
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `New Audit Request: ${data.project_name}`,
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "New Audit Request" },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Reference:*\n${data.reference}` },
                { type: "mrkdwn", text: `*Tier:*\n${data.tier}` },
                { type: "mrkdwn", text: `*Price:*\n$${data.price}` },
                { type: "mrkdwn", text: `*Project:*\n${data.project_name}` },
              ],
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: `*URL:* ${data.project_url}\n*Email:* ${data.email}` },
            },
          ],
        }),
      });
    } catch (e) {
      console.error("Failed to send Slack notification:", e);
    }
  }
}
