import { NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";
import { checkRateLimit, getClientId, logSuspiciousActivity } from "@/libs/rate-limit";

const resolveTxt = promisify(dns.resolveTxt);

// Token expiration time (30 minutes)
const TOKEN_EXPIRY_MS = 30 * 60 * 1000;

// Minimum time before verification can be attempted (DNS propagation)
const MIN_PROPAGATION_MS = 30 * 1000; // 30 seconds

/**
 * Validate and parse the verification token
 * Token format: ss-{timestamp}-{random}
 */
function validateToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token is required" };
  }

  if (!token.startsWith("ss-")) {
    return { valid: false, error: "Invalid token format" };
  }

  // Parse token parts: ss-{timestamp}-{random}
  const parts = token.split("-");
  if (parts.length < 3) {
    return { valid: false, error: "Invalid token structure" };
  }

  const timestamp = parseInt(parts[1], 10);
  if (isNaN(timestamp)) {
    return { valid: false, error: "Invalid token timestamp" };
  }

  const now = Date.now();
  const tokenAge = now - timestamp;

  // Check if token is expired
  if (tokenAge > TOKEN_EXPIRY_MS) {
    return { valid: false, error: "Token has expired. Please request a new one." };
  }

  // Check if enough time has passed for DNS propagation
  if (tokenAge < MIN_PROPAGATION_MS) {
    const waitTime = Math.ceil((MIN_PROPAGATION_MS - tokenAge) / 1000);
    return {
      valid: false,
      error: `Please wait ${waitTime} seconds for DNS propagation before verifying.`,
    };
  }

  return { valid: true, timestamp, error: null };
}

/**
 * Validate domain format
 */
function validateDomain(domain) {
  if (!domain || typeof domain !== "string") {
    return { valid: false, error: "Domain is required" };
  }

  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  const cleanDomain = domain.toLowerCase().trim();

  if (!domainRegex.test(cleanDomain)) {
    return { valid: false, error: "Invalid domain format" };
  }

  // Block obviously internal domains
  const blockedPatterns = ["localhost", "internal", "local", "corp", "127.0.0.1"];
  if (blockedPatterns.some((p) => cleanDomain.includes(p))) {
    return { valid: false, error: "This domain cannot be verified" };
  }

  return { valid: true, domain: cleanDomain, error: null };
}

/**
 * POST /api/claim/verify-dns
 * Verify that a DNS TXT record contains the verification token
 */
export async function POST(request) {
  // Rate limiting for DNS verification (strict)
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(clientId, "sensitive");

  if (!rateLimit.allowed) {
    logSuspiciousActivity(clientId, "/api/claim/verify-dns", "Rate limit exceeded");
    return NextResponse.json(
      {
        error: "Too many verification attempts. Please try again later.",
        resetIn: Math.ceil(rateLimit.resetIn / 1000),
      },
      { status: 429 }
    );
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { domain, token } = body;

    // Validate domain
    const domainValidation = validateDomain(domain);
    if (!domainValidation.valid) {
      return NextResponse.json(
        { error: domainValidation.error },
        { status: 400 }
      );
    }

    // Validate token (format, expiry, propagation time)
    const tokenValidation = validateToken(token);
    if (!tokenValidation.valid) {
      return NextResponse.json(
        { error: tokenValidation.error },
        { status: 400 }
      );
    }

    const expectedValue = `safescoring-verify=${token}`;

    try {
      // Resolve TXT records for the domain
      const records = await resolveTxt(domain);

      // TXT records come as arrays of strings (chunked), flatten and join them
      const flatRecords = records.map((record) =>
        Array.isArray(record) ? record.join("") : record
      );

      // Check if any TXT record matches our verification value
      const verified = flatRecords.some(
        (record) => record.trim() === expectedValue
      );

      if (verified) {
        return NextResponse.json({
          success: true,
          verified: true,
          domain,
          message: "Domain ownership verified successfully",
        });
      } else {
        return NextResponse.json({
          success: true,
          verified: false,
          domain,
          message: "Verification record not found",
          hint: `Add a TXT record with value: ${expectedValue}`,
          recordsChecked: flatRecords.length,
        });
      }
    } catch (dnsError) {
      // Handle DNS resolution errors
      if (dnsError.code === "ENODATA" || dnsError.code === "ENOTFOUND") {
        return NextResponse.json({
          success: true,
          verified: false,
          domain,
          message: "No TXT records found for this domain",
          hint: "Make sure you added the TXT record and wait a few minutes for DNS propagation",
        });
      }

      console.error("DNS resolution error:", dnsError.code);
      return NextResponse.json(
        { error: "Failed to resolve DNS records" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("DNS verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify DNS record" },
      { status: 500 }
    );
  }
}
