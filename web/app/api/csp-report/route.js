/**
 * CSP Violation Report Endpoint
 * Receives Content-Security-Policy violation reports
 *
 * This endpoint collects CSP violations for security monitoring
 * and helps identify XSS attempts or misconfigured CSP rules.
 */

import { NextResponse } from "next/server";
import { logSecurityEvent, SECURITY_EVENTS, SEVERITY } from "@/libs/brute-force-protection";

// Rate limiting for CSP reports (in-memory, simple)
const reportCounts = new Map();
const REPORT_LIMIT = 100; // Max reports per IP per minute
const REPORT_WINDOW = 60000; // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  const key = `csp:${ip}`;
  const record = reportCounts.get(key);

  if (!record || now - record.timestamp > REPORT_WINDOW) {
    reportCounts.set(key, { timestamp: now, count: 1 });
    return false;
  }

  if (record.count >= REPORT_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of reportCounts.entries()) {
    if (now - record.timestamp > REPORT_WINDOW * 2) {
      reportCounts.delete(key);
    }
  }
}, REPORT_WINDOW);

export async function POST(request) {
  try {
    // Get client IP
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Rate limit check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many reports" },
        { status: 429 }
      );
    }

    // Parse the CSP report
    const contentType = request.headers.get("content-type") || "";
    let report;

    if (contentType.includes("application/csp-report")) {
      // Standard CSP report format
      const body = await request.json();
      report = body["csp-report"] || body;
    } else if (contentType.includes("application/json")) {
      // Report-To format
      const body = await request.json();
      if (Array.isArray(body)) {
        // Handle batched reports
        for (const r of body.slice(0, 10)) {
          await processReport(r.body || r, ip, request);
        }
        return NextResponse.json({ received: body.length });
      }
      report = body.body || body;
    } else {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Process the report
    await processReport(report, ip, request);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[CSP-REPORT] Error processing report:", error);
    return NextResponse.json(
      { error: "Failed to process report" },
      { status: 500 }
    );
  }
}

async function processReport(report, ip, request) {
  // Extract relevant fields from CSP report
  const {
    "document-uri": documentUri,
    "violated-directive": violatedDirective,
    "blocked-uri": blockedUri,
    "source-file": sourceFile,
    "line-number": lineNumber,
    "column-number": columnNumber,
    "original-policy": originalPolicy,
    disposition,
    referrer,
  } = report;

  // Determine severity based on the violation type
  let severity = SEVERITY.LOW;
  let eventType = "CSP_VIOLATION";

  // script-src violations are more serious (potential XSS)
  if (violatedDirective?.includes("script-src")) {
    severity = SEVERITY.HIGH;
    eventType = SECURITY_EVENTS.XSS_ATTEMPT;
  }

  // Inline violations from external sources are suspicious
  if (blockedUri && !blockedUri.startsWith("inline") && !blockedUri.startsWith("eval")) {
    severity = SEVERITY.MEDIUM;
  }

  // Log the security event
  await logSecurityEvent({
    eventType,
    severity,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
    details: {
      documentUri,
      violatedDirective,
      blockedUri,
      sourceFile,
      lineNumber,
      columnNumber,
      disposition,
      referrer,
      // Don't log full policy - too verbose
      policySnippet: originalPolicy?.slice(0, 200),
    },
  });

  // Log to console for immediate visibility in development
  if (process.env.NODE_ENV === "development") {
    console.warn("[CSP-REPORT]", {
      directive: violatedDirective,
      blocked: blockedUri,
      source: sourceFile,
      line: lineNumber,
    });
  }
}

// Also handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
