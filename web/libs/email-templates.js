/**
 * SafeScoring Email Templates
 * Dark theme, consistent branding, mobile-responsive
 */

const BRAND = {
  name: "SafeScoring",
  url: "https://safescoring.io",
  colors: {
    bg: "#0f0f14",
    card: "#1a1a24",
    border: "#2a2a3a",
    text: "#e0e0e0",
    muted: "#888",
    primary: "#6366f1",
    green: "#22c55e",
    amber: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    purple: "#8b5cf6",
  },
};

function layout(content, preheader = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${BRAND.name}</title>
${preheader ? `<span style="display:none;font-size:1px;color:#0f0f14;max-height:0px;overflow:hidden;">${preheader}</span>` : ""}
</head>
<body style="margin:0;padding:0;background:${BRAND.colors.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.colors.bg};padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <!-- Header -->
  <tr><td style="padding:24px 24px 16px;text-align:center;">
    <a href="${BRAND.url}" style="text-decoration:none;">
      <span style="font-size:24px;font-weight:800;color:${BRAND.colors.primary};">Safe</span><span style="font-size:24px;font-weight:800;color:${BRAND.colors.text};">Scoring</span>
    </a>
  </td></tr>
  <!-- Content -->
  <tr><td style="padding:0 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.colors.card};border:1px solid ${BRAND.colors.border};border-radius:16px;overflow:hidden;">
      <tr><td style="padding:32px;color:${BRAND.colors.text};font-size:14px;line-height:1.6;">
        ${content}
      </td></tr>
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px;text-align:center;">
    <p style="color:${BRAND.colors.muted};font-size:12px;margin:0;">
      <a href="${BRAND.url}/dashboard/notifications" style="color:${BRAND.colors.primary};text-decoration:none;">Manage preferences</a>
      &nbsp;&middot;&nbsp;
      <a href="${BRAND.url}" style="color:${BRAND.colors.muted};text-decoration:none;">${BRAND.name}</a>
    </p>
    <p style="color:${BRAND.colors.muted};font-size:11px;margin:8px 0 0;">916 norms. 0 opinion. 1 score.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function pillColor(pillar) {
  const map = { S: BRAND.colors.green, A: BRAND.colors.amber, F: BRAND.colors.blue, E: BRAND.colors.purple };
  return map[pillar] || BRAND.colors.muted;
}

function changeColor(change) {
  return change > 0 ? BRAND.colors.green : change < 0 ? BRAND.colors.red : BRAND.colors.muted;
}

function changeArrow(change) {
  return change > 0 ? "&#x2191;" : change < 0 ? "&#x2193;" : "&#x2192;";
}

function btn(text, href) {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:${BRAND.colors.primary};color:white;font-weight:600;font-size:14px;border-radius:8px;text-decoration:none;">${text}</a>`;
}

// =========================================================================
// Score Alert Email
// =========================================================================
export function scoreAlertEmail({ userName, changes }) {
  const rows = changes
    .map(
      (c) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.colors.border};">
        <strong>${c.productName}</strong>
        <br><span style="color:${BRAND.colors.muted};font-size:12px;">in "${c.setupName}"</span>
      </td>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.colors.border};text-align:center;">
        <span style="color:${changeColor(c.change)};font-weight:700;font-size:16px;">
          ${changeArrow(c.change)} ${c.change > 0 ? "+" : ""}${Math.round(c.change)}
        </span>
      </td>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.colors.border};text-align:center;">
        <strong>${Math.round(c.newScore || 0)}</strong>/100
      </td>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.colors.border};text-align:right;">
        <a href="${BRAND.url}/products/${c.productSlug}" style="color:${BRAND.colors.primary};text-decoration:none;font-size:13px;">View &rarr;</a>
      </td>
    </tr>`
    )
    .join("");

  return layout(
    `
    <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND.colors.text};">Score Changes Detected</h2>
    <p style="margin:0 0 24px;color:${BRAND.colors.muted};">Hi ${userName}, we detected changes in your monitored products.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.colors.border};border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:${BRAND.colors.bg};">
          <th style="padding:10px 12px;text-align:left;color:${BRAND.colors.muted};font-size:12px;font-weight:500;">Product</th>
          <th style="padding:10px 12px;text-align:center;color:${BRAND.colors.muted};font-size:12px;font-weight:500;">Change</th>
          <th style="padding:10px 12px;text-align:center;color:${BRAND.colors.muted};font-size:12px;font-weight:500;">New Score</th>
          <th style="padding:10px 12px;text-align:right;color:${BRAND.colors.muted};font-size:12px;font-weight:500;"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:24px;text-align:center;">
      ${btn("View Dashboard", `${BRAND.url}/dashboard`)}
    </div>
  `,
    `${changes.length} score change${changes.length > 1 ? "s" : ""} detected in your crypto setups`
  );
}

// =========================================================================
// Incident Alert Email
// =========================================================================
export function incidentAlertEmail({ userName, incident }) {
  const severityColors = {
    critical: BRAND.colors.red,
    high: "#f97316",
    medium: BRAND.colors.amber,
    low: BRAND.colors.blue,
  };
  const color = severityColors[incident.severity] || BRAND.colors.muted;

  return layout(
    `
    <div style="background:${color}20;border:1px solid ${color}40;border-radius:8px;padding:16px;margin-bottom:24px;">
      <span style="color:${color};font-weight:700;text-transform:uppercase;font-size:12px;">${incident.severity || "ALERT"}</span>
      <h2 style="margin:8px 0 4px;font-size:18px;color:${BRAND.colors.text};">${incident.title}</h2>
      <p style="margin:0;color:${BRAND.colors.muted};font-size:13px;">${incident.description || ""}</p>
    </div>

    <p style="color:${BRAND.colors.muted};font-size:13px;">Hi ${userName}, a security incident has been reported that may affect products in your setup.</p>

    ${incident.fundsLost ? `<p style="color:${BRAND.colors.red};font-weight:600;">Funds affected: $${Number(incident.fundsLost).toLocaleString()}</p>` : ""}

    ${incident.affectedProducts?.length > 0 ? `
    <p style="font-weight:600;margin:16px 0 8px;">Affected products in your setup:</p>
    <ul style="margin:0;padding-left:20px;">
      ${incident.affectedProducts.map((p) => `<li style="margin-bottom:4px;"><a href="${BRAND.url}/products/${p.slug}" style="color:${BRAND.colors.primary};text-decoration:none;">${p.name}</a></li>`).join("")}
    </ul>
    ` : ""}

    <div style="margin-top:24px;text-align:center;">
      ${btn("Check Your Setup", `${BRAND.url}/dashboard/setups`)}
    </div>
  `,
    `Security alert: ${incident.title}`
  );
}

// =========================================================================
// Weekly Digest Email
// =========================================================================
export function weeklyDigestEmail({ userName, weekData }) {
  const {
    scoreChanges = [],
    incidents = [],
    overallTrend = 0,
    setupCount = 0,
    topRecommendation = "",
  } = weekData;

  const trendColor = overallTrend > 0 ? BRAND.colors.green : overallTrend < 0 ? BRAND.colors.red : BRAND.colors.muted;

  return layout(
    `
    <h2 style="margin:0 0 4px;font-size:20px;color:${BRAND.colors.text};">Weekly Security Digest</h2>
    <p style="margin:0 0 24px;color:${BRAND.colors.muted};">Hi ${userName}, here's your week in crypto security.</p>

    <!-- Stats row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="33%" style="text-align:center;padding:16px;background:${BRAND.colors.bg};border-radius:8px;">
          <div style="font-size:28px;font-weight:800;color:${trendColor};">${changeArrow(overallTrend)} ${overallTrend > 0 ? "+" : ""}${Math.round(overallTrend)}%</div>
          <div style="color:${BRAND.colors.muted};font-size:11px;margin-top:4px;">Overall Trend</div>
        </td>
        <td width="4%"></td>
        <td width="30%" style="text-align:center;padding:16px;background:${BRAND.colors.bg};border-radius:8px;">
          <div style="font-size:28px;font-weight:800;color:${BRAND.colors.text};">${scoreChanges.length}</div>
          <div style="color:${BRAND.colors.muted};font-size:11px;margin-top:4px;">Score Changes</div>
        </td>
        <td width="4%"></td>
        <td width="30%" style="text-align:center;padding:16px;background:${BRAND.colors.bg};border-radius:8px;">
          <div style="font-size:28px;font-weight:800;color:${incidents.length > 0 ? BRAND.colors.red : BRAND.colors.green};">${incidents.length}</div>
          <div style="color:${BRAND.colors.muted};font-size:11px;margin-top:4px;">Incidents</div>
        </td>
      </tr>
    </table>

    ${scoreChanges.length > 0 ? `
    <h3 style="font-size:14px;color:${BRAND.colors.text};margin:0 0 12px;">Score Changes This Week</h3>
    ${scoreChanges.slice(0, 5).map((c) => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${BRAND.colors.border};">
      <span>${c.productName}</span>
      <span style="color:${changeColor(c.change)};font-weight:600;">${changeArrow(c.change)} ${c.change > 0 ? "+" : ""}${Math.round(c.change)}</span>
    </div>
    `).join("")}
    ` : `<p style="color:${BRAND.colors.green};font-size:13px;">No score changes this week - your setup is stable!</p>`}

    ${incidents.length > 0 ? `
    <h3 style="font-size:14px;color:${BRAND.colors.text};margin:24px 0 12px;">Security Incidents</h3>
    ${incidents.slice(0, 3).map((i) => `
    <div style="padding:12px;margin-bottom:8px;background:${BRAND.colors.bg};border-radius:8px;border-left:3px solid ${severityToColor(i.severity)};">
      <span style="color:${severityToColor(i.severity)};font-size:11px;text-transform:uppercase;font-weight:600;">${i.severity}</span>
      <p style="margin:4px 0 0;font-size:13px;">${i.title}</p>
    </div>
    `).join("")}
    ` : ""}

    ${topRecommendation ? `
    <div style="margin-top:24px;padding:16px;background:${BRAND.colors.primary}15;border:1px solid ${BRAND.colors.primary}30;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:${BRAND.colors.text};"><strong>Recommendation:</strong> ${topRecommendation}</p>
    </div>
    ` : ""}

    <div style="margin-top:24px;text-align:center;">
      ${btn("View Full Report", `${BRAND.url}/dashboard`)}
    </div>
  `,
    `Your weekly crypto security digest - ${scoreChanges.length} changes, ${incidents.length} incidents`
  );
}

function severityToColor(severity) {
  const map = { critical: BRAND.colors.red, high: "#f97316", medium: BRAND.colors.amber, low: BRAND.colors.blue };
  return map[severity] || BRAND.colors.muted;
}

// =========================================================================
// Monthly Report Email
// =========================================================================
export function monthlyReportEmail({ userName, monthData }) {
  const {
    month = "",
    overallScore = 0,
    previousScore = 0,
    pillarScores = {},
    totalChanges = 0,
    totalIncidents = 0,
    recommendations = [],
    streakDays = 0,
  } = monthData;

  const scoreDiff = overallScore - previousScore;

  return layout(
    `
    <h2 style="margin:0 0 4px;font-size:20px;color:${BRAND.colors.text};">Monthly Security Report</h2>
    <p style="margin:0 0 24px;color:${BRAND.colors.muted};">Hi ${userName}, here's your ${month} security overview.</p>

    <!-- Main score -->
    <div style="text-align:center;padding:32px;background:${BRAND.colors.bg};border-radius:12px;margin-bottom:24px;">
      <div style="font-size:48px;font-weight:900;color:${overallScore >= 70 ? BRAND.colors.green : overallScore >= 50 ? BRAND.colors.amber : BRAND.colors.red};">${Math.round(overallScore)}</div>
      <div style="color:${BRAND.colors.muted};font-size:13px;">Your Setup Health Score</div>
      ${scoreDiff !== 0 ? `<div style="color:${changeColor(scoreDiff)};font-size:14px;margin-top:8px;">${changeArrow(scoreDiff)} ${scoreDiff > 0 ? "+" : ""}${Math.round(scoreDiff)} vs last month</div>` : ""}
    </div>

    <!-- SAFE Pillars -->
    <h3 style="font-size:14px;color:${BRAND.colors.text};margin:0 0 12px;">SAFE Pillar Breakdown</h3>
    <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
      <tr>
        ${["S", "A", "F", "E"].map((p) => `
        <td width="25%" style="text-align:center;padding:16px 8px;background:${BRAND.colors.bg};border-radius:8px;">
          <div style="font-size:20px;font-weight:800;color:${pillColor(p)};">${Math.round(pillarScores[p] || 0)}</div>
          <div style="color:${BRAND.colors.muted};font-size:11px;margin-top:4px;">${p === "S" ? "Security" : p === "A" ? "Adversity" : p === "F" ? "Fidelity" : "Efficiency"}</div>
        </td>
        `).join("")}
      </tr>
    </table>

    <!-- Stats -->
    <div style="padding:16px;background:${BRAND.colors.bg};border-radius:8px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;color:${BRAND.colors.muted};font-size:13px;">Score changes this month</td>
          <td style="padding:4px 0;text-align:right;font-weight:600;">${totalChanges}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:${BRAND.colors.muted};font-size:13px;">Security incidents</td>
          <td style="padding:4px 0;text-align:right;font-weight:600;color:${totalIncidents > 0 ? BRAND.colors.red : BRAND.colors.green};">${totalIncidents}</td>
        </tr>
        ${streakDays > 0 ? `<tr>
          <td style="padding:4px 0;color:${BRAND.colors.muted};font-size:13px;">Security check streak</td>
          <td style="padding:4px 0;text-align:right;font-weight:600;color:${BRAND.colors.amber};">${streakDays} days</td>
        </tr>` : ""}
      </table>
    </div>

    ${recommendations.length > 0 ? `
    <h3 style="font-size:14px;color:${BRAND.colors.text};margin:0 0 12px;">Recommendations</h3>
    ${recommendations.slice(0, 3).map((r, i) => `
    <div style="padding:12px;margin-bottom:8px;background:${BRAND.colors.bg};border-radius:8px;border-left:3px solid ${BRAND.colors.primary};">
      <p style="margin:0;font-size:13px;"><strong>${i + 1}.</strong> ${r}</p>
    </div>
    `).join("")}
    ` : ""}

    <div style="margin-top:24px;text-align:center;">
      ${btn("Improve Your Score", `${BRAND.url}/dashboard/setups`)}
    </div>
  `,
    `Your ${month} crypto security report - Score: ${Math.round(overallScore)}/100`
  );
}
