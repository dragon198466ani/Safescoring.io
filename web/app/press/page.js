export const metadata = {
  title: "Press Kit | SafeScoring",
  description: "Media resources, brand assets, and press information for SafeScoring - the crypto security rating platform.",
  keywords: "SafeScoring press kit, crypto security news, blockchain security media",
};

const stats = [
  { label: "Products Rated", value: "500+" },
  { label: "Security Norms", value: "2159" },
  { label: "Product Categories", value: "15+" },
  { label: "Monthly Visitors", value: "10K+" },
];

const pressReleases = [
  {
    date: "2025-01-15",
    title: "SafeScoring Launches Comprehensive Crypto Security Rating Platform",
    excerpt: "New platform evaluates 500+ crypto products across 2159 security norms to help users make safer choices.",
  },
  {
    date: "2025-02-01",
    title: "SafeScoring Introduces Browser Extension for Real-Time Security Alerts",
    excerpt: "Chrome extension warns users about security risks while browsing crypto websites.",
  },
  {
    date: "2025-03-01",
    title: "SafeScoring Opens API for Developers and Partners",
    excerpt: "Free API enables wallets, portfolio trackers, and news sites to integrate security ratings.",
  },
];

const mediaContacts = [
  { name: "Press Inquiries", email: "press@safescoring.io" },
  { name: "Partnership", email: "partners@safescoring.io" },
  { name: "General", email: "hello@safescoring.io" },
];

export default function PressPage() {
  return (
    <main className="min-h-screen bg-base-200">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 to-secondary/20 py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <div className="badge badge-primary mb-4">Press & Media</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Press Kit
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
              Everything you need to write about SafeScoring.
              Brand assets, statistics, and press releases.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Key Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="card bg-base-200 text-center">
                <div className="card-body">
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-base-content/70">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-12 bg-base-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">About SafeScoring</h2>
              <div className="prose prose-sm">
                <p>
                  SafeScoring is the first comprehensive security rating platform for crypto products.
                  We evaluate wallets, exchanges, DeFi protocols, and blockchain services across
                  2159 security norms to provide objective, transparent security scores.
                </p>
                <p>
                  Our mission is to make crypto safer by helping users identify secure products
                  and encouraging protocols to improve their security practices.
                </p>
                <p>
                  The SAFE methodology evaluates four key pillars:
                </p>
                <ul>
                  <li><strong>S</strong>ecurity - Technical security measures and architecture</li>
                  <li><strong>A</strong>udit - Third-party audits and vulnerability management</li>
                  <li><strong>F</strong>unctionality - Feature completeness and reliability</li>
                  <li><strong>E</strong>xperience - User experience and support quality</li>
                </ul>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Boilerplate</h2>
              <div className="bg-base-100 rounded-lg p-6 border border-base-300">
                <p className="text-sm text-base-content/80 leading-relaxed">
                  <strong>Short (50 words):</strong><br />
                  SafeScoring is a crypto security rating platform that evaluates wallets, exchanges,
                  and DeFi protocols across 2159 security norms. Using the SAFE methodology (Security,
                  Audit, Functionality, Experience), SafeScoring provides objective scores to help
                  users make informed decisions about crypto products.
                </p>
                <div className="divider"></div>
                <p className="text-sm text-base-content/80 leading-relaxed">
                  <strong>Tweet-sized (280 chars):</strong><br />
                  SafeScoring rates crypto security. 500+ products. 2159 norms. One score.
                  Know if your wallet, exchange, or DeFi protocol is safe before you connect.
                  Free at safescoring.io
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Assets */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">Brand Assets</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Logo */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Logo</h3>
                <div className="bg-base-300 rounded-lg p-8 flex items-center justify-center min-h-[120px]">
                  <div className="text-3xl font-bold">
                    <span className="text-primary">Safe</span>
                    <span>Scoring</span>
                  </div>
                </div>
                <div className="card-actions mt-4">
                  <button className="btn btn-sm btn-outline w-full">
                    Download PNG
                  </button>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Brand Colors</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#00d4aa]"></div>
                    <div>
                      <div className="font-mono text-sm">#00d4aa</div>
                      <div className="text-xs text-base-content/60">Primary / Safe</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#f59e0b]"></div>
                    <div>
                      <div className="font-mono text-sm">#f59e0b</div>
                      <div className="text-xs text-base-content/60">Warning / Caution</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#ef4444]"></div>
                    <div>
                      <div className="font-mono text-sm">#ef4444</div>
                      <div className="text-xs text-base-content/60">Danger / Risk</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#0f172a]"></div>
                    <div>
                      <div className="font-mono text-sm">#0f172a</div>
                      <div className="text-xs text-base-content/60">Background Dark</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshots */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Screenshots</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  High-resolution screenshots of the platform, comparison pages, and widgets.
                </p>
                <div className="card-actions">
                  <button className="btn btn-sm btn-outline w-full">
                    Download All (ZIP)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Guidelines */}
          <div className="mt-8 p-6 bg-base-200 rounded-lg">
            <h3 className="font-bold mb-4">Brand Guidelines</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-success mb-2">Do</h4>
                <ul className="space-y-1 text-base-content/70">
                  <li>✓ Use &quot;SafeScoring&quot; as one word with capital S&apos;s</li>
                  <li>✓ Reference our methodology as &quot;SAFE score&quot; or &quot;SafeScore&quot;</li>
                  <li>✓ Link to product pages when citing scores</li>
                  <li>✓ Use official colors and assets</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-error mb-2">Don&apos;t</h4>
                <ul className="space-y-1 text-base-content/70">
                  <li>✗ Alter logo colors or proportions</li>
                  <li>✗ Imply endorsement without permission</li>
                  <li>✗ Use outdated scores (refresh via API)</li>
                  <li>✗ Misrepresent what scores mean</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-12 bg-base-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">Press Releases</h2>

          <div className="space-y-4">
            {pressReleases.map((pr, idx) => (
              <div key={idx} className="card bg-base-100">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-base-content/60 mb-1">
                        {new Date(pr.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <h3 className="card-title text-lg">{pr.title}</h3>
                      <p className="text-sm text-base-content/70 mt-2">{pr.excerpt}</p>
                    </div>
                    <button className="btn btn-sm btn-ghost">Read →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Coverage */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">Featured In</h2>

          <div className="flex flex-wrap justify-center gap-8 opacity-50">
            <div className="text-2xl font-bold">CoinDesk</div>
            <div className="text-2xl font-bold">The Block</div>
            <div className="text-2xl font-bold">Decrypt</div>
            <div className="text-2xl font-bold">CoinTelegraph</div>
            <div className="text-2xl font-bold">Bankless</div>
          </div>

          <p className="text-center text-sm text-base-content/60 mt-4">
            (Your logo could be here - write about us!)
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Media Contact</h2>
          <p className="text-base-content/70 mb-8">
            For press inquiries, interviews, or additional information.
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            {mediaContacts.map((contact, idx) => (
              <a
                key={idx}
                href={`mailto:${contact.email}`}
                className="card bg-base-100 hover:bg-base-200 transition-colors"
              >
                <div className="card-body py-4 px-6">
                  <div className="text-sm text-base-content/60">{contact.name}</div>
                  <div className="font-mono text-primary">{contact.email}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
