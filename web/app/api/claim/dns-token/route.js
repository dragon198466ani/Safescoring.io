import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * POST /api/claim/dns-token
 * Generate a unique verification token for DNS TXT record verification
 */
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { website } = body;

    if (!website) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      );
    }

    // Extract domain from website URL
    let domain;
    try {
      const url = new URL(
        website.startsWith("http") ? website : `https://${website}`
      );
      domain = url.hostname.replace("www.", "").toLowerCase();
    } catch {
      return NextResponse.json(
        { error: "Invalid website URL" },
        { status: 400 }
      );
    }

    // Generate a unique verification token
    // Format: ss-{timestamp}-{random}
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString("hex");
    const token = `ss-${timestamp}-${random}`;

    return NextResponse.json({
      success: true,
      domain,
      token,
      txtRecord: `safescoring-verify=${token}`,
      instructions: `Add a TXT record with value: safescoring-verify=${token}`,
    });
  } catch (error) {
    console.error("DNS token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate verification token" },
      { status: 500 }
    );
  }
}
