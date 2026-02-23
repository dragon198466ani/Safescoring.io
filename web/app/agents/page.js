import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "SafeScoring for AI Agents | Security Data as a Service",
  description:
    "Let your AI agents query crypto security scores before making decisions. Pay-per-query in USDC, Superfluid streaming, or MCP integration for Claude & GPT.",
  openGraph: {
    title: "SafeScoring for AI Agents",
    description: "Crypto security intelligence for the agent economy",
  },
};

const codeExamples = {
  curl: `# Get a SAFE score (costs $0.01 USDC)
curl -X GET "https://safescoring.io/api/agent/score?product=ledger-nano-x" \\
  -H "X-Agent-Wallet: 0xYourWalletAddress" \\
  -H "X-Agent-Signature: 0xSignedTimestamp" \\
  -H "X-Agent-Timestamp: 1708500000000"`,

  javascript: `import { SafeScoring } from '@safescoring/sdk';

// Initialize with wallet (agent mode)
const safe = new SafeScoring({
  walletAddress: '0xYourAgentWallet',
  privateKey: process.env.AGENT_PRIVATE_KEY,
});

// Check score before interacting with a protocol
const score = await safe.agent.getScore('aave-v3');
if (score.data.score >= 70) {
  console.log('Safe to proceed:', score.data.scores);
  // ... execute DeFi transaction
} else {
  console.warn('Security risk detected:', score.data.analysis);
}`,

  python: `import requests, time
from eth_account.messages import encode_defunct
from web3 import Web3

wallet = "0xYourAgentWallet"
timestamp = str(int(time.time() * 1000))
message = f"SafeScoring Agent Auth: {timestamp}"
signature = w3.eth.account.sign_message(
    encode_defunct(text=message), private_key=PRIVATE_KEY
).signature.hex()

response = requests.get(
    "https://safescoring.io/api/agent/score",
    params={"product": "ledger-nano-x"},
    headers={
        "X-Agent-Wallet": wallet,
        "X-Agent-Signature": signature,
        "X-Agent-Timestamp": timestamp,
    },
)
score = response.json()["data"]["score"]  # 85`,
};

const integrationModes = [
  {
    title: "API Key",
    subtitle: "For developers",
    icon: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z",
    description: "Traditional API key authentication. Best for server-side integrations with subscription plans.",
    auth: "X-API-Key header",
    billing: "Monthly subscription ($49-$299)",
    bestFor: "Human developers, dashboards, monitoring tools",
  },
  {
    title: "Wallet Auth",
    subtitle: "For AI agents",
    icon: "M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3",
    description: "Sign with your wallet. Pay per query in USDC on Polygon. No subscription needed.",
    auth: "Wallet signature (EIP-191)",
    billing: "Pay-per-query ($0.01/score, $0.10/analysis)",
    bestFor: "Autonomous agents, DeFi bots, trading systems",
  },
  {
    title: "MCP Server",
    subtitle: "For AI-native apps",
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z",
    description: "Model Context Protocol integration. Claude, GPT, and other LLMs can query SafeScoring natively.",
    auth: "API Key via MCP config",
    billing: "Included with Professional+ plan",
    bestFor: "Claude Desktop, AI assistants, LLM pipelines",
  },
];

const pricingTable = [
  { feature: "Score query", apiKey: "$0/included", wallet: "$0.01 USDC", stream: "Unlimited" },
  { feature: "Deep analysis", apiKey: "Plan-dependent", wallet: "$0.10 USDC", stream: "Unlimited" },
  { feature: "Batch (per product)", apiKey: "$0/included", wallet: "$0.005 USDC", stream: "Unlimited" },
  { feature: "Rate limit", apiKey: "30-100/min", wallet: "60/min", stream: "60/min" },
  { feature: "Authentication", apiKey: "API Key", wallet: "Wallet signature", stream: "Wallet + Stream" },
  { feature: "Minimum commitment", apiKey: "$49/month", wallet: "None", stream: "~$86/month" },
  { feature: "Best for", apiKey: "Developers", wallet: "Agents", stream: "High-volume agents" },
];

export default function AgentsPage() {
  return (
    <>
      <Header />
      <main className="hero-bg">
        {/* Hero */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium rounded-full bg-primary/10 text-primary">
              Agent Economy
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Security Data
              <br />
              <span className="text-primary">for AI Agents</span>
            </h1>
            <p className="text-xl text-base-content/60 max-w-2xl mx-auto mb-8">
              Let your AI agents verify crypto security before making decisions.
              2,354 security norms. 1,535+ products scored. Pay per query in USDC.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/dashboard/agent-api" className="btn btn-primary btn-lg">
                Get Started
              </Link>
              <a href="#integration" className="btn btn-outline btn-lg">
                View Integration Guide
              </a>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 px-6 bg-base-200/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16">
              Why agents need security scores
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Portfolio Manager Agent",
                  desc: "Before allocating funds to a DeFi protocol, your agent checks its SAFE score. Score below 60? Skip it. Score above 80? Proceed with confidence.",
                  icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                },
                {
                  title: "DeFi Safety Agent",
                  desc: "Your trading bot queries SafeScoring before interacting with any smart contract. Automatic risk assessment based on 2,354 norms, not just audits.",
                  icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
                },
                {
                  title: "Compliance Agent",
                  desc: "Institutional agents verify that all products in a portfolio meet minimum security thresholds. Batch query 50 products at once for $0.25 USDC total.",
                  icon: "M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12",
                },
              ].map((uc, i) => (
                <div key={i} className="p-6 rounded-xl bg-base-200/50 border border-base-300">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
                      <path strokeLinecap="round" strokeLinejoin="round" d={uc.icon} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{uc.title}</h3>
                  <p className="text-base-content/60 text-sm">{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integration Modes */}
        <section className="py-20 px-6" id="integration">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Three ways to integrate
            </h2>
            <p className="text-center text-base-content/60 mb-16">
              Choose the integration that fits your architecture
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {integrationModes.map((mode, i) => (
                <div key={i} className={`p-6 rounded-xl border ${i === 1 ? "border-primary bg-primary/5" : "border-base-300 bg-base-200/50"}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 1 ? "bg-primary/20" : "bg-base-300"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${i === 1 ? "text-primary" : ""}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold">{mode.title}</h3>
                      <span className="text-xs text-base-content/50">{mode.subtitle}</span>
                    </div>
                  </div>
                  {i === 1 && <span className="badge badge-primary badge-sm mb-3">Recommended for agents</span>}
                  <p className="text-sm text-base-content/60 mb-4">{mode.description}</p>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Auth:</span> <span className="text-base-content/60">{mode.auth}</span></div>
                    <div><span className="font-medium">Billing:</span> <span className="text-base-content/60">{mode.billing}</span></div>
                    <div><span className="font-medium">Best for:</span> <span className="text-base-content/60">{mode.bestFor}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Table */}
        <section className="py-20 px-6 bg-base-200/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Pricing comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>API Key</th>
                    <th className="text-primary">Wallet (Pay-per-query)</th>
                    <th>Superfluid Stream</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTable.map((row, i) => (
                    <tr key={i}>
                      <td className="font-medium">{row.feature}</td>
                      <td>{row.apiKey}</td>
                      <td className="text-primary font-medium">{row.wallet}</td>
                      <td>{row.stream}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="py-20 px-6" id="code">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Quick start
            </h2>
            <div className="space-y-8">
              {Object.entries(codeExamples).map(([lang, code]) => (
                <div key={lang} className="rounded-xl overflow-hidden border border-base-300">
                  <div className="bg-base-300 px-4 py-2 flex items-center gap-2">
                    <span className="badge badge-sm">{lang}</span>
                  </div>
                  <pre className="p-4 bg-base-200 overflow-x-auto text-sm">
                    <code>{code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Formula */}
        <section className="py-20 px-6 bg-base-200/30">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Crypto is the API of money
            </h2>
            <p className="text-xl text-base-content/60 mb-8">
              Agents cannot use credit cards with 3D Secure. They need programmable,
              instant, permissionless payments. SafeScoring accepts USDC on Polygon
              for every query. No subscription required. No human in the loop.
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-300">
                <div className="text-3xl font-bold text-primary">$0.01</div>
                <div className="text-sm text-base-content/60 mt-1">per score query</div>
              </div>
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-300">
                <div className="text-3xl font-bold text-primary">$0.10</div>
                <div className="text-sm text-base-content/60 mt-1">per deep analysis</div>
              </div>
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-300">
                <div className="text-3xl font-bold text-primary">60/min</div>
                <div className="text-sm text-base-content/60 mt-1">rate limit</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to integrate?
            </h2>
            <p className="text-base-content/60 mb-8">
              Start querying security scores in under 5 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/dashboard/agent-api" className="btn btn-primary">
                Get API Key
              </Link>
              <a href="#code" className="btn btn-outline">
                View Code Examples
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
