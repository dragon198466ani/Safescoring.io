import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getNormStats } from "@/libs/norm-stats";

const { hackLosses2024, accessControlLossPct, auditedHackedApprox, auditedHackedYear } = config.safe.stats;

export const metadata = getSEOTags({
  title: `SAFE Methodology | ${config.appName}`,
  description: `The SAFE Framework: comprehensive security norms across 4 pillars - Security, Adversity, Fidelity, and Efficiency. Learn how we evaluate crypto product security.`,
  canonicalUrlRelative: "/methodology",
});

const pillarEducationalContent = {
  S: {
    title: "Security",
    subtitle: "Cryptographic Armor",
    introduction:
      `This pillar evaluates the cryptographic foundations protecting your assets. In ${auditedHackedYear} alone, ${hackLosses2024} was stolen in crypto hacks — with compromised keys and access controls responsible for over ${accessControlLossPct} of losses. A high Security score means the product uses battle-tested, audited cryptographic implementations — not homegrown algorithms that crumble under real-world attacks.`,
    whyItMatters:
      "Cryptography is the only thing standing between your assets and a hacker. A single weak algorithm, a poorly seeded random number generator, or unprotected key storage can turn a 'secure' wallet into an open vault. Most users never see the code — this pillar does it for them.",
    essentialStandards: [
      {
        name: "NIST SP 800-57",
        description: "Key Management Recommendations — the gold standard for how cryptographic keys should be generated, stored, rotated, and destroyed.",
      },
      {
        name: "FIPS 140-2/3",
        description: "Federal standard for cryptographic modules. If a hardware wallet doesn't meet this, its 'secure element' claim is meaningless.",
      },
      {
        name: "BIP-32/39/44",
        description: "Bitcoin standards for HD wallets, seed phrases, and derivation paths — the backbone of every wallet's key architecture.",
      },
      {
        name: "SLIP-0010/0039",
        description: "Standards for universal key derivation and Shamir's Secret Sharing — splitting keys so no single device holds everything.",
      },
    ],
    evaluationAreas: [
      "Encryption algorithms (AES-256, ChaCha20)",
      "Digital signature schemes (ECDSA, EdDSA)",
      "Hash functions (SHA-256, Keccak-256)",
      "Key derivation and secure storage",
      "Random number generation (CSPRNG)",
      "Secure element / TEE usage",
    ],
  },
  A: {
    title: "Adversity",
    subtitle: "Duress & Coercion Resistance",
    introduction:
      "This pillar measures how well a product protects users under physical threat or coercion. In 2025, crypto-related kidnappings surged worldwide, with France becoming the most targeted country in Europe. Victims are targeted because criminals assume they can force an instant transfer. A high Adversity score means the product makes this impossible, protecting your life by making your funds technically inaccessible under duress.",
    whyItMatters:
      "The $5 wrench attack is no longer theoretical. Kidnappings, home invasions, and torture targeting crypto holders are escalating worldwide. Products that implement time-locks, multi-signature, and duress mechanisms break the criminal business model: if funds cannot be moved instantly, the kidnapping becomes worthless. Choosing a product with a high Adversity score is a life-safety decision.",
    essentialStandards: [
      {
        name: "OWASP Mobile Security",
        description: "Guidelines for anti-tampering, code obfuscation, and runtime protection against physical device attacks.",
      },
      {
        name: "Common Criteria (ISO 15408)",
        description: "International standard for evaluating security features including protection against physical and logical attacks.",
      },
      {
        name: "ETSI TS 103 097",
        description: "Security protocols for protected communication channels and authentication under adverse conditions.",
      },
      {
        name: "BIP-11 / BIP-65 (Multisig & Timelocks)",
        description: "Bitcoin standards for multi-signature transactions and time-locked outputs — the technical foundation that prevents forced instant transfers.",
      },
    ],
    evaluationAreas: [
      "Duress PIN functionality",
      "Hidden/decoy wallets",
      "Plausible deniability features",
      "Time-locked transfers (CLTV, timelock vaults)",
      "Multi-signature requirements",
      "Emergency wipe capabilities",
      "Multi-location key storage",
      "Dead man's switch mechanisms",
    ],
  },
  F: {
    title: "Fidelity",
    subtitle: "Proven Track Record, Not Promises",
    introduction:
      `${auditedHackedApprox} of hacked projects in ${auditedHackedYear} had passed at least one security audit. An audit is a snapshot in time — it tells you nothing about what happened after. This pillar measures what actually matters: does the team fix vulnerabilities fast? Do they maintain transparency when things go wrong? Is the project still actively defended?`,
    whyItMatters:
      "Crypto security is a moving target. New exploits emerge weekly. A product that was secure in January can be compromised by March if the team stopped patching. Fidelity measures the ongoing commitment to security — because the projects that survive hacks aren't the ones with the best audits, they're the ones with the best response teams.",
    essentialStandards: [
      {
        name: "SOC 2 Type II",
        description: "Not a one-time check — this report verifies that security controls actually work over an extended period. The 'Type II' distinction is critical.",
      },
      {
        name: "ISO 27001",
        description: "International standard for information security management systems (ISMS) — proving security is a continuous process, not a one-off event.",
      },
      {
        name: "CryptoCurrency Security Standard (CCSS)",
        description: "The only security standard specifically designed for cryptocurrency custody — covering key generation, storage, usage, and compromise protocols.",
      },
      {
        name: "Responsible Disclosure & Bug Bounties",
        description: "Active bug bounty programs incentivize white-hat hackers to find vulnerabilities before black-hats do. No bounty program = no safety net.",
      },
    ],
    evaluationAreas: [
      "Independent security audits (frequency & recency)",
      "Bug bounty program scope and payouts",
      "Patch speed after critical vulnerabilities",
      "Open source code & transparent governance",
      "Team track record & incident history",
      "Post-hack response and user compensation",
    ],
  },
  E: {
    title: "Efficiency",
    subtitle: "Security You Can Actually Use",
    introduction:
      "The most secure wallet in the world is worthless if it lets you send $50,000 to the wrong address because the confirmation screen was confusing. This pillar measures whether a product's security actually works in the hands of real users — not just in a lab. Clear transaction displays, address verification, error prevention, and accessible recovery are what separate usable security from theoretical security.",
    whyItMatters:
      "User errors — wrong chain, wrong address, misunderstood gas fees, lost seed phrases — cause billions in irreversible crypto losses every year. These aren't security failures, they're UX failures. A product that forces users to blind-sign transactions or offers no recovery path is insecure by design, no matter how strong its cryptography.",
    essentialStandards: [
      {
        name: "WCAG 2.1",
        description: "Accessibility guidelines — because security should work for everyone, including users with disabilities.",
      },
      {
        name: "ISO 9241-110",
        description: "Ergonomic principles for human-system interaction — the science behind interfaces that prevent costly mistakes.",
      },
      {
        name: "EIP-712 / EIP-4361 (Sign-In with Ethereum)",
        description: "Standards for typed structured data signing and authentication — replacing blind signing with verifiable, user-readable transaction details.",
      },
    ],
    evaluationAreas: [
      "Transaction confirmation clarity (no blind signing)",
      "Address verification & whitelisting",
      "Multi-chain / multi-asset support",
      "Backup & recovery UX",
      "Cross-platform availability",
      "Error prevention & undo mechanisms",
      "Onboarding friction vs. security trade-off",
    ],
  },
};

const Methodology = async () => {
  const normStats = await getNormStats();

  return (
    <>
    <Header />
    <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Methodology" },
        ]} />
      </div>

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
            Methodology
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            The <span className="text-gradient-safe">SAFE</span> Framework
          </h1>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto mb-4">
            An evaluation system with {normStats?.totalNorms || "\u2014"} security norms across four pillars.
            Crypto products are assessed against these standards using our standardized methodology.
          </p>
          <p className="text-xs text-base-content/40 max-w-2xl mx-auto mb-8">
            Opinion-Based Evaluation — Scores represent SafeScoring&apos;s opinion based on publicly available information. They do not guarantee security, predict future incidents, or constitute financial advice. Experts using different criteria may reach different conclusions.
          </p>
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{normStats?.totalNorms || "\u2014"}</div>
              <div className="text-sm text-base-content/60">Security Norms</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">4</div>
              <div className="text-sm text-base-content/60">Core Pillars</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">{normStats?.totalProducts || "\u2014"}+</div>
              <div className="text-sm text-base-content/60">Products Evaluated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          {config.safe.pillars.map((pillar, index) => {
            const content = pillarEducationalContent[pillar.code];
            return (
              <div
                key={pillar.code}
                className="relative"
                id={pillar.code.toLowerCase()}
              >
                {/* Pillar Header */}
                <div className="flex items-center gap-6 mb-8">
                  <div
                    className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-lg"
                    style={{ backgroundColor: pillar.color }}
                  >
                    {pillar.code}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{content.title}</h2>
                    <p className="text-lg text-base-content/60">{content.subtitle}</p>
                  </div>
                </div>

                {/* Introduction */}
                <p className="text-lg text-base-content/80 leading-relaxed mb-8 max-w-4xl">
                  {content.introduction}
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Why It Matters */}
                  <div
                    className="p-6 rounded-2xl border-l-4"
                    style={{
                      borderColor: pillar.color,
                      backgroundColor: `${pillar.color}10`,
                    }}
                  >
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillar.color }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Why It Matters
                    </h3>
                    <p className="text-base-content/70">{content.whyItMatters}</p>
                  </div>

                  {/* Evaluation Areas */}
                  <div className="p-6 rounded-2xl bg-base-200/50 border border-base-300">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                        style={{ color: pillar.color }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      What We Evaluate
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {content.evaluationAreas.map((area, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border"
                          style={{
                            borderColor: `${pillar.color}40`,
                            backgroundColor: `${pillar.color}10`,
                            color: pillar.color,
                          }}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Essential Standards */}
                <div className="mt-8">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                      style={{ color: pillar.color }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Essential Standards Referenced
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {content.essentialStandards.map((standard, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-base-200/50 border border-base-300 hover:border-opacity-50 transition-all"
                      >
                        <h4
                          className="font-medium"
                          style={{ color: pillar.color }}
                        >
                          {standard.name}
                        </h4>
                        <p className="text-sm text-base-content/60 mt-1">
                          {standard.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider between pillars */}
                {index < config.safe.pillars.length - 1 && (
                  <div className="border-b border-base-300 mt-16" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-base-200/50 border-t border-base-300">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to explore product scores?</h2>
          <p className="text-base-content/60 mb-8">
            See how your favorite crypto products stack up against our {normStats?.totalNorms || "\u2014"} security norms.
          </p>
          <Link href="/products" className="btn btn-primary btn-lg">
            View All Products
          </Link>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
};

export default Methodology;
