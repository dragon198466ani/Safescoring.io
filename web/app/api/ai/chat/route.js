import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/libs/ai-system-prompt";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const RATE_LIMITS = {
  free: 5,
  explorer: 25,
  pro: 50,
  enterprise: 200,
};

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!openai) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  try {
    const { messages, sessionId = "default" } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const userId = session.user.id;
    const planType = session.user.planType || "free";
    const limit = RATE_LIMITS[planType] || RATE_LIMITS.free;

    // Check rate limit
    const today = new Date().toISOString().split("T")[0];

    if (supabaseAdmin) {
      const { data: rateData } = await supabaseAdmin
        .from("ai_rate_limits")
        .select("messages_sent")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .single();

      const used = rateData?.messages_sent || 0;
      if (used >= limit) {
        return NextResponse.json(
          {
            error: "Daily AI message limit reached",
            usage: { used, limit },
            upgrade: planType === "free",
          },
          { status: 429 }
        );
      }
    }

    // Get user context for system prompt
    let userSetups = [];
    let topProducts = [];

    if (supabaseAdmin) {
      const [setupsRes, productsRes] = await Promise.all([
        supabaseAdmin
          .from("user_setups")
          .select("id, name, products, combined_score")
          .eq("user_id", userId)
          .limit(5),
        supabaseAdmin
          .from("safe_scoring_results")
          .select("product_id, note_finale, score_s, score_a, score_f, score_e, products!inner(name, slug)")
          .not("note_finale", "is", null)
          .order("note_finale", { ascending: false })
          .limit(30),
      ]);

      userSetups = setupsRes.data || [];
      topProducts = (productsRes.data || []).map((p) => ({
        name: p.products.name,
        slug: p.products.slug,
        score: Math.round(p.note_finale),
        s: Math.round(p.score_s || 0),
        a: Math.round(p.score_a || 0),
        f: Math.round(p.score_f || 0),
        e: Math.round(p.score_e || 0),
      }));
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(userSetups, topProducts, session.user.name);

    // Prepare messages for OpenAI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: aiMessages,
      max_tokens: 800,
      temperature: 0.7,
    });

    const assistantContent = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Extract product recommendations from the response
    const recommendations = extractRecommendations(assistantContent, topProducts);

    // Update rate limit
    if (supabaseAdmin) {
      await supabaseAdmin.rpc("increment_ai_usage", { p_user_id: userId, p_date: today }).catch(() => {
        // Fallback: upsert manually
        supabaseAdmin
          .from("ai_rate_limits")
          .upsert(
            { user_id: userId, usage_date: today, messages_sent: 1 },
            { onConflict: "user_id,usage_date" }
          )
          .then(() => {
            supabaseAdmin
              .from("ai_rate_limits")
              .update({ messages_sent: supabaseAdmin.raw("messages_sent + 1") })
              .eq("user_id", userId)
              .eq("usage_date", today);
          });
      });

      // Simple upsert for rate tracking
      const { data: existing } = await supabaseAdmin
        .from("ai_rate_limits")
        .select("messages_sent")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("ai_rate_limits")
          .update({ messages_sent: (existing.messages_sent || 0) + 1 })
          .eq("user_id", userId)
          .eq("usage_date", today);
      } else {
        await supabaseAdmin.from("ai_rate_limits").insert({
          user_id: userId,
          usage_date: today,
          messages_sent: 1,
        });
      }
    }

    // Get updated usage
    let currentUsage = 1;
    if (supabaseAdmin) {
      const { data: usage } = await supabaseAdmin
        .from("ai_rate_limits")
        .select("messages_sent")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .single();
      currentUsage = usage?.messages_sent || 1;
    }

    return NextResponse.json({
      content: assistantContent,
      recommendations,
      usage: { used: currentUsage, limit },
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
