import { getSupabaseServer } from "@/libs/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/[slug]/full-analysis
 * Returns COMPLETE product analysis for the product page:
 * - Product info
 * - SAFE scores by pillar (S/A/F/E)
 * - Positive/negative points from evaluations
 * - Strategic advice and priority actions
 * - User recommendations
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const supabase = getSupabaseServer();

    // 1. Get product with all relevant data
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(`
        id, name, slug, description, short_description,
        url, logo_url, headquarters, country_origin,
        type_id, verified, is_active,
        safe_priority_pillar, safe_priority_reason,
        data_updated_at
      `)
      .eq("slug", slug)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 2. Get product type info
    const { data: productType } = await supabase
      .from("product_types")
      .select("id, name, category, description")
      .eq("id", product.type_id)
      .single();

    // 3. Get ALL evaluations for this product
    const { data: evaluations, error: evalError } = await supabase
      .from("evaluations")
      .select("norm_id, result, why_this_result")
      .eq("product_id", product.id)
      .limit(10000);

    if (evalError || !evaluations || evaluations.length === 0) {
      return NextResponse.json({
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          url: product.url,
          type: productType?.name || "Unknown",
          category: productType?.category || "Unknown"
        },
        has_evaluations: false,
        message: "Aucune évaluation disponible pour ce produit"
      });
    }

    // 4. Get norm details for all evaluations
    const normIds = [...new Set(evaluations.map(e => e.norm_id))];
    const { data: norms } = await supabase
      .from("norms")
      .select("id, code, title, pillar, is_essential, description, official_link, official_doc_summary")
      .in("id", normIds);

    const normMap = {};
    for (const norm of norms || []) {
      normMap[norm.id] = norm;
    }

    // 5. Group evaluations by pillar and result
    const pillarData = {
      S: { yes: [], no: [], tbd: [] },
      A: { yes: [], no: [], tbd: [] },
      F: { yes: [], no: [], tbd: [] },
      E: { yes: [], no: [], tbd: [] }
    };

    for (const ev of evaluations) {
      const norm = normMap[ev.norm_id];
      if (!norm || !norm.pillar || !pillarData[norm.pillar]) continue;

      const entry = {
        norm_id: norm.id,
        code: norm.code,
        title: norm.title,
        description: norm.description,
        is_essential: norm.is_essential || false,
        official_link: norm.official_link || null,
        official_doc_summary: norm.official_doc_summary || null,
        reason: ev.why_this_result || null
      };

      const result = (ev.result || "").toUpperCase();
      if (result === "YES") {
        pillarData[norm.pillar].yes.push(entry);
      } else if (result === "NO") {
        pillarData[norm.pillar].no.push(entry);
      } else {
        pillarData[norm.pillar].tbd.push(entry);
      }
    }

    // 6. Build pillar analysis
    const pillarNames = {
      S: {
        name: "Security",
        full_name: "Sécurité",
        icon: "🔒",
        context: "Protection contre les piratages et attaques",
        user_question: "Mes fonds sont-ils protégés contre le vol ?"
      },
      A: {
        name: "Adversity",
        full_name: "Adversité",
        icon: "🛡️",
        context: "Résilience en cas de faillite ou problème",
        user_question: "Que se passe-t-il si le service ferme ?"
      },
      F: {
        name: "Fidelity",
        full_name: "Fidélité",
        icon: "🔑",
        context: "Contrôle et propriété de vos actifs",
        user_question: "Suis-je vraiment propriétaire de mes cryptos ?"
      },
      E: {
        name: "Ecosystem",
        full_name: "Écosystème",
        icon: "🌐",
        context: "Compatibilité et facilité d'utilisation",
        user_question: "Est-ce facile à utiliser au quotidien ?"
      }
    };

    const pillars = {};
    let totalYes = 0, totalNo = 0, totalTbd = 0;
    const allNegatives = [];

    for (const [pillar, results] of Object.entries(pillarData)) {
      const yesCount = results.yes.length;
      const noCount = results.no.length;
      const tbdCount = results.tbd.length;
      const total = yesCount + noCount + tbdCount;

      totalYes += yesCount;
      totalNo += noCount;
      totalTbd += tbdCount;

      if (total === 0) continue;

      const score = (yesCount / total) * 100;

      // Risk assessment
      let riskLevel, riskLabel, riskColor;
      if (score >= 90) {
        riskLevel = "low";
        riskLabel = "Faible risque";
        riskColor = "#22c55e"; // green
      } else if (score >= 70) {
        riskLevel = "medium";
        riskLabel = "Risque modéré";
        riskColor = "#eab308"; // yellow
      } else if (score >= 50) {
        riskLevel = "elevated";
        riskLabel = "Risque élevé";
        riskColor = "#f97316"; // orange
      } else {
        riskLevel = "high";
        riskLabel = "Risque critique";
        riskColor = "#ef4444"; // red
      }

      // Grade
      let grade;
      if (score >= 95) grade = "A+";
      else if (score >= 90) grade = "A";
      else if (score >= 85) grade = "A-";
      else if (score >= 80) grade = "B+";
      else if (score >= 75) grade = "B";
      else if (score >= 70) grade = "B-";
      else if (score >= 65) grade = "C+";
      else if (score >= 60) grade = "C";
      else if (score >= 55) grade = "C-";
      else grade = "D";

      // Sort by essential first
      const sortByEssential = (a, b) => (b.is_essential ? 1 : 0) - (a.is_essential ? 1 : 0);

      // Collect negatives for critical warnings
      for (const item of results.no) {
        allNegatives.push({ pillar, ...item });
      }

      pillars[pillar] = {
        ...pillarNames[pillar],
        score: Math.round(score * 10) / 10,
        grade: grade,
        risk_level: riskLevel,
        risk_label: riskLabel,
        risk_color: riskColor,
        counts: {
          passed: yesCount,
          failed: noCount,
          pending: tbdCount,
          total: total
        },
        // Points forts (top 10)
        strengths: results.yes.sort(sortByEssential).slice(0, 10).map(p => ({
          title: p.title,
          code: p.code,
          is_essential: p.is_essential,
          description: p.description,
          official_link: p.official_link,
          official_doc_summary: p.official_doc_summary
        })),
        // Points faibles (top 10)
        weaknesses: results.no.sort(sortByEssential).slice(0, 10).map(p => ({
          title: p.title,
          code: p.code,
          is_essential: p.is_essential,
          description: p.description,
          official_link: p.official_link,
          official_doc_summary: p.official_doc_summary,
          reason: p.reason
        })),
        // En attente de vérification
        pending: results.tbd.slice(0, 5).map(p => ({
          title: p.title,
          code: p.code
        })),
        // Conseil spécifique au pilier
        advice: generatePillarAdvice(pillar, score, results.no.length, results.yes.length)
      };
    }

    // 7. Calculate overall metrics
    const totalChecks = totalYes + totalNo + totalTbd;
    const overallScore = totalChecks > 0 ? (totalYes / totalChecks) * 100 : 0;

    // Overall grade
    let overallGrade;
    if (overallScore >= 95) overallGrade = "A+";
    else if (overallScore >= 90) overallGrade = "A";
    else if (overallScore >= 85) overallGrade = "A-";
    else if (overallScore >= 80) overallGrade = "B+";
    else if (overallScore >= 75) overallGrade = "B";
    else if (overallScore >= 70) overallGrade = "B-";
    else if (overallScore >= 65) overallGrade = "C+";
    else if (overallScore >= 60) overallGrade = "C";
    else if (overallScore >= 55) overallGrade = "C-";
    else overallGrade = "D";

    // Overall risk
    let overallRisk, overallRiskLabel;
    if (overallScore >= 90) {
      overallRisk = "low";
      overallRiskLabel = "Produit fiable";
    } else if (overallScore >= 70) {
      overallRisk = "medium";
      overallRiskLabel = "Quelques précautions";
    } else if (overallScore >= 50) {
      overallRisk = "elevated";
      overallRiskLabel = "Vigilance requise";
    } else {
      overallRisk = "high";
      overallRiskLabel = "Non recommandé";
    }

    // 8. Top critical warnings (essential norms that failed)
    const criticalWarnings = allNegatives
      .filter(n => n.is_essential)
      .sort((a, b) => (b.is_essential ? 1 : 0) - (a.is_essential ? 1 : 0))
      .slice(0, 5)
      .map(w => ({
        pillar: w.pillar,
        pillar_name: pillarNames[w.pillar]?.name,
        title: w.title,
        code: w.code,
        reason: w.reason
      }));

    // 9. Parse strategic advice from safe_priority_reason
    let strategicAdvice = null;
    if (product.safe_priority_reason) {
      try {
        strategicAdvice = typeof product.safe_priority_reason === 'string'
          ? JSON.parse(product.safe_priority_reason)
          : product.safe_priority_reason;
      } catch (e) {
        strategicAdvice = { raw: product.safe_priority_reason };
      }
    }

    // 10. Generate user recommendations
    const recommendations = generateUserRecommendations(
      overallScore,
      pillars,
      product.safe_priority_pillar,
      criticalWarnings
    );

    // 11. Build final response
    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.short_description,
        url: product.url,
        logo_url: product.logo_url,
        headquarters: product.headquarters,
        country: product.country_origin,
        type: productType?.name || "Unknown",
        category: productType?.category || "Unknown",
        verified: product.verified,
        last_updated: product.data_updated_at
      },

      has_evaluations: true,
      evaluation_count: totalChecks,
      generated_at: new Date().toISOString(),

      // Score global
      summary: {
        overall_score: Math.round(overallScore * 10) / 10,
        overall_grade: overallGrade,
        risk_level: overallRisk,
        risk_label: overallRiskLabel,
        total_checks: totalChecks,
        passed: totalYes,
        failed: totalNo,
        pending: totalTbd,
        pass_rate: `${Math.round(overallScore)}%`
      },

      // Pilier prioritaire à améliorer
      priority_focus: {
        pillar: product.safe_priority_pillar,
        pillar_name: product.safe_priority_pillar ? pillarNames[product.safe_priority_pillar]?.full_name : null,
        reason: "Ce pilier nécessite le plus d'attention pour améliorer votre sécurité"
      },

      // Avertissements critiques
      critical_warnings: criticalWarnings,

      // Analyse par pilier SAFE
      pillars: pillars,

      // Conseils stratégiques personnalisés
      strategic_advice: strategicAdvice,

      // Recommandations utilisateur
      user_recommendations: recommendations,

      // Actions à faire
      action_items: generateActionItems(pillars, criticalWarnings, product.safe_priority_pillar)
    });

  } catch (error) {
    console.error("Error in full-analysis API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generatePillarAdvice(pillar, score, failedCount, passedCount) {
  const adviceMap = {
    S: {
      high: "Excellente sécurité. Continuez à maintenir les bonnes pratiques.",
      medium: "Sécurité correcte mais quelques failles à combler.",
      low: "Sécurité insuffisante. Envisagez des mesures de protection supplémentaires."
    },
    A: {
      high: "Bonne résilience face aux adversités. Vos fonds sont bien protégés.",
      medium: "Protection partielle. Vérifiez les garanties en cas de problème.",
      low: "Vulnérable aux problèmes. Diversifiez vos risques."
    },
    F: {
      high: "Excellent contrôle sur vos actifs. Vous êtes bien propriétaire.",
      medium: "Contrôle partagé. Comprenez bien les limites.",
      low: "Contrôle limité. Considérez des solutions self-custody."
    },
    E: {
      high: "Très bonne intégration et facilité d'usage.",
      medium: "Utilisable mais avec quelques limitations.",
      low: "Écosystème limité. Vérifiez la compatibilité avec vos besoins."
    }
  };

  const level = score >= 80 ? "high" : score >= 60 ? "medium" : "low";
  return adviceMap[pillar]?.[level] || "Évaluation en cours.";
}

function generateUserRecommendations(overallScore, pillars, priorityPillar, criticalWarnings) {
  const recommendations = [];

  // Based on overall score
  if (overallScore >= 90) {
    recommendations.push({
      type: "success",
      icon: "✅",
      title: "Produit bien noté",
      description: "Ce produit répond à la majorité des critères de sécurité et de fiabilité."
    });
  } else if (overallScore >= 70) {
    recommendations.push({
      type: "warning",
      icon: "⚠️",
      title: "Quelques points d'attention",
      description: "Ce produit est globalement correct mais présente des faiblesses à surveiller."
    });
  } else if (overallScore >= 50) {
    recommendations.push({
      type: "caution",
      icon: "🔶",
      title: "Vigilance requise",
      description: "Plusieurs risques identifiés. Utilisez avec précaution et en connaissance de cause."
    });
  } else {
    recommendations.push({
      type: "danger",
      icon: "🚨",
      title: "Risques significatifs",
      description: "Ce produit présente des lacunes importantes. Considérez des alternatives plus sûres."
    });
  }

  // Based on priority pillar
  if (priorityPillar && pillars[priorityPillar]) {
    const pillarInfo = pillars[priorityPillar];
    if (pillarInfo.score < 80) {
      recommendations.push({
        type: "focus",
        icon: "🎯",
        title: `Focus sur ${pillarInfo.full_name}`,
        description: `Ce pilier est votre priorité d'amélioration (${pillarInfo.score}%).`
      });
    }
  }

  // Based on critical warnings
  if (criticalWarnings.length > 0) {
    recommendations.push({
      type: "alert",
      icon: "⚡",
      title: `${criticalWarnings.length} point(s) critique(s)`,
      description: "Des normes essentielles ne sont pas respectées. Consultez les détails ci-dessous."
    });
  }

  return recommendations;
}

function generateActionItems(pillars, criticalWarnings, priorityPillar) {
  const actions = [];

  // Add critical items first
  for (const warning of criticalWarnings.slice(0, 3)) {
    actions.push({
      priority: "high",
      pillar: warning.pillar,
      action: `Vérifier: ${warning.title}`,
      reason: warning.reason || "Norme essentielle non respectée"
    });
  }

  // Add priority pillar items
  if (priorityPillar && pillars[priorityPillar]) {
    const weaknesses = pillars[priorityPillar].weaknesses || [];
    for (const weakness of weaknesses.slice(0, 2)) {
      if (!actions.find(a => a.action.includes(weakness.title))) {
        actions.push({
          priority: "medium",
          pillar: priorityPillar,
          action: `Améliorer: ${weakness.title}`,
          reason: weakness.reason || `Point faible du pilier ${pillars[priorityPillar].full_name}`
        });
      }
    }
  }

  return actions.slice(0, 5);
}
