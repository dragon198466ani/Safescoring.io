import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";

/**
 * AI Chat API — SAFE methodology assistant
 * POST /api/ai/chat
 *
 * Body: { message, history, context }
 * Returns: { message: string }
 *
 * Uses the SAFE framework knowledge to answer crypto security questions.
 * Future: integrate with Gemini/Mistral/OpenRouter for real AI responses.
 */

// SAFE methodology knowledge base for rule-based responses
const SAFE_KNOWLEDGE = {
  methodology:
    "SafeScoring evaluates crypto products across 4 pillars: Security (cryptographic foundations), Adversity (threat resistance), Fidelity (reliability & trust), and Efficiency (usability & performance). Each product is scored against 1110+ security norms.",
  pillars: {
    security: "Security (S) evaluates cryptographic standards, key management, encryption strength, and secure element usage.",
    adversity: "Adversity (A) measures duress protection, anti-coercion features, physical security, and resistance to social engineering.",
    fidelity: "Fidelity (F) checks audit history, uptime track record, update frequency, transparency, and incident response.",
    efficiency: "Efficiency (E) evaluates UX quality, multi-chain support, accessibility, and performance.",
  },
  scoring:
    "The SAFE score is calculated as (S + A + F + E) / 4. Each pillar = (compliant norms / applicable norms) x 100. Products with many N/A norms are not penalized.",
  vs_audits:
    "87% of hacked projects in 2024 had been audited. Audits are point-in-time code reviews. SafeScoring provides continuous, multi-dimensional security evaluation covering operational security, not just code.",
};

function generateResponse(message, context) {
  const q = message.toLowerCase();

  // SAFE methodology questions
  if (q.includes("what is safe") || q.includes("safe scor") || q.includes("methodology")) {
    return SAFE_KNOWLEDGE.methodology;
  }

  // Pillar questions
  if (q.includes("security") && (q.includes("pillar") || q.includes("what"))) {
    return SAFE_KNOWLEDGE.pillars.security;
  }
  if (q.includes("adversity")) {
    return SAFE_KNOWLEDGE.pillars.adversity;
  }
  if (q.includes("fidelity")) {
    return SAFE_KNOWLEDGE.pillars.fidelity;
  }
  if (q.includes("efficiency")) {
    return SAFE_KNOWLEDGE.pillars.efficiency;
  }

  // Score calculation
  if (q.includes("score") && (q.includes("calculat") || q.includes("how"))) {
    return SAFE_KNOWLEDGE.scoring;
  }

  // Audit comparison
  if (q.includes("audit") || q.includes("certik") || q.includes("vs")) {
    return SAFE_KNOWLEDGE.vs_audits;
  }

  // Safest / best / compare
  if (q.includes("safest") || q.includes("best") || q.includes("which")) {
    if (context?.topProducts?.length > 0) {
      const top = context.topProducts
        .filter((p) => p.score != null)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      if (top.length > 0) {
        const list = top.map((p) => `${p.name}: ${Math.round(p.score)}/100`).join(", ");
        return `Based on the SAFE methodology, here are the top-rated products currently visible: ${list}. Higher scores indicate better security across all 4 pillars. Use the Compare page for a detailed side-by-side analysis.`;
      }
    }
    return "You can compare products side-by-side on the Compare page. Each product is evaluated against 1110+ security norms across Security, Adversity, Fidelity, and Efficiency pillars.";
  }

  // Product count
  if (q.includes("how many") && q.includes("product")) {
    const count = context?.productCount || "1000+";
    return `SafeScoring currently evaluates ${count} crypto products including hardware wallets, software wallets, exchanges, DeFi protocols, bridges, and more.`;
  }

  // Default
  return `I can help you understand crypto security! Ask me about:\n\n- The SAFE methodology and how products are scored\n- The 4 pillars (Security, Adversity, Fidelity, Efficiency)\n- How SafeScoring differs from traditional audits\n- Which products have the highest security scores\n\nWhat would you like to know?`;
}

export async function POST(request) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, history = [], context = {} } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Rate limit: max 120 chars for free users
    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Generate response (rule-based for now, AI integration later)
    const response = generateResponse(message.trim(), context);

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
