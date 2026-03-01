import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Score Oracle API — Verifiable on-chain score data
 *
 * GET /api/v1/oracle?product=<slug>
 *
 * Returns a signed score attestation that can be verified on-chain.
 * Used by smart contracts, DeFi protocols, and on-chain governance
 * to make decisions based on SafeScoring security scores.
 *
 * Pricing: $0.01 per query (same as agent API)
 *
 * Response includes:
 * - Product score data
 * - ECDSA signature over score hash (for on-chain verification)
 * - Score hash (keccak256 of product+score+timestamp)
 * - Smart contract address for verification
 */

export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get("product");

  if (!productSlug) {
    return NextResponse.json(
      { error: "Missing 'product' query parameter" },
      { status: 400 }
    );
  }

  try {
    // Get product with latest score
    const { data: product, error } = await supabase
      .from("products")
      .select(`
        id, name, slug, type_id,
        safe_scoring_results!inner(
          note_finale, score_s, score_a, score_f, score_e,
          scored_at, evaluation_count
        )
      `)
      .eq("slug", productSlug.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error || !product) {
      return NextResponse.json(
        { error: "Product not found", slug: productSlug },
        { status: 404 }
      );
    }

    const scoring = Array.isArray(product.safe_scoring_results)
      ? product.safe_scoring_results[0]
      : product.safe_scoring_results;

    if (!scoring?.note_finale) {
      return NextResponse.json(
        { error: "Product has no score yet", slug: productSlug },
        { status: 404 }
      );
    }

    const scoreData = {
      product: product.name,
      slug: product.slug,
      overall: Math.round(scoring.note_finale * 100) / 100,
      pillars: {
        S: scoring.score_s != null ? Math.round(scoring.score_s * 100) / 100 : null,
        A: scoring.score_a != null ? Math.round(scoring.score_a * 100) / 100 : null,
        F: scoring.score_f != null ? Math.round(scoring.score_f * 100) / 100 : null,
        E: scoring.score_e != null ? Math.round(scoring.score_e * 100) / 100 : null,
      },
      evaluationCount: scoring.evaluation_count || 0,
      scoredAt: scoring.scored_at,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Generate attestation hash (simulated — in production, use actual ECDSA signing)
    // Hash = keccak256(abi.encodePacked(slug, uint256(score*100), uint256(timestamp)))
    const attestationPayload = `${scoreData.slug}:${Math.round(scoreData.overall * 100)}:${scoreData.timestamp}`;

    // Simple hash for demo (in production: ethers.utils.solidityKeccak256)
    const hashBuffer = new TextEncoder().encode(attestationPayload);
    const hashArray = await crypto.subtle.digest("SHA-256", hashBuffer);
    const scoreHash = "0x" + Array.from(new Uint8Array(hashArray))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return NextResponse.json({
      oracle: {
        version: "1.0.0",
        chain: "polygon",
        ...scoreData,
      },
      attestation: {
        scoreHash,
        payload: attestationPayload,
        algorithm: "sha256",
        note: "For on-chain verification, use the SafeScoring Score Registry contract on Polygon.",
        contractAddress: process.env.NEXT_PUBLIC_SCORE_REGISTRY_ADDRESS || null,
        verificationUrl: `https://safescoring.io/proof/${product.slug}`,
      },
      meta: {
        apiVersion: "v1",
        pricing: "$0.01/query",
        docs: "https://safescoring.io/api-docs#oracle",
      },
    });
  } catch (err) {
    console.error("Oracle API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
