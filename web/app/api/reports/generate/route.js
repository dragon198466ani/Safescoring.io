import { NextResponse } from "next/server";

import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { quickProtect } from "@/libs/api-protection";

/**
 * SECURITY: HTML escape function to prevent XSS
 */
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

/**
 * SECURITY: Validate URL for safe embedding in HTML
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return escapeHtml(url);
  } catch {
    return "";
  }
}

/**
 * PDF Report Generation API
 *
 * POST - Generate a professional PDF report for a product
 *
 * Supports:
 * - Single product reports
 * - Comparison reports
 * - Custom branding (Pro/Enterprise)
 */

// Generate score color
function getScoreColor(score) {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#eab308"; // yellow
  if (score >= 40) return "#f97316"; // orange
  return "#ef4444"; // red
}

// Generate score label
function getScoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

// Format date
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
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

// Generate HTML report content
function generateReportHTML(product, options = {}) {
  const {
    includeIncidents = true,
    includeHistory = false,
    customLogo = null,
    companyName = null,
  } = options;

  const scores = product.scores || {};
  const date = formatDate(new Date());

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SafeScore Report - ${escapeHtml(product.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
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
      background: #f3f4f6;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .product-desc { margin-top: 16px; color: #4b5563; }
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
    .score-value {
      font-size: 32px;
      font-weight: bold;
    }
    .score-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
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
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .disclaimer {
      background: #fef3c7;
      padding: 16px;
      border-radius: 8px;
      margin-top: 30px;
      font-size: 12px;
      color: #92400e;
    }
    .methodology {
      margin-top: 30px;
      padding: 20px;
      background: #f3f4f6;
      border-radius: 8px;
    }
    .methodology h3 { font-size: 14px; margin-bottom: 12px; }
    .methodology p { font-size: 12px; color: #4b5563; margin-bottom: 8px; }
    @media print {
      body { padding: 20px; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      ${customLogo ? `<img src="${sanitizeUrl(customLogo)}" alt="Logo" height="32">` : ""}
      ${companyName ? escapeHtml(companyName) : "Safe<span>Scoring</span>"}
    </div>
    <div class="date">Report generated: ${date}</div>
  </div>

  <div class="product-header">
    <div class="product-info">
      <h1 class="product-name">${escapeHtml(product.name)}</h1>
      <span class="product-type">${escapeHtml(product.type || "Crypto Product")}</span>
      ${product.description ? `<p class="product-desc">${escapeHtml(product.description)}</p>` : ""}
      ${product.website ? `<p style="margin-top: 8px; font-size: 14px;"><a href="${sanitizeUrl(product.website)}">${escapeHtml(product.website)}</a></p>` : ""}
    </div>
    <div class="score-gauge">
      ${generateGaugeSVG(product.score || 0, 140)}
      <div style="text-align: center; margin-top: 8px; font-weight: 600; color: ${getScoreColor(product.score || 0)}">
        ${getScoreLabel(product.score || 0)}
      </div>
    </div>
  </div>

  <div class="score-section">
    <h2 class="section-title">SAFE Score Breakdown</h2>
    <div class="score-grid">
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(scores.s || 0)}">${scores.s || "N/A"}</div>
        <div class="score-label">Security</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(scores.a || 0)}">${scores.a || "N/A"}</div>
        <div class="score-label">Adversity</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(scores.f || 0)}">${scores.f || "N/A"}</div>
        <div class="score-label">Fidelity</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: ${getScoreColor(scores.e || 0)}">${scores.e || "N/A"}</div>
        <div class="score-label">Efficiency</div>
      </div>
    </div>

    <div style="margin-top: 24px;">
      <div class="breakdown-item">
        <span class="breakdown-name">🔒 Security</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${scores.s || 0}%; background: ${getScoreColor(scores.s || 0)}"></div>
        </div>
        <span class="breakdown-score">${scores.s || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">🛡️ Adversity</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${scores.a || 0}%; background: ${getScoreColor(scores.a || 0)}"></div>
        </div>
        <span class="breakdown-score">${scores.a || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">🤝 Fidelity</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${scores.f || 0}%; background: ${getScoreColor(scores.f || 0)}"></div>
        </div>
        <span class="breakdown-score">${scores.f || 0}</span>
      </div>
      <div class="breakdown-item">
        <span class="breakdown-name">⚡ Efficiency</span>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${scores.e || 0}%; background: ${getScoreColor(scores.e || 0)}"></div>
        </div>
        <span class="breakdown-score">${scores.e || 0}</span>
      </div>
    </div>
  </div>

  ${includeIncidents && product.incidents && product.incidents.length > 0 ? `
  <div class="score-section">
    <h2 class="section-title">Security Incidents</h2>
    <table class="incidents-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Incident</th>
          <th>Severity</th>
          <th>Impact</th>
        </tr>
      </thead>
      <tbody>
        ${product.incidents.map(inc => `
          <tr>
            <td>${formatDate(inc.date)}</td>
            <td>${escapeHtml(inc.title)}</td>
            <td><span class="severity severity-${escapeHtml(inc.severity)}">${escapeHtml(inc.severity?.toUpperCase())}</span></td>
            <td>${inc.fundsLost ? `$${Number(inc.fundsLost).toLocaleString()}` : "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="methodology">
    <h3>SAFE Methodology</h3>
    <p><strong>Security (S):</strong> Evaluates technical security measures, audits, bug bounties, and code quality.</p>
    <p><strong>Adversity (A):</strong> Assesses incident history, response capabilities, and recovery procedures.</p>
    <p><strong>Fidelity (F):</strong> Measures transparency, team credibility, governance, and regulatory compliance.</p>
    <p><strong>Efficiency (E):</strong> Analyzes performance, user experience, scalability, and operational reliability.</p>
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute financial advice.
    SafeScoring evaluates security aspects based on publicly available information. Always conduct your own research
    before making investment decisions. Scores are subject to change as new information becomes available.
  </div>

  <div class="footer">
    <p>Generated by SafeScoring | safescoring.io</p>
    <p style="margin-top: 4px;">© ${new Date().getFullYear()} SafeScoring. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

// Generate comparison report HTML
function generateComparisonHTML(products, options = {}) {
  const date = formatDate(new Date());
  const [p1, p2] = products;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SafeScore Comparison - ${escapeHtml(p1.name)} vs ${escapeHtml(p2.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
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
    .title { text-align: center; margin-bottom: 40px; }
    .title h1 { font-size: 32px; margin-bottom: 8px; }
    .vs { color: #6b7280; font-size: 14px; }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 80px 1fr;
      gap: 24px;
      margin-bottom: 40px;
    }
    .product-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    .product-card.winner {
      border: 2px solid #22c55e;
      background: #f0fdf4;
    }
    .winner-badge {
      background: #22c55e;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-bottom: 12px;
      display: inline-block;
    }
    .product-card h2 { font-size: 20px; margin-bottom: 16px; }
    .divider {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      color: #6b7280;
    }
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }
    .comparison-table th {
      text-align: left;
      padding: 16px;
      background: #f3f4f6;
      font-size: 14px;
    }
    .comparison-table td {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      text-align: center;
    }
    .comparison-table td:first-child { text-align: left; font-weight: 500; }
    .better { color: #22c55e; font-weight: 600; }
    .worse { color: #ef4444; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Safe<span>Scoring</span></div>
    <div class="date">Report generated: ${date}</div>
  </div>

  <div class="title">
    <h1>Comparison Report</h1>
    <p class="vs">${escapeHtml(p1.name)} vs ${escapeHtml(p2.name)}</p>
  </div>

  <div class="comparison-grid">
    <div class="product-card ${p1.score >= p2.score ? 'winner' : ''}">
      ${p1.score >= p2.score ? '<span class="winner-badge">WINNER</span>' : ''}
      <h2>${escapeHtml(p1.name)}</h2>
      ${generateGaugeSVG(p1.score || 0, 120)}
      <p style="margin-top: 12px; color: ${getScoreColor(p1.score || 0)}; font-weight: 600;">
        ${getScoreLabel(p1.score || 0)}
      </p>
    </div>
    <div class="divider">VS</div>
    <div class="product-card ${p2.score > p1.score ? 'winner' : ''}">
      ${p2.score > p1.score ? '<span class="winner-badge">WINNER</span>' : ''}
      <h2>${escapeHtml(p2.name)}</h2>
      ${generateGaugeSVG(p2.score || 0, 120)}
      <p style="margin-top: 12px; color: ${getScoreColor(p2.score || 0)}; font-weight: 600;">
        ${getScoreLabel(p2.score || 0)}
      </p>
    </div>
  </div>

  <table class="comparison-table">
    <thead>
      <tr>
        <th>Metric</th>
        <th>${escapeHtml(p1.name)}</th>
        <th>${escapeHtml(p2.name)}</th>
        <th>Difference</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Overall Score</td>
        <td class="${p1.score >= p2.score ? 'better' : ''}">${p1.score || 0}</td>
        <td class="${p2.score > p1.score ? 'better' : ''}">${p2.score || 0}</td>
        <td>${Math.abs((p1.score || 0) - (p2.score || 0))} pts</td>
      </tr>
      <tr>
        <td>🔒 Security</td>
        <td class="${(p1.scores?.s || 0) >= (p2.scores?.s || 0) ? 'better' : ''}">${p1.scores?.s || 0}</td>
        <td class="${(p2.scores?.s || 0) > (p1.scores?.s || 0) ? 'better' : ''}">${p2.scores?.s || 0}</td>
        <td>${Math.abs((p1.scores?.s || 0) - (p2.scores?.s || 0))} pts</td>
      </tr>
      <tr>
        <td>🛡️ Adversity</td>
        <td class="${(p1.scores?.a || 0) >= (p2.scores?.a || 0) ? 'better' : ''}">${p1.scores?.a || 0}</td>
        <td class="${(p2.scores?.a || 0) > (p1.scores?.a || 0) ? 'better' : ''}">${p2.scores?.a || 0}</td>
        <td>${Math.abs((p1.scores?.a || 0) - (p2.scores?.a || 0))} pts</td>
      </tr>
      <tr>
        <td>🤝 Fidelity</td>
        <td class="${(p1.scores?.f || 0) >= (p2.scores?.f || 0) ? 'better' : ''}">${p1.scores?.f || 0}</td>
        <td class="${(p2.scores?.f || 0) > (p1.scores?.f || 0) ? 'better' : ''}">${p2.scores?.f || 0}</td>
        <td>${Math.abs((p1.scores?.f || 0) - (p2.scores?.f || 0))} pts</td>
      </tr>
      <tr>
        <td>⚡ Efficiency</td>
        <td class="${(p1.scores?.e || 0) >= (p2.scores?.e || 0) ? 'better' : ''}">${p1.scores?.e || 0}</td>
        <td class="${(p2.scores?.e || 0) > (p1.scores?.e || 0) ? 'better' : ''}">${p2.scores?.e || 0}</td>
        <td>${Math.abs((p1.scores?.e || 0) - (p2.scores?.e || 0))} pts</td>
      </tr>
      <tr>
        <td>Type</td>
        <td>${escapeHtml(p1.type || "N/A")}</td>
        <td>${escapeHtml(p2.type || "N/A")}</td>
        <td>-</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Generated by SafeScoring | safescoring.io</p>
    <p style="margin-top: 4px;">© ${new Date().getFullYear()} SafeScoring. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

export async function POST(request) {
  try {
    // SECURITY: Strict rate limiting - report generation is CPU intensive
    // Use "sensitive" limit type (stricter than public)
    const protection = await quickProtect(request, "sensitive");
    if (protection.blocked) {
      return protection.response;
    }

    const {
      slug,
      slugs, // For comparison
      format = "html", // html or pdf (pdf requires external service)
      includeIncidents = true,
      includeHistory = false,
      customLogo,
      companyName,
    } = await request.json();

    if (!slug && (!slugs || slugs.length < 2)) {
      return NextResponse.json(
        { error: "Product slug or slugs array required" },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Return mock data for demo
      const mockProduct = {
        slug: slug || slugs[0],
        name: slug ? slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Demo Product",
        type: "hardware-wallet",
        score: 85,
        scores: { s: 90, a: 80, f: 85, e: 85 },
        description: "Demo product for PDF report generation.",
        incidents: [],
      };

      const html = generateReportHTML(mockProduct, {
        includeIncidents,
        includeHistory,
        customLogo,
        companyName,
      });

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `inline; filename="safescore-${slug || 'report'}.html"`,
        },
      });
    }

    // Comparison report
    if (slugs && slugs.length >= 2) {
      const products = [];

      for (const s of slugs.slice(0, 2)) {
        const { data: product } = await supabase
          .from("products")
          .select("slug, name, type, note_finale, scores, description, website")
          .eq("slug", s)
          .maybeSingle();

        if (product) {
          products.push({
            slug: product.slug,
            name: product.name,
            type: product.type,
            score: Math.round(product.note_finale || 0),
            scores: product.scores || {},
            description: product.description,
            website: product.website,
          });
        }
      }

      if (products.length < 2) {
        return NextResponse.json(
          { error: "Could not find both products" },
          { status: 404 }
        );
      }

      const html = generateComparisonHTML(products, { customLogo, companyName });

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `inline; filename="safescore-comparison-${slugs[0]}-${slugs[1]}.html"`,
        },
      });
    }

    // Single product report
    const { data: product, error } = await supabase
      .from("products")
      .select("slug, name, type, note_finale, scores, description, website, logo")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Get incidents if requested
    let incidents = [];
    if (includeIncidents) {
      const { data: incidentsData } = await supabase
        .from("incidents")
        .select("title, severity, date, funds_lost")
        .eq("product_slug", slug)
        .order("date", { ascending: false })
        .limit(10);

      incidents = (incidentsData || []).map(inc => ({
        title: inc.title,
        severity: inc.severity,
        date: inc.date,
        fundsLost: inc.funds_lost,
      }));
    }

    const productData = {
      slug: product.slug,
      name: product.name,
      type: product.type,
      score: Math.round(product.note_finale || 0),
      scores: product.scores || {},
      description: product.description,
      website: product.website,
      logo: product.logo,
      incidents,
    };

    const html = generateReportHTML(productData, {
      includeIncidents,
      includeHistory,
      customLogo,
      companyName,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="safescore-${slug}.html"`,
      },
    });

  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
