"use client";

/**
 * PDF Generator for Setup Reports
 *
 * Uses jsPDF to generate PDF documents client-side.
 * Must be dynamically imported to avoid SSR issues.
 * Supports white-label branding for Enterprise customers.
 *
 * @example
 * const { generateSetupPDF } = await import('@/libs/pdf-generator');
 * const pdfBlob = await generateSetupPDF(setup, {
 *   branding: { companyName: "MyCompany", primaryColor: "#FF5500" }
 * });
 */

/**
 * Dynamically load jsPDF library
 */
async function loadJsPDF() {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  return jsPDF;
}

/**
 * Default color palette for PDF
 */
const DEFAULT_COLORS = {
  primary: [59, 130, 246], // blue
  green: [34, 197, 94],
  amber: [245, 158, 11],
  red: [239, 68, 68],
  purple: [139, 92, 246],
  gray: [107, 114, 128],
  darkBg: [31, 41, 55],
  lightText: [229, 231, 235],
};

/**
 * White-label branding configuration
 * @typedef {Object} WhiteLabelBranding
 * @property {string} companyName - Company name to display
 * @property {string} logoUrl - URL to company logo (base64 or URL)
 * @property {string} primaryColor - Primary brand color (hex)
 * @property {string} secondaryColor - Secondary brand color (hex)
 * @property {string} footerText - Custom footer text
 * @property {string} websiteUrl - Company website URL
 * @property {boolean} hideSafeScoring - Hide SafeScoring branding entirely
 * @property {string} reportTitle - Custom report title
 */

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

/**
 * Get colors with white-label overrides
 */
function getColors(branding = {}) {
  const colors = { ...DEFAULT_COLORS };

  if (branding.primaryColor) {
    const rgb = hexToRgb(branding.primaryColor);
    if (rgb) colors.primary = rgb;
  }

  if (branding.secondaryColor) {
    const rgb = hexToRgb(branding.secondaryColor);
    if (rgb) colors.purple = rgb;
  }

  if (branding.headerColor) {
    const rgb = hexToRgb(branding.headerColor);
    if (rgb) colors.darkBg = rgb;
  }

  return colors;
}

// Keep backward compatibility
const COLORS = DEFAULT_COLORS;

/**
 * Get color based on score
 */
function getScoreColor(score) {
  if (score >= 80) return COLORS.green;
  if (score >= 60) return COLORS.amber;
  return COLORS.red;
}

/**
 * Draw a circular score gauge
 */
function drawScoreGauge(doc, x, y, score, radius = 25) {
  drawScoreGaugeWithColors(doc, x, y, score, radius, DEFAULT_COLORS);
}

/**
 * Draw a circular score gauge with custom colors
 */
function drawScoreGaugeWithColors(doc, x, y, score, radius = 25, colors = DEFAULT_COLORS) {
  const color = getScoreColorFromPalette(score, colors);

  // Background circle
  doc.setDrawColor(75, 85, 99);
  doc.setLineWidth(3);
  doc.circle(x, y, radius, "S");

  // Score arc (simplified - just show full circle with color)
  doc.setDrawColor(...color);
  doc.setLineWidth(4);

  // Calculate arc based on score (0-100)
  const startAngle = -90;
  const endAngle = startAngle + (score / 100) * 360;

  // Draw arc segments
  const segments = 36;
  for (let i = 0; i < segments; i++) {
    const segStart = startAngle + (i / segments) * 360;
    const segEnd = startAngle + ((i + 1) / segments) * 360;
    if (segStart <= endAngle) {
      const actualEnd = Math.min(segEnd, endAngle);
      const startRad = (segStart * Math.PI) / 180;
      const endRad = (actualEnd * Math.PI) / 180;

      const x1 = x + radius * Math.cos(startRad);
      const y1 = y + radius * Math.sin(startRad);
      const x2 = x + radius * Math.cos(endRad);
      const y2 = y + radius * Math.sin(endRad);

      doc.line(x1, y1, x2, y2);
    }
  }

  // Score text
  doc.setFontSize(16);
  doc.setTextColor(...color);
  doc.text(String(score), x, y + 2, { align: "center" });

  // Label
  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text("SAFE", x, y + 8, { align: "center" });
}

/**
 * Get score color from palette
 */
function getScoreColorFromPalette(score, colors) {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.amber;
  return colors.red;
}

/**
 * Add logo to PDF (supports base64 and URLs)
 */
async function addLogo(doc, logoUrl, x, y, maxWidth = 40, maxHeight = 15) {
  if (!logoUrl) return false;

  try {
    // If it's a base64 image
    if (logoUrl.startsWith("data:image")) {
      const format = logoUrl.includes("png") ? "PNG" : "JPEG";
      doc.addImage(logoUrl, format, x, y, maxWidth, maxHeight);
      return true;
    }

    // For URLs, we can't fetch in client-side without CORS issues
    // Logo should be passed as base64 for white-label
    return false;
  } catch (e) {
    console.warn("Failed to add logo:", e);
    return false;
  }
}

/**
 * Generate PDF for a setup with white-label support
 *
 * @param {Object} setup - Setup data
 * @param {Object} options - Generation options
 * @param {WhiteLabelBranding} options.branding - White-label branding config
 * @param {Array} options.weaknesses - Weakness items to include
 * @param {Array} options.incidents - Incident items to include
 * @param {string} options.template - Template style: 'default', 'minimal', 'detailed'
 */
export async function generateSetupPDF(setup, options = {}) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const branding = options.branding || {};
  const colors = getColors(branding);
  const template = options.template || "default";

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Header background
  doc.setFillColor(...colors.darkBg);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Logo or Company Name
  let logoAdded = false;
  if (branding.logoBase64) {
    logoAdded = await addLogo(doc, branding.logoBase64, margin, 10, 40, 12);
  }

  if (!logoAdded) {
    // Text-based header
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");

    if (branding.hideSafeScoring && branding.companyName) {
      doc.text(branding.companyName, margin, 18);
    } else if (branding.companyName) {
      doc.text(branding.companyName, margin, 18);
      // Small "powered by SafeScoring" text
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text("Powered by SafeScoring", margin, 24);
    } else {
      doc.text("SafeScoring", margin, 18);
    }
  }

  // Subtitle / Report title
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(156, 163, 175);
  const reportTitle = branding.reportTitle || "Crypto Security Stack Report";
  doc.text(reportTitle, margin, logoAdded ? 28 : (branding.companyName && !branding.hideSafeScoring ? 30 : 25));

  // Setup name
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");
  doc.text(setup.name || "My Stack", margin, 38);

  // Score gauge in header (use custom primary color)
  if (setup.combinedScore?.note_finale) {
    drawScoreGaugeWithColors(
      doc,
      pageWidth - margin - 20,
      30,
      setup.combinedScore.note_finale,
      15,
      colors
    );
  }

  yPos = 60;

  // Generation date
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    margin,
    yPos
  );
  yPos += 10;

  // Products section
  if (setup.productDetails?.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.setFont(undefined, "bold");
    doc.text("Products in Stack", margin, yPos);
    yPos += 5;

    // Products table
    const tableData = setup.productDetails.map((p) => [
      p.name || "Unknown",
      p.type_name || p.product_types?.name || "-",
      p.role || "other",
      p.scores?.note_finale
        ? String(p.scores.note_finale)
        : p.score
        ? String(p.score)
        : "-",
    ]);

    doc.autoTable({
      startY: yPos,
      head: [["Product", "Type", "Role", "Score"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [243, 244, 246],
      },
      columnStyles: {
        3: { halign: "center" },
      },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // SAFE Score Breakdown
  if (setup.combinedScore) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.setFont(undefined, "bold");
    doc.text("SAFE Score Breakdown", margin, yPos);
    yPos += 8;

    const pillars = [
      {
        code: "S",
        name: "Security",
        score: setup.combinedScore.score_s || 0,
        color: COLORS.green,
      },
      {
        code: "A",
        name: "Adversity",
        score: setup.combinedScore.score_a || 0,
        color: COLORS.amber,
      },
      {
        code: "F",
        name: "Fidelity",
        score: setup.combinedScore.score_f || 0,
        color: COLORS.primary,
      },
      {
        code: "E",
        name: "Efficiency",
        score: setup.combinedScore.score_e || 0,
        color: COLORS.purple,
      },
    ];

    const barWidth = (pageWidth - 2 * margin - 40) / 4;

    pillars.forEach((pillar, i) => {
      const x = margin + i * (barWidth + 10);

      // Pillar code
      doc.setFontSize(14);
      doc.setTextColor(...pillar.color);
      doc.setFont(undefined, "bold");
      doc.text(pillar.code, x + barWidth / 2, yPos, { align: "center" });

      // Score bar background
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(x, yPos + 3, barWidth, 6, 2, 2, "F");

      // Score bar fill
      const fillWidth = (pillar.score / 100) * barWidth;
      doc.setFillColor(...pillar.color);
      doc.roundedRect(x, yPos + 3, fillWidth, 6, 2, 2, "F");

      // Score value
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.setFont(undefined, "normal");
      doc.text(String(pillar.score), x + barWidth / 2, yPos + 16, {
        align: "center",
      });

      // Pillar name
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(pillar.name, x + barWidth / 2, yPos + 21, { align: "center" });
    });

    yPos += 30;
  }

  // Weaknesses section
  if (options.weaknesses?.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.amber);
    doc.setFont(undefined, "bold");
    doc.text("Areas for Improvement", margin, yPos);
    yPos += 6;

    options.weaknesses.forEach((weakness, i) => {
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.setFont(undefined, "normal");
      doc.text(`• ${weakness.message || weakness}`, margin + 3, yPos);
      yPos += 5;
    });

    yPos += 5;
  }

  // Incidents section
  if (options.incidents?.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setTextColor(...COLORS.red);
    doc.setFont(undefined, "bold");
    doc.text("Recent Security Incidents", margin, yPos);
    yPos += 5;

    const incidentData = options.incidents.slice(0, 10).map((inc) => [
      inc.date
        ? new Date(inc.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "-",
      inc.product_name || inc.title || "-",
      inc.severity || "-",
      inc.title?.substring(0, 40) + (inc.title?.length > 40 ? "..." : "") || "-",
    ]);

    doc.autoTable({
      startY: yPos,
      head: [["Date", "Product", "Severity", "Description"]],
      body: incidentData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.red,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 20 },
        2: { cellWidth: 20 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Methodology section
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.setFont(undefined, "bold");
  doc.text("Methodology", margin, yPos);
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  const methodologyText = [
    "SAFE scores are calculated based on comprehensive security evaluations.",
    "S (Security): Protection against attacks and vulnerabilities",
    "A (Adversity): Resilience to external threats and edge cases",
    "F (Fidelity): Reliability, trust, and track record",
    "E (Efficiency): Operational performance and user experience",
    "",
    "Wallet products are weighted 2x in combined score calculations.",
  ];

  methodologyText.forEach((line) => {
    doc.text(line, margin, yPos);
    yPos += 4;
  });

  // Footer with white-label support
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);

  // Custom footer text or default
  const footerText = branding.footerText ||
    "This report is for informational purposes only. Not financial advice.";
  doc.text(footerText, margin, footerY);

  // Website URL
  const websiteUrl = branding.websiteUrl ||
    (branding.hideSafeScoring ? "" : "safescoring.io");
  if (websiteUrl) {
    doc.text(websiteUrl, pageWidth - margin, footerY, { align: "right" });
  }

  // If not hiding SafeScoring and has custom branding, add subtle credit
  if (branding.companyName && !branding.hideSafeScoring) {
    doc.setFontSize(5);
    doc.setTextColor(180, 180, 180);
    doc.text("SAFE methodology by safescoring.io", pageWidth / 2, footerY + 4, { align: "center" });
  }

  // Return as blob
  return doc.output("blob");
}

/**
 * Download PDF helper
 */
export async function downloadSetupPDF(setup, options = {}) {
  const blob = await generateSetupPDF(setup, options);
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `safescore-${setup.name?.toLowerCase().replace(/\s+/g, "-") || "stack"}-${
    new Date().toISOString().split("T")[0]
  }.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Preview PDF in new tab
 */
export async function previewSetupPDF(setup, options = {}) {
  const blob = await generateSetupPDF(setup, options);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

/**
 * Generate PDF for a product comparison
 */
export async function generateComparisonPDF(products, options = {}) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const branding = options.branding || {};
  const colors = getColors(branding);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  doc.setFillColor(...colors.darkBg);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");

  if (branding.hideSafeScoring && branding.companyName) {
    doc.text(branding.companyName, margin, 15);
  } else if (branding.companyName) {
    doc.text(branding.companyName, margin, 15);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text("Powered by SafeScoring", margin, 21);
  } else {
    doc.text("SafeScoring", margin, 15);
  }

  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "normal");
  doc.text(branding.reportTitle || "Product Comparison Report", margin, 28);

  // Comparison table
  const tableData = products.map((p) => [
    p.name || "Unknown",
    p.type_name || "-",
    String(p.score || p.scores?.note_finale || "-"),
    String(p.scores?.score_s || "-"),
    String(p.scores?.score_a || "-"),
    String(p.scores?.score_f || "-"),
    String(p.scores?.score_e || "-"),
  ]);

  doc.autoTable({
    startY: 45,
    head: [["Product", "Type", "SAFE Score", "Security", "Adversity", "Fidelity", "Efficiency"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: colors.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      2: { halign: "center", fontStyle: "bold" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
    },
    margin: { left: margin, right: margin },
  });

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  const footerText = branding.footerText || "Comparison for informational purposes only.";
  doc.text(footerText, margin, footerY);

  const websiteUrl = branding.websiteUrl || (branding.hideSafeScoring ? "" : "safescoring.io");
  if (websiteUrl) {
    doc.text(websiteUrl, pageWidth - margin, footerY, { align: "right" });
  }

  return doc.output("blob");
}

/**
 * Generate PDF for a single product (detailed report)
 */
export async function generateProductPDF(product, options = {}) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const branding = options.branding || {};
  const colors = getColors(branding);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Header
  doc.setFillColor(...colors.darkBg);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");

  if (branding.hideSafeScoring && branding.companyName) {
    doc.text(branding.companyName, margin, 18);
  } else if (branding.companyName) {
    doc.text(branding.companyName, margin, 18);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text("Powered by SafeScoring", margin, 24);
  } else {
    doc.text("SafeScoring", margin, 18);
  }

  // Product name
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");
  doc.text(product.name || "Product Report", margin, 38);

  // Score gauge
  const score = product.score || product.scores?.note_finale || 0;
  drawScoreGaugeWithColors(doc, pageWidth - margin - 20, 30, score, 15, colors);

  yPos = 60;

  // Product info
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(`Type: ${product.type_name || "-"}`, margin, yPos);
  yPos += 6;
  doc.text(`Category: ${product.category || "-"}`, margin, yPos);
  yPos += 10;

  // SAFE breakdown
  doc.setFontSize(12);
  doc.setTextColor(...colors.primary);
  doc.setFont(undefined, "bold");
  doc.text("SAFE Score Breakdown", margin, yPos);
  yPos += 8;

  const scores = product.scores || {};
  const pillars = [
    { code: "S", name: "Security", score: scores.score_s || 0 },
    { code: "A", name: "Adversity", score: scores.score_a || 0 },
    { code: "F", name: "Fidelity", score: scores.score_f || 0 },
    { code: "E", name: "Efficiency", score: scores.score_e || 0 },
  ];

  pillars.forEach((pillar) => {
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.setFont(undefined, "bold");
    doc.text(`${pillar.code} - ${pillar.name}:`, margin, yPos);

    // Score bar
    const barX = margin + 50;
    const barWidth = 80;
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(barX, yPos - 4, barWidth, 5, 1, 1, "F");

    const fillColor = getScoreColorFromPalette(pillar.score, colors);
    doc.setFillColor(...fillColor);
    doc.roundedRect(barX, yPos - 4, (pillar.score / 100) * barWidth, 5, 1, 1, "F");

    doc.setFont(undefined, "normal");
    doc.text(String(pillar.score), barX + barWidth + 5, yPos);

    yPos += 8;
  });

  yPos += 5;

  // Incidents if provided
  if (options.incidents?.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(...colors.red);
    doc.setFont(undefined, "bold");
    doc.text("Recent Incidents", margin, yPos);
    yPos += 5;

    const incidentData = options.incidents.slice(0, 5).map((inc) => [
      inc.date ? new Date(inc.date).toLocaleDateString() : "-",
      inc.severity || "-",
      inc.title?.substring(0, 50) || "-",
    ]);

    doc.autoTable({
      startY: yPos,
      head: [["Date", "Severity", "Description"]],
      body: incidentData,
      theme: "striped",
      headStyles: {
        fillColor: colors.red,
        textColor: [255, 255, 255],
      },
      margin: { left: margin, right: margin },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  const footerText = branding.footerText || "Product analysis for informational purposes only.";
  doc.text(footerText, margin, footerY);

  const websiteUrl = branding.websiteUrl || (branding.hideSafeScoring ? "" : "safescoring.io");
  if (websiteUrl) {
    doc.text(websiteUrl, pageWidth - margin, footerY, { align: "right" });
  }

  return doc.output("blob");
}

/**
 * Download comparison PDF
 */
export async function downloadComparisonPDF(products, options = {}) {
  const blob = await generateComparisonPDF(products, options);
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `comparison-${new Date().toISOString().split("T")[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download product PDF
 */
export async function downloadProductPDF(product, options = {}) {
  const blob = await generateProductPDF(product, options);
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${product.slug || product.name || "product"}-report-${
    new Date().toISOString().split("T")[0]
  }.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  generateSetupPDF,
  downloadSetupPDF,
  previewSetupPDF,
  generateComparisonPDF,
  downloadComparisonPDF,
  generateProductPDF,
  downloadProductPDF,
};
