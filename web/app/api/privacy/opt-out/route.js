import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Universal Privacy Opt-Out API
 *
 * Supports opt-out requests for all jurisdictions:
 * - GDPR (EU) - Art. 21 Right to Object
 * - CCPA (California) - Do Not Sell
 * - LGPD (Brazil) - Right to Revoke Consent
 * - UK GDPR - Right to Object
 * - PIPEDA (Canada) - Right to Withdraw Consent
 * - APPI (Japan) - Right to Request Cessation
 */

export const dynamic = "force-dynamic";

// Detect jurisdiction from request
function detectJurisdiction(request) {
  // Check for explicit header
  const country = request.headers.get("cf-ipcountry") ||
                  request.headers.get("x-vercel-ip-country") ||
                  request.headers.get("x-country");

  // Map countries to jurisdictions
  const jurisdictionMap = {
    // EU countries (GDPR)
    AT: "GDPR", BE: "GDPR", BG: "GDPR", HR: "GDPR", CY: "GDPR",
    CZ: "GDPR", DK: "GDPR", EE: "GDPR", FI: "GDPR", FR: "GDPR",
    DE: "GDPR", GR: "GDPR", HU: "GDPR", IE: "GDPR", IT: "GDPR",
    LV: "GDPR", LT: "GDPR", LU: "GDPR", MT: "GDPR", NL: "GDPR",
    PL: "GDPR", PT: "GDPR", RO: "GDPR", SK: "GDPR", SI: "GDPR",
    ES: "GDPR", SE: "GDPR",
    // EEA
    IS: "GDPR", LI: "GDPR", NO: "GDPR",
    // UK
    GB: "UK_GDPR",
    // Brazil
    BR: "LGPD",
    // Canada
    CA: "PIPEDA",
    // Japan
    JP: "APPI",
    // US (check for California separately)
    US: "CCPA", // Default to CCPA for US, could be refined with state detection
  };

  return jurisdictionMap[country] || "GDPR"; // Default to GDPR (strictest)
}

// Get response deadline based on jurisdiction
function getDeadline(jurisdiction) {
  const deadlines = {
    GDPR: 30,
    UK_GDPR: 30,
    CCPA: 45,
    LGPD: 15,
    PIPEDA: 30,
    APPI: 30,
  };
  return deadlines[jurisdiction] || 30;
}

// POST - Submit universal opt-out
export async function POST(request) {
  try {
    const session = await auth();
    const body = await request.json();
    const {
      opt_out_type, // marketing, analytics, profiling, all
      email, // Required if not logged in
    } = body;

    // Get email from session or request
    const userEmail = session?.user?.email || email;

    if (!userEmail) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Detect jurisdiction
    const jurisdiction = detectJurisdiction(request);
    const deadline = getDeadline(jurisdiction);

    // Valid opt-out types
    const validTypes = ["marketing", "analytics", "profiling", "data_sale", "all"];
    if (!validTypes.includes(opt_out_type)) {
      return NextResponse.json({ error: "Invalid opt-out type" }, { status: 400 });
    }

    // If user is logged in, update their privacy settings
    if (session?.user?.id && isSupabaseConfigured()) {
      const updates = {};

      if (opt_out_type === "marketing" || opt_out_type === "all") {
        updates.marketing_consent = false;
      }
      if (opt_out_type === "analytics" || opt_out_type === "all") {
        updates.analytics_consent = false;
      }
      if (opt_out_type === "profiling" || opt_out_type === "all") {
        updates.track_product_views = false;
        updates.track_search_history = false;
      }

      await supabase
        .from("user_privacy_settings")
        .upsert({
          user_id: session.user.id,
          ...updates,
        }, { onConflict: "user_id" });

      // Also update email preferences if opting out of marketing
      if (opt_out_type === "marketing" || opt_out_type === "all") {
        await supabase
          .from("user_email_preferences")
          .upsert({
            user_id: session.user.id,
            marketing_emails_enabled: false,
            newsletter_enabled: false,
          }, { onConflict: "user_id" });
      }
    }

    // Log for audit trail
    console.log(`[PRIVACY] Opt-out request`, {
      type: opt_out_type,
      jurisdiction,
      email: userEmail.slice(0, 3) + "***",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Opt-out request processed",
      opt_out_type,
      jurisdiction,
      deadline_days: deadline,
      effective: session?.user?.id ? "immediate" : `within ${deadline} days`,
      rights_info: getRightsInfo(jurisdiction),
    });

  } catch (error) {
    console.error("Error in opt-out request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get opt-out options and status
export async function GET(request) {
  const session = await auth();
  const jurisdiction = detectJurisdiction(request);

  let currentSettings = null;

  // If logged in, get current settings
  if (session?.user?.id && isSupabaseConfigured()) {
    const { data } = await supabase
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    currentSettings = data;
  }

  return NextResponse.json({
    jurisdiction,
    deadline_days: getDeadline(jurisdiction),
    rights: getRightsInfo(jurisdiction),
    opt_out_options: [
      {
        type: "marketing",
        label: "Marketing Communications",
        description: "Stop receiving promotional emails and marketing messages",
      },
      {
        type: "analytics",
        label: "Analytics Tracking",
        description: "Stop anonymous usage data collection",
      },
      {
        type: "profiling",
        label: "Profiling & Personalization",
        description: "Stop personalized recommendations and behavior tracking",
      },
      {
        type: "data_sale",
        label: "Data Sale (CCPA)",
        description: "Opt-out of sale of personal information (we do NOT sell data)",
        note: "SafeScoring does not sell personal information",
      },
      {
        type: "all",
        label: "Opt-Out of Everything",
        description: "Maximum privacy - only essential processing",
      },
    ],
    current_settings: currentSettings ? {
      marketing_enabled: currentSettings.marketing_consent,
      analytics_enabled: currentSettings.analytics_consent,
      profiling_enabled: currentSettings.track_product_views,
    } : null,
    contact: "privacy@safescoring.io",
  });
}

// Get jurisdiction-specific rights info
function getRightsInfo(jurisdiction) {
  const rights = {
    GDPR: {
      name: "EU General Data Protection Regulation",
      authority: "Your local Data Protection Authority",
      key_rights: ["Access", "Rectification", "Erasure", "Portability", "Object"],
    },
    UK_GDPR: {
      name: "UK General Data Protection Regulation",
      authority: "Information Commissioner's Office (ICO)",
      url: "https://ico.org.uk",
      key_rights: ["Access", "Rectification", "Erasure", "Portability", "Object"],
    },
    CCPA: {
      name: "California Consumer Privacy Act",
      authority: "California Attorney General",
      url: "https://oag.ca.gov/privacy/ccpa",
      key_rights: ["Know", "Delete", "Opt-Out", "Non-Discrimination", "Correct"],
    },
    LGPD: {
      name: "Lei Geral de Protecao de Dados",
      authority: "ANPD (Autoridade Nacional de Protecao de Dados)",
      url: "https://www.gov.br/anpd",
      key_rights: ["Confirmation", "Access", "Correction", "Anonymization", "Portability"],
    },
    PIPEDA: {
      name: "Personal Information Protection and Electronic Documents Act",
      authority: "Office of the Privacy Commissioner of Canada",
      url: "https://www.priv.gc.ca",
      key_rights: ["Access", "Challenge Accuracy", "Know Use", "Withdraw Consent"],
    },
    APPI: {
      name: "Act on Protection of Personal Information",
      authority: "Personal Information Protection Commission (PPC)",
      url: "https://www.ppc.go.jp",
      key_rights: ["Disclosure", "Correction", "Cessation of Use", "Cessation of Provision"],
    },
  };

  return rights[jurisdiction] || rights.GDPR;
}
