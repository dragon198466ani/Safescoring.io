import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { validateEmail, validateRequestOrigin, isHoneypotTriggered } from "@/libs/security";

export async function POST(req) {
  // Rate limiting
  const protection = await quickProtect(req, "public");
  if (protection.blocked) {
    return protection.response;
  }

  // CSRF protection
  const originCheck = validateRequestOrigin(req);
  if (!originCheck.valid) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    // Honeypot detection
    if (isHoneypotTriggered(body, "website_url")) {
      return NextResponse.json({ success: true });
    }

    const { name, email, company, contactType, message } = body;

    // Validation
    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Name required (2-100 characters)" },
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

    if (!message || message.length < 10 || message.length > 2000) {
      return NextResponse.json(
        { error: "Message required (10-2000 characters)" },
        { status: 400 }
      );
    }

    const validTypes = ["enterprise", "partnership", "support", "other"];
    const safeType = validTypes.includes(contactType) ? contactType : "other";

    // Store in leads table
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("leads").insert({
        email: emailValidation.sanitized,
        name: name.substring(0, 100),
        company: company?.substring(0, 100) || null,
        contact_type: safeType,
        message: message.substring(0, 2000),
      });

      if (error) {
        console.error("Failed to store contact:", error);
      }
    }

    // Send notifications
    await sendContactNotification({
      name: name.substring(0, 100),
      email: emailValidation.sanitized,
      company: company?.substring(0, 100) || "N/A",
      type: safeType,
      message: message.substring(0, 500),
    });

    return NextResponse.json({
      success: true,
      message: "Message received! We'll get back to you within 24 hours.",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

async function sendContactNotification(data) {
  // Discord webhook
  const discordWebhook = process.env.DISCORD_AUDIT_WEBHOOK;
  if (discordWebhook) {
    try {
      await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "New Contact Form Submission",
              color: 0x10b981,
              fields: [
                { name: "Name", value: data.name, inline: true },
                { name: "Email", value: data.email, inline: true },
                { name: "Company", value: data.company, inline: true },
                { name: "Type", value: data.type, inline: true },
                { name: "Message", value: data.message, inline: false },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
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
          text: `New Contact: ${data.name} (${data.type})`,
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "New Contact Form Submission" },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Name:*\n${data.name}` },
                { type: "mrkdwn", text: `*Email:*\n${data.email}` },
                { type: "mrkdwn", text: `*Company:*\n${data.company}` },
                { type: "mrkdwn", text: `*Type:*\n${data.type}` },
              ],
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Message:*\n${data.message}`,
              },
            },
          ],
        }),
      });
    } catch (e) {
      console.error("Failed to send Slack notification:", e);
    }
  }
}
