import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import config from "@/config";
import { getNormStats } from "@/libs/norm-stats";
import { quickProtect } from "@/libs/api-protection";

export const dynamic = "force-dynamic";

// GET /api/reports/[slug] - Generate printable HTML report (Pro+ only)
export async function GET(request, { params }) {
  // Rate limit: authenticated, resource-intensive
  const protection = await quickProtect(request, "standard");
  if (protection.blocked) return protection.response;

  try {
    const { slug } = await params;

    // Auth required
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Plan check: Pro or Enterprise only
    const planType = session.user.planType?.toLowerCase() || "free";
    if (planType !== "professional" && planType !== "enterprise") {
      return NextResponse.json(
        { error: "PDF reports require a Professional or Enterprise plan" },
        { status: 403 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Fetch product
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, url, type_id, description, short_description")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch type
    let typeName = "Crypto Product";
    if (product.type_id) {
      const { data: typeData } = await supabaseAdmin
        .from("product_types")
        .select("name")
        .eq("id", product.type_id)
        .maybeSingle();
      if (typeData) typeName = typeData.name;
    }

    // Fetch scores
    const { data: scoreData } = await supabaseAdmin
      .from("safe_scoring_results")
      .select("note_finale, score_s, score_a, score_f, score_e, calculated_at, total_norms_evaluated, total_yes, total_no, total_na")
      .eq("product_id", product.id)
      .order("calculated_at", { ascending: false })
      .limit(1);

    const score = scoreData?.[0] || {};
    const total = Math.round(score.note_finale || 0);
    const s = Math.round(score.score_s || 0);
    const a = Math.round(score.score_a || 0);
    const f = Math.round(score.score_f || 0);
    const e = Math.round(score.score_e || 0);

    const getScoreLabel = (val) => {
      if (val >= 80) return "Strong";
      if (val >= 60) return "Moderate";
      if (val >= 40) return "Average";
      return "Developing";
    };

    const getScoreColor = (val) => {
      if (val >= 80) return "#22c55e";
      if (val >= 60) return "#f59e0b";
      return "#ef4444";
    };

    const pillars = [
      { code: "S", name: "Security", score: s, color: config.safe.pillars[0]?.color || "#22c55e" },
      { code: "A", name: "Adversity", score: a, color: config.safe.pillars[1]?.color || "#f59e0b" },
      { code: "F", name: "Fidelity", score: f, color: config.safe.pillars[2]?.color || "#3b82f6" },
      { code: "E", name: "Efficiency", score: e, color: config.safe.pillars[3]?.color || "#8b5cf6" },
    ];

    const generatedAt = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    const scoreDate = score.calculated_at
      ? new Date(score.calculated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : generatedAt;

    // Get norm stats for the report footer
    const normStats = await getNormStats();

    // White-label support (Enterprise only)
    const url = new URL(request.url);
    const isEnterprise = planType === "enterprise";
    const brandName = isEnterprise ? (url.searchParams.get("brand_name") || "SafeScoring") : "SafeScoring";
    const brandColor = isEnterprise ? (url.searchParams.get("brand_color") || "#6366f1") : "#6366f1";
    const brandLogo = isEnterprise ? url.searchParams.get("brand_logo") : null;
    const hideSafeScoring = isEnterprise && url.searchParams.get("hide_safescoring") === "true";
    const footerBrand = hideSafeScoring ? brandName : "SafeScoring";
    const footerDomain = hideSafeScoring ? "" : " (safescoring.io)";

    // Build HTML report
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${product.name} - SAFE Score Report | ${brandName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${brandColor}; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 24px; }
    .header .brand { color: ${brandColor}; font-weight: 800; font-size: 18px; }
    .header .brand-logo { height: 28px; margin-right: 8px; vertical-align: middle; }
    .meta { color: #666; font-size: 13px; margin-bottom: 30px; }
    .score-hero { text-align: center; padding: 30px; background: #f8f9fa; border-radius: 12px; margin-bottom: 30px; }
    .score-number { font-size: 64px; font-weight: 800; color: ${getScoreColor(total)}; }
    .score-label { font-size: 18px; color: #666; margin-top: 4px; }
    .pillars { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; }
    .pillar { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .pillar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .pillar-code { font-size: 20px; font-weight: 800; }
    .pillar-score { font-size: 20px; font-weight: 700; }
    .pillar-name { font-size: 13px; color: #666; }
    .bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
    .stat { text-align: center; padding: 12px; background: #f8f9fa; border-radius: 8px; }
    .stat-value { font-size: 20px; font-weight: 700; }
    .stat-label { font-size: 11px; color: #666; text-transform: uppercase; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px; color: #999; font-size: 12px; text-align: center; }
    .description { color: #444; line-height: 1.6; margin-bottom: 30px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${product.name}</h1>
    <div class="brand">${brandLogo ? `<img src="${brandLogo}" alt="" class="brand-logo">` : ""}${brandName}</div>
  </div>

  <div class="meta">
    <strong>${typeName}</strong> &middot; Score calculated: ${scoreDate} &middot; Report generated: ${generatedAt}
  </div>

  <div class="score-hero">
    <div class="score-number">${total}</div>
    <div class="score-label">SAFE Score &middot; ${getScoreLabel(total)}</div>
  </div>

  ${product.description || product.short_description ? `<div class="description">${(product.short_description || product.description).substring(0, 300)}</div>` : ""}

  <h2 style="margin-bottom: 16px; font-size: 18px;">Pillar Breakdown</h2>
  <div class="pillars">
    ${pillars.map(p => `
      <div class="pillar">
        <div class="pillar-header">
          <div>
            <span class="pillar-code" style="color: ${p.color}">${p.code}</span>
            <span class="pillar-name" style="margin-left: 8px">${p.name}</span>
          </div>
          <span class="pillar-score" style="color: ${getScoreColor(p.score)}">${p.score}%</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width: ${p.score}%; background: ${p.color}"></div></div>
      </div>
    `).join("")}
  </div>

  <h2 style="margin-bottom: 16px; font-size: 18px;">Evaluation Summary</h2>
  <div class="stats">
    <div class="stat">
      <div class="stat-value">${score.total_norms_evaluated || 0}</div>
      <div class="stat-label">Norms</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #22c55e">${score.total_yes || 0}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #ef4444">${score.total_no || 0}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #999">${score.total_na || 0}</div>
      <div class="stat-label">N/A</div>
    </div>
  </div>

  <div class="footer">
    <p>This report was generated by ${footerBrand}${footerDomain} for ${session.user.email || "authorized user"}.</p>
    <p style="margin-top: 4px;">SAFE methodology: ${normStats?.totalNorms || "comprehensive"} security norms across Security, Adversity, Fidelity & Efficiency.</p>
    <p style="margin-top: 4px;">Scores reflect SafeScoring&rsquo;s evaluation methodology and do not guarantee security or predict future incidents. Not financial, investment, or security advice.</p>
    <p style="margin-top: 4px; color: #ccc;">Confidential &middot; Not for redistribution</p>
  </div>

  <script>
    // Show print button instead of auto-printing
    var btn = document.createElement('button');
    btn.textContent = 'Print / Save as PDF';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 24px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
    btn.onclick = function() { btn.style.display='none'; window.print(); btn.style.display='block'; };
    document.body.appendChild(btn);
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${slug}-safe-report.html"`,
      },
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
