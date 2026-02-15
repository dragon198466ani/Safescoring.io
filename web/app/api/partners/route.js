import { NextResponse } from "next/server";
import { quickProtect } from "@/libs/api-protection";

export const dynamic = "force-dynamic";

// POST /api/partners - Submit partner application
export async function POST(request) {
  try {
    // Rate limiting
    const protection = await quickProtect(request, "standard");
    if (protection.blocked) {
      return protection.response;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { companyName, website, contactName, email, partnershipType, description } = body;

    // Validate required fields
    if (!companyName || !email || !contactName) {
      return NextResponse.json(
        { error: "Company name, contact name, and email are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Send email via Resend
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "SafeScoring Partners <noreply@safescoring.io>",
          to: "partners@safescoring.io",
          replyTo: email,
          subject: `Partner Application: ${companyName}`,
          html: `
            <h2>New Partner Application</h2>
            <table style="border-collapse: collapse; width: 100%;">
              <tr><td style="padding: 8px; font-weight: bold;">Company:</td><td style="padding: 8px;">${escapeHtml(companyName)}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Website:</td><td style="padding: 8px;">${escapeHtml(website || "N/A")}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Contact:</td><td style="padding: 8px;">${escapeHtml(contactName)}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${escapeHtml(email)}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">${escapeHtml(partnershipType || "Not specified")}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Description:</td><td style="padding: 8px;">${escapeHtml(description || "No description provided")}</td></tr>
            </table>
          `,
        });
      }
    } catch (emailError) {
      // Log but don't fail — we still want to acknowledge receipt
      console.error("Failed to send partner email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Application received. We'll be in touch within 48 hours.",
    });
  } catch (error) {
    console.error("Partners POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
