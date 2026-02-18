import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/libs/supabase";
import { sendSetupNotification } from "@/libs/setup-notifications";
import crypto from "crypto";

/**
 * GET /api/cron/check-incidents
 *
 * Cron job to check for new incidents and notify affected users
 * Should be called periodically (e.g., every hour)
 *
 * SECURITY: Supports both Bearer token (Vercel Cron) and HMAC signature verification
 * - Bearer token: For Vercel Cron (simple, but OK for internal use)
 * - HMAC signature: For external callers (more secure)
 *
 * HMAC Headers:
 * - X-Cron-Timestamp: Unix timestamp (must be within 5 minutes)
 * - X-Cron-Signature: HMAC-SHA256(timestamp + path, CRON_SECRET)
 */

function verifyCronAuth(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CRON] CRON_SECRET not configured");
    return false;
  }

  // Method 1: Vercel Cron uses Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Method 2: HMAC signature verification for external callers
  const timestamp = request.headers.get("x-cron-timestamp");
  const signature = request.headers.get("x-cron-signature");

  if (!timestamp || !signature) {
    return false;
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampNum) > 300) {
    console.warn("[CRON] Timestamp outside allowed window");
    return false;
  }

  // Verify HMAC signature
  const url = new URL(request.url);
  const payload = `${timestamp}:${url.pathname}`;
  const expectedSignature = crypto
    .createHmac("sha256", cronSecret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function GET(request) {
  // SECURITY: Verify cron authentication
  if (!verifyCronAuth(request)) {
    console.warn("[CRON] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Fetch recent incidents (last hour)
    const { data: recentIncidents, error: incidentsError } = await supabase
      .from("security_incidents")
      .select("id, title, description, severity, date, product_id, products(name, slug)")
      .gte("created_at", oneHourAgo.toISOString())
      .order("created_at", { ascending: false });

    if (incidentsError) {
      console.error("Error fetching incidents:", incidentsError);
      return NextResponse.json(
        { error: "Failed to fetch incidents" },
        { status: 500 }
      );
    }

    if (!recentIncidents || recentIncidents.length === 0) {
      return NextResponse.json({
        message: "No new incidents",
        processed: 0,
      });
    }

    console.log(`Found ${recentIncidents.length} recent incidents`);

    // Get all product IDs from incidents
    const productIds = [
      ...new Set(recentIncidents.map((i) => i.product_id).filter(Boolean)),
    ];

    if (productIds.length === 0) {
      return NextResponse.json({
        message: "No product-linked incidents",
        processed: 0,
      });
    }

    // Find setups containing these products
    const { data: affectedSetups, error: setupsError } = await supabase
      .from("user_setups")
      .select("id, name, user_id, products, last_notified_at")
      .filter("products", "cs", JSON.stringify(productIds.map((id) => ({ product_id: id }))))
      .eq("is_active", true);

    // Actually, the above filter won't work well with JSONB. Let's use a different approach.
    // Fetch all active setups and filter in code
    const { data: allSetups, error: allSetupsError } = await supabase
      .from("user_setups")
      .select("id, name, user_id, products, last_notified_at")
      .eq("is_active", true);

    if (allSetupsError) {
      console.error("Error fetching setups:", allSetupsError);
      return NextResponse.json(
        { error: "Failed to fetch setups" },
        { status: 500 }
      );
    }

    // Filter setups that contain affected products
    const affectedSetupsList = (allSetups || []).filter((setup) => {
      const setupProductIds = setup.products?.map((p) => p.product_id) || [];
      return setupProductIds.some((id) => productIds.includes(id));
    });

    console.log(`Found ${affectedSetupsList.length} affected setups`);

    if (affectedSetupsList.length === 0) {
      return NextResponse.json({
        message: "No affected setups",
        processed: 0,
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(affectedSetupsList.map((s) => s.user_id))];

    // Fetch notification preferences for these users
    const { data: prefsData, error: prefsError } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .in("user_id", userIds);

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
    }

    // Create a map of user preferences
    const prefsMap = new Map(
      (prefsData || []).map((p) => [p.user_id, p])
    );

    // Fetch user emails
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email")
      .in("id", userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
    }

    const usersMap = new Map((users || []).map((u) => [u.id, u]));

    // Process notifications
    const results = {
      processed: 0,
      notified: 0,
      skipped: 0,
      errors: [],
    };

    // Severity order for threshold comparison
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    for (const setup of affectedSetupsList) {
      const user = usersMap.get(setup.user_id);
      const prefs = prefsMap.get(setup.user_id) || {
        email_enabled: true,
        telegram_enabled: false,
        notify_incidents: true,
        severity_threshold: "high",
      };

      // Skip if user doesn't want incident notifications
      if (!prefs.notify_incidents) {
        results.skipped++;
        continue;
      }

      // Check last notified time (prevent spam - max 1 per 24 hours per setup)
      if (setup.last_notified_at) {
        const lastNotified = new Date(setup.last_notified_at);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (lastNotified > dayAgo) {
          results.skipped++;
          continue;
        }
      }

      // Find incidents affecting this setup
      const setupProductIds = setup.products?.map((p) => p.product_id) || [];
      const setupIncidents = recentIncidents.filter((i) =>
        setupProductIds.includes(i.product_id)
      );

      // Filter by severity threshold
      const thresholdLevel = severityOrder[prefs.severity_threshold] || 3;
      const relevantIncidents = setupIncidents.filter(
        (i) => (severityOrder[i.severity?.toLowerCase()] || 0) >= thresholdLevel
      );

      if (relevantIncidents.length === 0) {
        results.skipped++;
        continue;
      }

      // Send notification for the most severe incident
      const mostSevere = relevantIncidents.reduce((max, i) =>
        (severityOrder[i.severity?.toLowerCase()] || 0) >
        (severityOrder[max.severity?.toLowerCase()] || 0)
          ? i
          : max
      );

      try {
        const incident = {
          ...mostSevere,
          product_name: mostSevere.products?.name || "Unknown",
        };

        const result = await sendSetupNotification({
          user: user || { email: null },
          setup,
          type: "incident",
          prefs,
          data: { incident },
        });

        if (!result.skipped) {
          // Update last notified time
          await supabase
            .from("user_setups")
            .update({
              last_notified_at: now.toISOString(),
              notification_count: (setup.notification_count || 0) + 1,
            })
            .eq("id", setup.id);

          // Log notification
          await supabase.from("notification_log").insert({
            user_id: setup.user_id,
            setup_id: setup.id,
            notification_type: "incident",
            channel: prefs.email_enabled ? "email" : "telegram",
            subject: `Incident: ${incident.title}`,
            metadata: {
              incident_id: incident.id,
              severity: incident.severity,
            },
          });

          results.notified++;
        }

        results.processed++;
      } catch (error) {
        console.error(`Error notifying setup ${setup.id}:`, error);
        results.errors.push({
          setupId: setup.id,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: "Incident check complete",
      incidents: recentIncidents.length,
      ...results,
    });
  } catch (error) {
    console.error("Error in incident check cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
