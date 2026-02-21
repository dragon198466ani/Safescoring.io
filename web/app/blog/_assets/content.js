import Link from "next/link";

// ==================================================================================================================================================================
// BLOG CATEGORIES 🏷️
// ==================================================================================================================================================================

const categorySlugs = {
  securityReview: "security-review",
  hackAnalysis: "hack-analysis",
  guide: "guide",
  industry: "industry",
};

export const categories = [
  {
    slug: categorySlugs.securityReview,
    title: "Security Reviews",
    titleShort: "Reviews",
    description:
      "In-depth security evaluations of crypto products. SAFE score breakdowns, risk analysis, and what to watch out for.",
    descriptionShort: "In-depth security evaluations of crypto products.",
  },
  {
    slug: categorySlugs.hackAnalysis,
    title: "Hack Analysis",
    titleShort: "Hacks",
    description:
      "Post-mortem analysis of crypto hacks and exploits. What went wrong, what we predicted, and how to stay safe.",
    descriptionShort: "Post-mortem analysis of crypto hacks and exploits.",
  },
  {
    slug: categorySlugs.guide,
    title: "Security Guides",
    titleShort: "Guides",
    description:
      "Practical guides to secure your crypto stack. From wallet setup to operational security best practices.",
    descriptionShort: "Practical guides to secure your crypto setup.",
  },
  {
    slug: categorySlugs.industry,
    title: "Industry Insights",
    titleShort: "Insights",
    description:
      "Data-driven analysis of the crypto security landscape. Trends, statistics, and what they mean for you.",
    descriptionShort: "Data-driven analysis of the crypto security landscape.",
  },
];

// ==================================================================================================================================================================
// BLOG AUTHORS 📝
// ==================================================================================================================================================================

export const authors = [
  {
    slug: "safescoring",
    name: "SafeScoring",
    job: "Security Research",
    description:
      "The first unified security rating for crypto. 916 norms. 0 opinion. 1 score.",
    // No avatar image — the Avatar component handles null author gracefully
    // This keeps the anonymous/brand identity
  },
];

// ==================================================================================================================================================================
// BLOG ARTICLES 📚
// ==================================================================================================================================================================

const styles = {
  h2: "text-2xl lg:text-4xl font-bold tracking-tight mb-4 text-base-content",
  h3: "text-xl lg:text-2xl font-bold tracking-tight mb-2 text-base-content",
  p: "text-base-content/90 leading-relaxed",
  ul: "list-inside list-disc text-base-content/90 leading-relaxed",
  li: "list-item",
  code: "text-sm font-mono bg-neutral text-neutral-content p-6 rounded-box my-4 overflow-x-scroll select-all",
  codeInline:
    "text-sm font-mono bg-base-300 px-1 py-0.5 rounded-box select-all",
  stat: "text-4xl font-black text-primary",
  highlight:
    "bg-primary/10 border border-primary/20 rounded-xl p-4 my-4",
};

export const articles = [
  {
    slug: "what-is-safe-score",
    title: "What Is a SAFE Score? The First Unified Crypto Security Rating",
    description:
      "916 norms, 4 pillars, 1 score. How SafeScoring evaluates every crypto product with zero opinion and full transparency.",
    categories: [
      categories.find((c) => c.slug === categorySlugs.guide),
    ],
    author: authors.find((a) => a.slug === "safescoring"),
    publishedAt: "2025-01-15",
    image: {
      src: null,
      urlRelative: "/api/og/blog/what-is-safe-score",
      alt: "SAFE Score framework diagram — Security, Adversity, Fidelity, Efficiency",
    },
    content: (
      <>
        <section>
          <h2 className={styles.h2}>The Problem With Crypto Security Today</h2>
          <p className={styles.p}>
            Billions are lost every year to hacks, rug pulls, and poorly secured
            products. Yet there&apos;s no standardized way to evaluate how safe a
            crypto product really is. Reviews are subjective. Audits are
            snapshots. Marketing is noise.
          </p>
          <p className={styles.p}>
            SafeScoring was built to fix this. One framework. One methodology.
            Applied consistently across every product.
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>The SAFE Framework</h2>
          <p className={styles.p}>
            Every product is evaluated across 4 pillars, each measuring a
            different dimension of security:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
              <div className="text-2xl font-black text-blue-400 mb-1">S</div>
              <div className="font-semibold mb-1">Security</div>
              <p className="text-sm text-base-content/70">
                Technical security measures — encryption, key management, code
                audits, infrastructure hardening.
              </p>
            </div>
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
              <div className="text-2xl font-black text-purple-400 mb-1">A</div>
              <div className="font-semibold mb-1">Adversity</div>
              <p className="text-sm text-base-content/70">
                Incident response, hack history, insurance coverage, and
                resilience against attacks.
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <div className="text-2xl font-black text-amber-400 mb-1">F</div>
              <div className="font-semibold mb-1">Fidelity</div>
              <p className="text-sm text-base-content/70">
                Transparency, regulatory compliance, team doxxing, legal
                structure, and proof of reserves.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="text-2xl font-black text-emerald-400 mb-1">E</div>
              <div className="font-semibold mb-1">Efficiency</div>
              <p className="text-sm text-base-content/70">
                User experience, operational reliability, uptime track record,
                and support responsiveness.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className={styles.h2}>916 Norms. Zero Opinion.</h2>
          <p className={styles.p}>
            Each pillar is broken down into hundreds of specific, verifiable
            norms. Every norm has a binary answer: Yes or No. No subjective
            scoring. No &quot;we feel like it&apos;s secure.&quot;
          </p>
          <p className={styles.p}>
            The result is a score from 0 to 100 that tells you exactly how
            secure a product is — backed by data, not marketing.
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>How to Use SafeScoring</h2>
          <ul className={styles.ul}>
            <li className={styles.li}>
              <strong>Before using a new product:</strong> Check its SAFE score.
              Anything below 60 deserves caution.
            </li>
            <li className={styles.li}>
              <strong>Compare alternatives:</strong> Use the{" "}
              <Link href="/compare" className="link link-primary">
                comparison tool
              </Link>{" "}
              to see how products stack up side by side.
            </li>
            <li className={styles.li}>
              <strong>Build a secure stack:</strong> Use the{" "}
              <Link href="/dashboard/setups" className="link link-primary">
                setup builder
              </Link>{" "}
              to calculate your combined security score.
            </li>
            <li className={styles.li}>
              <strong>Stay updated:</strong> Scores are re-evaluated monthly.
              Subscribe to alerts for products you care about.
            </li>
          </ul>
        </section>

        <section>
          <div className={styles.highlight}>
            <p className={styles.p}>
              <strong>Start now:</strong>{" "}
              <Link href="/products" className="link link-primary">
                Browse 500+ rated products →
              </Link>
            </p>
          </div>
        </section>
      </>
    ),
  },

  {
    slug: "crypto-security-checklist-2025",
    title: "The Complete Crypto Security Checklist for 2025",
    description:
      "12 essential steps to protect your crypto. From seed phrase storage to exchange selection — a practical, no-BS guide.",
    categories: [
      categories.find((c) => c.slug === categorySlugs.guide),
    ],
    author: authors.find((a) => a.slug === "safescoring"),
    publishedAt: "2025-01-28",
    image: {
      src: null,
      urlRelative: "/api/og/blog/crypto-security-checklist-2025",
      alt: "Crypto security checklist 2025",
    },
    content: (
      <>
        <section>
          <h2 className={styles.h2}>Your Crypto Is Only as Safe as Your Weakest Link</h2>
          <p className={styles.p}>
            Most people focus on one thing — usually their wallet — and ignore
            everything else. But security is a chain, and attackers always find
            the weakest link. This checklist covers every layer.
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>1. Wallet Security</h2>
          <ul className={styles.ul}>
            <li className={styles.li}>Use a hardware wallet for long-term storage</li>
            <li className={styles.li}>Never store seed phrases digitally (no photos, no cloud)</li>
            <li className={styles.li}>Use a metal backup for seed phrases (fire/water resistant)</li>
            <li className={styles.li}>Enable passphrase (25th word) for additional protection</li>
            <li className={styles.li}>
              Check your wallet&apos;s SAFE score on{" "}
              <Link href="/products" className="link link-primary">
                SafeScoring
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={styles.h2}>2. Exchange Security</h2>
          <ul className={styles.ul}>
            <li className={styles.li}>Enable 2FA with a hardware key (YubiKey), not SMS</li>
            <li className={styles.li}>Use a unique, strong password (password manager)</li>
            <li className={styles.li}>Enable withdrawal address whitelisting</li>
            <li className={styles.li}>Don&apos;t keep more than you need on exchanges</li>
            <li className={styles.li}>Verify proof of reserves when available</li>
          </ul>
        </section>

        <section>
          <h2 className={styles.h2}>3. Operational Security (OPSEC)</h2>
          <ul className={styles.ul}>
            <li className={styles.li}>Use a dedicated email for crypto accounts</li>
            <li className={styles.li}>Never discuss holdings publicly</li>
            <li className={styles.li}>Use a VPN on public networks</li>
            <li className={styles.li}>Keep devices updated and malware-free</li>
            <li className={styles.li}>Be extremely cautious with DMs and links</li>
          </ul>
        </section>

        <section>
          <h2 className={styles.h2}>4. DeFi Security</h2>
          <ul className={styles.ul}>
            <li className={styles.li}>Revoke unused token approvals regularly</li>
            <li className={styles.li}>Check protocol audits before depositing</li>
            <li className={styles.li}>Start with small amounts on new protocols</li>
            <li className={styles.li}>Monitor your positions with alerts</li>
            <li className={styles.li}>
              Use the{" "}
              <Link href="/dashboard/setups" className="link link-primary">
                SafeScoring setup builder
              </Link>{" "}
              to score your entire DeFi stack
            </li>
          </ul>
        </section>

        <section>
          <div className={styles.highlight}>
            <p className={styles.p}>
              <strong>How secure is your current setup?</strong>{" "}
              <Link href="/dashboard/setups" className="link link-primary">
                Calculate your stack&apos;s SAFE score →
              </Link>
            </p>
          </div>
        </section>
      </>
    ),
  },

  {
    slug: "why-audits-are-not-enough",
    title: "Why Smart Contract Audits Are Not Enough",
    description:
      "Audits check code. But code is only one part of security. Here's what audits miss and why you need a full evaluation.",
    categories: [
      categories.find((c) => c.slug === categorySlugs.industry),
    ],
    author: authors.find((a) => a.slug === "safescoring"),
    publishedAt: "2025-02-05",
    image: {
      src: null,
      urlRelative: "/api/og/blog/why-audits-are-not-enough",
      alt: "Why audits are not enough for crypto security",
    },
    content: (
      <>
        <section>
          <h2 className={styles.h2}>The Audit Illusion</h2>
          <p className={styles.p}>
            &quot;We&apos;re audited&quot; has become the default response to any security
            question in crypto. But having an audit badge doesn&apos;t mean a
            product is safe. Some of the biggest hacks in crypto history
            happened to audited protocols.
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>What Audits Actually Cover</h2>
          <ul className={styles.ul}>
            <li className={styles.li}>Smart contract logic and vulnerabilities</li>
            <li className={styles.li}>Known attack vectors (reentrancy, overflow, etc.)</li>
            <li className={styles.li}>Code quality and best practices</li>
          </ul>
          <p className={styles.p}>
            That&apos;s important — but it&apos;s a snapshot of code at one point in
            time. Code changes. Teams change. Markets change.
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>What Audits Miss</h2>
          <ul className={styles.ul}>
            <li className={styles.li}>
              <strong>Team risk:</strong> Anonymous teams, insider threats,
              governance attacks
            </li>
            <li className={styles.li}>
              <strong>Operational security:</strong> Server infrastructure,
              DNS attacks, social engineering
            </li>
            <li className={styles.li}>
              <strong>Economic risks:</strong> Oracle manipulation, liquidity
              attacks, tokenomics exploits
            </li>
            <li className={styles.li}>
              <strong>Regulatory risk:</strong> Legal exposure, compliance gaps,
              jurisdictional issues
            </li>
            <li className={styles.li}>
              <strong>Incident response:</strong> What happens after a breach?
              Is there insurance? A response plan?
            </li>
          </ul>
        </section>

        <section>
          <h2 className={styles.h2}>A Full Picture Requires 916 Norms</h2>
          <p className={styles.p}>
            This is why SafeScoring evaluates across 4 pillars — Security,
            Adversity, Fidelity, and Efficiency. A smart contract audit covers
            maybe 10% of what the full SAFE framework evaluates.
          </p>
          <p className={styles.p}>
            Don&apos;t just check if a product is audited. Check its full security
            profile.
          </p>
        </section>

        <section>
          <div className={styles.highlight}>
            <p className={styles.p}>
              <strong>See the full picture:</strong>{" "}
              <Link href="/products" className="link link-primary">
                Browse product security ratings →
              </Link>
            </p>
          </div>
        </section>
      </>
    ),
  },

  {
    slug: "how-to-compare-crypto-wallets",
    title: "How to Compare Crypto Wallets: Security Beyond the Hype",
    description:
      "Not all wallets are created equal. Learn what to look for in a wallet's security profile and how to compare them objectively.",
    categories: [
      categories.find((c) => c.slug === categorySlugs.securityReview),
      categories.find((c) => c.slug === categorySlugs.guide),
    ],
    author: authors.find((a) => a.slug === "safescoring"),
    publishedAt: "2025-02-15",
    image: {
      src: null,
      urlRelative: "/api/og/blog/how-to-compare-crypto-wallets",
      alt: "How to compare crypto wallets security",
    },
    content: (
      <>
        <section>
          <h2 className={styles.h2}>The Wallet Decision</h2>
          <p className={styles.p}>
            Your wallet is the foundation of your crypto security. Choosing the
            wrong one can put everything at risk. But how do you actually
            compare wallets beyond marketing claims?
          </p>
        </section>

        <section>
          <h2 className={styles.h2}>What to Evaluate</h2>

          <h3 className={styles.h3}>Security (S Pillar)</h3>
          <ul className={styles.ul}>
            <li className={styles.li}>Is the firmware/software open source?</li>
            <li className={styles.li}>What chip does the hardware wallet use (secure element)?</li>
            <li className={styles.li}>Has it been independently security audited?</li>
            <li className={styles.li}>Does it support passphrase protection?</li>
          </ul>

          <h3 className={styles.h3}>Adversity (A Pillar)</h3>
          <ul className={styles.ul}>
            <li className={styles.li}>Has the wallet ever been hacked or had security incidents?</li>
            <li className={styles.li}>How did the team respond to past vulnerabilities?</li>
            <li className={styles.li}>Is there a bug bounty program?</li>
          </ul>

          <h3 className={styles.h3}>Fidelity (F Pillar)</h3>
          <ul className={styles.ul}>
            <li className={styles.li}>Is the company registered and identifiable?</li>
            <li className={styles.li}>Where is user data stored?</li>
            <li className={styles.li}>Is KYC required (privacy implications)?</li>
          </ul>

          <h3 className={styles.h3}>Efficiency (E Pillar)</h3>
          <ul className={styles.ul}>
            <li className={styles.li}>How reliable is the companion app/software?</li>
            <li className={styles.li}>Quality of customer support?</li>
            <li className={styles.li}>Multi-chain support?</li>
          </ul>
        </section>

        <section>
          <h2 className={styles.h2}>Compare Side by Side</h2>
          <p className={styles.p}>
            Instead of reading 10 different reviews with different criteria, use
            the SafeScoring comparison tool. Same methodology, same norms,
            objective results.
          </p>
          <div className={styles.highlight}>
            <p className={styles.p}>
              <strong>Try it now:</strong>{" "}
              <Link href="/compare" className="link link-primary">
                Compare any two products →
              </Link>
            </p>
          </div>
        </section>
      </>
    ),
  },
];
