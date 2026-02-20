import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * CSRF Token API
 * Generates secure CSRF tokens for form submissions
 *
 * GET /api/csrf - Get a new CSRF token
 *
 * Token is bound to a session ID stored in a secure, httpOnly cookie
 */

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || "fallback-dev-secret";
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate a secure session ID if not exists
 */
function getOrCreateSessionId() {
  const cookieStore = cookies();
  let sessionId = cookieStore.get("csrf_session")?.value;

  if (!sessionId) {
    sessionId = crypto.randomBytes(32).toString("hex");
  }

  return sessionId;
}

/**
 * Generate a CSRF token bound to session
 */
function generateCsrfToken(sessionId) {
  const timestamp = Date.now();
  const payload = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

export async function GET() {
  try {
    const sessionId = getOrCreateSessionId();
    const token = generateCsrfToken(sessionId);

    const response = NextResponse.json({
      success: true,
      token,
      expiresIn: CSRF_TOKEN_EXPIRY,
    });

    // Set session cookie (httpOnly, secure, SameSite)
    response.cookies.set("csrf_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: CSRF_TOKEN_EXPIRY / 1000, // Convert to seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("CSRF token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
