import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabaseAdmin } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import { checkUnifiedAccess, getPlanLimits } from "@/libs/access";

/**
 * Setup PDF Export API
 *
 * GET /api/setups/[id]/pdf - Generate a downloadable HTML report for a setup
 */

// SECURITY: HTML escape function to prevent XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  if (typeof str !== "string") str = String(str);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// SECURITY: Validate URL for safe embedding
function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return escapeHtml(url);
  } catch {
    return "";
  }
}

// Score color based on value
function getScoreColor(score) {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#eab308"; // yellow
  if (score >= 40) return "#f97316"; // orange
  return "#ef4444"; // red
}

// Score label
function getScoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "Moyen";
  return "Faible";
}

// Format date
function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Generate SVG gauge
function generateGaugeSVG(score, size = 120) {
  const color = getScoreColor(score);
  const percentage = score / 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - percentage);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
        stroke-linecap="round" transform="rotate(-90 50 50)"/>
      <text x="50" y="50" text-anchor="middle" dy="0.35em" font-size="24" font-weight="bold" fill="${color}">${score}</text>
      <text x="50" y="68" text-anchor="middle" font-size="8" fill="#6b7280">/100</text>
    </svg>
  `;
}

// Role label in French
function getRoleLabel(role) {
  const labels = {
    wallet: "Wallet (x2)",
    exchange: "Exchange",
    defi: "DeFi",
    other: "Autre",
  };
  return labels[role] || role;
}

// Severity class
function getSeverityClass(severity) {
  const classes = {
    critical: "severity-critical",
    high: "severity-high",
    medium: "severity-medium",
    low: "severity-low",
  };
  return classes[severity?.toLowerCase()] || "severity-medium";
}

// Generate setup report HTML
function generateSetupReportHTML(setup, incidents, weaknesses) {
  const date = formatDate(new Date());
  const products = setup.productDetails || [];
  const combined = setup.combinedScore || {};

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport SafeScore - ${escapeHtml(setup.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
    .logo span { color: #1f2937; }
    .date { color: #6b7280; font-size: 14px; }
    .setup-header {
      display: flex;
      gap: 30px;
      margin-bottom: 40px;
    }
    .setup-info { flex: 1; }
    .setup-name { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
    .setup-meta { color: #6b7280; font-size: 14px; }
    .score-section {
      background: #f9fafb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #1f2937;
    }
    .score-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .score-item {
      text-align: center;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .score-value { font-size: 32px; font-weight: bold; }
    .score-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .breakdown-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .breakdown-item:last-child { border-bottom: none; }
    .breakdown-name { flex: 1; font-weight: 500; }
    .breakdown-bar {
      flex: 2;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      margin: 0 16px;
      overflow: hidden;
    }
    .breakdown-fill { height: 100%; border-radius: 4px; }
    .breakdown-score { font-weight: 600; width: 40px; text-align: right; }
    .products-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .products-table th {
      text-align: left;
      padding: 12px;
      background: #f3f4f6;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .products-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    .product-row { display: flex; align-items: center; gap: 12px; }
    .product-logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      object-fit: contain;
      background: #f3f4f6;
    }
    .product-name { font-weight: 500; }
    .role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: #e5e7eb;
      color: #374151;
    }
    .role-wallet { background: #dbeafe; color: #1d4ed8; }
    .weakness-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #fef3c7;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .weakness-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .weakness-content { flex: 1; }
    .weakness-title { font-weight: 600; color: #92400e; margin-bottom: 4px; }
    .weakness-rec { font-size: 13px; color: #78350f; }
    .incidents-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .incidents-table th {
      text-align: left;
      padding: 12px;
      background: #f3f4f6;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .incidents-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .severity {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .severity-critical { background: #fee2e2; color: #dc2626; }
    .severity-high { background: #ffedd5; color: #ea580c; }
    .severity-medium { background: #fef3c7; color: #d97706; }
    .severity-low { background: #dcfce7; color: #16a34a; }
    .methodology {
      margin-top: 30px;
      padding: 20px;
      background: #f3f4f6;
      border-radius: 8px;
    }
    .methodology h3 { font-size: 14px; margin-bottom: 12px; }
    .methodology p { font-size: 12px; color: #4b5563; margin-bottom: 8px; }
    .disclaimer {
      background: #fef3c7;
      padding: 16px;
      border-radius: 8px;
      margin-top: 30px;
      font-size: 12px;
      color: #92400e;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .no-data { color: #9ca3af; font-style: italic; padding: 16px 0; }
    @media print {
      body { padding: 20px; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Safe<span>Scoring</span></div>
    <div class="date">Rapport du ${date}</div>
  </div>

  <div class="setup-header">
    <div class="setup-info">
      <h1 class="setup-name">${escapeHtml(setup.name)}</h1>
      <p class="setup-meta">
        ${products.length} produit${products.length > 1 ? "s" : ""}
        ${setup.description ? ` - ${escapeHtml(setup.description)}` : ""}
      </p>
    </div>
    <div class="score-gauge">
      ${generateGaugeSVG(combined.note_finale || 0, 140)}
      <div style="text-align: center; margin-top: 8px; font-weight: 600; color: ${getScoreColor(combined.note_finale || 0)}">
        ${getScoreLabel(combined.note_finale || 0)}
      </div>
    </div>
  </div>

  <!-- Products -->
  <div class="score-section">
    <h2 class="section-title">Produits du Setup</h2>
    ${products.length > 0 ? `
    <table class="products-table">
      <thead>
        <tr>
          <th>Produit</th>
          <th>Type</th>
          <th>Role</th>
          <th>Score SAFE</th>
        </tr>
      </thead>
      <tbody>
        ${products.map(p => `
          <tr>
            <td>
              <div class="product-row">
                ${p.logo_url ? `<img src="${sanitizeUrl(p.logo_url)}" alt="" class="product-logo">` : ""}
                <span class="product-name">${escapeHtml(p.name)}</span>
              </div>
            </td>
            <td>${escapeHtml(p.type_name || p.type_code || "-")}</td>
            <td><span class="role-badge ${p.role === "wallet" ? "role-wallet" : ""}">${escapeHtml(getRoleLabel(p.role))}</span></td>
            <td style="font-weight: 600; color: ${getScoreColor(p.score || 0)}">${p.score || "N/A"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    ` : '<p class="no-data">Aucun produit dans ce setup</p>'}
  </div>

  <!-- SAFE Score Breakdown -->
  <div class="score-section">
    <h2 class="section-title">Score SAFE Combine</h2>
    <div class="score-grid">
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(combined.score_s || 0)}">${combined.score_s || "N/A"}</div>
        <div class="score-label">Securite</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(combined.score_a || 0)}">${combined.score_a || "N/A"}</div>
        <div class="score-label">Adversite</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(combined.score_f || 0)}">${combined.score_f || "N/A"}</div>
        <div class="score-label">Fidelite</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(combined.score_e || 0)}">${combined.score_e || "N/A"}</div>
        <div class="score-label">Efficacite</div>
      </div>
    </div>

    <div style="margin-top: 24px;">
      <div class="breakdown-item">
        <span class="breakdown-name">Securite (S)</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${combined.score_s || 0}%; background: ${getScoreColor(combined.score_s || 0)}"></div>
        </div>
        <span class="breakdown-score">${combined.score_s || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">Adversite (A)</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${combined.score_a || 0}%; background: ${getScoreColor(combined.score_a || 0)}"></div>
        </div>
        <span class="breakdown-score">${combined.score_a || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">Fidelite (F)</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${combined.score_f || 0}%; background: ${getScoreColor(combined.score_f || 0)}"></div>
        </div>
        <span class="breakdown-score">${combined.score_f || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">Efficacite (E)</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${combined.score_e || 0}%; background: ${getScoreColor(combined.score_e || 0)}"></div>
        </div>
        <span class="breakdown-score">${combined.score_e || 0}</span>
      </div>
    </div>
  </div>

  <!-- Weaknesses -->
  ${weaknesses && weaknesses.length > 0 ? `
  <div class="score-section" style="background: #fffbeb;">
    <h2 class="section-title">Points de vigilance</h2>
    ${weaknesses.map(w => `
      <div class="weakness-item">
        <svg class="weakness-icon" fill="none" viewBox="0 0 24 24" stroke="#d97706">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="weakness-content">
          <div class="weakness-title">${escapeHtml(w.title)}</div>
          <div class="weakness-rec">${escapeHtml(w.recommendation)}</div>
        </div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  <!-- Incidents -->
  ${incidents && incidents.length > 0 ? `
  <div class="score-section">
    <h2 class="section-title">Incidents recents (3 derniers mois)</h2>
    <table class="incidents-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Produit</th>
          <th>Incident</th>
          <th>Severite</th>
        </tr>
      </thead>
      <tbody>
        ${incidents.map(inc => `
          <tr>
            <td>${formatDate(inc.date)}</td>
            <td>${escapeHtml(inc.product_name)}</td>
            <td>${escapeHtml(inc.title)}</td>
            <td><span class="severity ${getSeverityClass(inc.severity)}">${escapeHtml(inc.severity?.toUpperCase() || "N/A")}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="methodology">
    <h3>Methodologie SAFE</h3>
    <p><strong>Securite (S):</strong> Mesures de securite technique, audits, bug bounties, qualite du code.</p>
    <p><strong>Adversite (A):</strong> Historique des incidents, capacites de reponse, procedures de recuperation.</p>
    <p><strong>Fidelite (F):</strong> Transparence, credibilite de l'equipe, gouvernance, conformite reglementaire.</p>
    <p><strong>Efficacite (E):</strong> Performance, experience utilisateur, scalabilite, fiabilite operationnelle.</p>
    <p style="margin-top: 12px;"><em>Les wallets ont un poids x2 dans le calcul du score combine.</em></p>
  </div>

  <div class="disclaimer">
    <strong>Avertissement:</strong> Ce rapport est fourni a titre informatif uniquement et ne constitue pas un conseil financier.
    SafeScoring evalue les aspects de securite sur la base d'informations publiques. Effectuez toujours vos propres recherches
    avant de prendre des decisions d'investissement. Les scores peuvent evoluer au fil du temps.
  </div>

  <div class="footer">
    <p>Genere par SafeScoring | safescoring.io</p>
    <p style="margin-top: 4px;">&copy; ${new Date().getFullYear()} SafeScoring. Tous droits reserves.</p>
  </div>
</body>
</html>
  `;
}

export async function GET(request, { params }) {
  try {
    // Rate limiting
    const protection = await quickProtect(request, "public");
    if (protection.blocked) {
      return protection.response;
    }

    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has PDF export access (paid feature)
    const access = await checkUnifiedAccess({ userId: session.user.id });
    const limits = getPlanLimits(access.plan);

    if (!limits.exportPDF) {
      return NextResponse.json(
        { error: "PDF export requires a paid plan", upgrade: true },
        { status: 403 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Fetch setup (verify ownership)
    const { data: setup, error } = await supabaseAdmin
      .from("user_setups")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !setup) {
      return NextResponse.json({ error: "Setup not found" }, { status: 404 });
    }

    // Extract product IDs
    const productIds = (setup.products || []).map(p => p.product_id).filter(Boolean);

    // Fetch product details
    let productDetails = [];
    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from("products")
        .select(`
          id, name, slug, logo_url,
          product_types(id, name, code),
          safe_scoring_results(note_finale, score_s, score_a, score_f, score_e)
        `)
        .in("id", productIds);

      if (products) {
        productDetails = products.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          logo_url: p.logo_url,
          type_name: p.product_types?.name,
          type_code: p.product_types?.code,
          scores: p.safe_scoring_results?.[0] || null,
          score: p.safe_scoring_results?.[0]?.note_finale || null,
          role: (setup.products || []).find(sp => sp.product_id === p.id)?.role || "other"
        }));
      }
    }

    // Calculate combined score
    let combinedScore = null;
    if (productDetails.length > 0) {
      let totalWeight = 0;
      let weightedSum = { total: 0, S: 0, A: 0, F: 0, E: 0 };

      productDetails.forEach(product => {
        if (!product.scores) return;
        const weight = product.role === "wallet" ? 2 : 1;
        totalWeight += weight;

        weightedSum.total += (product.scores.note_finale || 0) * weight;
        weightedSum.S += (product.scores.score_s || 0) * weight;
        weightedSum.A += (product.scores.score_a || 0) * weight;
        weightedSum.F += (product.scores.score_f || 0) * weight;
        weightedSum.E += (product.scores.score_e || 0) * weight;
      });

      if (totalWeight > 0) {
        combinedScore = {
          note_finale: Math.round(weightedSum.total / totalWeight),
          score_s: Math.round(weightedSum.S / totalWeight),
          score_a: Math.round(weightedSum.A / totalWeight),
          score_f: Math.round(weightedSum.F / totalWeight),
          score_e: Math.round(weightedSum.E / totalWeight),
          products_count: productDetails.length,
        };
      }
    }

    // Fetch recent incidents
    let incidents = [];
    if (productIds.length > 0) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: incidentsData } = await supabaseAdmin
        .from("security_incidents")
        .select("id, product_id, title, description, severity, date, type")
        .in("product_id", productIds)
        .gte("date", threeMonthsAgo.toISOString())
        .order("date", { ascending: false })
        .limit(10);

      if (incidentsData) {
        incidents = incidentsData.map(inc => ({
          ...inc,
          product_name: productDetails.find(p => p.id === inc.product_id)?.name || "Unknown"
        }));
      }
    }

    // Analyze weaknesses
    const weaknesses = [];

    if (combinedScore) {
      const pillars = ["S", "A", "F", "E"];
      const pillarNames = { S: "Securite", A: "Adversite", F: "Fidelite", E: "Efficacite" };
      pillars.forEach(p => {
        const score = combinedScore[`score_${p.toLowerCase()}`];
        if (score && score < 60) {
          weaknesses.push({
            type: "weak_pillar",
            title: `Pilier ${pillarNames[p]} faible (${score}/100)`,
            recommendation: `Ajoutez des produits avec un score ${pillarNames[p]} eleve pour ameliorer ce pilier.`
          });
        }
      });
    }

    const hasHardware = productDetails.some(p =>
      p.type_code === "hardware_wallet" || p.type_name?.toLowerCase().includes("hardware")
    );
    if (!hasHardware && productDetails.length > 0) {
      weaknesses.push({
        type: "no_hardware",
        title: "Pas de hardware wallet",
        recommendation: "Ajoutez un hardware wallet pour securiser vos cles privees hors ligne."
      });
    }

    if (productDetails.length === 1) {
      weaknesses.push({
        type: "single_product",
        title: "Point de defaillance unique",
        recommendation: "Diversifiez votre setup avec plusieurs produits pour reduire les risques."
      });
    }

    const allCustodial = productDetails.every(p =>
      p.type_code === "exchange" || p.type_code === "custody"
    );
    if (allCustodial && productDetails.length > 0) {
      weaknesses.push({
        type: "custody_risk",
        title: "Risque de garde totale",
        recommendation: "Ajoutez un wallet non-custodial pour garder le controle de vos cles."
      });
    }

    // Build enriched setup
    const enrichedSetup = {
      ...setup,
      productDetails,
      combinedScore,
    };

    // Generate HTML
    const html = generateSetupReportHTML(enrichedSetup, incidents, weaknesses);

    // Return as downloadable HTML
    const filename = `setup-${setup.name.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.html`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Setup PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
