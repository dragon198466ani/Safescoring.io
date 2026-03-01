import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";
import config from "@/config";

/**
 * Product PDF Export API
 *
 * GET /api/products/[slug]/pdf - Generate a downloadable HTML report for a product
 * FREE ACCESS - No authentication required
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

// Score label in French
function getScoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "Moyen";
  return "Faible";
}

// Format date in French
function formatDate(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format currency
function formatCurrency(amount) {
  if (!amount || amount === 0) return "N/A";
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

// Generate SVG gauge
function generateGaugeSVG(score, size = 120) {
  const safeScore = score || 0;
  const color = getScoreColor(safeScore);
  const percentage = safeScore / 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - percentage);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}"
        stroke-linecap="round" transform="rotate(-90 50 50)"/>
      <text x="50" y="50" text-anchor="middle" dy="0.35em" font-size="24" font-weight="bold" fill="${color}">${safeScore}</text>
      <text x="50" y="68" text-anchor="middle" font-size="8" fill="#6b7280">/100</text>
    </svg>
  `;
}

// Severity class for incidents
function getSeverityClass(severity) {
  const classes = {
    critical: "severity-critical",
    high: "severity-high",
    medium: "severity-medium",
    low: "severity-low",
  };
  return classes[severity?.toLowerCase()] || "severity-medium";
}

// Severity label in French
function getSeverityLabel(severity) {
  const labels = {
    critical: "Critique",
    high: "Eleve",
    medium: "Moyen",
    low: "Faible",
  };
  return labels[severity?.toLowerCase()] || severity || "N/A";
}

// Result color class
function getResultClass(result) {
  if (result === "YES" || result === "YESp" || result === "OUI") return "result-yes";
  if (result === "NO" || result === "N" || result === "NON") return "result-no";
  return "result-na";
}

// Result label in French
function getResultLabel(result) {
  if (result === "YES" || result === "YESp") return "OUI";
  if (result === "NO" || result === "N") return "NON";
  if (result === "N/A" || result === "TBD") return "N/A";
  return result || "N/A";
}

// Pillar name in French
function getPillarName(pillarCode) {
  const names = {
    S: "Securite",
    A: "Adversite",
    F: "Fidelite",
    E: "Efficacite",
  };
  return names[pillarCode] || pillarCode;
}

// Get pillar color from config
function getPillarColor(pillarCode) {
  const pillar = config.safe.pillars.find((p) => p.code === pillarCode);
  return pillar?.color || "#6b7280";
}

// Generate product report HTML
function generateProductReportHTML(product, scores, evaluations, incidents, history) {
  const date = formatDate(new Date());
  const typeName = product.types?.[0]?.name || product.type_name || "Produit Crypto";

  // Organize evaluations by pillar
  const pillarEvaluations = { S: [], A: [], F: [], E: [] };
  (evaluations || []).forEach((ev) => {
    const pillar = ev.norms?.pillar;
    if (pillar && pillarEvaluations[pillar]) {
      pillarEvaluations[pillar].push({
        code: ev.norms?.code || "",
        title: ev.norms?.title || "",
        result: ev.result,
        reason: ev.why_this_result || "",
      });
    }
  });

  // Sort evaluations by code within each pillar
  Object.keys(pillarEvaluations).forEach((pillar) => {
    pillarEvaluations[pillar].sort((a, b) => a.code.localeCompare(b.code));
  });

  // Calculate evaluation stats
  const totalEvaluations = evaluations?.length || 0;
  const yesCount = evaluations?.filter((e) => e.result === "YES" || e.result === "YESp").length || 0;
  const noCount = evaluations?.filter((e) => e.result === "NO" || e.result === "N").length || 0;
  const naCount = evaluations?.filter((e) => e.result === "N/A" || e.result === "TBD").length || 0;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport SafeScore - ${escapeHtml(product.name)}</title>
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
    .product-header {
      display: flex;
      gap: 30px;
      margin-bottom: 40px;
    }
    .product-info { flex: 1; }
    .product-name { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
    .product-type {
      display: inline-block;
      background: #e5e7eb;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #374151;
      margin-bottom: 12px;
    }
    .product-desc { color: #4b5563; font-size: 14px; margin-bottom: 12px; }
    .product-url { font-size: 12px; color: #6366f1; word-break: break-all; }
    .score-gauge { text-align: center; }
    .score-label { font-size: 14px; font-weight: 600; margin-top: 8px; }
    .section {
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
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title .pillar-badge {
      display: inline-block;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      text-align: center;
      line-height: 28px;
      font-weight: bold;
      color: white;
      font-size: 14px;
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
    .score-name { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .stat-item {
      text-align: center;
      padding: 12px;
      background: white;
      border-radius: 8px;
    }
    .stat-value { font-size: 20px; font-weight: bold; color: #1f2937; }
    .stat-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
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
    .norms-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 13px;
    }
    .norms-table th {
      text-align: left;
      padding: 10px 8px;
      background: #f3f4f6;
      font-size: 11px;
      text-transform: uppercase;
      color: #6b7280;
      font-weight: 600;
    }
    .norms-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .norms-table tr:last-child td { border-bottom: none; }
    .norm-code {
      font-family: monospace;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
    }
    .norm-title { color: #1f2937; }
    .norm-reason {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
      max-width: 300px;
    }
    .result {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      min-width: 40px;
    }
    .result-yes { background: #dcfce7; color: #16a34a; }
    .result-no { background: #fee2e2; color: #dc2626; }
    .result-na { background: #f3f4f6; color: #6b7280; }
    .incidents-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .incidents-table th {
      text-align: left;
      padding: 12px;
      background: #f3f4f6;
      font-size: 11px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .incidents-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
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
    .history-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .history-table th {
      text-align: center;
      padding: 10px;
      background: #f3f4f6;
      font-size: 11px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .history-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      text-align: center;
      font-size: 13px;
    }
    .trend-up { color: #16a34a; }
    .trend-down { color: #dc2626; }
    .trend-stable { color: #6b7280; }
    .methodology {
      margin-top: 30px;
      padding: 20px;
      background: #f3f4f6;
      border-radius: 8px;
    }
    .methodology h3 { font-size: 14px; margin-bottom: 12px; }
    .methodology p { font-size: 12px; color: #4b5563; margin-bottom: 8px; }
    .methodology .pillar-desc {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    .methodology .pillar-code {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      text-align: center;
      line-height: 20px;
      font-weight: bold;
      color: white;
      font-size: 11px;
      flex-shrink: 0;
    }
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
    .no-data { color: #9ca3af; font-style: italic; padding: 16px 0; text-align: center; }
    .page-break { page-break-before: always; }
    @media print {
      body { padding: 20px; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Safe<span>Scoring</span></div>
    <div class="date">Rapport du ${date}</div>
  </div>

  <div class="product-header">
    <div class="product-info">
      <h1 class="product-name">${escapeHtml(product.name)}</h1>
      <span class="product-type">${escapeHtml(typeName)}</span>
      ${product.description ? `<p class="product-desc">${escapeHtml(product.description.substring(0, 300))}${product.description.length > 300 ? "..." : ""}</p>` : ""}
      ${product.url ? `<p class="product-url">${sanitizeUrl(product.url)}</p>` : ""}
    </div>
    <div class="score-gauge">
      ${generateGaugeSVG(scores?.note_finale || 0, 140)}
      <div class="score-label" style="color: ${getScoreColor(scores?.note_finale || 0)}">
        ${getScoreLabel(scores?.note_finale || 0)}
      </div>
    </div>
  </div>

  <!-- SAFE Score Breakdown -->
  <div class="section">
    <h2 class="section-title">Score SAFE</h2>
    <div class="score-grid">
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(scores?.score_s || 0)}">${scores?.score_s || "N/A"}</div>
        <div class="score-name">Securite (S)</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(scores?.score_a || 0)}">${scores?.score_a || "N/A"}</div>
        <div class="score-name">Adversite (A)</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(scores?.score_f || 0)}">${scores?.score_f || "N/A"}</div>
        <div class="score-name">Fidelite (F)</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(scores?.score_e || 0)}">${scores?.score_e || "N/A"}</div>
        <div class="score-name">Efficacite (E)</div>
      </div>
    </div>

    <div style="margin-top: 24px;">
      <div class="breakdown-item">
        <span class="breakdown-name">Securite (S)</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${scores?.score_s || 0}%; background: ${getPillarColor("S")}"></div>
        </div>
        <span class="breakdown-score">${scores?.score_s || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">Adversite (A)</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${scores?.score_a || 0}%; background: ${getPillarColor("A")}"></div>
        </div>
        <span class="breakdown-score">${scores?.score_a || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">Fidelite (F)</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${scores?.score_f || 0}%; background: ${getPillarColor("F")}"></div>
        </div>
        <span class="breakdown-score">${scores?.score_f || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">Efficacite (E)</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${scores?.score_e || 0}%; background: ${getPillarColor("E")}"></div>
        </div>
        <span class="breakdown-score">${scores?.score_e || 0}</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">${totalEvaluations}</div>
        <div class="stat-label">Normes evaluees</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #16a34a">${yesCount}</div>
        <div class="stat-label">Conformes</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #dc2626">${noCount}</div>
        <div class="stat-label">Non conformes</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: #6b7280">${naCount}</div>
        <div class="stat-label">Non applicables</div>
      </div>
    </div>
  </div>

  <!-- Evaluated Norms by Pillar -->
  ${["S", "A", "F", "E"]
    .map((pillar) => {
      const evals = pillarEvaluations[pillar];
      if (!evals || evals.length === 0) return "";

      return `
  <div class="section">
    <h2 class="section-title">
      <span class="pillar-badge" style="background: ${getPillarColor(pillar)}">${pillar}</span>
      Normes ${getPillarName(pillar)} (${evals.length})
    </h2>
    <table class="norms-table">
      <thead>
        <tr>
          <th style="width: 60px;">Code</th>
          <th>Norme</th>
          <th style="width: 70px;">Resultat</th>
        </tr>
      </thead>
      <tbody>
        ${evals
          .map(
            (ev) => `
          <tr>
            <td class="norm-code">${escapeHtml(ev.code)}</td>
            <td>
              <div class="norm-title">${escapeHtml(ev.title)}</div>
              ${ev.reason ? `<div class="norm-reason">${escapeHtml(ev.reason.substring(0, 150))}${ev.reason.length > 150 ? "..." : ""}</div>` : ""}
            </td>
            <td><span class="result ${getResultClass(ev.result)}">${getResultLabel(ev.result)}</span></td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>
  `;
    })
    .join("")}

  <!-- Security Incidents -->
  <div class="section">
    <h2 class="section-title">Incidents de Securite</h2>
    ${
      incidents && incidents.length > 0
        ? `
    <table class="incidents-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Incident</th>
          <th>Severite</th>
          <th>Fonds perdus</th>
        </tr>
      </thead>
      <tbody>
        ${incidents
          .slice(0, 20)
          .map(
            (inc) => `
          <tr>
            <td>${formatDate(inc.incident_date)}</td>
            <td>${escapeHtml(inc.incident_type || "N/A")}</td>
            <td>${escapeHtml(inc.title || "N/A")}</td>
            <td><span class="severity ${getSeverityClass(inc.severity)}">${getSeverityLabel(inc.severity)}</span></td>
            <td>${formatCurrency(inc.funds_lost_usd || 0)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    ${incidents.length > 20 ? `<p style="margin-top: 12px; color: #6b7280; font-size: 12px;">... et ${incidents.length - 20} autres incidents</p>` : ""}
    `
        : '<p class="no-data">Aucun incident de securite enregistre pour ce produit.</p>'
    }
  </div>

  <!-- Score History -->
  ${
    history && history.length > 0
      ? `
  <div class="section">
    <h2 class="section-title">Evolution du Score</h2>
    <table class="history-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>SAFE</th>
          <th>S</th>
          <th>A</th>
          <th>F</th>
          <th>E</th>
          <th>Evolution</th>
        </tr>
      </thead>
      <tbody>
        ${history
          .slice(0, 12)
          .map(
            (h) => `
          <tr>
            <td>${formatDate(h.recorded_at)}</td>
            <td style="font-weight: 600; color: ${getScoreColor(h.safe_score)}">${h.safe_score || "N/A"}</td>
            <td>${h.score_s || "-"}</td>
            <td>${h.score_a || "-"}</td>
            <td>${h.score_f || "-"}</td>
            <td>${h.score_e || "-"}</td>
            <td class="${h.score_change > 0 ? "trend-up" : h.score_change < 0 ? "trend-down" : "trend-stable"}">
              ${h.score_change > 0 ? "+" : ""}${h.score_change || "-"}
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>
  `
      : ""
  }

  <div class="methodology">
    <h3>Methodologie SAFE</h3>
    <p style="margin-bottom: 16px;">Le score SAFE evalue la securite des produits crypto selon 4 piliers complementaires :</p>
    ${config.safe.pillars
      .map(
        (p) => `
      <div class="pillar-desc">
        <span class="pillar-code" style="background: ${p.color}">${p.code}</span>
        <span><strong>${p.name}:</strong> ${escapeHtml(p.description)}</span>
      </div>
    `
      )
      .join("")}
    <p style="margin-top: 16px;"><em>Total: ${config.safe.stats.totalNorms} normes issues de standards internationaux (NIST, OWASP, ISO, WCAG, etc.)</em></p>
  </div>

  <div class="disclaimer">
    <strong>Avertissement:</strong> Ce rapport est fourni a titre informatif uniquement et ne constitue pas un conseil financier.
    SafeScoring evalue les aspects de securite sur la base d'informations publiques et d'analyses automatisees.
    Effectuez toujours vos propres recherches avant de prendre des decisions d'investissement.
    Les scores peuvent evoluer au fil du temps en fonction des mises a jour des produits et des nouvelles informations disponibles.
  </div>

  <div class="footer">
    <p>Genere par SafeScoring | safescoring.io</p>
    <p style="margin-top: 4px;">&copy; ${new Date().getFullYear()} SafeScoring. Tous droits reserves.</p>
    <p style="margin-top: 8px; font-size: 10px; color: #9ca3af;">
      Donnees mises a jour quotidiennement. Derniere evaluation: ${formatDate(scores?.calculated_at)}
    </p>
  </div>
</body>
</html>
  `;
}

export async function GET(request, { params }) {
  try {
    // Rate limiting (public - free access)
    const protection = await quickProtect(request, "public");
    if (protection.blocked) {
      return protection.response;
    }

    const { slug } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Fetch product with basic info
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        url,
        description,
        short_description,
        price_eur,
        price_details
      `)
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch all related data in parallel
    const [scoresResult, typesResult, evaluationsResult, incidentsResult, historyResult] = await Promise.all([
      // Scores
      supabase
        .from("safe_scoring_results")
        .select("note_finale, score_s, score_a, score_f, score_e, calculated_at")
        .eq("product_id", product.id)
        .maybeSingle(),

      // Product types
      supabase
        .from("product_type_mapping")
        .select(`
          is_primary,
          product_types (id, code, name)
        `)
        .eq("product_id", product.id)
        .eq("is_primary", true)
        .maybeSingle(),

      // Evaluations with norms
      supabase
        .from("evaluations")
        .select(`
          id,
          result,
          why_this_result,
          norms (id, code, pillar, title)
        `)
        .eq("product_id", product.id),

      // Security incidents
      supabase
        .from("incident_product_impact")
        .select(`
          impact_level,
          funds_lost_usd,
          security_incidents!inner (
            id,
            title,
            description,
            incident_type,
            severity,
            incident_date,
            funds_lost_usd,
            status,
            is_published
          )
        `)
        .eq("product_id", product.id)
        .eq("security_incidents.is_published", true),

      // Score history
      supabase
        .from("score_history")
        .select(`
          recorded_at,
          safe_score,
          score_s,
          score_a,
          score_f,
          score_e,
          score_change
        `)
        .eq("product_id", product.id)
        .order("recorded_at", { ascending: false })
        .limit(12),
    ]);

    // Process results
    const scores = scoresResult.data || null;

    const productWithTypes = {
      ...product,
      types: typesResult.data?.product_types ? [typesResult.data.product_types] : [],
      type_name: typesResult.data?.product_types?.name || null,
    };

    const evaluations = evaluationsResult.data || [];

    // Flatten incidents
    const incidents = (incidentsResult.data || [])
      .filter((item) => item.security_incidents?.is_published)
      .map((item) => ({
        ...item.security_incidents,
        impact_level: item.impact_level,
        product_funds_lost: item.funds_lost_usd,
      }))
      .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date));

    const history = historyResult.data || [];

    // Generate HTML
    const html = generateProductReportHTML(
      productWithTypes,
      scores,
      evaluations,
      incidents,
      history
    );

    // Return as downloadable HTML
    const filename = `safescore-${slug}-${new Date().toISOString().split("T")[0]}.html`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Product PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
