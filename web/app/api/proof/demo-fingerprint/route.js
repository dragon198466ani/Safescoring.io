import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Demo Fingerprint API
 * Shows visitors how their data is uniquely fingerprinted
 */

const DEMO_SECRET = "demo-fingerprint-v1-public";

const HOMOGLYPHS = {
  a: ["a", "\u0430"],
  e: ["e", "\u0435"],
  o: ["o", "\u043e"],
};

export async function GET(request) {
  const ip = request.headers.get("x-forwarded-for") || "demo";
  const ua = request.headers.get("user-agent") || "unknown";
  const ts = Math.floor(Date.now() / 60000);

  const sessionId = crypto
    .createHmac("sha256", DEMO_SECRET)
    .update(`${ip}:${ua}:${ts}`)
    .digest("hex")
    .substring(0, 16);

  // Score demo
  const originalScore = 87.5;
  const hash = crypto.createHmac("sha256", DEMO_SECRET).update(`s:${sessionId}`).digest("hex");
  const variation = ((parseInt(hash.substring(0, 4), 16) / 65535) - 0.5) * 0.1;
  const fingerprintedScore = Math.round((originalScore + variation) * 10000) / 10000;

  // Text demo
  const originalText = "Ledger Nano X";
  const textHash = crypto.createHmac("sha256", DEMO_SECRET).update(`t:${sessionId}`).digest("hex");
  const chars = [...originalText.toLowerCase()];
  const pos = parseInt(textHash.substring(0, 2), 16) % chars.length;
  if (HOMOGLYPHS[chars[pos]]) {
    chars[pos] = HOMOGLYPHS[chars[pos]][1];
  }
  const fingerprintedText = originalText.split("").map((c, i) =>
    c === c.toUpperCase() ? chars[i].toUpperCase() : chars[i]
  ).join("");

  return NextResponse.json({
    sessionId,
    originalScore,
    fingerprintedScore,
    originalText,
    fingerprintedText,
    modifiedPositions: [pos],
  });
}
