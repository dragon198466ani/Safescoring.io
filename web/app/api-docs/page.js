import Link from "next/link";
/* eslint-disable @next/next/no-img-element */

export const metadata = {
  title: "API Documentation | SafeScoring",
  description: "Integrate SafeScoring security evaluation opinions into your crypto application. Free API access for developers.",
  keywords: "crypto security API, SafeScore API, blockchain security integration, crypto rating API",
};

const endpoints = [
  {
    method: "GET",
    path: "/api/products/{slug}",
    description: "Get security score and details for a specific product",
    params: [
      { name: "slug", type: "string", required: true, description: "Product URL slug (e.g., 'ledger-nano-x')" }
    ],
    response: `{
  "slug": "ledger-nano-x",
  "name": "Ledger Nano X",
  "type": "Hardware Wallet",
  "url": "https://ledger.com",
  "score": 85,
  "scores": {
    "s": 90,  // Security
    "a": 82,  // Adversity
    "f": 88,  // Fidelity
    "e": 80   // Efficiency
  },
  "lastUpdated": "2025-01-01T00:00:00Z",
  "detailsUrl": "https://safescoring.io/products/ledger-nano-x"
}`,
    rateLimit: "30 requests/minute",
  },
  {
    method: "GET",
    path: "/api/v1/products",
    description: "List all scored products with pagination (API key required for Professional/Enterprise)",
    params: [
      { name: "type", type: "string", required: false, description: "Filter by product type slug" },
      { name: "limit", type: "number", required: false, description: "Max results (default: 50, max: 100)" },
      { name: "offset", type: "number", required: false, description: "Pagination offset" },
      { name: "sort", type: "string", required: false, description: "'score', 'name', or 'updated'" },
      { name: "min_score", type: "number", required: false, description: "Minimum score filter" },
    ],
    response: `{
  "success": true,
  "data": [
    {
      "slug": "ledger-nano-x",
      "name": "Ledger Nano X",
      "type": "Hardware Wallet",
      "score": 85,
      "scores": { "s": 90, "a": 82, "f": 88, "e": 80 }
    }
  ],
  "pagination": { "total": 150, "limit": 50, "offset": 0, "hasMore": true }
}`,
    rateLimit: "Professional: 30 req/min, Enterprise: 100 req/min",
  },
  {
    method: "GET",
    path: "/api/badge/{slug}",
    description: "Get an SVG badge displaying the product's SafeScore evaluation",
    params: [
      { name: "slug", type: "string", required: true, description: "Product URL slug" },
      { name: "style", type: "string", required: false, description: "'flat' or 'gradient' (default: gradient)" }
    ],
    response: "SVG image (image/svg+xml)",
    rateLimit: "No limit (cached)",
    example: "![SafeScore](https://safescoring.io/api/badge/ledger-nano-x)"
  },
  {
    method: "GET",
    path: "/api/widget/{slug}",
    description: "Get an embeddable HTML widget or JavaScript snippet",
    params: [
      { name: "slug", type: "string", required: true, description: "Product URL slug" },
      { name: "theme", type: "string", required: false, description: "'dark' or 'light' (default: dark)" },
      { name: "size", type: "string", required: false, description: "'small', 'medium', or 'large' (default: medium)" },
      { name: "format", type: "string", required: false, description: "'html' or 'js' (default: html)" }
    ],
    response: "HTML page or JavaScript code",
    rateLimit: "No limit (cached 1 hour)",
  },
  {
    method: "GET",
    path: "/api/search",
    description: "Search for products by name or type",
    params: [
      { name: "q", type: "string", required: true, description: "Search query" },
      { name: "type", type: "string", required: false, description: "Filter by product type" },
      { name: "limit", type: "number", required: false, description: "Max results (default: 10, max: 50)" }
    ],
    response: `{
  "results": [
    {
      "slug": "ledger-nano-x",
      "name": "Ledger Nano X",
      "type": "Hardware Wallet",
      "score": 85
    }
  ],
  "total": 1
}`,
    rateLimit: "60 requests/minute",
  },
];

const codeExamples = {
  javascript: `// Fetch SafeScore for a product
const response = await fetch('https://safescoring.io/api/products/ledger-nano-x');
const data = await response.json();

console.log(\`\${data.name}: \${data.score}/100\`);
// Output: "Ledger Nano X: 85/100"`,

  python: `import requests

# Fetch SafeScore for a product
response = requests.get('https://safescoring.io/api/products/ledger-nano-x')
data = response.json()

print(f"{data['name']}: {data['score']}/100")
# Output: "Ledger Nano X: 85/100"`,

  curl: `# Get product score
curl https://safescoring.io/api/products/ledger-nano-x

# Get SVG badge
curl https://safescoring.io/api/badge/ledger-nano-x -o badge.svg

# Search products
curl "https://safescoring.io/api/search?q=wallet&limit=5"`,

  react: `import { useState, useEffect } from 'react';

function SafeScoreBadge({ slug }) {
  const [score, setScore] = useState(null);

  useEffect(() => {
    fetch(\`https://safescoring.io/api/products/\${slug}\`)
      .then(res => res.json())
      .then(data => setScore(data));
  }, [slug]);

  if (!score) return <div>Loading...</div>;

  return (
    <div className="safescore-badge">
      <span className="score">{score.score}</span>
      <span className="label">SafeScore</span>
      <a href={score.detailsUrl}>View Report</a>
    </div>
  );
}`
};

export default function APIDocsPage() {
  return (
    <main className="min-h-screen bg-base-200">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 to-secondary/20 py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <div className="badge badge-primary mb-4">Developer API</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              SafeScoring API
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
              Integrate SafeScoring&apos;s editorial security evaluations into your application.
              Free access for developers. Scores represent opinions, not certifications.
            </p>
            <div className="flex gap-4 justify-center">
              <a href="#endpoints" className="btn btn-primary">
                View Endpoints
              </a>
              <a href="#examples" className="btn btn-outline">
                Code Examples
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-6">Quick Start</h2>
          <div className="bg-base-200 rounded-lg p-6">
            <p className="text-base-content/70 mb-4">
              No authentication required for basic endpoints. Just make a request:
            </p>
            <div className="mockup-code">
              <pre data-prefix="$"><code>curl https://safescoring.io/api/products/ledger-nano-x</code></pre>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <div className="text-3xl mb-2">🆓</div>
                <h3 className="card-title text-lg">Free Tier</h3>
                <p className="text-sm text-base-content/70">
                  30 requests/minute for public API. No signup required.
                </p>
              </div>
            </div>
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="card-title text-lg">Low Latency</h3>
                <p className="text-sm text-base-content/70">
                  Cached responses. Average response time under 100ms.
                </p>
              </div>
            </div>
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="card-title text-lg">CORS Enabled</h3>
                <p className="text-sm text-base-content/70">
                  Full CORS support for browser-based applications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section id="endpoints" className="py-12 bg-base-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">API Endpoints</h2>

          <div className="space-y-6">
            {endpoints.map((endpoint, idx) => (
              <div key={idx} className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`badge ${endpoint.method === 'GET' ? 'badge-success' : 'badge-warning'} font-mono`}>
                      {endpoint.method}
                    </span>
                    <code className="text-lg font-mono">{endpoint.path}</code>
                  </div>

                  <p className="text-base-content/70 mb-4">{endpoint.description}</p>

                  {/* Parameters */}
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Parameters</h4>
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Required</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpoint.params.map((param, pIdx) => (
                            <tr key={pIdx}>
                              <td><code>{param.name}</code></td>
                              <td><span className="text-primary">{param.type}</span></td>
                              <td>{param.required ? <span className="badge badge-error badge-sm">Yes</span> : <span className="badge badge-ghost badge-sm">No</span>}</td>
                              <td className="text-sm">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Response */}
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Response</h4>
                    {endpoint.response.includes('{') ? (
                      <div className="mockup-code text-sm">
                        <pre><code>{endpoint.response}</code></pre>
                      </div>
                    ) : (
                      <p className="text-base-content/70">{endpoint.response}</p>
                    )}
                  </div>

                  {/* Example */}
                  {endpoint.example && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Example</h4>
                      <div className="mockup-code text-sm">
                        <pre><code>{endpoint.example}</code></pre>
                      </div>
                    </div>
                  )}

                  {/* Rate Limit */}
                  <div className="flex items-center gap-2 text-sm text-base-content/60">
                    <span>Rate Limit:</span>
                    <span className="badge badge-outline">{endpoint.rateLimit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section id="examples" className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">Code Examples</h2>

          <div className="tabs tabs-boxed mb-6 bg-base-200 p-1">
            <input type="radio" name="code_tabs" className="tab" aria-label="JavaScript" defaultChecked />
            <input type="radio" name="code_tabs" className="tab" aria-label="Python" />
            <input type="radio" name="code_tabs" className="tab" aria-label="cURL" />
            <input type="radio" name="code_tabs" className="tab" aria-label="React" />
          </div>

          <div className="grid gap-6">
            {Object.entries(codeExamples).map(([lang, code]) => (
              <div key={lang} className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title capitalize">{lang}</h3>
                  <div className="mockup-code">
                    <pre><code>{code}</code></pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Embed Options */}
      <section className="py-12 bg-base-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">Embed Options</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Badge */}
            <div className="card bg-base-100">
              <div className="card-body">
                <h3 className="card-title">SVG Score Indicator</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Display SafeScoring&apos;s editorial evaluation in README files, documentation, or anywhere you want to show the assessed score.
                </p>
                <div className="mockup-code text-sm">
                  <pre><code>{`![SafeScore](https://safescoring.io/api/badge/your-product)`}</code></pre>
                </div>
                <div className="mt-4 p-4 bg-base-200 rounded-lg flex items-center justify-center">
                  <img
                    src="/api/badge/ledger-nano-x"
                    alt="SafeScore Badge Preview"
                    className="h-6"
                  />
                </div>
              </div>
            </div>

            {/* Widget */}
            <div className="card bg-base-100">
              <div className="card-body">
                <h3 className="card-title">HTML Widget</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Full-featured widget displaying SafeScoring&apos;s evaluation opinion with score breakdown. Embed via iframe.
                </p>
                <div className="mockup-code text-sm overflow-x-auto">
                  <pre><code>{`<iframe
  src="https://safescoring.io/api/widget/your-product?theme=dark"
  width="300"
  height="200"
  frameborder="0"
></iframe>`}</code></pre>
                </div>
                <div className="mt-4">
                  <Link href="/badge" className="btn btn-primary btn-sm">
                    Generate Your Widget
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">Use Cases</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="card bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
              <div className="card-body">
                <h3 className="card-title text-green-400">Crypto Wallets</h3>
                <p className="text-sm text-base-content/70">
                  Display SafeScoring evaluation opinions for DeFi protocols before users connect.
                  Help users consider security assessments in their decisions.
                </p>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
              <div className="card-body">
                <h3 className="card-title text-blue-400">Portfolio Trackers</h3>
                <p className="text-sm text-base-content/70">
                  Display SafeScoring evaluation opinions alongside holdings.
                  Highlight protocols with low assessed scores in a portfolio.
                </p>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
              <div className="card-body">
                <h3 className="card-title text-purple-400">News & Media</h3>
                <p className="text-sm text-base-content/70">
                  Embed SafeScore evaluation indicators in articles about crypto products.
                  Reference SafeScoring&apos;s editorial opinions in your coverage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Need Higher Limits?</h2>
          <p className="text-base-content/70 mb-8">
            Contact us for enterprise API access with higher rate limits,
            webhooks for score updates, and priority support.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="mailto:api@safescoring.io" className="btn btn-primary">
              Contact for Enterprise
            </a>
            <Link href="/products" className="btn btn-outline">
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
