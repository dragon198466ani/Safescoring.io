/**
 * Response formatter for the autonomous chatbot
 * Ensures SAFE scores are always displayed prominently
 */

/**
 * Format a single product score display
 * @param {Object} product - Product with scores
 * @param {string} language - Language code
 * @returns {string} Formatted score display
 */
export function formatProductScore(product, language = "en") {
  if (!product || !product.scores) return "";

  const { name, scores, type, stats } = product;
  const { total, s, a, f, e } = scores;

  // Progress bar generator
  const progressBar = (value, max = 100) => {
    const filled = Math.round((value / max) * 10);
    return "█".repeat(filled) + "░".repeat(10 - filled);
  };

  // Grade based on score
  const getGrade = (score) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "F";
  };

  const labels = {
    en: {
      title: "SAFE SCORE",
      security: "Security",
      adversity: "Adversity",
      fidelity: "Fidelity",
      ecosystem: "Ecosystem",
      grade: "Grade",
      normsEvaluated: "norms evaluated",
    },
    fr: {
      title: "SCORE SAFE",
      security: "Sécurité",
      adversity: "Adversité",
      fidelity: "Fidélité",
      ecosystem: "Écosystème",
      grade: "Note",
      normsEvaluated: "normes évaluées",
    },
  };

  const t = labels[language] || labels.en;

  return `📊 **${t.title}: ${name}** - ${total}/100 (${getGrade(total)})
┌─ ${t.security}:  ${s}/100 ${progressBar(s)}
├─ ${t.adversity}: ${a}/100 ${progressBar(a)}
├─ ${t.fidelity}:  ${f}/100 ${progressBar(f)}
└─ ${t.ecosystem}: ${e}/100 ${progressBar(e)}

📋 *${stats?.totalNorms || 0} ${t.normsEvaluated}*`;
}

/**
 * Format comparison between products
 * @param {Object} comparison - Comparison data
 * @param {string} language - Language code
 * @returns {string} Formatted comparison
 */
export function formatProductComparison(comparison, language = "en") {
  if (!comparison || !comparison.products) return "";

  const labels = {
    en: {
      title: "COMPARISON",
      winner: "Winner",
      product: "Product",
      total: "Total",
      bestIn: "Best in",
    },
    fr: {
      title: "COMPARAISON",
      winner: "Gagnant",
      product: "Produit",
      total: "Total",
      bestIn: "Meilleur en",
    },
  };

  const t = labels[language] || labels.en;

  let output = `📊 **${t.title}**\n\n`;

  // Table header
  output += `| ${t.product} | ${t.total} | S | A | F | E |\n`;
  output += `|------------|-------|---|---|---|---|\n`;

  // Product rows
  comparison.products.forEach((p) => {
    const { name, scores } = p;
    const isWinner = name === comparison.winner;
    const badge = isWinner ? " 🏆" : "";
    output += `| ${name}${badge} | **${scores.total}** | ${scores.s} | ${scores.a} | ${scores.f} | ${scores.e} |\n`;
  });

  // Winner summary
  if (comparison.analysis) {
    output += `\n🏆 **${t.winner}:** ${comparison.winner}\n`;

    const { bestSecurity, bestAdversity, bestFidelity, bestEcosystem } = comparison.analysis;
    if (bestSecurity !== bestAdversity || bestFidelity !== bestEcosystem) {
      output += `\n${t.bestIn}:\n`;
      output += `- Security: ${bestSecurity}\n`;
      output += `- Adversity: ${bestAdversity}\n`;
      output += `- Fidelity: ${bestFidelity}\n`;
      output += `- Ecosystem: ${bestEcosystem}\n`;
    }
  }

  return output;
}

/**
 * Format recommendations list
 * @param {Array} products - Recommended products
 * @param {string} category - Category name
 * @param {string} language - Language code
 * @returns {string} Formatted recommendations
 */
export function formatRecommendations(products, category = null, language = "en") {
  if (!products || products.length === 0) return "";

  const labels = {
    en: {
      title: "TOP RECOMMENDATIONS",
      categoryTitle: "TOP",
      type: "Type",
    },
    fr: {
      title: "MEILLEURES RECOMMANDATIONS",
      categoryTitle: "TOP",
      type: "Type",
    },
  };

  const t = labels[language] || labels.en;

  const title = category
    ? `🏆 **${t.categoryTitle} ${category.toUpperCase()}**`
    : `🏆 **${t.title}**`;

  let output = `${title}\n\n`;

  products.slice(0, 5).forEach((p, idx) => {
    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
    const { name, scores, type } = p;
    output += `${medal} **${name}** - ${scores.total}/100\n`;
    output += `   S:${scores.s} | A:${scores.a} | F:${scores.f} | E:${scores.e}`;
    if (type?.name) output += ` (${type.name})`;
    output += `\n`;
  });

  return output;
}

/**
 * Format norm information
 * @param {Array} norms - Norm data
 * @param {string} language - Language code
 * @returns {string} Formatted norm info
 */
export function formatNormInfo(norms, language = "en") {
  if (!norms || norms.length === 0) return "";

  const labels = {
    en: {
      title: "STANDARDS INFO",
      essential: "Essential",
      pillar: "Pillar",
    },
    fr: {
      title: "INFO NORMES",
      essential: "Essentiel",
      pillar: "Pilier",
    },
  };

  const t = labels[language] || labels.en;

  let output = `📋 **${t.title}**\n\n`;

  norms.forEach((norm) => {
    const essentialBadge = norm.isEssential ? ` ⚠️ ${t.essential}` : "";
    output += `**${norm.code}** - ${norm.title}${essentialBadge}\n`;
    output += `${t.pillar}: ${norm.pillarName}\n`;
    if (norm.summary) {
      output += `> ${norm.summary.substring(0, 200)}${norm.summary.length > 200 ? "..." : ""}\n`;
    }
    output += `\n`;
  });

  return output;
}

/**
 * Format security advice with product recommendations
 * @param {string} advice - AI-generated advice
 * @param {Array} products - Recommended products
 * @param {string} language - Language code
 * @returns {string} Formatted advice
 */
export function formatSecurityAdvice(advice, products = [], language = "en") {
  const labels = {
    en: {
      recommendedProducts: "Recommended Products",
    },
    fr: {
      recommendedProducts: "Produits Recommandés",
    },
  };

  const t = labels[language] || labels.en;

  let output = `💡 ${advice}\n`;

  if (products && products.length > 0) {
    output += `\n---\n\n🎯 **${t.recommendedProducts}:**\n`;
    products.slice(0, 3).forEach((p) => {
      output += `- **${p.name}** (${p.scores.total}/100) - S:${p.scores.s} A:${p.scores.a} F:${p.scores.f} E:${p.scores.e}\n`;
    });
  }

  return output;
}

/**
 * Format incident information
 * @param {Array} incidents - Security incidents
 * @param {string} language - Language code
 * @returns {string} Formatted incidents
 */
export function formatIncidents(incidents, language = "en") {
  if (!incidents || incidents.length === 0) return "";

  const labels = {
    en: {
      title: "SECURITY INCIDENTS",
      severity: "Severity",
      date: "Date",
      product: "Product",
      noIncidents: "No recent incidents found.",
    },
    fr: {
      title: "INCIDENTS DE SÉCURITÉ",
      severity: "Sévérité",
      date: "Date",
      product: "Produit",
      noIncidents: "Aucun incident récent trouvé.",
    },
  };

  const t = labels[language] || labels.en;

  let output = `⚠️ **${t.title}**\n\n`;

  if (incidents.length === 0) {
    return output + t.noIncidents;
  }

  incidents.forEach((inc) => {
    const severityEmoji = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🟢",
    }[inc.severity?.toLowerCase()] || "⚪";

    output += `${severityEmoji} **${inc.title}**\n`;
    if (inc.product) output += `${t.product}: ${inc.product}\n`;
    if (inc.date) output += `${t.date}: ${new Date(inc.date).toLocaleDateString()}\n`;
    if (inc.description) {
      output += `> ${inc.description.substring(0, 150)}${inc.description.length > 150 ? "..." : ""}\n`;
    }
    output += `\n`;
  });

  return output;
}

/**
 * Format pillar analysis for a product
 * @param {Object} product - Product with pillar breakdown
 * @param {string} language - Language code
 * @returns {string} Formatted analysis
 */
export function formatPillarAnalysis(product, language = "en") {
  if (!product || !product.pillarBreakdown) return "";

  const labels = {
    en: {
      title: "DETAILED ANALYSIS",
      strengths: "Strengths",
      weaknesses: "Weaknesses",
      criticalFailures: "Critical Failures",
      pillars: {
        S: "Security",
        A: "Adversity",
        F: "Fidelity",
        E: "Ecosystem",
      },
    },
    fr: {
      title: "ANALYSE DÉTAILLÉE",
      strengths: "Points forts",
      weaknesses: "Points faibles",
      criticalFailures: "Échecs critiques",
      pillars: {
        S: "Sécurité",
        A: "Adversité",
        F: "Fidélité",
        E: "Écosystème",
      },
    },
  };

  const t = labels[language] || labels.en;

  let output = `📊 **${t.title}: ${product.name}**\n\n`;

  const { pillarBreakdown, scores } = product;

  // Identify strengths and weaknesses
  const pillars = [
    { code: "S", score: scores.s, data: pillarBreakdown.S },
    { code: "A", score: scores.a, data: pillarBreakdown.A },
    { code: "F", score: scores.f, data: pillarBreakdown.F },
    { code: "E", score: scores.e, data: pillarBreakdown.E },
  ];

  const strengths = pillars.filter((p) => p.score >= 75).sort((a, b) => b.score - a.score);
  const weaknesses = pillars.filter((p) => p.score < 60).sort((a, b) => a.score - b.score);

  if (strengths.length > 0) {
    output += `✅ **${t.strengths}:**\n`;
    strengths.forEach((p) => {
      output += `- ${t.pillars[p.code]}: ${p.score}/100 (${p.data.yes} YES / ${p.data.no} NO)\n`;
    });
    output += `\n`;
  }

  if (weaknesses.length > 0) {
    output += `⚠️ **${t.weaknesses}:**\n`;
    weaknesses.forEach((p) => {
      output += `- ${t.pillars[p.code]}: ${p.score}/100 (${p.data.yes} YES / ${p.data.no} NO)\n`;
      if (p.data.details && p.data.details.length > 0) {
        output += `  ${t.criticalFailures}:\n`;
        p.data.details.slice(0, 3).forEach((d) => {
          output += `    - ${d.code}: ${d.title}\n`;
        });
      }
    });
    output += `\n`;
  }

  return output;
}

/**
 * Build the full response with required SAFE score
 * This is the main function that ensures rule #1 is always followed
 */
export function buildAutonomousResponse({
  intent,
  product = null,
  products = [],
  comparison = null,
  norms = [],
  incidents = [],
  aiAnalysis = "",
  language = "en",
}) {
  const parts = [];

  // RULE #1: Always show SAFE score when a product is mentioned
  if (product) {
    parts.push(formatProductScore(product, language));

    // Add detailed analysis if available
    if (product.pillarBreakdown) {
      parts.push(formatPillarAnalysis(product, language));
    }
  }

  // Show comparison if multiple products
  if (comparison) {
    parts.push(formatProductComparison(comparison, language));
  }

  // Show recommendations if provided
  if (products.length > 0 && !product && !comparison) {
    parts.push(formatRecommendations(products, null, language));
  }

  // Show norm info if relevant
  if (norms.length > 0) {
    parts.push(formatNormInfo(norms, language));
  }

  // Show incidents if relevant
  if (incidents.length > 0) {
    parts.push(formatIncidents(incidents, language));
  }

  // Add AI analysis/advice
  if (aiAnalysis) {
    const labels = {
      en: { analysis: "ANALYSIS" },
      fr: { analysis: "ANALYSE" },
    };
    const t = labels[language] || labels.en;
    parts.push(`💡 **${t.analysis}:**\n${aiAnalysis}`);
  }

  return parts.filter(Boolean).join("\n\n---\n\n");
}

export default {
  formatProductScore,
  formatProductComparison,
  formatRecommendations,
  formatNormInfo,
  formatSecurityAdvice,
  formatIncidents,
  formatPillarAnalysis,
  buildAutonomousResponse,
};
