import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get setup
    const { data: setup, error: setupError } = await supabaseAdmin
      .from("user_setups")
      .select("id, products")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (setupError || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    // Extract product IDs
    const productIds = (setup.products || [])
      .map((p) => (typeof p === "object" ? p.id || p.product_id : p))
      .filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json({ incidents: [], total: 0 });
    }

    // Fetch incidents that affect setup's products
    const { data: incidents, error: incError } = await supabaseAdmin
      .from("security_incidents")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (incError) throw incError;

    // Filter incidents that affect at least one product in the setup
    const relevantIncidents = (incidents || []).filter((incident) => {
      const affectedIds = incident.affected_product_ids || [];
      return affectedIds.some((aid) => productIds.includes(aid));
    });

    // Enrich with impact info
    const enriched = relevantIncidents.map((inc) => {
      const affectedInSetup = (inc.affected_product_ids || []).filter((aid) =>
        productIds.includes(aid)
      );
      return {
        id: inc.id,
        title: inc.title,
        description: inc.description,
        severity: inc.severity,
        type: inc.type,
        funds_lost: inc.funds_lost,
        response_quality: inc.response_quality,
        created_at: inc.created_at,
        affected_products_in_setup: affectedInSetup.length,
      };
    });

    return NextResponse.json({
      incidents: enriched,
      total: enriched.length,
      severity_summary: {
        critical: enriched.filter((i) => i.severity === "critical").length,
        high: enriched.filter((i) => i.severity === "high").length,
        medium: enriched.filter((i) => i.severity === "medium").length,
        low: enriched.filter((i) => i.severity === "low").length,
      },
    });
  } catch (error) {
    console.error("Setup incidents error:", error);
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
  }
}
