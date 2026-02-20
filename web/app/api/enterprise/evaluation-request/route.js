import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { checkUnifiedAccess } from "@/libs/access";
import { quickProtect } from "@/libs/api-protection";

const MAX_REQUESTS_PER_MONTH = 5;

export async function GET(req) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Check enterprise access
  const access = await checkUnifiedAccess({
    userId: session.user.id,
    requiredPlan: "enterprise",
  });

  if (!access.hasAccess) {
    return NextResponse.json({ error: "Enterprise plan required" }, { status: 403 });
  }

  // Get user's requests
  const { data: requests, error } = await supabaseAdmin
    .from("enterprise_evaluation_requests")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch evaluation requests:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }

  // Calculate quota for current month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const thisMonthCount = (requests || []).filter(
    (r) => new Date(r.created_at) >= monthStart
  ).length;

  return NextResponse.json({
    requests: requests || [],
    quota: {
      used: thisMonthCount,
      limit: MAX_REQUESTS_PER_MONTH,
      remaining: Math.max(0, MAX_REQUESTS_PER_MONTH - thisMonthCount),
    },
  });
}

export async function POST(req) {
  // Rate limiting
  const protection = await quickProtect(req, "authenticated");
  if (protection.blocked) {
    return protection.response;
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Check enterprise access
  const access = await checkUnifiedAccess({
    userId: session.user.id,
    requiredPlan: "enterprise",
  });

  if (!access.hasAccess) {
    return NextResponse.json({ error: "Enterprise plan required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { productName, productUrl, justification } = body;

    // Validation
    if (!productName || productName.length < 2 || productName.length > 200) {
      return NextResponse.json(
        { error: "Product name required (2-200 characters)" },
        { status: 400 }
      );
    }

    if (!justification || justification.length < 10 || justification.length > 1000) {
      return NextResponse.json(
        { error: "Justification required (10-1000 characters)" },
        { status: 400 }
      );
    }

    if (productUrl && productUrl.length > 500) {
      return NextResponse.json(
        { error: "Product URL too long" },
        { status: 400 }
      );
    }

    // Check monthly quota
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabaseAdmin
      .from("enterprise_evaluation_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .gte("created_at", monthStart.toISOString());

    if (countError) {
      console.error("Failed to check quota:", countError);
      return NextResponse.json({ error: "Failed to check quota" }, { status: 500 });
    }

    if (count >= MAX_REQUESTS_PER_MONTH) {
      return NextResponse.json(
        {
          error: `Monthly limit reached (${MAX_REQUESTS_PER_MONTH}/month). Resets on the 1st.`,
          quota: { used: count, limit: MAX_REQUESTS_PER_MONTH, remaining: 0 },
        },
        { status: 429 }
      );
    }

    // Insert request
    const { data, error } = await supabaseAdmin
      .from("enterprise_evaluation_requests")
      .insert({
        user_id: session.user.id,
        product_name: productName.substring(0, 200),
        product_url: productUrl?.substring(0, 500) || null,
        justification: justification.substring(0, 1000),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create evaluation request:", error);
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
    }

    // Send notification
    await sendEvalNotification({
      user: session.user.email || session.user.name || "Unknown",
      productName: productName.substring(0, 200),
      productUrl: productUrl || "N/A",
      justification: justification.substring(0, 500),
    });

    return NextResponse.json({
      success: true,
      request: data,
      quota: {
        used: count + 1,
        limit: MAX_REQUESTS_PER_MONTH,
        remaining: Math.max(0, MAX_REQUESTS_PER_MONTH - count - 1),
      },
    });
  } catch (error) {
    console.error("Evaluation request error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

async function sendEvalNotification(data) {
  const discordWebhook = process.env.DISCORD_AUDIT_WEBHOOK;
  if (discordWebhook) {
    try {
      await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "New Custom Evaluation Request",
              color: 0xf59e0b,
              fields: [
                { name: "User", value: data.user, inline: true },
                { name: "Product", value: data.productName, inline: true },
                { name: "URL", value: data.productUrl, inline: false },
                { name: "Justification", value: data.justification, inline: false },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (e) {
      console.error("Failed to send Discord notification:", e);
    }
  }

  const slackWebhook = process.env.SLACK_AUDIT_WEBHOOK;
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `New Evaluation Request: ${data.productName}`,
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "New Custom Evaluation Request" },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*User:*\n${data.user}` },
                { type: "mrkdwn", text: `*Product:*\n${data.productName}` },
              ],
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*URL:* ${data.productUrl}\n*Justification:* ${data.justification}`,
              },
            },
          ],
        }),
      });
    } catch (e) {
      console.error("Failed to send Slack notification:", e);
    }
  }
}
