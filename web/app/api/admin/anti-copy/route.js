import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { isAdminEmail } from "@/libs/admin-auth";
import {
  getSuspiciousClients,
  getClientStats,
  getHoneypotsForClient,
  checkForCopiedHoneypot,
} from "@/libs/anti-copy-logger";
import {
  detectHoneypotCopy,
  generateHoneypotEvidence,
  generateHoneypotProduct,
  isHoneypot,
} from "@/libs/honeypot-products";
import { detectFingerprint, verifyDataOrigin } from "@/libs/steganographic-fingerprint";

export const dynamic = "force-dynamic";

// GET /api/admin/anti-copy - Get anti-copy dashboard data
export async function GET(request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "dashboard";

    switch (action) {
      case "dashboard": {
        // Get overview stats
        const [suspicious24h, suspicious7d, honeypotClients] = await Promise.all([
          getSuspiciousClients({ minAccesses: 50, timeWindowHours: 24 }),
          getSuspiciousClients({ minAccesses: 200, timeWindowHours: 168 }),
          getSuspiciousClients({ honeypotOnly: true, timeWindowHours: 168 }),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            suspicious24h: suspicious24h.data,
            suspicious7d: suspicious7d.data,
            honeypotClients: honeypotClients.data,
            timestamp: new Date().toISOString(),
          },
        });
      }

      case "client-details": {
        const clientId = searchParams.get("clientId");
        if (!clientId) {
          return NextResponse.json({ error: "clientId required" }, { status: 400 });
        }

        const [stats, honeypots] = await Promise.all([
          getClientStats(clientId),
          getHoneypotsForClient(clientId),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            clientId,
            stats: stats.data,
            honeypots: honeypots.data,
            logs: honeypots.logs,
          },
        });
      }

      case "verify-honeypot": {
        const productId = searchParams.get("productId");
        if (!productId) {
          return NextResponse.json({ error: "productId required" }, { status: 400 });
        }

        const result = isHoneypot(productId);
        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Admin Anti-Copy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/anti-copy - Perform anti-copy actions
export async function POST(request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "detect-copy": {
        // Check if a product found elsewhere is a copied honeypot
        const { productName, productSlug, productScore, productDescription } = body;

        if (!productName && !productSlug) {
          return NextResponse.json(
            { error: "productName or productSlug required" },
            { status: 400 }
          );
        }

        const detection = detectHoneypotCopy({
          name: productName,
          slug: productSlug,
          description: productDescription,
          safe_score: productScore,
        });

        let evidence = null;
        if (detection.isHoneypot) {
          evidence = generateHoneypotEvidence(detection);
        }

        return NextResponse.json({
          success: true,
          data: {
            isHoneypot: detection.isHoneypot,
            confidence: detection.confidence || 0,
            matchedSeed: detection.matchedSeed,
            matchedFingerprint: detection.matchedFingerprint,
            evidence,
          },
        });
      }

      case "generate-evidence": {
        // Generate legal evidence document for a detected copy
        const { detection } = body;

        if (!detection || !detection.isHoneypot) {
          return NextResponse.json(
            { error: "Valid detection data required" },
            { status: 400 }
          );
        }

        const evidence = generateHoneypotEvidence(detection);

        return NextResponse.json({
          success: true,
          data: { evidence },
        });
      }

      case "preview-honeypot": {
        // Preview what a honeypot looks like (for admin testing)
        const { seed, type } = body;

        const honeypot = generateHoneypotProduct(
          seed || `test-${Date.now()}`,
          type || "hardware_wallet"
        );

        // Remove secret fields for preview
        const { honeypot_seed, ...previewHoneypot } = honeypot;

        return NextResponse.json({
          success: true,
          data: { honeypot: previewHoneypot },
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Admin Anti-Copy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
