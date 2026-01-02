import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Embeddable Widget API
 * Returns an HTML widget that can be embedded via iframe or JavaScript.
 *
 * Usage:
 * <iframe src="https://safescoring.io/api/widget/ledger-nano-x" width="300" height="200"></iframe>
 *
 * Or via JavaScript:
 * <script src="https://safescoring.io/api/widget/ledger-nano-x?format=js"></script>
 *
 * Options:
 * - theme: "dark" | "light" (default: "dark")
 * - size: "small" | "medium" | "large" (default: "medium")
 * - format: "html" | "js" (default: "html")
 */

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);

  const theme = searchParams.get("theme") || "dark";
  const size = searchParams.get("size") || "medium";
  const format = searchParams.get("format") || "html";

  // Fetch product data
  let productName = slug;
  let productType = "Crypto Product";
  let score = 0;
  let scores = { s: 0, a: 0, f: 0, e: 0 };
  let verified = false;

  if (isSupabaseConfigured()) {
    const { data: product } = await supabase
      .from("products")
      .select("id, name, type_id")
      .eq("slug", slug)
      .maybeSingle();

    if (product) {
      productName = product.name;

      // Get type
      if (product.type_id) {
        const { data: typeData } = await supabase
          .from("product_types")
          .select("name")
          .eq("id", product.type_id)
          .maybeSingle();
        if (typeData) productType = typeData.name;
      }

      // Get score
      const { data: scoreData } = await supabase
        .from("safe_scoring_results")
        .select("note_finale, score_s, score_a, score_f, score_e")
        .eq("product_id", product.id)
        .order("calculated_at", { ascending: false })
        .limit(1);

      if (scoreData?.[0]) {
        score = Math.round(scoreData[0].note_finale || 0);
        scores = {
          s: Math.round(scoreData[0].score_s || 0),
          a: Math.round(scoreData[0].score_a || 0),
          f: Math.round(scoreData[0].score_f || 0),
          e: Math.round(scoreData[0].score_e || 0),
        };
        verified = true;
      }
    }
  }

  // Generate HTML widget
  const html = generateWidgetHTML({
    slug,
    productName,
    productType,
    score,
    scores,
    verified,
    theme,
    size,
  });

  if (format === "js") {
    // Return as JavaScript that injects the widget
    const js = `
(function() {
  var container = document.currentScript.parentNode;
  var iframe = document.createElement('iframe');
  iframe.src = 'https://safescoring.io/api/widget/${slug}?theme=${theme}&size=${size}';
  iframe.style.border = 'none';
  iframe.style.width = '${size === 'small' ? '200px' : size === 'large' ? '400px' : '300px'}';
  iframe.style.height = '${size === 'small' ? '150px' : size === 'large' ? '250px' : '200px'}';
  container.appendChild(iframe);
})();
    `.trim();

    return new NextResponse(js, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Return HTML
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}

function generateWidgetHTML({ slug, productName, productType, score, scores, verified, theme, size }) {
  // Colors
  const colors = theme === "light"
    ? { bg: "#ffffff", card: "#f8fafc", text: "#1e293b", muted: "#64748b", border: "#e2e8f0" }
    : { bg: "#0f172a", card: "#1e293b", text: "#f8fafc", muted: "#94a3b8", border: "#334155" };

  const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  // Size dimensions
  const dimensions = {
    small: { width: 200, height: 150, fontSize: 24, padding: 12 },
    medium: { width: 300, height: 200, fontSize: 36, padding: 16 },
    large: { width: 400, height: 250, fontSize: 48, padding: 20 },
  };
  const dim = dimensions[size] || dimensions.medium;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${colors.bg};
      padding: ${dim.padding}px;
    }
    .widget {
      background: ${colors.card};
      border: 1px solid ${colors.border};
      border-radius: 12px;
      padding: ${dim.padding}px;
      text-align: center;
    }
    .product-name {
      font-size: ${dim.fontSize * 0.4}px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .product-type {
      font-size: ${dim.fontSize * 0.3}px;
      color: ${colors.muted};
      margin-bottom: ${dim.padding}px;
    }
    .score {
      font-size: ${dim.fontSize}px;
      font-weight: 700;
      color: ${scoreColor};
      line-height: 1;
    }
    .score-label {
      font-size: ${dim.fontSize * 0.25}px;
      color: ${colors.muted};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .pillars {
      display: flex;
      justify-content: center;
      gap: ${dim.padding}px;
      margin-top: ${dim.padding}px;
    }
    .pillar {
      text-align: center;
    }
    .pillar-code {
      font-size: ${dim.fontSize * 0.3}px;
      font-weight: 700;
    }
    .pillar-score {
      font-size: ${dim.fontSize * 0.25}px;
      color: ${colors.muted};
    }
    .cta {
      display: inline-block;
      margin-top: ${dim.padding}px;
      padding: 6px 12px;
      background: ${scoreColor};
      color: ${theme === 'light' ? '#fff' : '#000'};
      text-decoration: none;
      border-radius: 6px;
      font-size: ${dim.fontSize * 0.25}px;
      font-weight: 600;
    }
    .powered {
      margin-top: 8px;
      font-size: 10px;
      color: ${colors.muted};
    }
    .powered a {
      color: ${colors.muted};
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="widget">
    <div class="product-name">${productName}</div>
    <div class="product-type">${productType}</div>
    <div class="score">${score}</div>
    <div class="score-label">SafeScore</div>
    ${size !== 'small' ? `
    <div class="pillars">
      <div class="pillar">
        <div class="pillar-code" style="color: #00d4aa">S</div>
        <div class="pillar-score">${scores.s}</div>
      </div>
      <div class="pillar">
        <div class="pillar-code" style="color: #8b5cf6">A</div>
        <div class="pillar-score">${scores.a}</div>
      </div>
      <div class="pillar">
        <div class="pillar-code" style="color: #f59e0b">F</div>
        <div class="pillar-score">${scores.f}</div>
      </div>
      <div class="pillar">
        <div class="pillar-code" style="color: #06b6d4">E</div>
        <div class="pillar-score">${scores.e}</div>
      </div>
    </div>
    ` : ''}
    <a href="https://safescoring.io/products/${slug}" target="_blank" class="cta">
      View Full Report →
    </a>
    <div class="powered">
      Powered by <a href="https://safescoring.io" target="_blank">SafeScoring</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}
