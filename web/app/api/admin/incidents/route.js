import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/libs/admin-auth";

/**
 * API Routes for Incident Scraping
 * =================================
 * GET  /api/admin/incidents - Get scraping stats & recent incidents
 * POST /api/admin/incidents - Trigger incident scraping
 *
 * SCRAPING SOURCES:
 * - DefiLlama Hacks API (free)
 * - SlowMist Hacked Database (free)
 * - Web3 Is Going Great (free)
 * - Twitter/X via Nitter + Grok (free with OpenRouter credits)
 *
 * NOTE: The heavy scraping is done by Python scripts.
 * This endpoint orchestrates and monitors the process.
 */

// Lazy initialization to avoid build-time errors
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// SECURITY: Safe error formatting
function safeError(error, defaultMessage = "Internal server error") {
  if (process.env.NODE_ENV === "development") {
    return error?.message || defaultMessage;
  }
  return defaultMessage;
}

// GET - Scraping stats & recent incidents
export async function GET(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    if (action === "stats") {
      // Get incident statistics
      const { data: stats, error } = await supabase.rpc(
        "get_incident_stats"
      );

      if (error) {
        // Fallback if function doesn't exist
        const { data: incidents } = await supabase
          .from("security_incidents")
          .select("severity, incident_type, status, is_published");

        const manualStats = {
          total: incidents?.length || 0,
          published: incidents?.filter((i) => i.is_published)?.length || 0,
          by_severity: {},
          by_type: {},
          by_status: {},
        };

        incidents?.forEach((inc) => {
          manualStats.by_severity[inc.severity] =
            (manualStats.by_severity[inc.severity] || 0) + 1;
          manualStats.by_type[inc.incident_type] =
            (manualStats.by_type[inc.incident_type] || 0) + 1;
          manualStats.by_status[inc.status] =
            (manualStats.by_status[inc.status] || 0) + 1;
        });

        return NextResponse.json(manualStats);
      }

      return NextResponse.json(stats);
    }

    if (action === "sources") {
      // Return available scraping sources
      return NextResponse.json({
        sources: [
          {
            id: "defillama",
            name: "DefiLlama Hacks",
            type: "api",
            free: true,
            description: "Comprehensive DeFi hack database",
            url: "https://api.llama.fi/hacks",
          },
          {
            id: "slowmist",
            name: "SlowMist Hacked",
            type: "api",
            free: true,
            description: "Chinese security firm database",
            url: "https://hacked.slowmist.io/",
          },
          {
            id: "web3isgoinggreat",
            name: "Web3 Is Going Great",
            type: "json",
            free: true,
            description: "Molly White incident timeline",
            url: "https://web3isgoinggreat.com/",
          },
          {
            id: "twitter_grok",
            name: "Twitter/X (via Grok)",
            type: "ai",
            free: true,
            description: "Real-time alerts from security accounts",
            requires: "OPENROUTER_API_KEY",
            accounts: [
              "@zachxbt",
              "@PeckShieldAlert",
              "@CertiKAlert",
              "@SlowMist_Team",
            ],
          },
          {
            id: "rss",
            name: "Crypto News RSS",
            type: "rss",
            free: true,
            description: "The Block, Decrypt, CoinTelegraph",
          },
        ],
      });
    }

    // Default: list recent incidents
    const { data: incidents, error } = await supabase
      .from("security_incidents")
      .select(
        `
        id,
        incident_id,
        title,
        incident_type,
        severity,
        funds_lost_usd,
        incident_date,
        status,
        is_published,
        created_by,
        created_at
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Group by source
    const bySource = {};
    incidents?.forEach((inc) => {
      const source = inc.created_by?.replace("scraper_", "") || "manual";
      if (!bySource[source]) bySource[source] = [];
      bySource[source].push(inc);
    });

    return NextResponse.json({
      total: incidents?.length || 0,
      incidents,
      by_source: bySource,
    });
  } catch (error) {
    console.error("Incidents GET error:", error);
    return NextResponse.json(
      { error: safeError(error, "Failed to fetch incidents") },
      { status: 500 }
    );
  }
}

// POST - Trigger scraping or manage incidents
export async function POST(request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { action, source, incident_ids } = body;
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    switch (action) {
      // Queue a scraping task
      case "scrape": {
        const sources = source
          ? [source]
          : ["defillama", "slowmist", "web3isgoinggreat"];

        // Add scraping tasks to queue
        const tasks = sources.map((src) => ({
          task_type: "scrape_incidents",
          target_id: src,
          target_type: "source",
          priority: 3,
          payload: {
            source: src,
            timestamp: new Date().toISOString(),
          },
        }));

        const { error } = await supabase.from("task_queue").insert(tasks);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: `Queued ${tasks.length} scraping tasks`,
          sources,
        });
      }

      // Scrape Twitter with Grok analysis
      case "scrape_twitter": {
        const accounts = body.accounts || [
          "zachxbt",
          "PeckShieldAlert",
          "CertiKAlert",
        ];

        // Check if OpenRouter is configured
        if (!process.env.OPENROUTER_API_KEY) {
          return NextResponse.json(
            {
              error: "OPENROUTER_API_KEY not configured",
              help: "Add your OpenRouter API key to enable Grok analysis",
            },
            { status: 400 }
          );
        }

        // Queue Twitter scraping task
        const { error } = await supabase.from("task_queue").insert({
          task_type: "scrape_twitter_grok",
          target_id: "twitter",
          target_type: "source",
          priority: 2,
          payload: {
            accounts,
            batch_size: body.batch_size || 10,
            timestamp: new Date().toISOString(),
          },
        });

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: `Queued Twitter scraping for ${accounts.length} accounts`,
          accounts,
        });
      }

      // Publish verified incidents
      case "publish": {
        if (!incident_ids || !incident_ids.length) {
          return NextResponse.json(
            { error: "incident_ids required" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("security_incidents")
          .update({
            is_published: true,
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .in("incident_id", incident_ids);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: `Published ${incident_ids.length} incidents`,
        });
      }

      // Unpublish/hide incidents
      case "unpublish": {
        if (!incident_ids || !incident_ids.length) {
          return NextResponse.json(
            { error: "incident_ids required" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("security_incidents")
          .update({
            is_published: false,
            updated_at: new Date().toISOString(),
          })
          .in("incident_id", incident_ids);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: `Unpublished ${incident_ids.length} incidents`,
        });
      }

      // Mark as false positive (delete)
      case "mark_false_positive": {
        if (!incident_ids || !incident_ids.length) {
          return NextResponse.json(
            { error: "incident_ids required" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("security_incidents")
          .update({
            status: "disputed",
            is_published: false,
            updated_at: new Date().toISOString(),
          })
          .in("incident_id", incident_ids);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: `Marked ${incident_ids.length} as false positives`,
        });
      }

      // Match incidents to products
      case "match_products": {
        const { error } = await supabase.from("task_queue").insert({
          task_type: "match_incidents_products",
          target_id: "all",
          target_type: "system",
          priority: 4,
        });

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: "Queued incident-product matching task",
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Incidents POST error:", error);
    return NextResponse.json(
      { error: safeError(error, "Failed to process incidents action") },
      { status: 500 }
    );
  }
}
