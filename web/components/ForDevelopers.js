import Link from "next/link";

const ForDevelopers = () => {
  return (
    <section className="py-24 px-6 bg-base-200/30" id="developers">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-base-content/10 text-base-content/70">
            For Developers
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Build with{" "}
            <span className="text-gradient-safe">security data</span>
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            Building your own crypto tools? Don&apos;t reinvent security research.
            Plug SafeScoring into your stack via API, SDK, or embeddable widgets.
          </p>
        </div>

        {/* Code preview + features */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Code snippet */}
          <div className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-base-300/50 border-b border-base-300">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-base-content/40 font-mono ml-2">your-app.js</span>
            </div>
            <pre className="p-6 text-sm font-mono overflow-x-auto text-base-content/80 leading-relaxed">
              <code>{`// Get security score for any crypto product
const score = await fetch(
  'https://safescoring.io/api/products/uniswap/score'
).then(r => r.json());

console.log(score.scores);
// { s: 78, a: 65, f: 82, e: 91 }

// Warn users about low-security protocols
if (score.score < 50) {
  showWarning(\`⚠️ \${score.name} has a low 
  security rating: \${score.score}/100\`);
}`}</code>
            </pre>
          </div>

          {/* Features list */}
          <div className="space-y-6">
            {[
              {
                title: "REST API — no auth required",
                description: "Start fetching scores in seconds. Free tier: 100 req/hour. No API key needed for basic endpoints.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                ),
              },
              {
                title: "TypeScript, Python & Go SDKs",
                description: "First-class SDKs with full type safety. npm install @safescoring/sdk and you're live.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
                  </svg>
                ),
              },
              {
                title: "Embeddable badges & widgets",
                description: "Drop a SafeScore badge into your README, docs, or app. SVG badges, HTML widgets, and iframe embeds.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                ),
              },
              {
                title: "Browser extension",
                description: "Auto-display SafeScores on exchanges, DeFi protocols, and wallet sites. Open-source on GitHub.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.491 48.491 0 01-4.163-.3c.186 1.613.466 3.2.836 4.745a48.345 48.345 0 005.69.572.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.607.61.643a48.39 48.39 0 005.316-.572c.37-1.546.65-3.132.836-4.745a48.468 48.468 0 01-4.163.3.64.64 0 01-.657-.643v0c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0" />
                  </svg>
                ),
              },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="p-2.5 rounded-xl bg-base-content/10 text-base-content/50 flex-shrink-0 group-hover:bg-base-content/20 group-hover:text-base-content/70 transition-colors">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-base-content mb-1">{feature.title}</h3>
                  <p className="text-sm text-base-content/60 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Use case cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {[
            {
              title: "Portfolio managers",
              description: "Flag low-security assets before your users invest. Display risk scores alongside holdings.",
              border: "border-base-300",
              titleColor: "text-white font-bold",
            },
            {
              title: "Wallet builders",
              description: "Warn users before connecting to risky protocols. Show SafeScores in your DApp browser.",
              border: "border-base-300",
              titleColor: "text-white font-bold",
            },
            {
              title: "AI agents & bots",
              description: "Feed security data into autonomous trading agents. Let your AI make safer decisions.",
              border: "border-base-300",
              titleColor: "text-white font-bold",
            },
          ].map((useCase, i) => (
            <div
              key={i}
              className={`p-6 rounded-2xl bg-base-200 border ${useCase.border} hover:scale-[1.02] transition-transform duration-300`}
            >
              <h3 className={`font-bold text-lg mb-2 ${useCase.titleColor}`}>{useCase.title}</h3>
              <p className="text-sm text-base-content/60 leading-relaxed">{useCase.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/api-docs" className="btn btn-primary gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
              View API Docs
            </Link>
            <a
              href="https://github.com/safescoring"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline gap-2"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
          <p className="text-sm text-base-content/40 mt-4">
            Free tier: 100 requests/hour. No signup required.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ForDevelopers;
