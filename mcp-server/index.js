#!/usr/bin/env node

/**
 * SafeScoring MCP Server
 *
 * Model Context Protocol server that exposes SafeScoring crypto security
 * scores as tools for AI models (Claude, GPT, etc.)
 *
 * Usage:
 *   SAFESCORING_API_KEY=sk_live_xxx npx @safescoring/mcp-server
 *
 * Claude Desktop config (~/.claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "safescoring": {
 *         "command": "npx",
 *         "args": ["@safescoring/mcp-server"],
 *         "env": { "SAFESCORING_API_KEY": "sk_live_xxx" }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.SAFESCORING_API_KEY;
const BASE_URL = process.env.SAFESCORING_BASE_URL || "https://safescoring.io";

if (!API_KEY) {
  console.error("Error: SAFESCORING_API_KEY environment variable is required.");
  console.error("Get your API key at https://safescoring.io/dashboard/settings");
  process.exit(1);
}

const headers = {
  Accept: "application/json",
  "X-API-Key": API_KEY,
  "User-Agent": "@safescoring/mcp-server/1.0.0",
};

async function apiRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Create MCP server
const server = new Server(
  {
    name: "safescoring",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================================
// TOOLS
// ============================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "safescoring_get_score",
      description:
        "Get the SAFE security score for a crypto product (wallet, exchange, DeFi protocol). Returns overall score and individual pillar scores (Security, Adversity, Fidelity, Efficiency) on a 0-100 scale.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description:
              'Product slug (e.g., "ledger-nano-x", "metamask", "aave-v3", "binance")',
          },
        },
        required: ["product"],
      },
    },
    {
      name: "safescoring_compare",
      description:
        "Compare security scores of two crypto products side-by-side. Returns scores for both products with a recommendation.",
      inputSchema: {
        type: "object",
        properties: {
          product1: {
            type: "string",
            description: "First product slug",
          },
          product2: {
            type: "string",
            description: "Second product slug",
          },
        },
        required: ["product1", "product2"],
      },
    },
    {
      name: "safescoring_search",
      description:
        "Search for crypto products in the SafeScoring database. Returns matching products with their security scores.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'Search query (e.g., "hardware wallet", "defi lending", "trezor")',
          },
          limit: {
            type: "number",
            description: "Max results (default: 5, max: 20)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "safescoring_leaderboard",
      description:
        "Get the top-rated crypto products by SAFE security score. Optionally filter by product type.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description:
              'Product type filter (e.g., "hardware-wallet", "software-wallet", "defi-lending", "exchange")',
          },
          limit: {
            type: "number",
            description: "Number of results (default: 10, max: 50)",
          },
        },
      },
    },
    {
      name: "safescoring_check_security",
      description:
        "Quick security check for a crypto product before a transaction. Returns a pass/fail recommendation based on score thresholds. Use this before interacting with any crypto product.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "Product slug to check",
          },
          threshold: {
            type: "number",
            description:
              "Minimum acceptable score (default: 60). Products below this score will be flagged as risky.",
          },
        },
        required: ["product"],
      },
    },
    // ── NEW TOOLS (Phase 3.1) ────────────────────────────────
    {
      name: "safescoring_portfolio_risk",
      description:
        "Assess the overall security risk of a crypto portfolio (list of products). Returns a weighted risk score, weakest links, and diversification analysis.",
      inputSchema: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: { type: "string" },
            description: 'Array of product slugs (e.g., ["ledger-nano-x", "metamask", "binance"])',
          },
        },
        required: ["products"],
      },
    },
    {
      name: "safescoring_norm_compliance",
      description:
        "Check how a product complies with specific security norms or standards. Returns detailed norm-by-norm compliance status.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "Product slug",
          },
          pillar: {
            type: "string",
            description: 'Filter by pillar: "S" (Security), "A" (Adversity), "F" (Fidelity), "E" (Efficiency)',
            enum: ["S", "A", "F", "E"],
          },
        },
        required: ["product"],
      },
    },
    {
      name: "safescoring_incident_history",
      description:
        "Get the security incident history for a crypto product or company. Returns past breaches, hacks, vulnerabilities, and response times.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "Product slug or company name",
          },
          limit: {
            type: "number",
            description: "Max incidents to return (default: 10)",
          },
        },
        required: ["product"],
      },
    },
    {
      name: "safescoring_type_leaderboard",
      description:
        "Get the leaderboard for a specific product type with detailed statistics. More detailed than safescoring_leaderboard.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: 'Product type (e.g., "hardware-wallet", "exchange", "defi-lending", "bridge")',
          },
          sortBy: {
            type: "string",
            description: 'Sort by pillar: "overall", "S", "A", "F", "E" (default: "overall")',
          },
          limit: {
            type: "number",
            description: "Number of results (default: 10, max: 50)",
          },
        },
        required: ["type"],
      },
    },
    {
      name: "safescoring_score_history",
      description:
        "Get historical score changes for a product over time. Shows score evolution and significant changes.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "Product slug",
          },
          days: {
            type: "number",
            description: "Number of days of history (default: 90, max: 365)",
          },
        },
        required: ["product"],
      },
    },
    {
      name: "safescoring_compatibility_check",
      description:
        "Check if two crypto products are compatible and can be used together safely. Returns compatibility status and potential security issues.",
      inputSchema: {
        type: "object",
        properties: {
          product1: {
            type: "string",
            description: "First product slug (e.g., hardware wallet)",
          },
          product2: {
            type: "string",
            description: "Second product slug (e.g., software wallet or DeFi protocol)",
          },
        },
        required: ["product1", "product2"],
      },
    },
    {
      name: "safescoring_alert_subscribe",
      description:
        "Subscribe to score change alerts for a product. Get notified when a product's score changes significantly.",
      inputSchema: {
        type: "object",
        properties: {
          product: {
            type: "string",
            description: "Product slug to monitor",
          },
          threshold: {
            type: "number",
            description: "Minimum score change to trigger alert (default: 5 points)",
          },
          webhook: {
            type: "string",
            description: "Webhook URL to receive alerts (optional, returns alert config if not set)",
          },
        },
        required: ["product"],
      },
    },
    {
      name: "safescoring_batch_score",
      description:
        "Get scores for multiple products in a single request. More efficient than calling get_score multiple times.",
      inputSchema: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: { type: "string" },
            description: 'Array of product slugs (max 20)',
          },
        },
        required: ["products"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "safescoring_get_score": {
        const data = await apiRequest(
          `/api/v1/products/${encodeURIComponent(args.product)}`
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  product: data.name || args.product,
                  type: data.type,
                  overallScore: data.score,
                  pillarScores: data.scores,
                  lastUpdated: data.lastUpdated,
                  detailsUrl: `${BASE_URL}/products/${args.product}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "safescoring_compare": {
        const [p1, p2] = await Promise.all([
          apiRequest(`/api/v1/products/${encodeURIComponent(args.product1)}`),
          apiRequest(`/api/v1/products/${encodeURIComponent(args.product2)}`),
        ]);

        const winner =
          (p1.score || 0) >= (p2.score || 0) ? p1 : p2;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  product1: {
                    name: p1.name,
                    score: p1.score,
                    scores: p1.scores,
                  },
                  product2: {
                    name: p2.name,
                    score: p2.score,
                    scores: p2.scores,
                  },
                  winner: winner.name,
                  scoreDifference: Math.abs(
                    (p1.score || 0) - (p2.score || 0)
                  ),
                  compareUrl: `${BASE_URL}/compare/${args.product1}/${args.product2}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "safescoring_search": {
        const limit = Math.min(args.limit || 5, 20);
        const data = await apiRequest(
          `/api/search?q=${encodeURIComponent(args.query)}&limit=${limit}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: args.query,
                  results: (data.results || data.data || []).map((p) => ({
                    name: p.name,
                    slug: p.slug,
                    type: p.type,
                    score: p.score,
                    url: `${BASE_URL}/products/${p.slug}`,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "safescoring_leaderboard": {
        const limit = Math.min(args.limit || 10, 50);
        const params = new URLSearchParams({
          limit: limit.toString(),
          sort: "score",
          order: "desc",
        });
        if (args.type) params.set("type", args.type);

        const data = await apiRequest(`/api/v1/products?${params}`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  type: args.type || "all",
                  topProducts: (data.data || []).map((p, i) => ({
                    rank: i + 1,
                    name: p.name,
                    slug: p.slug,
                    type: p.type,
                    score: p.score,
                    scores: p.scores,
                  })),
                  leaderboardUrl: `${BASE_URL}/leaderboard`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "safescoring_check_security": {
        const threshold = args.threshold || 60;
        const data = await apiRequest(
          `/api/v1/products/${encodeURIComponent(args.product)}`
        );

        const score = data.score || 0;
        const passed = score >= threshold;
        const pillarScores = data.scores || {};
        const weakPillars = Object.entries(pillarScores)
          .filter(([, v]) => v < threshold)
          .map(([k]) => k.toUpperCase());

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  product: data.name || args.product,
                  score,
                  threshold,
                  recommendation: passed ? "PASS" : "CAUTION",
                  message: passed
                    ? `${data.name} has a SAFE score of ${score}/100, which meets the threshold of ${threshold}. It is considered safe to interact with.`
                    : `${data.name} has a SAFE score of ${score}/100, below the threshold of ${threshold}. Exercise caution.`,
                  weakPillars:
                    weakPillars.length > 0
                      ? weakPillars
                      : undefined,
                  pillarScores,
                  detailsUrl: `${BASE_URL}/products/${args.product}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ── NEW TOOL HANDLERS (Phase 3.1) ─────────────────────────

      case "safescoring_portfolio_risk": {
        const slugs = (args.products || []).slice(0, 20);
        const products = await Promise.all(
          slugs.map((s) =>
            apiRequest(`/api/v1/products/${encodeURIComponent(s)}`).catch(() => null)
          )
        );
        const valid = products.filter(Boolean);
        const scores = valid.map((p) => p.score || 0);
        const avgScore = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

        // Find weakest links
        const weakest = valid
          .sort((a, b) => (a.score || 0) - (b.score || 0))
          .slice(0, 3)
          .map((p) => ({ name: p.name, score: p.score, slug: p.slug }));

        // Type diversification
        const types = {};
        valid.forEach((p) => {
          types[p.type || "unknown"] = (types[p.type || "unknown"] || 0) + 1;
        });
        const diversification = Object.keys(types).length / Math.max(valid.length, 1);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              productsAnalyzed: valid.length,
              productsNotFound: slugs.length - valid.length,
              averageScore: avgScore,
              riskLevel: avgScore >= 75 ? "LOW" : avgScore >= 55 ? "MEDIUM" : "HIGH",
              weakestLinks: weakest,
              diversification: {
                score: Math.round(diversification * 100),
                typeBreakdown: types,
              },
              recommendation: avgScore < 55
                ? "Portfolio has significant security risks. Consider replacing low-scoring products."
                : avgScore < 75
                ? "Portfolio has moderate risk. Review weakest links for potential upgrades."
                : "Portfolio has good overall security. Continue monitoring for changes.",
            }, null, 2),
          }],
        };
      }

      case "safescoring_norm_compliance": {
        const data = await apiRequest(
          `/api/v1/products/${encodeURIComponent(args.product)}/evaluations`
        );
        let evaluations = data.evaluations || data.data || [];

        if (args.pillar) {
          evaluations = evaluations.filter(
            (e) => (e.pillar || "").toUpperCase() === args.pillar.toUpperCase()
          );
        }

        const compliant = evaluations.filter((e) => e.answer === "YES" || e.answer === "YES_PARTIAL");
        const nonCompliant = evaluations.filter((e) => e.answer === "NO");
        const na = evaluations.filter((e) => e.answer === "NA" || e.answer === "N/A");

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              product: args.product,
              pillar: args.pillar || "all",
              totalNorms: evaluations.length,
              compliant: compliant.length,
              nonCompliant: nonCompliant.length,
              notApplicable: na.length,
              complianceRate: evaluations.length - na.length > 0
                ? Math.round((compliant.length / (evaluations.length - na.length)) * 100)
                : 0,
              failedNorms: nonCompliant.slice(0, 10).map((e) => ({
                norm: e.norm_code || e.norm_name,
                pillar: e.pillar,
                explanation: e.explanation?.slice(0, 100),
              })),
            }, null, 2),
          }],
        };
      }

      case "safescoring_incident_history": {
        const limit = Math.min(args.limit || 10, 50);
        let data;
        try {
          data = await apiRequest(
            `/api/v1/products/${encodeURIComponent(args.product)}/incidents?limit=${limit}`
          );
        } catch {
          // Fallback: get product data which may include incident summary
          data = await apiRequest(
            `/api/v1/products/${encodeURIComponent(args.product)}`
          );
          data = { incidents: data.incidents || [] };
        }

        const incidents = (data.incidents || data.data || []).slice(0, limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              product: args.product,
              totalIncidents: incidents.length,
              incidents: incidents.map((inc) => ({
                date: inc.date || inc.created_at,
                type: inc.type || inc.category,
                severity: inc.severity,
                title: inc.title || inc.description?.slice(0, 100),
                fundsLost: inc.funds_lost || inc.amount,
                resolved: inc.resolved ?? true,
              })),
              riskAssessment: incidents.length === 0
                ? "No known incidents on record."
                : incidents.length <= 2
                ? "Low incident history. Product has a relatively clean track record."
                : "Multiple incidents recorded. Review details before trusting with significant funds.",
            }, null, 2),
          }],
        };
      }

      case "safescoring_type_leaderboard": {
        const limit = Math.min(args.limit || 10, 50);
        const sortBy = args.sortBy || "overall";
        const params = new URLSearchParams({
          limit: limit.toString(),
          type: args.type,
          sort: sortBy === "overall" ? "score" : `score_${sortBy.toLowerCase()}`,
          order: "desc",
        });

        const data = await apiRequest(`/api/v1/products?${params}`);
        const products = (data.data || []);

        // Stats
        const scores = products.map((p) => p.score || 0);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const max = Math.max(...scores, 0);
        const min = Math.min(...scores, 0);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              type: args.type,
              sortedBy: sortBy,
              statistics: { average: avg, highest: max, lowest: min, count: products.length },
              products: products.map((p, i) => ({
                rank: i + 1,
                name: p.name,
                slug: p.slug,
                score: p.score,
                scores: p.scores,
                url: `${BASE_URL}/products/${p.slug}`,
              })),
            }, null, 2),
          }],
        };
      }

      case "safescoring_score_history": {
        const days = Math.min(args.days || 90, 365);
        let data;
        try {
          data = await apiRequest(
            `/api/v1/products/${encodeURIComponent(args.product)}/history?days=${days}`
          );
        } catch {
          // If no history endpoint, get current score
          const current = await apiRequest(
            `/api/v1/products/${encodeURIComponent(args.product)}`
          );
          data = {
            history: [{ date: new Date().toISOString(), score: current.score, scores: current.scores }],
          };
        }

        const history = data.history || data.data || [];
        const changes = [];
        for (let i = 1; i < history.length; i++) {
          const delta = (history[i].score || 0) - (history[i - 1].score || 0);
          if (Math.abs(delta) >= 3) {
            changes.push({
              date: history[i].date,
              from: history[i - 1].score,
              to: history[i].score,
              delta,
            });
          }
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              product: args.product,
              period: `${days} days`,
              dataPoints: history.length,
              currentScore: history.length ? history[history.length - 1].score : null,
              significantChanges: changes.slice(0, 10),
              trend: history.length >= 2
                ? (history[history.length - 1].score || 0) > (history[0].score || 0) ? "IMPROVING" : "DECLINING"
                : "STABLE",
            }, null, 2),
          }],
        };
      }

      case "safescoring_compatibility_check": {
        const [p1, p2] = await Promise.all([
          apiRequest(`/api/v1/products/${encodeURIComponent(args.product1)}`),
          apiRequest(`/api/v1/products/${encodeURIComponent(args.product2)}`),
        ]);

        // Determine compatibility based on product types
        const type1 = (p1.type || "").toLowerCase();
        const type2 = (p2.type || "").toLowerCase();

        const compatibilityMap = {
          "hardware-wallet+software-wallet": { compatible: true, note: "Hardware wallets pair well with software wallets for transaction signing." },
          "hardware-wallet+exchange": { compatible: true, note: "Use hardware wallet for cold storage, exchange for trading." },
          "software-wallet+defi-lending": { compatible: true, note: "Software wallets connect directly to DeFi protocols." },
          "hardware-wallet+defi-lending": { compatible: true, note: "Hardware wallets can connect to DeFi via WalletConnect." },
          "exchange+exchange": { compatible: false, note: "Using multiple exchanges increases attack surface. Consider consolidating." },
        };

        const pairKey = [type1, type2].sort().join("+");
        const compat = compatibilityMap[pairKey] || { compatible: true, note: "No known compatibility issues." };

        const combinedScore = Math.round(((p1.score || 0) + (p2.score || 0)) / 2);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              product1: { name: p1.name, type: p1.type, score: p1.score },
              product2: { name: p2.name, type: p2.type, score: p2.score },
              compatible: compat.compatible,
              note: compat.note,
              combinedSecurityScore: combinedScore,
              weakerProduct: (p1.score || 0) <= (p2.score || 0) ? p1.name : p2.name,
              recommendation: combinedScore >= 70
                ? "Good security combination. Both products are well-scored."
                : "Consider upgrading the weaker product to improve overall security.",
            }, null, 2),
          }],
        };
      }

      case "safescoring_alert_subscribe": {
        const threshold = args.threshold || 5;
        // Register alert subscription via API
        try {
          const data = await apiRequest("/api/v1/alerts/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product: args.product,
              threshold,
              webhook: args.webhook || null,
            }),
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                subscribed: true,
                product: args.product,
                threshold,
                alertId: data.id || data.alertId,
                message: `Alert configured: you will be notified when ${args.product}'s score changes by ${threshold}+ points.`,
                webhook: args.webhook ? "configured" : "not set (check dashboard)",
              }, null, 2),
            }],
          };
        } catch {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                subscribed: false,
                product: args.product,
                threshold,
                message: "Alert subscription API not yet available. Monitor scores manually at safescoring.io/dashboard",
                dashboardUrl: `${BASE_URL}/dashboard/alerts`,
              }, null, 2),
            }],
          };
        }
      }

      case "safescoring_batch_score": {
        const slugs = (args.products || []).slice(0, 20);
        const results = await Promise.all(
          slugs.map((slug) =>
            apiRequest(`/api/v1/products/${encodeURIComponent(slug)}`)
              .then((data) => ({
                slug,
                name: data.name,
                type: data.type,
                score: data.score,
                scores: data.scores,
                url: `${BASE_URL}/products/${slug}`,
              }))
              .catch(() => ({
                slug,
                error: "Product not found",
              }))
          )
        );

        const valid = results.filter((r) => !r.error);
        const avgScore = valid.length
          ? Math.round(valid.reduce((sum, r) => sum + (r.score || 0), 0) / valid.length)
          : 0;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              requested: slugs.length,
              found: valid.length,
              averageScore: avgScore,
              products: results,
            }, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        { type: "text", text: `Error: ${error.message}` },
      ],
      isError: true,
    };
  }
});

// ============================================================
// RESOURCES
// ============================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "safescoring://methodology",
      name: "SAFE Methodology",
      description:
        "The SAFE scoring methodology: 2,354 norms across 4 pillars (Security, Adversity, Fidelity, Efficiency)",
      mimeType: "text/plain",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "safescoring://methodology") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `# SAFE Scoring Methodology

SafeScoring evaluates crypto products using 2,354 security norms across 4 pillars:

## S - Security (25%)
Cryptographic foundations: encryption algorithms, key management, secure element usage,
random number generation, protocol implementation. Evaluates whether the core cryptographic
infrastructure would survive a real-world attack.

## A - Adversity (25%)
Protection against human adversaries: duress PINs, time-locks, multi-signature requirements,
hidden wallets, plausible deniability. Addresses physical threats including coercion,
kidnapping, and forced transfers.

## F - Fidelity (25%)
Durability and reliability over time: track record, incident response speed, patch history,
team transparency, audit compliance, regulatory standing. Measures proven behavior, not promises.

## E - Efficiency (25%)
Usability and performance: UX quality, error prevention, blind-signing protection,
address verification, transaction clarity. Because security that is too hard to use
leads to user errors that cause irreversible losses.

## Scoring Formula
- Each pillar: (compliant norms / applicable norms) x 100
- Overall SAFE score: (S + A + F + E) / 4
- Products with N/A norms are not penalized

## Product Types Covered
Hardware wallets, software wallets, exchanges, DeFi protocols, custody solutions,
staking platforms, bridges, and 78+ other crypto product categories.

## Data Sources
Official documentation, security audits, technical specifications, on-chain data,
incident databases, and continuous monitoring.

Learn more: https://safescoring.io/methodology`,
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// ============================================================
// START SERVER
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SafeScoring MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
