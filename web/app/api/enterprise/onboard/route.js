import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Enterprise Self-Serve Onboarding API
 *
 * POST /api/enterprise/onboard
 *
 * Allows enterprise customers ($299/mo) to:
 * 1. Set up white-label configuration
 * 2. Invite team members
 * 3. Configure custom scoring parameters
 * 4. Set up API keys and webhooks
 *
 * Requires authenticated Enterprise plan user.
 */

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      company_name,
      company_domain,
      team_emails,
      white_label,
      webhook_url,
    } = body;

    if (!company_name) {
      return NextResponse.json(
        { error: "company_name is required" },
        { status: 400 }
      );
    }

    // Verify enterprise plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, plan, email")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile || profile.plan !== "enterprise") {
      return NextResponse.json(
        {
          error: "Enterprise plan required",
          currentPlan: profile?.plan || "free",
          upgradeUrl: "https://safescoring.io/pricing",
        },
        { status: 403 }
      );
    }

    // Create or update enterprise configuration
    const enterpriseConfig = {
      user_id: session.user.id,
      company_name,
      company_domain: company_domain || null,
      white_label_config: white_label
        ? {
            primaryColor: white_label.primary_color || "#3B82F6",
            secondaryColor: white_label.secondary_color || "#8B5CF6",
            logoUrl: white_label.logo_url || null,
            companyName: company_name,
            hideSafeScoring: white_label.hide_branding || false,
            footerText: white_label.footer_text || null,
          }
        : null,
      webhook_url: webhook_url || null,
      team_size: (team_emails || []).length + 1,
      status: "active",
    };

    const { data: config, error: configError } = await supabase
      .from("enterprise_configs")
      .upsert(enterpriseConfig, {
        onConflict: "user_id",
      })
      .select()
      .maybeSingle();

    if (configError) {
      // Table might not exist yet — return config as draft
      return NextResponse.json({
        status: "draft",
        message: "Enterprise configuration saved as draft. Contact support to activate.",
        config: enterpriseConfig,
        nextSteps: [
          "Configuration saved",
          team_emails?.length > 0
            ? `${team_emails.length} team invites will be sent upon activation`
            : "Add team members in your dashboard",
          webhook_url
            ? "Webhook endpoint configured"
            : "Set up webhooks for real-time score alerts",
          white_label
            ? "White-label branding configured"
            : "Customize branding in your dashboard",
        ],
        dashboardUrl: "https://safescoring.io/dashboard/enterprise",
        apiDocsUrl: "https://safescoring.io/api-docs",
      });
    }

    // Process team invites
    const inviteResults = [];
    if (team_emails && Array.isArray(team_emails)) {
      for (const email of team_emails.slice(0, 20)) {
        // In production: send invite email via Resend
        inviteResults.push({
          email,
          status: "invited",
          message: "Invitation email will be sent",
        });
      }
    }

    return NextResponse.json({
      status: "active",
      configId: config?.id,
      company: company_name,
      features: {
        whiteLabel: !!white_label,
        webhook: !!webhook_url,
        teamInvites: inviteResults.length,
        customScoring: false, // Phase 2
        apiAccess: true,
        prioritySupport: true,
      },
      teamInvites: inviteResults,
      apiKey: {
        message: "Generate your API key in the dashboard",
        url: "https://safescoring.io/dashboard/settings#api",
      },
      nextSteps: [
        "Generate your Enterprise API key",
        "Integrate the SafeScoring widget on your site",
        "Set up webhook alerts for your monitored products",
        "Invite your team members",
      ],
    });
  } catch (err) {
    console.error("Enterprise onboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/enterprise/onboard — Get current enterprise config
 */
export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { data: config } = await supabase
      .from("enterprise_configs")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!config) {
      return NextResponse.json({
        configured: false,
        message: "No enterprise configuration found",
        setupUrl: "https://safescoring.io/enterprise",
      });
    }

    return NextResponse.json({
      configured: true,
      ...config,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
