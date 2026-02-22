import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { callAI, getAvailableProviders, detectComplexity } from "@/libs/ai-providers";
import { buildSystemPrompt } from "@/libs/ai-system-prompt";
import { getPlanLimits } from "@/libs/access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ============================================================
// RATE LIMITS & COST MODEL
//
// Simple question (8B):  ~$0.0001/msg → can be generous
// Complex question (70B): ~$0.001/msg → need to limit for free users
//
// Budget per user per day:
//   Free:       ~$0.003/day  → 20 simple + 3 complex
//   Explorer:   ~$0.02/day   → 40 simple + 10 complex
//   Pro:        ~$0.05/day   → unlimited simple + 30 complex
//   Enterprise: ~$0.10/day   → unlimited
// ============================================================
const PLAN_LIMITS = {
  free: {
    daily: 25,       // total messages per day
    complex: 3,      // max complex (70B) messages per day
  },
  explorer: {
    daily: 50,
    complex: 15,
  },
  pro: {
    daily: 100,
    complex: 40,
  },
  enterprise: {
    daily: 500,
    complex: 200,
  },
};

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (getAvailableProviders().length === 0) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  try {
    const { messages, sessionId = "default" } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const userId = session.user.id;
    const planType = session.user.planType || "free";
    const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.free;

    // Detect complexity from user's messages
    const complexity = detectComplexity(messages);

    // Check rate limits (daily total + complex quota)
    const today = new Date().toISOString().split("T")[0];
    let currentUsage = { total: 0, complex: 0 };

    if (supabaseAdmin) {
      const { data: rateData } = await supabaseAdmin
        .from("ai_rate_limits")
        .select("messages_sent, tokens_used")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .single();

      if (rateData) {
        currentUsage.total = rateData.messages_sent || 0;
        currentUsage.complex = rateData.tokens_used || 0; // reuse tokens_used column for complex count
      }

      // Check daily total limit
      if (currentUsage.total >= limits.daily) {
        return NextResponse.json(
          {
            error: "Daily AI message limit reached",
            usage: {
              total: currentUsage.total,
              complex: currentUsage.complex,
              limits,
            },
            upgrade: planType === "free",
          },
          { status: 429 }
        );
      }

      // Check complex message quota — downgrade to simple if exceeded
      if (complexity === "complex" && currentUsage.complex >= limits.complex) {
        // Don't block — silently downgrade to simple model
        // User still gets a response, just less nuanced
      }
    }

    // Determine final complexity (may be downgraded if quota exceeded)
    const finalComplexity =
      complexity === "complex" && currentUsage.complex >= limits.complex
        ? "simple"
        : complexity;

    // ============================================================
    // DATA GATING — only share what the user's plan allows
    // Free users get limited data → AI naturally nudges upgrades
    // Paid users get full data → AI gives richer answers
    // ============================================================
    const planLimits = getPlanLimits(planType);
    const setupLimit = planLimits.maxSetups === -1 ? 50 : planLimits.maxSetups;
    const productLimit = planLimits.monthlyProductViews === -1 ? 30 : Math.min(planLimits.monthlyProductViews, 30);

    let userSetups = [];
    let topProducts = [];
    let productViewsUsed = 0;

    if (supabaseAdmin) {
      // Fetch data in parallel — gated by plan limits
      const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"

      const queries = [
        // Setups: only what the plan allows
        supabaseAdmin
          .from("user_setups")
          .select("id, name, products, combined_score")
          .eq("user_id", userId)
          .limit(setupLimit),
        // Products: limit count based on plan
        supabaseAdmin
          .from("safe_scoring_results")
          .select("product_id, note_finale, score_s, score_a, score_f, score_e, products!inner(name, slug)")
          .not("note_finale", "is", null)
          .order("note_finale", { ascending: false })
          .limit(productLimit),
        // Track how many product views the user has consumed this month
        supabaseAdmin
          .from("product_views")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("month_year", month),
      ];

      const [setupsRes, productsRes, viewsRes] = await Promise.all(queries);

      userSetups = setupsRes.data || [];
      productViewsUsed = viewsRes.count || 0;

      // Free users: only get overall SAFE score (no pillar breakdown)
      // Paid users: full S, A, F, E pillar detail
      const isPaid = planType !== "free";

      topProducts = (productsRes.data || []).map((p) => {
        const base = {
          name: p.products.name,
          slug: p.products.slug,
          score: Math.round(p.note_finale),
        };
        if (isPaid) {
          base.s = Math.round(p.score_s || 0);
          base.a = Math.round(p.score_a || 0);
          base.f = Math.round(p.score_f || 0);
          base.e = Math.round(p.score_e || 0);
        }
        return base;
      });
    }

    // Build system prompt with plan-aware data
    const systemPrompt = buildSystemPrompt(
      userSetups,
      topProducts,
      session.user.name,
      planType,
      { productViewsUsed, planLimits }
    );

    // Prepare messages (OpenAI-compatible format)
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    // Call AI with smart routing
    const result = await callAI(aiMessages, finalComplexity);

    const assistantContent = result.content;
    const recommendations = extractRecommendations(assistantContent, topProducts);

    // Update rate limits
    if (supabaseAdmin) {
      const isComplex = result.complexity === "complex" ? 1 : 0;

      const { data: existing } = await supabaseAdmin
        .from("ai_rate_limits")
        .select("messages_sent, tokens_used")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("ai_rate_limits")
          .update({
            messages_sent: (existing.messages_sent || 0) + 1,
            tokens_used: (existing.tokens_used || 0) + isComplex,
          })
          .eq("user_id", userId)
          .eq("usage_date", today);
      } else {
        await supabaseAdmin.from("ai_rate_limits").insert({
          user_id: userId,
          usage_date: today,
          messages_sent: 1,
          tokens_used: isComplex,
        });
      }
    }

    // Get updated usage for response
    let updatedUsage = { total: 1, complex: 0 };
    if (supabaseAdmin) {
      const { data: usage } = await supabaseAdmin
        .from("ai_rate_limits")
        .select("messages_sent, tokens_used")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .single();
      updatedUsage = {
        total: usage?.messages_sent || 1,
        complex: usage?.tokens_used || 0,
      };
    }

    return NextResponse.json({
      content: assistantContent,
      recommendations,
      usage: {
        total: updatedUsage.total,
        complex: updatedUsage.complex,
        limits,
      },
      model: result.model,
      complexity: result.complexity,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}

// Extract product names mentioned in AI response and match with products
function extractRecommendations(text, products) {
  if (!products?.length) return [];

  const found = [];
  const lowerText = text.toLowerCase();

  for (const product of products) {
    if (lowerText.includes(product.name.toLowerCase()) || lowerText.includes(product.slug.toLowerCase())) {
      if (!found.find((f) => f.slug === product.slug)) {
        found.push({
          id: product.slug,
          name: product.name,
          slug: product.slug,
          score: product.score,
          type_name: `SAFE: ${product.score}`,
        });
      }
    }
    if (found.length >= 3) break;
  }

  return found;
}
